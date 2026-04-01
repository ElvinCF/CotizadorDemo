import ValidatedNumberField from "../forms/ValidatedNumberField";
import { formatArea, formatMoney, statusToClass } from "../../domain/formatters";
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

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M10 11v6M14 11v6M9 4h6l1 2H8l1-2Zm-1 3h10l-1 12H8L7 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
  selectedLotes: Lote[];
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
  onRemoveSelectedLot: (loteId: string) => void;
  hideProformaButton?: boolean;
  showSaleButton?: boolean;
  saleButtonDisabled?: boolean;
  saleButtonLabel?: string;
  saleButtonTitle?: string;
};

function CotizadorDrawer({
  rightOpen,
  selectedLote,
  selectedLotes,
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
  onRemoveSelectedLot,
  hideProformaButton = false,
  showSaleButton = false,
  saleButtonDisabled = false,
  saleButtonLabel = "Crear venta",
  saleButtonTitle,
}: CotizadorDrawerProps) {
  const lotesSeleccionados = selectedLotes.length > 0 ? selectedLotes : selectedLote ? [selectedLote] : [];
  const loteBase = selectedLote ?? lotesSeleccionados[0] ?? null;
  const precioLote = quote.precio ?? 0;
  const loteStatusClass = statusToClass(loteBase?.condicion);
  const totalPrecioRef = lotesSeleccionados.reduce((sum, lote) => sum + Math.max(Number(lote.price ?? 0), 0), 0);
  const showTotalsRow = lotesSeleccionados.length > 1;
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
        </div>
        <div className="drawer__header-actions">
          <button className="btn ghost drawer-close-btn" onClick={onClose} aria-label="Cerrar cotizador">
            <IconClose />
            <span>Cerrar</span>
          </button>
        </div>
      </div>
      <div className="cotizador-drawer__content">
        <div className="drawer__body">
          {lotesSeleccionados.length > 0 ? (
            <>
            <section className="drawer-selected-lotes-table" aria-label="Lotes seleccionados">
              <table className="drawer-selected-lotes-grid">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Precio m2</th>
                    <th>Area m2</th>
                    <th>Precio ref.</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lotesSeleccionados.map((lote) => (
                    <tr key={lote.id} className={!showTotalsRow ? "is-single" : ""}>
                      <td className="drawer-selected-lotes-grid__lote">{lote.id}</td>
                      <td className="drawer-selected-lotes-grid__price-m2">
                        {lote.areaM2 && lote.areaM2 > 0 ? formatMoney((lote.price ?? 0) / lote.areaM2) : "-"}
                      </td>
                      <td className="drawer-selected-lotes-grid__area">{formatArea(lote.areaM2)}</td>
                      <td className="drawer-selected-lotes-table__price">{formatMoney(lote.price)}</td>
                      <td className="drawer-selected-lotes-grid__actions">
                        <button className="btn ghost icon-only" type="button" onClick={() => onRemoveSelectedLot(lote.id)} aria-label={`Quitar ${lote.id}`}>
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {showTotalsRow ? (
                  <tfoot>
                    <tr>
                      <td className="drawer-selected-lotes-table__footer-label">Total</td>
                      <td />
                      <td />
                      <td className="drawer-selected-lotes-table__price"><strong>{formatMoney(totalPrecioRef)}</strong></td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </section>

            <div className={`quote-hero quote-hero--${loteStatusClass} ${pulseMz || pulseLote ? "quote-hero--pulse" : ""}`}>
              <div className="quote-hero__head">
                <span className="quote-hero__eyebrow">Tu cuota estimada mensual</span>
              </div>
              <div className="quote-hero__content">
                <div className="quote-hero__details">
                  <div className="quote-hero__detail">
                    <small>Inicial</small>
                    <b>{formatMoney(quote.inicialMonto)}</b>
                  </div>
                  <div className="quote-hero__detail">
                    <small>Meses</small>
                    <b>{quote.cuotas}</b>
                  </div>
                </div>
                <strong>{formatMoney(cuota)}</strong>
              </div>
            </div>

            <div className="quote-box compact">
              <div className="quote-box__head">
                <h4>Ajusta tu plan</h4>
                <small className="quote-box__hint">: Elige una cuota rapida o ajusta los valores.</small>
              </div>
              <div className="quick-quotes quick-quotes--inside">
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
            </>
          ) : (
            <p className="muted">Selecciona un lote para ver detalles.</p>
          )}
        </div>
        {lotesSeleccionados.length > 0 ? (
          <div className="cotizador-drawer__footer">
            <div className="drawer-footer-actions">
              {showSaleButton && onOpenSale ? (
                <button
                  className={`btn drawer-footer-btn ${saleButtonLabel === "Ver venta" ? "drawer-footer-btn--existing" : "drawer-footer-btn--secondary"}`}
                  onClick={onOpenSale}
                  disabled={saleButtonDisabled}
                  title={saleButtonTitle}
                >
                  <IconSale />
                  <span>{saleButtonLabel}</span>
                </button>
              ) : null}
              {!hideProformaButton ? (
                <button className="btn drawer-footer-btn drawer-footer-btn--primary" onClick={onOpenProforma}>
                  <IconPlus />
                  <span>Generar proforma</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default CotizadorDrawer;
