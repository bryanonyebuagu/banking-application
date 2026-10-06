import { AuthContinue } from "@/features/auth/auth-continue";

function safeNext(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

export default async function AuthContinuePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthContinue destination={safeNext((await searchParams).next)} />;
}
