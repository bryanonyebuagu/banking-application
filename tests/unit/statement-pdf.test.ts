import { describe, expect, it } from "vitest";
import { generateStatementPdf } from "../../src/server/statements/pdf";

describe("statement PDF", () => {
  it("creates a paginated PDF with escaped customer text", () => {
    const lines = Array.from({ length: 40 }, (_, index) => ({
      postedAt: "2026-09-15T12:00:00.000Z",
      description: index === 0 ? "Merchant (demo) \\ synthetic" : "Synthetic transaction " + index,
      direction: index % 2 === 0 ? "credit" as const : "debit" as const,
      amountMinor: 100 + index,
    }));
    const pdf = generateStatementPdf({
      statementId: "00000000-0000-4000-8000-000000000001",
      accountName: "Daily Checking", maskedAccountNumber: "•••• 1234", currency: "USD",
      periodStart: "2026-09-01", periodEnd: "2026-09-30", version: 1,
      openingMinor: 50000, closingMinor: 49980, generatedAt: "2026-09-30T12:00:00.000Z", lines,
    });
    const content = pdf.toString("ascii");
    expect(content.startsWith("%PDF-1.4")).toBe(true);
    expect(content).toContain("/Count 2");
    expect(content).toContain("Merchant \\(demo\\) \\\\ synthetic");
    expect(content.endsWith("%%EOF\n")).toBe(true);
  });
});
