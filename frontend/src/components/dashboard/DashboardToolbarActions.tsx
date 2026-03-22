const IconPrint = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M7 8V4h10v4M7 16H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M7 14h10v6H7v-6Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconClear = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M8 10v7M12 10v7M16 10v7M6 7l1 12a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9L18 7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type DashboardToolbarActionsProps = {
  onPrint: () => void;
  onClear: () => void;
};

export default function DashboardToolbarActions({ onPrint, onClear }: DashboardToolbarActionsProps) {
  return (
    <div className="dashboard-toolbar-actions">
      <button type="button" className="btn" onClick={onPrint}>
        <IconPrint />
        <span className="dashboard-toolbar-actions__label">Imprimir PDF</span>
      </button>
      <button type="button" className="btn ghost" onClick={onClear}>
        <IconClear />
        <span className="dashboard-toolbar-actions__label">Limpiar</span>
      </button>
    </div>
  );
}
