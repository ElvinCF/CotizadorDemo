# Plan completo de base de datos para `Mapa Cotizador` en esquema `dev`

## Objetivo

Diseñar y crear la base de datos de `Mapa Cotizador` como producto digital independiente, pero preparada para integrarse después con el CRM.

Este diseño prioriza:
- consistencia de datos
- bajo acoplamiento
- trazabilidad comercial
- facilidad de integración futura
- soporte para múltiples clientes vinculados a una misma venta
- control administrativo de acciones sensibles

---

## Alcance del modelo

El sistema tendrá como eje comercial:
- empresa
- proyecto inmobiliario
- lote
- venta
- pagos
- personas
- usuarios
- vinculación de personas a ventas

Quedan fuera del alcance actual:
- tabla de contratos
- tabla de testigos
- tabla de representantes
- tabla de asesores separada

---

## Decisiones de diseño validadas

### 1. Tabla base `personas`
Todas las tablas que repiten datos personales deben apoyarse en una sola tabla base llamada `personas`.

Esto evita duplicar campos como:
- nombres
- apellidos
- documento
- celular
- correo
- ocupación
- dirección

Con esto:
- cliente principal apunta a `personas`
- usuario apunta a `personas`
- persona relacionada apunta a `personas`

### 2. Tabla `usuarios`
La tabla `usuarios` será exclusiva para autenticación y control interno.

Debe contener solo:
- `persona_id`
- `username`
- `pin_hash`
- `rol`
- `estado`
- timestamps

Notas:
- el PIN será de 6 dígitos, pero no se guarda plano
- siempre debe guardarse como hash
- “asesor” será solo un valor de `rol`
- por ahora no se crea tabla `asesores`

### 3. Asesor no requiere tabla propia por ahora
No se creará tabla `asesores` mientras el asesor sea únicamente un usuario del sistema con rol `ASESOR`.

Solo se justificaría una tabla propia si después necesitas guardar atributos laborales o comerciales propios, por ejemplo:
- comisión
- meta
- supervisor
- zona
- código interno

Por ahora no hace falta.

### 4. Tabla puente `ventas_clientes`
Sí se debe crear una tabla puente para vincular una o varias personas a una venta.

Esto sirve para:
- titular
- cónyuge
- conviviente
- cotitular
- garante
- familiar
- otros relacionados

No reemplaza `detalle_venta`.
Simplemente resuelve una relación muchos a muchos entre ventas y personas.

### 5. Validación admin para vinculaciones sensibles
La autorización con PIN admin no se resuelve con otra tabla de negocio, sino con:
- lógica backend
- auditoría persistida en BD

La app debe:
1. pedir PIN/admin
2. validar que el usuario sea `ADMIN`
3. registrar quién autorizó
4. registrar motivo y fecha

Eso quedará reflejado en:
- `ventas_clientes`
- y opcionalmente en una tabla de auditoría de autorizaciones

---

## Modelo final de tablas

Las tablas finales recomendadas son:
1. `personas`
2. `usuarios`
3. `empresas`
4. `proyectos`
5. `lotes`
6. `ventas`
7. `ventas_clientes`
8. `pagos`
9. `autorizaciones_admin` opcional pero muy recomendable

---

## Enums recomendados

Crear primero estos enums dentro del esquema `dev`.

### `rol_usuario_enum`
Valores:
- `ADMIN`
- `ASESOR`
- `CLIENTE`
- `SUPERVISOR`

### `estado_general_enum`
Valores:
- `ACTIVO`
- `INACTIVO`

### `tipo_documento_enum`
Valores:
- `DNI`
- `CE`
- `PASAPORTE`
- `RUC`
- `OTRO`

### `estado_lote_enum`
Valores:
- `LIBRE`
- `SEPARADO`
- `VENDIDO`
- `BLOQUEADO`
- `INACTIVO`

### `etapa_venta_enum`
Valores:
- `SEPARADO`
- `CONTRATO`
- `PAGANDO`
- `COMPLETADO`
- `ANULADO`

### `estado_registro_enum`
Valores:
- `ACTIVO`
- `ANULADO`
- `ELIMINADO_LOGICO`

### `tipo_pago_enum`
Valores:
- `SEPARACION`
- `INICIAL`
- `CUOTA`
- `ABONO_EXTRAORDINARIO`
- `AJUSTE`
- `DEVOLUCION`

### `forma_pago_enum`
Valores:
- `EFECTIVO`
- `TRANSFERENCIA`
- `YAPE`
- `PLIN`
- `DEPOSITO`
- `TARJETA`
- `OTRO`

### `rol_en_venta_enum`
Valores:
- `TITULAR`
- `CONYUGE`
- `CONVIVIENTE`
- `COTITULAR`
- `GARANTE`
- `FAMILIAR`
- `OTRO`

### `accion_admin_enum` opcional, recomendada
Valores:
- `AGREGAR_VINCULACION_VENTA_PERSONA`
- `QUITAR_VINCULACION_VENTA_PERSONA`
- `LIBERAR_LOTE`
- `ANULAR_VENTA`
- `EDITAR_PAGO`
- `REASIGNAR_VENTA`

---

## Definición funcional por tabla

## 1. `dev.personas`

### Propósito
Tabla maestra base para toda persona física registrada en el sistema.

### Campos sugeridos
- `id`
- `tipo_documento`
- `numero_documento`
- `nombres`
- `apellidos`
- `fecha_nacimiento`
- `celular`
- `correo`
- `ocupacion`
- `direccion`
- `departamento`
- `provincia`
- `distrito`
- `referencia`
- `estado`
- `created_at`
- `updated_at`

### Reglas
- índice por `numero_documento`
- unique recomendado en `(tipo_documento, numero_documento)`
- `nombre_completo` puede almacenarse por rendimiento, aunque también podría derivarse

## 2. `dev.usuarios`

### Propósito
Autenticación y permisos internos.

### Campos sugeridos
- `id`
- `persona_id`
- `username`
- `pin_hash`
- `rol`
- `estado`
- `created_at`
- `updated_at`

### Reglas
- `persona_id` FK → `dev.personas.id`
- `username` unique
- índice por `persona_id`
- no guardar PIN plano
- hash obligatorio
- `rol = 'ASESOR'` representa al asesor

## 3. `dev.empresas`

### Propósito
Empresa propietaria del proyecto o de la operación comercial.

### Campos sugeridos
- `id`
- `razon_social`
- `nombre_comercial`
- `ruc`
- `telefono`
- `correo`
- `direccion`
- `estado`
- `created_at`
- `updated_at`

### Reglas
- unique en `ruc`

## 4. `dev.proyectos`

### Propósito
Proyecto inmobiliario comercializable.

### Campos sugeridos
- `id`
- `empresa_id`
- `nombre`
- `codigo`
- `descripcion`
- `departamento`
- `provincia`
- `distrito`
- `sector`
- `direccion_referencia`
- `estado`
- `fecha_inicio_comercial`
- `fecha_fin_comercial`
- `created_at`
- `updated_at`

### Reglas
- FK `empresa_id` → `dev.empresas.id`
- índice por `empresa_id`
- unique recomendado en `(empresa_id, codigo)`

## 5. `dev.lotes`

### Propósito
Producto vendible asociado a un proyecto.

### Campos sugeridos
- `id`
- `proyecto_id`
- `codigo`
- `manzana`
- `numero`
- `area_m2`
- `precio_lista`
- `precio_minimo`
- `precio_referencial`
- `estado_comercial`
- `moneda`
- `observaciones`
- `created_at`
- `updated_at`

### Reglas
- FK `proyecto_id` → `dev.proyectos.id`
- índice por `proyecto_id`
- unique recomendado en `(proyecto_id, codigo)`
- unique opcional en `(proyecto_id, manzana, numero)`

### Nota
`estado_comercial` representa el estado actual del lote.
La historia comercial real vive en `ventas`.

## 6. `dev.ventas`

### Propósito
Operación comercial principal sobre un lote.

### Campos sugeridos
- `id`
- `proyecto_id`
- `lote_id`
- `cliente_titular_persona_id`
- `asesor_usuario_id`
- `codigo_venta`
- `etapa_venta`
- `estado_registro`
- `fecha_venta`
- `fecha_separacion`
- `fecha_contrato`
- `precio_lote`
- `monto_separacion_pactado`
- `monto_inicial_pactado`
- `monto_financiado_pactado`
- `numero_cuotas_pactadas`
- `monto_cuota_referencial`
- `plazo_meses`
- `pagado_total`
- `saldo_pendiente`
- `moneda`
- `observaciones`
- `created_at`
- `updated_at`

### Relaciones
- FK `proyecto_id` → `dev.proyectos.id`
- FK `lote_id` → `dev.lotes.id`
- FK `cliente_titular_persona_id` → `dev.personas.id`
- FK `asesor_usuario_id` → `dev.usuarios.id`

### Reglas
- índice por `lote_id`
- índice por `cliente_titular_persona_id`
- índice por `asesor_usuario_id`
- índice por `etapa_venta`

### Recomendación
Aunque el titular ya esté aquí como FK directo, también conviene insertarlo en `ventas_clientes` con rol `TITULAR`.

## 7. `dev.ventas_clientes`

### Propósito
Tabla puente entre una venta y una o varias personas vinculadas.

### Casos de uso
- titular
- cónyuge
- conviviente
- cotitular
- garante
- familiar
- otro relacionado

### Campos sugeridos
- `id`
- `venta_id`
- `persona_id`
- `rol_en_venta`
- `es_titular`
- `observacion`
- `agregado_por_usuario_id`
- `autorizado_por_usuario_id`
- `fecha_autorizacion`
- `motivo_autorizacion`
- `created_at`
- `updated_at`

### Relaciones
- FK `venta_id` → `dev.ventas.id`
- FK `persona_id` → `dev.personas.id`
- FK `agregado_por_usuario_id` → `dev.usuarios.id`
- FK `autorizado_por_usuario_id` → `dev.usuarios.id`

### Reglas
- índice por `venta_id`
- índice por `persona_id`
- unique recomendado en `(venta_id, persona_id, rol_en_venta)`

### Nota importante
La autorización admin para ciertos vínculos sensibles queda auditada aquí mismo.

## 8. `dev.pagos`

### Propósito
Registrar todos los movimientos económicos de una venta.

### Campos sugeridos
- `id`
- `venta_id`
- `tipo_pago`
- `concepto`
- `fecha_pago`
- `monto`
- `forma_pago`
- `numero_operacion`
- `moneda`
- `observaciones`
- `registrado_por_usuario_id`
- `created_at`
- `updated_at`

### Relaciones
- FK `venta_id` → `dev.ventas.id`
- FK `registrado_por_usuario_id` → `dev.usuarios.id`

### Reglas
- índice por `venta_id`
- índice por `fecha_pago`
- índice por `tipo_pago`

### Observación
Todo pago real debe vivir aquí:
- separación
- inicial
- cuota
- abonos extra
- ajustes
- devoluciones

## 9. `dev.autorizaciones_admin` opcional, recomendada

### Propósito
Auditoría de acciones sensibles aprobadas por administrador.

### Campos sugeridos
- `id`
- `usuario_admin_id`
- `usuario_solicitante_id`
- `accion`
- `tabla_objetivo`
- `registro_objetivo_id`
- `motivo`
- `fecha_autorizacion`
- `created_at`
- `updated_at`

### Relaciones
- FK `usuario_admin_id` → `dev.usuarios.id`
- FK `usuario_solicitante_id` → `dev.usuarios.id`

### Casos recomendados
- agregar vinculación extra a venta
- quitar vinculación
- liberar lote
- anular venta
- editar pago sensible
- reasignar una venta

---

## Relación general del modelo

```text
personas
  └── usuarios

empresas
  └── proyectos
        └── lotes

ventas
  ├── proyecto_id -> proyectos
  ├── lote_id -> lotes
  ├── cliente_titular_persona_id -> personas
  └── asesor_usuario_id -> usuarios

ventas_clientes
  ├── venta_id -> ventas
  ├── persona_id -> personas
  ├── agregado_por_usuario_id -> usuarios
  └── autorizado_por_usuario_id -> usuarios

pagos
  ├── venta_id -> ventas
  └── registrado_por_usuario_id -> usuarios
```

---

## Reglas de negocio obligatorias

### 1. Un lote no puede tener dos ventas activas al mismo tiempo
Solo puede existir una venta activa por lote en etapas:
- `SEPARADO`
- `CONTRATO`
- `PAGANDO`

Esto debe validarse por:
- backend
- y de ser posible con índice parcial o constraint adicional

### 2. Estado del lote según etapa de venta
Reglas sugeridas:
- si venta pasa a `SEPARADO` → lote pasa a `SEPARADO`
- si venta pasa a `CONTRATO` → lote permanece `SEPARADO`
- si venta pasa a `PAGANDO` → lote permanece `SEPARADO`
- si venta pasa a `COMPLETADO` → lote pasa a `VENDIDO`
- si venta pasa a `ANULADO` → lote vuelve a `LIBRE`, siempre que no exista otra venta activa

### 3. Todo pago debe pertenecer a una venta
Nunca al lote directamente.

### 4. Toda vinculación sensible debe requerir autorización admin
Esto aplica cuando la lógica del negocio lo considere necesario.

La autorización debe:
- validar rol admin
- registrar usuario autorizador
- registrar fecha
- registrar motivo

### 5. El titular debe existir en `ventas` y preferiblemente también en `ventas_clientes`
Así centralizas mejor las personas relacionadas a la venta.

### 6. El PIN admin solo se valida en backend
Nunca se guarda en tablas de auditoría ni en texto plano.

---

## Estrategia de creación en esquema `dev`

## Fase 1. Preparación del esquema

### Paso 1
Crear el esquema:

```sql
create schema if not exists dev;
```

### Paso 2
Definir convenciones:
- tablas en plural
- snake_case
- PK `id`
- FK `xxx_id`
- timestamps en todas las tablas

### Paso 3
Definir tipos base:
- UUID para ids
- `timestamptz` para fechas de auditoría
- `date` para fechas puramente calendarias
- `numeric` para montos
- `text` para observaciones y campos flexibles

## Fase 2. Crear enums

Crear todos los enums antes de las tablas.

Orden sugerido:
1. `rol_usuario_enum`
2. `estado_general_enum`
3. `tipo_documento_enum`
4. `estado_lote_enum`
5. `etapa_venta_enum`
6. `estado_registro_enum`
7. `tipo_pago_enum`
8. `forma_pago_enum`
9. `rol_en_venta_enum`
10. `accion_admin_enum` si usarás auditoría avanzada

## Fase 3. Crear tablas maestras base

Orden sugerido:
1. `dev.personas`
2. `dev.usuarios`
3. `dev.empresas`
4. `dev.proyectos`
5. `dev.lotes`

## Fase 4. Crear tablas transaccionales

Orden sugerido:
1. `dev.ventas`
2. `dev.ventas_clientes`
3. `dev.pagos`
4. `dev.autorizaciones_admin` opcional

## Fase 5. Índices y constraints

Después de crear tablas, agregar:

### Índices mínimos
- `personas(numero_documento)`
- `usuarios(username)`
- `proyectos(empresa_id)`
- `lotes(proyecto_id)`
- `ventas(lote_id)`
- `ventas(cliente_titular_persona_id)`
- `ventas(asesor_usuario_id)`
- `ventas_clientes(venta_id)`
- `ventas_clientes(persona_id)`
- `pagos(venta_id)`
- `pagos(fecha_pago)`

### Unique recomendados
- `personas(tipo_documento, numero_documento)`
- `usuarios(username)`
- `empresas(ruc)`
- `proyectos(empresa_id, codigo)`
- `lotes(proyecto_id, codigo)`
- `ventas_clientes(venta_id, persona_id, rol_en_venta)`

## Fase 6. Triggers y funciones base

Crear al menos estas utilidades:

### 1. Trigger de `updated_at`
Para todas las tablas.

### 2. Función para recalcular totales de venta
Cada vez que se inserte, edite o elimine un pago válido:
- recalcular `pagado_total`
- recalcular `saldo_pendiente`

### 3. Función para sincronizar estado de lote
Cuando cambie la etapa de venta:
- actualizar `lotes.estado_comercial`

### 4. Validación de venta activa por lote
Puede ser:
- lógica backend
- o función de validación previa si quieres endurecer más la consistencia

## Fase 7. Datos semilla iniciales

Cargar primero:

### 1. Empresa
Ejemplo:
- razón social
- nombre comercial
- RUC

### 2. Proyecto inicial
Ejemplo:
- Arenas Malabrigo 2

### 3. Usuarios base
Crear:
- 1 admin
- 1 o más asesores

### 4. Personas vinculadas a esos usuarios
Cada usuario debe tener su fila en `personas`

### 5. Lotes del proyecto
Importar:
- código
- manzana
- número
- área
- precio
- estado inicial

## Fase 8. Flujo de pruebas funcionales

Una vez montada la BD, probar este flujo.

### Caso 1. Crear cliente nuevo
- insertar en `personas`

### Caso 2. Registrar venta
- crear fila en `ventas`

### Caso 3. Insertar titular en `ventas_clientes`
- rol `TITULAR`
- `es_titular = true`

### Caso 4. Registrar cónyuge o cotitular
- insertar otra persona
- vincular en `ventas_clientes`
- si corresponde, exigir autorización admin

### Caso 5. Registrar pago de separación
- insertar en `pagos` con `tipo_pago = SEPARACION`

### Caso 6. Registrar inicial
- insertar en `pagos` con `tipo_pago = INICIAL`

### Caso 7. Registrar cuota
- insertar en `pagos` con `tipo_pago = CUOTA`

### Caso 8. Verificar recalculo automático
- revisar `pagado_total`
- revisar `saldo_pendiente`

### Caso 9. Cambiar venta a `COMPLETADO`
- verificar lote en `VENDIDO`

### Caso 10. Anular venta
- verificar reglas para lote en `LIBRE` si no hay otra venta activa

---

## Recomendaciones técnicas para Supabase/Postgres

### Tipos de datos sugeridos
- UUID para PK
- `numeric(12,2)` para montos
- `date` para fechas comerciales
- `timestamptz` para auditoría
- `text` para observaciones y descripciones

### Seguridad recomendada
1. No guardar PIN plano
2. Toda acción sensible validarla en backend
3. Auditar autorizaciones
4. Usar soft-delete si lo necesitas en vez de borrado físico

---

## Posible roadmap posterior
Después de tener esta base estable, podrías agregar:
- tabla de cronograma referencial de cuotas
- tabla de descuentos o promociones
- tabla de documentos adjuntos
- integración con CRM por `persona_id` o equivalencias
- historial de cambios por tabla
- políticas RLS por rol en Supabase

---

## Resumen ejecutivo final

La estructura recomendada para `Mapa Cotizador` en `dev` es:
- `personas` como base común
- `usuarios` solo para acceso y rol
- no crear `asesores` por ahora
- `lotes` como producto comercial
- `ventas` como operación principal
- `ventas_clientes` como tabla puente para múltiples personas relacionadas
- `pagos` como único origen de movimientos económicos
- `autorizaciones_admin` como auditoría recomendada

Con esto obtienes una base:
- ordenada
- extensible
- ligera
- integrable
- lista para evolucionar sin rehacer el modelo

---

## Próximo entregable ideal
Después de aprobar este plan, el siguiente paso lógico es uno de estos dos:
1. generar el SQL completo para crear todo el esquema `dev`
2. generar un diccionario de datos técnico columna por columna
3. preparar un script semilla con empresa, proyecto, admin y lotes de prueba

