import { forbidden, unauthorized } from "./errors.mjs";
import { loginAsync } from "./usuariosService.mjs";

const mapAuthenticatedUser = (user) => {
  const frontendRole = String(user?.role || "").trim().toLowerCase();
  const rawRole = String(user?.rawGlobalRole || (frontendRole === "admin" ? "ADMIN" : "ASESOR"))
    .trim()
    .toUpperCase();

  return {
    id: user.id,
    username: user.username,
    role: frontendRole,
    rawRole,
    nombre: user.nombre ?? "",
    telefono: user.telefono ?? "",
  };
};

export const authenticateUserAsync = async (username, pin) => {
  const user = await loginAsync(username, pin);
  if (!user) {
    return null;
  }
  return mapAuthenticatedUser(user);
};

export const requireAuthenticatedUserAsync = async (username, pin) => {
  const user = await authenticateUserAsync(username, pin);
  if (!user) {
    throw unauthorized("Credenciales invalidas.");
  }
  return user;
};

export const requireAdminUserAsync = async (username, pin) => {
  const user = await requireAuthenticatedUserAsync(username, pin);
  if (user.rawRole !== "ADMIN" && user.rawRole !== "SUPERADMIN") {
    throw forbidden("No tienes permisos de administrador.");
  }
  return user;
};

export const requireAdvisorUserAsync = async (username, pin) => {
  const user = await requireAuthenticatedUserAsync(username, pin);
  if (user.rawRole !== "ASESOR") {
    throw forbidden("No tienes permisos de asesor.");
  }
  return user;
};
