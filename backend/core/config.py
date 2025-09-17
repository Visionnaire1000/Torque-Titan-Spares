from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Secrets
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL")

    # Stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    # Checkout
    STRIPE_SUCCESS_URL = os.getenv("FRONTEND_SUCCESS_URL")
    STRIPE_CANCEL_URL = os.getenv("FRONTEND_CANCEL_URL")
