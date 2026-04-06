import { Suspense, lazy, type ReactElement } from "react";
import { createBrowserRouter } from "react-router-dom";
import RouteSkeleton from "./RouteSkeleton";
import {
  LegacyCotizadorRedirect,
  LegacyPrivatePathRedirect,
  LegacyPrivateRedirect,
  PrivateProjectGuard,
  ProjectProviderBridge,
  PublicProjectGuard,
  RoleDashboardResolver,
  RootRouteRedirect,
} from "./ProjectRouteFrames";

const OverlayEditorPage = lazy(() => import("../pages/overlay-editor/OverlayEditorPage"));
const LotesTablePage = lazy(() => import("../pages/seller-dashboard/LotesTablePage"));
const LoginPage = lazy(() => import("../pages/login/LoginPage"));
const SalesMapPage = lazy(() => import("../pages/admin/SalesMapPage"));
const AdminPage = lazy(() => import("../pages/admin/AdminPage"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const CompanySettingsPage = lazy(() => import("../pages/admin/CompanySettingsPage"));
const ProjectSettingsPage = lazy(() => import("../pages/admin/ProjectSettingsPage"));
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
    element: <ProjectProviderBridge />,
    children: [
      {
        index: true,
        element: <RootRouteRedirect />,
      },
      {
        path: "login",
        element: withFallback(<LoginPage />, <RouteSkeleton title="Iniciar sesion" variant="form" />),
      },
      {
        path: "cotizador",
        element: <LegacyCotizadorRedirect />,
      },
      {
        path: "cotizador/:loteCodigo",
        element: <LegacyCotizadorRedirect />,
      },
      {
        path: "dashboard",
        element: <LegacyPrivateRedirect target="dashboard" />,
      },
      {
        path: "lotes",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "ventas",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "ventas/nueva",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "ventas/:id",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "usuarios",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "proyecto",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "empresa",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "editor",
        element: <LegacyPrivatePathRedirect />,
      },
      {
        path: "admin",
        element: <LegacyPrivateRedirect target="dashboard" />,
      },
      {
        path: "asesor",
        element: <LegacyPrivateRedirect target="dashboard" />,
      },
      {
        path: ":slug",
        element: (
          <PublicProjectGuard>
            {withFallback(
              <SalesMapPage publicView />,
              <RouteSkeleton title="Mapa cotizador" variant="map" />
            )}
          </PublicProjectGuard>
        ),
      },
      {
        path: ":slug/cotizador",
        element: (
          <PublicProjectGuard>
            {withFallback(
              <SalesMapPage publicView />,
              <RouteSkeleton title="Mapa cotizador" variant="map" />
            )}
          </PublicProjectGuard>
        ),
      },
      {
        path: ":slug/cotizador/:loteCodigo",
        element: (
          <PublicProjectGuard>
            {withFallback(
              <SalesMapPage publicView />,
              <RouteSkeleton title="Mapa cotizador" variant="map" />
            )}
          </PublicProjectGuard>
        ),
      },
      {
        path: ":slug/dashboard",
        element: (
          <PrivateProjectGuard allowedRoles={["admin", "asesor"]}>
            {withFallback(
              <RoleDashboardResolver AdminDashboardPage={AdminDashboardPage} AdvisorDashboardPage={AdvisorDashboardPage} />,
              <RouteSkeleton title="Dashboard" variant="dashboard" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/lotes",
        element: (
          <PrivateProjectGuard allowedRoles={["admin", "asesor"]}>
            {withFallback(
              <LotesTablePage />,
              <RouteSkeleton title="Lotes editables" variant="table" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/proyecto",
        element: (
          <PrivateProjectGuard allowedRoles={["admin"]}>
            {withFallback(
              <ProjectSettingsPage />,
              <RouteSkeleton title="Proyecto" variant="form" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/empresa",
        element: (
          <PrivateProjectGuard allowedRoles={["admin"]} allowedRawRoles={["SUPERADMIN"]}>
            {withFallback(
              <CompanySettingsPage />,
              <RouteSkeleton title="Empresa" variant="form" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/ventas",
        element: (
          <PrivateProjectGuard allowedRoles={["admin", "asesor"]}>
            {withFallback(
              <SalesListPage />,
              <RouteSkeleton title="Gestion de Ventas" variant="table" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/ventas/nueva",
        element: (
          <PrivateProjectGuard allowedRoles={["admin", "asesor"]}>
            {withFallback(
              <SaleFormPage />,
              <RouteSkeleton title="Nueva Venta" variant="form" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/ventas/:id",
        element: (
          <PrivateProjectGuard allowedRoles={["admin", "asesor"]}>
            {withFallback(
              <SaleFormPage />,
              <RouteSkeleton title="Expediente de Venta" variant="form" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/usuarios",
        element: (
          <PrivateProjectGuard allowedRoles={["admin"]}>
            {withFallback(
              <AdminPage />,
              <RouteSkeleton title="Usuarios" variant="table" contentClassName="main--data-table" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: ":slug/editor",
        element: (
          <PrivateProjectGuard allowedRoles={["admin"]}>
            {withFallback(
              <OverlayEditorPage />,
              <RouteSkeleton title="Editor de Overlay" variant="map" />
            )}
          </PrivateProjectGuard>
        ),
      },
      {
        path: "*",
        element: <RootRouteRedirect />,
      },
    ],
  },
]);
