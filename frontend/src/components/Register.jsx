import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import 'react-toastify/dist/ReactToastify.css'; 
import '../styles/register.css';

const Register = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer',
    address: '',
  });

  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      const passwordPattern = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordPattern.test(value)) {
        setPasswordError('Password must be at least 8 characters, contain one uppercase letter and one number.');
      } else {
        setPasswordError('');
      }
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, role, address } = formData;
  
    if (passwordError) {
      console.log('Password error:', passwordError);
      return;
    }
  
    try {
      const response = await register(name, email, password, role, address);
  
      if (response && response.status === 'success') {
        console.log('Registration successful!');
        navigate('/login');
      } else {
        console.log('Registration failed:', response);
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };
  
  return (
    <div>
       <div className="register-container">
      <div className="register-card">
       <h2>Create Account</h2>
       <form className="register-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder= "name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder= "email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder= "password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        {passwordError && <p className="password-error">{passwordError}</p>} 

        <label>Role</label>
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="buyer">Buyer</option>
          <option value="farmer">Farmer</option>
        </select>

        {formData.role === 'buyer' && (
          <>
            <input
              type="text"
              name="address"
              placeholder= "Buyer Address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </>
        )}

        <button type="submit" disabled={isLoading || passwordError}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
    </div>
    </div>
  );
};

export default Register;