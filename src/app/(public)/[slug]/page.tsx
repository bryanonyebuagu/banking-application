import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicPageBySlug, publicPages } from "@/features/public-site/content";
import { PublicProductPage } from "@/features/public-site/public-page";

export function generateStaticParams() { return publicPages.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = publicPageBySlug.get((await params).slug);
  return page ? { title: page.title, description: page.summary } : {};
}

export default async function PublicPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const page = publicPageBySlug.get((await params).slug);
  if (!page) notFound();
  return <PublicProductPage page={page} />;
}
