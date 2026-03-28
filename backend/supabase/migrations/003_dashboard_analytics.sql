do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = '{{SCHEMA}}'
      and table_name = 'ventas'
  ) then
    raise exception 'La migracion dashboard_analytics requiere el esquema comercial en %.ventas', '{{SCHEMA}}';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = '{{SCHEMA}}'
      and table_name = 'ventas'
      and column_name = 'asesor_id'
  ) then
    raise exception 'La migracion dashboard_analytics requiere el modelo comercial actual en %.ventas', '{{SCHEMA}}';
  end if;
end
$$;

drop view if exists {{SCHEMA}}.vw_dashboard_pagos_base cascade;
drop view if exists {{SCHEMA}}.vw_dashboard_ventas_base cascade;
drop view if exists {{SCHEMA}}.vw_dashboard_lotes_base cascade;

drop function if exists {{SCHEMA}}.dashboard_bucket_date(date, text);
drop function if exists {{SCHEMA}}.dashboard_filtered_lotes(text);
drop function if exists {{SCHEMA}}.dashboard_filtered_ventas(date, date, uuid, text, text, boolean);
drop function if exists {{SCHEMA}}.dashboard_filtered_pagos(date, date, uuid, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_inventario_estado(text);
drop function if exists {{SCHEMA}}.dashboard_admin_resumen_asesores(date, date, uuid, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_ranking_asesores(date, date, uuid, text, text, text, integer);
drop function if exists {{SCHEMA}}.dashboard_admin_kpis(date, date, uuid, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_series_ventas(date, date, uuid, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_series_cobros(date, date, uuid, text, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_ventas_activas(date, date, uuid, text, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_admin_operaciones_caidas(date, date, uuid, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_asesor_kpis(uuid, date, date, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_series_ventas(uuid, date, date, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_series_cobros(uuid, date, date, text, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_operaciones_por_estado(uuid, date, date, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_resumen_operaciones(uuid, date, date, text, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_asesor_clientes_activos(uuid, date, date, text, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_asesor_pagos_registrados(uuid, date, date, text, text, text, integer, integer);

create or replace view {{SCHEMA}}.vw_dashboard_lotes_base as
select
  l.id as lote_id,
  l.codigo,
  l.manzana,
  l.lote,
  l.area_m2,
  l.precio_referencial,
  l.estado_comercial,
  l.created_at,
  l.updated_at
from {{SCHEMA}}.lotes l;

create or replace view {{SCHEMA}}.vw_dashboard_ventas_base as
select
  v.id as venta_id,
  v.lote_id,
  l.codigo as lote_codigo,
  l.manzana as lote_manzana,
  l.lote as lote_numero,
  l.area_m2,
  l.estado_comercial as lote_estado_comercial,
  v.cliente_id,
  c.nombre_completo as cliente_nombre,
  c.dni as cliente_dni,
  c.celular as cliente_celular,
  v.cliente2_id,
  c2.nombre_completo as cliente2_nombre,
  c2.dni as cliente2_dni,
  v.asesor_id,
  u.username as asesor_username,
  trim(concat_ws(' ', u.nombres, u.apellidos)) as asesor_nombre,
  u.telefono as asesor_telefono,
  v.fecha_venta::date as fecha_venta,
  v.fecha_pago_pactada,
  v.precio_venta,
  v.estado_venta,
  v.tipo_financiamiento,
  v.monto_inicial_total,
  v.monto_financiado,
  v.cantidad_cuotas,
  v.monto_cuota,
  v.observacion,
  (v.estado_venta <> 'CAIDA') as venta_activa,
  v.created_at,
  v.updated_at
from {{SCHEMA}}.ventas v
join {{SCHEMA}}.lotes l on l.id = v.lote_id
join {{SCHEMA}}.clientes c on c.id = v.cliente_id
join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
left join {{SCHEMA}}.clientes c2 on c2.id = v.cliente2_id;

create or replace view {{SCHEMA}}.vw_dashboard_pagos_base as
select
  p.id as pago_id,
  p.venta_id,
  v.lote_id,
  v.lote_codigo,
  v.lote_estado_comercial,
  v.cliente_id,
  v.cliente_nombre,
  v.cliente_dni,
  v.asesor_id,
  v.asesor_username,
  v.asesor_nombre,
  v.estado_venta,
  v.venta_activa,
  p.fecha_pago::date as fecha_pago,
  p.tipo_pago,
  p.monto,
  p.nro_cuota,
  p.observacion,
  p.created_at
from {{SCHEMA}}.pagos p
join {{SCHEMA}}.vw_dashboard_ventas_base v on v.venta_id = p.venta_id;

create or replace function {{SCHEMA}}.dashboard_bucket_date(p_value date, p_group_by text default 'month')
returns date
language sql
immutable
as $$
  select case
    when p_value is null then null
    else date_trunc(
      case lower(coalesce(nullif(trim(p_group_by), ''), 'month'))
        when 'day' then 'day'
        when 'week' then 'week'
        else 'month'
      end,
      p_value::timestamp
    )::date
  end
$$;

create or replace function {{SCHEMA}}.dashboard_filtered_lotes(
  p_estado_lote text default null
)
returns setof {{SCHEMA}}.vw_dashboard_lotes_base
language sql
stable
as $$
  select *
  from {{SCHEMA}}.vw_dashboard_lotes_base l
  where (
      nullif(trim(coalesce(p_estado_lote, '')), '') is null
      or upper(l.estado_comercial::text) = upper(trim(p_estado_lote))
    )
  order by l.manzana asc nulls last, l.lote asc nulls last, l.codigo asc
$$;

create or replace function {{SCHEMA}}.dashboard_filtered_ventas(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_incluir_caidas boolean default true
)
returns setof {{SCHEMA}}.vw_dashboard_ventas_base
language sql
stable
as $$
  select *
  from {{SCHEMA}}.vw_dashboard_ventas_base v
  where (p_from is null or v.fecha_venta >= p_from)
    and (p_to is null or v.fecha_venta < p_to + 1)
    and (p_asesor_id is null or v.asesor_id = p_asesor_id)
    and (
      nullif(trim(coalesce(p_estado_lote, '')), '') is null
      or upper(v.lote_estado_comercial::text) = upper(trim(p_estado_lote))
    )
    and (
      nullif(trim(coalesce(p_estado_venta, '')), '') is null
      or upper(v.estado_venta::text) = upper(trim(p_estado_venta))
    )
    and (
      p_incluir_caidas
      or v.estado_venta <> 'CAIDA'
    )
  order by v.fecha_venta desc, v.created_at desc
$$;

create or replace function {{SCHEMA}}.dashboard_filtered_pagos(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_tipo_pago text default null
)
returns setof {{SCHEMA}}.vw_dashboard_pagos_base
language sql
stable
as $$
  select *
  from {{SCHEMA}}.vw_dashboard_pagos_base p
  where (p_from is null or p.fecha_pago >= p_from)
    and (p_to is null or p.fecha_pago < p_to + 1)
    and (p_asesor_id is null or p.asesor_id = p_asesor_id)
    and (
      nullif(trim(coalesce(p_estado_lote, '')), '') is null
      or upper(p.lote_estado_comercial::text) = upper(trim(p_estado_lote))
    )
    and (
      nullif(trim(coalesce(p_estado_venta, '')), '') is null
      or upper(p.estado_venta::text) = upper(trim(p_estado_venta))
    )
    and (
      nullif(trim(coalesce(p_tipo_pago, '')), '') is null
      or upper(p.tipo_pago::text) = upper(trim(p_tipo_pago))
    )
  order by p.fecha_pago desc, p.created_at desc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_inventario_estado(
  p_estado_lote text default null
)
returns table (
  estado_comercial text,
  cantidad bigint,
  porcentaje numeric(8,2)
)
language sql
stable
as $$
  with filtered as (
    select *
    from {{SCHEMA}}.dashboard_filtered_lotes(p_estado_lote)
  ),
  totals as (
    select count(*)::numeric as total from filtered
  )
  select
    f.estado_comercial::text as estado_comercial,
    count(*)::bigint as cantidad,
    case
      when t.total = 0 then 0::numeric(8,2)
      else round((count(*)::numeric / t.total) * 100, 2)
    end as porcentaje
  from filtered f
  cross join totals t
  group by f.estado_comercial, t.total
  order by
    case f.estado_comercial
      when 'DISPONIBLE' then 1
      when 'SEPARADO' then 2
      when 'VENDIDO' then 3
      else 4
    end,
    f.estado_comercial::text
$$;

create or replace function {{SCHEMA}}.dashboard_admin_resumen_asesores(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null
)
returns table (
  asesor_id uuid,
  asesor_username text,
  asesor_nombre text,
  cantidad_ventas bigint,
  monto_vendido numeric(14,2),
  monto_cobrado numeric(14,2),
  ticket_promedio_venta numeric(14,2),
  cartera_activa bigint,
  saldo_pendiente numeric(14,2),
  mayor_venta numeric(14,2)
)
language sql
stable
as $$
  with advisor_pool as (
    select
      u.id as asesor_id,
      u.username as asesor_username,
      trim(concat_ws(' ', u.nombres, u.apellidos)) as asesor_nombre
    from {{SCHEMA}}.usuarios u
    where u.rol in ('ASESOR', 'ADMIN')
      and u.estado = 'ACTIVO'
      and (p_asesor_id is null or u.id = p_asesor_id)
  ),
  filtered_sales as (
    select *
    from {{SCHEMA}}.dashboard_filtered_ventas(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      true
    )
  ),
  active_sales as (
    select *
    from filtered_sales
    where venta_activa
  ),
  sales_summary as (
    select
      asesor_id,
      count(*)::bigint as cantidad_ventas,
      coalesce(sum(precio_venta), 0)::numeric(14,2) as monto_vendido,
      count(*)::bigint as cartera_activa,
      coalesce(sum(monto_financiado), 0)::numeric(14,2) as saldo_pendiente,
      coalesce(max(precio_venta), 0)::numeric(14,2) as mayor_venta
    from active_sales
    group by asesor_id
  ),
  payment_summary as (
    select
      asesor_id,
      coalesce(sum(monto), 0)::numeric(14,2) as monto_cobrado
    from {{SCHEMA}}.dashboard_filtered_pagos(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      null
    )
    where venta_activa
    group by asesor_id
  )
  select
    pool.asesor_id,
    pool.asesor_username,
    pool.asesor_nombre,
    coalesce(ss.cantidad_ventas, 0)::bigint as cantidad_ventas,
    coalesce(ss.monto_vendido, 0)::numeric(14,2) as monto_vendido,
    coalesce(ps.monto_cobrado, 0)::numeric(14,2) as monto_cobrado,
    case
      when coalesce(ss.cantidad_ventas, 0) = 0 then 0::numeric(14,2)
      else round(ss.monto_vendido / ss.cantidad_ventas, 2)
    end as ticket_promedio_venta,
    coalesce(ss.cartera_activa, 0)::bigint as cartera_activa,
    coalesce(ss.saldo_pendiente, 0)::numeric(14,2) as saldo_pendiente,
    coalesce(ss.mayor_venta, 0)::numeric(14,2) as mayor_venta
  from advisor_pool pool
  left join sales_summary ss on ss.asesor_id = pool.asesor_id
  left join payment_summary ps on ps.asesor_id = pool.asesor_id
  order by monto_vendido desc, monto_cobrado desc, pool.asesor_nombre asc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_ranking_asesores(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_metric text default 'monto_vendido',
  p_top_n integer default 10
)
returns table (
  asesor_id uuid,
  asesor_username text,
  asesor_nombre text,
  cantidad_ventas bigint,
  monto_vendido numeric(14,2),
  monto_cobrado numeric(14,2),
  ticket_promedio_venta numeric(14,2),
  cartera_activa bigint,
  saldo_pendiente numeric(14,2),
  mayor_venta numeric(14,2)
)
language sql
stable
as $$
  with summary as (
    select *
    from {{SCHEMA}}.dashboard_admin_resumen_asesores(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta
    )
  )
  select *
  from summary
  order by
    case
      when lower(coalesce(p_metric, 'monto_vendido')) = 'monto_cobrado' then monto_cobrado
      when lower(coalesce(p_metric, 'monto_vendido')) = 'ticket_promedio_venta' then ticket_promedio_venta
      when lower(coalesce(p_metric, 'monto_vendido')) = 'saldo_pendiente' then saldo_pendiente
      when lower(coalesce(p_metric, 'monto_vendido')) = 'cantidad_ventas' then cantidad_ventas::numeric
      when lower(coalesce(p_metric, 'monto_vendido')) = 'cartera_activa' then cartera_activa::numeric
      when lower(coalesce(p_metric, 'monto_vendido')) = 'mayor_venta' then mayor_venta
      else monto_vendido
    end desc,
    asesor_nombre asc
  limit greatest(coalesce(p_top_n, 10), 1)
$$;

create or replace function {{SCHEMA}}.dashboard_admin_kpis(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null
)
returns table (
  inventario_total bigint,
  lotes_disponibles bigint,
  lotes_separados bigint,
  lotes_vendidos bigint,
  ventas_activas bigint,
  monto_vendido numeric(14,2),
  monto_cobrado numeric(14,2),
  saldo_pendiente_global numeric(14,2),
  ticket_promedio_venta numeric(14,2),
  asesor_top_id uuid,
  asesor_top_username text,
  asesor_top_nombre text,
  asesor_top_monto_vendido numeric(14,2)
)
language sql
stable
as $$
  with lotes as (
    select *
    from {{SCHEMA}}.dashboard_filtered_lotes(p_estado_lote)
  ),
  ventas as (
    select *
    from {{SCHEMA}}.dashboard_filtered_ventas(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      true
    )
  ),
  ventas_activas as (
    select *
    from ventas
    where venta_activa
  ),
  pagos as (
    select *
    from {{SCHEMA}}.dashboard_filtered_pagos(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      null
    )
    where venta_activa
  ),
  top_asesor as (
    select *
    from {{SCHEMA}}.dashboard_admin_ranking_asesores(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      'monto_vendido',
      1
    )
  )
  select
    (select count(*)::bigint from lotes) as inventario_total,
    (select count(*)::bigint from lotes where estado_comercial = 'DISPONIBLE') as lotes_disponibles,
    (select count(*)::bigint from lotes where estado_comercial = 'SEPARADO') as lotes_separados,
    (select count(*)::bigint from lotes where estado_comercial = 'VENDIDO') as lotes_vendidos,
    (select count(*)::bigint from ventas_activas) as ventas_activas,
    coalesce((select sum(precio_venta) from ventas_activas), 0)::numeric(14,2) as monto_vendido,
    coalesce((select sum(monto) from pagos), 0)::numeric(14,2) as monto_cobrado,
    coalesce((select sum(monto_financiado) from ventas_activas), 0)::numeric(14,2) as saldo_pendiente_global,
    case
      when (select count(*) from ventas_activas) = 0 then 0::numeric(14,2)
      else round(
        coalesce((select sum(precio_venta) from ventas_activas), 0)
        / (select count(*) from ventas_activas),
        2
      )
    end as ticket_promedio_venta,
    (select asesor_id from top_asesor limit 1) as asesor_top_id,
    (select asesor_username from top_asesor limit 1) as asesor_top_username,
    (select asesor_nombre from top_asesor limit 1) as asesor_top_nombre,
    coalesce((select monto_vendido from top_asesor limit 1), 0)::numeric(14,2) as asesor_top_monto_vendido
$$;

create or replace function {{SCHEMA}}.dashboard_admin_series_ventas(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_group_by text default 'month'
)
returns table (
  bucket date,
  cantidad_ventas bigint,
  monto_vendido numeric(14,2),
  ticket_promedio_venta numeric(14,2)
)
language sql
stable
as $$
  select
    {{SCHEMA}}.dashboard_bucket_date(v.fecha_venta, p_group_by) as bucket,
    count(*)::bigint as cantidad_ventas,
    coalesce(sum(v.precio_venta), 0)::numeric(14,2) as monto_vendido,
    round(coalesce(avg(v.precio_venta), 0), 2)::numeric(14,2) as ticket_promedio_venta
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    false
  ) v
  where v.venta_activa
  group by 1
  order by 1 asc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_series_cobros(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_tipo_pago text default null,
  p_group_by text default 'month'
)
returns table (
  bucket date,
  cantidad_pagos bigint,
  monto_cobrado numeric(14,2)
)
language sql
stable
as $$
  select
    {{SCHEMA}}.dashboard_bucket_date(p.fecha_pago, p_group_by) as bucket,
    count(*)::bigint as cantidad_pagos,
    coalesce(sum(p.monto), 0)::numeric(14,2) as monto_cobrado
  from {{SCHEMA}}.dashboard_filtered_pagos(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    p_tipo_pago
  ) p
  where p.venta_activa
  group by 1
  order by 1 asc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_ventas_activas(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  venta_id uuid,
  fecha_venta date,
  lote_id uuid,
  lote_codigo text,
  cliente_id uuid,
  cliente_nombre text,
  cliente_dni text,
  asesor_id uuid,
  asesor_username text,
  asesor_nombre text,
  estado_venta text,
  precio_venta numeric(14,2),
  monto_inicial_total numeric(14,2),
  monto_financiado numeric(14,2),
  cantidad_cuotas integer,
  monto_cuota numeric(14,2)
)
language sql
stable
as $$
  select
    v.venta_id,
    v.fecha_venta,
    v.lote_id,
    v.lote_codigo,
    v.cliente_id,
    v.cliente_nombre,
    v.cliente_dni,
    v.asesor_id,
    v.asesor_username,
    v.asesor_nombre,
    v.estado_venta::text as estado_venta,
    v.precio_venta::numeric(14,2),
    v.monto_inicial_total::numeric(14,2),
    v.monto_financiado::numeric(14,2),
    v.cantidad_cuotas,
    v.monto_cuota::numeric(14,2)
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    false
  ) v
  where v.venta_activa
  order by v.fecha_venta desc, v.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_admin_operaciones_caidas(
  p_from date default null,
  p_to date default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  venta_id uuid,
  fecha_venta date,
  lote_id uuid,
  lote_codigo text,
  cliente_id uuid,
  cliente_nombre text,
  cliente_dni text,
  asesor_id uuid,
  asesor_username text,
  asesor_nombre text,
  estado_venta text,
  precio_venta numeric(14,2),
  observacion text
)
language sql
stable
as $$
  select
    v.venta_id,
    v.fecha_venta,
    v.lote_id,
    v.lote_codigo,
    v.cliente_id,
    v.cliente_nombre,
    v.cliente_dni,
    v.asesor_id,
    v.asesor_username,
    v.asesor_nombre,
    v.estado_venta::text as estado_venta,
    v.precio_venta::numeric(14,2),
    v.observacion
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    'CAIDA',
    true
  ) v
  where v.estado_venta = 'CAIDA'
  order by v.fecha_venta desc, v.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_kpis(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null
)
returns table (
  mis_ventas_activas bigint,
  mis_separaciones bigint,
  mi_monto_vendido numeric(14,2),
  mi_monto_cobrado numeric(14,2),
  saldo_pendiente_mi_cartera numeric(14,2),
  ticket_promedio_venta numeric(14,2),
  clientes_activos bigint,
  mayor_venta numeric(14,2)
)
language sql
stable
as $$
  with ventas as (
    select *
    from {{SCHEMA}}.dashboard_filtered_ventas(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      true
    )
  ),
  ventas_activas as (
    select *
    from ventas
    where venta_activa
  ),
  pagos as (
    select *
    from {{SCHEMA}}.dashboard_filtered_pagos(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      null
    )
    where venta_activa
  )
  select
    (select count(*)::bigint from ventas_activas) as mis_ventas_activas,
    (select count(*)::bigint from ventas_activas where estado_venta = 'SEPARADA') as mis_separaciones,
    coalesce((select sum(precio_venta) from ventas_activas), 0)::numeric(14,2) as mi_monto_vendido,
    coalesce((select sum(monto) from pagos), 0)::numeric(14,2) as mi_monto_cobrado,
    coalesce((select sum(monto_financiado) from ventas_activas), 0)::numeric(14,2) as saldo_pendiente_mi_cartera,
    case
      when (select count(*) from ventas_activas) = 0 then 0::numeric(14,2)
      else round(
        coalesce((select sum(precio_venta) from ventas_activas), 0)
        / (select count(*) from ventas_activas),
        2
      )
    end as ticket_promedio_venta,
    (select count(distinct cliente_id)::bigint from ventas_activas) as clientes_activos,
    coalesce((select max(precio_venta) from ventas_activas), 0)::numeric(14,2) as mayor_venta
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_series_ventas(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_group_by text default 'month'
)
returns table (
  bucket date,
  cantidad_ventas bigint,
  monto_vendido numeric(14,2),
  ticket_promedio_venta numeric(14,2)
)
language sql
stable
as $$
  select *
  from {{SCHEMA}}.dashboard_admin_series_ventas(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    p_group_by
  )
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_series_cobros(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_tipo_pago text default null,
  p_group_by text default 'month'
)
returns table (
  bucket date,
  cantidad_pagos bigint,
  monto_cobrado numeric(14,2)
)
language sql
stable
as $$
  select *
  from {{SCHEMA}}.dashboard_admin_series_cobros(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    p_tipo_pago,
    p_group_by
  )
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_operaciones_por_estado(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null
)
returns table (
  estado_venta text,
  cantidad bigint,
  monto_vendido numeric(14,2)
)
language sql
stable
as $$
  select
    v.estado_venta::text as estado_venta,
    count(*)::bigint as cantidad,
    coalesce(sum(v.precio_venta), 0)::numeric(14,2) as monto_vendido
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    true
  ) v
  group by v.estado_venta
  order by
    case v.estado_venta
      when 'SEPARADA' then 1
      when 'INICIAL_PAGADA' then 2
      when 'CONTRATO_FIRMADO' then 3
      when 'PAGANDO' then 4
      when 'COMPLETADA' then 5
      when 'CAIDA' then 6
      else 7
    end,
    v.estado_venta::text
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_resumen_operaciones(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  venta_id uuid,
  fecha_venta date,
  lote_id uuid,
  lote_codigo text,
  cliente_id uuid,
  cliente_nombre text,
  cliente_dni text,
  estado_venta text,
  precio_venta numeric(14,2),
  monto_inicial_total numeric(14,2),
  monto_financiado numeric(14,2),
  cantidad_cuotas integer,
  monto_cuota numeric(14,2)
)
language sql
stable
as $$
  select
    v.venta_id,
    v.fecha_venta,
    v.lote_id,
    v.lote_codigo,
    v.cliente_id,
    v.cliente_nombre,
    v.cliente_dni,
    v.estado_venta::text as estado_venta,
    v.precio_venta::numeric(14,2),
    v.monto_inicial_total::numeric(14,2),
    v.monto_financiado::numeric(14,2),
    v.cantidad_cuotas,
    v.monto_cuota::numeric(14,2)
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    true
  ) v
  order by v.fecha_venta desc, v.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_clientes_activos(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  cliente_id uuid,
  cliente_nombre text,
  cliente_dni text,
  operaciones_activas bigint,
  monto_acumulado numeric(14,2),
  saldo_pendiente numeric(14,2),
  ultima_fecha_venta date
)
language sql
stable
as $$
  with ventas_activas as (
    select *
    from {{SCHEMA}}.dashboard_filtered_ventas(
      p_from,
      p_to,
      p_asesor_id,
      p_estado_lote,
      p_estado_venta,
      false
    )
    where venta_activa
  )
  select
    v.cliente_id,
    max(v.cliente_nombre) as cliente_nombre,
    max(v.cliente_dni) as cliente_dni,
    count(*)::bigint as operaciones_activas,
    coalesce(sum(v.precio_venta), 0)::numeric(14,2) as monto_acumulado,
    coalesce(sum(v.monto_financiado), 0)::numeric(14,2) as saldo_pendiente,
    max(v.fecha_venta) as ultima_fecha_venta
  from ventas_activas v
  group by v.cliente_id
  order by ultima_fecha_venta desc, cliente_nombre asc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_pagos_registrados(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_estado_lote text default null,
  p_estado_venta text default null,
  p_tipo_pago text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  pago_id uuid,
  venta_id uuid,
  fecha_pago date,
  tipo_pago text,
  monto numeric(14,2),
  nro_cuota integer,
  lote_id uuid,
  lote_codigo text,
  cliente_id uuid,
  cliente_nombre text,
  cliente_dni text,
  estado_venta text
)
language sql
stable
as $$
  select
    p.pago_id,
    p.venta_id,
    p.fecha_pago,
    p.tipo_pago::text as tipo_pago,
    p.monto::numeric(14,2),
    p.nro_cuota,
    p.lote_id,
    p.lote_codigo,
    p.cliente_id,
    p.cliente_nombre,
    p.cliente_dni,
    p.estado_venta::text as estado_venta
  from {{SCHEMA}}.dashboard_filtered_pagos(
    p_from,
    p_to,
    p_asesor_id,
    p_estado_lote,
    p_estado_venta,
    p_tipo_pago
  ) p
  order by p.fecha_pago desc, p.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
