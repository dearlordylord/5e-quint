import { expect, test } from "vitest";

import * as scopedFidelity from "./stat-block-scoped-fidelity.ts";

test("exports only the production scoped-fidelity evaluator", () => {
  expect(Object.keys(scopedFidelity).sort()).toEqual([
    "evaluateSrdStatBlockScopedFidelity",
  ]);
});
