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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-PE");
};

const capitalizeName = (value: string) =>
  value
    .toLocaleLowerCase("es-PE")
    .replace(/\b([\p{L}\p{M}])/gu, (match) => match.toLocaleUpperCase("es-PE"));

const sortDirectionFor = (sort: SortState<SalesSortKey>, key: SalesSortKey) => (sort.key === key ? sort.direction : null);

export default function SalesTable({ items, loading, role, loginUsername, sort, onSort }: SalesTableProps) {
  const loadState = resolveTableLoadState(loading, items.length);
  const showDataRows = loadState === "ready" || loadState === "loading-refresh";

  return (
    <DataTable className="sales-table-view">
      <table className="sales-table">
        <thead>
          <tr>
            <th>
              <DataTableSortHeader label="Lote" direction={sortDirectionFor(sort, "lote")} onToggle={() => onSort("lote")} />
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
                label="Asesor"
                direction={sortDirectionFor(sort, "asesor")}
                onToggle={() => onSort("asesor")}
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
                label="Precio"
                direction={sortDirectionFor(sort, "precio")}
                onToggle={() => onSort("precio")}
              />
            </th>
            <th>
              <DataTableSortHeader label="Fecha" direction={sortDirectionFor(sort, "fecha")} onToggle={() => onSort("fecha")} />
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
                <td className="sales-table__lot">
                  {sale.lote ? sale.lote.codigo || `${sale.lote.mz}-${String(sale.lote.lote).padStart(2, "0")}` : "-"}
                </td>
                <td className="sales-table__client">
                  {sale.cliente?.nombreCompleto ? capitalizeName(sale.cliente.nombreCompleto) : "-"}
                </td>
                <td>{sale.asesor?.nombre || "-"}</td>
                <td>
                  <span className={`sales-pill ${saleStateClassName(sale.estadoVenta)}`}>{formatSaleStateLabel(sale.estadoVenta)}</span>
                </td>
                <td>{formatMoney(sale.precioVenta)}</td>
                <td>{formatDate(sale.fechaVenta)}</td>
                <td>
                  {(() => {
                    const isAdmin = role === "admin";
                    const isFallen = sale.estadoVenta === "CAIDA";
                    const ownerUsername = sale.asesor?.username?.trim().toLowerCase();
                    const currentUsername = loginUsername?.trim().toLowerCase();
                    const canViewDetail =
                      isAdmin || (role === "asesor" && !!ownerUsername && !!currentUsername && ownerUsername === currentUsername);

                    if (isFallen && canViewDetail && sale.lote?.codigo) {
                      return (
                        <Link
                          className="btn ghost data-table__row-action"
                          to={`/ventas/nueva?lote=${encodeURIComponent(sale.lote.codigo)}`}
                        >
                          <span className="data-table__row-action-label">Crear venta</span>
                        </Link>
                      );
                    }

                    if (canViewDetail) {
                      return (
                        <Link className="btn ghost data-table__row-action" to={`/ventas/${sale.id}`}>
                          <span className="data-table__row-action-label">Ver detalle</span>
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
                        <span className="data-table__row-action-label">Ver detalle</span>
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
