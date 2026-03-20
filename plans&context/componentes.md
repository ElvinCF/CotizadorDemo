## Plan Detallado - Sistema de Tablas UI

Actualizado: `2026-03-20 15:19:49`

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

### Checklist UI tablas - 2026-03-20 15:19:49
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
- [ ] Fase 4 aplicar a `/lotes`
- [ ] Fase 5 aplicar a tabla de pagos en `/ventas/:id`
- [ ] Fase 6 aplicar a vista tabla de `/`
