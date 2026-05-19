import type { Product } from "../types/product";
import { differenceInCalendarDays, isValidPtDate } from "./date";

export type AuchanValidityStatus =
  | {
      status: "missing-dates";
      message: string;
    }
  | {
      status: "invalid-dates";
      message: string;
    }
  | {
      status: "no-rule";
      message: string;
    }
  | {
      status: "accepted";
      daysAvailable: number;
      daysMargin: number;
      minimumDays: number;
      message: string;
    }
  | {
      status: "rejected";
      daysAvailable: number;
      daysMissing: number;
      minimumDays: number;
      message: string;
    };

export function calculateAuchanValidity(product: Product | null | undefined, dataEntrega: string, dataValidade: string): AuchanValidityStatus {
  const minimumDays = Number(product?.validade_minima_dias);

  if (!Number.isFinite(minimumDays) || minimumDays <= 0) {
    return {
      status: "no-rule",
      message: "Sem regra de validade mínima definida. Pode imprimir, mas confirme a regra da Auchan se necessário.",
    };
  }

  if (!dataEntrega.trim() || !dataValidade.trim()) {
    return {
      status: "missing-dates",
      message: `Indique a data de entrega e a data de validade para verificar o mínimo de ${minimumDays} dias.`,
    };
  }

  if (!isValidPtDate(dataEntrega) || !isValidPtDate(dataValidade)) {
    return {
      status: "invalid-dates",
      message: "Use datas válidas no formato DD-MM-YYYY para verificar a validade Auchan.",
    };
  }

  const daysAvailable = differenceInCalendarDays(dataValidade, dataEntrega);

  if (daysAvailable === null) {
    return {
      status: "invalid-dates",
      message: "Use datas válidas no formato DD-MM-YYYY para verificar a validade Auchan.",
    };
  }

  if (daysAvailable >= minimumDays) {
    const daysMargin = daysAvailable - minimumDays;

    return {
      status: "accepted",
      daysAvailable,
      daysMargin,
      minimumDays,
      message: `Aceite pela Auchan. Tem ${daysAvailable} dias desde a entrega; margem de ${daysMargin} dias acima do mínimo de ${minimumDays}.`,
    };
  }

  const daysMissing = minimumDays - daysAvailable;

  return {
    status: "rejected",
    daysAvailable,
    daysMissing,
    minimumDays,
    message: `Não aceite pela Auchan. Tem ${daysAvailable} dias desde a entrega; faltam ${daysMissing} dias para o mínimo de ${minimumDays}.`,
  };
}
