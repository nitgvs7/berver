import type { ParsedEncomenda, ParsedEncomendaItem } from "../../types/encomenda";

type PdfTextToken = {
  page: number;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfTextItem = {
  str?: unknown;
  transform?: unknown;
  width?: unknown;
  height?: unknown;
};

type PdfTextContent = {
  items: PdfTextItem[];
};

type PdfPage = {
  getTextContent: (options?: { includeMarkedContent?: boolean }) => Promise<PdfTextContent>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfJsModule = {
  getDocument: (source: Record<string, unknown>) => { promise: Promise<PdfDocument> };
};

type PdfJsWorkerModule = {
  WorkerMessageHandler: unknown;
};

type PdfJsGlobal = typeof globalThis & {
  pdfjsWorker?: {
    WorkerMessageHandler: unknown;
  };
};

class MinimalDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[]) {
    if (!Array.isArray(init)) {
      return;
    }

    if (init.length >= 16) {
      this.a = Number(init[0]) || 1;
      this.b = Number(init[1]) || 0;
      this.c = Number(init[4]) || 0;
      this.d = Number(init[5]) || 1;
      this.e = Number(init[12]) || 0;
      this.f = Number(init[13]) || 0;
      return;
    }

    if (init.length >= 6) {
      this.a = Number(init[0]) || 1;
      this.b = Number(init[1]) || 0;
      this.c = Number(init[2]) || 0;
      this.d = Number(init[3]) || 1;
      this.e = Number(init[4]) || 0;
      this.f = Number(init[5]) || 0;
    }
  }

  multiplySelf() {
    return this;
  }

  preMultiplySelf() {
    return this;
  }

  translate() {
    return this;
  }

  scale() {
    return this;
  }

  invertSelf() {
    return this;
  }
}

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const NUMBER_PATTERN = /^\d+$/;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isTextItem(item: PdfTextItem): item is PdfTextItem & { str: string; transform: number[] } {
  return typeof item.str === "string" && Array.isArray(item.transform);
}

async function extractPdfTokens(pdfBytes: Uint8Array): Promise<PdfTextToken[][]> {
  const globals = globalThis as unknown as { DOMMatrix?: unknown };
  globals.DOMMatrix ??= MinimalDOMMatrix;
  const [pdfjs, worker] = (await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ])) as unknown as [PdfJsModule, PdfJsWorkerModule];
  (globalThis as PdfJsGlobal).pdfjsWorker = {
    WorkerMessageHandler: worker.WorkerMessageHandler,
  };
  const document = await pdfjs.getDocument({
    data: pdfBytes,
    disableFontFace: true,
    disableWorker: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;

  const pages: PdfTextToken[][] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const tokens = content.items
      .filter(isTextItem)
      .map((item) => ({
        page: pageNumber,
        str: cleanText(item.str),
        x: Number(item.transform[4] ?? 0),
        y: Number(item.transform[5] ?? 0),
        width: Number(item.width ?? 0),
        height: Number(item.height ?? 0),
      }))
      .filter((item) => item.str);

    pages.push(tokens);
  }

  return pages;
}

function findTableHeaderY(tokens: PdfTextToken[]): number | null {
  const itemHeader = tokens.find((token) => token.str === "ITEM");

  if (!itemHeader) {
    return null;
  }

  const sameHeaderLine = (expected: string) => tokens.some((token) => token.str === expected && Math.abs(token.y - itemHeader.y) <= 3);
  const hasExpectedHeaders =
    sameHeaderLine("CÓDIGO") && sameHeaderLine("DESIGNAÇÃO/ARTIGO") && sameHeaderLine("QTD") && sameHeaderLine("U.C.");

  return hasExpectedHeaders ? itemHeader.y : null;
}

function joinColumn(tokens: PdfTextToken[], minX: number, maxX: number): string {
  return cleanText(
    tokens
      .filter((token) => token.x >= minX && token.x < maxX)
      .sort((left, right) => left.x - right.x)
      .map((token) => token.str)
      .join(" "),
  );
}

function extractRowsFromPage(tokens: PdfTextToken[]): ParsedEncomendaItem[] {
  const headerY = findTableHeaderY(tokens);

  if (headerY === null) {
    return [];
  }

  const contadorTokens = tokens
    .filter((token) => token.y < headerY - 5 && token.y > 115 && token.x >= 18 && token.x < 52 && NUMBER_PATTERN.test(token.str))
    .sort((left, right) => right.y - left.y);

  return contadorTokens
    .map((contadorToken) => {
      const rowTokens = tokens.filter((token) => Math.abs(token.y - contadorToken.y) <= 2);
      const item: ParsedEncomendaItem = {
        contador: contadorToken.str,
        codigo: joinColumn(rowTokens, 52, 103),
        designacao: joinColumn(rowTokens, 103, 410),
        qtd: joinColumn(rowTokens, 410, 452),
        uc: joinColumn(rowTokens, 452, 502),
      };

      return item;
    })
    .filter((item) => item.codigo && item.designacao && item.qtd && item.uc);
}

function findOrderNumber(pages: PdfTextToken[][]): string {
  for (const tokens of pages) {
    const label = tokens.find((token) => token.str.includes("Nota de Encomenda"));

    if (!label) {
      continue;
    }

    const candidate = tokens
      .filter((token) => Math.abs(token.y - label.y) <= 6 && token.x > label.x && NUMBER_PATTERN.test(token.str))
      .sort((left, right) => left.x - right.x)[0];

    if (candidate) {
      return candidate.str;
    }
  }

  return "";
}

function findDeliveryDate(pages: PdfTextToken[][]): string {
  for (const tokens of pages) {
    const label = tokens.find((token) => token.str === "Data de Entrega:");

    if (!label) {
      continue;
    }

    const candidate = tokens
      .filter((token) => Math.abs(token.y - label.y) <= 3 && token.x > label.x + label.width - 5 && DATE_PATTERN.test(token.str))
      .sort((left, right) => left.x - right.x)[0];

    if (candidate) {
      return candidate.str;
    }
  }

  return "";
}

export async function parseAuchanOrderPdf(pdfBytes: Uint8Array): Promise<ParsedEncomenda> {
  const pages = await extractPdfTokens(pdfBytes);
  const hasAuchanOrderTable = pages.some((tokens) => findTableHeaderY(tokens) !== null);
  const orderNumber = findOrderNumber(pages);
  const deliveryDate = findDeliveryDate(pages);
  const items = pages.flatMap(extractRowsFromPage);

  if (!hasAuchanOrderTable || !orderNumber || !deliveryDate || items.length === 0) {
    throw new Error("O PDF não parece ser uma Nota de Encomenda Auchan no formato esperado.");
  }

  return {
    orderNumber,
    deliveryDate,
    items,
  };
}
