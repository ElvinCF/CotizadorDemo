-- Base init seed for {{SCHEMA}} legacy contract.
-- Safe to run many times.

insert into {{SCHEMA}}.usuarios (username, pin, role, nombre)
values
  ('admin', '123456', 'ADMIN', 'Admin Principal'),
  ('vendedor', '1234', 'VENDEDOR', 'Vendedor Demo')
on conflict (username) do update
set
  pin = excluded.pin,
  role = excluded.role,
  nombre = excluded.nombre,
  updated_at = now();
