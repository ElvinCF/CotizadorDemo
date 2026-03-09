import { Navigate, createBrowserRouter } from "react-router-dom";
import OverlayEditorPage from "../pages/overlay-editor/OverlayEditorPage";
import PublicMapPage from "../pages/public-map/PublicMapPage";
import SellerDashboardPage from "../pages/seller-dashboard/SellerDashboardPage";
import LoginPage from "../pages/login/LoginPage";
import AdminPage from "../pages/admin/AdminPage";
import ProtectedRoute from "./ProtectedRoute";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <PublicMapPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/vendedor",
    element: (
      <ProtectedRoute allowedRoles={["vendedor", "admin"]}>
        <SellerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/editor",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <OverlayEditorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
