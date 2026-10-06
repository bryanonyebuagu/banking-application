import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { environment } from "@/config/server";
import { ComponentPreview } from "@/features/foundation/component-preview";

export const metadata: Metadata = { title: "Component preview" };

export default function FoundationPage() {
  if (["demo", "production"].includes(environment.APP_ENV)) notFound();
  return <main id="main-content" className="mx-auto w-full max-w-public px-4 py-10 sm:px-6 lg:px-8"><h1 className="text-3xl font-semibold">Component preview</h1><p className="mt-3 mb-8 max-w-2xl text-muted">Local development workspace for shared controls. These examples use temporary preview state and do not create banking records.</p><ComponentPreview /></main>;
}
