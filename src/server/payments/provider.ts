import "server-only";
import { environment } from "@/config/server";

export type PaymentRail = "ach" | "domestic_wire" | "international_wire" | "rtp" | "zelle";
export type RailStatus = "production_credentials_configured" | "provider_configuration_required" | "institutional_approval_required";

export type PaymentRailCapability = {
  rail: PaymentRail;
  name: string;
  description: string;
  status: RailStatus;
};

const details: Record<PaymentRail, Omit<PaymentRailCapability, "rail" | "status">> = {
  ach: { name: "ACH and direct deposit", description: "Receive domestic bank transfers and payroll deposits using an assigned account and routing number." },
  domestic_wire: { name: "Domestic wires", description: "Receive U.S. dollar wires using provider-issued beneficiary instructions." },
  international_wire: { name: "International wires", description: "Receive supported currencies using provider-issued international wire instructions." },
  rtp: { name: "Real-time payments", description: "Receive eligible payments over an enabled instant-payment rail." },
  zelle: { name: "Zelle®", description: "Receive payments after Chaze Bank is approved as a participating financial institution and the customer is enrolled." },
};

function enabledRails() {
  return new Set((environment.BANKING_PROVIDER_ENABLED_RAILS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
}

export function getPaymentRailCapabilities(): PaymentRailCapability[] {
  const enabled = enabledRails();
  return (Object.keys(details) as PaymentRail[]).map((rail) => ({
    rail,
    ...details[rail],
    status: rail === "zelle"
      ? "institutional_approval_required"
      : environment.BANKING_PROVIDER_MODE === "production" && enabled.has(rail)
        ? "production_credentials_configured"
        : "provider_configuration_required",
  }));
}

export function assertLivePaymentRail(rail: PaymentRail) {
  const capability = getPaymentRailCapabilities().find((item) => item.rail === rail);
  if (!capability || capability.status !== "production_credentials_configured") throw new Error(`Payment rail ${rail} is not activated for production.`);
  throw new Error(`Payment rail ${rail} has credentials but its approved provider operation has not been implemented.`);
}
