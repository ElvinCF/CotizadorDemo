import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminSegmentedControl from "../../components/admin/AdminSegmentedControl";
import { statusToClass } from "../../domain/formatters";
import type { Lote } from "../../domain/types";

type EditableFields = {
  price: string;
  estado: string;
};

const formatArea = (value: number | null) => (value == null ? "-" : value.toFixed(2));

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

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconBulk = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 5v4M12 10v4M16 15v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

function LotesTablePage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Lote[]>([]);
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

  const loadRows = async (keepNotice = true) => {
    try {
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
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const raw = [row.id, row.mz, String(row.lote), String(row.price ?? ""), row.condicion]
        .join(" ")
        .toLowerCase();
      return raw.includes(term);
    });
  }, [query, rows]);

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
    return (
      numberFromInput(draft.price) !== (row.price ?? null) ||
      draft.estado !== normalizeStatus(row.condicion)
    );
  };

  const hasPendingChanges = rows.some((row) => isDirty(row));
  const canUseBulkPrices = role === "admin";

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

  return (
    <AppShell title="Gestion de Lotes" actions={actions} contentClassName="main--seller">
      <section className="seller-page">
        <div className="seller-page__head">
          <div className="seller-page__head-main">
            <div className="seller-toolbar">
              <div className="seller-search-block">
                <label htmlFor="seller-search">Buscar en la tabla</label>
                <div className="seller-search-input">
                  <span className="seller-search-input__icon" aria-hidden="true">
                    <IconSearch />
                  </span>
                  <input
                    id="seller-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por lote o condicion"
                  />
                </div>
              </div>

              <div className="seller-toolbar__actions">
                {canUseBulkPrices ? (
                  <button className="btn ghost seller-bulk-btn seller-bulk-btn--desktop" onClick={() => setBulkModalOpen(true)}>
                    <IconBulk />
                    <span>Ajuste masivo</span>
                  </button>
                ) : null}
                <div className="seller-page__actions">
                  <button className="btn ghost" onClick={() => loadRows(false)} aria-label="Refrescar tabla">
                    <IconRefresh />
                    <span className="seller-refresh-label">Refrescar</span>
                  </button>
                </div>
              </div>
            </div>

            {canUseBulkPrices ? (
              <div className="seller-toolbar seller-toolbar--mobile-secondary">
                <button className="btn ghost seller-bulk-btn" onClick={() => setBulkModalOpen(true)}>
                  <IconBulk />
                  <span>Ajuste masivo</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? <p className="muted">Cargando lotes...</p> : null}
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
        {hasPendingChanges ? (
          <p className="seller-pending warn">Hay cambios sin guardar en la tabla.</p>
        ) : null}

        <div className="seller-table-wrap">
          <table className="seller-edit-table">
            <thead>
              <tr>
                <th>MZ</th>
                <th>LOTE</th>
                <th>AREA (m2)</th>
                <th>PRECIO</th>
                <th>CONDICION</th>
                <th>ACCION</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
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
                        onChange={(event) => writeDraft(row, "estado", event.target.value)}
                      >
                        <option value="DISPONIBLE">DISPONIBLE</option>
                        <option value="SEPARADO">SEPARADO</option>
                        <option value="VENDIDO">VENDIDO</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn" disabled={!dirty || disabled} onClick={() => saveRow(row)}>
                        {disabled ? "Guardando..." : "Guardar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
