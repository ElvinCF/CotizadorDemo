import Papa from "papaparse";
import { cleanNumber, toLoteId } from "../domain/formatters";
import type { CsvRow, Lote } from "../domain/types";

const enforceFixedStatuses = (items: Lote[]): Lote[] =>
  items.map((item) => {
    if (item.mz === "B" && (item.lote === 17 || item.lote === 18)) {
      return { ...item, condicion: "SEPARADO" };
    }
    return item;
  });

export const loadLotesFromApi = async (): Promise<Lote[]> => {
  const response = await fetch("/api/lotes", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar lotes: ${response.status}`);
  }
  const payload = (await response.json()) as { items?: Lote[] };
  return enforceFixedStatuses(Array.isArray(payload.items) ? payload.items : []);
};

export const loadLotesFromCsvFallback = async (): Promise<Lote[]> => {
  const response = await fetch("/assets/lotes.csv", { cache: "no-store" });
  const text = await response.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = (parsed.data || []).flatMap((row: CsvRow): Lote[] => {
    const mz = (row.MZ || "").trim().toUpperCase();
    const lote = Number.parseInt((row.LOTE || "").trim(), 10);
    if (!mz || Number.isNaN(lote)) return [];
    const areaM2 = cleanNumber(row.AREA);
    const price = cleanNumber(row.PRECIO);
    const condicion = (row.CONDICION || "LIBRE").trim().toUpperCase();
    const asesor = (row.ASESOR || "").trim();
    const cliente = (row.CLIENTE || "").trim();
    const comentario = (row.COMENTARIO || "").trim();
    const ultimaModificacion = (row.ULTIMA_MODIFICACION || "").trim();
    return [
      {
        id: toLoteId(mz, lote),
        mz,
        lote,
        areaM2,
        price,
        condicion: condicion || "LIBRE",
        asesor: asesor || undefined,
        cliente: cliente || undefined,
        comentario: comentario || undefined,
        ultimaModificacion: ultimaModificacion || undefined,
      },
    ];
  });
  return enforceFixedStatuses(rows);
};
