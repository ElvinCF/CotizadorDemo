import type { SalesClient } from "../../domain/ventas";

type SaleClientCardProps = {
  title?: string;
  cliente: SalesClient | null;
  cliente2: SalesClient | null;
  disabled?: boolean;
  onEditCliente: () => void;
  onAddCliente2: () => void;
  onEditCliente2: () => void;
  onRemoveCliente2: () => void;
};

const showValue = (value: string | undefined) => (value && value.trim() ? value : "-");

const formatClientName = (value: string | undefined) => {
  const text = value?.trim();
  if (!text) return "-";
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

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
  title = "Datos del cliente",
  cliente,
  cliente2,
  disabled = false,
  onEditCliente,
  onAddCliente2,
  onEditCliente2,
}: SaleClientCardProps) {
  const hasPrimaryClient = Boolean(cliente?.dni?.trim() || cliente?.nombreCompleto?.trim());
  const hasSecondaryClient = Boolean(cliente2?.dni?.trim() || cliente2?.nombreCompleto?.trim());
  const hasAnyClient = hasPrimaryClient || hasSecondaryClient;
  const showAddButton = !hasSecondaryClient;
  const addButtonLabel = "Agregar titular";
  const addButtonAction = hasPrimaryClient ? onAddCliente2 : onEditCliente;

  return (
    <article className="sales-form-card sales-client-card">
      <header className="sales-client-card__header">
        <h3>{title}</h3>
        {showAddButton ? (
          <button
            type="button"
            className="btn ghost sales-client-card__add-btn sales-client-card__add-btn--header"
            onClick={addButtonAction}
            disabled={disabled}
            title={addButtonLabel}
            aria-label={addButtonLabel}
          >
            <span className="sales-client-card__add-icon">+</span>
            <span className="sales-client-card__add-label">{addButtonLabel}</span>
          </button>
        ) : null}
      </header>

      <div className="sales-client-card__rows">
        {!hasAnyClient ? <p className="sales-client-card__empty">Aun no se registran titulares.</p> : null}

        {hasPrimaryClient ? (
          <article className="sales-client-card__row">
            <span className="sales-pill is-info">Titular 1</span>
            <div className="sales-client-card__identity">
              <span className="sales-client-card__dni">DNI: {showValue(cliente?.dni)}</span>
              <strong className="sales-client-card__meta">{formatClientName(cliente?.nombreCompleto)}</strong>
            </div>
            <button
              type="button"
              className="btn ghost sales-client-card__edit-btn"
              onClick={onEditCliente}
              title="Editar titular 1"
              aria-label="Editar titular 1"
              disabled={disabled}
            >
              <IconEdit />
              <span>Editar</span>
            </button>
          </article>
        ) : null}

        {hasSecondaryClient ? (
          <article className="sales-client-card__row">
            <span className="sales-pill is-warning">Titular 2</span>
            <div className="sales-client-card__identity">
              <span className="sales-client-card__dni">DNI: {showValue(cliente2?.dni)}</span>
              <strong className="sales-client-card__meta">{formatClientName(cliente2?.nombreCompleto)}</strong>
            </div>
            <button
              type="button"
              className="btn ghost sales-client-card__edit-btn"
              onClick={onEditCliente2}
              title="Editar titular 2"
              aria-label="Editar titular 2"
              disabled={disabled}
            >
              <IconEdit />
              <span>Editar</span>
            </button>
          </article>
        ) : null}
      </div>
    </article>
  );
}
