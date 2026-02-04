import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import '../../styles/accountManagement.css';

const AccountManagement = () => {
  const { changePassword, deleteAccount,  changePasswordLoading,
          deleteAccountLoading, } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  
  // ------------------ Change password state ------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // ------------------ Delete account state ------------------
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // ------------------ Handlers ------------------
  const handleChangePassword = (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match');
      return;
    }

    changePassword(currentPassword, newPassword);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      alert('Please enter your password to confirm');
      return;
    }

    deleteAccount(deletePassword);
  };

  return (
    <div className="account-management">
      <h2>Account Management</h2>

      {/* ================= Change Password ================= */}
      <section>
        <h3>Change Password</h3>

        <form onSubmit={handleChangePassword}>
          <input
            type={showChangePassword ? 'text' : 'password'}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <input
            type={showChangePassword ? 'text' : 'password'}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            type={showChangePassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />

           <button
              type="button"
              onClick={() => setShowChangePassword((prev) => !prev)}
              aria-label={
                showChangePassword ? 'Hide password' : 'Show password'
              }
            >
              {showChangePassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>

          <button
            type="submit"
            disabled={changePasswordLoading}
          >
            {changePasswordLoading
              ? "Changing Password..."
              : "Change Password"}
          </button>
        </form>
      </section>

      {/* ================= Delete Account ================= */}
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
            <p>This action is permanent. Enter your password to continue.</p>

            <input
              type={showDeletePassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />

             <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowDeletePassword((prev) => !prev)}
              aria-label={
                showDeletePassword ? 'Hide password' : 'Show password'
              }
            >
              {showDeletePassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>

            <div className="actions">
              <button
                className="danger"
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
              >
                {deleteAccountLoading
                  ? "Deleting Account..."
                  : "Delete Account"}
              </button>

              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AccountManagement;
