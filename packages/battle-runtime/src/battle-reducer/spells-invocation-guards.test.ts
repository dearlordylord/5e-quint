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
  // Cast justification: isTargetListSpellInvocation is deliberately a
  // registry/profile classifier over procedure plus targeting.kind, so these
  // tests construct only the fields that classifier is allowed to read.
  return invocation as SupportedSpellInvocation;
}

describe("spell invocation guards", () => {
  test("isTargetListSpellInvocation derives procedure classification from registered profiles", () => {
    expect(
      isTargetListSpellInvocation(
        guardRelevantInvocation({ procedure: "levitatedCreature" }),
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
