export const THERMAL_LABEL_WIDTH_MM = 75;
export const THERMAL_LABEL_HEIGHT_MM = 50;

export function buildPrintDocument(labels: string[]): string {
  if (!labels.length) throw new Error("At least one label is required");
  const pages = labels.map((label) => `<section class="label-page">${label}</section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Sovereign Standard Dispatch</title><style>
    @page { size: ${THERMAL_LABEL_WIDTH_MM}mm ${THERMAL_LABEL_HEIGHT_MM}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: ${THERMAL_LABEL_WIDTH_MM}mm; margin: 0; padding: 0; background: #fff; }
    body { font-family: Helvetica, Arial, sans-serif; }
    .label-page { width: ${THERMAL_LABEL_WIDTH_MM}mm; height: ${THERMAL_LABEL_HEIGHT_MM}mm; margin: 0; padding: 0; overflow: hidden; break-after: page; page-break-after: always; }
    .label-page:last-child { break-after: auto; page-break-after: auto; }
    svg { display: block; width: ${THERMAL_LABEL_WIDTH_MM}mm; height: ${THERMAL_LABEL_HEIGHT_MM}mm; margin: 0; padding: 0; }
  </style></head><body>${pages}</body></html>`;
}
