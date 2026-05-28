import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import "../../../styles/admin/superAdminAccount.css";

const SuperAdminAccount = () => {
  const {
    user,
    sendChangePasswordOtp,
    completeChangePassword,
    resendOtp,
    otpSent,
    otpCountdown,
    deleteAccount,
    changePasswordLoading,
    resendLoading,
    deleteAccountLoading,
  } = useAuth();

  // ------------------ Password states ------------------
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [step, setStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);

  // ------------------ Delete account ------------------
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // ------------------ Validation ------------------
  const passwordPattern =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const allRequirementsMet = passwordPattern.test(newPassword);

  const requirementMessage =
    "Password must be at least 8 characters and include uppercase, number, and special character.";

  // ------------------ Handlers ------------------
  const handleRequestOtp = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (!allRequirementsMet) {
      setPasswordError("Password does not meet requirements.");
      return;
    }

    setPasswordError("");

    const success = await sendChangePasswordOtp(currentPassword);
    if (success) setStep(2);
  };

  const handleCompleteChangePassword = async (e) => {
    e.preventDefault();
    if (!otp) return;

    const success = await completeChangePassword(
      currentPassword,
      newPassword,
      otp
    );

    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setOtp("");
      setStep(1);
    }
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) return;
    deleteAccount(deletePassword);
  };

  return (
    <div className="account-management">
      <h2>Hello {user.display_name}</h2>

      {/* ------------------ Password --------------------- */}
      <section>
        <h3>Change Password</h3>

        <form
          onSubmit={
            step === 1 ? handleRequestOtp : handleCompleteChangePassword
          }
        >
          {step === 1 && (
            <>
              <input
                type={showChangePassword ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <input
                type={showChangePassword ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  if (allRequirementsMet) setPasswordFocused(false);
                }}
                required
              />

              {passwordFocused && !allRequirementsMet && (
                <div className="password-requirements-inline">
                  {requirementMessage}
                </div>
              )}

              <input
                type={showChangePassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </>
          )}

          {step === 2 && (
            <>
              <p>Enter OTP sent to your email</p>

              <input
                type="text"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />

              <div className="otp-info">
                {otpSent && otpCountdown > 0 && (
                  <span>Resend in {otpCountdown}s</span>
                )}

                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={otpCountdown > 0 || resendLoading}
                >
                  {resendLoading
                    ? "Resending..."
                    : otpCountdown > 0
                    ? `Wait ${otpCountdown}s`
                    : "Resend OTP"}
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowChangePassword((p) => !p)}
            className="toggle-password"
          >
            {showChangePassword ? <EyeOff /> : <Eye />}
          </button>

          <button type="submit" disabled={changePasswordLoading}>
            {changePasswordLoading
              ? "Processing..."
              : step === 1
              ? "Change Password"
              : "Verify OTP"}
          </button>

          {passwordError && <p className="password-error">{passwordError}</p>}
        </form>
      </section>

      {/* ----------------------Delete ---------------------------- */}
      <section className="danger-zone">
        <h3>Danger Zone</h3>

        {!showDeleteConfirm ? (
          <button
            className="danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : (
          <div className="delete-confirm">
            <p>This action is permanent.</p>

            <input
              type={showDeletePassword ? "text" : "password"}
              placeholder="Confirm password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowDeletePassword((p) => !p)}
              className="toggle-btn"
            >
              {showDeletePassword ? <EyeOff /> : <Eye />}
            </button>

            <div className="actions">
              <button
                className="danger"
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
              >
                Delete
              </button>

              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ----------------------Link to Admin Management------------------- */}
      {user?.role === "super_admin" && (
        <section className="superadmin-zone">
          <h3>Admin Management</h3>

          <Link to="/admin-management" className="manage-admin-link">
            Manage Admin Accounts →
          </Link>
        </section>
      )}
    </div>
  );
};

export default SuperAdminAccount;