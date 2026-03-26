import AdminTextInput from "../admin/AdminTextInput";
import type { SaleFormValues, SaleState } from "../../domain/ventas";

export type SalePreview = {
  precioVenta: number;
  montoInicialTotal: number;
  totalCuotasPagadas: number;
  montoFinanciado: number;
  cantidadCuotas: number;
  montoCuota: number;
};

export type SaleLotePreview = {
  codigo: string;
  mz: string;
  lote: number | string;
  areaM2: number | null;
  estadoComercial: string;
  precioReferencial?: number | null;
};

type SaleCardBaseProps = {
  form: SaleFormValues;
  role: string | null;
  disabled?: boolean;
  onFormChange: (updater: (current: SaleFormValues) => SaleFormValues) => void;
};

type SaleLotCardProps = {
  lote: SaleLotePreview | null;
};

type SaleContractSummaryCardProps = {
  preview: SalePreview;
};

const saleStateOptions: { value: SaleState; label: string; tone: "neutral" }[] = [
  { value: "SEPARADA", label: "Separada", tone: "neutral" },
  { value: "INICIAL_PAGADA", label: "Inicial pagada", tone: "neutral" },
  { value: "CONTRATO_FIRMADO", label: "Contrato firmado", tone: "neutral" },
  { value: "PAGANDO", label: "Pagando", tone: "neutral" },
  { value: "COMPLETADA", label: "Completada", tone: "neutral" },
  { value: "CAIDA", label: "Caida", tone: "neutral" },
];

const financingOptions = [
  { value: "REDUCIR_CUOTA", label: "Reducir cuota", tone: "neutral" as const },
  { value: "REDUCIR_MESES", label: "Reducir meses", tone: "neutral" as const },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatArea = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Number(value).toLocaleString("es-PE", { maximumFractionDigits: 2 })} m2`;
};

const formatTextValue = (value: string | number | null | undefined) => {
  if (value == null) return "-";
  const text = String(value).trim();
  return text || "-";
};

const formatStateLabel = (value: string) => value.replaceAll("_", " ");

export function SaleLotCard({ lote }: SaleLotCardProps) {
  const lotItems = [
    { label: "Mz", value: formatTextValue(lote?.mz) },
    { label: "Lote", value: lote ? `Lote ${lote.lote}` : "-" },
    { label: "Area", value: formatArea(lote?.areaM2 ?? null) },
    { label: "Estado", value: formatTextValue(lote ? formatStateLabel(lote.estadoComercial) : null) },
    { label: "Precio ref.", value: lote?.precioReferencial != null ? formatMoney(lote.precioReferencial) : "-" },
  ];

  return (
    <article className="sales-form-card sales-editable-card sales-editable-card--lot">
      <header className="sales-section-card__header">
        <h3>Datos del lote</h3>
      </header>
      <dl className="sales-inline-summary">
        {lotItems.map((item) => (
          <div key={item.label} className="sales-inline-summary__item">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function SaleDataCard({ form, role, disabled = false, onFormChange }: SaleCardBaseProps) {
  const visibleStateOptions = saleStateOptions.filter((item) => role === "admin" || item.value !== "CAIDA");

  return (
    <article className="sales-form-card sales-editable-card">
      <header className="sales-section-card__header">
        <h3>Datos de la venta</h3>
      </header>
      <div className="sales-editable-row sales-editable-row--sale">
        <label className="sales-editable-row__field">
          Fecha de venta
          <AdminTextInput
            type="date"
            value={form.fechaVenta}
            disabled={disabled}
            onChange={(event) => onFormChange((current) => ({ ...current, fechaVenta: event.target.value }))}
          />
        </label>

        <label className="sales-editable-row__field">
          Estado de venta
          <select
            value={form.estadoVenta}
            disabled={disabled}
            onChange={(event) =>
              onFormChange((current) => ({ ...current, estadoVenta: event.target.value as SaleState }))
            }
          >
            {visibleStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sales-editable-row__field">
          Observacion
          <AdminTextInput
            value={form.observacion}
            disabled={disabled}
            onChange={(event) => onFormChange((current) => ({ ...current, observacion: event.target.value }))}
          />
        </label>
      </div>
    </article>
  );
}

export function SaleFinancingCard({ form, disabled = false, onFormChange }: SaleCardBaseProps) {
  return (
    <article className="sales-form-card sales-editable-card sales-editable-card--finance">
      <header className="sales-section-card__header">
        <h3>Datos de la financiacion</h3>
      </header>
      <div className="sales-editable-row sales-editable-row--finance">
        <label className="sales-editable-row__field">
          Precio de venta
          <AdminTextInput
            type="number"
            step="0.01"
            value={form.precioVenta}
            disabled={disabled}
            onChange={(event) => onFormChange((current) => ({ ...current, precioVenta: event.target.value }))}
          />
        </label>

        <label className="sales-editable-row__field">
          Tipo de financiamiento
          <select
            value={form.tipoFinanciamiento}
            disabled={disabled}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                tipoFinanciamiento: event.target.value as SaleFormValues["tipoFinanciamiento"],
              }))
            }
          >
            {financingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sales-editable-row__field">
          {form.tipoFinanciamiento === "REDUCIR_CUOTA" ? "Cantidad de cuotas" : "Monto por cuota"}
          {form.tipoFinanciamiento === "REDUCIR_CUOTA" ? (
            <AdminTextInput
              type="number"
              min={1}
              max={36}
              value={form.cantidadCuotas}
              disabled={disabled}
              onChange={(event) => onFormChange((current) => ({ ...current, cantidadCuotas: event.target.value }))}
            />
          ) : (
            <AdminTextInput
              type="number"
              step="0.01"
              value={form.montoCuota}
              disabled={disabled}
              onChange={(event) => onFormChange((current) => ({ ...current, montoCuota: event.target.value }))}
            />
          )}
        </label>
      </div>
    </article>
  );
}

export function SaleContractSummaryCard({ preview }: SaleContractSummaryCardProps) {
  return (
    <article className="sales-form-card sales-contract-summary-card">
      <header className="sales-section-card__header">
        <h3>Resumen del contrato</h3>
      </header>
      <dl className="sales-contract-summary" aria-label="Resumen del contrato">
        <div className="sales-contract-summary__row">
          <dt>Precio de venta</dt>
          <dd>{formatMoney(preview.precioVenta)}</dd>
        </div>
        <div className="sales-contract-summary__row">
          <dt>Inicial</dt>
          <dd>{formatMoney(preview.montoInicialTotal)}</dd>
        </div>
        <div className="sales-contract-summary__row">
          <dt>Total cuotas pagadas</dt>
          <dd>{formatMoney(preview.totalCuotasPagadas)}</dd>
        </div>
        <div className="sales-contract-summary__row">
          <dt>Monto financiado</dt>
          <dd>{formatMoney(preview.montoFinanciado)}</dd>
        </div>
        <div className="sales-contract-summary__row">
          <dt>Cantidad de cuotas</dt>
          <dd>{preview.cantidadCuotas}</dd>
        </div>
        <div className="sales-contract-summary__row">
          <dt>Cuota base</dt>
          <dd>{formatMoney(preview.montoCuota)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function SaleEditableCard(props: SaleCardBaseProps & { lote: SaleLotePreview | null; preview: SalePreview }) {
  return (
    <div className="sales-editable-sections">
      <SaleLotCard lote={props.lote} />
      <SaleDataCard form={props.form} role={props.role} disabled={props.disabled} onFormChange={props.onFormChange} />
      <SaleContractSummaryCard preview={props.preview} />
    </div>
  );
}
