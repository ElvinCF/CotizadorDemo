export type DateBounds = {
  min: string;
  max: string;
};

const DATE_ONLY_PATTERN = /^(\d{4}-\d{2}-\d{2})/;

const pad2 = (value: number) => String(value).padStart(2, "0");

export const toDateInput = (value: string) => {
  const raw = String(value || "").trim();
  const dateOnly = raw.match(DATE_ONLY_PATTERN)?.[1];
  if (dateOnly) return dateOnly;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
};

export const buildDateBounds = (values: string[]): DateBounds => {
  const dates = values.map(toDateInput).filter((value) => value).sort();
  if (dates.length === 0) return { min: "", max: "" };
  return { min: dates[0], max: dates[dates.length - 1] };
};

export const isDateInRange = (value: string, from: string, to: string) => {
  if (!from && !to) return true;

  const current = toDateInput(value);
  if (!current) return false;

  const fromDate = toDateInput(from);
  const toDate = toDateInput(to);

  if (fromDate && current < fromDate) return false;
  if (toDate && current > toDate) return false;

  return true;
};

export const withDefaultDateRange = <T extends { fechaDesde: string; fechaHasta: string }>(
  current: T,
  bounds: DateBounds
) => ({
  ...current,
  fechaDesde: current.fechaDesde || bounds.min,
  fechaHasta: current.fechaHasta || bounds.max,
});
