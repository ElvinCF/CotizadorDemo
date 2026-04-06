# Reglas de Negocio

Actualizado: `2026-04-06`

## Acceso y proyecto activo

- el sitio público resuelve proyecto por `slug`
- `ADMIN` y `ASESOR` no eligen proyecto libremente
- el backend resuelve proyecto visible por sesión
- `SUPERADMIN` puede cambiar proyecto activo
- `ADMIN` no ve `SUPERADMIN`
- `ADMIN` no conoce la estructura interna de equipos
- `/empresa` es solo para `SUPERADMIN`

## Rutas

### Público

- `/`
- `/:slug`
- `/:slug/cotizador`
- `/:slug/cotizador/:loteCodigo`
- `/login`

### Privado

- `/:slug/dashboard`
- `/:slug/lotes`
- `/:slug/ventas`
- `/:slug/ventas/nueva`
- `/:slug/ventas/:id`
- `/:slug/usuarios`
- `/:slug/proyecto`
- `/:slug/empresa`
- `/:slug/editor`

## Proyecto

- `slug` público único
- dentro de la misma empresa:
  - mismo `nombre` + misma `etapa` => no permitido
  - mismo `nombre` + distinta `etapa` => permitido
  - distinto `nombre` + misma `etapa` => permitido

## Lotes

- un lote pertenece a un proyecto
- `precio_referencial` se muestra al público
- `precio_minimo` no se muestra al público
- la venta no puede cerrar por debajo de `precio_minimo`
- estados públicos:
  - `DISPONIBLE`
  - `SEPARADO`
  - `VENDIDO`

## Colores y branding

- si el proyecto no define tema válido, el sistema usa tokens base del software
- el proyecto no debe pisar tokens estructurales si no hay configuración válida
- la paleta de estados de lote es configurable por proyecto
- el overlay usa:
  - fill transparente por estado
  - sin bordes en reposo
  - borde en hover/selección

## Cotizador

- el cotizador manual usa configuración comercial del proyecto:
  - `inicial_minima`
  - `separacion_minima`
  - `cuotas_minimas`
  - `cuotas_maximas`
  - `meses_referenciales`
- esas reglas aplican a:
  - presets
  - sliders
  - validaciones
  - proforma
  - alta de venta desde cotizador

## Ventas

- el backend es la fuente de verdad de reglas
- `ASESOR` no puede operar ventas de otro asesor
- `CAIDA` es administrativa
- `CAIDA` queda restringida a `ADMIN`
- la unicidad de venta activa se resuelve en backend/BD, no por estado visual del lote

## Equipos

- los equipos pertenecen a un proyecto
- se pueden:
  - crear
  - editar
  - eliminar
- la UI ya actualiza sin recargar al crear/editar/eliminar

## Mapa y assets

- un proyecto nuevo no debe heredar mapa, lotes ni branding operativo de otro proyecto
- si el proyecto no tiene mapa/lotes propios:
  - se muestra estado de configuración
- si el proyecto sí existe y aún está cargando:
  - no debe mostrar falso estado de configuración

## Validaciones de backend relevantes

- `slug` único
- `nombre + etapa` único por empresa
- bulk status solo para `ADMIN` y `SUPERADMIN`
- el backend filtra siempre por proyecto visible
