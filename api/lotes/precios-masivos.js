import { getErrorStatus } from "../../backend/lib/errors.mjs";
import { updateAvailablePricesMassive } from "../../backend/lib/lotesService.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const updatedCount = await updateAvailablePricesMassive(req.body ?? {});
    res.status(200).json({ updatedCount, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Vercel API POST /api/lotes/precios-masivos error:", error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    res.status(getErrorStatus(error, 500)).json({
      error: "No se pudo actualizar precios masivamente en la base de datos",
      detail,
    });
  }
}
