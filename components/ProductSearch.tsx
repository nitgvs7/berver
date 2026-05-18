"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { filterProducts, groupProductsByCategory, loadProducts, resetProducts, searchProducts, sortProducts, type ProductSort } from "../lib/products";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";

type ProductSearchProps = {
  onSelect?: (product: Product) => void;
  actionLabel?: string;
  initialQuery?: string;
  showAll?: boolean;
  groupByCategory?: boolean;
  enableSort?: boolean;
  defaultSort?: ProductSort;
  tableView?: boolean;
};

const sortOptions: Array<{ label: string; value: ProductSort }> = [
  { label: "Ordem do ficheiro", value: "file" },
  { label: "Categoria A-Z", value: "category-asc" },
  { label: "Categoria Z-A", value: "category-desc" },
  { label: "Nome A-Z", value: "name-asc" },
  { label: "Nome Z-A", value: "name-desc" },
  { label: "EAN A-Z", value: "ean-asc" },
  { label: "EAN Z-A", value: "ean-desc" },
  { label: "ITF A-Z", value: "itf-asc" },
  { label: "ITF Z-A", value: "itf-desc" },
  { label: "Código Auchan A-Z", value: "auchan-asc" },
  { label: "Código Auchan Z-A", value: "auchan-desc" },
  { label: "Caixa menor", value: "box-asc" },
  { label: "Caixa maior", value: "box-desc" },
];

const allCategories = "TODOS";

type TableSortColumn = "name" | "category" | "ean" | "itf" | "auchan" | "box";

const tableSorts: Record<TableSortColumn, { asc: ProductSort; desc: ProductSort; first: ProductSort }> = {
  name: { asc: "name-asc", desc: "name-desc", first: "name-asc" },
  category: { asc: "category-asc", desc: "category-desc", first: "category-asc" },
  ean: { asc: "ean-asc", desc: "ean-desc", first: "ean-asc" },
  itf: { asc: "itf-asc", desc: "itf-desc", first: "itf-asc" },
  auchan: { asc: "auchan-asc", desc: "auchan-desc", first: "auchan-desc" },
  box: { asc: "box-asc", desc: "box-desc", first: "box-desc" },
};

function sortDirection(sort: ProductSort, column: TableSortColumn): "asc" | "desc" | null {
  if (sort === tableSorts[column].asc) {
    return "asc";
  }

  if (sort === tableSorts[column].desc) {
    return "desc";
  }

  return null;
}

export function ProductSearch({
  onSelect,
  actionLabel,
  initialQuery = "",
  showAll = false,
  groupByCategory = false,
  enableSort = false,
  defaultSort = "file",
  tableView = false,
}: ProductSearchProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<ProductSort>(defaultSort);
  const [category, setCategory] = useState(allCategories);
  const showSortSelect = enableSort && !tableView;

  useEffect(() => {
    setProducts(loadProducts());
  }, []);

  const categoryGroups = useMemo(() => groupProductsByCategory(products), [products]);

  useEffect(() => {
    if (category !== allCategories && !categoryGroups.some((group) => group.category === category)) {
      setCategory(allCategories);
    }
  }, [category, categoryGroups]);

  const results = useMemo(() => {
    const categoryProducts = category === allCategories ? products : products.filter((product) => product.category === category);
    const filteredProducts = showAll ? filterProducts(query, categoryProducts) : searchProducts(query, categoryProducts);
    return enableSort ? sortProducts(filteredProducts, sort) : filteredProducts;
  }, [category, enableSort, products, query, showAll, sort]);
  const groupedResults = useMemo(() => groupProductsByCategory(results), [results]);
  const categoryTabs = useMemo(() => [{ category: allCategories, products }, ...categoryGroups], [categoryGroups, products]);

  function handleResetProducts() {
    setProducts(resetProducts());
    setCategory(allCategories);
  }

  function updateTableSort(column: TableSortColumn) {
    const direction = sortDirection(sort, column);
    setSort(direction === "desc" ? tableSorts[column].asc : direction === "asc" ? tableSorts[column].desc : tableSorts[column].first);
  }

  function renderSortHeader(label: string, column: TableSortColumn, className: string) {
    const direction = sortDirection(sort, column);
    const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";

    return (
      <th className={className} aria-sort={ariaSort}>
        <button type="button" onClick={() => updateTableSort(column)} className="inline-flex min-h-10 w-full items-center gap-2 text-left font-black uppercase text-[#2f4fb3]">
          <span>{label}</span>
          <span aria-hidden="true" className="text-sm text-[#5ab2e8]">
            {direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <section className="space-y-4">
      <div className={`grid gap-3 ${showSortSelect ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}>
        <label className="block">
          <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Procurar Produto</span>
          <div className="flex items-center gap-2 rounded-lg border-2 border-[#5ab2e8] bg-white px-3 focus-within:border-[#1f3679]">
            <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2f4fb3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, categoria, EAN, ITF ou Código Auchan"
              className="min-h-14 w-full bg-transparent text-base font-bold outline-none"
              autoComplete="off"
            />
          </div>
        </label>

        {showSortSelect ? (
          <label className="block">
            <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Ordenar</span>
            <div className="flex items-center gap-2 rounded-lg border-2 border-[#5ab2e8] bg-white px-3 focus-within:border-[#1f3679]">
              <ArrowUpDown aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2f4fb3]" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ProductSort)}
                className="min-h-14 w-full bg-transparent text-base font-bold text-[#1f3679] outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        ) : null}
      </div>

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

      {tableView && products.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {categoryTabs.map((group) => {
            const active = category === group.category;

            return (
              <button
                key={group.category}
                type="button"
                onClick={() => setCategory(group.category)}
                className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-t-md border border-b-0 px-4 text-sm font-black uppercase shadow-sm ${
                  active ? "bg-white text-[#1f3679]" : "border-[#d9e9fb] bg-[#e8f3ff] text-[#2f4fb3]"
                }`}
              >
                {group.category === allCategories ? "Todos" : group.category}
                <span className={`rounded px-2 py-0.5 text-xs ${active ? "bg-[#dceeff]" : "bg-white"}`}>{group.products.length}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {showAll && products.length > 0 ? (
        <p className="text-sm font-black uppercase text-[#2f4fb3]">
          {results.length} de {category === allCategories ? products.length : categoryTabs.find((group) => group.category === category)?.products.length ?? products.length} produtos
        </p>
      ) : null}

      {tableView ? (
        <div className="overflow-hidden rounded-b-lg rounded-tr-lg border border-[#d9e9fb] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm text-[#1f3679]">
              <thead className="bg-[#f7fbff] text-xs font-black uppercase text-[#2f4fb3]">
                <tr className="border-b border-[#d9e9fb]">
                  <th className="w-14 px-4 py-3">#</th>
                  {renderSortHeader("Produto", "name", "min-w-[260px] px-4 py-3")}
                  {renderSortHeader("Categoria", "category", "min-w-[180px] px-4 py-3")}
                  {renderSortHeader("EAN", "ean", "min-w-[130px] px-4 py-3")}
                  {renderSortHeader("ITF", "itf", "min-w-[140px] px-4 py-3")}
                  {renderSortHeader("Código Auchan", "auchan", "min-w-[120px] px-4 py-3")}
                  {renderSortHeader("Caixa", "box", "w-20 px-4 py-3")}
                  <th className="w-40 px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {results.map((product, index) => (
                  <tr key={product.id} className="group border-b border-[#eef4fb] last:border-b-0 hover:bg-[#f7fbff]">
                    <td className="px-4 py-3 font-mono text-[#2f4fb3]">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-[38ch] truncate font-black uppercase text-[#1f3679]" title={product.name}>
                        {product.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold uppercase text-[#2f4fb3]">{product.category ?? "-"}</td>
                    <td className="px-4 py-3 font-mono">{product.ean_cdi || product.ean || "-"}</td>
                    <td className="px-4 py-3 font-mono">{product.itf_cdi || product.itf || "-"}</td>
                    <td className="px-4 py-3 font-mono">{product.codigo_auchan || "-"}</td>
                    <td className="px-4 py-3 font-mono">{product.caixa_default ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {onSelect ? (
                        <button
                          type="button"
                          onClick={() => onSelect(product)}
                          className="inline-flex min-h-10 min-w-32 items-center justify-center whitespace-nowrap rounded-md bg-[#1f3679] px-4 text-sm font-black text-white"
                        >
                          {actionLabel ?? "Criar Etiqueta"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : groupByCategory ? (
        <div className="space-y-6">
          {groupedResults.map((group) => (
            <section key={group.category} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#b9d8f6] pb-2">
                <h2 className="text-xl font-black uppercase leading-tight text-[#1f3679]">{group.category}</h2>
                <span className="rounded-md bg-[#dceeff] px-3 py-1 text-sm font-black text-[#1f3679]">{group.products.length}</span>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={onSelect} actionLabel={actionLabel} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} onSelect={onSelect} actionLabel={actionLabel} showCategory={showAll} />
          ))}
        </div>
      )}
    </section>
  );
}
