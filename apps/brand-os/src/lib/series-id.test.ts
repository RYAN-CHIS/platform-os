import assert from "node:assert/strict";
import test from "node:test";
import { validateSeriesId } from "./series-id";

test("validateSeriesId rejects missing and invalid values", () => {
  for (const value of [undefined, null, "", "   ", "abc", 0, "0", -1, "-1", 1.5, "1.5"]) {
    assert.deepEqual(validateSeriesId(value), {
      valid: false,
      error: value === undefined || value === null || (typeof value === "string" && value.trim() === "")
        ? "缺少 seriesId"
        : "seriesId 必须为正整数",
    });
  }
});

test("validateSeriesId accepts positive integers", () => {
  assert.deepEqual(validateSeriesId(1), { valid: true, seriesId: 1 });
  assert.deepEqual(validateSeriesId("42"), { valid: true, seriesId: 42 });
});
