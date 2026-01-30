import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import config from "../../config"; 
 import { ChevronUp, ChevronDown } from "lucide-react";
import "../../styles/buyerOrders.css";

const BuyerOrders = () => {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

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
      second: "2-digit",
      hour12: true,
    }).format(utcDate);
  };

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

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!orders.length) return <p>You have no orders yet.</p>;

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
              <div>Total Cost: KES {order.total_price?.toLocaleString() || '0'}</div>
              <div>Shipping Address: {order.address}</div>
              <div>
                Created At: {formatOrderTime(order.created_at)}
                <small className="timezone-label">({timeZone})</small>
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
                        <Link
                           to={`/items/${item.sparepart.id}`}
                           className="item-card-link"
                        >
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
                          <p>Price: KES {item.price?.toLocaleString() || '0'}</p>
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
