import type { SaleRecord, SalesClient } from "../../domain/ventas";
import { COMPANY_LOGO_IMAGE, PROJECT_LOGO_SVG } from "../../app/assets";
import { waitForPrintWindowAssets } from "../../utils/printWindow";

export type SalePrintKind = "separacion" | "contrato";

type SalePrintData = {
  kind: SalePrintKind;
  sale: SaleRecord;
  cliente: SalesClient | null;
  cliente2: SalesClient | null;
  project?: {
    name?: string;
    owner?: string;
    logoProyectoUrl?: string;
    logoEmpresaUrl?: string;
  };
};

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-PE");

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value || 0);

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildSignatures = () => `
  <section class="signatures">
    <article><div class="line"></div><p>Cliente titular</p></article>
    <article><div class="line"></div><p>Segundo titular (opcional)</p></article>
    <article><div class="line"></div><p>Asesor responsable</p></article>
  </section>
`;

const buildTemplate = ({ kind, sale, cliente, cliente2, project }: SalePrintData) => {
  const projectName = project?.name || "Proyecto";
  const loteLabel = sale.lote ? `${sale.lote.mz} - Lote ${sale.lote.lote}` : "Sin lote";
  const clienteTitular = cliente?.nombreCompleto || "-";
  const dniTitular = cliente?.dni || "-";
  const segundoTitular = cliente2?.nombreCompleto || "-";
  const dniSegundoTitular = cliente2?.dni || "-";
  const asesor = sale.asesor?.nombre || sale.asesor?.username || "-";

  const resumen = `
    <section class="summary">
      <p><strong>Proyecto:</strong> ${escapeHtml(projectName)}</p>
      <p><strong>Lote:</strong> ${escapeHtml(loteLabel)}</p>
      <p><strong>Fecha:</strong> ${escapeHtml(formatDate(sale.fechaVenta))}</p>
      <p><strong>Precio de venta:</strong> ${escapeHtml(formatMoney(sale.precioVenta))}</p>
      <p><strong>Monto inicial total:</strong> ${escapeHtml(formatMoney(sale.montoInicialTotal))}</p>
      <p><strong>Monto financiado:</strong> ${escapeHtml(formatMoney(sale.montoFinanciado))}</p>
      <p><strong>Plan:</strong> ${escapeHtml(sale.cantidadCuotas)} cuotas de ${escapeHtml(formatMoney(sale.montoCuota))}</p>
      <p><strong>Titular:</strong> ${escapeHtml(clienteTitular)} (${escapeHtml(dniTitular)})</p>
      <p><strong>Segundo titular:</strong> ${escapeHtml(segundoTitular)} (${escapeHtml(dniSegundoTitular)})</p>
      <p><strong>Asesor:</strong> ${escapeHtml(asesor)}</p>
    </section>
  `;

  if (kind === "separacion") {
    return `
      <h1>Ficha de Separacion - Declaracion Jurada</h1>
      ${resumen}
      <section class="body-text">
        <p>
          Yo, <strong>${escapeHtml(clienteTitular)}</strong>, identificado con DNI
          <strong> ${escapeHtml(dniTitular)}</strong>, declaro mi voluntad de separar el lote
          <strong> ${escapeHtml(loteLabel)}</strong> del proyecto ${escapeHtml(projectName)}.
        </p>
        <p>
          Declaro conocer las condiciones comerciales vigentes, el cronograma de pagos y
          que la separacion se mantiene sujeta al cumplimiento del plan de pago inicial y posterior contrato.
        </p>
        <p>
          Monto de separacion/inicial reconocido: <strong>${escapeHtml(formatMoney(sale.montoInicialTotal))}</strong>.
        </p>
      </section>
      ${buildSignatures()}
    `;
  }

  return `
    <h1>Ficha de Venta / Contrato Comercial</h1>
    ${resumen}
    <section class="body-text">
      <p>
        Las partes acuerdan la compraventa del lote <strong>${escapeHtml(loteLabel)}</strong> por el monto
        de <strong>${escapeHtml(formatMoney(sale.precioVenta))}</strong>, con financiamiento
        de <strong>${escapeHtml(formatMoney(sale.montoFinanciado))}</strong>.
      </p>
      <p>
        El plan pactado contempla <strong>${escapeHtml(sale.cantidadCuotas)}</strong> cuotas de
        <strong> ${escapeHtml(formatMoney(sale.montoCuota))}</strong>, sujeto al estado actual de la venta:
        <strong> ${escapeHtml(sale.estadoVenta)}</strong>.
      </p>
      <p>
        Observacion contractual: <strong>${escapeHtml(sale.observacion || "Sin observaciones")}</strong>.
      </p>
    </section>
    ${buildSignatures()}
  `;
};

export const printSaleDocument = async (data: SalePrintData) => {
  if (typeof window === "undefined") return;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=720");
  if (!popup) return;

  const title = data.kind === "separacion" ? "Ficha de Separacion" : "Ficha de Venta / Contrato";
  const content = buildTemplate(data);
  const projectName = data.project?.name || "Proyecto";
  const logoArenasMalabrigo = new URL(data.project?.logoProyectoUrl || PROJECT_LOGO_SVG, window.location.origin).href;
  const logoHolaTrujillo = new URL(data.project?.logoEmpresaUrl || COMPANY_LOGO_IMAGE, window.location.origin).href;

  popup.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: "Segoe UI", Arial, sans-serif; color: #182332; margin: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 18px; }
          .header img { max-height: 48px; object-fit: contain; }
          h1 { margin: 0 0 14px; font-size: 20px; }
          .summary { border: 1px solid #d9cdb8; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; background: #fffdfa; }
          .summary p { margin: 4px 0; font-size: 13px; }
          .body-text { border: 1px solid #e8dfcf; border-radius: 12px; padding: 14px; background: #fff; }
          .body-text p { margin: 0 0 10px; line-height: 1.55; font-size: 14px; text-align: justify; }
          .signatures { margin-top: 42px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
          .line { height: 1px; background: #4d5d73; margin-bottom: 8px; }
          .signatures p { margin: 0; text-align: center; font-size: 12px; color: #4d5d73; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <header class="header">
          <img src="${logoArenasMalabrigo}" alt="${escapeHtml(projectName)}" />
          <img src="${logoHolaTrujillo}" alt="Hola Trujillo" />
        </header>
        ${content}
      </body>
    </html>
  `);
  popup.document.close();
  await waitForPrintWindowAssets(popup);
  popup.focus();
  popup.print();
};




