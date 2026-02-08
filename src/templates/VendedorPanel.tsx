import type { FC } from "react";

type Lote = {
  id: string;
  mz: string;
  lote: number;
  areaM2: number | null;
  price: number | null;
  condicion: string;
  asesor?: string;
  cliente?: string;
};

type Props = {
  lotes: Lote[];
  updateOverride: (id: string, patch: { price?: number | null; condicion?: string; cliente?: string }) => void;
  formatArea: (value: number | null) => string;
  statusToClass: (value: string | undefined) => string;
};

const VendedorPanel: FC<Props> = ({ lotes, updateOverride, formatArea, statusToClass }) => (
  <section className="seller-panel">
    <h3>Panel vendedor</h3>
    <p className="muted">
      Cambia estado, precio y cliente. Se sincroniza en otras pestanas (simulado).
    </p>
    <div className="seller-table">
      <div className="seller-row header">
        <span>MZ</span>
        <span>LT</span>
        <span>AREA (M2)</span>
        <span>ASESOR</span>
        <span>PRECIO</span>
        <span>ESTADO</span>
        <span>CLIENTE(S)</span>
      </div>
      {lotes.map((lote) => (
        <div className="seller-row" key={lote.id}>
          <span>{lote.mz}</span>
          <span>{lote.lote}</span>
          <span>{formatArea(lote.areaM2)}</span>
          <span>{lote.asesor ?? "—"}</span>
          <div className="price-input">
            <span>S/</span>
            <input
              type="number"
              value={lote.price ?? ""}
              onChange={(event) =>
                updateOverride(lote.id, {
                  price: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </div>
          <select
            className={`seller-status ${statusToClass(lote.condicion)}`}
            value={lote.condicion}
            onChange={(event) => updateOverride(lote.id, { condicion: event.target.value })}
          >
            <option value="LIBRE">LIBRE</option>
            <option value="SEPARADO">SEPARADO</option>
            <option value="VENDIDO">VENDIDO</option>
          </select>
          <input
            type="text"
            value={lote.cliente ?? ""}
            onChange={(event) => updateOverride(lote.id, { cliente: event.target.value })}
          />
        </div>
      ))}
    </div>
  </section>
);

export default VendedorPanel;
