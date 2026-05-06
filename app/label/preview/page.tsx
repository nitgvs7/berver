"use client";

import Link from "next/link";
import { ArrowLeft, FilePlus2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Label100x150 } from "../../../components/Label100x150";
import { getDraftLabel } from "../../../lib/label-storage";
import type { LabelData } from "../../../types/label";

export default function PreviewPage() {
  const [label, setLabel] = useState<LabelData | null>(null);

  useEffect(() => {
    setLabel(getDraftLabel());
  }, []);

  if (!label) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-300 bg-red-50 p-5 font-bold text-red-900">
        Dados de impressão em falta. Crie uma nova etiqueta.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm sm:flex-row">
        <Link href="/print" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-3 text-base font-black text-white">
          <Printer aria-hidden="true" className="h-5 w-5" />
          Imprimir
        </Link>
        <Link
          href="/label/new"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-neutral-800 bg-white px-4 py-3 text-base font-black text-neutral-950"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          Voltar
        </Link>
        <Link
          href="/scan"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-neutral-800 bg-white px-4 py-3 text-base font-black text-neutral-950"
        >
          <FilePlus2 aria-hidden="true" className="h-5 w-5" />
          Nova Etiqueta
        </Link>
      </div>

      <div className="preview-stage overflow-x-auto rounded-lg border border-neutral-300 bg-neutral-200 p-4">
        <Label100x150 data={label} />
      </div>
    </div>
  );
}
