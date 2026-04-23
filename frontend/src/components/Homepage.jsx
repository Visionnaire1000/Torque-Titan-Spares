import { useAuth } from "../contexts/AuthContext";
import BuyerHomepage from "./BuyerHomepage";
import AdminSpareparts from "./admin/AdminSpareparts";

const Homepage = () => {
  const { user } = useAuth();

  if (user?.role === "admin" || user?.role === "super_admin") return <AdminSpareparts />;

  return <BuyerHomepage />;

};

export default Homepage;