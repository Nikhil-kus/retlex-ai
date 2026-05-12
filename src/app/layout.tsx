import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { HindiProvider } from "@/lib/hindi-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Retlex AI",
  description: "AI Powered Kirana Billing",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 flex h-screen overflow-hidden`}>
        <HindiProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto h-full">
            {children}
          </main>
        </HindiProvider>
      </body>
    </html>
  );
}
