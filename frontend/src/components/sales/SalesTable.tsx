import { Link } from "react-router-dom";
import DataTable from "../data-table/DataTable";
import DataTableLoadingRows from "../data-table/DataTableLoadingRows";
import DataTableSortHeader from "../data-table/DataTableSortHeader";
import { resolveTableLoadState } from "../data-table/loadState";
import type { SortState } from "../data-table/types";
import type { SaleRecord } from "../../domain/ventas";

type SalesSortKey = "lote" | "cliente" | "asesor" | "estado" | "precio" | "fecha";

type SalesTableProps = {
  items: SaleRecord[];
  loading: boolean;
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

const statusClass = (state: string) => {
  if (state === "CAIDA") return "is-danger";
  if (state === "SEPARADA") return "is-warning";
  if (state === "COMPLETADA") return "is-success";
  return "is-info";
};

const sortDirectionFor = (sort: SortState<SalesSortKey>, key: SalesSortKey) => (sort.key === key ? sort.direction : null);

export default function SalesTable({ items, loading, sort, onSort }: SalesTableProps) {
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
                <td>{sale.lote ? `${sale.lote.mz} - Lote ${sale.lote.lote}` : "-"}</td>
                <td>{sale.cliente?.nombreCompleto || "-"}</td>
                <td>{sale.asesor?.nombre || "-"}</td>
                <td>
                  <span className={`sales-pill ${statusClass(sale.estadoVenta)}`}>{sale.estadoVenta.replaceAll("_", " ")}</span>
                </td>
                <td>{formatMoney(sale.precioVenta)}</td>
                <td>{formatDate(sale.fechaVenta)}</td>
                <td>
                  <Link className="btn ghost data-table__row-action" to={`/ventas/${sale.id}`}>
                    <span className="data-table__row-action-label">Ver detalle</span>
                  </Link>
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
