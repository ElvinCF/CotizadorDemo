# Plan de Ventas

Actualizado: `2026-04-01`
Rol: `Plan por fases`

Estado general del plan: `Cerrado (ciclo ventas Q1 2026)`

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

Estado: `Aplicado`

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

Estado: `Aplicado`

Meta:

- permitir seleccionar varios lotes y tratarlos como un solo expediente comercial, con despliegue seguro sobre schema `public`

Decisiones cerradas:

- la rama de ejecucion para esta fase es `lotes` (hija de `dev`)
- el despliegue objetivo final queda en schema `public`
- la fuente operativa multi-lote sera `venta_lotes` (sin depender en logica nueva de `ventas.lote_id`)
- no se borrara data existente durante la migracion
- `ventas` sigue siendo el expediente padre; pagos, historial, titulares y documentos se mantienen a nivel expediente
- si el expediente tiene solo `1` lote, la UI debe mantenerse equivalente a la actual

### Incremento 5.1. Preparacion y clon de esquema a `public`

Estado: `Aplicado`

Objetivo:

- duplicar `devsimple` completo en `public` antes del cambio funcional multi-lote

Entregables:

- clonado de objetos: tipos, secuencias, tablas, indices, funciones, vistas, triggers, grants/policies
- clonado de data de `devsimple` hacia `public`
- validacion de conteos y paridad funcional basica entre schemas

Criterio de cierre:

- `public` queda operativo con la misma base funcional de `devsimple`

### Incremento 5.2. Modelo de datos multi-lote

Estado: `Aplicado`

Objetivo:

- introducir relacion N:N entre venta y lote en `public`

Entregables:

- crear tabla `public.venta_lotes` con:
  - `id`
  - `venta_id` fk a `ventas`
  - `lote_id` fk a `lotes`
  - `created_at`
  - `unique (venta_id, lote_id)`
- crear indices por `venta_id` y `lote_id`
- crear guard de integridad para impedir un `lote_id` en dos ventas activas (`estado_venta <> 'CAIDA'`)

Criterio de cierre:

- el modelo permite multi-lote sin romper unicidad de lote activo

### Incremento 5.3. Backfill y consistencia inicial

Estado: `Aplicado`

Objetivo:

- cargar `venta_lotes` para ventas existentes sin perdida de historial

Entregables:

- poblar `venta_lotes` desde `ventas.lote_id` para ventas existentes con lote
- validar que no queden ventas legacy sin su fila espejo en `venta_lotes`
- validar que no existan colisiones de lote activo post-backfill

Criterio de cierre:

- todos los expedientes existentes quedan representados en `venta_lotes`

### Incremento 5.4. Backend cutover a `venta_lotes`

Estado: `Aplicado`

Objetivo:

- mover reglas y contratos backend para operar por coleccion de lotes

Entregables:

- create/update sale: recibir y persistir `lotes` del expediente en `venta_lotes`
- get/list sale: exponer lista de lotes del expediente
- accesos por lote (mapa/tabla/drawer): resolver por `venta_lotes` + ventas activas
- sincronizacion de `lotes.estado_comercial` por cada lote asociado al expediente

Regla funcional:

- la logica nueva no depende de `ventas.lote_id`
- `ventas.lote_id` fue retirado en el corte final de fase 5 sobre `public`

Criterio de cierre:

- todas las rutas backend de ventas y accesos por lote operan con `venta_lotes`

### Incremento 5.5. Frontend multi-lote

Estado: `En curso`

Objetivo:

- habilitar experiencia multi-lote completa sin degradar el caso single-lote

Entregables:

- mapa: seleccion multiple de lotes
- drawer cotizador: lista/tabla de seleccion multiple
- proforma: render de lotes seleccionados y totales agregados
- venta nueva y `ventaId`: agregar/quitar lotes en expediente
- mantener UI actual cuando el expediente tenga solo `1` lote

Criterio de cierre:

- mapa, cotizador, proforma y venta comparten la misma seleccion multiple
- el flujo single-lote conserva experiencia equivalente

### Incremento 5.6. Rollout, QA y corte a `public`

Estado: `Aplicado`

Objetivo:

- desplegar sin ruptura y con plan de reversa

Entregables:

- secuencia de release:
  - migraciones `public`
  - backend
  - frontend
  - cambio de config a `SUPABASE_DB_SCHEMA=public`
- smoke tests operativos por rol
- plan de rollback documentado por capa (db/app)

Criterio de cierre:

- operacion diaria estable sobre `public`
- incidencias criticas en cero durante ventana de estabilizacion

Reglas de negocio de la fase:

- un expediente multi-lote mantiene maximo `2` titulares por expediente
- calculos (`precio`, `inicial`, `financiado`, `cuotas`) se hacen sobre total agregado del expediente
- un lote con venta activa no-`CAIDA` no puede agregarse a otro expediente
- si una venta cae, sus lotes quedan liberados para reutilizacion comercial posterior

Avance aplicado (2026-03-30):

- schema `public` clonado completo desde `devsimple` para operar la fase multi-lote sin drift
- tabla `public.venta_lotes` creada y poblada desde `ventas.lote_id`
- trigger de integridad activo para impedir lote en dos ventas activas (`venta_lotes_lote_activo_unique`)
- backend de ventas opera sobre `venta_lotes` con fallback legado:
- backend de ventas opera sobre `venta_lotes`:
  - create/update persisten relacion en `venta_lotes`
  - get/list exponen lote principal desde `venta_lotes` y lista `lotes` del expediente
  - accesos por lote (`/api/ventas/accesos-lote`) resuelven por `venta_lotes`
  - sincronizacion de estado comercial de lote se aplica a todos los lotes asociados
- en el corte final se retiro `ventas.lote_id` de `public` y se removieron dependencias legadas (fk, indices y vista dashboard base)
- frontend (parcial 5.5):
  - mapa con card flotante para activar modo multi-seleccion y abrir `Cotizar`
  - lotes seleccionados visibles en tabla del drawer con opcion de eliminar fila
  - cotizacion del drawer calculada sobre total agregado de lotes seleccionados
  - `Generar proforma` y `Crear venta` propagan lista de lotes seleccionados
  - alta de venta recibe `lotes` por query y muestra card de `Lotes del expediente` con agregar/quitar

Avance aplicado (2026-03-31):

- venta nueva y venta existente unifican la seccion de lotes con titulo dinamico:
  - `Datos del lote` si hay 1 lote
  - `Datos de los lotes` si hay mas de 1
- la tabla de lotes en ventas usa el mismo componente/estilos de proforma (`proforma-lote-table`), con columnas y total consistentes
- en ventas, el selector de lotes ya no depende de `lotes.estado_comercial`; ahora filtra por **lote sin venta activa** y permite conservar los lotes ya seleccionados del expediente
- en mapa/proforma se persiste un draft temporal (`sessionStorage`) para abrir venta nueva con:
  - lotes seleccionados
  - precio, inicial, separacion, meses y cuota
  - cliente de proforma (si existe)
- en backend (`ventasService`) se corrige update de expediente para persistir cambios de `venta_lotes` y sincronizar estado comercial de todos los lotes asociados

Avance aplicado (2026-04-01):

- incremento 1 completado: backend de ventas sin fallback/espejo a `ventas.lote_id`
- incremento 2 completado: consultas SQL directas de dashboard migradas a `venta_lotes` (lote principal por `orden`)
- incremento 3 completado (schema `public`):
  - vista `vw_dashboard_ventas_base` recreada usando `venta_lotes`
  - eliminadas dependencias legadas de `ventas.lote_id` (fk e indices)
- incremento 4 completado (schema `public`):
  - columna `public.ventas.lote_id` eliminada
  - verificacion de dependencias sobre la columna: sin resultados

## Fase 6. Documentos e impresion del expediente de venta

Estado: `En curso`

Meta:

- consolidar los formatos de impresion del modulo ventas con datos reales del expediente

Pendientes:

- contrato
- venta
- historial de pagos
- otros anexos o formatos derivados si el expediente lo requiere

Avance aplicado:

- ficha de separacion operativa ya implementada
- la ficha de separacion ya soporta expediente multi-lote y datos reales del expediente

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

1. Fase 6: documentos e impresion del expediente
2. definicion final del modelo `proyectos` antes de abrir la migracion `010` en schema `dev`

## Riesgos abiertos

- relajar campos obligatorios puede degradar calidad de datos si no se distingue expediente incompleto de venta madura
- si backend y BD no se alinean, el frontend podra dejar guardar pero la persistencia seguira fallando
- quitar el minimo de inicial sin revisar automatismos puede romper sincronizacion de estados
- esconder demasiado en `Ajustes` puede perjudicar el discurso comercial si se mueve algo que impacta calculo inmediato

## Cierre del plan (2026-04-01)

- este plan se cierra como ciclo operativo de ventas (fases 1 a 5 aplicadas)
- los cambios nuevos de ventas pasan a:
  - `5_correcciones_ideas.md` si son idea o por madurar
  - un nuevo `plan_ventas` solo si se abre una fase formal nueva
- Fase 6 (documentos) sigue activa como frente documental, sin reabrir este ciclo operativo

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
