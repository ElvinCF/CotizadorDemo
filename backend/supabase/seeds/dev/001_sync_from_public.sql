insert into dev.lotes (
  id, mz, lote, area, precio, condicion, asesor, cliente, comentario, ultima_modificacion, created_at, updated_at
)
select
  id, mz, lote, area, precio, condicion, asesor, cliente, comentario, ultima_modificacion, created_at, updated_at
from public.lotes
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
  updated_at = excluded.updated_at;
