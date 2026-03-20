import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminSegmentedControl from "../../components/admin/AdminSegmentedControl";
import DataTable from "../../components/data-table/DataTable";
import DataTableFilters from "../../components/data-table/DataTableFilters";
import DataTableLoadingRows from "../../components/data-table/DataTableLoadingRows";
import DataTableShell from "../../components/data-table/DataTableShell";
import DataTableSortHeader from "../../components/data-table/DataTableSortHeader";
import DataTableToolbar from "../../components/data-table/DataTableToolbar";
import { resolveTableLoadState } from "../../components/data-table/loadState";
import type { SortState } from "../../components/data-table/types";
import { formatArea, statusToClass } from "../../domain/formatters";
import type { Lote } from "../../domain/types";
import { listSales } from "../../services/ventas";

type EditableFields = {
  price: string;
  estado: string;
};

type LotesSortKey = "mz" | "lote" | "area" | "precio" | "condicion";

type LotesFilters = {
  mz: string;
  estado: "TODOS" | "DISPONIBLE" | "SEPARADO" | "VENDIDO";
};

const normalizeStatus = (value: string | undefined) => {
  const normalized = String(value || "DISPONIBLE").toUpperCase();
  if (normalized === "SEPARADO" || normalized === "VENDIDO") return normalized;
  return "DISPONIBLE";
};

const toPriceInput = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "" : String(value);

const numberFromInput = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const emptyDraft: EditableFields = {
  price: "",
  estado: "DISPONIBLE",
};

const defaultFilters: LotesFilters = {
  mz: "TODAS",
  estado: "TODOS",
};

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconBulk = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 5v4M12 10v4M16 15v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

function LotesTablePage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [rows, setRows] = useState<Lote[]>([]);
  const [salesByLoteCode, setSalesByLoteCode] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, EditableFields>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkType, setBulkType] = useState<"MONTO" | "PORCENTAJE">("MONTO");
  const [bulkValue, setBulkValue] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<LotesFilters>(defaultFilters);
  const [sort, setSort] = useState<SortState<LotesSortKey>>({ key: "mz", direction: "asc" });

  const loadRows = async (keepNotice = true) => {
    try {
      setLoading(true);
      if (!keepNotice) setNotice("");
      const response = await fetch("/api/lotes", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { items?: Lote[] };
      setRows(Array.isArray(payload.items) ? payload.items : []);
      setError(null);
    } catch (loadError) {
      setError("No se pudo cargar la data del vendedor. Verifica la API.");
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const sales = await listSales();
        const mapping = sales.reduce<Record<string, string>>((acc, sale) => {
          const code = sale.lote?.codigo;
          if (code) {
            acc[code] = sale.id;
          }
          return acc;
        }, {});
        setSalesByLoteCode(mapping);
      } catch (loadSalesError) {
        console.error(loadSalesError);
      }
    };

    void run();
  }, []);

  const mzOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.mz)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" })),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const byMz = filters.mz === "TODAS" || row.mz === filters.mz;
      const byStatus = filters.estado === "TODOS" || normalizeStatus(row.condicion) === filters.estado;
      if (!byMz || !byStatus) return false;

      if (!term) return true;
      const raw = [row.id, row.mz, String(row.lote), String(row.price ?? ""), row.condicion]
        .join(" ")
        .toLowerCase();
      return raw.includes(term);
    });

    if (!sort.key || !sort.direction) return filtered;

    const sorted = [...filtered].sort((left, right) => {
      switch (sort.key) {
        case "mz":
          return left.mz.localeCompare(right.mz, "es", { sensitivity: "base" });
        case "lote":
          return left.lote - right.lote;
        case "area":
          return (left.areaM2 ?? -1) - (right.areaM2 ?? -1);
        case "precio":
          return (left.price ?? -1) - (right.price ?? -1);
        case "condicion":
          return normalizeStatus(left.condicion).localeCompare(normalizeStatus(right.condicion), "es", {
            sensitivity: "base",
          });
        default:
          return 0;
      }
    });

    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [filters.estado, filters.mz, query, rows, sort.direction, sort.key]);

  const readValue = (row: Lote, field: keyof EditableFields) => {
    const draft = drafts[row.id];
    if (draft) return draft[field];
    if (field === "price") return toPriceInput(row.price);
    return normalizeStatus(row.condicion);
  };

  const writeDraft = (row: Lote, field: keyof EditableFields, value: string) => {
    setDrafts((current) => {
      const base = current[row.id] ?? {
        ...emptyDraft,
        price: toPriceInput(row.price),
        estado: normalizeStatus(row.condicion),
      };
      return {
        ...current,
        [row.id]: {
          ...base,
          [field]: value,
        },
      };
    });
  };

  const isDirty = (row: Lote) => {
    const draft = drafts[row.id];
    if (!draft) return false;
    return numberFromInput(draft.price) !== (row.price ?? null) || draft.estado !== normalizeStatus(row.condicion);
  };

  const hasPendingChanges = rows.some((row) => isDirty(row));
  const canUseBulkPrices = role === "admin";
  const loadState = resolveTableLoadState(loading, visibleRows.length);

  const bulkValueNumber = numberFromInput(bulkValue);
  const bulkValueValid = bulkValueNumber != null;

  const saveRow = async (row: Lote) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    setNotice("");
    try {
      const response = await fetch(`/api/lotes/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: numberFromInput(draft.price),
          estado: normalizeStatus(draft.estado),
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { item?: Lote };
      if (payload.item) {
        setRows((current) => current.map((item) => (item.id === row.id ? payload.item! : item)));
      }
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setNotice(`Lote ${row.id} guardado`);
      setError(null);
    } catch (saveError) {
      setError(`No se pudo guardar ${row.id}`);
      console.error(saveError);
    } finally {
      setSavingId(null);
    }
  };

  const openSaleFlow = (row: Lote, targetStatus?: "SEPARADO" | "VENDIDO") => {
    const activeSaleId = salesByLoteCode[row.id];
    if (activeSaleId) {
      navigate(`/ventas/${activeSaleId}`);
      return;
    }

    const params = new URLSearchParams({ lote: row.id });
    if (targetStatus) {
      params.set("target", targetStatus);
    }
    navigate(`/ventas/nueva?${params.toString()}`);
  };

  const applyBulkPriceUpdate = async () => {
    if (!bulkValueValid) {
      setError("Ingresa un valor valido para el ajuste masivo.");
      return;
    }
    setBulkSaving(true);
    setError(null);
    setNotice("");
    try {
      const response = await fetch("/api/lotes/precios-masivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoAjuste: bulkType,
          valorAjuste: bulkValueNumber,
        }),
      });
      const rawBody = await response.text();
      let payload: {
        updatedCount?: number;
        error?: string;
        detail?: string;
      } = {};

      try {
        payload = rawBody ? (JSON.parse(rawBody) as typeof payload) : {};
      } catch {
        payload = {
          error: "Respuesta no valida del servidor",
          detail: rawBody?.slice(0, 180) || "Sin detalle",
        };
      }

      if (!response.ok) {
        const serverMessage = [payload.error, payload.detail].filter(Boolean).join(" | ");
        throw new Error(serverMessage || `HTTP ${response.status}`);
      }
      await loadRows(true);
      setNotice(`Ajuste masivo aplicado. Lotes actualizados: ${payload.updatedCount ?? 0}.`);
      setBulkConfirmOpen(false);
      setBulkModalOpen(false);
      setBulkValue("");
      setBulkType("MONTO");
    } catch (bulkError) {
      const detail = bulkError instanceof Error ? bulkError.message : "Error desconocido";
      setError(`No se pudo aplicar el ajuste masivo de precios. ${detail}`);
      console.error(bulkError);
    } finally {
      setBulkSaving(false);
    }
  };

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
    </nav>
  );

  const sortDirectionFor = (key: LotesSortKey) => (sort.key === key ? sort.direction : null);

  const handleSort = (key: LotesSortKey) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const resetFilters = () => setFilters(defaultFilters);

  const toolbarActions = (
    <>
      {canUseBulkPrices ? (
        <button type="button" className="btn ghost data-table-toolbar__btn" onClick={() => setBulkModalOpen(true)}>
          <IconBulk />
          <span className="data-table-toolbar__btn-label">Ajuste masivo</span>
        </button>
      ) : null}
      <button type="button" className="btn ghost data-table-toolbar__btn" onClick={() => loadRows(false)}>
        <IconRefresh />
        <span className="data-table-toolbar__btn-label">Refrescar</span>
      </button>
    </>
  );

  return (
    <AppShell title="Gestion de Lotes" actions={actions} contentClassName="main--data-table">
      <DataTableShell
        className="lotes-table-page"
        title="Lotes editables"
        meta={<span className="data-table-shell__count">{`${visibleRows.length} de ${rows.length}`}</span>}
        toolbar={
          <DataTableToolbar
            searchValue={query}
            onSearchChange={setQuery}
            onClearSearch={() => setQuery("")}
            searchPlaceholder="Buscar por lote, MZ o condicion"
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            onClearFilters={resetFilters}
            actions={toolbarActions}
          />
        }
        filters={
          <DataTableFilters open={filtersOpen}>
            <label className="data-table-filters__field">
              <span>Estado</span>
              <select
                value={filters.estado}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    estado: event.target.value as LotesFilters["estado"],
                  }))
                }
              >
                <option value="TODOS">Todos</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="SEPARADO">Separado</option>
                <option value="VENDIDO">Vendido</option>
              </select>
            </label>

            <label className="data-table-filters__field">
              <span>MZ</span>
              <select
                value={filters.mz}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    mz: event.target.value,
                  }))
                }
              >
                <option value="TODAS">Todas</option>
                {mzOptions.map((mz) => (
                  <option key={mz} value={mz}>
                    {mz}
                  </option>
                ))}
              </select>
            </label>
          </DataTableFilters>
        }
      >
        {error ? <p className="seller-error">{error}</p> : null}
        {notice ? (
          <p className="seller-notice">
            <span>{notice}</span>
            <button
              type="button"
              className="seller-notice__close"
              onClick={() => setNotice("")}
              aria-label="Cerrar aviso"
            >
              x
            </button>
          </p>
        ) : null}
        {hasPendingChanges ? <p className="seller-pending warn">Hay cambios sin guardar en la tabla.</p> : null}

        <DataTable className="seller-table-view">
          <table className="seller-edit-table">
            <thead>
              <tr>
                <th>
                  <DataTableSortHeader label="MZ" direction={sortDirectionFor("mz")} onToggle={() => handleSort("mz")} />
                </th>
                <th>
                  <DataTableSortHeader
                    label="LOTE"
                    direction={sortDirectionFor("lote")}
                    onToggle={() => handleSort("lote")}
                  />
                </th>
                <th>
                  <DataTableSortHeader
                    label="AREA (m2)"
                    direction={sortDirectionFor("area")}
                    onToggle={() => handleSort("area")}
                  />
                </th>
                <th>
                  <DataTableSortHeader
                    label="PRECIO"
                    direction={sortDirectionFor("precio")}
                    onToggle={() => handleSort("precio")}
                  />
                </th>
                <th>
                  <DataTableSortHeader
                    label="CONDICION"
                    direction={sortDirectionFor("condicion")}
                    onToggle={() => handleSort("condicion")}
                  />
                </th>
                <th>ACCION</th>
              </tr>
            </thead>
            <tbody>
              {loadState === "loading-initial" ? <DataTableLoadingRows colSpan={6} label="Cargando lotes" /> : null}

              {loadState === "loading-refresh" ? (
                <tr>
                  <td colSpan={6} className="data-table__refreshing">
                    Actualizando lotes...
                  </td>
                </tr>
              ) : null}

              {visibleRows.map((row) => {
                const currentStatus = readValue(row, "estado");
                const dirty = isDirty(row);
                const disabled = savingId === row.id;
                return (
                  <tr key={row.id}>
                    <td>{row.mz}</td>
                    <td>{row.lote}</td>
                    <td>{formatArea(row.areaM2)}</td>
                    <td>
                      <div className="seller-price-input">
                        <span>S/</span>
                        <input
                          type="number"
                          step="0.01"
                          value={readValue(row, "price")}
                          onChange={(event) => writeDraft(row, "price", event.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        className={`seller-status ${statusToClass(currentStatus)}`}
                        value={currentStatus}
                        onChange={(event) => {
                          const nextValue = normalizeStatus(event.target.value);
                          if (
                            nextValue !== normalizeStatus(row.condicion) &&
                            (nextValue === "SEPARADO" || nextValue === "VENDIDO")
                          ) {
                            openSaleFlow(row, nextValue);
                            return;
                          }

                          writeDraft(row, "estado", nextValue);
                        }}
                      >
                        <option value="DISPONIBLE">DISPONIBLE</option>
                        <option value="SEPARADO">SEPARADO</option>
                        <option value="VENDIDO">VENDIDO</option>
                      </select>
                    </td>
                    <td>
                      <div className="seller-row-actions">
                        <button className="btn" disabled={!dirty || disabled} onClick={() => saveRow(row)}>
                          {disabled ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={!salesByLoteCode[row.id]}
                          onClick={() => openSaleFlow(row)}
                          title={salesByLoteCode[row.id] ? "Abrir venta" : "Este lote aun no tiene venta activa"}
                        >
                          <IconSale />
                          Venta
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {loadState === "empty" ? (
                <tr>
                  <td colSpan={6} className="data-table__empty">
                    No hay lotes para el filtro aplicado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </DataTable>
      </DataTableShell>

      {bulkModalOpen ? (
        <div className="modal-backdrop" onClick={() => setBulkModalOpen(false)}>
          <div className="seller-bulk-modal" onClick={(event) => event.stopPropagation()}>
            <header className="seller-bulk-modal__header">
              <h3>Ajuste masivo de precios</h3>
            </header>
            <div className="seller-bulk-modal__body">
              <label>
                Tipo de ajuste
                <AdminSegmentedControl
                  value={bulkType}
                  options={[
                    {
                      value: "MONTO",
                      label: "Monto (S/)",
                      tone: "neutral",
                    },
                    {
                      value: "PORCENTAJE",
                      label: "Porcentaje (%)",
                      tone: "neutral",
                    },
                  ]}
                  onChange={(value) => setBulkType(value)}
                />
              </label>
              <label>
                {bulkType === "MONTO" ? "Monto (S/)" : "Porcentaje (%)"}
                <input
                  type="number"
                  step="0.01"
                  value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  placeholder={bulkType === "MONTO" ? "Ej: 250 o -250" : "Ej: 5 o -5"}
                />
              </label>
              <p className="seller-bulk-modal__notice">
                Solo se actualizaran lotes en estado <strong>DISPONIBLE</strong>.
              </p>
            </div>
            <footer className="seller-bulk-modal__footer">
              <button className="btn ghost" onClick={() => setBulkModalOpen(false)} disabled={bulkSaving}>
                Cancelar
              </button>
              <button className="btn" disabled={!bulkValueValid || bulkSaving} onClick={() => setBulkConfirmOpen(true)}>
                Guardar
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {bulkConfirmOpen ? (
        <div className="modal-backdrop" onClick={() => (bulkSaving ? null : setBulkConfirmOpen(false))}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h4>Desea confirmar los cambios?</h4>
            <p className="muted">
              Se aplicara un ajuste por {bulkType === "MONTO" ? "monto" : "porcentaje"} a lotes disponibles.
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setBulkConfirmOpen(false)} disabled={bulkSaving}>
                Cancelar
              </button>
              <button className="btn" onClick={applyBulkPriceUpdate} disabled={bulkSaving}>
                {bulkSaving ? "Aplicando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default LotesTablePage;
