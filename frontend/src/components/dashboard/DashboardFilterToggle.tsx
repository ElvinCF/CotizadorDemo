const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconFilterOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 5 19 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

type DashboardFilterToggleProps = {
  open: boolean;
  controlsId: string;
  onToggle: () => void;
  mobile?: boolean;
};

export default function DashboardFilterToggle({
  open,
  controlsId,
  onToggle,
  mobile = false,
}: DashboardFilterToggleProps) {
  return (
    <button
      type="button"
      className={`btn ghost topbar-action dashboard-filter-toggle${mobile ? " dashboard-filter-toggle--mobile" : ""}${
        open ? " is-active" : ""
      }`}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={open ? "Ocultar filtros" : "Mostrar filtros"}
    >
      {open ? <IconFilter /> : <IconFilterOff />}
      {mobile ? null : <span className="dashboard-filter-toggle__label">Filtros</span>}
    </button>
  );
}
