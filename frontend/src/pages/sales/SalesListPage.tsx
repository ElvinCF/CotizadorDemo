import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import SalesTable from "../../components/sales/SalesTable";
import type { SaleRecord } from "../../domain/ventas";
import { listSales } from "../../services/ventas";

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

const IconKanban = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="4" y="5" width="5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="10.5" y="5" width="3" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="15" y="5" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function SalesListPage() {
  const [items, setItems] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await listSales();
        setItems(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar ventas.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
    </nav>
  );

  return (
    <AppShell title="Gestion de Ventas" actions={actions} contentClassName="main--admin">
      <section className="sales-page">
        <header className="sales-page__head">
          <div>
            <h2>Ventas registradas</h2>
            <p>Tabla operativa con acceso al detalle de cada venta.</p>
          </div>
          <button type="button" className="btn ghost" disabled>
            <IconKanban />
            Vista kanban
          </button>
        </header>

        {error ? <p className="admin-error">{error}</p> : null}
        <SalesTable items={items} loading={loading} />
      </section>
    </AppShell>
  );
}
