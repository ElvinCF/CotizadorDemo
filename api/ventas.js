import { createSaleAsync, listSalesAsync } from "../backend/lib/ventasService.mjs";
import { getErrorStatus } from "../backend/lib/errors.mjs";

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
  if (req.method === "GET") {
    try {
      const { username, pin } = getAuthCredentials(req);
      if (!username || !pin) {
        res.status(401).json({ error: "Credenciales requeridas." });
        return;
      }

      const items = await listSalesAsync(username, pin);
      res.status(200).json({ items });
    } catch (error) {
      console.error("Vercel API GET /api/ventas error:", error);
      res.status(getErrorStatus(error, 400)).json({ error: error.message || "No se pudo listar ventas." });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { username, pin } = getAuthCredentials(req);
      if (!username || !pin) {
        res.status(401).json({ error: "Credenciales requeridas." });
        return;
      }

      const sale = await createSaleAsync(username, pin, req.body ?? {});
      res.status(201).json({ sale });
    } catch (error) {
      console.error("Vercel API POST /api/ventas error:", error);
      res.status(getErrorStatus(error, 500)).json({ error: error.message || "No se pudo crear la venta." });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}
