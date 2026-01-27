const BuyerOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/orders/my-orders`, {
      headers: {
        Authorization: `Bearer ${JSON.parse(localStorage.getItem("titanUser"))?.token}`
      }
    })
      .then(res => res.json())
      .then(setOrders);
  }, []);

  return (
    <div>
      <h2>My Orders</h2>

      {!orders.length && <p>No orders yet.</p>}

      {orders.map(order => (
        <div key={order.id} className="order-card">
          <p><strong>Order #{order.id}</strong></p>
          <p>Status: {order.status}</p>
          <p>Total: KES {order.total?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

export default BuyerOrders;