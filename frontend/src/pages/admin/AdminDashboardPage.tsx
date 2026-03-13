import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminDashboardBarChart from "../../components/admin-dashboard/AdminDashboardBarChart";
import AdminDashboardDonutChart from "../../components/admin-dashboard/AdminDashboardDonutChart";
import AdminDashboardLineChart from "../../components/admin-dashboard/AdminDashboardLineChart";
import AdminDashboardRanking from "../../components/admin-dashboard/AdminDashboardRanking";
import AdminDashboardStatCard from "../../components/admin-dashboard/AdminDashboardStatCard";
import type { AdminUser } from "../../domain/adminUsers";
import type { Lote } from "../../domain/types";
import { listAdminUsers } from "../../services/adminUsers";
import { loadLotesFromApi } from "../../services/lotes";

type DashboardPeriod = "MES" | "TRIMESTRE" | "SEMESTRE";

const PERIOD_OPTIONS: DashboardPeriod[] = ["MES", "TRIMESTRE", "SEMESTRE"];
const STATUS_OPTIONS = ["TODOS", "DISPONIBLE", "SEPARADO", "VENDIDO"];

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconTable = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15.5 11a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 18a4 4 0 0 1 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconLots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M6 5h12l3 5-9 9-9-9 3-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 5 7 10m8-5 2 5M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSold = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m4 12 4 4 12-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMoney = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 9h.01M17 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconRate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m4 9 4-4 4 3 5-5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconExport = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 18v2h14v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const compactMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("es-PE", { month: "short" }).format(date).replace(".", "").toUpperCase();

const normalizeStatus = (value: string | undefined) => String(value ?? "DISPONIBLE").toUpperCase();

const createMonthSeries = (base: number, period: DashboardPeriod) => {
  const steps = period === "MES" ? 6 : period === "TRIMESTRE" ? 5 : 6;
  const multipliers =
    period === "MES"
      ? [0.62, 0.78, 0.85, 0.74, 0.94, 1.06]
      : period === "TRIMESTRE"
        ? [0.7, 0.92, 0.88, 1.02, 1.14]
        : [0.58, 0.69, 0.76, 0.84, 0.98, 1.12];

  const now = new Date();
  return Array.from({ length: steps }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (steps - 1 - index), 1);
    return {
      label: formatMonthLabel(date),
      value: Math.max(1, Math.round(base * multipliers[index])),
    };
  });
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.charAt(0) ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0])?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase();
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUsername, loginPin } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>("TRIMESTRE");
  const [status, setStatus] = useState("TODOS");
  const [zone, setZone] = useState("TODAS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.hash === "#usuarios") {
      navigate("/usuarios", { replace: true });
    }
  }, [location.hash, navigate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const credentials = { username: loginUsername, pin: loginPin };
      const [lotesResult, usersResult] = await Promise.allSettled([
        loadLotesFromApi(),
        listAdminUsers(credentials),
      ]);

      if (cancelled) return;

      if (lotesResult.status === "fulfilled") {
        setLotes(lotesResult.value);
      } else {
        setError(lotesResult.reason instanceof Error ? lotesResult.reason.message : "No se pudo cargar lotes.");
      }

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value.users);
      } else {
        setUsers([]);
      }

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loginPin, loginUsername]);

  const zones = useMemo(() => {
    const uniques = Array.from(new Set(lotes.map((lote) => String(lote.mz || "").trim()).filter(Boolean)));
    return ["TODAS", ...uniques.sort()];
  }, [lotes]);

  const filteredLotes = useMemo(() => {
    return lotes.filter((lote) => {
      const loteStatus = normalizeStatus(lote.condicion);
      const matchesStatus = status === "TODOS" ? true : loteStatus === status;
      const matchesZone = zone === "TODAS" ? true : String(lote.mz).toUpperCase() === zone.toUpperCase();
      return matchesStatus && matchesZone;
    });
  }, [lotes, status, zone]);

  const dashboard = useMemo(() => {
    const totalLots = filteredLotes.length;
    const soldLots = filteredLotes.filter((lote) => normalizeStatus(lote.condicion) === "VENDIDO");
    const reservedLots = filteredLotes.filter((lote) => normalizeStatus(lote.condicion) === "SEPARADO");
    const availableLots = filteredLotes.filter((lote) => normalizeStatus(lote.condicion) === "DISPONIBLE");

    const totalPotential = filteredLotes.reduce((sum, lote) => sum + (lote.price ?? 0), 0);
    const soldValue = soldLots.reduce((sum, lote) => sum + (lote.price ?? 0), 0);
    const reservedValue = reservedLots.reduce((sum, lote) => sum + (lote.price ?? 0), 0);
    const inventoryValue = availableLots.reduce((sum, lote) => sum + (lote.price ?? 0), 0);
    const realizedRevenue = soldValue + reservedValue * 0.38;
    const placementRate = totalLots > 0 ? ((soldLots.length + reservedLots.length * 0.5) / totalLots) * 100 : 0;
    const activeAdvisors = users.filter((user) => user.rol === "ASESOR" && user.estado === "ACTIVO");
    const activeAdmins = users.filter((user) => user.rol === "ADMIN" && user.estado === "ACTIVO");
    const avgTicket = soldLots.length > 0 ? soldValue / soldLots.length : totalPotential / Math.max(totalLots, 1);

    const lineSeries = createMonthSeries(Math.max(4, soldLots.length + reservedLots.length), period);

    const donutSegments = [
      { label: "Disponibles", value: availableLots.length, color: "var(--admin-donut-disponible)" },
      { label: "Separados", value: reservedLots.length, color: "var(--admin-donut-separado)" },
      { label: "Vendidos", value: soldLots.length, color: "var(--admin-donut-vendido)" },
    ];

    const byZone = Array.from(
      filteredLotes.reduce((map, lote) => {
        const key = String(lote.mz || "SN").toUpperCase();
        const current = map.get(key) ?? { count: 0, value: 0 };
        current.count += 1;
        current.value += lote.price ?? 0;
        map.set(key, current);
        return map;
      }, new Map<string, { count: number; value: number }>())
    )
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const maxZoneValue = Math.max(...byZone.map((item) => item.value), 1);
    const zoneBars = byZone.map((item) => ({
      label: `MZ ${item.label}`,
      helper: `${item.count} lotes en filtro`,
      valueLabel: compactMoney(item.value),
      ratio: item.value / maxZoneValue,
    }));

    const advisorPool =
      activeAdvisors.length > 0
        ? activeAdvisors
        : [
            {
              id: "sim-1",
              nombres: "Sin",
              apellidos: "asesores",
              username: "sin-asesores",
              rol: "ASESOR",
              estado: "INACTIVO",
              telefono: "",
              created_at: new Date().toISOString(),
            },
          ];

    const weights = advisorPool.map((_, index) => 1.22 - index * 0.14).map((value) => Math.max(0.42, value));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    const ranking = advisorPool.map((advisor, index) => {
      const share = weights[index] / totalWeight;
      const units = Math.max(0, Math.round((soldLots.length + reservedLots.length * 0.4) * share));
      const value = realizedRevenue * share;
      const name = `${advisor.nombres} ${advisor.apellidos}`.trim();
      return {
        name,
        detail: advisor.estado === "ACTIVO" ? "Asesor activo" : "Cobertura simulada",
        valueLabel: compactMoney(value),
        helper: `${units} cierres estimados`,
        initials: getInitials(name),
      };
    });

    return {
      totalLots,
      soldCount: soldLots.length,
      inventoryValue,
      realizedRevenue,
      placementRate,
      totalPotential,
      avgTicket,
      activeAdvisors: activeAdvisors.length,
      activeAdmins: activeAdmins.length,
      lineSeries,
      donutSegments,
      zoneBars,
      ranking,
    };
  }, [filteredLotes, period, users]);

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to="/lotes">
        <IconTable />
        Lotes
      </Link>
      <Link className="btn ghost topbar-action" to="/usuarios">
        <IconUsers />
        Usuarios
      </Link>
    </nav>
  );

  const exportSummary = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters: { period, status, zone },
      totals: {
        totalLots: dashboard.totalLots,
        soldCount: dashboard.soldCount,
        inventoryValue: dashboard.inventoryValue,
        realizedRevenue: dashboard.realizedRevenue,
        placementRate: dashboard.placementRate,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-admin-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Dashboard Administrativo" actions={actions} contentClassName="main--admin-dashboard">
      <section className="admin-dashboard">
        <div className="admin-dashboard__hero">
          <div>
            <span className="admin-dashboard__eyebrow">Resumen operativo</span>
            <h2>Desempeño comercial del proyecto</h2>
            <p>
              Mezcla datos reales de lotes y usuarios activos. Las series históricas y el ranking se
              estiman a partir del inventario actual para no depender de tablas de ventas todavía no
              modeladas.
            </p>
          </div>

          <div className="admin-dashboard__filters">
            <label className="admin-dashboard__filter">
              <span>
                <IconCalendar />
                Periodo
              </span>
              <select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "MES" ? "Mes" : option === "TRIMESTRE" ? "Trimestre" : "Semestre"}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconFilter />
                Estado
              </span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "TODOS" ? "Todos" : option.charAt(0) + option.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconLots />
                MZ
              </span>
              <select value={zone} onChange={(event) => setZone(event.target.value)}>
                {zones.map((option) => (
                  <option key={option} value={option}>
                    {option === "TODAS" ? "Todas" : `MZ ${option}`}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={exportSummary}>
              <IconExport />
              Exportar resumen
            </button>
          </div>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-dashboard__stats">
          <AdminDashboardStatCard
            label="Lotes visibles"
            value={loading ? "..." : `${dashboard.totalLots}`}
            helper={`${dashboard.activeAdmins} admins activos`}
            trend={`Promedio ticket ${compactMoney(dashboard.avgTicket || 0)}`}
            tone="info"
            icon={<IconLots />}
          />
          <AdminDashboardStatCard
            label="Lotes vendidos"
            value={loading ? "..." : `${dashboard.soldCount}`}
            helper={`${dashboard.activeAdvisors} asesores activos`}
            trend={`${Math.round((dashboard.soldCount / Math.max(dashboard.totalLots, 1)) * 100)}% del filtro`}
            tone="success"
            icon={<IconSold />}
          />
          <AdminDashboardStatCard
            label="Valor inventario"
            value={loading ? "..." : compactMoney(dashboard.inventoryValue)}
            helper={`Potencial total ${compactMoney(dashboard.totalPotential)}`}
            trend={`Realizado ${compactMoney(dashboard.realizedRevenue)}`}
            tone="warning"
            icon={<IconMoney />}
          />
          <AdminDashboardStatCard
            label="Tasa de colocacion"
            value={loading ? "..." : `${dashboard.placementRate.toFixed(1)}%`}
            helper="Venta + reserva ponderada"
            trend={`${STATUS_OPTIONS.includes(status) && status !== "TODOS" ? status.toLowerCase() : "mix"} actual`}
            tone="neutral"
            icon={<IconRate />}
          />
        </div>

        <div className="admin-dashboard__charts">
          <AdminDashboardLineChart
            title="Movimiento estimado en el tiempo"
            subtitle="Serie operativa basada en lotes vendidos y separados del filtro actual."
            legend="Operaciones"
            data={dashboard.lineSeries}
          />
          <AdminDashboardDonutChart
            title="Distribucion por estado"
            subtitle="Lectura directa del inventario filtrado."
            segments={dashboard.donutSegments}
            centerLabel="lotes"
            centerValue={`${dashboard.totalLots}`}
          />
        </div>

        <div className="admin-dashboard__bottom">
          <AdminDashboardBarChart
            title="Bloques con mayor valor"
            subtitle="Top de manzanas por valor acumulado del filtro."
            items={dashboard.zoneBars}
          />
          <AdminDashboardRanking
            title="Asesores con mayor cobertura"
            subtitle="Ranking operativo estimado con base en inventario y equipo activo."
            items={dashboard.ranking}
          />
        </div>
      </section>
    </AppShell>
  );
}
