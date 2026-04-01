# Diseno Final BD `devsimple`

Este documento resume el diseno final acordado para la base de datos del proyecto, trabajando sobre el esquema `devsimple`.

No es una migracion SQL. Es la definicion funcional y tecnica aprobable antes de tocar la BD.

## 1. Objetivo del modelo

El modelo debe cubrir:

- inventario de lotes visible al publico
- usuarios internos (`ADMIN` y `ASESOR`)
- clientes sin duplicidad por DNI
- ventas con trazabilidad de estado
- pagos reales con fechas independientes
- sincronizacion del estado comercial del lote para el mapa publico

## 2. Esquema de trabajo

- `devsimple`

## 3. Tablas existentes que se mantienen

### `devsimple.lotes`

Tabla de inventario comercial visible al publico.

Columnas actuales relevantes:

- `id uuid pk`
- `manzana text`
- `lote text`
- `area_m2 numeric`
- `precio_referencial numeric`
- `estado_comercial estado_comercial_lote_enum`
- `codigo text unique`
- `created_at timestamptz`
- `updated_at timestamptz`

Indices actuales relevantes:

- `lotes_pkey (id)`
- `lotes_codigo_unique (codigo)`
- `lotes_manzana_lote_unique (manzana, lote)`

### `devsimple.usuarios`

Tabla de usuarios internos.

Columnas actuales relevantes:

- `id uuid pk`
- `username text unique`
- `pin_hash text`
- `rol rol_usuario_enum`
- `nombres text`
- `apellidos text`
- `telefono text nullable`
- `estado estado_general_enum`
- `created_at timestamptz`
- `updated_at timestamptz`

Regla de negocio:

- los asesores salen de esta tabla con `rol = ASESOR`
- no se creara una tabla separada de asesores

## 4. Estados publicos del lote

La tabla `devsimple.lotes.estado_comercial` debe seguir siendo simple para el mapa publico.

Valores:

- `DISPONIBLE`
- `SEPARADO`
- `VENDIDO`

## 5. Regla de sincronizacion de `lotes.estado_comercial`

El lote visible al publico se sincroniza segun la venta activa:

- `SEPARADA` -> `SEPARADO`
- `INICIAL_PAGADA` -> `VENDIDO`
- `CONTRATO_FIRMADO` -> `VENDIDO`
- `PAGANDO` -> `VENDIDO`
- `COMPLETADA` -> `VENDIDO`
- `CAIDA` o sin venta activa -> `DISPONIBLE`

Nota:

- a nivel publico, `VENDIDO` significa "ya no disponible para venta", no necesariamente "pagado al 100%"

## 6. Nuevas tablas

### `devsimple.clientes`

Objetivo:

- registrar clientes sin duplicidad
- encontrar cliente por DNI antes de crear una venta

Columnas:

- `id uuid pk default gen_random_uuid()`
- `nombre_completo text not null`
- `dni text not null unique`
- `celular text null`
- `direccion text null`
- `ocupacion text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Restricciones sugeridas:

- `char_length(trim(nombre_completo)) >= 2`
- `dni unique`

Indices sugeridos:

- `clientes_pkey (id)`
- `clientes_dni_key (dni unique)`

### `devsimple.ventas`

Objetivo:

- representar la venta principal
- conectar lote, cliente y asesor
- guardar el snapshot comercial y financiero consolidado

Columnas:

- `id uuid pk default gen_random_uuid()`
- `lote_id uuid null`
- `cliente_id uuid null`
- `cliente2_id uuid null`
- `asesor_id uuid null`
- `fecha_venta timestamptz not null default now()`
- `fecha_pago_pactada date null`
- `precio_venta numeric not null default 0`
- `estado_venta venta_estado_enum not null default 'SEPARADA'`
- `tipo_financiamiento tipo_financiamiento_enum not null default 'REDUCIR_CUOTA'`
- `monto_inicial_total numeric not null`
- `monto_financiado numeric not null default 0`
- `cantidad_cuotas integer not null default 12`
- `monto_cuota numeric not null default 0`
- `observacion text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relaciones:

- `lote_id -> devsimple.lotes(id)`
- `cliente_id -> devsimple.clientes(id)`
- `cliente2_id -> devsimple.clientes(id)`
- `asesor_id -> devsimple.usuarios(id)`

Reglas:

- en la captura parcial actual, `fecha_venta` es el unico minimo tecnico obligatorio
- `lote_id`, `cliente_id` y `asesor_id` pueden quedar nulos mientras el expediente sigue incompleto
- `monto_inicial_total` es la suma de pagos tipo `SEPARACION` + `INICIAL`
- `monto_financiado` se calcula a partir del precio de venta menos el inicial total
- `cliente2_id` es opcional y representa cotitular o conyuge de la venta
- `cliente2_id` no puede ser igual a `cliente_id`
- `fecha_pago_pactada` es la fecha contractual objetivo de pago de cuota y es editable
- la venta no se elimina si cae
- el motivo de una venta caida se guarda en `observacion`

Restricciones sugeridas:

- `precio_venta >= 0`
- `monto_inicial_total >= 0`
- `monto_financiado >= 0`
- `cantidad_cuotas between 1 and 36`
- `monto_cuota >= 0`

Indices sugeridos:

- `ventas_pkey (id)`
- `ventas_lote_id_idx`
- `ventas_cliente_id_idx`
- `ventas_cliente2_id_idx`
- `ventas_asesor_id_idx`
- `ventas_estado_venta_idx`
- `ventas_fecha_venta_idx`

Indice unico parcial muy necesario:

- no permitir dos ventas activas para el mismo lote
- criterio sugerido:
  - unico por `lote_id`
  - solo cuando `estado_venta <> 'CAIDA'`

### `devsimple.pagos`

### `public.venta_lotes` (fase 5 multi-lote)

Objetivo:

- representar la relacion N:N entre expediente de venta y lotes
- habilitar multi-lote sin perder compatibilidad con `ventas.lote_id`

Columnas:

- `id uuid pk default gen_random_uuid()`
- `venta_id uuid not null`
- `lote_id uuid not null`
- `orden integer not null default 1`
- `created_at timestamptz not null default now()`

Relaciones:

- `venta_id -> public.ventas(id) on delete cascade`
- `lote_id -> public.lotes(id)`

Restricciones:

- `unique (venta_id, lote_id)`
- `orden >= 1`
- trigger `trg_venta_lotes_check_activo` usando funcion `check_venta_lote_activo_unico()`
  - bloquea duplicidad de lote en ventas activas (`estado_venta <> 'CAIDA'`)
  - levanta constraint logical: `venta_lotes_lote_activo_unique`

Indices:

- `venta_lotes_venta_id_idx`
- `venta_lotes_lote_id_idx`
- `venta_lotes_venta_orden_idx`

Nota de compatibilidad:

- `ventas.lote_id` se mantiene como espejo legado temporal (primer lote del expediente)
- la logica nueva de backend usa `venta_lotes` como fuente primaria

Objetivo:

- registrar los pagos reales de cada venta
- permitir que separacion e inicial tengan fechas distintas

Columnas:

- `id uuid pk default gen_random_uuid()`
- `venta_id uuid not null`
- `fecha_pago timestamptz not null default now()`
- `tipo_pago pago_tipo_enum not null`
- `monto numeric not null`
- `nro_cuota integer null`
- `observacion text null`
- `created_at timestamptz not null default now()`

Relaciones:

- `venta_id -> devsimple.ventas(id)`

Reglas:

- `SEPARACION` e `INICIAL` son filas reales en pagos
- `CUOTA` representa pagos de cuotas del financiamiento
- `OTRO` cubre ajustes u otros movimientos necesarios
- `nro_cuota` solo aplica cuando `tipo_pago = CUOTA`

Restricciones sugeridas:

- `monto > 0`
- `nro_cuota >= 1` cuando no sea null

Indices sugeridos:

- `pagos_pkey (id)`
- `pagos_venta_id_idx`
- `pagos_fecha_pago_idx`
- `pagos_tipo_pago_idx`
- opcional: `pagos_venta_id_nro_cuota_idx`

### `devsimple.venta_estado_historial`

Objetivo:

- trazabilidad maxima de cambios de estado de la venta

Columnas:

- `id uuid pk default gen_random_uuid()`
- `venta_id uuid not null`
- `estado_anterior venta_estado_enum null`
- `estado_nuevo venta_estado_enum not null`
- `usuario_id uuid not null`
- `fecha_cambio timestamptz not null default now()`

Relaciones:

- `venta_id -> devsimple.ventas(id)`
- `usuario_id -> devsimple.usuarios(id)`

Reglas:

- no lleva columna `observacion`
- es tabla de auditoria, no de narrativa

Indices sugeridos:

- `venta_estado_historial_pkey (id)`
- `venta_estado_historial_venta_id_idx`
- `venta_estado_historial_usuario_id_idx`
- `venta_estado_historial_fecha_cambio_idx`

## 7. Enums nuevos propuestos

### `devsimple.venta_estado_enum`

Valores y orden:

- `SEPARADA`
- `INICIAL_PAGADA`
- `CONTRATO_FIRMADO`
- `PAGANDO`
- `COMPLETADA`
- `CAIDA`

### `devsimple.tipo_financiamiento_enum`

Valores:

- `REDUCIR_CUOTA`
- `REDUCIR_MESES`

### `devsimple.pago_tipo_enum`

Valores:

- `SEPARACION`
- `INICIAL`
- `CUOTA`
- `OTRO`

## 8. Logica financiera cerrada

### 8.1. Regla base

Siempre:

- `monto_inicial_total = suma(pagos tipo SEPARACION + INICIAL)`
- `monto_financiado = precio_venta - monto_inicial_total`

### 8.2. Si `tipo_financiamiento = REDUCIR_CUOTA`

El usuario define:

- `cantidad_cuotas`

El backend recalcula:

- `monto_cuota = monto_financiado / cantidad_cuotas`

Se guarda en `ventas`:

- `tipo_financiamiento`
- `cantidad_cuotas`
- `monto_cuota`
- `monto_financiado`

### 8.3. Si `tipo_financiamiento = REDUCIR_MESES`

El usuario define:

- `monto_cuota`

El backend recalcula:

- `cantidad_cuotas = ceil(monto_financiado / monto_cuota)`

Se guarda en `ventas`:

- `tipo_financiamiento`
- `cantidad_cuotas`
- `monto_cuota`
- `monto_financiado`

### 8.4. Detalle real de cuotas

El detalle real de cuotas no se guarda como tabla de cronograma en esta etapa.

Se calcula asi:

- cuotas `1..n-1` = `monto_cuota`
- ultima cuota = `monto_financiado - ((n - 1) * monto_cuota)`

Importante:

- `saldo_final_ultima_cuota` no se guarda en BD
- solo se calcula cuando se necesite mostrarlo

## 9. Reglas de cambio de estado por pagos

### Estado inicial

Cuando se crea la venta y se registra el pago de separacion:

- `ventas.estado_venta = SEPARADA`
- `lotes.estado_comercial = SEPARADO`

### Cambio a `INICIAL_PAGADA`

Cuando ya existe pago tipo `INICIAL`:

- `ventas.estado_venta = INICIAL_PAGADA`
- `lotes.estado_comercial = VENDIDO`

### Cambio a `CONTRATO_FIRMADO`

Cambio manual posterior al pago inicial:

- `INICIAL_PAGADA -> CONTRATO_FIRMADO`
- `lotes.estado_comercial = VENDIDO`

### Cambio a `PAGANDO`

Cuando existe al menos una cuota registrada:

- `ventas.estado_venta = PAGANDO`
- `lotes.estado_comercial = VENDIDO`

### Cambio a `COMPLETADA`

Cuando los pagos acumulados cubren el total comprometido:

- `ventas.estado_venta = COMPLETADA`
- `lotes.estado_comercial = VENDIDO`

### Cambio a `CAIDA`

Solo manual por `ADMIN`:

- `ventas.estado_venta = CAIDA`
- `lotes.estado_comercial = DISPONIBLE`
- la venta no se elimina
- el motivo se registra en `ventas.observacion`

## 10. Flujo frontend/backend para cliente por DNI

### En frontend

En el formulario de separacion:

- primero se busca cliente por `dni`
- si existe, se autocompleta
- si no existe, se prepara alta
- si existe cliente 2, tambien se busca por `dni`

### En backend

Aun asi, el backend debe volver a validar:

- buscar cliente por `dni`
- reutilizarlo si existe
- crearlo si no existe
- buscar cliente 2 por `dni` si fue enviado
- validar que `cliente2_id <> cliente_id`

Esto evita:

- duplicidad por concurrencia
- inconsistencias entre formularios
- errores de integridad

## 11. Flujo backend recomendado al guardar venta/separacion

Todo en una sola transaccion:

1. validar lote y disponibilidad comercial
2. buscar cliente por `dni`
3. crear cliente si no existe
4. buscar cliente 2 por `dni` si aplica
5. crear cliente 2 si no existe
6. crear venta
7. crear pago tipo `SEPARACION`
8. recalcular `monto_inicial_total`
9. recalcular `monto_financiado`
10. recalcular `monto_cuota` o `cantidad_cuotas` segun `tipo_financiamiento`
11. actualizar `lotes.estado_comercial`
12. insertar `venta_estado_historial`

## 12. Cosas que no se guardaran

No se guardaran como columnas o tablas separadas en esta etapa:

- `tipo_operacion`
- `motivo_caida` como columna separada
- `saldo_final_ultima_cuota`
- historial de cambios del plan financiero
- tabla aparte de asesores

## 13. Resumen del modelo final

### Inventario publico

- `lotes`

### Usuarios internos

- `usuarios`

### Personas compradoras

- `clientes`

### Venta principal

- `ventas`

### Movimientos reales de dinero

- `pagos`

### Trazabilidad de estados

- `venta_estado_historial`

## 14. Siguiente paso recomendado

Si este documento queda aprobado, lo siguiente es:

1. redactar la migracion SQL final para `devsimple`
2. definir constraints e indices parciales exactos
3. implementar el flujo backend transaccional
4. adaptar frontend de separacion/proforma a este modelo
