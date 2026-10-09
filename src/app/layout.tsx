import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { AppChrome } from "@/components/layout/app-chrome";
import "@/styles/globals.css";

export const dynamic = "force-dynamic";
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", variable: "--font-open-sans" });

export const metadata: Metadata = {
  title: { default: "Chaze Bank | Banking application portfolio", template: "%s | Chaze Bank" },
  description: "A development portfolio application demonstrating authentication, account servicing and provider-neutral banking software architecture with synthetic information.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={openSans.variable}><body className="flex min-h-dvh flex-col"><a className="sr-only z-50 bg-surface p-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main-content">Skip to main content</a><AppChrome>{children}</AppChrome></body></html>;
}
