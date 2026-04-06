-- 011_dev_empresa_proyecto_accesos.sql
-- Contexto multiproyecto inicial sobre schema dev.
-- No toca public.

begin;

create or replace function dev.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function dev.check_max_admins()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
  v_target_role text;
begin
  v_target_role := coalesce(new.rol_global::text, new.rol::text);

  if v_target_role = 'ADMIN' and new.estado = 'ACTIVO' then
    select count(*)
      into v_count
      from dev.usuarios u
     where coalesce(u.rol_global::text, u.rol::text) = 'ADMIN'
       and u.estado = 'ACTIVO'
       and u.id is distinct from new.id;

    if v_count >= 3 then
      raise exception 'No se pueden tener mas de 3 administradores activos en el sistema.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function dev.check_venta_lote_activo_unico()
returns trigger
language plpgsql
as $$
declare
  conflicting_sale_id uuid;
begin
  if new.lote_id is null then
    return new;
  end if;

  select vl.venta_id
    into conflicting_sale_id
    from dev.venta_lotes vl
    join dev.ventas v on v.id = vl.venta_id
   where vl.lote_id = new.lote_id
     and vl.venta_id <> new.venta_id
     and v.estado_venta <> 'CAIDA'::dev.venta_estado_enum
   limit 1;

  if conflicting_sale_id is not null then
    raise exception 'El lote ya pertenece a una venta activa (%).', conflicting_sale_id
      using errcode = '23505', constraint = 'venta_lotes_lote_activo_unique';
  end if;

  return new;
end;
$$;

create or replace function dev.check_venta_lote_project_match()
returns trigger
language plpgsql
as $$
declare
  v_venta_proyecto_id uuid;
  v_lote_proyecto_id uuid;
begin
  select proyecto_id into v_venta_proyecto_id
    from dev.ventas
   where id = new.venta_id;

  select proyecto_id into v_lote_proyecto_id
    from dev.lotes
   where id = new.lote_id;

  if v_venta_proyecto_id is null then
    raise exception 'La venta % no tiene proyecto_id asignado.', new.venta_id;
  end if;

  if v_lote_proyecto_id is null then
    raise exception 'El lote % no tiene proyecto_id asignado.', new.lote_id;
  end if;

  if v_venta_proyecto_id <> v_lote_proyecto_id then
    raise exception 'La venta % y el lote % pertenecen a proyectos distintos.', new.venta_id, new.lote_id;
  end if;

  return new;
end;
$$;

create or replace function dev.resolve_equipo_seed_nombre(
  p_username text,
  p_nombres text,
  p_apellidos text
)
returns text
language plpgsql
immutable
as $$
declare
  v_haystack text;
begin
  v_haystack := upper(trim(coalesce(p_username, '') || ' ' || coalesce(p_nombres, '') || ' ' || coalesce(p_apellidos, '')));

  if v_haystack like '%AIO%' then
    return 'AIO';
  end if;

  if v_haystack like '%HOLA TRUJILLO%' then
    return 'HOLA TRUJILLO';
  end if;

  return null;
end;
$$;

do $$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'dev'
       and t.typname = 'rol_global_enum'
  ) then
    create type dev.rol_global_enum as enum ('SUPERADMIN', 'ADMIN', 'ASESOR');
  end if;
end
$$;

create table if not exists dev.empresa (
  id uuid primary key default gen_random_uuid(),
  nombre_comercial text not null,
  razon_social text not null,
  ruc text not null,
  direccion_fiscal text,
  telefono text,
  email text,
  web_url text,
  logo_principal_url text,
  logo_secundario_url text,
  estado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dev.proyectos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  nombre text not null,
  etapa text,
  descripcion_corta text,
  ubicacion_texto text,
  distrito text,
  provincia text,
  departamento text,
  pais text not null default 'Peru',
  logo_proyecto_url text,
  overlay_config jsonb not null default '{}'::jsonb,
  fecha_inicio date,
  fecha_fin date,
  estado boolean not null default true,
  theme_seed jsonb not null default '{}'::jsonb,
  theme_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dev.proyecto_usuarios (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null,
  usuario_id uuid not null,
  acceso_activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dev.equipos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null,
  nombre text not null,
  admin_id uuid,
  estado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dev.equipo_usuarios (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null,
  usuario_id uuid not null,
  activo boolean not null default true,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dev.usuarios
  add column if not exists rol_global dev.rol_global_enum;

alter table dev.lotes
  add column if not exists proyecto_id uuid;

alter table dev.ventas
  add column if not exists proyecto_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'empresa_ruc_key'
  ) then
    alter table dev.empresa
      add constraint empresa_ruc_key unique (ruc);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'proyectos_empresa_id_nombre_key'
  ) then
    alter table dev.proyectos
      add constraint proyectos_empresa_id_nombre_key unique (empresa_id, nombre);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'proyecto_usuarios_proyecto_id_usuario_id_key'
  ) then
    alter table dev.proyecto_usuarios
      add constraint proyecto_usuarios_proyecto_id_usuario_id_key unique (proyecto_id, usuario_id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'equipos_proyecto_id_nombre_key'
  ) then
    alter table dev.equipos
      add constraint equipos_proyecto_id_nombre_key unique (proyecto_id, nombre);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'equipo_usuarios_equipo_id_usuario_id_key'
  ) then
    alter table dev.equipo_usuarios
      add constraint equipo_usuarios_equipo_id_usuario_id_key unique (equipo_id, usuario_id);
  end if;
end
$$;

create index if not exists empresa_estado_idx on dev.empresa (estado);
create index if not exists proyectos_empresa_id_idx on dev.proyectos (empresa_id);
create index if not exists proyectos_estado_idx on dev.proyectos (estado);
create index if not exists proyecto_usuarios_proyecto_id_idx on dev.proyecto_usuarios (proyecto_id);
create index if not exists proyecto_usuarios_usuario_id_idx on dev.proyecto_usuarios (usuario_id);
create index if not exists proyecto_usuarios_acceso_activo_idx on dev.proyecto_usuarios (acceso_activo);
create index if not exists equipos_proyecto_id_idx on dev.equipos (proyecto_id);
create index if not exists equipos_admin_id_idx on dev.equipos (admin_id);
create index if not exists equipos_estado_idx on dev.equipos (estado);
create index if not exists equipo_usuarios_equipo_id_idx on dev.equipo_usuarios (equipo_id);
create index if not exists equipo_usuarios_usuario_id_idx on dev.equipo_usuarios (usuario_id);
create index if not exists equipo_usuarios_activo_idx on dev.equipo_usuarios (activo);
create index if not exists usuarios_rol_global_idx on dev.usuarios (rol_global);
create index if not exists lotes_proyecto_id_idx on dev.lotes (proyecto_id);
create index if not exists ventas_proyecto_id_idx on dev.ventas (proyecto_id);
create index if not exists lotes_proyecto_estado_idx on dev.lotes (proyecto_id, estado_comercial);
create index if not exists ventas_proyecto_estado_idx on dev.ventas (proyecto_id, estado_venta);

update dev.usuarios
   set rol_global = case
     when rol::text = 'ADMIN' then 'ADMIN'::dev.rol_global_enum
     else 'ASESOR'::dev.rol_global_enum
   end
 where rol_global is null;

create or replace procedure dev.proc_sync_equipos_por_etiqueta(p_proyecto_id uuid)
language plpgsql
as $$
declare
  v_ai0_admin uuid;
  v_hola_admin uuid;
  v_ai0_equipo_id uuid;
  v_hola_equipo_id uuid;
begin
  select u.id
    into v_ai0_admin
    from dev.usuarios u
   where dev.resolve_equipo_seed_nombre(u.username, u.nombres, u.apellidos) = 'AIO'
     and coalesce(u.rol_global::text, u.rol::text) = 'ADMIN'
   order by u.created_at, u.id
   limit 1;

  select u.id
    into v_hola_admin
    from dev.usuarios u
   where dev.resolve_equipo_seed_nombre(u.username, u.nombres, u.apellidos) = 'HOLA TRUJILLO'
     and coalesce(u.rol_global::text, u.rol::text) = 'ADMIN'
   order by u.created_at, u.id
   limit 1;

  if exists (
    select 1 from dev.usuarios u
     where dev.resolve_equipo_seed_nombre(u.username, u.nombres, u.apellidos) = 'AIO'
  ) then
    insert into dev.equipos (proyecto_id, nombre, admin_id, estado)
    values (p_proyecto_id, 'AIO', v_ai0_admin, true)
    on conflict (proyecto_id, nombre) do update
      set admin_id = excluded.admin_id,
          estado = true,
          updated_at = now()
    returning id into v_ai0_equipo_id;

    insert into dev.equipo_usuarios (equipo_id, usuario_id, activo, fecha_inicio)
    select v_ai0_equipo_id, u.id, true, current_date
      from dev.usuarios u
     where dev.resolve_equipo_seed_nombre(u.username, u.nombres, u.apellidos) = 'AIO'
    on conflict (equipo_id, usuario_id) do update
      set activo = true,
          fecha_fin = null,
          updated_at = now();
  end if;

  if exists (
    select 1 from dev.usuarios u
     where dev.resolve_equipo_seed_nombre(u.username, u.nombres, u.apellidos) = 'HOLA TRUJILLO'
  ) then
    insert into dev.equipos (proyecto_id, nombre, admin_id, estado)
    values (p_proyecto_id, 'HOLA TRUJILLO', v_hola_admin, true)
    on conflict (proyecto_id, nombre) do update
      set admin_id = excluded.admin_id,
          estado = true,
          updated_at = now()
    returning id into v_hola_equipo_id;

    insert into dev.equipo_usuarios (equipo_id, usuario_id, activo, fecha_inicio)
    select v_hola_equipo_id, u.id, true, current_date
      from dev.usuarios u
     where dev.resolve_equipo_seed_nombre(u.username, u.nombres, u.apellidos) = 'HOLA TRUJILLO'
    on conflict (equipo_id, usuario_id) do update
      set activo = true,
          fecha_fin = null,
          updated_at = now();
  end if;
end;
$$;

create or replace procedure dev.proc_seed_contexto_inicial()
language plpgsql
as $$
declare
  v_empresa_id uuid;
  v_proyecto_id uuid;
begin
  insert into dev.empresa (
    nombre_comercial,
    razon_social,
    ruc,
    direccion_fiscal,
    telefono,
    email,
    web_url,
    logo_principal_url,
    logo_secundario_url,
    estado
  )
  values (
    'Arenas Malabrigo',
    'HOLA TRUJILLO S.A.C.',
    '20606633131',
    'Predio La Pampa, Rázuri, Ascope, La Libertad',
    null,
    null,
    null,
    '/assets/arenas_club_cele.png',
    '/assets/HOLA-TRUJILLO_LOGOTIPO.webp',
    true
  )
  on conflict (ruc) do update
    set nombre_comercial = excluded.nombre_comercial,
        razon_social = excluded.razon_social,
        direccion_fiscal = excluded.direccion_fiscal,
        logo_principal_url = excluded.logo_principal_url,
        logo_secundario_url = excluded.logo_secundario_url,
        estado = true,
        updated_at = now()
  returning id into v_empresa_id;

  insert into dev.proyectos (
    empresa_id,
    nombre,
    etapa,
    descripcion_corta,
    ubicacion_texto,
    distrito,
    provincia,
    departamento,
    pais,
    logo_proyecto_url,
    overlay_config,
    fecha_inicio,
    fecha_fin,
    estado,
    theme_seed,
    theme_overrides
  )
  values (
    v_empresa_id,
    'Arenas Malabrigo',
    'Segunda etapa',
    'Proyecto de lotes residenciales y proforma comercial actual.',
    'Predio La Pampa, Rázuri, Ascope, La Libertad',
    'Rázuri',
    'Ascope',
    'La Libertad',
    'Peru',
    '/assets/arenas_club.png',
    '{"x":44.3,"y":134.5,"scale":0.869}'::jsonb,
    null,
    null,
    true,
    '{"primary":"#f49f05","secondary":"#36688d","accent":"#f3cd05","bg":"#0d1723","surface":"#122030","success":"#54d67d","warning":"#f3cd05","danger":"#ff7a63"}'::jsonb,
    '{}'::jsonb
  )
  on conflict (empresa_id, nombre) do update
    set etapa = excluded.etapa,
        descripcion_corta = excluded.descripcion_corta,
        ubicacion_texto = excluded.ubicacion_texto,
        distrito = excluded.distrito,
        provincia = excluded.provincia,
        departamento = excluded.departamento,
        pais = excluded.pais,
        logo_proyecto_url = excluded.logo_proyecto_url,
        overlay_config = excluded.overlay_config,
        estado = true,
        theme_seed = excluded.theme_seed,
        theme_overrides = excluded.theme_overrides,
        updated_at = now()
  returning id into v_proyecto_id;

  update dev.lotes
     set proyecto_id = v_proyecto_id
   where proyecto_id is null
      or proyecto_id <> v_proyecto_id;

  update dev.ventas
     set proyecto_id = v_proyecto_id
   where proyecto_id is null
      or proyecto_id <> v_proyecto_id;

  insert into dev.proyecto_usuarios (proyecto_id, usuario_id, acceso_activo)
  select v_proyecto_id, u.id, true
    from dev.usuarios u
  on conflict (proyecto_id, usuario_id) do update
    set acceso_activo = true,
        updated_at = now();

  call dev.proc_sync_equipos_por_etiqueta(v_proyecto_id);
end;
$$;

call dev.proc_seed_contexto_inicial();

alter table dev.empresa
  alter column updated_at set default now();
alter table dev.proyectos
  alter column updated_at set default now();
alter table dev.proyecto_usuarios
  alter column updated_at set default now();
alter table dev.equipos
  alter column updated_at set default now();
alter table dev.equipo_usuarios
  alter column updated_at set default now();
alter table dev.usuarios
  alter column rol_global set default 'ASESOR'::dev.rol_global_enum;

alter table dev.usuarios
  alter column rol_global set not null;
alter table dev.lotes
  alter column proyecto_id set not null;
alter table dev.ventas
  alter column proyecto_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'proyectos_empresa_id_fkey'
  ) then
    alter table dev.proyectos
      add constraint proyectos_empresa_id_fkey foreign key (empresa_id) references dev.empresa(id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'proyecto_usuarios_proyecto_id_fkey'
  ) then
    alter table dev.proyecto_usuarios
      add constraint proyecto_usuarios_proyecto_id_fkey foreign key (proyecto_id) references dev.proyectos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'proyecto_usuarios_usuario_id_fkey'
  ) then
    alter table dev.proyecto_usuarios
      add constraint proyecto_usuarios_usuario_id_fkey foreign key (usuario_id) references dev.usuarios(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'equipos_proyecto_id_fkey'
  ) then
    alter table dev.equipos
      add constraint equipos_proyecto_id_fkey foreign key (proyecto_id) references dev.proyectos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'equipos_admin_id_fkey'
  ) then
    alter table dev.equipos
      add constraint equipos_admin_id_fkey foreign key (admin_id) references dev.usuarios(id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'equipo_usuarios_equipo_id_fkey'
  ) then
    alter table dev.equipo_usuarios
      add constraint equipo_usuarios_equipo_id_fkey foreign key (equipo_id) references dev.equipos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'equipo_usuarios_usuario_id_fkey'
  ) then
    alter table dev.equipo_usuarios
      add constraint equipo_usuarios_usuario_id_fkey foreign key (usuario_id) references dev.usuarios(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'lotes_proyecto_id_fkey'
  ) then
    alter table dev.lotes
      add constraint lotes_proyecto_id_fkey foreign key (proyecto_id) references dev.proyectos(id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'ventas_proyecto_id_fkey'
  ) then
    alter table dev.ventas
      add constraint ventas_proyecto_id_fkey foreign key (proyecto_id) references dev.proyectos(id);
  end if;
end
$$;

alter table dev.lotes
  drop constraint if exists lotes_codigo_key;
alter table dev.lotes
  drop constraint if exists lotes_manzana_lote_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'lotes_proyecto_codigo_key'
  ) then
    alter table dev.lotes
      add constraint lotes_proyecto_codigo_key unique (proyecto_id, codigo);
  end if;

  if not exists (
    select 1 from pg_constraint
     where connamespace = 'dev'::regnamespace
       and conname = 'lotes_proyecto_manzana_lote_key'
  ) then
    alter table dev.lotes
      add constraint lotes_proyecto_manzana_lote_key unique (proyecto_id, manzana, lote);
  end if;
end
$$;

create or replace view dev.v_contexto_proyectos as
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
  p.logo_proyecto_url,
  p.overlay_config,
  p.theme_seed,
  p.theme_overrides,
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
join dev.empresa e on e.id = p.empresa_id;

create or replace view dev.v_usuarios_app as
select
  u.id,
  u.username,
  u.nombres,
  u.apellidos,
  u.telefono,
  u.estado,
  u.rol_global,
  u.created_at,
  u.updated_at
from dev.usuarios u
where u.rol_global <> 'SUPERADMIN'::dev.rol_global_enum;

create or replace function dev.fn_proyectos_visibles_app(p_actor_usuario_id uuid)
returns table (
  proyecto_id uuid,
  nombre text,
  etapa text,
  empresa_nombre_comercial text,
  proyecto_activo boolean
)
language sql
stable
as $$
  with actor as (
    select id, rol_global
      from dev.usuarios
     where id = p_actor_usuario_id
  )
  select distinct
    p.id as proyecto_id,
    p.nombre,
    p.etapa,
    e.nombre_comercial as empresa_nombre_comercial,
    p.estado as proyecto_activo
    from dev.proyectos p
    join dev.empresa e on e.id = p.empresa_id
    left join dev.proyecto_usuarios pu on pu.proyecto_id = p.id and pu.acceso_activo = true
    cross join actor a
   where (
      a.rol_global = 'SUPERADMIN'::dev.rol_global_enum
      or pu.usuario_id = a.id
   );
$$;

create or replace function dev.fn_usuarios_visibles_app(
  p_actor_usuario_id uuid,
  p_proyecto_id uuid default null
)
returns table (
  usuario_id uuid,
  username text,
  nombres text,
  apellidos text,
  telefono text,
  rol_global text,
  estado text,
  proyecto_id uuid
)
language sql
stable
as $$
  with actor as (
    select id, rol_global
      from dev.usuarios
     where id = p_actor_usuario_id
  )
  select distinct
    u.id as usuario_id,
    u.username,
    u.nombres,
    u.apellidos,
    u.telefono,
    u.rol_global::text as rol_global,
    u.estado::text as estado,
    pu.proyecto_id
    from dev.usuarios u
    left join dev.proyecto_usuarios pu on pu.usuario_id = u.id and pu.acceso_activo = true
    cross join actor a
   where (
      a.rol_global = 'SUPERADMIN'::dev.rol_global_enum
      or (
        a.rol_global = 'ADMIN'::dev.rol_global_enum
        and u.rol_global <> 'SUPERADMIN'::dev.rol_global_enum
      )
      or (
        a.rol_global = 'ASESOR'::dev.rol_global_enum
        and u.id = a.id
      )
   )
   and (p_proyecto_id is null or pu.proyecto_id = p_proyecto_id);
$$;

drop trigger if exists trg_empresa_updated_at on dev.empresa;
create trigger trg_empresa_updated_at
before update on dev.empresa
for each row execute function dev.set_updated_at();

drop trigger if exists trg_proyectos_updated_at on dev.proyectos;
create trigger trg_proyectos_updated_at
before update on dev.proyectos
for each row execute function dev.set_updated_at();

drop trigger if exists trg_proyecto_usuarios_updated_at on dev.proyecto_usuarios;
create trigger trg_proyecto_usuarios_updated_at
before update on dev.proyecto_usuarios
for each row execute function dev.set_updated_at();

drop trigger if exists trg_equipos_updated_at on dev.equipos;
create trigger trg_equipos_updated_at
before update on dev.equipos
for each row execute function dev.set_updated_at();

drop trigger if exists trg_equipo_usuarios_updated_at on dev.equipo_usuarios;
create trigger trg_equipo_usuarios_updated_at
before update on dev.equipo_usuarios
for each row execute function dev.set_updated_at();

drop trigger if exists trg_venta_lotes_project_match on dev.venta_lotes;
create trigger trg_venta_lotes_project_match
before insert or update of venta_id, lote_id on dev.venta_lotes
for each row execute function dev.check_venta_lote_project_match();

commit;
