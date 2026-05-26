import type { ParsedEncomenda, ParsedEncomendaItem } from "../../types/encomenda";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanNumeric(value: unknown, maxLength: number): string {
  return cleanText(value, maxLength).replace(/\D/g, "").slice(0, maxLength);
}

function cleanItem(value: unknown): ParsedEncomendaItem {
  const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    contador: cleanNumeric(item.contador, 8),
    codigo: cleanNumeric(item.codigo, 16),
    designacao: cleanText(item.designacao, 220),
    qtd: cleanNumeric(item.qtd, 8),
    uc: cleanText(item.uc, 16),
    lote: cleanText(item.lote, 32),
    dataValidade: cleanText(item.dataValidade, 24),
    qtdEnviada: cleanNumeric(item.qtdEnviada, 8),
    pEtiqueta: cleanNumeric(item.pEtiqueta, 8),
    obs: cleanText(item.obs, 80),
  };
}

export function normalizeParsedEncomenda(value: unknown): ParsedEncomenda {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(candidate.items) ? candidate.items.map(cleanItem) : [];
  const normalized: ParsedEncomenda = {
    id: cleanText(candidate.id, 80) || undefined,
    orderNumber: cleanNumeric(candidate.orderNumber, 24),
    deliveryDate: cleanText(candidate.deliveryDate, 24),
    items: items.filter((item) => item.contador && item.codigo && item.designacao && item.qtd && item.uc),
  };

  if (!normalized.orderNumber || !normalized.deliveryDate || normalized.items.length === 0) {
    throw new Error("Dados da encomenda incompletos.");
  }

  return normalized;
}

export function createGeneratedFilename(order: ParsedEncomenda): string {
  const safeOrderNumber = order.orderNumber.replace(/\D/g, "") || "encomenda";
  const safeDate = order.deliveryDate.replace(/\D/g, "-").replace(/^-|-$/g, "");

  return `auchan-sabores-do-mundo-${safeOrderNumber}${safeDate ? `-${safeDate}` : ""}.pdf`;
}
