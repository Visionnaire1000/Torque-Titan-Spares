import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import config from "../../config";
import { ChevronUp, ChevronDown } from "lucide-react";
import "../../styles/admin/adminOrders.css";

const AdminOrders = () => {
  const { authFetch } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("pending");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [notifications, setNotifications] = useState({});

  // Persist seen tabs
  const [seenTabs, setSeenTabs] = useState(() => {
    const saved = localStorage.getItem("seenOrderTabs");
    return saved ? JSON.parse(saved) : {};
  });

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatOrderTime = (dateString) => {
    if (!dateString) return "";

    const utcDate = dateString.endsWith("Z")
      ? new Date(dateString)
      : new Date(`${dateString}Z`);

    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(utcDate);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      const fetchedOrders = data.orders || [];

      setOrders(fetchedOrders);

      // Count orders by status
      const counts = {};

      fetchedOrders.forEach((order) => {
        const status = order.status.toLowerCase();
        counts[status] = (counts[status] || 0) + 1;
      });

      // Only show notifications for unseen tabs
      const filteredNotifications = {};

      Object.keys(counts).forEach((status) => {
        if (!seenTabs[status]) {
          filteredNotifications[status] = counts[status];
        }
      });

      setNotifications(filteredNotifications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    if (!window.confirm(`Mark order #${orderId} as ${status}?`)) return;

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

      if (!res.ok) throw new Error(data.message || "Failed to update order");

      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const groupedOrders = orders.reduce((acc, order) => {
    const status = order.status.toLowerCase();

    if (!acc[status]) acc[status] = [];

    acc[status].push(order);

    return acc;
  }, {});

  for (let status in groupedOrders) {
    groupedOrders[status].sort(
      (a, b) => new Date(`${b.created_at}Z`) - new Date(`${a.created_at}Z`)
    );
  }

  const tabs = ["pending", "shipped", "delivered", "cancelled"];

  const handleTabClick = (tab) => {
    setActiveTab(tab);

    const updatedSeenTabs = {
      ...seenTabs,
      [tab]: true,
    };

    setSeenTabs(updatedSeenTabs);

    localStorage.setItem("seenOrderTabs", JSON.stringify(updatedSeenTabs));

    setNotifications((prev) => ({
      ...prev,
      [tab]: 0,
    }));
  };

  if (loading) return <p className="message">Loading orders...</p>;
  if (error) return <p className="message">Error: {error}</p>;
  if (!orders.length) return <p className="message">No orders yet.</p>;

  return (
    <div className="orders-container">
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

              <div>
                Total Cost: KES {order.total_price?.toLocaleString() || "0"}
              </div>

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

              {expandedOrderId === order.id &&
                order.order_items?.length > 0 && (
                  <div className="order-items">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="order-item-card">
                        <Link to={`/items/${item.sparepart.id}`}>
                          <img
                            src={item.sparepart.image_url || "/placeholder.png"}
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
          <p>No {activeTab} orders.</p>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;