-- Aligns existing {{SCHEMA}}.lotes and {{SCHEMA}}.usuarios contracts
-- with the current backend/frontend expectations.
-- This migration is intentionally conservative: it does not replace lotes model yet.

create schema if not exists {{SCHEMA}};
create extension if not exists pgcrypto;

-- Ensure lotes table exists with current app contract.
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

alter table {{SCHEMA}}.lotes add column if not exists mz text;
alter table {{SCHEMA}}.lotes add column if not exists lote integer;
alter table {{SCHEMA}}.lotes add column if not exists area numeric(10,2);
alter table {{SCHEMA}}.lotes add column if not exists precio numeric(12,2);
alter table {{SCHEMA}}.lotes add column if not exists condicion text default 'LIBRE';
alter table {{SCHEMA}}.lotes add column if not exists asesor text;
alter table {{SCHEMA}}.lotes add column if not exists cliente text;
alter table {{SCHEMA}}.lotes add column if not exists comentario text;
alter table {{SCHEMA}}.lotes add column if not exists ultima_modificacion text;
alter table {{SCHEMA}}.lotes add column if not exists created_at timestamptz default now();
alter table {{SCHEMA}}.lotes add column if not exists updated_at timestamptz default now();

-- Normalize lotes defaults used by current API.
update {{SCHEMA}}.lotes
set condicion = 'LIBRE'
where condicion is null or btrim(condicion) = '';

alter table {{SCHEMA}}.lotes alter column condicion set default 'LIBRE';
alter table {{SCHEMA}}.lotes alter column created_at set default now();
alter table {{SCHEMA}}.lotes alter column updated_at set default now();

-- Keep uniqueness expected by map/table UI.
create unique index if not exists lotes_mz_lote_unique_idx on {{SCHEMA}}.lotes (mz, lote);

-- Ensure usuarios table exists with practical auth contract for dev.
create table if not exists {{SCHEMA}}.usuarios (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  pin character varying not null,
  role text not null,
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table {{SCHEMA}}.usuarios add column if not exists username text;
alter table {{SCHEMA}}.usuarios add column if not exists pin character varying;
alter table {{SCHEMA}}.usuarios add column if not exists role text;
alter table {{SCHEMA}}.usuarios add column if not exists nombre text;
alter table {{SCHEMA}}.usuarios add column if not exists created_at timestamptz default now();
alter table {{SCHEMA}}.usuarios add column if not exists updated_at timestamptz default now();

-- Accept known roles in current app scope.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = '{{SCHEMA}}'
      and table_name = 'usuarios'
      and column_name = 'role'
  ) then
    begin
      alter table {{SCHEMA}}.usuarios drop constraint if exists usuarios_role_check;
      alter table {{SCHEMA}}.usuarios
        add constraint usuarios_role_check
        check (role = any (array['VENDEDOR'::text, 'ADMIN'::text]));
    exception
      when duplicate_object then
        null;
    end;
  end if;
end
$$;

create unique index if not exists usuarios_username_unique_idx on {{SCHEMA}}.usuarios (lower(username));

-- Keep updated_at trigger for usuarios too.
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

drop trigger if exists trg_usuarios_updated_at on {{SCHEMA}}.usuarios;
create trigger trg_usuarios_updated_at
before update on {{SCHEMA}}.usuarios
for each row execute procedure {{SCHEMA}}.set_updated_at();
