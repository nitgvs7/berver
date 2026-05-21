import { describe, expect, it } from "vitest";
import { dateToYYMMDD } from "../lib/date";
import { getProductGtin } from "../lib/barcode";
import { calculateAuchanValidity } from "../lib/auchan-validity";
import { findProductByCode, getSeedProducts, groupProductsByCategory, searchProducts, sortProducts, syncProductsWithSeed } from "../lib/products";
import { calculateGS1CheckDigit, formatHumanSSCC, generateSSCC, generateSSCCFromCounter } from "../lib/sscc";
import { validateLabelForm } from "../lib/validation";

describe("GS1 and SSCC utilities", () => {
  it("calculates a GS1 modulo 10 check digit", () => {
    expect(calculateGS1CheckDigit("400638133393")).toBe("1");
  });

  it("generates an 18 digit SSCC with the default config", () => {
    expect(generateSSCC(500000)).toBe("356039360005000000");
    expect(formatHumanSSCC("356039360005000000")).toBe("3 5603936 000500000 0");
  });

  it("generates SSCC from the 4 digit label counter", () => {
    expect(generateSSCCFromCounter("0003")).toBe("356039360050000031");
    expect(formatHumanSSCC("356039360050000031")).toBe("3 5603936 005000003 1");
    expect(generateSSCCFromCounter("0188")).toBe("356039360050001885");
    expect(formatHumanSSCC("356039360050001885")).toBe("3 5603936 005000188 5");
    expect(generateSSCCFromCounter("0456")).toBe("356039360050004565");
    expect(formatHumanSSCC("356039360050004565")).toBe("3 5603936 005000456 5");
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
      { id: "1", category: "BEBIDAS", name: "AGUA", ean: "111", caixa_default: 6, validade_minima_dias: 80 },
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
    expect(synced.products[0].validade_minima_dias).toBe(80);
  });

  it("returns no products only when an explicitly provided product list is empty", () => {
    expect(searchProducts("", [])).toEqual([]);
  });
});

describe("Auchan validity utilities", () => {
  it("shows whether a product meets the minimum days from delivery", () => {
    const product = { id: "1", name: "Produto", validade_minima_dias: 90 };

    expect(calculateAuchanValidity(product, "19-05-2026", "20-08-2026")).toMatchObject({
      status: "accepted",
      daysAvailable: 93,
      daysMargin: 3,
      minimumDays: 90,
    });
    expect(calculateAuchanValidity(product, "19-05-2026", "01-08-2026")).toMatchObject({
      status: "rejected",
      daysAvailable: 74,
      daysMissing: 16,
      minimumDays: 90,
    });
  });

  it("allows printing when no minimum validity rule exists", () => {
    expect(calculateAuchanValidity({ id: "1", name: "Produto" }, "19-05-2026", "01-08-2026")).toMatchObject({
      status: "no-rule",
    });
  });
});

describe("label validation", () => {
  it("returns Portuguese validation messages for missing values", () => {
    const errors = validateLabelForm({
      product: null,
      ordem_compra: "",
      lote: "",
      data_entrega: "",
      validade_texto: "31-02-2027",
      validade_barras: "27063",
      contador: "12",
      caixas: 0,
      quantidade_etiquetas: "",
    });

    expect(errors.product).toBe("Selecione um produto.");
    expect(errors.data_entrega).toBe("Indique a data de entrega.");
    expect(errors.validade_texto).toBe("Use uma data válida no formato DD-MM-YYYY.");
    expect(errors.validade_barras).toBe("A validade de barras deve ter 6 dígitos YYMMDD.");
    expect(errors.contador).toBe("O contador deve ter 4 dígitos.");
    expect(errors.caixas).toBe("A caixa deve ser maior que zero.");
  });
});
