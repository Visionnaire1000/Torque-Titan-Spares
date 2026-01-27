import { useState } from "react";
//import AccountManagement from "./AccountManagement";
import BuyerOrders from "./BuyerOrders";
import BuyerAddress from "./BuyerAddress";
import "../../styles/buyerAccount.css";

import {
  User,
  Package,
  MapPin
} from "lucide-react";

const BuyerAccount = () => {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className="account-page">
      {/* Sidebar */}
      <aside className="account-sidebar">
        <button onClick={() => setActiveTab("account")}>
          <User size={18} /> Account Management
        </button>

        <button onClick={() => setActiveTab("orders")}>
          <Package size={18} /> My Orders
        </button>

        <button onClick={() => setActiveTab("addresses")}>
          <MapPin size={18} /> Address Book
        </button>
      </aside>

      {/* Content */}
      <section className="account-content">
        {activeTab === "orders" && <BuyerOrders />}
        {activeTab === "addresses" && <BuyerAddress />}
      </section>
    </div>
  );
};

export default BuyerAccount;
