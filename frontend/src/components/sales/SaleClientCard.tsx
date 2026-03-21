import type { SalesClient } from "../../domain/ventas";

type SaleClientCardProps = {
  cliente: SalesClient | null;
  cliente2: SalesClient | null;
  disabled?: boolean;
  onEditCliente: () => void;
  onAddCliente2: () => void;
  onEditCliente2: () => void;
  onRemoveCliente2: () => void;
};

const showValue = (value: string | undefined) => (value && value.trim() ? value : "-");

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M4 20h4l10-10a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="m12.5 7.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export default function SaleClientCard({
  cliente,
  cliente2,
  disabled = false,
  onEditCliente,
  onAddCliente2,
  onEditCliente2,
}: SaleClientCardProps) {
  return (
    <article className="sales-form-card sales-client-card">
      <header className="sales-client-card__header">
        <h3>Titulares</h3>
      </header>

      <div className="sales-client-card__rows">
        <article className="sales-client-card__row">
          <span className="sales-pill is-info">Titular principal</span>
          <div className="sales-client-card__identity">
            <strong className="sales-client-card__name">{showValue(cliente?.nombreCompleto)}</strong>
            <span className="sales-client-card__dni">DNI: {showValue(cliente?.dni)}</span>
          </div>
          <button
            type="button"
            className="btn ghost sales-client-card__edit-btn"
            onClick={onEditCliente}
            title="Editar titular principal"
            disabled={disabled}
          >
            <IconEdit />
            <span>Editar</span>
          </button>
        </article>

        {cliente2 ? (
          <article className="sales-client-card__row">
            <span className="sales-pill is-warning">Titular 2</span>
            <div className="sales-client-card__identity">
              <strong className="sales-client-card__name">{showValue(cliente2.nombreCompleto)}</strong>
              <span className="sales-client-card__dni">DNI: {showValue(cliente2.dni)}</span>
            </div>
            <button
              type="button"
              className="btn ghost sales-client-card__edit-btn"
              onClick={onEditCliente2}
              title="Editar segundo titular"
              disabled={disabled}
            >
              <IconEdit />
              <span>Editar</span>
            </button>
          </article>
        ) : null}
      </div>

      {!cliente2 ? (
        <footer className="sales-client-card__footer">
          <button type="button" className="btn ghost sales-client-card__add-btn" onClick={onAddCliente2} disabled={disabled}>
            + Agregar titular
          </button>
        </footer>
      ) : null}
    </article>
  );
}
