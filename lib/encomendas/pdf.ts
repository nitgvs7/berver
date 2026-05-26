import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { ParsedEncomenda, ParsedEncomendaItem } from "../../types/encomenda";

type ColumnKey = keyof Pick<
  ParsedEncomendaItem,
  "contador" | "codigo" | "designacao" | "uc" | "qtd" | "pEtiqueta" | "qtdEnviada" | "lote" | "dataValidade" | "obs"
>;

type Column = {
  key: ColumnKey;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
  manual?: boolean;
};

type FontSet = {
  regular: PDFFont;
  bold: PDFFont;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 18;
const TOP_MARGIN = 18;
const BOTTOM_MARGIN = 24;
const TABLE_HEADER_HEIGHT = 24;
const ROW_TOP_PADDING = 4.5;
const ROW_BOTTOM_WRITING_SPACE = 9;
const ROW_LINE_HEIGHT = 8.8;
const MANUAL_EMPTY_ROWS = 10;
const BRAND_NAVY = rgb(0.12, 0.21, 0.47);
const BRAND_COBALT = rgb(0.18, 0.31, 0.7);
const BRAND_LINE = rgb(0.73, 0.85, 0.96);
const BRAND_SOFT = rgb(0.93, 0.97, 1);
const TEXT_INK = rgb(0.08, 0.14, 0.31);
const WHITE = rgb(1, 1, 1);

const COLUMNS: Column[] = [
  { key: "contador", label: "Contador", width: 36, align: "center", manual: true },
  { key: "codigo", label: "Código", width: 48, align: "center" },
  { key: "designacao", label: "DESIGNAÇÃO/ARTIGO", width: 180 },
  { key: "uc", label: "U.C.", width: 34, align: "center" },
  { key: "qtd", label: "QTD", width: 28, align: "center" },
  { key: "pEtiqueta", label: "P/Etq", width: 32, align: "center", manual: true },
  { key: "qtdEnviada", label: "QTD enviada", width: 38, align: "center", manual: true },
  { key: "lote", label: "Lote", width: 44, manual: true },
  { key: "dataValidade", label: "Data de Validade", width: 62, manual: true },
  { key: "obs", label: "Obs", width: 57, manual: true },
];

const EMPTY_MANUAL_ITEM: ParsedEncomendaItem = {
  contador: "",
  codigo: "",
  designacao: "",
  qtd: "",
  uc: "",
};

function pdfText(value: string | number | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[^\u0020-\u00ff]/g, "")
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const source = pdfText(text);

  if (!source) {
    return [""];
  }

  const lines: string[] = [];
  const words = source.split(" ");
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      currentLine = word;
      continue;
    }

    let chunk = "";

    for (const char of word) {
      const nextChunk = `${chunk}${char}`;

      if (font.widthOfTextAtSize(nextChunk, size) <= maxWidth) {
        chunk = nextChunk;
      } else {
        lines.push(chunk);
        chunk = char;
      }
    }

    currentLine = chunk;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function drawRectangle(page: PDFPage, x: number, topY: number, width: number, height: number, color: RGB, borderColor: RGB = BRAND_LINE) {
  page.drawRectangle({
    x,
    y: topY - height,
    width,
    height,
    color,
    borderColor,
    borderWidth: 0.7,
  });
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  topY: number,
  width: number,
  size: number,
  font: PDFFont,
  color: RGB,
  align: "left" | "center" | "right" = "left",
) {
  const lines = wrapText(text, font, size, width);
  const lineHeight = size + 1.6;
  let y = topY - size;

  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, size);
    const textX = align === "right" ? x + width - lineWidth : align === "center" ? x + (width - lineWidth) / 2 : x;
    page.drawText(line, { x: textX, y, size, font, color });
    y -= lineHeight;
  }
}

function drawDocumentHeader(page: PDFPage, order: ParsedEncomenda, fonts: FontSet, pageNumber: number) {
  const titleTop = PAGE_HEIGHT - TOP_MARGIN;

  page.drawText("Auchan - Sabores do Mundo", {
    x: MARGIN_X,
    y: titleTop - 16,
    size: 17,
    font: fonts.bold,
    color: BRAND_NAVY,
  });

  page.drawText(`Página ${pageNumber}`, {
    x: PAGE_WIDTH - MARGIN_X - 46,
    y: titleTop - 12,
    size: 8,
    font: fonts.bold,
    color: BRAND_COBALT,
  });

  const metaTop = PAGE_HEIGHT - 48;
  const metaHeight = 24;
  drawRectangle(page, MARGIN_X, metaTop, 270, metaHeight, BRAND_SOFT);
  drawRectangle(page, MARGIN_X + 284, metaTop, 258, metaHeight, BRAND_SOFT);
  drawWrappedText(page, `Nota de Encomenda Nº ${order.orderNumber}`, MARGIN_X + 8, metaTop - 7, 250, 10, fonts.bold, TEXT_INK);
  drawWrappedText(page, `Data de Entrega: ${order.deliveryDate}`, MARGIN_X + 292, metaTop - 7, 238, 10, fonts.bold, TEXT_INK);
}

function drawTableHeader(page: PDFPage, fonts: FontSet, topY: number): number {
  let x = MARGIN_X;

  for (const column of COLUMNS) {
    drawRectangle(page, x, topY, column.width, TABLE_HEADER_HEIGHT, BRAND_NAVY, BRAND_NAVY);
    drawWrappedText(page, column.label, x + 2, topY - 6, column.width - 4, 6.5, fonts.bold, WHITE, "center");
    x += column.width;
  }

  return topY - TABLE_HEADER_HEIGHT;
}

function drawRow(page: PDFPage, item: ParsedEncomendaItem, fonts: FontSet, topY: number, height: number) {
  let x = MARGIN_X;

  for (const column of COLUMNS) {
    const value = column.key === "contador" ? "" : pdfText(item[column.key]);
    const fill = column.manual ? rgb(0.98, 1, 1) : WHITE;
    const font = column.key === "designacao" ? fonts.bold : fonts.regular;
    const size = column.key === "designacao" ? 6.5 : 7;

    drawRectangle(page, x, topY, column.width, height, fill);
    drawWrappedText(page, value, x + 2.4, topY - ROW_TOP_PADDING, column.width - 4.8, size, font, TEXT_INK, column.align);
    x += column.width;
  }
}

function rowHeight(item: ParsedEncomendaItem, fonts: FontSet): number {
  const designacaoLines = wrapText(item.designacao, fonts.bold, 6.5, 175).length;
  const loteLines = wrapText(item.lote ?? "", fonts.regular, 7, 39).length;
  const validityLines = wrapText(item.dataValidade ?? "", fonts.regular, 7, 57).length;
  const obsLines = wrapText(item.obs ?? "", fonts.regular, 7, 52).length;
  const lineCount = Math.max(designacaoLines, loteLines, validityLines, obsLines, 1);

  return Math.max(28, lineCount * ROW_LINE_HEIGHT + ROW_TOP_PADDING + ROW_BOTTOM_WRITING_SPACE);
}

export async function generateCleanEncomendaPdf(order: ParsedEncomenda): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const fonts: FontSet = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
  };

  let page: PDFPage | null = null;
  let y = 0;
  let pageNumber = 0;

  function addPage() {
    pageNumber += 1;
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
    drawDocumentHeader(page, order, fonts, pageNumber);
    y = drawTableHeader(page, fonts, PAGE_HEIGHT - 84);
  }

  addPage();

  const printableItems = [...order.items, ...Array.from({ length: MANUAL_EMPTY_ROWS }, () => EMPTY_MANUAL_ITEM)];

  for (const item of printableItems) {
    const height = rowHeight(item, fonts);

    if (!page || y - height < BOTTOM_MARGIN) {
      addPage();
    }

    if (!page) {
      throw new Error("Could not create PDF page.");
    }

    drawRow(page, item, fonts, y, height);
    y -= height;
  }

  return document.save();
}
