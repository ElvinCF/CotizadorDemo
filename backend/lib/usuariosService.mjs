import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "./lotesService.mjs";

const hashPin = (pin) => createHash("sha256").update(String(pin)).digest("hex");

const VALID_ROLES = new Set(["ADMIN", "ASESOR"]);
const MAX_ADMINS = 3;

/**
 * Verifies that the given credentials belong to an active ADMIN.
 * Returns the admin record or throws.
 */
const verifyAdminAsync = async (username, pin) => {
  const supabase = getSupabaseAdminClient();
  const userLower = String(username || "").trim().toLowerCase();

  const { data: admin, error } = await supabase
    .from("usuarios")
    .select("id, username, rol, estado")
    .eq("username", userLower)
    .maybeSingle();

  if (error) throw new Error("Error interno al verificar credenciales.");
  if (!admin) throw new Error("Credenciales de administrador inválidas.");
  if (admin.estado !== "ACTIVO") throw new Error("El administrador se encuentra inactivo.");
  if (admin.rol !== "ADMIN") throw new Error("No tienes permisos de administrador.");

  const hashed = hashPin(pin);
  if (admin.pin_hash !== undefined && admin.pin_hash !== hashed) {
    // pin_hash may not be in the select — re-fetch just pin_hash
  }
  // Re-verify PIN with pin_hash
  const { data: full, error: pinErr } = await supabase
    .from("usuarios")
    .select("pin_hash")
    .eq("id", admin.id)
    .single();

  if (pinErr) throw new Error("Error interno al verificar PIN.");
  if (full.pin_hash !== hashed) throw new Error("Credenciales de administrador inválidas.");

  return admin;
};

export const loginAsync = async (username, pin) => {
  const supabase = getSupabaseAdminClient();
  const userLower = String(username || "").trim().toLowerCase();
  
  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("id, username, pin_hash, rol, estado, nombres, apellidos, telefono")
    .eq("username", userLower)
    .maybeSingle();

  if (userError) {
    console.error("Error fetching user:", userError);
    throw new Error("Error interno al verificar credenciales.");
  }

  if (!usuario) return null;

  if (usuario.estado !== "ACTIVO") {
    throw new Error("El usuario se encuentra inactivo.");
  }

  const hashedInputPin = hashPin(pin);
  if (usuario.pin_hash !== hashedInputPin) return null;

  let frontendRole = "asesor"; 
  if (usuario.rol === "ADMIN") {
    frontendRole = "admin";
  } else if (usuario.rol === "ASESOR" || usuario.rol === "VENDEDOR") {
    frontendRole = "asesor";
  } else {
    throw new Error("No tienes un rol válido (Admin o Asesor) para acceder al sistema.");
  }

  return {
    id: usuario.id,
    username: usuario.username,
    role: frontendRole,
    nombre: `${usuario.nombres} ${usuario.apellidos}`.trim(),
    telefono: usuario.telefono || ""
  };
};

export const createUserAsync = async (adminUsername, adminPin, nuevoUsuario) => {
  // 1. Verify caller is admin
  await verifyAdminAsync(adminUsername, adminPin);

  const supabase = getSupabaseAdminClient();

  // 2. Validate input
  const { username, pin, rol, nombres, apellidos, telefono } = nuevoUsuario || {};

  if (!username || !pin || !rol || !nombres) {
    throw new Error("Faltan campos obligatorios (username, pin, rol, nombres).");
  }

  const rolUpper = String(rol).toUpperCase();
  if (!VALID_ROLES.has(rolUpper)) {
    throw new Error("Rol inválido. Use ADMIN o ASESOR.");
  }

  // 3. Check max admins
  if (rolUpper === "ADMIN") {
    const { count, error: countErr } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("rol", "ADMIN")
      .eq("estado", "ACTIVO");

    if (countErr) throw new Error("Error al verificar límite de administradores.");
    if (count >= MAX_ADMINS) {
      throw new Error(`No se pueden crear más de ${MAX_ADMINS} administradores activos.`);
    }
  }

  // 4. Check username uniqueness
  const userLower = String(username).trim().toLowerCase();
  const { data: existing } = await supabase
    .from("usuarios")
    .select("id")
    .eq("username", userLower)
    .maybeSingle();

  if (existing) {
    throw new Error(`El username '${userLower}' ya existe.`);
  }

  // 5. Insert
  const { data: created, error: insertErr } = await supabase
    .from("usuarios")
    .insert({
      username: userLower,
      pin_hash: hashPin(pin),
      rol: rolUpper,
      nombres: String(nombres).trim(),
      apellidos: String(apellidos || "").trim(),
      telefono: String(telefono || "").trim(),
      estado: "ACTIVO",
    })
    .select("id, username, rol, estado, nombres, apellidos, telefono, created_at")
    .single();

  if (insertErr) {
    console.error("Error creating user:", insertErr);
    if (insertErr.message?.includes("administradores")) {
      throw new Error(`No se pueden crear más de ${MAX_ADMINS} administradores activos.`);
    }
    throw new Error("Error al crear el usuario.");
  }

  return created;
};

export const listUsersAsync = async (adminUsername, adminPin) => {
  await verifyAdminAsync(adminUsername, adminPin);

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, username, rol, estado, nombres, apellidos, telefono, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Error al listar usuarios.");

  return data || [];
};

