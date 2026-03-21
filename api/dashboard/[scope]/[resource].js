import { getErrorStatus } from "../../../backend/lib/errors.mjs";
import {
  getAdminDashboardActiveSalesAsync,
  getAdminDashboardAdvisorRankingAsync,
  getAdminDashboardAdvisorSummaryAsync,
  getAdminDashboardCancelledSalesAsync,
  getAdminDashboardCollectionsSeriesAsync,
  getAdminDashboardInventoryAsync,
  getAdminDashboardKpisAsync,
  getAdminDashboardOverviewAsync,
  getAdminDashboardSalesSeriesAsync,
  getAdvisorDashboardClientsAsync,
  getAdvisorDashboardCollectionsSeriesAsync,
  getAdvisorDashboardKpisAsync,
  getAdvisorDashboardOperationsAsync,
  getAdvisorDashboardOperationsByStageAsync,
  getAdvisorDashboardPaymentsAsync,
  getAdvisorDashboardSalesSeriesAsync,
} from "../../../backend/lib/dashboardService.mjs";

const getAuthCredentials = (req) => {
  const headerUser = req.headers["x-auth-user"];
  const headerPin = req.headers["x-auth-pin"];
  const bodyUser = req.body?.auth?.username;
  const bodyPin = req.body?.auth?.pin;

  return {
    username: typeof headerUser === "string" && headerUser.trim() ? headerUser.trim() : bodyUser,
    pin: typeof headerPin === "string" && headerPin.trim() ? headerPin.trim() : bodyPin,
  };
};

const ROUTE_HANDLERS = {
  admin: {
    kpis: getAdminDashboardKpisAsync,
    resumen: getAdminDashboardOverviewAsync,
    "series-ventas": getAdminDashboardSalesSeriesAsync,
    "series-cobros": getAdminDashboardCollectionsSeriesAsync,
    inventario: getAdminDashboardInventoryAsync,
    "resumen-asesores": getAdminDashboardAdvisorSummaryAsync,
    "ranking-asesores": getAdminDashboardAdvisorRankingAsync,
    "ventas-activas": getAdminDashboardActiveSalesAsync,
    "operaciones-anuladas": getAdminDashboardCancelledSalesAsync,
  },
  asesor: {
    kpis: getAdvisorDashboardKpisAsync,
    "series-ventas": getAdvisorDashboardSalesSeriesAsync,
    "series-cobros": getAdvisorDashboardCollectionsSeriesAsync,
    "operaciones-por-etapa": getAdvisorDashboardOperationsByStageAsync,
    operaciones: getAdvisorDashboardOperationsAsync,
    clientes: getAdvisorDashboardClientsAsync,
    pagos: getAdvisorDashboardPaymentsAsync,
  },
};

const RESPONSE_KEY = {
  kpis: "item",
  resumen: "item",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const scope = String(req.query?.scope ?? "").trim().toLowerCase();
  const resource = String(req.query?.resource ?? "").trim().toLowerCase();
  const fn = ROUTE_HANDLERS[scope]?.[resource];

  if (!fn) {
    res.status(404).json({ error: "Endpoint de dashboard no encontrado." });
    return;
  }

  try {
    const { username, pin } = getAuthCredentials(req);
    if (!username || !pin) {
      res.status(401).json({ error: "Credenciales requeridas." });
      return;
    }

    const payload = await fn(username, pin, req.query ?? {});
    res.status(200).json({ [RESPONSE_KEY[resource] ?? "items"]: payload });
  } catch (error) {
    console.error(`Vercel API GET /api/dashboard/${scope}/${resource} error:`, error);
    res.status(getErrorStatus(error, 400)).json({
      error: error.message || "No se pudo obtener datos del dashboard.",
    });
  }
}
