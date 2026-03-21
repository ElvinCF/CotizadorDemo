create schema if not exists devsimple;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'devsimple'
      and t.typname = 'venta_estado_enum'
  ) then
    create type devsimple.venta_estado_enum as enum (
      'SEPARADA',
      'INICIAL_PAGADA',
      'CONTRATO_FIRMADO',
      'PAGANDO',
      'COMPLETADA',
      'CAIDA'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'devsimple'
      and t.typname = 'tipo_financiamiento_enum'
  ) then
    create type devsimple.tipo_financiamiento_enum as enum (
      'REDUCIR_CUOTA',
      'REDUCIR_MESES'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'devsimple'
      and t.typname = 'pago_tipo_enum'
  ) then
    create type devsimple.pago_tipo_enum as enum (
      'SEPARACION',
      'INICIAL',
      'CUOTA',
      'OTRO'
    );
  end if;
end
$$;

create table if not exists devsimple.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  dni text not null unique,
  celular text,
  direccion text,
  ocupacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_nombre_completo_check
    check (char_length(trim(both from nombre_completo)) >= 2)
);

create table if not exists devsimple.ventas (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references devsimple.lotes(id),
  cliente_id uuid not null references devsimple.clientes(id),
  cliente2_id uuid references devsimple.clientes(id),
  asesor_id uuid not null references devsimple.usuarios(id),
  fecha_venta timestamptz not null default now(),
  fecha_pago_pactada date,
  precio_venta numeric not null,
  estado_venta devsimple.venta_estado_enum not null default 'SEPARADA',
  tipo_financiamiento devsimple.tipo_financiamiento_enum not null,
  monto_inicial_total numeric not null default 0,
  monto_financiado numeric not null,
  cantidad_cuotas integer not null,
  monto_cuota numeric not null,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ventas_precio_venta_check check (precio_venta >= 0),
  constraint ventas_monto_inicial_total_check check (monto_inicial_total >= 0),
  constraint ventas_monto_financiado_check check (monto_financiado >= 0),
  constraint ventas_cantidad_cuotas_check check (cantidad_cuotas between 1 and 36),
  constraint ventas_monto_cuota_check check (monto_cuota > 0),
  constraint ventas_cliente2_distinto_check check (cliente2_id is null or cliente2_id <> cliente_id)
);

create table if not exists devsimple.pagos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references devsimple.ventas(id) on delete cascade,
  fecha_pago timestamptz not null default now(),
  tipo_pago devsimple.pago_tipo_enum not null,
  monto numeric not null,
  nro_cuota integer,
  observacion text,
  created_at timestamptz not null default now(),
  constraint pagos_monto_check check (monto > 0),
  constraint pagos_nro_cuota_check check (nro_cuota is null or nro_cuota >= 1)
);

create table if not exists devsimple.venta_estado_historial (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references devsimple.ventas(id) on delete cascade,
  estado_anterior devsimple.venta_estado_enum,
  estado_nuevo devsimple.venta_estado_enum not null,
  usuario_id uuid not null references devsimple.usuarios(id),
  fecha_cambio timestamptz not null default now()
);

create index if not exists clientes_dni_idx
  on devsimple.clientes (dni);

create index if not exists ventas_lote_id_idx
  on devsimple.ventas (lote_id);

create index if not exists ventas_cliente_id_idx
  on devsimple.ventas (cliente_id);

create index if not exists ventas_cliente2_id_idx
  on devsimple.ventas (cliente2_id);

create index if not exists ventas_asesor_id_idx
  on devsimple.ventas (asesor_id);

create index if not exists ventas_estado_venta_idx
  on devsimple.ventas (estado_venta);

create index if not exists ventas_fecha_venta_idx
  on devsimple.ventas (fecha_venta desc);

create unique index if not exists ventas_lote_activa_unique_idx
  on devsimple.ventas (lote_id)
  where estado_venta <> 'CAIDA'::devsimple.venta_estado_enum;

create index if not exists pagos_venta_id_idx
  on devsimple.pagos (venta_id);

create index if not exists pagos_fecha_pago_idx
  on devsimple.pagos (fecha_pago desc);

create index if not exists pagos_tipo_pago_idx
  on devsimple.pagos (tipo_pago);

create index if not exists pagos_venta_id_nro_cuota_idx
  on devsimple.pagos (venta_id, nro_cuota)
  where nro_cuota is not null;

create index if not exists venta_estado_historial_venta_id_idx
  on devsimple.venta_estado_historial (venta_id);

create index if not exists venta_estado_historial_usuario_id_idx
  on devsimple.venta_estado_historial (usuario_id);

create index if not exists venta_estado_historial_fecha_cambio_idx
  on devsimple.venta_estado_historial (fecha_cambio desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_clientes_updated_at'
  ) then
    create trigger trg_clientes_updated_at
      before update on devsimple.clientes
      for each row execute function devsimple.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_ventas_updated_at'
  ) then
    create trigger trg_ventas_updated_at
      before update on devsimple.ventas
      for each row execute function devsimple.set_updated_at();
  end if;
end
$$;
