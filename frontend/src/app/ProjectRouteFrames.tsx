import type { ComponentType, ReactNode } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ProjectProvider, useProjectContext } from "./ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath, extractProjectSlugFromPath, replaceLeadingProjectSlug } from "./projectRoutes";
import RouteSkeleton from "./RouteSkeleton";

type RoleDashboardResolverProps = {
  AdminDashboardPage: ComponentType;
  AdvisorDashboardPage: ComponentType;
};

type PrivateProjectGuardProps = {
  children: ReactNode;
  allowedRoles?: Array<"admin" | "asesor">;
  allowedRawRoles?: Array<"ADMIN" | "ASESOR" | "SUPERADMIN">;
};

const buildRedirectWithSlug = (pathname: string, search: string, nextSlug: string) =>
  `${replaceLeadingProjectSlug(pathname, nextSlug)}${search || ""}`;

export function ProjectProviderBridge() {
  const location = useLocation();
  const routeSlug = extractProjectSlugFromPath(location.pathname);

  return (
    <ProjectProvider routeSlug={routeSlug}>
      <Outlet />
    </ProjectProvider>
  );
}

export function RootRouteRedirect() {
  const { isAuthenticated } = useAuth();
  const { loading, display } = useProjectContext();

  if (loading) {
    return <RouteSkeleton title="Cargando proyecto" variant="map" />;
  }

  return <Navigate to={isAuthenticated ? buildPrivateProjectPath(display.projectSlug, "dashboard") : buildPublicProjectPath(display.projectSlug)} replace />;
}

export function PublicProjectGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const params = useParams<{ slug?: string }>();
  const { loading, display } = useProjectContext();

  if (loading) {
    return <RouteSkeleton title="Cargando proyecto" variant="map" />;
  }

  if (params.slug !== display.projectSlug) {
    return <Navigate to={buildRedirectWithSlug(location.pathname, location.search, display.projectSlug)} replace />;
  }

  return <>{children}</>;
}

export function PrivateProjectGuard({ children, allowedRoles, allowedRawRoles }: PrivateProjectGuardProps) {
  const { isAuthenticated, role, rawRole } = useAuth();
  const { loading, display } = useProjectContext();
  const location = useLocation();
  const params = useParams<{ slug?: string }>();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return <RouteSkeleton title="Cargando proyecto" variant="table" contentClassName="main--data-table" />;
  }

  if (params.slug !== display.projectSlug) {
    return <Navigate to={buildRedirectWithSlug(location.pathname, location.search, display.projectSlug)} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={buildPrivateProjectPath(display.projectSlug, "dashboard")} replace />;
  }

  if (allowedRawRoles && rawRole && !allowedRawRoles.includes(rawRole)) {
    return <Navigate to={buildPrivateProjectPath(display.projectSlug, "dashboard")} replace />;
  }

  return <>{children}</>;
}

export function LegacyPrivateRedirect({ target, suffix = "" }: { target: string; suffix?: string }) {
  const { isAuthenticated } = useAuth();
  const { loading, display } = useProjectContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <RouteSkeleton title="Redirigiendo" variant="table" contentClassName="main--data-table" />;
  }

  return <Navigate to={buildPrivateProjectPath(display.projectSlug, target, suffix)} replace />;
}

export function LegacyPrivatePathRedirect() {
  const { isAuthenticated } = useAuth();
  const { loading, display } = useProjectContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <RouteSkeleton title="Redirigiendo" variant="table" contentClassName="main--data-table" />;
  }

  const nextPath = location.pathname.startsWith("/") ? location.pathname : `/${location.pathname}`;
  return <Navigate to={`/${display.projectSlug}${nextPath}${location.search || ""}`} replace />;
}

export function LegacyCotizadorRedirect() {
  const params = useParams<{ loteCodigo?: string }>();
  const { loading, display } = useProjectContext();

  if (loading) {
    return <RouteSkeleton title="Redirigiendo" variant="map" />;
  }

  return <Navigate to={buildPublicProjectPath(display.projectSlug, params.loteCodigo ? `cotizador/${encodeURIComponent(params.loteCodigo)}` : "cotizador")} replace />;
}

export function RoleDashboardResolver({ AdminDashboardPage, AdvisorDashboardPage }: RoleDashboardResolverProps) {
  const { role } = useAuth();
  return role === "admin" ? <AdminDashboardPage /> : <AdvisorDashboardPage />;
}
