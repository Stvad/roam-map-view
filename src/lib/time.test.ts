import { afterEach, describe, expect, it, vi } from "vitest";
import { nowMinusHours, parseMatrixTimestamp, toLocalDatetimeValue } from "./time";

describe("parseMatrixTimestamp", () => {
  it("parses matrix timestamp format", () => {
    const expected = new Date("2026-02-24T11:09:03").getTime();
    expect(parseMatrixTimestamp("24/02/2026 11:09:03")).toBe(expected);
  });

  it("returns null for invalid format", () => {
    expect(parseMatrixTimestamp("2026-02-24 11:09:03")).toBeNull();
  });
});

describe("time helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats datetime-local value", () => {
    const d = new Date(2026, 1, 24, 11, 9, 0);
    expect(toLocalDatetimeValue(d)).toBe("2026-02-24T11:09");
  });

  it("computes relative time from now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00"));
    expect(nowMinusHours(3).getTime()).toBe(new Date("2026-02-24T09:00:00").getTime());
  });
});
