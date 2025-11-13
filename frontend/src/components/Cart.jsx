import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, PlusCircle, MinusCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Cart.css';

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error("Please login to proceed with checkout");
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="cart-container">
        <h1>Your Cart</h1>
        <div className="empty-cart-box">
          <ShoppingCart />
          <h2>Your cart is empty</h2>
          <p>Proceed to Marketplace and browse animals.</p>
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
                  <th>Animal</th>
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
                        <Link to={`/animal/${item.animal.id}`}>
                          {item.animal.name}
                        </Link>
                        <p>{item.animal.breed}, {item.animal.age} years</p>
                        <p className="mobile-price">
                          ${item.animal.price.toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="hide-on-mobile">
                      ${item.animal.price.toLocaleString()}
                    </td>
                    <td>
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <MinusCircle />
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <PlusCircle />
                        </button>
                      </div>
                    </td>
                    <td className="hide-on-mobile">
                      ${(item.animal.price * item.quantity).toLocaleString()}
                    </td>
                    <td>
                      <button
                        onClick={() => removeItem(item.id)}
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
                  clearCart();
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
              <span>${total.toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
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