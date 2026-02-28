export const statusToClass = (value: string | undefined) => {
  switch ((value || "").toUpperCase()) {
    case "SEPARADO":
      return "separado";
    case "VENDIDO":
      return "vendido";
    default:
      return "libre";
  }
};

export const normalizeStatusLabel = (value: string | undefined) => {
  switch ((value || "").toUpperCase()) {
    case "VENDIDO":
      return "VENDIDO";
    case "SEPARADO":
      return "SEPARADO";
    default:
      return "DISPONIBLE";
  }
};

export const cleanNumber = (value: string | undefined) => {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toLoteId = (mz: string, lote: number) => `${mz}-${String(lote).padStart(2, "0")}`;

export const formatMoney = (value: number | null) => {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatArea = (value: number | null) => {
  if (value == null) return "-";
  return `${value.toFixed(2)} m2`;
};

export const formatNumber = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(2);
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const toDateValue = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};
