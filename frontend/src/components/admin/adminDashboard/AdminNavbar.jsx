import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  // -------------------- ORDER NOTIFICATIONS --------------------
  const calculateOrderNotifications = () => {
    const orders = JSON.parse(localStorage.getItem("admin_orders_cache")) || [];
    const seenRaw = JSON.parse(localStorage.getItem("admin_seen_order_ids")) || {};

    const seenPending = new Set(seenRaw.pending || []);
    const seenCancelled = new Set(seenRaw.cancelled || []);

    const pendingUnseen = orders.filter(
      (o) => o.status.toLowerCase() === "pending" && !seenPending.has(o.id)
    ).length;

    const cancelledUnseen = orders.filter(
      (o) => o.status.toLowerCase() === "cancelled" && !seenCancelled.has(o.id)
    ).length;

    setOrderNotifications(pendingUnseen + cancelledUnseen);
  };

  const markPendingOrdersAsSeen = () => {
    const orders = JSON.parse(localStorage.getItem("admin_orders_cache")) || [];
    const seenRaw = JSON.parse(localStorage.getItem("admin_seen_order_ids")) || {};

    const pendingIds = orders
      .filter((o) => o.status.toLowerCase() === "pending")
      .map((o) => o.id);

    const updatedSeen = {
      pending: Array.from(new Set([...(seenRaw.pending || []), ...pendingIds])),
      shipped: seenRaw.shipped || [],
      delivered: seenRaw.delivered || [],
      cancelled: seenRaw.cancelled || [],
    };

    localStorage.setItem("admin_seen_order_ids", JSON.stringify(updatedSeen));

    // Update badge instantly
    calculateOrderNotifications();
    window.dispatchEvent(new Event("admin_orders_updated"));
  };

  // -------------------- REVIEW NOTIFICATIONS --------------------
  const calculateReviewNotifications = (data = null) => {
    const reviews = data || JSON.parse(localStorage.getItem("admin_reviews_cache")) || [];
    const seen = JSON.parse(localStorage.getItem("admin_seen_review_ids")) || [];
    const seenSet = new Set(seen);

    const unseen = reviews.filter((r) => !seenSet.has(r.id)).length;
    setNewReviewsCount(unseen);
  };

  const fetchReviewNotifications = async () => {
    if (!user) return;
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      const data = await res.json();
      localStorage.setItem("admin_reviews_cache", JSON.stringify(data));
      calculateReviewNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const markReviewsAsSeen = async () => {
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      const data = await res.json();
      const allIds = data.map((r) => r.id);
      localStorage.setItem("admin_seen_review_ids", JSON.stringify(allIds));
      window.dispatchEvent(new Event("admin_reviews_updated"));
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------- INIT --------------------
  useEffect(() => {
    calculateOrderNotifications();
    fetchReviewNotifications();

    const handleOrders = () => calculateOrderNotifications();
    const handleReviews = () => calculateReviewNotifications();

    window.addEventListener("admin_orders_updated", handleOrders);
    window.addEventListener("admin_reviews_updated", handleReviews);

    const handleStorage = (e) => {
      if (e.key === "admin_orders_cache" || e.key === "admin_seen_order_ids") calculateOrderNotifications();
      if (e.key === "admin_reviews_cache" || e.key === "admin_seen_review_ids") calculateReviewNotifications();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("admin_orders_updated", handleOrders);
      window.removeEventListener("admin_reviews_updated", handleReviews);
      window.removeEventListener("storage", handleStorage);
    };
  }, [user]);

  // -------------------- ACTIVE TAB LOGIC --------------------
  const getActiveTabClass = (tabRoute) => {
    if (tabRoute === "orders") return location.pathname.startsWith("/admin-orders") ? "active-tab" : "";
    if (tabRoute === "reviews") return location.pathname.startsWith("/reviews") ? "active-tab" : "";
    if (tabRoute === "/") return location.pathname === "/" ? "active-tab" : "";
    if (tabRoute === "/super-admin-account") return location.pathname === "/super-admin-account" ? "active-tab" : "";
    return "";
  };

  return (
    <nav className="navbar admin-navbar">
      <div className="logo">
        <img src="https://i.imgur.com/wVCDyd7.png" alt="logo" />
      </div>

      <div className="dashboard-dropdown">
        <button className="dashboard-button" onClick={() => setShowDropdown(!showDropdown)}>
          <Menu />
        </button>

        {showDropdown && (
          <div className="dropdown-menu">
            <NavLink to="/" className={`tab ${getActiveTabClass("/")}`}>
              <Home size={18} /> Home
            </NavLink>

            <NavLink to="/account-management" className={`tab ${getActiveTabClass("/super-admin-account")}`}>
              <User size={18} /> Account
            </NavLink>

            {/* ---------------- ORDERS ---------------- */}
            <div
              className={`tab orders-tab ${getActiveTabClass("orders")}`}
              onClick={() => {
                markPendingOrdersAsSeen();
                navigate("/admin-orders?tab=pending");
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
            </div>

            {/* ---------------- REVIEWS ---------------- */}
            <NavLink
              to="/reviews"
              className={`tab review-tab ${getActiveTabClass("reviews")}`}
              onClick={markReviewsAsSeen}
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