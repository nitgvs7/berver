import Link from "next/link";
import { Boxes, History, ScanBarcode, Settings } from "lucide-react";

const actions = [
  {
    href: "/scan",
    label: "Digitalizar EAN",
    icon: ScanBarcode,
    primary: true,
  },
  {
    href: "/products",
    label: "Procurar Produto",
    icon: Boxes,
    primary: false,
  },
  {
    href: "/history",
    label: "Histórico",
    icon: History,
    primary: false,
  },
  {
    href: "/admin/products",
    label: "Admin Produtos",
    icon: Settings,
    primary: false,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-lg border border-neutral-300 bg-white p-5 shadow-sm md:p-7">
        <h1 className="text-3xl font-black tracking-normal text-neutral-950 md:text-4xl">Impressão de Etiquetas</h1>
        <p className="mt-2 text-base font-semibold text-neutral-700">Etiquetas 100 mm x 150 mm para paletes e produtos.</p>
      </section>

      <section className="grid gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex min-h-16 items-center justify-between rounded-lg px-5 py-4 text-lg font-black shadow-sm ${
                action.primary ? "bg-neutral-950 text-white" : "border border-neutral-300 bg-white text-neutral-950"
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <Icon aria-hidden="true" className="h-7 w-7" />
                {action.label}
              </span>
              <span aria-hidden="true" className="text-2xl">
                ›
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
