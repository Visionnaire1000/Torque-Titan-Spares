# Torque Titan Spare Parts

## Project Overview

Torque Titan Spare Parts is an e-commerce platform designed to sell automobiles spareparts online. This website enables the store to efficiently receive orders from buyers and subsequently deliver them as soon as possible.


## Tech Stack

### Backend
- **Python (Flask)** – RESTful API server(With Flask-Restful for API handling)
- **Flask-Migrate** - Creating and applying migrations
- **PostgreSQL** – Relational database
- **Flask-SQLAlchemy** – ORM for database interaction
- **Flask-JWT-Extended** – User authentication,with OTPs for account verification
- **Celery** - For handling background tasks,specifically the sending of OTPs
- **Stripe** – Payment processing integration

### Frontend
- **ReactJS** – UI component library
- **useContext react hook** – Application state management
- **React Router** – Navigation and routing
- **CSS files** – For styling,with media queries for responsiveness
- **Fetch** – HTTP client for API requests

### Testing
- **Vitest** – Frontend unit testing
- **Pytest** – Backend testing

---

## Features
### Buyer Capabilities
- Authentication (Register/Login)
- Changing password and deleting acccount
- Filter the available spareparts by the dropdown options
- Use the smart search bar to filter spareparts by brand and automobile type
- Add desired spareparts to cart
- Checkout and pay for selected animals via credit card
- Cancel order before it is shipped
- View and track order history
- Give a star rating and write a comment on each sparepart
- Like or dislike other buyers comments using a thumbs up or down icons

### Admin Capabilities
- Authentication (Register/Login)
- Changing password and deleting account
- Add new spareparts to the database for sale
- Edit or delete existing spareparts in the database
- View incoming orders from buyers
- Mark orders as shipped then ultimately delivered
- View all star ratings and reviews from buyers,along with the reactions on the comments
- Superadmin can create new admins and remove existing ones


---

## Database Schema

The backend utilizes the following core models:

- **Users** – Contains all buyers and admins accounts
- **Spareparts** – Contains all data about the spareparts
- **Orders** – Contains all submitted orders data
- **OrderItems** – Connects spareparts to specific orders
- **Reviews** - Contains all star ratings and comments data from buyers
- **ReviewReactions** - Contains likes or dislikes on each comment

---

## API Endpoints
### Authentication
- `POST /register` – RegisterS a new user and receive an OTP for verification
- `POST /resend-otp` - GetS a new OTP after old one expires
- `POST /verify-account` - Verifies received OTP
- `POST /login` – Login and receive a JWT token 
- `POST /refresh` - Triggers refresh of access tokens every 15 minutes
- `POST /change-password` - Changes existing password for a new one
- `POST /delete-account` - Deletes existing account
- `POST /admin/create-admin` - Superadmin creates new admins
- `GET /admin/admins` - Superadmin fetching all existing admins 
- `DELETE /admin/delete-admin/<string:admin_id>` - Superadmin deletes individual admins

### Spareparts
- `GET /spareparts` – List all spareparts(supports filters)
- `POST /admin/spareparts/<string:spare_id>` – Add a new sparepart (admins only)
- `GET /spareparts/<string:part_id>` – View details of a specific sparepart
- `PATCH /admin/spareparts/<string:spare_id>` – Edit sparepart listings (admins only)
- `DELETE /admin/spareparts/<string:spare_id>>` – Delete a sparepart listing (admins only)

### Orders
- `GET /orders` – View all orders (filtered by user role)
- `POST /orders` – Place a new order (buyers only)
- `PATCH /orders/<string:order_id>` – buyers can cancel orders while admins mark them as shipped or delivered

### Payment
- `POST /create-checkout-session` – Creates a Stripe checkout session for credit card payment
- `POST /webhook` – Handle Stripe payment webhook events

### Reviews
- `POST /reviews/<string:part_id>` – Posts star rating and or comment
- `POST /reviews/edit/<string:review_id>` - Edits existing star rating and or comment
- `POST /reviews/<string:review_id>/react` - Likes or dislikes a comment
- `GET /admin/reviews` – Fetches all buyers ratings and comments
- `GET /admin/reviews/sparepart/<string:sparepart_id>` - Fetches and individual sparepart ratings and comments
- `GET /admin/reviews/<string:review_id>/reactions` – Fetches all reactions on buyers comments

---

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL

---

## Backend Setup

1. Clone the repository:
```bash
git clone git@github.com:Visionnaire1000/Torque-Titan-Spares.git
cd backend inside the directory,Torque-Titan-Spares
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  #On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables: eg
```
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

5. Run the migrations
```bash
flask db upgrade
```

6. Seed the database:
```bash
python seed.py
```
7. Start Redis Server
```bash
redis-server
```

8. Run the development server:
```bash
python app.py
```

9. Run the Celery worker inside a virtual environment:
```bash
celery -A utils.celery_worker worker --loglevel=info
```

10. Run the development server:
```bash
python app.py
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

## User Workflows
### Buyer Workflow
1. Register/Login
2. Browse and search listings by type,brand,colour,price
3. Add spareparts to cart
4. Checkout and make payments
5. Track orders
6. Optionally give star ratings and leave comments

### Admin Workflow
1. Register/Login
2. Add spareparts to inventory,edit and delete them when necessary
3. View and manage orders,marking them as shipped or delivered
4. View reviews on spareparts and reach out to buyers whenever necessary


## Deployment

The application is configured for deployment using Render.


## License


This project is licensed under the MIT License.


---
