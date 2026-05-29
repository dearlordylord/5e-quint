import { describe, expect, test } from "vitest";

import type { SupportedSpellInvocation } from "../battle-reducer.ts";
import { isReadiedSpellInvocation } from "./spells-discovery.ts";

type ReadiedGuardRelevantInvocationShape = {
  readonly procedure: SupportedSpellInvocation["procedure"];
  readonly damage?: { readonly kind: string };
};

function readiedGuardRelevantInvocation(
  invocation: ReadiedGuardRelevantInvocationShape,
): SupportedSpellInvocation {
  // Cast justification: isReadiedSpellInvocation is a registry/profile
  // classifier over procedure plus the spellAttackDamage damage-choice state.
  return invocation as SupportedSpellInvocation;
}

describe("spell discovery readied spell classification", () => {
  test("isReadiedSpellInvocation derives procedure classification from registered profiles", () => {
    expect(
      isReadiedSpellInvocation(
        readiedGuardRelevantInvocation({ procedure: "saveGatedDamage" }),
      ),
    ).toBe(true);
    expect(
      isReadiedSpellInvocation(
        readiedGuardRelevantInvocation({ procedure: "makeStable" }),
      ),
    ).toBe(false);
  });

  test("isReadiedSpellInvocation rejects unsupported profile procedures that previously called readiedSpellAct", () => {
    expect(
      isReadiedSpellInvocation(
        readiedGuardRelevantInvocation({ procedure: "scalarBuff" }),
      ),
    ).toBe(false);
    expect(
      isReadiedSpellInvocation(
        readiedGuardRelevantInvocation({
          procedure: "abilityD20TestRollModeSaveGate",
        }),
      ),
    ).toBe(false);
  });

  test("isReadiedSpellInvocation requires spellAttackDamage to have a selected damage payload", () => {
    expect(
      isReadiedSpellInvocation(
        readiedGuardRelevantInvocation({
          procedure: "spellAttackDamage",
          damage: { kind: "sorcerousBurstDamageTypeChoice" },
        }),
      ),
    ).toBe(false);
    expect(
      isReadiedSpellInvocation(
        readiedGuardRelevantInvocation({
          procedure: "spellAttackDamage",
          damage: { kind: "selectedSorcerousBurstDamage" },
        }),
      ),
    ).toBe(true);
  });
});
