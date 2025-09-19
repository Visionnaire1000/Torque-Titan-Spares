import uuid
from sqlalchemy import event
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.orm import validates
from datetime import datetime
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
    role = db.Column(db.String, default="buyer")  # e.g., buyer, farmer, admin

    # -------------------------- RELATIONSHIPS --------------------------------
    orders = db.relationship("Orders", back_populates="users", cascade="all, delete-orphan")
    reviews = db.relationship('Reviews', back_populates='users', cascade='all, delete-orphan')
    likes = db.relationship('ReviewReactions', back_populates='users', cascade='all, delete-orphan')

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = ('-password_hash','-orders.users', '-reviews.users', '-likes.users')

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
    
#------------------------------SPARE PARTS MODEL---------------------------------
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
    total_likes = db.Column(db.Integer, default=0)
    total_dislikes = db.Column(db.Integer, default=0)

    # -------------------------- RELATIONSHIPS --------------------------------
    order_items = db.relationship("OrderItems", back_populates="sparepart")
    reviews = db.relationship('Reviews', back_populates='spareparts', cascade='all, delete-orphan')

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = ('-order_items.sparepart','-reviews.spareparts')

    #--------------------------VALIDATIONS-----------------------------------
    @validates("category")
    def validate_category(self, key, value):
        allowed = ["tyre", "rim", "battery", "oil filter"]
        value = value.lower().strip()
        if value not in allowed:
          raise ValueError(f"Category must be one of: {', '.join(allowed)}")
        return value
    
    @validates('vehicle_type')
    def validate_vehicle_type(self, key, value):
        allowed = ['sedan', 'suv', 'bus', 'truck']
        if value.lower() not in allowed:
            raise ValueError(f"Vehicle type must be one of: {', '.join(allowed)}")
        return value.lower()
    
    #------------------------CUSTOM METHODS-----------------------------------
        #(calculates discount)
    def calculate_discount(self):
        if self.marked_price and self.buying_price:
            self.discount_amount = round(self.marked_price - self.buying_price, 2)
            self.discount_percentage = round((self.discount_amount / self.marked_price) * 100, 2) if self.marked_price > 0 else 0.0
        else:
            self.discount_amount = 0.0
            self.discount_percentage = 0.0

        #(updates reviews stats-total likes,dislikes and average ratings)
    def update_review_stats(self):
        self.total_reviews = len(self.reviews)
        ratings = [r.rating for r in self.reviews if r.rating is not None]
        self.average_rating = round(sum(ratings)/len(ratings),1) if ratings else 0.0

        self.total_likes = sum(len([like for like in r.likes if like.is_like]) for r in self.reviews)
        self.total_dislikes = sum(len([like for like in r.likes if not like.is_like]) for r in self.reviews)

#------------------------------REVIEWS MODEL---------------------------------
class Reviews(db.Model, SerializerMixin):
    __tablename__ = 'reviews'

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    sparepart_id = db.Column(db.String, db.ForeignKey('spareparts.id'), nullable=False)
    comment = db.Column(db.String, nullable=True)
    rating = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    #--------------------------RELATIONSHIPS--------------------------------
    users = db.relationship('Users', back_populates='reviews')
    spareparts = db.relationship('SpareParts', back_populates='reviews')
    likes = db.relationship('ReviewReactions', back_populates='reviews', cascade='all, delete-orphan')

    #-------------------------SERIALIZE RULES-------------------------------
    serialize_rules = ('-users.reviews', '-spareparts.reviews', '-likes.reviews')

    #--------------------------VALIDATIONS-----------------------------------
    @validates('rating')
    def validate_rating(self, key, value):
        if value is not None and not (1 <= value <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return value
    
#------------------------------REVIEW REACTIONS MODEL---------------------------------
class ReviewReactions(db.Model, SerializerMixin):
    __tablename__ = 'review_reactions'

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.String, db.ForeignKey('reviews.id'), nullable=False)
    is_like = db.Column(db.Boolean, nullable=False)

    #--------------------------RELATIONSHIPS--------------------------------
    users = db.relationship('Users', back_populates='likes')
    reviews = db.relationship('Reviews', back_populates='likes')

    #-------------------------SERIALIZE RULES-------------------------------
    serialize_rules = ('-users.likes', '-reviews.likes')

    #--------------------------VALIDATIONS-----------------------------------
    @validates('is_like')
    def validate_is_like(self, key, value):
        if not isinstance(value, bool):
            raise ValueError("is_like must be True or False")
        return value
    
#------------------------------ORDERS MODEL---------------------------------
class Orders(db.Model, SerializerMixin):
    __tablename__ = "orders"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String)
    paid = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_price = db.Column(db.Float, default=0.0)

    # Address fields
    street = db.Column(db.String, nullable=False)
    city = db.Column(db.String, nullable=False)
    postal_code = db.Column(db.String, nullable=True)
    country = db.Column(db.String, nullable=False)

    # -------------------------- RELATIONSHIPS --------------------------------
    users = db.relationship("Users", back_populates="orders")
    order_items = db.relationship(
        "OrderItems",
        back_populates="order",
        cascade="all, delete-orphan"
    )

    # ------------------------- SERIALIZE RULES -------------------------------
    serialize_rules = ("-users.orders", "-order_items.order")


    #-------------------------CUSTOM METHOD---------------------------------
        #(calculates total-price of order items)
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
    serialize_rules = ("-order.order_items", "-sparepart.order_items")

    #-------------------------CUSTOM METHOD---------------------------------
       #(calculates total price of order items)
    def calculate_subtotal(self):
        if self.spareparts:
            self.unit_price = round(self.spareparts.marked_price - self.spareparts.discount_amount, 2)
        self.subtotal = round(self.unit_price * self.quantity, 2)

#------------------------------EVENT LISTENERS---------------------------------
@event.listens_for(SpareParts, "before_insert")
def sparepart_before_insert(mapper, connection, target):
    target.calculate_discount()

@event.listens_for(SpareParts, "before_update")
def sparepart_before_update(mapper, connection, target):
    target.calculate_discount()

@event.listens_for(Reviews, "after_insert")
@event.listens_for(Reviews, "after_update")
@event.listens_for(Reviews, "after_delete")
def review_change(mapper, connection, target):
    if target.sparepart:
        target.sparepart.update_review_stats()
        db.session.commit()

@event.listens_for(ReviewReactions, "after_insert")
@event.listens_for(ReviewReactions, "after_update")
@event.listens_for(ReviewReactions, "after_delete")
def reaction_change(mapper, connection, target):
    if target.review and target.review.sparepart:
        target.review.sparepart.update_review_stats()
        db.session.commit()

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
