import pytest
from unittest.mock import patch, MagicMock
from flask_jwt_extended import create_access_token
from app import create_app
from core.extensions import db
from database.models import Users, SpareParts, Orders, OrderItems, Reviews


# ---------------- FIXTURES ----------------
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


@pytest.fixture
def client(test_app):
    return test_app.test_client()


def auth_header(user):
    token = create_access_token(identity=str(user.id))
    return {"Authorization": f"Bearer {token}"}


# ---------------- AUTH ----------------
def test_register_and_login(client, session):
    resp = client.post("/register", json={
        "email": "test@example.com",
        "password": "pass123",
        "name": "Tester"
    })
    assert resp.status_code == 201

    resp = client.post("/login", json={
        "email": "test@example.com",
        "password": "pass123"
    })
    data = resp.get_json()
    assert resp.status_code == 200
    assert "access_token" in data


# ---------------- SPARE PARTS ----------------
def test_spareparts_list_and_get(client, session):
    part = SpareParts(category="tyre", vehicle_type="suv", brand="Michelin",
                      buying_price=50, marked_price=100)
    session.add(part)
    session.commit()

    resp = client.get("/spareparts")
    assert resp.status_code == 200
    assert resp.get_json()["total"] >= 1

    resp = client.get(f"/spareparts/{part.id}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["brand"] == "Michelin"


# ---------------- REVIEWS ----------------
def test_reviews_crud(client, session):
    user = Users(email="reviewer@example.com", name="Rev", role="buyer")
    user.set_password("pass")
    part = SpareParts(category="rim", vehicle_type="sedan", brand="Enkei",
                      buying_price=80, marked_price=120)
    session.add_all([user, part])
    session.commit()

    resp = client.post(f"/spareparts/{part.id}/reviews",
                       headers=auth_header(user),
                       json={"rating": 5, "comment": "Excellent"})
    assert resp.status_code == 201
    review_id = resp.get_json()["id"]

    resp = client.patch(f"/reviews/{review_id}",
                        headers=auth_header(user),
                        json={"comment": "Updated"})
    assert resp.status_code == 200
    assert resp.get_json()["comment"] == "Updated"

    resp = client.delete(f"/reviews/{review_id}",
                         headers=auth_header(user))
    assert resp.status_code == 200
    
 # -----------------------------------REVIEWS EXTRA TESTS--------------------------------------------------------------

def test_create_valid_review(session):
    user = Users(email="rev1@example.com", name="Reviewer1")
    user.set_password("pass")
    part = SpareParts(
        category="tyre", vehicle_type="suv", brand="Dunlop",
        buying_price=60, marked_price=100
    )
    session.add_all([user, part])
    session.commit()

    review = Reviews(user=user, sparepart=part, rating=4, comment="Good product")
    session.add(review)
    session.commit()

    assert review.id is not None
    assert review.rating == 4
    assert review.comment == "Good product"
    assert part.reviews[0] == review


def test_prevent_duplicate_review(session):
    user = Users(email="rev2@example.com", name="Reviewer2")
    user.set_password("pass")
    part = SpareParts(
        category="rim", vehicle_type="sedan", brand="Enkei",
        buying_price=120, marked_price=200
    )
    session.add_all([user, part])
    session.commit()

    review1 = Reviews(user=user, sparepart=part, rating=5, comment="Excellent")
    session.add(review1)
    session.commit()

    # Try adding another review for the same part by the same user
    with pytest.raises(ValueError):
        review2 = Reviews(user=user, sparepart=part, rating=3, comment="Changed my mind")
        session.add(review2)
        session.commit()


def test_rating_boundaries(session):
    user = Users(email="rev3@example.com", name="Reviewer3")
    user.set_password("pass")
    part = SpareParts(
        category="battery", vehicle_type="truck", brand="Bosch",
        buying_price=200, marked_price=300
    )
    session.add_all([user, part])
    session.commit()

    # Rating too low
    with pytest.raises(ValueError):
        Reviews(user=user, sparepart=part, rating=0)

    # Rating too high
    with pytest.raises(ValueError):
        Reviews(user=user, sparepart=part, rating=6)

    # Valid rating should work
    review = Reviews(user=user, sparepart=part, rating=1, comment="Barely okay")
    session.add(review)
    session.commit()

    assert review.rating == 1


def test_deleting_review_updates_stats(session):
    user = Users(email="rev4@example.com", name="Reviewer4")
    user.set_password("pass")
    part = SpareParts(
        category="tyre", vehicle_type="sedan", brand="Pirelli",
        buying_price=90, marked_price=150
    )
    session.add_all([user, part])
    session.commit()

    review = Reviews(user=user, sparepart=part, rating=5, comment="Perfect fit")
    session.add(review)
    session.commit()

    part.update_review_stats()
    assert part.total_reviews == 1
    assert part.average_rating == 5.0

    # Now delete the review
    session.delete(review)
    session.commit()

    part.update_review_stats()
    assert part.total_reviews == 0
    assert part.average_rating == 0

# ---------------- ORDERS ----------------
def test_order_flow(client, session):
    user = Users(email="buyer@example.com", name="Buyer", role="buyer")
    user.set_password("pass")
    part = SpareParts(category="battery", vehicle_type="bus", brand="Bosch",
                      buying_price=150, marked_price=200)
    session.add_all([user, part])
    session.commit()

    resp = client.post("/orders", headers=auth_header(user), json={
        "items": [{"sparepart_id": part.id, "quantity": 2}],
        "street": "123 Road",
        "city": "Nairobi",
        "country": "Kenya",
        "postal_code": "00100"
    })
    assert resp.status_code == 201
    order_id = resp.get_json()["id"]

    resp = client.get("/orders", headers=auth_header(user))
    assert resp.status_code == 200
    assert len(resp.get_json()["orders"]) >= 1

    resp = client.patch(f"/orders/{order_id}", headers=auth_header(user),
                        json={"status": "cancelled"})
    assert resp.status_code == 200


# ---------------- ADMIN ORDERS ----------------
def test_admin_orders(client, session):
    admin = Users(email="admin@example.com", name="Admin", role="admin")
    admin.set_password("adminpass")
    buyer = Users(email="cust@example.com", name="Cust", role="buyer")
    buyer.set_password("pass")
    part = SpareParts(category="tyre", vehicle_type="truck", brand="Goodyear",
                      buying_price=100, marked_price=150)
    order = Orders(user=buyer, street="Road", city="City",
                   country="Kenya", postal_code="00100", status="pending")
    item = OrderItems(order=order, sparepart=part, quantity=1)
    session.add_all([admin, buyer, part, order, item])
    session.commit()

    resp = client.get("/admin/orders", headers=auth_header(admin))
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)

    resp = client.patch(f"/admin/orders/{order.id}",
                        headers=auth_header(admin),
                        json={"status": "delivered"})
    assert resp.status_code == 200
    assert "delivered" in resp.get_json()["message"]


# ---------------- CHECKOUT (Mock Stripe) ----------------
@patch("stripe.checkout.Session.create")
def test_checkout_mocked(mock_stripe, client, session):
    user = Users(email="checkout@example.com", name="Buyer", role="buyer")
    user.set_password("pass")
    part = SpareParts(category="tyre", vehicle_type="sedan", brand="Pirelli",
                      buying_price=120, marked_price=200)
    session.add_all([user, part])
    session.commit()

    mock_stripe.return_value = MagicMock(url="https://fake-checkout.stripe")

    resp = client.post("/checkout", headers=auth_header(user),
                       json={"part_ids": [part.id]})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "checkout_url" in data
    assert data["checkout_url"] == "https://fake-checkout.stripe"
