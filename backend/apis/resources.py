from flask_restful import Resource
from flask import request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import timedelta
from sqlalchemy import desc, asc, func
from core.extensions import db
from database.models import Users, SpareParts, Orders, Reviews, ReviewReactions

# ------------------ Auth ------------------
class Register(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {"error": "Email and password are required"}, 400

        if Users.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 409

        try:
            user = Users(email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            return {"status": "success", "message": "Account created successfully"}, 201
        except Exception as e:
            db.session.rollback()
            print("Error registering user:", e)
            return {"error": "Internal server error"}, 500
        
class Login(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {"error": "Email and password are required"}, 400

        user = Users.query.filter_by(email=email).first()

        if user and user.check_password(password):
            access_token = create_access_token(
                identity=str(user.id),
                fresh=True,
                expires_delta=timedelta(minutes=15)
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                expires_delta=timedelta(days=30)
            )

            return {
                "status": "success",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "role": user.role  
            }, 200

        return {"error": "Invalid credentials"}, 401
 
class TokenRefresh(Resource):
    @jwt_required(refresh=True)
    def post(self):
        current_user = get_jwt_identity()
        new_access_token = create_access_token(
            identity=current_user,
            fresh=False,  # Not fresh since it's from refresh
            expires_delta=timedelta(minutes=15)
        )
        return {"access_token": new_access_token}, 200

class CreateAdmin(Resource):
    @jwt_required()
    def post(self):
        current_user = Users.query.get(get_jwt_identity())
        if current_user.role != 'admin':
            return {"error": "Only admins can create other admins"}, 403

        data = request.get_json()
        email, password, name = data.get('email'), data.get('password'), data.get('name')
        if Users.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 409

        admin_user = Users(email=email, role='admin', name=name)
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.commit()
        return {"message": "Admin account created"}, 201


# ------------------ Spare Parts ------------------
class SparePartsList(Resource):
    @jwt_required(optional=True)
    def get(self, part_id=None):
        # --------- If part_id is provided, return single spare part ---------
        if part_id:
            part = SpareParts.query.get_or_404(part_id)
            result = part.to_dict()
            result['reviews'] = [r.to_dict() for r in part.reviews]
            return result, 200

        # --------- Otherwise, return list of spare parts ---------
        args = request.args
        page = args.get("page", 1, type=int)
        per_page = args.get("per_page", 16, type=int)

        query = SpareParts.query

        # Filters
        if args.get('category'):
            query = query.filter(SpareParts.category.ilike(f"%{args.get('category')}%"))
        if args.get('brand'):
            query = query.filter(SpareParts.brand.ilike(f"%{args.get('brand')}%"))
        if args.get('vehicle_type'):
            query = query.filter(SpareParts.vehicle_type.ilike(f"%{args.get('vehicle_type')}%"))
        if args.get('colour'):
            query = query.filter(SpareParts.colour.ilike(f"%{args.get('colour')}%"))

        # Sorting
        sort = args.get('sort')
        if sort == "discount":
            query = query.order_by(desc(SpareParts.discount_percentage)).limit(16)
            items = query.all()
            return {
                "items": [p.to_dict() for p in items],
                "total": len(items),
                "page": 1,
                "pages": 1
            }, 200
        elif sort == "price_high":
            query = query.order_by(desc(SpareParts.marked_price))
        elif sort == "price_low":
            query = query.order_by(asc(SpareParts.marked_price))
        elif sort == "price_mid":
            avg_price = db.session.query(func.avg(SpareParts.marked_price)).scalar() or 0
            query = query.order_by(func.abs(SpareParts.marked_price - avg_price))
        elif sort == "rating_high":
            query = query.order_by(desc(SpareParts.average_rating))
        elif sort == "rating_low":
            query = query.order_by(asc(SpareParts.average_rating))
        elif sort == "rating_mid":
            avg_rating = db.session.query(func.avg(SpareParts.average_rating)).scalar() or 0
            query = query.order_by(func.abs(SpareParts.average_rating - avg_rating))

        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [p.to_dict() for p in pagination.items],
            "total": pagination.total,
            "page": pagination.page,
            "pages": pagination.pages
        }, 200

# ------------------ Reviews ------------------
class ReviewsResource(Resource):
    def get(self, part_id):
        """Get all reviews for a spare part"""
        part = SpareParts.query.get_or_404(part_id)
        reviews = Reviews.query.filter_by(sparepart_id=part.id).order_by(Reviews.id.desc()).all()
        return [r.to_dict() for r in reviews], 200

    @jwt_required()
    def post(self, part_id):
        """Create a review (rating and/or comment)"""
        current_user_id = get_jwt_identity()
        user = Users.query.get(current_user_id)
        if not user:
            return {"error": "Invalid user"}, 401

        part = SpareParts.query.get_or_404(part_id)
        data = request.get_json() or {}

        # ---- Validate rating ----
        parsed_rating = None
        rating = data.get("rating")
        if rating is not None:
            try:
                rating = int(rating)
                if not 1 <= rating <= 5:
                    return {"error": "Rating must be between 1 and 5"}, 400
                parsed_rating = rating
            except (ValueError, TypeError):
                return {"error": "Rating must be an integer"}, 400

        # ---- Validate comment ----
        parsed_comment = None
        comment = data.get("comment")
        if isinstance(comment, str) and comment.strip():
            parsed_comment = comment.strip()

        if parsed_rating is None and not parsed_comment:
            return {"error": "Add a rating or comment"}, 400

        # ---- prevent duplicate reviews per user per part ----
        existing = Reviews.query.filter_by(user_id=current_user_id, sparepart_id=part.id).first()
        if existing:
            return {"error": "You have already reviewed this item"}, 409

        review = Reviews(
            user_id=current_user_id,
            sparepart_id=part.id,
            rating=parsed_rating,
            comment=parsed_comment
        )

        try:
            db.session.add(review)
            db.session.commit()

            # Update spare part stats
            part.update_review_stats()
            db.session.commit()
        except Exception:
            db.session.rollback()
            return {"error": "Failed to save review"}, 500

        return review.to_dict(), 201


class ReviewEditResource(Resource):
    @jwt_required()
    def patch(self, review_id):
        """Edit a review (owner only)"""
        current_user_id = get_jwt_identity()
        review = Reviews.query.get_or_404(review_id)

        if review.user_id != current_user_id:
            return {"error": "Cannot edit others' reviews"}, 403

        data = request.get_json() or {}

        # ---- Rating ----
        if "rating" in data:
            rating = data.get("rating")
            if rating is None:
                review.rating = None
            else:
                try:
                    rating = int(rating)
                    if not 1 <= rating <= 5:
                        return {"error": "Rating must be between 1 and 5"}, 400
                    review.rating = rating
                except (ValueError, TypeError):
                    return {"error": "Rating must be an integer"}, 400

        # ---- Comment ----
        if "comment" in data:
            comment = data.get("comment")
            if comment is None or not isinstance(comment, str) or not comment.strip():
                review.comment = None
            else:
                review.comment = comment.strip()

        if review.rating is None and not review.comment:
            return {"error": "Review must have a rating or comment"}, 400

        try:
            db.session.commit()

            # Update spare part stats
            review.spareparts.update_review_stats()
            db.session.commit()
        except Exception:
            db.session.rollback()
            return {"error": "Failed to update review"}, 500

        return review.to_dict(), 200

    @jwt_required()
    def delete(self, review_id):
        """Delete a review (owner only)"""
        current_user_id = get_jwt_identity()
        review = Reviews.query.get_or_404(review_id)

        if review.user_id != current_user_id:
            return {"error": "Cannot delete others' reviews"}, 403

        try:
            sparepart = review.spareparts
            db.session.delete(review)
            db.session.commit()

            # Update spare part stats
            sparepart.update_review_stats()
            db.session.commit()
        except Exception:
            db.session.rollback()
            return {"error": "Failed to delete review"}, 500

        return {"message": "Review deleted"}, 200


class ReviewReactionsResource(Resource):
    @jwt_required()
    def post(self, review_id):
        """React to a review (like/dislike)"""
        current_user_id = get_jwt_identity()
        user = Users.query.get(current_user_id)
        if not user:
            return {"error": "Invalid user"}, 401

        review = Reviews.query.get_or_404(review_id)
        if review.user_id == current_user_id:
            return {"error": "Cannot react to your own review"}, 400

        data = request.get_json() or {}
        is_like = data.get("is_like")
        if not isinstance(is_like, bool):
            return {"error": "is_like must be true or false"}, 400

        # Check if reaction already exists
        existing = ReviewReactions.query.filter_by(user_id=current_user_id, review_id=review.id).first()
        if existing:
            existing.is_like = is_like
            action = "updated"
        else:
            existing = ReviewReactions(user_id=current_user_id, review_id=review.id, is_like=is_like)
            db.session.add(existing)
            action = "added"

        try:
            db.session.commit()

            # Update spare part stats (likes/dislikes)
            review.spareparts.update_review_stats()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400

        return {"message": f"Reaction {action}"}, 200

# ------------------ Orders ------------------
class OrdersResource(Resource):
    @jwt_required()
    def get(self):
        """Get summary of orders for the logged-in user."""
        current_user = Users.query.get(get_jwt_identity())
        orders = Orders.query.filter_by(user_id=current_user.id).all()

        summary = []
        for order in orders:
            summary.append({
                "id": order.id,
                "status": order.status,
                "paid": order.paid,
                "total_items": sum(item.quantity for item in order.order_items),
                "address": f"{order.street}, {order.city}, {order.country}",
                "created_at": order.created_at.isoformat() if hasattr(order, "created_at") else None
            })

        return {"orders": summary}, 200

    @jwt_required()
    def patch(self, order_id):
        """Update an order's status (e.g., cancel by setting status='cancelled')."""
        current_user = Users.query.get(get_jwt_identity())
        order = Orders.query.get_or_404(order_id)

        if order.user_id != current_user.id:
            return {"error": "You cannot modify someone else's order"}, 403

        data = request.get_json()
        new_status = data.get("status")

        if not new_status:
            return {"error": "Missing status field"}, 400

        # Only allow pending -> cancelled
        if order.status != "pending":
            return {"error": f"Order cannot be updated (current status: {order.status})"}, 400
        if new_status not in ["cancelled"]:
            return {"error": "Invalid status change"}, 400

        order.status = new_status
        db.session.commit()
        return {"message": f"Order {order_id} status updated to {new_status}"}, 200
    

class AdminOrders(Resource):
    #View all orders (admin only).
    @jwt_required()
    def get(self):
        current_user = Users.query.get(get_jwt_identity())
        if current_user.role != 'admin':
            return {"error": "Admins only"}, 403

        orders = Orders.query.all()
        return [o.to_dict() for o in orders], 200

    @jwt_required()
    def patch(self, order_id):
        #Admin can update any order status from pending to delivered
        current_user = Users.query.get(get_jwt_identity())
        if current_user.role != 'admin':
            return {"error": "Admins only"}, 403

        order = Orders.query.get_or_404(order_id)
        data = request.get_json()
        new_status = data.get("status")

        if not new_status:
            return {"error": "Missing status field"}, 400

        # allowed transitions for admin
        allowed_statuses = ["pending", "cancelled","shipped","delivered"]
        if new_status not in allowed_statuses:
            return {"error": f"Invalid status. Allowed: {allowed_statuses}"}, 400

        order.status = new_status
        db.session.commit()

        return {"message": f"Order {order.id} status updated to {new_status}"}, 200
