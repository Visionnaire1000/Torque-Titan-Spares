import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/register.css';

const Register = () => {
  const {
    sendRegistrationOtp,    // send OTP for registration
    verifyRegistrationOtp,  // verify OTP
    resendOtp,              // resend OTP
    otpSent,
    otpCountdown,
    resendLoading,
  } = useAuth();

  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: email/password, 2: OTP
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ------------------ Handle input ------------------
  const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));

  if (name === 'password') {
    const pattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    setPasswordError(
      !pattern.test(value)
        ? 'Password must be at least 8 characters and include one uppercase letter, one number, and one special character.'
        : ''
    );
  }
};

  // ------------------ Step 1: Send OTP ------------------
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (passwordError) return;

    setIsLoading(true);
    const success = await sendRegistrationOtp(formData.email, formData.password);
    setIsLoading(false);

    if (success) setStep(2);
  };

  // ------------------ Step 2: Verify OTP ------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!formData.otp) return;

    setIsLoading(true);
    const success = await verifyRegistrationOtp(formData.email, formData.otp);
    setIsLoading(false);

    if (success) navigate('/login');
  };

  // ------------------ Resend OTP ------------------
  const handleResendOtp = async () => {
    if (!formData.email) return; 
    await resendOtp(formData.email);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Create Account</h2>

        {/* Step 1: Email & Password */}
        {step === 1 && (
          <form className="register-form" onSubmit={handleSendOtp}>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
            />

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
                onClick={() => setShowPassword((prev) => !prev)}
                className="toggle-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {passwordError && (
              <p id="password-help" className="password-error">
                {passwordError}
              </p>
            )}

            <button type="submit" disabled={isLoading || passwordError}>
              {isLoading ? 'Sending OTP...' : 'Register'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <form className="register-form" onSubmit={handleVerifyOtp}>
            <p>
              Enter the OTP sent to <strong>{formData.email}</strong>
            </p>

            <input
              type="text"
              name="otp"
              placeholder="Enter OTP"
              value={formData.otp}
              onChange={handleChange}
              required
            />

            <div className="otp-info">
              {otpSent && otpCountdown > 0 && (
                <span>Resend OTP in {otpCountdown}s</span>
              )}
               <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || resendLoading}
                >
                   {resendLoading
                    ? "Resending..."
                    : otpCountdown > 0
                    ? `Resend in ${otpCountdown}s`
                    : "Resend OTP"}
                </button>
            </div>

            <button type="submit" disabled={isLoading || !formData.otp}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;