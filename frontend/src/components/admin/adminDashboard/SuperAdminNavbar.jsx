import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, Home, User, Package, MessageSquare } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../config";
import "../../../styles/admin/superAdminNavbar.css";

const SuperAdminNavbar = () => {
  const { logout, authFetch, user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // --- Badge states ---
  const [newReviewsCount, setNewReviewsCount] = useState(0);
  const [orderNotifications, setOrderNotifications] = useState(0);

  // --- Track seen orders locally ---
  const [seenOrderTabs, setSeenOrderTabs] = useState(() => {
    const saved = localStorage.getItem("seenOrderTabs");
    return saved ? JSON.parse(saved) : {};
  });

  const navigate = useNavigate();

  // --- Fetch reviews count ---
  const fetchReviewNotifications = async () => {
    if (!user) return;

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      const data = await res.json();
      const lastSeen = Number(localStorage.getItem("lastSeenReviewsCount") || 0);
      const diff = data.length - lastSeen;

      // Only update state if it changed
      const newCount = diff > 0 ? diff : 0;
      setNewReviewsCount((prev) => (prev !== newCount ? newCount : prev));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Fetch orders notifications ---
  const fetchOrderNotifications = async () => {
    if (!user) return;

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const orders = data.orders || [];

      const counts = {};
      orders.forEach((order) => {
        const status = order.status.toLowerCase();
        counts[status] = (counts[status] || 0) + 1;
      });

      let totalUnseen = 0;
      Object.keys(counts).forEach((status) => {
        if (!seenOrderTabs[status]) totalUnseen += counts[status];
      });

      // Only update state if it changed
      setOrderNotifications((prev) => (prev !== totalUnseen ? totalUnseen : prev));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Silent polling every 30s ---
  useEffect(() => {
    fetchReviewNotifications();
    fetchOrderNotifications();

    const interval = setInterval(() => {
      fetchReviewNotifications();
      fetchOrderNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, seenOrderTabs]);

  // --- Handle order tab click ---
  const handleOrdersClick = () => {
    const allSeen = {};
    Object.keys(seenOrderTabs).forEach((key) => (allSeen[key] = true));
    setSeenOrderTabs(allSeen);
    localStorage.setItem("seenOrderTabs", JSON.stringify(allSeen));
    setOrderNotifications(0);
  };

  // --- Handle reviews tab click ---
  const handleReviewsClick = async () => {
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      const data = await res.json();
      localStorage.setItem("lastSeenReviewsCount", data.length);
      setNewReviewsCount(0);
    } catch (err) {
      console.error(err);
    }
  };

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
              to="/super-admin-account"
              className={({ isActive }) =>
                isActive ? "tab active-tab" : "tab"
              }
            >
              <User size={18} /> Account Management
            </NavLink>

            <NavLink
              to="/admin-orders"
              className={({ isActive }) =>
                isActive ? "tab active-tab" : "tab"
              }
              onClick={handleOrdersClick}
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

            <NavLink
              to="/reviews"
              className={({ isActive }) =>
                isActive ? "tab active-tab review-tab" : "tab review-tab"
              }
              onClick={handleReviewsClick}
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

export default SuperAdminNavbar;