from flask_restful import Resource
from flask import request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import timedelta
from sqlalchemy import desc, asc, func
from sqlalchemy.orm import joinedload
import uuid
from core.extensions import db
from database.models import Users, SpareParts, Orders, OrderItems, Reviews, ReviewReactions

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

        
class ChangePassword(Resource):
    @jwt_required()
    def post(self):
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return {"error": "Current and new password are required"}, 400

        user_id = get_jwt_identity()
        user = Users.query.get(user_id)

        if not user:
            return {"error": "User not found"}, 404

        if not user.check_password(current_password):
            return {"error": "Current password is incorrect"}, 401

        try:
            user.set_password(new_password)
            db.session.commit()
            return {"status": "success", "message": "Password updated successfully"}, 200
        except Exception as e:
            db.session.rollback()
            print("Password change error:", e)
            return {"error": "Internal server error"}, 500\
            
class DeleteAccount(Resource):
    @jwt_required()
    def delete(self):
        data = request.get_json()
        password = data.get('password')

        if not password:
            return {"error": "Password confirmation required"}, 400

        user_id = get_jwt_identity()
        user = Users.query.get(user_id)

        if not user or not user.check_password(password):
            return {"error": "Invalid password"}, 401

        try:
            db.session.delete(user)
            db.session.commit()
            return {"status": "success", "message": "Account deleted"}, 200
        except Exception as e:
            db.session.rollback()
            print("Delete error:", e)
            return {"error": "Internal server error"}, 500


class CreateAdmin(Resource):
    @jwt_required()
    def post(self):
        current_user = Users.query.get(get_jwt_identity())
        if current_user.role != 'admin':
            return {"error": "Only admins can create other admins"}, 403

        data = request.get_json()
        email, password = data.get('email'), data.get('password')
        if Users.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 409

        admin_user = Users(email=email, role='admin')
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.commit()
        return {"message": "Admin account created"}, 201

# ------------------ Spare Parts ------------------
class SparePartsList(Resource):
    @jwt_required(optional=True)
    def get(self, part_id=None):

        # ---------------- Single Item ----------------
        if part_id:
            part = SpareParts.query.get_or_404(part_id)
            result = part.to_dict()
            result["reviews"] = [r.to_dict() for r in part.reviews]
            return result, 200

        args = request.args
        page = args.get("page", 1, type=int)
        per_page = args.get("per_page", 16, type=int)

        query = SpareParts.query

        # ---------------- Basic Filters ----------------
        category = (args.get("category") or "").lower()
        vehicle_type = (args.get("vehicle_type") or "").lower()
        brand = args.get("brand")
        colour = args.get("colour")

        if category:
            query = query.filter(SpareParts.category.ilike(f"%{category}%"))

        if brand:
            query = query.filter(SpareParts.brand.ilike(f"%{brand}%"))

        if vehicle_type:
            query = query.filter(SpareParts.vehicle_type.ilike(f"%{vehicle_type}%"))

        if colour:
            query = query.filter(SpareParts.colour.ilike(f"%{colour}%"))

        # ---------------- Price Filter (Category + Vehicle Type aware) ----------------
        price_filter = args.get("price")

        PRICE_RANGES = {
            "tyre": {
                "sedan": {"low": 15000, "medium": 30000},
                "suv": {"low": 25000, "medium": 40000},
                "truck": {"low": 35000, "medium": 45000},
                "bus": {"low": 25000, "medium": 30000},
            },
            "rim": {
                "sedan": {"low": 20000, "medium": 30000},
                "suv": {"low": 25000, "medium": 35000},
                "truck": {"low": 30000, "medium": 35000},
                "bus": {"low": 25000, "medium": 30000},
            },
            "battery": {
                "sedan": {"low": 20000, "medium": 30000},
                "suv": {"low": 26000, "medium": 35000},
                "truck": {"low": 26000, "medium": 35000},
                "bus": {"low": 35000, "medium": 40000},
            },
            "oil filter": {
                "default": {"low": 7500, "medium": 8500},
            }
        }

        ranges = None
        category_ranges = PRICE_RANGES.get(category)

        if category_ranges:
            ranges = (
                category_ranges.get(vehicle_type)
                or category_ranges.get("default")
            )

        if price_filter and ranges:
            low = ranges["low"]
            medium = ranges["medium"]

            if price_filter == "low":
                query = query.filter(SpareParts.buying_price < low)

            elif price_filter == "medium":
                query = query.filter(
                    SpareParts.buying_price >= low,
                    SpareParts.buying_price <= medium
                )

            elif price_filter == "high":
                query = query.filter(SpareParts.buying_price > medium)

        # ---------------- Pagination ----------------
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

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
        """Get summary of orders for the logged-in user, including order items."""
        current_user = Users.query.get(get_jwt_identity())
        orders = Orders.query.filter_by(user_id=current_user.id).all()

        summary = []
        for order in orders:
            order_data = {
                "id": order.id,
                "status": order.status,
                "paid": order.paid,
                "total_items": sum(item.quantity for item in order.order_items),
                "total_price": order.total_price,
                "address": f"{order.street}, {order.city}, {order.country}",
                "created_at": order.created_at.isoformat() if hasattr(order, "created_at") else None,
                
                # Include order items
                "order_items": [
                    {
                        "id": item.id,
                        "quantity": item.quantity,
                        "price": float(item.unit_price),
                        "sparepart": {
                            "id": item.sparepart.id,
                            "brand": item.sparepart.brand,
                            "category": item.sparepart.category,
                            "vehicle_type": item.sparepart.vehicle_type,
                            "image_url": item.sparepart.image
                        }
                    }
                    for item in order.order_items
                ]
            }
            summary.append(order_data)

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
