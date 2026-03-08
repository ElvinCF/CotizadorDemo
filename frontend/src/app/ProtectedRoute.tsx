import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "./AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
  fallbackPath?: string;
  enabled?: boolean;
  allowedRoles?: Role[];
};

/**
 * Placeholder gate for private routes. Replace the `isAuthenticated`
 * flag once the backend/auth provider is ready.
 */
const ProtectedRoute = ({
  children,
  fallbackPath = "/login",
  enabled = true,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (enabled && !isAuthenticated) {
    // Optionally pass the current location so we can redirect back after login
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (enabled && isAuthenticated && allowedRoles && role) {
    if (!allowedRoles.includes(role)) {
      // Role not allowed, redirect to a safe page (or show Forbidden)
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
