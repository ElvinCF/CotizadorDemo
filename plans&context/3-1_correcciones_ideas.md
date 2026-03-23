# Correcciones e Ideas

Actualizado: `2026-03-22`
Rol: `Exploracion previa`

## Uso de este documento

Este archivo no es:

- plan formal
- backlog comprometido
- fuente de verdad

Este archivo si es:

- lista de correcciones detectadas
- ideas de mejora
- oportunidades de producto
- notas previas a priorizacion

## Regla de uso

Todo lo que entre aqui aun debe pasar por evaluacion.

Solo cuando una idea se aprueba:

- pasa a un `plan_*.md` si queda pendiente
- o pasa a un `arq_*.md`, `1-1_esquema_bd.md` o `1-2_reglas_negocio.md` si ya fue aplicada

## Estados sugeridos

Usar solo estos estados dentro de este archivo:

- `Detectado`
- `Idea`
- `Por evaluar`
- `Descartado`
- `Movido a plan`

## Plantilla sugerida

### Titulo corto

Estado: `Idea`
Modulo: `Componentes | Ventas | Dashboards | BD | Operacion`
Impacto: `Alto | Medio | Bajo`

Descripcion:

- que se detecto
- por que importa
- que riesgo o mejora aportaria

Siguiente paso:

- validar
- diseñar
- mover a plan

## Entrada inicial

### Consolidar registro de mejoras futuras

Estado: `Detectado`
Modulo: `Documentacion`
Impacto: `Medio`

Descripcion:

- hacia falta un espacio intermedio entre idea y plan
- esto evita mezclar backlog formal con notas aun no priorizadas

Siguiente paso:

- usar este archivo como embudo previo antes de abrir nuevas fases en los planes

## Correcciones e ideas vigentes

### Dashboard: filtros y toolbar

Estado: `Por evaluar`
Modulo: `Dashboards`
Impacto: `Medio`

Descripcion:

- corregir funcionamiento y reglas de filtros
- aclarar iconos
- ajustar tamanos de botones de acciones

Siguiente paso:

- mover a `2-1-2_plan_dashboards.md` cuando se priorice

### Lotes: correccion de filtros del modulo

Estado: `Por evaluar`
Modulo: `Componentes`
Impacto: `Medio`

Descripcion:

- corregir minimo y maximo de `m2`
- aclarar iconos
- ajustar botones de ocultar o mostrar filtros y limpiar

Siguiente paso:

- mover a `2-1_plan_frontend.md` cuando se priorice

### Venta: ajustes y trazabilidad

Estado: `Idea`
Modulo: `Ventas`
Impacto: `Medio`

Descripcion:

- crear boton `Ajustes` dentro de la venta
- mover ahi `tipo_financiamiento`
- mover ahi `fecha_primera_cuota`
- mostrar dentro de ese bloque la trazabilidad o historico de la venta

Siguiente paso:

- definir alcance de la trazabilidad y mover a `2-1-1_plan_ventas.md` cuando se priorice

### Venta: historico visible de estados

Estado: `Idea`
Modulo: `Ventas`
Impacto: `Medio`

Descripcion:

- mostrar historico de estados de venta en algun bloque visible del expediente

Siguiente paso:

- definir si vive en la pagina principal o dentro de `Ajustes`

### Venta nueva con UI nueva

Estado: `Movido a plan`
Modulo: `Ventas`
Impacto: `Alto`

Descripcion:

- la venta nueva no debe volver a la UI anterior
- debe usar la UI nueva del modulo ventas

Siguiente paso:

- resuelto en `2-1-1_plan_ventas.md`

### Cotizador multi-lote

Estado: `Idea`
Modulo: `Ventas`
Impacto: `Alto`

Descripcion:

- permitir seleccionar y cotizar varios lotes
- permitir armar una venta de varios lotes

Siguiente paso:

- no priorizar en la fase operativa inmediata
- revisar primero impacto en modelo de datos, pagos y contratos
