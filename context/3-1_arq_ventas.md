# Arquitectura de Ventas

Actualizado: `2026-03-26`
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

- `4-1_plan_ventas.md`
- `5_correcciones_ideas.md`

## Alcance actual del modulo

El modulo ventas cubre actualmente:

- listado de ventas
- detalle de una venta
- alta con guardado parcial
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

Regla actual aplicada:

- permite guardar expediente incompleto
- el unico bloqueo efectivo es `fecha_venta`
- si lote o cliente no estan completos, la venta igual se crea
- pagos iniciales vacios no se persisten ni bloquean el guardado
- si crea un admin y no hay asesor asignado desde UI, la venta puede quedar sin asesor
- el encabezado operativo de alta usa el copy `Nueva venta - SEPARACION / INICIAL`
- el badge del encabezado en alta sigue mostrando el `estado_venta` actual del formulario
- al crear una venta, el lote solo se valida por existencia; la unicidad de venta activa se apoya en el indice parcial de BD
- un `estado_comercial` stale no bloquea la primera venta
- si la venta nueva se abre desde el cotizador con `?lote=...`, precarga el cache local del lote para `precio_venta`, `cuotas`, `monto_cuota` e `INICIAL`
- si los pagos cargados en alta evidencian un estado superior al seleccionado en la UI, backend promociona el estado inicial al valor coherente
- si el usuario es `ASESOR`, la pantalla no dispara la carga de `/api/usuarios`; esa lista queda reservada a `ADMIN`

### `/ventas/:ventaId`

Pantalla de expediente de venta.

Incluye:

- secciones semanticas de venta y financiacion
- resumen compacto del contrato
- resumen de titulares
- tabla de pagos
- modal `Ajustes` con tabs `Historial`, `Llenado de la venta` y `Administrativo`
- en `Administrativo`, `asesor asignado` es editable solo para admin
- en `Administrativo`, `fecha_pago_pactada` es editable y se persiste con el guardado principal
- el modal `Registrar pago` sugiere por defecto el siguiente `tipoPago` operativo y, para `CUOTA`, precarga `monto` con la cuota base y `nroCuota` siguiente
- acciones de impresion
- composicion desktop en dos columnas:
  - izquierda: `Datos del lote`, `Datos de la venta` y `Resumen del contrato`
  - derecha: `Datos del cliente`, `Datos de la financiacion` y resumen de pagos
- el scroll operativo de la pagina vive en el contenedor del expediente de venta, no en el `main` global
- header de acciones responsive:
  - desktop con icono y texto
  - tablet con impresion agrupada en un menu compacto
  - mobile con una barra interna compacta `Volver | Estado | Ajustes | Guardar`
  - en mobile el titulo interno del expediente se oculta para no duplicar el header global
  - el estado actual de la venta se muestra como badge pequeno, truncable y con ancho maximo
  - si el usuario es `ASESOR`, la pantalla tampoco debe cargar la lista global de usuarios; solo `ADMIN` ve y usa el selector de asesor

## Composicion actual del expediente

Bloques principales:

- encabezado operativo con titulo y acciones
- `Datos del lote`
- `Datos de la venta`
- `Datos de la financiacion`
- `Resumen del contrato` en formato compacto por filas
- `Datos del cliente`
- resumen de pagos con acceso a modal de pagos
- `Datos del lote` usa tabla compacta de una fila, pensada para evolucionar a venta multi-lote
- en desktop, `Datos del lote`, `Datos de la venta` y `Datos de la financiacion` se compactan en una sola franja interna por seccion
- en `Datos de la financiacion`, `Cantidad de cuotas` y `Monto por cuota` siempre se muestran en ese orden; uno queda editable y el otro se recalcula segun `tipo_financiamiento`
- si el calculo deja una ultima cuota mayor por redondeo, la UI muestra un helper corto bajo `Monto por cuota`
- en mobile, las secciones del expediente operan como acordeones y reutilizan los mismos bloques internos
- en mobile, el expediente mantiene el footer general visible y deja `Pago` como accion separada del guardado
- en alta de venta, `Asesor asignado` vive sobre `Datos del cliente` en la columna derecha
- en edicion, la tabla completa de pagos vive en un modal dedicado con footer resumen

Reglas vigentes:

- clientes se editan por modal
- pagos se editan por modal
- la venta se edita en la pagina principal
- el expediente funciona como registro vivo de la venta
- venta nueva y venta existente comparten la misma jerarquia visual del expediente
- venta nueva y venta existente comparten un mismo template de expediente; las diferencias viven en flags y slots de acciones, asesor y pagos
- el card principal de datos editables usa una malla interna compacta y responsive
- en alta, el bloque de pagos iniciales prioriza `Observacion` sobre `Fecha` y `Monto` en ancho util
- los mensajes de error y aviso en la pagina de venta se pueden cerrar manualmente
- el guardado en edicion se bloquea si no hay cambios pendientes y muestra spinner simple mientras persiste

## Integraciones del modulo

### Lotes

- una venta activa impacta el estado comercial del lote
- desde lotes se puede navegar a crear o ver venta
- desde la tabla del mapa, `Crear venta` o `Ver venta` depende solo de si existe venta activa para el lote, no de `estado_comercial`
- desde el cotizador publico, la ruta ` /cotizador/:loteCodigo ` reabre el mismo drawer y conserva sus ajustes manuales por lote
- mapa, drawer del cotizador y tabla del mapa comparten una misma regla de acceso por lote:
  - `ADMIN` puede abrir una venta activa o iniciar una nueva cuando no exista venta activa
  - `ASESOR` solo puede abrir una venta activa si es suya
  - si la venta activa pertenece a otro asesor, la accion queda bloqueada
  - si la unica venta existente esta en `CAIDA`, la UI vuelve a ofrecer `Crear venta`

### Clientes

- la venta puede tener titular principal
- la venta puede tener segundo titular opcional

### Pagos

- pagos alimentan calculos y trazabilidad economica
- pagos se muestran en tabla operativa dentro del expediente
- el recalculo por pagos promueve estados por evidencia economica, pero no debe hacer retroceder hitos manuales ya consolidados como `CONTRATO_FIRMADO`

### Permisos

- asesor solo puede operar ventas donde `asesor_id` coincide con su usuario
- asesor no puede crear ventas asignandolas a otro asesor
- admin puede operar con mayor alcance sobre ventas propias y ajenas
- admin puede crear ventas sin asesor y asignar `asesor_id` en alta o edicion
- en UI, el selector de asesor aparece solo para admin en alta y edicion de venta
- en UI, admin puede dejar la venta como `Sin asesor` de forma explicita
- en UI, mapa, tabla del mapa y drawer no deben ofrecer navegacion operativa sobre ventas activas de otro asesor

### Persistencia parcial actual

- cliente principal solo se asocia si `dni` y `nombreCompleto` llegan completos
- cliente secundario solo se asocia si `dni` y `nombreCompleto` llegan completos
- el calculo financiero usa defaults tecnicos mientras falten datos comerciales

## Criterio de actualizacion

Actualizar este documento solo cuando el flujo de ventas ya este aplicado en codigo y funcionando como regla vigente.
# Regla de venta activa por lote

- Para mapa, tabla del mapa, `/lotes` y `/ventas`, una venta con estado `CAIDA` se trata como no activa.
- Si el lote solo tiene una venta `CAIDA`, la UI debe ofrecer `Crear venta` y no `Ver venta`.
- La venta `CAIDA` sigue existiendo como historial, pero no bloquea el inicio de una nueva venta sobre el mismo lote.
- En la vista de venta, `CAIDA` no se edita desde el bloque principal de estado; se gestiona solo en `Ajustes > Administrativo` y solo para `admin`.
- Para mapa, tabla del mapa y drawer, la decision final de `Ver venta` o `Crear venta` se apoya en un endpoint de accesos por lote que devuelve `saleId` y `ownerUsername`.
