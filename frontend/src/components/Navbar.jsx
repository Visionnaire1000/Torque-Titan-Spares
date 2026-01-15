import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSelectNavigate = (e) => {
    if (e.target.value) navigate(`/${e.target.value}`);
  };


  return (
    <nav className={`navbar ${user ? 'logged-in' : 'logged-out'}`}>
      {/* Logo */}
      <div className="logo">
        <img src="https://i.imgur.com/wVCDyd7.png" alt="Torque Titan logo" />
      </div>

      {/* Dashboard dropdown */}
      <div className="dashboard-dropdown">
        <button className="dashboard-button" onClick={() => setShowDropdown(!showDropdown)} title="Dashboard">
          <Menu />
        </button>
        {showDropdown && (
          <div className="dropdown-menu">
            <Link to="/">Home</Link>
            <Link to="/">My Account</Link>
            {user && <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="categories">
        {['TYRES', 'RIMS', 'BATTERIES', 'OIL FILTERS'].map(cat => (
          <select key={cat} defaultValue="" onChange={handleSelectNavigate}>
            <option disabled value="">{cat}</option>
            {['sedan', 'suv', 'truck', 'bus'].map(type => (
              <option key={type} value={`${type.toLowerCase()}-${cat.toLowerCase().replace(' ', '-')}`}>
                {type.toUpperCase()} {cat}
              </option>
            ))}
          </select>
        ))}
      </div>
      {/* Smart search (icon only) */}
      <div className="navbar-smart-search">
      <button
        className="navbar-search-icon"
        title="Search"
        aria-label="Open search"
        onClick={() => navigate('/search')}
      >
         <i className="fa fa-search" />
      </button>
     </div>
      {/* Right section */}
      <div className="right-section">
        <Link to="/cart" className="cart">
          <ShoppingCart />
          <span className="cart-count">{items.length}</span>
        </Link>

        {!user && <Link to="/login" className="login">Login</Link>}
        {!user && <Link to="/register" className="register">Register</Link>}
      </div>
    </nav>
  );
};

export default Navbar;

