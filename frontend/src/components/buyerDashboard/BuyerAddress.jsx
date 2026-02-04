import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/buyerAddress.css";

const BuyerAddress = () => {
  const { user } = useAuth(); 
  const [address, setAddress] = useState({
    street: "",
    city: "",
    postal_code: "",
    country: "",
  });

  // Load saved address from localStorage for this user
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!address.street || !address.city || !address.country) {
      toast.error("Please fill all required address fields");
      return;
    }

    if (!user) {
      toast.error("User not logged in");
      return;
    }

    // Save address in localStorage keyed by user id
    localStorage.setItem(`address_${user.id}`, JSON.stringify(address));
    toast.success("Address saved successfully!");
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
        <button type="submit">Save Address</button>
      </form>
    </div>
  );
};

export default BuyerAddress;
