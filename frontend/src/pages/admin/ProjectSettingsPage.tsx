import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import { useProjectContext } from "../../app/ProjectContext";
import { useTheme } from "../../app/theme";
import { buildPrivateProjectPath, buildPublicProjectPath, isReservedProjectSlug } from "../../app/projectRoutes";
import ProjectThemePaletteEditor from "../../components/admin/ProjectThemePaletteEditor";
import ProjectLotStateEditor from "../../components/admin/ProjectLotStateEditor";
import AdminTextInput from "../../components/admin/AdminTextInput";
import AdminTextarea from "../../components/admin/AdminTextarea";
import AppModal from "../../components/ui/AppModal";
import { DEFAULT_LOT_STATE_PALETTE, normalizeHexColor } from "../../domain/lotStatePalette";
import {
  applyProjectThemeCssVars,
  buildProjectThemeSeedPayload,
  normalizeProjectThemePaletteState,
  type ProjectThemePaletteState,
} from "../../domain/projectThemePalette";
import type { ProjectContextBundle, ProjectContextResponse } from "../../domain/projectContext";
import { createProject, getProjectSettings, getProjectUiCopySource, writePreferredProjectSlug, updateProjectBase, updateProjectCommercial, updateProjectUi } from "../../services/projectContext";

type SocialRow = { label: string; kind: string; url: string };
type HighlightRow = { title: string; description: string };
type ProjectSectionKey = "base" | "commercial" | "branding" | "interface";
type UiCopySectionKey = "assets" | "branding" | "socials" | "highlights";

type BaseForm = {
  nombre: string;
  slug: string;
  etapa: string;
  descripcionCorta: string;
  ubicacionTexto: string;
  distrito: string;
  provincia: string;
  departamento: string;
  pais: string;
  fechaInicio: string;
  fechaFin: string;
  estado: boolean;
  logoProyectoUrl: string;
};

type UiForm = {
  logoProyectoUrl: string;
  logoHeaderUrl: string;
  logoFooterUrl: string;
  mapaSvgUrl: string;
  mapaWebpUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  overlayX: string;
  overlayY: string;
  overlayScale: string;
  lotDisponibleColor: string;
  lotSeparadoColor: string;
  lotVendidoColor: string;
  lotSelectedColor: string;
  lotFillOpacity: string;
  lotDisponibleOpacity: string;
  lotSeparadoOpacity: string;
  lotVendidoOpacity: string;
  lotSelectedOpacity: string;
  themePalette: ProjectThemePaletteState;
  themeOverridesRaw: Record<string, unknown>;
  proformaConfig: string;
  impresionConfig: string;
  amenitiesText: string;
  redesSociales: SocialRow[];
  highlights: HighlightRow[];
  estado: boolean;
};

type ComercialForm = {
  inicialMinima: string;
  separacionMinima: string;
  cuotasMinimas: string;
  cuotasMaximas: string;
  mesesReferenciales: string;
  tiposFinanciamiento: string[];
  plusvaliaBasePct: string;
  plusvaliaAnualPct: string;
  tasaInteresAnualRef: string;
  precioMinimoLote: string;
  precioMaximoLote: string;
  reglasDescuento: string;
  ventaConfig: string;
  estado: boolean;
};

type CreateProjectForm = {
  nombre: string;
  etapa: string;
  descripcionCorta: string;
  ubicacionTexto: string;
  distrito: string;
  provincia: string;
  departamento: string;
  pais: string;
  fechaInicio: string;
  fechaFin: string;
  estado: boolean;
};

const projectSections: Array<{
  key: ProjectSectionKey;
  label: string;
  description: string;
  saveLabel: string;
}> = [
  {
    key: "base",
    label: "Datos basicos",
    description: "Identidad, slug y ubicacion operativa del proyecto.",
    saveLabel: "Guardar base",
  },
  {
    key: "commercial",
    label: "Configuracion comercial",
    description: "Reglas del cotizador, venta y financiamiento del proyecto.",
    saveLabel: "Guardar comercial",
  },
  {
    key: "branding",
    label: "Branding",
    description: "Activos visuales y presencia de marca del proyecto.",
    saveLabel: "Guardar branding",
  },
  {
    key: "interface",
    label: "Interfaz",
    description: "Mapa, overlay y comportamiento visual del proyecto.",
    saveLabel: "Guardar interfaz",
  },
];

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 4h11l3 3v13H5V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 4v5h8V4M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type CopyProjectOption = {
  proyectoId: string;
  slug: string;
  nombre: string;
  etapa: string;
};

type SectionCopyToolsProps = {
  section: UiCopySectionKey;
  projects: CopyProjectOption[];
  value: string;
  loading: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onApply: () => void;
};

function SectionCopyTools({
  section,
  projects,
  value,
  loading,
  disabled = false,
  onChange,
  onApply,
}: SectionCopyToolsProps) {
  if (!projects.length) {
    return null;
  }

  return (
    <div className="settings-copy-tools">
      <label className="settings-copy-tools__label">
        <span>Copiar de</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} disabled={loading || disabled}>
          <option value="">Seleccionar proyecto</option>
          {projects.map((project) => (
            <option key={`${section}-${project.proyectoId}`} value={project.slug}>
              {project.etapa ? `${project.nombre} · ${project.etapa}` : project.nombre}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn primary settings-copy-tools__apply" disabled={loading || disabled || !value} onClick={onApply}>
        <IconCopy />
        {loading ? "Copiando..." : "Copiar"}
      </button>
    </div>
  );
}

const toJsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);
const toText = (value: unknown) => (value == null ? "" : String(value));
const toDateInputValue = (value: unknown) => {
  const text = toText(value).trim();
  if (!text) return "";
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

const mapContextToForms = (context: ProjectContextBundle | null) => {
  const base: BaseForm = {
    nombre: context?.proyecto.nombre ?? "",
    slug: context?.proyecto.slug ?? "",
    etapa: context?.proyecto.etapa ?? "",
    descripcionCorta: context?.proyecto.descripcionCorta ?? "",
    ubicacionTexto: context?.proyecto.ubicacionTexto ?? "",
    distrito: context?.proyecto.distrito ?? "",
    provincia: context?.proyecto.provincia ?? "",
    departamento: context?.proyecto.departamento ?? "",
    pais: context?.proyecto.pais ?? "Peru",
    fechaInicio: toDateInputValue(context?.proyecto.fechaInicio ?? ""),
    fechaFin: toDateInputValue(context?.proyecto.fechaFin ?? ""),
    estado: context?.proyecto.activo ?? true,
    logoProyectoUrl: context?.ui.logoProyectoUrl ?? "",
  };

  const ui: UiForm = {
    logoProyectoUrl: context?.ui.logoProyectoUrl ?? "",
    logoHeaderUrl: context?.ui.logoHeaderUrl ?? "",
    logoFooterUrl: context?.ui.logoFooterUrl ?? "",
    mapaSvgUrl: context?.ui.mapaSvgUrl ?? "",
    mapaWebpUrl: context?.ui.mapaWebpUrl ?? "",
    metaTitle: context?.ui.metaTitle ?? "",
    metaDescription: context?.ui.metaDescription ?? "",
    ogImageUrl: context?.ui.ogImageUrl ?? "",
    overlayX: toText((context?.ui.overlayConfig as { x?: number })?.x ?? ""),
    overlayY: toText((context?.ui.overlayConfig as { y?: number })?.y ?? ""),
    overlayScale: toText((context?.ui.overlayConfig as { scale?: number })?.scale ?? ""),
    lotDisponibleColor: normalizeHexColor((context?.ui.lotStatePalette as { disponible?: string })?.disponible, DEFAULT_LOT_STATE_PALETTE.disponible),
    lotSeparadoColor: normalizeHexColor((context?.ui.lotStatePalette as { separado?: string })?.separado, DEFAULT_LOT_STATE_PALETTE.separado),
    lotVendidoColor: normalizeHexColor((context?.ui.lotStatePalette as { vendido?: string })?.vendido, DEFAULT_LOT_STATE_PALETTE.vendido),
    lotSelectedColor: normalizeHexColor((context?.ui.lotStatePalette as { selected?: string })?.selected, DEFAULT_LOT_STATE_PALETTE.selected),
    lotFillOpacity: toText(context?.ui.lotFillOpacity ?? "0.14"),
    lotDisponibleOpacity: toText((context?.ui.lotFillOpacityPalette as { disponible?: number })?.disponible ?? context?.ui.lotFillOpacity ?? "0.14"),
    lotSeparadoOpacity: toText((context?.ui.lotFillOpacityPalette as { separado?: number })?.separado ?? context?.ui.lotFillOpacity ?? "0.14"),
    lotVendidoOpacity: toText((context?.ui.lotFillOpacityPalette as { vendido?: number })?.vendido ?? context?.ui.lotFillOpacity ?? "0.14"),
    lotSelectedOpacity: toText((context?.ui.lotFillOpacityPalette as { selected?: number })?.selected ?? context?.ui.lotFillOpacity ?? "0.14"),
    themePalette: normalizeProjectThemePaletteState(context?.ui.themeSeed ?? {}),
    themeOverridesRaw: (context?.ui.themeOverrides as Record<string, unknown>) ?? {},
    proformaConfig: toJsonText(context?.ui.proformaConfig ?? {}),
    impresionConfig: toJsonText(context?.ui.impresionConfig ?? {}),
    amenitiesText: (context?.ui.amenities ?? []).join("\n"),
    redesSociales: (context?.ui.redesSociales ?? []).map((item) => ({
      label: item.label ?? "",
      kind: item.kind ?? "link",
      url: item.url ?? "",
    })),
    highlights: (context?.ui.highlights ?? []).map((item) => ({
      title: item.title ?? "",
      description: item.description ?? "",
    })),
    estado: true,
  };

  const comercial: ComercialForm = {
    inicialMinima: toText(context?.comercial.inicialMinima ?? ""),
    separacionMinima: toText(context?.comercial.separacionMinima ?? ""),
    cuotasMinimas: toText(context?.comercial.cuotasMinimas ?? ""),
    cuotasMaximas: toText(context?.comercial.cuotasMaximas ?? ""),
    mesesReferenciales: (context?.comercial.mesesReferenciales ?? []).join(", "),
    tiposFinanciamiento: [...(context?.comercial.tiposFinanciamiento ?? [])],
    plusvaliaBasePct: toText(context?.comercial.plusvaliaBasePct ?? ""),
    plusvaliaAnualPct: toText(context?.comercial.plusvaliaAnualPct ?? ""),
    tasaInteresAnualRef: toText(context?.comercial.tasaInteresAnualRef ?? ""),
    precioMinimoLote: toText(context?.comercial.precioMinimoLote ?? ""),
    precioMaximoLote: toText(context?.comercial.precioMaximoLote ?? ""),
    reglasDescuento: toJsonText(context?.comercial.reglasDescuento ?? {}),
    ventaConfig: toJsonText(context?.comercial.ventaConfig ?? {}),
    estado: true,
  };

  return { base, ui, comercial };
};

const emptySocial = (): SocialRow => ({ label: "", kind: "link", url: "" });
const emptyHighlight = (): HighlightRow => ({ title: "", description: "" });
const defaultCreateProjectForm = (): CreateProjectForm => ({
  nombre: "",
  etapa: "",
  descripcionCorta: "",
  ubicacionTexto: "",
  distrito: "",
  provincia: "",
  departamento: "",
  pais: "Peru",
  fechaInicio: "",
  fechaFin: "",
  estado: true,
});

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { rawRole } = useAuth();
  const { refresh, display } = useProjectContext();
  const { effectiveTheme } = useTheme();
  const [bundle, setBundle] = useState<ProjectContextResponse | null>(null);
  const [baseForm, setBaseForm] = useState<BaseForm>(() => mapContextToForms(null).base);
  const [uiForm, setUiForm] = useState<UiForm>(() => mapContextToForms(null).ui);
  const [comercialForm, setComercialForm] = useState<ComercialForm>(() => mapContextToForms(null).comercial);
  const [loading, setLoading] = useState(true);
  const [savingBase, setSavingBase] = useState(false);
  const [savingUi, setSavingUi] = useState(false);
  const [savingComercial, setSavingComercial] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [activeSection, setActiveSection] = useState<ProjectSectionKey>("base");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProjectForm>(defaultCreateProjectForm);
  const [copySourceBySection, setCopySourceBySection] = useState<Record<UiCopySectionKey, string>>({
    assets: "",
    branding: "",
    socials: "",
    highlights: "",
  });
  const [copyingSection, setCopyingSection] = useState<UiCopySectionKey | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const rootStyle = document.documentElement.style;
    applyProjectThemeCssVars(
      rootStyle,
      buildProjectThemeSeedPayload(uiForm.themePalette),
      uiForm.themeOverridesRaw,
      effectiveTheme,
    );

    return () => {
      applyProjectThemeCssVars(
        rootStyle,
        (bundle?.contexto?.ui.themeSeed as Record<string, unknown>) ?? {},
        (bundle?.contexto?.ui.themeOverrides as Record<string, unknown>) ?? {},
        effectiveTheme,
      );
    };
  }, [bundle, effectiveTheme, uiForm.themeOverridesRaw, uiForm.themePalette]);

  const load = async (projectRef?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      const item = await getProjectSettings(projectRef ? { slug: projectRef } : undefined);
      setBundle(item);
      const forms = mapContextToForms(item.contexto);
      setBaseForm(forms.base);
      setUiForm(forms.ui);
      setComercialForm(forms.comercial);
      setCopySourceBySection({
        assets: "",
        branding: "",
        socials: "",
        highlights: "",
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar proyecto.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!display.projectSlug || isReservedProjectSlug(display.projectSlug)) {
      return;
    }
    void load(display.projectSlug);
  }, [display.projectSlug]);

  const activeProjectName = bundle?.contexto?.proyecto.nombre || "Proyecto";
  const visibleProjects = bundle?.proyectos ?? [];
  const copyableProjects = useMemo(
    () => visibleProjects.filter((project) => project.slug && project.slug !== display.projectSlug),
    [display.projectSlug, visibleProjects],
  );
  const canCreateProject = rawRole === "SUPERADMIN";
  const topbarActions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "dashboard")}>
        <IconDashboard />
        Dashboard
      </Link>
    </nav>
  );

  const handleProjectSwitch = (nextSlug: string) => {
    if (!nextSlug || nextSlug === display.projectSlug) {
      return;
    }
    writePreferredProjectSlug(nextSlug);
    navigate(buildPrivateProjectPath(nextSlug, "proyecto"));
  };

  const handleCreateProject = async () => {
    try {
      setCreatingProject(true);
      setError(null);
      setNotice("");
      const item = await createProject(createForm);
      const nextSlug = item.contexto?.proyecto.slug || item.resolvedSlug || "";
      setCreateOpen(false);
      setCreateForm(defaultCreateProjectForm());
      setBundle(item);
      setNotice("Proyecto creado.");
      await refresh();
      if (nextSlug) {
        writePreferredProjectSlug(nextSlug);
        navigate(buildPrivateProjectPath(nextSlug, "proyecto"));
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear proyecto.");
    } finally {
      setCreatingProject(false);
    }
  };

  const titleNode = (
    <div className="project-page-switcher">
      {canCreateProject ? (
        <>
          <select
            className="project-page-switcher__select"
            value={display.projectSlug}
            aria-label="Seleccionar proyecto"
            onChange={(event) => handleProjectSwitch(event.target.value)}
          >
            {visibleProjects.map((project) => (
              <option key={project.proyectoId} value={project.slug}>
                {project.etapa ? `${project.nombre} · ${project.etapa}` : project.nombre}
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost project-page-switcher__create" onClick={() => setCreateOpen(true)}>
            <IconPlus />
            Crear proyecto
          </button>
        </>
      ) : (
        <div className="project-page-switcher__readonly">{activeProjectName}</div>
      )}
    </div>
  );

  const saveBase = async () => {
    try {
      setSavingBase(true);
      setError(null);
      setNotice("");
      const item = await updateProjectBase(baseForm, { slug: display.projectSlug });
      setBundle(item);
      setNotice("Datos base del proyecto actualizados.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar proyecto.");
    } finally {
      setSavingBase(false);
    }
  };

  const saveUi = async () => {
    try {
      setSavingUi(true);
      setError(null);
      setNotice("");
      const item = await updateProjectUi({
        ...uiForm,
        overlayConfig: {
          x: Number(uiForm.overlayX || 0),
          y: Number(uiForm.overlayY || 0),
          scale: Number(uiForm.overlayScale || 1),
        },
        lotStatePalette: {
          disponible: normalizeHexColor(uiForm.lotDisponibleColor, DEFAULT_LOT_STATE_PALETTE.disponible),
          separado: normalizeHexColor(uiForm.lotSeparadoColor, DEFAULT_LOT_STATE_PALETTE.separado),
          vendido: normalizeHexColor(uiForm.lotVendidoColor, DEFAULT_LOT_STATE_PALETTE.vendido),
          selected: normalizeHexColor(uiForm.lotSelectedColor, DEFAULT_LOT_STATE_PALETTE.selected),
        },
        lotFillOpacity: Number(uiForm.lotFillOpacity || 0.14),
        lotFillOpacityPalette: {
          disponible: Number(uiForm.lotDisponibleOpacity || uiForm.lotFillOpacity || 0.14),
          separado: Number(uiForm.lotSeparadoOpacity || uiForm.lotFillOpacity || 0.14),
          vendido: Number(uiForm.lotVendidoOpacity || uiForm.lotFillOpacity || 0.14),
          selected: Number(uiForm.lotSelectedOpacity || uiForm.lotFillOpacity || 0.14),
        },
        themeSeed: buildProjectThemeSeedPayload(uiForm.themePalette),
        themeOverrides: uiForm.themeOverridesRaw,
        proformaConfig: JSON.parse(uiForm.proformaConfig || "{}"),
        impresionConfig: JSON.parse(uiForm.impresionConfig || "{}"),
        amenities: uiForm.amenitiesText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        redesSociales: uiForm.redesSociales.filter((item) => item.label.trim() || item.url.trim()),
        highlights: uiForm.highlights.filter((item) => item.title.trim() || item.description.trim()),
      }, { slug: display.projectSlug });
      setBundle(item);
      setNotice("Configuracion UI actualizada.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar configuracion UI.");
    } finally {
      setSavingUi(false);
    }
  };

  const saveComercial = async () => {
    try {
      setSavingComercial(true);
      setError(null);
      setNotice("");
      const item = await updateProjectCommercial({
        ...comercialForm,
        mesesReferenciales: comercialForm.mesesReferenciales.split(/\s*,\s*/).filter(Boolean).map((item) => Number(item)),
        reglasDescuento: JSON.parse(comercialForm.reglasDescuento || "{}"),
        ventaConfig: JSON.parse(comercialForm.ventaConfig || "{}"),
      }, { slug: display.projectSlug });
      setBundle(item);
      setNotice("Configuracion comercial actualizada.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar configuracion comercial.");
    } finally {
      setSavingComercial(false);
    }
  };

  const financingOptions = useMemo(() => ["REDUCIR_CUOTA", "REDUCIR_MESES"], []);
  const currentSection = projectSections.find((section) => section.key === activeSection) ?? projectSections[0];
  const sourceForms = useMemo(() => mapContextToForms(bundle?.contexto ?? null), [bundle]);
  const hasBaseChanges = JSON.stringify(baseForm) !== JSON.stringify(sourceForms.base);
  const hasUiChanges = JSON.stringify(uiForm) !== JSON.stringify(sourceForms.ui);
  const hasCommercialChanges = JSON.stringify(comercialForm) !== JSON.stringify(sourceForms.comercial);
  const sectionDirtyMap: Record<ProjectSectionKey, boolean> = {
    base: hasBaseChanges,
    commercial: hasCommercialChanges,
    branding: hasUiChanges,
    interface: hasUiChanges,
  };
  const currentSectionDirty = sectionDirtyMap[activeSection];

  const saveCurrentSection = async () => {
    if (activeSection === "base") {
      await saveBase();
      return;
    }
    if (activeSection === "branding" || activeSection === "interface") {
      await saveUi();
      return;
    }
    await saveComercial();
  };

  const applyUiCopySection = async (section: UiCopySectionKey) => {
    const sourceSlug = copySourceBySection[section];
    if (!sourceSlug) {
      return;
    }

    try {
      setCopyingSection(section);
      setError(null);
      setNotice("");
      const item = await getProjectUiCopySource(section, sourceSlug);

      setUiForm((current) => {
        switch (section) {
          case "assets":
            return {
              ...current,
              logoHeaderUrl: toText(item.values?.logoHeaderUrl ?? ""),
              logoFooterUrl: toText(item.values?.logoFooterUrl ?? ""),
              logoProyectoUrl: toText(item.values?.logoProyectoUrl ?? ""),
              ogImageUrl: toText(item.values?.ogImageUrl ?? ""),
              metaTitle: toText(item.values?.metaTitle ?? ""),
              metaDescription: toText(item.values?.metaDescription ?? ""),
            };
          case "branding":
            return {
              ...current,
              estado: Boolean(item.values?.estado ?? true),
              lotDisponibleColor: normalizeHexColor((item.values?.lotStatePalette as { disponible?: string } | undefined)?.disponible, DEFAULT_LOT_STATE_PALETTE.disponible),
              lotSeparadoColor: normalizeHexColor((item.values?.lotStatePalette as { separado?: string } | undefined)?.separado, DEFAULT_LOT_STATE_PALETTE.separado),
              lotVendidoColor: normalizeHexColor((item.values?.lotStatePalette as { vendido?: string } | undefined)?.vendido, DEFAULT_LOT_STATE_PALETTE.vendido),
              lotSelectedColor: normalizeHexColor((item.values?.lotStatePalette as { selected?: string } | undefined)?.selected, DEFAULT_LOT_STATE_PALETTE.selected),
              lotFillOpacity: toText(item.values?.lotFillOpacity ?? "0.14"),
              lotDisponibleOpacity: toText((item.values?.lotFillOpacityPalette as { disponible?: number } | undefined)?.disponible ?? item.values?.lotFillOpacity ?? "0.14"),
              lotSeparadoOpacity: toText((item.values?.lotFillOpacityPalette as { separado?: number } | undefined)?.separado ?? item.values?.lotFillOpacity ?? "0.14"),
              lotVendidoOpacity: toText((item.values?.lotFillOpacityPalette as { vendido?: number } | undefined)?.vendido ?? item.values?.lotFillOpacity ?? "0.14"),
              lotSelectedOpacity: toText((item.values?.lotFillOpacityPalette as { selected?: number } | undefined)?.selected ?? item.values?.lotFillOpacity ?? "0.14"),
              themePalette: normalizeProjectThemePaletteState((item.values?.themeSeed as Record<string, unknown>) ?? {}),
              themeOverridesRaw: (item.values?.themeOverrides as Record<string, unknown>) ?? {},
            };
          case "socials":
            return {
              ...current,
              redesSociales: Array.isArray(item.values?.redesSociales)
                ? item.values.redesSociales.map((row) => ({
                    label: toText((row as SocialRow)?.label ?? ""),
                    kind: toText((row as SocialRow)?.kind ?? "link") || "link",
                    url: toText((row as SocialRow)?.url ?? ""),
                  }))
                : [],
            };
          case "highlights":
            return {
              ...current,
              highlights: Array.isArray(item.values?.highlights)
                ? item.values.highlights.map((row) => ({
                    title: toText((row as HighlightRow)?.title ?? ""),
                    description: toText((row as HighlightRow)?.description ?? ""),
                  }))
                : [],
            };
          default:
            return current;
        }
      });

      setNotice(`Se cargo ${section} desde ${item.sourceProject?.nombre ?? sourceSlug}. Aun no se ha guardado.`);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "No se pudo copiar configuracion UI.");
    } finally {
      setCopyingSection(null);
    }
  };

  return (
    <AppShell title={titleNode} actions={topbarActions} contentClassName="main--data-table" hideProjectSwitcher>
      <>
        {error ? <p className="settings-error">{error}</p> : null}
        {notice ? <p className="settings-notice">{notice}</p> : null}

        <article className="project-settings-shell">
          <div className="project-settings-shell__bar">
            <label className="project-settings-shell__select">
              <span>Seccion</span>
              <select value={activeSection} onChange={(event) => setActiveSection(event.target.value as ProjectSectionKey)}>
                {projectSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {sectionDirtyMap[section.key] ? `${section.label} - cambios` : section.label}
                  </option>
                ))}
              </select>
            </label>

            <nav className="project-settings-tabs" aria-label="Secciones de configuracion del proyecto">
              {projectSections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  className={`project-settings-tabs__item${activeSection === section.key ? " is-active" : ""}${sectionDirtyMap[section.key] ? " is-dirty" : ""}`}
                  onClick={() => setActiveSection(section.key)}
                >
                  <span className="project-settings-tabs__label">{section.label}</span>
                  {sectionDirtyMap[section.key] ? <span className="project-settings-tabs__badge">Sin guardar</span> : null}
                </button>
              ))}
            </nav>

            <button
              type="button"
              className={`btn primary project-settings-shell__save${currentSectionDirty ? "" : " is-idle"}`}
              onClick={() => void saveCurrentSection()}
              disabled={loading || savingBase || savingUi || savingComercial || !currentSectionDirty}
              aria-label={currentSection.saveLabel}
              title={currentSection.saveLabel}
            >
              <IconSave />
              <span className="project-settings-shell__save-label">
                {loading
                  ? "Cargando..."
                  : savingBase || savingUi || savingComercial
                    ? "Guardando..."
                    : currentSection.saveLabel}
              </span>
            </button>
          </div>

          <div className="project-settings-shell__body">
            <div className="project-settings-sheet">
              <div className="project-settings-sheet__content">
                {activeSection === "base" ? (
                  <>
                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Identidad publica</h4>
                          <p>Nombre visible, slug y texto corto del proyecto.</p>
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--md"><span>Nombre</span><AdminTextInput value={baseForm.nombre} onChange={(e) => setBaseForm((c) => ({ ...c, nombre: e.target.value }))} /></label>
                        <label className="settings-field settings-field--sm"><span>Slug publico</span><AdminTextInput value={baseForm.slug} onChange={(e) => setBaseForm((c) => ({ ...c, slug: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Etapa</span><AdminTextInput value={baseForm.etapa} onChange={(e) => setBaseForm((c) => ({ ...c, etapa: e.target.value }))} /></label>
                        <label className="settings-field settings-field--md"><span>Logo proyecto base</span><AdminTextInput value={baseForm.logoProyectoUrl} onChange={(e) => setBaseForm((c) => ({ ...c, logoProyectoUrl: e.target.value }))} /></label>
                        <label className="settings-field settings-field--full"><span>Descripcion corta</span><AdminTextarea rows={3} value={baseForm.descripcionCorta} onChange={(e) => setBaseForm((c) => ({ ...c, descripcionCorta: e.target.value }))} /></label>
                      </div>
                    </section>

                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Ubicacion y vigencia</h4>
                          <p>Datos operativos del proyecto y rango de fechas visible.</p>
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--full"><span>Ubicacion texto</span><AdminTextarea rows={3} value={baseForm.ubicacionTexto} onChange={(e) => setBaseForm((c) => ({ ...c, ubicacionTexto: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Distrito</span><AdminTextInput value={baseForm.distrito} onChange={(e) => setBaseForm((c) => ({ ...c, distrito: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Provincia</span><AdminTextInput value={baseForm.provincia} onChange={(e) => setBaseForm((c) => ({ ...c, provincia: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Departamento</span><AdminTextInput value={baseForm.departamento} onChange={(e) => setBaseForm((c) => ({ ...c, departamento: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Pais</span><AdminTextInput value={baseForm.pais} onChange={(e) => setBaseForm((c) => ({ ...c, pais: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Fecha inicio</span><AdminTextInput type="date" value={baseForm.fechaInicio} onChange={(e) => setBaseForm((c) => ({ ...c, fechaInicio: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Fecha fin</span><AdminTextInput type="date" value={baseForm.fechaFin} onChange={(e) => setBaseForm((c) => ({ ...c, fechaFin: e.target.value }))} /></label>
                        <label className="settings-field settings-field--checkbox settings-field--xs"><input type="checkbox" checked={baseForm.estado} onChange={(e) => setBaseForm((c) => ({ ...c, estado: e.target.checked }))} /><span>Proyecto activo</span></label>
                      </div>
                    </section>
                  </>
                ) : null}

                {activeSection === "branding" ? (
                  <>
                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Assets principales</h4>
                          <p>Rutas base de logos, mapa y metadatos visuales.</p>
                        </div>
                        <div className="settings-card__actions">
                          <SectionCopyTools
                            section="assets"
                            projects={copyableProjects}
                            value={copySourceBySection.assets}
                            loading={copyingSection === "assets"}
                            onChange={(value) => setCopySourceBySection((current) => ({ ...current, assets: value }))}
                            onApply={() => void applyUiCopySection("assets")}
                          />
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--sm"><span>Logo header</span><AdminTextInput value={uiForm.logoHeaderUrl} onChange={(e) => setUiForm((c) => ({ ...c, logoHeaderUrl: e.target.value }))} /></label>
                        <label className="settings-field settings-field--sm"><span>Logo footer</span><AdminTextInput value={uiForm.logoFooterUrl} onChange={(e) => setUiForm((c) => ({ ...c, logoFooterUrl: e.target.value }))} /></label>
                        <label className="settings-field settings-field--sm"><span>Logo proyecto</span><AdminTextInput value={uiForm.logoProyectoUrl} onChange={(e) => setUiForm((c) => ({ ...c, logoProyectoUrl: e.target.value }))} /></label>
                        <label className="settings-field settings-field--sm"><span>OG image</span><AdminTextInput value={uiForm.ogImageUrl} onChange={(e) => setUiForm((c) => ({ ...c, ogImageUrl: e.target.value }))} /></label>
                        <label className="settings-field settings-field--md"><span>Meta title</span><AdminTextInput value={uiForm.metaTitle} onChange={(e) => setUiForm((c) => ({ ...c, metaTitle: e.target.value }))} /></label>
                        <label className="settings-field settings-field--full"><span>Meta description</span><AdminTextarea rows={3} value={uiForm.metaDescription} onChange={(e) => setUiForm((c) => ({ ...c, metaDescription: e.target.value }))} /></label>
                      </div>
                    </section>

                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Branding opcional</h4>
                          <p>Si no defines branding valido, el sistema sigue usando el tema base del software.</p>
                        </div>
                        <div className="settings-card__actions">
                          <SectionCopyTools
                            section="branding"
                            projects={copyableProjects}
                            value={copySourceBySection.branding}
                            loading={copyingSection === "branding"}
                            onChange={(value) => setCopySourceBySection((current) => ({ ...current, branding: value }))}
                            onApply={() => void applyUiCopySection("branding")}
                          />
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--checkbox settings-field--xs"><input type="checkbox" checked={uiForm.estado} onChange={(e) => setUiForm((c) => ({ ...c, estado: e.target.checked }))} /><span>Config UI activa</span></label>
                        <div className="settings-field settings-field--full">
                          <span>Estados de lotes</span>
                          <ProjectLotStateEditor
                            value={{
                              disponible: { color: normalizeHexColor(uiForm.lotDisponibleColor, DEFAULT_LOT_STATE_PALETTE.disponible), opacity: uiForm.lotDisponibleOpacity },
                              separado: { color: normalizeHexColor(uiForm.lotSeparadoColor, DEFAULT_LOT_STATE_PALETTE.separado), opacity: uiForm.lotSeparadoOpacity },
                              vendido: { color: normalizeHexColor(uiForm.lotVendidoColor, DEFAULT_LOT_STATE_PALETTE.vendido), opacity: uiForm.lotVendidoOpacity },
                              selected: { color: normalizeHexColor(uiForm.lotSelectedColor, DEFAULT_LOT_STATE_PALETTE.selected), opacity: uiForm.lotSelectedOpacity },
                            }}
                            onChange={(next) =>
                              setUiForm((current) => ({
                                ...current,
                                lotDisponibleColor: next.disponible.color,
                                lotSeparadoColor: next.separado.color,
                                lotVendidoColor: next.vendido.color,
                                lotSelectedColor: next.selected.color,
                                lotDisponibleOpacity: next.disponible.opacity,
                                lotSeparadoOpacity: next.separado.opacity,
                                lotVendidoOpacity: next.vendido.opacity,
                                lotSelectedOpacity: next.selected.opacity,
                                lotFillOpacity: String(
                                  (
                                    Number(next.disponible.opacity || 0) +
                                    Number(next.separado.opacity || 0) +
                                    Number(next.vendido.opacity || 0) +
                                    Number(next.selected.opacity || 0)
                                  ) / 4,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="settings-field settings-field--full">
                          <span>Paleta principal del proyecto</span>
                          <ProjectThemePaletteEditor
                            value={uiForm.themePalette}
                            onChange={(next) => setUiForm((current) => ({ ...current, themePalette: next }))}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="settings-card project-settings-card">
                      <div className="settings-array-block__header">
                        <h4>Redes sociales</h4>
                        <div className="settings-array-block__actions">
                          <SectionCopyTools
                            section="socials"
                            projects={copyableProjects}
                            value={copySourceBySection.socials}
                            loading={copyingSection === "socials"}
                            onChange={(value) => setCopySourceBySection((current) => ({ ...current, socials: value }))}
                            onApply={() => void applyUiCopySection("socials")}
                          />
                          <button type="button" className="btn ghost" onClick={() => setUiForm((c) => ({ ...c, redesSociales: [...c.redesSociales, emptySocial()] }))}>+ Agregar</button>
                        </div>
                      </div>
                      {uiForm.redesSociales.map((row, index) => (
                        <div key={`social-${index}`} className="settings-array-row settings-array-row--three">
                          <AdminTextInput value={row.label} placeholder="Label" onChange={(e) => setUiForm((c) => ({ ...c, redesSociales: c.redesSociales.map((item, itemIndex) => itemIndex === index ? { ...item, label: e.target.value } : item) }))} />
                          <AdminTextInput value={row.kind} placeholder="Kind" onChange={(e) => setUiForm((c) => ({ ...c, redesSociales: c.redesSociales.map((item, itemIndex) => itemIndex === index ? { ...item, kind: e.target.value } : item) }))} />
                          <AdminTextInput value={row.url} placeholder="URL" onChange={(e) => setUiForm((c) => ({ ...c, redesSociales: c.redesSociales.map((item, itemIndex) => itemIndex === index ? { ...item, url: e.target.value } : item) }))} />
                          <button type="button" className="btn ghost" onClick={() => setUiForm((c) => ({ ...c, redesSociales: c.redesSociales.filter((_, itemIndex) => itemIndex !== index) }))}>Eliminar</button>
                        </div>
                      ))}
                    </section>

                    <section className="settings-card project-settings-card">
                      <div className="settings-array-block__header">
                        <h4>Highlights</h4>
                        <div className="settings-array-block__actions">
                          <SectionCopyTools
                            section="highlights"
                            projects={copyableProjects}
                            value={copySourceBySection.highlights}
                            loading={copyingSection === "highlights"}
                            onChange={(value) => setCopySourceBySection((current) => ({ ...current, highlights: value }))}
                            onApply={() => void applyUiCopySection("highlights")}
                          />
                          <button type="button" className="btn ghost" onClick={() => setUiForm((c) => ({ ...c, highlights: [...c.highlights, emptyHighlight()] }))}>+ Agregar</button>
                        </div>
                      </div>
                      {uiForm.highlights.map((row, index) => (
                        <div key={`highlight-${index}`} className="settings-array-row settings-array-row--highlight">
                          <AdminTextInput value={row.title} placeholder="Titulo" onChange={(e) => setUiForm((c) => ({ ...c, highlights: c.highlights.map((item, itemIndex) => itemIndex === index ? { ...item, title: e.target.value } : item) }))} />
                          <AdminTextarea className="settings-textarea--compact-row" rows={2} placeholder="Descripcion" value={row.description} onChange={(e) => setUiForm((c) => ({ ...c, highlights: c.highlights.map((item, itemIndex) => itemIndex === index ? { ...item, description: e.target.value } : item) }))} />
                          <div className="settings-array-row__actions"><button type="button" className="btn ghost" onClick={() => setUiForm((c) => ({ ...c, highlights: c.highlights.filter((_, itemIndex) => itemIndex !== index) }))}>Eliminar</button></div>
                        </div>
                      ))}
                    </section>
                  </>
                ) : null}

                {activeSection === "interface" ? (
                  <>
                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Mapa del proyecto</h4>
                          <p>Activos base del plano del proyecto.</p>
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--md">
                          <span>Ruta overlay TSX</span>
                          <AdminTextInput
                            value={uiForm.mapaSvgUrl}
                            placeholder="/assets/project-overlays/empresa/proyecto/etapa/overlay.tsx"
                            onChange={(e) => setUiForm((c) => ({ ...c, mapaSvgUrl: e.target.value }))}
                          />
                        </label>
                        <label className="settings-field settings-field--md">
                          <span>Ruta plano WEBP</span>
                          <AdminTextInput
                            value={uiForm.mapaWebpUrl}
                            placeholder="/assets/proyectos/empresa/etapas/etapa/plano.webp"
                            onChange={(e) => setUiForm((c) => ({ ...c, mapaWebpUrl: e.target.value }))}
                          />
                        </label>
                      </div>
                    </section>

                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Overlay</h4>
                          <p>Coordenadas y escala del SVG sobre el plano del proyecto.</p>
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--xs settings-field--compact"><span>Overlay X</span><AdminTextInput type="number" step="0.01" value={uiForm.overlayX} onChange={(e) => setUiForm((c) => ({ ...c, overlayX: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs settings-field--compact"><span>Overlay Y</span><AdminTextInput type="number" step="0.01" value={uiForm.overlayY} onChange={(e) => setUiForm((c) => ({ ...c, overlayY: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs settings-field--compact"><span>Overlay scale</span><AdminTextInput type="number" step="0.0001" value={uiForm.overlayScale} onChange={(e) => setUiForm((c) => ({ ...c, overlayScale: e.target.value }))} /></label>
                        <div className="settings-field settings-field--full">
                          <span>Ayuda visual</span>
                          <div className="project-settings-inline-actions">
                            <Link className="btn ghost project-settings-inline-actions__btn" to={buildPrivateProjectPath(display.projectSlug, "editor")}>
                              Ir al editor de overlay
                            </Link>
                          </div>
                        </div>
                      </div>
                    </section>
                  </>
                ) : null}

                {activeSection === "commercial" ? (
                  <>
                    <section className="settings-card project-settings-card">
                      <header className="settings-card__header">
                        <div>
                          <h4>Reglas base de venta</h4>
                          <p>Minimos operativos y limites comerciales del proyecto.</p>
                        </div>
                      </header>
                      <div className="settings-form settings-form--adaptive">
                        <label className="settings-field settings-field--xs"><span>Inicial minima</span><AdminTextInput type="number" step="0.01" value={comercialForm.inicialMinima} onChange={(e) => setComercialForm((c) => ({ ...c, inicialMinima: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Separacion minima</span><AdminTextInput type="number" step="0.01" value={comercialForm.separacionMinima} onChange={(e) => setComercialForm((c) => ({ ...c, separacionMinima: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Cuotas minimas</span><AdminTextInput type="number" value={comercialForm.cuotasMinimas} onChange={(e) => setComercialForm((c) => ({ ...c, cuotasMinimas: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Cuotas maximas</span><AdminTextInput type="number" value={comercialForm.cuotasMaximas} onChange={(e) => setComercialForm((c) => ({ ...c, cuotasMaximas: e.target.value }))} /></label>
                        <label className="settings-field settings-field--sm"><span>Meses referenciales</span><AdminTextInput value={comercialForm.mesesReferenciales} placeholder="12, 24, 36" onChange={(e) => setComercialForm((c) => ({ ...c, mesesReferenciales: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Plusvalia base %</span><AdminTextInput type="number" step="0.01" value={comercialForm.plusvaliaBasePct} onChange={(e) => setComercialForm((c) => ({ ...c, plusvaliaBasePct: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Plusvalia anual %</span><AdminTextInput type="number" step="0.01" value={comercialForm.plusvaliaAnualPct} onChange={(e) => setComercialForm((c) => ({ ...c, plusvaliaAnualPct: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Tasa interes anual</span><AdminTextInput type="number" step="0.01" value={comercialForm.tasaInteresAnualRef} onChange={(e) => setComercialForm((c) => ({ ...c, tasaInteresAnualRef: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Precio minimo lote</span><AdminTextInput type="number" step="0.01" value={comercialForm.precioMinimoLote} onChange={(e) => setComercialForm((c) => ({ ...c, precioMinimoLote: e.target.value }))} /></label>
                        <label className="settings-field settings-field--xs"><span>Precio maximo lote</span><AdminTextInput type="number" step="0.01" value={comercialForm.precioMaximoLote} onChange={(e) => setComercialForm((c) => ({ ...c, precioMaximoLote: e.target.value }))} /></label>
                        <label className="settings-field settings-field--checkbox settings-field--xs"><input type="checkbox" checked={comercialForm.estado} onChange={(e) => setComercialForm((c) => ({ ...c, estado: e.target.checked }))} /><span>Config comercial activa</span></label>
                      </div>
                    </section>

                    <section className="settings-card project-settings-card">
                      <div className="settings-array-block__header">
                        <h4>Tipos de financiamiento</h4>
                      </div>
                      <div className="settings-checkboxes">
                        {financingOptions.map((option) => (
                          <label key={option} className="settings-checkboxes__item">
                            <input
                              type="checkbox"
                              checked={comercialForm.tiposFinanciamiento.includes(option)}
                              onChange={(event) => {
                                setComercialForm((current) => ({
                                  ...current,
                                  tiposFinanciamiento: event.target.checked
                                    ? [...current.tiposFinanciamiento, option]
                                    : current.tiposFinanciamiento.filter((item) => item !== option),
                                }));
                              }}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </section>

                  </>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <AppModal
          open={createOpen}
          title="Nuevo proyecto"
          description="Completa lo basico. El slug publico se genera automaticamente a partir del nombre y luego ajustas branding, lotes y reglas comerciales."
          onClose={() => setCreateOpen(false)}
          closeDisabled={creatingProject}
          size="lg"
          className="project-create-app-modal"
          bodyClassName="project-create-app-modal__body"
          footer={
            <>
              <button type="button" className="btn ghost" onClick={() => setCreateOpen(false)} disabled={creatingProject}>
                Cancelar
              </button>
              <button type="button" className="btn primary" onClick={() => void handleCreateProject()} disabled={creatingProject || !createForm.nombre.trim()}>
                <IconPlus />
                {creatingProject ? "Creando..." : "Crear proyecto"}
              </button>
            </>
          }
        >
          <div className="settings-form settings-form--adaptive">
            <label className="settings-field settings-field--md">
              <span>Nombre</span>
              <AdminTextInput value={createForm.nombre} onChange={(e) => setCreateForm((c) => ({ ...c, nombre: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Etapa</span>
              <AdminTextInput value={createForm.etapa} onChange={(e) => setCreateForm((c) => ({ ...c, etapa: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--full">
              <span>Descripcion corta</span>
              <AdminTextarea rows={3} value={createForm.descripcionCorta} onChange={(e) => setCreateForm((c) => ({ ...c, descripcionCorta: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--full">
              <span>Ubicacion texto</span>
              <AdminTextarea rows={4} value={createForm.ubicacionTexto} onChange={(e) => setCreateForm((c) => ({ ...c, ubicacionTexto: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Distrito</span>
              <AdminTextInput value={createForm.distrito} onChange={(e) => setCreateForm((c) => ({ ...c, distrito: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Provincia</span>
              <AdminTextInput value={createForm.provincia} onChange={(e) => setCreateForm((c) => ({ ...c, provincia: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Departamento</span>
              <AdminTextInput value={createForm.departamento} onChange={(e) => setCreateForm((c) => ({ ...c, departamento: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Pais</span>
              <AdminTextInput value={createForm.pais} onChange={(e) => setCreateForm((c) => ({ ...c, pais: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Fecha inicio</span>
              <AdminTextInput type="date" value={createForm.fechaInicio} onChange={(e) => setCreateForm((c) => ({ ...c, fechaInicio: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--xs">
              <span>Fecha fin</span>
              <AdminTextInput type="date" value={createForm.fechaFin} onChange={(e) => setCreateForm((c) => ({ ...c, fechaFin: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--checkbox settings-field--xs">
              <input type="checkbox" checked={createForm.estado} onChange={(e) => setCreateForm((c) => ({ ...c, estado: e.target.checked }))} />
              <span>Proyecto activo</span>
            </label>
          </div>
        </AppModal>
      </>
    </AppShell>
  );
}












