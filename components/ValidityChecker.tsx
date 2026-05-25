"use client";

import { CalendarDays, RotateCcw } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { calculateAuchanValidity } from "../lib/auchan-validity";
import { formatDateInput, nativeDateToPtDate, ptDateToNativeDate, todayPtDate } from "../lib/date";
import type { Product } from "../types/product";
import { ProductSearch } from "./ProductSearch";

type DateFieldProps = {
  label: string;
  value: string;
  tone: "emerald" | "amber";
  placeholder: string;
  onChange: (value: string) => void;
};

function DateField({ label, value, tone, placeholder, onChange }: DateFieldProps) {
  const toneClassName =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 focus-within:border-emerald-950"
      : "border-amber-200 bg-amber-50/80 text-amber-900 focus-within:border-amber-950";
  const inputClassName =
    tone === "emerald"
      ? "border-emerald-500 text-emerald-950 focus:border-emerald-800"
      : "border-amber-500 text-amber-950 focus:border-amber-800";

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(formatDateInput(event.target.value));
  }

  function handleCalendarChange(event: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>) {
    const formatted = nativeDateToPtDate(event.currentTarget.value);

    if (formatted) {
      onChange(formatted);
    }
  }

  return (
    <label className={`block rounded-lg border p-3 ${toneClassName}`}>
      <span className="mb-2 block text-sm font-black uppercase">{label}</span>
      <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
        <input
          value={value}
          onChange={handleTextChange}
          inputMode="numeric"
          className={`min-h-14 w-full rounded-md border-2 bg-white px-3 text-lg font-black outline-none ${inputClassName}`}
          placeholder={placeholder}
        />
        <span className="flex min-h-14 items-center gap-2 rounded-md border-2 border-current bg-white px-3">
          <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0" />
          <input
            aria-label={`Escolher ${label.toLocaleLowerCase("pt-PT")}`}
            type="date"
            value={ptDateToNativeDate(value)}
            onInput={handleCalendarChange}
            onChange={handleCalendarChange}
            className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none"
          />
        </span>
      </div>
    </label>
  );
}

export function ValidityChecker() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dataEntrega, setDataEntrega] = useState(() => todayPtDate());
  const [dataValidade, setDataValidade] = useState("");

  const auchanValidity = useMemo(
    () => (selectedProduct ? calculateAuchanValidity(selectedProduct, dataEntrega, dataValidade) : null),
    [dataEntrega, dataValidade, selectedProduct],
  );

  const validityClassName =
    auchanValidity?.status === "accepted"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : auchanValidity?.status === "rejected"
        ? "border-red-300 bg-red-50 text-red-900"
        : selectedProduct
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-[#b9d8f6] bg-white text-[#1f3679]";

  function resetCheck() {
    setSelectedProduct(null);
    setDataEntrega(todayPtDate());
    setDataValidade("");
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    window.requestAnimationFrame(() => {
      document.getElementById("validity-dates")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section className="min-w-0 space-y-4">
        <div>
          <h2 className="text-lg font-black text-[#1f3679]">Procurar produto</h2>
          <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Escolha o produto para aplicar a regra de validade mínima Auchan.</p>
        </div>
        <ProductSearch onSelect={selectProduct} actionLabel="Verificar Validade" />
      </section>

      <aside id="validity-dates" className="min-w-0 space-y-4 rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm lg:sticky lg:top-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#1f3679]">Verificação</h2>
            <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Entrega, validade e mínimo exigido.</p>
          </div>
          <button
            type="button"
            onClick={resetCheck}
            title="Limpar verificação"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-[#2f4fb3] bg-white text-[#1f3679]"
          >
            <RotateCcw aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {selectedProduct ? (
          <div className="rounded-lg border border-[#d9e9fb] bg-[#f7fbff] p-3">
            <p className="text-xs font-black uppercase text-[#2f4fb3]">{selectedProduct.category ?? "Sem categoria"}</p>
            <h3 className="mt-1 break-words text-base font-black uppercase leading-snug text-[#1f3679]">{selectedProduct.name}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#1f3679]">
              <div className="min-w-0">
                <dt className="font-bold">Código Auchan</dt>
                <dd className="truncate font-mono">{selectedProduct.codigo_auchan || "-"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="font-bold">Mínimo</dt>
                <dd className="truncate font-mono">{selectedProduct.validade_minima_dias ? `${selectedProduct.validade_minima_dias} dias` : "-"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">Selecione um produto para verificar a validade.</div>
        )}

        <DateField label="Data de Entrega" value={dataEntrega} tone="emerald" placeholder="19-05-2026" onChange={setDataEntrega} />
        <DateField label="Data de Validade" value={dataValidade} tone="amber" placeholder="30-06-2027" onChange={setDataValidade} />

        <div className={`rounded-lg border p-4 text-sm font-black ${validityClassName}`} aria-live="polite">
          <p>Validade Auchan</p>
          <p className="mt-1 font-bold">{auchanValidity?.message ?? "Selecione o produto e indique as duas datas para ver o resultado."}</p>
        </div>
      </aside>
    </div>
  );
}
