# Backend - Pendientes Prioritarios

Este documento resume los pendientes prioritarios del backend del proyecto `Cotizador_Demo`, tomando como base:

- `plans&context/reglasNegocioSistema.md`
- `plans&context/esquemaBD.md`
- `plans&context/sesion_2026-03-16.md`
- estado actual del backend en `backend/lib/*`

La idea es dejar claro:

1. qué ya quedó cubierto
2. qué sigue pendiente en los endpoints ya existentes
3. qué orden conviene seguir para avanzar lento pero seguro

## 1. Estado actual

Hoy el backend ya cubre:

- autenticación simple por `username + pin`
- listado de lotes
- edición de lote
- ajuste masivo de precios
- búsqueda de cliente por DNI
- creación de venta
- edición de venta
- registro de pagos
- detalle de venta
- gestión de usuarios

Además, ya se cerraron estos frentes técnicos:

- acceso a BD unificado con `pg`
- eliminación de `supabase-js` en backend
- transacciones reales para flujos críticos
- validación explícita de disponibilidad de lote
- reglas más estrictas para transiciones manuales
- documentación mínima de endpoints en `backend/ENDPOINTS.md`

## 2. Pendientes Ya Cubiertos

Estos pendientes del plan original ya no deben tratarse como abiertos:

### 2.1. Flujos transaccionales

Ya cubierto para:

- `POST /api/ventas`
- `PUT /api/ventas/:id`
- `POST /api/ventas/:id/pagos`

### 2.2. Disponibilidad comercial del lote

Ya cubierto:

- el lote debe existir
- el lote debe estar `DISPONIBLE`
- no puede tener una venta activa no caída

### 2.3. Endurecimiento básico de transiciones

Ya cubierto:

- `CAIDA` solo por admin
- no se permiten saltos manuales arbitrarios
- pagos no permitidos en ventas `CAIDA` o `COMPLETADA`

### 2.4. Documentación mínima

Ya cubierto con:

- `backend/ENDPOINTS.md`

## 3. Endpoints Ya Existentes Pero Aún Incompletos en Reglas

Aunque los endpoints ya funcionan, todavía quedan reglas de negocio finas por cerrar.

## 3.1. `POST /api/ventas`

### Ya hace

- valida lote
- valida disponibilidad
- valida/crea cliente por DNI
- inserta pagos iniciales
- calcula financiamiento
- corre en transacción

### Falta reforzar

- definir con más precisión qué combinaciones de `estadoVenta` y `pagosIniciales` son válidas
- decidir si una venta sin ningún pago inicial debe permitirse siempre o no
- decidir si `CONTRATO_FIRMADO` debe permitirse al crear o solo después de edición posterior
- definir si múltiples pagos `SEPARACION` o múltiples `INICIAL` en la creación son válidos o no

### Recomendación

No abrir más estados iniciales. Mantener como válidos en creación:

- `SEPARADA`
- `INICIAL_PAGADA`

Y dejar `CONTRATO_FIRMADO` solo como transición manual posterior.

## 3.2. `PUT /api/ventas/:id`

### Ya hace

- edita datos de cliente y venta
- valida transición manual
- restringe `CAIDA` a admin
- corre en transacción

### Falta reforzar

- separar mejor “editar datos” de “cambiar estado”
- definir si una venta `CAIDA` puede volver a editarse en datos generales
- definir si una venta `COMPLETADA` puede cambiar observación, cliente o condiciones comerciales
- definir si cambiar precio después de pagos registrados está permitido siempre

### Riesgo actual

El endpoint mezcla dos responsabilidades:

- edición operativa
- cambio de estado manual

Eso funciona, pero a futuro puede volver ambiguas las reglas.

### Recomendación

Mantenerlo por ahora, pero considerar luego separar:

- `PUT /api/ventas/:id` para edición de datos
- `POST /api/ventas/:id/estado` para transición manual autorizada

## 3.3. `POST /api/ventas/:id/pagos`

### Ya hace

- inserta pago en transacción
- recalcula totales y financiamiento
- deriva estado desde pagos
- sincroniza lote

### Falta reforzar

- definir si `SEPARACION` puede repetirse
- definir si `INICIAL` puede repetirse
- definir si `OTRO` debe afectar o no el estado de venta
- definir si debe bloquearse una `CUOTA` antes de cierto estado
- validar si `nroCuota` duplicado debe permitirse o no

### Punto importante

Hoy el estado derivado depende de existencia de pagos y total abonado, pero no de una política explícita por tipo de pago y orden comercial.

## 3.4. `GET /api/ventas`

### Ya hace

- lista ventas con joins por SQL
- evita el problema de embeds ambiguos de PostgREST

### Falta decidir

- si el listado debe seguir devolviendo `pagos: []` e `historial: []`
- o si el contrato debe ser más liviano y no incluir esas claves en absoluto

### Recomendación

Hacer el contrato del listado explícitamente resumido.

## 3.5. `GET /api/ventas/:id`

### Ya hace

- devuelve detalle completo
- incluye pagos e historial

### Falta reforzar

- documentar mejor el shape final como contrato estable
- validar si el historial debe entregarse siempre ascendente o descendente
- definir si el detalle debe exponer campos calculados extra en el futuro

## 4. Reglas de Negocio Aún Pendientes

Estas no son fallas de implementación, sino decisiones de negocio que el backend todavía necesita cerrar del todo.

### 4.1. Política exacta de pagos iniciales

Definir:

- si `SEPARACION` es obligatoria para abrir una venta
- si `INICIAL` puede ir sin `SEPARACION`
- si ambos pueden ir vacíos

### 4.2. Política exacta de pagos posteriores

Definir:

- si `OTRO` debe mover estado o no
- si `CUOTA` puede existir antes de `CONTRATO_FIRMADO`
- si una cuota con `nroCuota` repetido debe rechazarse

### 4.3. Estados terminales

Definir con claridad si:

- una venta `CAIDA` es totalmente inmutable
- una venta `COMPLETADA` puede recibir ajustes administrativos

### 4.4. Cambios de precio luego de pagos

Definir si:

- el precio de venta puede seguir cambiando después de pagos iniciales
- el precio de venta puede cambiar cuando ya hay cuotas

## 5. Endpoints Nuevos Posibles, Pero No Prioritarios

No son el siguiente paso obligatorio, pero podrían ordenarnos el dominio.

### 5.1. `POST /api/ventas/:id/estado`

Para separar transición manual del update general.

### 5.2. `GET /api/ventas/:id/pagos`

Útil si luego el frontend necesita consultar pagos por separado.

### 5.3. `GET /api/ventas/:id/historial`

Útil si luego el historial crece y no queremos cargarlo siempre en el detalle completo.

## 6. Orden Recomendado de Trabajo

Para seguir lento pero seguro:

1. cerrar reglas faltantes de `POST /api/ventas`
2. cerrar reglas faltantes de `POST /api/ventas/:id/pagos`
3. definir política de edición de ventas `CAIDA` y `COMPLETADA`
4. decidir si `PUT /api/ventas/:id` se separa o no
5. pulir contrato resumido de `GET /api/ventas`

## 7. Tareas Concretas para la Siguiente Iteración Backend

### Bloque A

- endurecer validación de `pagosIniciales`
- restringir estados iniciales permitidos

### Bloque B

- definir reglas exactas por tipo de pago
- decidir qué hace `OTRO`
- evaluar unicidad de `nroCuota` por venta

### Bloque C

- decidir si ventas `CAIDA` y `COMPLETADA` quedan bloqueadas para edición general

### Bloque D

- simplificar contrato de `GET /api/ventas`

## 8. Conclusión

El backend ya está más sólido técnicamente:

- una sola conexión
- transacciones
- validaciones base
- errores HTTP coherentes

Lo que sigue ya no es tanto infraestructura sino cerrar reglas finas del dominio comercial en endpoints que ya existen.
