import Link from "next/link";
import { Boxes, CalendarDays, History, ScanBarcode, Settings } from "lucide-react";

const actions = [
  {
    href: "/scan",
    label: "Scan EAN",
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
    href: "/validades",
    label: "Validades",
    icon: CalendarDays,
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
      <section className="rounded-lg border border-[#b9d8f6] bg-white p-5 shadow-sm md:p-7">
        <p className="text-sm font-black uppercase tracking-normal text-[#2f4fb3]">Berver Trading</p>
        <h1 className="text-3xl font-black tracking-normal text-[#1f3679] md:text-4xl">Impressão de Etiquetas</h1>
        <p className="mt-2 text-base font-semibold text-[#2f4fb3]">Etiquetas 100 mm x 150 mm para paletes e produtos.</p>
      </section>

      <section className="grid gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex min-h-16 items-center justify-between rounded-lg px-5 py-4 text-lg font-black shadow-sm ${
                action.primary ? "bg-[#1f3679] text-white" : "border border-[#b9d8f6] bg-white text-[#1f3679]"
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
