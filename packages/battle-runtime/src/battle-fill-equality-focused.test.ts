import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { NonNegativeInteger, movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  battleContinuationFillEquals,
  battleFillPrefixAccumulated,
  type BattleContinuationComparableFill,
} from "./battle-reducer/battle-fill-equality.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
} from "./identity.ts";
import type {
  BattleOpportunityAttackThreat,
  BattleFill,
} from "./battle-state-execution.ts";

const reactorId = combatantId("equality-reactor");
const targetId = combatantId("equality-target");
const procedureRef = battleAttackProcedureExecutionRef(
  battleAttackExecutionScopeRef(
    battleId("battle-fill-equality-focused"),
    reactorId,
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);
const selection = {
  procedureRef,
  attackAbility: "str",
  attackDamageType: "slashing",
} as const;

function movementFill(
  hole: string,
  threats: readonly BattleOpportunityAttackThreat[],
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: holeId(hole),
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(5),
      provokedOpportunityAttacks: threats,
    },
  };
}

function targetChoiceFill(
  hole: string,
  target: typeof targetId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return { kind: "targetChoice", holeId: holeId(hole), value: target };
}

describe("battle fill equality focused boundary", () => {
  test("compares movement threats by identity and trigger distance", () => {
    const near = {
      reactorId,
      distanceFeet: movementFeet(5),
      ...selection,
    } satisfies BattleOpportunityAttackThreat;
    const far = { ...near, distanceFeet: movementFeet(10) };
    const reordered = movementFill("movement", [far, near]);
    const original = movementFill("movement", [near, far]);

    expect(battleContinuationFillEquals(original, reordered)).toBe(true);
    expect(
      battleContinuationFillEquals(
        original,
        movementFill("movement", [{ ...near, distanceFeet: movementFeet(15) }]),
      ),
    ).toBe(false);
  });

  test("preserves ordered hole prefixes for retries and rejection checks", () => {
    const first = targetChoiceFill("first", targetId);
    const second = targetChoiceFill("second", targetId);
    const ordered = [
      first,
      second,
    ] satisfies readonly BattleContinuationComparableFill[];
    const reversed = [
      second,
      first,
    ] satisfies readonly BattleContinuationComparableFill[];

    expect(battleContinuationFillEquals(first, { ...first })).toBe(true);
    expect(battleFillPrefixAccumulated([first], ordered)).toBe(true);
    expect(battleFillPrefixAccumulated(ordered, ordered)).toBe(true);
    expect(battleFillPrefixAccumulated(ordered, reversed)).toBe(false);
    expect(battleFillPrefixAccumulated(reversed, ordered)).toBe(false);
    expect(battleFillPrefixAccumulated(ordered, [first])).toBe(false);
  });
});
