import pytest


# ===================== ADMIN SETUP ========================
def make_super_admin(session, user):
    user.role = "super_admin"
    session.commit()
    return user


def make_admin(session, user):
    user.role = "admin"
    session.commit()
    return user


# ================= CREATE ADMIN ==========================
def test_create_admin_success(client, session, user, auth_header):
    make_super_admin(session, user)

    res = client.post(
        "/admin/create-admin",
        headers=auth_header(user),
        json={
            "email": "admin@test.com",
            "password": "123456"
        }
    )

    assert res.status_code == 201


def test_create_admin_forbidden(client, user, auth_header):
    res = client.post(
        "/admin/create-admin",
        headers=auth_header(user),
        json={
            "email": "admin@test.com",
            "password": "123456"
        }
    )

    assert res.status_code == 403

# ================= LIST ADMINS ============================
def test_list_admins_success(client, session, user, auth_header):
    make_super_admin(session, user)

    res = client.get(
        "/admin/admins",
        headers=auth_header(user)
    )

    assert res.status_code == 200


def test_list_admins_forbidden(client, user, auth_header):
    res = client.get(
        "/admin/admins",
        headers=auth_header(user)
    )

    assert res.status_code == 403

# =============== ADMIN SPARE PARTS ========================
def test_admin_create_sparepart(client, session, user, auth_header):
    make_admin(session, user)

    res = client.post(
        "/admin/spareparts",
        headers=auth_header(user),
        json={
            "category": "tyre",
            "vehicle_type": "sedan",
            "brand": "Toyota",
            "colour": "black",
            "buying_price": 1000,
            "marked_price": 1200,
            "description": "Test"
        }
    )

    assert res.status_code == 201


def test_admin_update_sparepart(client, session, user, auth_header, spare_part):
    make_admin(session, user)

    res = client.put(
        f"/admin/spareparts/{spare_part.id}",
        headers=auth_header(user),
        json={"brand": "Honda"}
    )

    assert res.status_code == 200


def test_admin_delete_sparepart(client, session, user, auth_header, spare_part):
    make_admin(session, user)

    res = client.delete(
        f"/admin/spareparts/{spare_part.id}",
        headers=auth_header(user)
    )

    assert res.status_code == 200

# ================= ADMIN REVIEWS ==========================
def test_admin_get_reviews(client, session, user, auth_header):
    make_admin(session, user)

    res = client.get(
        "/admin/reviews",
        headers=auth_header(user)
    )

    assert res.status_code == 200


def test_admin_get_reviews_by_sparepart(client, session, user, auth_header, spare_part):
    make_admin(session, user)

    res = client.get(
        f"/admin/reviews/sparepart/{spare_part.id}",
        headers=auth_header(user)
    )

    assert res.status_code == 200


def test_admin_review_reactions(client, session, user, auth_header):
    make_admin(session, user)

    res = client.get(
        "/admin/reviews/1/reactions",
        headers=auth_header(user)
    )

    assert res.status_code in [200, 404]

# ===================== ADMIN ORDERS =======================
def test_admin_get_orders(client, session, user, auth_header):
    make_admin(session, user)

    res = client.get(
        "/admin/orders",
        headers=auth_header(user)
    )

    assert res.status_code == 200


def test_admin_update_order(client, session, user, auth_header):
    make_admin(session, user)

    res = client.patch(
        "/admin/orders/1",
        headers=auth_header(user),
        json={"status": "shipped"}
    )

    assert res.status_code in [200, 400, 404]