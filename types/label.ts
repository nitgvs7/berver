import type { Product } from "./product";

export type LabelData = {
  id: string;
  product: Product;
  ordem_compra: string;
  lote: string;
  data_entrega: string;
  validade_texto: string;
  validade_barras: string;
  caixas: number;
  quantidade_etiquetas: number;
  sscc: string;
  auchan_validity_status?: "accepted" | "rejected" | "no-rule" | "missing-dates" | "invalid-dates";
  auchan_days_available?: number | null;
  auchan_days_margin?: number | null;
  auchan_minimum_days?: number | null;
  created_at: string;
};

export type LabelFormValues = {
  product?: Product | null;
  ordem_compra: string;
  lote: string;
  data_entrega: string;
  validade_texto: string;
  validade_barras: string;
  caixas: number | string;
  quantidade_etiquetas: number | string;
};
