# Milestone A — Statements verification

Verified 2026-09-30 against the separate hosted Supabase test project.

## Delivered behavior

- Immutable versioned account statement snapshots with a fixed ledger cutoff and ledger-derived opening and closing balances.
- Exact owner-scoped statement activity from the same effective-time and cutoff rules used by the balance snapshot.
- Private PDF generation with account/period details, opening balance, credits, debits, closing balance, paginated activity and a simulator disclaimer.
- Owner-only list/detail screens and five-minute signed download links. Pending uploads can be abandoned; finalized PDFs cannot be deleted by customers.

## Evidence

- Transactional rehearsal passed opening plus movements equals closing, exact statement-activity rows and deterministic version increments.
- Live provider-token tests passed owner-bound upload/read, anonymous and cross-owner denial, immutable snapshot values and finalized-file delete denial.
- A 42-row two-page sample passed PDF structural inspection and Poppler rendering; both pages were visually inspected for layout, alignment, masking, page numbers and disclaimers.
- The connected browser journey generated a real hosted PDF, finalized it, downloaded it through its signed URL, verified application/pdf and %PDF, and returned to the persisted statement list.
- TypeScript, focused lint and the statement PDF unit test passed. Both targets have 22 applied migrations and zero pending.
- Hosted parity matches 53 tables, 528 columns, 38 public-schema policies and three private buckets. Cleanup is clean across 31 resource groups.
