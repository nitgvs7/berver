import { BarcodeScanner } from "../../components/BarcodeScanner";

export default function ScanPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-neutral-950">Digitalizar EAN</h1>
      </div>
      <BarcodeScanner />
    </div>
  );
}
