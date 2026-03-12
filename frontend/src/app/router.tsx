import { Navigate, createBrowserRouter } from "react-router-dom";
import OverlayEditorPage from "../pages/overlay-editor/OverlayEditorPage";
import PublicMapPage from "../pages/public-map/PublicMapPage";
import LotesTablePage from "../pages/seller-dashboard/LotesTablePage";
import LoginPage from "../pages/login/LoginPage";
import SalesMapPage from "../pages/admin/SalesMapPage";
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
    path: "/cotizador",
    element: (
      <ProtectedRoute allowedRoles={["admin", "asesor"]}>
        <SalesMapPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/lotes",
    element: (
      <ProtectedRoute allowedRoles={["admin", "asesor"]}>
        <LotesTablePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/asesor",
    element: (
      <ProtectedRoute allowedRoles={["asesor"]}>
        {/* Placeholder: To be implemented */}
        <div>Dashboard Personal Asesor</div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        {/* Placeholder: To be implemented */}
        <div>Dashboard General Admin</div>
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
