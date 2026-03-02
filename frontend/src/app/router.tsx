import { Navigate, createBrowserRouter } from "react-router-dom";
import OverlayEditorPage from "../pages/overlay-editor/OverlayEditorPage";
import PublicMapPage from "../pages/public-map/PublicMapPage";
import SellerDashboardPage from "../pages/seller-dashboard/SellerDashboardPage";
import ProtectedRoute from "./ProtectedRoute";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <PublicMapPage />,
  },
  {
    path: "/vendedor",
    element: (
      <ProtectedRoute>
        <SellerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/editor",
    element: (
      <ProtectedRoute>
        <OverlayEditorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
