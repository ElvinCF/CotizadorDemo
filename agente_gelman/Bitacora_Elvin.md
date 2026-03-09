# Bitacora Elvin

## Sesión: 2026-03-09

### Hecho
- [✅] Conexion Supabase reforzada por esquema (`SUPABASE_DB_SCHEMA`) con validacion estricta (`public|dev`).
- [✅] Se agrego `.env.example` para conexion API + Postgres directo.
- [✅] Se agrego runner de migraciones/seeds por esquema: `backend/scripts/db-apply.mjs`.
- [✅] Se agregaron migraciones base en `backend/supabase/migrations`.
- [✅] Se agregaron seeds por esquema en `backend/supabase/seeds`.
- [✅] Se removio fallback CSV del frontend: ahora carga solo por API/Supabase.
- [✅] Se agrego alerta cerrable cuando falla la carga de lotes en mapa, admin y editor.
- [✅] Se removieron dependencias CSV del frontend (`papaparse`).

- #### Comandos
    - `npm run db:migrate:dev`
    - `npm run db:seed:dev`
    - `npm run db:migrate:public`
    - `npm run db:seed:public`
