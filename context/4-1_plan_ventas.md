# Plan de Ventas

Actualizado: `2026-03-23`
Rol: `Plan por fases`

## Uso de este documento

Este archivo contiene solo:

- pendientes del modulo ventas
- fases de ejecucion
- criterios de cierre
- riesgos operativos

La fuente de verdad aplicada vive en:

- `3-1_arq_ventas.md`
- `1_esquema_bd.md`
- `2_reglas_negocio.md`

## Objetivo inmediato

Dejar el modulo ventas operativo para uso comercial diario sin bloquear al equipo.

La prioridad actual no es embellecer el flujo ni ampliarlo.
La prioridad es permitir registrar, guardar y editar ventas incompletas de forma segura.

## Decisiones cerradas de esta etapa

- una venta sera un expediente editable incompleto, no un estado borrador separado
- si el backend detecta JSON incompleto, devolvera alerta suave de campos por completar
- el unico campo minimo actual para crear una venta es `fecha_venta`
- la regla de inicial minima se elimina solo al registrar una venta o un pago
- la trazabilidad debe mostrar usuario y fecha segun lo que exista en BD
- `fecha_primera_cuota` se mantiene en la UI principal porque afecta el calculo inmediato
- `tipo_financiamiento` se mantiene en la UI principal y se puede cambiar siempre
- venta nueva debe usar la UI nueva del modulo

## Alcance priorizado

Este plan cubre solo la linea prioritaria aprobada:

- quitar rigidez actual del registro de venta
- permitir guardado parcial
- permitir venta sin cliente, sin asesor y sin pagos
- permitir inicial menor a `6000`
- permitir que admin cree venta y elija asesor
- permitir que admin venda como asesor
- permitir separar con pocos datos y guardar
- mantener la UI nueva tambien para venta nueva
- mostrar alerta suave de incompletitud sin bloquear guardado
- mantener visibles `tipo_financiamiento` y `fecha_primera_cuota` en la vista principal
- mostrar trazabilidad dentro de `Ajustes`

No entra todavia aqui:

- mejoras visuales de dashboard
- mejoras de filtros en `/lotes`
- multi-lote en cotizador o venta
- reorganizacion profunda del drawer

Eso sigue en `5_correcciones_ideas.md` hasta priorizacion formal.

## Fase 1. Relajar captura operativa de ventas

Estado: `Pendiente`

Meta:

- que una venta pueda existir como expediente incompleto y seguirse completando despues

Pendientes:

- eliminar bloqueos de campos obligatorios no minimos en frontend para venta nueva y edicion
- dejar `fecha_venta` como unico campo minimo de creacion
- permitir guardar venta sin clientes asociados
- permitir guardar venta sin asesor asociado
- permitir guardar venta sin pagos registrados
- permitir guardar venta sin monto inicial minimo
- permitir separar con pocos datos y continuar despues
- mostrar alerta suave cuando el backend detecte payload incompleto

Entregables tecnicos:

- frontend:
  - venta nueva y detalle aceptan guardado parcial
  - solo `fecha_venta` bloquea submit por ausencia
  - la alerta suave no bloquea ni ensucia el flujo
- backend:
  - acepta payload parcial
  - responde faltantes detectados para consumo UI
  - no rechaza por ausencia de cliente, asesor o pagos
- BD:
  - revisar `NOT NULL`, defaults y dependencias que impidan persistencia parcial

Criterio de cierre:

- admin y asesor pueden guardar una venta incompleta sin error tecnico
- la venta queda editable despues
- la pantalla no obliga cliente, pagos ni asesor para persistir
- el backend devuelve advertencia suave si faltan datos por completar

## Fase 2. Reglas de permisos para administracion comercial

Estado: `Pendiente`

Meta:

- que el admin pueda operar ventas sin las restricciones actuales del asesor

Pendientes:

- permitir que admin cree venta sin asesor
- permitir que admin elija asesor al guardar o editar
- permitir que admin venda como asesor
- mantener restriccion de que un asesor no edite ventas ajenas

Entregables tecnicos:

- frontend:
  - selector de asesor visible solo para admin
  - estados claros cuando la venta aun no tiene asesor
- backend:
  - reglas de autorizacion por rol
  - admin puede operar como admin o como asesor
  - asesor conserva restriccion sobre ventas ajenas

Criterio de cierre:

- admin puede registrar y reasignar comercialmente una venta
- asesor conserva restricciones por propiedad de venta

## Fase 3. Ajuste de reglas de inicial y estados

Estado: `Pendiente`

Meta:

- que el motor de estados no falle cuando la venta use una inicial menor al minimo anterior

Pendientes:

- quitar la regla dura de inicial minima `6000` solo en registro de venta y pagos
- revisar automatismo que actualiza estados segun `monto_inicial_total`
- validar que separar, inicial pagada y pagando no dependan de una cifra fija incorrecta
- revisar sincronizacion con `lotes.estado_comercial`

Entregables tecnicos:

- backend:
  - recalculo coherente despues de crear o editar pagos
  - transicion de estados sin dependencia fija de `6000`
- reglas:
  - documentar como se interpreta `monto_inicial_total`
  - documentar que esta flexibilidad es operativa y no una regla general de cierre comercial

Criterio de cierre:

- una venta con inicial baja no rompe guardado ni estados
- el estado comercial del lote se sincroniza bien con la venta activa

## Fase 4. Ajustes, trazabilidad y calculo visible

Estado: `Pendiente`

Meta:

- dejar un expediente claro sin ocultar variables que afectan el calculo inmediato

Pendientes:

- usar la UI nueva tambien para el registro de venta nueva
- evitar bifurcacion entre formulario nuevo y formulario historico
- crear bloque o modal `Ajustes`
- mostrar dentro de `Ajustes` la trazabilidad de la venta
- incluir al menos usuario y fecha en cada evento trazable
- mantener visibles en la UI principal:
  - `tipo_financiamiento`
  - `fecha_primera_cuota`
- mostrar el impacto inmediato de `fecha_primera_cuota` en el calculo comercial
- revisar mensajes de guardado parcial y continuidad del expediente

Criterio de cierre:

- venta nueva y venta existente comparten el mismo modelo visual y mental
- la trazabilidad queda accesible dentro de `Ajustes`
- el comercial puede explicar desde la UI principal el arranque de cuotas

## Dependencias documentales

Cuando estas fases se apliquen, se debe actualizar en paralelo:

- `1_esquema_bd.md`
- `2_reglas_negocio.md`
- `3_arquitectura.md`
- `3-1_arq_ventas.md`
- `4_planes.md` si cambia prioridad del frente general

## Riesgos abiertos

- relajar campos obligatorios puede degradar calidad de datos si no se distingue expediente incompleto de venta madura
- si backend y BD no se alinean, el frontend podra dejar guardar pero la persistencia seguira fallando
- quitar el minimo de inicial sin revisar automatismos puede romper sincronizacion de estados
- esconder demasiado en `Ajustes` puede perjudicar el discurso comercial si se mueve algo que impacta calculo inmediato

## Regla documental para futuros cambios de BD en ventas

Si el cambio de BD es propuesto o pendiente:

- documentarlo primero aqui en `4-1_plan_ventas.md`

Si el cambio de BD ya fue aprobado y aplicado:

- moverlo a `1_esquema_bd.md`
- mover reglas asociadas a `2_reglas_negocio.md`
- actualizar `3-1_arq_ventas.md` si cambia el flujo real del modulo
