create schema if not exists {{SCHEMA}};

create table if not exists {{SCHEMA}}.lotes (
  id text primary key,
  mz text not null,
  lote integer not null,
  area numeric(10,2),
  precio numeric(12,2),
  condicion text not null default 'LIBRE',
  asesor text,
  cliente text,
  comentario text,
  ultima_modificacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lotes_mz_lote_unique_idx on {{SCHEMA}}.lotes (mz, lote);

create or replace function {{SCHEMA}}.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lotes_updated_at on {{SCHEMA}}.lotes;
create trigger trg_lotes_updated_at
before update on {{SCHEMA}}.lotes
for each row execute procedure {{SCHEMA}}.set_updated_at();
