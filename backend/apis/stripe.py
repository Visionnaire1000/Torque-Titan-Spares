from flask import request, jsonify
import json
import stripe

def init_stripe(app):
    # Stripe setup
    stripe.api_key = app.config["STRIPE_SECRET_KEY"]
    endpoint_secret = app.config["STRIPE_WEBHOOK_SECRET"]

    # Stripe webhook
    @app.route("/webhook", methods=["POST"])
    def stripe_webhook():
        payload = request.data
        sig_header = request.headers.get("Stripe-Signature")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except stripe.error.SignatureVerificationError:
            return "Invalid signature", 400
        except Exception as e:
            return str(e), 400

        if event["type"] == "checkout.session.completed":
            print("Payment completed:", json.dumps(event, indent=2))

        return jsonify(success=True), 200
