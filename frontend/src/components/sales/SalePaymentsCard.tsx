import { useMemo, useState } from "react";
import DataTable from "../data-table/DataTable";
import DataTableLoadingRows from "../data-table/DataTableLoadingRows";
import DataTableShell from "../data-table/DataTableShell";
import DataTableSortHeader from "../data-table/DataTableSortHeader";
import { resolveTableLoadState } from "../data-table/loadState";
import type { SortState } from "../data-table/types";
import type { SalePayment, SaleRecord } from "../../domain/ventas";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-PE");
};

type PaymentSortKey = "fecha" | "tipo" | "monto" | "cuota";

const compareText = (left: string, right: string) => left.localeCompare(right, "es", { sensitivity: "base" });

const sortDirectionFor = (sort: SortState<PaymentSortKey>, key: PaymentSortKey) => (sort.key === key ? sort.direction : null);

const latestDate = (payments: SalePayment[]) => {
  if (!payments.length) return null;
  const sorted = [...payments].sort((left, right) => new Date(right.fechaPago).getTime() - new Date(left.fechaPago).getTime());
  return sorted[0]?.fechaPago ?? null;
};

export const summarizeSalePayments = (sale: SaleRecord) => {
  const initialPayments = sale.pagos.filter((payment) => payment.tipoPago === "SEPARACION" || payment.tipoPago === "INICIAL");
  const installmentPayments = sale.pagos.filter((payment) => payment.tipoPago === "CUOTA");
  const totalInitial = initialPayments.reduce((acc, payment) => acc + Number(payment.monto || 0), 0);
  const totalInstallments = installmentPayments.reduce((acc, payment) => acc + Number(payment.monto || 0), 0);

  return {
    initialCount: initialPayments.length,
    totalInitial,
    initialDate: latestDate(initialPayments),
    installmentCount: installmentPayments.length,
    totalInstallments,
    installmentDate: latestDate(installmentPayments),
    totalCollected: totalInitial + totalInstallments,
    lastPaymentDate: latestDate(sale.pagos),
  };
};

type SalePaymentsOverviewCardProps = {
  sale: SaleRecord;
  disabled?: boolean;
  onOpenPayments: () => void;
  onAddPayment: () => void;
};

type SalePaymentsTableProps = {
  sale: SaleRecord;
  disabled?: boolean;
  loading?: boolean;
  showShellChrome?: boolean;
  onAddPayment: () => void;
  onEditPayment?: (payment: SalePayment) => void;
};

type SalePaymentsModalProps = SalePaymentsTableProps & {
  open: boolean;
  onClose: () => void;
};

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M4 20h4l10-10a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="m12.5 7.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M8 7h12M8 12h12M8 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="4.5" cy="7" r="1.2" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="4.5" cy="17" r="1.2" fill="currentColor" />
  </svg>
);

export function SalePaymentsOverviewCard({ sale, disabled = false, onOpenPayments, onAddPayment }: SalePaymentsOverviewCardProps) {
  const summary = summarizeSalePayments(sale);

  return (
    <article className="sales-form-card sales-payments-overview-card">
      <header className="sales-payments-overview-card__header">
        <div className="sales-payments-overview-card__title">
          <h3>Pagos</h3>
          <span className="data-table-shell__count">{sale.pagos.length}</span>
        </div>
        <div className="sales-payments-overview-card__actions">
          <button type="button" className="btn ghost sales-payments-overview-card__btn" onClick={onOpenPayments}>
            <IconList />
            <span>Ver pagos</span>
          </button>
          <button type="button" className="btn ghost sales-payments-overview-card__btn" onClick={onAddPayment} disabled={disabled}>
            <span>+ Registrar pago</span>
          </button>
        </div>
      </header>

      <div className="sales-payments-overview-card__table-wrap">
        <table className="sales-payments-overview-card__table">
          <thead>
            <tr>
              <th>Inicial</th>
              <th>Cuotas pagadas</th>
              <th>Total cobrado</th>
              <th>Ultimo pago</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{formatMoney(summary.totalInitial)}</td>
              <td>{formatMoney(summary.totalInstallments)}</td>
              <td>{formatMoney(summary.totalCollected)}</td>
              <td>{formatDate(summary.lastPaymentDate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function SalePaymentsModal({
  open,
  sale,
  disabled = false,
  loading = false,
  onClose,
  onAddPayment,
  onEditPayment,
}: SalePaymentsModalProps) {
  const summary = summarizeSalePayments(sale);

  if (!open) return null;

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="sales-payments-modal" onClick={(event) => event.stopPropagation()}>
          <header className="sales-payments-modal__header">
          <div className="sales-payments-modal__title">
            <h3>Pagos registrados</h3>
            <span className="data-table-shell__count">{sale.pagos.length}</span>
          </div>
            <div className="sales-payments-modal__header-actions">
              <button type="button" className="btn ghost" onClick={onAddPayment} disabled={disabled}>
                + Registrar pago
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="sales-payments-modal__body">
          <SalePaymentsTable
            sale={sale}
            disabled={disabled}
            loading={loading}
            showShellChrome={false}
            onAddPayment={onAddPayment}
            onEditPayment={onEditPayment}
          />
        </div>

        <footer className="sales-payments-modal__footer">
          <div className="sales-payments-modal__summary-item">
            <span>Inicial</span>
            <strong>{formatMoney(summary.totalInitial)}</strong>
          </div>
          <div className="sales-payments-modal__summary-item">
            <span>Cuotas pagadas</span>
            <strong>{formatMoney(summary.totalInstallments)}</strong>
          </div>
          <div className="sales-payments-modal__summary-item">
            <span>Total cobrado</span>
            <strong>{formatMoney(summary.totalCollected)}</strong>
          </div>
          <div className="sales-payments-modal__summary-item">
            <span>Ultimo pago</span>
            <strong>{formatDate(summary.lastPaymentDate)}</strong>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function SalePaymentsTable({
  sale,
  disabled = false,
  loading = false,
  showShellChrome = true,
  onAddPayment,
  onEditPayment,
}: SalePaymentsTableProps) {
  const [sort, setSort] = useState<SortState<PaymentSortKey>>({ key: "fecha", direction: "desc" });

  const visiblePayments = useMemo(() => {
    const filtered = sale.pagos;
    if (!sort.key || !sort.direction) return filtered;

    const sorted = [...filtered].sort((left, right) => {
      switch (sort.key) {
        case "fecha":
          return new Date(left.fechaPago).getTime() - new Date(right.fechaPago).getTime();
        case "tipo":
          return compareText(left.tipoPago, right.tipoPago);
        case "monto":
          return Number(left.monto ?? 0) - Number(right.monto ?? 0);
        case "cuota":
          return Number(left.nroCuota ?? 0) - Number(right.nroCuota ?? 0);
        default:
          return 0;
      }
    });
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [sale.pagos, sort]);

  const loadState = resolveTableLoadState(loading, visiblePayments.length);
  const showDataRows = loadState === "ready" || loadState === "loading-refresh";

  const handleSort = (key: PaymentSortKey) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const toolbarActions = (
    <div className="sales-payments-shell__toolbar">
      <button type="button" className="btn ghost sales-payments-shell__add-btn" onClick={onAddPayment} disabled={disabled}>
        + Agregar pago
      </button>
    </div>
  );

  const tableContent = (
    <DataTable className="sales-table-view sales-payments-table-view">
      <table className="sales-table sales-table--compact">
        <thead>
          <tr>
            <th>
              <DataTableSortHeader label="Fecha" direction={sortDirectionFor(sort, "fecha")} onToggle={() => handleSort("fecha")} />
            </th>
            <th>
              <DataTableSortHeader label="Tipo" direction={sortDirectionFor(sort, "tipo")} onToggle={() => handleSort("tipo")} />
            </th>
            <th>
              <DataTableSortHeader label="Monto" direction={sortDirectionFor(sort, "monto")} onToggle={() => handleSort("monto")} />
            </th>
            <th>
              <DataTableSortHeader label="Cuota" direction={sortDirectionFor(sort, "cuota")} onToggle={() => handleSort("cuota")} />
            </th>
            <th>Observacion</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loadState === "loading-initial" ? <DataTableLoadingRows colSpan={6} label="Cargando pagos" /> : null}

          {loadState === "loading-refresh" ? (
            <tr>
              <td colSpan={6} className="data-table__refreshing">
                Actualizando pagos...
              </td>
            </tr>
          ) : null}

          {showDataRows &&
            visiblePayments.map((payment: SalePayment) => (
              <tr key={payment.id}>
                <td>{formatDate(payment.fechaPago)}</td>
                <td>{payment.tipoPago}</td>
                <td>{formatMoney(payment.monto)}</td>
                <td>{payment.nroCuota ?? "-"}</td>
                <td>{payment.observacion || "-"}</td>
                <td>
                  <button
                    type="button"
                    className="btn ghost sales-payments-table__edit"
                    onClick={() => onEditPayment?.(payment)}
                    title="Editar pago"
                    disabled={disabled}
                  >
                    <IconEdit />
                    <span>Editar</span>
                  </button>
                </td>
              </tr>
            ))}

          {loadState === "empty" ? (
            <tr>
              <td colSpan={6} className="data-table__empty">
                No hay pagos para el filtro aplicado.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </DataTable>
  );

  if (!showShellChrome) {
    return tableContent;
  }

  return (
    <DataTableShell
      className="sales-payments-shell"
      title="Pagos registrados"
      meta={<span className="data-table-shell__count">{visiblePayments.length}</span>}
      toolbar={toolbarActions}
    >
      {tableContent}
    </DataTableShell>
  );
}

export default SalePaymentsTable;
