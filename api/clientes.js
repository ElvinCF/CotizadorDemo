import { findClientByDniAsync } from "../backend/lib/ventasService.mjs";

const getAuthCredentials = (req) => {
  const headerUser = req.headers["x-auth-user"];
  const headerPin = req.headers["x-auth-pin"];
  const bodyUser = req.body?.auth?.username;
  const bodyPin = req.body?.auth?.pin;

  return {
    username: typeof headerUser === "string" && headerUser.trim() ? headerUser.trim() : bodyUser,
    pin: typeof headerPin === "string" && headerPin.trim() ? headerPin.trim() : bodyPin,
  };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { username, pin } = getAuthCredentials(req);
    const dni = req.query?.dni;

    if (!username || !pin) {
      res.status(401).json({ error: "Credenciales requeridas." });
      return;
    }

    if (typeof dni !== "string" || !dni.trim()) {
      res.status(400).json({ error: "Falta dni." });
      return;
    }

    const client = await findClientByDniAsync(username, pin, dni);
    res.status(200).json({ client });
  } catch (error) {
    console.error("Vercel API GET /api/clientes error:", error);
    res.status(400).json({ error: error.message || "No se pudo buscar cliente." });
  }
}
