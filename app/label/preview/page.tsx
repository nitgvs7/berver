"use client";

import Link from "next/link";
import { ArrowLeft, FilePlus2, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Label100x150 } from "../../../components/Label100x150";
import { getDraftLabel, recordPrintHistoryToSource } from "../../../lib/label-storage";
import type { LabelData } from "../../../types/label";

export default function PreviewPage() {
  const [label, setLabel] = useState<LabelData | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const recordedRef = useRef(false);

  useEffect(() => {
    setLabel(getDraftLabel());
  }, []);

  async function handlePrint() {
    if (!label || printing) {
      return;
    }

    setPrinting(true);

    try {
      if (!recordedRef.current) {
        await recordPrintHistoryToSource(label);
        recordedRef.current = true;
      }

      setPrintError(null);
      window.print();
    } catch {
      setPrintError("Não foi possível gravar a etiqueta no histórico partilhado. A impressão foi cancelada.");
    } finally {
      setPrinting(false);
    }
  }

  if (!label) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-300 bg-red-50 p-5 font-bold text-red-900">
        Dados de impressão em falta. Crie uma nova etiqueta.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm sm:flex-row">
        <button
          type="button"
          disabled={printing}
          onClick={handlePrint}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#1f3679] px-4 py-3 text-base font-black text-white disabled:opacity-60"
        >
          <Printer aria-hidden="true" className="h-5 w-5" />
          {printing ? "A preparar..." : "Imprimir"}
        </button>
        <Link
          href="/label/new"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-4 py-3 text-base font-black text-[#1f3679]"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          Voltar
        </Link>
        <Link
          href="/scan"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-4 py-3 text-base font-black text-[#1f3679]"
        >
          <FilePlus2 aria-hidden="true" className="h-5 w-5" />
          Nova Etiqueta
        </Link>
      </div>

      {printError ? <div className="no-print rounded-lg border border-red-300 bg-red-50 p-4 font-bold text-red-900">{printError}</div> : null}

      <div className="no-print rounded-lg border border-[#b9d8f6] bg-white p-4 text-sm font-bold text-[#1f3679] shadow-sm">
        <p>Data de entrega: <span className="font-mono">{label.data_entrega}</span></p>
        <p>
          Validade Auchan:{" "}
          <span className={label.auchan_validity_status === "rejected" ? "text-red-700" : label.auchan_validity_status === "accepted" ? "text-emerald-700" : "text-amber-700"}>
            {label.auchan_validity_status === "accepted" ? "Aceite" : label.auchan_validity_status === "rejected" ? "Não aceite" : "Sem regra definida"}
          </span>
        </p>
      </div>

      <div className="preview-stage overflow-x-auto rounded-lg border border-[#b9d8f6] bg-[#dcecff] p-4">
        <Label100x150 data={label} />
      </div>
    </div>
  );
}
