drop function if exists {{SCHEMA}}.dashboard_admin_kpis(date, date, uuid, text, text);

create function {{SCHEMA}}.dashboard_admin_kpis(
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
  pendiente_vender numeric(14,2),
  cuota_cobrar_proximo_mes numeric(14,2),
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
  ),
  siguiente_mes as (
    select
      date_trunc('month', timezone('America/Lima', now()) + interval '1 month')::date as desde,
      (date_trunc('month', timezone('America/Lima', now()) + interval '2 month') - interval '1 day')::date as hasta
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
    coalesce((select sum(precio_referencial) from lotes where estado_comercial = 'DISPONIBLE'), 0)::numeric(14,2) as pendiente_vender,
    coalesce((
      select sum(v.monto_cuota)
      from ventas_activas v
      cross join siguiente_mes sm
      where v.estado_venta in ('INICIAL_PAGADA', 'PAGANDO')
        and v.fecha_pago_pactada is not null
        and v.fecha_pago_pactada >= sm.desde
        and v.fecha_pago_pactada <= sm.hasta
        and coalesce(v.monto_cuota, 0) > 0
    ), 0)::numeric(14,2) as cuota_cobrar_proximo_mes,
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
