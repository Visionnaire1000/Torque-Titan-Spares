from flask_restful import Resource
from flask import request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import timedelta
from sqlalchemy import desc, asc, func
from core.extensions import db
from database.models import Users, SpareParts, Orders, OrderItems, Reviews, ReviewReactions
from core.config import Config
import stripe

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
    @jwt_required()
    def post(self, part_id):
        current_user_id = get_jwt_identity()
        data = request.get_json()
        review = Reviews(user_id=current_user_id, sparepart_id=part_id)
        if 'rating' in data:
            review.rating = data['rating']
        if 'comment' in data:
            review.comment = data['comment']
        db.session.add(review)
        db.session.commit()
        return review.to_dict(), 201

    @jwt_required()
    def patch(self, review_id):
        current_user_id = get_jwt_identity()
        review = Reviews.query.get_or_404(review_id)
        if review.user_id != current_user_id:
            return {"error": "Cannot edit others' reviews"}, 403
        data = request.get_json()
        if 'rating' in data:
            review.rating = data['rating']
        if 'comment' in data:
            review.comment = data['comment']
        db.session.commit()
        return review.to_dict(), 200

    @jwt_required()
    def delete(self, review_id):
        current_user_id = get_jwt_identity()
        review = Reviews.query.get_or_404(review_id)
        if review.user_id != current_user_id:
            return {"error": "Cannot delete others' reviews"}, 403
        db.session.delete(review)
        db.session.commit()
        return {"message": "Review deleted"}, 200


class ReviewReactionsResource(Resource):
    @jwt_required()
    def post(self, review_id):
        current_user_id = get_jwt_identity()
        data = request.get_json()
        is_like = data.get('is_like')
        reaction = ReviewReactions.query.filter_by(user_id=current_user_id, review_id=review_id).first()
        if reaction:
            reaction.is_like = is_like
        else:
            reaction = ReviewReactions(user_id=current_user_id, review_id=review_id, is_like=is_like)
            db.session.add(reaction)
        db.session.commit()
        return {"message": "Reaction updated"}, 200

    @jwt_required()
    def delete(self, review_id):
        current_user_id = get_jwt_identity()
        reaction = ReviewReactions.query.filter_by(user_id=current_user_id, review_id=review_id).first()
        if reaction:
            db.session.delete(reaction)
            db.session.commit()
        return {"message": "Reaction removed"}, 200


# ------------------ Orders ------------------
class Checkout(Resource):
    @jwt_required()
    def post(self):
        data = request.get_json()
        items = data.get('items', [])  # support test format
        part_ids = data.get('part_ids', [])

        if not items and not part_ids:
            return {"error": "No spare parts selected"}, 400

        line_items = []

        if items:
            for item in items:
                part = SpareParts.query.get_or_404(item["part_id"])
                price = int((part.marked_price - part.discount_amount) * 100)
                line_items.append({
                    'price_data': {
                        'currency': 'kes',
                        'product_data': {'name': f"{part.brand} {part.category}"},
                        'unit_amount': price
                    },
                    'quantity': item.get("quantity", 1)
                })
        else:  # fallback to simple list
            for pid in part_ids:
                part = SpareParts.query.get_or_404(pid)
                price = int((part.marked_price - part.discount_amount) * 100)
                line_items.append({
                    'price_data': {
                        'currency': 'kes',
                        'product_data': {'name': f"{part.brand} {part.category}"},
                        'unit_amount': price
                    },
                    'quantity': 1
                })

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=Config.STRIPE_SUCCESS_URL,
            cancel_url=Config.STRIPE_CANCEL_URL,
        )
        return {'checkout_url': session.url}, 200
   
class OrdersResource(Resource):
    @jwt_required()
    def post(self):
        current_user = Users.query.get(get_jwt_identity())
        data = request.get_json()

        items = data.get('items', [])
        street = data.get('street')
        city = data.get('city')
        country = data.get('country')
        postal_code = data.get('postal_code')

        if not items:
            return {"error": "No items provided"}, 400
        if not all([street, city, country]):
            return {"error": "Missing address fields (street, city, country required)"}, 400

        order = Orders(
            user_id=current_user.id,
            paid=True,
            street=street,
            city=city,
            postal_code=postal_code,
            country=country,
            status="pending"
        )
        db.session.add(order)

        for item in items:
            part = SpareParts.query.get_or_404(item['sparepart_id'])
            qty = item.get('quantity', 1)
            order_item = OrderItems(order=order, sparepart=part, quantity=qty)
            db.session.add(order_item)

        db.session.commit()
        return order.to_dict(), 201

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

        # Only allow pending -> cancelled for now
        if order.status != "pending":
            return {"error": f"Order cannot be updated (current status: {order.status})"}, 400
        if new_status not in ["cancelled"]:
            return {"error": "Invalid status change"}, 400

        order.status = new_status
        db.session.commit()
        return {"message": f"Order {order_id} status updated to {new_status}"}, 200

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

        # Example allowed transitions for admin
        allowed_statuses = ["pending", "cancelled", "delivered"]
        if new_status not in allowed_statuses:
            return {"error": f"Invalid status. Allowed: {allowed_statuses}"}, 400

        order.status = new_status
        db.session.commit()

        return {"message": f"Order {order.id} status updated to {new_status}"}, 200
