# Indice de Documentacion del Proyecto

Actualizado: `2026-03-23`

## Estructura

### Fuente de verdad

- `1_esquema_bd.md`: modelo de datos aplicado
- `2_reglas_negocio.md`: reglas funcionales y permisos
- `3_arquitectura.md`: arquitectura base de la aplicacion y patrones compartidos
- `3-1_arq_ventas.md`: flujo real del modulo ventas
- `3-2_arq_dashboards.md`: arquitectura aplicada de dashboards

### Planes

- `4_planes.md`: backlog padre de frontend y modulos dependientes
- `4-1_plan_ventas.md`: backlog operativo de ventas
- `4-2_plan_dashboards.md`: backlog de dashboards

### Exploracion previa

- `5_correcciones_ideas.md`: correcciones e ideas aun no priorizadas

### Operacion

- `0-1_guia_ramas.md`: flujo de ramas y merges

## Regla de uso

- lo aplicado va a fuente de verdad
- lo pendiente va al plan del modulo
- lo aun no priorizado va a `5_correcciones_ideas.md`

## Regla para cambios de BD

Si el cambio esta propuesto:

- documentarlo primero en el plan del modulo afectado

Si el cambio ya fue aplicado:

- actualizar `1_esquema_bd.md`
- actualizar `2_reglas_negocio.md` si cambia la logica
- actualizar `3-1_arq_ventas.md`, `3-2_arq_dashboards.md` o `3_arquitectura.md` si cambia el flujo real
