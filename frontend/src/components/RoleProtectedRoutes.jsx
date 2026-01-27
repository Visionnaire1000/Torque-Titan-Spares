import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RoleProtectedRoutes = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuth();

  // Not logged in → send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If role is not allowed → block
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleProtectedRoutes;

