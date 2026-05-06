import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "Impressão de Etiquetas",
  description: "Aplicação móvel para imprimir etiquetas de armazém 100 mm x 150 mm.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
