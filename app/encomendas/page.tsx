import { EncomendasManager } from "../../components/EncomendasManager";

export default function EncomendasPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1f3679]">Encomendas</h1>
        <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Prepare notas de encomenda Auchan para o armazém.</p>
      </div>
      <EncomendasManager />
    </div>
  );
}
