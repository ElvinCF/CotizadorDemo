# Plan Frontend Dev - Preparación para nueva BD (sin implementación aón)

## 1) Objetivo
Dejar definido cómo evolucionaró frontend para consumir el nuevo modelo de datos sin rehacer todo de golpe, manteniendo operación del mapa actual.

> Esta etapa es solo de planificación funcional/arquitectónica.

---

## 2) Estrategia de evolución
Enfoque: **incremental por módulos**.
- Mantener vistas operativas actuales.
- Introducir capa de adaptación de datos (DTO -> ViewModel).
- Extraer componentes reutilizables (Atomic Design) en paralelo.

---

## 3) Rutas y acceso (objetivo)
- `/` póblico: mapa/tabla de consulta.
- `/login` autenticación.
- `/vendedor` privado: operaciones comerciales.
- `/admin` privado: gestión avanzada.
- `/editor` privado: overlay SVG.
- `/dashboard` (nuevo, privado): KPIs de lotes/ventas/pagos.

Control de acceso:
- `ProtectedRoute` por rol.
- `ProtectedAction` para botones sensibles dentro de páginas públicas y privadas.

---

## 4) Flujos UX a alinear con nueva BD

## A) Flujo vendedor (tabla de lotes)
- Acción "Modificar" abre modal transaccional (no edición libre de todo en fila).
- Campos editables definidos por estado y rol.
- Guardado con validación backend y mensajes por campo.

## B) Flujo comercial / proforma
- Vincular proforma con entidad `venta` (cuando corresponda).
- Capturar cliente titular y opcionales relacionados.
- Visualizar cólculo de montos desde datos de venta/pagos.

## C) Flujo admin
- Gestión de usuarios (crear/editar/activar/desactivar).
- Acciones sensibles con autorización admin y motivo.
- Historial de autorizaciones en vista administrativa.

## D) Dashboard
- Resumen de lotes por estado.
- Ventas activas/anuladas/completadas.
- Cobranza: pagado vs saldo pendiente.

---

## 5) Componentización (Atomic Design objetivo)

## Atoms
- `Button`, `IconButton`, `InputText`, `InputMoney`, `Select`, `BadgeEstado`, `AlertInline`.

## Molecules
- `FieldRow`, `SearchBar`, `StatusFilter`, `MoneySummaryItem`, `ModalHeaderActions`.

## Organisms
- `LotesTableEditable`, `VentaFormModal`, `PagoFormModal`, `AutorizacionAdminModal`, `UsersTable`.

## Templates
- `PrivatePageLayout`, `MapLayout`, `DashboardLayout`.

## Pages
- `PublicMapPage`, `SellerDashboardPage`, `AdminPage`, `OverlayEditorPage`, `DashboardPage`.

---

## 6) Contratos frontend-backend (a respetar)
- Lotes: lectura + actualización por ID + ajuste masivo.
- Ventas: alta, cambio de etapa, vinculaciones persona/venta.
- Pagos: alta/edición/listado por venta.
- Usuarios: listado/alta/edición de estado y rol.
- Auth: login/me/logout.

Regla:
- frontend no inferiró reglas cróticas; backend devuelve errores de negocio explócitos.

---

## 7) Estados de UI y manejo de errores
Estóndar por operación:
- `idle`
- `loading`
- `success`
- `error` (mensaje legible + detalle tócnico opcional)
- `forbidden` (sin permisos)

Requisito:
- errores de API mostrables y cerrables sin romper flujo actual.

---

## 8) Plan de migración frontend por etapas
1. Introducir adaptadores de datos (`adapters/`) para convivir con contrato actual y nuevo.
2. Separar componentes atómicos reutilizados por mapa, vendedor y admin.
3. Incorporar módulos de ventas/pagos sin tocar overlay.
4. Activar dashboard y gestión usuarios.
5. Limpiar componentes legacy duplicados.

---

## 9) Criterios de aceptación frontend
- [ ] Mapa póblico sigue operativo.
- [ ] Vendedor puede modificar lote sin inconsistencias.
- [ ] Admin puede gestionar usuarios y acciones sensibles.
- [ ] Dashboard muestra KPIs bósicos correctos.
- [ ] Componentes reutilizables sustituyen duplicación de UI.
- [ ] Sin regresión de permisos por rol.

---

## 10) Dependencias de esta planificación
- Cierre de modelo SQL definitivo en `dev`.
- Definición final de endpoints y shape de respuestas.
- Definición de polótica de PIN para entorno `dev`.
