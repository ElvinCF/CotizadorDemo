import { badRequest, forbidden, notFound } from "./errors.mjs";
import { requireAuthenticatedUserAsync } from "./authService.mjs";
import { resolveDbSchema, withPgClient, withPgTransaction } from "./postgres.mjs";
import { getProjectContextAsync } from "./contextoService.mjs";

const isDevSchema = (schema) => schema === "dev";

const ensureDevSchema = () => {
  const schema = resolveDbSchema();
  if (!isDevSchema(schema)) {
    throw badRequest("La configuracion avanzada solo esta disponible en schema dev.");
  }
  return schema;
};

const requireSuperadminUserAsync = async (username, pin) => {
  const actor = await requireAuthenticatedUserAsync(username, pin);
  if (actor.rawRole !== "SUPERADMIN") {
    throw forbidden("Solo SUPERADMIN puede administrar empresa.");
  }
  return actor;
};

const requireProjectManagerUserAsync = async (username, pin) => {
  const actor = await requireAuthenticatedUserAsync(username, pin);
  if (actor.rawRole !== "ADMIN" && actor.rawRole !== "SUPERADMIN") {
    throw forbidden("No tienes permisos para administrar proyecto.");
  }
  return actor;
};

const trimText = (value) => {
  if (value == null) return null;
  const next = String(value).trim();
  return next ? next : null;
};

const normalizeSlug = (value, label = "Slug") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw badRequest(`${label} es obligatorio.`);
  }
  return normalized;
};

const requiredText = (value, label) => {
  const next = trimText(value);
  if (!next) {
    throw badRequest(`${label} es obligatorio.`);
  }
  return next;
};

const optionalUrl = (value) => trimText(value);

const optionalBoolean = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw badRequest("Valor booleano invalido.");
};

const optionalNumber = (value, label) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, "."));
  if (!Number.isFinite(parsed)) {
    throw badRequest(`${label} invalido.`);
  }
  return parsed;
};

const optionalInteger = (value, label) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    throw badRequest(`${label} invalido.`);
  }
  return parsed;
};

const optionalDate = (value, label) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw badRequest(`${label} invalida.`);
  }
  return normalized;
};

const parseJsonLike = (value, label, kind = "object") => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return kind === "array" ? [] : {};
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (kind === "array") {
    if (!Array.isArray(parsed)) {
      throw badRequest(`${label} debe ser un arreglo.`);
    }
    return parsed;
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw badRequest(`${label} debe ser un objeto.`);
  }
  return parsed;
};

const parseStringArray = (value, label) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    if (raw.startsWith("[")) {
      return parseJsonLike(raw, label, "array").map((item) => String(item).trim()).filter(Boolean);
    }
    return raw
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  throw badRequest(`${label} debe ser una lista.`);
};

const parseHighlightArray = (value, label) => {
  const items = parseJsonLike(value, label, "array");
  if (items === undefined) return undefined;
  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw badRequest(`${label}[${index}] invalido.`);
    }
    return {
      title: requiredText(item.title, `${label}[${index}].title`),
      description: requiredText(item.description, `${label}[${index}].description`),
    };
  });
};

const parseSocialArray = (value, label) => {
  const items = parseJsonLike(value, label, "array");
  if (items === undefined) return undefined;
  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw badRequest(`${label}[${index}] invalido.`);
    }
    return {
      label: requiredText(item.label, `${label}[${index}].label`),
      url: requiredText(item.url, `${label}[${index}].url`),
      kind: trimText(item.kind) ?? "link",
    };
  });
};

const parseOverlayConfig = (value) => {
  const parsed = parseJsonLike(value, "overlay_config", "object");
  if (parsed === undefined) return undefined;
  return {
    x: Number(parsed.x ?? 0),
    y: Number(parsed.y ?? 0),
    scale: Number(parsed.scale ?? 1),
  };
};

const DEFAULT_LOT_STATE_PALETTE = Object.freeze({
  disponible: "#2d9b59",
  separado: "#d67900",
  vendido: "#d84532",
  selected: "#2f8cff",
});

const DEFAULT_LOT_FILL_OPACITY_PALETTE = Object.freeze({
  disponible: 0.14,
  separado: 0.14,
  vendido: 0.14,
  selected: 0.14,
});

const normalizeHexColor = (value, label) => {
  const next = String(value || "").trim();
  if (!next) {
    throw badRequest(`${label} es obligatorio.`);
  }

  const normalized = next.startsWith("#") ? next : `#${next}`;
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    throw badRequest(`${label} debe ser un color hex valido.`);
  }
  return normalized.toLowerCase();
};

const parseLotStatePalette = (value) => {
  const parsed = parseJsonLike(value, "lot_state_palette", "object");
  if (parsed === undefined) return undefined;
  return {
    disponible: normalizeHexColor(parsed.disponible ?? DEFAULT_LOT_STATE_PALETTE.disponible, "Color disponible"),
    separado: normalizeHexColor(parsed.separado ?? DEFAULT_LOT_STATE_PALETTE.separado, "Color separado"),
    vendido: normalizeHexColor(parsed.vendido ?? DEFAULT_LOT_STATE_PALETTE.vendido, "Color vendido"),
    selected: normalizeHexColor(parsed.selected ?? DEFAULT_LOT_STATE_PALETTE.selected, "Color seleccionado"),
  };
};

const parseLotStateFillOpacity = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return 0.14;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw badRequest("La opacidad del overlay debe ser numerica.");
  }
  if (parsed < 0 || parsed > 1) {
    throw badRequest("La opacidad del overlay debe estar entre 0 y 1.");
  }
  return parsed;
};

const parseLotStateFillOpacityPalette = (value, fallback = DEFAULT_LOT_FILL_OPACITY_PALETTE) => {
  const parsed = parseJsonLike(value, "lot_state_fill_opacity_palette", "object");
  if (parsed === undefined) return undefined;

  return {
    disponible: parseLotStateFillOpacity(parsed.disponible ?? fallback.disponible),
    separado: parseLotStateFillOpacity(parsed.separado ?? fallback.separado),
    vendido: parseLotStateFillOpacity(parsed.vendido ?? fallback.vendido),
    selected: parseLotStateFillOpacity(parsed.selected ?? fallback.selected),
  };
};

const parseMesesReferenciales = (value) => {
  if (value === undefined) return undefined;
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.trim().startsWith("[")
        ? parseJsonLike(value, "meses_referenciales", "array")
        : value.split(/\r?\n|,/)
      : null;

  if (!list) {
    throw badRequest("meses_referenciales invalido.");
  }

  const parsed = list
    .map((item) => Number.parseInt(String(item).trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);

  return [...new Set(parsed)].sort((a, b) => a - b);
};

const parseTiposFinanciamiento = (value) => {
  const list = parseStringArray(value, "tipos_financiamiento");
  if (list === undefined) return undefined;
  return [...new Set(list.map((item) => item.toUpperCase()))];
};

const mapEmpresaRow = (row) => ({
  id: row.id,
  nombreComercial: row.nombre_comercial,
  razonSocial: row.razon_social,
  ruc: row.ruc,
  direccionFiscal: row.direccion_fiscal ?? "",
  telefono: row.telefono ?? "",
  email: row.email ?? "",
  webUrl: row.web_url ?? "",
  logoPrincipalUrl: row.logo_principal_url ?? "",
  logoSecundarioUrl: row.logo_secundario_url ?? "",
  estado: Boolean(row.estado),
});

const injectProjectEditableFields = (bundle, projectRow) => {
  if (!bundle?.contexto || !projectRow) return bundle;
  return {
    ...bundle,
    contexto: {
      ...bundle.contexto,
      proyecto: {
        ...bundle.contexto.proyecto,
        fechaInicio: projectRow.fecha_inicio,
        fechaFin: projectRow.fecha_fin,
      },
    },
  };
};

const loadPrimaryEmpresaAsync = async (client, schema) => {
  const result = await client.query(
    `select * from ${schema}.empresa order by created_at asc limit 1`
  );
  const row = result.rows[0] ?? null;
  if (!row) throw notFound("No existe empresa configurada.");
  return row;
};

const assertProjectNameStageUniqueAsync = async (
  client,
  schema,
  empresaId,
  nombre,
  etapa,
  excludeProjectId = null,
) => {
  const result = await client.query(
    `select id
       from ${schema}.proyectos
      where empresa_id = $1
        and lower(trim(nombre)) = lower(trim($2))
        and lower(trim(coalesce(etapa, ''))) = lower(trim(coalesce($3, '')))
        and ($4::uuid is null or id <> $4::uuid)
      limit 1`,
    [empresaId, nombre, etapa, excludeProjectId],
  );

  if (result.rowCount > 0) {
    throw badRequest("Ya existe un proyecto con ese nombre y etapa en la empresa.");
  }
};

const assertProjectSlugUniqueAsync = async (
  client,
  schema,
  slug,
  excludeProjectId = null,
) => {
  const result = await client.query(
    `select id
       from ${schema}.proyectos
      where lower(trim(slug)) = lower(trim($1))
        and ($2::uuid is null or id <> $2::uuid)
      limit 1`,
    [slug, excludeProjectId],
  );

  if (result.rowCount > 0) {
    throw badRequest("El slug publico ya esta en uso por otro proyecto.");
  }
};

const resolveVisibleProjectIdAsync = async (client, schema, actor, requestedProjectId = null) => {
  const visibleResult = await client.query(
    `select * from ${schema}.fn_proyectos_visibles_app($1::uuid) order by nombre asc`,
    [actor.id]
  );
  const visibleRows = visibleResult.rows;
  const requestedRef = trimText(requestedProjectId);
  const requestedSlug = requestedRef ? normalizeSlug(requestedRef, "Slug") : null;
  const targetRow =
    (requestedRef
      ? visibleRows.find((row) => row.proyecto_id === requestedRef || row.slug === requestedSlug)
      : null) ?? visibleRows[0] ?? null;

  if (!targetRow?.proyecto_id) {
    throw notFound("No hay proyecto visible para el usuario.");
  }
  return targetRow.proyecto_id;
};

const buildProjectSettingsBundleAsync = async (client, schema, username, pin, targetProjectId) => {
  const bundle = await getProjectContextAsync(username, pin, targetProjectId);
  const projectResult = await client.query(
    `select fecha_inicio, fecha_fin
       from ${schema}.proyectos
      where id = $1
      limit 1`,
    [targetProjectId]
  );
  return injectProjectEditableFields(bundle, projectResult.rows[0] ?? null);
};

export const getEmpresaSettingsAsync = async (username, pin) => {
  await requireSuperadminUserAsync(username, pin);
  const schema = ensureDevSchema();
  return withPgClient(async (client) => mapEmpresaRow(await loadPrimaryEmpresaAsync(client, schema)));
};

export const updateEmpresaSettingsAsync = async (username, pin, payload) => {
  await requireSuperadminUserAsync(username, pin);
  const schema = ensureDevSchema();

  return withPgTransaction(async (client) => {
    const existing = await loadPrimaryEmpresaAsync(client, schema);
    const next = {
      nombreComercial: requiredText(payload?.nombreComercial ?? existing.nombre_comercial, "Nombre comercial"),
      razonSocial: requiredText(payload?.razonSocial ?? existing.razon_social, "Razon social"),
      ruc: requiredText(payload?.ruc ?? existing.ruc, "RUC"),
      direccionFiscal: trimText(payload?.direccionFiscal ?? existing.direccion_fiscal),
      telefono: trimText(payload?.telefono ?? existing.telefono),
      email: trimText(payload?.email ?? existing.email),
      webUrl: optionalUrl(payload?.webUrl ?? existing.web_url),
      logoPrincipalUrl: optionalUrl(payload?.logoPrincipalUrl ?? existing.logo_principal_url),
      logoSecundarioUrl: optionalUrl(payload?.logoSecundarioUrl ?? existing.logo_secundario_url),
      estado: optionalBoolean(payload?.estado) ?? Boolean(existing.estado),
    };

    const result = await client.query(
      `update ${schema}.empresa
          set nombre_comercial = $2,
              razon_social = $3,
              ruc = $4,
              direccion_fiscal = $5,
              telefono = $6,
              email = $7,
              web_url = $8,
              logo_principal_url = $9,
              logo_secundario_url = $10,
              estado = $11
        where id = $1
        returning *`,
      [
        existing.id,
        next.nombreComercial,
        next.razonSocial,
        next.ruc,
        next.direccionFiscal,
        next.telefono,
        next.email,
        next.webUrl,
        next.logoPrincipalUrl,
        next.logoSecundarioUrl,
        next.estado,
      ]
    );

    return mapEmpresaRow(result.rows[0]);
  });
};

export const getProjectSettingsAsync = async (username, pin, requestedProjectId = null) => {
  const actor = await requireProjectManagerUserAsync(username, pin);
  const schema = ensureDevSchema();

  return withPgClient(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, actor, requestedProjectId);
    return buildProjectSettingsBundleAsync(client, schema, username, pin, targetProjectId);
  });
};

const extractUiCopySection = (item, section) => {
  const contexto = item?.contexto;
  if (!contexto) {
    throw badRequest("Proyecto origen sin configuracion disponible.");
  }

  const project = {
    id: contexto.proyecto.id,
    slug: contexto.proyecto.slug,
    nombre: contexto.proyecto.nombre,
    etapa: contexto.proyecto.etapa ?? "",
  };

  switch (section) {
    case "assets":
      return {
        sourceProject: project,
        section,
        values: {
          logoHeaderUrl: contexto.ui.logoHeaderUrl ?? "",
          logoFooterUrl: contexto.ui.logoFooterUrl ?? "",
          logoProyectoUrl: contexto.ui.logoProyectoUrl ?? "",
          ogImageUrl: contexto.ui.ogImageUrl ?? "",
          metaTitle: contexto.ui.metaTitle ?? "",
          metaDescription: contexto.ui.metaDescription ?? "",
        },
      };
    case "branding":
      return {
        sourceProject: project,
        section,
        values: {
          estado: true,
          themeSeed: contexto.ui.themeSeed ?? {},
          themeOverrides: contexto.ui.themeOverrides ?? {},
          lotStatePalette: contexto.ui.lotStatePalette ?? DEFAULT_LOT_STATE_PALETTE,
          lotFillOpacity: contexto.ui.lotFillOpacity ?? 0.14,
          lotFillOpacityPalette: contexto.ui.lotFillOpacityPalette ?? DEFAULT_LOT_FILL_OPACITY_PALETTE,
        },
      };
    case "socials":
      return {
        sourceProject: project,
        section,
        values: {
          redesSociales: Array.isArray(contexto.ui.redesSociales) ? contexto.ui.redesSociales : [],
        },
      };
    case "highlights":
      return {
        sourceProject: project,
        section,
        values: {
          highlights: Array.isArray(contexto.ui.highlights) ? contexto.ui.highlights : [],
        },
      };
    default:
      throw badRequest("Seccion UI no soportada.");
  }
};

export const getProjectUiCopySourceAsync = async (username, pin, sourceProjectRef, section) => {
  const normalizedSection = String(section || "").trim().toLowerCase();
  if (!sourceProjectRef) {
    throw badRequest("Proyecto origen requerido.");
  }

  if (!["assets", "branding", "socials", "highlights"].includes(normalizedSection)) {
    throw badRequest("Seccion UI no soportada.");
  }

  const item = await getProjectSettingsAsync(username, pin, sourceProjectRef);
  return extractUiCopySection(item, normalizedSection);
};

const generateUniqueProjectSlugAsync = async (client, schema, baseInput) => {
  const baseSlug = normalizeSlug(baseInput, "Slug");
  let attempt = baseSlug;
  let index = 2;

  for (;;) {
    const existing = await client.query(`select 1 from ${schema}.proyectos where slug = $1 limit 1`, [attempt]);
    if (existing.rowCount === 0) {
      return attempt;
    }
    attempt = `${baseSlug}-${index}`;
    index += 1;
  }
};

const buildProjectSlugSeed = (nombre, etapa) => {
  const normalizedEtapa = trimText(etapa);
  return normalizedEtapa ? `${nombre} ${normalizedEtapa}` : nombre;
};

export const createProjectAsync = async (username, pin, payload) => {
  const actor = await requireSuperadminUserAsync(username, pin);
  const schema = ensureDevSchema();

  return withPgTransaction(async (client) => {
    const empresa = await loadPrimaryEmpresaAsync(client, schema);
    const nombre = requiredText(payload?.nombre, "Nombre");
    const etapa = trimText(payload?.etapa);
    await assertProjectNameStageUniqueAsync(client, schema, empresa.id, nombre, etapa, null);
    const requestedSlug = trimText(payload?.slug);
    const slug = requestedSlug
      ? normalizeSlug(requestedSlug, "Slug")
      : await generateUniqueProjectSlugAsync(client, schema, buildProjectSlugSeed(nombre, etapa));
    await assertProjectSlugUniqueAsync(client, schema, slug, null);

    const projectResult = await client.query(
      `insert into ${schema}.proyectos (
          empresa_id,
          nombre,
          slug,
          etapa,
          descripcion_corta,
          ubicacion_texto,
          distrito,
          provincia,
          departamento,
          pais,
          fecha_inicio,
          fecha_fin,
          estado,
          logo_proyecto_url
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        returning id`,
      [
        empresa.id,
        nombre,
        slug,
        etapa,
        trimText(payload?.descripcionCorta),
        trimText(payload?.ubicacionTexto),
        trimText(payload?.distrito),
        trimText(payload?.provincia),
        trimText(payload?.departamento),
        requiredText(payload?.pais ?? "Peru", "Pais"),
        optionalDate(payload?.fechaInicio, "Fecha inicio"),
        optionalDate(payload?.fechaFin, "Fecha fin"),
        optionalBoolean(payload?.estado) ?? true,
        optionalUrl(payload?.logoProyectoUrl),
      ]
    );

    const projectId = projectResult.rows[0]?.id;
    if (!projectId) {
      throw notFound("No se pudo crear el proyecto.");
    }

    await client.query(
      `insert into ${schema}.proyecto_usuarios (proyecto_id, usuario_id, acceso_activo)
       values ($1, $2, true)
       on conflict (proyecto_id, usuario_id) do update
         set acceso_activo = true`,
      [projectId, actor.id]
    );

    await client.query(
      `insert into ${schema}.proyecto_configuracion_ui (
          proyecto_id,
          logo_proyecto_url,
          logo_header_url,
          logo_footer_url,
          mapa_svg_url,
          mapa_webp_url,
          overlay_config,
          theme_seed,
          theme_overrides,
          meta_title,
          meta_description,
          lot_state_palette,
          lot_state_fill_opacity,
          lot_state_fill_opacity_palette,
          proforma_config,
          impresion_config,
          redes_sociales,
          amenities,
          highlights,
          estado
        )
        values (
          $1,$2,$3,$4,$5,$6,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          $7,$8,
          $9::jsonb,
          0.14,
          $10::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          true
        )`,
      [
        projectId,
        optionalUrl(payload?.logoProyectoUrl),
        empresa.logo_principal_url ?? null,
        empresa.logo_secundario_url ?? null,
        null,
        null,
        nombre,
        trimText(payload?.descripcionCorta),
        JSON.stringify(DEFAULT_LOT_STATE_PALETTE),
        JSON.stringify(DEFAULT_LOT_FILL_OPACITY_PALETTE),
      ]
    );

    await client.query(
      `insert into ${schema}.proyecto_configuracion_comercial (
          proyecto_id,
          inicial_minima,
          separacion_minima,
          cuotas_minimas,
          cuotas_maximas,
          meses_referenciales,
          tipos_financiamiento,
          plusvalia_base_pct,
          plusvalia_anual_pct,
          tasa_interes_anual_ref,
          reglas_descuento,
          venta_config,
          estado
        )
        values (
          $1, 6000, 0, 1, 36,
          '[12,24,36]'::jsonb,
          '["REDUCIR_CUOTA","REDUCIR_MESES"]'::jsonb,
          0, 0, 0,
          '{}'::jsonb,
          '{}'::jsonb,
          true
        )`,
      [projectId]
    );

    return buildProjectSettingsBundleAsync(client, schema, username, pin, projectId);
  });
};

export const updateProjectBaseAsync = async (username, pin, payload, requestedProjectId = null) => {
  const actor = await requireProjectManagerUserAsync(username, pin);
  const schema = ensureDevSchema();

  return withPgTransaction(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, actor, requestedProjectId ?? payload?.proyectoId);
    const current = await client.query(`select * from ${schema}.proyectos where id = $1 limit 1`, [targetProjectId]);
    const row = current.rows[0];
    if (!row) throw notFound("Proyecto no encontrado.");
    const nombre = requiredText(payload?.nombre ?? row.nombre, "Nombre");
    const etapa = trimText(payload?.etapa ?? row.etapa);
    await assertProjectNameStageUniqueAsync(client, schema, row.empresa_id, nombre, etapa, targetProjectId);
    const slug = normalizeSlug(payload?.slug ?? row.slug ?? row.nombre, "Slug");
    await assertProjectSlugUniqueAsync(client, schema, slug, targetProjectId);

    await client.query(
      `update ${schema}.proyectos
          set nombre = $2,
              slug = $3,
              etapa = $4,
              descripcion_corta = $5,
              ubicacion_texto = $6,
              distrito = $7,
              provincia = $8,
              departamento = $9,
              pais = $10,
              fecha_inicio = $11,
              fecha_fin = $12,
              estado = $13,
              logo_proyecto_url = $14
        where id = $1`,
      [
        targetProjectId,
        nombre,
        slug,
        etapa,
        trimText(payload?.descripcionCorta ?? row.descripcion_corta),
        trimText(payload?.ubicacionTexto ?? row.ubicacion_texto),
        trimText(payload?.distrito ?? row.distrito),
        trimText(payload?.provincia ?? row.provincia),
        trimText(payload?.departamento ?? row.departamento),
        requiredText(payload?.pais ?? row.pais, "Pais"),
        optionalDate(payload?.fechaInicio ?? row.fecha_inicio, "Fecha inicio"),
        optionalDate(payload?.fechaFin ?? row.fecha_fin, "Fecha fin"),
        optionalBoolean(payload?.estado) ?? Boolean(row.estado),
        optionalUrl(payload?.logoProyectoUrl ?? row.logo_proyecto_url),
      ]
    );

    return buildProjectSettingsBundleAsync(client, schema, username, pin, targetProjectId);
  });
};

export const updateProjectUiConfigAsync = async (username, pin, payload, requestedProjectId = null) => {
  const actor = await requireProjectManagerUserAsync(username, pin);
  const schema = ensureDevSchema();

  return withPgTransaction(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, actor, requestedProjectId ?? payload?.proyectoId);
    await client.query(
      `insert into ${schema}.proyecto_configuracion_ui (proyecto_id)
       values ($1)
       on conflict (proyecto_id) do nothing`,
      [targetProjectId]
    );

    const current = await client.query(`select * from ${schema}.proyecto_configuracion_ui where proyecto_id = $1 limit 1`, [targetProjectId]);
    const row = current.rows[0];
    if (!row) throw notFound("Configuracion UI no encontrada.");

    await client.query(
      `update ${schema}.proyecto_configuracion_ui
          set logo_proyecto_url = $2,
              logo_header_url = $3,
              logo_footer_url = $4,
              mapa_svg_url = $5,
              mapa_webp_url = $6,
              overlay_config = $7::jsonb,
              theme_seed = $8::jsonb,
              theme_overrides = $9::jsonb,
              meta_title = $10,
              meta_description = $11,
              og_image_url = $12,
              lot_state_palette = $13::jsonb,
              lot_state_fill_opacity = $14,
              lot_state_fill_opacity_palette = $15::jsonb,
              proforma_config = $16::jsonb,
              impresion_config = $17::jsonb,
              redes_sociales = $18::jsonb,
              amenities = $19::jsonb,
              highlights = $20::jsonb,
              estado = $21
        where proyecto_id = $1`,
      [
        targetProjectId,
        optionalUrl(payload?.logoProyectoUrl ?? row.logo_proyecto_url),
        optionalUrl(payload?.logoHeaderUrl ?? row.logo_header_url),
        optionalUrl(payload?.logoFooterUrl ?? row.logo_footer_url),
        optionalUrl(payload?.mapaSvgUrl ?? row.mapa_svg_url),
        optionalUrl(payload?.mapaWebpUrl ?? row.mapa_webp_url),
        JSON.stringify(parseOverlayConfig(payload?.overlayConfig ?? row.overlay_config)),
        JSON.stringify(parseJsonLike(payload?.themeSeed ?? row.theme_seed, "theme_seed", "object")),
        JSON.stringify(parseJsonLike(payload?.themeOverrides ?? row.theme_overrides, "theme_overrides", "object")),
        trimText(payload?.metaTitle ?? row.meta_title),
        trimText(payload?.metaDescription ?? row.meta_description),
        optionalUrl(payload?.ogImageUrl ?? row.og_image_url),
        JSON.stringify(parseLotStatePalette(payload?.lotStatePalette ?? row.lot_state_palette ?? DEFAULT_LOT_STATE_PALETTE)),
        parseLotStateFillOpacity(payload?.lotFillOpacity ?? row.lot_state_fill_opacity ?? 0.14),
        JSON.stringify(
          parseLotStateFillOpacityPalette(
            payload?.lotFillOpacityPalette ?? row.lot_state_fill_opacity_palette,
            {
              disponible: parseLotStateFillOpacity(row.lot_state_fill_opacity ?? 0.14),
              separado: parseLotStateFillOpacity(row.lot_state_fill_opacity ?? 0.14),
              vendido: parseLotStateFillOpacity(row.lot_state_fill_opacity ?? 0.14),
              selected: parseLotStateFillOpacity(row.lot_state_fill_opacity ?? 0.14),
            },
          ),
        ),
        JSON.stringify(parseJsonLike(payload?.proformaConfig ?? row.proforma_config, "proforma_config", "object")),
        JSON.stringify(parseJsonLike(payload?.impresionConfig ?? row.impresion_config, "impresion_config", "object")),
        JSON.stringify(parseSocialArray(payload?.redesSociales ?? row.redes_sociales, "redes_sociales")),
        JSON.stringify(parseStringArray(payload?.amenities ?? row.amenities, "amenities")),
        JSON.stringify(parseHighlightArray(payload?.highlights ?? row.highlights, "highlights")),
        optionalBoolean(payload?.estado) ?? Boolean(row.estado),
      ]
    );

    return buildProjectSettingsBundleAsync(client, schema, username, pin, targetProjectId);
  });
};

export const updateProjectCommercialConfigAsync = async (username, pin, payload, requestedProjectId = null) => {
  const actor = await requireProjectManagerUserAsync(username, pin);
  const schema = ensureDevSchema();

  return withPgTransaction(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, actor, requestedProjectId ?? payload?.proyectoId);
    await client.query(
      `insert into ${schema}.proyecto_configuracion_comercial (proyecto_id)
       values ($1)
       on conflict (proyecto_id) do nothing`,
      [targetProjectId]
    );

    const current = await client.query(`select * from ${schema}.proyecto_configuracion_comercial where proyecto_id = $1 limit 1`, [targetProjectId]);
    const row = current.rows[0];
    if (!row) throw notFound("Configuracion comercial no encontrada.");

    const cuotasMin = optionalInteger(payload?.cuotasMinimas ?? row.cuotas_minimas, "Cuotas minimas");
    const cuotasMax = optionalInteger(payload?.cuotasMaximas ?? row.cuotas_maximas, "Cuotas maximas");
    if ((cuotasMin ?? 1) > (cuotasMax ?? 36)) {
      throw badRequest("Las cuotas maximas deben ser mayores o iguales a las minimas.");
    }

    await client.query(
      `update ${schema}.proyecto_configuracion_comercial
          set inicial_minima = $2,
              separacion_minima = $3,
              cuotas_minimas = $4,
              cuotas_maximas = $5,
              meses_referenciales = $6::jsonb,
              tipos_financiamiento = $7::jsonb,
              plusvalia_base_pct = $8,
              plusvalia_anual_pct = $9,
              tasa_interes_anual_ref = $10,
              precio_minimo_lote = $11,
              precio_maximo_lote = $12,
              reglas_descuento = $13::jsonb,
              venta_config = $14::jsonb,
              estado = $15
        where proyecto_id = $1`,
      [
        targetProjectId,
        optionalNumber(payload?.inicialMinima ?? row.inicial_minima, "Inicial minima"),
        optionalNumber(payload?.separacionMinima ?? row.separacion_minima, "Separacion minima"),
        cuotasMin,
        cuotasMax,
        JSON.stringify(parseMesesReferenciales(payload?.mesesReferenciales ?? row.meses_referenciales)),
        JSON.stringify(parseTiposFinanciamiento(payload?.tiposFinanciamiento ?? row.tipos_financiamiento)),
        optionalNumber(payload?.plusvaliaBasePct ?? row.plusvalia_base_pct, "Plusvalia base"),
        optionalNumber(payload?.plusvaliaAnualPct ?? row.plusvalia_anual_pct, "Plusvalia anual"),
        optionalNumber(payload?.tasaInteresAnualRef ?? row.tasa_interes_anual_ref, "Tasa interes"),
        optionalNumber(payload?.precioMinimoLote ?? row.precio_minimo_lote, "Precio minimo lote"),
        optionalNumber(payload?.precioMaximoLote ?? row.precio_maximo_lote, "Precio maximo lote"),
        JSON.stringify(parseJsonLike(payload?.reglasDescuento ?? row.reglas_descuento, "reglas_descuento", "object")),
        JSON.stringify(parseJsonLike(payload?.ventaConfig ?? row.venta_config, "venta_config", "object")),
        optionalBoolean(payload?.estado) ?? Boolean(row.estado),
      ]
    );

    return buildProjectSettingsBundleAsync(client, schema, username, pin, targetProjectId);
  });
};
