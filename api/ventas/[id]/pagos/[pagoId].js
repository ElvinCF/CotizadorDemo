import { deleteSalePaymentAsync, updateSalePaymentAsync } from "../../../../backend/lib/ventasService.mjs";
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
  if (req.method !== "PUT" && req.method !== "DELETE") {
    res.setHeader("Allow", "PUT, DELETE");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { username, pin } = getAuthCredentials(req);
    if (!username || !pin) {
      res.status(401).json({ error: "Credenciales requeridas." });
      return;
    }

    const sale =
      req.method === "DELETE"
        ? await deleteSalePaymentAsync(username, pin, req.query.id, req.query.pagoId)
        : await updateSalePaymentAsync(username, pin, req.query.id, req.query.pagoId, req.body ?? {});
    res.status(req.method === "DELETE" ? 200 : 200).json({ sale });
  } catch (error) {
    console.error(`Vercel API ${req.method} /api/ventas/:id/pagos/:pagoId error:`, error);
    res
      .status(getErrorStatus(error, 500))
      .json({ error: error.message || (req.method === "DELETE" ? "No se pudo eliminar el pago." : "No se pudo actualizar el pago.") });
  }
}
