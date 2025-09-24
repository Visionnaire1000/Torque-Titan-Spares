import pytest
from unittest.mock import patch
from core.extensions import db
from database.models import Users, SpareParts


# ------------------ Helpers ------------------

def create_user(role="buyer", email="test@example.com", address="Somewhere"):
    """Factory for creating users with hashed password."""
    user = Users(
        email=email,
        role=role,
        address=address
    )
    user.set_password("secret123")
    db.session.add(user)
    db.session.commit()
    return user


# ------------------ Tests ------------------

def test_register_and_login(client, session):
    # Register
    res = client.post("/register", json={
        "email": "newuser@example.com",
        "password": "secret123",
        "name": "New User",
        "address": "123 Lane"
    })
    assert res.status_code == 201

    # Login
    res = client.post("/login", json={
        "email": "newuser@example.com",
        "password": "secret123"
    })
    assert res.status_code == 200
    assert "access_token" in res.get_json()


def test_spareparts_list_and_get(client, session):
    part = SpareParts(
        category="tyre",
        vehicle_type="suv",
        brand="Michelin",
        colour="black",
        buying_price=100.0,
        marked_price=150.0,
        description="Test tyre",
        image="http://example.com/img.jpg",
    )
    db.session.add(part)
    db.session.commit()

    res = client.get("/spareparts")
    assert res.status_code == 200
    assert len(res.get_json()) == 1

    res = client.get(f"/spareparts/{part.id}")
    assert res.status_code == 200
    assert res.get_json()["brand"] == "Michelin"


def test_reviews_crud(client, session, auth_header):
    user = create_user()
    headers = auth_header(user)

    # Create review
    part = SpareParts(
        category="tyre",
        vehicle_type="suv",
        brand="Michelin",
        colour="black",
        buying_price=100.0,
        marked_price=150.0,
        description="Test tyre",
        image="http://example.com/img.jpg",
    )
    db.session.add(part)
    db.session.commit()

    res = client.post(
        f"/reviews/{part.id}",
        json={"content": "Great part!", "rating": 5},
        headers=headers,
    )
    assert res.status_code == 201
    review_id = res.get_json()["id"]

    # Edit review
    res = client.put(
        f"/reviews/edit/{review_id}",
        json={"content": "Updated review", "rating": 4},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.get_json()["rating"] == 4


@patch("apis.resources.stripe.checkout.Session.create")
def test_stripe_checkout_mocked(mock_stripe, client, session, auth_header):
    user = create_user()
    headers = auth_header(user)

    mock_stripe.return_value = {"id": "cs_test_123", "url": "http://fake-url"}

    res = client.post(
        "/checkout",
        json={"items": [{"sparepart_id": "fake123", "quantity": 2}]},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["url"] == "http://fake-url"
