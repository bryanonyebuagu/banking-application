import "server-only";
import { headers } from "next/headers";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function isLoopbackHost(host: string) {
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]"))
    : host.split(":")[0];

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function requireSameOrigin() {
  const requestHeaders = await headers();
  const originHeader = requestHeaders.get("origin");
  const host =
    firstHeaderValue(requestHeaders.get("host")) ??
    firstHeaderValue(requestHeaders.get("x-forwarded-host"));
  const forwardedProtocol = firstHeaderValue(requestHeaders.get("x-forwarded-proto"));

  let receivedOrigin: URL | null = null;
  let requestOrigin: URL | null = null;

  try {
    receivedOrigin = originHeader ? new URL(originHeader) : null;

    if (host) {
      const protocol =
        forwardedProtocol === "http" || forwardedProtocol === "https"
          ? forwardedProtocol
          : isLoopbackHost(host)
            ? "http"
            : "https";
      requestOrigin = new URL(`${protocol}://${host}`);
    }
  } catch {
    // The rejection below logs only safe origin metadata.
  }

  if (!receivedOrigin || !requestOrigin || receivedOrigin.origin !== requestOrigin.origin) {
    console.error(
      JSON.stringify({
        event: "AUTH_REQUEST_ORIGIN_REJECTED",
        hasOriginHeader: Boolean(originHeader),
        hasRequestHost: Boolean(host),
        receivedHost: receivedOrigin?.hostname ?? null,
        requestHost: requestOrigin?.hostname ?? null,
      }),
    );
    throw new Error("INVALID_REQUEST_ORIGIN");
  }
}
