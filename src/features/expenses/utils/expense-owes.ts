import { roundCurrency } from "@/features/expenses/utils/split-calculations";

export type ExpenseOweEntry = {
  userId: string;
  splitAmount: number;
  owedToUserId: string | null;
  owedAmount: number;
};

export function computeExpenseOwes(
  paidBy: string,
  splits: Array<{ userId: string; amount: number }>,
): ExpenseOweEntry[] {
  return splits.map((split) => ({
    userId: split.userId,
    splitAmount: roundCurrency(Number(split.amount)),
    owedToUserId: split.userId === paidBy ? null : paidBy,
    owedAmount: split.userId === paidBy ? 0 : roundCurrency(Number(split.amount)),
  }));
}

export function totalReceivableByPayer(
  paidBy: string,
  splits: Array<{ userId: string; amount: number }>,
) {
  return roundCurrency(
    splits
      .filter((split) => split.userId !== paidBy)
      .reduce((sum, split) => sum + Number(split.amount), 0),
  );
}

export function displayName(
  userId: string,
  currentUserId: string,
  fullName: string,
) {
  return userId === currentUserId ? "You" : fullName;
}

export function payerDisplayName(
  paidBy: string,
  currentUserId: string,
  fullName: string,
) {
  return paidBy === currentUserId ? "you" : fullName;
}
