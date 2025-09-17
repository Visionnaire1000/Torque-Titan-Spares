from flask import Flask
from flask_cors import CORS
from core.config import Config
from core.extensions import db, bcrypt, jwt, migrate, api
from apis.routes import register_routes
from apis.stripe import init_stripe

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Init extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    api.init_app(app)

    # CORS
    CORS(app, resources={r"/*": {"origins": app.config["FRONTEND_URL"]}})

    # Register routes
    register_routes(api)
   
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
