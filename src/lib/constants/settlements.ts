export const SETTLEMENT_STATUS = {
  PENDING: "pending",
  SETTLED: "settled",
} as const;

export type SettlementStatus =
  (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];
