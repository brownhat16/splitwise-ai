import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "SplitAI - Smart Expense Sharing",
  description: "AI-powered expense sharing made simple",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="md:ml-64 min-h-screen pb-[72px] md:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </body>
    </html>
  );
}
