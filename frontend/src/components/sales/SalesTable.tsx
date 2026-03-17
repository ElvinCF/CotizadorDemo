import { Link } from "react-router-dom";
import type { SaleRecord } from "../../domain/ventas";

type SalesTableProps = {
  items: SaleRecord[];
  loading: boolean;
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

export default function SalesTable({ items, loading }: SalesTableProps) {
  if (loading) {
    return <p className="muted">Cargando ventas...</p>;
  }

  return (
    <div className="sales-table-wrap">
      <table className="sales-table">
        <thead>
          <tr>
            <th>LOTE</th>
            <th>CLIENTE</th>
            <th>ASESOR</th>
            <th>ESTADO</th>
            <th>PRECIO</th>
            <th>FECHA</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((sale) => (
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
                <Link className="btn ghost" to={`/ventas/${sale.id}`}>
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                No hay ventas registradas todavia.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
