# Planes de Frontend y Modulos

Actualizado: `2026-03-22`
Rol: `Plan por fases`

## Uso de este documento

Este archivo contiene solo:

- pendientes
- fases
- orden de ejecucion
- estado de aplicacion

La fuente de verdad aplicada vive en:

- `3_arquitectura.md`
- `3-1_arq_ventas.md`
- `3-2_arq_dashboards.md`

## Regla de mantenimiento

Cuando algo ya fue aplicado en codigo:

- se elimina o marca como aplicado aqui
- se documenta en `3_arquitectura.md`

## Backlog por fases

### Fase 1. Cierre del sistema de tablas

Estado: `En curso`

Pendientes:

- unificar completamente la tabla publica de `/`
- terminar de compactar tablas operativas del dashboard
- revisar scroll interno y alturas finales de tablas en mobile y tablet

### Fase 2. Sistema base de formularios

Estado: `Pendiente`

Pendientes:

- crear `TextField`
- crear `NumberField`
- crear `DateField`
- crear `SelectField`
- crear `TextareaField`
- crear `SearchField`
- crear `SegmentedField`
- crear wrappers `FormField`, `FormRow`, `FormSection`, `FormActions`
- estandarizar mensajes, hints y errores

### Fase 3. Migracion de formularios de dominio

Estado: `Pendiente`

Orden propuesto:

1. `LoginForm`
2. `UserForm`
3. `BulkPriceAdjustmentForm`
4. `SalePaymentForm`
5. `SaleClientForm`
6. `SaleForm`

Pendientes:

- unificar estilos de validacion
- unificar estados loading y disabled
- eliminar diferencias visuales entre formularios historicos

### Fase 4. Integracion con modulos dependientes

Estado: `En curso`

Pendientes:

- acompanar al modulo ventas solo en componentes compartidos
- migrar inputs, wrappers y shells que ventas reutilice
- evitar que la logica propia de ventas vuelva a quedar documentada aqui

Nota:

Los backlogs funcionales hijos viven en:

- `4-1_plan_ventas.md`
- `4-2_plan_dashboards.md`

### Fase 5. Consolidacion visual global

Estado: `Pendiente`

Pendientes:

- revisar microinteracciones
- revisar compactacion mobile
- revisar accesibilidad base
- revisar estados vacios y mensajes de error

## Donde documentar un cambio nuevo

### Si es un cambio de arquitectura frontend ya aplicado

Actualizar:

- `3_arquitectura.md`

### Si es una mejora pendiente transversal

Actualizar:

- `4_planes.md`

### Si es una mejora pendiente propia del flujo de ventas

Actualizar:

- `4-1_plan_ventas.md`

### Si el cambio toca base de datos

Si ya fue aprobado y aplicado:

- `1_esquema_bd.md`
- `2_reglas_negocio.md` si cambia la logica

Si aun esta propuesto o pendiente:

- el plan del modulo afectado
- y solo cuando se cierre y aplique pasa a `1_esquema_bd.md`
