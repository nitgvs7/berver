import { describe, expect, it } from "vitest";
import { dateToYYMMDD } from "../lib/date";
import { getProductGtin } from "../lib/barcode";
import { findProductByCode, searchProducts } from "../lib/products";
import { calculateGS1CheckDigit, formatHumanSSCC, generateSSCC } from "../lib/sscc";
import { validateLabelForm } from "../lib/validation";

describe("GS1 and SSCC utilities", () => {
  it("calculates a GS1 modulo 10 check digit", () => {
    expect(calculateGS1CheckDigit("400638133393")).toBe("1");
  });

  it("generates an 18 digit SSCC with the default config", () => {
    expect(generateSSCC(500000)).toBe("356039360005000000");
    expect(formatHumanSSCC("356039360005000000")).toBe("3 5603936 000500000 0");
  });
});

describe("date utilities", () => {
  it("converts Portuguese visible dates to YYMMDD", () => {
    expect(dateToYYMMDD("30-06-2027")).toBe("270630");
    expect(dateToYYMMDD("31-02-2027")).toBeNull();
  });
});

describe("product utilities", () => {
  it("finds products by EAN and retailer code", () => {
    expect(findProductByCode("893527080574")?.name).toBe("AGUA COCO C/ ANANAS LATA 320ML COCONAUT");
    expect(findProductByCode("3385713")?.name).toBe("AGUA COCO C/MELANCIA LATA 320ML COCONAUT");
  });

  it("normalizes product GTIN values to a valid GTIN-14", () => {
    const product = findProductByCode("893527080574");
    expect(product ? getProductGtin(product) : null).toBe("18935270805743");
  });

  it("returns no products only when an explicitly provided product list is empty", () => {
    expect(searchProducts("", [])).toEqual([]);
  });
});

describe("label validation", () => {
  it("returns Portuguese validation messages for missing values", () => {
    const errors = validateLabelForm({
      product: null,
      ordem_compra: "",
      lote: "",
      validade_texto: "31-02-2027",
      validade_barras: "27063",
      caixas: 0,
      quantidade_etiquetas: "",
    });

    expect(errors.product).toBe("Selecione um produto.");
    expect(errors.validade_texto).toBe("Use uma data válida no formato DD-MM-YYYY.");
    expect(errors.validade_barras).toBe("A validade de barras deve ter 6 dígitos YYMMDD.");
    expect(errors.caixas).toBe("O número de caixas deve ser maior que zero.");
  });
});
