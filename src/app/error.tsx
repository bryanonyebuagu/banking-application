"use client";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/surfaces";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="mx-auto w-full max-w-public space-y-6 px-4 py-16"><h1 className="text-3xl font-semibold">We couldn’t load this page</h1><ErrorState>Please try again. Your request may not have completed.</ErrorState><Button onClick={reset}>Try again</Button></main>;
}
