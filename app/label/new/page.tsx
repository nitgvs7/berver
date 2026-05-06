import { Suspense } from "react";
import { LabelForm } from "../../../components/LabelForm";

export default function NewLabelPage() {
  return (
    <Suspense fallback={<div className="rounded-lg bg-white p-5 font-bold">A carregar formulário...</div>}>
      <LabelForm />
    </Suspense>
  );
}
