import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import { useProjectContext } from "../../app/ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath } from "../../app/projectRoutes";
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
import { loadAdminLotesFromApi, loadLotesFromApi, updateLoteConfig } from "../../services/lotes";
import { listSales } from "../../services/ventas";

type EditableFields = {
  price: string;
  estado: string;
};

type LotesSortKey = "mz" | "lote" | "area" | "precio" | "condicion";

type LotesFilters = {
  mz: string;
  loteId: string;
  areaMin: number;
  areaMax: number;
  priceMin: number;
  priceMax: number;
  estado: "TODOS" | "DISPONIBLE" | "SEPARADO" | "VENDIDO";
  venta: "TODOS" | "CON_VENTA" | "SIN_VENTA";
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

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const clampBetween = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const emptyDraft: EditableFields = {
  price: "",
  estado: "DISPONIBLE",
};

const defaultFilters: LotesFilters = {
  mz: "TODAS",
  loteId: "TODOS",
  areaMin: 0,
  areaMax: 0,
  priceMin: 0,
  priceMax: 0,
  estado: "TODOS",
  venta: "TODOS",
};

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
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="9" cy="7" r="1.7" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <circle cx="14" cy="12" r="1.7" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <circle cx="11" cy="17" r="1.7" stroke="currentColor" strokeWidth="1.4" fill="none" />
  </svg>
);

const IconSale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

type LoteConfigModalProps = {
  row: Lote;
  onClose: () => void;
  onSaved: (row: Lote) => void;
};

const triStateValue = (value: boolean | null | undefined) => {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
};

function LoteConfigModal({ row, onClose, onSaved }: LoteConfigModalProps) {
  const [precioReferencial, setPrecioReferencial] = useState(toPriceInput(row.price));
  const [precioMinimo, setPrecioMinimo] = useState(toPriceInput(row.precioMinimo));
  const [estado, setEstado] = useState(normalizeStatus(row.condicion));
  const [esEsquina, setEsEsquina] = useState(triStateValue(row.esEsquina));
  const [esMedianero, setEsMedianero] = useState(triStateValue(row.esMedianero));
  const [frenteParque, setFrenteParque] = useState(triStateValue(row.frenteParque));
  const [frenteViaPrincipal, setFrenteViaPrincipal] = useState(triStateValue(row.frenteViaPrincipal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toNullableBoolean = (value: string): boolean | null =>
    value === "true" ? true : value === "false" ? false : null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateLoteConfig(row.id, {
        precioReferencial: numberFromInput(precioReferencial),
        precioMinimo: numberFromInput(precioMinimo),
        estado,
        esEsquina: toNullableBoolean(esEsquina),
        esMedianero: toNullableBoolean(esMedianero),
        frenteParque: toNullableBoolean(frenteParque),
        frenteViaPrincipal: toNullableBoolean(frenteViaPrincipal),
      });
      onSaved(updated);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar configuracion del lote.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="seller-bulk-modal seller-bulk-modal--config" onClick={(event) => event.stopPropagation()}>
        <header className="seller-bulk-modal__header">
          <h3>{`Config lote ${row.id}`}</h3>
        </header>
        <div className="seller-bulk-modal__body seller-bulk-modal__body--config">
          <label>
            Precio ref. publico
            <input type="number" step="0.01" value={precioReferencial} onChange={(event) => setPrecioReferencial(event.target.value)} />
          </label>
          <label>
            Precio minimo interno
            <input type="number" step="0.01" value={precioMinimo} onChange={(event) => setPrecioMinimo(event.target.value)} placeholder="No visible al publico" />
          </label>
          <label>
            Estado comercial
            <select value={estado} onChange={(event) => setEstado(normalizeStatus(event.target.value))}>
              <option value="DISPONIBLE">Disponible</option>
              <option value="SEPARADO">Separado</option>
              <option value="VENDIDO">Vendido</option>
            </select>
          </label>
          <label>
            Esquina
            <select value={esEsquina} onChange={(event) => setEsEsquina(event.target.value)}>
              <option value="">No definido</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            Medianero
            <select value={esMedianero} onChange={(event) => setEsMedianero(event.target.value)}>
              <option value="">No definido</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            Frente parque
            <select value={frenteParque} onChange={(event) => setFrenteParque(event.target.value)}>
              <option value="">No definido</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            Via principal
            <select value={frenteViaPrincipal} onChange={(event) => setFrenteViaPrincipal(event.target.value)}>
              <option value="">No definido</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </label>
          {error ? <p className="admin-error">{error}</p> : null}
        </div>
        <footer className="seller-bulk-modal__footer">
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Guardando..." : "Guardar config"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function LotesTablePage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { display } = useProjectContext();
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
  const [configRow, setConfigRow] = useState<Lote | null>(null);
  const [bulkType, setBulkType] = useState<"MONTO" | "PORCENTAJE">("MONTO");
  const [bulkValue, setBulkValue] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LotesFilters>(defaultFilters);
  const [sort, setSort] = useState<SortState<LotesSortKey>>({ key: "mz", direction: "asc" });

  const loadRows = async (keepNotice = true) => {
    try {
      setLoading(true);
      setRows([]);
      if (!keepNotice) setNotice("");
      const items = role === "admin"
        ? await loadAdminLotesFromApi({ slug: display.projectSlug })
        : await loadLotesFromApi({ slug: display.projectSlug });
      setRows(items);
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
  }, [display.projectSlug, role]);

  useEffect(() => {
    const run = async () => {
      try {
        setSalesByLoteCode({});
        const sales = await listSales({ slug: display.projectSlug });
        const mapping = sales.reduce<Record<string, string>>((acc, sale) => {
          if (sale.estadoVenta === "CAIDA") {
            return acc;
          }
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
  }, [display.projectSlug]);

  const mzOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.mz)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" })),
    [rows]
  );

  const loteOptions = useMemo(
    () =>
      [...rows]
        .filter((row) => row.mz === filters.mz)
        .sort((left, right) => {
          const byMz = left.mz.localeCompare(right.mz, "es", { sensitivity: "base" });
          if (byMz !== 0) return byMz;
          return left.lote - right.lote;
        })
        .map((row) => ({
          id: row.id,
          label: `${row.mz}-${row.lote}`,
        })),
    [filters.mz, rows]
  );

  const boundsSourceRows = useMemo(() => {
    return rows.filter((row) => {
      const byMz = filters.mz === "TODAS" || row.mz === filters.mz;
      const byLote = filters.loteId === "TODOS" || row.id === filters.loteId;
      return byMz && byLote;
    });
  }, [filters.loteId, filters.mz, rows]);

  const areaBounds = useMemo(() => {
    const values = boundsSourceRows
      .map((row) => toFiniteNumber(row.areaM2))
      .filter((value): value is number => value != null);
    if (values.length === 0) return { min: 0, max: 100 };
    return {
      min: Number(Math.min(...values).toFixed(2)),
      max: Number(Math.max(...values).toFixed(2)),
    };
  }, [boundsSourceRows]);

  const priceBounds = useMemo(() => {
    const values = boundsSourceRows
      .map((row) => toFiniteNumber(row.price))
      .filter((value): value is number => value != null);
    if (values.length === 0) return { min: 0, max: 1000 };
    return {
      min: Number(Math.min(...values).toFixed(2)),
      max: Number(Math.max(...values).toFixed(2)),
    };
  }, [boundsSourceRows]);

  useEffect(() => {
    setFilters((current) => {
      const nextAreaMin = Math.max(areaBounds.min, Math.min(current.areaMin || areaBounds.min, areaBounds.max));
      const nextAreaMax = Math.min(areaBounds.max, Math.max(current.areaMax || areaBounds.max, areaBounds.min));
      const nextPriceMin = Math.max(priceBounds.min, Math.min(current.priceMin || priceBounds.min, priceBounds.max));
      const nextPriceMax = Math.min(priceBounds.max, Math.max(current.priceMax || priceBounds.max, priceBounds.min));

      return {
        ...current,
        areaMin: Math.min(nextAreaMin, nextAreaMax),
        areaMax: Math.max(nextAreaMin, nextAreaMax),
        priceMin: Math.min(nextPriceMin, nextPriceMax),
        priceMax: Math.max(nextPriceMin, nextPriceMax),
      };
    });
  }, [areaBounds.max, areaBounds.min, priceBounds.max, priceBounds.min]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      areaMin: areaBounds.min,
      areaMax: areaBounds.max,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
    }));
  }, [filters.loteId, filters.mz, areaBounds.max, areaBounds.min, priceBounds.max, priceBounds.min]);

  useEffect(() => {
    setFilters((current) => {
      if (!current.mz || current.mz === "TODAS") {
        if (current.loteId === "TODOS") return current;
        return { ...current, loteId: "TODOS" };
      }

      const exists = loteOptions.some((option) => option.id === current.loteId);
      if (current.loteId === "TODOS" || exists) return current;
      return { ...current, loteId: "TODOS" };
    });
  }, [loteOptions]);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const byMz = filters.mz === "TODAS" || row.mz === filters.mz;
      const byMzResolved = !filters.mz || byMz;
      const byStatus = filters.estado === "TODOS" || normalizeStatus(row.condicion) === filters.estado;
      const byLote = filters.loteId === "TODOS" || row.id === filters.loteId;
      const areaValue = toFiniteNumber(row.areaM2);
      if (areaValue == null) return false;
      const hasAreaRange = !(filters.areaMin === 0 && filters.areaMax === 0);
      const byArea = !hasAreaRange || (areaValue >= filters.areaMin && areaValue <= filters.areaMax);
      const priceValue = toFiniteNumber(row.price);
      if (priceValue == null) return false;
      const hasPriceRange = !(filters.priceMin === 0 && filters.priceMax === 0);
      const byPrice = !hasPriceRange || (priceValue >= filters.priceMin && priceValue <= filters.priceMax);
      const hasSale = Boolean(salesByLoteCode[row.id]);
      const byVenta =
        filters.venta === "TODOS" ||
        (filters.venta === "CON_VENTA" ? hasSale : !hasSale);
      if (!byMzResolved || !byStatus || !byLote || !byArea || !byPrice || !byVenta) return false;

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
          return (toFiniteNumber(left.areaM2) ?? -1) - (toFiniteNumber(right.areaM2) ?? -1);
        case "precio":
          return (toFiniteNumber(left.price) ?? -1) - (toFiniteNumber(right.price) ?? -1);
        case "condicion":
          return normalizeStatus(left.condicion).localeCompare(normalizeStatus(right.condicion), "es", {
            sensitivity: "base",
          });
        default:
          return 0;
      }
    });

    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [
    filters.areaMax,
    filters.areaMin,
    filters.estado,
    filters.loteId,
    filters.mz,
    filters.priceMax,
    filters.priceMin,
    filters.venta,
    query,
    rows,
    salesByLoteCode,
    sort.direction,
    sort.key,
  ]);

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
      navigate(buildPrivateProjectPath(display.projectSlug, "ventas", activeSaleId));
      return;
    }

    const params = new URLSearchParams({ lote: row.id });
    if (targetStatus) {
      params.set("target", targetStatus);
    }
    navigate(`${buildPrivateProjectPath(display.projectSlug, "ventas", "nueva")}?${params.toString()}`);
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
      <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
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

  const resetFilters = () =>
    setFilters({
      ...defaultFilters,
      areaMin: areaBounds.min,
      areaMax: areaBounds.max,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
    });

  const toolbarActions = (
    <>
      {canUseBulkPrices ? (
        <button type="button" className="btn ghost data-table-toolbar__btn" onClick={() => setBulkModalOpen(true)}>
          <IconBulk />
          <span className="data-table-toolbar__btn-label">Ajuste masivo</span>
        </button>
      ) : null}
    </>
  );

  const applyConfigRow = (updated: Lote) => {
    setRows((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    setConfigRow(updated);
  };

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
          <DataTableFilters open={filtersOpen} className="data-table-filters--lotes">
            <div className="data-table-filters__group data-table-filters__group--mz-lote">
              <label className="data-table-filters__field data-table-filters__field--half">
                <span>MZ</span>
                <select
                  value={filters.mz}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      mz: event.target.value,
                      loteId: "TODOS",
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

              <label className="data-table-filters__field data-table-filters__field--half">
                <span>Lote</span>
                <select
                  value={filters.loteId}
                  disabled={!filters.mz || filters.mz === "TODAS"}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      loteId: event.target.value,
                    }))
                  }
                >
                  <option value="TODOS">Todos</option>
                  {loteOptions.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="data-table-filters__group">
              <label className="data-table-filters__field">
                <span>{`Area m2 (${areaBounds.min} - ${areaBounds.max})`}</span>
                <div className="data-table-filters__range-pair">
                  <input
                    type="number"
                    step="0.01"
                    min={areaBounds.min}
                    max={filters.areaMax}
                    value={filters.areaMin}
                    onChange={(event) => {
                      const raw = numberFromInput(event.target.value);
                      if (raw == null) return;
                      const nextMin = clampBetween(raw, areaBounds.min, filters.areaMax);
                      setFilters((current) => ({ ...current, areaMin: nextMin }));
                    }}
                    placeholder="Min m2"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={filters.areaMin}
                    max={areaBounds.max}
                    value={filters.areaMax}
                    onChange={(event) => {
                      const raw = numberFromInput(event.target.value);
                      if (raw == null) return;
                      const nextMax = clampBetween(raw, filters.areaMin, areaBounds.max);
                      setFilters((current) => ({ ...current, areaMax: nextMax }));
                    }}
                    placeholder="Max m2"
                  />
                </div>
              </label>
            </div>

            <div className="data-table-filters__group">
              <label className="data-table-filters__field">
                <span>{`Precio (S/ ${priceBounds.min} - S/ ${priceBounds.max})`}</span>
                <div className="data-table-filters__range-pair">
                  <input
                    type="number"
                    step="0.01"
                    min={priceBounds.min}
                    max={filters.priceMax}
                    value={filters.priceMin}
                    onChange={(event) => {
                      const raw = numberFromInput(event.target.value);
                      if (raw == null) return;
                      const nextMin = clampBetween(raw, priceBounds.min, filters.priceMax);
                      setFilters((current) => ({ ...current, priceMin: nextMin }));
                    }}
                    placeholder="Min S/"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={filters.priceMin}
                    max={priceBounds.max}
                    value={filters.priceMax}
                    onChange={(event) => {
                      const raw = numberFromInput(event.target.value);
                      if (raw == null) return;
                      const nextMax = clampBetween(raw, filters.priceMin, priceBounds.max);
                      setFilters((current) => ({ ...current, priceMax: nextMax }));
                    }}
                    placeholder="Max S/"
                  />
                </div>
              </label>
            </div>

            <div className="data-table-filters__group data-table-filters__group--status-venta">
              <label className="data-table-filters__field data-table-filters__field--half">
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

              <label className="data-table-filters__field data-table-filters__field--half">
                <span>Con venta / Sin venta</span>
                <select
                  value={filters.venta}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      venta: event.target.value as LotesFilters["venta"],
                    }))
                  }
                >
                  <option value="TODOS">Todos</option>
                  <option value="CON_VENTA">Con venta</option>
                  <option value="SIN_VENTA">Sin venta</option>
                </select>
              </label>
            </div>
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
                    label="ESTADO"
                    direction={sortDirectionFor("condicion")}
                    onToggle={() => handleSort("condicion")}
                  />
                </th>
                <th>ACCIONES</th>
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
                const activeSaleId = salesByLoteCode[row.id];
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
                          className={`btn ghost seller-sale-btn${activeSaleId ? " seller-sale-btn--active" : ""}`}
                          onClick={() => openSaleFlow(row)}
                          title={activeSaleId ? "Abrir venta" : "Crear venta"}
                        >
                          <IconSale />
                          {activeSaleId ? "Venta" : "Vender"}
                        </button>
                        {role === "admin" ? (
                          <button
                            type="button"
                            className="btn ghost seller-sale-btn"
                            onClick={() => setConfigRow(row)}
                            title="Configurar lote"
                          >
                            Config
                          </button>
                        ) : null}
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

      {configRow ? (
        <LoteConfigModal
          row={configRow}
          onClose={() => setConfigRow(null)}
          onSaved={applyConfigRow}
        />
      ) : null}
    </AppShell>
  );
}

export default LotesTablePage;
