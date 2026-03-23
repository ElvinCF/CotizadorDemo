# Plan de Dashboards

Actualizado: `2026-03-22`
Rol: `Plan por fases`

## Uso de este documento

Este archivo contiene solo:

- pendientes
- fases
- orden de construccion
- riesgos operativos

La fuente de verdad aplicada vive en:

- `3-2_arq_dashboards.md`

## Regla de mantenimiento

Cuando algo ya fue aplicado en codigo:

- se elimina o marca como aplicado aqui
- se documenta en `3-2_arq_dashboards.md`

## Backlog por fases

### Fase 1. Cierre del resumen ejecutivo

Estado: `En curso`

Pendientes:

- seguir reduciendo tiempo de carga percibido
- revisar peso de consultas del resumen ejecutivo
- estabilizar del todo el grafico por manzana

### Fase 2. Operacion comercial avanzada

Estado: `En curso`

Pendientes:

- profundizar control de precios y descuentos
- comparar precio lista vs precio cierre por venta
- detectar asesores que venden mas cerca del precio lista
- detectar asesores que aplican mas descuento

### Fase 3. Drill-down y navegacion analitica

Estado: `Pendiente`

Pendientes:

- drill-down por cliente
- drill-down por lote
- drill-down por asesor
- accesos mas directos desde tablas operativas a expedientes reales

### Fase 4. Optimizacion tecnica

Estado: `Pendiente`

Pendientes:

- revisar nuevas oportunidades de consolidacion de endpoints
- revisar cache local o memoizacion donde aporte valor real
- revisar consultas mas pesadas con dataset mayor

### Fase 5. Refinamiento visual y UX

Estado: `Pendiente`

Pendientes:

- seguir refinando compactacion de cards y charts
- revisar legibilidad de tooltips y etiquetas
- revisar mejor jerarquia visual de tablas operativas

## Riesgos abiertos

- crecimiento del dataset y degradacion de consultas pesadas
- dependencia de calidad de `fecha_pago_pactada`
- confundir filtros globales con filtros locales si no se documentan bien

## Donde documentar un cambio nuevo

### Si es una mejora ya aplicada en dashboard

Actualizar:

- `3-2_arq_dashboards.md`

### Si es una mejora pendiente de dashboard

Actualizar:

- `4-2_plan_dashboards.md`

### Si el cambio toca base de datos para soportar analytics

Si ya fue aprobado y aplicado:

- `1_esquema_bd.md`
- `2_reglas_negocio.md` si cambia la logica
- `3-2_arq_dashboards.md` si cambia fuente de datos o endpoint

Si aun esta pendiente:

- `4-2_plan_dashboards.md`
