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
