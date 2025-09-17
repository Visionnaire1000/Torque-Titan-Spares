import pytest
from app import create_app
from core.extensions import db
from database.models import Users, SpareParts, Orders, OrderItems, Reviews, ReviewReactions

#----------------------------------- FIXTURES----------------------------------------------
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


@pytest.fixture(scope="session", autouse=True)
def setup_database(test_app):
    #(Create all tables once per test session and drop them at the end.)
    with test_app.app_context():
        db.create_all()
        yield
        db.drop_all()


@pytest.fixture(autouse=True)
def session(test_app):
    with test_app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        options = dict(bind=connection, binds={})
        session = db.create_scoped_session(options=options)

        db.session = session
        yield session

        transaction.rollback()
        connection.close()
        session.remove()

# ---------------------------------USERS MODEL---------------------------------------------------------------------
def test_user_password_hashing(session):
    user = Users(email="test@example.com", name="Tester")
    user.set_password("mypassword")

    assert user.password_hash != "mypassword"
    assert user.check_password("mypassword") is True
    assert user.check_password("wrong") is False


def test_invalid_email(session):
    with pytest.raises(ValueError):
        Users(email="invalid", name="Bad", password_hash="x")

# -----------------------------------SPARE PARTS MODEL--------------------------------------------------------------
def test_sparepart_discount_calculation(session):
    part = SpareParts(
        category="tyre", vehicle_type="suv", brand="Goodyear",
        buying_price=80, marked_price=100
    )
    part.calculate_discount()

    assert part.discount_amount == 20
    assert part.discount_percentage == 20.0


def test_invalid_category_vehicle(session):
    with pytest.raises(ValueError):
        SpareParts(category="chair", vehicle_type="suv", brand="X", buying_price=10, marked_price=20)

    with pytest.raises(ValueError):
        SpareParts(category="tyre", vehicle_type="bike", brand="X", buying_price=10, marked_price=20)


# ----------------------------------REVIEWS & REVIEWS REACTIONS MODELS----------------------------------------------------------------
def test_review_and_likes(session):
    user = Users(email="john@example.com", name="John")
    user.set_password("pass")
    part = SpareParts(
        category="tyre", vehicle_type="sedan", brand="Michelin",
        buying_price=50, marked_price=100
    )

    review = Reviews(user=user, sparepart=part, rating=5, comment="Great tyre")
    session.add_all([user, part, review])
    session.commit()

    part.update_review_stats()
    assert part.total_reviews == 1
    assert part.average_rating == 5.0

    like = ReviewReactions(user=user, review=review, is_like=True)
    session.add(like)
    session.commit()

    part.update_review_stats()
    assert part.total_likes == 1
    assert part.total_dislikes == 0


def test_invalid_rating(session):
    user = Users(email="rater@example.com", name="Rater")
    user.set_password("123")
    part = SpareParts(
        category="rim", vehicle_type="truck", brand="Toyota",
        buying_price=200, marked_price=300
    )
    session.add_all([user, part])
    session.commit()

    with pytest.raises(ValueError):
        Reviews(user=user, sparepart=part, rating=10)

#-------------------------------ORDERS & ORDER ITEMS MODELS---------------------------------------------------------
def test_order_total_calculation(session):
    user = Users(email="buyer@example.com", name="Buyer")
    user.set_password("pass")
    part = SpareParts(
        category="battery", vehicle_type="bus", brand="Bosch",
        buying_price=150, marked_price=200
    )
    session.add_all([user, part])
    session.commit()

    order = Orders(user=user, street="123 Road", city="Nairobi", postal_code="00100", country="Kenya")
    item = OrderItems(order=order, sparepart=part, quantity=2, unit_price=0, subtotal=0)

    item.calculate_subtotal()
    order.calculate_total()

    assert item.subtotal == (part.marked_price - part.discount_amount) * 2
    assert order.total_price == item.subtotal
