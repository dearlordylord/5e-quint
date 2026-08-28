import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-BLUR blur
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-blur-attack-roll-defense
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import {
  blurUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  breakBattleConcentration,
  combatantId,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleRuntimeSession,
  BattleTargetSpatialFact,
  CombatantId,
} from "./unit-profile-admission.test-support.ts";

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
        sourceProcedureRef: expect.any(String),
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "blurred",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: spellCasterId,
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
          },
        }),
      ],
    });

    const attackRoll = attackerAttackRollHole({
      session: battleRuntimeSessionForTest({ ...state, state: cast.state }),
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
        session: battleRuntimeSessionForTest({ ...state, state: cast.state }),
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
      session: battleRuntimeSessionForTest({ ...state, state: cast.state }),
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
    expect(attackRoll.rollMode).toBe("normal");
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
      session: battleRuntimeSessionForTest({
        ...state,
        state: concentrationBroken,
      }),
      attackerId,
      targetId: spellCasterId,
    });
    expect(attackRoll.rollMode).toBeUndefined();
  });

  test("blur recast replaces only its own defense effect", () => {
    const attackerId = combatantId("unit-profile-blur-recast-attacker");
    const base = spellBattle({
      preparedSpells: [spellRecord(blurUnitId)],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      statBlockTargets: [
        {
          combatantId: attackerId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 19,
        },
      ],
    });
    const firstCast = castBlur(base);
    const firstEffect = requireCombatant(
      firstCast.state,
      spellCasterId,
    ).activeEffects.find((effect) => effect.kind === "blurred");
    if (firstEffect?.kind !== "blurred") {
      throw new Error("Expected the first admitted Blur occurrence.");
    }
    const attackerTurn = endTurn({
      state: firstCast.state,
      actorId: spellCasterId,
    });
    if (attackerTurn.tag !== "resolved") {
      throw new Error("Expected Blur caster turn to end.");
    }
    const casterTurn = endTurn({
      state: attackerTurn.state,
      actorId: attackerId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected Blur attacker turn to end.");
    }
    const nextCasterTurn = endTurn({
      state: casterTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected remaining Blur target turn to end.");
    }
    const recastSession = battleRuntimeSessionForTest({
      ...base,
      state: nextCasterTurn.state,
    });
    const act = spellAct({
      session: recastSession,
      spellId: blurUnitId,
      slotLevel: 2,
    });

    const cast = resolveBattleSubject({
      state: recastSession.state,
      subject: act.subject,
      fills: [],
    });
    expect(cast).toMatchObject({ tag: "resolved" });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Blur recast to resolve.");
    }
    const effects = requireCombatant(cast.state, spellCasterId).activeEffects;
    expect(effects).toHaveLength(1);
    expect(effects[0]?.effectRef).not.toBe(firstEffect.effectRef);
    expect(effects).toContainEqual(
      expect.objectContaining({
        kind: "blurred",
        sourceProcedureRef: act.subject.procedureRef,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      }),
    );
  });
});

function blurBattle(attackerId: CombatantId): BattleRuntimeSession {
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
  session: BattleRuntimeSession,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const act = spellAct({ session, spellId: blurUnitId, slotLevel: 2 });
  expect(act.initialHoles).toEqual([]);
  expect(battleActSpellPresentation(act)?.invocation).toMatchObject({
    tag: "spellSlot",
    spellId: blurUnitId,
    slotLevel: 2,
    procedure: "blurAttackRollDefense",
  });
  const result = resolveBattleSubject({
    state: session.state,
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
  readonly session: BattleRuntimeSession;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly extraFacts?: readonly BattleTargetSpatialFact[];
}): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const attackerTurn = endTurn({
    state: input.session.state,
    actorId: spellCasterId,
  });
  expect(attackerTurn).toMatchObject({ tag: "resolved" });
  if (attackerTurn.tag !== "resolved") {
    throw new Error("Expected to advance to Blur attacker turn.");
  }

  const attackerSession = battleRuntimeSessionForTest({
    ...input.session,
    state: attackerTurn.state,
  });
  const attack = statBlockAttackAct(
    attackerSession,
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
  const base = attackTargetFill(input.hole, input.attackerId, input.targetId);
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
