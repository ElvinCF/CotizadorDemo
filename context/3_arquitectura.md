# Arquitectura Aplicada

Actualizado: `2026-04-06`

## Capas

### Frontend

Responsable de:

- shell global
- router y guards
- contexto de auth
- contexto de proyecto
- formularios, tablas y drawers
- preview visual de branding/configuración

### Backend

Responsable de:

- autenticación y permisos
- resolución del proyecto visible
- validación final
- reglas de negocio
- transacciones
- lecturas consolidadas de contexto

### Base de datos

Responsable de:

- persistencia
- integridad
- vistas y funciones de apoyo
- restricciones por proyecto

## Shell y layout

Componentes base:

- `AppShell`
- `UserAvatarMenu`
- `ProjectProvider`
- `ThemeToggle`

Reglas:

- header común
- footer delgado fijo
- el scroll ocurre en `main` o en contenedores internos
- el contexto de proyecto ya no está hardcodeado

## Ruteo

### Público

- `/:slug`
- `/:slug/cotizador`
- `/:slug/cotizador/:loteCodigo`

### Privado

- `/:slug/...`

Reglas:

- guards separan acceso público y privado
- rutas legacy sin `slug` solo redirigen
- `SUPERADMIN` puede cambiar de proyecto
- `ADMIN` y `ASESOR` quedan fijados a proyecto visible por backend

## Contexto de proyecto

El frontend usa dos fases:

1. bootstrap visual mínimo
2. contexto completo

Esto permite:

- aplicar branding temprano
- evitar flashes del tema por defecto
- mantener cache por `slug` y por usuario

## Assets de mapa

### Fondo

- `frontend/public/assets/proyectos/<proyecto>/etapas/<etapa>/...webp`

### Overlay

- `frontend/src/assets/project-overlays/<proyecto>/<etapa>/overlay.tsx`

Resolución:

- registry en `frontend/src/components/overlays/projectOverlayRegistry.tsx`
- fallback por ruta guardada en BD y por `slug + etapa`

## Mapa

El mapa usa:

- fondo WEBP
- overlay TSX interactivo
- paleta de estados configurable
- cotizador drawer

Reglas:

- no hereda contenido de otro proyecto
- si falta configuración real, muestra estado de setup
- si el proyecto existe y está cargando, muestra loading, no falso setup

## Formularios

Estructura actual:

- formularios de proyecto y empresa
- cards por sección
- componentes base de inputs parciales
- textareas autoajustables

## Testing

Framework:

- `Vitest`

Cobertura inicial aplicada:

- dominio puro (`frontend/src/domain/*.test.ts`)

Comando:

```bash
npm run test:run
```

## Contrato UI/API

El frontend puede anticipar validaciones simples.

El backend decide:

- permisos
- proyecto visible
- integridad
- reglas finales

## Estado actual

La arquitectura real ya soporta:

- multiproyecto
- branding por proyecto
- configuración comercial por proyecto
- overlays por etapa
- equipos por proyecto
- lotes internos con configuración avanzada
