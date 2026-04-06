# Esquema BD Activo

Actualizado: `2026-04-06`
Schema activo: `dev`

## Regla base

- el trabajo vigente va sobre `dev`
- `public` queda congelado
- el sistema ya es multiproyecto por empresa

## Tablas base aplicadas

### `dev.empresa`

- datos legales y comerciales de la empresa
- logos y datos fiscales

### `dev.proyectos`

- `empresa_id`
- `nombre`
- `etapa`
- `slug`
- `descripcion_corta`
- `ubicacion_texto`
- `distrito`
- `provincia`
- `departamento`
- `pais`
- `fecha_inicio`
- `fecha_fin`
- `estado`

Reglas:

- `slug` es único global
- `nombre` no es único
- dentro de una misma empresa, la unicidad es por:
  - `nombre + etapa`

### `dev.proyecto_configuracion_ui`

Configura branding, interfaz y mapa del proyecto.

Campos relevantes:

- `logo_proyecto_url`
- `logo_header_url`
- `logo_footer_url`
- `mapa_svg_url`
- `mapa_webp_url`
- `overlay_config jsonb`
- `theme_seed jsonb`
- `theme_overrides jsonb`
- `lot_state_palette jsonb`
- `lot_state_fill_opacity numeric`
- `lot_state_fill_opacity_palette jsonb`
- `redes_sociales jsonb`
- `highlights jsonb`
- `amenities jsonb`
- `meta_title`
- `meta_description`
- `og_image_url`

### `dev.proyecto_configuracion_comercial`

Configura reglas comerciales por proyecto.

Campos relevantes:

- `inicial_minima`
- `separacion_minima`
- `cuotas_minimas`
- `cuotas_maximas`
- `meses_referenciales`
- `tipos_financiamiento`
- `plusvalia_base_pct`
- `plusvalia_anual_pct`
- `tasa_interes_anual_ref`
- `precio_minimo_lote`
- `precio_maximo_lote`
- `reglas_descuento`
- `venta_config`

### `dev.proyecto_usuarios`

- acceso visible por proyecto
- relación entre usuario y proyecto

### `dev.equipos`

- equipos internos por proyecto
- `admin_id` opcional como responsable

### `dev.equipo_usuarios`

- miembros de equipo
- una fila por usuario en equipo

## Usuarios

### `dev.usuarios`

Campos relevantes:

- `username`
- `rol`
- `rol_global`
- `nombres`
- `apellidos`
- `telefono`
- `estado`

Roles globales vigentes:

- `SUPERADMIN`
- `ADMIN`
- `ASESOR`

## Lotes

### `dev.lotes`

Campos relevantes:

- `proyecto_id`
- `manzana`
- `lote`
- `codigo`
- `area_m2`
- `precio_referencial`
- `precio_minimo`
- `estado_comercial`
- `es_esquina`
- `es_medianero`
- `frente_parque`
- `frente_via_principal`

Reglas:

- `precio_referencial` es público
- `precio_minimo` es interno
- `codigo` se usa como identificador visual del overlay
- los estados públicos siguen siendo:
  - `DISPONIBLE`
  - `SEPARADO`
  - `VENDIDO`

## Ventas

### `dev.ventas`

El sistema ya usa proyecto como parte del expediente.

Campos relevantes:

- `proyecto_id`
- `cliente_id`
- `cliente2_id`
- `asesor_id`
- `precio_venta`
- `estado_venta`
- `tipo_financiamiento`
- `monto_inicial_total`
- `monto_financiado`
- `cantidad_cuotas`
- `monto_cuota`

## Vistas y funciones vigentes

### `dev.v_contexto_proyectos`

Vista consolidada usada por el contexto del frontend.

Expone, entre otros:

- empresa
- proyecto
- `slug`
- branding/UI
- configuración comercial
- fechas
- rutas de mapa
- paleta de lotes

### `dev.fn_proyectos_visibles_app(uuid)`

Resuelve proyectos visibles para el usuario autenticado.

### `dev.fn_usuarios_visibles_app(uuid, uuid)`

Resuelve usuarios visibles por actor y proyecto.

## Assets por etapa

La estructura ya quedó separada por proyecto y etapa.

### Fondos WEBP

- `frontend/public/assets/proyectos/<proyecto>/etapas/<etapa>/...`

### Overlays TSX

- `frontend/src/assets/project-overlays/<proyecto>/<etapa>/overlay.tsx`

## Seeds aplicados relevantes

- empresa base
- proyecto segunda etapa
- proyecto tercera etapa
- lotes de tercera etapa cargados en `dev.lotes`

## Nota operativa

Los CSV de apoyo y archivos históricos no son fuente de verdad.
La fuente de verdad es:

- BD `dev`
- migraciones SQL
- contexto consolidado por `slug`
