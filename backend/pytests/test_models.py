import pytest
from database.models import (
    Users,
    SpareParts,
    Reviews,
    ReviewReactions,
    Orders,
    OrderItems,
    generate_uuid
)

# ---------------------- UUID Helper ----------------------
def test_generate_uuid():
    uid = generate_uuid()
    assert isinstance(uid, str)
    assert len(uid) > 0


# ---------------------- USERS MODEL ----------------------
def test_user_password_hashing():
    user = Users(email="test@example.com", password_hash="")
    user.set_password("mypassword123")
    assert user.password_hash != "mypassword123"
    assert user.check_password("mypassword123") is True
    assert user.check_password("wrongpass") is False


def test_user_email_validation():
    user = Users(email="  TeSt@Example.Com  ", password_hash="hash")
    assert user.email == "test@example.com"  # lowercased & stripped


def test_user_invalid_email_raises():
    with pytest.raises(ValueError) as excinfo:
        Users(email="invalid-email", password_hash="hash")
    assert "Invalid email address" in str(excinfo.value)


# ---------------------- SPAREPARTS MODEL ----------------------
def test_sparepart_discount_calculation():
    part = SpareParts(
        category="tyre",
        vehicle_type="suv",
        brand="Michelin",
        colour="black",
        buying_price=100.0,
        marked_price=150.0,
    )
    part.calculate_discount()
    assert part.discount_amount == 50.0
    assert part.discount_percentage == 33.33 or part.discount_percentage == round(33.33, 2)


def test_sparepart_invalid_vehicle_type_raises():
    with pytest.raises(ValueError) as excinfo:
        SpareParts(
            category="tyre",
            vehicle_type="plane",  # not allowed
            brand="Generic",
            buying_price=100.0,
            marked_price=200.0,
        )
    assert "Vehicle type must be one of:" in str(excinfo.value)


# ---------------------- REVIEWS MODEL ----------------------
def test_review_rating_validation():
    review = Reviews(user_id="u1", sparepart_id="s1", rating=5)
    assert review.rating == 5


def test_review_invalid_rating_raises():
    with pytest.raises(ValueError) as excinfo:
        Reviews(user_id="u1", sparepart_id="s1", rating=10)
    assert "Rating must be between 1 and 5" in str(excinfo.value)


# ---------------------- REVIEW REACTIONS MODEL ----------------------
def test_review_reaction_is_like():
    reaction = ReviewReactions(user_id="u1", review_id="r1", is_like=True)
    assert reaction.is_like is True


def test_review_reaction_invalid_is_like_raises():
    with pytest.raises(ValueError) as excinfo:
        ReviewReactions(user_id="u1", review_id="r1", is_like="yes")  # not bool
    assert "is_like must be True or False" in str(excinfo.value)


# ---------------------- ORDERS MODEL ----------------------
def test_order_total_calculation():
    order = Orders(
        user_id="u1",
        status="pending",
        street="123 Street",
        city="Test City",
        postal_code="00100",
        country="Testland"
    )

    item1 = OrderItems(order=order, sparepart_id="s1", quantity=2, unit_price=50.0, subtotal=100.0)
    item2 = OrderItems(order=order, sparepart_id="s2", quantity=1, unit_price=80.0, subtotal=80.0)

    order.order_items = [item1, item2]
    order.calculate_total()

    assert order.total_price == 180.0

