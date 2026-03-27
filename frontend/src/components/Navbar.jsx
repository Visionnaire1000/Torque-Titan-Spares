import { useAuth } from "../contexts/AuthContext";
import BuyerNavbar from "./buyerDashboard/BuyerNavbar";
import AdminNavbar from "./admin/adminDashboard/AdminNavbar";
import SuperAdminNavbar from "./admin/adminDashboard/SuperAdminNavbar";

const Navbar = () => {
  const { user } = useAuth();

  if (user?.role === "super_admin") return <SuperAdminNavbar />;

  if (user?.role === "admin") return <AdminNavbar />;

  return <BuyerNavbar />;
};

export default Navbar;