-- Sync from public.lotes into {{SCHEMA}}.lotes (legacy contract).
-- Idempotent and safe.

insert into {{SCHEMA}}.lotes (
  id,
  mz,
  lote,
  area,
  precio,
  condicion,
  asesor,
  cliente,
  comentario,
  ultima_modificacion,
  created_at,
  updated_at
)
select
  upper(trim(id)) as id,
  upper(trim(mz)) as mz,
  lote,
  area,
  precio,
  case
    when upper(coalesce(condicion, 'LIBRE')) in ('LIBRE', 'DISPONIBLE') then 'LIBRE'
    when upper(coalesce(condicion, 'LIBRE')) = 'SEPARADO' then 'SEPARADO'
    when upper(coalesce(condicion, 'LIBRE')) = 'VENDIDO' then 'VENDIDO'
    else 'LIBRE'
  end as condicion,
  asesor,
  cliente,
  comentario,
  ultima_modificacion,
  coalesce(created_at, now()) as created_at,
  coalesce(updated_at, now()) as updated_at
from public.lotes
where id is not null
on conflict (id) do update
set
  mz = excluded.mz,
  lote = excluded.lote,
  area = excluded.area,
  precio = excluded.precio,
  condicion = excluded.condicion,
  asesor = excluded.asesor,
  cliente = excluded.cliente,
  comentario = excluded.comentario,
  ultima_modificacion = excluded.ultima_modificacion,
  updated_at = now();
