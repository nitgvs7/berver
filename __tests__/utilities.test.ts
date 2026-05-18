import { describe, expect, it } from "vitest";
import { dateToYYMMDD } from "../lib/date";
import { getProductGtin } from "../lib/barcode";
import { findProductByCode, getSeedProducts, groupProductsByCategory, searchProducts, sortProducts, syncProductsWithSeed } from "../lib/products";
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

  it("keeps products grouped by spreadsheet categories", () => {
    const groups = groupProductsByCategory(getSeedProducts());

    expect(findProductByCode("893527080574")?.category).toBe("BEBIDAS SEM ALCOOL");
    expect(groups.map((group) => group.category)).toEqual([
      "BEBIDAS SEM ALCOOL",
      "CERVEJAS",
      "MERCEARIA SALGADA",
      "AVULSO",
      "SABORES DO MUNDO",
      "MERCEARIA DOCE",
    ]);
  });

  it("sorts product results without mutating the source list", () => {
    const products = getSeedProducts().slice(0, 3);
    const sorted = sortProducts(products, "name-asc");

    expect(sorted.map((product) => product.name)).toEqual([
      "AGUA COCO C/ ANANAS LATA 320ML COCONAUT",
      "AGUA COCO C/MELANCIA LATA 320ML COCONAUT",
      "AGUA COCO LATA 320ML COCONAUT",
    ]);
    expect(products[0].name).toBe("AGUA COCO LATA 320ML COCONAUT");
  });

  it("sorts products by Código Auchan", () => {
    const products = [
      { id: "1", name: "A", codigo_auchan: "9" },
      { id: "2", name: "B", codigo_auchan: "100" },
      { id: "3", name: "C", codigo_auchan: "10" },
      { id: "4", name: "D", codigo_auchan: "" },
    ];
    const sorted = sortProducts(products, "auchan-desc");

    expect(sorted.map((product) => product.codigo_auchan)).toEqual(["100", "10", "9", ""]);
  });

  it("merges newly imported seed products into an older saved product list", () => {
    const seedProducts = [
      { id: "1", category: "BEBIDAS", name: "AGUA", ean: "111", caixa_default: 6 },
      { id: "2", category: "MERCEARIA", name: "MASSA", ean: "222", caixa_default: 12 },
      { id: "3", category: "DOCES", name: "BOLACHA", ean: "333", caixa_default: 24 },
    ];
    const savedProducts = [
      { id: "1", name: "AGUA", ean: "111", caixa_default: 6 },
      { id: "custom", name: "PRODUTO MANUAL", ean: "999", caixa_default: 1 },
    ];
    const synced = syncProductsWithSeed(savedProducts, seedProducts);

    expect(synced.changed).toBe(true);
    expect(synced.products.map((product) => product.name)).toEqual(["AGUA", "PRODUTO MANUAL", "MASSA", "BOLACHA"]);
    expect(synced.products[0].category).toBe("BEBIDAS");
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
