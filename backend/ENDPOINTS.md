# Endpoints Backend

Base local:

- `http://127.0.0.1:8787`

Auth operativa:

- `x-auth-user`
- `x-auth-pin`

## Contexto y proyecto

- `GET /api/proyectos`
- `POST /api/proyectos`
- `GET /api/contexto/proyecto`
- `GET /api/contexto/visual/proyecto`
- `GET /api/contexto/publico`
- `GET /api/contexto/visual/publico`
- `GET /api/empresa`
- `PUT /api/empresa`
- `GET /api/proyecto`
- `PUT /api/proyecto`
- `PUT /api/proyecto/config-ui`
- `PUT /api/proyecto/config-comercial`
- `GET /api/proyecto/config-ui/copy-source`

## Lotes

- `GET /api/lotes`
- `GET /api/lotes/admin`
- `PUT /api/lotes/:id`
- `PUT /api/lotes/:id/config`
- `POST /api/lotes/estado-masivo`
- `POST /api/lotes/precios-masivos`

Reglas:

- `GET /api/lotes` es público por `slug`
- `GET /api/lotes/admin` usa proyecto visible por sesión
- `estado-masivo` solo para `ADMIN` y `SUPERADMIN`
- `precio_minimo` no sale por endpoint público

## Ventas

- `GET /api/clientes?dni=...`
- `GET /api/ventas`
- `GET /api/ventas/:id`
- `POST /api/ventas`
- `PUT /api/ventas/:id`
- `POST /api/ventas/:id/pagos`
- `PUT /api/ventas/:id/pagos/:pagoId`
- `GET /api/ventas/accesos-lote`

Reglas:

- el backend valida piso por `precio_minimo`
- `ASESOR` no puede operar ventas de otro asesor
- `CAIDA` queda restringido a `ADMIN`

## Usuarios y equipos

- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios`
- `DELETE /api/usuarios/:id`
- `GET /api/equipos`
- `POST /api/equipos`
- `PUT /api/equipos/:id`
- `DELETE /api/equipos/:id`

Reglas:

- `ADMIN` no ve `SUPERADMIN`
- la estructura de equipos es de uso `SUPERADMIN`
- altas, edición y borrado se filtran por proyecto visible

## Dashboard

### Admin

- `GET /api/dashboard/admin/kpis`
- `GET /api/dashboard/admin/ejecutivo`
- `GET /api/dashboard/admin/resumen`
- `GET /api/dashboard/admin/series-ventas`
- `GET /api/dashboard/admin/series-cobros`
- `GET /api/dashboard/admin/inventario`
- `GET /api/dashboard/admin/resumen-asesores`
- `GET /api/dashboard/admin/ranking-asesores`
- `GET /api/dashboard/admin/ventas-activas`
- `GET /api/dashboard/admin/operaciones-anuladas`

### Asesor

- `GET /api/dashboard/asesor/kpis`
- `GET /api/dashboard/asesor/series-ventas`
- `GET /api/dashboard/asesor/series-cobros`
- `GET /api/dashboard/asesor/operaciones-por-etapa`
- `GET /api/dashboard/asesor/operaciones`
- `GET /api/dashboard/asesor/clientes`
- `GET /api/dashboard/asesor/pagos`

## Auth

- `POST /api/auth/login`

## Errores

- `400`: payload inválido
- `401`: credenciales faltantes
- `403`: rol o acceso no permitido
- `404`: recurso no encontrado
- `409`: conflicto de negocio
- `500`: error interno
