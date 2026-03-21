import { useEffect, useRef, useState, type ReactNode } from "react";

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const IconFilterOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M5 5 19 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const IconReset = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 4 20 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path
      d="M13.6 12.6 9 17.2a1 1 0 0 0 0 1.4l2.4 2.4a1 1 0 0 0 1.4 0l4.6-4.6"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10.6 20.2 8.8 22M12.3 21.3l-1.8 1.8M14 22.4l-1.8 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type DataTableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  searchPlaceholder?: string;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onClearFilters?: () => void;
  actions?: ReactNode;
};

export default function DataTableToolbar({
  searchValue,
  onSearchChange,
  onClearSearch,
  searchPlaceholder = "Buscar...",
  filtersOpen,
  onToggleFilters,
  onClearFilters,
  actions,
}: DataTableToolbarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isSearchOpen = mobileSearchOpen || Boolean(searchValue);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
  };

  const handleSearchAuxAction = () => {
    if (searchValue) {
      onClearSearch();
      return;
    }
    closeMobileSearch();
  };

  return (
    <div className={`data-table-toolbar${isSearchOpen ? " is-search-open" : ""}`}>
      {!isSearchOpen ? (
        <button
          type="button"
          className="btn ghost icon-only data-table-toolbar__search-toggle"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Buscar"
        >
          <IconSearch />
        </button>
      ) : null}

      <label className={`data-table-toolbar__search${isSearchOpen ? " is-open" : ""}`}>
        <span className="data-table-toolbar__search-icon" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
        {searchValue || isSearchOpen ? (
          <button
            type="button"
            className="btn ghost icon-only data-table-toolbar__clear-search"
            onClick={handleSearchAuxAction}
            aria-label={searchValue ? "Limpiar busqueda" : "Cerrar busqueda"}
          >
            <IconClose />
          </button>
        ) : null}
      </label>

      <div className="data-table-toolbar__actions">
        <button type="button" className="btn ghost data-table-toolbar__btn" onClick={onToggleFilters}>
          {filtersOpen ? <IconFilter /> : <IconFilterOff />}
          <span className="data-table-toolbar__btn-label">Filtros</span>
        </button>
        {onClearFilters ? (
          <button type="button" className="btn ghost data-table-toolbar__btn" onClick={onClearFilters}>
            <IconReset />
            <span className="data-table-toolbar__btn-label">Limpiar</span>
          </button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
