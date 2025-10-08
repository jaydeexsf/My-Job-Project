import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuranVoice - Interactive Quran Learning Platform",
  description: "Advanced voice search, recitation analysis, and personalized Quran learning. Perfect your recitation with real-time feedback.",
  keywords: ["Quran", "voice search", "recitation", "Islamic", "learning", "Arabic"],
  authors: [{ name: "QuranVoice Team" }],
  openGraph: {
    title: "QuranVoice - Interactive Quran Learning",
    description: "Advanced voice search and recitation analysis for Quran learning",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 text-gray-900 dark:text-gray-100 min-h-screen`}>
        <Header />
        <main className="relative">
          {children}
        </main>
        
        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-gradient-to-tr from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl"></div>
        </div>
      </body>
    </html>
  );
}
