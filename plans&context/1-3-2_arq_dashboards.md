# Arquitectura de Dashboards

Actualizado: `2026-03-22`
Rol: `Fuente de verdad`

## Objetivo

Este documento describe el estado actual aplicado del sistema de dashboards.

Aqui vive:

- alcance funcional vigente
- endpoints reales
- filtros oficiales
- componentes visuales ya usados
- decisiones cerradas de analytics

No vive aqui:

- backlog futuro
- ideas no aplicadas
- fases pendientes

Eso va en `2-1-2_plan_dashboards.md`.

## Dashboards existentes

### Dashboard admin

Enfocado en:

- estado global del proyecto
- ventas
- cobros
- inventario
- asesor comercial
- cobranza y vencimientos
- analisis por manzana

### Dashboard asesor

Enfocado en:

- cartera personal
- ventas propias
- cobros generados
- clientes y pagos relacionados a su gestion

## Fuente de datos

Esquema principal:

- `devsimple`

Tablas base:

- `usuarios`
- `clientes`
- `lotes`
- `ventas`
- `pagos`

## Capa backend vigente

Archivo principal:

- `backend/lib/dashboardService.mjs`

Responsabilidades:

- validar filtros
- validar permisos
- aplicar timezone oficial
- consolidar salida ejecutiva
- construir datasets para KPIs, charts y tablas operativas

## Endpoints actuales

### Admin

- `/api/dashboard/admin/resumen`
- `/api/dashboard/admin/kpis`
- `/api/dashboard/admin/series-ventas`
- `/api/dashboard/admin/series-cobros`
- `/api/dashboard/admin/inventario`
- `/api/dashboard/admin/resumen-asesores`
- `/api/dashboard/admin/ranking-asesores`
- `/api/dashboard/admin/ventas-activas`
- `/api/dashboard/admin/operaciones-anuladas`

### Asesor

- `/api/dashboard/asesor/kpis`
- `/api/dashboard/asesor/series-ventas`
- `/api/dashboard/asesor/series-cobros`
- `/api/dashboard/asesor/operaciones-por-etapa`
- `/api/dashboard/asesor/operaciones`
- `/api/dashboard/asesor/clientes`
- `/api/dashboard/asesor/pagos`

## Decisiones cerradas

### Timezone oficial

- `America/Lima`

### Periodo general

- selector de `año`
- selector de `mes`
- opcion `Todos` permitida en mes

### Precio lista

- usar snapshot de venta cuando exista
- usar lote como fallback compatible

### Vencimientos

- fuente principal: `ventas.fecha_pago_pactada`

### Semantica

- `vendido` y `cobrado` son metricas distintas
- ambas deben verse en paralelo

## Filtros vigentes

### Globales

Aplican segun dashboard y bloque:

- `año`
- `mes`
- `asesor`
- `manzana` cuando corresponde

### Locales

Se aplican solo al card o chart que los contiene:

- agrupacion `dia / semana / mes` para serie de ventas vs cobros
- ranking o metrica local en cards de asesor o manzana cuando corresponde

## KPIs y bloques vigentes

### Resumen general del proyecto

- total de lotes
- total vendidos
- total separados
- total disponibles
- porcentaje de avance de ventas

### Ventas del mes

- cantidad de lotes vendidos
- valor total vendido
- precio promedio
- lote mas caro
- lote mas barato

### Ingresos reales del mes

- total por iniciales
- total por cuotas
- total cobrado
- diferencia vendido vs cobrado

### Rendimiento de asesores

- ranking por monto vendido o cobrado segun bloque
- resumen por asesor
- comparativas de cartera

### Estado por manzana

Comparativo por manzana orientado a:

- valor total del lote
- valor vendido
- valor cobrado

### Cobranza y vencimientos

Secciones operativas:

- hoy
- proximos 7 dias
- vencidos

Con columnas ya usadas:

- cliente
- telefono
- lote
- fecha
- monto
- acceso a venta

## Componentes visuales actuales

- `AdminDashboardStatCard`
- `AdminDashboardLineChart`
- `AdminDashboardBarChart`
- `AdminDashboardDonutChart`
- `AdminDashboardManzanaChart`
- `AdminDashboardRanking`
- `AdminDashboardChartTooltip`

## Reglas de UX vigentes

- KPIs primero
- charts despues
- tablas operativas al final
- filtros compactos arriba
- filtros locales dentro del card cuando afectan solo a ese grafico
- tooltip compacto y consistente
- mobile en una sola columna

## Reglas de performance vigentes

Prioridad actual:

- cargar primero KPIs y resumen ejecutivo
- reducir llamadas redundantes
- evitar auth repetida cuando haya endpoint agregado
- mantener agrupaciones locales donde aportan valor

## Como documentar un cambio nuevo

### Si el cambio ya fue aplicado

Actualizar aqui cuando cambie:

- un endpoint del dashboard
- un KPI
- una regla de filtro
- una fuente de datos
- un comportamiento oficial de charts o tablas del dashboard

### Si el cambio aun no esta aplicado

No entra aqui.

Debe ir a `2-1-2_plan_dashboards.md`.
