from flask_restful import Resource
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.extensions import db
from datetime import datetime
from database.models import Users, Orders, SpareParts, Reviews, ReviewReactions

     
 # ---------------------------------- Account Management ----------------------------------------------
class CreateAdmin(Resource):
    @jwt_required()
    def post(self):
        current_user = Users.query.get(get_jwt_identity())
        
        if current_user.role != 'super_admin':
            return {"error": "Only super_admin can create admins"}, 403

        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {"error": "Email and password are required"}, 400

        if Users.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 409

        # Create admin with auto verification 
        admin_user = Users(
            email=email,
            role='admin',
            email_verified=True,        # bypasses verification for admins
            email_otp_hash=None,
            email_otp_expires=None,
            otp_last_sent=None,
            otp_resend_count=0,
            otp_attempts=0,
            otp_locked_until=None
        )

        admin_user.set_password(password)

        db.session.add(admin_user)
        db.session.commit()

        return {
            "message": "Admin account created and verified successfully",
            "id": str(admin_user.id),
            "email": admin_user.email
        }, 201
    

class ListAdmins(Resource):
    @jwt_required()
    def get(self):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role != 'super_admin':
            return {"error": "Only super_admin can list admins"}, 403

        admins = Users.query.filter_by(role='admin').all()
        admins_list = [{"id": str(a.id), "email": a.email} for a in admins]

        return {"admins": admins_list}, 200
    
class DeleteAdmin(Resource):
    @jwt_required()
    def delete(self, admin_id):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role != 'super_admin':
            return {"error": "Only super_admin can delete admins"}, 403

        admin_user = Users.query.get(admin_id)  # admin_id is already a string UUID

        if not admin_user or admin_user.role != 'admin':
            return {"error": "Admin not found or cannot delete this user"}, 404

        db.session.delete(admin_user)
        db.session.commit()

        return {"message": f"Admin {admin_user.email} deleted successfully"}, 200
    
 
# ------------------------------ Orders Management -------------------------------------------
class AdminOrders(Resource):

    # View all orders (admin and super_admin only)
    @jwt_required()
    def get(self):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Admins only"}, 403

        orders = Orders.query.order_by(Orders.created_at.desc()).all()

        summary = []

        for order in orders:
            order_data = {
                "id": order.id,
                "status": order.status,
                "paid": order.paid,
                "total_items": sum(item.quantity for item in order.order_items),
                "total_price": order.total_price,

                "address": f"{order.street}, {order.city}, {order.country}",

                "created_at": order.created_at.isoformat() if order.created_at else None,
                "shipped_at": order.shipped_at.isoformat() if order.shipped_at else None,
                "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,

                # Order items
                "order_items": [
                    {
                        "id": item.id,
                        "quantity": item.quantity,
                        "price": float(item.unit_price),
                        "subtotal": float(item.subtotal),

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


    # Update order status
    @jwt_required()
    def patch(self, order_id):

        current_user = Users.query.get(get_jwt_identity())

        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Admins only"}, 403

        order = Orders.query.get_or_404(order_id)

        data = request.get_json()
        new_status = data.get("status")

        if not new_status:
            return {"error": "Missing status field"}, 400

        allowed_statuses = ["pending", "cancelled", "shipped", "delivered"]

        if new_status not in allowed_statuses:
            return {"error": f"Invalid status. Allowed: {allowed_statuses}"}, 400

        # Update status
        order.status = new_status

        # Set timestamps
        if new_status == "shipped" and not order.shipped_at:
            order.shipped_at = datetime.utcnow()

        if new_status == "delivered" and not order.delivered_at:
            order.delivered_at = datetime.utcnow()

        db.session.commit()

        return {
            "message": f"Order {order.id} updated successfully",
            "status": order.status,
            "shipped_at": order.shipped_at.isoformat() if order.shipped_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None
        }, 200
    
    
# ------------------------------ Spare Parts Management -------------------------------------------
class AdminSpareParts(Resource):

    # ---------------- CREATE ----------------
    @jwt_required()
    def post(self):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Admins only"}, 403

        data = request.get_json()

        try:
            # Convert prices safely
            try:
                buying_price = float(data.get("buying_price", 0))
                marked_price = float(data.get("marked_price", 0))
            except (TypeError, ValueError):
                return {"error": "Invalid price values"}, 400

            spare = SpareParts(
                category=data.get("category"),
                vehicle_type=data.get("vehicle_type"),
                brand=data.get("brand"),
                colour=data.get("colour"),
                buying_price=buying_price,
                marked_price=marked_price,
                image=data.get("image"),
                description=data.get("description"),
            )

            # Safe calculation
            spare.calculate_discount()

            db.session.add(spare)
            db.session.commit()

            return {
                "message": "Spare part created successfully",
                "sparepart": spare.to_dict()
            }, 201

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400


    # ---------------- UPDATE ----------------
    @jwt_required()
    def put(self, spare_id):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Admins only"}, 403

        spare = SpareParts.query.get(spare_id)

        if not spare:
            return {"error": "Spare part not found"}, 404

        data = request.get_json()

        try:
            for field in [
                "category",
                "vehicle_type",
                "brand",
                "colour",
                "buying_price",
                "marked_price",
                "image",
                "description",
            ]:
                if field in data:
                    if field in ["buying_price", "marked_price"]:
                        try:
                            value = float(data[field])
                        except (TypeError, ValueError):
                            return {"error": f"Invalid value for {field}"}, 400
                        setattr(spare, field, value)
                    else:
                        setattr(spare, field, data[field])

            # Recalculate after update
            spare.calculate_discount()

            db.session.commit()

            return {
                "message": "Spare part updated successfully",
                "sparepart": spare.to_dict()
            }, 200

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400


    # ---------------- DELETE ----------------
    @jwt_required()
    def delete(self, spare_id):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Admins only"}, 403

        spare = SpareParts.query.get(spare_id)

        if not spare:
            return {"error": "Spare part not found"}, 404

        try:
            db.session.delete(spare)
            db.session.commit()

            return {"message": "Spare part deleted successfully"}, 200

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400
        

class AdminReviewsResource(Resource):
    @jwt_required()
    def get(self):
        current_user = Users.query.get(get_jwt_identity())

        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Admins only"}, 403

        reviews = Reviews.query.order_by(Reviews.created_at.desc()).all()
        result = []

        for r in reviews:
            r_dict = r.to_dict()

            r_dict["sparepart_id"] = r.sparepart_id

            sparepart = r.spareparts
            r_dict["sparepart_image"] = (
                sparepart.image if sparepart and sparepart.image else None
            )

            user = r.users
            r_dict["user_display_name"] = (
                f"{r.user_display_name} ({user.email if user else 'unknown'})"
            )

            r_dict["total_likes"] = r.total_likes
            r_dict["total_dislikes"] = r.total_dislikes

            # (ISO format timestamp)
            r_dict["created_at"] = (
                r.created_at.isoformat() if r.created_at else None
            )

            r_dict["likes"] = [
                {"user_id": l.user_id, "is_like": l.is_like}
                for l in r.likes
            ]

            result.append(r_dict)

        return result, 200
    
class AdminReviewsBySparePartResource(Resource):
    @jwt_required()
    def get(self, sparepart_id):
        """Fetch all reviews for a given spare part (admin only)"""
        current_user = Users.query.get(get_jwt_identity())
        if current_user.role not in ["admin", "super_admin"]:
            return {"error": "Unauthorized"}, 403

        reviews = Reviews.query.filter_by(sparepart_id=sparepart_id).order_by(Reviews.id.desc()).all()
        result = []

        for r in reviews:
            r_dict = r.to_dict()
            r_dict["sparepart_id"] = r.sparepart_id
            user = r.users
            r_dict["user_display_name"] = f"{r.user_display_name} ({user.email if user else 'unknown'})"
            r_dict["total_likes"] = r.total_likes
            r_dict["total_dislikes"] = r.total_dislikes
            r_dict["likes"] = [{"user_id": l.user_id, "is_like": l.is_like} for l in r.likes]
            result.append(r_dict)

        return result, 200
    
class AdminReviewReactionsResource(Resource):
    @jwt_required()
    def get(self, review_id):
        current_user_id = get_jwt_identity()
        current_user = Users.query.get(current_user_id)

        if current_user.role not in ["admin", "superadmin"]:
            return {"error": "Unauthorized"}, 403

        review = Reviews.query.get_or_404(review_id)

        reactions = ReviewReactions.query.filter_by(review_id=review.id).all()
        reaction_list = [
            {
                "user_id": r.user_id,
                "username": r.users.username,  
                "is_like": r.is_like
            }
            for r in reactions
        ]

        total_likes = sum(1 for r in reactions if r.is_like)
        total_dislikes = sum(1 for r in reactions if not r.is_like)

        return {
            "review_id": review.id,
            "review_text": review.text,
            "total_likes": total_likes,
            "total_dislikes": total_dislikes,
            "reactions": reaction_list
        }, 200