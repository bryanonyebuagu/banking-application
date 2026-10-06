import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateStatementPdf } from "../src/server/statements/pdf.ts";

const lines = Array.from({ length: 42 }, (_, index) => ({
  postedAt: "2026-09-" + String((index % 28) + 1).padStart(2, "0") + "T12:00:00.000Z",
  description: index % 3 === 0 ? "Synthetic payroll deposit" : "Synthetic merchant purchase " + (index + 1),
  direction: index % 3 === 0 ? "credit" as const : "debit" as const,
  amountMinor: index % 3 === 0 ? 250000 : 1250 + index * 37,
}));
const credits = lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amountMinor, 0);
const debits = lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amountMinor, 0);
const directory = resolve("output/pdf");
const path = resolve(directory, "statement-sample.pdf");
await mkdir(directory, { recursive: true });
await writeFile(path, generateStatementPdf({
  statementId: "00000000-0000-4000-8000-000000000001",
  accountName: "Everyday Checking", maskedAccountNumber: "•••• 1842", currency: "USD",
  periodStart: "2026-09-01", periodEnd: "2026-09-30", version: 2,
  openingMinor: 125075, closingMinor: 125075 + credits - debits,
  generatedAt: "2026-09-30T12:00:00.000Z", lines,
}));
console.log(path);
