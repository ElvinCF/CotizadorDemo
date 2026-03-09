import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import AppShell from "../../app/AppShell";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import ArenasSvg from "../../components/arenas";
import CotizadorDrawer from "../../components/drawer/CotizadorDrawer";
import MapHeader from "../../components/map/MapHeader";
import TableView from "../../components/map/TableView";
import ProformaModal from "../../components/proforma/ProformaModal";
import {
  EMPRESA_DIRECCION,
  MAP_HEIGHT,
  MAP_WIDTH,
  PROFORMA_VENDOR_KEY,
  PROYECTO_FIJO,
  defaultFilters,
  defaultOverlay,
  defaultQuote,
  mapVars,
} from "../../domain/constants";
import {
  addDays,
  clamp,
  formatArea,
  formatMoney,
  formatNumber,
  toDateValue,
} from "../../domain/formatters";
import { buildIdSet, overlayStyle, quoteMonthly } from "../../domain/finance";
import type { FiltersState, Lote, OverlayTransform, ProformaState, QuoteState } from "../../domain/types";
import { projectInfo } from "../../data/projectInfo";
import { loadLotesFromApi } from "../../services/lotes";

const MemoArenasSvg = memo(ArenasSvg);

function PublicMapPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rawLotes, setRawLotes] = useState<Lote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
  const [rightOpen, setRightOpen] = useState(false);
  const [quote, setQuote] = useState<QuoteState>(defaultQuote);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [tableFiltersOpen, setTableFiltersOpen] = useState(true);
  const [view, setView] = useState<"mapa" | "tabla">("mapa");
  const [overlay] = useState<OverlayTransform>(defaultOverlay);
  const previousMzRef = useRef<string | null>(null);
  const previousLoteRef = useRef<number | null>(null);
  const [pulseMz, setPulseMz] = useState(false);
  const [pulseLote, setPulseLote] = useState(false);
  const [proformaOpen, setProformaOpen] = useState(false);
  const [proformaDirty, setProformaDirty] = useState(false);
  const [proformaConfirmClose, setProformaConfirmClose] = useState(false);
  const [proformaAlert, setProformaAlert] = useState<string | null>(null);
  const [proforma, setProforma] = useState<ProformaState>({
    cliente: { nombre: "", dni: "", celular: "", direccion: "", correo: "" },
    lote: { proyecto: PROYECTO_FIJO, mz: "", lote: "", area: "", ubicacion: "" },
    precioRegular: 0,
    precioPromocional: 0,
    descuentoSoles: 0,
    descuentoPct: 0,
    diasVigencia: 3,
    fechaCaducidad: toDateValue(addDays(new Date(), 3)),
    separacion: 0,
    inicial: 6000,
    meses: 24,
    vendedor: { nombre: "", celular: "" },
    creadoEn: new Date().toISOString(),
  });
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
  const lastPriceEditedRef = useRef<"soles" | "pct" | "promo" | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

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
          "No se pudo cargar lotes desde Supabase/API. Verifica SUPABASE_DB_SCHEMA y variables del backend."
        );
      }
    };

    syncLotes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(PROFORMA_VENDOR_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { nombre?: string; celular?: string };
      setProforma((current) => ({
        ...current,
        vendedor: {
          nombre: saved.nombre ?? current.vendedor.nombre,
          celular: saved.celular ?? current.vendedor.celular,
        },
      }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!proformaOpen) return;
    const raw = localStorage.getItem(PROFORMA_VENDOR_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { nombre?: string; celular?: string };
      setProforma((current) => ({
        ...current,
        vendedor: {
          nombre: saved.nombre ?? current.vendedor.nombre,
          celular: saved.celular ?? current.vendedor.celular,
        },
      }));
    } catch {
      // ignore
    }
  }, [proformaOpen]);

  useEffect(() => {
    localStorage.setItem(PROFORMA_VENDOR_KEY, JSON.stringify(proforma.vendedor));
  }, [proforma.vendedor]);

  const lotes = rawLotes;

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

  useEffect(() => {
    if (selectedLote?.price != null) {
      setQuote((current) => ({
        ...current,
        precio: selectedLote.price || 0,
      }));
    }
  }, [selectedLote?.price]);

  useEffect(() => {
    if (!selectedLote) return;
    const prevMz = previousMzRef.current;
    const prevLote = previousLoteRef.current;
    if (prevMz != null && prevMz !== selectedLote.mz) {
      setPulseMz(true);
      window.setTimeout(() => setPulseMz(false), 420);
    }
    if (prevLote != null && prevLote !== selectedLote.lote) {
      setPulseLote(true);
      window.setTimeout(() => setPulseLote(false), 420);
    }
    previousMzRef.current = selectedLote.mz;
    previousLoteRef.current = selectedLote.lote;
  }, [selectedLote]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    const prev = lastHoveredRef.current;
    if (prev && prev !== hoveredId) {
      const prevEl = root.querySelector(`#${CSS.escape(prev)}`);
      prevEl?.classList.remove("is-hovered");
    }
    if (hoveredId) {
      const nextEl = root.querySelector(`#${CSS.escape(hoveredId)}`);
      nextEl?.classList.add("is-hovered");
    }
    lastHoveredRef.current = hoveredId;
  }, [hoveredId, view]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    const prev = lastSelectedRef.current;
    if (prev && prev !== selectedId) {
      const prevEl = root.querySelector(`#${CSS.escape(prev)}`);
      prevEl?.classList.remove("is-selected");
    }
    if (selectedId) {
      const nextEl = root.querySelector(`#${CSS.escape(selectedId)}`);
      nextEl?.classList.add("is-selected");
    }
    lastSelectedRef.current = selectedId;
  }, [selectedId, view]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    const prev = highlightedRef.current;
    highlightedIds.forEach((id) => {
      if (!prev.has(id)) {
        const target = root.querySelector(`#${CSS.escape(id)}`);
        target?.classList.add("is-highlighted");
      }
    });
    prev.forEach((id) => {
      if (!highlightedIds.has(id)) {
        const target = root.querySelector(`#${CSS.escape(id)}`);
        target?.classList.remove("is-highlighted");
      }
    });
    highlightedRef.current = new Set(highlightedIds);
  }, [highlightedIds, view]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root || view !== "mapa") return;
    lotes.forEach((lote) => {
      const target = root.querySelector(`#${CSS.escape(lote.id)}`);
      if (target) {
        target.setAttribute("data-status", lote.condicion);
      }
    });
  }, [lotes, view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (proformaOpen) {
          if (proformaDirty) {
            setProformaConfirmClose(true);
          } else {
            setProformaOpen(false);
          }
          return;
        }
        setRightOpen(false);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [proformaDirty, proformaOpen]);

  useEffect(() => {
    return () => {
      if (hoverRafRef.current != null) {
        cancelAnimationFrame(hoverRafRef.current);
        hoverRafRef.current = null;
      }
      if (transformRafRef.current != null) {
        cancelAnimationFrame(transformRafRef.current);
        transformRafRef.current = null;
      }
    };
  }, []);

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



  // moved below drawerCount to avoid temporal dead zone



  const handleSvgPointer = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
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
    if (hoveredId !== id) {
      setHoveredId(id);
    }
    hoverPosRef.current = { x: event.clientX, y: event.clientY };
    if (hoverRafRef.current == null) {
      hoverRafRef.current = requestAnimationFrame(() => {
        setHoveredPos(hoverPosRef.current);
        hoverRafRef.current = null;
      });
    }
  }, [hoveredId]);

  const handleSvgLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleSliderZoom = useCallback(
    (
      nextScale: number,
      setTransformFn: (
        x: number,
        y: number,
        scale: number,
        animationTime?: number,
        animationType?: "linear" | "easeOut" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad"
      ) => void
    ) => {
      const container = mapContainerRef.current;
      const current = mapTransformRef.current;
      const safeScale = clamp(nextScale, 0.4, 6);

      if (!container) {
        setTransformFn(current.positionX, current.positionY, safeScale, 90, "easeOut");
        return;
      }

      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) {
        setTransformFn(current.positionX, current.positionY, safeScale, 90, "easeOut");
        return;
      }

      const fitScale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
      if (safeScale <= fitScale) {
        const centeredX = (width - MAP_WIDTH * safeScale) / 2;
        const centeredY = (height - MAP_HEIGHT * safeScale) / 2;
        setTransformFn(centeredX, centeredY, safeScale, 120, "easeOut");
        return;
      }

      // Keep zoom anchored to viewport center for smooth slider behavior.
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

  const quoteInvalidInicial = quote.inicialMonto < 6000;
  const quoteInvalidMeses = quote.cuotas < 1 || quote.cuotas > 36;
  const montoInicial = Math.min(Math.max(quote.inicialMonto, 0), quote.precio);
  const financiado = Math.max(quote.precio - montoInicial, 0);
  const cuota = quoteMonthly(financiado, quote.cuotas, 0);
  const cuotaRapida = (meses: number, inicial: number) =>
    Math.max((quote.precio - inicial) / meses, 0);

  const hoveredLote = useMemo(
    () => lotes.find((item) => item.id === hoveredId) ?? null,
    [hoveredId, lotes]
  );

  const proformaAhorro = Math.max(proforma.precioRegular - proforma.precioPromocional, 0);
  const proformaInvalidInicial = proforma.inicial < 6000;
  const proformaInvalidMeses = proforma.meses < 1 || proforma.meses > 36;
  const precioFinanciarRegular = Math.max(
    proforma.precioRegular - proforma.separacion - proforma.inicial,
    0
  );
  const precioFinanciarPromo = Math.max(
    proforma.precioPromocional - proforma.separacion - proforma.inicial,
    0
  );
  const proformaCuotaRegular = proforma.meses > 0 ? precioFinanciarRegular / proforma.meses : 0;
  const proformaCuotaPromo = proforma.meses > 0 ? precioFinanciarPromo / proforma.meses : 0;
  const cuotasRapidas = (monto: number) => ({
    12: Math.max(monto / 12, 0),
    24: Math.max(monto / 24, 0),
    36: Math.max(monto / 36, 0),
  });

  const refreshProformaFromLote = (lote: Lote) => {
    const regular = lote.price ?? 0;
    const promo = regular;
    const inicial = clamp(6000, 6000, promo || 6000);
    const dias = 3;
    lastPriceEditedRef.current = null;
    setProforma({
      cliente: { nombre: "", dni: "", celular: "", direccion: "", correo: "" },
      lote: {
        proyecto: PROYECTO_FIJO,
        mz: lote.mz,
        lote: String(lote.lote),
        area: formatArea(lote.areaM2),
        ubicacion: projectInfo.locationText,
      },
      precioRegular: regular,
      precioPromocional: promo,
      descuentoSoles: Math.max(regular - promo, 0),
      descuentoPct: regular ? Math.max(((regular - promo) / regular) * 100, 0) : 0,
      diasVigencia: dias,
      fechaCaducidad: toDateValue(addDays(new Date(), dias)),
      separacion: 0,
      inicial,
      meses: 24,
      vendedor: proforma.vendedor,
      creadoEn: new Date().toISOString(),
    });
    setProformaDirty(false);
  };

  const recalcProforma = (draft: ProformaState) => {
    const regular = Math.max(draft.precioRegular, 0);
    let promo = Math.max(draft.precioPromocional, 0);
    let descuentoSoles = Math.max(draft.descuentoSoles, 0);
    let descuentoPct = Math.max(draft.descuentoPct, 0);

    if (lastPriceEditedRef.current === "soles") {
      descuentoSoles = clamp(descuentoSoles, 0, regular);
      descuentoPct = regular ? (descuentoSoles / regular) * 100 : 0;
      promo = Math.max(regular - descuentoSoles, 0);
    } else if (lastPriceEditedRef.current === "pct") {
      descuentoPct = clamp(descuentoPct, 0, 100);
      descuentoSoles = (descuentoPct / 100) * regular;
      promo = Math.max(regular - descuentoSoles, 0);
    } else if (lastPriceEditedRef.current === "promo") {
      promo = clamp(promo, 0, regular);
      descuentoSoles = Math.max(regular - promo, 0);
      descuentoPct = regular ? (descuentoSoles / regular) * 100 : 0;
    } else {
      promo = clamp(promo, 0, regular);
      descuentoSoles = Math.max(regular - promo, 0);
      descuentoPct = regular ? (descuentoSoles / regular) * 100 : 0;
    }

    const dias = clamp(Math.round(draft.diasVigencia || 0), 1, 30);
    const fechaCaducidad = toDateValue(addDays(new Date(), dias));
    const separacion = Math.max(draft.separacion, 0);
    const inicial = Math.max(draft.inicial || 0, 0);
    const meses = Math.round(draft.meses || 0);

    return {
      ...draft,
      precioRegular: regular,
      precioPromocional: promo,
      descuentoSoles,
      descuentoPct,
      diasVigencia: dias,
      fechaCaducidad,
      separacion,
      inicial,
      meses,
    };
  };

  const updateProforma = (updater: (current: ProformaState) => ProformaState) => {
    setProforma((current) => recalcProforma(updater(current)));
    setProformaDirty(true);
  };


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

  const loadImageElement = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar imagen: ${src}`));
      image.src = src;
    });

  const captureCurrentMapView = async () => {
    if (!mapContainerRef.current) return null;

    const width = Math.max(1, Math.round(mapContainerRef.current.clientWidth));
    const height = Math.max(1, Math.round(mapContainerRef.current.clientHeight));
    const exportScale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));

    const canvas = document.createElement("canvas");
    canvas.width = width * exportScale;
    canvas.height = height * exportScale;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.scale(exportScale, exportScale);
    context.fillStyle = "#f7f0e4";
    context.fillRect(0, 0, width, height);

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

    context.save();
    context.translate(mapTransform.positionX, mapTransform.positionY);
    context.scale(mapTransform.scale, mapTransform.scale);
    context.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);

    const sourceSvg = svgRef.current;
    if (sourceSvg) {
      const svgClone = sourceSvg.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

      sourceSvg.querySelectorAll<SVGElement>("[id]").forEach((node) => {
        const id = node.getAttribute("id");
        if (!id) return;
        const cloneNode = svgClone.querySelector<SVGElement>(`#${CSS.escape(id)}`);
        if (!cloneNode) return;
        const style = window.getComputedStyle(node);
        cloneNode.setAttribute("fill", style.fill);
        cloneNode.setAttribute("stroke", style.stroke);
        cloneNode.setAttribute("stroke-width", style.strokeWidth);
        cloneNode.setAttribute("opacity", style.opacity);
        cloneNode.setAttribute("stroke-linejoin", style.strokeLinejoin);
        cloneNode.setAttribute("stroke-linecap", style.strokeLinecap);
      });

      const serialized = new XMLSerializer().serializeToString(svgClone);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
      const svgImage = await loadImageElement(svgDataUrl);

      context.save();
      context.translate(overlay.x, overlay.y);
      context.scale(overlay.scale, overlay.scale);
      context.drawImage(svgImage, 0, 0);
      context.restore();
    }

    context.restore();
    return canvas.toDataURL("image/png");
  };

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
      // Avoid double transform: we apply overlay transform in canvas, not inside serialized SVG.
      svgClone.style.transform = "none";
      svgClone.style.transformOrigin = "0 0";

      // Force light theme lot colors for consistent export regardless of current theme.
      const LIGHT_FILL_LIBRE = "rgba(60, 223, 101, 0.322)";
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
          cloneNode.setAttribute("fill", LIGHT_FILL_LIBRE);
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

    // Overlay information drawn directly in the PDF to keep text crisp/selectable.
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
        let drawX = boxX;
        let drawY = boxY;
        if (ratio > boxW / boxH) {
          drawH = boxW / ratio;
          drawY += (boxH - drawH) / 2;
        } else {
          drawW = boxH * ratio;
          drawX += (boxW - drawW) / 2;
        }
        logoCtx.drawImage(logoImage, 0, 0, logoCanvas.width, logoCanvas.height);
        const logoData = logoCanvas.toDataURL("image/png", 1);
        pdf.addImage(logoData, "PNG", drawX, drawY, drawW, drawH, undefined, "FAST");
      }
    } catch {
      // Continue export if logo fails.
    }

    pdf.setTextColor(58, 46, 37);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(57 / 3); // ~19px equivalent
    pdf.text("Resumen general", panelX + 20, panelY + 150);

    const drawStatRow = (label: string, value: number, row: number, rgb: [number, number, number]) => {
      const rowY = panelY + 166 + row * 42;
      const tint =
        row === 0
          ? [255, 238, 238]
          : row === 1
            ? [255, 247, 227]
            : [234, 250, 238];
      pdf.setFillColor(tint[0], tint[1], tint[2]);
      pdf.setDrawColor(223, 211, 196);
      pdf.roundedRect(panelX + 16, rowY, panelW - 32, 32, 16, 16, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(54 / 3); // ~18px equivalent
      pdf.setTextColor(92, 72, 56);
      pdf.text(label, panelX + 30, rowY + 21);
      pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
      const valueText = String(value);
      pdf.setFontSize(60 / 3); // ~20px equivalent
      const textWidth = pdf.getTextWidth(valueText);
      pdf.text(valueText, panelX + panelW - 30 - textWidth, rowY + 21);
    };

    drawStatRow("Vendidos", vendidoCount, 0, [198, 40, 40]);
    drawStatRow("Separados", separadoCount, 1, [154, 107, 0]);
    drawStatRow("Disponibles", disponibleCount, 2, [31, 138, 76]);

    pdf.save(`mapa-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportPrintable = async () => {
    const standardQuoteHtml = `
      <section class="card">
        <h3>Cotizacion estandar</h3>
        <div class="grid">
          <div><span>Precio</span><strong>${formatMoney(quote.precio)}</strong></div>
          <div><span>Inicial</span><strong>${formatMoney(montoInicial)}</strong></div>
          <div><span>Meses</span><strong>${quote.cuotas}</strong></div>
          <div><span>Cuota mensual</span><strong>${formatMoney(cuota)}</strong></div>
        </div>
      </section>
    `;

    const manualQuoteHtml = `
      <section class="card">
        <h3>Cotizacion manual</h3>
        <div class="grid">
          <div><span>Precio</span><strong>${formatMoney(quote.precio)}</strong></div>
          <div><span>Inicial</span><strong>${formatMoney(montoInicial)}</strong></div>
          <div><span>Meses</span><strong>${quote.cuotas}</strong></div>
          <div><span>Cuota mensual</span><strong>${formatMoney(cuota)}</strong></div>
        </div>
        <p class="muted">Formula: (Precio - Inicial) / Meses</p>
      </section>
    `;

    const loteHtml = selectedLote
      ? `
      <section class="card">
        <h3>Detalle del lote</h3>
        <div class="grid">
          <div><span>Lote</span><strong>${selectedLote.id}</strong></div>
          <div><span>Area</span><strong>${formatArea(selectedLote.areaM2)}</strong></div>
          <div><span>Precio</span><strong>${formatMoney(selectedLote.price)}</strong></div>
          <div><span>Estado</span><strong>${selectedLote.condicion}</strong></div>
          <div><span>Asesor</span><strong>${selectedLote.asesor ?? "-"}</strong></div>
        </div>
      </section>
    `
      : "";

    const tableHtml =
      view === "tabla"
        ? `
      <section class="card">
        <h3>Resumen de lotes (${filteredLotes.length})</h3>
        <table>
          <thead>
            <tr>
              <th>MZ</th>
              <th>LT</th>
              <th>AREA (M2)</th>
              <th>ASESOR</th>
              <th>PRECIO</th>
              <th>CONDICION</th>
            </tr>
          </thead>
          <tbody>
            ${filteredLotes
              .map(
                (lote) => `
              <tr>
                <td>${lote.mz}</td>
                <td>${lote.lote}</td>
                <td>${formatArea(lote.areaM2)}</td>
                <td>${lote.asesor ?? "-"}</td>
                <td>${formatMoney(lote.price)}</td>
                <td>${lote.condicion}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `
        : "";

    let mapCaptureHtml = "";
    if (view === "mapa" && mapContainerRef.current) {
      try {
        const dataUrl = await captureCurrentMapView();
        if (dataUrl) {
          mapCaptureHtml = `
            <section class="card">
              <h3>Vista actual del mapa</h3>
              <div class="map-box">
                <img src="${dataUrl}" alt="Mapa capturado" />
              </div>
            </section>
          `;
        }
      } catch (error) {
        console.error("No se pudo capturar el mapa para imprimir:", error);
      }
    }

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Reporte Arenas Malabrigo</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: "Space Grotesk", Arial, sans-serif; color: #1b1b1b; }
            h1 { margin: 0 0 6px; color: #c24a18; }
            .sub { margin: 0 0 16px; color: #6a5c4c; }
            .card { border: 1px solid #efd4c1; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
            .grid span { display: block; font-size: 12px; color: #6a5c4c; }
            .grid strong { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 6px 8px; border-bottom: 1px solid #f0dccd; text-align: left; }
            th { background: #fff3e7; color: #8f3a18; }
            .map-box img { width: 100%; border-radius: 8px; border: 1px solid #f0dccd; }
            .muted { color: #6a5c4c; font-size: 12px; margin-top: 6px; }
          </style>
        </head>
        <body>
          <h1>Mapa interactivo - Arenas Malabrigo</h1>
          <p class="sub">Reporte generado el ${new Date().toLocaleString("es-PE")}</p>
          ${loteHtml}
          ${standardQuoteHtml}
          ${manualQuoteHtml}
          ${mapCaptureHtml}
          ${tableHtml}
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportProforma = async () => {
    const requiredName = proforma.cliente.nombre.trim();
    const requiredDni = proforma.cliente.dni.trim();
    const requiredCel = proforma.cliente.celular.trim();
    if (!requiredName || !requiredDni || !requiredCel) {
      setProformaAlert("Completa nombre, DNI y celular del cliente para imprimir la proforma.");
      return;
    }

    const created = new Date(proforma.creadoEn);
    const line = (value: string) => (value.trim() ? value : "__________________________");
    const vendorName = line(proforma.vendedor.nombre);
    const vendorPhone = line(proforma.vendedor.celular);
    const clientName = line(proforma.cliente.nombre);
    const clientDni = line(proforma.cliente.dni);
    const clientCel = line(proforma.cliente.celular);
    const clientAddress = line(proforma.cliente.direccion);
    const clientMail = line(proforma.cliente.correo);

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Proforma Arenas Malabrigo</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1b1b1b; }
            .page { border: 2px solid #d7b08a; border-radius: 16px; padding: 0; position: relative; overflow: hidden; }
            .page::before,
            .page::after {
              content: "";
              position: absolute;
              left: 0;
              right: 0;
              height: 14mm;
              background: linear-gradient(135deg, #1f8a4c 0 45%, #f4b24d 45% 60%, #1f8a4c 60% 100%);
            }
            .page::before { top: 0; }
            .page::after {
              bottom: 0;
              transform: rotate(180deg);
            }
            .page-content { padding: 18mm 14px 18mm; position: relative; z-index: 1; }
            .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
            .header h1 { margin: 0; font-size: 20px; color: #b14518; }
            .meta { font-size: 11px; color: #6a5c4c; }
            .meta-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
            .meta-line .expiry { font-weight: 700; font-size: 1.05rem; color: #b14518; }
            .seller-name { font-size: 1.1rem; font-weight: 700; color: #1b1b1b; }
            .logo { height: 34px; object-fit: contain; }
            .section { border: 1px solid #efd4c1; border-radius: 12px; padding: 10px 12px; margin-top: 10px; }
            .section h2 { margin: 0 0 8px; font-size: 12px; color: #8f3a18; text-transform: uppercase; letter-spacing: 0.02em; }
            .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 10px; }
            .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 14px; }
            .label { font-size: 11px; color: #6a5c4c; display: block; }
            .value { font-weight: 600; font-size: 12px; }
            .price-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
            .price-card { border: 2px solid #7a4a00; border-radius: 14px; padding: 12px; background: #fffdf9; font-size: 1.08rem; }
            .price-card h3 { margin: 0 0 8px; font-size: 1.35rem; }
            .price-card .price { font-size: 1.85rem; font-weight: 700; color: #b14518; }
            .price-card .sub { font-size: 1.05rem; color: #6a5c4c; }
            .price-list { margin-top: 6px; display: grid; gap: 4px; font-size: 1.2rem; }
            .price-list > div { display: flex; justify-content: space-between; gap: 8px; }
            .price-list strong { text-align: right; font-weight: 700; }
            .quick { border: 1px solid #2c2c2c; border-radius: 12px; padding: 8px 10px; margin-top: 8px; font-size: 1.15rem; border-color: #c47a00; }
            .quick-row { display: flex; justify-content: space-between; }
            .savings { margin-top: 10px; font-weight: 800; font-size: 1.45rem; text-align: center; color: #1f8a4c; }
            .expiry { margin-top: 4px; font-weight: 700; font-size: 1.1rem; color: #b14518; }
            .monthly { font-size: 1.2rem; font-weight: 700; }
            .footer { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
            .footer .meta { font-size: 12px; }
            .project-logo { height: 40px; object-fit: contain; border: 1px solid #efd4c1; border-radius: 10px; padding: 6px; background: #fffaf1; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="page-content">
            <div class="header">
              <div>
                <h1>Proforma Arenas Malabrigo</h1>
                <div class="meta-line">
                  <div class="meta">Fecha y hora: ${created.toLocaleString("es-PE")}</div>
                  <div class="expiry">Vence: ${proforma.fechaCaducidad}</div>
                </div>
                <div class="meta-line">
                  <div class="meta">Asesor de ventas: <span class="seller-name">${vendorName}</span></div>
                  <div class="meta"> Celular: <span class="seller-name">${vendorPhone}</span></div>
                </div>
              </div>
                <img src="/assets/Logo_Arenas_Malabrigo.svg" class="logo" alt="Arenas Malabrigo" />
              </div>

            <section class="section">
              <h2>Datos del cliente</h2>
              <div class="grid-4">
                <div><span class="label">Nombre completo</span><span class="value">${clientName}</span></div>
                <div><span class="label">DNI</span><span class="value">${clientDni}</span></div>
                <div><span class="label">Celular</span><span class="value">${clientCel}</span></div>
                <div><span class="label">Direccion</span><span class="value">${clientAddress}</span></div>
                <div><span class="label">Correo</span><span class="value">${clientMail}</span></div>
              </div>
            </section>

            <section class="section">
              <h2>Informacion del lote</h2>
              <div class="grid-4">
                <div><span class="label">Proyecto</span><span class="value">${proforma.lote.proyecto}</span></div>
                <div><span class="label">Ubicacion referencial</span><span class="value">${proforma.lote.ubicacion}</span></div>
                <div><span class="label">Manzana</span><span class="value">${proforma.lote.mz}</span></div>
                <div><span class="label">Lote</span><span class="value">${proforma.lote.lote}</span></div>
                <div><span class="label">Area total</span><span class="value">${proforma.lote.area}</span></div>
              </div>
            </section>

            <div class="price-grid">
              <div class="price-card">
                <h3>Precio regular</h3>
                <div class="price">${formatMoney(proforma.precioRegular)}</div>
                <div class="price-list">
                  <div>Separacion: ${formatMoney(proforma.separacion)}</div>
                  <div>Inicial: ${formatMoney(proforma.inicial)}</div>
                  <div>Precio a financiar: ${formatMoney(precioFinanciarRegular)}</div>
                </div>
                <div class="quick">
                  <div class="sub">Cotizado rapido de pago mensual</div>
                  <div class="quick-row"><span>12 meses</span><strong>${formatMoney(cuotasRapidas(precioFinanciarRegular)[12])}</strong></div>
                  <div class="quick-row"><span>24 meses</span><strong>${formatMoney(cuotasRapidas(precioFinanciarRegular)[24])}</strong></div>
                  <div class="quick-row"><span>36 meses</span><strong>${formatMoney(cuotasRapidas(precioFinanciarRegular)[36])}</strong></div>
                </div>
                <div class="sub monthly">Pago mensual en ${proforma.meses} meses: ${formatMoney(proformaCuotaRegular)}</div>
              </div>
              <div class="price-card">
                <h3>Precio promocional</h3>
                <div class="price" style="color:#1f8a4c;">${formatMoney(proforma.precioPromocional)}</div>
                <div class="price-list">
                  <div>Separacion: ${formatMoney(proforma.separacion)}</div>
                  <div>Inicial: ${formatMoney(proforma.inicial)}</div>
                  <div>Precio a financiar: ${formatMoney(precioFinanciarPromo)}</div>
                </div>
                <div class="quick">
                  <div class="sub">Cotizado rapido de pago mensual</div>
                  <div class="quick-row"><span>12 meses</span><strong>${formatMoney(cuotasRapidas(precioFinanciarPromo)[12])}</strong></div>
                  <div class="quick-row"><span>24 meses</span><strong>${formatMoney(cuotasRapidas(precioFinanciarPromo)[24])}</strong></div>
                  <div class="quick-row"><span>36 meses</span><strong>${formatMoney(cuotasRapidas(precioFinanciarPromo)[36])}</strong></div>
                </div>
                <div class="sub monthly">Pago mensual en ${proforma.meses} meses: ${formatMoney(proformaCuotaPromo)}</div>
              </div>
            </div>

            <div class="savings">Ahorro en: ${formatMoney(proformaAhorro)}</div>

            <div class="footer">
              <div class="meta">
                <div><strong>Datos de la empresa</strong></div>
                <div>RAZON SOCIAL: ${projectInfo.owner}</div>
                <div>RUC: ${projectInfo.ownerRuc}</div>
                <div>DIRECCIÓN: ${EMPRESA_DIRECCION}</div>
              </div>
              <img src="/assets/HOLA-TRUJILLO_LOGOTIPO.webp" class="project-logo" alt="Hola Trujillo" />
            </div>
            </div>
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const openProforma = () => {
    if (!selectedLote) {
      setProformaAlert("Selecciona un lote para crear la proforma.");
      return;
    }
    if (selectedLote.condicion === "VENDIDO") {
      setProformaAlert("Este lote esta vendido. No se puede crear proforma.");
      return;
    }
    refreshProformaFromLote(selectedLote);
    setProformaOpen(true);
  };

  const mapShellClassName = rightOpen ? "map-shell has-drawer" : "map-shell";
  const MapView = (
    <section className="map-page">
      <section className={mapShellClassName}>
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
                      <span className="status-pill libre">Disponible</span>
                      <span className="status-pill separado">Separado</span>
                      <span className="status-pill vendido">Vendido</span>
                    </div>
                    <div className="map-controls">
                      <button className="btn ghost" onClick={() => zoomIn()}>
                        +
                      </button>
                      <button className="btn ghost" onClick={() => zoomOut()}>
                        -
                      </button>
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
              onSelectLote={(id) => {
                setSelectedId(id);
                setRightOpen(true);
              }}
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
      <CotizadorDrawer
        rightOpen={rightOpen}
        selectedLote={selectedLote}
        pulseMz={pulseMz}
        pulseLote={pulseLote}
        quote={quote}
        quoteInvalidInicial={quoteInvalidInicial}
        quoteInvalidMeses={quoteInvalidMeses}
        cuota={cuota}
        cuotaRapida={cuotaRapida}
        onPrint={exportPrintable}
        onOpenProforma={openProforma}
        onClose={() => {
          setRightOpen(false);
          setSelectedId(null);
        }}
        onChangeQuote={setQuote}
      />
      </section>
    </section>
  );

  return (
    <Fragment>
      <AppShell contentClassName="main--map">
        {MapView}
      </AppShell>

      {proformaOpen && (
          <ProformaModal
            proforma={proforma}
            proformaInvalidInicial={proformaInvalidInicial}
            proformaInvalidMeses={proformaInvalidMeses}
            precioFinanciarRegular={precioFinanciarRegular}
            precioFinanciarPromo={precioFinanciarPromo}
            proformaCuotaRegular={proformaCuotaRegular}
            proformaCuotaPromo={proformaCuotaPromo}
            proformaAhorro={proformaAhorro}
            cuotasRapidas={cuotasRapidas}
            onBackdropClose={() => {
              if (proformaDirty) {
                setProformaConfirmClose(true);
              } else {
                setProformaOpen(false);
              }
            }}
            onPrint={exportProforma}
            onRequestClose={() => {
              if (proformaDirty) {
                setProformaConfirmClose(true);
              } else {
                setProformaOpen(false);
              }
            }}
            onUpdate={(updater) => {
              lastPriceEditedRef.current = null;
              updateProforma(updater);
            }}
            onDiscountSoles={(value) => {
              lastPriceEditedRef.current = "soles";
              updateProforma((current) => ({ ...current, descuentoSoles: value }));
            }}
            onDiscountPct={(value) => {
              lastPriceEditedRef.current = "pct";
              updateProforma((current) => ({ ...current, descuentoPct: value }));
            }}
            onPromoPrice={(value) => {
              lastPriceEditedRef.current = "promo";
              updateProforma((current) => ({ ...current, precioPromocional: value }));
            }}
          />
        )}

      {proformaConfirmClose && (
          <div className="modal-backdrop" onClick={() => setProformaConfirmClose(false)}>
            <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
              <h4>Descartar cambios?</h4>
              <p className="muted">Tienes cambios sin guardar. Deseas cerrar la proforma?</p>
              <div className="confirm-actions">
                <button className="btn ghost" onClick={() => setProformaConfirmClose(false)}>
                  Cancelar
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setProformaConfirmClose(false);
                    setProformaOpen(false);
                    setProformaDirty(false);
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}

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

      {proformaAlert && (
          <div className="modal-backdrop" onClick={() => setProformaAlert(null)}>
            <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
              <h4>Proforma</h4>
              <p className="muted">{proformaAlert}</p>
              <div className="confirm-actions">
                <button className="btn" onClick={() => setProformaAlert(null)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
    </Fragment>
  );
}

export default PublicMapPage;





