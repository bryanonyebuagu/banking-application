import { AuthContinue } from "@/features/auth/auth-continue";
import { safeAuthDestination } from "@/lib/auth/redirect";

export default async function AuthContinuePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthContinue destination={safeAuthDestination((await searchParams).next)} />;
}
