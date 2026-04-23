import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import config from "../../config";
import { ChevronUp, ChevronDown, RefreshCw, PackageOpen } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/admin/adminOrders.css";

/* ---------------- Skeleton Loader ---------------- */
const SkeletonOrderCard = () => (
  <div className="order-card skeleton">
    <div className="order-header">
      <div className="skeleton-text title" />
      <div className="skeleton-icon" />
    </div>

    <div className="skeleton-text w-40" />
    <div className="skeleton-text w-30" />
    <div className="skeleton-text w-60" />
    <div className="skeleton-text w-50" />

    <div className="skeleton-btn" />

    <div className="order-items">
      {[1, 2].map((i) => (
        <div key={i} className="order-item-card">
          <div className="skeleton-image" />
          <div className="order-item-info">
            <div className="skeleton-text w-80" />
            <div className="skeleton-text w-40" />
            <div className="skeleton-text w-40" />
            <div className="skeleton-text w-50" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ---------------- Error State ---------------- */
const ErrorState = ({ onRetry }) => (
  <div className="error-state">
    <h2>Something went wrong</h2>
    <p>Unable to load orders. Please check your connection and try again.</p>

    <button className="retry-btn" onClick={onRetry}>
      <RefreshCw size={18} className="retry-icon" />
      Retry
    </button>
  </div>
);

const AdminOrders = () => {
  const { authFetch } = useAuth();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [seenOrderIds, setSeenOrderIds] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("admin_seen_order_ids")) || {};
    return {
      pending: stored.pending || [],
      shipped: stored.shipped || [],
      delivered: stored.delivered || [],
      cancelled: stored.cancelled || [],
    };
  });

  const prevOrdersRef = useRef([]);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tabs = ["pending", "shipped", "delivered", "cancelled"];

  /* ---------------- Persist Seen ---------------- */
  useEffect(() => {
    localStorage.setItem("admin_seen_order_ids", JSON.stringify(seenOrderIds));
    window.dispatchEvent(new CustomEvent("admin_orders_updated", { detail: { type: "seen_update" } }));
  }, [seenOrderIds]);

  /* ---------------- Set Tab from URL ---------------- */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && tabs.includes(tab)) setActiveTab(tab);
  }, [location.search]);

  /* ---------------- Helpers ---------------- */
  const formatOrderTime = (dateString) => {
    if (!dateString) return "";
    const utcDate = dateString.endsWith("Z") ? new Date(dateString) : new Date(`${dateString}Z`);
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(utcDate);
  };

  const hasOrdersChanged = (oldOrders, newOrders) => {
    if (oldOrders.length !== newOrders.length) return true;
    for (let i = 0; i < newOrders.length; i++) {
      if (
        oldOrders[i].id !== newOrders[i].id ||
        oldOrders[i].status !== newOrders[i].status ||
        oldOrders[i].total_items !== newOrders[i].total_items ||
        oldOrders[i].total_price !== newOrders[i].total_price
      ) return true;
    }
    return false;
  };

  const groupedOrders = orders.reduce((acc, order) => {
    const status = order.status.toLowerCase();
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {});

  Object.keys(groupedOrders).forEach((status) => {
    groupedOrders[status].sort(
      (a, b) => new Date(`${b.created_at}Z`) - new Date(`${a.created_at}Z`)
    );
  });

  /* ---------------- Fetch Orders ---------------- */
  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      const newOrders = data.orders || [];

      if (hasOrdersChanged(prevOrdersRef.current, newOrders)) {
        setOrders(newOrders);
        prevOrdersRef.current = newOrders;

        localStorage.setItem("admin_orders_cache", JSON.stringify(newOrders));

        window.dispatchEvent(new CustomEvent("admin_orders_updated", { detail: { type: "data_update" } }));
      }
    } catch (err) {
      setError(err.message);
      if (!silent) toast.error(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /* ---------------- Update Status ---------------- */
  const updateOrderStatus = (orderId, status) => {
    const toastId = toast.info(
      <div>
        Mark order #{orderId} as {status}?
        <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
          <button
            onClick={async () => {
              toast.dismiss(toastId);
              try {
                const res = await authFetch(`${config.API_BASE_URL}/admin/orders/${orderId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed");
                toast.success(`Order #${orderId} marked as ${status}`);
                fetchOrders(true);
              } catch (err) {
                toast.error(err.message);
              }
            }}
            className="confirm-btn"
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(toastId)} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>,
      { autoClose: false }
    );
  };

  /* ---------------- Polling ---------------- */
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- Tab Click ---------------- */
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    const ordersInTab = groupedOrders[tab] || [];

    setSeenOrderIds((prev) => ({
      ...prev,
      [tab]: ordersInTab.map((o) => o.id),
    }));
  };

  /* ---------------- Render ---------------- */

  // Skeleton
  if (loading) {
    return (
      <div className="orders-container">
        <div className="orders-tabs skeleton-tabs">
          {tabs.map((_, i) => (
            <div key={i} className="skeleton-tab" />
          ))}
        </div>

        <div className="orders-list">
          {[1, 2, 3].map((i) => (
            <SkeletonOrderCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) return <ErrorState onRetry={fetchOrders} />;

  // No orders at all
  if (!orders.length) {
    return (
      <div className="orders-empty">
        <div className="empty-card">
          <PackageOpen size={48} className="empty-icon" />
          <h2>No orders yet</h2>
          <p>No customer orders have been placed yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Tabs */}
      <div className="orders-tabs">
        {tabs.map((tab) => {
          const ordersInTab = groupedOrders[tab] || [];
          const seenIds = new Set(seenOrderIds[tab] || []);
          const count = ordersInTab.filter((o) => !seenIds.has(o.id)).length;

          return (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {count > 0 && <span className="tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <div className="orders-list">
        {groupedOrders[activeTab]?.length ? (
          groupedOrders[activeTab].map((order) => (
            <div key={order.id} className="order-card">
              <div
                className="order-header"
                onClick={() =>
                  setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                }
              >
                <strong>Order #{order.id}</strong> — {order.status.toUpperCase()}
                <span className="toggle-icon">
                  {expandedOrderId === order.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </span>
              </div>

              <div>Total Items: {order.total_items}</div>
              <div>Total Cost: KES {order.total_price?.toLocaleString()}</div>
              <div>Shipping Address: {order.address}</div>
              <div>
                Created At: {formatOrderTime(order.created_at)}{" "}
                <small className="timezone-label">({timeZone})</small>
              </div>

              {order.status === "pending" && (
                <div className="admin-actions">
                  <button
                    className="ship-button"
                    onClick={() => updateOrderStatus(order.id, "shipped")}
                  >
                    Mark as Shipped
                  </button>
                </div>
              )}

              {order.status === "shipped" && (
                <div className="admin-actions">
                  <button
                    className="deliver-btn"
                    onClick={() => updateOrderStatus(order.id, "delivered")}
                  >
                    Mark as Delivered
                  </button>
                </div>
              )}

              {expandedOrderId === order.id && order.order_items?.length > 0 && (
                <div className="order-items">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="order-item-card">
                      <Link to={`/items/${item.sparepart.id}`}>
                        <img
                          src={item.sparepart.image_url}
                          alt={item.sparepart.brand}
                          className="order-item-img"
                        />
                      </Link>

                      <div className="order-item-info">
                        <strong>
                          {item.sparepart.brand} {item.sparepart.category} for{" "}
                          {item.sparepart.vehicle_type}
                        </strong>
                        <p>Quantity: {item.quantity}</p>
                        <p>Unit Price: KES {item.price?.toLocaleString()}</p>
                        <p>Subtotal: KES {item.subtotal?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-tab">
            <PackageOpen size={36} className="empty-icon" />
            <h3>No {activeTab} orders</h3>
            <p>
              {activeTab === "pending" && "No pending orders to process."}
              {activeTab === "shipped" && "No orders currently in transit."}
              {activeTab === "delivered" && "No completed deliveries yet."}
              {activeTab === "cancelled" && "No cancelled orders."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;