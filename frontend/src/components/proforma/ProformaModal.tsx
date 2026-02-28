import ValidatedNumberField from "../forms/ValidatedNumberField";
import { formatMoney } from "../../domain/formatters";
import type { ProformaState } from "../../domain/types";

type ProformaModalProps = {
  proforma: ProformaState;
  proformaInvalidInicial: boolean;
  proformaInvalidMeses: boolean;
  precioFinanciarRegular: number;
  precioFinanciarPromo: number;
  proformaCuotaRegular: number;
  proformaCuotaPromo: number;
  proformaAhorro: number;
  cuotasRapidas: (monto: number) => Record<12 | 24 | 36, number>;
  onBackdropClose: () => void;
  onPrint: () => void;
  onRequestClose: () => void;
  onUpdate: (updater: (current: ProformaState) => ProformaState) => void;
  onDiscountSoles: (value: number) => void;
  onDiscountPct: (value: number) => void;
  onPromoPrice: (value: number) => void;
};

function ProformaModal({
  proforma,
  proformaInvalidInicial,
  proformaInvalidMeses,
  precioFinanciarRegular,
  precioFinanciarPromo,
  proformaCuotaRegular,
  proformaCuotaPromo,
  proformaAhorro,
  cuotasRapidas,
  onBackdropClose,
  onPrint,
  onRequestClose,
  onUpdate,
  onDiscountSoles,
  onDiscountPct,
  onPromoPrice,
}: ProformaModalProps) {
  return (
    <div className="modal-backdrop" onClick={onBackdropClose}>
      <div className="proforma-modal" onClick={(event) => event.stopPropagation()}>
        <div className="proforma-header">
          <div>
            <h3>Proforma Arenas Malabrigo</h3>
            <p className="muted">
              {new Date(proforma.creadoEn).toLocaleString("es-PE")} · Vendedor: {proforma.vendedor.nombre || "-"}
            </p>
          </div>
          <div className="proforma-actions">
            <button className="btn ghost" onClick={onPrint}>
              Imprimir
            </button>
            <button className="btn ghost" onClick={onRequestClose}>
              Cerrar
            </button>
          </div>
        </div>
        <div className="proforma-body">
          <section className="proforma-section">
            <h4>Agente de ventas</h4>
            <div className="proforma-fields two-cols">
              <label>
                Nombre
                <input
                  type="text"
                  value={proforma.vendedor.nombre}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      vendedor: { ...current.vendedor, nombre: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Numero
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\\d{9}"
                  value={proforma.vendedor.celular}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      vendedor: { ...current.vendedor, celular: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
          </section>
          <section className="proforma-section">
            <h3>Datos del cliente</h3>
            <div className="proforma-fields two-cols">
              <label>
                Nombre completo
                <input
                  type="text"
                  required
                  value={proforma.cliente.nombre}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      cliente: { ...current.cliente, nombre: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                DNI
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\\d{8}"
                  required
                  value={proforma.cliente.dni}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      cliente: { ...current.cliente, dni: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Celular
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\\d{9}"
                  required
                  value={proforma.cliente.celular}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      cliente: { ...current.cliente, celular: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Direccion
                <input
                  type="text"
                  value={proforma.cliente.direccion}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      cliente: { ...current.cliente, direccion: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Correo
                <input
                  type="email"
                  value={proforma.cliente.correo}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      cliente: { ...current.cliente, correo: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="proforma-section">
            <h4>Informacion del lote</h4>
            <div className="proforma-fields two-cols">
              <label>
                Proyecto / Urbanizacion
                <span className="proforma-value">{proforma.lote.proyecto}</span>
              </label>
              <label>
                Manzana
                <span className="proforma-value">{proforma.lote.mz}</span>
              </label>
              <label>
                Lote
                <span className="proforma-value">{proforma.lote.lote}</span>
              </label>
              <label>
                Area total (m2)
                <span className="proforma-value">{proforma.lote.area}</span>
              </label>
              <label>
                Ubicacion referencial
                <span className="proforma-value">{proforma.lote.ubicacion}</span>
              </label>
            </div>
          </section>

          <section className="proforma-section">
            <div className="proforma-section__head">
              <h4>Cotizacion manual</h4>
              <span className="muted">Solo para el vendedor</span>
            </div>
            <div className="proforma-manual">
              <div className="proforma-manual__block">
                <h5>Preguntar a cliente</h5>
                <div className="proforma-fields manual-cols">
                  <ValidatedNumberField
                    label="Inicial (S/)"
                    value={proforma.inicial}
                    min={0}
                    invalid={proformaInvalidInicial}
                    errorText="La inicial minima es S/ 6,000."
                    onChange={(next) =>
                      onUpdate((current) => ({
                        ...current,
                        inicial: next,
                      }))
                    }
                  />
                  <label>
                    Separacion (S/)
                    <input
                      type="number"
                      min={0}
                      value={proforma.separacion}
                      onChange={(event) =>
                        onUpdate((current) => ({
                          ...current,
                          separacion: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <ValidatedNumberField
                    label="Meses (1 a 36)"
                    value={proforma.meses}
                    min={1}
                    invalid={proformaInvalidMeses}
                    errorText="El numero de meses debe estar entre 1 y 36."
                    onChange={(next) =>
                      onUpdate((current) => ({
                        ...current,
                        meses: next,
                      }))
                    }
                  />
                </div>
                <small>Inicial minimo S/ 6,000</small>
              </div>
              <div className="proforma-manual__block">
                <h5>Solo vendedor</h5>
                <div className="proforma-fields manual-cols">
                  <label>
                    Descuento (S/)
                    <input
                      type="number"
                      min={0}
                      value={proforma.descuentoSoles}
                      onChange={(event) => onDiscountSoles(Number(event.target.value || 0))}
                    />
                  </label>
                  <label>
                    Descuento (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={proforma.descuentoPct}
                      onChange={(event) => onDiscountPct(Number(event.target.value || 0))}
                    />
                  </label>
                  <label>
                    Precio promocional
                    <input
                      type="number"
                      min={0}
                      value={proforma.precioPromocional}
                      onChange={(event) => onPromoPrice(Number(event.target.value || 0))}
                    />
                  </label>
                </div>
                <label className="manual-inline">
                  Duracion de la promocion (dias)
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={proforma.diasVigencia}
                    onChange={(event) =>
                      onUpdate((current) => ({
                        ...current,
                        diasVigencia: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
                <small>Valido hasta {proforma.fechaCaducidad}</small>
              </div>
            </div>
          </section>

          <section className="proforma-section">
            <h4>Resumen de precios</h4>
            <div className="proforma-price-grid">
              <article className="proforma-price-card">
                <h5>Precio regular</h5>
                <div className="price">{formatMoney(proforma.precioRegular)}</div>
                <div className="price-list">
                  <div>
                    <span>Separacion</span>
                    <strong>{formatMoney(proforma.separacion)}</strong>
                  </div>
                  <div>
                    <span>Inicial</span>
                    <strong>{formatMoney(proforma.inicial)}</strong>
                  </div>
                  <div>
                    <span>Precio a financiar</span>
                    <strong>{formatMoney(precioFinanciarRegular)}</strong>
                  </div>
                </div>
                <div className="proforma-quick">
                  <span>Cotizado rapido de pago mensual</span>
                  <div>
                    <span>12 meses</span>
                    <strong>{formatMoney(cuotasRapidas(precioFinanciarRegular)[12])}</strong>
                  </div>
                  <div>
                    <span>24 meses</span>
                    <strong>{formatMoney(cuotasRapidas(precioFinanciarRegular)[24])}</strong>
                  </div>
                  <div>
                    <span>36 meses</span>
                    <strong>{formatMoney(cuotasRapidas(precioFinanciarRegular)[36])}</strong>
                  </div>
                </div>
                <div className="proforma-monthly">
                  Pago mensual en {proforma.meses} meses: <strong>{formatMoney(proformaCuotaRegular)}</strong>
                </div>
              </article>
              <article className="proforma-price-card promo">
                <h5>Precio promocional</h5>
                <div className="price">{formatMoney(proforma.precioPromocional)}</div>
                <div className="price-list">
                  <div>
                    <span>Separacion</span>
                    <strong>{formatMoney(proforma.separacion)}</strong>
                  </div>
                  <div>
                    <span>Inicial</span>
                    <strong>{formatMoney(proforma.inicial)}</strong>
                  </div>
                  <div>
                    <span>Precio a financiar</span>
                    <strong>{formatMoney(precioFinanciarPromo)}</strong>
                  </div>
                </div>
                <div className="proforma-quick">
                  <span>Cotizado rapido de pago mensual</span>
                  <div>
                    <span>12 meses</span>
                    <strong>{formatMoney(cuotasRapidas(precioFinanciarPromo)[12])}</strong>
                  </div>
                  <div>
                    <span>24 meses</span>
                    <strong>{formatMoney(cuotasRapidas(precioFinanciarPromo)[24])}</strong>
                  </div>
                  <div>
                    <span>36 meses</span>
                    <strong>{formatMoney(cuotasRapidas(precioFinanciarPromo)[36])}</strong>
                  </div>
                </div>
                <div className="proforma-monthly">
                  Pago mensual en {proforma.meses} meses: <strong>{formatMoney(proformaCuotaPromo)}</strong>
                </div>
              </article>
            </div>
            <div className="proforma-summary">
              Ahorro en: <strong>{formatMoney(proformaAhorro)}</strong>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProformaModal;
