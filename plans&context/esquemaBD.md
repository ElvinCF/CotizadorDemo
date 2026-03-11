# Esquema BD `dev` (fuente: `003_full_commercial_model.sql`)

Este documento resume **exactamente** la estructura creada por la migración:
`backend/supabase/migrations/003_full_commercial_model.sql`.

## 1) Punto clave de la migración
- La migración es **destructiva** en `dev`:
  - `drop schema if exists dev cascade;`
  - `create schema dev;`
- Luego crea todo desde cero: enums, tablas, índices, funciones y triggers.

---

## 2) Enums creados

1. `dev.rol_usuario_enum`: `ADMIN`, `ASESOR`, `CLIENTE`, `SUPERVISOR`
2. `dev.estado_general_enum`: `ACTIVO`, `INACTIVO`
3. `dev.tipo_documento_enum`: `DNI`, `CE`, `PASAPORTE`, `RUC`, `OTRO`
4. `dev.estado_lote_enum`: `LIBRE`, `SEPARADO`, `VENDIDO`, `BLOQUEADO`, `INACTIVO`
5. `dev.etapa_venta_enum`: `SEPARADVO`, `CONTRATO`, `PAGANDO`, `COMPLETADO`, `ANULADO`
6. `dev.estado_registro_enum`: `ACTIVO`, `ANULADO`, `ELIMINADO_LOGICO`
7. `dev.tipo_pago_enum`: `SEPARACION`, `INICIAL`, `CUOTA`, `ABONO_EXTRAORDINARIO`, `AJUSTE`, `DEVOLUCION`
8. `dev.forma_pago_enum`: `EFECTIVO`, `TRANSFERENCIA`, `YAPE`, `PLIN`, `DEPOSITO`, `TARJETA`, `OTRO`
9. `dev.rol_en_venta_enum`: `TITULAR`, `CONYUGE`, `CONVIVIENTE`, `COTITULAR`, `GARANTE`, `FAMILIAR`, `OTRO`
10. `dev.accion_admin_enum`: `AGREGAR_VINCULACION_VENTA_PERSONA`, `QUITAR_VINCULACION_VENTA_PERSONA`, `LIBERAR_LOTE`, `ANULAR_VENTA`, `EDITAR_PAGO`, `REASIGNAR_VENTA`

---

## 3) Tablas y propósito

## `dev.personas`
Maestro de personas (clientes, usuarios internos, relacionados de venta).

Campos relevantes:
- `id` UUID PK
- `tipo_documento`, `numero_documento` (unique compuesto)
- `nombres`, `apellidos`
- datos de contacto/ubicación
- `estado`, `created_at`, `updated_at`

Constraints:
- `personas_documento_unique (tipo_documento, numero_documento)`

## `dev.usuarios`
Acceso y rol interno.

Campos relevantes:
- `id` UUID PK
- `persona_id` FK a `personas`
- `username` unique
- `pin_hash` (obligatorio)
- `rol` enum, `estado`
- timestamps

Constraints:
- `usuarios_username_unique (username)`
- `usuarios_persona_unique (persona_id)`

## `dev.empresas`
Empresa propietaria/comercial.

Campos:
- `id` UUID PK
- `razon_social`, `nombre_comercial`, `ruc` (unique)
- contacto, estado, timestamps

## `dev.proyectos`
Proyecto inmobiliario.

Campos:
- `id` UUID PK
- `empresa_id` FK
- `nombre`, `codigo`, ubicación, estado, fechas comerciales

Constraint:
- `proyectos_empresa_codigo_unique (empresa_id, codigo)`

## `dev.lotes`
Inventario comercial de lotes.

Campos:
- `id` UUID PK
- `proyecto_id` FK
- `codigo`
- `manzana`, `numero`
- `area_m2`
- `precio_lista`, `precio_minimo`, `precio_referencial`
- `estado_comercial`, `moneda`, `observaciones`
- timestamps

Constraints:
- `lotes_proyecto_codigo_unique (proyecto_id, codigo)`
- `lotes_proyecto_manzana_numero_unique (proyecto_id, manzana, numero)`

## `dev.ventas`
Operación comercial principal sobre lote.

Campos:
- `id` UUID PK
- `proyecto_id`, `lote_id` FKs
- `cliente_titular_persona_id` FK
- `asesor_usuario_id` FK
- `codigo_venta` unique
- `etapa_venta`, `estado_registro`
- fechas (`fecha_venta`, `fecha_separacion`, `fecha_contrato`)
- montos pactados y de control (`pagado_total`, `saldo_pendiente`)
- `moneda`, `observaciones`, timestamps

Checks:
- `ventas_precio_lote_check (precio_lote >= 0)`
- `ventas_totales_check (pagado_total >= 0 and saldo_pendiente >= 0)`

## `dev.ventas_clientes`
Tabla puente entre venta y personas relacionadas.

Campos:
- `id` UUID PK
- `venta_id` FK (cascade delete)
- `persona_id` FK
- `rol_en_venta`, `es_titular`
- datos de autorización (`agregado_por`, `autorizado_por`, `fecha_autorizacion`, `motivo`)
- timestamps

Constraint:
- `ventas_clientes_unique (venta_id, persona_id, rol_en_venta)`

## `dev.pagos`
Movimientos de pago de una venta.

Campos:
- `id` UUID PK
- `venta_id` FK (cascade delete)
- `tipo_pago`, `forma_pago`, `estado_registro`
- `fecha_pago`, `monto`
- `registrado_por_usuario_id` FK
- `numero_operacion`, `observaciones`, timestamps

Check:
- `pagos_monto_check (monto >= 0)`

## `dev.autorizaciones_admin`
Auditoría de autorizaciones de acciones sensibles.

Campos:
- `id` UUID PK
- `usuario_admin_id` FK
- `usuario_solicitante_id` FK
- `accion`
- `tabla_objetivo`, `registro_objetivo_id`
- `motivo`, `fecha_autorizacion`, timestamps

---

## 4) Relaciones (resumen)

- `usuarios.persona_id -> personas.id`
- `proyectos.empresa_id -> empresas.id`
- `lotes.proyecto_id -> proyectos.id`
- `ventas.proyecto_id -> proyectos.id`
- `ventas.lote_id -> lotes.id`
- `ventas.cliente_titular_persona_id -> personas.id`
- `ventas.asesor_usuario_id -> usuarios.id`
- `ventas_clientes.venta_id -> ventas.id`
- `ventas_clientes.persona_id -> personas.id`
- `pagos.venta_id -> ventas.id`
- `pagos.registrado_por_usuario_id -> usuarios.id`
- `autorizaciones_admin.usuario_admin_id -> usuarios.id`
- `autorizaciones_admin.usuario_solicitante_id -> usuarios.id`

---

## 5) Índices importantes

Índices de rendimiento:
- `idx_personas_numero_documento`
- `usuarios_username_unique_idx` (sobre `lower(username)`)
- `idx_usuarios_persona_id`
- `idx_proyectos_empresa_id`
- `idx_lotes_proyecto_id`
- `idx_ventas_lote_id`
- `idx_ventas_cliente_titular_persona_id`
- `idx_ventas_asesor_usuario_id`
- `idx_ventas_etapa_venta`
- `idx_ventas_clientes_venta_id`
- `idx_ventas_clientes_persona_id`
- `idx_pagos_venta_id`
- `idx_pagos_fecha_pago`
- `idx_pagos_tipo_pago`

Regla comercial fuerte (única venta activa por lote):
- `ventas_lote_activa_unique_idx` parcial:
  - `estado_registro = ACTIVO`
  - `etapa_venta in (SEPARADO, CONTRATO, PAGANDO)`

---

## 6) Funciones y procedimientos

## Funciones de timestamps
- `dev.set_updated_at()`  
  Actualiza `updated_at` en triggers `before update`.

## Normalización de ventas
- `dev.normalize_venta_totals()`  
  Antes de insertar/actualizar una venta:
  - normaliza `pagado_total`/`saldo_pendiente`
  - completa fechas por etapa (`fecha_separacion`, `fecha_contrato`)

## Recalcular totales
- `dev.recalcular_totales_venta(p_venta_id uuid)`  
  Suma pagos activos y recalcula:
  - `ventas.pagado_total`
  - `ventas.saldo_pendiente`

## Trigger para pagos
- `dev.trg_pagos_recalcular_venta()`  
  En insert/update/delete de `pagos`, invoca `recalcular_totales_venta`.

## Sincronizar estado de lote
- `dev.sincronizar_estado_lote(p_lote_id uuid)`  
  Regla:
  - si hay venta activa (`SEPARADO|CONTRATO|PAGANDO`) => lote `SEPARADO`
  - si no hay activa pero hay `COMPLETADO` => lote `VENDIDO`
  - si no hay ninguna => lote `LIBRE`

## Trigger para ventas
- `dev.trg_ventas_sync_lote()`  
  En insert/update/delete de `ventas`, sincroniza estado del lote.

## Procedure de precios masivos
- `dev.sp_actualizar_precios_disponibles(p_tipo_ajuste text, p_valor_ajuste numeric) returns integer`  
  Ajusta solo lotes `LIBRE`:
  - por monto o porcentaje
  - impacta `precio_lista` y `precio_referencial`
  - retorna cantidad de filas actualizadas

---

## 7) Triggers instalados

- `trg_personas_updated_at`
- `trg_usuarios_updated_at`
- `trg_empresas_updated_at`
- `trg_proyectos_updated_at`
- `trg_lotes_updated_at`
- `trg_ventas_updated_at`
- `trg_ventas_normalize_totals`
- `trg_ventas_sync_lote`
- `trg_ventas_clientes_updated_at`
- `trg_pagos_updated_at`
- `trg_pagos_recalcular_venta`
- `trg_autorizaciones_admin_updated_at`

---

## 8) Reglas de negocio ya “codificadas” en BD

1. Una venta activa por lote (índice parcial único).
2. Totales de venta y saldo se recalculan por pagos.
3. Estado comercial del lote se sincroniza automáticamente por estado de venta.
4. Montos negativos no permitidos en `ventas`/`pagos` (checks).

---

## 9) Nota de compatibilidad con app actual

El modelo `003_full_commercial_model.sql` cambia la estructura de `dev.lotes` y `dev.usuarios` respecto al contrato legacy del frontend/backend actual.  
Si se aplica esta migración, backend y frontend deben adaptarse a los nuevos campos antes de usar todos los módulos.

