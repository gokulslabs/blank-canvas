/**
 * Accounting Service — The Heart of the Ledger
 * 
 * Implements double-entry accounting with strict validation.
 * Every financial action flows through createJournalEntry().
 * 
 * Rules enforced:
 * 1. total_debit === total_credit (balanced entry)
 * 2. All referenced accounts must exist
 * 3. All amounts must be > 0
 * 4. At least one debit and one credit line required
 */

import { CreateJournalEntryInput, JournalEntry, JournalLine } from "@/types/accounting";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";

export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingError";
  }
}

/**
 * Validates and persists a journal entry with its lines.
 * This is the ONLY way financial data enters the ledger.
 */
export function createJournalEntry(input: CreateJournalEntryInput): JournalEntry {
  // --- Validation ---

  // 1. Must have lines
  if (!input.lines || input.lines.length < 2) {
    throw new AccountingError("Journal entry must have at least 2 lines (debit + credit)");
  }

  // 2. Validate each line
  for (const line of input.lines) {
    // Account must exist
    if (!accountRepo.exists(line.accountId)) {
      throw new AccountingError(`Account ${line.accountId} does not exist`);
    }

    // Amounts must be non-negative
    if (line.debit < 0 || line.credit < 0) {
      throw new AccountingError("Debit and credit amounts must be non-negative");
    }

    // Each line should have either a debit or credit, not both
    if (line.debit > 0 && line.credit > 0) {
      throw new AccountingError("A journal line cannot have both debit and credit");
    }

    // Each line must have at least one non-zero amount
    if (line.debit === 0 && line.credit === 0) {
      throw new AccountingError("A journal line must have a non-zero debit or credit");
    }
  }

  // 3. Entry must have at least one debit and one credit
  const hasDebit = input.lines.some((l) => l.debit > 0);
  const hasCredit = input.lines.some((l) => l.credit > 0);
  if (!hasDebit || !hasCredit) {
    throw new AccountingError("Journal entry must have at least one debit and one credit line");
  }

  // 4. CRITICAL: Total debits must equal total credits
  const totalDebit = input.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = input.lines.reduce((sum, l) => sum + l.credit, 0);

  // Use epsilon comparison for floating point
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new AccountingError(
      `Unbalanced entry: debits (${totalDebit.toFixed(2)}) ≠ credits (${totalCredit.toFixed(2)})`
    );
  }

  // --- Persist ---

  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    date: input.date,
    description: input.description,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    createdAt: new Date().toISOString(),
  };

  const lines: JournalLine[] = input.lines.map((l) => ({
    id: crypto.randomUUID(),
    journalEntryId: entry.id,
    accountId: l.accountId,
    debit: l.debit,
    credit: l.credit,
  }));

  journalRepo.insertEntry(entry);
  journalRepo.insertLines(lines);

  console.log(`[Ledger] Journal entry created: ${entry.description}`, {
    id: entry.id,
    lines: lines.map((l) => ({
      account: l.accountId,
      debit: l.debit,
      credit: l.credit,
    })),
  });

  return entry;
}
