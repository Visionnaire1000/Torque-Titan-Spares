import pytest
from app import create_app
from core.extensions import db
from sqlalchemy.orm import sessionmaker, scoped_session
from flask_jwt_extended import create_access_token

# ---------------- APP FIXTURE ----------------
@pytest.fixture(scope="session")
def test_app():
    app = create_app()
    app.config.update(
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TESTING=True,
        JWT_SECRET_KEY="test-secret"
    )
    with app.app_context():
        yield app
        
# ---------------- DATABASE SETUP ----------------
@pytest.fixture(scope="session", autouse=True)
def setup_database(test_app):
    """Create all tables once for the session, drop after tests finish."""
    with test_app.app_context():
        db.create_all()
        yield
        db.drop_all()


@pytest.fixture(autouse=True)
def session(test_app):
    """Rollback database between each test for isolation."""
    with test_app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()

        Session = scoped_session(sessionmaker(bind=connection), scopefunc=lambda: None)
        db.session = Session

        yield Session

        transaction.rollback()
        connection.close()
        Session.remove()


# ---------------- CLIENT FIXTURE ----------------
@pytest.fixture
def client(test_app):
    """Flask test client for making requests."""
    return test_app.test_client()


# ---------------- AUTH HELPER ----------------
@pytest.fixture
def auth_header():
    """Returns a function to generate Authorization header for a given user."""

    def _make(user):
        token = create_access_token(identity=str(user.id))
        return {"Authorization": f"Bearer {token}"}

    return _make
