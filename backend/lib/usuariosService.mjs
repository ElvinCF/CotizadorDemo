import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "./lotesService.mjs";

export const loginAsync = async (username, pin) => {
  const supabase = getSupabaseAdminClient();
  const userLower = String(username || "").trim().toLowerCase();
  
  // 1. Fetch user by username
  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("id, username, pin_hash, rol, estado, nombres, apellidos, telefono")
    .eq("username", userLower)
    .maybeSingle();

  if (userError) {
    console.error("Error fetching user:", userError);
    throw new Error("Error interno al verificar credenciales.");
  }

  if (!usuario) {
    return null; // Invalid username
  }

  if (usuario.estado !== "ACTIVO") {
    throw new Error("El usuario se encuentra inactivo.");
  }

  // 2. Verify PIN using SHA256 hashing to match pgcrypto's digest
  const hashedInputPin = createHash("sha256").update(String(pin)).digest("hex");
  if (usuario.pin_hash !== hashedInputPin) {
    return null; // Invalid PIN
  }

  // 3. Map DB Role to Frontend Role
  // The frontend currently only supports 'admin' and 'asesor' (formerly 'vendedor')
  let frontendRole = "asesor"; 
  if (usuario.rol === "ADMIN") {
    frontendRole = "admin";
  } else if (usuario.rol === "ASESOR" || usuario.rol === "VENDEDOR") {
    frontendRole = "asesor";
  } else {
    // If we receive CLIENTE or SUPERVISOR, we map them cautiously for this iteration, or deny login.
    // For now, only allow ADMIN and ASESOR as requested.
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
