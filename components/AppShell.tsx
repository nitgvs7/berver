"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, History, Home, ScanBarcode, Settings } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/scan", label: "Digitalizar", icon: ScanBarcode },
  { href: "/products", label: "Produtos", icon: Boxes },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/admin/products", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPrintRoute = pathname?.startsWith("/print");

  if (isPrintRoute) {
    return <div className="print-route">{children}</div>;
  }

  return (
    <div className="app-shell min-h-screen bg-[#eef6ff] text-[#1f3679]">
      <header className="app-header no-print sticky top-0 z-20 border-b border-[#b9d8f6] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-base font-black uppercase tracking-normal">
            <ClipboardList aria-hidden="true" className="h-6 w-6" />
            Etiquetas
          </Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-bold ${
                    active ? "bg-[#1f3679] text-white" : "text-[#1f3679] hover:bg-[#dcecff]"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="app-main mx-auto w-full max-w-5xl px-4 py-5 md:py-8">{children}</main>
      <nav
        aria-label="Navegação móvel"
        className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[#b9d8f6] bg-white md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
                active ? "bg-[#1f3679] text-white" : "text-[#1f3679]"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="h-20 md:hidden" />
    </div>
  );
}
