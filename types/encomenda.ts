export type ParsedEncomendaItem = {
  contador: string;
  codigo: string;
  designacao: string;
  qtd: string;
  uc: string;
  lote?: string;
  dataValidade?: string;
  qtdEnviada?: string;
  pEtiqueta?: string;
  obs?: string;
};

export type ParsedEncomenda = {
  id?: string;
  orderNumber: string;
  deliveryDate: string;
  items: ParsedEncomendaItem[];
};

export type EncomendaHistoryItem = {
  id: string;
  orderNumber: string;
  deliveryDate: string;
  itemCount: number;
  generatedFilename: string;
  createdAt: string;
};
