-- Seed etapa 3: Arenas Malabrigo
-- Fuente: frontend/public/assets/proyectos/arenas-malabrigo/etapas/tercera-etapa/lotes-arenas-3.csv
-- Regla: todos los lotes entran como DISPONIBLE

delete from dev.lotes
where proyecto_id = (select id from dev.proyectos where slug = 'arenas-malabrigo-3');

-- Manzana A
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '1', 130.10, 45535.00, 'DISPONIBLE', 'A-01', true, false, false, false, 43583.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '2', 130.10, 44234.00, 'DISPONIBLE', 'A-02', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '3', 130.10, 44234.00, 'DISPONIBLE', 'A-03', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '4', 130.10, 46185.50, 'DISPONIBLE', 'A-04', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '5', 130.10, 46185.50, 'DISPONIBLE', 'A-05', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '6', 130.10, 44234.00, 'DISPONIBLE', 'A-06', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '7', 130.10, 44234.00, 'DISPONIBLE', 'A-07', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '8', 130.10, 44234.00, 'DISPONIBLE', 'A-08', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '9', 130.10, 44234.00, 'DISPONIBLE', 'A-09', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '10', 130.10, 44234.00, 'DISPONIBLE', 'A-10', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '11', 130.10, 44234.00, 'DISPONIBLE', 'A-11', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '12', 130.10, 44234.00, 'DISPONIBLE', 'A-12', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '13', 130.10, 46185.50, 'DISPONIBLE', 'A-13', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '14', 130.10, 46185.50, 'DISPONIBLE', 'A-14', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '15', 130.10, 44234.00, 'DISPONIBLE', 'A-15', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '16', 130.10, 44234.00, 'DISPONIBLE', 'A-16', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '17', 130.10, 44234.00, 'DISPONIBLE', 'A-17', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '18', 130.10, 44234.00, 'DISPONIBLE', 'A-18', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'A', '19', 130.10, 46836.00, 'DISPONIBLE', 'A-19', true, false, true, false, 44884.50);

-- Manzana B
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '1', 133.60, 48096.00, 'DISPONIBLE', 'B-01', true, false, true, false, 46092.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '2', 133.60, 45424.00, 'DISPONIBLE', 'B-02', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '3', 133.60, 45424.00, 'DISPONIBLE', 'B-03', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '4', 133.60, 45424.00, 'DISPONIBLE', 'B-04', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '5', 133.60, 45424.00, 'DISPONIBLE', 'B-05', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '6', 133.60, 47428.00, 'DISPONIBLE', 'B-06', false, false, true, false, 45424.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '7', 133.60, 47428.00, 'DISPONIBLE', 'B-07', false, false, true, false, 45424.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '8', 133.60, 45424.00, 'DISPONIBLE', 'B-08', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '9', 133.60, 45424.00, 'DISPONIBLE', 'B-09', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '10', 133.60, 45424.00, 'DISPONIBLE', 'B-10', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '11', 133.60, 45424.00, 'DISPONIBLE', 'B-11', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '12', 133.60, 45424.00, 'DISPONIBLE', 'B-12', false, true, false, false, 43420.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'B', '13', 160.42, 56147.00, 'DISPONIBLE', 'B-13', true, false, false, false, 53740.70);

-- Manzana C
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '1', 123.28, 43148.00, 'DISPONIBLE', 'C-01', true, false, false, false, 41298.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '2', 132.04, 44893.60, 'DISPONIBLE', 'C-02', false, true, false, false, 42913.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '3', 129.28, 43955.20, 'DISPONIBLE', 'C-03', false, true, false, false, 42016.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '4', 139.42, 47402.80, 'DISPONIBLE', 'C-04', false, true, false, false, 45311.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '5', 149.56, 50850.40, 'DISPONIBLE', 'C-05', false, true, false, false, 48607.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '6', 159.71, 54301.40, 'DISPONIBLE', 'C-06', false, true, false, false, 51905.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '7', 169.85, 57749.00, 'DISPONIBLE', 'C-07', false, true, false, false, 55201.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'C', '8', 183.05, 64067.50, 'DISPONIBLE', 'C-08', true, false, false, false, 61321.75);

-- Manzana D
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '1', 140.28, 50500.80, 'DISPONIBLE', 'D-01', true, false, true, false, 48396.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '2', 140.28, 49799.40, 'DISPONIBLE', 'D-02', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '3', 140.28, 49799.40, 'DISPONIBLE', 'D-03', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '4', 140.28, 49799.40, 'DISPONIBLE', 'D-04', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '5', 140.28, 49799.40, 'DISPONIBLE', 'D-05', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '6', 140.28, 49799.40, 'DISPONIBLE', 'D-06', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '7', 140.28, 49799.40, 'DISPONIBLE', 'D-07', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'D', '8', 140.28, 50500.80, 'DISPONIBLE', 'D-08', true, false, true, false, 48396.60);

-- Manzana E
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '1', 140.28, 50500.80, 'DISPONIBLE', 'E-01', true, false, true, false, 48396.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '2', 140.28, 49799.40, 'DISPONIBLE', 'E-02', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '3', 140.28, 49799.40, 'DISPONIBLE', 'E-03', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '4', 140.28, 49799.40, 'DISPONIBLE', 'E-04', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '5', 140.28, 49799.40, 'DISPONIBLE', 'E-05', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '6', 140.28, 49799.40, 'DISPONIBLE', 'E-06', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '7', 140.28, 49799.40, 'DISPONIBLE', 'E-07', false, false, true, false, 47695.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'E', '8', 140.28, 50500.80, 'DISPONIBLE', 'E-08', true, false, true, false, 48396.60);

-- Manzana F
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '1', 137.65, 49554.00, 'DISPONIBLE', 'F-01', true, false, false, true, 47489.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '2', 137.65, 47489.25, 'DISPONIBLE', 'F-02', false, false, false, true, 45424.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '3', 137.65, 47489.25, 'DISPONIBLE', 'F-03', false, false, false, true, 45424.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '4', 137.65, 47489.25, 'DISPONIBLE', 'F-04', false, false, false, true, 45424.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '5', 137.65, 47489.25, 'DISPONIBLE', 'F-05', false, false, false, true, 45424.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '6', 137.65, 47489.25, 'DISPONIBLE', 'F-06', false, false, false, true, 45424.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '7', 137.65, 47489.25, 'DISPONIBLE', 'F-07', false, false, false, true, 45424.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'F', '8', 137.65, 49554.00, 'DISPONIBLE', 'F-08', true, false, false, true, 47489.25);

-- Manzana G
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '1', 136.36, 49089.60, 'DISPONIBLE', 'G-01', true, false, false, true, 47044.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '2', 136.36, 47044.20, 'DISPONIBLE', 'G-02', false, false, false, true, 44998.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '3', 136.36, 47044.20, 'DISPONIBLE', 'G-03', false, false, false, true, 44998.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '4', 136.36, 47044.20, 'DISPONIBLE', 'G-04', false, false, false, true, 44998.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '5', 136.36, 47044.20, 'DISPONIBLE', 'G-05', false, false, false, true, 44998.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '6', 136.36, 47044.20, 'DISPONIBLE', 'G-06', false, false, false, true, 44998.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '7', 136.36, 47044.20, 'DISPONIBLE', 'G-07', false, false, false, true, 44998.80),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'G', '8', 136.36, 49089.60, 'DISPONIBLE', 'G-08', true, false, false, true, 47044.20);

-- Manzana H
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '1', 135.19, 48668.40, 'DISPONIBLE', 'H-01', true, false, true, false, 46640.55),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '2', 135.19, 47992.45, 'DISPONIBLE', 'H-02', false, false, true, false, 45964.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '3', 135.19, 47992.45, 'DISPONIBLE', 'H-03', false, false, true, false, 45964.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '4', 135.19, 47992.45, 'DISPONIBLE', 'H-04', false, false, true, false, 45964.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '5', 135.19, 47992.45, 'DISPONIBLE', 'H-05', false, false, true, false, 45964.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '6', 135.19, 47992.45, 'DISPONIBLE', 'H-06', false, false, true, false, 45964.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '7', 135.19, 47992.45, 'DISPONIBLE', 'H-07', false, false, true, false, 45964.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'H', '8', 135.19, 48668.40, 'DISPONIBLE', 'H-08', true, false, true, false, 46640.55);

-- Manzana I
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '1', 133.58, 48088.80, 'DISPONIBLE', 'I-01', true, false, true, false, 46085.10),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '2', 133.58, 47420.90, 'DISPONIBLE', 'I-02', false, false, true, false, 45417.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '3', 133.58, 47420.90, 'DISPONIBLE', 'I-03', false, false, true, false, 45417.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '4', 133.58, 47420.90, 'DISPONIBLE', 'I-04', false, false, true, false, 45417.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '5', 133.58, 47420.90, 'DISPONIBLE', 'I-05', false, false, true, false, 45417.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '6', 133.58, 47420.90, 'DISPONIBLE', 'I-06', false, false, true, false, 45417.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '7', 133.58, 47420.90, 'DISPONIBLE', 'I-07', false, false, true, false, 45417.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'I', '8', 133.58, 48088.80, 'DISPONIBLE', 'I-08', true, false, true, false, 46085.10);

-- Manzana J
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '1', 132.54, 47714.40, 'DISPONIBLE', 'J-01', true, false, true, false, 45726.30),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '2', 132.54, 47051.70, 'DISPONIBLE', 'J-02', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '3', 132.54, 47051.70, 'DISPONIBLE', 'J-03', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '4', 132.54, 47051.70, 'DISPONIBLE', 'J-04', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '5', 132.54, 47051.70, 'DISPONIBLE', 'J-05', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '6', 132.54, 47051.70, 'DISPONIBLE', 'J-06', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '7', 132.54, 47051.70, 'DISPONIBLE', 'J-07', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'J', '8', 132.54, 47714.40, 'DISPONIBLE', 'J-08', true, false, true, false, 45726.30);

-- Manzana K
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '1', 132.54, 47714.40, 'DISPONIBLE', 'K-01', true, false, true, false, 45726.30),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '2', 132.54, 47051.70, 'DISPONIBLE', 'K-02', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '3', 132.54, 47051.70, 'DISPONIBLE', 'K-03', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '4', 132.54, 47051.70, 'DISPONIBLE', 'K-04', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '5', 132.54, 47051.70, 'DISPONIBLE', 'K-05', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '6', 132.54, 47051.70, 'DISPONIBLE', 'K-06', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '7', 132.54, 47051.70, 'DISPONIBLE', 'K-07', false, false, true, false, 45063.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'K', '8', 132.54, 47714.40, 'DISPONIBLE', 'K-08', true, false, true, false, 45726.30);

-- Manzana L
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '1', 130.24, 45584.00, 'DISPONIBLE', 'L-01', true, false, false, false, 43630.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '2', 130.37, 44325.80, 'DISPONIBLE', 'L-02', false, true, false, false, 42370.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '3', 130.55, 44387.00, 'DISPONIBLE', 'L-03', false, true, false, false, 42428.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '4', 130.70, 46398.50, 'DISPONIBLE', 'L-04', false, false, true, false, 44438.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '5', 130.85, 46451.75, 'DISPONIBLE', 'L-05', false, false, true, false, 44489.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '6', 131.01, 44543.40, 'DISPONIBLE', 'L-06', false, true, false, false, 42578.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '7', 131.16, 44594.40, 'DISPONIBLE', 'L-07', false, true, false, false, 42627.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '8', 131.31, 44645.40, 'DISPONIBLE', 'L-08', false, true, false, false, 42675.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '9', 130.57, 44393.80, 'DISPONIBLE', 'L-09', false, true, false, false, 42435.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '10', 130.71, 44441.40, 'DISPONIBLE', 'L-10', false, true, false, false, 42480.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '11', 130.18, 44261.20, 'DISPONIBLE', 'L-11', false, true, false, false, 42308.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '12', 130.11, 44237.40, 'DISPONIBLE', 'L-12', false, true, false, false, 42285.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '13', 130.26, 46242.30, 'DISPONIBLE', 'L-13', false, false, true, false, 44288.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '14', 130.41, 46295.55, 'DISPONIBLE', 'L-14', false, false, true, false, 44339.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '15', 130.56, 44390.40, 'DISPONIBLE', 'L-15', false, true, false, false, 42432.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '16', 130.71, 44441.40, 'DISPONIBLE', 'L-16', false, true, false, false, 42480.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '17', 130.86, 44492.40, 'DISPONIBLE', 'L-17', false, true, false, false, 42529.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '18', 131.01, 44543.40, 'DISPONIBLE', 'L-18', false, true, false, false, 42578.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '19', 146.71, 52815.60, 'DISPONIBLE', 'L-19', true, false, false, true, 50614.95),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '20', 143.80, 49611.00, 'DISPONIBLE', 'L-20', false, false, false, true, 47454.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '21', 143.80, 49611.00, 'DISPONIBLE', 'L-21', false, false, false, true, 47454.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '22', 143.80, 49611.00, 'DISPONIBLE', 'L-22', false, false, false, true, 47454.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '23', 143.80, 51768.00, 'DISPONIBLE', 'L-23', true, false, false, true, 49611.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '24', 131.00, 44540.00, 'DISPONIBLE', 'L-24', false, true, false, false, 42575.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '25', 130.86, 44492.40, 'DISPONIBLE', 'L-25', false, true, false, false, 42529.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '26', 130.71, 44441.40, 'DISPONIBLE', 'L-26', false, true, false, false, 42480.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '27', 130.56, 44390.40, 'DISPONIBLE', 'L-27', false, true, false, false, 42432.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '28', 130.41, 46295.55, 'DISPONIBLE', 'L-28', false, false, true, false, 44339.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '29', 130.26, 46242.30, 'DISPONIBLE', 'L-29', false, false, true, false, 44288.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '30', 130.12, 44240.80, 'DISPONIBLE', 'L-30', false, true, false, false, 42289.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '31', 130.11, 44237.40, 'DISPONIBLE', 'L-31', false, true, false, false, 42285.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '32', 130.71, 44441.40, 'DISPONIBLE', 'L-32', false, true, false, false, 42480.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '33', 130.56, 44390.40, 'DISPONIBLE', 'L-33', false, true, false, false, 42432.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '34', 131.30, 44642.00, 'DISPONIBLE', 'L-34', false, true, false, false, 42672.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '35', 131.14, 44587.60, 'DISPONIBLE', 'L-35', false, true, false, false, 42620.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '36', 130.99, 44536.60, 'DISPONIBLE', 'L-36', false, true, false, false, 42571.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '37', 130.84, 46448.20, 'DISPONIBLE', 'L-37', false, false, true, false, 44485.60),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '38', 130.68, 46391.40, 'DISPONIBLE', 'L-38', false, false, true, false, 44431.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '39', 130.53, 44380.20, 'DISPONIBLE', 'L-39', false, true, false, false, 42422.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '40', 130.41, 44339.40, 'DISPONIBLE', 'L-40', false, true, false, false, 42383.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'L', '41', 130.23, 45580.50, 'DISPONIBLE', 'L-41', true, false, false, false, 43627.05);

-- Manzana M
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '1', 144.15, 51894.00, 'DISPONIBLE', 'M-01', true, false, false, true, 49731.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '2', 143.80, 49611.00, 'DISPONIBLE', 'M-02', false, false, false, true, 47454.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '3', 143.80, 49611.00, 'DISPONIBLE', 'M-03', false, false, false, true, 47454.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '4', 143.80, 49611.00, 'DISPONIBLE', 'M-04', false, false, false, true, 47454.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '5', 143.80, 51768.00, 'DISPONIBLE', 'M-05', true, false, false, true, 49611.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '6', 130.76, 44458.40, 'DISPONIBLE', 'M-06', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '7', 130.76, 44458.40, 'DISPONIBLE', 'M-07', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '8', 130.76, 44458.40, 'DISPONIBLE', 'M-08', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '9', 130.76, 44458.40, 'DISPONIBLE', 'M-09', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '10', 130.76, 46419.80, 'DISPONIBLE', 'M-10', false, false, true, false, 44458.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '11', 130.76, 46419.80, 'DISPONIBLE', 'M-11', false, false, true, false, 44458.40),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '12', 130.76, 44458.40, 'DISPONIBLE', 'M-12', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '13', 130.76, 44458.40, 'DISPONIBLE', 'M-13', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '14', 130.76, 44458.40, 'DISPONIBLE', 'M-14', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '15', 130.76, 44458.40, 'DISPONIBLE', 'M-15', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '16', 130.76, 44458.40, 'DISPONIBLE', 'M-16', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '17', 130.76, 44458.40, 'DISPONIBLE', 'M-17', false, true, false, false, 42497.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '18', 163.63, 57270.50, 'DISPONIBLE', 'M-18', true, false, false, false, 54816.05),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '19', 152.75, 51935.00, 'DISPONIBLE', 'M-19', false, true, false, false, 49643.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '20', 142.03, 48290.20, 'DISPONIBLE', 'M-20', false, true, false, false, 46159.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '21', 131.32, 44648.80, 'DISPONIBLE', 'M-21', false, true, false, false, 42679.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '22', 122.53, 42885.50, 'DISPONIBLE', 'M-22', true, false, false, false, 41047.55),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '23', 131.50, 44710.00, 'DISPONIBLE', 'M-23', false, true, false, false, 42737.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '24', 131.45, 44693.00, 'DISPONIBLE', 'M-24', false, true, false, false, 42721.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '25', 131.40, 44676.00, 'DISPONIBLE', 'M-25', false, true, false, false, 42705.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '26', 131.35, 44659.00, 'DISPONIBLE', 'M-26', false, true, false, false, 42688.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '27', 131.30, 44642.00, 'DISPONIBLE', 'M-27', false, true, false, false, 42672.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '28', 131.25, 44625.00, 'DISPONIBLE', 'M-28', false, true, false, false, 42656.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '29', 131.20, 46576.00, 'DISPONIBLE', 'M-29', false, false, true, false, 44608.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '30', 131.15, 46558.25, 'DISPONIBLE', 'M-30', false, false, true, false, 44591.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '31', 131.10, 44574.00, 'DISPONIBLE', 'M-31', false, true, false, false, 42607.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '32', 131.06, 44560.40, 'DISPONIBLE', 'M-32', false, true, false, false, 42594.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '33', 130.99, 44536.60, 'DISPONIBLE', 'M-33', false, true, false, false, 42571.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'M', '34', 130.95, 44523.00, 'DISPONIBLE', 'M-34', false, true, false, false, 42558.75);

-- Manzana N
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '1', 140.12, 49042.00, 'DISPONIBLE', 'N-01', true, false, false, false, 46940.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '2', 140.12, 47640.80, 'DISPONIBLE', 'N-02', false, true, false, false, 45539.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '3', 140.12, 47640.80, 'DISPONIBLE', 'N-03', false, true, false, false, 45539.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '4', 140.12, 47640.80, 'DISPONIBLE', 'N-04', false, true, false, false, 45539.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '5', 140.12, 47640.80, 'DISPONIBLE', 'N-05', false, true, false, false, 45539.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '6', 140.12, 47640.80, 'DISPONIBLE', 'N-06', false, true, false, false, 45539.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '7', 140.12, 47640.80, 'DISPONIBLE', 'N-07', false, true, false, false, 45539.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '8', 140.12, 49042.00, 'DISPONIBLE', 'N-08', true, false, false, false, 46940.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '9', 179.69, 62891.50, 'DISPONIBLE', 'N-09', true, false, false, false, 60196.15),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '10', 169.55, 57647.00, 'DISPONIBLE', 'N-10', false, true, false, false, 55103.75),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '11', 160.36, 54522.40, 'DISPONIBLE', 'N-11', false, true, false, false, 52117.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '12', 151.16, 51394.40, 'DISPONIBLE', 'N-12', false, true, false, false, 49127.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '13', 141.97, 48269.80, 'DISPONIBLE', 'N-13', false, true, false, false, 46140.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '14', 132.77, 45141.80, 'DISPONIBLE', 'N-14', false, true, false, false, 43150.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '15', 123.58, 42017.20, 'DISPONIBLE', 'N-15', false, true, false, false, 40163.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'N', '16', 114.41, 40043.50, 'DISPONIBLE', 'N-16', true, false, false, false, 38327.35);

-- Manzana O
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '1', 134.16, 48297.60, 'DISPONIBLE', 'O-01', true, false, true, false, 46285.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '2', 133.45, 47374.75, 'DISPONIBLE', 'O-02', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '3', 133.45, 47374.75, 'DISPONIBLE', 'O-03', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '4', 133.45, 47374.75, 'DISPONIBLE', 'O-04', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '5', 133.45, 47374.75, 'DISPONIBLE', 'O-05', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '6', 133.45, 47374.75, 'DISPONIBLE', 'O-06', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '7', 133.45, 47374.75, 'DISPONIBLE', 'O-07', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'O', '8', 133.91, 48207.60, 'DISPONIBLE', 'O-08', true, false, true, false, 46198.95);

-- Manzana P
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '1', 134.16, 48297.60, 'DISPONIBLE', 'P-01', true, false, true, false, 46285.20),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '2', 133.45, 47374.75, 'DISPONIBLE', 'P-02', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '3', 133.45, 47374.75, 'DISPONIBLE', 'P-03', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '4', 133.45, 47374.75, 'DISPONIBLE', 'P-04', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '5', 133.45, 47374.75, 'DISPONIBLE', 'P-05', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '6', 133.45, 47374.75, 'DISPONIBLE', 'P-06', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '7', 133.45, 47374.75, 'DISPONIBLE', 'P-07', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'P', '8', 133.90, 48204.00, 'DISPONIBLE', 'P-08', true, false, true, false, 46195.50);

-- Manzana Q
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '1', 133.45, 48042.00, 'DISPONIBLE', 'Q-01', true, false, false, true, 46040.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '2', 133.45, 46040.25, 'DISPONIBLE', 'Q-02', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '3', 133.45, 46040.25, 'DISPONIBLE', 'Q-03', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '4', 133.45, 46040.25, 'DISPONIBLE', 'Q-04', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '5', 133.45, 46040.25, 'DISPONIBLE', 'Q-05', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '6', 133.45, 46040.25, 'DISPONIBLE', 'Q-06', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '7', 133.45, 46040.25, 'DISPONIBLE', 'Q-07', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'Q', '8', 134.72, 48499.20, 'DISPONIBLE', 'Q-08', true, false, false, true, 46478.40);

-- Manzana R
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '1', 133.45, 48042.00, 'DISPONIBLE', 'R-01', true, false, false, true, 46040.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '2', 133.45, 46040.25, 'DISPONIBLE', 'R-02', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '3', 133.45, 46040.25, 'DISPONIBLE', 'R-03', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '4', 133.45, 46040.25, 'DISPONIBLE', 'R-04', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '5', 133.45, 46040.25, 'DISPONIBLE', 'R-05', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '6', 133.45, 46040.25, 'DISPONIBLE', 'R-06', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '7', 133.45, 46040.25, 'DISPONIBLE', 'R-07', false, false, false, true, 44038.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'R', '8', 133.45, 48042.00, 'DISPONIBLE', 'R-08', true, false, false, true, 46040.25);

-- Manzana S
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '1', 133.45, 48042.00, 'DISPONIBLE', 'S-01', true, false, true, false, 46040.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '2', 133.45, 47374.75, 'DISPONIBLE', 'S-02', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '3', 133.45, 47374.75, 'DISPONIBLE', 'S-03', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '4', 133.45, 47374.75, 'DISPONIBLE', 'S-04', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '5', 133.45, 47374.75, 'DISPONIBLE', 'S-05', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '6', 133.45, 47374.75, 'DISPONIBLE', 'S-06', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '7', 133.45, 47374.75, 'DISPONIBLE', 'S-07', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'S', '8', 133.45, 48042.00, 'DISPONIBLE', 'S-08', true, false, true, false, 46040.25);

-- Manzana T
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '1', 133.45, 48042.00, 'DISPONIBLE', 'T-01', true, false, true, false, 46040.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '2', 133.45, 47374.75, 'DISPONIBLE', 'T-02', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '3', 133.45, 47374.75, 'DISPONIBLE', 'T-03', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '4', 133.45, 47374.75, 'DISPONIBLE', 'T-04', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '5', 133.45, 47374.75, 'DISPONIBLE', 'T-05', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '6', 133.45, 47374.75, 'DISPONIBLE', 'T-06', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '7', 133.45, 47374.75, 'DISPONIBLE', 'T-07', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'T', '8', 133.45, 48042.00, 'DISPONIBLE', 'T-08', true, false, true, false, 46040.25);

-- Manzana U
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '1', 133.45, 48042.00, 'DISPONIBLE', 'U-01', true, false, true, false, 46040.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '2', 133.45, 47374.75, 'DISPONIBLE', 'U-02', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '3', 133.45, 47374.75, 'DISPONIBLE', 'U-03', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '4', 133.45, 47374.75, 'DISPONIBLE', 'U-04', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '5', 133.45, 47374.75, 'DISPONIBLE', 'U-05', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '6', 133.45, 47374.75, 'DISPONIBLE', 'U-06', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '7', 133.45, 47374.75, 'DISPONIBLE', 'U-07', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'U', '8', 133.45, 48042.00, 'DISPONIBLE', 'U-08', true, false, true, false, 46040.25);

-- Manzana V
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '1', 133.45, 48042.00, 'DISPONIBLE', 'V-01', true, false, true, false, 46040.25),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '2', 133.45, 47374.75, 'DISPONIBLE', 'V-02', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '3', 133.45, 47374.75, 'DISPONIBLE', 'V-03', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '4', 133.45, 47374.75, 'DISPONIBLE', 'V-04', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '5', 133.45, 47374.75, 'DISPONIBLE', 'V-05', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '6', 133.45, 47374.75, 'DISPONIBLE', 'V-06', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '7', 133.45, 47374.75, 'DISPONIBLE', 'V-07', false, false, true, false, 45373.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'V', '8', 133.45, 48042.00, 'DISPONIBLE', 'V-08', true, false, true, false, 46040.25);

-- Manzana W
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '1', 130.10, 45535.00, 'DISPONIBLE', 'W-01', true, false, false, false, 43583.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '2', 130.10, 44234.00, 'DISPONIBLE', 'W-02', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '3', 130.10, 44234.00, 'DISPONIBLE', 'W-03', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '4', 130.10, 46185.50, 'DISPONIBLE', 'W-04', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '5', 130.10, 46185.50, 'DISPONIBLE', 'W-05', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '6', 130.10, 44234.00, 'DISPONIBLE', 'W-06', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '7', 130.10, 44234.00, 'DISPONIBLE', 'W-07', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '8', 130.10, 44234.00, 'DISPONIBLE', 'W-08', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '9', 130.10, 44234.00, 'DISPONIBLE', 'W-09', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '10', 130.10, 44234.00, 'DISPONIBLE', 'W-10', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '11', 130.10, 44234.00, 'DISPONIBLE', 'W-11', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '12', 130.10, 44234.00, 'DISPONIBLE', 'W-12', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '13', 130.10, 46185.50, 'DISPONIBLE', 'W-13', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '14', 130.10, 46185.50, 'DISPONIBLE', 'W-14', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '15', 130.10, 44234.00, 'DISPONIBLE', 'W-15', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '16', 130.10, 44234.00, 'DISPONIBLE', 'W-16', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '17', 130.10, 44234.00, 'DISPONIBLE', 'W-17', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '18', 130.10, 44234.00, 'DISPONIBLE', 'W-18', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '19', 130.10, 44234.00, 'DISPONIBLE', 'W-19', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '20', 130.10, 44234.00, 'DISPONIBLE', 'W-20', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'W', '21', 130.10, 46836.00, 'DISPONIBLE', 'W-21', true, false, false, true, 44884.50);

-- Manzana X
insert into dev.lotes (
  proyecto_id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo,
  es_esquina, es_medianero, frente_parque, frente_via_principal, precio_minimo
)
values
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '1', 130.10, 46836.00, 'DISPONIBLE', 'X-01', true, false, false, true, 44884.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '2', 130.10, 44234.00, 'DISPONIBLE', 'X-02', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '3', 130.10, 44234.00, 'DISPONIBLE', 'X-03', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '4', 130.10, 44234.00, 'DISPONIBLE', 'X-04', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '5', 130.10, 44234.00, 'DISPONIBLE', 'X-05', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '6', 130.10, 44234.00, 'DISPONIBLE', 'X-06', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '7', 130.10, 44234.00, 'DISPONIBLE', 'X-07', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '8', 130.10, 46185.50, 'DISPONIBLE', 'X-08', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '9', 130.10, 46185.50, 'DISPONIBLE', 'X-09', false, false, true, false, 44234.00),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '10', 130.10, 44234.00, 'DISPONIBLE', 'X-10', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '11', 130.10, 44234.00, 'DISPONIBLE', 'X-11', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '12', 130.10, 44234.00, 'DISPONIBLE', 'X-12', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '13', 130.10, 44234.00, 'DISPONIBLE', 'X-13', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '14', 130.10, 44234.00, 'DISPONIBLE', 'X-14', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '15', 130.10, 44234.00, 'DISPONIBLE', 'X-15', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '16', 130.10, 44234.00, 'DISPONIBLE', 'X-16', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '17', 130.10, 44234.00, 'DISPONIBLE', 'X-17', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '18', 130.10, 44234.00, 'DISPONIBLE', 'X-18', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '19', 130.10, 44234.00, 'DISPONIBLE', 'X-19', false, true, false, false, 42282.50),
  ((select id from dev.proyectos where slug = 'arenas-malabrigo-3'), 'X', '20', 166.41, 58243.50, 'DISPONIBLE', 'X-20', true, false, false, false, 55747.35);

select count(*) as lotes_insertados
from dev.lotes
where proyecto_id = (select id from dev.proyectos where slug = 'arenas-malabrigo-3');
