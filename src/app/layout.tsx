import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { HindiProvider } from "@/lib/hindi-context";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

/**
 * Root layout — wraps ALL routes.
 *
 * Architecture note:
 *   The Sidebar is NOT rendered here anymore. Each route group provides
 *   its own navigation:
 *     - /[shopId]/* → ShopSidebar (multi-tenant, shop-aware nav)
 *     - /qr/*       → no sidebar (public customer page)
 *     - /customer   → no sidebar (customer-facing page)
 *     - /worker     → no sidebar (legacy worker page, kept for backward compat)
 *
 *   Legacy routes (/billing, /products, etc.) still render the old Sidebar
 *   via their own layout for backward compatibility.
 */

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Retlex AI",
  description: "Smart billing for Kirana, Tent House and Electronics shops",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-neutral-50 text-neutral-900 flex h-screen overflow-hidden`}>
        <HindiProvider>
          <ServiceWorkerRegister />
          {children}
        </HindiProvider>
      </body>
    </html>
  );
}
