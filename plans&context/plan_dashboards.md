## Dashboard v1 (SQL + Backend) - Plan de Implementacion

### Resumen
Este documento define el plan de implementacion del dashboard v1 solo para `SQL` y `backend`.

No incluye trabajo de frontend en esta etapa.

El dashboard se construira para dos roles:
- `admin`
- `asesor`

Nota de negocio:
- En interfaz y conversaciones de producto puede usarse `vendedor`.
- En backend y base de datos hoy el termino consistente es `asesor`.

Regla clave ya validada:
- El inventario de `lotes` es global.
- Un lote no se asigna a un asesor desde el inicio.
- La relacion `lote <-> asesor` nace cuando existe una `venta`.

Por eso:
- Las metricas de inventario pertenecen al dashboard `admin`.
- Las metricas del asesor salen de `ventas`, `pagos`, `clientes/personas` y su cartera activa.

---

### Realidad actual del sistema

El plan debe apoyarse en el esquema comercial nuevo ya aplicado en `dev`, no en el modelo legacy.

Tablas base relevantes:
- `empresas`
- `proyectos`
- `lotes`
- `personas`
- `usuarios`
- `ventas`
- `ventas_clientes`
- `pagos`

Tambien existe `autorizaciones_admin`, pero queda fuera del alcance del dashboard v1.

El backend ya cuenta con:
- autenticacion por `/api/auth/login`
- endpoints operativos para `lotes`
- endpoints operativos para `ventas`
- endpoints operativos para `pagos`
- endpoints operativos para `usuarios`

Lo que falta es la capa especifica de dashboard:
- consultas agregadas SQL
- servicio backend para dashboard
- endpoints `/api/dashboard/*`
- contratos de respuesta estables para frontend

Importante:
- Este plan debe seguir el esquema real actual.
- Si alguna definicion de otros documentos no coincide con el schema aplicado, prevalece el schema actual de `dev`.

---

### Objetivo tecnico

Construir una capa de dashboard reusable y estable, dividida en dos niveles:

1. `SQL`
- responsable de agregaciones, joins, series temporales, rankings y resumenes

2. `Backend`
- responsable de autenticacion, autorizacion por rol, validacion de filtros, contratos HTTP y manejo uniforme de errores

No se recomienda implementar el dashboard "solo en frontend consultando tablas" en esta etapa, porque la aplicacion ya esta montada alrededor de un backend Node propio y necesitamos un contrato estable por rol.

---

### Definiciones que deben quedar fijas antes de implementar

#### Metricas admin
- `inventario_total`: cantidad total de lotes
- `lotes_disponibles`: lotes con estado disponible/libre
- `lotes_separados`: lotes en separacion o estado equivalente
- `lotes_vendidos`: lotes vendidos o cerrados comercialmente
- `ventas_activas`: ventas no anuladas y no cerradas como caidas
- `monto_vendido`: suma de montos de venta validos segun filtro
- `monto_cobrado`: suma real de `pagos`
- `saldo_pendiente_global`: saldo vivo de ventas activas
- `ticket_promedio_venta`: `monto_vendido / cantidad_ventas_validas`
- `asesor_top_periodo`: asesor con mejor desempeno segun metrica definida

#### Metricas asesor
- `mis_ventas_activas`
- `mis_separaciones`
- `mi_monto_vendido`
- `mi_monto_cobrado`
- `saldo_pendiente_mi_cartera`
- `ticket_promedio_venta`
- `clientes_activos`
- `mayor_venta`

#### Reglas de calculo recomendadas
- `monto_cobrado` sale de `pagos`, no de `ventas`
- `ticket_promedio_venta` se calcula sobre ventas validas del periodo
- `saldo_pendiente` sale de la venta viva, no de estimaciones frontend
- `mis operaciones por etapa` se mide por cantidad de operaciones, no por monto

#### Fuera de alcance v1
- `autorizaciones_admin`
- mora avanzada
- vencimientos complejos
- funnel historico por cambios de etapa si aun no existe un historial formal de estados

---

### Plan SQL

#### Objetivo SQL
Crear una capa de agregacion que permita alimentar el dashboard sin duplicar logica en backend ni en frontend.

#### Estrategia recomendada
Usar una combinacion de:
- `views` base para joins reutilizables
- `functions` SQL parametrizadas para filtros reales de dashboard

No conviene depender solo de `views` planas, porque el dashboard necesita filtros por:
- rango de fechas
- proyecto
- asesor
- estado de lote
- etapa de venta
- agrupacion temporal
- top N

#### Capa SQL propuesta

##### 1. Views base reutilizables
- `vw_dashboard_ventas_base`
  - une `ventas`, `lotes`, `usuarios`, `proyectos`, `ventas_clientes`, `personas`
  - expone una fila por venta con los campos necesarios para reportes

- `vw_dashboard_pagos_base`
  - une `pagos` con `ventas`, `usuarios`, `lotes`, `proyectos`
  - expone una fila por pago con sus dimensiones principales

Estas views no deben resolver toda la logica del dashboard.
Su objetivo es centralizar joins y nombres de campos.

##### 2. Functions SQL para admin
- `dashboard_admin_kpis(...)`
- `dashboard_admin_series_ventas(...)`
- `dashboard_admin_series_cobros(...)`
- `dashboard_admin_ranking_asesores(...)`
- `dashboard_admin_inventario_estado(...)`
- `dashboard_admin_resumen_asesores(...)`
- `dashboard_admin_ventas_activas(...)`
- `dashboard_admin_operaciones_anuladas(...)`

##### 3. Functions SQL para asesor
- `dashboard_asesor_kpis(...)`
- `dashboard_asesor_series_ventas(...)`
- `dashboard_asesor_series_cobros(...)`
- `dashboard_asesor_operaciones_por_etapa(...)`
- `dashboard_asesor_resumen_operaciones(...)`
- `dashboard_asesor_clientes_activos(...)`
- `dashboard_asesor_pagos_registrados(...)`

#### Filtros SQL que deben soportarse
- `p_from`
- `p_to`
- `p_proyecto_id`
- `p_asesor_id`
- `p_estado_lote`
- `p_etapa_venta`
- `p_tipo_pago`
- `p_group_by`
- `p_top_n`

#### Recomendaciones de implementacion SQL
- Normalizar el manejo de fechas: rango inclusivo controlado desde SQL
- Mantener outputs tipados y estables
- Devolver arreglos o tablas ya ordenadas desde SQL cuando aplique
- Evitar que backend tenga que rearmar agregaciones complejas
- Reusar los triggers ya existentes para que `ventas` mantenga sus totales consistentes

#### Recomendaciones de performance SQL
- Validar indices para filtros mas usados:
- `ventas(fecha_venta)`
- `ventas(asesor_usuario_id)`
- `ventas(lote_id)`
- `ventas(proyecto_id)` si existe en la tabla o si se filtra via join
- `ventas(etapa_venta)`
- `pagos(fecha_pago)`
- `pagos(venta_id)`
- `lotes(proyecto_id)`
- `lotes(estado_comercial)` o equivalente real del schema

- Si un filtro depende siempre de join, evaluar indices compuestos en base a consultas reales
- No crear materialized views en v1 salvo que aparezca un problema real de performance

#### Entregable SQL
Una nueva migracion orientada a analytics, por ejemplo:
- `004_dashboard_analytics.sql`

Esta migracion debe:
- crear las views base
- crear las functions de dashboard
- documentar parametros esperados
- no alterar logica comercial existente

---

### Plan Backend

#### Objetivo backend
Exponer una API de dashboard limpia y estable, montada sobre las agregaciones SQL, con control de rol y filtros consistentes.

#### Estrategia recomendada
El backend no debe recalcular metricas complejas.
Debe actuar como capa de:
- autenticacion
- autorizacion
- validacion
- traduccion de query params a SQL
- normalizacion de respuestas

#### Cambios backend propuestos

##### 1. Nuevo servicio
Crear un servicio dedicado, por ejemplo:
- `backend/lib/dashboardService.mjs`

Responsabilidades:
- invocar functions SQL
- mapear filtros HTTP a parametros SQL
- consolidar respuestas para admin y asesor
- reutilizar `withPgClient` o `withPgTransaction` segun corresponda

##### 2. Nuevos helpers de autorizacion
Separar utilidades para:
- extraer usuario autenticado
- validar rol `ADMIN`
- validar rol `ASESOR`
- forzar que un asesor solo consulte su propia data

##### 3. Nuevos endpoints

###### Admin
- `GET /api/dashboard/admin/kpis`
- `GET /api/dashboard/admin/series-ventas`
- `GET /api/dashboard/admin/series-cobros`
- `GET /api/dashboard/admin/ranking-asesores`
- `GET /api/dashboard/admin/inventario`
- `GET /api/dashboard/admin/resumen-asesores`
- `GET /api/dashboard/admin/ventas-activas`
- `GET /api/dashboard/admin/operaciones-anuladas`

###### Asesor
- `GET /api/dashboard/asesor/kpis`
- `GET /api/dashboard/asesor/series-ventas`
- `GET /api/dashboard/asesor/series-cobros`
- `GET /api/dashboard/asesor/operaciones-por-etapa`
- `GET /api/dashboard/asesor/operaciones`
- `GET /api/dashboard/asesor/clientes`
- `GET /api/dashboard/asesor/pagos`

#### Contrato de filtros HTTP

Parametros recomendados:
- `from`
- `to`
- `proyectoId`
- `asesorId` solo admin
- `estadoLote`
- `etapaVenta`
- `tipoPago`
- `groupBy`
- `topN`
- `page`
- `pageSize`

#### Responsabilidades del backend por endpoint
- validar formato de fechas
- validar enums permitidos
- asignar defaults seguros
- impedir que asesor consulte datos globales
- devolver errores uniformes

#### Contrato de errores
Formato uniforme recomendado:

```json
{
  "error": "Mensaje corto",
  "detail": "Detalle tecnico opcional",
  "code": "CODIGO_OPCIONAL"
}
```

#### Convenciones de respuesta
- montos como `number`
- fechas en ISO8601
- arreglos siempre presentes aunque vengan vacios
- KPIs con cero en lugar de `null` cuando aplique

---

### Orden de implementacion recomendado

#### Fase 1. Cerrar definiciones
- Validar nombres finales de estados reales del schema
- Validar que metricas excluyen o incluyen anuladas de forma consistente
- Confirmar si `clientes_activos` saldra de `personas` + `ventas_clientes`

#### Fase 2. Construir SQL base
- Crear `vw_dashboard_ventas_base`
- Crear `vw_dashboard_pagos_base`
- Crear functions KPI admin y asesor
- Crear functions de series y rankings

#### Fase 3. Exponer backend
- Crear `dashboardService`
- Registrar rutas `/api/dashboard/*`
- Aplicar control de rol
- Definir contratos estables

#### Fase 4. Verificacion
- Probar resultados contra el seed actual de `dev`
- Validar que no haya NaN ni divisiones invalidas
- Validar filtros vacios
- Validar respuestas vacias con arrays vacios y KPIs en cero

---

### Checklist de listo para implementar

#### SQL
- El schema actual ya tiene tablas suficientes
- Ya existen `ventas` y `pagos`
- Ya existen triggers de consistencia comercial
- Falta la capa de analytics de dashboard

#### Backend
- Ya existe autenticacion basica
- Ya existe acceso a lotes, ventas, pagos y usuarios
- Falta el servicio y los endpoints especificos de dashboard

#### Dependencias de negocio
- La regla de "inventario global" ya esta clara
- La regla de "el asesor se relaciona con el lote cuando nace la venta" ya esta clara
- `autorizaciones_admin` queda fuera de v1

---

### Criterios de aceptacion

#### Admin
- Puede consultar inventario global
- Puede consultar ventas globales
- Puede consultar cobros globales
- Puede filtrar por asesor, proyecto, fecha y estado

#### Asesor
- Solo puede consultar sus propias metricas
- Puede ver sus ventas, cobros, clientes y operaciones
- No puede ver ranking global completo salvo decision posterior de negocio

#### Integridad tecnica
- Las metricas de cobro salen de `pagos`
- Las metricas de venta salen de `ventas`
- Los totales y saldos coinciden con el modelo comercial real
- Los endpoints responden estable incluso sin datos

---

### Fuera de alcance de este documento
- Implementacion frontend
- librerias de graficos
- componentes UI
- navegacion de pantallas
- estados visuales

Este plan deja lista la base para que luego frontend consuma datos consistentes y ya filtrados por rol.
