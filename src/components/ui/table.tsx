import type { ReactNode } from "react";
import { Button } from "./button";

export function Table({ caption, headings, children }: { caption: string; headings: string[]; children: ReactNode }) {
  return <div role="region" aria-label={caption} tabIndex={0} className="max-w-full overflow-x-auto rounded-control border border-border"><table className="w-full border-collapse text-left text-sm"><caption className="p-4 text-left font-semibold">{caption}</caption><thead className="bg-subtle"><tr>{headings.map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><span aria-live="polite" className="text-sm">Page {page} of {totalPages}</span><Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button></nav>;
}
