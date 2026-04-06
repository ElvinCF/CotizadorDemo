# Plan General

Actualizado: `2026-04-06`
Estado: `Vigente`
Ambito: `Plan padre del producto`

## Objetivo

Mantener un backlog formal y corto de las fases abiertas del sistema multiproyecto.

Este archivo no documenta lo ya aplicado en detalle. Para eso viven:

- `1_esquema_bd.md`
- `2_reglas_negocio.md`
- `3_arquitectura.md`

## Criterio de uso

- lo ya implementado sale de este archivo y pasa a documentacion viva
- lo pendiente, aprobado y con direccion clara se queda aqui
- las fases hijas mas profundas viven en:
  - `4-1_plan_ventas.md`
  - `4-2_plan_dashboards.md`

## Fase 1. Estabilizacion Multiproyecto

Estado: `En curso`
Impacto: `Alto`

Pendientes:

- eliminar hardcodes residuales de proyecto o empresa en frontend y backend
- cerrar cualquier fallback que todavia pueda mezclar datos entre proyectos
- dejar todos los endpoints privados filtrando por proyecto resuelto en backend
- terminar el barrido de referencias legacy en rutas antiguas

Entregable:

- aislamiento consistente por `slug` y por sesion

## Fase 2. Configuracion de Proyecto

Estado: `En curso`
Impacto: `Alto`

Pendientes:

- terminar UX de `Branding` e `Interfaz`
- reemplazar JSON crudo por editores visuales donde siga expuesto
- cerrar preview en vivo de paleta sin guardar
- definir que campos quedan editables y cuales no
- mejorar importacion y gestion de assets por etapa

Entregable:

- `/proyecto` usable como centro real de configuracion por proyecto

## Fase 3. Inventario y Lotes

Estado: `En curso`
Impacto: `Alto`

Pendientes:

- crear importador reutilizable de lotes por CSV o Excel
- validar automaticamente coincidencia entre `codigo` y overlay
- terminar herramientas de configuracion masiva de lotes
- definir reglas de actualizacion segura de estados y precios por lote

Entregable:

- alta y mantenimiento de inventario por proyecto sin SQL manual

## Fase 4. Cotizador y Proforma

Estado: `En curso`
Impacto: `Alto`

Pendientes:

- terminar el ajuste manual completo contra configuracion comercial del proyecto
- mejorar microcopy y feedback de limites operativos
- revisar flujo multiselect y cambio masivo de estado desde drawer
- cerrar consistencia entre drawer, proforma, venta y mapa

Entregable:

- cotizador manual sin hardcodes y alineado a reglas del proyecto activo

## Fase 5. Ventas

Estado: `En curso`
Impacto: `Alto`

Detalle operativo:

- ver `4-1_plan_ventas.md`

Pendientes padre:

- terminar integracion del expediente con configuracion comercial del proyecto
- revisar trazabilidad de cambios en ventas y pagos
- evaluar soporte mas robusto para multi-lote sin romper compatibilidad

## Fase 6. Usuarios, Roles y Equipos

Estado: `En curso`
Impacto: `Alto`

Pendientes:

- refinar experiencia de `usuarios` y `equipos` sin recargas visibles
- consolidar permisos visibles por rol en UI
- cerrar validaciones y mensajes de negocio para altas, bajas y reasignaciones
- documentar matriz final de permisos por proyecto

Entregable:

- operacion segura de usuarios por proyecto y equipos internos

## Fase 7. Dashboards

Estado: `En curso`
Impacto: `Medio`

Detalle operativo:

- ver `4-2_plan_dashboards.md`

Pendientes padre:

- revisar filtros, rendimiento y consistencia de KPIs
- terminar coherencia visual entre panel admin y asesor

## Fase 8. Calidad y Despliegue

Estado: `En curso`
Impacto: `Alto`

Pendientes:

- ampliar suite de `Vitest` mas alla del dominio puro
- cubrir `ProjectContext`, cotizador y configuracion de proyecto
- definir checklist minimo antes de deploy
- limpiar archivos residuales y documentacion desactualizada de forma continua

Entregable:

- pipeline minima: `lint + test + build`

## Orden recomendado de ejecucion

1. estabilizacion multiproyecto
2. configuracion de proyecto
3. inventario y lotes
4. cotizador y proforma
5. ventas
6. usuarios y equipos
7. dashboards
8. calidad y despliegue
