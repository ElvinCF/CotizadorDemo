import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import Papa from "papaparse";
import LotesSvg from "./components/LotesSvg";
import "./App.css";

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

type CsvRow = {
  MZ?: string;
  LOTE?: string;
  AREA?: string;
  PRECIO?: string;
  CONDICION?: string;
  ASESOR?: string;
};

type LoteOverride = {
  price?: number | null;
  condicion?: string;
  cliente?: string;
};

type QuoteState = {
  precio: number;
  inicialMonto: number;
  cuotas: number;
  interesAnual: number;
};

type OverlayTransform = {
  x: number;
  y: number;
  scale: number;
};

const OVERRIDES_KEY = "arenas.lotes.overrides.v1";
const HISTORY_KEY = "arenas.lotes.history.v1";

const defaultQuote: QuoteState = {
  precio: 0,
  inicialMonto: 10000,
  cuotas: 24,
  interesAnual: 0,
};

const defaultOverlay: OverlayTransform = {
  x: 94,
  y: 14,
  scale: 0.82,
};

const statusToClass = (value: string | undefined) => {
  switch ((value || "").toUpperCase()) {
    case "SEPARADO":
      return "separado";
    case "VENDIDO":
      return "vendido";
    default:
      return "libre";
  }
};

const cleanNumber = (value: string | undefined) => {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toLoteId = (mz: string, lote: number) => `${mz}-${String(lote).padStart(2, "0")}`;

const loadOverrides = (): Record<string, LoteOverride> => {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LoteOverride>;
  } catch {
    return {};
  }
};

const saveOverrides = (overrides: Record<string, LoteOverride>) => {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
};

const appendHistory = (entry: string) => {
  const now = new Date().toISOString();
  const line = `${now} | ${entry}`;
  const raw = localStorage.getItem(HISTORY_KEY);
  const history = raw ? (JSON.parse(raw) as string[]) : [];
  history.unshift(line);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
};

const formatMoney = (value: number | null) => {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatArea = (value: number | null) => {
  if (value == null) return "-";
  return `${value.toFixed(2)} m2`;
};

const quoteMonthly = (monto: number, cuotas: number, interesAnual: number) => {
  if (cuotas <= 0) return 0;
  const i = interesAnual / 12 / 100;
  if (i <= 0) return monto / cuotas;
  const factor = (i * Math.pow(1 + i, cuotas)) / (Math.pow(1 + i, cuotas) - 1);
  return monto * factor;
};

const buildIdSet = (items: Lote[]) => new Set(items.map((item) => item.id));

const applyOverrides = (items: Lote[], overrides: Record<string, LoteOverride>) =>
  items.map((item) => ({
    ...item,
    ...overrides[item.id],
  }));

const overlayStyle = (transform: OverlayTransform) => ({
  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
  transformOrigin: "top left",
});

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rawLotes, setRawLotes] = useState<Lote[]>([]);
  const [overrides, setOverrides] = useState<Record<string, LoteOverride>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [quote, setQuote] = useState<QuoteState>(defaultQuote);
  const [filters, setFilters] = useState({
    mz: "",
    status: "TODOS",
    priceMin: "",
    priceMax: "",
    areaMin: "",
    areaMax: "",
  });
  const [view, setView] = useState<"mapa" | "tabla">("mapa");
  const [overlay, setOverlay] = useState<OverlayTransform>(defaultOverlay);
  const [mapTransform, setMapTransform] = useState({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const mapTransformRef = useRef(mapTransform);
  const containerSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    fetch("/assets/lotes.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse<CsvRow>(text, {
          header: true,
          skipEmptyLines: true,
        });
        const rows = (parsed.data || []).flatMap((row: CsvRow): Lote[] => {
          const mz = (row.MZ || "").trim().toUpperCase();
          const lote = Number.parseInt((row.LOTE || "").trim(), 10);
          if (!mz || Number.isNaN(lote)) return [];
          const areaM2 = cleanNumber(row.AREA);
          const price = cleanNumber(row.PRECIO);
          const condicion = (row.CONDICION || "LIBRE").trim().toUpperCase();
          const asesor = (row.ASESOR || "").trim();
          return [
            {
              id: toLoteId(mz, lote),
              mz,
              lote,
              areaM2,
              price,
              condicion: condicion || "LIBRE",
              asesor: asesor || undefined,
            },
          ];
        });
        setRawLotes(rows);
      });
  }, []);

  useEffect(() => {
    const current = loadOverrides();
    setOverrides(current);

    const sync = () => setOverrides(loadOverrides());
    window.addEventListener("storage", sync);
    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("arenas-lotes-sync");
      channel.onmessage = sync;
    }
    return () => {
      window.removeEventListener("storage", sync);
      if (channel) channel.close();
    };
  }, []);

  const lotes = useMemo(() => applyOverrides(rawLotes, overrides), [rawLotes, overrides]);

  const filteredLotes = useMemo(() => {
    const mz = filters.mz.trim().toUpperCase();
    const status = filters.status.toUpperCase();
    const priceMin = filters.priceMin ? Number(filters.priceMin) : null;
    const priceMax = filters.priceMax ? Number(filters.priceMax) : null;
    const areaMin = filters.areaMin ? Number(filters.areaMin) : null;
    const areaMax = filters.areaMax ? Number(filters.areaMax) : null;

    return lotes.filter((lote) => {
      if (mz && lote.mz !== mz) return false;
      if (status !== "TODOS" && lote.condicion !== status) return false;
      if (priceMin != null && (lote.price ?? 0) < priceMin) return false;
      if (priceMax != null && (lote.price ?? 0) > priceMax) return false;
      if (areaMin != null && (lote.areaM2 ?? 0) < areaMin) return false;
      if (areaMax != null && (lote.areaM2 ?? 0) > areaMax) return false;
      return true;
    });
  }, [filters, lotes]);

  const highlightedIds = useMemo(() => buildIdSet(filteredLotes), [filteredLotes]);

  const selectedLote = useMemo(
    () => lotes.find((item) => item.id === selectedId) ?? null,
    [lotes, selectedId]
  );

  useEffect(() => {
    if (selectedLote?.price != null) {
      setQuote((current) => ({
        ...current,
        precio: selectedLote.price || 0,
      }));
    }
  }, [selectedLote?.price]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    const hovered = hoveredId ? root.querySelector(`#${CSS.escape(hoveredId)}`) : null;
    root.querySelectorAll(".is-hovered").forEach((el) => el.classList.remove("is-hovered"));
    if (hovered) hovered.classList.add("is-hovered");
  }, [hoveredId]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    root.querySelectorAll(".is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (selectedId) {
      const target = root.querySelector(`#${CSS.escape(selectedId)}`);
      if (target) target.classList.add("is-selected");
    }
  }, [selectedId]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    root
      .querySelectorAll(".is-highlighted")
      .forEach((el) => el.classList.remove("is-highlighted"));
    highlightedIds.forEach((id) => {
      const target = root.querySelector(`#${CSS.escape(id)}`);
      if (target) target.classList.add("is-highlighted");
    });
  }, [highlightedIds]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    lotes.forEach((lote) => {
      const target = root.querySelector(`#${CSS.escape(lote.id)}`);
      if (target) {
        target.setAttribute("data-status", lote.condicion);
      }
    });
  }, [lotes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const element = mapContainerRef.current;
    if (!element || !transformRef.current) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;

      const prev = containerSizeRef.current;
      if (!prev.width || !prev.height) {
        containerSizeRef.current = { width, height };
        return;
      }

      if (prev.width === width && prev.height === height) return;
      containerSizeRef.current = { width, height };

      const { scale, positionX, positionY } = mapTransformRef.current;
      const centerX = (prev.width / 2 - positionX) / scale;
      const centerY = (prev.height / 2 - positionY) / scale;
      const nextX = width / 2 - centerX * scale;
      const nextY = height / 2 - centerY * scale;

      transformRef.current?.setTransform(nextX, nextY, scale, 0, "easeOut");
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);



  // moved below drawerCount to avoid temporal dead zone



  const handleSvgPointer = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement | null;
    const id = target?.getAttribute("id");
    if (!id || !/^[A-Z]-\d+/.test(id)) {
      if (event.type !== "click") {
        setHoveredId(null);
      }
      return;
    }
    if (event.type === "click") {
      if (draggedRef.current) {
        draggedRef.current = false;
        return;
      }
      setSelectedId(id);
      setRightOpen(true);
      return;
    }
    setHoveredId(id);
    setHoveredPos({ x: event.clientX, y: event.clientY });
  };

  const updateOverride = (id: string, patch: LoteOverride) => {
    setOverrides((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } };
      saveOverrides(next);
      appendHistory(`${id} => ${JSON.stringify(patch)}`);
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("arenas-lotes-sync");
        channel.postMessage("sync");
        channel.close();
      }
      return next;
    });
  };

  const resetFilters = () =>
    setFilters({
      mz: "",
      status: "TODOS",
      priceMin: "",
      priceMax: "",
      areaMin: "",
      areaMax: "",
    });

  const montoInicial = Math.min(quote.inicialMonto, quote.precio);
  const financiado = Math.max(quote.precio - montoInicial, 0);
  const cuota = quoteMonthly(financiado, quote.cuotas, quote.interesAnual);

  const hoveredLote = useMemo(
    () => lotes.find((item) => item.id === hoveredId) ?? null,
    [hoveredId, lotes]
  );

  const drawerCount = (leftOpen ? 1 : 0) + (rightOpen ? 1 : 0);
  const MapView = (
    <section className={`map-shell drawer-open-${drawerCount}`}>
      <aside className={`drawer-panel left ${leftOpen ? "open" : ""}`}>
        <div className="drawer__header">
          <h3>Filtros</h3>
          <button className="btn ghost" onClick={() => setLeftOpen(false)}>
            Cerrar
          </button>
        </div>
        <div className="drawer__body">
          <label>
            MZ
            <input
              value={filters.mz}
              onChange={(event) => setFilters({ ...filters, mz: event.target.value })}
              placeholder="A o B"
            />
          </label>
          <label>
            Estado
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="TODOS">Todos</option>
              <option value="LIBRE">Libre</option>
              <option value="SEPARADO">Separado</option>
              <option value="VENDIDO">Vendido</option>
            </select>
          </label>
          <label>
            Precio minimo
            <input
              type="number"
              value={filters.priceMin}
              onChange={(event) => setFilters({ ...filters, priceMin: event.target.value })}
            />
          </label>
          <label>
            Precio maximo
            <input
              type="number"
              value={filters.priceMax}
              onChange={(event) => setFilters({ ...filters, priceMax: event.target.value })}
            />
          </label>
          <label>
            Area minima (m2)
            <input
              type="number"
              value={filters.areaMin}
              onChange={(event) => setFilters({ ...filters, areaMin: event.target.value })}
            />
          </label>
          <label>
            Area maxima (m2)
            <input
              type="number"
              value={filters.areaMax}
              onChange={(event) => setFilters({ ...filters, areaMax: event.target.value })}
            />
          </label>
          <button className="btn" onClick={resetFilters}>
            Limpiar filtros
          </button>
        </div>
      </aside>

      <section className="map-card viewer">
        <div className="map-header">
          <div className="map-header__info">
            <strong>{lotes.length}</strong> lotes cargados -{" "}
            <strong>{filteredLotes.length}</strong> visibles
          </div>
          <div className="legend">
            <span className="legend__item libre">Libre</span>
            <span className="legend__item separado">Separado</span>
            <span className="legend__item vendido">Vendido</span>
          </div>
          <div className="view-toggle">
            <button
              className={view === "mapa" ? "btn active" : "btn ghost"}
              onClick={() => setView("mapa")}
            >
              Mapa
            </button>
            <button
              className={view === "tabla" ? "btn active" : "btn ghost"}
              onClick={() => setView("tabla")}
            >
              Tabla
            </button>
          </div>
        </div>
        <div ref={mapContainerRef} className={`map-container ${isPanning ? "is-panning" : ""}`}>
          {view === "mapa" ? (
            <TransformWrapper
              ref={transformRef}
              minScale={0.4}
              maxScale={6}
              initialScale={1}
              limitToBounds={false}
              centerZoomedOut={false}
              centerOnInit={false}
              initialPositionX={0}
              initialPositionY={0}
              alignmentAnimation={{ disabled: true }}
              panning={{ velocityDisabled: true }}
              wheel={{ smoothStep: 0.005 }}
              onTransformed={(_, state) => {
                setMapTransform(state);
                mapTransformRef.current = state;
                if (isPanningRef.current && panStartRef.current) {
                  const dx = state.positionX - panStartRef.current.x;
                  const dy = state.positionY - panStartRef.current.y;
                  if (Math.hypot(dx, dy) > 2) {
                    draggedRef.current = true;
                  }
                }
              }}
              onPanningStart={() => {
                setIsPanning(true);
                isPanningRef.current = true;
                draggedRef.current = false;
                panStartRef.current = {
                  x: mapTransform.positionX,
                  y: mapTransform.positionY,
                };
              }}
              onPanningStop={() => {
                setIsPanning(false);
                isPanningRef.current = false;
                panStartRef.current = null;
              }}
            >
              {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                <>
                  <div className="map-controls">
                    <button className="btn ghost" onClick={() => zoomIn()}>
                      +
                    </button>
                    <button className="btn ghost" onClick={() => zoomOut()}>
                      -
                    </button>
                    <button className="btn ghost" onClick={() => resetTransform()}>
                      Reset
                    </button>
                    <div className="zoom-indicator">{Math.round(mapTransform.scale * 100)}%</div>
                    <input
                      className="zoom-slider"
                      type="range"
                      min={0.6}
                      max={6}
                      step={0.05}
                      value={mapTransform.scale}
                      onChange={(event) =>
                        setTransform(
                          mapTransform.positionX,
                          mapTransform.positionY,
                          Number(event.target.value)
                        )
                      }
                    />
                  </div>
                  <TransformComponent wrapperClass="transform-wrapper">
                    <div className="map-layer">
                      <img
                        src="/assets/plano-fondo-demo.png"
                        alt="Plano de fondo"
                        className="map-background"
                      />
                      <LotesSvg
                        svgRef={svgRef}
                        style={overlayStyle(overlay)}
                        onMouseMove={handleSvgPointer}
                        onClick={handleSvgPointer}
                        onMouseLeave={() => setHoveredId(null)}
                      />
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          ) : (
            <div className="table-view">
              <div className="table-header">
                <span>Lote</span>
                <span>Area</span>
                <span>Precio</span>
                <span>Estado</span>
              </div>
              {filteredLotes.map((lote) => (
                <button
                  className={`table-row ${selectedId === lote.id ? "selected" : ""}`}
                  key={lote.id}
                  onClick={() => {
                    setSelectedId(lote.id);
                    setRightOpen(true);
                  }}
                >
                  <span>{lote.id}</span>
                  <span>{formatArea(lote.areaM2)}</span>
                  <span>{formatMoney(lote.price)}</span>
                  <span>{lote.condicion}</span>
                </button>
              ))}
            </div>
          )}
          {hoveredLote && view === "mapa" && (
            <div
              className="hover-tooltip"
              style={{ left: hoveredPos.x + 12, top: hoveredPos.y + 12 }}
            >
              <strong>{hoveredLote.id}</strong>
              <span>{formatArea(hoveredLote.areaM2)}</span>
              <span>{formatMoney(hoveredLote.price)}</span>
              <span>{hoveredLote.condicion}</span>
            </div>
          )}
        </div>
        <div className="map-footer">
          {hoveredLote ? (
            <span className="map-pill info">
              <strong>{hoveredLote.id}</strong>
              <span>{formatArea(hoveredLote.areaM2)}</span>
              <span>{formatMoney(hoveredLote.price)}</span>
              <span className={`status-pill ${statusToClass(hoveredLote.condicion)}`}>
                {hoveredLote.condicion}
              </span>
            </span>
          ) : (
            <span className="map-pill">Pasa el mouse sobre un lote</span>
          )}
          {selectedLote ? (
            <span className="map-pill active">
              Seleccionado {selectedLote.id} - {formatMoney(selectedLote.price)} -{" "}
              {selectedLote.condicion}
            </span>
          ) : (
            <span className="map-pill">Selecciona un lote para cotizar</span>
          )}
        </div>
      </section>

      <aside className={`drawer-panel right ${rightOpen ? "open" : ""}`}>
        <div className="drawer__header">
          <h3>Cotizador</h3>
          <button className="btn ghost" onClick={() => setRightOpen(false)}>
            Cerrar
          </button>
        </div>
        <div className="drawer__body">
          {selectedLote ? (
            <div className="lote-details">
              <h4>Lote {selectedLote.id}</h4>
              <div className="details-grid">
                <div>
                  <span className="detail-label">
                    <span className="detail-icon">M2</span>
                    Area
                  </span>
                  <strong>{formatArea(selectedLote.areaM2)}</strong>
                </div>
                <div>
                  <span className="detail-label">
                    <span className="detail-icon">$</span>
                    Precio base
                  </span>
                  <strong>{formatMoney(selectedLote.price)}</strong>
                </div>
                <div>
                  <span className="detail-label">
                    <span className="detail-icon">St</span>
                    Estado
                  </span>
                  <strong>{selectedLote.condicion}</strong>
                </div>
                <div>
                  <span className="detail-label">
                    <span className="detail-icon">As</span>
                    Asesor
                  </span>
                  <strong>{selectedLote.asesor ?? "-"}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">Selecciona un lote para ver detalles.</p>
          )}

          <div className="quote-box">
            <h4>Cotizacion</h4>
            <label>
              Precio
              <input
                type="number"
                value={quote.precio}
                onChange={(event) => setQuote({ ...quote, precio: Number(event.target.value || 0) })}
              />
            </label>
            <label>
              Inicial (S/)
              <input
                type="number"
                value={quote.inicialMonto}
                onChange={(event) =>
                  setQuote({ ...quote, inicialMonto: Number(event.target.value || 0) })
                }
              />
            </label>
            <label>
              Cuotas (meses)
              <input
                type="number"
                value={quote.cuotas}
                onChange={(event) => setQuote({ ...quote, cuotas: Number(event.target.value || 0) })}
              />
            </label>
            <label>
              Interes anual (%)
              <input
                type="number"
                value={quote.interesAnual}
                onChange={(event) =>
                  setQuote({ ...quote, interesAnual: Number(event.target.value || 0) })
                }
              />
            </label>
            <div className="quote-summary">
              <div>
                <span>Inicial</span>
                <strong>{formatMoney(montoInicial)}</strong>
              </div>
              <div>
                <span>Financiado</span>
                <strong>{formatMoney(financiado)}</strong>
              </div>
              <div>
                <span>Cuota estimada</span>
                <strong>{formatMoney(cuota)}</strong>
              </div>
            </div>
          </div>

          <div className="client-form">
            <h4>Separar lote</h4>
            <label>
              Nombre completo
              <input placeholder="Cliente" />
            </label>
            <label>
              DNI
              <input placeholder="Documento" />
            </label>
            <label>
              Telefono
              <input placeholder="+51 ..." />
            </label>
            <label>
              Email
              <input placeholder="correo@ejemplo.com" />
            </label>
            <button className="btn primary">Registrar interes</button>
          </div>
        </div>
      </aside>
    </section>
  );

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand__title">Arenas Malabrigo</span>
            <span className="brand__subtitle">Mapa interactivo de lotes</span>
          </div>
          <div className="topbar__actions">
            <nav className="nav-links">
              <NavLink to="/" end className="nav-link">
                Viewer
              </NavLink>
              <NavLink to="/vendedor" className="nav-link">
                Vendedor
              </NavLink>
              <NavLink to="/editor" className="nav-link">
                Editor
              </NavLink>
            </nav>
            <button className="btn ghost" onClick={() => setLeftOpen(true)}>
              Filtros
            </button>
            <button className="btn ghost" onClick={() => setRightOpen(true)}>
              Cotizador
            </button>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={MapView} />
            <Route
              path="/vendedor"
              element={
                <section className="seller-panel">
                  <h3>Panel vendedor</h3>
                  <p className="muted">
                    Cambia estado, precio y cliente. Se sincroniza en otras pestanas (simulado).
                  </p>
                  <div className="seller-table">
                    <div className="seller-row header">
                      <span>Lote</span>
                      <span>Estado</span>
                      <span>Precio</span>
                      <span>Cliente</span>
                    </div>
                    {lotes.map((lote) => (
                      <div className="seller-row" key={lote.id}>
                        <span>{lote.id}</span>
                        <select
                          value={lote.condicion}
                          onChange={(event) =>
                            updateOverride(lote.id, { condicion: event.target.value })
                          }
                        >
                          <option value="LIBRE">LIBRE</option>
                          <option value="SEPARADO">SEPARADO</option>
                          <option value="VENDIDO">VENDIDO</option>
                        </select>
                        <input
                          type="number"
                          value={lote.price ?? ""}
                          onChange={(event) =>
                            updateOverride(lote.id, {
                              price: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                        />
                        <input
                          type="text"
                          value={lote.cliente ?? ""}
                          onChange={(event) =>
                            updateOverride(lote.id, { cliente: event.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              }
            />
            <Route
              path="/editor"
              element={
                <section className="editor-panel">
                  <div className="editor-header">
                    <h3>Editor de overlay</h3>
                    <p className="muted">Ajusta posicion y escala del SVG sobre el PNG fijo.</p>
                  </div>
                  <div className="editor-grid">
                    <div className="editor-controls">
                      <label>
                        X ({overlay.x}px)
                        <div className="editor-inputs">
                          <input
                            type="number"
                            value={overlay.x}
                            onChange={(event) =>
                              setOverlay({ ...overlay, x: Number(event.target.value || 0) })
                            }
                          />
                          <input
                            type="range"
                            min={-400}
                            max={400}
                            value={overlay.x}
                            onChange={(event) =>
                              setOverlay({ ...overlay, x: Number(event.target.value) })
                            }
                          />
                        </div>
                      </label>
                      <label>
                        Y ({overlay.y}px)
                        <div className="editor-inputs">
                          <input
                            type="number"
                            value={overlay.y}
                            onChange={(event) =>
                              setOverlay({ ...overlay, y: Number(event.target.value || 0) })
                            }
                          />
                          <input
                            type="range"
                            min={-400}
                            max={400}
                            value={overlay.y}
                            onChange={(event) =>
                              setOverlay({ ...overlay, y: Number(event.target.value) })
                            }
                          />
                        </div>
                      </label>
                      <label>
                        Escala ({overlay.scale.toFixed(2)})
                        <div className="editor-inputs">
                          <input
                            type="number"
                            step={0.01}
                            value={overlay.scale}
                            onChange={(event) =>
                              setOverlay({ ...overlay, scale: Number(event.target.value || 1) })
                            }
                          />
                          <input
                            type="range"
                            min={0.5}
                            max={2}
                            step={0.01}
                            value={overlay.scale}
                            onChange={(event) =>
                              setOverlay({ ...overlay, scale: Number(event.target.value) })
                            }
                          />
                        </div>
                      </label>
                      <div className="editor-actions">
                        <button className="btn" onClick={() => setOverlay(defaultOverlay)}>
                          Reset
                        </button>
                      </div>
                      <div className="editor-output">
                        <span>Transform actual</span>
                        <code>
                          x: {overlay.x}, y: {overlay.y}, scale: {overlay.scale.toFixed(2)}
                        </code>
                      </div>
                    </div>
                    <div className="editor-canvas">
                      <div className="map-layer">
                        <img
                          src="/assets/plano-fondo-demo.png"
                          alt="Plano de fondo"
                          className="map-background"
                        />
                        <LotesSvg
                          svgRef={svgRef}
                          style={overlayStyle(overlay)}
                          onMouseMove={handleSvgPointer}
                          onClick={handleSvgPointer}
                          onMouseLeave={() => setHoveredId(null)}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              }
            />
          </Routes>
        </main>

        

        
      </div>
    </BrowserRouter>
  );
}

export default App;
