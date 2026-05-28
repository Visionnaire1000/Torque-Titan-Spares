import { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../config"; 
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../../styles/admin/adminManagement.css";

const AdminManagement = () => {
  const { user, authFetch } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteloading, setDeleteLoading] = useState(false);

  //Email regex
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/admins`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch admins");
      setAdmins(data.admins || []);
    } catch (err) {
      toast.error(err.message);
    }
  }, [authFetch]);

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchAdmins();
    }
  }, [user, fetchAdmins]);

  //Create admin with validation
  const createAdmin = async (e) => {
    e.preventDefault();

    if (emailError) return; //blocks invalid email

    setLoading(true);

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");

      setEmail("");
      setPassword("");
      setEmailError("");
      toast.success("Admin created successfully!");
      fetchAdmins();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete admin
  const deleteAdmin = async (e) => {
    e.preventDefault();
    if (!selectedId) return toast.warn("Please select an admin");

    setDeleteLoading(true);
    try {
      const res = await authFetch(
        `${config.API_BASE_URL}/admin/delete-admin/${selectedId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete admin");

      setSelectedId("");
      toast.success("Admin deleted successfully!");
      fetchAdmins();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (user?.role !== "super_admin") return <p>Access denied</p>;

  return (
    <div className="admin-management">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Admin Management</h2>

      {/* Create Admin */}
      <section>
        <h3>Create Admin</h3>
        <form onSubmit={createAdmin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);

              //Validate email
              setEmailError(
                !emailPattern.test(value) ? "Enter a valid email address" : ""
              );
            }}
            required
          />

          {/*Email error */}
          {emailError && (
            <p className="password-error">{emailError}</p>
          )}

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || emailError} 
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      {/* Delete Admin */}
      <section>
        <h3>Delete Admin</h3>
        <form onSubmit={deleteAdmin}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
          >
            <option value="">Select admin</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
          <button type="submit" disabled={deleteloading}>
            {deleteloading ? "Deleting..." : "Delete"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default AdminManagement;