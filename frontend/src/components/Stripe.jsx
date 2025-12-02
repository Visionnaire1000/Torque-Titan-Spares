import  { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import config from '../config';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/stripe.css';

const Stripe = () => {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [loading, setLoading] = useState(false);

  const [cardDetails, setCardDetails] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
    postal: '',
  });

  const handleChange = (e) => {
    setCardDetails({ ...cardDetails, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const stored = localStorage.getItem('titanUser');
    if (!stored) {
      toast.error('Not authenticated');
      return;
    }

    const { token } = JSON.parse(stored);

    const { name, number, expiry, cvc } = cardDetails;
    if (paymentMethod === 'stripe' && (!name || !number || !expiry || !cvc)) {
      toast.error('Please fill in all credit card fields');
      return;
    }

    setLoading(true);

    const orderData = {
      items: items.map(item => ({
        animal_id: item.animal.id,
        price: item.animal.price,
        quantity: item.quantity,
      })),
      total_price: total,
    };

    try {
      const params = new URLSearchParams();
      params.append('user_id', user.id);
      params.append('total_price', total);

      const response = await fetch(`${config.API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Order placed successfully');
        clearCart();  
      } else {
        toast.error(data.message || 'Something went wrong with the order');
      }
    } catch (error) {
      toast.error('Error submitting order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <h1 className="checkout-title">Checkout</h1>
      <div className="checkout-grid">
        <div className="checkout-form-container">
          <form onSubmit={handleSubmit}>
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

            <div className="card-details">
              <input
                type="text"
                name="name"
                placeholder="Cardholder Name"
                value={cardDetails.name}
                onChange={handleChange}
                className="card-input"
                required
              />
              <input
                type="text"
                name="number"
                placeholder="Card Number e.g 4242 4242 4242 4242"
                value={cardDetails.number}
                onChange={handleChange}
                className="card-input"
                required
              />
              <input
                type="text"
                name="expiry"
                placeholder="MM/YY"
                value={cardDetails.expiry}
                onChange={handleChange}
                className="card-input"
                required
              />
              <input
                type="text"
                name="cvc"
                placeholder="CVC"
                value={cardDetails.cvc}
                onChange={handleChange}
                className="card-input"
                maxLength="4"
                required
              />
            </div>

            <div className="mobile-order-summary">
              <OrderSummary items={items} total={total} />
            </div>

            <div className="checkout-buttons">
              <button type="submit" className="complete-purchase-btn" disabled={loading}>
                {loading ? 'Processing...' : 'Submit Order'}
              </button>
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

export default Stripe;


