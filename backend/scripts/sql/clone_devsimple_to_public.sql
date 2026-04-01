begin;
set local check_function_bodies = off;

-- 0) Limpieza total de objetos de app en public
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
  loop
    execute format('drop view if exists public.%I cascade', r.relname);
  end loop;

  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;

  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by c.relname
  loop
    execute format('drop table if exists public.%I cascade', r.relname);
  end loop;

  for r in
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
    order by t.typname
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end
$$;

-- 1) Clonar enums devsimple -> public
do $$
declare
  r record;
  labels text;
begin
  for r in
    select t.oid, t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'devsimple'
      and t.typtype = 'e'
    order by t.typname
  loop
    select string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)
      into labels
    from pg_enum e
    where e.enumtypid = r.oid;

    execute format('create type public.%I as enum (%s)', r.typname, labels);
  end loop;
end
$$;

-- 2) Clonar estructura de tablas (columnas, defaults, not null)
do $$
declare
  t record;
  col record;
  ddl text;
begin
  for t in
    select tbl.oid, tbl.relname
    from pg_class tbl
    join pg_namespace n on n.oid = tbl.relnamespace
    where n.nspname = 'devsimple'
      and tbl.relkind = 'r'
    order by tbl.relname
  loop
    ddl := format('create table public.%I (', t.relname);

    for col in
      select
        a.attname,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
        a.attnotnull,
        pg_get_expr(ad.adbin, ad.adrelid) as column_default
      from pg_attribute a
      left join pg_attrdef ad
        on ad.adrelid = a.attrelid
       and ad.adnum = a.attnum
      where a.attrelid = t.oid
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum
    loop
      ddl := ddl || format('%I %s', col.attname, replace(col.data_type, 'devsimple.', 'public.'));

      if col.column_default is not null then
        ddl := ddl || ' default ' || replace(col.column_default, 'devsimple.', 'public.');
      end if;

      if col.attnotnull then
        ddl := ddl || ' not null';
      end if;

      ddl := ddl || ', ';
    end loop;

    ddl := left(ddl, length(ddl) - 2) || ')';
    execute ddl;
  end loop;
end
$$;

-- 3) Copiar data
do $$
declare
  t record;
  insert_cols text;
  select_cols text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'devsimple'
      and c.relkind = 'r'
    order by c.relname
  loop
    select
      string_agg(format('%I', a.attname), ', ' order by a.attnum),
      string_agg(
        case
          when tn.nspname = 'devsimple' and tp.typtype = 'e'
            then format('%I::text::public.%I', a.attname, tp.typname)
          else format('%I', a.attname)
        end,
        ', '
        order by a.attnum
      )
      into insert_cols, select_cols
    from pg_attribute a
    join pg_class cls on cls.oid = a.attrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    join pg_type tp on tp.oid = a.atttypid
    join pg_namespace tn on tn.oid = tp.typnamespace
    where ns.nspname = 'devsimple'
      and cls.relname = t.relname
      and a.attnum > 0
      and not a.attisdropped;

    execute format(
      'insert into public.%I (%s) select %s from devsimple.%I',
      t.relname,
      insert_cols,
      select_cols,
      t.relname
    );
  end loop;
end
$$;

-- 4) Clonar constraints (PK/UK/CHECK/FK)
do $$
declare
  r record;
  table_name text;
  def text;
begin
  for r in
    select
      c.conname,
      c.contype,
      c.conrelid,
      pg_get_constraintdef(c.oid, true) as condef
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'devsimple'
      and c.contype in ('p', 'u', 'c', 'f')
    order by
      case c.contype
        when 'p' then 1
        when 'u' then 2
        when 'c' then 3
        when 'f' then 4
        else 5
      end,
      c.conname
  loop
    table_name := (select relname from pg_class where oid = r.conrelid);
    def := replace(replace(r.condef, 'devsimple.', 'public.'), '"devsimple".', '"public".');

    execute format(
      'alter table public.%I add constraint %I %s',
      table_name,
      r.conname,
      def
    );
  end loop;
end
$$;

-- 5) Clonar indices no ligados a constraints
do $$
declare
  r record;
  idxdef text;
begin
  for r in
    select pg_get_indexdef(i.indexrelid) as indexdef
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'devsimple'
      and not exists (
        select 1
        from pg_constraint c
        where c.conindid = i.indexrelid
      )
    order by i.indexrelid
  loop
    idxdef := replace(replace(r.indexdef, 'devsimple.', 'public.'), '"devsimple".', '"public".');
    execute idxdef;
  end loop;
end
$$;

-- 6) Clonar views base (algunas funciones retornan tipos compuestos de estas views)
do $$
declare
  r record;
  view_sql text;
begin
  for r in
    select c.relname, pg_get_viewdef(c.oid, true) as viewdef
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'devsimple'
      and c.relkind = 'v'
    order by
      case c.relname
        when 'vw_dashboard_ventas_base' then 1
        when 'vw_dashboard_lotes_base' then 2
        when 'vw_dashboard_pagos_base' then 3
        else 99
      end,
      c.relname
  loop
    view_sql := format(
      'create or replace view public.%I as %s',
      r.relname,
      replace(replace(r.viewdef, 'devsimple.', 'public.'), '\"devsimple\".', '\"public\".')
    );
    execute view_sql;
  end loop;
end
$$;

-- 7) Clonar funciones
do $$
declare
  r record;
  fn_sql text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'devsimple'
    order by p.proname, p.oid
  loop
    fn_sql := pg_get_functiondef(r.oid);
    fn_sql := replace(replace(fn_sql, 'devsimple.', 'public.'), '"devsimple".', '"public".');
    execute fn_sql;
  end loop;
end
$$;

-- 8) Reaplicar views para dejar definiciones consistentes
do $$
declare
  r record;
  view_sql text;
begin
  for r in
    select c.relname, pg_get_viewdef(c.oid, true) as viewdef
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'devsimple'
      and c.relkind = 'v'
    order by
      case c.relname
        when 'vw_dashboard_ventas_base' then 1
        when 'vw_dashboard_lotes_base' then 2
        when 'vw_dashboard_pagos_base' then 3
        else 99
      end,
      c.relname
  loop
    view_sql := format(
      'create or replace view public.%I as %s',
      r.relname,
      replace(replace(r.viewdef, 'devsimple.', 'public.'), '"devsimple".', '"public".')
    );
    execute view_sql;
  end loop;
end
$$;

-- 9) Clonar triggers
do $$
declare
  r record;
  trg_sql text;
begin
  for r in
    select pg_get_triggerdef(t.oid, true) as trgdef
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'devsimple'
    order by c.relname, t.tgname
  loop
    trg_sql := replace(replace(r.trgdef, ' ON devsimple.', ' ON public.'), ' FUNCTION devsimple.', ' FUNCTION public.');
    trg_sql := replace(trg_sql, '"devsimple".', '"public".');
    execute trg_sql;
  end loop;
end
$$;

commit;
