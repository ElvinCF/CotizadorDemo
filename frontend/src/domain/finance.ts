import type { OverlayTransform } from "./types";

export const quoteMonthly = (monto: number, cuotas: number, interesAnual: number) => {
  if (cuotas <= 0) return 0;
  const i = interesAnual / 12 / 100;
  if (i <= 0) return monto / cuotas;
  const factor = (i * Math.pow(1 + i, cuotas)) / (Math.pow(1 + i, cuotas) - 1);
  return monto * factor;
};

export const buildIdSet = <T extends { id: string }>(items: T[]) => new Set(items.map((item) => item.id));

export const overlayStyle = (transform: OverlayTransform) => ({
  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
  transformOrigin: "top left",
});
