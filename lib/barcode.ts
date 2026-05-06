import type { LabelData } from "../types/label";
import type { Product } from "../types/product";
import {
  buildGS1BarcodeText,
  buildGS1HumanText,
  buildGtinBoxesOrderElements,
  buildSSCCElement,
  buildValidityLotElements,
  digitsOnly,
} from "./gs1";
import { calculateGS1CheckDigit } from "./sscc";

export type BarcodeType = "code128" | "gs1-128" | "ean13" | "itf14" | "interleaved2of5" | "sscc18";

export function normalizeGtin(value?: string): string {
  const digits = digitsOnly(value ?? "");

  if (digits.length === 14) {
    const withoutCheckDigit = digits.slice(0, 13);
    return `${withoutCheckDigit}${calculateGS1CheckDigit(withoutCheckDigit)}`;
  }

  if (digits.length === 13) {
    return `0${digits}`;
  }

  if (digits.length === 12) {
    const ean13 = `${digits}${calculateGS1CheckDigit(digits)}`;
    return `0${ean13}`;
  }

  return digits.slice(0, 14);
}

export function getProductGtin(product: Product): string {
  const itfCdi = digitsOnly(product.itf_cdi ?? "");
  const itf = digitsOnly(product.itf ?? "");

  if (itfCdi) {
    return normalizeGtin(itfCdi);
  }

  if (itf.length === 13) {
    return `${itf}${calculateGS1CheckDigit(itf)}`;
  }

  return normalizeGtin(product.ean_cdi ?? product.ean ?? "");
}

export function getLabelBarcodeText(data: LabelData) {
  const gtin = getProductGtin(data.product);
  const ssccElements = buildSSCCElement(data.sscc);
  const gtinBoxesOrderElements = buildGtinBoxesOrderElements(gtin, data.caixas, data.ordem_compra);
  const validityLotElements = buildValidityLotElements(data.validade_barras, data.lote);

  return {
    gtin,
    ssccHuman: buildGS1HumanText(ssccElements),
    ssccEncoded: buildGS1BarcodeText(ssccElements),
    gtinBoxesOrderHuman: buildGS1HumanText(gtinBoxesOrderElements),
    gtinBoxesOrderEncoded: buildGS1BarcodeText(gtinBoxesOrderElements),
    validityLotHuman: buildGS1HumanText(validityLotElements),
    validityLotEncoded: buildGS1BarcodeText(validityLotElements),
  };
}
