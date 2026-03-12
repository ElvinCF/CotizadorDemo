import { createUserAsync, listUsersAsync } from "../../backend/lib/usuariosService.mjs";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const authUser = req.headers["x-admin-user"];
      const authPin = req.headers["x-admin-pin"];
      if (!authUser || !authPin) {
        res.status(401).json({ error: "Credenciales de admin requeridas." });
        return;
      }
      const users = await listUsersAsync(authUser, authPin);
      res.status(200).json({ users });
    } catch (error) {
      console.error("Vercel API GET /api/usuarios error:", error);
      res.status(403).json({ error: error.message || "Error al listar usuarios." });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { auth, nuevoUsuario } = req.body ?? {};
      if (!auth?.username || !auth?.pin) {
        res.status(401).json({ error: "Credenciales de admin requeridas." });
        return;
      }
      const user = await createUserAsync(auth.username, auth.pin, nuevoUsuario);
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

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}
