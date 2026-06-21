import type { PeerBalance, UserBalance } from "@/features/balance/types/balance-types";

type SplitRow = {
  user_id: string;
  amount: number;
  expense_id: string;
  expenses: {
    paid_by: string;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string;
  username: string;
};

/**
 * From the perspective of `currentUserId`:
 * - If I paid an expense and someone else has a split → they owe me that split amount
 * - If someone else paid and I have a split → I owe them that split amount
 */
export function calculateUserBalance(currentUserId: string, splits: SplitRow[]): UserBalance {
  let totalOwed = 0;
  let totalReceivable = 0;

  for (const split of splits) {
    const paidBy = split.expenses?.paid_by;
    if (!paidBy) continue;

    if (split.user_id === currentUserId && paidBy !== currentUserId) {
      // I have a split in an expense someone else paid → I owe
      totalOwed += Number(split.amount);
    } else if (split.user_id !== currentUserId && paidBy === currentUserId) {
      // Someone else has a split in my expense → they owe me
      totalReceivable += Number(split.amount);
    }
  }

  return {
    totalOwed,
    totalReceivable,
    netBalance: totalReceivable - totalOwed,
  };
}

export function calculatePeerBalances(
  currentUserId: string,
  splits: SplitRow[],
  profiles: ProfileRow[],
): PeerBalance[] {
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const peerAmounts = new Map<string, number>();

  for (const split of splits) {
    const paidBy = split.expenses?.paid_by;
    if (!paidBy) continue;

    if (split.user_id === currentUserId && paidBy !== currentUserId) {
      // I owe paidBy this split amount (negative from my perspective)
      peerAmounts.set(paidBy, (peerAmounts.get(paidBy) ?? 0) - Number(split.amount));
    } else if (split.user_id !== currentUserId && paidBy === currentUserId) {
      // split.user_id owes me (positive from my perspective)
      const peer = split.user_id;
      peerAmounts.set(peer, (peerAmounts.get(peer) ?? 0) + Number(split.amount));
    }
  }

  const result: PeerBalance[] = [];
  for (const [userId, amount] of peerAmounts) {
    if (Math.abs(amount) < 0.01) continue; // skip negligible amounts
    const profile = profileMap.get(userId);
    result.push({
      userId,
      fullName: profile?.full_name ?? "Unknown",
      username: profile?.username ?? "",
      amount,
    });
  }

  // Sort: biggest owed to me first, then biggest I owe
  result.sort((a, b) => b.amount - a.amount);
  return result;
}
