import { updateSalePaymentAsync } from "../../../../backend/lib/ventasService.mjs";
import { getErrorStatus } from "../../../../backend/lib/errors.mjs";

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
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { username, pin } = getAuthCredentials(req);
    if (!username || !pin) {
      res.status(401).json({ error: "Credenciales requeridas." });
      return;
    }

    const sale = await updateSalePaymentAsync(username, pin, req.query.id, req.query.pagoId, req.body ?? {});
    res.status(200).json({ sale });
  } catch (error) {
    console.error("Vercel API PUT /api/ventas/:id/pagos/:pagoId error:", error);
    res.status(getErrorStatus(error, 500)).json({ error: error.message || "No se pudo actualizar el pago." });
  }
}
