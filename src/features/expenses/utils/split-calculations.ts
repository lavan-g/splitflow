import type { SplitPayloadEntry, SplitType } from "@/features/expenses/types/expense-form-state";

export const ROUNDING_EPSILON = 0.01;

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function sumSplitAmounts(splits: SplitPayloadEntry[]) {
  return roundCurrency(splits.reduce((sum, split) => sum + split.amount, 0));
}

export function isAmountMatching(total: number, splits: SplitPayloadEntry[]) {
  return Math.abs(roundCurrency(total) - sumSplitAmounts(splits)) <= ROUNDING_EPSILON;
}

export function validateSplitTypeRules(
  splitType: SplitType,
  amount: number,
  splits: SplitPayloadEntry[],
) {
  if (splitType === "equal") {
    const values = splits.map((split) => roundCurrency(split.amount));
    const first = values[0] ?? 0;
    const allNearlyEqual = values.every(
      (value) => Math.abs(value - first) <= ROUNDING_EPSILON,
    );
    return allNearlyEqual && isAmountMatching(amount, splits);
  }

  if (splitType === "percentage") {
    const percentageTotal = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0,
    );
    return (
      Math.abs(percentageTotal - 100) <= ROUNDING_EPSILON &&
      isAmountMatching(amount, splits)
    );
  }

  return isAmountMatching(amount, splits);
}
