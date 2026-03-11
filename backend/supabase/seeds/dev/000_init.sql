-- Full cascade seed for the commercial model in {{SCHEMA}}.
-- Loads all lots from public.lotes adapted to {{SCHEMA}}.lotes.

truncate table
  {{SCHEMA}}.autorizaciones_admin,
  {{SCHEMA}}.pagos,
  {{SCHEMA}}.ventas_clientes,
  {{SCHEMA}}.ventas,
  {{SCHEMA}}.lotes,
  {{SCHEMA}}.proyectos,
  {{SCHEMA}}.empresas,
  {{SCHEMA}}.usuarios,
  {{SCHEMA}}.personas
restart identity cascade;

insert into {{SCHEMA}}.empresas (
  id,
  razon_social,
  nombre_comercial,
  ruc,
  telefono,
  correo,
  direccion,
  estado
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Inversiones Arenas del Norte SAC',
  'Arenas Malabrigo',
  '20123456789',
  '044123456',
  'contacto@arenasmalabrigo.pe',
  'Av. Larco 123, Trujillo',
  'ACTIVO'
);

insert into {{SCHEMA}}.proyectos (
  id,
  empresa_id,
  nombre,
  codigo,
  descripcion,
  departamento,
  provincia,
  distrito,
  sector,
  direccion_referencia,
  estado,
  fecha_inicio_comercial
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Arenas Malabrigo 2',
  'AM2',
  'Proyecto principal de prueba para entorno dev',
  'La Libertad',
  'Trujillo',
  'Huanchaco',
  'Litoral',
  'Referencia KM 18 Panamericana Norte',
  'ACTIVO',
  current_date - interval '60 day'
);

insert into {{SCHEMA}}.personas (
  id,
  tipo_documento,
  numero_documento,
  nombres,
  apellidos,
  celular,
  correo,
  ocupacion,
  direccion,
  departamento,
  provincia,
  distrito,
  estado
)
values
  ('30000000-0000-0000-0000-000000000001', 'DNI', '70000001', 'Admin', 'Principal', '999111001', 'admin@demo.pe', 'Administrador', 'Urb. California 100', 'La Libertad', 'Trujillo', 'Trujillo', 'ACTIVO'),
  ('30000000-0000-0000-0000-000000000002', 'DNI', '70000002', 'Elvin', 'Cueva', '999111002', 'asesor1@demo.pe', 'Asesor Comercial', 'Mz A Lt 10', 'La Libertad', 'Trujillo', 'Huanchaco', 'ACTIVO'),
  ('30000000-0000-0000-0000-000000000003', 'DNI', '70000003', 'Erwin', 'Sanchez', '999111003', 'asesor2@demo.pe', 'Asesor Comercial', 'Mz B Lt 11', 'La Libertad', 'Trujillo', 'Moche', 'ACTIVO'),
  ('30000000-0000-0000-0000-000000000004', 'DNI', '70000004', 'Rosa', 'Lopez', '999111004', 'rosa@demo.pe', 'Independiente', 'Av. America 211', 'La Libertad', 'Trujillo', 'Victor Larco', 'ACTIVO'),
  ('30000000-0000-0000-0000-000000000005', 'DNI', '70000005', 'Luis', 'Torres', '999111005', 'luis@demo.pe', 'Tecnico', 'Av. Peru 320', 'La Libertad', 'Trujillo', 'La Esperanza', 'ACTIVO'),
  ('30000000-0000-0000-0000-000000000006', 'DNI', '70000006', 'Ana', 'Guzman', '999111006', 'ana@demo.pe', 'Comerciante', 'Jr. Bolivar 410', 'La Libertad', 'Trujillo', 'El Porvenir', 'ACTIVO');

insert into {{SCHEMA}}.usuarios (
  id,
  persona_id,
  username,
  pin_hash,
  rol,
  estado
)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'admin', encode(digest('123456', 'sha256'), 'hex'), 'ADMIN', 'ACTIVO'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'asesor.elvin', encode(digest('123456', 'sha256'), 'hex'), 'ASESOR', 'ACTIVO'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'asesor.erwin', encode(digest('123456', 'sha256'), 'hex'), 'ASESOR', 'ACTIVO');

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'lotes'
  ) then
    raise exception 'No existe public.lotes. No se puede sincronizar lotes para el seed.';
  end if;

  if not exists (
    select 1
    from public.lotes
  ) then
    raise exception 'public.lotes no tiene datos. No se puede poblar {{SCHEMA}}.lotes.';
  end if;
end
$$;

with source_lotes as (
  select
    upper(trim(l.id)) as legacy_id,
    nullif(upper(trim(l.mz)), '') as manzana,
    l.lote as numero,
    l.area::numeric(10,2) as area_m2,
    coalesce(l.precio, 0)::numeric(12,2) as precio,
    case
      when upper(coalesce(l.condicion, 'LIBRE')) in ('LIBRE', 'DISPONIBLE') then 'LIBRE'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'SEPARADO' then 'SEPARADO'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'VENDIDO' then 'VENDIDO'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'BLOQUEADO' then 'BLOQUEADO'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'INACTIVO' then 'INACTIVO'::{{SCHEMA}}.estado_lote_enum
      else 'LIBRE'::{{SCHEMA}}.estado_lote_enum
    end as estado_comercial,
    nullif(trim(l.comentario), '') as observaciones,
    row_number() over (
      partition by upper(trim(l.id))
      order by coalesce(l.updated_at, l.created_at, now()) desc
    ) as rn_by_id,
    row_number() over (
      partition by nullif(upper(trim(l.mz)), ''), l.lote
      order by coalesce(l.updated_at, l.created_at, now()) desc, upper(trim(l.id)) desc
    ) as rn_by_slot
  from public.lotes l
  where l.id is not null
    and btrim(l.id) <> ''
    and l.lote is not null
), normalized as (
  select
    (
      substr(md5('lote:' || legacy_id), 1, 8) || '-' ||
      substr(md5('lote:' || legacy_id), 9, 4) || '-' ||
      substr(md5('lote:' || legacy_id), 13, 4) || '-' ||
      substr(md5('lote:' || legacy_id), 17, 4) || '-' ||
      substr(md5('lote:' || legacy_id), 21, 12)
    )::uuid as id,
    '20000000-0000-0000-0000-000000000001'::uuid as proyecto_id,
    legacy_id as codigo,
    manzana,
    numero,
    area_m2,
    precio as precio_lista,
    round(precio * 0.92, 2)::numeric(12,2) as precio_minimo,
    precio as precio_referencial,
    estado_comercial,
    'PEN'::text as moneda,
    observaciones
  from source_lotes
  where rn_by_id = 1
    and rn_by_slot = 1
)
insert into {{SCHEMA}}.lotes (
  id,
  proyecto_id,
  codigo,
  manzana,
  numero,
  area_m2,
  precio_lista,
  precio_minimo,
  precio_referencial,
  estado_comercial,
  moneda,
  observaciones
)
select
  id,
  proyecto_id,
  codigo,
  manzana,
  numero,
  area_m2,
  precio_lista,
  precio_minimo,
  precio_referencial,
  estado_comercial,
  moneda,
  observaciones
from normalized
order by manzana nulls last, numero nulls last, codigo;

do $$
declare
  v_lotes integer;
begin
  select count(*) into v_lotes from {{SCHEMA}}.lotes;
  if v_lotes < 3 then
    raise exception 'Se requieren al menos 3 lotes para seed transaccional; encontrados: %', v_lotes;
  end if;
end
$$;

with ranked_lotes as (
  select
    l.id,
    l.proyecto_id,
    coalesce(l.precio_referencial, l.precio_lista, 0)::numeric(12,2) as precio,
    row_number() over (order by l.manzana nulls last, l.numero nulls last, l.codigo) as rn
  from {{SCHEMA}}.lotes l
), seed_ventas as (
  select
    1 as rn,
    '60000000-0000-0000-0000-000000000001'::uuid as venta_id,
    '30000000-0000-0000-0000-000000000004'::uuid as titular_persona_id,
    '40000000-0000-0000-0000-000000000002'::uuid as asesor_usuario_id,
    'VTA-AM2-0001'::text as codigo_venta,
    'SEPARADO'::{{SCHEMA}}.etapa_venta_enum as etapa_venta,
    'ACTIVO'::{{SCHEMA}}.estado_registro_enum as estado_registro,
    (current_date - interval '12 day')::date as fecha_venta,
    (current_date - interval '12 day')::date as fecha_separacion,
    null::date as fecha_contrato,
    3000::numeric(12,2) as monto_separacion,
    10000::numeric(12,2) as monto_inicial,
    24::integer as cuotas,
    24::integer as plazo_meses,
    'Venta en separacion activa'::text as observaciones
  union all
  select
    2,
    '60000000-0000-0000-0000-000000000002'::uuid,
    '30000000-0000-0000-0000-000000000005'::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    'VTA-AM2-0002',
    'COMPLETADO'::{{SCHEMA}}.etapa_venta_enum,
    'ACTIVO'::{{SCHEMA}}.estado_registro_enum,
    (current_date - interval '65 day')::date,
    (current_date - interval '65 day')::date,
    (current_date - interval '60 day')::date,
    3000::numeric(12,2),
    12000::numeric(12,2),
    18,
    18,
    'Venta completada'
  union all
  select
    3,
    '60000000-0000-0000-0000-000000000003'::uuid,
    '30000000-0000-0000-0000-000000000006'::uuid,
    '40000000-0000-0000-0000-000000000002'::uuid,
    'VTA-AM2-0003',
    'ANULADO'::{{SCHEMA}}.etapa_venta_enum,
    'ANULADO'::{{SCHEMA}}.estado_registro_enum,
    (current_date - interval '30 day')::date,
    (current_date - interval '30 day')::date,
    null::date,
    2000::numeric(12,2),
    5000::numeric(12,2),
    24,
    24,
    'Venta anulada para prueba'
)
insert into {{SCHEMA}}.ventas (
  id,
  proyecto_id,
  lote_id,
  cliente_titular_persona_id,
  asesor_usuario_id,
  codigo_venta,
  etapa_venta,
  estado_registro,
  fecha_venta,
  fecha_separacion,
  fecha_contrato,
  precio_lote,
  monto_separacion_pactado,
  monto_inicial_pactado,
  monto_financiado_pactado,
  numero_cuotas_pactadas,
  monto_cuota_referencial,
  plazo_meses,
  moneda,
  observaciones
)
select
  sv.venta_id,
  rl.proyecto_id,
  rl.id,
  sv.titular_persona_id,
  sv.asesor_usuario_id,
  sv.codigo_venta,
  sv.etapa_venta,
  sv.estado_registro,
  sv.fecha_venta,
  sv.fecha_separacion,
  sv.fecha_contrato,
  rl.precio as precio_lote,
  sv.monto_separacion as monto_separacion_pactado,
  sv.monto_inicial as monto_inicial_pactado,
  greatest(rl.precio - sv.monto_separacion - sv.monto_inicial, 0)::numeric(12,2) as monto_financiado_pactado,
  sv.cuotas as numero_cuotas_pactadas,
  case when sv.cuotas > 0 then round(greatest(rl.precio - sv.monto_separacion - sv.monto_inicial, 0) / sv.cuotas, 2) else 0 end::numeric(12,2) as monto_cuota_referencial,
  sv.plazo_meses,
  'PEN',
  sv.observaciones
from seed_ventas sv
join ranked_lotes rl on rl.rn = sv.rn;

insert into {{SCHEMA}}.ventas_clientes (
  id,
  venta_id,
  persona_id,
  rol_en_venta,
  es_titular,
  observacion,
  agregado_por_usuario_id,
  autorizado_por_usuario_id,
  fecha_autorizacion,
  motivo_autorizacion
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004',
    'TITULAR',
    true,
    'Titular principal',
    '40000000-0000-0000-0000-000000000002',
    null,
    null,
    null
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000005',
    'TITULAR',
    true,
    'Titular principal',
    '40000000-0000-0000-0000-000000000003',
    null,
    null,
    null
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000006',
    'CONYUGE',
    false,
    'Vinculacion adicional aprobada por admin',
    '40000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000001',
    now() - interval '59 day',
    'Registro de conyuge en venta completada'
  );

insert into {{SCHEMA}}.pagos (
  id,
  venta_id,
  tipo_pago,
  concepto,
  fecha_pago,
  monto,
  forma_pago,
  numero_operacion,
  moneda,
  observaciones,
  registrado_por_usuario_id,
  estado_registro
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'SEPARACION',
    'Separacion inicial',
    current_date - interval '12 day',
    3000,
    'YAPE',
    'YAPE-001',
    'PEN',
    'Separacion recibida',
    '40000000-0000-0000-0000-000000000002',
    'ACTIVO'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    'INICIAL',
    'Inicial parcial',
    current_date - interval '8 day',
    6000,
    'TRANSFERENCIA',
    'TRX-001',
    'PEN',
    'Pago de inicial parcial',
    '40000000-0000-0000-0000-000000000002',
    'ACTIVO'
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000002',
    'SEPARACION',
    'Separacion',
    current_date - interval '65 day',
    3000,
    'EFECTIVO',
    'EFE-100',
    'PEN',
    'Separacion completa',
    '40000000-0000-0000-0000-000000000003',
    'ACTIVO'
  ),
  (
    '80000000-0000-0000-0000-000000000004',
    '60000000-0000-0000-0000-000000000002',
    'INICIAL',
    'Inicial',
    current_date - interval '60 day',
    12000,
    'TRANSFERENCIA',
    'TRX-200',
    'PEN',
    'Inicial completa',
    '40000000-0000-0000-0000-000000000003',
    'ACTIVO'
  ),
  (
    '80000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000002',
    'CUOTA',
    'Pago total restante',
    current_date - interval '5 day',
    67000,
    'DEPOSITO',
    'DEP-300',
    'PEN',
    'Cancelacion total',
    '40000000-0000-0000-0000-000000000003',
    'ACTIVO'
  );

insert into {{SCHEMA}}.autorizaciones_admin (
  id,
  usuario_admin_id,
  usuario_solicitante_id,
  accion,
  tabla_objetivo,
  registro_objetivo_id,
  motivo,
  fecha_autorizacion
)
values
  (
    '90000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'AGREGAR_VINCULACION_VENTA_PERSONA',
    'ventas_clientes',
    '70000000-0000-0000-0000-000000000003',
    'Se autoriza incluir conyuge en venta completada',
    now() - interval '59 day'
  );

-- Keep lot values aligned to public source after transactional sample inserts.
with source_lotes as (
  select
    upper(trim(l.id)) as legacy_id,
    l.area::numeric(10,2) as area_m2,
    coalesce(l.precio, 0)::numeric(12,2) as precio,
    case
      when upper(coalesce(l.condicion, 'LIBRE')) in ('LIBRE', 'DISPONIBLE') then 'LIBRE'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'SEPARADO' then 'SEPARADO'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'VENDIDO' then 'VENDIDO'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'BLOQUEADO' then 'BLOQUEADO'::{{SCHEMA}}.estado_lote_enum
      when upper(coalesce(l.condicion, 'LIBRE')) = 'INACTIVO' then 'INACTIVO'::{{SCHEMA}}.estado_lote_enum
      else 'LIBRE'::{{SCHEMA}}.estado_lote_enum
    end as estado_comercial,
    nullif(trim(l.comentario), '') as observaciones,
    row_number() over (
      partition by upper(trim(l.id))
      order by coalesce(l.updated_at, l.created_at, now()) desc
    ) as rn_by_id
  from public.lotes l
  where l.id is not null
    and btrim(l.id) <> ''
)
update {{SCHEMA}}.lotes d
set
  area_m2 = s.area_m2,
  precio_lista = s.precio,
  precio_minimo = round(s.precio * 0.92, 2)::numeric(12,2),
  precio_referencial = s.precio,
  estado_comercial = s.estado_comercial,
  observaciones = s.observaciones,
  updated_at = now()
from source_lotes s
where s.rn_by_id = 1
  and d.codigo = s.legacy_id;