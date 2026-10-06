import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="mx-auto w-full max-w-public px-4 py-16"><p className="text-sm font-semibold text-muted">404</p><h1 className="mt-2 text-3xl font-semibold">Page not found</h1><p className="mt-4 text-muted">This page may have moved or isn’t available yet.</p><Link className="mt-6 inline-flex min-h-11 items-center text-action underline" href="/">Return home</Link></main>;
}
