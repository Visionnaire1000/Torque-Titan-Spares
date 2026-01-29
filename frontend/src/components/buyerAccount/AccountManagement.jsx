import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/accountManagement.css';

const AccountManagement = () => {
  const { changePassword, deleteAccount, isLoading } = useAuth();

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
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={isLoading}>
            Change Password
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
              type="password"
              placeholder="Confirm password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />

            <div className="actions">
              <button
                className="danger"
                onClick={handleDeleteAccount}
                disabled={isLoading}
              >
                Confirm Delete
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
