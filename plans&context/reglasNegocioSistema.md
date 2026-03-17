# Reglas de Negocio y Backend

Este documento define las reglas de negocio, el uso entre entidades/tablas y las responsabilidades esperadas del backend y frontend para la evolucion del proyecto sobre el esquema `devsimple`.

Complementa a:

- `plans&context/esquemaBD.md`

No es una migracion SQL ni un contrato de API final. Es la definicion operativa del sistema antes de implementar el nuevo modelo comercial.

## 1. Alcance funcional del proyecto

El sistema tiene cuatro bloques funcionales principales:

1. Mapa cotizador publico
2. Panel operativo de asesores
3. Panel admin de usuarios y dashboards
4. Flujo comercial de separacion, proforma, venta y pagos

## 2. Estado actual del software

Actualmente el proyecto ya tiene implementado:

- carga de lotes desde Supabase/API
- mapa publico con cotizador
- drawer de cotizacion
- formulario/modal de proforma
- panel de edicion de lotes
- gestion de usuarios internos
- login simple por `usuarios`

Actualmente el software opera principalmente sobre:

- `lotes`
- `usuarios`

El nuevo modelo agrega:

- `clientes`
- `ventas`
- `pagos`
- `venta_estado_historial`

## 3. Entidades del negocio

### 3.1. Lote

Representa una unidad inmobiliaria vendible.

Responsabilidades:

- existir como inventario
- exponer precio referencial
- mostrar estado comercial publico
- vincularse como maximo a una venta activa

Estado visible al publico:

- `DISPONIBLE`
- `SEPARADO`
- `VENDIDO`

### 3.2. Usuario interno

Representa una persona autenticable dentro del sistema.

Roles validos:

- `ADMIN`
- `ASESOR`

Responsabilidades:

- `ADMIN`:
  - gestiona usuarios
  - puede marcar una venta como `CAIDA`
  - supervisa operacion
  - además de todo lo del asesor

- `ASESOR`:
  - cotiza
  - genera proformas
  - registra ventas/separaciones
  - registra pagos permitidos por el flujo

### 3.3. Cliente

Representa a la persona compradora.

Regla principal:

- no debe duplicarse por DNI

Busqueda principal:

- `dni`

### 3.4. Venta

Representa la operacion comercial principal entre:

- un lote
- un cliente
- un asesor

La venta es la entidad principal del negocio.

No se modela `tipo_operacion`.
Toda operacion comercial se entiende como venta.

Campos funcionales adicionales:

- `cliente2_id` opcional
- `fecha_pago_pactada` editable

### 3.4.1. Cliente secundario

Una venta puede tener:

- un titular principal (`cliente_id`)
- un cotitular opcional (`cliente2_id`)

Reglas:

- `cliente2_id` es opcional
- `cliente2_id` no puede ser igual a `cliente_id`
- si la fuente trae dos titulares separados por `/`, el primero se interpreta como cliente principal y el segundo como cliente secundario
- si ambos comparten una sola direccion en origen, esa direccion puede replicarse en ambos clientes

### 3.4.2. Fecha de pago pactada

`ventas.fecha_pago_pactada` representa la fecha contractual objetivo para el pago de cuotas.

Reglas:

- es editable
- no reemplaza `pagos.fecha_pago`
- sirve como referencia contractual del cronograma esperado

### 3.5. Pago

Representa un movimiento real de dinero asociado a una venta.

Tipos:

- `SEPARACION`
- `INICIAL`
- `CUOTA`
- `OTRO`

Un pago siempre tiene:

- fecha propia
- monto propio
- tipo de pago

### 3.6. Historial de estado de venta

Representa trazabilidad pura.

Sirve para saber:

- quien cambio el estado
- cuando
- desde que estado
- hacia que estado

No guarda observaciones.

## 4. Relacion entre tablas

### 4.1. `lotes`

Relacion:

- un lote puede tener multiples ventas historicas
- un lote solo puede tener una venta activa

### 4.2. `usuarios`

Relacion:

- un asesor puede registrar multiples ventas
- un admin puede intervenir en estados especiales

### 4.3. `clientes`

Relacion:

- un cliente puede aparecer en multiples ventas historicas si el negocio lo requiere
- para este sistema se identifica por DNI

### 4.4. `ventas`

Relacion:

- una venta pertenece a un lote
- una venta pertenece a un cliente
- una venta pertenece a un asesor
- una venta puede tener multiples pagos
- una venta puede tener multiples cambios de estado historicos

### 4.5. `pagos`

Relacion:

- muchos pagos pertenecen a una venta

### 4.6. `venta_estado_historial`

Relacion:

- muchas filas de historial pertenecen a una venta
- cada fila de historial esta asociada al usuario que hizo el cambio

## 5. Regla comercial central del lote

La verdad publica del lote se resume en `lotes.estado_comercial`.

Ese campo no modela todo el negocio; solo resume lo necesario para el mapa.

### Regla de sincronizacion

`lotes.estado_comercial` se actualiza segun la venta activa:

- `SEPARADA` -> `SEPARADO`
- `INICIAL_PAGADA` -> `VENDIDO`
- `CONTRATO_FIRMADO` -> `VENDIDO`
- `PAGANDO` -> `VENDIDO`
- `COMPLETADA` -> `VENDIDO`
- `CAIDA` o sin venta activa -> `DISPONIBLE`

### Implicancia funcional

Para el mapa publico:

- `VENDIDO` significa "ya no esta disponible comercialmente"
- no significa necesariamente "el cliente termino de pagar todo"

## 6. Estados de venta

Secuencia acordada:

1. `SEPARADA`
2. `INICIAL_PAGADA`
3. `CONTRATO_FIRMADO`
4. `PAGANDO`
5. `COMPLETADA`
6. `CAIDA`

### Reglas

- `CAIDA` no elimina la venta
- `CAIDA` libera el lote
- `CAIDA` solo debe poder marcarla `ADMIN`
- el motivo de `CAIDA` se guarda en `ventas.observacion`

## 7. Reglas de transicion de estados

### 7.1. Creacion inicial de la venta

Al crear una venta y registrar el pago de separacion:

- se crea la venta
- se crea el pago `SEPARACION`
- `estado_venta = SEPARADA`
- `lote.estado_comercial = SEPARADO`
- se inserta historial

### 7.2. Paso a `INICIAL_PAGADA`

Cuando existe al menos un pago tipo `INICIAL`:

- `estado_venta = INICIAL_PAGADA`
- `lote.estado_comercial = VENDIDO`
- se inserta historial

### 7.3. Paso a `CONTRATO_FIRMADO`

Cambio manual posterior:

- `INICIAL_PAGADA -> CONTRATO_FIRMADO`
- se inserta historial

### 7.4. Paso a `PAGANDO`

Cuando existe al menos un pago tipo `CUOTA`:

- `estado_venta = PAGANDO`
- se inserta historial

### 7.5. Paso a `COMPLETADA`

Cuando la suma de pagos cubre el total comprometido:

- `estado_venta = COMPLETADA`
- `lote.estado_comercial = VENDIDO`
- se inserta historial

### 7.6. Paso a `CAIDA`

Accion manual solo de admin:

- `estado_venta = CAIDA`
- `lote.estado_comercial = DISPONIBLE`
- se inserta historial

## 8. Reglas financieras

## 8.1. Campos comerciales consolidados en `ventas`

`ventas` debe guardar:

- `precio_venta`
- `tipo_financiamiento`
- `monto_inicial_total`
- `monto_financiado`
- `cantidad_cuotas`
- `monto_cuota`

Aunque algunos valores se calculen, se guardan como snapshot final del acuerdo comercial.

## 8.2. `monto_inicial_total`

Definicion:

- suma de pagos tipo `SEPARACION` + `INICIAL`

No es un valor que el frontend deba inventar libremente sin respaldo.
El backend debe validarlo contra los pagos asociados.

## 8.3. `monto_financiado`

Definicion:

- `precio_venta - monto_inicial_total`

## 8.4. `tipo_financiamiento`

Valores:

- `REDUCIR_CUOTA`
- `REDUCIR_MESES`

### Si `REDUCIR_CUOTA`

Entrada principal del usuario:

- `cantidad_cuotas`

Backend recalcula:

- `monto_cuota = monto_financiado / cantidad_cuotas`

### Si `REDUCIR_MESES`

Entrada principal del usuario:

- `monto_cuota`

Backend recalcula:

- `cantidad_cuotas = ceil(monto_financiado / monto_cuota)`

## 8.5. Detalle real de cuotas

No se guarda en tabla separada en esta etapa.

Se calcula al vuelo:

- cuotas `1..n-1` = `monto_cuota`
- ultima cuota = `monto_financiado - ((n - 1) * monto_cuota)`

`saldo_final_ultima_cuota` no se guarda.

## 9. Reglas de integridad

### 9.1. Cliente por DNI

La busqueda por DNI puede hacerse en frontend por UX, pero:

- el backend debe volver a validar siempre
- si existe cliente con ese DNI, reutilizarlo
- si no existe, crearlo

Esto evita:

- duplicidad por concurrencia
- errores de integridad
- datos inconsistentes

### 9.2. Una venta activa por lote

Regla obligatoria:

- no puede existir mas de una venta activa para el mismo lote

Esto debe resolverse con un indice unico parcial en BD.

### 9.3. No eliminar ventas caidas

Una venta caida:

- no se borra
- no se pisa
- no desaparece del historial

### 9.4. Propiedad de la venta por asesor

Reglas obligatorias:

- un asesor no puede modificar ventas creadas por otro asesor
- un asesor no puede crear ventas asignandolas a otro asesor

Implicancias:

- en ventas nuevas, `asesor_id` debe salir del usuario autenticado
- solo `ADMIN` puede intervenir sobre ventas de cualquier asesor

## 10. Responsabilidades del frontend

### 10.1. Mapa publico

Debe:

- leer lotes y estados publicos
- permitir cotizar
- no escribir ventas
- no escribir pagos

### 10.2. Formulario de separacion/venta

Debe:

- buscar cliente por DNI
- autocompletar si existe
- permitir ingresar datos del cliente si no existe
- capturar:
  - lote seleccionado
  - precio de venta
  - tipo de financiamiento
  - cantidad de cuotas o monto de cuota, segun corresponda
  - monto de separacion
  - monto inicial si aplica
  - observacion
  - cliente secundario opcional, si existe
  - fecha de pago pactada

Campos obligatorios en ventas nuevas creadas desde frontend:

- lote seleccionado
- cliente principal:
  - nombre
  - dni
- fecha de venta
- precio de venta
- tipo de financiamiento
- fecha de pago pactada
- y segun el tipo de financiamiento:
  - `REDUCIR_CUOTA` -> `cantidad_cuotas`
  - `REDUCIR_MESES` -> `monto_cuota`

Pagos obligatorios en alta:

- al menos un pago inicial valido:
  - `SEPARACION`
  - o `INICIAL`

No debe:

- calcular de forma definitiva la logica financiera
- asumir que el cliente existe porque el frontend lo encontro

### 10.3. Proforma

Debe reutilizar:

- lote seleccionado
- precio actual de venta
- inicial actual
- meses o cuota definidos en el cotizador

La proforma es una representacion operativa/comercial del acuerdo, no la fuente de verdad de la venta.

### 10.4. Panel asesor

Debe permitir:

- registrar y editar estados operativos segun permisos
- registrar pagos permitidos
- no ejecutar acciones reservadas a admin
- editar solo sus propias ventas
- no cambiar el asesor titular de una venta

## 11. Responsabilidades del backend

El backend es la fuente de verdad de reglas y validaciones.

Debe:

- validar que el lote exista
- validar que el lote tenga disponibilidad comercial
- validar cliente por DNI
- crear cliente si no existe
- crear cliente secundario si no existe
- crear venta
- crear pagos
- recalcular montos consolidados
- mover estado de venta segun reglas
- sincronizar `lotes.estado_comercial`
- insertar historial de estado
- aplicar reglas de permisos
- impedir que un asesor toque ventas ajenas
- impedir que un asesor cree ventas para otro asesor

No debe delegar al frontend:

- la integridad por DNI
- la unicidad de venta activa
- la logica final de financiamiento
- las transiciones de estado

## 12. Casos backend que deben ser transaccionales

Estos flujos deben ejecutarse en una sola transaccion:

### 12.1. Crear separacion

1. validar lote
2. buscar/crear cliente principal
3. buscar/crear cliente secundario si aplica
4. crear venta
5. crear pago `SEPARACION` y/o `INICIAL`
6. recalcular consolidado financiero
7. poner estado correspondiente
8. insertar historial
9. actualizar lote

### 12.2. Registrar inicial

1. validar venta
2. insertar pago `INICIAL`
3. recalcular `monto_inicial_total`
4. recalcular `monto_financiado`
5. recalcular cuotas segun `tipo_financiamiento`
6. mover a `INICIAL_PAGADA`
7. actualizar lote
8. insertar historial

### 12.3. Marcar contrato firmado

1. validar permisos
2. validar estado actual
3. mover a `CONTRATO_FIRMADO`
4. insertar historial

### 12.4. Registrar cuota

1. validar venta
2. insertar pago `CUOTA`
3. recalcular saldos
4. si es primera cuota y corresponde, mover a `PAGANDO`
5. si completa saldo, mover a `COMPLETADA`
6. actualizar lote si aplica
7. insertar historial si hubo cambio

### 12.5. Marcar venta como caida

1. validar rol `ADMIN`
2. mover venta a `CAIDA`
3. actualizar lote a `DISPONIBLE`
4. insertar historial

## 13. Contratos funcionales esperados del backend

Sin fijar aun rutas finales, el backend debera cubrir al menos:

- buscar cliente por DNI
- crear separacion/venta
- registrar pago
- cambiar estado manual autorizado
- consultar ventas
- consultar pagos de una venta
- consultar historial de estado

## 14. Validaciones minimas esperadas

### En clientes

- `dni` obligatorio y unico
- `nombre_completo` obligatorio

### En ventas

- `precio_venta >= 0`
- `monto_inicial_total >= 0`
- `monto_financiado >= 0`
- `cantidad_cuotas between 1 and 36`
- `monto_cuota > 0`

### En pagos

- `monto > 0`
- `nro_cuota >= 1` cuando `tipo_pago = CUOTA`

## 15. Permisos funcionales

### Publico

- ver lotes
- cotizar
- abrir drawer
- imprimir cotizacion solo si el lote no esta vendido
- no crear ventas

### Asesor

- registrar ventas
- registrar pagos
- generar proforma
- editar informacion permitida del flujo comercial
- solo sobre sus propias ventas
- no reasignar ventas a otro asesor

### Admin

- todo lo del asesor
- gestionar usuarios
- marcar ventas como `CAIDA`
- supervisar dashboard y reportes
- importar ventas historicas asignando asesor segun la fuente

## 16. Consideraciones de implementacion

### 16.1. Etapa de transicion

Mientras el nuevo modelo no este implementado completo:

- el sistema seguira leyendo `lotes` y `usuarios`
- no se debe romper el mapa publico ni el panel actual

### 16.2. Adaptacion futura

Cuando entren `clientes`, `ventas`, `pagos` y `venta_estado_historial`, el proyecto debe migrar a:

- cotizador -> insumo de venta/proforma
- proforma -> insumo comercial del formulario de separacion
- backend -> fuente de verdad de reglas

## 17. Siguiente paso recomendado

Con este documento y `esquemaBD.md` aprobados, el siguiente paso correcto es:

1. redactar la migracion SQL final del esquema `devsimple`
2. definir los indices parciales exactos
3. definir el flujo backend transaccional real
4. despues adaptar frontend para separacion, ventas y pagos
