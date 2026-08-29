import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AirBooks — Free Ebook Library",
  description: "Read and download PDFs & EPUBs. Powered by Telegram storage.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-grid">
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-slate-800 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
            <p>
              <span className="text-brand-400 font-semibold">AirBooks</span> —
              Free ebook library powered by Telegram
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
