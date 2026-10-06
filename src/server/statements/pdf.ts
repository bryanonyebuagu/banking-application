export type StatementPdfLine = { postedAt: string; description: string; direction: "credit" | "debit"; amountMinor: number };
export type StatementPdfInput = {
  statementId: string; accountName: string; maskedAccountNumber: string; currency: string;
  periodStart: string; periodEnd: string; version: number; openingMinor: number;
  closingMinor: number; generatedAt: string; lines: StatementPdfLine[];
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const ROWS_PER_PAGE = 34;

function ascii(value: string) {
  return value.replace(/•+/g, "ending").normalize("NFKD").replace(/[^\x20-\x7e]/g, "?");
}
function pdfText(value: string) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function truncate(value: string, length: number) {
  const normalized = ascii(value).replace(/\s+/g, " ").trim();
  return normalized.length <= length ? normalized : normalized.slice(0, Math.max(0, length - 3)) + "...";
}
function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code" }).format(amountMinor / 100);
}
function text(font: "F1" | "F2", size: number, x: number, y: number, value: string) {
  return "BT /" + font + " " + size + " Tf " + x + " " + y + " Td (" + pdfText(value) + ") Tj ET";
}

function pageContent(input: StatementPdfInput, pageLines: StatementPdfLine[], page: number, pages: number) {
  const credits = input.lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amountMinor, 0);
  const debits = input.lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amountMinor, 0);
  const commands = [
    "0.05 0.16 0.29 rg 0 714 612 78 re f",
    "1 1 1 rg",
    text("F1", 22, 42, 752, "Chaze Bank"),
    text("F1", 12, 42, 730, "Chaze Bank account statement"),
    "0 0 0 rg",
    text("F1", 16, 42, 680, "Account statement"),
    text("F1", 9, 42, 660, input.accountName + "  " + input.maskedAccountNumber),
    text("F1", 9, 42, 646, "Period: " + input.periodStart + " through " + input.periodEnd + "  |  Version " + input.version),
    text("F1", 9, 42, 632, "Statement ID: " + input.statementId),
    "0.93 0.95 0.97 rg 42 574 528 40 re f",
    "0 0 0 rg",
    text("F1", 8, 54, 598, "OPENING BALANCE"),
    text("F1", 8, 190, 598, "TOTAL CREDITS"),
    text("F1", 8, 326, 598, "TOTAL DEBITS"),
    text("F1", 8, 462, 598, "CLOSING BALANCE"),
    text("F1", 10, 54, 583, money(input.openingMinor, input.currency)),
    text("F1", 10, 190, 583, money(credits, input.currency)),
    text("F1", 10, 326, 583, money(debits, input.currency)),
    text("F1", 10, 462, 583, money(input.closingMinor, input.currency)),
    text("F2", 8, 42, 550, "DATE        DESCRIPTION                              CREDIT          DEBIT"),
    "0.68 0.72 0.76 RG 42 544 m 570 544 l S",
  ];
  let y = 528;
  if (pageLines.length === 0) commands.push(text("F1", 9, 42, y, "No account activity in this statement period."));
  for (const line of pageLines) {
    const credit = line.direction === "credit" ? money(line.amountMinor, input.currency) : "";
    const debit = line.direction === "debit" ? money(line.amountMinor, input.currency) : "";
    const row = line.postedAt.slice(0, 10).padEnd(12) + truncate(line.description, 38).padEnd(41) + credit.padStart(14) + debit.padStart(15);
    commands.push(text("F2", 7.5, 42, y, row));
    y -= 13;
  }
  commands.push(
    "0.68 0.72 0.76 RG 42 72 m 570 72 l S", "0 0 0 rg",
    text("F1", 7.5, 42, 56, "Chaze Bank account statement. Keep this document for your records."),
    text("F1", 7.5, 42, 43, "Generated " + input.generatedAt.slice(0, 19).replace("T", " ") + " UTC"),
    text("F1", 7.5, 510, 43, "Page " + page + " of " + pages),
  );
  return commands.join("\n");
}

export function generateStatementPdf(input: StatementPdfInput) {
  const chunks: StatementPdfLine[][] = [];
  if (input.lines.length === 0) chunks.push([]);
  for (let index = 0; index < input.lines.length; index += ROWS_PER_PAGE) chunks.push(input.lines.slice(index, index + ROWS_PER_PAGE));
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  for (let index = 0; index < chunks.length; index += 1) {
    const pageNumber = 5 + index * 2;
    const contentNumber = pageNumber + 1;
    pageObjectNumbers.push(pageNumber);
    const content = pageContent(input, chunks[index] ?? [], index + 1, chunks.length);
    objects[pageNumber] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PAGE_WIDTH + " " + PAGE_HEIGHT + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentNumber + " 0 R >>";
    objects[contentNumber] = "<< /Length " + Buffer.byteLength(content, "ascii") + " >>\nstream\n" + content + "\nendstream";
  }
  objects[2] = "<< /Type /Pages /Kids [" + pageObjectNumbers.map((number) => number + " 0 R").join(" ") + "] /Count " + pageObjectNumbers.length + " >>";
  let output = "%PDF-1.4\n%Chaze Bank\n";
  const offsets: number[] = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(output, "ascii");
    output += index + " 0 obj\n" + objects[index] + "\nendobj\n";
  }
  const xref = Buffer.byteLength(output, "ascii");
  output += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let index = 1; index < objects.length; index += 1) output += String(offsets[index]).padStart(10, "0") + " 00000 n \n";
  output += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(output, "ascii");
}
