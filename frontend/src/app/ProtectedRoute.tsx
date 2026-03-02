import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: ReactNode;
  fallbackPath?: string;
  enabled?: boolean;
};

/**
 * Placeholder gate for private routes. Replace the `isAuthenticated`
 * flag once the backend/auth provider is ready.
 */
const ProtectedRoute = ({
  children,
  fallbackPath = "/login",
  enabled = true,
}: ProtectedRouteProps) => {
  const isAuthenticated = true;

  if (enabled && !isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
