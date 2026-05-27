"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ListFilter, Search } from "lucide-react";
import { filterProducts, groupProductsByCategory, loadProductsForApp, searchProducts, sortProducts, type ProductSort } from "../lib/products";
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
  { label: "Unidades menor", value: "box-asc" },
  { label: "Unidades maior", value: "box-desc" },
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

function toSentenceCase(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("pt-PT");

  if (!normalized) {
    return value;
  }

  return normalized.charAt(0).toLocaleUpperCase("pt-PT") + normalized.slice(1);
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
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<ProductSort>(defaultSort);
  const [category, setCategory] = useState(allCategories);
  const showSortSelect = enableSort;
  const controlsGridClassName = enableSort && !tableView ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : "";

  useEffect(() => {
    let cancelled = false;

    async function loadInitialProducts() {
      try {
        const nextProducts = await loadProductsForApp();

        if (!cancelled) {
          setProducts(nextProducts);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setLoadError("Não foi possível carregar a base de produtos partilhada.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    loadInitialProducts();

    return () => {
      cancelled = true;
    };
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

  function updateTableSort(column: TableSortColumn) {
    const direction = sortDirection(sort, column);
    setSort(direction === "desc" ? tableSorts[column].asc : direction === "asc" ? tableSorts[column].desc : tableSorts[column].first);
  }

  function renderSortHeader(label: string, column: TableSortColumn, className: string) {
    const direction = sortDirection(sort, column);
    const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";

    return (
      <th className={className} aria-sort={ariaSort} scope="col">
        <button
          type="button"
          onClick={() => updateTableSort(column)}
          className="inline-flex min-h-10 w-full min-w-0 items-center gap-1.5 text-left font-black uppercase leading-tight text-[#2f4fb3]"
        >
          <span className="min-w-0">{label}</span>
          <span aria-hidden="true" className="text-sm text-[#5ab2e8]">
            {direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <section className="space-y-4">
      <div className={`grid gap-3 ${controlsGridClassName}`}>
        <label className="block">
          <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Procurar Produto</span>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border-2 border-[#5ab2e8] bg-white px-3 focus-within:border-[#1f3679]">
            <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2f4fb3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, categoria, EAN, ITF ou Código Auchan"
              className="min-h-14 min-w-0 w-full bg-transparent text-base font-bold outline-none"
              autoComplete="off"
            />
          </div>
        </label>

        {showSortSelect ? (
          <label className={`block ${tableView ? "lg:hidden" : ""}`}>
            <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Ordenar</span>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border-2 border-[#5ab2e8] bg-white px-3 focus-within:border-[#1f3679]">
              <ArrowUpDown aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2f4fb3]" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ProductSort)}
                className="min-h-14 min-w-0 w-full bg-transparent text-base font-bold text-[#1f3679] outline-none"
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

      {loadingProducts ? <div className="rounded-lg border border-[#b9d8f6] bg-white p-4 font-bold text-[#1f3679]">A carregar produtos...</div> : null}

      {!loadingProducts && loadError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 font-bold text-red-900">{loadError}</div>
      ) : null}

      {!loadingProducts && !loadError && products.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">Base de produtos vazia.</div>
      ) : null}

      {!loadError && query && results.length === 0 ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 font-bold text-red-900">Produto não encontrado.</div>
      ) : null}

      {tableView && products.length > 0 ? (
        <>
          <label className="block lg:hidden">
            <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Categoria</span>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border-2 border-[#5ab2e8] bg-white px-3 focus-within:border-[#1f3679]">
              <ListFilter aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2f4fb3]" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-14 min-w-0 w-full bg-transparent text-base font-bold text-[#1f3679] outline-none"
              >
                {categoryTabs.map((group) => (
                  <option key={group.category} value={group.category}>
                    {group.category === allCategories ? "Todos" : toSentenceCase(group.category)} ({group.products.length})
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="hidden flex-wrap gap-1.5 lg:flex">
            {categoryTabs.map((group) => {
              const active = category === group.category;

              return (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => setCategory(group.category)}
                  className={`inline-flex min-h-8 min-w-0 max-w-full items-center gap-1 rounded-md border px-2 text-xs font-black leading-none shadow-sm ${
                    active ? "bg-white text-[#1f3679]" : "border-[#d9e9fb] bg-[#e8f3ff] text-[#2f4fb3]"
                  }`}
                >
                  <span className="min-w-0 truncate">{group.category === allCategories ? "Todos" : toSentenceCase(group.category)}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${active ? "bg-[#dceeff]" : "bg-white"}`}>{group.products.length}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {showAll && products.length > 0 ? (
        <p className="text-sm font-black uppercase text-[#2f4fb3]">
          {results.length} de {category === allCategories ? products.length : categoryTabs.find((group) => group.category === category)?.products.length ?? products.length} produtos
        </p>
      ) : null}

      {!loadingProducts && tableView && results.length > 0 ? (
        <div>
          <div className="grid gap-3 lg:hidden">
            {results.map((product, index) => (
              <article key={product.id} className="min-w-0 rounded-lg border border-[#b9d8f6] bg-white p-3 shadow-sm">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#dceeff] font-mono text-xs font-black text-[#1f3679]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[11px] font-black uppercase text-[#2f4fb3]">{product.category ?? "Sem categoria"}</p>
                    <h3 className="mt-1 break-words text-base font-black uppercase leading-snug text-[#1f3679]">{product.name}</h3>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#1f3679]">
                  <div className="min-w-0 rounded-md bg-[#eef6ff] p-2">
                    <dt className="font-black uppercase text-[#2f4fb3]">Código</dt>
                    <dd className="mt-1 truncate font-mono">{product.codigo_auchan || "-"}</dd>
                  </div>
                  <div className="min-w-0 rounded-md bg-[#eef6ff] p-2">
                    <dt className="font-black uppercase text-[#2f4fb3]">Caixa</dt>
                    <dd className="mt-1 truncate font-mono">{product.caixa_default ?? "-"}</dd>
                  </div>
                  <div className="min-w-0 rounded-md bg-[#eef6ff] p-2">
                    <dt className="font-black uppercase text-[#2f4fb3]">Validade</dt>
                    <dd className="mt-1 truncate font-mono">{product.validade_minima_dias ? `${product.validade_minima_dias}d` : "-"}</dd>
                  </div>
                </dl>

                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(product)}
                    className="mt-3 flex min-h-11 w-full items-center justify-center rounded-md bg-[#1f3679] px-3 text-sm font-black text-white"
                  >
                    {actionLabel ?? "Criar Etiqueta"}
                  </button>
                ) : null}
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-b-lg rounded-tr-lg border border-[#d9e9fb] bg-white shadow-sm lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm text-[#1f3679]">
              <colgroup>
                <col className="w-12" />
                <col className="w-[34%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="bg-[#f7fbff] text-xs font-black uppercase text-[#2f4fb3]">
                <tr className="border-b border-[#d9e9fb]">
                  <th className="px-3 py-3" scope="col">#</th>
                  {renderSortHeader("Produto", "name", "px-3 py-3")}
                  {renderSortHeader("Categoria", "category", "px-3 py-3")}
                  {renderSortHeader("Código Auchan", "auchan", "px-3 py-3")}
                  {renderSortHeader("Caixa", "box", "px-3 py-3")}
                  <th className="px-3 py-3" scope="col">Validade</th>
                  <th className="px-3 py-3 text-right" scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {results.map((product, index) => (
                  <tr key={product.id} className="group border-b border-[#eef4fb] last:border-b-0 hover:bg-[#f7fbff]">
                    <td className="px-3 py-3 font-mono text-[#2f4fb3]">{index + 1}</td>
                    <td className="min-w-0 px-3 py-3">
                      <p className="truncate font-black uppercase text-[#1f3679]" title={product.name}>
                        {product.name}
                      </p>
                    </td>
                    <td className="min-w-0 px-3 py-3">
                      <p className="truncate font-bold uppercase text-[#2f4fb3]" title={product.category ?? "-"}>
                        {product.category ?? "-"}
                      </p>
                    </td>
                    <td className="min-w-0 px-3 py-3">
                      <span className="block truncate font-mono">{product.codigo_auchan || "-"}</span>
                    </td>
                    <td className="px-3 py-3 font-mono">{product.caixa_default ?? "-"}</td>
                    <td className="px-3 py-3 font-mono">{product.validade_minima_dias ? `${product.validade_minima_dias}d` : "-"}</td>
                    <td className="px-3 py-3 text-right">
                      {onSelect ? (
                        <button
                          type="button"
                          onClick={() => onSelect(product)}
                          className="inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-md bg-[#1f3679] px-2 text-xs font-black text-white"
                        >
                          <span className="truncate">{actionLabel ?? "Criar Etiqueta"}</span>
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loadingProducts && groupByCategory ? (
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
      ) : !loadingProducts ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} onSelect={onSelect} actionLabel={actionLabel} showCategory={showAll} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
