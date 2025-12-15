# apis/stripe.py
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import stripe
from database.models import db, Users, Orders, OrderItems, SpareParts

def init_stripe(app):
    """
    Initialize Stripe routes and webhook using environment variables from Config.
    """
    stripe.api_key = app.config["STRIPE_SECRET_KEY"]
    endpoint_secret = app.config["STRIPE_WEBHOOK_SECRET"]
    success_url = app.config["STRIPE_SUCCESS_URL"]
    cancel_url = app.config["STRIPE_CANCEL_URL"]

    # ---------------- CREATE CHECKOUT SESSION ----------------
    @app.route("/create-checkout-session", methods=["POST"])
    @jwt_required()
    def create_checkout_session():
        data = request.get_json()
        current_user = Users.query.get(get_jwt_identity())

        items = data.get("items", [])
        street = data.get("street")
        city = data.get("city")
        country = data.get("country")
        postal_code = data.get("postal_code")

        if not items:
            return {"error": "Cart is empty"}, 400
        if not all([street, city, country]):
            return {"error": "Missing address fields"}, 400

        # Create order (paid=False)
        order = Orders(
            user_id=current_user.id,
            paid=False,
            street=street,
            city=city,
            postal_code=postal_code,
            country=country,
            status="pending"
        )
        db.session.add(order)

        stripe_items = []

        for item in items:
            part = SpareParts.query.get(item["sparepart_id"])
            qty = item.get("quantity", 1)

            if qty <= 0:
                return {"error": "Quantity must be positive"}, 400

            # Add order item
            order_item = OrderItems(order=order, sparepart=part, quantity=qty)
            db.session.add(order_item)

            # Prepare Stripe line item
            stripe_items.append({
                "price_data": {
                    "currency": "kes",
                    "product_data": {"name": part.name},
                    "unit_amount": int(part.marked_price * 100)
                },
                "quantity": qty,
            })

        db.session.commit()

        # Create Stripe session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=stripe_items,
            metadata={"order_id": order.id},  # Link Stripe session to order
            success_url=success_url,
            cancel_url=cancel_url
        )

        return jsonify({"url": session.url})

    # ---------------- STRIPE WEBHOOK ----------------
    @app.route("/webhook", methods=["POST"])
    def stripe_webhook():
        payload = request.data
        sig_header = request.headers.get("Stripe-Signature")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except Exception as e:
            return str(e), 400

        # Payment successful
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            order_id = session["metadata"]["order_id"]

            order = Orders.query.get(order_id)
            if order:
                order.paid = True
                order.status = "paid"
                db.session.commit()
                print(f"✔ ORDER {order_id} MARKED AS PAID")

        return jsonify({"success": True})
