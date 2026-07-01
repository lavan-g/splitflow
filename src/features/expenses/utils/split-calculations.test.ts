import { describe, expect, it } from "vitest";

import {
  isAmountMatching,
  roundCurrency,
  sumSplitAmounts,
  validateSplitTypeRules,
} from "./split-calculations";

describe("roundCurrency", () => {
  it("rounds to two decimal places", () => {
    expect(roundCurrency(10.556)).toBe(10.56);
    expect(roundCurrency(10.554)).toBe(10.55);
  });
});

describe("sumSplitAmounts", () => {
  it("sums split amounts with rounding", () => {
    const total = sumSplitAmounts([
      { userId: "a", amount: 33.33 },
      { userId: "b", amount: 33.33 },
      { userId: "c", amount: 33.34 },
    ]);
    expect(total).toBe(100);
  });
});

describe("isAmountMatching", () => {
  it("returns true when splits match total within epsilon", () => {
    expect(
      isAmountMatching(100, [
        { userId: "a", amount: 50 },
        { userId: "b", amount: 50 },
      ]),
    ).toBe(true);
  });

  it("returns false when splits do not match total", () => {
    expect(
      isAmountMatching(100, [
        { userId: "a", amount: 40 },
        { userId: "b", amount: 50 },
      ]),
    ).toBe(false);
  });
});

describe("validateSplitTypeRules", () => {
  it("validates equal splits", () => {
    expect(
      validateSplitTypeRules("equal", 300, [
        { userId: "a", amount: 100 },
        { userId: "b", amount: 100 },
        { userId: "c", amount: 100 },
      ]),
    ).toBe(true);
  });

  it("validates percentage splits totalling 100%", () => {
    expect(
      validateSplitTypeRules("percentage", 200, [
        { userId: "a", amount: 100, percentage: 50 },
        { userId: "b", amount: 100, percentage: 50 },
      ]),
    ).toBe(true);
  });

  it("rejects percentage splits not totalling 100%", () => {
    expect(
      validateSplitTypeRules("percentage", 200, [
        { userId: "a", amount: 100, percentage: 40 },
        { userId: "b", amount: 100, percentage: 50 },
      ]),
    ).toBe(false);
  });
});
