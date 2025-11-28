import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, PlusCircle, MinusCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/cart.css';

const Cart = () => {
  const { items = [], removeItem, updateQuantity, clearCart, total = 0 } = useCart() || {};
  const { isAuthenticated = false } = useAuth() || {};
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error("Please login to proceed with checkout");
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    navigate('/checkout');
  };

  if (!items || items.length === 0) {
    return (
      <div className="cart-container">
        <h1>Your Cart</h1>
        <div className="empty-cart-box">
          <ShoppingCart size={48} />
          <h2>Your cart is empty</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h1>Your Cart</h1>
      <div className="cart-grid">
        <div className="cart-items">
          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Subtotal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-info">
                         <img
                          src={item.image}
                          alt={item.name}
                          className="cart-item-image"> 
                          </img>
                        <p id="name">{item.brand} for {item.vehicle_type} </p>
                        <p className="mobile-price">
                          KSH {item.buying_price?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </td>
                    <td className="hide-on-mobile">
                      KSH {item.buying_price?.toLocaleString() || '0'}
                    </td>
                    <td>
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity?.(item.id, item.quantity - 1)}>
                          <MinusCircle />
                        </button>
                        <span>{item.quantity || 1}</span>
                        <button onClick={() => updateQuantity?.(item.id, item.quantity + 1)}>
                          <PlusCircle />
                        </button>
                      </div>
                    </td>
                    <td className="hide-on-mobile">
                      KSH {((item.buying_price || 0) * (item.quantity || 1)).toLocaleString()}
                    </td>
                    <td>
                      <button
                        onClick={() => removeItem?.(item.id)}
                        aria-label="Remove item"
                        className="remove-btn"
                      >
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cart-actions">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your cart?')) {
                  clearCart?.();
                }
              }}
              className="clear-cart-btn"
            >
              Clear Cart
            </button>
          </div>
        </div>

        <div className="order-summary">
          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>KSH {total.toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>KSH {total.toLocaleString()}</span>
            </div>
          </div>

          <button onClick={handleCheckout} className="checkout-btn">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
