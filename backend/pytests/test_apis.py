import pytest
from unittest.mock import patch, MagicMock
from flask_jwt_extended import create_access_token
from app import create_app
from core.extensions import db
from database.models import Users, SpareParts, Orders, Reviews, ReviewReactions


#------------------------------------------ FIXTURES-------------------------------------------------------

@pytest.fixture(scope="session")
def test_app():
    app = create_app()
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        JWT_SECRET_KEY="test-secret"
    )
    with app.app_context():
        yield app


@pytest.fixture(scope="session", autouse=True)
def setup_database(test_app):
    # Create all tables once per test session and drop them at the end
    with test_app.app_context():
        db.create_all()
        yield
        db.drop_all()


@pytest.fixture()
def test_client(test_app):
    # Provides a fresh test client per test, with rollback for isolation
    with test_app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        options = dict(bind=connection, binds={})
        session = db.create_scoped_session(options=options)

        db.session = session
        client = test_app.test_client()

        yield client

        transaction.rollback()
        connection.close()
        session.remove()


@pytest.fixture
def buyer_token():
    buyer = Users(email="buyer@test.com", role="buyer", name="Buyer")
    buyer.set_password("password")
    db.session.add(buyer)
    db.session.commit()
    return create_access_token(identity=str(buyer.id))


@pytest.fixture
def admin_token():
    admin = Users(email="admin@test.com", role="admin", name="Admin")
    admin.set_password("password")
    db.session.add(admin)
    db.session.commit()
    return create_access_token(identity=str(admin.id))


@pytest.fixture
def sample_part():
    part = SpareParts(
        brand="Toyota", category="Engine", vehicle_type="SUV",
        colour="Black", marked_price=1000, discount_percentage=10,
        average_rating=4.5
    )
    db.session.add(part)
    db.session.commit()
    return part

# ------------------ Auth ------------------

def test_register(test_client):
    res = test_client.post("/register", json={
        "email": "new@test.com", "password": "1234", "name": "NewUser"
    })
    assert res.status_code == 201


def test_login(test_client):
    res = test_client.post("/login", json={
        "email": "buyer@test.com", "password": "password"
    })
    assert res.status_code == 200
    assert "access_token" in res.get_json()


def test_create_admin(test_client, admin_token):
    res = test_client.post("/admin/create",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": "subadmin@test.com", "password": "1234", "name": "SubAdmin"}
    )
    assert res.status_code == 201

# ------------------ Spare Parts ------------------

def test_list_spareparts(test_client, sample_part):
    res = test_client.get("/spareparts")
    data = res.get_json()
    assert res.status_code == 200
    assert data["total"] >= 1


def test_get_single_sparepart(test_client, buyer_token, sample_part):
    res = test_client.get(f"/spareparts/{sample_part.id}",
                          headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 200
    assert res.get_json()["brand"] == "Toyota"

# ------------------ Reviews ------------------

def test_add_review(test_client, buyer_token, sample_part):
    res = test_client.post(f"/reviews/{sample_part.id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"rating": 5, "comment": "Great part"}
    )
    assert res.status_code == 201
    assert res.get_json()["rating"] == 5


def test_edit_review(test_client, buyer_token):
    review = Reviews.query.first()
    res = test_client.patch(f"/reviews/edit/{review.id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"comment": "Updated comment"}
    )
    assert res.status_code == 200
    assert res.get_json()["comment"] == "Updated comment"


def test_delete_review(test_client, buyer_token):
    review = Reviews.query.first()
    res = test_client.delete(f"/reviews/edit/{review.id}",
        headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 200
    assert res.get_json()["message"] == "Review deleted"

# ------------------ Review Reactions ------------------

def test_add_reaction(test_client, buyer_token, sample_part):
    buyer = Users.query.filter_by(email="buyer@test.com").first()
    review = Reviews(user_id=buyer.id, sparepart_id=sample_part.id, rating=4)
    db.session.add(review)
    db.session.commit()

    res = test_client.post(
        f"/reviews/{review.id}/react",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"is_like": True}
    )

    assert res.status_code == 200
    assert res.get_json()["message"] == "Reaction updated"

    reaction = ReviewReactions.query.filter_by(user_id=buyer.id, review_id=review.id).first()
    assert reaction is not None
    assert reaction.is_like is True


def test_update_reaction(test_client, buyer_token, sample_part):
    buyer = Users.query.filter_by(email="buyer@test.com").first()
    review = Reviews(user_id=buyer.id, sparepart_id=sample_part.id, rating=5)
    db.session.add(review)
    db.session.commit()

    # First like
    test_client.post(
        f"/reviews/{review.id}/react",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"is_like": True}
    )

    # Then switch to dislike
    res = test_client.post(
        f"/reviews/{review.id}/react",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"is_like": False}
    )

    assert res.status_code == 200
    assert res.get_json()["message"] == "Reaction updated"

    reaction = ReviewReactions.query.filter_by(user_id=buyer.id, review_id=review.id).first()
    assert reaction is not None
    assert reaction.is_like is False


def test_delete_reaction(test_client, buyer_token, sample_part):
    buyer = Users.query.filter_by(email="buyer@test.com").first()
    review = Reviews(user_id=buyer.id, sparepart_id=sample_part.id, rating=3)
    db.session.add(review)
    db.session.commit()

    # Add a reaction first
    reaction = ReviewReactions(user_id=buyer.id, review_id=review.id, is_like=True)
    db.session.add(reaction)
    db.session.commit()

    res = test_client.delete(
        f"/reviews/{review.id}/react",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert res.status_code == 200
    assert res.get_json()["message"] == "Reaction removed"
    assert ReviewReactions.query.filter_by(user_id=buyer.id, review_id=review.id).first() is None


def test_invalid_reaction_payload(test_client, buyer_token, sample_part):
    buyer = Users.query.filter_by(email="buyer@test.com").first()
    review = Reviews(user_id=buyer.id, sparepart_id=sample_part.id, rating=2)
    db.session.add(review)
    db.session.commit()

    # Send a string instead of a bool
    res = test_client.post(
        f"/reviews/{review.id}/react",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"is_like": "yes"}
    )

    # API should catch the ValueError from validate_is_like
    assert res.status_code in (400, 422)

# ------------------ Orders ------------------

def test_create_order(test_client, buyer_token, sample_part):
    res = test_client.post("/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "items": [{"sparepart_id": sample_part.id, "quantity": 2}],
            "street": "123 St", "city": "Nairobi", "country": "Kenya"
        }
    )
    assert res.status_code == 201
    assert res.get_json()["status"] == "pending"


def test_get_orders(test_client, buyer_token):
    res = test_client.get("/orders", headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 200
    assert "orders" in res.get_json()


def test_cancel_order(test_client, buyer_token):
    order = Orders.query.first()
    res = test_client.patch(f"/orders/{order.id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "cancelled"}
    )
    assert res.status_code == 200
    assert "cancelled" in res.get_json()["message"]

# ------------------ Admin Orders ------------------

def test_admin_get_orders(test_client, admin_token):
    res = test_client.get("/admin/orders", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)


def test_admin_patch_order(test_client, admin_token):
    order = Orders.query.first()
    res = test_client.patch(f"/admin/orders/{order.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "delivered"}
    )
    assert res.status_code == 200
    assert "delivered" in res.get_json()["message"]

# ------------------ Checkout (Stripe Mock) ------------------

@patch("resources.stripe.checkout.Session.create")
def test_checkout(mock_create, test_client, buyer_token, sample_part):
    mock_session = MagicMock()
    mock_session.url = "http://mock-checkout-url"
    mock_create.return_value = mock_session

    res = test_client.post("/checkout",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"part_ids": [sample_part.id]}
    )

    assert res.status_code == 200
    assert res.get_json()["checkout_url"] == "http://mock-checkout-url"
    mock_create.assert_called_once()
