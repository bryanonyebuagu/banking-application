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
  ach: { name: "ACH integration", description: "A future approved provider could issue receiving instructions after institutional onboarding." },
  domestic_wire: { name: "Domestic wire integration", description: "A future approved provider could issue beneficiary instructions after institutional onboarding." },
  international_wire: { name: "International wire integration", description: "A future approved provider could issue supported-currency instructions after institutional onboarding." },
  rtp: { name: "Real-time payment integration", description: "A future approved provider could enable an eligible instant-payment rail." },
  zelle: { name: "Person-to-person payment integration", description: "A supported network would require institutional approval, provider enablement and customer enrollment." },
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
