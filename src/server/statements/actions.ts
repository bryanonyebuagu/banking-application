"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";
import { generateStatementPdf } from "./pdf";
import { getPendingStatementData } from "./queries";

function value(data: FormData, key: string) {
  const item = data.get(key);
  return typeof item === "string" ? item : "";
}

export async function generateStatementAction(data: FormData) {
  await requireSameOrigin();
  await requireVerifiedIdentity();
  const parsed = z.object({ account: z.uuid(), start: z.iso.date(), end: z.iso.date() }).safeParse({
    account: value(data, "account"), start: value(data, "start"), end: value(data, "end"),
  });
  if (!parsed.success) redirect("/statements/new?message=invalid");
  const start = new Date(parsed.data.start + "T00:00:00.000Z");
  const end = new Date(parsed.data.end + "T00:00:00.000Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 1 || days > 366 || end > today) redirect("/statements/new?message=invalid");

  const supabase = await createServerSupabaseClient();
  const customer = await supabase.from("customers").select("id").single();
  if (customer.error) redirect("/statements/new?message=failed");
  const id = randomUUID();
  const objectKey = customer.data.id + "/" + id + ".pdf";
  const begun = await supabase.rpc("begin_current_account_statement", {
    p_statement_id: id, p_account_id: parsed.data.account, p_period_start: parsed.data.start,
    p_period_end: parsed.data.end, p_object_key: objectKey,
  });
  if (begun.error) redirect("/statements/new?message=failed");

  try {
    const { statement, lines } = await getPendingStatementData(id);
    const credits = lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amount_minor, 0);
    const debits = lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amount_minor, 0);
    if (statement.opening_minor + credits - debits !== statement.closing_minor) throw new Error("STATEMENT_ARITHMETIC_MISMATCH");
    const pdf = generateStatementPdf({
      statementId: statement.id, accountName: statement.accounts.nickname,
      maskedAccountNumber: statement.accounts.masked_account_number, currency: statement.currency,
      periodStart: statement.period_start, periodEnd: statement.period_end, version: statement.version,
      openingMinor: statement.opening_minor, closingMinor: statement.closing_minor,
      generatedAt: new Date().toISOString(),
      lines: lines.map((line) => ({
        postedAt: line.activity_at, description: line.description,
        direction: line.direction === "credit" ? "credit" : "debit", amountMinor: line.amount_minor,
      })),
    });
    const upload = await supabase.storage.from("bank-statements").upload(objectKey, pdf, { contentType: "application/pdf", upsert: false });
    if (upload.error) throw new Error("STATEMENT_UPLOAD_FAILED");
    const finalized = await supabase.rpc("finalize_current_statement", { p_statement_id: id });
    if (finalized.error) throw new Error("STATEMENT_FINALIZE_FAILED");
  } catch {
    await supabase.storage.from("bank-statements").remove([objectKey]);
    await supabase.rpc("abandon_current_statement", { p_statement_id: id });
    redirect("/statements/new?message=failed");
  }
  revalidatePath("/statements");
  redirect("/statements/" + id + "?message=generated");
}
