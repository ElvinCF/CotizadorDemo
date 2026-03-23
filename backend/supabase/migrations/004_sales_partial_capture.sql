-- Permite guardado parcial de ventas con fecha_venta como unico minimo operativo.
-- No elimina reglas de negocio; solo relaja restricciones estructurales para captura incompleta.

alter table if exists devsimple.ventas
  alter column lote_id drop not null,
  alter column cliente_id drop not null,
  alter column asesor_id drop not null,
  alter column precio_venta set default 0,
  alter column tipo_financiamiento set default 'REDUCIR_CUOTA',
  alter column monto_financiado set default 0,
  alter column cantidad_cuotas set default 12,
  alter column monto_cuota set default 0;

alter table if exists devsimple.ventas
  drop constraint if exists ventas_monto_cuota_check;

alter table if exists devsimple.ventas
  add constraint ventas_monto_cuota_check check (monto_cuota >= 0);