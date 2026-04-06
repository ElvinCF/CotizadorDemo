begin;

alter table dev.proyectos
  drop constraint if exists proyectos_empresa_id_nombre_key;

drop index if exists dev.proyectos_empresa_nombre_etapa_norm_uidx;

create unique index proyectos_empresa_nombre_etapa_norm_uidx
  on dev.proyectos (
    empresa_id,
    lower(trim(nombre)),
    lower(trim(coalesce(etapa, '')))
  );

commit;
