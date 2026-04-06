alter table if exists dev.lotes
  add column if not exists es_esquina boolean,
  add column if not exists es_medianero boolean,
  add column if not exists frente_parque boolean,
  add column if not exists frente_via_principal boolean,
  add column if not exists precio_minimo numeric;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'lotes_precio_minimo_nonnegative_chk'
       and connamespace = 'dev'::regnamespace
  ) then
    alter table dev.lotes
      add constraint lotes_precio_minimo_nonnegative_chk
      check (precio_minimo is null or precio_minimo >= 0);
  end if;
end $$;

create index if not exists lotes_proyecto_precio_minimo_idx
  on dev.lotes (proyecto_id, precio_minimo);
