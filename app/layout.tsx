import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";          // adjust if path is different
import { InventoryProvider } from "@/context/InventoryContext";  // fixed from @/contexts
import { NotificationProvider } from "@/context/NotificationContext"; // fixed from @/contexts
import InstallPWA from "@/components/InstallPWA";                // ensure this file exists
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BoutiqueOS",
  description: "Boutique Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BoutiqueOS",
  },
  icons: {
    apple: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-512.png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BoutiqueOS" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased`}>
        <ThemeProvider>
          <InventoryProvider>
            <NotificationProvider>
              {children}
              <InstallPWA />
            </NotificationProvider>
          </InventoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}