begin;

alter table dev.proyectos
  add column if not exists slug text;

with normalized as (
  select
    p.id,
    case
      when coalesce(trim(p.slug), '') <> '' then lower(trim(p.slug))
      else regexp_replace(
        regexp_replace(
          lower(unaccent(coalesce(p.nombre, 'proyecto'))),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '(^-+|-+$)',
        '',
        'g'
      )
    end as base_slug
  from dev.proyectos p
), prepared as (
  select
    id,
    case
      when coalesce(base_slug, '') = '' then 'proyecto-' || substr(id::text, 1, 8)
      else base_slug
    end as prepared_slug
  from normalized
), ranked as (
  select
    id,
    prepared_slug,
    row_number() over (partition by prepared_slug order by id) as slug_rank
  from prepared
), resolved as (
  select
    id,
    case
      when slug_rank = 1 then prepared_slug
      else prepared_slug || '-' || slug_rank::text
    end as final_slug
  from ranked
)
update dev.proyectos p
   set slug = r.final_slug
  from resolved r
 where p.id = r.id
   and coalesce(trim(p.slug), '') <> r.final_slug;

alter table dev.proyectos
  alter column slug set not null;

alter table dev.proyectos
  drop constraint if exists proyectos_slug_format_chk;

alter table dev.proyectos
  add constraint proyectos_slug_format_chk
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index if not exists proyectos_slug_unique_idx on dev.proyectos (slug);

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

create or replace function dev.fn_proyectos_visibles_app(p_actor_usuario_id uuid)
returns table (
  proyecto_id uuid,
  slug text,
  nombre text,
  etapa text,
  empresa_nombre_comercial text,
  proyecto_activo boolean
)
language sql
stable
as $$
  select distinct
    p.id as proyecto_id,
    p.slug,
    p.nombre,
    p.etapa,
    e.nombre_comercial as empresa_nombre_comercial,
    p.estado as proyecto_activo
  from dev.proyecto_usuarios pu
  join dev.proyectos p on p.id = pu.proyecto_id
  join dev.empresa e on e.id = p.empresa_id
  where pu.usuario_id = p_actor_usuario_id
    and pu.acceso_activo = true
  order by p.nombre asc
$$;

commit;
