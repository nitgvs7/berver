"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { deleteProductFromSource, loadProductsForApp, replaceProductsInSource, resetProducts, saveProductToSource, searchProducts } from "../../../lib/products";
import type { Product } from "../../../types/product";

const emptyProduct: Product = {
  id: "",
  category: "",
  name: "",
  ean: "",
  ean_cdi: "",
  itf: "",
  itf_cdi: "",
  codigo_auchan: "",
  caixa_default: 1,
  validade_minima_dias: null,
};

function createProductId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AdminProductsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product>(emptyProduct);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialProducts() {
      try {
        const nextProducts = await loadProductsForApp();

        if (!cancelled) {
          setProducts(nextProducts);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar produtos.");
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

  const results = useMemo(() => searchProducts(query, products), [products, query]);
  const isEditingExisting = Boolean(editing.id && products.some((product) => product.id === editing.id));

  async function persist(nextProducts: Product[], nextMessage: string, writeSource: () => Promise<void>) {
    setSaving(true);
    setError(null);

    try {
      await writeSource();
      setProducts(nextProducts);
      setMessage(nextMessage);
    } catch {
      setError("Não foi possível guardar no Supabase. Verifique a ligação e permissões.");
    } finally {
      setSaving(false);
    }
  }

  function updateEditing(field: keyof Product, value: string) {
    setEditing((current) => ({
      ...current,
      [field]: field === "caixa_default" || field === "validade_minima_dias" ? Number(value.replace(/\D/g, "") || 0) : value,
    }));
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing.name.trim()) {
      setError("Indique o nome do produto.");
      return;
    }

    const product: Product = {
      ...editing,
      id: editing.id || createProductId(),
      category: editing.category?.trim().toUpperCase(),
      name: editing.name.trim().toUpperCase(),
      ean: editing.ean?.trim(),
      ean_cdi: editing.ean_cdi?.trim(),
      itf: editing.itf?.trim(),
      itf_cdi: editing.itf_cdi?.trim(),
      codigo_auchan: editing.codigo_auchan?.trim(),
      caixa_default: Number(editing.caixa_default) > 0 ? Number(editing.caixa_default) : 1,
      validade_minima_dias: Number(editing.validade_minima_dias) > 0 ? Number(editing.validade_minima_dias) : null,
    };

    const nextProducts = isEditingExisting ? products.map((item) => (item.id === product.id ? product : item)) : [product, ...products];
    await persist(nextProducts, isEditingExisting ? "Produto atualizado." : "Produto adicionado.", () => saveProductToSource(product));
    setEditing(emptyProduct);
  }

  async function deleteProduct(product: Product) {
    const nextProducts = products.filter((item) => item.id !== product.id);
    await persist(nextProducts, "Produto removido.", () => deleteProductFromSource(product.id));

    if (editing.id === product.id) {
      setEditing(emptyProduct);
    }
  }

  function exportProducts() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "products.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importProducts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error("invalid");
      }

      const imported = parsed.map((item, index) => {
        const candidate = item as Product;

        if (!candidate.name) {
          throw new Error(`Produto inválido na linha ${index + 1}.`);
        }

        return {
          ...candidate,
          id: candidate.id || createProductId(),
          category: candidate.category?.trim().toUpperCase(),
          name: String(candidate.name).trim().toUpperCase(),
          caixa_default: Number(candidate.caixa_default) > 0 ? Number(candidate.caixa_default) : 1,
          validade_minima_dias: Number(candidate.validade_minima_dias) > 0 ? Number(candidate.validade_minima_dias) : null,
        };
      });

      await persist(imported, "Produtos importados.", () => replaceProductsInSource(imported));
      setEditing(emptyProduct);
    } catch {
      setError("Não foi possível importar o JSON de produtos.");
    } finally {
      event.target.value = "";
    }
  }

  async function resetToSeed() {
    const nextProducts = resetProducts();
    await persist(nextProducts, "Produtos repostos.", () => replaceProductsInSource(nextProducts));
    setEditing(emptyProduct);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1f3679]">Admin Produtos</h1>
      </div>

      {loadingProducts ? <div className="rounded-lg border border-[#b9d8f6] bg-white p-4 font-bold text-[#1f3679]">A carregar produtos...</div> : null}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={submitProduct} className="min-w-0 space-y-4 rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-[#1f3679]">{isEditingExisting ? "Editar Produto" : "Adicionar Produto"}</h2>
          <AdminField label="Categoria" value={editing.category ?? ""} onChange={(event) => updateEditing("category", event.target.value)} />
          <AdminField label="Nome" value={editing.name} onChange={(event) => updateEditing("name", event.target.value)} />
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            <AdminField label="EAN" value={editing.ean ?? ""} onChange={(event) => updateEditing("ean", event.target.value)} inputMode="numeric" />
            <AdminField label="EAN CDI" value={editing.ean_cdi ?? ""} onChange={(event) => updateEditing("ean_cdi", event.target.value)} inputMode="numeric" />
            <AdminField label="ITF" value={editing.itf ?? ""} onChange={(event) => updateEditing("itf", event.target.value)} inputMode="numeric" />
            <AdminField label="ITF CDI" value={editing.itf_cdi ?? ""} onChange={(event) => updateEditing("itf_cdi", event.target.value)} inputMode="numeric" />
            <AdminField
              label="Código Auchan"
              value={editing.codigo_auchan ?? ""}
              onChange={(event) => updateEditing("codigo_auchan", event.target.value)}
              inputMode="numeric"
            />
            <AdminField
              label="Caixa"
              value={String(editing.caixa_default ?? "")}
              onChange={(event) => updateEditing("caixa_default", event.target.value)}
              inputMode="numeric"
            />
            <AdminField
              label="Validade mínima dias"
              value={String(editing.validade_minima_dias ?? "")}
              onChange={(event) => updateEditing("validade_minima_dias", event.target.value)}
              inputMode="numeric"
            />
          </div>

          {error ? <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{error}</div> : null}
          {message ? <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{message}</div> : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f3679] px-4 py-3 font-black text-white disabled:opacity-60">
              {isEditingExisting ? <Save aria-hidden="true" className="h-5 w-5" /> : <Plus aria-hidden="true" className="h-5 w-5" />}
              {saving ? "A guardar..." : isEditingExisting ? "Guardar" : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(emptyProduct)}
              className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[#2f4fb3] px-4 py-3 font-black text-[#1f3679]"
            >
              Limpar
            </button>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Procurar Produto</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-14 w-full rounded-md border-2 border-[#5ab2e8] px-3 text-base font-bold outline-none focus:border-[#1f3679]"
                placeholder="Nome, EAN, ITF ou código"
              />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <button type="button" disabled={saving} onClick={exportProducts} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] px-3 py-2 font-black text-[#1f3679] disabled:opacity-60">
                <Download aria-hidden="true" className="h-5 w-5" />
                Exportar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] px-3 py-2 font-black text-[#1f3679] disabled:opacity-60"
              >
                <Upload aria-hidden="true" className="h-5 w-5" />
                Importar
              </button>
              <button type="button" disabled={saving} onClick={resetToSeed} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] px-3 py-2 font-black text-[#1f3679] disabled:opacity-60">
                <RotateCcw aria-hidden="true" className="h-5 w-5" />
                Repor
              </button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importProducts} className="hidden" />
            </div>
          </div>

          <div className="rounded-lg border border-[#b9d8f6] bg-white p-3 shadow-sm md:hidden">
            <div className="grid gap-3">
              {results.map((product) => (
                <article key={product.id} className="rounded-md border border-[#b9d8f6] bg-[#eef6ff] p-3">
                  <h3 className="text-base font-black uppercase leading-snug text-[#1f3679]">{product.name}</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="font-black text-[#2f4fb3]">EAN</dt>
                      <dd className="break-all font-mono">{product.ean_cdi || product.ean || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-[#2f4fb3]">ITF</dt>
                      <dd className="break-all font-mono">{product.itf_cdi || product.itf || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-[#2f4fb3]">Auchan</dt>
                      <dd className="font-mono">{product.codigo_auchan || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-[#2f4fb3]">Caixa</dt>
                      <dd className="font-mono">{product.caixa_default ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-[#2f4fb3]">Validade</dt>
                      <dd className="font-mono">{product.validade_minima_dias ? `${product.validade_minima_dias}d` : "-"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 grid grid-cols-[1fr_3rem] gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(product)}
                      className="min-h-11 rounded-md border-2 border-[#2f4fb3] bg-white px-3 py-2 font-black text-[#1f3679]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(product)}
                      title="Apagar produto"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-red-700 bg-white text-red-800"
                    >
                      <Trash2 aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-[#b9d8f6] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#1f3679] text-white">
                  <tr>
                    <th className="px-3 py-3 font-black">Nome</th>
                    <th className="px-3 py-3 font-black">EAN</th>
                    <th className="px-3 py-3 font-black">ITF</th>
                    <th className="px-3 py-3 font-black">Auchan</th>
                    <th className="px-3 py-3 font-black">Caixa</th>
                    <th className="px-3 py-3 font-black">Validade</th>
                    <th className="px-3 py-3 font-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((product) => (
                    <tr key={product.id} className="border-t border-[#d8e9fb]">
                      <td className="max-w-80 px-3 py-3 font-bold">{product.name}</td>
                      <td className="px-3 py-3 font-mono">{product.ean_cdi || product.ean}</td>
                      <td className="px-3 py-3 font-mono">{product.itf_cdi || product.itf}</td>
                      <td className="px-3 py-3 font-mono">{product.codigo_auchan}</td>
                      <td className="px-3 py-3 font-mono">{product.caixa_default}</td>
                      <td className="px-3 py-3 font-mono">{product.validade_minima_dias ? `${product.validade_minima_dias}d` : "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(product)}
                            className="min-h-11 rounded-md border-2 border-[#2f4fb3] px-3 py-2 font-black text-[#1f3679]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(product)}
                            title="Apagar produto"
                            className="inline-flex min-h-11 w-11 items-center justify-center rounded-md border-2 border-red-700 text-red-800"
                          >
                            <Trash2 aria-hidden="true" className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type AdminFieldProps = {
  label: string;
  value: string;
  inputMode?: "numeric" | "text";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function AdminField({ label, value, inputMode = "text", onChange }: AdminFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-[#1f3679]">{label}</span>
      <input
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        className="min-h-12 w-full rounded-md border-2 border-[#5ab2e8] px-3 text-base font-bold outline-none focus:border-[#1f3679]"
      />
    </label>
  );
}
