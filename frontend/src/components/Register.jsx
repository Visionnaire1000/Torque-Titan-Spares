import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/register.css';

const Register = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      const passwordPattern =
        /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

      if (!passwordPattern.test(value)) {
        setPasswordError(
          'Password must be at least 8 characters, contain one uppercase letter and one number.'
        );
      } else {
        setPasswordError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordError) return;

    try {
      const response = await register(formData.email, formData.password);
      if (response?.status === 'success') {
        navigate('/login');
      }
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Create Account</h2>

        <form className="register-form" onSubmit={handleSubmit}>
          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* Password */}
          <div className="input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              aria-describedby="password-help"
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

          {passwordError && (
            <p id="password-help" className="password-error">
              {passwordError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || passwordError}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
