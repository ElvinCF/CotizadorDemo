import { Suspense, lazy, type ReactElement } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import RouteSkeleton from "./RouteSkeleton";
import ProtectedRoute from "./ProtectedRoute";

const OverlayEditorPage = lazy(() => import("../pages/overlay-editor/OverlayEditorPage"));
const LotesTablePage = lazy(() => import("../pages/seller-dashboard/LotesTablePage"));
const LoginPage = lazy(() => import("../pages/login/LoginPage"));
const SalesMapPage = lazy(() => import("../pages/admin/SalesMapPage"));
const AdminPage = lazy(() => import("../pages/admin/AdminPage"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const SalesListPage = lazy(() => import("../pages/sales/SalesListPage"));
const SaleFormPage = lazy(() => import("../pages/sales/SaleFormPage"));
const AdvisorDashboardPage = lazy(() => import("../pages/seller-dashboard/AdvisorDashboardPage"));

const withFallback = (
  element: ReactElement,
  fallback: ReactElement
) => <Suspense fallback={fallback}>{element}</Suspense>;

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: withFallback(
      <SalesMapPage publicView />,
      <RouteSkeleton title="Mapa cotizador" variant="map" />
    ),
  },
  {
    path: "/login",
    element: withFallback(<LoginPage />, <RouteSkeleton title="Iniciar sesion" variant="form" />),
  },
  {
    path: "/cotizador",
    element: withFallback(
      <SalesMapPage publicView />,
      <RouteSkeleton title="Mapa cotizador" variant="map" />
    ),
  },
  {
    path: "/cotizador/:loteCodigo",
    element: withFallback(
      <SalesMapPage publicView />,
      <RouteSkeleton title="Mapa cotizador" variant="map" />
    ),
  },
  {
    path: "/lotes",
    element: (
      <ProtectedRoute allowedRoles={["admin", "asesor"]}>
        {withFallback(
          <LotesTablePage />,
          <RouteSkeleton title="Lotes editables" variant="table" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/ventas",
    element: (
      <ProtectedRoute allowedRoles={["admin", "asesor"]}>
        {withFallback(
          <SalesListPage />,
          <RouteSkeleton title="Gestion de Ventas" variant="table" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/ventas/nueva",
    element: (
      <ProtectedRoute allowedRoles={["admin", "asesor"]}>
        {withFallback(
          <SaleFormPage />,
          <RouteSkeleton title="Nueva Venta" variant="form" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/ventas/:id",
    element: (
      <ProtectedRoute allowedRoles={["admin", "asesor"]}>
        {withFallback(
          <SaleFormPage />,
          <RouteSkeleton title="Expediente de Venta" variant="form" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/asesor",
    element: (
      <ProtectedRoute allowedRoles={["asesor"]}>
        {withFallback(
          <AdvisorDashboardPage />,
          <RouteSkeleton title="Dashboard Asesor" variant="dashboard" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        {withFallback(
          <AdminDashboardPage />,
          <RouteSkeleton title="Dashboard Admin" variant="dashboard" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/usuarios",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        {withFallback(
          <AdminPage />,
          <RouteSkeleton title="Usuarios" variant="table" contentClassName="main--data-table" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "/editor",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        {withFallback(
          <OverlayEditorPage />,
          <RouteSkeleton title="Editor de Overlay" variant="map" />
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
