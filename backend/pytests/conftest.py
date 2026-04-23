import pytest
from app import create_app
from core.extensions import db as _db
from sqlalchemy.orm import sessionmaker, scoped_session
from flask_jwt_extended import create_access_token

from database.models import Users, SpareParts


# ================== APP ==================

@pytest.fixture(scope="session")
def test_app():
    app = create_app()

    app.config.update(
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TESTING=True,
        JWT_SECRET_KEY="test-secret",
        PROPAGATE_EXCEPTIONS=True
    )

    with app.app_context():
        yield app


# ================== DB SETUP ==================

@pytest.fixture(scope="session", autouse=True)
def setup_database(test_app):
    with test_app.app_context():
        _db.create_all()
        yield
        _db.drop_all()


# ================== SESSION ==================

@pytest.fixture(autouse=True)
def session(test_app):
    with test_app.app_context():
        connection = _db.engine.connect()
        transaction = connection.begin()

        Session = scoped_session(sessionmaker(bind=connection))
        _db.session = Session

        yield Session

        transaction.rollback()
        connection.close()
        Session.remove()


# ================== CLIENT ==================

@pytest.fixture
def client(test_app):
    return test_app.test_client()


# ================== DB ALIAS ==================

@pytest.fixture
def db(session):
    return session


# ================== USER FIXTURE (FIXED) ==================

@pytest.fixture
def user(session):
    user = Users(
        email="test@example.com",
        email_verified=True
    )
    user.set_password("password123")

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


# ================== AUTH HEADER ==================

@pytest.fixture
def auth_header():
    def _make(user):
        token = create_access_token(identity=str(user.id))
        return {"Authorization": f"Bearer {token}"}

    return _make


# ================== AUTH HEADERS ==================

@pytest.fixture
def auth_headers(auth_header, user):
    return auth_header(user)


# ================== SPARE PART FIXTURE (FIXED) ==================

@pytest.fixture
def spare_part(session):
    part = SpareParts(
        category="tyre",
        vehicle_type="sedan",
        brand="Toyota",
        colour="black",
        buying_price=800,
        marked_price=1000,
        description="Test part"
    )

    session.add(part)
    session.commit()
    session.refresh(part)

    return part