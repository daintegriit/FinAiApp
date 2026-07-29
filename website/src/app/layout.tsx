import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinBudget AI — Your Financial Intelligence Platform",
  description:
    "AI-powered personal finance. Know your financial score, simulate decisions before you make them, and benchmark against real peers.",
  keywords: ["personal finance", "AI finance", "budget", "financial score", "money management"],
  openGraph: {
    title: "FinBudget AI",
    description: "Your money, finally smart.",
    type: "website",
    url: "https://finbudgetai.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinBudget AI",
    description: "Your money, finally smart.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}