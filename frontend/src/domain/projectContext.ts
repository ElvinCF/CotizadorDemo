export type VisibleProject = {
  proyectoId: string;
  slug: string;
  nombre: string;
  etapa: string;
  empresaNombreComercial: string;
  activo: boolean;
};

export type ProjectContextBundle = {
  proyecto: {
    id: string;
    slug: string;
    nombre: string;
    etapa: string;
    descripcionCorta: string;
    ubicacionTexto: string;
    distrito: string;
    provincia: string;
    departamento: string;
    pais: string;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    activo: boolean;
  };
  empresa: {
    id: string;
    nombreComercial: string;
    razonSocial: string;
    ruc: string;
    direccionFiscal: string;
    telefono: string;
    email: string;
    webUrl: string;
    logoPrincipalUrl: string;
    logoSecundarioUrl: string;
    activa: boolean;
  };
  ui: {
    logoProyectoUrl: string;
    logoHeaderUrl: string;
    logoFooterUrl: string;
    mapaSvgUrl: string;
    mapaWebpUrl: string;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    overlayConfig: Record<string, unknown>;
    themeSeed: Record<string, unknown>;
    themeOverrides: Record<string, unknown>;
    lotStatePalette: Record<string, unknown>;
    lotFillOpacity: number;
    lotFillOpacityPalette: Record<string, unknown>;
    proformaConfig: Record<string, unknown>;
    impresionConfig: Record<string, unknown>;
    redesSociales: Array<{ label: string; url: string; kind?: string }>;
    amenities: string[];
    highlights: Array<{ title: string; description: string }>;
  };
  comercial: {
    inicialMinima: number;
    separacionMinima: number;
    cuotasMinimas: number;
    cuotasMaximas: number;
    mesesReferenciales: number[];
    tiposFinanciamiento: string[];
    plusvaliaBasePct: number;
    plusvaliaAnualPct: number;
    tasaInteresAnualRef: number;
    precioMinimoLote: number | null;
    precioMaximoLote: number | null;
    reglasDescuento: Record<string, unknown>;
    ventaConfig: Record<string, unknown>;
  };
};

export type ProjectContextResponse = {
  usuario?: {
    id: string;
    username: string;
    role: string;
    rawRole: string;
    nombre: string;
    telefono: string;
  };
  requestedSlug?: string | null;
  resolvedSlug?: string | null;
  proyectos: VisibleProject[];
  contexto: ProjectContextBundle | null;
};

export type ProjectVisualBundle = {
  logoHeaderUrl: string;
  themeSeed: Record<string, unknown>;
  themeOverrides: Record<string, unknown>;
  hasCustomTheme: boolean;
};

export type ProjectVisualResponse = {
  requestedSlug?: string | null;
  resolvedSlug?: string | null;
  visual: ProjectVisualBundle | null;
};

export type CompanySettings = {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  ruc: string;
  direccionFiscal: string;
  telefono: string;
  email: string;
  webUrl: string;
  logoPrincipalUrl: string;
  logoSecundarioUrl: string;
  estado: boolean;
};
