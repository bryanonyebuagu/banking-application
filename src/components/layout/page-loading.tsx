import { Skeleton, Spinner } from "@/components/ui/surfaces";

export function PageLoading() {
  return <main id="main-content" className="mx-auto w-full max-w-public space-y-6 px-4 py-16"><Spinner label="Loading page" /><Skeleton className="h-12 max-w-lg" /><Skeleton className="h-32" /></main>;
}
