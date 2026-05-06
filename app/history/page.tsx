import { HistoryTable } from "../../components/HistoryTable";

export default function HistoryPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-neutral-950">Histórico</h1>
      <HistoryTable />
    </div>
  );
}
