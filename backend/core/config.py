from dotenv import load_dotenv
from datetime import timedelta
import os

load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Secrets
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Expiry times
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)   
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_ENDPOINT_URL")

    # Stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    # Checkout
    STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL")
    STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL")
