## Plan Detallado - Sistema de Tablas UI

Actualizado: `2026-03-20 15:28:15`

### Objetivo
Uniformizar todas las tablas del proyecto con el mismo sistema visual y de interacción, sin mezclar reglas de negocio, permisos o fetch dentro del componente base.

El sistema debe cubrir:
- estructura visual consistente
- altura controlada dentro de pantalla
- toolbar comun
- filtros ocultables
- sort por columna
- scroll y responsividad uniformes

---

### Reglas base del sistema de tablas

#### 1. Estructura visual
- cada tabla vive dentro de un `shell` o card uniforme
- el contenedor no debe exceder `viewport - header`
- el scroll debe ocurrir dentro del body de la tabla, no en toda la pagina
- la tabla debe tener header sticky
- el contenedor debe conservar tokens, radios, bordes y sombras del sistema

#### 2. Toolbar comun
- el sort no va en la toolbar
- la toolbar incluye:
  - busqueda
  - limpiar busqueda
  - boton `Filtros`
  - boton `Limpiar`
  - acciones extra especificas de cada vista

Desktop:
- toolbar en la misma franja que el titulo

Tablet:
- labels de acciones visibles
- busqueda visible, solo ajusta ancho
- sin colapso a icono

Mobile:
- labels de acciones visibles
- busqueda colapsada a icono
- al abrir busqueda, cubre la franja y oculta acciones

#### 3. Filtros
- bloque ocultable con animacion simple
- mismo contenedor y espaciado para todas las vistas
- en mobile se intentan 2 columnas si el contenido lo permite
- fechas deben quedar preferentemente en la misma fila
- cada pagina define sus propios campos de filtro sobre el mismo shell

#### 4. Sort por columna
- un click: asc
- segundo click: desc
- tercer click: none
- el control vive en cada header de columna
- icono outline, pequeno y discreto

#### 5. Scroll y responsividad
- sin columnas fijadas
- desktop:
  - botones con icono + label
- tablet y mobile:
  - botones solo icono cuando sea necesario
- scroll horizontal controlado dentro del contenedor
- densidad mas compacta en tablet/mobile

#### 6. Estados de carga en filas
- estado `loading-initial`: cuando no hay filas aun, mostrar skeleton rows
- estado `loading-refresh`: cuando ya hay filas y entra nueva carga, mantener filas y mostrar aviso de actualizacion
- estado `empty`: sin resultados luego de cargar, mostrar estado vacio
- estado `ready`: render normal de filas
- loader visual comun con shimmer + pulse + dots para feedback continuo

---

### Arquitectura propuesta

Componentes base:
- `DataTableShell`
- `DataTableToolbar`
- `DataTableFilters`
- `DataTable`
- `DataTableSortHeader`

Helpers y tipos:
- `SortState`
- helpers de sort por texto, numero y fecha
- `TableLoadState` con `resolveTableLoadState`

Responsabilidad del sistema base:
- UI
- layout
- interaccion generica

Responsabilidad de cada pagina:
- fetch
- permisos
- reglas de negocio
- transformacion de datos
- acciones por fila

---

### Fases del plan

#### Fase 1. Base visual y comportamiento comun
- crear componentes base
- fijar altura y scroll
- unificar toolbar y filtros
- definir sort reusable

#### Fase 2. Aplicar a `/ventas`
- migrar la tabla de ventas
- agregar busqueda
- agregar filtros
- agregar sort
- dejarlo como caso piloto

#### Fase 3. Aplicar a `/usuarios`
- busqueda por username/nombre
- filtros por rol/estado
- sort por columnas relevantes

#### Fase 4. Aplicar a `/lotes`
- agregar filtros reales ademas de busqueda
- mantener permisos admin/asesor
- no romper el flujo comercial

#### Fase 5. Aplicar a pagos en `/ventas/:id`
- ordenar visualmente el page
- aplicar toolbar simple, filtros y sort

#### Fase 6. Aplicar a la vista tabla de `/`
- alinear la vista publica al mismo sistema
- sin perder sus ventajas actuales

---

### Checklist UI tablas - 2026-03-20 15:28:15
- [x] Fase 1 base creada: `DataTableShell`, `DataTableToolbar`, `DataTableFilters`, `DataTable`, `DataTableSortHeader`
- [x] Altura controlada para vistas de tabla: contenedor interno sin rebasar `viewport - header`
- [x] Header de tabla unificado con titulo + contador
- [x] `meta` normalizado a conteo visible/total potencial en el caso piloto
- [x] Descripcion removida del caso piloto `/ventas`
- [x] Toolbar en desktop en la misma franja que el titulo
- [x] Busqueda tablet visible con ajuste de ancho
- [x] Busqueda mobile colapsable a icono con expansion
- [x] Labels de acciones visibles en tablet/mobile
- [x] Filtros con animacion simple de ocultar/mostrar
- [x] Filtros moviles en 2 columnas cuando es viable
- [x] Fechas por defecto desde minimo y maximo real de la data en `/ventas`
- [x] Fechas bloqueadas a su rango valido en el selector del caso piloto
- [x] Sort por columna en header del caso piloto `/ventas`
- [x] Loader de filas compartido para tablas (`DataTableLoadingRows`)
- [x] Estados de carga compartidos (`loading-initial`, `loading-refresh`, `empty`, `ready`)
- [x] Loader aplicado en `/ventas` y `/usuarios`
- [x] Fase 2 aplicada a `/ventas`
- [x] Fase 3 aplicada a `/usuarios`
- [x] Fase 4 aplicada a `/lotes` (toolbar/filtros/sort/loader sin cambiar logica de negocio)
- [ ] Fase 5 aplicar a tabla de pagos en `/ventas/:id`
- [ ] Fase 6 aplicar a vista tabla de `/`

---

## Plan Detallado - Modulo Ventas (`/ventas/:id`)

Actualizado: `2026-03-21 04:42:19`

### Objetivo
Pasar la vista de detalle de venta a una arquitectura por componentes pequenos, con una UI de expediente editable en el tiempo, soporte de estados, pagos y salida imprimible en dos formatos:
- Ficha de separacion
- Ficha de venta/contrato

### Estructura UX acordada
- Bloque superior: formulario de venta editable en todo el ancho (sin modal extra).
- Bloque inferior: dos cards.
- Izquierda: card de clientes titulares.
- Derecha: card de pagos con tabla.
- Formularios de cliente y pagos en modal.
- Botones de impresion en header de detalle.

### Reglas funcionales del detalle
- Mostrar como editables solo datos de venta que el usuario debe mantener.
- Mantener campos calculados como automaticos en resumen (inicial total, financiado, cuotas, cuota base).
- Permitir segundo titular opcional.
- Impedir que titular principal y segundo titular sean la misma persona (mismo cliente/DNI).
- Registrar pagos desde modal y refrescar venta en pantalla.

### Arquitectura de componentes (implementada)

Componentes nuevos:
- `frontend/src/components/sales/SaleEditableCard.tsx`
- `frontend/src/components/sales/SaleClientCard.tsx`
- `frontend/src/components/sales/SalePaymentsCard.tsx`
- `frontend/src/components/sales/SaleClientModal.tsx`
- `frontend/src/components/sales/SalePaymentModal.tsx`
- `frontend/src/components/sales/salePrint.ts`

Integracion de pagina:
- `frontend/src/pages/sales/SaleFormPage.tsx`
  - modo edicion (`/ventas/:id`): usa layout nuevo por cards + modales
  - modo creacion (`/ventas/nueva`): se mantiene flujo actual para no romper alta

Estilos globales agregados:
- `frontend/src/App.css`
  - grid de detalle y cards laterales
  - estilos de modal cliente/pago
  - estilos de bloques de titulares

### Contratos de datos actualizados (frontend)
- `frontend/src/domain/ventas.ts`
  - `SaleRecord` incluye `cliente2`
  - `SaleFormValues` incluye `cliente2`
  - `SalePatchPayload` incluye `cliente2`

### Soporte backend aplicado
- `backend/lib/ventasService.mjs`
  - `getSaleDetail`: trae `cliente2` via join adicional a `clientes`
  - `getSaleBaseByIdTx`: incluye `cliente2_id`
  - `createSaleAsync`: persiste `cliente2_id` cuando se envia
  - `updateSaleAsync`: actualiza/limpia `cliente2_id` segun payload
  - validacion: segundo titular distinto a titular principal

### Impresion documental
- `salePrint.ts` implementa dos plantillas:
  - separacion (narrativa tipo declaracion)
  - venta/contrato (resumen comercial/contractual)
- Ambas incluyen:
  - logos del proyecto/empresa
  - datos de lote, cliente(s), asesor y plan
  - bloque de firmas

### Checklist modulo ventas - 2026-03-21 04:42:19
- [x] Layout del detalle reordenado a card superior + 2 cards inferiores
- [x] Card de clientes con acciones de editar/agregar/quitar segundo titular
- [x] Modal de cliente con busqueda por DNI
- [x] Card de pagos con tabla operativa
- [x] Modal para registrar pagos
- [x] Soporte de `cliente2` en frontend (tipos + form + payload)
- [x] Soporte de `cliente2` en backend (detalle/crear/editar)
- [x] Validacion de titular principal vs segundo titular
- [x] Botones de impresion para separacion y contrato
- [x] Componentizacion del detalle de venta en piezas pequenas
- [ ] Afinar texto legal final de ambos formatos con negocio
- [ ] Agregar card/timeline visual de historial de estados en el detalle
- [ ] Conectar impresion a version final legal aprobada

### Nota de alcance
Este documento queda como fuente central del plan de componentes del sistema (no solo tablas), incluyendo estructura reusable de vistas de datos y modulos de negocio como ventas.

---

## Plan Detallado - Sistema de Formularios

Actualizado: `2026-03-21 06:35:00`

### Objetivo
Unificar todos los formularios del proyecto en componentes reutilizables, con estilo consistente, validacion predecible y separacion clara entre:
- validacion UX (frontend)
- validacion de negocio y seguridad (backend)

### Inventario actual de inputs y controles

Tipos base detectados:
- `text`
- `password`
- `number`
- `date`
- `email`
- `search`
- `select`
- `textarea`

Controles de interaccion detectados (no `input` simple):
- selector segmentado (tipo tabs/chips)
- busqueda con clear embebido
- campo numerico validado con feedback inline

Campos especiales actuales de negocio:
- DNI
- celular
- PIN
- montos moneda (precio, inicial, cuota, pago)
- cantidades (meses, cuotas)
- fechas de venta y pago
- estados y tipos (selects)

### Problemas actuales a resolver
- validaciones repetidas en cada pagina
- saneamiento de datos mezclado con UI
- formatos (numero/fecha) no unificados
- mensajes de error inconsistentes
- reglas de negocio dispersas entre frontend y backend

### Arquitectura propuesta de componentes de formulario

Base comun:
- `FormField`
- `FormSection`
- `FormActions`

Campos reutilizables:
- `TextField`
- `NumberField`
- `DateField`
- `SelectField`
- `TextAreaField`
- `SearchField`
- `SegmentedField`
- `LookupField`

Campos de dominio (encapsulan formateo/saneo especifico):
- `DniField`
- `PhoneField`
- `PinField`
- `CurrencyField`
- `PercentField`

### Contrato sugerido de props por componente

`FormField` (wrapper visual):
- `label: string`
- `required?: boolean`
- `hint?: string`
- `error?: string | null`
- `htmlFor?: string`
- `children: ReactNode`

`TextField`:
- `value: string`
- `onChange: (value: string) => void`
- `placeholder?: string`
- `maxLength?: number`
- `disabled?: boolean`
- `autoComplete?: string`

`NumberField`:
- `value: string | number`
- `onChange: (value: string) => void`
- `min?: number`
- `max?: number`
- `step?: number`
- `allowNegative?: boolean`
- `decimals?: number`

`DateField`:
- `value: string`
- `onChange: (value: string) => void`
- `min?: string`
- `max?: string`
- `disabled?: boolean`

`SelectField`:
- `value: string`
- `onChange: (value: string) => void`
- `options: Array<{ value: string; label: string; disabled?: boolean }>`
- `placeholder?: string`
- `disabled?: boolean`

`TextAreaField`:
- `value: string`
- `onChange: (value: string) => void`
- `rows?: number`
- `maxLength?: number`

`SearchField`:
- `value: string`
- `onChange: (value: string) => void`
- `onClear?: () => void`
- `placeholder?: string`

`SegmentedField`:
- `value: string`
- `onChange: (value: string) => void`
- `options: Array<{ value: string; label: string; icon?: ReactNode; disabled?: boolean }>`

`LookupField`:
- `value: string`
- `onChange: (value: string) => void`
- `onLookup: () => Promise<void> | void`
- `lookupLabel?: string`
- `loading?: boolean`

### Validaciones por capa (frontend vs backend)

Frontend (UX y prevalidacion):
- campos obligatorios (`required`)
- formato basico (DNI digitos, telefono digitos)
- limites basicos (`min/max/step/maxLength`)
- consistencia visual de errores por campo
- bloqueo de acciones cuando faltan datos minimos
- normalizacion de entrada (trim, reemplazo de coma por punto en numericos)

Backend (fuente de verdad):
- permisos por rol y usuario autenticado
- transiciones validas de estado de venta
- reglas de negocio de pagos (tipos, montos, cuotas)
- relaciones y unicidad (cliente/venta/lote)
- recalculo y persistencia de campos derivados
- validacion final de integridad de payload

Regla de oro:
- si frontend y backend discrepan, manda backend
- frontend no debe decidir reglas comerciales criticas

### Formularios del proyecto y orden de migracion

Fase F1 - Biblioteca base:
- crear `FormField`, `TextField`, `NumberField`, `SelectField`, `DateField`, `TextAreaField`
- definir estilos/tokens y estados (`default/focus/error/disabled`)

Fase F2 - Modulo ventas (`/ventas/:id` y modales):
- `SaleEditableCard` (estado, financiamiento, fecha, precio, cuotas, observacion)
- `SaleClientModal` (DNI lookup + datos cliente)
- `SalePaymentModal` (tipo pago, monto, fecha, cuotas)

Fase F3 - Modulo usuarios (`/usuarios`):
- formulario de alta/edicion de usuario admin/asesor
- reemplazo de inputs manuales por componentes base

Fase F4 - Ajuste masivo y lotes (`/lotes`):
- modal de ajuste masivo
- inputs numericos y selects de filtros de lotes

Fase F5 - Proforma y cotizador:
- campos de contacto y montos en `ProformaModal`
- unificar saneamiento de moneda/porcentaje

Fase F6 - Cierre y endurecimiento:
- extraer validadores frontend reutilizables por dominio
- homologar mensajes de error frontend/backend
- pruebas de regresion de formularios criticos

### Checklist formularios - 2026-03-21 06:35:00
- [x] Inventario inicial de tipos de inputs y controles realizado
- [x] Definicion de arquitectura de componentes de formularios
- [x] Contrato de props propuesto por componente base
- [x] Mapa de validaciones frontend vs backend definido
- [x] Orden de migracion por formularios y pantallas definido
- [ ] Implementar F1 (biblioteca base de formularios)
- [ ] Migrar F2 ventas completo
- [ ] Migrar F3 usuarios
- [ ] Migrar F4 lotes
- [ ] Migrar F5 proforma/cotizador
- [ ] Ejecutar F6 (hardening + pruebas)



# POR CORREGIR DESPUES DE DESPLIEGUE:
## Filtros Lotes 
* Corregir min y max en M2
* Aclarar iconos de ocultar/mostrar filtros y Limpiar 

## Venta_id:
Mover funciones a modal Ajustes en venta:
* Tipo de financiamiento (reducir cuotas por defecto)
* Fecha de primera cuoteo 

Correxiones:
* Ver error en actualización automática de Estados 
* Mostrar Histórico de estados 
* Quitar regla de 6k min en inicial 
* Venta nueva con ui anterior, actualizar
* La venta debe permitir guardado parcial y edición siempre. Sin campos obligatorios 

## Permitir por mientras 
* Llenado de ventas sin clientes y sin asesor, sin pagos y admin puede elegir asesor 