import "server-only";

export type VerificationScenario = "verified" | "failed" | "manual_review";
export type SyntheticVerificationRequest = { fixtureId: string; testAnswer: string };

export interface IdentityVerificationProvider {
  createSyntheticRequest(scenario: VerificationScenario): Promise<SyntheticVerificationRequest>;
}

class SyntheticIdentityVerificationProvider implements IdentityVerificationProvider {
  async createSyntheticRequest(scenario: VerificationScenario): Promise<SyntheticVerificationRequest> {
    const fixtures: Record<VerificationScenario, string> = {
      verified: "SIM-VERIFIED-001",
      failed: "SIM-FAILED-001",
      manual_review: "SIM-REVIEW-001",
    };
    return { fixtureId: fixtures[scenario], testAnswer: "BANK-SYNTHETIC-ONLY" };
  }
}

export const identityVerificationProvider: IdentityVerificationProvider = new SyntheticIdentityVerificationProvider();
