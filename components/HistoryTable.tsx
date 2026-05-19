"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPrintHistory, loadPrintHistoryFromSource, saveDraftLabel } from "../lib/label-storage";
import type { LabelData } from "../types/label";

export function HistoryTable() {
  const router = useRouter();
  const [history, setHistory] = useState<LabelData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setHistory(getPrintHistory());

    loadPrintHistoryFromSource()
      .then((loadedHistory) => {
        if (isMounted) {
          setHistory(loadedHistory);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function reprint(label: LabelData) {
    saveDraftLabel(label);
    router.push("/print");
  }

  if (history.length === 0 && isLoading) {
    return <div className="rounded-lg border border-[#b9d8f6] bg-white p-5 text-base font-bold text-[#1f3679]">A carregar histórico...</div>;
  }

  if (history.length === 0) {
    return <div className="rounded-lg border border-[#b9d8f6] bg-white p-5 text-base font-bold text-[#1f3679]">Ainda não existem etiquetas impressas.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#b9d8f6] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#1f3679] text-white">
            <tr>
              <th className="px-3 py-3 font-black">Produto</th>
              <th className="px-3 py-3 font-black">Lote</th>
              <th className="px-3 py-3 font-black">Entrega</th>
              <th className="px-3 py-3 font-black">Validade</th>
              <th className="px-3 py-3 font-black">Auchan</th>
              <th className="px-3 py-3 font-black">Ordem</th>
              <th className="px-3 py-3 font-black">SSCC</th>
              <th className="px-3 py-3 font-black">Ação</th>
            </tr>
          </thead>
          <tbody>
            {history.map((label) => (
              <tr key={label.id} className="border-t border-[#d8e9fb]">
                <td className="max-w-72 px-3 py-3 font-bold">{label.product.name}</td>
                <td className="px-3 py-3 font-mono">{label.lote}</td>
                <td className="px-3 py-3 font-mono">{label.data_entrega ?? "-"}</td>
                <td className="px-3 py-3 font-mono">{label.validade_texto}</td>
                <td className="px-3 py-3 font-bold">
                  {label.auchan_validity_status === "accepted"
                    ? "Aceite"
                    : label.auchan_validity_status === "rejected"
                      ? "Não aceite"
                      : "Sem regra"}
                </td>
                <td className="px-3 py-3 font-mono">{label.ordem_compra}</td>
                <td className="px-3 py-3 font-mono">{label.sscc}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => reprint(label)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-[#2f4fb3] px-3 py-2 font-black"
                  >
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    Reimprimir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
