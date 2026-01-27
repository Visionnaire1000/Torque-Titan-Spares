const BuyerAddress = () => {
  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState("");

  const token = JSON.parse(localStorage.getItem("titanUser"))?.token;

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/addresses`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setAddresses);
  }, [token]);

  const addAddress = async (e) => {
    e.preventDefault();

    const res = await fetch(`${config.API_BASE_URL}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ address })
    });

    const newAddress = await res.json();
    setAddresses([...addresses, newAddress]);
    setAddress("");
  };

  return (
    <div>
      <h2>Address Book</h2>

      <form onSubmit={addAddress} className="account-form">
        <input
          type="text"
          placeholder="Enter delivery address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <button type="submit">Add Address</button>
      </form>

      {addresses.map(addr => (
        <div key={addr.id} className="address-card">
          {addr.address}
        </div>
      ))}
    </div>
  );
};

export default BuyerAddress;
