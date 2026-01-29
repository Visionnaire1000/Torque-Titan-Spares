import { Routes, Route, NavLink } from "react-router-dom";
import AccountManagement from "./AccountManagement"; 
import BuyerOrders from "./BuyerOrders";
import BuyerAddress from "./BuyerAddress";
import { User, Package, MapPin } from "lucide-react";
import "../../styles/buyerAccount.css";

const BuyerAccount = () => {
  return (
    <div className="account-page">
      {/* Sidebar */}
      <aside className="account-sidebar">
        <NavLink
          to="/buyer-account"
          end // ensures exact match for the root path
          className={({ isActive }) =>
            isActive ? "tab active-tab" : "tab"
          }
        >
          <User size={18} className="icon" /> Account Management
        </NavLink>

        <NavLink
          to="/buyer-account/orders"
          className={({ isActive }) =>
            isActive ? "tab active-tab" : "tab"
          }
        >
          <Package size={18} className="icon" /> My Orders
        </NavLink>

        <NavLink
          to="/buyer-account/addresses"
          className={({ isActive }) =>
            isActive ? "tab active-tab" : "tab"
          }
        >
          <MapPin size={18} className="icon" /> Address Book
        </NavLink>
      </aside>

      {/* Content */}
      <section className="account-content">
        <Routes>
          <Route path="" element={<AccountManagement />} />
          <Route path="orders" element={<BuyerOrders />} />
          <Route path="addresses" element={<BuyerAddress />} />
        </Routes>
      </section>
    </div>
  );
};

export default BuyerAccount;
