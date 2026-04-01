-- Final cutover: remove legacy mirror column.
alter table {{SCHEMA}}.ventas
drop column if exists lote_id;
