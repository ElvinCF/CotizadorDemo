import type { Lote } from "../domain/types";

export const loadLotesFromApi = async (): Promise<Lote[]> => {
  const response = await fetch("/api/lotes", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar lotes: ${response.status}`);
  }
  const payload = (await response.json()) as { items?: Lote[] };
  return Array.isArray(payload.items) ? payload.items : [];
};
