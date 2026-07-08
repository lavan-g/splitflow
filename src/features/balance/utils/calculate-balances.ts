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

export type SettlementRow = {
  payer_id: string;
  receiver_id: string;
  amount: number;
};

/**
 * From the perspective of `currentUserId`:
 * - If I paid an expense and someone else has a split → they owe me that split amount
 * - If someone else paid and I have a split → I owe them that split amount
 * - Settled payments reduce the outstanding debt/receivable accordingly
 */
export function calculateUserBalance(
  currentUserId: string,
  splits: SplitRow[],
  settlements: SettlementRow[] = [],
): UserBalance {
  let totalOwed = 0;
  let totalReceivable = 0;

  for (const split of splits) {
    const paidBy = split.expenses?.paid_by;
    if (!paidBy) continue;

    if (split.user_id === currentUserId && paidBy !== currentUserId) {
      totalOwed += Number(split.amount);
    } else if (split.user_id !== currentUserId && paidBy === currentUserId) {
      totalReceivable += Number(split.amount);
    }
  }

  for (const s of settlements) {
    if (s.payer_id === currentUserId) {
      // I paid someone — reduces my outstanding debt
      totalOwed = Math.max(0, totalOwed - Number(s.amount));
    } else if (s.receiver_id === currentUserId) {
      // Someone paid me — reduces what they still owe me
      totalReceivable = Math.max(0, totalReceivable - Number(s.amount));
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
  settlements: SettlementRow[] = [],
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

  for (const s of settlements) {
    if (s.payer_id === currentUserId) {
      // I paid the receiver — reduces my debt to them
      const peer = s.receiver_id;
      peerAmounts.set(peer, (peerAmounts.get(peer) ?? 0) + Number(s.amount));
    } else if (s.receiver_id === currentUserId) {
      // Payer paid me — reduces their debt to me
      const peer = s.payer_id;
      peerAmounts.set(peer, (peerAmounts.get(peer) ?? 0) - Number(s.amount));
    }
  }

  const result: PeerBalance[] = [];
  for (const [userId, amount] of peerAmounts) {
    if (Math.abs(amount) < 0.01) continue;
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
