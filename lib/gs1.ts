export type GS1Element = {
  ai: string;
  value: string | number;
};

export function digitsOnly(value: string | number): string {
  return String(value).replace(/\D/g, "");
}

export function buildGS1HumanText(elements: GS1Element[]): string {
  return elements.map((element) => `(${element.ai}) ${String(element.value)}`).join(" ");
}

export function buildGS1BarcodeText(elements: GS1Element[]): string {
  // bwip-js/BWIPP's gs1-128 encoder accepts GS1 AI bracket syntax and inserts
  // required FNC1 separators automatically for variable-length fields.
  // All GS1-128 output must be tested with the warehouse/retailer scanner before production use.
  return elements.map((element) => `(${element.ai})${String(element.value)}`).join("");
}

export function buildSSCCElement(sscc: string): GS1Element[] {
  return [{ ai: "00", value: digitsOnly(sscc) }];
}

export function buildGtinBoxesOrderElements(gtin: string, caixas: number, ordemCompra: string): GS1Element[] {
  return [
    { ai: "02", value: digitsOnly(gtin) },
    { ai: "37", value: caixas },
    { ai: "400", value: ordemCompra.trim() },
  ];
}

export function buildValidityLotElements(validadeBarras: string, lote: string): GS1Element[] {
  return [
    { ai: "16", value: digitsOnly(validadeBarras) },
    { ai: "10", value: lote.trim() },
  ];
}
