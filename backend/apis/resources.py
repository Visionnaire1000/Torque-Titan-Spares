from flask_restful import Resource
from flask import request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, verify_jwt_in_request,get_jwt_identity
from datetime import timedelta
from core.extensions import db
from utils.tasks import send_email_task
from datetime import datetime
from database.models import Users, SpareParts, Orders, Reviews, ReviewReactions

# ------------------ Auth ------------------
class Register(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {"error": "Email and password required", "wait_seconds": 0}, 400

        existing_user = Users.query.filter_by(email=email).first()
        if existing_user:
            return {"error": "Email already exists. Use resend to get OTP again.", "wait_seconds": 0}, 409

        try:
            user = Users(email=email)
            user.set_password(password)
            user.email_verified = False

            # generate OTP
            raw_otp = user.generate_email_otp()

            db.session.add(user)
            db.session.commit()

            # send OTP async via Brevo
            send_email_task.delay(user.email, raw_otp)

            return {
                "status": "success",
                "message": "Verification code sent to your email",
                "wait_seconds": Users.OTP_RESEND_COOLDOWN_SECONDS
            }, 201

        except Exception as e:
            db.session.rollback()
            print("Register error:", e)
            return {"error": "Internal server error", "wait_seconds": 0}, 500

class ResendOTP(Resource):
    def post(self):
        data = request.get_json() or {}
        email = data.get("email")

        user = None
        is_logged_in = False

        # Try JWT first (logged-in / during password change)
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = Users.query.get(user_id)
                is_logged_in = True
        except Exception:
            user = None

        # Fallback to email (during registration)
        if not user and email:
            user = Users.query.filter_by(email=email).first()

        if not user:
            return {"status": "error", "message": "User not found", "wait_seconds": 0}, 404

        # Only block if user is already verified(during registration,not during password change)
        if not is_logged_in and user.email_verified:
            return {"status": "info", "message": "Email already verified", "wait_seconds": 0}, 200

        # Cooldown check
        can_resend, wait_seconds = user.can_resend_otp(
            cooldown_seconds=Users.OTP_RESEND_COOLDOWN_SECONDS,
            max_resends=Users.MAX_OTP_RESENDS,
        )
        if not can_resend:
            return {"status": "error", "message": "Too many failed attempts. OTP locked for 15 minutes", "wait_seconds": wait_seconds}, 429

        # Generate OTP
        raw_otp = user.generate_email_otp()
        db.session.commit()
        send_email_task.delay(user.email, raw_otp)

        return { "status": "success", 
                 "message": "New OTP sent to your email", "wait_seconds": Users.OTP_RESEND_COOLDOWN_SECONDS}, 200
    
class VerifyAccount(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        otp = data.get("otp")

        user = Users.query.filter_by(email=email).first()
        if not user:
            return {"error": "User not found"}, 404

        result = user.verify_email_otp(otp)

        if result == "locked":
            return {"error": "Too many failed attempts. OTP locked for 15 minutes."}, 403

        if not result:
            db.session.commit()
            return {"error": "Invalid or expired code"}, 400

        db.session.commit()
        return {"message": "Account verified successfully"}, 200
    

class Login(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return {"error": "Email and password required"}, 400

        user = Users.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            return {"error": "Invalid credentials"}, 401

        if not user.email_verified:
            return {"error": "Please verify your email first"}, 403

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "role": user.role,
            "display_name": user.display_name
        }, 200
    

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
        data = request.get_json() or {}
        current_password = data.get("current_password")
        otp = data.get("otp")
        new_password = data.get("new_password")

        if not current_password:
            return {"error": "Current password is required"}, 400

        user = Users.query.get(get_jwt_identity())
        if not user or not user.check_password(current_password):
            return {"error": "Invalid credentials"}, 401

        # ------------------ OTP LOCK CHECK ------------------
        if user.otp_locked_until and datetime.utcnow() < user.otp_locked_until:
            remaining = int(
                (user.otp_locked_until - datetime.utcnow()).total_seconds()
            )
            return {
                "error": "Too many failed attempts. OTP locked for 15 minutes",
                "wait_seconds": max(remaining, 0),
            }, 423

        # ---------SEND OTP FIRST TIME ---------------------
        if not otp and not new_password:
            raw_otp = user.generate_email_otp()
            db.session.commit()
            send_email_task.delay(user.email, raw_otp)

            return {
                "status": "otp_sent",
                "message": "OTP sent to your email",
                "wait_seconds": Users.OTP_RESEND_COOLDOWN_SECONDS,
            }, 200

        # -------VERIFY OTP & CHANGE PASSWORD -------------------
        if not otp or not new_password:
            return {"error": "OTP and new password are required"}, 400

        result = user.verify_email_otp(otp)
        db.session.commit()

        if result == "locked":
            remaining = int(
                (user.otp_locked_until - datetime.utcnow()).total_seconds()
            ) if user.otp_locked_until else Users.OTP_RESEND_COOLDOWN_SECONDS

            return {
                "error": "Too many failed attempts. OTP locked for 15 minutes",
                "wait_seconds": max(remaining, 0),
            }, 423

        elif not result:
            return {"error": "Invalid or expired OTP"}, 401

        try:
            user.set_password(new_password)
            db.session.commit()

            return {
                "status": "success",
                "message": "Password updated successfully",
            }, 200

        except Exception as e:
            db.session.rollback()
            print("Password change error:", e)
            return {"error": "Internal server error"}, 500
        
        
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

        result = []
        for r in reviews:
            r_dict = r.to_dict()
            # Use property to get proper display name
            r_dict["user_display_name"] = r.user_display_name

            # Include total likes/dislikes
            r_dict["total_likes"] = r.total_likes
            r_dict["total_dislikes"] = r.total_dislikes

            # Include individual reactions for frontend
            r_dict["likes"] = [{"user_id": l.user_id, "is_like": l.is_like} for l in r.likes]

            result.append(r_dict)

        return result, 200

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

        # Return dict with display name and initial likes/dislikes
        review_dict = review.to_dict()
        review_dict["user_display_name"] = review.user_display_name
        review_dict["total_likes"] = 0
        review_dict["total_dislikes"] = 0
        review_dict["likes"] = []

        return review_dict, 201

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
        current_user_id = get_jwt_identity()
        review = Reviews.query.get_or_404(review_id)

        # cannot react to own review
        if review.user_id == current_user_id:
            return {"error": "Cannot react to your own review"}, 400

        data = request.get_json() or {}
        if "is_like" not in data:
            return {"error": "is_like is required"}, 400

        is_like = bool(data.get("is_like"))

        existing = ReviewReactions.query.filter_by(
            user_id=current_user_id,
            review_id=review.id
        ).first()

        action = "added"

        if existing:
            # TOGGLE OFF
            if existing.is_like == is_like:
                db.session.delete(existing)
                action = "removed"
            else:
                # SWITCH reaction
                existing.is_like = is_like
                action = "switched"
        else:
            new_reaction = ReviewReactions(
                user_id=current_user_id,
                review_id=review.id,
                is_like=is_like,
            )
            db.session.add(new_reaction)

        # update counters
        review.update_reaction_stats()
        review.spareparts.update_review_stats()

        db.session.commit()

        return {
            "action": action,
            "review": {
                "id": review.id,
                "total_likes": review.total_likes,
                "total_dislikes": review.total_dislikes,
            },
        }, 200
    
    
# ------------------ Orders ------------------
class OrdersResource(Resource):
    @jwt_required()
    def get(self):
        """Get summary of orders for the logged-in user, including order items."""
        current_user = Users.query.get(get_jwt_identity())
        orders = Orders.query.filter_by(user_id=current_user.id).all()

        summary = []
        for order in orders:
            # Ensure order_items is always a list
            order_items = order.order_items or []
            if not isinstance(order_items, list):
                order_items = [order_items]

            # Uses model method to calculate total price
            order.calculate_total()
            total_items = sum(int(item.quantity or 0) for item in order_items)
            total_price = float(order.total_price or 0)

            order_data = {
                "id": order.id,
                "status": order.status,
                "paid": order.paid,
                "total_items": total_items,
                "total_price": total_price,
                "address": f"{order.street}, {order.city}, {order.country}",
                "created_at": order.created_at.isoformat() if hasattr(order, "created_at") else None,

                # Include order items
                "order_items": [
                    {
                        "id": item.id,
                        "quantity": int(item.quantity or 0),
                        "price": float(item.unit_price or 0),
                        "subtotal": float(item.subtotal or 0),
                        "sparepart": {
                            "id": item.sparepart.id,
                            "brand": item.sparepart.brand,
                            "category": item.sparepart.category,
                            "vehicle_type": item.sparepart.vehicle_type,
                            "image_url": item.sparepart.image
                        }
                    }
                    for item in order_items
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
  