-- Remove direct dependencies on ventas.lote_id before dropping the column.
-- Keeps dashboard contracts stable while sourcing lot data from venta_lotes.

create or replace view {{SCHEMA}}.vw_dashboard_ventas_base as
select
  v.id as venta_id,
  vl_primary.lote_id,
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
join lateral (
  select vl.lote_id
  from {{SCHEMA}}.venta_lotes vl
  where vl.venta_id = v.id
  order by vl.orden asc, vl.created_at asc, vl.id asc
  limit 1
) vl_primary on true
join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
join {{SCHEMA}}.clientes c on c.id = v.cliente_id
join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
left join {{SCHEMA}}.clientes c2 on c2.id = v.cliente2_id;

alter table {{SCHEMA}}.ventas drop constraint if exists ventas_lote_id_fkey;
drop index if exists {{SCHEMA}}.ventas_lote_id_idx;
drop index if exists {{SCHEMA}}.ventas_lote_activa_unique_idx;
