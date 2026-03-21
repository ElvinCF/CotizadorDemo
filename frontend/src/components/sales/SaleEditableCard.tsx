import AdminTextInput from "../admin/AdminTextInput";
import type { SaleFormValues, SaleState } from "../../domain/ventas";

type SalePreview = {
  precioVenta: number;
  montoInicialTotal: number;
  totalCuotasPagadas: number;
  montoFinanciado: number;
  cantidadCuotas: number;
  montoCuota: number;
};

type SaleEditableCardProps = {
  form: SaleFormValues;
  role: string | null;
  disabled?: boolean;
  preview: SalePreview;
  onFormChange: (updater: (current: SaleFormValues) => SaleFormValues) => void;
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

export default function SaleEditableCard({
  form,
  role,
  disabled = false,
  preview,
  onFormChange,
}: SaleEditableCardProps) {
  const visibleStateOptions = saleStateOptions.filter((item) => role === "admin" || item.value !== "CAIDA");

  return (
    <article className="sales-form-card sales-editable-card">
      <div className="sales-editable-row">
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

        {form.tipoFinanciamiento === "REDUCIR_CUOTA" ? (
          <label className="sales-editable-row__field">
            Cantidad de cuotas
            <AdminTextInput
              type="number"
              min={1}
              max={36}
              value={form.cantidadCuotas}
              disabled={disabled}
              onChange={(event) => onFormChange((current) => ({ ...current, cantidadCuotas: event.target.value }))}
            />
          </label>
        ) : (
          <label className="sales-editable-row__field">
            Monto por cuota
            <AdminTextInput
              type="number"
              step="0.01"
              value={form.montoCuota}
              disabled={disabled}
              onChange={(event) => onFormChange((current) => ({ ...current, montoCuota: event.target.value }))}
            />
          </label>
        )}

        <label className="sales-editable-row__field sales-editable-row__field--wide">
          Observacion
          <AdminTextInput
            value={form.observacion}
            disabled={disabled}
            onChange={(event) => onFormChange((current) => ({ ...current, observacion: event.target.value }))}
          />
        </label>
      </div>

      <div className="sales-kpi-formula" aria-label="Resumen financiero">
        <article className="sales-kpi-card sales-kpi-card--price">
          <span>Precio de venta</span>
          <strong>{formatMoney(preview.precioVenta)}</strong>
        </article>
        <span className="sales-kpi-formula__operator" aria-hidden="true">
          -
        </span>
        <article className="sales-kpi-card sales-kpi-card--initial">
          <span>Inicial</span>
          <strong>{formatMoney(preview.montoInicialTotal)}</strong>
        </article>
        <span className="sales-kpi-formula__operator" aria-hidden="true">
          -
        </span>
        <article className="sales-kpi-card sales-kpi-card--paid">
          <span>Total cuotas pagadas</span>
          <strong>{formatMoney(preview.totalCuotasPagadas)}</strong>
        </article>
        <span className="sales-kpi-formula__operator" aria-hidden="true">
          =
        </span>
        <article className="sales-kpi-card sales-kpi-card--financing">
          <span>Monto financiado</span>
          <strong>{formatMoney(preview.montoFinanciado)}</strong>
        </article>
        <span className="sales-kpi-formula__operator" aria-hidden="true">
          /
        </span>
        <article className="sales-kpi-card sales-kpi-card--count">
          <span>Cantidad de cuotas</span>
          <strong>{preview.cantidadCuotas}</strong>
        </article>
        <span className="sales-kpi-formula__operator" aria-hidden="true">
          =
        </span>
        <article className="sales-kpi-card sales-kpi-card--quota">
          <span>Cuota base</span>
          <strong>{formatMoney(preview.montoCuota)}</strong>
        </article>
      </div>
    </article>
  );
}
