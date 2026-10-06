"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/ui/surfaces";

export function AuthContinue({ destination }: { destination: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.location.replace(destination), 250);
    return () => window.clearTimeout(timer);
  }, [destination]);
  return <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-16 text-center">
    <Spinner label="Finishing secure sign-in" />
  </main>;
}
