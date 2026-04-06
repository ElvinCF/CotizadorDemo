begin;

drop view if exists dev.v_contexto_proyectos;

create or replace view dev.v_contexto_proyectos as
select
  p.id as proyecto_id,
  p.slug,
  p.nombre as proyecto_nombre,
  p.etapa,
  p.descripcion_corta,
  p.ubicacion_texto,
  p.distrito,
  p.provincia,
  p.departamento,
  p.pais,
  p.fecha_inicio,
  p.fecha_fin,
  coalesce(pcu.logo_proyecto_url, p.logo_proyecto_url) as logo_proyecto_url,
  coalesce(pcu.overlay_config, p.overlay_config) as overlay_config,
  coalesce(pcu.theme_seed, p.theme_seed) as theme_seed,
  coalesce(pcu.theme_overrides, p.theme_overrides) as theme_overrides,
  pcu.logo_header_url,
  pcu.logo_footer_url,
  pcu.mapa_svg_url,
  pcu.mapa_webp_url,
  pcu.meta_title,
  pcu.meta_description,
  pcu.og_image_url,
  pcu.proforma_config,
  pcu.impresion_config,
  pcu.redes_sociales,
  pcu.amenities,
  pcu.highlights,
  pcc.inicial_minima,
  pcc.separacion_minima,
  pcc.cuotas_minimas,
  pcc.cuotas_maximas,
  pcc.meses_referenciales,
  pcc.tipos_financiamiento,
  pcc.plusvalia_base_pct,
  pcc.plusvalia_anual_pct,
  pcc.tasa_interes_anual_ref,
  pcc.precio_minimo_lote,
  pcc.precio_maximo_lote,
  pcc.reglas_descuento,
  pcc.venta_config,
  p.estado as proyecto_activo,
  e.id as empresa_id,
  e.nombre_comercial,
  e.razon_social,
  e.ruc,
  e.direccion_fiscal,
  e.telefono,
  e.email,
  e.web_url,
  e.logo_principal_url,
  e.logo_secundario_url,
  e.estado as empresa_activa
from dev.proyectos p
join dev.empresa e on e.id = p.empresa_id
left join dev.proyecto_configuracion_ui pcu on pcu.proyecto_id = p.id and pcu.estado = true
left join dev.proyecto_configuracion_comercial pcc on pcc.proyecto_id = p.id and pcc.estado = true;

commit;
