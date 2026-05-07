"use client";

import { useEffect, useRef, useState } from "react";
import { Label100x150 } from "../../components/Label100x150";
import { PrintControls } from "../../components/PrintControls";
import { getDraftLabel, recordPrintHistory } from "../../lib/label-storage";
import type { LabelData } from "../../types/label";

export default function PrintPage() {
  const [label, setLabel] = useState<LabelData | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    setLabel(getDraftLabel());
  }, []);

  function recordPrint() {
    if (!label || recordedRef.current) {
      return;
    }

    recordPrintHistory(label);
    recordedRef.current = true;
  }

  if (!label) {
    return (
      <main className="print-container p-4">
        <div className="no-print rounded-lg border border-red-300 bg-red-50 p-5 font-bold text-red-900">Dados de impressão em falta. Crie uma nova etiqueta.</div>
      </main>
    );
  }

  return (
    <main className="print-container bg-[#dcecff] p-4">
      <PrintControls onPrint={recordPrint} />
      <div className="mt-4 flex flex-col items-start gap-4 print:mt-0 print:block">
        {Array.from({ length: label.quantidade_etiquetas }).map((_, index) => (
          <div key={`${label.id}-${index}`} className="label-page">
            <Label100x150 data={label} />
          </div>
        ))}
      </div>
    </main>
  );
}
