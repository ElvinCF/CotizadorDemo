# Arquitectura de Ventas

Actualizado: `2026-03-23`
Rol: `Fuente de verdad`

## Objetivo

Este documento describe el estado actual aplicado del modulo ventas.

Aqui vive:

- flujo real vigente de ventas
- bloques visuales del expediente comercial
- componentes del modulo
- endpoints y acciones operativas reales
- integracion con clientes, pagos, lotes y permisos

No vive aqui:

- ideas futuras
- mejoras aun no priorizadas
- backlog pendiente

Eso va en:

- `2-1-1_plan_ventas.md`
- `3-1_correcciones_ideas.md`

## Alcance actual del modulo

El modulo ventas cubre actualmente:

- listado de ventas
- detalle de una venta
- edicion de datos comerciales de la venta
- edicion de titulares por modal
- registro de pagos por modal
- navegacion desde lotes o mapa hacia una venta
- impresion operativa de separacion y contrato

## Pantallas del modulo

### `/ventas`

Pantalla de listado operativo de ventas.

Incluye:

- tabla operativa
- sort por columna
- acciones por fila
- acceso al detalle

### `/ventas/nueva`

Pantalla de alta de venta.

Actualmente forma parte del flujo comercial del proyecto.

### `/ventas/:ventaId`

Pantalla de expediente de venta.

Incluye:

- bloque editable de venta
- resumen de titulares
- tabla de pagos
- acciones de impresion

## Composicion actual del expediente

Bloques principales:

- encabezado con lote y estado
- bloque de datos editables
- cards de calculo comercial
- card de titulares
- card de pagos

Reglas vigentes:

- clientes se editan por modal
- pagos se editan por modal
- la venta se edita en la pagina principal
- el expediente funciona como registro vivo de la venta

## Integraciones del modulo

### Lotes

- una venta activa impacta el estado comercial del lote
- desde lotes se puede navegar a crear o ver venta

### Clientes

- la venta puede tener titular principal
- la venta puede tener segundo titular opcional

### Pagos

- pagos alimentan calculos y trazabilidad economica
- pagos se muestran en tabla operativa dentro del expediente

### Permisos

- asesor no debe editar ventas ajenas
- admin puede operar con mayor alcance

## Criterio de actualizacion

Actualizar este documento solo cuando el flujo de ventas ya este aplicado en codigo y funcionando como regla vigente.
