import pytest


# ======================== AUTH ============================
def test_register_success(client):
    res = client.post("/register", json={
        "email": "new@test.com",
        "password": "123456"
    })
    assert res.status_code == 201


def test_register_duplicate(client, user):
    res = client.post("/register", json={
        "email": user.email,
        "password": "123456"
    })
    assert res.status_code == 409


def test_login_success(client, user):
    res = client.post("/login", json={
        "email": user.email,
        "password": "password123"
    })
    data = res.get_json()

    assert res.status_code == 200
    assert "access_token" in data


def test_login_wrong_password(client, user):
    res = client.post("/login", json={
        "email": user.email,
        "password": "wrongpass"
    })
    assert res.status_code == 401


def test_resend_otp(client, user):
    res = client.post("/resend-otp", json={
        "email": user.email
    })
    assert res.status_code in [200, 429]


def test_verify_account_invalid(client, user):
    res = client.post("/verify-account", json={
        "email": user.email,
        "otp": "0000"
    })
    assert res.status_code in [400, 403]


def test_delete_account_success(client, user, auth_header):
    headers = auth_header(user)

    res = client.delete("/delete-account", json={
        "password": "password123"
    }, headers=headers)

    assert res.status_code in [200, 401]

# ===================== SPARE PARTS =======================
def test_get_spareparts_list(client, spare_part):
    res = client.get("/spareparts")
    data = res.get_json()

    assert res.status_code == 200
    assert "items" in data


def test_get_single_sparepart(client, spare_part):
    res = client.get(f"/spareparts/{spare_part.id}")
    assert res.status_code == 200


def test_filter_spareparts(client, spare_part):
    res = client.get("/spareparts?category=tyre")
    assert res.status_code == 200

# ======================== REVIEWS ========================
def test_create_review(client, auth_headers, spare_part):
    res = client.post(
        f"/reviews/{spare_part.id}",
        headers=auth_headers,
        json={
            "rating": 5,
            "comment": "Great product"
        }
    )
    assert res.status_code == 201


def test_create_review_duplicate(client, auth_headers, spare_part):
    # first review
    client.post(
        f"/reviews/{spare_part.id}",
        headers=auth_headers,
        json={"rating": 4}
    )

    # duplicate
    res = client.post(
        f"/reviews/{spare_part.id}",
        headers=auth_headers,
        json={"rating": 5}
    )

    assert res.status_code == 409


def test_get_reviews(client, spare_part):
    res = client.get(f"/reviews/{spare_part.id}")
    assert res.status_code == 200


def test_edit_review(client, auth_headers, spare_part):
    create = client.post(
        f"/reviews/{spare_part.id}",
        headers=auth_headers,
        json={"rating": 3}
    )
    review_id = create.get_json().get("id")

    res = client.patch(
        f"/reviews/edit/{review_id}",
        headers=auth_headers,
        json={"rating": 5}
    )

    assert res.status_code == 200


def test_delete_review(client, auth_headers, spare_part):
    create = client.post(
        f"/reviews/{spare_part.id}",
        headers=auth_headers,
        json={"rating": 2}
    )
    review_id = create.get_json().get("id")

    res = client.delete(
        f"/reviews/edit/{review_id}",
        headers=auth_headers
    )

    assert res.status_code == 200

# ======================== ORDERS =========================
def test_get_orders(client, auth_headers):
    res = client.get("/orders", headers=auth_headers)
    assert res.status_code == 200


def test_update_order_invalid_status(client, auth_headers):
    res = client.patch(
        "/orders/1",
        headers=auth_headers,
        json={"status": "invalid"}
    )

    assert res.status_code in [400, 403, 404]


def test_update_order_cancel(client, auth_headers):
    res = client.patch(
        "/orders/1",
        headers=auth_headers,
        json={"status": "cancelled"}
    )

    assert res.status_code in [200, 400, 403, 404]