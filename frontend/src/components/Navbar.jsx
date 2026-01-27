import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Home, User } from "lucide-react";
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
            <Link to="/" className="dropdown-item">
               <Home size={18} />
               <span>Home</span>
            </Link>

            <Link to="/buyer-account" className="dropdown-item">
              <User size={18} />
              <span>My Account</span>
          </Link>
             {user && <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>}
          </div>
        )}
      </div>

     {/* Categories */}
     <div className="categories">
      {[
        { label: 'TYRES', path: 'tyres' },
        { label: 'RIMS', path: 'rims' },
        { label: 'BATTERIES', path: 'batteries' },
        { label: 'OIL FILTERS', path: 'filters' },
      ].map(({ label, path }) => (
      <select key={label} defaultValue="" onChange={handleSelectNavigate}>
      <option value="" disabled>{label}</option>

      {['sedan', 'suv', 'truck', 'bus'].map(type => (
        <option
          key={type}
          value={`${type}-${path}`}
        >
          {type.toUpperCase()} {label}
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


/*
import { useState, useEffect } from 'react';
import { Link ,useNavigate, useLocation} from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';


const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const { login, isLoading, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Path user attempted before login
  const from = location.state?.from || '/';

  
  const handleSubmit = async (e) => {
     e.preventDefault();
     await login(email, password); 
   };
 
   // Redirect after login based on role
   useEffect(() => {
     if (!isAuthenticated || !user) return;
 
     if (user.role === 'admin') {
       navigate('/admin', { replace: true });
     } else {
       navigate(from, { replace: true });
     }
   }, [isAuthenticated, user, navigate, from]);
 
  return (
    <div className="login-container">
      <div className="login-card">
        <p className="sign">Sign in to your account</p>
        <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-container">

          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />

            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              aria-describedby={error ? 'login-error' : undefined}
            />

            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? 'Hide password' : 'Show password'
              }
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {error && (
            <p id="login-error" className="login-error">
              {error}
            </p>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
        <div className="register-link">
           <p className="registers">
            Don't have an account?{' '}
             <Link to="/register" className="link">Register here</Link>
          </p>
        </div>
        </form>
      </div>
    </div>
  );
};

export default Login;  */


