import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import config from "../../config"; 
import "../../styles/buyerOrders.css";

const BuyerOrders = () => {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // ---------------- Auto-detect user timezone ----------------
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ---------------- UTC → user timezone formatter ----------------
  const formatOrderTime = (dateString) => {
    if (!dateString) return "";

    // Force UTC if backend omitted "Z"
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
      second: "2-digit",
      hour12: true,
    }).format(utcDate);
  };

  // ---------------- Fetch orders ----------------
  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${config.API_BASE_URL}/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Cancel order ----------------
  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await authFetch(`${config.API_BASE_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");

      alert(data.message);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------------- Effect ----------------
  useEffect(() => {
    fetchOrders();
  }, []);

  // ---------------- Loading / Error ----------------
  if (loading) return <p>Loading orders...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!orders.length) return <p>You have no orders yet.</p>;

  // ---------------- Group & sort orders ----------------
  const groupedOrders = orders.reduce((acc, order) => {
    const status = order.status.toLowerCase();
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {});

  for (let status in groupedOrders) {
    groupedOrders[status].sort(
      (a, b) =>
        new Date(`${b.created_at}Z`) - new Date(`${a.created_at}Z`)
    );
  }

  const tabs = ["pending", "cancelled"];

  return (
    <div className="orders-container">
      {/* ---------------- Tabs ---------------- */}
      <div className="orders-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ---------------- Orders List ---------------- */}
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
                style={{ cursor: "pointer" }}
              >
                <strong>Order #{order.id}</strong> —{" "}
                {order.status.toUpperCase()}
                <span style={{ float: "right" }}>
                  {expandedOrderId === order.id ? "▲" : "▼"}
                </span>
              </div>

              <div>Total Items: {order.total_items}</div>
              <div>Paid: {order.paid ? "Yes" : "No"}</div>
              <div>Shipping Address: {order.address}</div>
              <div>
                Created At: {formatOrderTime(order.created_at)}
                <small style={{ marginLeft: 6, opacity: 0.7 }}>
                  ({timeZone})
                </small>
              </div>

              {order.status === "pending" && (
                <button
                  className="cancel-btn"
                  onClick={() => cancelOrder(order.id)}
                >
                  Cancel Order
                </button>
              )}

              {expandedOrderId === order.id &&
                order.order_items?.length > 0 && (
                  <div className="order-items">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="order-item-card">
                        <img
                          src={item.sparepart.image_url || "/placeholder.png"}
                          alt={item.sparepart.name}
                          className="order-item-img"
                        />
                        <div className="order-item-info">
                          <strong>{item.sparepart.name}</strong>
                          <p>Quantity: {item.quantity}</p>
                          <p>Price: ${item.price.toFixed(2)}</p>
                          {item.sparepart.brand && (
                            <p>Brand: {item.sparepart.brand}</p>
                          )}
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

export default BuyerOrders;
