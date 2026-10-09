import Link from "next/link";

export function SiteNotice() {
  return <aside className="border-b border-[#b9d7f2] bg-[#eef6fd] text-sm text-ink" aria-label="Application status">
    <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 xl:px-8">
      <p><strong>Development portfolio application.</strong> Chaze Bank is not a chartered bank and cannot hold or transfer real funds. Use synthetic information only.</p>
      <Link className="shrink-0 font-semibold text-action underline underline-offset-4" href="/about">About this project</Link>
    </div>
  </aside>;
}
