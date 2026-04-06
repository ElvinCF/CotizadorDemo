# Frontend

Aplicación Vite + React del cotizador multiproyecto.

## Responsabilidades

- shell global
- auth y contexto de proyecto
- ruteo público y privado por `slug`
- mapa cotizador
- drawer de cotización y proforma
- vistas operativas:
  - `dashboard`
  - `lotes`
  - `ventas`
  - `usuarios`
  - `proyecto`
  - `empresa`
  - `editor`

## Carpetas clave

- `src/app/`: router, guards, shell, providers
- `src/components/`: componentes reutilizables
- `src/domain/`: reglas puras y helpers
- `src/pages/`: páginas finales
- `src/assets/project-overlays/`: overlays TSX por proyecto/etapa
- `public/assets/`: archivos públicos routeables

## Tests actuales

Vitest en dominio puro:

- `src/domain/*.test.ts`

Comandos desde la raíz:

```bash
npm run test
npm run test:run
```
