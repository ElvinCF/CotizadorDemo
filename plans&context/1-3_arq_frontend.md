# Arquitectura de Componentes y Frontend

Actualizado: `2026-03-22`
Rol: `Fuente de verdad`

## Objetivo

Este documento describe el estado actual aplicado del sistema de componentes y frontend.

Aqui vive:

- arquitectura UI vigente
- patrones reutilizables ya aprobados
- componentes base y de dominio
- reglas de composicion
- criterios de validacion entre frontend y backend

No vive aqui:

- ideas futuras
- pendientes
- backlog por fases

Eso va en `2-1_plan_frontend.md`.

## Principios del frontend

### Separacion de responsabilidades

Los componentes base resuelven:

- layout
- consistencia visual
- interaccion generica
- estados de carga, vacio y disabled

Las paginas y modulos de dominio resuelven:

- fetch
- permisos
- mapeo de datos
- validaciones de negocio
- submit y manejo de errores

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
- tema oscuro/claro global
- menu de usuario persistente
- fondo sin scroll global

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

Meta de composicion aprobada:

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

## Relacion con el modulo ventas

Este documento solo cubre patrones compartidos.

La fuente de verdad especifica del modulo ventas vive en:

- `1-3-1_arq_ventas.md`

Aqui solo se documentan los componentes base que ventas reutiliza:

- tablas compartidas
- shells
- toolbar
- inputs base
- wrappers de formularios

## Sistema de dashboard aplicado

Componentes relevantes:

- `AdminDashboardStatCard`
- `AdminDashboardLineChart`
- `AdminDashboardBarChart`
- `AdminDashboardDonutChart`
- `AdminDashboardManzanaChart`
- `AdminDashboardRanking`
- `AdminDashboardChartTooltip`

Reglas vigentes:

- filtros compactos en franja superior
- KPIs arriba
- charts al centro
- tablas operativas abajo
- filtros globales arriba
- filtros locales dentro del card cuando afectan solo a un grafico

Nota:

Los KPIs, charts y endpoints concretos del dashboard se documentan en detalle en `1-3-2_arq_dashboards.md`.

## Como documentar un cambio nuevo

### Si el cambio ya fue aplicado

Actualizar aqui cuando cambie:

- un componente base
- una regla visual compartida
- la estructura de una pagina patron
- una regla de composicion frontend

### Si el cambio aun no esta aplicado

No entra aqui.

Debe ir a `2-1_plan_frontend.md`.

## Criterio de crecimiento documental

Cuando un patron deja de ser experimental y ya vive en codigo:

- sale del plan
- entra a esta arquitectura

Asi la arquitectura siempre describe el sistema real y el plan solo describe lo pendiente.
