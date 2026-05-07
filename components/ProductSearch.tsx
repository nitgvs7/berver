"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { loadProducts, resetProducts, searchProducts } from "../lib/products";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";

type ProductSearchProps = {
  onSelect?: (product: Product) => void;
  actionLabel?: string;
  initialQuery?: string;
};

export function ProductSearch({ onSelect, actionLabel, initialQuery = "" }: ProductSearchProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setProducts(loadProducts());
  }, []);

  const results = useMemo(() => searchProducts(query, products), [products, query]);

  function handleResetProducts() {
    setProducts(resetProducts());
  }

  return (
    <section className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Procurar Produto</span>
        <div className="flex items-center gap-2 rounded-lg border-2 border-[#5ab2e8] bg-white px-3 focus-within:border-[#1f3679]">
          <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2f4fb3]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, EAN, ITF ou Código Auchan"
            className="min-h-14 w-full bg-transparent text-base font-bold outline-none"
            autoComplete="off"
          />
        </div>
      </label>

      {products.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">
          <p>Base de produtos vazia.</p>
          <button type="button" onClick={handleResetProducts} className="mt-3 min-h-12 w-full rounded-md bg-[#1f3679] px-4 py-3 font-black text-white">
            Repor produtos
          </button>
        </div>
      ) : null}

      {query && results.length === 0 ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 font-bold text-red-900">Produto não encontrado.</div>
      ) : null}

      <div className="grid gap-3">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelect} actionLabel={actionLabel} />
        ))}
      </div>
    </section>
  );
}
