"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileCheck2, Loader2, RotateCcw, Upload } from "lucide-react";
import type { EncomendaHistoryItem, ParsedEncomenda, ParsedEncomendaItem } from "../types/encomenda";

type EditableField = "lote" | "dataValidade" | "qtdEnviada" | "pEtiqueta" | "obs";

const numericFields = new Set<EditableField>(["qtdEnviada", "pEtiqueta"]);

function sanitizeEditableValue(field: EditableField, value: string): string {
  if (numericFields.has(field)) {
    return value.replace(/\D/g, "").slice(0, 8);
  }

  if (field === "obs") {
    return value.slice(0, 80);
  }

  return value.slice(0, field === "lote" ? 32 : 24);
}

function getDownloadFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);

  return match?.[1] ?? fallback;
}

function formatHistoryDate(value: string): string {
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
  }

  if (!value) {
    return "-";
  }

  return value;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function EncomendasManager() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [order, setOrder] = useState<ParsedEncomenda | null>(null);
  const [history, setHistory] = useState<EncomendaHistoryItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalItems = useMemo(() => order?.items.length ?? 0, [order]);

  async function loadHistory() {
    setLoadingHistory(true);

    try {
      const response = await fetch("/api/encomendas/history");
      const payload = (await response.json()) as { history?: EncomendaHistoryItem[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar o histórico.");
      }

      setHistory(payload.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setParsing(true);
    setError(null);
    setMessage(null);
    setOrder(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/encomendas/parse", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { order?: ParsedEncomenda; error?: string };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error ?? "Não foi possível ler o PDF.");
      }

      setOrder(payload.order);
      setMessage(`Encomenda ${payload.order.orderNumber} carregada com ${payload.order.items.length} artigos.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível ler o PDF.");
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  }

  function updateItem(index: number, field: EditableField, value: string) {
    setOrder((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: sanitizeEditableValue(field, value) } : item)),
      };
    });
  }

  function resetOrder() {
    setOrder(null);
    setMessage(null);
    setError(null);
  }

  async function generatePdf() {
    if (!order || generating) {
      return;
    }

    setGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/encomendas/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Não foi possível gerar o PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getDownloadFilename(response, `auchan-sabores-do-mundo-${order.orderNumber}.pdf`);
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("PDF gerado.");
      await loadHistory();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível gerar o PDF.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <section className="min-w-0 space-y-4">
        <div className="rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#1f3679]">PDF Auchan</h2>
              <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Carregue a nota de encomenda para preparar a versão de armazém.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing || generating}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f3679] px-4 py-3 font-black text-white disabled:opacity-60"
              >
                {parsing ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Upload aria-hidden="true" className="h-5 w-5" />}
                {parsing ? "A ler..." : "Carregar PDF"}
              </button>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={parseFile} className="hidden" />
              {order ? (
                <button
                  type="button"
                  onClick={resetOrder}
                  title="Limpar encomenda"
                  className="inline-flex min-h-12 w-12 items-center justify-center rounded-md border-2 border-[#2f4fb3] bg-white text-[#1f3679]"
                >
                  <RotateCcw aria-hidden="true" className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>

          {error ? <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{error}</div> : null}
          {message ? <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{message}</div> : null}
        </div>

        {order ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-[#2f4fb3]">Auchan - Sabores do Mundo</p>
                  <h2 className="text-xl font-black text-[#1f3679]">Nota de Encomenda Nº {order.orderNumber}</h2>
                  <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Data de Entrega: {order.deliveryDate}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <OrderMiniPreview order={order} />
                <button
                  type="button"
                  onClick={generatePdf}
                  disabled={generating}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1f3679] px-4 py-3 font-black text-white disabled:opacity-60"
                >
                  {generating ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <FileCheck2 aria-hidden="true" className="h-5 w-5" />}
                  {generating ? "A gerar..." : "Gerar PDF"}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#b9d8f6] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] text-left text-sm">
                  <thead className="bg-[#1f3679] text-white">
                    <tr>
                      <th className="w-20 px-2 py-3 text-center font-black">Contador</th>
                      <th className="w-24 px-2 py-3 text-center font-black">Código</th>
                      <th className="min-w-72 px-2 py-3 font-black">DESIGNAÇÃO/ARTIGO</th>
                      <th className="w-20 px-2 py-3 text-center font-black">U.C.</th>
                      <th className="w-16 px-2 py-3 text-center font-black">QTD</th>
                      <th className="w-20 px-2 py-3 text-center font-black">P/Etq</th>
                      <th className="w-24 px-2 py-3 text-center font-black">QTD enviada</th>
                      <th className="w-28 px-2 py-3 font-black">Lote</th>
                      <th className="w-36 px-2 py-3 font-black">Data de Validade</th>
                      <th className="w-40 px-2 py-3 font-black">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <OrderRow key={`${item.contador}-${item.codigo}`} item={item} index={index} onUpdate={updateItem} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#5ab2e8] bg-white p-6 text-center font-bold text-[#2f4fb3]">
            Nenhuma encomenda carregada.
          </div>
        )}
      </section>

      <aside className="min-w-0 space-y-4 rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm xl:sticky xl:top-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#1f3679]">Histórico</h2>
            <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">{totalItems ? `${totalItems} artigos carregados` : "PDFs gerados"}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            title="Atualizar histórico"
            disabled={loadingHistory}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-[#2f4fb3] bg-white text-[#1f3679] disabled:opacity-60"
          >
            {loadingHistory ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <RotateCcw aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>

        <div className="grid gap-3">
          {history.length === 0 ? (
            <div className="rounded-md border border-[#d8e9fb] bg-[#eef6ff] p-3 text-sm font-bold text-[#1f3679]">Sem PDFs gerados.</div>
          ) : (
            history.map((item) => (
              <article key={item.id} className="rounded-md border border-[#d8e9fb] bg-[#f7fbff] p-3">
                <p className="text-xs font-black uppercase text-[#2f4fb3]">Nota {item.orderNumber}</p>
                <h3 className="mt-1 text-base font-black text-[#1f3679]">{formatHistoryDate(item.deliveryDate)}</h3>
                <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">
                  {item.itemCount} artigos {formatCreatedAt(item.createdAt)}
                </p>
                <a
                  href={`/api/encomendas/history/${item.id}/download`}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-3 py-2 font-black text-[#1f3679]"
                >
                  <Download aria-hidden="true" className="h-5 w-5" />
                  Descarregar
                </a>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function OrderMiniPreview({ order }: { order: ParsedEncomenda }) {
  const previewItems = order.items.slice(0, 8);
  const hiddenItems = Math.max(order.items.length - previewItems.length, 0);

  return (
    <div className="min-w-0 flex-1">
      <h2 className="text-lg font-black text-[#1f3679]">Pré-visualização</h2>
      <div className="mt-3 max-w-full overflow-x-auto rounded-md border border-[#b9d8f6] bg-[#eef6ff] p-3">
        <div className="w-[430px] bg-white p-3 text-[6px] leading-tight text-[#1f3679] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black">Auchan - Sabores do Mundo</p>
              <p className="mt-1 font-black">Nota de Encomenda Nº {order.orderNumber}</p>
            </div>
            <p className="font-black">Data de Entrega: {order.deliveryDate}</p>
          </div>
          <table className="mt-3 w-full table-fixed border-collapse">
            <thead className="bg-[#1f3679] text-white">
              <tr>
                <th className="w-[8%] border border-[#1f3679] px-1 py-1">Contador</th>
                <th className="w-[10%] border border-[#1f3679] px-1 py-1">Código</th>
                <th className="w-[31%] border border-[#1f3679] px-1 py-1">DESIGNAÇÃO/ARTIGO</th>
                <th className="w-[7%] border border-[#1f3679] px-1 py-1">U.C.</th>
                <th className="w-[6%] border border-[#1f3679] px-1 py-1">QTD</th>
                <th className="w-[7%] border border-[#1f3679] px-1 py-1">P/Etq</th>
                <th className="w-[9%] border border-[#1f3679] px-1 py-1">QTD enviada</th>
                <th className="w-[8%] border border-[#1f3679] px-1 py-1">Lote</th>
                <th className="w-[9%] border border-[#1f3679] px-1 py-1">Data de Validade</th>
                <th className="w-[5%] border border-[#1f3679] px-1 py-1">Obs</th>
              </tr>
            </thead>
            <tbody>
              {previewItems.map((item) => (
                <tr key={`${item.contador}-${item.codigo}`}>
                  <td className="h-5 border border-[#b9d8f6] bg-[#f7fbff] px-1" />
                  <td className="border border-[#b9d8f6] px-1 text-center font-mono">{item.codigo}</td>
                  <td className="border border-[#b9d8f6] px-1 font-black">{item.designacao}</td>
                  <td className="border border-[#b9d8f6] px-1 text-center">{item.uc}</td>
                  <td className="border border-[#b9d8f6] px-1 text-center">{item.qtd}</td>
                  <td className="border border-[#b9d8f6] bg-[#f7fbff] px-1 text-center">{item.pEtiqueta}</td>
                  <td className="border border-[#b9d8f6] bg-[#f7fbff] px-1 text-center">{item.qtdEnviada}</td>
                  <td className="border border-[#b9d8f6] bg-[#f7fbff] px-1">{item.lote}</td>
                  <td className="border border-[#b9d8f6] bg-[#f7fbff] px-1">{item.dataValidade}</td>
                  <td className="border border-[#b9d8f6] bg-[#f7fbff] px-1">{item.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hiddenItems > 0 ? <p className="mt-2 text-right font-black text-[#2f4fb3]">+ {hiddenItems} artigos</p> : null}
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  item,
  index,
  onUpdate,
}: {
  item: ParsedEncomendaItem;
  index: number;
  onUpdate: (index: number, field: EditableField, value: string) => void;
}) {
  return (
    <tr className="border-t border-[#d8e9fb] align-top">
      <td className="bg-[#f7fbff] px-2 py-2 text-center font-mono font-bold text-[#1f3679]" />
      <td className="px-2 py-2 text-center font-mono font-bold text-[#1f3679]">{item.codigo}</td>
      <td className="px-2 py-2 font-bold leading-snug text-[#1f3679]">{item.designacao}</td>
      <td className="px-2 py-2 text-center font-mono font-bold text-[#1f3679]">{item.uc}</td>
      <td className="px-2 py-2 text-center font-mono font-bold text-[#1f3679]">{item.qtd}</td>
      <td className="px-2 py-2">
        <EditableInput value={item.pEtiqueta ?? ""} onChange={(value) => onUpdate(index, "pEtiqueta", value)} numeric />
      </td>
      <td className="px-2 py-2">
        <EditableInput value={item.qtdEnviada ?? ""} onChange={(value) => onUpdate(index, "qtdEnviada", value)} numeric />
      </td>
      <td className="px-2 py-2">
        <EditableInput value={item.lote ?? ""} onChange={(value) => onUpdate(index, "lote", value)} />
      </td>
      <td className="px-2 py-2">
        <EditableInput value={item.dataValidade ?? ""} onChange={(value) => onUpdate(index, "dataValidade", value)} placeholder="DD/MM/AAAA" />
      </td>
      <td className="px-2 py-2">
        <EditableInput value={item.obs ?? ""} onChange={(value) => onUpdate(index, "obs", value)} />
      </td>
    </tr>
  );
}

function EditableInput({
  value,
  numeric = false,
  placeholder,
  onChange,
}: {
  value: string;
  numeric?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode={numeric ? "numeric" : "text"}
      placeholder={placeholder}
      className="min-h-10 w-full rounded-md border-2 border-[#b9d8f6] bg-white px-2 text-sm font-bold text-[#1f3679] outline-none focus:border-[#1f3679]"
    />
  );
}
