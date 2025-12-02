import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        <p className="registers">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-container">
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-container">
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="register-link">
          <p className="registers">
            Don't have an account?{' '}
            <Link to="/register" className="link">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
