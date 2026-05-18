"use client";

import { useRouter } from "next/navigation";
import { ProductSearch } from "../../components/ProductSearch";
import { setSelectedProduct } from "../../lib/label-storage";
import type { Product } from "../../types/product";

export default function ProductsPage() {
  const router = useRouter();

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    router.push(`/label/new?productId=${encodeURIComponent(product.id)}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-[#1f3679]">Produtos</h1>
      <ProductSearch onSelect={selectProduct} actionLabel="Criar Etiqueta" showAll enableSort tableView />
    </div>
  );
}
