const AccountManagement = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();

    await fetch(`${config.API_BASE_URL}/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JSON.parse(localStorage.getItem("titanUser"))?.token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });

    alert("Password updated");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("This action is permanent. Continue?")) return;

    await fetch(`${config.API_BASE_URL}/delete-account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${JSON.parse(localStorage.getItem("titanUser"))?.token}`
      }
    });

    localStorage.removeItem("farmartUser");
    window.location.href = "/register";
  };

  return (
    <div>
      <h2>Account Management</h2>

      <form onSubmit={handleChangePassword} className="account-form">
        <h4><Lock size={16} /> Change Password</h4>
        <input
          type="password"
          placeholder="Old password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit">Update Password</button>
      </form>

      <div className="danger-zone">
        <h4><Trash2 size={16} /> Danger Zone</h4>
        <button onClick={handleDeleteAccount} className="danger-btn">
          Delete My Account
        </button>
      </div>
    </div>
  );
};

export default AccountManagement;