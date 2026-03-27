import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, Home, User, Package, MessageSquare } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../config";
import "../../../styles/admin/adminNavbar.css";

const AdminNavbar = () => {
  const { logout, authFetch, user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [newReviewsCount, setNewReviewsCount] = useState(0);
  const [orderNotifications, setOrderNotifications] = useState(0);
  const navigate = useNavigate();

  // -------- Reviews Badge --------
  const fetchReviewNotifications = async () => {
    if (!user) return;
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      const data = await res.json();

      const lastSeen = localStorage.getItem("lastSeenReviewsCount");
      if (lastSeen === null) {
        localStorage.setItem("lastSeenReviewsCount", data.length);
        setNewReviewsCount(0);
      } else {
        const diff = data.length - Number(lastSeen);
        setNewReviewsCount(diff > 0 ? diff : 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------- Orders Badge (sum of unseen orders) --------
  const fetchOrderNotifications = async () => {
    if (!user) return;
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const orders = data.orders || [];

      // Initialize seen tabs
      const storedSeenTabs = JSON.parse(localStorage.getItem("seenOrderTabs")) || {};
      const updatedSeenTabs = { ...storedSeenTabs };

      // Count orders by status
      const counts = {};
      orders.forEach((order) => {
        const status = order.status.toLowerCase();
        counts[status] = (counts[status] || 0) + 1;
        if (updatedSeenTabs[status] === undefined) updatedSeenTabs[status] = false;
      });

      localStorage.setItem("seenOrderTabs", JSON.stringify(updatedSeenTabs));

      // Total unseen orders
      let totalUnseen = 0;
      Object.keys(counts).forEach((status) => {
        if (!updatedSeenTabs[status]) totalUnseen += counts[status];
      });

      setOrderNotifications(totalUnseen);
    } catch (err) {
      console.error(err);
    }
  };

  // -------- Periodic fetch --------
  useEffect(() => {
    fetchReviewNotifications();
    fetchOrderNotifications();

    const interval = setInterval(() => {
      fetchReviewNotifications();
      fetchOrderNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <nav className="navbar admin-navbar">
      <div className="logo">
        <img src="https://i.imgur.com/wVCDyd7.png" alt="Torque Titan logo" />
      </div>

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
              className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
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

            {/* Orders tab with badge */}
            <NavLink
              to="/admin-orders"
              className={({ isActive }) =>
                isActive ? "tab active-tab" : "tab"
              }
              onClick={() => {
                // Mark all order tabs as seen
                const seenTabs = JSON.parse(localStorage.getItem("seenOrderTabs")) || {};
                Object.keys(seenTabs).forEach((status) => (seenTabs[status] = true));
                localStorage.setItem("seenOrderTabs", JSON.stringify(seenTabs));

                setOrderNotifications(0); // reset badge visually
              }}
            >
              <div className="icon-wrapper">
                <Package size={18} />
                {orderNotifications > 0 && (
                  <span className="notification-badge">
                    {orderNotifications > 9 ? "9+" : orderNotifications}
                  </span>
                )}
              </div>
              Orders
            </NavLink>

            {/* Reviews tab with badge */}
            <NavLink
              to="/reviews"
              className={({ isActive }) =>
                isActive ? "tab active-tab review-tab" : "tab review-tab"
              }
              onClick={async () => {
                try {
                  const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
                  const data = await res.json();
                  localStorage.setItem("lastSeenReviewsCount", data.length);
                  setNewReviewsCount(0);
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <div className="icon-wrapper">
                <MessageSquare size={18} />
                {newReviewsCount > 0 && (
                  <span className="notification-badge">
                    {newReviewsCount > 9 ? "9+" : newReviewsCount}
                  </span>
                )}
              </div>
              Reviews
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