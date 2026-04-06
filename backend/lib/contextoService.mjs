import { resolveDbSchema, withPgClient } from "./postgres.mjs";
import { requireAuthenticatedUserAsync } from "./authService.mjs";

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mapVisibleProject = (row) => ({
  proyectoId: row.proyecto_id,
  slug: row.slug ?? "",
  nombre: row.nombre,
  etapa: row.etapa ?? "",
  empresaNombreComercial: row.empresa_nombre_comercial ?? "",
  activo: Boolean(row.proyecto_activo),
});

const mapProjectContext = (row) =>
  row
    ? {
        proyecto: {
          id: row.proyecto_id,
          slug: row.slug ?? "",
          nombre: row.proyecto_nombre,
          etapa: row.etapa ?? "",
          descripcionCorta: row.descripcion_corta ?? "",
          ubicacionTexto: row.ubicacion_texto ?? "",
          distrito: row.distrito ?? "",
          provincia: row.provincia ?? "",
          departamento: row.departamento ?? "",
          pais: row.pais ?? "",
          fechaInicio: row.fecha_inicio ?? null,
          fechaFin: row.fecha_fin ?? null,
          activo: Boolean(row.proyecto_activo),
        },
        empresa: {
          id: row.empresa_id,
          nombreComercial: row.nombre_comercial ?? "",
          razonSocial: row.razon_social ?? "",
          ruc: row.ruc ?? "",
          direccionFiscal: row.direccion_fiscal ?? "",
          telefono: row.telefono ?? "",
          email: row.email ?? "",
          webUrl: row.web_url ?? "",
          logoPrincipalUrl: row.logo_principal_url ?? "",
          logoSecundarioUrl: row.logo_secundario_url ?? "",
          activa: Boolean(row.empresa_activa),
        },
        ui: {
          logoProyectoUrl: row.logo_proyecto_url ?? "",
          logoHeaderUrl: row.logo_header_url ?? "",
          logoFooterUrl: row.logo_footer_url ?? "",
          mapaSvgUrl: row.mapa_svg_url ?? "",
          mapaWebpUrl: row.mapa_webp_url ?? "",
          metaTitle: row.meta_title ?? "",
          metaDescription: row.meta_description ?? "",
          ogImageUrl: row.og_image_url ?? "",
          overlayConfig: row.overlay_config ?? {},
          themeSeed: row.theme_seed ?? {},
          themeOverrides: row.theme_overrides ?? {},
          lotStatePalette: row.lot_state_palette ?? {},
          lotFillOpacity: Number(row.lot_state_fill_opacity ?? 0.14),
          lotFillOpacityPalette: row.lot_state_fill_opacity_palette ?? {},
          proformaConfig: row.proforma_config ?? {},
          impresionConfig: row.impresion_config ?? {},
          redesSociales: row.redes_sociales ?? {},
          amenities: row.amenities ?? [],
          highlights: row.highlights ?? [],
        },
        comercial: {
          inicialMinima: Number(row.inicial_minima ?? 0),
          separacionMinima: Number(row.separacion_minima ?? 0),
          cuotasMinimas: Number(row.cuotas_minimas ?? 0),
          cuotasMaximas: Number(row.cuotas_maximas ?? 0),
          mesesReferenciales: Array.isArray(row.meses_referenciales) ? row.meses_referenciales : [],
          tiposFinanciamiento: Array.isArray(row.tipos_financiamiento) ? row.tipos_financiamiento : [],
          plusvaliaBasePct: Number(row.plusvalia_base_pct ?? 0),
          plusvaliaAnualPct: Number(row.plusvalia_anual_pct ?? 0),
          tasaInteresAnualRef: Number(row.tasa_interes_anual_ref ?? 0),
          precioMinimoLote: row.precio_minimo_lote == null ? null : Number(row.precio_minimo_lote),
          precioMaximoLote: row.precio_maximo_lote == null ? null : Number(row.precio_maximo_lote),
          reglasDescuento: row.reglas_descuento ?? {},
          ventaConfig: row.venta_config ?? {},
        },
      }
    : null;

const mapProjectVisual = (row) =>
  row
    ? {
        logoHeaderUrl: row.logo_header_url ?? row.logo_principal_url ?? "",
        themeSeed: row.theme_seed ?? {},
        themeOverrides: row.theme_overrides ?? {},
        hasCustomTheme:
          (row.theme_seed && Object.keys(row.theme_seed).length > 0) ||
          (row.theme_overrides && Object.keys(row.theme_overrides).length > 0),
      }
    : null;

const resolveTargetProject = (visibleProjects, requestedRef, { allowRequestedSelection = true } = {}) => {
  if (!Array.isArray(visibleProjects) || visibleProjects.length === 0) {
    return null;
  }

  if (!allowRequestedSelection) {
    return visibleProjects[0];
  }

  const normalizedRequestedRef = String(requestedRef || "").trim();
  if (!normalizedRequestedRef) {
    return visibleProjects[0];
  }

  const normalizedRequestedSlug = normalizeSlug(normalizedRequestedRef);
  return (
    visibleProjects.find((item) => item.proyectoId === normalizedRequestedRef) ??
    visibleProjects.find((item) => item.slug === normalizedRequestedSlug) ??
    visibleProjects[0]
  );
};

export const listVisibleProjectsAsync = async (username, pin) => {
  const actor = await requireAuthenticatedUserAsync(username, pin);
  const schema = resolveDbSchema();

  if (schema !== "dev") {
    return [];
  }

  return withPgClient(async (client) => {
    const result = await client.query(
      `select *
         from ${schema}.fn_proyectos_visibles_app($1::uuid)
        order by nombre asc`,
      [actor.id]
    );

    return result.rows.map(mapVisibleProject);
  });
};

export const getProjectContextAsync = async (username, pin, requestedProjectRef = null) => {
  const actor = await requireAuthenticatedUserAsync(username, pin);
  const schema = resolveDbSchema();

  if (schema !== "dev") {
    return {
      usuario: actor,
      requestedSlug: null,
      resolvedSlug: null,
      proyectos: [],
      contexto: null,
    };
  }

  return withPgClient(async (client) => {
    const visibleProjectsResult = await client.query(
      `select *
         from ${schema}.fn_proyectos_visibles_app($1::uuid)
        order by nombre asc`,
      [actor.id]
    );

    const visibleProjects = visibleProjectsResult.rows.map(mapVisibleProject);
    const targetProject = resolveTargetProject(visibleProjects, requestedProjectRef, {
      allowRequestedSelection: actor.rawRole === "SUPERADMIN",
    });

    if (!targetProject) {
      return {
        usuario: actor,
        requestedSlug: normalizeSlug(requestedProjectRef),
        resolvedSlug: null,
        proyectos: visibleProjects,
        contexto: null,
      };
    }

    const contextResult = await client.query(
      `select *
         from ${schema}.v_contexto_proyectos
        where proyecto_id = $1
        limit 1`,
      [targetProject.proyectoId]
    );

    return {
      usuario: actor,
      requestedSlug: normalizeSlug(requestedProjectRef),
      resolvedSlug: targetProject.slug,
      proyectos: visibleProjects,
      contexto: mapProjectContext(contextResult.rows[0] ?? null),
    };
  });
};

export const getProjectVisualAsync = async (username, pin, requestedProjectRef = null) => {
  const actor = await requireAuthenticatedUserAsync(username, pin);
  const schema = resolveDbSchema();

  if (schema !== "dev") {
    return {
      requestedSlug: null,
      resolvedSlug: null,
      visual: null,
    };
  }

  return withPgClient(async (client) => {
    const visibleProjectsResult = await client.query(
      `select *
         from ${schema}.fn_proyectos_visibles_app($1::uuid)
        order by nombre asc`,
      [actor.id]
    );

    const visibleProjects = visibleProjectsResult.rows.map(mapVisibleProject);
    const targetProject = resolveTargetProject(visibleProjects, requestedProjectRef, {
      allowRequestedSelection: actor.rawRole === "SUPERADMIN",
    });

    if (!targetProject) {
      return {
        requestedSlug: normalizeSlug(requestedProjectRef),
        resolvedSlug: null,
        visual: null,
      };
    }

    const visualResult = await client.query(
      `select logo_header_url, logo_principal_url, theme_seed, theme_overrides
         from ${schema}.v_contexto_proyectos
        where proyecto_id = $1
        limit 1`,
      [targetProject.proyectoId]
    );

    return {
      requestedSlug: normalizeSlug(requestedProjectRef),
      resolvedSlug: targetProject.slug,
      visual: mapProjectVisual(visualResult.rows[0] ?? null),
    };
  });
};

export const getPublicProjectContextAsync = async (requestedProjectRef = null) => {
  const schema = resolveDbSchema();

  if (schema !== "dev") {
    return {
      requestedSlug: null,
      resolvedSlug: null,
      proyectos: [],
      contexto: null,
    };
  }

  return withPgClient(async (client) => {
    const visibleProjectsResult = await client.query(
      `select
         proyecto_id,
         slug,
         proyecto_nombre as nombre,
         etapa,
         proyecto_activo,
         nombre_comercial as empresa_nombre_comercial
       from ${schema}.v_contexto_proyectos
      where proyecto_activo = true
      order by proyecto_nombre asc`
    );

    const visibleProjects = visibleProjectsResult.rows.map((row) => ({
      proyectoId: row.proyecto_id,
      slug: row.slug ?? "",
      nombre: row.nombre ?? row.proyecto_nombre,
      etapa: row.etapa ?? "",
      empresaNombreComercial: row.empresa_nombre_comercial ?? "",
      activo: Boolean(row.proyecto_activo),
    }));

    const targetProject = resolveTargetProject(visibleProjects, requestedProjectRef, {
      allowRequestedSelection: true,
    });

    if (!targetProject) {
      return {
        requestedSlug: normalizeSlug(requestedProjectRef),
        resolvedSlug: null,
        proyectos: visibleProjects,
        contexto: null,
      };
    }

    const contextResult = await client.query(
      `select *
         from ${schema}.v_contexto_proyectos
        where proyecto_id = $1
        limit 1`,
      [targetProject.proyectoId]
    );

    return {
      requestedSlug: normalizeSlug(requestedProjectRef),
      resolvedSlug: targetProject.slug,
      proyectos: visibleProjects,
      contexto: mapProjectContext(contextResult.rows[0] ?? null),
    };
  });
};

export const getPublicProjectVisualAsync = async (requestedProjectRef = null) => {
  const schema = resolveDbSchema();

  if (schema !== "dev") {
    return {
      requestedSlug: null,
      resolvedSlug: null,
      visual: null,
    };
  }

  return withPgClient(async (client) => {
    const visibleProjectsResult = await client.query(
      `select
         proyecto_id,
         slug,
         proyecto_nombre as nombre,
         etapa,
         proyecto_activo,
         nombre_comercial as empresa_nombre_comercial
       from ${schema}.v_contexto_proyectos
      where proyecto_activo = true
      order by proyecto_nombre asc`
    );

    const visibleProjects = visibleProjectsResult.rows.map((row) => ({
      proyectoId: row.proyecto_id,
      slug: row.slug ?? "",
      nombre: row.nombre ?? row.proyecto_nombre,
      etapa: row.etapa ?? "",
      empresaNombreComercial: row.empresa_nombre_comercial ?? "",
      activo: Boolean(row.proyecto_activo),
    }));

    const targetProject = resolveTargetProject(visibleProjects, requestedProjectRef, {
      allowRequestedSelection: true,
    });

    if (!targetProject) {
      return {
        requestedSlug: normalizeSlug(requestedProjectRef),
        resolvedSlug: null,
        visual: null,
      };
    }

    const visualResult = await client.query(
      `select logo_header_url, logo_principal_url, theme_seed, theme_overrides
         from ${schema}.v_contexto_proyectos
        where proyecto_id = $1
        limit 1`,
      [targetProject.proyectoId]
    );

    return {
      requestedSlug: normalizeSlug(requestedProjectRef),
      resolvedSlug: targetProject.slug,
      visual: mapProjectVisual(visualResult.rows[0] ?? null),
    };
  });
};
