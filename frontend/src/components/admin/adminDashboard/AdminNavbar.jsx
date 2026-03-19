import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, Home, User, Package } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import "../../../styles/admin/adminNavbar.css";

const AdminNavbar = () => {
  const { logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="navbar admin-navbar">
      
      {/* Logo */}
      <div className="logo">
        <img src="https://i.imgur.com/wVCDyd7.png" alt="Torque Titan logo" />
      </div>

      {/* Dashboard dropdown */}
      <div className="dashboard-dropdown">
        <button
          className="dashboard-button"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Dashboard"
        >
          <Menu />
        </button>

        {showDropdown && (
          <div className="dropdown-menu">

            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "tab active-tab" : "tab"
              }
            >
              <Home size={18} /> Home
            </NavLink>

            <NavLink
              to="/account-management"
              className={({ isActive }) =>
                isActive ? "tab active-tab" : "tab"
              }
            >
              <User size={18} className="icon" /> Account Management
            </NavLink>

            <NavLink
              to="/admin-orders"
              className={({ isActive }) =>
                isActive ? "tab active-tab" : "tab"
              }
            >
              <Package size={18} className="icon" /> Orders
            </NavLink>

            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>

          </div>
        )}
      </div>

    </nav>
  );
};

export default AdminNavbar;