# Plan de Ventas

Actualizado: `2026-03-29`
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
- el unico campo minimo actual para crear una venta es `fecha_venta`
- en backend, si el payload llega incompleto, por ahora se permite guardar sin bloquear
- el `progress bar` de completitud sale del alcance de esta etapa
- el unico bloqueo de BD que debe mantenerse en esta etapa es `fecha_venta`
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
- mantener visibles `tipo_financiamiento` y `fecha_primera_cuota` en la vista principal
- mostrar el tab `Historial` dentro de `Ajustes`
- dejar fuera de alcance el `progress bar` de completitud

No entra todavia aqui:

- mejoras visuales de dashboard
- mejoras de filtros en `/lotes`
- reorganizacion profunda del drawer
- `progress bar` de completitud y alerta visual de faltantes

Eso sigue en `5_correcciones_ideas.md` hasta priorizacion formal.

## Fase 1. Relajar captura operativa de ventas

Estado: `Aplicado`

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
- permitir crear la primera venta aunque `lotes.estado_comercial` este stale en `SEPARADO` o `VENDIDO`

Entregables tecnicos:

- frontend:
  - venta nueva y detalle aceptan guardado parcial
  - solo `fecha_venta` bloquea submit por ausencia
- backend:
  - acepta payload parcial
  - no rechaza por ausencia de cliente, asesor o pagos
  - no devuelve error por incompletitud mientras `fecha_venta` exista
  - al crear venta, solo valida existencia del lote y delega unicidad de venta activa al indice parcial de BD
- BD:
  - revisar `NOT NULL`, defaults y dependencias que impidan persistencia parcial
  - mantener `fecha_venta` como unico bloqueo tecnico obligatorio en esta etapa

Criterio de cierre:

- admin y asesor pueden guardar una venta incompleta sin error tecnico
- la venta queda editable despues
- la pantalla no obliga cliente, pagos ni asesor para persistir
- `fecha_venta` es el unico bloqueo efectivo en frontend, backend y BD
- un lote con estado comercial stale puede recibir su primera venta si no existe venta activa real

## Fase 2. Reglas de permisos para administracion comercial

Estado: `Aplicado`

Meta:

- que el admin pueda operar ventas sin las restricciones actuales del asesor

Pendientes:

- validar en QA extendido el comportamiento ya aplicado con usuarios reales

Entregables tecnicos:

- frontend:
  - selector de asesor para admin operativo en alta y edicion cuando corresponda
  - bloqueo visual para asesor sobre ventas ajenas mantenido
- backend:
  - reglas de autorizacion por rol aplicadas
  - admin puede operar como admin o como asesor
  - asesor conserva restriccion sobre ventas ajenas

Criterio de cierre:

- [x] admin puede registrar y reasignar comercialmente una venta
- [x] asesor conserva restricciones por propiedad de venta

## Fase 3. Ajuste de reglas de inicial y estados

Estado: `En curso`

Meta:

- que el motor de estados no falle cuando la venta use una inicial menor al minimo anterior

Pendientes:

- quitar la regla dura de inicial minima `6000` solo en registro de venta y pagos
- revisar automatismo que actualiza estados segun `monto_inicial_total`
- validar que separar, inicial pagada y pagando no dependan de una cifra fija incorrecta
- revisar sincronizacion con `lotes.estado_comercial`
- validar en QA extendido que ventas `CAIDA` queden fuera de panel asesor y reportes generales

Entregables tecnicos:

- backend:
  - recalculo coherente despues de crear o editar pagos
  - transicion de estados sin dependencia fija de `6000`
  - en alta, si los pagos registrados evidencian un estado superior al elegido en UI, la venta debe promocionarse automaticamente al estado coherente
  - el recalculo por pagos debe poder promover o retroceder el estado segun evidencia real
  - eliminar pagos solo para admin, con recálculo completo de montos/estado/lote
  - ventas `CAIDA` visibles/editables solo por admin en detalle
- reglas:
  - documentar como se interpreta `monto_inicial_total`
  - documentar que esta flexibilidad es operativa y no una regla general de cierre comercial

Criterio de cierre:

- una venta con inicial baja no rompe guardado ni estados
- una venta con pago `INICIAL` puede crearse como `INICIAL_PAGADA` aunque no exista `SEPARACION` previa
- el estado comercial del lote se sincroniza bien con la venta activa
- editar o eliminar pagos puede regresar a `SEPARADA` o `INICIAL_PAGADA` cuando corresponda por evidencia
- un admin puede retroceder manualmente `CONTRATO_FIRMADO -> INICIAL_PAGADA`

## Fase 4. Ajustes, trazabilidad y calculo visible

Estado: `Aplicado`

Meta:

- dejar un expediente claro sin ocultar variables que afectan el calculo inmediato

Pendientes:

- QA visual final del expediente en desktop, tablet y mobile

Criterio de cierre:

- venta nueva y venta existente comparten el mismo modelo visual y mental
- el historial queda accesible dentro de `Ajustes`
- el llenado de la venta queda visible con iconos de estado
- el tab `Administrativo` concentra datos de control en solo lectura
- el tab `Administrativo` permite editar `asesor asignado` solo para admin
- el tab `Administrativo` permite editar `fecha_pago_pactada`
- el comercial puede explicar desde la UI principal el arranque de cuotas

Avance aplicado:

- la venta existente ya expone el modal `Ajustes`
- `Ajustes` abre por defecto en el tab `Llenado de la venta`
- `Ajustes` incluye tab `Historial` con estado anterior, estado nuevo, usuario y fecha
- `Ajustes` incluye tab `Llenado de la venta` con checklist visual por iconos
- `Ajustes` incluye tab `Administrativo` con datos de control en solo lectura
- `Ajustes` permite editar `asesor asignado` solo para admin y `fecha_pago_pactada`, guardando con el submit principal
- el boton `Ajustes` ya opera como icono en el header del expediente
- venta nueva y venta existente usan la misma jerarquia visual del expediente
- en desktop, la pagina se compone con columna izquierda para datos editables y columna derecha para titulares y pagos
- en desktop, la columna izquierda ya se ordena en `Datos del lote`, `Datos de la venta`, `Datos de la financiacion` y `Resumen del contrato`
- en `Datos de la financiacion`, `Cantidad de cuotas` y `Monto por cuota` ya comparten una sola franja y se recalculan segun el tipo de financiamiento
- el `Resumen del contrato` ya no usa mini-cards; se muestra como resumen compacto por filas
- el bloque `Titulares` se renombra visualmente como `Datos del cliente`
- en edicion, la vista principal ya usa resumen de pagos y mueve la tabla completa a un modal dedicado con footer resumen
- en mapa, tabla y drawer ya usan la misma regla de venta: `Crear venta` o `Ver venta` depende solo de existencia de venta activa
- el header del expediente ya muestra badge pequeno de estado, acciones responsive y bloqueo de guardado cuando no hay cambios
- en mobile, las secciones del expediente ya operan como acordeones y el alta/edicion comparten esa logica
- alta y edicion ya usan un mismo template de expediente; solo cambian slots de pagos, ajustes, asesor y permisos

## Fase 5. Multi-lote en cotizador y venta

Estado: `Pendiente`

Meta:

- permitir seleccionar varios lotes y tratarlos como un solo expediente comercial

Pendientes:

- seleccionar varios lotes en mapa
- ver los lotes seleccionados en el drawer cotizador
- mantener la seleccion visible en proforma abierta
- mantener la seleccion visible en venta nueva y en edicion
- cotizar varios lotes como un solo expediente
- facilitar calculos en inputs para el agregado multi-lote
- mantener la regla actual de maximo `2` titulares por expediente completo

Decisiones cerradas:

- una venta multi-lote se implementara con tabla nueva `venta_lotes`
- no se resolvera agrupando varias ventas separadas solo en frontend o backend
- `ventas` seguira siendo el expediente padre
- pagos, historial, titulares y documentos seguiran viviendo a nivel expediente
- la proforma, la venta nueva y `ventaId` deben poder agregar y quitar lotes visualmente sin depender solo del mapa

Estrategia de no-ruptura:

- cualquier cambio de BD para esta fase se valida primero en entorno de prueba
- si se usa schema alterno o branch de pruebas, la migracion multi-lote se rompe y valida ahi primero
- la migracion en produccion debe ser compatible hacia atras
- durante la transicion, `ventas.lote_id` se mantiene activo como campo legado
- en paralelo se crea `venta_lotes` como detalle real de lotes por expediente
- en una primera etapa, cada venta existente de un lote genera una fila espejo en `venta_lotes` con el mismo `venta_id` y `lote_id`
- mientras exista compatibilidad, backend puede seguir leyendo primero `ventas.lote_id` y luego `venta_lotes` cuando corresponda
- una vez migradas las lecturas y escrituras del modulo, la UI deja de mostrar `ventas.lote_id` como fuente principal y pasa a mostrar la coleccion de `venta_lotes`
- solo cuando todo el flujo dependa de `venta_lotes`, `ventas.lote_id` puede marcarse para retiro
- en consolidacion heredada, varias filas de `venta_lotes` pueden compartir el mismo `venta_id` para representar un solo expediente multi-lote
- esas filas compartidas deben corresponder a ventas heredadas del mismo cliente o del mismo par `cliente_id` + `cliente2_id`
- la meta de esa consolidacion es que dejen de existir como ventas separadas y pasen a pertenecer a una sola venta padre
- si durante la consolidacion aparecen ventas con clientes repetidos pero financiacion, pagos o estado claramente incompatibles, no se fusionan automaticamente: se marcan para depuracion manual antes de eliminar duplicados

Modelo de transicion propuesto:

- etapa 1:
  - crear `venta_lotes`
  - mantener `ventas.lote_id`
  - para cada venta existente, crear una fila en `venta_lotes` con el mismo lote
- etapa 2:
  - backend empieza a escribir siempre en `venta_lotes`
  - backend sigue leyendo con compatibilidad mixta
- etapa 3:
  - frontend deja de renderizar un lote unico como fuente principal y pasa a consumir la lista de lotes del expediente
- etapa 4:
  - una vez estabilizado el modulo, evaluar eliminar `ventas.lote_id`

Consolidacion de ventas heredadas:

- si varias ventas existentes pertenecen al mismo cliente o al mismo par de titulares y representan una sola operacion comercial, deben consolidarse bajo un solo `venta_id`
- en esa consolidacion, `venta_lotes` tendra varias filas con el mismo `venta_id` y distintos `lote_id`
- la venta padre resultante sera la unica visible como expediente
- las ventas separadas originales pasaran a estado de depuracion o eliminacion controlada solo despues de validar:
  - misma logica comercial
  - financiacion compatible
  - pagos compatibles
  - estado consolidable
- si la financiacion es muy distinta o los pagos no son reconciliables, esas ventas no deben fusionarse automaticamente

Entregables tecnicos:

- frontend:
  - seleccion multiple en mapa
  - drawer cotizador con lista o tabla de lotes seleccionados
  - proforma abierta reutilizando la misma seleccion multiple
  - vista de venta con `Datos del lote` en tabla cuando haya mas de un lote
- backend:
  - definir asociacion de varios lotes a un mismo expediente de venta
  - mantener unicidad de venta activa por lote
- BD:
  - crear `venta_lotes`
  - poblar filas espejo desde ventas existentes
  - mantener compatibilidad temporal con `ventas.lote_id`
- reglas:
  - un expediente multi-lote no puede tener mas de `2` titulares
  - los calculos de precio, inicial, financiado y cuotas se hacen sobre el total agregado
  - un lote con venta activa no-caida no puede entrar al nuevo expediente

Decisiones por cerrar antes de construir:

- comportamiento al quitar un lote de un expediente ya creado
- sincronizacion de estado comercial por lote dentro del expediente multi-lote
- si impresion y pagos se emiten por expediente o por lote
- mecanismo exacto de despliegue seguro:
  - schema de pruebas
  - branch de BD
  - o ambas

Criterio de cierre:

- mapa, drawer, proforma y venta nueva comparten la misma seleccion multiple
- el expediente calcula como uno solo
- la regla de `2` titulares se mantiene sobre todo el expediente
- los lotes seleccionados se muestran de forma consistente en cotizacion y venta

## Fase 6. Documentos e impresion del expediente de venta

Estado: `Pendiente`

Meta:

- consolidar los formatos de impresion del modulo ventas con datos reales del expediente

Pendientes:

- ficha de separacion
- contrato
- venta
- historial de pagos
- otros anexos o formatos derivados si el expediente lo requiere

Entregables tecnicos:

- frontend:
  - puntos de impresion alineados al expediente de venta
  - apertura controlada por tipo de documento
- documentos:
  - render con datos existentes de venta, clientes, lotes e historial de pagos
  - soporte a tabla de lotes si el expediente es multi-lote
- reglas:
  - no inventar datos faltantes
  - no romper render si faltan campos no obligatorios

Dependencias:

- cierre de reglas multi-lote si el formato debe soportar mas de un lote
- validacion legal o comercial del contenido minimo por formato

Criterio de cierre:

- cada formato abre con datos reales del expediente
- el historial de pagos se imprime desde la venta
- los formatos soportan expediente incompleto sin romperse

## Dependencias documentales

Cuando estas fases se apliquen, se debe actualizar en paralelo:

- `1_esquema_bd.md`
- `2_reglas_negocio.md`
- `3_arquitectura.md`
- `3-1_arq_ventas.md`
- `4_planes.md` si cambia prioridad del frente general

## Orden de ejecucion acordado

1. backend ventas
2. validaciones frontend de venta
3. revision BD si hay `NOT NULL` o defaults que bloqueen
4. permisos admin y asesor
5. trazabilidad y `Ajustes`

## Checklist de ejecucion

- [x] backend ventas: aceptar guardado parcial con `fecha_venta` como unico minimo
- [x] validaciones frontend de venta: bloquear solo por ausencia de `fecha_venta`
- [x] revision BD: confirmar que no existan bloqueos adicionales a `fecha_venta`
- [x] permisos admin y asesor: cierre funcional del modo "admin vende como asesor" aplicado
- [x] alta de venta: no bloquear por `estado_comercial` stale del lote; el bloqueo real queda en la venta activa unica
- [x] `Ajustes`: modal operativo con tabs `Historial`, `Llenado de la venta` y `Administrativo`
- [x] modal de historico de venta visible en `ventaId`
- [x] `progress bar` de completitud: retirado del alcance de esta fase
- [x] fase 3 (incremento): recálculo de estado por pagos con regresión, eliminación de pagos solo admin y detalle `CAIDA` restringido a admin

## Backlog siguiente aprobado

1. Fase 5: multi-lote en cotizador y venta
2. Fase 6: documentos e impresion del expediente

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
# Ajuste aplicado

- La regla operativa de "venta activa" ya excluye ventas con estado `CAIDA` en mapa, tabla del mapa, `/lotes` y `/ventas`.
- Si una venta previa del lote esta en `CAIDA`, el flujo visible vuelve a `Crear venta`.
- La opcion `CAIDA` ya se manejo como accion administrativa y salio del select principal de estado.
