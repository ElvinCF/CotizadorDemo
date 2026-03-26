import ValidatedNumberField from "../forms/ValidatedNumberField";
import { formatArea, formatMoney, normalizeStatusLabel, statusToClass } from "../../domain/formatters";
import type { Lote, QuoteState } from "../../domain/types";

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconSale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

type CotizadorDrawerProps = {
  rightOpen: boolean;
  selectedLote: Lote | null;
  pulseMz: boolean;
  pulseLote: boolean;
  quote: QuoteState;
  quoteInvalidInicial: boolean;
  quoteInvalidMeses: boolean;
  cuota: number;
  cuotaRapida: (meses: number, inicial: number) => number;
  onClose: () => void;
  onOpenProforma: () => void;
  onOpenSale?: () => void;
  onChangeQuote: (next: QuoteState) => void;
  hideProformaButton?: boolean;
  showSaleButton?: boolean;
  saleButtonLabel?: string;
};

function CotizadorDrawer({
  rightOpen,
  selectedLote,
  pulseMz,
  pulseLote,
  quote,
  quoteInvalidInicial,
  quoteInvalidMeses,
  cuota,
  cuotaRapida,
  onClose,
  onOpenProforma,
  onOpenSale,
  onChangeQuote,
  hideProformaButton = false,
  showSaleButton = false,
  saleButtonLabel = "Crear venta",
}: CotizadorDrawerProps) {
  const precioLote = selectedLote?.price ?? quote.precio ?? 0;
  const loteStatusClass = statusToClass(selectedLote?.condicion);
  const precioM2 =
    selectedLote?.price != null &&
    selectedLote.areaM2 != null &&
    selectedLote.areaM2 > 0
      ? selectedLote.price / selectedLote.areaM2
      : null;
  const initialSliderMax = Math.max(6000, Math.ceil(precioLote / 500) * 500);

  const applyMonthsPreset = (meses: number) => {
    onChangeQuote({ ...quote, cuotas: meses });
  };

  return (
    <aside className={`drawer-panel right ${rightOpen ? "open" : ""}`}>
      <div className="drawer__header">
        <div className="drawer__header-main">
          <div className="drawer__header-copy">
            <h3>Cotizador</h3>
          </div>
          {selectedLote ? (
            <div className="drawer__header-chips">
              <span className={`chip chip-emphasis ${pulseMz ? "pulse" : ""}`}>MZ {selectedLote.mz}</span>
              <span className={`chip chip-emphasis ${pulseLote ? "pulse" : ""}`}>Lote {selectedLote.lote}</span>
            </div>
          ) : null}
        </div>
        <div className="drawer__header-actions">
          <button className="btn ghost drawer-close-btn icon-only" onClick={onClose} aria-label="Cerrar cotizador">
            <IconClose />
          </button>
        </div>
      </div>
      <div className="drawer__body">
        {selectedLote ? (
          <>
            <div className="drawer-summary-grid">
              <div className="drawer-summary-stack">
                <span className={`chip drawer-status-chip status-pill ${statusToClass(selectedLote.condicion)}`}>
                  {normalizeStatusLabel(selectedLote.condicion)}
                </span>
                <div className="drawer-card area-card">
                  <small className="drawer-card__label">Area total</small>
                  <strong>{formatArea(selectedLote.areaM2)}</strong>
                </div>
              </div>
              <div
                className={`drawer-card price-card drawer-card--main price-card--${loteStatusClass} ${pulseMz || pulseLote ? "price-card--pulse" : ""}`}
              >
                <small className="drawer-card__label">Precio del lote</small>
                <strong>{formatMoney(selectedLote.price)}</strong>
                <small className="drawer-card__meta">
                  Precio m2 <b>{precioM2 != null ? formatMoney(precioM2) : "-"}</b>
                </small>
              </div>
            </div>

            <div className={`quote-hero quote-hero--${loteStatusClass} ${pulseMz || pulseLote ? "quote-hero--pulse" : ""}`}>
              <div className="quote-hero__head">
                <span className="quote-hero__eyebrow">Tu cuota estimada mensual</span>
              </div>
              <div className="quote-hero__content">
                <div className="quote-hero__details">
                  <div className="quote-hero__detail">
                    <small>Inicial:</small>
                    <b>{formatMoney(quote.inicialMonto)}</b>
                  </div>
                  <div className="quote-hero__detail">
                    <small>Meses:</small>
                    <b>{quote.cuotas}</b>
                  </div>
                </div>
                <strong>{formatMoney(cuota)}</strong>
              </div>
            </div>

            <div className="quote-box compact">
              <div className="quote-box__head">
                <h4>Ajusta tu plan</h4>
              </div>
              <div className="quick-quotes quick-quotes--inside">
                <div className="quick-quotes__head">
                  <h5>Meses (1-36)</h5>
                  <small>Elige una cuota rapida o ajusta los valores.</small>
                </div>
                <div className="quick-list quick-list--interactive">
                  {[12, 24, 36].map((meses) => (
                    <button
                      type="button"
                      className={`quick-row-detail quick-row-detail--${loteStatusClass} ${quote.cuotas === meses ? "is-active" : ""}`}
                      key={meses}
                      onClick={() => applyMonthsPreset(meses)}
                    >
                      <strong>{formatMoney(cuotaRapida(meses, quote.inicialMonto))}</strong>
                      <span>{meses} meses</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="quote-grid">
                <div className="quote-field-block">
                  <ValidatedNumberField
                    label="Meses"
                    value={quote.cuotas}
                    min={1}
                    invalid={quoteInvalidMeses}
                    errorText="El numero de meses debe estar entre 1 y 36."
                    controlRowClassName="quote-control-row"
                    afterInput={
                      <input
                        type="range"
                        min={1}
                        max={36}
                        step={1}
                        value={Math.min(Math.max(quote.cuotas, 1), 36)}
                        onChange={(event) =>
                          onChangeQuote({ ...quote, cuotas: Number(event.target.value) })
                        }
                        className="quote-slider"
                      />
                    }
                    onChange={(next) => onChangeQuote({ ...quote, cuotas: next })}
                  />
                </div>
                <div className="quote-field-block">
                  <ValidatedNumberField
                    label="Inicial"
                    value={quote.inicialMonto}
                    min={0}
                    invalid={quoteInvalidInicial}
                    errorText="La inicial minima es S/ 6,000."
                    controlRowClassName="quote-control-row"
                    afterInput={
                      <input
                        type="range"
                        min={6000}
                        max={initialSliderMax}
                        step={500}
                        value={Math.min(Math.max(quote.inicialMonto, 6000), initialSliderMax)}
                        onChange={(event) =>
                          onChangeQuote({ ...quote, inicialMonto: Number(event.target.value) })
                        }
                        className="quote-slider"
                      />
                    }
                    onChange={(next) => onChangeQuote({ ...quote, inicialMonto: next })}
                  />
                </div>
              </div>
            </div>

            <div className="drawer-footer-actions">
              {showSaleButton && onOpenSale ? (
                <button className="btn ghost drawer-footer-btn drawer-footer-btn--secondary" onClick={onOpenSale}>
                  <IconSale />
                  <span>{saleButtonLabel}</span>
                </button>
              ) : null}
              {selectedLote.condicion !== "VENDIDO" && !hideProformaButton ? (
                <button className="btn drawer-footer-btn drawer-footer-btn--primary" onClick={onOpenProforma}>
                  <IconPlus />
                  <span>Generar proforma</span>
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="muted">Selecciona un lote para ver detalles.</p>
        )}
      </div>
    </aside>
  );
}

export default CotizadorDrawer;
