import DataTable from "../data-table/DataTable";
import ValidatedNumberField from "../forms/ValidatedNumberField";
import { formatArea, formatMoney } from "../../domain/formatters";
import { projectInfo } from "../../data/projectInfo";
import type { Lote, ProformaState } from "../../domain/types";

const IconPrinter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M7 8V4h10v4M7 15h10v6H7v-6Zm12 0h2v-5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M10 11v6M14 11v6M9 4h6l1 2H8l1-2Zm-1 3h10l-1 12H8L7 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type ProformaModalProps = {
  proforma: ProformaState;
  lotesCatalog: Lote[];
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

const createRowId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `proforma-lote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function ProformaModal({
  proforma,
  lotesCatalog,
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
  const mzOptions = Array.from(new Set(lotesCatalog.map((item) => item.mz).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true, sensitivity: "base" })
  );

  const addLotRow = () => {
    onUpdate((current) => ({
      ...current,
      lotes: [
        ...current.lotes,
        {
          id: createRowId(),
          mz: "",
          lote: "",
          area: "",
          precioReferencial: 0,
        },
      ],
    }));
  };

  const updateLotMz = (rowId: string, mz: string) => {
    onUpdate((current) => ({
      ...current,
      lotes: current.lotes.map((row) =>
        row.id === rowId
          ? {
              ...row,
              mz,
              lote: "",
              area: "",
              precioReferencial: 0,
            }
          : row
      ),
    }));
  };

  const updateLotValue = (rowId: string, loteId: string) => {
    const match = lotesCatalog.find((item) => item.id === loteId);
    onUpdate((current) => ({
      ...current,
      lotes: current.lotes.map((row) =>
        row.id === rowId
          ? {
              ...row,
              mz: match?.mz ?? row.mz,
              lote: match ? String(match.lote) : "",
              area: match ? formatArea(match.areaM2) : "",
              precioReferencial: Math.max(match?.price ?? 0, 0),
            }
          : row
      ),
    }));
  };

  const removeLotRow = (rowId: string) => {
    onUpdate((current) => ({
      ...current,
      lotes: current.lotes.filter((row) => row.id !== rowId),
    }));
  };

  const totalPrecioRef = proforma.lotes.reduce((sum, row) => sum + Math.max(row.precioReferencial || 0, 0), 0);

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
            <button className="btn ghost icon-only" onClick={onPrint} aria-label="Imprimir proforma">
              <IconPrinter />
            </button>
            <button className="btn ghost" onClick={onRequestClose}>
              <IconClose /> Cerrar
            </button>
          </div>
        </div>

        <div className="proforma-body">
          <section className="proforma-section">
            <h4>Agente de ventas</h4>
            <div className="proforma-fields proforma-fields--seller">
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
            <small className="proforma-note">Autocompletado segun la sesion actual.</small>
          </section>

          <section className="proforma-section">
            <h4>Datos del cliente</h4>
            <div className="proforma-fields proforma-fields--client">
              <label className="proforma-fields__span-2">
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
            <div className="proforma-section__head">
              <h4>Proyecto y lotes</h4>
              <button className="btn ghost proforma-add-lote" type="button" onClick={addLotRow}>
                <IconPlus /> Agregar lote
              </button>
            </div>
            <div className="proforma-project-card">
              <strong>{proforma.proyecto.proyecto}</strong>
              <div className="proforma-project-card__meta">
                <div>
                  <span className="proforma-project-card__label">Etapa</span>
                  <span>{projectInfo.stage}</span>
                </div>
                <div>
                  <span className="proforma-project-card__label">Razon social</span>
                  <span>{projectInfo.owner}</span>
                </div>
                <div>
                  <span className="proforma-project-card__label">RUC</span>
                  <span>{projectInfo.ownerRuc}</span>
                </div>
                <div className="proforma-project-card__wide">
                  <span className="proforma-project-card__label">Ubicacion</span>
                  <span>{proforma.proyecto.ubicacion || "-"}</span>
                </div>
              </div>
            </div>
            <DataTable className="proforma-lote-table-view">
              <table className="sales-table proforma-lote-table">
                <thead>
                  <tr>
                    <th>MZ</th>
                    <th>Lote</th>
                    <th>Area total (m2)</th>
                    <th>Precio ref.</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {proforma.lotes.map((row) => {
                    const lotesByMz = lotesCatalog
                      .filter((item) => item.mz === row.mz)
                      .sort((a, b) => a.lote - b.lote);
                    const selectedLoteId =
                      lotesByMz.find((item) => String(item.lote) === row.lote)?.id ?? "";

                    return (
                      <tr key={row.id}>
                        <td>
                          <select value={row.mz} onChange={(event) => updateLotMz(row.id, event.target.value)}>
                            <option value="">Seleccionar</option>
                            {mzOptions.map((mz) => (
                              <option key={mz} value={mz}>
                                {mz}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={selectedLoteId}
                            disabled={!row.mz}
                            onChange={(event) => updateLotValue(row.id, event.target.value)}
                          >
                            <option value="">Seleccionar</option>
                            {lotesByMz.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.lote}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{row.area || "-"}</td>
                        <td>{formatMoney(row.precioReferencial)}</td>
                        <td>
                          <button
                            className="btn ghost icon-only"
                            type="button"
                            onClick={() => removeLotRow(row.id)}
                            aria-label="Eliminar lote"
                          >
                            <IconTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total precio referencial</td>
                    <td>{formatMoney(totalPrecioRef)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </DataTable>
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
                  <label className="proforma-manual__field">
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
                  <label className="proforma-manual__field">
                    Descuento (S/)
                    <input
                      type="number"
                      min={0}
                      value={proforma.descuentoSoles}
                      onChange={(event) => onDiscountSoles(Number(event.target.value || 0))}
                    />
                  </label>
                  <label className="proforma-manual__field">
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
                  <label className="proforma-manual__field">
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
