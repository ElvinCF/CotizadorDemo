## Dashboard v1 (Frontend + Endpoints mínimos) - Especificación Técnica

### Resumen
Documento para madurar el dashboard sin modificar código todavía.  
Alcance: UX frontend por rol (`admin` y `vendedor`), tipos de gráficos, filtros y endpoints mínimos.  
Condición actual: base de datos vacía, por lo que el diseño incluye estados vacíos reales (sin mock).

### Diseño Frontend (decisión completa)

- Navegación:
- Botón `Dashboard` junto a `Refrescar`.
- Si rol `admin`, abre `Dashboard Admin`.
- Si rol `vendedor`, abre `Dashboard Vendedor`.
- No se muestra selector de rol en UI; depende de sesión activa.

- Layout base:
- Fila 1: filtros globales.
- Fila 2: tarjetas KPI.
- Fila 3: gráficos principales.
- Fila 4: tabla de detalle/ranking.
- Cada bloque con estados: `loading`, `empty`, `error`, `ready`.

- Filtros:
- Globales: `from`, `to`, `estado_lote`, `asesor` (solo admin).
- Por widget: `groupBy` (`day|week|month`) y `topN` (`5|10|20`) para ranking.
- Comportamiento:
- Cambio de filtro dispara recarga de todos los widgets dependientes.
- Botón `Limpiar filtros`.
- Persistencia en URL query params.

- Dashboard Admin (más datos):
- KPIs:
- `total_ventas`.
- `ingreso_real` (iniciales + cuotas pagadas).
- `total_iniciales`.
- `top_vendedor_promedio` (nombre + promedio).
- Gráficos:
- Línea: tendencia de ventas por periodo.
- Barras: ranking de vendedores por venta total.
- Donut: distribución de lotes por estado.
- Tabla:
- Columnas por vendedor: `venta_total`, `cantidad_ventas`, `promedio_venta`, `mayor_venta`.

- Dashboard Vendedor:
- KPIs:
- `venta_total`.
- `cantidad_lotes_vendidos_separados`.
- `promedio_venta`.
- `mayor_venta`.
- Gráficos:
- Línea: tendencia de sus ventas.
- Barras: sus lotes vendidos/separados por periodo.
- Tabla:
- Detalle de sus operaciones con fecha, lote, estado y monto.

- Estados vacíos (sin mock):
- Tarjetas muestran `S/ 0.00` o `0`.
- Gráficos con placeholder “Sin datos para el rango seleccionado”.
- Tabla con mensaje “Aún no hay registros”.

### Endpoints mínimos (backend Node + Supabase)

- `GET /api/dashboard/admin/kpis?from&to&estado_lote&asesor`
- Respuesta: `{ totalVentas, ingresoReal, totalIniciales, topVendedorPromedio: { nombre, promedio } }`

- `GET /api/dashboard/admin/charts?from&to&groupBy&topN&estado_lote&asesor`
- Respuesta: `{ tendenciaVentas: Array<{ bucket, total }>, rankingVendedores: Array<{ vendedor, total, promedio }>, estadosLotes: Array<{ estado, cantidad }> }`

- `GET /api/dashboard/vendedor/kpis?from&to&estado_lote`
- Respuesta: `{ ventaTotal, cantidadVentas, promedioVenta, mayorVenta }`

- `GET /api/dashboard/vendedor/charts?from&to&groupBy&estado_lote`
- Respuesta: `{ tendenciaVentas: Array<{ bucket, total }>, estadosOperaciones: Array<{ estado, cantidad }> }`

- Reglas de rol:
- Endpoints `/admin/*` solo para admin.
- Endpoints `/vendedor/*` filtran por vendedor autenticado.

- Errores estándar:
- `{ error, detail?, code? }` con códigos HTTP consistentes.

### Plan de pruebas y criterios de aceptación

- Rol:
- Admin ve dashboard admin completo.
- Vendedor ve solo su dashboard.
- Intento cruzado de endpoint devuelve `403`.

- Filtros:
- Cambiar fecha modifica KPIs, gráficos y tabla.
- `Limpiar filtros` restaura estado por defecto.
- `groupBy` cambia agregación correctamente.

- Datos vacíos:
- Sin registros no rompe UI.
- No hay NaN ni divisiones inválidas.
- Mensajes vacíos visibles en todos los widgets.

- Contratos:
- Montos llegan como number.
- Buckets de tiempo llegan en ISO/date string consistente.
- Columnas de tabla mapean sin campos faltantes.

### Supuestos fijados

- Se prioriza frontend + endpoints mínimos; no se define SQL detallado en este documento.
- Librería de gráficos: `Recharts`.
- Base vacía se maneja con estados vacíos reales, no con mock.
- Moneda y formato objetivo: `es-PE` (frontend formatea).
