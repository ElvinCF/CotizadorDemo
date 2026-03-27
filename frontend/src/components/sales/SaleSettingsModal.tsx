import { useEffect, useMemo, useState } from "react";
import type { SaleFormValues, SaleHistoryItem, SaleRecord } from "../../domain/ventas";

type SaleSettingsModalProps = {
  open: boolean;
  sale: SaleRecord;
  form: SaleFormValues;
  role: string | null;
  advisorOptions: { id: string; name: string }[];
  disabled?: boolean;
  onFormChange: (updater: (current: SaleFormValues) => SaleFormValues) => void;
  onClose: () => void;
};

type SettingsTab = "historial" | "llenado" | "administrativo";

type FillingItem = {
  key: string;
  label: string;
  complete: boolean;
  optional?: boolean;
};

type ReadonlyItem = {
  key: string;
  label: string;
  value: string;
};

const formatHistoryDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
};

const formatHistoryTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
};

const formatStateLabel = (value: string | null) => {
  if (!value) return "Creacion";
  return value.replaceAll("_", " ");
};

const formatUserLabel = (item: SaleHistoryItem) => {
  if (!item.usuario) return "Sistema";
  return item.usuario.nombre || item.usuario.username;
};

const hasText = (value: string | null | undefined) => String(value || "").trim() !== "";
const hasPositiveNumber = (value: string | number | null | undefined) => Number(value || 0) > 0;

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPending = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

export default function SaleSettingsModal({
  open,
  sale,
  form,
  role,
  advisorOptions,
  disabled = false,
  onFormChange,
  onClose,
}: SaleSettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("llenado");
  const tabStorageKey = `sale-settings-tab:${role || "guest"}`;

  useEffect(() => {
    if (!open) return;
    try {
      const stored = window.localStorage.getItem(tabStorageKey) as SettingsTab | null;
      if (stored === "historial" || stored === "llenado" || stored === "administrativo") {
        setTab(stored);
        return;
      }
    } catch {
      // ignore storage access issues
    }
    setTab("llenado");
  }, [open, tabStorageKey]);

  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(tabStorageKey, tab);
    } catch {
      // ignore storage access issues
    }
  }, [open, tab, tabStorageKey]);

  const fillingItems = useMemo<FillingItem[]>(
    () => [
      { key: "lote", label: "Lote", complete: hasText(form.loteCodigo) || Boolean(sale.lote?.id) },
      { key: "fecha", label: "Fecha de venta", complete: hasText(form.fechaVenta) },
      { key: "asesor", label: "Asesor", complete: Boolean(form.asesorId || sale.asesor?.id) },
      {
        key: "titular1",
        label: "Titular principal",
        complete: hasText(form.cliente.nombreCompleto) && hasText(form.cliente.dni),
      },
      { key: "precio", label: "Precio de venta", complete: hasPositiveNumber(form.precioVenta) },
      {
        key: "arranque",
        label: "Separacion / inicial",
        complete:
          sale.pagos.some(
            (payment) =>
              (payment.tipoPago === "SEPARACION" || payment.tipoPago === "INICIAL") && Number(payment.monto) > 0
          ) || false,
      },
      { key: "financiamiento", label: "Tipo financiamiento", complete: hasText(form.tipoFinanciamiento) },
      {
        key: "plan",
        label: "Plan de cuotas",
        complete:
          form.tipoFinanciamiento === "REDUCIR_CUOTA"
            ? hasPositiveNumber(form.cantidadCuotas)
            : hasPositiveNumber(form.montoCuota),
      },
      { key: "pactada", label: "Fecha pago pactada", complete: hasText(form.fechaPagoPactada || sale.fechaPagoPactada) },
    ],
    [form, sale.asesor?.id, sale.fechaPagoPactada, sale.lote?.id, sale.pagos]
  );

  const sortedHistory = useMemo(
    () =>
      [...sale.historial].sort((left, right) => new Date(right.fechaCambio).getTime() - new Date(left.fechaCambio).getTime()),
    [sale.historial]
  );

  const latestHistoryEvent = sortedHistory[0] ?? null;

  const administrativeItems = useMemo<ReadonlyItem[]>(
    () => [
      { key: "venta", label: "Venta ID", value: sale.id },
      { key: "lote", label: "Lote", value: (sale.lote?.codigo ?? form.loteCodigo) || "-" },
      { key: "estadoVenta", label: "Estado venta", value: sale.estadoVenta.replaceAll("_", " ") },
      { key: "estadoLote", label: "Estado lote", value: sale.lote?.estadoComercial ?? "-" },
      { key: "financiamiento", label: "Financiamiento", value: sale.tipoFinanciamiento.replaceAll("_", " ") },
      {
        key: "inicial",
        label: "Inicial total",
        value: new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(
          sale.montoInicialTotal || 0
        ),
      },
      {
        key: "cuotas",
        label: "Cuotas base",
        value: `${sale.cantidadCuotas} x ${new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: "PEN",
          minimumFractionDigits: 2,
        }).format(sale.montoCuota || 0)}`,
      },
    ],
    [form.loteCodigo, sale]
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sales-settings-modal" onClick={(event) => event.stopPropagation()}>
        <header className="sales-settings-modal__header">
          <div>
            <h3>Ajustes de venta</h3>
            <p>Seguimiento del expediente y cambios historicos.</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="sales-settings-modal__tabs" role="tablist" aria-label="Ajustes de venta">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "historial"}
            className={`sales-settings-modal__tab${tab === "historial" ? " is-active" : ""}`}
            onClick={() => setTab("historial")}
          >
            Historial
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "llenado"}
            className={`sales-settings-modal__tab${tab === "llenado" ? " is-active" : ""}`}
            onClick={() => setTab("llenado")}
          >
            Llenado de la venta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "administrativo"}
            className={`sales-settings-modal__tab${tab === "administrativo" ? " is-active" : ""}`}
            onClick={() => setTab("administrativo")}
          >
            Administrativo
          </button>
        </div>

        {tab === "historial" ? (
          sale.historial.length ? (
            <div className="sales-settings-modal__list sales-history-timeline">
              <article className="sales-history-timeline__item is-current">
                <div className="sales-history-timeline__time">
                  <strong>{latestHistoryEvent ? formatHistoryDate(latestHistoryEvent.fechaCambio) : "-"}</strong>
                  <span>{latestHistoryEvent ? formatHistoryTime(latestHistoryEvent.fechaCambio) : "-"}</span>
                </div>
                <div className="sales-history-timeline__marker" aria-hidden="true" />
                <div className="sales-history-item sales-history-item--current sales-history-item--timeline">
                  <div className="sales-history-item__sentence">
                    <span className="sales-history-item__text">Estado actual</span>
                    <span className="sales-history-item__badge is-current">{formatStateLabel(sale.estadoVenta)}</span>
                    <span className="sales-history-item__text">por {latestHistoryEvent ? formatUserLabel(latestHistoryEvent) : "Sistema"}</span>
                  </div>
                </div>
              </article>
              {sortedHistory.map((item, index) => (
                <article key={item.id} className={`sales-history-timeline__item${index === sortedHistory.length - 1 ? " is-last" : ""}`}>
                  <div className="sales-history-timeline__time">
                    <strong>{formatHistoryDate(item.fechaCambio)}</strong>
                    <span>{formatHistoryTime(item.fechaCambio)}</span>
                  </div>
                  <div className="sales-history-timeline__marker" aria-hidden="true" />
                  <div className="sales-history-item sales-history-item--timeline">
                    <div className="sales-history-item__sentence">
                      <span className="sales-history-item__text">De</span>
                      <span className="sales-history-item__badge is-previous">{formatStateLabel(item.estadoAnterior)}</span>
                      <span className="sales-history-item__text">a</span>
                      <span className="sales-history-item__badge is-current">{formatStateLabel(item.estadoNuevo)}</span>
                      <span className="sales-history-item__text">por {formatUserLabel(item)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sales-history-modal__empty">Aun no hay eventos historicos registrados.</div>
          )
        ) : tab === "llenado" ? (
          <div className="sales-settings-modal__checklist">
            {fillingItems.map((item) => (
              <div key={item.key} className="sales-settings-modal__check">
                <span>{item.label}</span>
                <span
                  className={`sales-settings-modal__status${
                    item.complete ? " is-complete" : item.optional ? " is-optional" : " is-pending"
                  }`}
                  aria-label={item.complete ? "Completo" : item.optional ? "Opcional pendiente" : "Pendiente"}
                  title={item.complete ? "Completo" : item.optional ? "Opcional pendiente" : "Pendiente"}
                >
                  {item.complete ? <IconCheck /> : <IconPending />}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="sales-settings-modal__admin-pane">
            <div className="sales-settings-modal__admin-controls">
              <label className="sales-settings-modal__field">
                Asesor asignado
                {role === "admin" ? (
                  <select
                    value={form.asesorId ?? ""}
                    disabled={disabled}
                    onChange={(event) => onFormChange((current) => ({ ...current, asesorId: event.target.value || null }))}
                  >
                    <option value="">Sin asesor</option>
                    {advisorOptions.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>
                        {advisor.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={sale.asesor?.nombre || "Sin asesor"} disabled readOnly />
                )}
              </label>

              <label className="sales-settings-modal__field">
                Fecha de pago pactada
                <input
                  type="date"
                  value={form.fechaPagoPactada}
                  disabled={disabled}
                  onChange={(event) => onFormChange((current) => ({ ...current, fechaPagoPactada: event.target.value }))}
                />
              </label>
            </div>

            <div className="sales-settings-modal__admin-hint">
              Estos cambios se guardan con el boton principal <strong>Guardar cambios</strong>.
            </div>

            <div className="sales-settings-modal__admin-grid">
            {administrativeItems.map((item) => (
              <div key={item.key} className="sales-settings-modal__admin-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
