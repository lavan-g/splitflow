import type { SplitPayloadEntry, SplitType } from "@/features/expenses/types/expense-form-state";

export const ROUNDING_EPSILON = 0.01;

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function toCents(value: number) {
  return Math.round(roundCurrency(value) * 100);
}

export function sumSplitAmounts(splits: SplitPayloadEntry[]) {
  return roundCurrency(splits.reduce((sum, split) => sum + split.amount, 0));
}

export function isAmountMatching(total: number, splits: SplitPayloadEntry[]) {
  const totalCents = toCents(total);
  const splitCents = splits.reduce((sum, split) => sum + toCents(split.amount), 0);
  return totalCents === splitCents;
}

export function areEqualSplits(splits: SplitPayloadEntry[]) {
  if (splits.length === 0) {
    return false;
  }

  const cents = splits.map((split) => toCents(split.amount));
  const min = Math.min(...cents);
  const max = Math.max(...cents);

  // Remainder distribution may give one member an extra cent.
  return max - min <= 1;
}

export function computeEqualSplits(memberIds: string[], amount: number): SplitPayloadEntry[] {
  if (memberIds.length === 0) {
    return [];
  }

  const totalCents = toCents(amount);
  const baseCents = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents % memberIds.length;

  return memberIds.map((userId, index) => ({
    userId,
    amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
  }));
}

export function distributeEqualPercentages(memberIds: string[]): Record<string, string> {
  if (memberIds.length === 0) {
    return {};
  }

  const baseHundredths = Math.floor(10_000 / memberIds.length);
  const remainder = 10_000 % memberIds.length;
  const percentages: Record<string, string> = {};

  memberIds.forEach((memberId, index) => {
    const hundredths = baseHundredths + (index < remainder ? 1 : 0);
    percentages[memberId] = (hundredths / 100).toFixed(2);
  });

  return percentages;
}

export function computePercentageSplits(
  memberIds: string[],
  amount: number,
  percentagesByMember: Record<string, string>,
): SplitPayloadEntry[] {
  if (memberIds.length === 0) {
    return [];
  }

  const totalCents = toCents(amount);
  const rows = memberIds.map((userId) => {
    const percentage = Number.parseFloat(percentagesByMember[userId] ?? "0");
    const safePercentage = Number.isFinite(percentage) ? percentage : 0;
    return {
      userId,
      percentage: safePercentage,
      amountCents: Math.floor((totalCents * safePercentage) / 100),
    };
  });

  let assignedCents = rows.reduce((sum, row) => sum + row.amountCents, 0);
  let remainingCents = totalCents - assignedCents;
  let index = 0;

  while (remainingCents > 0) {
    rows[index % rows.length].amountCents += 1;
    remainingCents -= 1;
    index += 1;
  }

  return rows.map((row) => ({
    userId: row.userId,
    percentage: row.percentage,
    amount: row.amountCents / 100,
  }));
}

export function validateSplitTypeRules(
  splitType: SplitType,
  amount: number,
  splits: SplitPayloadEntry[],
) {
  if (!isAmountMatching(amount, splits)) {
    return false;
  }

  if (splitType === "equal") {
    return areEqualSplits(splits);
  }

  if (splitType === "percentage") {
    const percentageTotalCents = splits.reduce(
      (sum, split) => sum + toCents(split.percentage ?? 0),
      0,
    );
    return percentageTotalCents === 10_000;
  }

  return true;
}
