import { describe, expect, test } from "vitest";

import type { SupportedSpellInvocation } from "../battle-reducer.ts";
import { isTargetListSpellInvocation } from "./spells-invocation-guards.ts";

type GuardRelevantInvocationShape = {
  readonly procedure: SupportedSpellInvocation["procedure"];
  readonly targeting?: { readonly kind: string };
};

function guardRelevantInvocation(
  invocation: GuardRelevantInvocationShape,
): SupportedSpellInvocation {
  // Cast justification: these tests construct only the structural
  // `targeting.kind` projection read by isTargetListSpellInvocation.
  return invocation as SupportedSpellInvocation;
}

describe("spell invocation guards", () => {
  test("isTargetListSpellInvocation derives classification from targeting shape", () => {
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({
          procedure: "levitatedCreature",
          targeting: { kind: "targetList" },
        }),
      ),
    ).toBe(true);
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({ procedure: "makeStable" }),
      ),
    ).toBe(false);
  });

  test("isTargetListSpellInvocation preserves mixed-profile targeting shape checks", () => {
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({
          procedure: "scalarBuff",
          targeting: { kind: "self" },
        }),
      ),
    ).toBe(false);
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({
          procedure: "scalarBuff",
          targeting: { kind: "targetList" },
        }),
      ),
    ).toBe(true);
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({
          procedure: "saveGatedCondition",
          targeting: { kind: "pointOriginSphere" },
        }),
      ),
    ).toBe(false);
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({
          procedure: "saveGatedCondition",
          targeting: { kind: "targetList" },
        }),
      ),
    ).toBe(true);
  });
});
