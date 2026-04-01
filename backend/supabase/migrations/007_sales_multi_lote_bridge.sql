create table if not exists {{SCHEMA}}.venta_lotes (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references {{SCHEMA}}.ventas(id) on delete cascade,
  lote_id uuid not null references {{SCHEMA}}.lotes(id),
  orden integer not null default 1,
  created_at timestamptz not null default now(),
  constraint venta_lotes_orden_check check (orden >= 1),
  constraint venta_lotes_venta_lote_unique unique (venta_id, lote_id)
);

create index if not exists venta_lotes_venta_id_idx
  on {{SCHEMA}}.venta_lotes (venta_id);

create index if not exists venta_lotes_lote_id_idx
  on {{SCHEMA}}.venta_lotes (lote_id);

create index if not exists venta_lotes_venta_orden_idx
  on {{SCHEMA}}.venta_lotes (venta_id, orden, created_at, id);

insert into {{SCHEMA}}.venta_lotes (venta_id, lote_id, orden)
select v.id, v.lote_id, 1
from {{SCHEMA}}.ventas v
where v.lote_id is not null
on conflict (venta_id, lote_id) do nothing;

create or replace function {{SCHEMA}}.check_venta_lote_activo_unico()
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
    from {{SCHEMA}}.venta_lotes vl
    join {{SCHEMA}}.ventas v on v.id = vl.venta_id
   where vl.lote_id = new.lote_id
     and vl.venta_id <> new.venta_id
     and v.estado_venta <> 'CAIDA'::{{SCHEMA}}.venta_estado_enum
   limit 1;

  if conflicting_sale_id is not null then
    raise exception 'El lote ya pertenece a una venta activa (%).', conflicting_sale_id
      using errcode = '23505', constraint = 'venta_lotes_lote_activo_unique';
  end if;

  return new;
end
$$;

drop trigger if exists trg_venta_lotes_check_activo on {{SCHEMA}}.venta_lotes;

create trigger trg_venta_lotes_check_activo
before insert or update of lote_id, venta_id on {{SCHEMA}}.venta_lotes
for each row
execute function {{SCHEMA}}.check_venta_lote_activo_unico();
