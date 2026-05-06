"use client";

import { ArrowLeft, FilePlus2, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

type PrintControlsProps = {
  onPrint?: () => void;
};

export function PrintControls({ onPrint }: PrintControlsProps) {
  const router = useRouter();

  function handlePrint() {
    onPrint?.();
    window.print();
  }

  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm sm:flex-row">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-3 text-base font-black text-white"
      >
        <Printer aria-hidden="true" className="h-5 w-5" />
        Imprimir
      </button>
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-neutral-800 bg-white px-4 py-3 text-base font-black text-neutral-950"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Voltar
      </button>
      <button
        type="button"
        onClick={() => router.push("/scan")}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-neutral-800 bg-white px-4 py-3 text-base font-black text-neutral-950"
      >
        <FilePlus2 aria-hidden="true" className="h-5 w-5" />
        Nova Etiqueta
      </button>
    </div>
  );
}
