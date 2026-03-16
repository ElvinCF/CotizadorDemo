import { Navigate, createBrowserRouter } from "react-router-dom";
import OverlayEditorPage from "../pages/overlay-editor/OverlayEditorPage";
import LotesTablePage from "../pages/seller-dashboard/LotesTablePage";
import LoginPage from "../pages/login/LoginPage";
import SalesMapPage from "../pages/admin/SalesMapPage";
import AdminPage from "../pages/admin/AdminPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import ProtectedRoute from "./ProtectedRoute";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <SalesMapPage publicView />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/cotizador",
    element: <SalesMapPage publicView />,
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
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/usuarios",
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
