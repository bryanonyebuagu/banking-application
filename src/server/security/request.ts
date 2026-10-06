import "server-only";
import { headers } from "next/headers";
import { environment } from "@/config/server";

export async function requireSameOrigin() {
  const origin = (await headers()).get("origin");
  if (!origin || new URL(origin).origin !== new URL(environment.APP_ORIGIN).origin) {
    throw new Error("INVALID_REQUEST_ORIGIN");
  }
}
