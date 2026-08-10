import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import { InventoryProvider } from "@/context/InventoryContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoutiqueOS - Fashion Boutique Management",
  description: "Complete retail management system for fashion boutiques",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <ThemeProvider>
          <InventoryProvider>{children}</InventoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}