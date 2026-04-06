import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COMPANY_LOGO_IMAGE } from "./assets";
import { useAuth } from "./AuthContext";
import { isReservedProjectSlug } from "./projectRoutes";
import { useTheme } from "./theme";
import { defaultOverlay } from "../domain/constants";
import {
  DEFAULT_LOT_FILL_OPACITY,
  DEFAULT_LOT_FILL_OPACITY_PALETTE,
  DEFAULT_LOT_STATE_PALETTE,
  hexToRgba,
  normalizeLotFillOpacity,
  normalizeLotFillOpacityPalette,
  normalizeLotStatePalette,
} from "../domain/lotStatePalette";
import { applyProjectThemeCssVars } from "../domain/projectThemePalette";
import type { ProjectContextBundle, ProjectContextResponse, ProjectVisualResponse } from "../domain/projectContext";
import { getProjectContext, getProjectVisual, getPublicProjectContext, getPublicProjectVisual, readPreferredProjectSlug, writePreferredProjectSlug } from "../services/projectContext";

type ProjectDisplay = {
  projectId: string | null;
  projectSlug: string;
  projectName: string;
  stage: string;
  owner: string;
  ownerRuc: string;
  locationText: string;
  companyAddress: string;
  amenities: string[];
  salesHighlights: Array<{ title: string; description: string }>;
  logoHeaderUrl: string;
  logoProyectoUrl: string;
  logoFooterUrl: string;
  mapaWebpUrl: string;
  overlay: {
    x: number;
    y: number;
    scale: number;
  };
  initialMinima: number;
  separacionMinima: number;
  cuotasMinimas: number;
  cuotasMaximas: number;
  mesesReferenciales: number[];
  tiposFinanciamiento: string[];
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
};

type ProjectContextState = {
  loading: boolean;
  error: string | null;
  bundle: ProjectContextResponse | null;
  context: ProjectContextBundle | null;
  display: ProjectDisplay;
  refresh: (options?: { force?: boolean }) => Promise<void>;
};

type ProjectProviderProps = {
  children: ReactNode;
  routeSlug?: string | null;
};

const buildSafeFallbackSlug = (value?: string | null) => {
  const normalized = normalizeProjectSlug(value);
  return normalized && !isReservedProjectSlug(normalized) ? normalized : "";
};

const buildFallbackDisplay = (routeSlug?: string | null): ProjectDisplay => ({
  projectId: null,
  projectSlug: buildSafeFallbackSlug(routeSlug),
  projectName: "Proyecto",
  stage: "",
  owner: "",
  ownerRuc: "",
  locationText: "",
  companyAddress: "",
  amenities: [],
  salesHighlights: [],
  logoHeaderUrl: COMPANY_LOGO_IMAGE,
  logoProyectoUrl: "",
  logoFooterUrl: COMPANY_LOGO_IMAGE,
  mapaWebpUrl: "",
  overlay: { ...defaultOverlay },
  initialMinima: 6000,
  separacionMinima: 0,
  cuotasMinimas: 1,
  cuotasMaximas: 36,
  mesesReferenciales: [12, 24, 36],
  tiposFinanciamiento: ["REDUCIR_CUOTA", "REDUCIR_MESES"],
  metaTitle: "Proyecto",
  metaDescription: "Proyecto inmobiliario",
  ogImageUrl: "",
});

const normalizeProjectSlug = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ProjectContext = createContext<ProjectContextState | undefined>(undefined);
const PROJECT_VISUAL_SNAPSHOT_PREFIX = "project_visual_snapshot:";

const fallbackProjectContextState: ProjectContextState = {
  loading: false,
  error: null,
  bundle: null,
  context: null,
  display: buildFallbackDisplay(null),
  refresh: async () => {},
};

const PROJECT_LOT_PALETTE_VAR_KEYS = [
  "--lot-color-disponible",
  "--lot-color-separado",
  "--lot-color-vendido",
  "--lot-color-selected",
  "--lot-fill-disponible",
  "--lot-fill-separado",
  "--lot-fill-vendido",
  "--lot-fill-selected",
  "--lot-fill-libre",
  "--lot-fill-libre-strong",
  "--lot-fill-separado",
  "--lot-fill-vendido",
];

type ProjectVisualSource = {
  logoHeaderUrl?: string | null;
  ui?: {
    themeSeed?: Record<string, unknown> | null;
    themeOverrides?: Record<string, unknown> | null;
    lotStatePalette?: Partial<typeof DEFAULT_LOT_STATE_PALETTE> | null;
    lotFillOpacity?: unknown;
    lotFillOpacityPalette?: Partial<typeof DEFAULT_LOT_FILL_OPACITY_PALETTE> | null;
  } | null;
} | null;

const readProjectVisualSnapshot = (slug?: string | null): ProjectVisualSource | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const normalizedSlug = normalizeProjectSlug(slug);
  if (!normalizedSlug) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(`${PROJECT_VISUAL_SNAPSHOT_PREFIX}${normalizedSlug}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ProjectVisualSource;
  } catch {
    return null;
  }
};

const writeProjectVisualSnapshot = (slug: string | null | undefined, source: ProjectVisualSource) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSlug = normalizeProjectSlug(slug);
  if (!normalizedSlug || !source?.ui) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${PROJECT_VISUAL_SNAPSHOT_PREFIX}${normalizedSlug}`,
      JSON.stringify({
        ui: {
          themeSeed: source.ui.themeSeed ?? {},
          themeOverrides: source.ui.themeOverrides ?? {},
          lotStatePalette: {},
          lotFillOpacity: DEFAULT_LOT_FILL_OPACITY,
          lotFillOpacityPalette: DEFAULT_LOT_FILL_OPACITY_PALETTE,
        },
      }),
    );
  } catch {
    // no-op
  }
};

const applyProjectTheme = (source: ProjectVisualSource, effectiveTheme: "light" | "dark") => {
  if (typeof document === "undefined") {
    return;
  }

  const rootStyle = document.documentElement.style;
  for (const cssVar of PROJECT_LOT_PALETTE_VAR_KEYS) {
    rootStyle.removeProperty(cssVar);
  }

  const ui = source?.ui;
  applyProjectThemeCssVars(rootStyle, ui?.themeSeed, ui?.themeOverrides, effectiveTheme);
  if (!ui) return;

  const palette = normalizeLotStatePalette(ui.lotStatePalette as Partial<typeof DEFAULT_LOT_STATE_PALETTE>);
  const fillOpacity = normalizeLotFillOpacity(ui.lotFillOpacity, DEFAULT_LOT_FILL_OPACITY);
  const fillOpacityPalette = normalizeLotFillOpacityPalette(
    ui.lotFillOpacityPalette as Partial<typeof DEFAULT_LOT_FILL_OPACITY_PALETTE>,
    {
      disponible: fillOpacity,
      separado: fillOpacity,
      vendido: fillOpacity,
      selected: fillOpacity,
    },
  );
  rootStyle.setProperty("--lot-color-disponible", palette.disponible);
  rootStyle.setProperty("--lot-color-separado", palette.separado);
  rootStyle.setProperty("--lot-color-vendido", palette.vendido);
  rootStyle.setProperty("--lot-color-selected", palette.selected);
  rootStyle.setProperty("--lot-fill-disponible", hexToRgba(palette.disponible, fillOpacityPalette.disponible));
  rootStyle.setProperty("--lot-fill-separado", hexToRgba(palette.separado, fillOpacityPalette.separado));
  rootStyle.setProperty("--lot-fill-vendido", hexToRgba(palette.vendido, fillOpacityPalette.vendido));
  rootStyle.setProperty("--lot-fill-selected", hexToRgba(palette.selected, fillOpacityPalette.selected));
  rootStyle.setProperty("--lot-fill-libre", hexToRgba(palette.disponible, fillOpacityPalette.disponible));
  rootStyle.setProperty("--lot-fill-libre-strong", palette.disponible);
};

const mapBundleToDisplay = (bundle: ProjectContextResponse | null, routeSlug?: string | null): ProjectDisplay => {
  const fallbackDisplay = buildFallbackDisplay(bundle?.resolvedSlug || routeSlug);
  const context = bundle?.contexto;
  if (!context) return fallbackDisplay;

  const overlayRaw = context.ui.overlayConfig ?? {};
  return {
    projectId: context.proyecto.id || null,
    projectSlug: context.proyecto.slug || bundle?.resolvedSlug || fallbackDisplay.projectSlug,
    projectName: context.proyecto.nombre || fallbackDisplay.projectName,
    stage: context.proyecto.etapa || fallbackDisplay.stage,
    owner: context.empresa.razonSocial || fallbackDisplay.owner,
    ownerRuc: context.empresa.ruc || fallbackDisplay.ownerRuc,
    locationText: context.proyecto.ubicacionTexto || fallbackDisplay.locationText,
    companyAddress: context.empresa.direccionFiscal || fallbackDisplay.companyAddress,
    amenities: context.ui.amenities?.length ? context.ui.amenities : fallbackDisplay.amenities,
    salesHighlights: context.ui.highlights?.length ? context.ui.highlights : fallbackDisplay.salesHighlights,
    logoHeaderUrl: context.ui.logoHeaderUrl || fallbackDisplay.logoHeaderUrl,
    logoProyectoUrl: context.ui.logoProyectoUrl || fallbackDisplay.logoProyectoUrl,
    logoFooterUrl: context.ui.logoFooterUrl || fallbackDisplay.logoFooterUrl,
    mapaWebpUrl: context.ui.mapaWebpUrl || fallbackDisplay.mapaWebpUrl,
    overlay: {
      x: Number(overlayRaw.x ?? fallbackDisplay.overlay.x),
      y: Number(overlayRaw.y ?? fallbackDisplay.overlay.y),
      scale: Number(overlayRaw.scale ?? fallbackDisplay.overlay.scale),
    },
    initialMinima: Number(context.comercial.inicialMinima || fallbackDisplay.initialMinima),
    separacionMinima: Number(context.comercial.separacionMinima ?? fallbackDisplay.separacionMinima),
    cuotasMinimas: Number(context.comercial.cuotasMinimas || fallbackDisplay.cuotasMinimas),
    cuotasMaximas: Number(context.comercial.cuotasMaximas || fallbackDisplay.cuotasMaximas),
    mesesReferenciales: context.comercial.mesesReferenciales?.length
      ? context.comercial.mesesReferenciales
      : fallbackDisplay.mesesReferenciales,
    tiposFinanciamiento: context.comercial.tiposFinanciamiento?.length
      ? context.comercial.tiposFinanciamiento
      : fallbackDisplay.tiposFinanciamiento,
    metaTitle: context.ui.metaTitle || fallbackDisplay.metaTitle,
    metaDescription: context.ui.metaDescription || fallbackDisplay.metaDescription,
    ogImageUrl: context.ui.ogImageUrl || fallbackDisplay.ogImageUrl,
  };
};

export function ProjectProvider({ children, routeSlug = null }: ProjectProviderProps) {
  const { isAuthenticated, rawRole } = useAuth();
  const { effectiveTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ProjectContextResponse | null>(null);
  const [visualBundle, setVisualBundle] = useState<ProjectVisualResponse | null>(null);
  const activeRequestRef = useRef(0);
  const activeVisualRequestRef = useRef(0);
  const effectiveSlug = routeSlug || (isAuthenticated && rawRole === "SUPERADMIN" ? readPreferredProjectSlug() : null);
  const normalizedEffectiveSlug = normalizeProjectSlug(effectiveSlug);
  const normalizedRequestedSlug = normalizeProjectSlug(bundle?.requestedSlug);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    try {
      setLoading(true);
      setError(null);
      const nextBundle = isAuthenticated
        ? await getProjectContext({ slug: effectiveSlug, force: options?.force })
        : await getPublicProjectContext({ slug: routeSlug, force: options?.force });
      if (activeRequestRef.current !== requestId) {
        return;
      }
      setBundle(nextBundle);
    } catch (loadError) {
      if (activeRequestRef.current !== requestId) {
        return;
      }
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar contexto del proyecto.");
      setBundle(null);
    } finally {
      if (activeRequestRef.current !== requestId) {
        return;
      }
      setLoading(false);
    }
  }, [effectiveSlug, isAuthenticated, routeSlug]);

  const refreshVisual = useCallback(async (options?: { force?: boolean }) => {
    const requestId = activeVisualRequestRef.current + 1;
    activeVisualRequestRef.current = requestId;
    try {
      const nextVisual = isAuthenticated
        ? await getProjectVisual({ slug: effectiveSlug, force: options?.force })
        : await getPublicProjectVisual({ slug: routeSlug, force: options?.force });
      if (activeVisualRequestRef.current !== requestId) {
        return;
      }
      setVisualBundle(nextVisual);
    } catch (loadError) {
      if (activeVisualRequestRef.current !== requestId) {
        return;
      }
      console.error(loadError);
      setVisualBundle(null);
    }
  }, [effectiveSlug, isAuthenticated, routeSlug]);

  useEffect(() => {
    void refreshVisual();
    void refresh();
  }, [refresh, refreshVisual]);

  useEffect(() => {
    const resolvedSlug = bundle?.contexto?.proyecto.slug || bundle?.resolvedSlug || effectiveSlug || routeSlug;
    if (bundle?.contexto?.ui && resolvedSlug) {
      writeProjectVisualSnapshot(resolvedSlug, bundle.contexto);
    }
  }, [bundle, effectiveSlug, routeSlug]);

  useEffect(() => {
    const resolvedSlug = visualBundle?.resolvedSlug || effectiveSlug || routeSlug;
    if (visualBundle?.visual && resolvedSlug) {
      writeProjectVisualSnapshot(resolvedSlug, {
        logoHeaderUrl: visualBundle.visual.logoHeaderUrl,
        ui: {
          themeSeed: visualBundle.visual.themeSeed,
          themeOverrides: visualBundle.visual.themeOverrides,
        },
      });
    }
  }, [effectiveSlug, routeSlug, visualBundle]);

  useLayoutEffect(() => {
    const visualSource =
      bundle?.contexto ??
      (visualBundle?.visual
        ? {
            logoHeaderUrl: visualBundle.visual.logoHeaderUrl,
            ui: {
              themeSeed: visualBundle.visual.themeSeed,
              themeOverrides: visualBundle.visual.themeOverrides,
            },
          }
        : null) ??
      readProjectVisualSnapshot(bundle?.resolvedSlug || effectiveSlug || routeSlug);
    applyProjectTheme(visualSource, effectiveTheme);
  }, [bundle, effectiveSlug, effectiveTheme, routeSlug, visualBundle]);

  useEffect(() => {
    if (!isAuthenticated || rawRole !== "SUPERADMIN" || !bundle?.resolvedSlug) {
      return;
    }
    writePreferredProjectSlug(bundle.resolvedSlug);
  }, [bundle?.resolvedSlug, isAuthenticated, rawRole]);

  const value = useMemo<ProjectContextState>(() => {
    const context = bundle?.contexto ?? null;
    const isAwaitingCurrentRequest =
      Boolean(normalizedEffectiveSlug) &&
      normalizedRequestedSlug !== normalizedEffectiveSlug;

    return {
      loading: loading || isAwaitingCurrentRequest,
      error,
      bundle,
      context,
      display: isAwaitingCurrentRequest ? buildFallbackDisplay(effectiveSlug) : mapBundleToDisplay(bundle, routeSlug),
      refresh,
    };
  }, [bundle, effectiveSlug, error, loading, normalizedEffectiveSlug, normalizedRequestedSlug, refresh, routeSlug]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    if (typeof window !== "undefined") {
      console.warn("useProjectContext rendered outside ProjectProvider. Falling back to safe defaults.");
    }
    return fallbackProjectContextState;
  }
  return context;
}
