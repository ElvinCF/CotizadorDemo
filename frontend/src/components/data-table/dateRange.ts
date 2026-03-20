export type DateBounds = {
  min: string;
  max: string;
};

export const toDateInput = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export const buildDateBounds = (values: string[]): DateBounds => {
  const dates = values.map(toDateInput).filter((value) => value).sort();
  if (dates.length === 0) return { min: "", max: "" };
  return { min: dates[0], max: dates[dates.length - 1] };
};

export const withDefaultDateRange = <T extends { fechaDesde: string; fechaHasta: string }>(
  current: T,
  bounds: DateBounds
) => ({
  ...current,
  fechaDesde: current.fechaDesde || bounds.min,
  fechaHasta: current.fechaHasta || bounds.max,
});
