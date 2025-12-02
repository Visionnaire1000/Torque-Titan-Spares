import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/checkout.css';

const Checkout = () => {
  const { items, total } = useCart();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to complete checkout');
      return;
    }

    setLoading(true);
    // Placeholder for additional pre-payment logic if needed
  };

  return (
    <div className="checkout-container">
      <h1 className="checkout-title">Checkout</h1>
      <div className="checkout-grid">
        <div className="checkout-form-container">
          <form onSubmit={handleSubmit}>
            <div className="shipping-info">
              {/* You can insert shipping fields here if needed */}
            </div>
            <div className="payment-method">
              <h2 className="section-title">Payment Method</h2>

              <div className="payment-option">
                <input
                  type="radio"
                  id="stripe"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label htmlFor="stripe" className="payment-label">
                  <CreditCard className="payment-icon" />
                  <div>
                    <span className="payment-method-title">Credit Card</span>
                    <p className="payment-method-description">Pay with Stripe securely</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mobile-order-summary">
              <OrderSummary items={items} total={total} />
            </div>

            <div className="checkout-buttons">
              <Link
                to={`/payment?method=${paymentMethod}`}
                className="complete-purchase-btn"
              >
                Complete Checkout
              </Link>
            </div>
          </form>
        </div>

        <div className="desktop-order-summary">
          <OrderSummary items={items} total={total} />
        </div>
      </div>
    </div>
  );
};

const OrderSummary = ({ items, total }) => {
  return (
    <div className="order-summary">
      <h2 className="order-summary-title">Order Summary</h2>
      <div className="order-items">
        {items.map((item) => (
          <div key={item.id} className="order-item">
            <div className="order-item-details">
              <p className="order-item-name">{item.animal.name}</p>
              <p className="order-item-breed">{item.animal.breed}, {item.animal.age} years</p>
              <p className="order-item-quantity">Quantity: {item.quantity}</p>
            </div>
            <span className="order-item-price">
              ${(item.animal.price * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="order-total">
        <div className="order-total-line">
          <span>Subtotal</span>
          <span>${total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Checkout;