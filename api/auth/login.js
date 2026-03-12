import { loginAsync } from "../../backend/lib/usuariosService.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { username, pin } = req.body ?? {};
    if (!username || !pin) {
      res.status(400).json({ error: "Falta usuario o PIN." });
      return;
    }

    const userData = await loginAsync(username, pin);
    if (!userData) {
      res.status(401).json({ error: "Usuario o PIN incorrectos." });
      return;
    }

    res.status(200).json({ success: true, user: userData });
  } catch (error) {
    console.error("Vercel API POST /api/auth/login error:", error);
    res.status(403).json({ error: error.message || "No tienes permisos para acceder." });
  }
}
