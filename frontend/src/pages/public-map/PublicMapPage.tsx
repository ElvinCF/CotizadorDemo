import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import AppShell from "../../app/AppShell";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import ArenasSvg from "../../components/arenas";
import MapHeader from "../../components/map/MapHeader";
import TableView from "../../components/map/TableView";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  defaultFilters,
  defaultOverlay,
  mapVars,
} from "../../domain/constants";
import {
  clamp,
  formatArea,
  formatMoney,
  formatNumber,
} from "../../domain/formatters";
import { buildIdSet, overlayStyle } from "../../domain/finance";
import type { FiltersState, Lote, OverlayTransform } from "../../domain/types";
import { loadLotesFromApi } from "../../services/lotes";

const MemoArenasSvg = memo(ArenasSvg);

/**
 * PublicMapPage — Vista pública del mapa de lotes.
 * El cliente puede navegar el mapa, hacer clic en lotes para ver info básica,
 * y descargar el mapa ejecutivo. NO tiene acceso a proformas ni cotizador.
 */
function PublicMapPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rawLotes, setRawLotes] = useState<Lote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [tableFiltersOpen, setTableFiltersOpen] = useState(true);
  const [view, setView] = useState<"mapa" | "tabla">("mapa");
  const [overlay] = useState<OverlayTransform>(defaultOverlay);

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
  const transformRafRef = useRef<number | null>(null);
  const containerSizeRef = useRef({ width: 0, height: 0 });
  const hasFitRef = useRef(false);
  const lastHoveredRef = useRef<string | null>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const highlightedRef = useRef<Set<string>>(new Set());
  const hoverPosRef = useRef({ x: 0, y: 0 });
  const hoverRafRef = useRef<number | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const syncLotes = async () => {
      try {
        const items = await loadLotesFromApi();
        if (!active) return;
        setRawLotes(items);
        setLoadError(null);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setRawLotes([]);
        setLoadError(
          "No se pudo cargar lotes desde la API. Intenta recargar la página."
        );
      }
    };
    syncLotes();
    return () => { active = false; };
  }, []);

  const lotes = rawLotes;

  // ── Filtering ─────────────────────────────────────────────────────
  const filteredLotes = useMemo(() => {
    const mz = filters.mz.trim().toUpperCase();
    const status = filters.status.toUpperCase();
    const asesor = filters.asesor.trim().toUpperCase();
    const priceMin = filters.priceMin ? Number(filters.priceMin) : null;
    const priceMax = filters.priceMax ? Number(filters.priceMax) : null;
    const areaMin = filters.areaMin ? Number(filters.areaMin) : null;
    const areaMax = filters.areaMax ? Number(filters.areaMax) : null;

    return lotes.filter((lote) => {
      if (mz && lote.mz !== mz) return false;
      if (status !== "TODOS" && lote.condicion !== status) return false;
      if (asesor !== "TODOS" && (lote.asesor ?? "").trim().toUpperCase() !== asesor) return false;
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

  // ── SVG class sync effects ────────────────────────────────────────
  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    const prev = lastHoveredRef.current;
    if (prev && prev !== hoveredId) {
      root.querySelector(`#${CSS.escape(prev)}`)?.classList.remove("is-hovered");
    }
    if (hoveredId) {
      root.querySelector(`#${CSS.escape(hoveredId)}`)?.classList.add("is-hovered");
    }
    lastHoveredRef.current = hoveredId;
  }, [hoveredId, view]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    const prev = lastSelectedRef.current;
    if (prev && prev !== selectedId) {
      root.querySelector(`#${CSS.escape(prev)}`)?.classList.remove("is-selected");
    }
    if (selectedId) {
      root.querySelector(`#${CSS.escape(selectedId)}`)?.classList.add("is-selected");
    }
    lastSelectedRef.current = selectedId;
  }, [selectedId, view]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    const prev = highlightedRef.current;
    highlightedIds.forEach((id) => {
      if (!prev.has(id)) root.querySelector(`#${CSS.escape(id)}`)?.classList.add("is-highlighted");
    });
    prev.forEach((id) => {
      if (!highlightedIds.has(id)) root.querySelector(`#${CSS.escape(id)}`)?.classList.remove("is-highlighted");
    });
    highlightedRef.current = new Set(highlightedIds);
  }, [highlightedIds, view]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    lotes.forEach((lote) => {
      const target = root.querySelector(`#${CSS.escape(lote.id)}`);
      if (target) target.setAttribute("data-status", lote.condicion);
    });
  }, [lotes, view]);

  // ── Keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Cleanup animation frames ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (hoverRafRef.current != null) cancelAnimationFrame(hoverRafRef.current);
      if (transformRafRef.current != null) cancelAnimationFrame(transformRafRef.current);
    };
  }, []);

  // ── Fit to container on mount ─────────────────────────────────────
  useEffect(() => {
    const element = mapContainerRef.current;
    if (!element || !transformRef.current) return;

    const fitToContainer = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const nextScale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
      const nextX = (width - MAP_WIDTH * nextScale) / 2;
      const nextY = (height - MAP_HEIGHT * nextScale) / 2;
      containerSizeRef.current = { width, height };
      transformRef.current?.setTransform(nextX, nextY, nextScale, 0, "easeOut");
    };

    const observer = new ResizeObserver(() => {
      if (!hasFitRef.current) {
        fitToContainer();
        hasFitRef.current = true;
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSvgPointer = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement | null;
    const id = target?.getAttribute("id");
    if (!id || !/^[A-Z]-\d+/.test(id)) {
      if (event.type !== "click") setHoveredId(null);
      return;
    }
    if (event.type === "click") {
      if (draggedRef.current) { draggedRef.current = false; return; }
      setSelectedId(id);
      return;
    }
    if (hoveredId !== id) setHoveredId(id);
    hoverPosRef.current = { x: event.clientX, y: event.clientY };
    if (hoverRafRef.current == null) {
      hoverRafRef.current = requestAnimationFrame(() => {
        setHoveredPos(hoverPosRef.current);
        hoverRafRef.current = null;
      });
    }
  }, [hoveredId]);

  const handleSvgLeave = useCallback(() => { setHoveredId(null); }, []);

  const handleSliderZoom = useCallback(
    (
      nextScale: number,
      setTransformFn: (x: number, y: number, scale: number, animationTime?: number, animationType?: "linear" | "easeOut" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad") => void
    ) => {
      const container = mapContainerRef.current;
      const current = mapTransformRef.current;
      const safeScale = clamp(nextScale, 0.4, 6);

      if (!container) { setTransformFn(current.positionX, current.positionY, safeScale, 90, "easeOut"); return; }
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) { setTransformFn(current.positionX, current.positionY, safeScale, 90, "easeOut"); return; }

      const fitScale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
      if (safeScale <= fitScale) {
        const centeredX = (width - MAP_WIDTH * safeScale) / 2;
        const centeredY = (height - MAP_HEIGHT * safeScale) / 2;
        setTransformFn(centeredX, centeredY, safeScale, 120, "easeOut");
        return;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const ratio = safeScale / Math.max(current.scale, 0.0001);
      const nextX = centerX - (centerX - current.positionX) * ratio;
      const nextY = centerY - (centerY - current.positionY) * ratio;
      setTransformFn(nextX, nextY, safeScale, 90, "easeOut");
    },
    []
  );

  const resetFilters = () => setFilters(defaultFilters);

  // ── Simple map download (executive PDF) ───────────────────────────
  const loadImageElement = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar imagen: ${src}`));
      image.src = src;
    });

  const exportExecutivePdf = async () => {
    const targetWidth = MAP_WIDTH * 3;
    const targetHeight = MAP_HEIGHT * 3;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    const scale = targetWidth / MAP_WIDTH;
    context.scale(scale, scale);
    context.fillStyle = "#f7f0e4";
    context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    const backgroundImage = await loadImageElement("/assets/plano-fondo-demo.webp");
    const imageRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
    const layerRatio = MAP_WIDTH / MAP_HEIGHT;
    let drawWidth = MAP_WIDTH;
    let drawHeight = MAP_HEIGHT;
    let drawX = 0;
    let drawY = 0;

    if (imageRatio > layerRatio) {
      drawWidth = MAP_WIDTH;
      drawHeight = MAP_WIDTH / imageRatio;
      drawY = (MAP_HEIGHT - drawHeight) / 2;
    } else {
      drawHeight = MAP_HEIGHT;
      drawWidth = MAP_HEIGHT * imageRatio;
      drawX = (MAP_WIDTH - drawWidth) / 2;
    }
    context.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);

    const sourceSvg = svgRef.current;
    if (sourceSvg) {
      const svgClone = sourceSvg.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      svgClone.setAttribute("width", String(MAP_WIDTH));
      svgClone.setAttribute("height", String(MAP_HEIGHT));
      svgClone.style.width = `${MAP_WIDTH}px`;
      svgClone.style.height = `${MAP_HEIGHT}px`;
      svgClone.style.transform = "none";
      svgClone.style.transformOrigin = "0 0";

      const LIGHT_FILL_DISPONIBLE = "rgba(60, 223, 101, 0.322)";
      const LIGHT_FILL_SEPARADO = "rgba(255, 196, 99, 0.5)";
      const LIGHT_FILL_VENDIDO = "rgba(255, 133, 149, 0.5)";
      const LIGHT_STROKE = "rgba(0,0,0,0)";

      sourceSvg.querySelectorAll<SVGElement>("[id]").forEach((node) => {
        const id = node.getAttribute("id");
        if (!id) return;
        const cloneNode = svgClone.querySelector<SVGElement>(`#${CSS.escape(id)}`);
        if (!cloneNode) return;
        const status = (node.getAttribute("data-status") || "").toUpperCase();
        if (status === "SEPARADO") {
          cloneNode.setAttribute("fill", LIGHT_FILL_SEPARADO);
        } else if (status === "VENDIDO") {
          cloneNode.setAttribute("fill", LIGHT_FILL_VENDIDO);
        } else {
          cloneNode.setAttribute("fill", LIGHT_FILL_DISPONIBLE);
        }
        cloneNode.setAttribute("stroke", LIGHT_STROKE);
        cloneNode.setAttribute("stroke-width", "0");
        cloneNode.setAttribute("stroke-linejoin", "round");
        cloneNode.setAttribute("stroke-linecap", "round");
      });

      const serialized = new XMLSerializer().serializeToString(svgClone);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
      const svgImage = await loadImageElement(svgDataUrl);

      context.save();
      context.translate(overlay.x, overlay.y);
      context.scale(overlay.scale, overlay.scale);
      context.drawImage(svgImage, 0, 0, MAP_WIDTH, MAP_HEIGHT);
      context.restore();
    }

    const vendidoCount = lotes.filter((lote) => lote.condicion === "VENDIDO").length;
    const separadoCount = lotes.filter((lote) => lote.condicion === "SEPARADO").length;
    const disponibleCount = lotes.length - vendidoCount - separadoCount;

    const imageData = canvas.toDataURL("image/png", 1);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: targetWidth >= targetHeight ? "landscape" : "portrait",
      unit: "px",
      format: [MAP_WIDTH, MAP_HEIGHT],
      compress: true,
    });
    pdf.addImage(imageData, "PNG", 0, 0, MAP_WIDTH, MAP_HEIGHT, undefined, "NONE");

    const panelX = 28;
    const panelY = 26;
    const panelW = Math.round(Math.min(330, Math.max(280, MAP_WIDTH * 0.255)));
    const panelH = 304;

    pdf.setFillColor(248, 245, 232);
    pdf.setDrawColor(178, 133, 90);
    pdf.setLineWidth(1);
    pdf.roundedRect(panelX, panelY, panelW, panelH, 14, 14, "FD");

    try {
      const logoImage = await loadImageElement("/assets/Logo_Arenas_Malabrigo.svg");
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = 1000;
      logoCanvas.height = 360;
      const logoCtx = logoCanvas.getContext("2d");
      if (logoCtx) {
        logoCtx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);
        const ratio = logoImage.naturalWidth / logoImage.naturalHeight;
        const boxW = panelW - 28;
        const boxH = 116;
        const boxX = panelX + 16;
        const boxY = panelY + 10;
        let drawW = boxW;
        let drawH = boxH;
        let dX = boxX;
        let dY = boxY;
        if (ratio > boxW / boxH) {
          drawH = boxW / ratio;
          dY += (boxH - drawH) / 2;
        } else {
          drawW = boxH * ratio;
          dX += (boxW - drawW) / 2;
        }
        logoCtx.drawImage(logoImage, 0, 0, logoCanvas.width, logoCanvas.height);
        const logoData = logoCanvas.toDataURL("image/png", 1);
        pdf.addImage(logoData, "PNG", dX, dY, drawW, drawH, undefined, "FAST");
      }
    } catch {
      // Continue export if logo fails.
    }

    pdf.setTextColor(58, 46, 37);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(57 / 3);
    pdf.text("Resumen general", panelX + 20, panelY + 150);

    const drawStatRow = (label: string, value: number, row: number, rgb: [number, number, number]) => {
      const rowY = panelY + 166 + row * 42;
      const tint = row === 0 ? [255, 238, 238] : row === 1 ? [255, 247, 227] : [234, 250, 238];
      pdf.setFillColor(tint[0], tint[1], tint[2]);
      pdf.setDrawColor(223, 211, 196);
      pdf.roundedRect(panelX + 16, rowY, panelW - 32, 32, 16, 16, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(54 / 3);
      pdf.setTextColor(92, 72, 56);
      pdf.text(label, panelX + 30, rowY + 21);
      pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
      const valueText = String(value);
      pdf.setFontSize(60 / 3);
      const textWidth = pdf.getTextWidth(valueText);
      pdf.text(valueText, panelX + panelW - 30 - textWidth, rowY + 21);
    };

    drawStatRow("Vendidos", vendidoCount, 0, [198, 40, 40]);
    drawStatRow("Separados", separadoCount, 1, [154, 107, 0]);
    drawStatRow("Disponibles", disponibleCount, 2, [31, 138, 76]);

    pdf.save(`mapa-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── CSV export ────────────────────────────────────────────────────
  const exportTableCsv = () => {
    const headers = ["MZ", "LT", "AREA_M2", "ASESOR", "PRECIO", "CONDICION"];
    const rows = filteredLotes.map((lote) => [
      lote.mz,
      String(lote.lote),
      formatNumber(lote.areaM2),
      lote.asesor ?? "",
      formatNumber(lote.price),
      lote.condicion,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lotes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const overlayStyleMemo = useMemo(() => overlayStyle(overlay), [overlay]);

  const hoveredLote = useMemo(
    () => lotes.find((item) => item.id === hoveredId) ?? null,
    [hoveredId, lotes]
  );

  // ── Simple info panel for selected lote ───────────────────────────
  const selectedPanel = selectedLote ? (
    <div className="public-lote-panel">
      <button className="public-lote-panel__close" onClick={() => setSelectedId(null)} aria-label="Cerrar">×</button>
      <h3>{selectedLote.id}</h3>
      <div className="public-lote-panel__grid">
        <div><span className="label">Manzana</span><strong>{selectedLote.mz}</strong></div>
        <div><span className="label">Lote</span><strong>{selectedLote.lote}</strong></div>
        <div><span className="label">Área</span><strong>{formatArea(selectedLote.areaM2)}</strong></div>
        <div><span className="label">Precio</span><strong>{formatMoney(selectedLote.price)}</strong></div>
        <div><span className="label">Estado</span><strong>{selectedLote.condicion}</strong></div>
      </div>
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Fragment>
      <AppShell contentClassName="main--map">
        <section className="map-page">
          <section className="map-shell">
            <section className="map-card viewer">
              <MapHeader
                view={view}
                setView={setView}
                filteredCount={filteredLotes.length}
                totalCount={lotes.length}
                onExportExecutivePdf={exportExecutivePdf}
                onExportTable={exportTableCsv}
              />
              <div
                ref={mapContainerRef}
                className={`map-container ${isPanning ? "is-panning" : ""}`}
                style={mapVars as CSSProperties}
              >
                {view === "mapa" ? (
                  <Fragment>
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
                      wheel={{ step: 0.04, smoothStep: 0.003 }}
                      onTransformed={(_, state) => {
                        mapTransformRef.current = state;
                        if (transformRafRef.current == null) {
                          transformRafRef.current = requestAnimationFrame(() => {
                            setMapTransform(mapTransformRef.current);
                            transformRafRef.current = null;
                          });
                        }
                        if (isPanningRef.current && panStartRef.current) {
                          const dx = state.positionX - panStartRef.current.x;
                          const dy = state.positionY - panStartRef.current.y;
                          if (Math.hypot(dx, dy) > 2) draggedRef.current = true;
                        }
                      }}
                      onPanningStart={() => {
                        setIsPanning(true);
                        isPanningRef.current = true;
                        draggedRef.current = false;
                        panStartRef.current = {
                          x: mapTransformRef.current.positionX,
                          y: mapTransformRef.current.positionY,
                        };
                      }}
                      onPanningStop={() => {
                        setIsPanning(false);
                        isPanningRef.current = false;
                        panStartRef.current = null;
                      }}
                    >
                      {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                        <Fragment>
                          <div className="map-overlay-legend" aria-label="Estado de lotes">
                            <span className="status-pill disponible">Disponible</span>
                            <span className="status-pill separado">Separado</span>
                            <span className="status-pill vendido">Vendido</span>
                          </div>
                          <div className="map-controls">
                            <button className="btn ghost" onClick={() => zoomIn()}>+</button>
                            <button className="btn ghost" onClick={() => zoomOut()}>-</button>
                            <button
                              className="btn ghost"
                              onClick={() => {
                                if (mapContainerRef.current) {
                                  const { width, height } = mapContainerRef.current.getBoundingClientRect();
                                  const nextScale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
                                  const nextX = (width - MAP_WIDTH * nextScale) / 2;
                                  const nextY = (height - MAP_HEIGHT * nextScale) / 2;
                                  setTransform(nextX, nextY, nextScale);
                                  return;
                                }
                                resetTransform();
                              }}
                            >
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
                              onInput={(event) =>
                                handleSliderZoom(Number((event.target as HTMLInputElement).value), setTransform)
                              }
                              onChange={(event) =>
                                handleSliderZoom(Number((event.target as HTMLInputElement).value), setTransform)
                              }
                            />
                          </div>
                          <TransformComponent wrapperClass="transform-wrapper">
                            <div className="map-layer">
                              <img
                                src="/assets/plano-fondo-demo.webp"
                                alt="Plano de fondo"
                                className="map-background"
                                draggable={false}
                              />
                              <MemoArenasSvg
                                svgRef={svgRef}
                                className="lotes-svg"
                                style={overlayStyleMemo}
                                onMouseMove={handleSvgPointer}
                                onClick={handleSvgPointer}
                                onMouseLeave={handleSvgLeave}
                              />
                            </div>
                          </TransformComponent>
                        </Fragment>
                      )}
                    </TransformWrapper>
                  </Fragment>
                ) : (
                  <TableView
                    tableFiltersOpen={tableFiltersOpen}
                    onToggleFilters={() => setTableFiltersOpen((prev) => !prev)}
                    allLotes={lotes}
                    filters={filters}
                    setFilters={setFilters}
                    onResetFilters={resetFilters}
                    filteredLotes={filteredLotes}
                    selectedId={selectedId}
                    onSelectLote={(id) => setSelectedId(id)}
                  />
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
            </section>

            {/* Simple info panel instead of CotizadorDrawer */}
            {selectedPanel}
          </section>
        </section>
      </AppShell>

      {loadError && (
        <div className="modal-backdrop" onClick={() => setLoadError(null)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h4>Error de carga</h4>
            <p className="muted">{loadError}</p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setLoadError(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default PublicMapPage;
