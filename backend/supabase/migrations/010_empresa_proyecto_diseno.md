# Incremento 010 - Diseno Empresa/Proyectos/Accesos (sin DDL aun)

Estado: propuesta aprobada a nivel funcional.  
Pendiente: ejecucion SQL en schema `dev`.

## 1) Modelo objetivo (resumen)

Jerarquia final:

- `empresa > proyectos > equipos > equipo_usuarios > usuarios`

Acceso por dominio/proyecto:

- `proyectos > proyecto_usuarios > usuarios`

Roles globales en `usuarios`:

- `SUPERADMIN`
- `ADMIN`
- `ASESOR`

Reglas:

- `SUPERADMIN`: acceso total (empresa + todos los proyectos + equipos + usuarios).
- `ADMIN`: solo su proyecto y su(s) equipo(s) asignado(s).
- `ASESOR`: solo su proyecto y su equipo.

## 2) Tabla `empresa` (schema dev)

Una empresa por base de datos.

- `id uuid pk default gen_random_uuid()`
- `nombre_comercial text not null`
- `razon_social text not null`
- `ruc text not null unique`
- `direccion_fiscal text null`
- `telefono text null`
- `email text null`
- `web_url text null`
- `logo_principal_url text null`
- `logo_secundario_url text null`
- `estado boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

## 3) Tabla `proyectos` (schema dev)

Cambios solicitados ya incorporados:

- sin `codigo`
- sin `predio`
- archivos (`logo_header_url`, `logo_footer_url`, `mapa_svg_url`, `mapa_webp_url`) se dejan en plan futuro
- overlays en `jsonb`
- estado como `boolean`
- tema por colores en `jsonb`

Columnas:

- `id uuid pk default gen_random_uuid()`
- `empresa_id uuid not null fk -> empresa(id)`
- `nombre text not null`
- `etapa text null`
- `descripcion_corta text null`
- `ubicacion_texto text null`
- `distrito text null`
- `provincia text null`
- `departamento text null`
- `pais text not null default 'Peru'`
- `moneda text not null default 'PEN'`
- `logo_proyecto_url text null`
- `overlay_config jsonb not null default '{}'::jsonb`  
  (ej: `{ "x": 44.3, "y": 134.5, "scale": 0.869 }`)
- `fecha_inicio date null`
- `fecha_fin date null`
- `estado boolean not null default true`
- `theme_seed jsonb not null default '{}'::jsonb`
- `theme_overrides jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

## 4) Tema por pocos colores (jsonb)

Objetivo: cambiar apariencia completa del proyecto con pocos colores base.

- `theme_seed` guarda 6-8 claves base:
  - `primary`
  - `secondary`
  - `accent`
  - `bg`
  - `surface`
  - `success`
  - `warning`
  - `danger`
- `theme_overrides` para ajustes puntuales.
- El frontend calcula variantes (soft/strong/border/hover) con `color-mix` y mantiene defaults no definidos.

Ejemplo:

```json
{
  "primary": "#f49f05",
  "secondary": "#36688d",
  "accent": "#f3cd05",
  "bg": "#0d1723",
  "surface": "#122030",
  "success": "#54d67d",
  "warning": "#f3cd05",
  "danger": "#ff7a63"
}
```

## 5) Accesos y equipos (schema dev)

## `proyecto_usuarios`

- `id uuid pk default gen_random_uuid()`
- `proyecto_id uuid not null fk -> proyectos(id)`
- `usuario_id uuid not null fk -> usuarios(id)`
- `acceso_activo boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `unique(proyecto_id, usuario_id)`

## `equipos`

- `id uuid pk default gen_random_uuid()`
- `proyecto_id uuid not null fk -> proyectos(id)`
- `nombre text not null`
- `admin_id uuid null fk -> usuarios(id)` (supervisor/admin del equipo)
- `estado boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

## `equipo_usuarios`

- `id uuid pk default gen_random_uuid()`
- `equipo_id uuid not null fk -> equipos(id)`
- `usuario_id uuid not null fk -> usuarios(id)`
- `activo boolean not null default true`
- `fecha_inicio date null`
- `fecha_fin date null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `unique(equipo_id, usuario_id)`

Nota:

- no se crea `equipos_proyectos` porque cada equipo pertenece a un solo proyecto.

## 6) Ajuste requerido en tabla `usuarios`

- agregar/actualizar enum/columna de rol global para soportar:
  - `SUPERADMIN`
  - `ADMIN`
  - `ASESOR`

## 7) Partes del repo que deben pasar de hardcode a BD

Frontend:

- `frontend/src/data/projectInfo.ts`
- `frontend/src/domain/constants.ts` (`PROYECTO_FIJO`, `EMPRESA_DIRECCION`)
- `frontend/src/app/AppShell.tsx` (titulo por proyecto)
- `frontend/index.html` (meta/title por contexto del proyecto)
- `frontend/src/components/proforma/ProformaModal.tsx`
- `frontend/src/pages/admin/SalesMapPage.tsx`
- `frontend/src/pages/sales/SaleFormPage.tsx`
- `frontend/src/components/sales/salePrint.ts`
- `frontend/src/pages/login/LoginPage.tsx`
- `frontend/src/styles/tokens.css` (consumo de `theme_seed` y `theme_overrides`)

Backend:

- `backend/server.mjs`: endpoint de contexto empresa/proyecto + validacion por dominio.
- `backend/lib/authService.mjs`: validar rol global y acceso a proyecto.
- `backend/lib/usuariosService.mjs`: login con `rol_global` y acceso por `proyecto_usuarios`.
- `backend/lib/*.mjs` funcionales: filtrar por `proyecto_id` (lotes, ventas, pagos, dashboard, usuarios).

## 8) Plan futuro (no aplicar aun)

Archivos en Storage para branding/mapa:

- `logo_header_url`
- `logo_footer_url`
- `mapa_svg_url`
- `mapa_webp_url`

Se retoma cuando se defina estrategia final de buckets.

## 9) Siguiente paso de ejecucion

Preparar migracion SQL para `schema dev` con este orden:

1. crear tablas `empresa`, `proyectos`, `proyecto_usuarios`, `equipos`, `equipo_usuarios`
2. actualizar `usuarios` para `rol_global` con `SUPERADMIN`
3. seed inicial empresa/proyecto actual
4. preparar indices + constraints + timestamps
5. adaptar backend login/accesos por proyecto
6. adaptar frontend para leer contexto desde BD
