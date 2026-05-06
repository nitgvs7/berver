import type { Product } from "./product";

export type LabelData = {
  id: string;
  product: Product;
  ordem_compra: string;
  lote: string;
  validade_texto: string;
  validade_barras: string;
  caixas: number;
  quantidade_etiquetas: number;
  sscc: string;
  created_at: string;
};

export type LabelFormValues = {
  product?: Product | null;
  ordem_compra: string;
  lote: string;
  validade_texto: string;
  validade_barras: string;
  caixas: number | string;
  quantidade_etiquetas: number | string;
};
