import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import config from "../../config";

const OrderDetails = () => {
  const { authFetch } = useAuth();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------- Auto-detect user timezone ----------------
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ---------------- UTC → user timezone formatter ----------------
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

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await authFetch(`${config.API_BASE_URL}/orders/${orderId}`);
        if (!res.ok) throw new Error("Failed to fetch order");
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) return <p>Loading order details...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div className="order-details">
      <h2>Order #{order.id}</h2>
      <p>Status: {order.status}</p>
      <p>Total Items: {order.total_items}</p>
      <p>Total Price: KES {order.total_price?.toLocaleString()}</p>
      <p>Shipping Address: {order.address}</p>
       <div>
                Created At: {formatOrderTime(order.created_at)}
                <small style={{ marginLeft: 6, opacity: 0.7 }}>
                  ({timeZone})
                </small>
              </div>

      <h3>Items</h3>
      <div className="order-items">
        {order.order_items?.map((item) => (
          <div key={item.id} className="order-item-card">
            <img
              src={item.sparepart.image_url }
              alt={item.sparepart.brand}
              className="order-item-img"
            />
            <div>
              <strong>
                {item.sparepart.brand} {item.sparepart.category} for {item.sparepart.vehicle_type}
              </strong>
              <p>Quantity: {item.quantity}</p>
              <p>Price: KES {item.price.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderDetails;
