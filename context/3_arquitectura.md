# Arquitectura Base de la Aplicacion

Actualizado: `2026-03-23`
Rol: `Fuente de verdad`

## Objetivo

Este documento describe la arquitectura base aplicada del sistema.

Aqui vive:

- la estructura comun del frontend
- las responsabilidades reales del backend
- los contratos compartidos entre UI y API
- los patrones reutilizables ya aprobados
- el marco padre de modulos derivados

No vive aqui:

- ideas futuras
- pendientes
- backlog por fases

Eso va en `4_planes.md`.

## Capas del sistema

### Frontend

Resuelve:

- layout global
- navegacion por rutas
- experiencia responsive
- tablas, formularios y shells compartidos
- feedback visual, loaders y estados vacios
- armado del payload para consumo de API

### Backend

Resuelve:

- autenticacion operativa y permisos
- validacion oficial del payload
- integridad relacional
- transacciones
- reglas de negocio
- recalculos oficiales
- lectura consolidada para dashboards

### Base de datos

Resuelve:

- persistencia oficial
- relaciones entre entidades
- enums, restricciones y valores por defecto
- soporte a trazabilidad, ventas, pagos y usuarios

La estructura detallada y reglas globales viven en:

- `1_esquema_bd.md`
- `2_reglas_negocio.md`

## Principios aplicados

### Separacion de responsabilidades

Los componentes base resuelven:

- consistencia visual
- interaccion generica
- estados de carga, vacio y disabled
- composicion de paginas y shells

Las paginas y modulos de dominio resuelven:

- fetch
- permisos visibles por rol
- mapeo de datos
- submit
- manejo de errores

El backend resuelve:

- autorizacion real
- reglas de negocio
- validacion final
- sincronizacion de estados
- recalculos persistentes

### Scroll controlado

- el fondo no debe scrollear
- el header se mantiene comun
- el scroll se delega a `main`, cards, tablas o drawers internos

### Responsividad real

- desktop: toolbar completa y labels visibles
- tablet: se reduce protagonismo del texto y se conservan acciones clave
- mobile: prioridad a iconos, compactacion y busqueda colapsable

## Shell global aplicado

Componentes y bloques base:

- `AppShell`
- `ThemeToggle`
- `UserAvatarMenu`
- header global por rol

Reglas vigentes:

- header comun para rutas principales
- el `AppShell` usa un `<header>` real y reutilizable; el titulo y acciones cambian por ruta y acceso
- la altura efectiva de `header` y `footer` se mide en runtime y se expone por variables CSS para evitar solapamientos del contenido
- tema oscuro/claro global
- menu de usuario persistente
- fondo sin scroll global
- footer global delgado integrado al layout, no flotante
- el footer global muestra credito a `Adaptic by grupo AIO` y enlaza a `https://www.instagram.com/adaptic.pe`

## Contratos compartidos UI / API

Reglas vigentes:

- frontend puede anticipar errores obvios, pero el backend decide la validez final
- el backend debe responder mensajes consumibles por UI
- los modulos deben tolerar estados parciales cuando la operacion real lo requiera
- el frontend no debe asumir que una regla de negocio queda cerrada solo por ocultar o deshabilitar algo
- en el cotizador, la seleccion publica del lote vive en la URL ` /cotizador/:loteCodigo `
- los ajustes manuales del cotizador se persisten en cache local por lote y se reutilizan al abrir proforma o venta nueva
- el acceso operativo por lote hacia una venta se resuelve con un endpoint liviano de accesos por lote, no reutilizando necesariamente el listado general de ventas

## Sistema de tablas aplicado

Componentes base:

- `DataTableShell`
- `DataTableToolbar`
- `DataTableFilters`
- `DataTable`
- `DataTableSortHeader`
- `DataTableLoadingRows`

Reglas vigentes:

- cada tabla vive dentro de un shell uniforme
- el alto util debe quedar contenido en `viewport - header`
- el scroll ocurre dentro del body de tabla o su card contenedora
- el sort vive en el header de columna
- la toolbar concentra busqueda, filtros, limpiar y acciones
- los paneles de filtros arrancan contraidos por defecto y se expanden por accion explicita del usuario
- la busqueda en mobile puede colapsar a icono y expandirse
- los loaders de tabla son compartidos
- en mobile los botones priorizan icono sobre label

Pantallas ya alineadas o parcialmente alineadas:

- `/ventas`
- `/usuarios`
- `/lotes`
- tabla de pagos en detalle de venta

## Sistema de formularios aplicado

Situacion actual:

- ya existe reutilizacion visual parcial
- aun no existe un set completo de inputs base totalmente abstraidos

Base de composicion aprobada:

### Inputs base

- `TextField`
- `NumberField`
- `DateField`
- `SelectField`
- `TextareaField`
- `SearchField`
- `SegmentedField`
- `SliderField`

### Wrappers comunes

- `FormField`
- `FormRow`
- `FormSection`
- `FormActions`
- `FormErrorText`
- `FormHint`

### Formularios de dominio

- `UserForm`
- `SaleForm`
- `SalePaymentForm`
- `SaleClientForm`
- `LoginForm`
- `BulkPriceAdjustmentForm`

## Reparto de validaciones

### Frontend

Resuelve:

- campos requeridos evidentes
- formato visible
- rangos basicos
- estados disabled
- feedback inmediato
- bloqueo de submit obvio

### Backend

Resuelve:

- permisos
- integridad relacional
- transacciones
- reglas de negocio
- sincronizaciones
- no duplicidad
- recalculos oficiales

## Relacion con modulos derivados

Este documento es la arquitectura padre de la aplicacion en el frente y sus contratos con backend.

Ventas y dashboards mantienen documentos hijos mientras necesiten mayor detalle:

- `3-1_arq_ventas.md`
- `3-2_arq_dashboards.md`

Este archivo no reemplaza esos documentos. Los engloba.

## Modulo ventas

Este documento solo fija el marco comun del modulo.

La fuente de verdad especifica de ventas vive en:

- `3-1_arq_ventas.md`

Aqui solo se documentan patrones compartidos que ventas reutiliza:

- tablas compartidas
- shells
- toolbar
- inputs base
- wrappers de formularios
- contratos UI/API para submit, validacion y errores
- regla actual de guardado parcial:
  - frontend y backend bloquean solo por `fecha_venta`
  - la persistencia parcial del resto vive en el modulo ventas
  - en venta nueva, las filas vacias de `SEPARACION` e `INICIAL` no se envian ni bloquean el submit
  - los errores y avisos operativos del modulo ventas deben poder cerrarse desde la UI
  - la creacion de venta no se bloquea por `estado_comercial` del lote
  - la unicidad de venta activa queda delegada al indice parcial de BD y a su manejo de error
  - el detalle de venta ya expone `Ajustes` con tabs `Historial`, `Llenado de la venta` y `Administrativo`
  - `Administrativo` concentra lectura de control y edicion de `asesor asignado` solo para admin mas `fecha_pago_pactada`

## Modulo dashboards

Este documento solo fija el marco comun del modulo.

La fuente de verdad especifica de dashboards vive en:

- `3-2_arq_dashboards.md`

Aqui solo se documentan patrones compartidos que dashboards reutiliza:

- stat cards
- charts base
- toolbars y filtros
- consumo agregado de API

## Como documentar un cambio nuevo

### Si el cambio ya fue aplicado

Actualizar aqui cuando cambie:

- una regla base de composicion
- un contrato compartido entre UI y API
- una responsabilidad transversal entre frontend y backend
- una estructura comun de pagina o shell

### Si el cambio aun no esta aplicado

No entra aqui.

Debe ir a `4_planes.md`.

## Criterio de crecimiento documental

Cuando un patron deja de ser experimental y ya vive en codigo:

- sale del plan
- entra a esta arquitectura

Si el patron afecta un modulo concreto sin cambiar la base:

- se documenta en su `arq_*` hijo

Asi la arquitectura base describe el sistema real y los planes describen lo pendiente.
