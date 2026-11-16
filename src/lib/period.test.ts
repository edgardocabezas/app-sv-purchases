import { describe, expect, it } from "vitest";
import { previousPeriod } from "./period";

describe("previousPeriod", () => {
  it("maps November to October of the same year", () => {
    expect(previousPeriod(new Date(2026, 10, 15))).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it("maps January to December of the previous year", () => {
    expect(previousPeriod(new Date(2026, 0, 1))).toEqual({
      year: 2025,
      month: 12,
    });
  });
});
