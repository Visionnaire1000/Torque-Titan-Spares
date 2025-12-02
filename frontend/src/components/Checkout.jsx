import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to complete checkout');
      return;
    }

    if (!items || items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    // Simulate a checkout process
    setTimeout(() => {
      setLoading(false);
      toast.success('Checkout successful!');
      navigate(`/payment?method=${paymentMethod}`);
    }, 1000);
  };

  return (
    <div className="checkout-container">
      <h1 className="checkout-title">Checkout</h1>
      <div className="checkout-grid">
        <form className="checkout-form-container" onSubmit={handleSubmit}>
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
                  <p className="payment-method-description">
                    Pay securely via Stripe
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Mobile Order Summary */}
          <div className="mobile-order-summary">
            <OrderSummary items={items} total={total} />
          </div>

          <button
            type="submit"
            className="complete-purchase-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        </form>

        {/* Desktop Order Summary */}
        <div className="desktop-order-summary">
          <OrderSummary items={items} total={total} />
        </div>
      </div>
    </div>
  );
};

const OrderSummary = ({ items, total }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="order-summary">
      <h2 className="order-summary-title">Order Summary</h2>
      <div className="order-items">
        {items.map((item) => (
          <div key={item.id} className="order-item">
            <div className="order-item-details">
              <p className="order-item-name">{item.name}</p>
              <p className="order-item-brand">{item.brand}</p>
              <p className="order-item-quantity">Quantity: {item.quantity}</p>
            </div>
            <span className="order-item-price">
              KSH {(item.buying_price * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="order-total">
        <div className="order-total-line">
          <span>Subtotal</span>
          <span>KSH {total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
