import { describe, expect, it } from "vitest";

import {
  calculatePeerBalances,
  calculateUserBalance,
} from "./calculate-balances";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";
const USER_C = "33333333-3333-3333-3333-333333333333";

describe("calculateUserBalance", () => {
  it("computes owed and receivable from splits", () => {
    const splits = [
      {
        user_id: USER_A,
        amount: 50,
        expense_id: "e1",
        expenses: { paid_by: USER_B },
      },
      {
        user_id: USER_C,
        amount: 30,
        expense_id: "e2",
        expenses: { paid_by: USER_A },
      },
    ];

    const balance = calculateUserBalance(USER_A, splits);

    expect(balance.totalOwed).toBe(50);
    expect(balance.totalReceivable).toBe(30);
    expect(balance.netBalance).toBe(-20);
  });

  it("ignores splits where user paid for themselves", () => {
    const splits = [
      {
        user_id: USER_A,
        amount: 100,
        expense_id: "e1",
        expenses: { paid_by: USER_A },
      },
    ];

    const balance = calculateUserBalance(USER_A, splits);

    expect(balance.totalOwed).toBe(0);
    expect(balance.totalReceivable).toBe(0);
    expect(balance.netBalance).toBe(0);
  });
});

describe("calculatePeerBalances", () => {
  it("returns per-peer signed balances", () => {
    const splits = [
      {
        user_id: USER_A,
        amount: 50,
        expense_id: "e1",
        expenses: { paid_by: USER_B },
      },
      {
        user_id: USER_C,
        amount: 30,
        expense_id: "e2",
        expenses: { paid_by: USER_A },
      },
    ];

    const profiles = [
      { user_id: USER_B, full_name: "Bob", username: "bob" },
      { user_id: USER_C, full_name: "Carol", username: "carol" },
    ];

    const peers = calculatePeerBalances(USER_A, splits, profiles);

    expect(peers).toHaveLength(2);
    expect(peers.find((p) => p.userId === USER_B)?.amount).toBe(-50);
    expect(peers.find((p) => p.userId === USER_C)?.amount).toBe(30);
  });

  it("sorts peers with highest receivable first", () => {
    const splits = [
      {
        user_id: USER_A,
        amount: 20,
        expense_id: "e1",
        expenses: { paid_by: USER_B },
      },
      {
        user_id: USER_C,
        amount: 80,
        expense_id: "e2",
        expenses: { paid_by: USER_A },
      },
    ];

    const profiles = [
      { user_id: USER_B, full_name: "Bob", username: "bob" },
      { user_id: USER_C, full_name: "Carol", username: "carol" },
    ];

    const peers = calculatePeerBalances(USER_A, splits, profiles);

    expect(peers[0].userId).toBe(USER_C);
    expect(peers[0].amount).toBe(80);
  });
});
