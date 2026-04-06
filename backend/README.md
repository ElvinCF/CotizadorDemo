# Backend

Backend local y capa de servicios del proyecto.

## Responsabilidades

- autenticación operativa por PIN
- resolución de proyecto visible por sesión
- validaciones de negocio
- lectura de contexto público y privado
- operación sobre:
  - lotes
  - ventas
  - usuarios
  - equipos
  - empresa
  - proyecto
  - dashboards

## Estructura

- `server.mjs`: API Express local
- `lib/`: servicios por módulo
- `supabase/migrations/`: migraciones SQL
- `scripts/`: utilidades de migración/seed

## Regla operativa actual

- el esquema activo de trabajo es `dev`
- `public` no se toca en esta etapa

## Referencias

- endpoints: `backend/ENDPOINTS.md`
- esquema: `context/1_esquema_bd.md`
- reglas: `context/2_reglas_negocio.md`
