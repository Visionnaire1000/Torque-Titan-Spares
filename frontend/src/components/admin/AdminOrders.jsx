import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import config from "../../config";
import { ChevronUp, ChevronDown } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/admin/adminOrders.css";

const AdminOrders = () => {
  const { authFetch } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [notifications, setNotifications] = useState({});

  // seen timestamps per tab
  const [seenTabs, setSeenTabs] = useState(() => {
    const saved = localStorage.getItem("seenOrderTabs");
    return saved ? JSON.parse(saved) : {};
  });

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatOrderTime = (dateString) => {
    if (!dateString) return "";
    const safeDate = dateString.endsWith("Z")
      ? new Date(dateString)
      : new Date(dateString + "Z");
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(safeDate);
  };

  // --------- FETCH ORDERS WITH FIRST-LOAD SYNC ---------
  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      const fetchedOrders = data.orders || [];
      setOrders(fetchedOrders);

      // Count per status
      const counts = {};
      fetchedOrders.forEach((order) => {
        const status = order.status.toLowerCase();
        counts[status] = (counts[status] || 0) + 1;
      });

      // ---------- SYNC seenTabs on first load ----------
      if (!silent) {
        const newSeenTabs = { ...seenTabs };

        Object.keys(counts).forEach((status) => {
          const tabOrders = fetchedOrders.filter(
            (o) => o.status.toLowerCase() === status
          );
          if (tabOrders.length) {
            newSeenTabs[status] = Math.max(
              ...tabOrders.map((o) =>
                new Date(
                  o.created_at.endsWith("Z")
                    ? o.created_at
                    : o.created_at + "Z"
                ).getTime()
              )
            );
          }
        });

        setSeenTabs(newSeenTabs);
        localStorage.setItem("seenOrderTabs", JSON.stringify(newSeenTabs));
      }

      // Compute notifications for orders after seenTabs
      const updatedNotifications = {};
      Object.keys(counts).forEach((status) => {
        const lastSeen = seenTabs[status] || 0;

        const unseenCount = fetchedOrders.filter((order) => {
          if (order.status.toLowerCase() !== status) return false;
          const orderTime = new Date(
            order.created_at.endsWith("Z")
              ? order.created_at
              : order.created_at + "Z"
          ).getTime();
          return orderTime > lastSeen;
        }).length;

        if (unseenCount > 0) updatedNotifications[status] = unseenCount;
      });

      setNotifications(updatedNotifications);
    } catch (err) {
      if (!silent) setError(err.message);
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // --------- UPDATE ORDER STATUS ---------
  const updateOrderStatus = (orderId, status) => {
    const toastId = toast.info(
      <div>
        Mark order #{orderId} as {status}?
        <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
          <button
            onClick={async () => {
              toast.dismiss(toastId);
              try {
                const res = await authFetch(
                  `${config.API_BASE_URL}/admin/orders/${orderId}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                  }
                );

                const data = await res.json();
                if (!res.ok)
                  throw new Error(data.message || "Failed to update order");

                toast.success(`Order #${orderId} marked as ${status}`);
                fetchOrders(true);
              } catch (err) {
                toast.error(err.message);
              }
            }}
            style={{
              padding: "4px 8px",
              border: "none",
              background: "#4CAF50",
              color: "#fff",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            Confirm
          </button>

          <button
            onClick={() => toast.dismiss(toastId)}
            style={{
              padding: "4px 8px",
              border: "none",
              background: "#f44336",
              color: "#fff",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false }
    );
  };

  // --------- POLLING ---------
  useEffect(() => {
    fetchOrders(false);
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // --------- GROUP ORDERS ---------
  const groupedOrders = orders.reduce((acc, order) => {
    const status = order.status.toLowerCase();
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {});

  Object.keys(groupedOrders).forEach((status) => {
    groupedOrders[status].sort(
      (a, b) => new Date(b.created_at + "Z") - new Date(a.created_at + "Z")
    );
  });

  const tabs = ["pending", "shipped", "delivered", "cancelled"];

  // --------- TAB CLICK HANDLER ---------
  const handleTabClick = (tab) => {
    setActiveTab(tab);

    const tabOrders = orders.filter(
      (o) => o.status.toLowerCase() === tab
    );

    const latestTimestamp = tabOrders.length
      ? Math.max(
          ...tabOrders.map((o) =>
            new Date(
              o.created_at.endsWith("Z")
                ? o.created_at
                : o.created_at + "Z"
            ).getTime()
          )
        )
      : Date.now();

    const updatedSeenTabs = {
      ...seenTabs,
      [tab]: latestTimestamp,
    };

    setSeenTabs(updatedSeenTabs);
    localStorage.setItem("seenOrderTabs", JSON.stringify(updatedSeenTabs));

    setNotifications((prev) => ({ ...prev, [tab]: 0 }));
  };

  // --------- UI STATES ---------
  if (loading && orders.length === 0)
    return <p className="message">Loading orders...</p>;

  if (error) return <p className="message">Error: {error}</p>;

  if (!orders.length) return <p className="message">No orders yet.</p>;

  return (
    <div className="orders-container">
      <ToastContainer position="top-right" newestOnTop />

      {/* Tabs */}
      <div className="orders-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => handleTabClick(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {notifications[tab] > 0 && (
              <span className="notification-badge">
                {notifications[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="orders-list">
        {groupedOrders[activeTab]?.length ? (
          groupedOrders[activeTab].map((order) => (
            <div key={order.id} className="order-card">
              <div
                className="order-header"
                onClick={() =>
                  setExpandedOrderId(
                    expandedOrderId === order.id ? null : order.id
                  )
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
              <div>Total Cost: KES {order.total_price?.toLocaleString() || "0"}</div>
              <div>Shipping Address: {order.address}</div>
              <div>
                Created At: {formatOrderTime(order.created_at)}
                <small className="timezone-label"> ({timeZone})</small>
              </div>

              {order.shipped_at && (
                <div>Shipped At: {formatOrderTime(order.shipped_at)}</div>
              )}

              {order.delivered_at && (
                <div>Delivered At: {formatOrderTime(order.delivered_at)}</div>
              )}

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
                          {item.sparepart.brand} {item.sparepart.category} for {item.sparepart.vehicle_type}
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
          <p>No {activeTab} orders.</p>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;