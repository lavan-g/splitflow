import { type UserBalance, type PeerBalance } from "@/features/balance/types/balance-types";

type ExpenseRow = {
  paid_by: string;
  amount: number;
};

type SplitRow = {
  expense_id: string;
  user_id: string;
  amount: number;
  expense: ExpenseRow;
};

type ProfileRow = {
  user_id: string;
  full_name: string;
  username: string;
};

export function calculateUserBalance(
  currentUserId: string,
  splits: SplitRow[],
): UserBalance {
  let totalOwed = 0;
  let totalReceivable = 0;

  for (const split of splits) {
    const paidBy = split.expense.paid_by;
    const isCurrentUserPayer = paidBy === currentUserId;
    const isCurrentUserSplit = split.user_id === currentUserId;

    if (isCurrentUserPayer && !isCurrentUserSplit) {
      // Someone else owes the current user
      totalReceivable += split.amount;
    } else if (!isCurrentUserPayer && isCurrentUserSplit) {
      // Current user owes the payer
      totalOwed += split.amount;
    }
  }

  return {
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalReceivable: Math.round(totalReceivable * 100) / 100,
    netBalance: Math.round((totalReceivable - totalOwed) * 100) / 100,
  };
}

export function calculatePeerBalances(
  currentUserId: string,
  splits: SplitRow[],
  profiles: ProfileRow[],
): PeerBalance[] {
  const balanceMap = new Map<string, number>();

  for (const split of splits) {
    const paidBy = split.expense.paid_by;
    const isCurrentUserPayer = paidBy === currentUserId;
    const isCurrentUserSplit = split.user_id === currentUserId;

    if (isCurrentUserPayer && !isCurrentUserSplit) {
      // split.user_id owes current user split.amount
      const prev = balanceMap.get(split.user_id) ?? 0;
      balanceMap.set(split.user_id, prev + split.amount);
    } else if (!isCurrentUserPayer && isCurrentUserSplit) {
      // current user owes paidBy split.amount
      const prev = balanceMap.get(paidBy) ?? 0;
      balanceMap.set(paidBy, prev - split.amount);
    }
  }

  return Array.from(balanceMap.entries())
    .filter(([, amount]) => Math.abs(amount) >= 0.01)
    .map(([userId, amount]) => {
      const profile = profiles.find((p) => p.user_id === userId);
      return {
        userId,
        fullName: profile?.full_name ?? "Unknown",
        username: profile?.username ?? "",
        amount: Math.round(amount * 100) / 100,
      };
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
