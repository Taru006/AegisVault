import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * Wraps routes that require authentication.
 * Redirects to /login if no token is present.
 */
export default function ProtectedRoute({ children }) {
  const { token } = useSelector((state) => state.auth);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
