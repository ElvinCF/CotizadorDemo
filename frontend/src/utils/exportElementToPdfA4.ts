export async function exportElementToPdfA4(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = "-200vw";
  clone.style.top = "0";
  clone.style.width = `${element.offsetWidth}px`;
  clone.style.maxHeight = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  clone.querySelectorAll<HTMLElement>("[data-dashboard-print-hide='true']").forEach((node) => {
    node.style.display = "none";
  });
  document.body.appendChild(clone);

  const canvas = await html2canvas(clone, {
    scale: Math.min(window.devicePixelRatio || 1, 2),
    backgroundColor: "#0f1724",
    useCORS: true,
    logging: false,
  });

  clone.remove();

  const imageData = canvas.toDataURL("image/png", 1);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;

  let remainingHeight = imageHeight;
  let offsetY = margin;

  pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, imageHeight, undefined, "FAST");
  remainingHeight -= printableHeight;

  while (remainingHeight > 0) {
    pdf.addPage("a4", "portrait");
    offsetY = margin - (imageHeight - remainingHeight);
    pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, imageHeight, undefined, "FAST");
    remainingHeight -= printableHeight;
  }

  pdf.save(filename);
}
