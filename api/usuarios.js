import {
  createUserAsync,
  getUserCatalogsAsync,
  listUsersAsync,
  updateUserAsync,
} from "../backend/lib/usuariosService.mjs";

const getAdminCredentials = (req) => {
  const headerUser = req.headers["x-admin-user"];
  const headerPin = req.headers["x-admin-pin"];
  const bodyUser = req.body?.auth?.username;
  const bodyPin = req.body?.auth?.pin;

  return {
    username: typeof headerUser === "string" && headerUser.trim() ? headerUser.trim() : bodyUser,
    pin: typeof headerPin === "string" && headerPin.trim() ? headerPin.trim() : bodyPin,
  };
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { username: authUser, pin: authPin } = getAdminCredentials(req);
      if (!authUser || !authPin) {
        res.status(401).json({ error: "Credenciales de admin requeridas." });
        return;
      }
      const users = await listUsersAsync(authUser, authPin);
      const catalogs = await getUserCatalogsAsync(authUser, authPin);
      res.status(200).json({ users, catalogs });
    } catch (error) {
      console.error("Vercel API GET /api/usuarios error:", error);
      res.status(403).json({ error: error.message || "Error al listar usuarios." });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { username: authUser, pin: authPin } = getAdminCredentials(req);
      const { nuevoUsuario } = req.body ?? {};
      if (!authUser || !authPin) {
        res.status(401).json({ error: "Credenciales de admin requeridas." });
        return;
      }
      const user = await createUserAsync(authUser, authPin, nuevoUsuario);
      res.status(201).json({ success: true, user });
    } catch (error) {
      console.error("Vercel API POST /api/usuarios error:", error);
      const status = error.message?.includes("permisos") ? 403
        : error.message?.includes("administradores") ? 409
        : error.message?.includes("ya existe") ? 409
        : 400;
      res.status(status).json({ error: error.message || "Error al crear usuario." });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const { username: authUser, pin: authPin } = getAdminCredentials(req);
      const { id, patch } = req.body ?? {};
      if (!authUser || !authPin) {
        res.status(401).json({ error: "Credenciales de admin requeridas." });
        return;
      }
      const user = await updateUserAsync(authUser, authPin, id, patch);
      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error("Vercel API PUT /api/usuarios error:", error);
      const status = error.message?.includes("permisos") ? 403
        : error.message?.includes("administradores") ? 409
        : error.message?.includes("ya existe") ? 409
        : error.message?.includes("no encontrado") ? 404
        : 400;
      res.status(status).json({ error: error.message || "Error al actualizar usuario." });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, PUT");
  res.status(405).json({ error: "Method not allowed" });
}
