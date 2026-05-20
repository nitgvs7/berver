"use client";

import { PackageCheck } from "lucide-react";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
  onSelect?: (product: Product) => void;
  actionLabel?: string;
  showCategory?: boolean;
};

export function ProductCard({ product, onSelect, actionLabel = "Criar Etiqueta", showCategory = false }: ProductCardProps) {
  return (
    <article className="rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#1f3679] text-white">
          <PackageCheck aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          {showCategory && product.category ? <p className="mb-1 text-xs font-black uppercase text-[#2f4fb3]">{product.category}</p> : null}
          <h3 className="text-lg font-black uppercase leading-snug text-[#1f3679]">{product.name}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#1f3679]">
            <div>
              <dt className="font-bold">EAN</dt>
              <dd className="break-all font-mono">{product.ean_cdi || product.ean || "-"}</dd>
            </div>
            <div>
              <dt className="font-bold">ITF</dt>
              <dd className="break-all font-mono">{product.itf_cdi || product.itf || "-"}</dd>
            </div>
            <div>
              <dt className="font-bold">Código Auchan</dt>
              <dd className="font-mono">{product.codigo_auchan || "-"}</dd>
            </div>
            <div>
              <dt className="font-bold">Caixa</dt>
              <dd className="font-mono">{product.caixa_default ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-bold">Validade mínima</dt>
              <dd className="font-mono">{product.validade_minima_dias ? `${product.validade_minima_dias} dias` : "-"}</dd>
            </div>
          </dl>
        </div>
      </div>
      {onSelect ? (
        <button type="button" onClick={() => onSelect(product)} className="mt-4 min-h-12 w-full rounded-md bg-[#1f3679] px-4 py-3 text-base font-black text-white">
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
