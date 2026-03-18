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
      and column_name = 'asesor_usuario_id'
  ) then
    raise exception 'La migracion dashboard_analytics requiere el modelo comercial actual en %.ventas', '{{SCHEMA}}';
  end if;
end
$$;

drop view if exists {{SCHEMA}}.vw_dashboard_pagos_base cascade;
drop view if exists {{SCHEMA}}.vw_dashboard_ventas_base cascade;
drop view if exists {{SCHEMA}}.vw_dashboard_lotes_base cascade;

drop function if exists {{SCHEMA}}.dashboard_bucket_date(date, text);
drop function if exists {{SCHEMA}}.dashboard_filtered_lotes(uuid, text);
drop function if exists {{SCHEMA}}.dashboard_filtered_ventas(date, date, uuid, uuid, text, text, boolean);
drop function if exists {{SCHEMA}}.dashboard_filtered_pagos(date, date, uuid, uuid, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_inventario_estado(uuid, text);
drop function if exists {{SCHEMA}}.dashboard_admin_resumen_asesores(date, date, uuid, uuid, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_ranking_asesores(date, date, uuid, uuid, text, text, text, integer);
drop function if exists {{SCHEMA}}.dashboard_admin_kpis(date, date, uuid, uuid, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_series_ventas(date, date, uuid, uuid, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_series_cobros(date, date, uuid, uuid, text, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_admin_ventas_activas(date, date, uuid, uuid, text, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_admin_operaciones_anuladas(date, date, uuid, uuid, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_asesor_kpis(uuid, date, date, uuid, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_series_ventas(uuid, date, date, uuid, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_series_cobros(uuid, date, date, uuid, text, text, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_operaciones_por_etapa(uuid, date, date, uuid, text, text);
drop function if exists {{SCHEMA}}.dashboard_asesor_resumen_operaciones(uuid, date, date, uuid, text, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_asesor_clientes_activos(uuid, date, date, uuid, text, text, integer, integer);
drop function if exists {{SCHEMA}}.dashboard_asesor_pagos_registrados(uuid, date, date, uuid, text, text, text, integer, integer);

create or replace view {{SCHEMA}}.vw_dashboard_lotes_base as
select
  l.id as lote_id,
  l.proyecto_id,
  pr.nombre as proyecto_nombre,
  pr.codigo as proyecto_codigo,
  l.codigo,
  l.manzana,
  l.numero,
  l.area_m2,
  l.precio_lista,
  l.precio_minimo,
  l.precio_referencial,
  l.estado_comercial,
  l.moneda,
  l.observaciones,
  l.created_at,
  l.updated_at
from {{SCHEMA}}.lotes l
join {{SCHEMA}}.proyectos pr on pr.id = l.proyecto_id;

create or replace view {{SCHEMA}}.vw_dashboard_ventas_base as
select
  v.id as venta_id,
  v.codigo_venta,
  v.proyecto_id,
  pr.nombre as proyecto_nombre,
  pr.codigo as proyecto_codigo,
  v.lote_id,
  l.codigo as lote_codigo,
  l.manzana as lote_manzana,
  l.numero as lote_numero,
  l.estado_comercial as lote_estado_comercial,
  v.cliente_titular_persona_id as cliente_persona_id,
  cp.tipo_documento as cliente_tipo_documento,
  cp.numero_documento as cliente_numero_documento,
  trim(concat_ws(' ', cp.nombres, cp.apellidos)) as cliente_nombre,
  cp.celular as cliente_celular,
  v.asesor_usuario_id,
  u.username as asesor_username,
  trim(concat_ws(' ', ap.nombres, ap.apellidos)) as asesor_nombre,
  ap.celular as asesor_celular,
  v.etapa_venta,
  v.estado_registro as venta_estado_registro,
  v.fecha_venta,
  v.fecha_separacion,
  v.fecha_contrato,
  v.precio_lote,
  v.monto_separacion_pactado,
  v.monto_inicial_pactado,
  v.monto_financiado_pactado,
  v.numero_cuotas_pactadas,
  v.monto_cuota_referencial,
  v.plazo_meses,
  v.pagado_total,
  v.saldo_pendiente,
  v.moneda,
  v.observaciones,
  (v.estado_registro = 'ACTIVO' and v.etapa_venta <> 'ANULADO') as venta_activa,
  (v.estado_registro = 'ACTIVO' and v.etapa_venta = 'SEPARADO') as es_separacion_activa,
  v.created_at,
  v.updated_at
from {{SCHEMA}}.ventas v
join {{SCHEMA}}.proyectos pr on pr.id = v.proyecto_id
join {{SCHEMA}}.lotes l on l.id = v.lote_id
join {{SCHEMA}}.usuarios u on u.id = v.asesor_usuario_id
join {{SCHEMA}}.personas ap on ap.id = u.persona_id
join {{SCHEMA}}.personas cp on cp.id = v.cliente_titular_persona_id;

create or replace view {{SCHEMA}}.vw_dashboard_pagos_base as
select
  p.id as pago_id,
  p.venta_id,
  v.codigo_venta,
  v.proyecto_id,
  pr.nombre as proyecto_nombre,
  pr.codigo as proyecto_codigo,
  v.lote_id,
  l.codigo as lote_codigo,
  v.cliente_titular_persona_id as cliente_persona_id,
  cp.numero_documento as cliente_numero_documento,
  trim(concat_ws(' ', cp.nombres, cp.apellidos)) as cliente_nombre,
  v.asesor_usuario_id,
  u.username as asesor_username,
  trim(concat_ws(' ', ap.nombres, ap.apellidos)) as asesor_nombre,
  p.tipo_pago,
  p.concepto,
  p.fecha_pago,
  p.monto,
  p.forma_pago,
  p.numero_operacion,
  p.moneda,
  p.observaciones,
  p.registrado_por_usuario_id,
  ru.username as registrado_por_username,
  p.estado_registro as pago_estado_registro,
  v.etapa_venta,
  v.estado_registro as venta_estado_registro,
  (v.estado_registro = 'ACTIVO' and v.etapa_venta <> 'ANULADO') as venta_activa,
  p.created_at,
  p.updated_at
from {{SCHEMA}}.pagos p
join {{SCHEMA}}.ventas v on v.id = p.venta_id
join {{SCHEMA}}.proyectos pr on pr.id = v.proyecto_id
join {{SCHEMA}}.lotes l on l.id = v.lote_id
join {{SCHEMA}}.usuarios u on u.id = v.asesor_usuario_id
join {{SCHEMA}}.personas ap on ap.id = u.persona_id
join {{SCHEMA}}.personas cp on cp.id = v.cliente_titular_persona_id
left join {{SCHEMA}}.usuarios ru on ru.id = p.registrado_por_usuario_id;

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
  p_proyecto_id uuid default null,
  p_estado_lote text default null
)
returns setof {{SCHEMA}}.vw_dashboard_lotes_base
language sql
stable
as $$
  select *
  from {{SCHEMA}}.vw_dashboard_lotes_base l
  where (p_proyecto_id is null or l.proyecto_id = p_proyecto_id)
    and (
      nullif(trim(coalesce(p_estado_lote, '')), '') is null
      or upper(l.estado_comercial::text) = upper(trim(p_estado_lote))
    )
  order by l.manzana asc nulls last, l.numero asc nulls last, l.codigo asc
$$;

create or replace function {{SCHEMA}}.dashboard_filtered_ventas(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
  p_incluir_anuladas boolean default true
)
returns setof {{SCHEMA}}.vw_dashboard_ventas_base
language sql
stable
as $$
  select *
  from {{SCHEMA}}.vw_dashboard_ventas_base v
  where (p_from is null or v.fecha_venta >= p_from)
    and (p_to is null or v.fecha_venta < p_to + 1)
    and (p_proyecto_id is null or v.proyecto_id = p_proyecto_id)
    and (p_asesor_id is null or v.asesor_usuario_id = p_asesor_id)
    and (
      nullif(trim(coalesce(p_estado_lote, '')), '') is null
      or upper(v.lote_estado_comercial::text) = upper(trim(p_estado_lote))
    )
    and (
      nullif(trim(coalesce(p_etapa_venta, '')), '') is null
      or upper(v.etapa_venta::text) = upper(trim(p_etapa_venta))
    )
    and (
      p_incluir_anuladas
      or (v.venta_estado_registro = 'ACTIVO' and v.etapa_venta <> 'ANULADO')
    )
  order by v.fecha_venta desc, v.codigo_venta desc
$$;

create or replace function {{SCHEMA}}.dashboard_filtered_pagos(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
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
    and (p_proyecto_id is null or p.proyecto_id = p_proyecto_id)
    and (p_asesor_id is null or p.asesor_usuario_id = p_asesor_id)
    and (
      nullif(trim(coalesce(p_estado_lote, '')), '') is null
      or upper(
        (select v.lote_estado_comercial::text
         from {{SCHEMA}}.vw_dashboard_ventas_base v
         where v.venta_id = p.venta_id)
      ) = upper(trim(p_estado_lote))
    )
    and (
      nullif(trim(coalesce(p_etapa_venta, '')), '') is null
      or upper(p.etapa_venta::text) = upper(trim(p_etapa_venta))
    )
    and (
      nullif(trim(coalesce(p_tipo_pago, '')), '') is null
      or upper(p.tipo_pago::text) = upper(trim(p_tipo_pago))
    )
  order by p.fecha_pago desc, p.pago_id desc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_inventario_estado(
  p_proyecto_id uuid default null,
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
    from {{SCHEMA}}.dashboard_filtered_lotes(p_proyecto_id, p_estado_lote)
  ),
  totals as (
    select count(*)::numeric as total from filtered
  )
  select
    f.estado_comercial,
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
      when 'LIBRE' then 1
      when 'SEPARADO' then 2
      when 'VENDIDO' then 3
      when 'BLOQUEADO' then 4
      else 5
    end,
    f.estado_comercial
$$;

create or replace function {{SCHEMA}}.dashboard_admin_resumen_asesores(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null
)
returns table (
  asesor_usuario_id uuid,
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
      u.id as asesor_usuario_id,
      u.username as asesor_username,
      trim(concat_ws(' ', p.nombres, p.apellidos)) as asesor_nombre
    from {{SCHEMA}}.usuarios u
    join {{SCHEMA}}.personas p on p.id = u.persona_id
    where u.rol = 'ASESOR'
      and u.estado = 'ACTIVO'
      and (p_asesor_id is null or u.id = p_asesor_id)
  ),
  filtered_sales as (
    select *
    from {{SCHEMA}}.dashboard_filtered_ventas(
      p_from,
      p_to,
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
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
      asesor_usuario_id,
      count(*)::bigint as cantidad_ventas,
      coalesce(sum(precio_lote), 0)::numeric(14,2) as monto_vendido,
      count(*)::bigint as cartera_activa,
      coalesce(sum(saldo_pendiente), 0)::numeric(14,2) as saldo_pendiente,
      coalesce(max(precio_lote), 0)::numeric(14,2) as mayor_venta
    from active_sales
    group by asesor_usuario_id
  ),
  payment_summary as (
    select
      asesor_usuario_id,
      coalesce(sum(monto), 0)::numeric(14,2) as monto_cobrado
    from {{SCHEMA}}.dashboard_filtered_pagos(
      p_from,
      p_to,
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
      null
    )
    where pago_estado_registro = 'ACTIVO'
      and venta_activa
    group by asesor_usuario_id
  )
  select
    pool.asesor_usuario_id,
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
  left join sales_summary ss on ss.asesor_usuario_id = pool.asesor_usuario_id
  left join payment_summary ps on ps.asesor_usuario_id = pool.asesor_usuario_id
  order by monto_vendido desc, monto_cobrado desc, pool.asesor_nombre asc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_ranking_asesores(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
  p_metric text default 'monto_vendido',
  p_top_n integer default 10
)
returns table (
  asesor_usuario_id uuid,
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
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta
    )
  )
  select *
  from summary
  order by
    case
      when lower(coalesce(p_metric, 'monto_vendido')) = 'monto_cobrado' then monto_cobrado
      when lower(coalesce(p_metric, 'monto_vendido')) = 'ticket_promedio' then ticket_promedio_venta
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
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null
)
returns table (
  inventario_total bigint,
  lotes_libres bigint,
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
    from {{SCHEMA}}.dashboard_filtered_lotes(p_proyecto_id, p_estado_lote)
  ),
  ventas as (
    select *
    from {{SCHEMA}}.dashboard_filtered_ventas(
      p_from,
      p_to,
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
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
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
      null
    )
    where pago_estado_registro = 'ACTIVO'
      and venta_activa
  ),
  top_asesor as (
    select *
    from {{SCHEMA}}.dashboard_admin_ranking_asesores(
      p_from,
      p_to,
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
      'monto_vendido',
      1
    )
  )
  select
    (select count(*)::bigint from lotes) as inventario_total,
    (select count(*)::bigint from lotes where estado_comercial = 'LIBRE') as lotes_libres,
    (select count(*)::bigint from lotes where estado_comercial = 'SEPARADO') as lotes_separados,
    (select count(*)::bigint from lotes where estado_comercial = 'VENDIDO') as lotes_vendidos,
    (select count(*)::bigint from ventas_activas) as ventas_activas,
    coalesce((select sum(precio_lote) from ventas_activas), 0)::numeric(14,2) as monto_vendido,
    coalesce((select sum(monto) from pagos), 0)::numeric(14,2) as monto_cobrado,
    coalesce((select sum(saldo_pendiente) from ventas_activas), 0)::numeric(14,2) as saldo_pendiente_global,
    case
      when (select count(*) from ventas_activas) = 0 then 0::numeric(14,2)
      else round(
        coalesce((select sum(precio_lote) from ventas_activas), 0)
        / (select count(*) from ventas_activas),
        2
      )
    end as ticket_promedio_venta,
    (select asesor_usuario_id from top_asesor limit 1) as asesor_top_id,
    (select asesor_username from top_asesor limit 1) as asesor_top_username,
    (select asesor_nombre from top_asesor limit 1) as asesor_top_nombre,
    coalesce((select monto_vendido from top_asesor limit 1), 0)::numeric(14,2) as asesor_top_monto_vendido
$$;

create or replace function {{SCHEMA}}.dashboard_admin_series_ventas(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
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
    coalesce(sum(v.precio_lote), 0)::numeric(14,2) as monto_vendido,
    round(coalesce(avg(v.precio_lote), 0), 2)::numeric(14,2) as ticket_promedio_venta
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    false
  ) v
  where v.venta_activa
  group by 1
  order by 1 asc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_series_cobros(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
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
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    p_tipo_pago
  ) p
  where p.pago_estado_registro = 'ACTIVO'
    and p.venta_activa
  group by 1
  order by 1 asc
$$;

create or replace function {{SCHEMA}}.dashboard_admin_ventas_activas(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  venta_id uuid,
  codigo_venta text,
  fecha_venta date,
  proyecto_id uuid,
  proyecto_nombre text,
  lote_id uuid,
  lote_codigo text,
  cliente_persona_id uuid,
  cliente_nombre text,
  cliente_numero_documento text,
  asesor_usuario_id uuid,
  asesor_username text,
  asesor_nombre text,
  etapa_venta text,
  precio_lote numeric(14,2),
  pagado_total numeric(14,2),
  saldo_pendiente numeric(14,2),
  moneda text
)
language sql
stable
as $$
  select
    v.venta_id,
    v.codigo_venta,
    v.fecha_venta,
    v.proyecto_id,
    v.proyecto_nombre,
    v.lote_id,
    v.lote_codigo,
    v.cliente_persona_id,
    v.cliente_nombre,
    v.cliente_numero_documento,
    v.asesor_usuario_id,
    v.asesor_username,
    v.asesor_nombre,
    v.etapa_venta,
    v.precio_lote::numeric(14,2),
    v.pagado_total::numeric(14,2),
    v.saldo_pendiente::numeric(14,2),
    v.moneda
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    false
  ) v
  where v.venta_activa
  order by v.fecha_venta desc, v.codigo_venta desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_admin_operaciones_anuladas(
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_asesor_id uuid default null,
  p_estado_lote text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  venta_id uuid,
  codigo_venta text,
  fecha_venta date,
  proyecto_id uuid,
  proyecto_nombre text,
  lote_id uuid,
  lote_codigo text,
  cliente_persona_id uuid,
  cliente_nombre text,
  cliente_numero_documento text,
  asesor_usuario_id uuid,
  asesor_username text,
  asesor_nombre text,
  etapa_venta text,
  precio_lote numeric(14,2),
  pagado_total numeric(14,2),
  saldo_pendiente numeric(14,2),
  moneda text
)
language sql
stable
as $$
  select
    v.venta_id,
    v.codigo_venta,
    v.fecha_venta,
    v.proyecto_id,
    v.proyecto_nombre,
    v.lote_id,
    v.lote_codigo,
    v.cliente_persona_id,
    v.cliente_nombre,
    v.cliente_numero_documento,
    v.asesor_usuario_id,
    v.asesor_username,
    v.asesor_nombre,
    v.etapa_venta,
    v.precio_lote::numeric(14,2),
    v.pagado_total::numeric(14,2),
    v.saldo_pendiente::numeric(14,2),
    v.moneda
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    'ANULADO',
    true
  ) v
  where upper(v.etapa_venta::text) = 'ANULADO'
     or upper(v.venta_estado_registro::text) = 'ANULADO'
  order by v.fecha_venta desc, v.codigo_venta desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_kpis(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null
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
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
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
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
      null
    )
    where pago_estado_registro = 'ACTIVO'
      and venta_activa
  )
  select
    (select count(*)::bigint from ventas_activas) as mis_ventas_activas,
    (select count(*)::bigint from ventas_activas where etapa_venta = 'SEPARADO') as mis_separaciones,
    coalesce((select sum(precio_lote) from ventas_activas), 0)::numeric(14,2) as mi_monto_vendido,
    coalesce((select sum(monto) from pagos), 0)::numeric(14,2) as mi_monto_cobrado,
    coalesce((select sum(saldo_pendiente) from ventas_activas), 0)::numeric(14,2) as saldo_pendiente_mi_cartera,
    case
      when (select count(*) from ventas_activas) = 0 then 0::numeric(14,2)
      else round(
        coalesce((select sum(precio_lote) from ventas_activas), 0)
        / (select count(*) from ventas_activas),
        2
      )
    end as ticket_promedio_venta,
    (select count(distinct cliente_persona_id)::bigint from ventas_activas) as clientes_activos,
    coalesce((select max(precio_lote) from ventas_activas), 0)::numeric(14,2) as mayor_venta
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_series_ventas(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
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
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    p_group_by
  )
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_series_cobros(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
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
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    p_tipo_pago,
    p_group_by
  )
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_operaciones_por_etapa(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null
)
returns table (
  etapa_venta text,
  cantidad bigint,
  monto_vendido numeric(14,2)
)
language sql
stable
as $$
  select
    v.etapa_venta,
    count(*)::bigint as cantidad,
    coalesce(sum(v.precio_lote), 0)::numeric(14,2) as monto_vendido
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    true
  ) v
  where upper(v.venta_estado_registro::text) <> 'ELIMINADO_LOGICO'
  group by v.etapa_venta
  order by
    case v.etapa_venta
      when 'SEPARADO' then 1
      when 'CONTRATO' then 2
      when 'PAGANDO' then 3
      when 'COMPLETADO' then 4
      when 'ANULADO' then 5
      else 6
    end,
    v.etapa_venta
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_resumen_operaciones(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  venta_id uuid,
  codigo_venta text,
  fecha_venta date,
  proyecto_id uuid,
  proyecto_nombre text,
  lote_id uuid,
  lote_codigo text,
  cliente_persona_id uuid,
  cliente_nombre text,
  cliente_numero_documento text,
  etapa_venta text,
  precio_lote numeric(14,2),
  pagado_total numeric(14,2),
  saldo_pendiente numeric(14,2),
  moneda text
)
language sql
stable
as $$
  select
    v.venta_id,
    v.codigo_venta,
    v.fecha_venta,
    v.proyecto_id,
    v.proyecto_nombre,
    v.lote_id,
    v.lote_codigo,
    v.cliente_persona_id,
    v.cliente_nombre,
    v.cliente_numero_documento,
    v.etapa_venta,
    v.precio_lote::numeric(14,2),
    v.pagado_total::numeric(14,2),
    v.saldo_pendiente::numeric(14,2),
    v.moneda
  from {{SCHEMA}}.dashboard_filtered_ventas(
    p_from,
    p_to,
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    true
  ) v
  where upper(v.venta_estado_registro::text) <> 'ELIMINADO_LOGICO'
  order by v.fecha_venta desc, v.codigo_venta desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_clientes_activos(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  cliente_persona_id uuid,
  cliente_nombre text,
  cliente_numero_documento text,
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
      p_proyecto_id,
      p_asesor_id,
      p_estado_lote,
      p_etapa_venta,
      false
    )
    where venta_activa
  )
  select
    v.cliente_persona_id,
    max(v.cliente_nombre) as cliente_nombre,
    max(v.cliente_numero_documento) as cliente_numero_documento,
    count(*)::bigint as operaciones_activas,
    coalesce(sum(v.precio_lote), 0)::numeric(14,2) as monto_acumulado,
    coalesce(sum(v.saldo_pendiente), 0)::numeric(14,2) as saldo_pendiente,
    max(v.fecha_venta) as ultima_fecha_venta
  from ventas_activas v
  group by v.cliente_persona_id
  order by ultima_fecha_venta desc, cliente_nombre asc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function {{SCHEMA}}.dashboard_asesor_pagos_registrados(
  p_asesor_id uuid,
  p_from date default null,
  p_to date default null,
  p_proyecto_id uuid default null,
  p_estado_lote text default null,
  p_etapa_venta text default null,
  p_tipo_pago text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  pago_id uuid,
  venta_id uuid,
  codigo_venta text,
  fecha_pago date,
  tipo_pago text,
  concepto text,
  monto numeric(14,2),
  forma_pago text,
  moneda text,
  lote_codigo text,
  cliente_persona_id uuid,
  cliente_nombre text
)
language sql
stable
as $$
  select
    p.pago_id,
    p.venta_id,
    p.codigo_venta,
    p.fecha_pago,
    p.tipo_pago,
    p.concepto,
    p.monto::numeric(14,2),
    p.forma_pago,
    p.moneda,
    p.lote_codigo,
    p.cliente_persona_id,
    p.cliente_nombre
  from {{SCHEMA}}.dashboard_filtered_pagos(
    p_from,
    p_to,
    p_proyecto_id,
    p_asesor_id,
    p_estado_lote,
    p_etapa_venta,
    p_tipo_pago
  ) p
  where p.pago_estado_registro = 'ACTIVO'
  order by p.fecha_pago desc, p.pago_id desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
