"use client";

import { CalendarDays, ClipboardCheck, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { dateToYYMMDD, formatDateInput } from "../lib/date";
import { generateSSCC } from "../lib/sscc";
import { getNextSSCCSerial, getSelectedProduct, saveDraftLabel, setSelectedProduct } from "../lib/label-storage";
import { findProductByCode, findProductById, loadProducts } from "../lib/products";
import { validateLabelForm, type LabelValidationErrors } from "../lib/validation";
import type { LabelFormValues } from "../types/label";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { ProductSearch } from "./ProductSearch";

const emptyForm: LabelFormValues = {
  product: null,
  ordem_compra: "",
  lote: "",
  validade_texto: "",
  validade_barras: "",
  caixas: 1,
  quantidade_etiquetas: 1,
};

function createLabelId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nativeDateToPtDate(value: string): string {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}-${month}-${year}`;
}

function ptDateToNativeDate(value: string): string {
  const [day, month, year] = value.split("-");

  if (!day || !month || !year || year.length !== 4) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function LabelForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<LabelFormValues>(emptyForm);
  const [errors, setErrors] = useState<LabelValidationErrors>({});
  const [manualBarcodeDate, setManualBarcodeDate] = useState(false);

  useEffect(() => {
    const products = loadProducts();
    const productId = searchParams.get("productId");
    const code = searchParams.get("code");
    const selected =
      (productId ? findProductById(productId, products) : undefined) ??
      (code ? findProductByCode(code, products) : undefined) ??
      getSelectedProduct();

    if (selected) {
      setValues((current) => ({
        ...current,
        product: selected,
        caixas: selected.caixa_default ?? current.caixas,
      }));
    }
  }, [searchParams]);

  function updateField(field: keyof LabelFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleValidityTextChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatDateInput(event.target.value);
    applyValidityDate(formatted);
  }

  function handleValidityCalendarChange(event: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>) {
    const formatted = nativeDateToPtDate(event.currentTarget.value);

    if (formatted) {
      applyValidityDate(formatted);
    }
  }

  function applyValidityDate(formatted: string) {
    const generated = dateToYYMMDD(formatted);

    setValues((current) => ({
      ...current,
      validade_texto: formatted,
      validade_barras: !manualBarcodeDate && generated ? generated : current.validade_barras,
    }));
    setErrors((current) => ({ ...current, validade_texto: undefined, validade_barras: undefined }));
  }

  function handleProductSelect(product: Product) {
    setSelectedProduct(product);
    setValues((current) => ({
      ...current,
      product,
      caixas: product.caixa_default ?? current.caixas,
    }));
    setErrors((current) => ({ ...current, product: undefined }));
  }

  function resetBarcodeDate() {
    const generated = dateToYYMMDD(values.validade_texto);
    setManualBarcodeDate(false);

    if (generated) {
      updateField("validade_barras", generated);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLabelForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !values.product) {
      return;
    }

    const serial = getNextSSCCSerial();
    const label = {
      id: createLabelId(),
      product: values.product,
      ordem_compra: values.ordem_compra.trim(),
      lote: values.lote.trim(),
      validade_texto: values.validade_texto.trim(),
      validade_barras: values.validade_barras.trim(),
      caixas: Number(values.caixas),
      quantidade_etiquetas: Number(values.quantidade_etiquetas),
      sscc: generateSSCC(serial),
      created_at: new Date().toISOString(),
    };

    saveDraftLabel(label);
    router.push("/label/preview");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm md:p-5">
        <div>
          <h1 className="text-2xl font-black text-[#1f3679]">Criar Etiqueta</h1>
          <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Preencha os dados da etiqueta de palete/produto.</p>
        </div>

        {values.product ? (
          <ProductCard product={values.product} />
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">Selecione um produto para continuar.</div>
        )}
        {errors.product ? <p className="text-sm font-bold text-red-700">{errors.product}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Ordem de Compra"
            error={errors.ordem_compra}
            inputMode="numeric"
            value={values.ordem_compra}
            onChange={(event) => updateField("ordem_compra", event.target.value)}
            placeholder="1075383683"
          />
          <Field label="Lote" error={errors.lote} value={values.lote} onChange={(event) => updateField("lote", event.target.value)} placeholder="060426" />
          <label className="block">
            <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Data de Validade</span>
            <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
              <input
                value={values.validade_texto}
                onChange={handleValidityTextChange}
                inputMode="numeric"
                className="min-h-14 w-full rounded-md border-2 border-[#5ab2e8] px-3 text-lg font-black outline-none focus:border-[#1f3679]"
                placeholder="30-06-2027"
              />
              <label className="grid gap-1">
                <span className="sr-only">Calendário</span>
                <span className="flex min-h-14 items-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-3 text-[#1f3679] focus-within:border-[#1f3679]">
                  <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0" />
                  <input
                    aria-label="Escolher data de validade"
                  type="date"
                  value={ptDateToNativeDate(values.validade_texto)}
                  onInput={handleValidityCalendarChange}
                  onChange={handleValidityCalendarChange}
                  className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none"
                />
                </span>
              </label>
            </div>
            {errors.validade_texto ? <span className="mt-1 block text-sm font-bold text-red-700">{errors.validade_texto}</span> : null}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">Validade Barras</span>
            <div className="flex gap-2">
              <input
                value={values.validade_barras}
                onChange={(event) => {
                  setManualBarcodeDate(true);
                  updateField("validade_barras", event.target.value.replace(/\D/g, "").slice(0, 6));
                }}
                inputMode="numeric"
                className="min-h-14 w-full rounded-md border-2 border-[#5ab2e8] px-3 text-lg font-black outline-none focus:border-[#1f3679]"
                placeholder="270630"
              />
              <button
                type="button"
                onClick={resetBarcodeDate}
                title="Gerar de novo a partir da validade"
                className="inline-flex min-h-14 w-14 shrink-0 items-center justify-center rounded-md border-2 border-[#2f4fb3] bg-white text-[#1f3679]"
              >
                <RotateCcw aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            {errors.validade_barras ? <span className="mt-1 block text-sm font-bold text-red-700">{errors.validade_barras}</span> : null}
          </label>
          <Field
            label="Nº de Caixas"
            error={errors.caixas}
            inputMode="numeric"
            value={String(values.caixas)}
            onChange={(event) => updateField("caixas", event.target.value.replace(/\D/g, ""))}
            placeholder="2"
          />
          <Field
            label="Quantidade de Etiquetas"
            error={errors.quantidade_etiquetas}
            inputMode="numeric"
            value={String(values.quantidade_etiquetas)}
            onChange={(event) => updateField("quantidade_etiquetas", event.target.value.replace(/\D/g, ""))}
            placeholder="1"
          />
        </div>

        <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-[#1f3679] px-5 py-3 text-lg font-black text-white">
          <ClipboardCheck aria-hidden="true" className="h-6 w-6" />
          Pré-visualizar
        </button>
      </form>

      <aside className="space-y-4">
        <ProductSearch onSelect={handleProductSelect} actionLabel="Usar Produto" />
      </aside>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function Field({ label, value, error, placeholder, inputMode = "text", onChange }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black uppercase text-[#1f3679]">{label}</span>
      <input
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        className="min-h-14 w-full rounded-md border-2 border-[#5ab2e8] px-3 text-lg font-black outline-none focus:border-[#1f3679]"
        placeholder={placeholder}
      />
      {error ? <span className="mt-1 block text-sm font-bold text-red-700">{error}</span> : null}
    </label>
  );
}
