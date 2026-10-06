import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { environment } from "@/config/server";
import { AppChrome } from "@/components/layout/app-chrome";
import "@/styles/globals.css";

export const dynamic = "force-dynamic";
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", variable: "--font-open-sans" });

export const metadata: Metadata = {
  title: { default: "BANK | Personal banking", template: "%s | BANK" },
  description: "Manage accounts, payments, cards, lending and investments with BANK.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={openSans.variable}><body className="flex min-h-dvh flex-col"><a className="sr-only z-50 bg-surface p-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main-content">Skip to main content</a><AppChrome showPreview={["local","test"].includes(environment.APP_ENV)}>{children}</AppChrome></body></html>;
}
