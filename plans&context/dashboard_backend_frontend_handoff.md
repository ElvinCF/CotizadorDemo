# Dashboard Backend Handoff

Fecha: 2026-03-18

Este documento resume el estado actual del dashboard desde backend para que frontend pueda evaluar impacto, tareas pendientes y puntos de integracion.

## 1. Estado actual

El backend del dashboard ya fue alineado al esquema real activo de `devsimple` en Supabase.

No usa el modelo descartado de:
- `personas`
- `proyectos`
- `asesor_usuario_id`
- `cliente_titular_persona_id`
- `etapa_venta`
- `estado_registro`

Ahora el dashboard trabaja sobre el modelo real:
- `devsimple.usuarios`
- `devsimple.clientes`
- `devsimple.lotes`
- `devsimple.ventas`
- `devsimple.pagos`

La migracion analytics ya fue aplicada en Supabase:
- `dashboard_analytics_v1`

## 2. Backend implementado

### 2.1 Autenticacion

Backend unifico autenticacion del dashboard con el login real del sistema.

Archivos:
- `backend/lib/authService.mjs`
- `api/auth/login.js`

Reglas:
- `ADMIN` puede consumir endpoints `admin`
- `ASESOR` puede consumir endpoints `asesor`
- respuestas de error usan status coherentes desde `errors.mjs`

### 2.2 Capa SQL

Se crearon vistas y funciones SQL orientadas a dashboard.

Archivo:
- `backend/supabase/migrations/003_dashboard_analytics.sql`

Views:
- `vw_dashboard_lotes_base`
- `vw_dashboard_ventas_base`
- `vw_dashboard_pagos_base`

Functions admin:
- `dashboard_admin_kpis`
- `dashboard_admin_series_ventas`
- `dashboard_admin_series_cobros`
- `dashboard_admin_inventario_estado`
- `dashboard_admin_resumen_asesores`
- `dashboard_admin_ranking_asesores`
- `dashboard_admin_ventas_activas`
- `dashboard_admin_operaciones_caidas`

Functions asesor:
- `dashboard_asesor_kpis`
- `dashboard_asesor_series_ventas`
- `dashboard_asesor_series_cobros`
- `dashboard_asesor_operaciones_por_estado`
- `dashboard_asesor_resumen_operaciones`
- `dashboard_asesor_clientes_activos`
- `dashboard_asesor_pagos_registrados`

### 2.3 Capa backend Node

Archivo:
- `backend/lib/dashboardService.mjs`

Responsabilidades:
- validar filtros
- validar enums
- ejecutar funciones SQL
- normalizar `snake_case -> camelCase`
- normalizar campos numericos

### 2.4 Endpoints HTTP

Express local:
- `backend/server.mjs`

Serverless/Vercel:
- `api/dashboard/[scope]/[resource].js`

Esto ya evita la divergencia anterior donde el dashboard solo existia en Express.

## 3. Endpoints disponibles

### 3.1 Admin

- `GET /api/dashboard/admin/kpis`
- `GET /api/dashboard/admin/series-ventas`
- `GET /api/dashboard/admin/series-cobros`
- `GET /api/dashboard/admin/inventario`
- `GET /api/dashboard/admin/resumen-asesores`
- `GET /api/dashboard/admin/ranking-asesores`
- `GET /api/dashboard/admin/ventas-activas`
- `GET /api/dashboard/admin/operaciones-anuladas`

Nota:
- el endpoint conserva la URL `operaciones-anuladas` por compatibilidad HTTP
- internamente backend ya lo resuelve con operaciones `CAIDA`

### 3.2 Asesor

- `GET /api/dashboard/asesor/kpis`
- `GET /api/dashboard/asesor/series-ventas`
- `GET /api/dashboard/asesor/series-cobros`
- `GET /api/dashboard/asesor/operaciones-por-etapa`
- `GET /api/dashboard/asesor/operaciones`
- `GET /api/dashboard/asesor/clientes`
- `GET /api/dashboard/asesor/pagos`

Nota:
- el endpoint HTTP `operaciones-por-etapa` sigue igual por compatibilidad
- internamente ahora refleja `estado_venta`, no un campo `etapa_venta` inexistente

## 4. Autenticacion esperada

Headers:
- `x-auth-user`
- `x-auth-pin`

O por body:
- `auth.username`
- `auth.pin`

Para frontend actual, si ya viene usando `x-auth-user` y `x-auth-pin`, no necesita cambiar eso.

## 5. Filtros soportados

### 5.1 Filtros comunes

- `from`
- `to`
- `asesorId` solo en endpoints admin
- `estadoLote`
- `estadoVenta`
- `page`
- `pageSize`

### 5.2 Filtros adicionales

- `groupBy` en series
- `tipoPago` en series de cobros y pagos
- `metric` en ranking de asesores
- `topN` en ranking

### 5.3 Valores validos

`estadoLote`
- `DISPONIBLE`
- `SEPARADO`
- `VENDIDO`

`estadoVenta`
- `SEPARADA`
- `INICIAL_PAGADA`
- `CONTRATO_FIRMADO`
- `PAGANDO`
- `COMPLETADA`
- `CAIDA`

`tipoPago`
- `SEPARACION`
- `INICIAL`
- `CUOTA`
- `OTRO`

`groupBy`
- `day`
- `week`
- `month`

`metric`
- `monto_vendido`
- `monto_cobrado`
- `ticket_promedio_venta`
- `saldo_pendiente`
- `cantidad_ventas`
- `cartera_activa`
- `mayor_venta`

## 6. Contratos de respuesta

### 6.1 KPIs

Respuesta:

```json
{
  "item": {
    "...": "campos camelCase"
  }
}
```

Admin KPI fields:
- `inventarioTotal`
- `lotesDisponibles`
- `lotesSeparados`
- `lotesVendidos`
- `ventasActivas`
- `montoVendido`
- `montoCobrado`
- `saldoPendienteGlobal`
- `ticketPromedioVenta`
- `asesorTopId`
- `asesorTopUsername`
- `asesorTopNombre`
- `asesorTopMontoVendido`

Asesor KPI fields:
- `misVentasActivas`
- `misSeparaciones`
- `miMontoVendido`
- `miMontoCobrado`
- `saldoPendienteMiCartera`
- `ticketPromedioVenta`
- `clientesActivos`
- `mayorVenta`

### 6.2 Series

Respuesta:

```json
{
  "items": [
    {
      "bucket": "2026-03-01",
      "...": "campos numericos en camelCase"
    }
  ]
}
```

Series ventas:
- `bucket`
- `cantidadVentas`
- `montoVendido`
- `ticketPromedioVenta`

Series cobros:
- `bucket`
- `cantidadPagos`
- `montoCobrado`

### 6.3 Inventario

Respuesta:

```json
{
  "items": [
    {
      "estadoComercial": "DISPONIBLE",
      "cantidad": 117,
      "porcentaje": 56.25
    }
  ]
}
```

### 6.4 Resumen/Ranking de asesores

Campos:
- `asesorId`
- `asesorUsername`
- `asesorNombre`
- `cantidadVentas`
- `montoVendido`
- `montoCobrado`
- `ticketPromedioVenta`
- `carteraActiva`
- `saldoPendiente`
- `mayorVenta`

### 6.5 Ventas activas

Campos:
- `ventaId`
- `fechaVenta`
- `loteId`
- `loteCodigo`
- `clienteId`
- `clienteNombre`
- `clienteDni`
- `asesorId`
- `asesorUsername`
- `asesorNombre`
- `estadoVenta`
- `precioVenta`
- `montoInicialTotal`
- `montoFinanciado`
- `cantidadCuotas`
- `montoCuota`

### 6.6 Operaciones caidas

Campos:
- `ventaId`
- `fechaVenta`
- `loteId`
- `loteCodigo`
- `clienteId`
- `clienteNombre`
- `clienteDni`
- `asesorId`
- `asesorUsername`
- `asesorNombre`
- `estadoVenta`
- `precioVenta`
- `observacion`

### 6.7 Operaciones del asesor

Campos:
- `ventaId`
- `fechaVenta`
- `loteId`
- `loteCodigo`
- `clienteId`
- `clienteNombre`
- `clienteDni`
- `estadoVenta`
- `precioVenta`
- `montoInicialTotal`
- `montoFinanciado`
- `cantidadCuotas`
- `montoCuota`

### 6.8 Clientes del asesor

Campos:
- `clienteId`
- `clienteNombre`
- `clienteDni`
- `operacionesActivas`
- `montoAcumulado`
- `saldoPendiente`
- `ultimaFechaVenta`

### 6.9 Pagos del asesor

Campos:
- `pagoId`
- `ventaId`
- `fechaPago`
- `tipoPago`
- `monto`
- `nroCuota`
- `loteId`
- `loteCodigo`
- `clienteId`
- `clienteNombre`
- `clienteDni`
- `estadoVenta`

### 6.10 Operaciones por estado del asesor

Campos:
- `estadoVenta`
- `cantidad`
- `montoVendido`

## 7. Que ya valida backend

Backend ya valida:
- rol correcto segun endpoint
- fechas validas
- `page` y `pageSize`
- enums validos
- `asesorId` como UUID valido
- `estadoLote` solo sobre estados reales del sistema
- `estadoVenta` solo sobre estados reales del sistema

Frontend no necesita inventar ni transformar estos enums a otros nombres.

## 8. Cosas que frontend debe revisar

### 8.1 Cambiar nombres de filtros si hoy usa los del plan descartado

Si frontend estaba pensando en:
- `etapaVenta`
- `LIBRE`
- `ANULADO`
- `CONTRATO`

eso ya no aplica.

Debe usar:
- `estadoVenta`
- `DISPONIBLE`
- `CAIDA`
- `CONTRATO_FIRMADO`

Compatibilidad parcial:
- backend acepta `etapaVenta` como alias de entrada y lo mapea a `estadoVenta`

Pero frontend no deberia depender de ese alias a futuro.

### 8.2 Revisar labels visuales

Posibles labels UI:
- `SEPARADA` -> `Separada`
- `INICIAL_PAGADA` -> `Inicial pagada`
- `CONTRATO_FIRMADO` -> `Contrato firmado`
- `PAGANDO` -> `Pagando`
- `COMPLETADA` -> `Completada`
- `CAIDA` -> `Caida`

Y para lotes:
- `DISPONIBLE`
- `SEPARADO`
- `VENDIDO`

### 8.3 Manejo de estados vacios

Hay asesores activos sin cartera actual.

Frontend debe soportar:
- KPI en cero
- listas vacias
- series vacias
- ranking o resumen con pocos registros

Sin asumir error.

### 8.4 Paginacion

Los endpoints paginados hoy reciben:
- `page`
- `pageSize`

Pero hoy no devuelven metadata como:
- `total`
- `hasNext`

Frontend debe asumir paginacion simple por ahora o pedir una mejora backend futura si quiere paginacion rica.

### 8.5 Series temporales

`bucket` viene como fecha agrupada.

Frontend debe decidir:
- formato visual
- continuidad de periodos vacios
- si completa huecos sin data

Backend hoy no rellena periodos sin registros.

## 9. Tareas sugeridas para frontend

### Tareas inmediatas

1. Definir cliente API para `/api/dashboard/*`
2. Alinear filtros UI a `estadoLote`, `estadoVenta`, `tipoPago`, `groupBy`
3. Crear mapeos visuales de enums reales
4. Soportar loading, empty states y errores por rol/filtro
5. Consumir shapes reales ya descritos en este documento

### Tareas opcionales

1. Construir tabs separadas para `admin` y `asesor`
2. Separar componentes:
- KPI cards
- charts de series
- tablas de ranking/resumen
- tablas de operaciones
3. Pedir luego metadata de paginacion si la UX la necesita

## 10. Riesgos o limites actuales

1. El backend no devuelve totales de paginacion.
2. Las series no rellenan periodos sin registros.
3. `operaciones-anuladas` conserva nombre legado en URL, pero realmente muestra operaciones `CAIDA`.
4. `operaciones-por-etapa` conserva nombre legado en URL, pero trabaja con `estadoVenta`.

## 11. Recomendacion para frontend

Tomar este documento como contrato operativo inicial.

Si frontend quiere avanzar ya:
- puede construir contra estos endpoints
- puede usar los enums reales ya validados
- no necesita esperar mas cambios backend para comenzar una primera version visual del dashboard

## 12. Archivos backend relevantes

- `backend/lib/authService.mjs`
- `backend/lib/dashboardService.mjs`
- `backend/server.mjs`
- `api/dashboard/[scope]/[resource].js`
- `backend/supabase/migrations/003_dashboard_analytics.sql`
