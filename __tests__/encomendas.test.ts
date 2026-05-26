import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { generateCleanEncomendaPdf } from "../lib/encomendas/pdf";
import { parseAuchanOrderPdf } from "../lib/encomendas/parser";
import type { ParsedEncomenda } from "../types/encomenda";

type PdfTextItem = {
  str?: unknown;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfJsModule = {
  getDocument: (source: Record<string, unknown>) => { promise: Promise<PdfDocumentProxy> };
};

const samplePdfPath = "/Users/nit/Downloads/Auchan Order.pdf";

async function createAuchanLikePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Nota de Encomenda Nº", { x: 314, y: 739.1, size: 16, font: bold });
  page.drawText("1104003165", { x: 477, y: 739, size: 10, font: regular });
  page.drawText("Data de Entrega:", { x: 314, y: 639.5, size: 10, font: regular });
  page.drawText("28/05/2026", { x: 387, y: 639.5, size: 10, font: regular });
  page.drawText("ITEM", { x: 23.3, y: 592.2, size: 10, font: regular });
  page.drawText("CÓDIGO", { x: 57.6, y: 592.2, size: 10, font: regular });
  page.drawText("DESIGNAÇÃO/ARTIGO", { x: 201.2, y: 592.2, size: 10, font: regular });
  page.drawText("QTD", { x: 418.2, y: 592.2, size: 10, font: regular });
  page.drawText("U.C.", { x: 466.6, y: 592.2, size: 10, font: regular });
  page.drawText("BÓNUS", { x: 508.6, y: 592.2, size: 10, font: regular });
  page.drawText("U.V.", { x: 555.3, y: 592.2, size: 10, font: regular });

  page.drawText("1", { x: 33, y: 579.4, size: 8, font: regular });
  page.drawText("253346", { x: 76, y: 579.4, size: 8, font: regular });
  page.drawText("CARIL DA INDIA JALPUR:EM PO 200 G", { x: 104, y: 579.4, size: 8, font: bold });
  page.drawText("6", { x: 427, y: 579.4, size: 8, font: regular });
  page.drawText("CX/20", { x: 465.3, y: 579.4, size: 8, font: regular });
  page.drawText("UN", { x: 558.7, y: 579.4, size: 8, font: regular });

  page.drawText("2", { x: 33, y: 553.4, size: 8, font: regular });
  page.drawText("503572", { x: 76, y: 553.4, size: 8, font: regular });
  page.drawText("MASSA DE ARROZ WAI WAI:FINO 200 G", { x: 104, y: 553.4, size: 8, font: bold });
  page.drawText("5", { x: 427, y: 553.4, size: 8, font: regular });
  page.drawText("CX/40", { x: 465.3, y: 553.4, size: 8, font: regular });
  page.drawText("UN", { x: 558.7, y: 553.4, size: 8, font: regular });

  return document.save();
}

async function createInvalidPdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("Hello", { x: 50, y: 750, size: 14, font: regular });

  return document.save();
}

async function extractGeneratedText(bytes: Uint8Array): Promise<{ pageCount: number; text: string }> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsModule;
  const document = await pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;
  const texts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    texts.push(content.items.map((item) => (typeof item.str === "string" ? item.str : "")).join(" "));
  }

  return { pageCount: document.numPages, text: texts.join("\n") };
}

describe("Encomendas PDF parser", () => {
  it("extracts order metadata and rows from an Auchan-like PDF", async () => {
    const order = await parseAuchanOrderPdf(await createAuchanLikePdf());

    expect(order.orderNumber).toBe("1104003165");
    expect(order.deliveryDate).toBe("28/05/2026");
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toMatchObject({
      contador: "1",
      codigo: "253346",
      designacao: "CARIL DA INDIA JALPUR:EM PO 200 G",
      qtd: "6",
      uc: "CX/20",
    });
  });

  it("rejects PDFs that do not match the Auchan order table", async () => {
    await expect(parseAuchanOrderPdf(await createInvalidPdf())).rejects.toThrow("formato esperado");
  });

  it("does not expose removed BÓNUS or U.V. columns", async () => {
    const order = await parseAuchanOrderPdf(await createAuchanLikePdf());

    expect(order.items[0]).not.toHaveProperty("bonus");
    expect(order.items[0]).not.toHaveProperty("uv");
  });

  it.skipIf(!existsSync(samplePdfPath))("extracts the provided sample PDF", async () => {
    const order = await parseAuchanOrderPdf(new Uint8Array(await readFile(samplePdfPath)));

    expect(order.orderNumber).toBe("1104003165");
    expect(order.deliveryDate).toBe("28/05/2026");
    expect(order.items.length).toBeGreaterThan(150);
  });
});

describe("Encomendas PDF generation", () => {
  const baseOrder: ParsedEncomenda = {
    orderNumber: "1104003165",
    deliveryDate: "28/05/2026",
    items: [
      {
        contador: "1",
        codigo: "253346",
        designacao: "CARIL DA INDIA JALPUR:EM PO 200 G",
        lote: "L123",
        dataValidade: "30/06/2027",
        qtd: "6",
        qtdEnviada: "6",
        uc: "CX/20",
        pEtiqueta: "2",
        obs: "OK",
      },
    ],
  };

  it("creates a cleaned worker PDF with the requested title and columns", async () => {
    const result = await extractGeneratedText(await generateCleanEncomendaPdf(baseOrder));

    expect(result.text).toContain("Auchan - Sabores do Mundo");
    expect(result.text).toContain("Nota de Encomenda Nº 1104003165");
    expect(result.text).toContain("Data de Entrega: 28/05/2026");
    expect(result.text).toContain("Contador");
    expect(result.text).toContain("Código");
    expect(result.text).toContain("DESIGNAÇÃO/ARTIGO");
    expect(result.text).toContain("QTD enviada");
    expect(result.text).toContain("P/Etq");
    expect(result.text).toContain("Obs");
    expect(result.text).not.toContain("P/ Etiqueta");
    expect(result.text).not.toContain("ATENÇÃO SR. FORNECEDOR");
    expect(result.text).not.toContain("BÓNUS");
    expect(result.text).not.toContain("U.V.");
  });

  it("wraps long product names and repeats table headers across pages", async () => {
    const order: ParsedEncomenda = {
      ...baseOrder,
      items: Array.from({ length: 90 }, (_, index) => ({
        contador: String(index + 1),
        codigo: String(400000 + index),
        designacao: `MOCHIS MINIS ROYAL FAMILY:CHEESECAKE MORANGO 40G PACK MUITO COMPRIDO ${index + 1}`,
        qtd: "28",
        uc: "CX/24",
      })),
    };
    const result = await extractGeneratedText(await generateCleanEncomendaPdf(order));
    const headerCount = (result.text.match(/Contador/g) ?? []).length;

    expect(result.pageCount).toBeGreaterThan(1);
    expect(headerCount).toBe(result.pageCount);
    expect(result.text).toContain("CHEESECAKE MORANGO");
  });
});
