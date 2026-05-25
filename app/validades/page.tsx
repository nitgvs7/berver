import { ValidityChecker } from "../../components/ValidityChecker";

export default function ValidadesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1f3679]">Validades</h1>
        <p className="mt-1 text-sm font-semibold text-[#2f4fb3]">Verifique rapidamente se a validade cumpre o mínimo Auchan.</p>
      </div>
      <ValidityChecker />
    </div>
  );
}
