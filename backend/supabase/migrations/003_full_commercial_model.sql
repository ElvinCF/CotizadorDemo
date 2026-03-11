-- Full commercial model for dev.
-- Destructive by design: rebuilds schema from scratch.

create extension if not exists pgcrypto;

drop schema if exists dev cascade;
create schema dev;

create type dev.rol_usuario_enum as enum (
  'ADMIN',
  'ASESOR',
  'CLIENTE',
  'SUPERVISOR'
);

create type dev.estado_general_enum as enum (
  'ACTIVO',
  'INACTIVO'
);

create type dev.tipo_documento_enum as enum (
  'DNI',
  'CE',
  'PASAPORTE',
  'RUC',
  'OTRO'
);

create type dev.estado_lote_enum as enum (
  'LIBRE',
  'SEPARADO',
  'VENDIDO',
  'BLOQUEADO',
  'INACTIVO'
);

create type dev.etapa_venta_enum as enum (
  'SEPARADO',
  'CONTRATO',
  'PAGANDO',
  'COMPLETADO',
  'ANULADO'
);

create type dev.estado_registro_enum as enum (
  'ACTIVO',
  'ANULADO',
  'ELIMINADO_LOGICO'
);

create type dev.tipo_pago_enum as enum (
  'SEPARACION',
  'INICIAL',
  'CUOTA',
  'ABONO_EXTRAORDINARIO',
  'AJUSTE',
  'DEVOLUCION'
);

create type dev.forma_pago_enum as enum (
  'EFECTIVO',
  'TRANSFERENCIA',
  'YAPE',
  'PLIN',
  'DEPOSITO',
  'TARJETA',
  'OTRO'
);

create type dev.rol_en_venta_enum as enum (
  'TITULAR',
  'CONYUGE',
  'CONVIVIENTE',
  'COTITULAR',
  'GARANTE',
  'FAMILIAR',
  'OTRO'
);

create type dev.accion_admin_enum as enum (
  'AGREGAR_VINCULACION_VENTA_PERSONA',
  'QUITAR_VINCULACION_VENTA_PERSONA',
  'LIBERAR_LOTE',
  'ANULAR_VENTA',
  'EDITAR_PAGO',
  'REASIGNAR_VENTA'
);

create table dev.personas (
  id uuid primary key default gen_random_uuid(),
  tipo_documento dev.tipo_documento_enum not null default 'DNI',
  numero_documento text not null,
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date,
  celular text,
  correo text,
  ocupacion text,
  direccion text,
  departamento text,
  provincia text,
  distrito text,
  referencia text,
  estado dev.estado_general_enum not null default 'ACTIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personas_documento_unique unique (tipo_documento, numero_documento)
);

create table dev.usuarios (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references dev.personas(id),
  username text not null,
  pin_hash text not null,
  rol dev.rol_usuario_enum not null,
  estado dev.estado_general_enum not null default 'ACTIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_username_unique unique (username),
  constraint usuarios_persona_unique unique (persona_id)
);

create table dev.empresas (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  nombre_comercial text,
  ruc text not null unique,
  telefono text,
  correo text,
  direccion text,
  estado dev.estado_general_enum not null default 'ACTIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dev.proyectos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references dev.empresas(id),
  nombre text not null,
  codigo text not null,
  descripcion text,
  departamento text,
  provincia text,
  distrito text,
  sector text,
  direccion_referencia text,
  estado dev.estado_general_enum not null default 'ACTIVO',
  fecha_inicio_comercial date,
  fecha_fin_comercial date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proyectos_empresa_codigo_unique unique (empresa_id, codigo)
);

create table dev.lotes (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references dev.proyectos(id),
  codigo text not null,
  manzana text,
  numero integer,
  area_m2 numeric(10,2),
  precio_lista numeric(12,2) not null default 0,
  precio_minimo numeric(12,2),
  precio_referencial numeric(12,2),
  estado_comercial dev.estado_lote_enum not null default 'LIBRE',
  moneda text not null default 'PEN',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lotes_proyecto_codigo_unique unique (proyecto_id, codigo),
  constraint lotes_proyecto_manzana_numero_unique unique (proyecto_id, manzana, numero)
);

create table dev.ventas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references dev.proyectos(id),
  lote_id uuid not null references dev.lotes(id),
  cliente_titular_persona_id uuid not null references dev.personas(id),
  asesor_usuario_id uuid not null references dev.usuarios(id),
  codigo_venta text not null unique,
  etapa_venta dev.etapa_venta_enum not null default 'SEPARADO',
  estado_registro dev.estado_registro_enum not null default 'ACTIVO',
  fecha_venta date not null default current_date,
  fecha_separacion date,
  fecha_contrato date,
  precio_lote numeric(12,2) not null,
  monto_separacion_pactado numeric(12,2) not null default 0,
  monto_inicial_pactado numeric(12,2) not null default 0,
  monto_financiado_pactado numeric(12,2) not null default 0,
  numero_cuotas_pactadas integer not null default 0,
  monto_cuota_referencial numeric(12,2) not null default 0,
  plazo_meses integer not null default 0,
  pagado_total numeric(12,2) not null default 0,
  saldo_pendiente numeric(12,2) not null default 0,
  moneda text not null default 'PEN',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ventas_precio_lote_check check (precio_lote >= 0),
  constraint ventas_totales_check check (pagado_total >= 0 and saldo_pendiente >= 0)
);

create table dev.ventas_clientes (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references dev.ventas(id) on delete cascade,
  persona_id uuid not null references dev.personas(id),
  rol_en_venta dev.rol_en_venta_enum not null,
  es_titular boolean not null default false,
  observacion text,
  agregado_por_usuario_id uuid not null references dev.usuarios(id),
  autorizado_por_usuario_id uuid references dev.usuarios(id),
  fecha_autorizacion timestamptz,
  motivo_autorizacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ventas_clientes_unique unique (venta_id, persona_id, rol_en_venta)
);

create table dev.pagos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references dev.ventas(id) on delete cascade,
  tipo_pago dev.tipo_pago_enum not null,
  concepto text,
  fecha_pago date not null default current_date,
  monto numeric(12,2) not null,
  forma_pago dev.forma_pago_enum not null default 'TRANSFERENCIA',
  numero_operacion text,
  moneda text not null default 'PEN',
  observaciones text,
  registrado_por_usuario_id uuid not null references dev.usuarios(id),
  estado_registro dev.estado_registro_enum not null default 'ACTIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pagos_monto_check check (monto >= 0)
);

create table dev.autorizaciones_admin (
  id uuid primary key default gen_random_uuid(),
  usuario_admin_id uuid not null references dev.usuarios(id),
  usuario_solicitante_id uuid not null references dev.usuarios(id),
  accion dev.accion_admin_enum not null,
  tabla_objetivo text not null,
  registro_objetivo_id text,
  motivo text not null,
  fecha_autorizacion timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_personas_numero_documento on dev.personas(numero_documento);
create unique index usuarios_username_unique_idx on dev.usuarios(lower(username));
create index idx_usuarios_persona_id on dev.usuarios(persona_id);
create index idx_proyectos_empresa_id on dev.proyectos(empresa_id);
create index idx_lotes_proyecto_id on dev.lotes(proyecto_id);
create index idx_ventas_lote_id on dev.ventas(lote_id);
create index idx_ventas_cliente_titular_persona_id on dev.ventas(cliente_titular_persona_id);
create index idx_ventas_asesor_usuario_id on dev.ventas(asesor_usuario_id);
create index idx_ventas_etapa_venta on dev.ventas(etapa_venta);
create index idx_ventas_clientes_venta_id on dev.ventas_clientes(venta_id);
create index idx_ventas_clientes_persona_id on dev.ventas_clientes(persona_id);
create index idx_pagos_venta_id on dev.pagos(venta_id);
create index idx_pagos_fecha_pago on dev.pagos(fecha_pago);
create index idx_pagos_tipo_pago on dev.pagos(tipo_pago);

create unique index ventas_lote_activa_unique_idx
on dev.ventas(lote_id)
where estado_registro = 'ACTIVO'::dev.estado_registro_enum
  and etapa_venta in (
    'SEPARADO'::dev.etapa_venta_enum,
    'CONTRATO'::dev.etapa_venta_enum,
    'PAGANDO'::dev.etapa_venta_enum
  );

create or replace function dev.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function dev.normalize_venta_totals()
returns trigger
language plpgsql
as $$
begin
  new.pagado_total = coalesce(new.pagado_total, 0);
  new.saldo_pendiente = greatest(coalesce(new.precio_lote, 0) - new.pagado_total, 0);

  if new.etapa_venta = 'SEPARADO' and new.fecha_separacion is null then
    new.fecha_separacion = coalesce(new.fecha_venta, current_date);
  end if;

  if new.etapa_venta in ('CONTRATO', 'PAGANDO', 'COMPLETADO') and new.fecha_contrato is null then
    new.fecha_contrato = coalesce(new.fecha_venta, current_date);
  end if;

  return new;
end;
$$;

create or replace function dev.recalcular_totales_venta(p_venta_id uuid)
returns void
language plpgsql
as $$
declare
  v_total_pagado numeric(12,2);
begin
  if p_venta_id is null then
    return;
  end if;

  select coalesce(sum(p.monto), 0)
    into v_total_pagado
  from dev.pagos p
  where p.venta_id = p_venta_id
    and p.estado_registro = 'ACTIVO';

  update dev.ventas v
  set pagado_total = coalesce(v_total_pagado, 0),
      saldo_pendiente = greatest(v.precio_lote - coalesce(v_total_pagado, 0), 0),
      updated_at = now()
  where v.id = p_venta_id;
end;
$$;

create or replace function dev.trg_pagos_recalcular_venta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform dev.recalcular_totales_venta(old.venta_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    perform dev.recalcular_totales_venta(old.venta_id);
    if new.venta_id is distinct from old.venta_id then
      perform dev.recalcular_totales_venta(new.venta_id);
    end if;
    return new;
  end if;

  perform dev.recalcular_totales_venta(new.venta_id);
  return new;
end;
$$;

create or replace function dev.sincronizar_estado_lote(p_lote_id uuid)
returns void
language plpgsql
as $$
declare
  v_tiene_venta_activa boolean := false;
  v_tiene_venta_completada boolean := false;
begin
  if p_lote_id is null then
    return;
  end if;

  select exists (
    select 1
    from dev.ventas v
    where v.lote_id = p_lote_id
      and v.estado_registro = 'ACTIVO'
      and v.etapa_venta in ('SEPARADO', 'CONTRATO', 'PAGANDO')
  ) into v_tiene_venta_activa;

  if v_tiene_venta_activa then
    update dev.lotes
    set estado_comercial = 'SEPARADO',
        updated_at = now()
    where id = p_lote_id;
    return;
  end if;

  select exists (
    select 1
    from dev.ventas v
    where v.lote_id = p_lote_id
      and v.estado_registro = 'ACTIVO'
      and v.etapa_venta = 'COMPLETADO'
  ) into v_tiene_venta_completada;

  if v_tiene_venta_completada then
    update dev.lotes
    set estado_comercial = 'VENDIDO',
        updated_at = now()
    where id = p_lote_id;
  else
    update dev.lotes
    set estado_comercial = 'LIBRE',
        updated_at = now()
    where id = p_lote_id;
  end if;
end;
$$;

create or replace function dev.trg_ventas_sync_lote()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform dev.sincronizar_estado_lote(old.lote_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and new.lote_id is distinct from old.lote_id then
    perform dev.sincronizar_estado_lote(old.lote_id);
  end if;

  perform dev.sincronizar_estado_lote(new.lote_id);
  return new;
end;
$$;

create or replace function dev.sp_actualizar_precios_disponibles(
  p_tipo_ajuste text,
  p_valor_ajuste numeric
)
returns integer
language plpgsql
as $$
declare
  v_tipo text := upper(trim(coalesce(p_tipo_ajuste, '')));
  v_updated integer := 0;
begin
  if v_tipo not in ('MONTO', 'PORCENTAJE') then
    raise exception 'p_tipo_ajuste invalido. Use MONTO o PORCENTAJE.';
  end if;

  if p_valor_ajuste is null then
    raise exception 'p_valor_ajuste no puede ser null.';
  end if;

  if v_tipo = 'MONTO' then
    update dev.lotes
    set precio_lista = greatest(0, coalesce(precio_lista, 0) + p_valor_ajuste),
        precio_referencial = greatest(0, coalesce(precio_referencial, precio_lista, 0) + p_valor_ajuste),
        updated_at = now()
    where estado_comercial = 'LIBRE';
  else
    update dev.lotes
    set precio_lista = greatest(0, coalesce(precio_lista, 0) * (1 + (p_valor_ajuste / 100.0))),
        precio_referencial = greatest(0, coalesce(precio_referencial, precio_lista, 0) * (1 + (p_valor_ajuste / 100.0))),
        updated_at = now()
    where estado_comercial = 'LIBRE';
  end if;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

drop trigger if exists trg_personas_updated_at on dev.personas;
create trigger trg_personas_updated_at
before update on dev.personas
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_usuarios_updated_at on dev.usuarios;
create trigger trg_usuarios_updated_at
before update on dev.usuarios
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_empresas_updated_at on dev.empresas;
create trigger trg_empresas_updated_at
before update on dev.empresas
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_proyectos_updated_at on dev.proyectos;
create trigger trg_proyectos_updated_at
before update on dev.proyectos
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_lotes_updated_at on dev.lotes;
create trigger trg_lotes_updated_at
before update on dev.lotes
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_ventas_updated_at on dev.ventas;
create trigger trg_ventas_updated_at
before update on dev.ventas
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_ventas_normalize_totals on dev.ventas;
create trigger trg_ventas_normalize_totals
before insert or update on dev.ventas
for each row execute procedure dev.normalize_venta_totals();

drop trigger if exists trg_ventas_sync_lote on dev.ventas;
create trigger trg_ventas_sync_lote
after insert or update or delete on dev.ventas
for each row execute procedure dev.trg_ventas_sync_lote();

drop trigger if exists trg_ventas_clientes_updated_at on dev.ventas_clientes;
create trigger trg_ventas_clientes_updated_at
before update on dev.ventas_clientes
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_pagos_updated_at on dev.pagos;
create trigger trg_pagos_updated_at
before update on dev.pagos
for each row execute procedure dev.set_updated_at();

drop trigger if exists trg_pagos_recalcular_venta on dev.pagos;
create trigger trg_pagos_recalcular_venta
after insert or update or delete on dev.pagos
for each row execute procedure dev.trg_pagos_recalcular_venta();

drop trigger if exists trg_autorizaciones_admin_updated_at on dev.autorizaciones_admin;
create trigger trg_autorizaciones_admin_updated_at
before update on dev.autorizaciones_admin
for each row execute procedure dev.set_updated_at();