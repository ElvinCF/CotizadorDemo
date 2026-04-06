# Cotizador Multiproyecto

Aplicación React + Vite con backend Express y Postgres para:

- mapa cotizador público por proyecto
- operación privada por proyecto (`dashboard`, `lotes`, `ventas`, `usuarios`, `proyecto`, `empresa`)
- configuración visual y comercial por proyecto
- overlays por etapa
- proforma, cotizador manual y venta

## Estado actual

- esquema de trabajo: `dev`
- `public` queda congelado
- una base puede tener:
  - `1` empresa activa
  - `N` proyectos
- ruteo público por `slug`
- ruteo privado también por `slug`, pero el backend resuelve proyecto visible por sesión

## Stack

- `frontend`: React 19 + Vite + TypeScript
- `backend`: Express + módulos ESM
- `db`: Postgres/Supabase
- `charts`: Recharts
- `pdf`: jsPDF + svg2pdf
- `tests`: Vitest

## Rutas principales

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

## Estructura

- `frontend/`
  - `src/app/`: shell, router, auth, project context
  - `src/components/`: UI, tablas, drawers, modales
  - `src/domain/`: reglas puras, formatters, cache, paletas
  - `src/assets/project-overlays/`: overlays TSX por proyecto y etapa
  - `public/assets/`: logos, webp, csv, archivos públicos
- `backend/`
  - `server.mjs`: API local
  - `lib/`: servicios de dominio backend
  - `supabase/migrations/`: migraciones SQL
  - `scripts/`: utilidades operativas
- `context/`
  - documentación viva del sistema

## Desarrollo

Instalación:

```bash
npm install
```

Frontend:

```bash
npm run dev
```

Full stack local:

```bash
npm run dev:full
```

API local:

```bash
npm run api
```

## Tests

Suite actual:

- dominio puro con `Vitest`

Comandos:

```bash
npm run test
npm run test:run
```

## Calidad mínima antes de desplegar

```bash
npm run lint
npm run test:run
npm run build
```

## Base de datos

Migraciones:

```bash
npm run db:migrate:dev
```

Seeds:

```bash
npm run db:seed:dev
```

Variables mínimas:

- `SUPABASE_DB_SCHEMA=dev`
- `SUPABASE_DB_HOST`
- `SUPABASE_DB_PORT`
- `SUPABASE_DB_NAME`
- `SUPABASE_DB_USER`
- `SUPABASE_DB_PASSWORD`

## Assets por etapa

Ejemplo aplicado:

- fondo:
  - `frontend/public/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/plano-fondo-demo-b.webp`
- overlay TSX:
  - `frontend/src/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx`

La tercera etapa ya sigue la misma estructura.

## Documentación viva

Empieza por:

- `context/0_indice.md`
- `context/1_esquema_bd.md`
- `context/2_reglas_negocio.md`
- `context/3_arquitectura.md`
- `context/4_planes.md`
