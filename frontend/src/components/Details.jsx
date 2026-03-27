import { useAuth } from "../contexts/AuthContext";
import BuyerItemDetails from "./BuyerItemDetails";
import AdminItemDetails from "./admin/AdminItemDetails";

const ItemDetails = () => {
  const { user } = useAuth();

  if (user?.role === "admin" || user?.role === "super_admin") return <AdminItemDetails />;

  return <ItemDetails />;

};

export default  ItemDetails;