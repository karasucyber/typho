import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typho | Inteligência em movimento",
  description: "Typho AI Systems. Ideias, tecnologia e inteligência artificial em movimento.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
