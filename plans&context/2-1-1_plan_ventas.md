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

- `1-3-1_arq_ventas.md`
- `1-1_esquema_bd.md`
- `1-2_reglas_negocio.md`

## Objetivo inmediato

Dejar el modulo ventas operativo para uso comercial diario sin bloquear al equipo.

La prioridad actual no es embellecer el flujo ni ampliarlo.
La prioridad es permitir registrar, guardar y editar ventas incompletas de forma segura.

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

No entra todavia aqui:

- mejoras visuales de dashboard
- mejoras de filtros en `/lotes`
- multi-lote en cotizador o venta
- reorganizacion profunda del drawer

Eso sigue en `3-1_correcciones_ideas.md` hasta priorizacion formal.

## Fase 1. Relajar captura operativa de ventas

Estado: `Pendiente`

Meta:

- que una venta pueda existir como expediente incompleto y seguirse completando despues

Pendientes:

- eliminar bloqueos de campos obligatorios en frontend para venta nueva y edicion
- permitir guardar venta sin clientes asociados
- permitir guardar venta sin asesor asociado
- permitir guardar venta sin pagos registrados
- permitir guardar venta sin monto inicial minimo
- permitir separar con pocos datos y continuar despues

Criterio de cierre:

- admin y asesor pueden guardar una venta incompleta sin error tecnico
- la venta queda editable despues
- la pantalla no obliga cliente, pagos ni asesor para persistir

## Fase 2. Reglas de permisos para administracion comercial

Estado: `Pendiente`

Meta:

- que el admin pueda operar ventas sin las restricciones actuales del asesor

Pendientes:

- permitir que admin cree venta sin asesor
- permitir que admin elija asesor al guardar o editar
- permitir que admin venda como asesor
- mantener restriccion de que un asesor no edite ventas ajenas

Criterio de cierre:

- admin puede registrar y reasignar comercialmente una venta
- asesor conserva restricciones por propiedad de venta

## Fase 3. Ajuste de reglas de inicial y estados

Estado: `Pendiente`

Meta:

- que el motor de estados no falle cuando la venta use una inicial menor al minimo anterior

Pendientes:

- quitar la regla dura de inicial minima `6000`
- revisar automatismo que actualiza estados segun `monto_inicial_total`
- validar que separar, inicial pagada y pagando no dependan de una cifra fija incorrecta

Criterio de cierre:

- una venta con inicial baja no rompe guardado ni estados
- el estado comercial del lote se sincroniza bien con la venta activa

## Fase 4. Consolidacion de UX sobre la UI nueva

Estado: `Pendiente`

Meta:

- mantener un solo lenguaje visual para venta nueva y detalle de venta

Pendientes:

- usar la UI nueva tambien para el registro de venta nueva
- evitar bifurcacion entre formulario nuevo y formulario historico
- revisar mensajes de guardado parcial y continuidad del expediente

Criterio de cierre:

- venta nueva y venta existente comparten el mismo modelo visual y mental

## Riesgos abiertos

- relajar campos obligatorios puede degradar calidad de datos si no se distingue expediente incompleto de venta madura
- si backend y BD no se alinean, el frontend podra dejar guardar pero la persistencia seguira fallando
- quitar el minimo de inicial sin revisar automatismos puede romper sincronizacion de estados

## Regla documental para futuros cambios de BD en ventas

Si el cambio de BD es propuesto o pendiente:

- documentarlo primero aqui en `2-1-1_plan_ventas.md`

Si el cambio de BD ya fue aprobado y aplicado:

- moverlo a `1-1_esquema_bd.md`
- mover reglas asociadas a `1-2_reglas_negocio.md`
- actualizar `1-3-1_arq_ventas.md` si cambia el flujo real del modulo
