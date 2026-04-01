import { Link } from "react-router-dom";
import DataTable from "../data-table/DataTable";
import DataTableLoadingRows from "../data-table/DataTableLoadingRows";
import DataTableSortHeader from "../data-table/DataTableSortHeader";
import { resolveTableLoadState } from "../data-table/loadState";
import type { SortState } from "../data-table/types";
import { formatSaleStateLabel, saleStateClassName, type SaleRecord } from "../../domain/ventas";

type SalesSortKey = "lote" | "cliente" | "asesor" | "estado" | "precio" | "fecha";

type SalesTableProps = {
  items: SaleRecord[];
  loading: boolean;
  role: "admin" | "asesor" | null;
  loginUsername: string | null;
  sort: SortState<SalesSortKey>;
  onSort: (key: SalesSortKey) => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) => {
  const raw = String(value || "").trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-PE");
};

const capitalizeName = (value: string) =>
  value
    .toLocaleLowerCase("es-PE")
    .replace(/\b([\p{L}\p{M}])/gu, (match) => match.toLocaleUpperCase("es-PE"));

const sortDirectionFor = (sort: SortState<SalesSortKey>, key: SalesSortKey) => (sort.key === key ? sort.direction : null);

const IconArrowOpen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const buildLotesByManzanaLabel = (sale: SaleRecord) => {
  const lotes = (sale.lotes && sale.lotes.length > 0 ? sale.lotes : sale.lote ? [sale.lote] : [])
    .filter(Boolean)
    .map((lot) => ({ mz: String(lot.mz || "").trim().toUpperCase(), lote: Number(lot.lote) }))
    .filter((lot) => lot.mz && Number.isFinite(lot.lote));

  if (lotes.length === 0) {
    return "-";
  }

  const grouped = lotes.reduce<Map<string, number[]>>((acc, lot) => {
    const current = acc.get(lot.mz) ?? [];
    current.push(lot.lote);
    acc.set(lot.mz, current);
    return acc;
  }, new Map());

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "es", { sensitivity: "base" }))
    .map(([mz, nums]) => `${mz}: ${Array.from(new Set(nums)).sort((a, b) => a - b).map((n) => String(n).padStart(2, "0")).join(",")}`)
    .join(" · ");
};

export default function SalesTable({ items, loading, role, loginUsername, sort, onSort }: SalesTableProps) {
  const loadState = resolveTableLoadState(loading, items.length);
  const showDataRows = loadState === "ready" || loadState === "loading-refresh";

  return (
    <DataTable className="sales-table-view">
      <table className="sales-table">
        <thead>
          <tr>
            <th>
              <DataTableSortHeader label="Fecha de venta" direction={sortDirectionFor(sort, "fecha")} onToggle={() => onSort("fecha")} />
            </th>
            <th>
              <DataTableSortHeader
                label="Asesor"
                direction={sortDirectionFor(sort, "asesor")}
                onToggle={() => onSort("asesor")}
              />
            </th>
            <th>
              <DataTableSortHeader
                label="Cliente"
                direction={sortDirectionFor(sort, "cliente")}
                onToggle={() => onSort("cliente")}
              />
            </th>
            <th>
              <DataTableSortHeader
                label="Estado"
                direction={sortDirectionFor(sort, "estado")}
                onToggle={() => onSort("estado")}
              />
            </th>
            <th>
              <DataTableSortHeader
                label="Lotes"
                direction={sortDirectionFor(sort, "lote")}
                onToggle={() => onSort("lote")}
              />
            </th>
            <th>
              <DataTableSortHeader
                label="Total venta"
                direction={sortDirectionFor(sort, "precio")}
                onToggle={() => onSort("precio")}
              />
            </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loadState === "loading-initial" ? <DataTableLoadingRows colSpan={7} label="Cargando ventas" /> : null}

          {loadState === "loading-refresh" ? (
            <tr>
              <td colSpan={7} className="data-table__refreshing">
                Actualizando ventas...
              </td>
            </tr>
          ) : null}

          {showDataRows &&
            items.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDate(sale.fechaVenta)}</td>
                <td>{sale.asesor?.nombre || "-"}</td>
                <td className="sales-table__client">{sale.cliente?.nombreCompleto ? capitalizeName(sale.cliente.nombreCompleto) : "-"}</td>
                <td>
                  <span className={`sales-pill ${saleStateClassName(sale.estadoVenta)}`}>{formatSaleStateLabel(sale.estadoVenta)}</span>
                </td>
                <td className="sales-table__lotes-mzna" title={buildLotesByManzanaLabel(sale)}>
                  {buildLotesByManzanaLabel(sale)}
                </td>
                <td>{formatMoney(sale.precioVenta)}</td>
                <td>
                  {(() => {
                    const isAdmin = role === "admin";
                    const isFallen = sale.estadoVenta === "CAIDA";
                    const ownerUsername = sale.asesor?.username?.trim().toLowerCase();
                    const currentUsername = loginUsername?.trim().toLowerCase();
                    const canViewDetail =
                      isAdmin || (role === "asesor" && !!ownerUsername && !!currentUsername && ownerUsername === currentUsername);

                    if (isFallen && isAdmin) {
                      return (
                        <Link className="btn ghost data-table__row-action" to={`/ventas/${sale.id}`}>
                          <IconArrowOpen />
                          <span className="data-table__row-action-label data-table__row-action-label--long">Abrir venta</span>
                          <span className="data-table__row-action-label data-table__row-action-label--short">Abrir</span>
                        </Link>
                      );
                    }

                    if (isFallen && canViewDetail && sale.lote?.codigo) {
                      return (
                        <Link
                          className="btn ghost data-table__row-action"
                          to={`/ventas/nueva?lote=${encodeURIComponent(sale.lote.codigo)}`}
                        >
                          <IconArrowOpen />
                          <span className="data-table__row-action-label data-table__row-action-label--long">Abrir venta</span>
                          <span className="data-table__row-action-label data-table__row-action-label--short">Abrir</span>
                        </Link>
                      );
                    }

                    if (canViewDetail) {
                      return (
                        <Link className="btn ghost data-table__row-action" to={`/ventas/${sale.id}`}>
                          <IconArrowOpen />
                          <span className="data-table__row-action-label data-table__row-action-label--long">Abrir venta</span>
                          <span className="data-table__row-action-label data-table__row-action-label--short">Abrir</span>
                        </Link>
                      );
                    }

                    return (
                      <button
                        type="button"
                        className="btn ghost data-table__row-action"
                        disabled
                        title="No puedes abrir ventas de otro asesor"
                      >
                        <IconArrowOpen />
                        <span className="data-table__row-action-label data-table__row-action-label--long">Abrir venta</span>
                        <span className="data-table__row-action-label data-table__row-action-label--short">Abrir</span>
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}

          {loadState === "empty" ? (
            <tr>
              <td colSpan={7} className="data-table__empty">
                No hay ventas registradas todavia.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </DataTable>
  );
}

