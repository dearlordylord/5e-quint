// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-BLUR blur
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-blur-attack-roll-defense
import { describe, expect, test } from "vitest";
import {
  blurUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  combatantId,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleState,
  BattleTargetSpatialFact,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";

type BlurBypassSense = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "attackAttackerPerceivesBlurredTargetWithSense" }
>["sense"];

describe("L12G-SPELL-BLUR deterministic Blur admission", () => {
  test("blur casts as a self concentration effect and imposes attack Disadvantage against the caster", () => {
    const attackerId = combatantId("unit-profile-blur-attacker");
    const state = blurBattle(attackerId);
    const cast = castBlur(state);

    expect(cast.state.combatants.get(spellCasterId)).toMatchObject({
      concentration: {
        sourceSpellId: blurUnitId,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "blurred",
          sourceSpellId: blurUnitId,
          sourceCombatantId: spellCasterId,
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
          },
        }),
      ],
    });

    const attackRoll = attackerAttackRollHole({
      state: cast.state,
      attackerId,
      targetId: spellCasterId,
    });
    expect(attackRoll.rollMode).toBe("disadvantage");
  });

  test.each(["blindsight", "truesight"] as const)(
    "blur attack Disadvantage is bypassed when the attacker perceives the caster with %s",
    (sense: BlurBypassSense) => {
      const attackerId = combatantId(`unit-profile-blur-${sense}-attacker`);
      const state = blurBattle(attackerId);
      const cast = castBlur(state);

      const attackRoll = attackerAttackRollHole({
        state: cast.state,
        attackerId,
        targetId: spellCasterId,
        extraFacts: [blurBypassFact(attackerId, spellCasterId, sense)],
      });
      expect(attackRoll.rollMode).toBeUndefined();
    },
  );

  test("blur Disadvantage cancels with another attack Advantage source", () => {
    const attackerId = combatantId("unit-profile-blur-cancel-attacker");
    const state = blurBattle(attackerId);
    const cast = castBlur(state);

    const attackRoll = attackerAttackRollHole({
      state: cast.state,
      attackerId,
      targetId: spellCasterId,
      extraFacts: [
        {
          kind: "attackTargetCannotSeeAttacker",
          attackerId,
          targetId: spellCasterId,
        },
      ],
    });
    expect(attackRoll.rollMode).toBeUndefined();
  });

  test("blur attack-roll defense ends when Concentration is broken", () => {
    const attackerId = combatantId("unit-profile-blur-concentration-attacker");
    const state = blurBattle(attackerId);
    const cast = castBlur(state);

    const concentrationBroken = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellCasterId).activeEffects,
    ).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ kind: "blurred" }),
      ]),
    );

    const attackRoll = attackerAttackRollHole({
      state: concentrationBroken,
      attackerId,
      targetId: spellCasterId,
    });
    expect(attackRoll.rollMode).toBeUndefined();
  });
});

function blurBattle(attackerId: CombatantId): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(blurUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    statBlockTargets: [
      {
        combatantId: attackerId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 19,
      },
    ],
  });
}

function castBlur(
  state: BattleState,
): Extract<ReturnType<typeof resolveBattleSubject>, { readonly tag: "resolved" }> {
  const act = spellAct({ state, spellId: blurUnitId, slotLevel: 2 });
  expect(act.initialHoles).toEqual([]);
  expect(act.subject.invocation).toMatchObject({
    tag: "spellSlot",
    spellId: blurUnitId,
    slotLevel: 2,
    procedure: "blurAttackRollDefense",
  });
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected Blur to resolve.");
  }
  return result;
}

function attackerAttackRollHole(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly extraFacts?: readonly BattleTargetSpatialFact[];
}): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const attackerTurn = endTurn({
    state: input.state,
    actorId: spellCasterId,
  });
  expect(attackerTurn).toMatchObject({ tag: "resolved" });
  if (attackerTurn.tag !== "resolved") {
    throw new Error("Expected to advance to Blur attacker turn.");
  }

  const attack = statBlockAttackAct(
    attackerTurn.state,
    input.attackerId,
    "Scimitar",
  );
  const target = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [],
    }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [
        attackTargetFillWithFacts({
          hole: target,
          attackerId: input.attackerId,
          targetId: input.targetId,
          extraFacts: input.extraFacts ?? [],
        }),
      ],
    }),
    "attackRoll",
  );
}

function attackTargetFillWithFacts(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "targetChoice" }>;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly extraFacts: readonly BattleTargetSpatialFact[];
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = attackTargetFill(
    input.hole,
    input.attackerId,
    input.targetId,
    "Scimitar",
  );
  return {
    ...base,
    spatialFacts: [...(base.spatialFacts ?? []), ...input.extraFacts],
  };
}

function blurBypassFact(
  attackerId: CombatantId,
  targetId: CombatantId,
  sense: BlurBypassSense,
): BattleTargetSpatialFact {
  return {
    kind: "attackAttackerPerceivesBlurredTargetWithSense",
    attackerId,
    targetId,
    sense,
  };
}
