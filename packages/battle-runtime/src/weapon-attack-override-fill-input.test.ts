import { describe, expect, test } from "vitest";
import type { BattleFill } from "./battle-state-execution.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
} from "./battle-reducer/battle-runtime-protocol.ts";
import { parseWeaponAttackOverrideFillInput } from "./battle-reducer/weapon-attack-override-fill-input.ts";
import { validateUniqueAttackSightFacts } from "./battle-reducer/attack-fill-set.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { movementFeet } from "./unit-profile-admission.test-support.ts";

type TargetSpatialFactsFill = Extract<
  BattleFill,
  { readonly kind: "targetSpatialFacts" }
>;
type CounterspellTriggerFact = Extract<
  TargetSpatialFactsFill["spatialFacts"][number],
  { readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" }
>;

const spellCastInterruptionReactionTriggerFact: CounterspellTriggerFact = {
  kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
  reactorId: spellTargetId,
  casterId: spellCasterId,
  sourceProcedureRef: battleProcedureExecutionRefForTest(
    "spellCastInterruptionReaction",
  ),
  rangeFeet: movementFeet(60),
};

function reactionFactsFill(
  spatialFacts: TargetSpatialFactsFill["spatialFacts"],
): TargetSpatialFactsFill {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts,
  };
}

describe("weapon attack override fill input", () => {
  test("parses no fills as no spell-cast Reaction facts", () => {
    expect(parseWeaponAttackOverrideFillInput([])).toEqual({
      tag: "parsed",
      input: { reactionFacts: [] },
    });
  });

  test("parses one canonical empty spell-cast Reaction facts fill", () => {
    expect(parseWeaponAttackOverrideFillInput([reactionFactsFill([])])).toEqual(
      {
        tag: "parsed",
        input: { reactionFacts: [] },
      },
    );
  });

  test("projects populated spell-cast Reaction facts", () => {
    expect(
      parseWeaponAttackOverrideFillInput([
        reactionFactsFill([spellCastInterruptionReactionTriggerFact]),
      ]),
    ).toEqual({
      tag: "parsed",
      input: { reactionFacts: [spellCastInterruptionReactionTriggerFact] },
    });
  });

  test("rejects the correct fill kind with a noncanonical hole id", () => {
    expect(
      parseWeaponAttackOverrideFillInput([
        {
          kind: "targetSpatialFacts",
          holeId: ATTACK_TARGET_HOLE_ID,
          spatialFacts: [],
        },
      ]),
    ).toMatchObject({ tag: "invalid" });
  });

  test("rejects a representative non-Reaction fill", () => {
    expect(
      parseWeaponAttackOverrideFillInput([
        {
          kind: "targetChoice",
          holeId: ATTACK_TARGET_HOLE_ID,
          value: spellTargetId,
        },
      ]),
    ).toMatchObject({ tag: "invalid" });
  });

  test("rejects duplicate canonical spell-cast Reaction facts fills", () => {
    expect(
      parseWeaponAttackOverrideFillInput([
        reactionFactsFill([]),
        reactionFactsFill([]),
      ]),
    ).toMatchObject({ tag: "invalid" });
  });

  test("rejects malformed spell-cast Reaction facts", () => {
    expect(
      parseWeaponAttackOverrideFillInput([
        reactionFactsFill([
          {
            kind: "attackAttackerCannotSeeTarget",
            attackerId: spellCasterId,
            targetId: spellTargetId,
          },
        ]),
      ]),
    ).toMatchObject({ tag: "invalid" });
  });

  test("distinguishes reciprocal sight facts while rejecting a duplicate direction", () => {
    const attackerCannotSeeTarget = {
      kind: "attackAttackerCannotSeeTarget" as const,
      attackerId: spellCasterId,
      targetId: spellTargetId,
    };
    const targetCannotSeeAttacker = {
      kind: "attackTargetCannotSeeAttacker" as const,
      attackerId: spellCasterId,
      targetId: spellTargetId,
    };

    expect(
      validateUniqueAttackSightFacts([
        attackerCannotSeeTarget,
        targetCannotSeeAttacker,
      ]),
    ).toBeNull();
    expect(
      validateUniqueAttackSightFacts([
        attackerCannotSeeTarget,
        attackerCannotSeeTarget,
      ]),
    ).toBe(
      "Attack sight facts must contain at most one witness for each direction, attacker, and target.",
    );
  });
});
