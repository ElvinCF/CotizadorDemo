# Endpoints Backend

Documentacion operativa minima de los endpoints backend actuales.

## Convenciones generales

- Base local Express: `http://127.0.0.1:8787`
- Base serverless: `/api/*`
- Formato de respuesta: JSON
- Auth operativa: headers `x-auth-user` y `x-auth-pin`
- Auth admin: headers `x-admin-user` y `x-admin-pin`

## Errores HTTP

- `400`: payload invalido o campos faltantes
- `401`: credenciales faltantes
- `403`: credenciales invalidas o accion no permitida por rol
- `404`: recurso no encontrado
- `409`: conflicto de negocio o integridad
- `500`: error interno no controlado

## `POST /api/auth/login`

Inicia sesion de usuario interno.

## `GET /api/clientes?dni=...`

Busca cliente por DNI.

### Headers

```http
x-auth-user: asesor01
x-auth-pin: 1234
```

### Response `200`

```json
{
  "client": {
    "id": "uuid",
    "nombreCompleto": "Cliente Demo",
    "dni": "12345678",
    "celular": "999999999",
    "direccion": "Lima",
    "ocupacion": "Ingeniero"
  }
}
```

## `GET /api/ventas`

Lista ventas registradas.

### Headers

```http
x-auth-user: asesor01
x-auth-pin: 1234
```

### Nota

El listado devuelve `pagos` e `historial` vacios por diseno. El detalle completo se obtiene en `GET /api/ventas/:id`.

## `POST /api/ventas`

Crea una venta nueva y sus pagos iniciales dentro de una transaccion.

### Reglas backend

- el lote debe existir
- el lote debe estar `DISPONIBLE`
- no puede existir venta activa para el lote
- el cliente se busca o actualiza por DNI
- solo se permiten pagos iniciales `SEPARACION` o `INICIAL`
- el estado inicial debe ser coherente con los pagos iniciales

## `GET /api/ventas/:id`

Obtiene el detalle completo de una venta.

## `PUT /api/ventas/:id`

Edita datos de la venta y permite cambios manuales de estado autorizados.

### Reglas backend

- `CAIDA` solo puede marcarla un `ADMIN`
- cambios manuales permitidos:
  - `INICIAL_PAGADA -> CONTRATO_FIRMADO`
  - `SEPARADA|INICIAL_PAGADA|CONTRATO_FIRMADO|PAGANDO -> CAIDA` solo admin
- no se permiten saltos manuales arbitrarios

## `POST /api/ventas/:id/pagos`

Registra un pago nuevo y recalcula venta e historial dentro de una transaccion.

### Reglas backend

- no se pueden registrar pagos sobre ventas `CAIDA`
- no se pueden registrar pagos sobre ventas `COMPLETADA`
- `CUOTA` requiere `nroCuota`
- el nuevo estado se deriva de pagos y total abonado
