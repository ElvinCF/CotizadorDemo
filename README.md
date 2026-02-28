# Mapa interactivo - Arenas Malabrigo

Aplicación React + Vite para visualizar y cotizar lotes con overlay SVG sobre plano PNG.

## Qué incluye
- Mapa interactivo (zoom, pan, hover, selección de lote).
- Vista tabla con filtros y exportación CSV.
- Drawer de cotización manual y cuotas rápidas.
- Modal de proforma imprimible.
- Panel vendedor conectado a API (`/api/lotes`).

## Estructura monorepo
- `frontend/`: aplicación web (Vite + React).
  - `frontend/src/`: UI, dominio y servicios de cliente.
  - `frontend/public/`: assets estáticos del proyecto.
- `backend/`: servidor local y herramientas de datos.
  - `backend/server.mjs`
  - `backend/lib/`
  - `backend/scripts/`
  - `backend/supabase/`
- `api/`: funciones serverless (Vercel) para `/api/*`.

## Modularización aplicada
- `frontend/src/domain/`: tipos, constantes y utilidades compartidas.
- `frontend/src/services/lotes.ts`: carga de lotes (API + fallback CSV).
- `frontend/src/components/forms/ValidatedNumberField.tsx`.
- `frontend/src/components/map/*`.
- `frontend/src/components/drawer/CotizadorDrawer.tsx`.
- `frontend/src/components/proforma/ProformaModal.tsx`.

## Requisitos
- Node.js 18+

## Instalación
```bash
npm install
```

## Desarrollo (frontend)
```bash
npm run dev
```

## Desarrollo full stack local
```bash
npm run dev:full
```

## Build
```bash
npm run build
```

## Datos
Fuente principal: API `/api/lotes`.
Fallback: `frontend/public/assets/lotes.csv`.

Columnas esperadas del CSV:
`MZ`, `LOTE`, `AREA`, `PRECIO`, `CONDICION`, `ASESOR`, `CLIENTE`, `COMENTARIO`, `ULTIMA_MODIFICACION`.

## Exportaciones
- **Imprimir**: reporte A4 de vista actual.
- **CSV**: exportación de tabla filtrada.

## Activos clave
- SVG de lotes: `frontend/src/components/arenas.tsx`
- Plano base: `frontend/public/assets/plano-fondo-demo.webp`
