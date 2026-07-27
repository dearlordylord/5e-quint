import { expect, test } from "vitest";

import {
  elapsedTimeTicks,
  formatElapsedTimeTicks,
} from "./elapsed-time-algebra.ts";

test("elapsed-time compatibility boundary exposes the canonical runtime operations", () => {
  expect(formatElapsedTimeTicks(elapsedTimeTicks(10))).toBe("1 minute");
});
