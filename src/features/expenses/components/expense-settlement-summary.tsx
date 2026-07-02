import {
  computeExpenseOwes,
  displayName,
  payerDisplayName,
  totalReceivableByPayer,
} from "@/features/expenses/utils/expense-owes";

type MemberInfo = {
  userId: string;
  fullName: string;
  username: string;
};

type ExpenseSettlementSummaryProps = {
  paidBy: string;
  currentUserId: string;
  splits: Array<{ userId: string; amount: number }>;
  members: MemberInfo[];
  totalAmount: number;
};

export function ExpenseSettlementSummary({
  paidBy,
  currentUserId,
  splits,
  members,
  totalAmount,
}: ExpenseSettlementSummaryProps) {
  if (splits.length === 0) {
    return null;
  }

  const memberMap = new Map(members.map((member) => [member.userId, member]));
  const payer = memberMap.get(paidBy);
  const payerLabel = payerDisplayName(paidBy, currentUserId, payer?.fullName ?? "payer");
  const owes = computeExpenseOwes(paidBy, splits);
  const receivable = totalReceivableByPayer(paidBy, splits);
  const payerShare = owes.find((entry) => entry.userId === paidBy)?.splitAmount ?? 0;

  return (
    <div className="space-y-2 rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-3">
      <p className="text-sm font-medium text-indigo-100">Settlement summary</p>
      <p className="text-xs text-indigo-200/80">
        {paidBy === currentUserId ? "You" : (payer?.fullName ?? "Payer")} paid ₹
        {totalAmount.toFixed(2)}. Balanced split amounts below show what each person owes.
      </p>

      <ul className="space-y-1.5">
        {owes.map((entry) => {
          const member = memberMap.get(entry.userId);
          const name = displayName(entry.userId, currentUserId, member?.fullName ?? "Unknown");
          const isPayer = entry.userId === paidBy;

          return (
            <li
              key={entry.userId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-100">{name}</p>
                <p className="text-xs text-slate-400">Share: ₹{entry.splitAmount.toFixed(2)}</p>
              </div>
              <p
                className={`shrink-0 text-right text-xs font-medium ${
                  isPayer ? "text-emerald-300" : "text-amber-200"
                }`}
              >
                {isPayer ? (
                  <>
                    Paid ₹{totalAmount.toFixed(2)}
                    <br />
                    <span className="text-emerald-300/90">
                      Gets back ₹{receivable.toFixed(2)} (keeps ₹{payerShare.toFixed(2)})
                    </span>
                  </>
                ) : entry.userId === currentUserId ? (
                  <>You owe {payerLabel} ₹{entry.owedAmount.toFixed(2)}</>
                ) : (
                  <>
                    Owes {payerLabel} ₹{entry.owedAmount.toFixed(2)}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
