import type { LabelFormValues } from "../types/label";
import { dateToYYMMDD, isValidPtDate } from "./date";

export type LabelValidationErrors = Partial<Record<keyof LabelFormValues, string>>;

function isPositiveInteger(value: number | string): boolean {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

function isNumericText(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function validateLabelForm(values: LabelFormValues): LabelValidationErrors {
  const errors: LabelValidationErrors = {};

  if (!values.product) {
    errors.product = "Selecione um produto.";
  }

  if (!values.ordem_compra.trim()) {
    errors.ordem_compra = "Indique a ordem de compra.";
  } else if (!isNumericText(values.ordem_compra)) {
    errors.ordem_compra = "A ordem de compra deve conter apenas números.";
  }

  if (!values.lote.trim()) {
    errors.lote = "Indique o lote.";
  }

  if (!values.data_entrega.trim()) {
    errors.data_entrega = "Indique a data de entrega.";
  } else if (!isValidPtDate(values.data_entrega)) {
    errors.data_entrega = "Use uma data válida no formato DD-MM-YYYY.";
  }

  if (!values.validade_texto.trim()) {
    errors.validade_texto = "Indique a data de validade.";
  } else if (!isValidPtDate(values.validade_texto)) {
    errors.validade_texto = "Use uma data válida no formato DD-MM-YYYY.";
  }

  if (!values.validade_barras.trim()) {
    errors.validade_barras = "Indique a validade para código de barras.";
  } else if (!/^\d{6}$/.test(values.validade_barras.trim())) {
    errors.validade_barras = "A validade de barras deve ter 6 dígitos YYMMDD.";
  }

  const expectedBarcodeDate = dateToYYMMDD(values.validade_texto);

  if (expectedBarcodeDate && !values.validade_barras.trim()) {
    errors.validade_barras = `Use ${expectedBarcodeDate}.`;
  }

  if (!values.contador.trim()) {
    errors.contador = "Indique o contador.";
  } else if (!/^\d{4}$/.test(values.contador.trim())) {
    errors.contador = "O contador deve ter 4 dígitos.";
  }

  if (!isPositiveInteger(values.caixas)) {
    errors.caixas = "A caixa deve ser maior que zero.";
  }

  if (!isPositiveInteger(values.quantidade_etiquetas)) {
    errors.quantidade_etiquetas = "A quantidade de etiquetas deve ser maior que zero.";
  }

  return errors;
}
