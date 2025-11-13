import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Redirect to login if no user
  if (!user) return <Navigate to="/login" replace />;

  // check roles 
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // redirect to homepage if role not allowed
  }

  return children; // render the protected component
};

export default RoleProtectedRoute;
