import ValidatedNumberField from "../forms/ValidatedNumberField";
import { formatArea, formatMoney, normalizeStatusLabel, statusToClass } from "../../domain/formatters";
import type { Lote, QuoteState } from "../../domain/types";

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
  onChangeQuote: (next: QuoteState) => void;
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
  onChangeQuote,
}: CotizadorDrawerProps) {
  return (
    <aside className={`drawer-panel right ${rightOpen ? "open" : ""}`}>
      <div className="drawer__header">
        <h3>Cotizador</h3>
        <div className="drawer__header-actions">
          <button className="btn ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
      <div className="drawer__body">
        {selectedLote ? (
          <>
            <div className="drawer-chips">
              <span className={`chip chip-emphasis ${pulseMz ? "pulse" : ""}`}>MZ {selectedLote.mz}</span>
              <span className={`chip chip-emphasis ${pulseLote ? "pulse" : ""}`}>Lote {selectedLote.lote}</span>
              <span className={`chip status-pill ${statusToClass(selectedLote.condicion)}`}>
                {normalizeStatusLabel(selectedLote.condicion)}
              </span>
            </div>
            {selectedLote.asesor ? (
              <div className="drawer-lote-headline">
                <div>
                  <span>Asesor</span>
                  <strong>{selectedLote.asesor}</strong>
                </div>
              </div>
            ) : null}

            <div className="drawer-cards">
              <div className="drawer-card area-card">
                <span>Area total</span>
                <strong>{formatArea(selectedLote.areaM2)}</strong>
              </div>
              <div className="drawer-card price-card">
                <span>Precio del lote</span>
                <strong>{formatMoney(selectedLote.price)}</strong>
              </div>
            </div>

            <div className="quick-quotes">
              <h4>Cuotas rapidas (inicial fija {formatMoney(quote.inicialMonto)})</h4>
              <div className="quick-list">
                {[12, 24, 36].map((meses) => (
                  <div className="quick-row-detail" key={meses}>
                    <span>{meses} meses</span>
                    <strong>{formatMoney(cuotaRapida(meses, quote.inicialMonto))}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="quote-box compact">
              <h4>Cotizacion manual</h4>
              <div className="quote-grid">
                <ValidatedNumberField
                  label="Inicial (S/)"
                  value={quote.inicialMonto}
                  min={0}
                  invalid={quoteInvalidInicial}
                  errorText="La inicial minima es S/ 6,000."
                  onChange={(next) => onChangeQuote({ ...quote, inicialMonto: next })}
                />
                <ValidatedNumberField
                  label="Meses (1 a 36)"
                  value={quote.cuotas}
                  min={1}
                  invalid={quoteInvalidMeses}
                  errorText="El numero de meses debe estar entre 1 y 36."
                  onChange={(next) => onChangeQuote({ ...quote, cuotas: next })}
                />
              </div>
              <div className="quote-highlight">
                <span>Cuota mensual estimada</span>
                <strong>{formatMoney(cuota)}</strong>
                <small>Formula: (Precio - Inicial) / Meses</small>
              </div>
            </div>

            <div className="drawer-hidden-content" aria-hidden="true">
              <div className="client-form">
                <h4>Separar lote</h4>
                <label>
                  Nombre completo
                  <input placeholder="Cliente" />
                </label>
                <label>
                  DNI
                  <input placeholder="Documento" />
                </label>
                <label>
                  Telefono
                  <input placeholder="+51 ..." />
                </label>
                <label>
                  Email
                  <input placeholder="correo@ejemplo.com" />
                </label>
                <label>
                  Comentarios
                  <textarea placeholder="Detalle adicional" rows={3} />
                </label>
                <div className="drawer-actions">
                  <button className="btn primary">Registrar interes</button>
                  <button className="btn ghost">Contactar asesor</button>
                </div>
              </div>
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
