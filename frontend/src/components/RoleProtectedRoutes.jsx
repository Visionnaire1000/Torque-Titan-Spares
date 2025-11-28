import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RoleProtectedRoutes = ({ role, children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user.role !== role) {
    return <Navigate to="/" />;
  }

  return children; 
};

export default RoleProtectedRoutes;  
