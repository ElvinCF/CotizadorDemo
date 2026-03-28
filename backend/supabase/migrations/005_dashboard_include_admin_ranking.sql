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
