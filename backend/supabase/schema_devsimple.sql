-- ============================================================
-- Esquema devsimple — Cotizador Demo
-- Extraído de Supabase el 2026-03-12
-- ============================================================

CREATE SCHEMA IF NOT EXISTS devsimple;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE devsimple.estado_comercial_lote_enum AS ENUM (
  'DISPONIBLE',
  'SEPARADO',
  'VENDIDO'
);

CREATE TYPE devsimple.estado_general_enum AS ENUM (
  'ACTIVO',
  'INACTIVO'
);

CREATE TYPE devsimple.rol_usuario_enum AS ENUM (
  'ADMIN',
  'ASESOR'
);

-- ============================================================
-- TABLAS
-- ============================================================

-- ── lotes ───────────────────────────────────────────────────
CREATE TABLE devsimple.lotes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  manzana      text        NOT NULL,
  lote         text        NOT NULL,
  area_m2      numeric     NOT NULL CHECK (area_m2 > 0),
  precio_referencial numeric NOT NULL CHECK (precio_referencial >= 0),
  estado_comercial  devsimple.estado_comercial_lote_enum NOT NULL DEFAULT 'DISPONIBLE',
  codigo       text        UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── usuarios ────────────────────────────────────────────────
CREATE TABLE devsimple.usuarios (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     text        NOT NULL UNIQUE
                           CHECK (char_length(username) >= 4 AND char_length(username) <= 30),
  pin_hash     text        NOT NULL,
  rol          devsimple.rol_usuario_enum NOT NULL DEFAULT 'ASESOR',
  nombres      text        NOT NULL CHECK (char_length(TRIM(BOTH FROM nombres)) >= 2),
  apellidos    text        NOT NULL CHECK (char_length(TRIM(BOTH FROM apellidos)) >= 2),
  telefono     text,
  estado       devsimple.estado_general_enum NOT NULL DEFAULT 'ACTIVO',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- FUNCIONES
-- ============================================================

-- ── set_updated_at() — trigger genérico para updated_at ─────
CREATE OR REPLACE FUNCTION devsimple.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'devsimple'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── check_max_admins() — máximo 3 admins activos ────────────
CREATE OR REPLACE FUNCTION devsimple.check_max_admins()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'devsimple'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.rol = 'ADMIN' AND NEW.estado = 'ACTIVO' THEN
    SELECT count(*) INTO v_count
    FROM devsimple.usuarios
    WHERE rol = 'ADMIN' AND estado = 'ACTIVO'
      AND id IS DISTINCT FROM NEW.id;

    IF v_count >= 3 THEN
      RAISE EXCEPTION 'No se pueden tener más de 3 administradores activos en el sistema.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── sp_actualizar_precios_disponibles() — ajuste masivo ─────
CREATE OR REPLACE FUNCTION devsimple.sp_actualizar_precios_disponibles(
  p_tipo_ajuste text,
  p_valor_ajuste numeric
)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'devsimple'
AS $$
DECLARE
  v_tipo text := upper(trim(coalesce(p_tipo_ajuste, '')));
  v_updated integer := 0;
BEGIN
  IF v_tipo NOT IN ('MONTO', 'PORCENTAJE') THEN
    RAISE EXCEPTION 'p_tipo_ajuste invalido. Use MONTO o PORCENTAJE.';
  END IF;

  IF p_valor_ajuste IS NULL THEN
    RAISE EXCEPTION 'p_valor_ajuste no puede ser null.';
  END IF;

  IF v_tipo = 'MONTO' THEN
    UPDATE devsimple.lotes
    SET precio_referencial = greatest(0, coalesce(precio_referencial, 0) + p_valor_ajuste)
    WHERE estado_comercial = 'DISPONIBLE';
  ELSE
    UPDATE devsimple.lotes
    SET precio_referencial = greatest(0, coalesce(precio_referencial, 0) * (1 + (p_valor_ajuste / 100.0)))
    WHERE estado_comercial = 'DISPONIBLE';
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at automático en lotes
CREATE TRIGGER trg_lotes_updated_at
  BEFORE UPDATE ON devsimple.lotes
  FOR EACH ROW EXECUTE FUNCTION devsimple.set_updated_at();

-- updated_at automático en usuarios
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON devsimple.usuarios
  FOR EACH ROW EXECUTE FUNCTION devsimple.set_updated_at();

-- Límite de 3 admins activos
CREATE TRIGGER trg_check_max_admins
  BEFORE INSERT OR UPDATE ON devsimple.usuarios
  FOR EACH ROW EXECUTE FUNCTION devsimple.check_max_admins();
