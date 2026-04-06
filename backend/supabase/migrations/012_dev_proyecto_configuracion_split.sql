-- 012_dev_proyecto_configuracion_split.sql
-- Separa configuracion visual/comercial por proyecto en schema dev.
-- Mantiene compatibilidad con columnas legacy en dev.proyectos.

begin;

create table if not exists dev.proyecto_configuracion_ui (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null,
  logo_proyecto_url text,
  logo_header_url text,
  logo_footer_url text,
  mapa_svg_url text,
  mapa_webp_url text,
  overlay_config jsonb not null default '{}'::jsonb,
  theme_seed jsonb not null default '{}'::jsonb,
  theme_overrides jsonb not null default '{}'::jsonb,
  meta_title text,
  meta_description text,
  og_image_url text,
  proforma_config jsonb not null default '{}'::jsonb,
  impresion_config jsonb not null default '{}'::jsonb,
  redes_sociales jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  estado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dev.proyecto_configuracion_comercial (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null,
  inicial_minima numeric not null default 6000,
  separacion_minima numeric not null default 0,
  cuotas_minimas integer not null default 1,
  cuotas_maximas integer not null default 36,
  meses_referenciales jsonb not null default '[12,24,36]'::jsonb,
  tipos_financiamiento jsonb not null default '["REDUCIR_CUOTA","REDUCIR_MESES"]'::jsonb,
  plusvalia_base_pct numeric not null default 0,
  plusvalia_anual_pct numeric not null default 0,
  tasa_interes_anual_ref numeric not null default 0,
  precio_minimo_lote numeric,
  precio_maximo_lote numeric,
  reglas_descuento jsonb not null default '{}'::jsonb,
  venta_config jsonb not null default '{}'::jsonb,
  estado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proyecto_configuracion_comercial_inicial_minima_chk check (inicial_minima >= 0),
  constraint proyecto_configuracion_comercial_separacion_minima_chk check (separacion_minima >= 0),
  constraint proyecto_configuracion_comercial_cuotas_rango_chk check (cuotas_minimas >= 1 and cuotas_maximas >= cuotas_minimas),
  constraint proyecto_configuracion_comercial_plusvalia_base_chk check (plusvalia_base_pct >= 0),
  constraint proyecto_configuracion_comercial_plusvalia_anual_chk check (plusvalia_anual_pct >= 0),
  constraint proyecto_configuracion_comercial_tasa_interes_chk check (tasa_interes_anual_ref >= 0),
  constraint proyecto_configuracion_comercial_precio_min_chk check (precio_minimo_lote is null or precio_minimo_lote >= 0),
  constraint proyecto_configuracion_comercial_precio_max_chk check (precio_maximo_lote is null or precio_maximo_lote >= 0)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where connamespace = 'dev'::regnamespace
      and conname = 'proyecto_configuracion_ui_proyecto_id_key'
  ) then
    alter table dev.proyecto_configuracion_ui
      add constraint proyecto_configuracion_ui_proyecto_id_key unique (proyecto_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where connamespace = 'dev'::regnamespace
      and conname = 'proyecto_configuracion_comercial_proyecto_id_key'
  ) then
    alter table dev.proyecto_configuracion_comercial
      add constraint proyecto_configuracion_comercial_proyecto_id_key unique (proyecto_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where connamespace = 'dev'::regnamespace
      and conname = 'proyecto_configuracion_ui_proyecto_id_fkey'
  ) then
    alter table dev.proyecto_configuracion_ui
      add constraint proyecto_configuracion_ui_proyecto_id_fkey foreign key (proyecto_id) references dev.proyectos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where connamespace = 'dev'::regnamespace
      and conname = 'proyecto_configuracion_comercial_proyecto_id_fkey'
  ) then
    alter table dev.proyecto_configuracion_comercial
      add constraint proyecto_configuracion_comercial_proyecto_id_fkey foreign key (proyecto_id) references dev.proyectos(id) on delete cascade;
  end if;
end
$$;

create index if not exists proyecto_configuracion_ui_estado_idx on dev.proyecto_configuracion_ui (estado);
create index if not exists proyecto_configuracion_comercial_estado_idx on dev.proyecto_configuracion_comercial (estado);

insert into dev.proyecto_configuracion_ui (
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
  og_image_url,
  proforma_config,
  impresion_config,
  redes_sociales,
  amenities,
  highlights,
  estado
)
select
  p.id,
  p.logo_proyecto_url,
  '/assets/proyectos/arenas-malabrigo/arenas_club_cele.png',
  '/assets/empresas/hola-trujillo/HOLA-TRUJILLO_LOGOTIPO.webp',
  '/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx',
  '/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/plano-fondo-demo-b.webp',
  coalesce(p.overlay_config, '{}'::jsonb),
  coalesce(p.theme_seed, '{}'::jsonb),
  coalesce(p.theme_overrides, '{}'::jsonb),
  p.nombre,
  'Plano virtual - ' || p.nombre || E'\nDesarrollado por Adaptic',
  '/assets/proyectos/arenas-malabrigo/arenas_club_cele.png',
  '{"mostrar_amenities":true,"resaltar_clubes":true}'::jsonb,
  '{"mostrar_logo_footer":true}'::jsonb,
  '[
    {"label":"Instagram","url":"https://www.instagram.com/adaptic.pe","kind":"instagram"}
  ]'::jsonb,
  '[
    "Membresia vitalicia al club house de 20 mil m2",
    "Zonas de recreacion",
    "Pistas afirmadas",
    "Vigilancia y Cerco vivo"
  ]'::jsonb,
  '[
    {"title":"Servicios instalados","description":"Agua en cada lote y alumbrado eficiente para vivir o invertir."},
    {"title":"Seguridad y recreacion","description":"Vigilancia y cerco vivo, ademas de zonas comunes para tu tranquilidad."},
    {"title":"Cadena de clubes","description":"Acceso exclusivo a nivel nacional para todos nuestros clientes."},
    {"title":"Titulo propio","description":"Propiedad independizada lista para transferencia inmediata."}
  ]'::jsonb,
  p.estado
from dev.proyectos p
on conflict (proyecto_id) do update
set logo_proyecto_url = excluded.logo_proyecto_url,
    logo_header_url = excluded.logo_header_url,
    logo_footer_url = excluded.logo_footer_url,
    mapa_webp_url = excluded.mapa_webp_url,
    overlay_config = excluded.overlay_config,
    theme_seed = excluded.theme_seed,
    theme_overrides = excluded.theme_overrides,
    meta_title = excluded.meta_title,
    meta_description = excluded.meta_description,
    og_image_url = excluded.og_image_url,
    proforma_config = excluded.proforma_config,
    impresion_config = excluded.impresion_config,
    redes_sociales = excluded.redes_sociales,
    amenities = excluded.amenities,
    highlights = excluded.highlights,
    estado = excluded.estado,
    updated_at = now();

insert into dev.proyecto_configuracion_comercial (
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
  precio_minimo_lote,
  precio_maximo_lote,
  reglas_descuento,
  venta_config,
  estado
)
select
  p.id,
  6000,
  0,
  1,
  36,
  '[12,24,36]'::jsonb,
  '["REDUCIR_CUOTA","REDUCIR_MESES"]'::jsonb,
  0,
  0,
  0,
  null,
  null,
  '{}'::jsonb,
  '{"fecha_pago_pactada_editable":true,"max_titulares":2}'::jsonb,
  p.estado
from dev.proyectos p
on conflict (proyecto_id) do update
set inicial_minima = excluded.inicial_minima,
    separacion_minima = excluded.separacion_minima,
    cuotas_minimas = excluded.cuotas_minimas,
    cuotas_maximas = excluded.cuotas_maximas,
    meses_referenciales = excluded.meses_referenciales,
    tipos_financiamiento = excluded.tipos_financiamiento,
    plusvalia_base_pct = excluded.plusvalia_base_pct,
    plusvalia_anual_pct = excluded.plusvalia_anual_pct,
    tasa_interes_anual_ref = excluded.tasa_interes_anual_ref,
    precio_minimo_lote = excluded.precio_minimo_lote,
    precio_maximo_lote = excluded.precio_maximo_lote,
    reglas_descuento = excluded.reglas_descuento,
    venta_config = excluded.venta_config,
    estado = excluded.estado,
    updated_at = now();

drop view if exists dev.v_contexto_proyectos;create view dev.v_contexto_proyectos as
select
  p.id as proyecto_id,
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

drop trigger if exists trg_proyecto_configuracion_ui_updated_at on dev.proyecto_configuracion_ui;
create trigger trg_proyecto_configuracion_ui_updated_at
before update on dev.proyecto_configuracion_ui
for each row execute function dev.set_updated_at();

drop trigger if exists trg_proyecto_configuracion_comercial_updated_at on dev.proyecto_configuracion_comercial;
create trigger trg_proyecto_configuracion_comercial_updated_at
before update on dev.proyecto_configuracion_comercial
for each row execute function dev.set_updated_at();

commit;

