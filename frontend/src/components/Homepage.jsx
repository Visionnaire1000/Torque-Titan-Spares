import { useAuth } from "../contexts/AuthContext";
import BuyerHomepage from "./BuyerHomepage";
import AdminSpareparts from "./admin/AdminSpareparts";

const HomePage = () => {
  const { user } = useAuth();

  if (user?.role === "admin" || user?.role === "super_admin") return <AdminSpareparts />;

  return <BuyerHomepage />;

};

export default HomePage;