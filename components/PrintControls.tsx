"use client";

import { ArrowLeft, FilePlus2, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PrintControlsProps = {
  onPrint?: () => boolean | void | Promise<boolean | void>;
};

export function PrintControls({ onPrint }: PrintControlsProps) {
  const router = useRouter();
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    if (printing) {
      return;
    }

    setPrinting(true);

    try {
      const shouldPrint = await onPrint?.();

      if (shouldPrint !== false) {
        window.print();
      }
    } finally {
      setPrinting(false);
    }
  }

  return (
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
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-4 py-3 text-base font-black text-[#1f3679]"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Voltar
      </button>
      <button
        type="button"
        onClick={() => router.push("/scan")}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-4 py-3 text-base font-black text-[#1f3679]"
      >
        <FilePlus2 aria-hidden="true" className="h-5 w-5" />
        Nova Etiqueta
      </button>
    </div>
  );
}
