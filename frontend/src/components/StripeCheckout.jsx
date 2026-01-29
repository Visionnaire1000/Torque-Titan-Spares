import { useState, useEffect } from "react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import config from "../config";
import "react-toastify/dist/ReactToastify.css";
import "../styles/stripeCheckout.css";

const StripeCheckout = () => {
  const { items } = useCart();
  const { authFetch, user } = useAuth(); // Get user for localStorage key
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState({
    street: "",
    city: "",
    postal_code: "",
    country: "",
  });

  // Auto-fill from saved address if exists
  useEffect(() => {
    if (!user) return;
    const savedAddress = localStorage.getItem(`address_${user.id}`);
    if (savedAddress) {
      setAddress(JSON.parse(savedAddress));
    }
  }, [user]);

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!items || items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!address.street || !address.city || !address.country) {
      toast.error("Please fill all required address fields");
      return;
    }

    setLoading(true);

    try {
      const res = await authFetch(`${config.API_BASE_URL}/create-checkout-session`, {
        method: "POST",
        body: JSON.stringify({
          items: items.map((item) => ({
            sparepart_id: item.id,
            quantity: item.quantity,
          })),
          street: address.street,
          city: address.city,
          postal_code: address.postal_code,
          country: address.country,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create checkout session");
        setLoading(false);
        return;
      }

      // Optional: Save latest checkout address to localStorage
      if (user) {
        localStorage.setItem(`address_${user.id}`, JSON.stringify(address));
      }

      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;

    } catch (err) {
      toast.error("Error initiating payment");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <form onSubmit={handleSubmit}>
        <h2>Shipping Address</h2>
        <input
          type="text"
          name="street"
          placeholder="Street"
          value={address.street}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="city"
          placeholder="City"
          value={address.city}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="postal_code"
          placeholder="Postal Code"
          value={address.postal_code}
          onChange={handleAddressChange}
        />
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={address.country}
          onChange={handleAddressChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Redirecting..." : "Pay with Card"}
        </button>
      </form>
    </div>
  );
};

export default StripeCheckout;
