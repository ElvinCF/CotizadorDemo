import { useEffect, useState } from "react";
import ValidatedNumberField from "../forms/ValidatedNumberField";
import { formatArea, formatMoney, statusToClass } from "../../domain/formatters";
import type { Lote, QuoteState } from "../../domain/types";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type PlusvaliaPoint = {
  label: string;
  value: number;
  growth: number;
};

const PLUSVALIA_MILESTONES: Array<{ label: string; growth: number }> = [
  { label: "Hoy", growth: 0 },
  // Escenario comercial acumulativo (ajustable): el salto fuerte ocurre en el corto plazo.
  { label: "Fin 2026", growth: 0.215 },
  { label: "2030", growth: 0.242 },
  { label: "2035", growth: 0.312 },
  { label: "2040", growth: 0.386 },
];

const formatMoneyK = (value: number) => `S/ ${Math.round(Math.max(value, 0) / 1000)}k`;

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
  const plusvaliaBase = Math.max(totalPrecioRef || precioLote || 0, 0);

  const plusvaliaSeries = PLUSVALIA_MILESTONES.reduce<PlusvaliaPoint[]>((acc, milestone, idx) => {
    if (idx === 0) {
      acc.push({ label: milestone.label, value: plusvaliaBase, growth: 0 });
      return acc;
    }
    const prevValue = acc[idx - 1]?.value ?? plusvaliaBase;
    acc.push({
      label: milestone.label,
      value: Math.round(prevValue * (1 + milestone.growth)),
      growth: milestone.growth,
    });
    return acc;
  }, []);

  const plusvaliaFinal = plusvaliaSeries.at(-1)?.value ?? plusvaliaBase;
  const plusvaliaGain = Math.max(plusvaliaFinal - plusvaliaBase, 0);
  const plusvaliaGainPct = plusvaliaBase > 0 ? (plusvaliaGain / plusvaliaBase) * 100 : 0;
  const yMin = Math.max(plusvaliaBase, 0);
  const yMax = Math.max(plusvaliaFinal, yMin + 1);
  const [plusvaliaGlow, setPlusvaliaGlow] = useState(false);

  useEffect(() => {
    if (plusvaliaBase <= 0) return;
    setPlusvaliaGlow(true);
    const timer = window.setTimeout(() => setPlusvaliaGlow(false), 760);
    return () => window.clearTimeout(timer);
  }, [plusvaliaBase, plusvaliaFinal, plusvaliaGainPct]);

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
                      <td
                        className={`drawer-selected-lotes-table__price drawer-selected-lotes-table__price--${statusToClass(
                          lote.condicion
                        )}`}
                      >
                        {formatMoney(lote.price)}
                      </td>
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
                <div className="quote-hero__value-block">
                  <span className="quote-hero__eyebrow">Tu cuota mensual estimada</span>
                  <strong>{formatMoney(cuota)}</strong>
                </div>
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

            <section className="quote-plusvalia-card" aria-label="Proyeccion de plusvalia">
              <div className="quote-plusvalia-card__head">
                <h4>
                  Plusvalía proyectada en{" "}
                  <em className={plusvaliaGlow ? "quote-plusvalia-card__glow-text" : ""}>{`+${plusvaliaGainPct.toFixed(1)}%`}</em>
                </h4>
                <div className="quote-plusvalia-card__meta">
                  <span>Por un valor de</span>
                  <strong className={plusvaliaGlow ? "quote-plusvalia-card__glow-text" : ""}>{formatMoney(plusvaliaGain)}</strong>
                </div>
              </div>
              <div className="quote-plusvalia-card__chart">
                <ResponsiveContainer width="100%" height={182}>
                  <AreaChart data={plusvaliaSeries} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="plusvaliaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="color-mix(in srgb, var(--color-primary) 14%, transparent)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      padding={{ right: 8 }}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      domain={[yMin, yMax]}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      tickFormatter={(value) => formatMoneyK(Number(value))}
                    />
                    <Tooltip
                      cursor={{ stroke: "color-mix(in srgb, var(--color-success) 50%, transparent)", strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const value = Number(payload[0]?.value ?? 0);
                        const pct = plusvaliaBase > 0 ? ((value / plusvaliaBase - 1) * 100) : 0;
                        return (
                          <div className="quote-plusvalia-tooltip">
                            <div className="quote-plusvalia-tooltip__row">
                              <span>Valor</span>
                              <strong>{formatMoney(value)}</strong>
                            </div>
                            <div className="quote-plusvalia-tooltip__row quote-plusvalia-tooltip__row--pct">
                              <span>Plusvalía</span>
                              <strong>{`${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}</strong>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="none" fill="url(#plusvaliaGradient)" />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-success)"
                      strokeWidth={2.6}
                      dot={{ r: 4, fill: "var(--color-success)", stroke: "var(--color-surface)", strokeWidth: 1.4 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="quote-plusvalia-card__note">
                Proyección referencial de crecimiento del valor del lote para apoyar una decisión de compra con visión de mediano y largo plazo.
              </p>
            </section>
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
