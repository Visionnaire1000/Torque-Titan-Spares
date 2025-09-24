# pytests/test_apis.py
import pytest
from database.models import Users, SpareParts
from core.extensions import bcrypt   


# ---------------------- AUTH TEST ----------------------
def test_register_and_login(client, session):
    # Register
    res = client.post("/register", json={
        "email": "test@example.com",
        "password": "secret123",
        "role": "buyer"
    })
    assert res.status_code in (200, 201)
    data = res.get_json()
    assert "message" in data

    # Login
    res = client.post("/login", json={
        "email": "test@example.com",
        "password": "secret123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "access_token" in data


# ---------------------- SPAREPARTS TEST ----------------------
def test_spareparts_list_and_get(client, session):
    part = SpareParts(
        category="rim",
        vehicle_type="sedan",
        brand="Michelin",
        colour="black",
        buying_price=10000,
        marked_price=15000,
        description="Test rim",
        image="http://example.com/rim.jpg"
    )
    session.add(part)
    session.commit()

    # Fetch all
    res = client.get("/spareparts")
    assert res.status_code == 200
    data = res.get_json()

    # Handle API wrapper format
    if isinstance(data, dict) and "items" in data:
        items = data["items"]
    elif isinstance(data, dict) and "spareparts" in data:
        items = data["spareparts"]
    elif isinstance(data, list):
        items = data
    else:
        pytest.fail(f"Unexpected response: {data}")

    assert any(isinstance(p, dict) and p.get("id") == part.id for p in items)

    # Fetch single
    res = client.get(f"/spareparts/{part.id}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == part.id
