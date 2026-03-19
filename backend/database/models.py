import uuid
from sqlalchemy import event
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.orm import validates
from datetime import datetime , timedelta
import secrets
import hashlib
from core.extensions import db, bcrypt 

#------------------------------UUID Helper-------------------------------
def generate_uuid():
    return str(uuid.uuid4())

#------------------------------USERS MODEL---------------------------------
class Users(db.Model, SerializerMixin):
    __tablename__ = "users"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    email = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    role = db.Column(db.String, default="buyer")  #  buyer,super_admin,admin
    
    # -----------------------Email verification / OTP-----------------------
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_otp_hash = db.Column(db.String, nullable=True)
    email_otp_expires = db.Column(db.DateTime, nullable=True)
    otp_last_sent = db.Column(db.DateTime, nullable=True)
    otp_resend_count = db.Column(db.Integer, default=0)
    otp_attempts = db.Column(db.Integer, default=0)
    otp_locked_until = db.Column(db.DateTime, nullable=True)

    # -------------------------- RELATIONSHIPS --------------------------------
    orders = db.relationship("Orders", back_populates="users", cascade="all, delete-orphan")
    reviews = db.relationship('Reviews', back_populates='users', cascade='all, delete-orphan')
    likes = db.relationship('ReviewReactions', back_populates='users', cascade='all, delete-orphan')

    # ------------------------- SERIALIZE RULES--------------------------------
    serialize_rules = (
    '-password_hash',
    '-email_otp_hash',
    '-email_otp_expires',
    '-otp_last_sent',
    '-otp_resend_count',
    '-otp_attempts',
    '-otp_locked_until',

    # recursion blockers
    '-orders.users',
    '-orders.order_items.order',
    '-reviews.users',
    '-reviews.spareparts.reviews',
    '-reviews.spareparts.order_items',
    '-likes.users',
  )
    
    #--------------------------VALIDATIONS-----------------------------------
    @validates('email')
    def validate_email(self, key, value):
        if not value or '@' not in value:
            raise ValueError("Invalid email address")
        return value.lower().strip()
    
    #-------------------------CUSTOM METHODS---------------------------------
          #(generates hashed password using bcrypt)
    def set_password(self, password: str):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

          #(checks hashed password using bcrypt)
    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, password)
    
    #(--------OTP METHODS----------)
    OTP_EXPIRY_MINUTES = 10
    OTP_RESEND_COOLDOWN_SECONDS = 60
    MAX_OTP_RESENDS = 5
    MAX_OTP_ATTEMPTS = 5
    OTP_LOCK_MINUTES = 15

    def _hash_otp(self, otp: str) -> str:
        return hashlib.sha256(otp.encode()).hexdigest()

    def generate_email_otp(self):
        raw_otp = str(secrets.randbelow(900000) + 100000)

        self.email_otp_hash = self._hash_otp(raw_otp)
        self.email_otp_expires = datetime.utcnow() + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        self.otp_last_sent = datetime.utcnow()

        # ensure counters are never None
        self.otp_resend_count = (self.otp_resend_count or 0) + 1
        self.otp_attempts = 0
        self.otp_locked_until = None

        return raw_otp
     
    def can_resend_otp(self, cooldown_seconds=60, max_resends=5):
        now = datetime.utcnow()

        # max resends reached
        if self.otp_resend_count >= max_resends:
           return False, 0  # cannot resend, no countdown

        # never sent before
        if not self.otp_last_sent:
           return True, 0

        elapsed = (now - self.otp_last_sent).total_seconds()
        if elapsed >= cooldown_seconds:
            return True, 0  # cooldown passed
        else:
           remaining = int(cooldown_seconds - elapsed)
           return False, remaining  # cannot resend yet, show countdown

    def verify_email_otp(self, otp: str):
        if self.otp_locked_until and datetime.utcnow() < self.otp_locked_until:
            return "locked"

        if not self.email_otp_hash or not self.email_otp_expires:
            return False

        if self.email_otp_expires < datetime.utcnow():
            return False

        if self._hash_otp(otp) != self.email_otp_hash:
            self.otp_attempts += 1

            if self.otp_attempts >= 5:
                self.otp_locked_until = datetime.utcnow() + timedelta(minutes=15)

            return False

        # Success
        self.email_verified = True
        self.email_otp_hash = None
        self.email_otp_expires = None
        self.otp_attempts = 0
        self.otp_resend_count = 0
        self.otp_locked_until = None

        return True
    
     # -------------------------- DISPLAY NAME PROPERTY ----------------------
    @property
    def display_name(self):
        """
        Returns a friendly name for the user:
        - Uses first part of email if no first/last name is present
        - Converts dots to spaces and capitalizes words
        """
        if hasattr(self, 'first_name') and hasattr(self, 'last_name') and self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        if self.email:
            name_part = self.email.split("@")[0]
            # replace dots/underscores with spaces, capitalize words
            name_part = name_part.replace(".", " ").replace("_", " ")
            return " ".join(word.capitalize() for word in name_part.split())
        return "User"
    
# ------------------------------ SPARE PARTS MODEL ---------------------------------
class SpareParts(db.Model, SerializerMixin):
    __tablename__ = "spareparts"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    category = db.Column(db.String, nullable=False)
    vehicle_type = db.Column(db.String, nullable=False)
    brand = db.Column(db.String, nullable=False)
    colour = db.Column(db.String, nullable=True)

    buying_price = db.Column(db.Float, nullable=False)
    marked_price = db.Column(db.Float, nullable=False)
    discount_amount = db.Column(db.Float, default=0.0)
    discount_percentage = db.Column(db.Float, default=0.0)

    image = db.Column(db.String, nullable=True)
    description = db.Column(db.String, nullable=True)

    average_rating = db.Column(db.Float, default=0.0)
    total_reviews = db.Column(db.Integer, default=0)

    # -------------------------- RELATIONSHIPS --------------------------------
    order_items = db.relationship("OrderItems", back_populates="sparepart")
    reviews = db.relationship(
        "Reviews",
        back_populates="spareparts",
        cascade="all, delete-orphan"
    )

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = (
        "-order_items",
        "-reviews.spareparts",
        "-reviews.users.reviews",
        "-reviews.likes.reviews",
    )

    # -------------------------- VALIDATIONS ----------------------------------
    @validates("vehicle_type")
    def validate_vehicle_type(self, key, value):
        allowed = ["sedan", "suv", "bus", "truck"]
        if value.lower() not in allowed:
            raise ValueError(f"Vehicle type must be one of: {', '.join(allowed)}")
        return value.lower()

    # ------------------------ CUSTOM METHODS ---------------------------------

    def calculate_discount(self):
        if self.marked_price and self.buying_price:
            self.discount_amount = round(self.marked_price - self.buying_price, 2)
            self.discount_percentage = (
                round((self.discount_amount / self.marked_price) * 100, 2)
                if self.marked_price > 0
                else 0.0
            )
        else:
            self.discount_amount = 0.0
            self.discount_percentage = 0.0

    def update_review_stats(self):
        reviews = getattr(self, "reviews", []) or []

        self.total_reviews = len(reviews)

        ratings = [
            r.rating
            for r in reviews
            if isinstance(r.rating, int) and 1 <= r.rating <= 5
        ]

        self.average_rating = (
            round(sum(ratings) / len(ratings), 1) if ratings else 0.0
        )


# ------------------------------ REVIEWS MODEL ---------------------------------
class Reviews(db.Model, SerializerMixin):
    __tablename__ = "reviews"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    sparepart_id = db.Column(db.String, db.ForeignKey("spareparts.id"), nullable=False)
    comment = db.Column(db.String, nullable=True)
    rating = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    total_likes = db.Column(db.Integer, default=0)
    total_dislikes = db.Column(db.Integer, default=0)

    # -------------------------- RELATIONSHIPS --------------------------------
    users = db.relationship("Users", back_populates="reviews")
    spareparts = db.relationship("SpareParts", back_populates="reviews")
    likes = db.relationship(
        "ReviewReactions",
        back_populates="reviews",
        cascade="all, delete-orphan"
    )

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = (
        "-users.reviews",
        "-spareparts.reviews",
        "-likes.reviews",
        "-likes.users",
    )

    # -------------------------- VALIDATIONS ----------------------------------
    @validates("rating")
    def validate_rating(self, key, value):
        if value is not None and not (1 <= value <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return value

    # ------------------------ CUSTOM METHODS ---------------------------------
    def update_reaction_stats(self):
        reactions = getattr(self, "likes", []) or []

        likes = 0
        dislikes = 0

        for r in reactions:
            if r.is_like is True:
                likes += 1
            elif r.is_like is False:
                dislikes += 1

        self.total_likes = likes
        self.total_dislikes = dislikes

    #----------------------Displaying User Name above Comment-----------------------------
    @property
    def user_display_name(self):
        return self.users.display_name if self.users else "User"


# ------------------------------ REVIEW REACTIONS MODEL ---------------------------------
class ReviewReactions(db.Model, SerializerMixin):
    __tablename__ = "review_reactions"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    review_id = db.Column(db.String, db.ForeignKey("reviews.id"), nullable=False)
    is_like = db.Column(db.Boolean, nullable=False)

    # -------------------------- RELATIONSHIPS --------------------------------
    users = db.relationship("Users", back_populates="likes")
    reviews = db.relationship("Reviews", back_populates="likes")

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = (
        "-users.likes",
        "-reviews.likes",
        "-reviews.users",
    )

    # -------------------------- VALIDATIONS ----------------------------------
    @validates("is_like")
    def validate_is_like(self, key, value):
        # normalize strings
        if isinstance(value, str):
            if value.lower() in ["true", "1"]:
                value = True
            elif value.lower() in ["false", "0"]:
                value = False

        # normalize ints
        if isinstance(value, int):
            value = bool(value)

        if not isinstance(value, bool):
            raise ValueError("is_like must be True or False")

        return value
  
#------------------------------ORDERS MODEL---------------------------------
class Orders(db.Model, SerializerMixin):
    __tablename__ = "orders"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String, default="pending")
    paid = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_price = db.Column(db.Float, default=0.0)

    # Timestamp fields for shipping and delivery
    shipped_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)

    # Address fields
    street = db.Column(db.String, nullable=False)
    city = db.Column(db.String, nullable=False)
    postal_code = db.Column(db.String, nullable=True)
    country = db.Column(db.String, nullable=False)

    # Relationships
    users = db.relationship("Users", back_populates="orders")
    order_items = db.relationship(
        "OrderItems",
        back_populates="order",
        cascade="all, delete-orphan"
    )

    serialize_rules = (
        "-users",
        "-order_items.order",
        "-order_items.sparepart.order_items",
        "-order_items.sparepart.reviews",
        "-order_items.sparepart.reviews.users",
    )

    def calculate_total(self):
        self.total_price = round(sum(item.subtotal for item in self.order_items), 2)

#------------------------------ORDER ITEMS MODEL---------------------------------
class OrderItems(db.Model, SerializerMixin):
    __tablename__ = "order_items"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    order_id = db.Column(db.String, db.ForeignKey("orders.id"), nullable=False)
    sparepart_id = db.Column(db.String, db.ForeignKey("spareparts.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)

    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

    # -------------------------- RELATIONSHIPS --------------------------------
    order = db.relationship("Orders", back_populates="order_items")
    sparepart = db.relationship("SpareParts", back_populates="order_items")

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = (
    "-order.order_items",  
    "-sparepart.order_items",  
    )

    #-------------------------CUSTOM METHOD---------------------------------
       #(calculates total price of order items)
    def calculate_subtotal(self):
        if self.sparepart:
            self.unit_price = round(self.sparepart.marked_price - self.sparepart.discount_amount, 2)
        self.subtotal = round(self.unit_price * self.quantity, 2)

#------------------------------EVENT LISTENERS---------------------------------
@event.listens_for(SpareParts, "before_insert")
def sparepart_before_insert(mapper, connection, target):
    target.calculate_discount()

@event.listens_for(SpareParts, "before_update")
def sparepart_before_update(mapper, connection, target):
    target.calculate_discount()

# Reviews listeners
@event.listens_for(Reviews, "after_insert")
@event.listens_for(Reviews, "after_update")
@event.listens_for(Reviews, "after_delete")
def review_change(mapper, connection, target):
    sparepart = getattr(target, "sparepart", None)
    if sparepart:
        try:
            sparepart.update_review_stats()
            # Do NOT call db.session.commit() here!
        except Exception as e:
            print(f"[review_change] Error updating review stats: {e}")


# ReviewReactions listeners
@event.listens_for(ReviewReactions, "after_insert")
@event.listens_for(ReviewReactions, "after_update")
@event.listens_for(ReviewReactions, "after_delete")
def reaction_change(mapper, connection, target):
    sparepart = getattr(getattr(target, "review", None), "sparepart", None)
    if sparepart:
        try:
            sparepart.update_review_stats()
            # Do NOT call db.session.commit() here!
        except Exception as e:
            print(f"[reaction_change] Error updating review stats for reaction: {e}")

@event.listens_for(OrderItems, "before_insert")
def orderitem_before_insert(mapper, connection, target):
    target.calculate_subtotal()
    if target.order:
        target.order.calculate_total()

@event.listens_for(OrderItems, "before_update")
def orderitem_before_update(mapper, connection, target):
    target.calculate_subtotal()
    if target.order:
        target.order.calculate_total()

@event.listens_for(OrderItems, "after_delete")
def orderitem_after_delete(mapper, connection, target):
    if target.order:
        target.order.calculate_total()
