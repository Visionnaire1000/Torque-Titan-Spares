from flask_restful import Resource
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.extensions import db
from datetime import datetime
from database.models import Users, Orders

     
 # ---------------------------------- Account Management -----------------------------------------------
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

        admin_user = Users(email=email, role='admin')
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.commit()

        # Return UUID as string
        return {
            "message": "Admin account created successfully",
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