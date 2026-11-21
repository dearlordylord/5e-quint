// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
  type HeroicInspiration,
} from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import { Schema } from "effect";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { BattleFillSchema } from "./battle-reducer/battle-codecs.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
import { D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE } from "./battle-reducer/d20-test-natural-one-reroll.ts";
import {
  HEROIC_INSPIRATION_REROLL_STACKING_MESSAGE,
  HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
} from "./battle-reducer/heroic-inspiration-reroll.ts";
import { battleResolutionHolesForTest } from "./battle-runtime.test-support.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  battleFrontierInterruptDecisionForState,
  characterAttackSubjectForTest,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  goblinId,
  interruptDecisionFill,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testShortswordAttack,
  wizardSpellcasting,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
} from "./battle-state-execution.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { CombatantId } from "./identity.ts";
import {
  battleId,
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { movementFeet } from "@dnd/shared/types";

type AttackRollValue = Extract<
  BattleFill,
  { readonly kind: "attackRoll" }
>["value"];

describe("Heroic Inspiration reroll on attack rolls", () => {
  test("a character without Heroic Inspiration is not offered the reroll", () => {
    const state = fighterBattle(NO_HEROIC_INSPIRATION);
    const { subject, targetSelection, roll } = longswordRollHole(state);

    const hit = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
      ],
    });

    expect(holeKinds(hit)).toEqual(["rolledDice"]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            total: 20,
            naturalD20: 15,
            heroicInspirationReroll: declineReroll(),
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    });
  });

  test("a character with Heroic Inspiration is asked again after the attack roll", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    expect(roll).not.toHaveProperty("heroicInspirationRerolls");

    const asked = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(roll, { total: 3, naturalD20: 2 }),
      ],
    });

    expect(requireHole(asked, "attackRoll")).toMatchObject({
      kind: "attackRoll",
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    expect(requireHole(asked, "attackRoll")).not.toHaveProperty(
      "d20TestNaturalOneRerolls",
    );
  });

  test("declining keeps the original roll and the Heroic Inspiration", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);

    const missed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            total: 3,
            naturalD20: 2,
            heroicInspirationReroll: declineReroll(),
          }),
        ],
      }),
    );

    expect(goblinHp(missed.state)).toBe(goblinHp(state));
    expect(heroicInspiration(missed.state, fighterId)).toEqual(
      HEROIC_INSPIRATION_AVAILABLE,
    );
  });

  test("rerolling uses the new roll and spends Heroic Inspiration", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    const rerolledRoll = attackRollFill(roll, {
      total: 3,
      naturalD20: 2,
      heroicInspirationReroll: reroll({ total: 20, naturalD20: 15 }),
    });

    const rerolledHit = resolveBattleSubject({
      state,
      subject,
      fills: [targetSelection, rerolledRoll],
    });
    expect(holeKinds(rerolledHit)).toEqual(["rolledDice"]);
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          rerolledRoll,
          damageRollFill(requireHole(rerolledHit, "rolledDice"), 4),
        ],
      }),
    );

    expect(goblinHp(hit.state)).toBeLessThan(goblinHp(state));
    expect(heroicInspiration(hit.state, fighterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );

    const rerolledMiss = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            total: 20,
            naturalD20: 15,
            heroicInspirationReroll: reroll({ total: 3, naturalD20: 2 }),
          }),
        ],
      }),
    );
    expect(goblinHp(rerolledMiss.state)).toBe(goblinHp(state));
    expect(heroicInspiration(rerolledMiss.state, fighterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("under Advantage the reroll replaces one chosen die, whatever its face", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    const rolledD20s = { first: 2, second: 4 };

    const asked = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(roll, {
          total: 9,
          naturalD20: 4,
          rollMode: "advantage",
          rolledD20s,
        }),
      ],
    });
    expect(requireHole(asked, "attackRoll")).toHaveProperty(
      "heroicInspirationRerolls",
    );

    const replacedFirstDie = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(roll, {
          total: 9,
          naturalD20: 4,
          rollMode: "advantage",
          rolledD20s,
          heroicInspirationReroll: rerollRolledDie({
            die: "first",
            naturalD20: 18,
            total: 23,
          }),
        }),
      ],
    });
    expect(holeKinds(replacedFirstDie)).toEqual(["rolledDice"]);

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            total: 9,
            naturalD20: 4,
            rollMode: "advantage",
            rolledD20s,
            heroicInspirationReroll: reroll({ total: 23, naturalD20: 18 }),
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("a natural 1 offers both rerolls, and only one of them can be taken", () => {
    const state = halflingFighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    const naturalOne = { total: 2, naturalD20: 1 } as const;

    const asked = resolveBattleSubject({
      state,
      subject,
      fills: [targetSelection, attackRollFill(roll, naturalOne)],
    });
    expect(requireHole(asked, "attackRoll")).toMatchObject({
      d20TestNaturalOneRerolls: [
        { effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND },
      ],
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            ...naturalOne,
            d20TestNaturalOneReroll: {
              kind: "decline",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      frontier: {
        holes: [
          expect.objectContaining({
            kind: "attackRoll",
            d20TestNaturalOneRerolls: [expect.anything()],
            heroicInspirationRerolls: [expect.anything()],
          }),
        ],
      },
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            ...naturalOne,
            d20TestNaturalOneReroll: naturalOneReroll({
              total: 20,
              naturalD20: 15,
            }),
            heroicInspirationReroll: reroll({ total: 20, naturalD20: 15 }),
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE,
    });

    const luckOnly = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            ...naturalOne,
            d20TestNaturalOneReroll: naturalOneReroll({
              total: 3,
              naturalD20: 2,
            }),
            heroicInspirationReroll: declineReroll(),
          }),
        ],
      }),
    );
    expect(heroicInspiration(luckOnly.state, fighterId)).toEqual(
      HEROIC_INSPIRATION_AVAILABLE,
    );

    const inspirationOnly = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            ...naturalOne,
            d20TestNaturalOneReroll: {
              kind: "decline",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            },
            heroicInspirationReroll: reroll({ total: 3, naturalD20: 2 }),
          }),
        ],
      }),
    );
    expect(heroicInspiration(inspirationOnly.state, fighterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("the Heroic Inspiration stacking message names its own source", () => {
    expect(HEROIC_INSPIRATION_REROLL_STACKING_MESSAGE).toContain(
      "Heroic Inspiration",
    );
  });

  test("a Spell Attack offers the caster's Heroic Inspiration and spends it", () => {
    const rayOfFrost = spellRecord("ray_of_frost");
    const session = sessionWithHeroicInspiration(
      spellBattle({
        cantrips: [rayOfFrost],
        casterClassLevels: [{ className: "sorcerer", level: 5 }],
      }),
      spellCasterId,
    );
    const act = spellAct({ session, spellId: rayOfFrost.id });
    const targetSelection = spellTargetFill(
      requireHole(
        resolveBattleSubject({
          state: session.state,
          subject: act.subject,
          fills: [],
        }),
        "targetChoice",
      ),
      rayOfFrost.id,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );
    const resolveRoll = (value: Parameters<typeof attackRollFill>[1]) =>
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetSelection, attackRollFill(attack, value)],
      });

    expect(
      requireHole(resolveRoll({ total: 4, naturalD20: 2 }), "attackRoll"),
    ).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });

    const rerolledHit = resolveRoll({
      total: 4,
      naturalD20: 2,
      heroicInspirationReroll: reroll({ total: 25, naturalD20: 20 }),
    });
    expect(holeKinds(rerolledHit)).toEqual(["rolledDice"]);

    const rerolledMiss = requireResolved(
      resolveRoll({
        total: 4,
        naturalD20: 2,
        heroicInspirationReroll: reroll({ total: 5, naturalD20: 3 }),
      }),
    );
    expect(heroicInspiration(rerolledMiss.state, spellCasterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );

    const declinedMiss = requireResolved(
      resolveRoll({
        total: 4,
        naturalD20: 2,
        heroicInspirationReroll: declineReroll(),
      }),
    );
    expect(heroicInspiration(declinedMiss.state, spellCasterId)).toEqual(
      HEROIC_INSPIRATION_AVAILABLE,
    );
  });

  test("after a reaction, only the roll that spent Heroic Inspiration keeps its reroll", () => {
    const scorchingRay = spellRecord("scorching_ray");
    const session = sessionWithHeroicInspiration(
      spellBattle({
        preparedSpells: [scorchingRay],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        targetSpellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("shield")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      spellCasterId,
    );
    const act = spellAct({
      session,
      spellId: scorchingRay.id,
      slotLevel: 2,
    });
    const targetSelections = act.initialHoles.flatMap((hole) =>
      hole.kind === "targetChoice"
        ? [spellTargetFill(hole, scorchingRay.id, spellCasterId, spellTargetId)]
        : [],
    );
    const firstRay = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: targetSelections,
      }),
      "attackRoll",
    );
    const firstRayRerolled = attackRollFill(firstRay, {
      total: 4,
      naturalD20: 2,
      heroicInspirationReroll: reroll({ total: 14, naturalD20: 12 }),
    });
    const awaitingShield = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [...targetSelections, firstRayRerolled],
    });
    if (awaitingShield.tag !== "needsHoles") {
      throw new Error("Expected the rerolled ray's hit to open Shield.");
    }
    const decision = battleFrontierInterruptDecisionForState(
      awaitingShield.state,
    );
    const shield = decision?.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "castTriggeredReactionSpell",
    );
    if (
      decision === null ||
      decision === undefined ||
      shield?.kind !== "nestedProcedure" ||
      shield.subject.command !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected the Shield reaction choice.");
    }
    const afterShield = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(decision.decisionHole, {
        kind: "resolve",
        responderId: spellTargetId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: shield.subject.procedureRef,
          fills: [],
        },
      }),
    });
    if (afterShield.tag !== "needsHoles") {
      throw new Error("Expected the second ray's attack roll after Shield.");
    }
    const secondRay = requireHole(afterShield, "attackRoll");
    expect(secondRay.holeId).not.toBe(firstRay.holeId);
    expect(secondRay).not.toHaveProperty("heroicInspirationRerolls");
    expect(heroicInspiration(afterShield.state, spellCasterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
    const resolveSecondRay = (
      value: Parameters<typeof attackRollFill>[1],
    ): BattleResolutionResult =>
      resolveBattleSubject({
        state: afterShield.state,
        subject: act.subject,
        fills: [
          ...targetSelections,
          firstRayRerolled,
          attackRollFill(secondRay, value),
        ],
      });

    expect(
      resolveSecondRay({
        total: 4,
        naturalD20: 2,
        heroicInspirationReroll: reroll({ total: 20, naturalD20: 18 }),
      }),
    ).toMatchObject({
      tag: "invalid",
      message: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    });
    expect(holeKinds(resolveSecondRay({ total: 4, naturalD20: 2 }))).toEqual([
      "attackRoll",
    ]);
  });

  test("an Opportunity Attack offers the reactor's Heroic Inspiration and spends it", () => {
    const state = startBattleRight({
      battleId: battleId("heroic-inspiration-opportunity-reactor"),
      combatants: [
        characterSeed({ initiative: 20, attack: testShortswordAttack() }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic Inspired Reactor",
          initiative: 10,
          attack: testShortswordAttack(),
          heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        }),
      ],
    });
    const opportunity = startOpportunityAttack(state, "Shortsword");

    const asked = resolveBattleSubject({
      state: opportunity.state,
      subject: opportunity.subject,
      fills: [
        attackRollFill(opportunity.attackRoll, { total: 3, naturalD20: 2 }),
      ],
    });
    expect(requireHole(asked, "attackRoll")).toHaveProperty(
      "heroicInspirationRerolls",
    );

    const rerolledMiss = requireResolved(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [
          attackRollFill(opportunity.attackRoll, {
            total: 3,
            naturalD20: 2,
            heroicInspirationReroll: reroll({ total: 4, naturalD20: 3 }),
          }),
        ],
      }),
    );
    expect(heroicInspiration(rerolledMiss.state, goblinId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("continuation fill equality compares the Heroic Inspiration decision", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { roll } = longswordRollHole(state);
    const declined = attackRollFill(roll, {
      total: 3,
      naturalD20: 2,
      heroicInspirationReroll: declineReroll(),
    });
    const rerolled = attackRollFill(roll, {
      total: 3,
      naturalD20: 2,
      heroicInspirationReroll: reroll({ total: 20, naturalD20: 15 }),
    });

    expect(battleContinuationFillEquals(declined, { ...declined })).toBe(true);
    expect(battleContinuationFillEquals(declined, rerolled)).toBe(false);
    expect(
      battleContinuationFillEquals(
        declined,
        attackRollFill(roll, { total: 3, naturalD20: 2 }),
      ),
    ).toBe(false);
  });

  test("the attack roll fill codec keeps the Heroic Inspiration decision", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { roll } = longswordRollHole(state);
    const fill = attackRollFill(roll, {
      total: 9,
      naturalD20: 4,
      rollMode: "advantage",
      rolledD20s: { first: 2, second: 4 },
      heroicInspirationReroll: rerollRolledDie({
        die: "first",
        naturalD20: 18,
        total: 23,
      }),
    });

    const encoded = Schema.encodeSync(BattleFillSchema)(fill);
    expect(Schema.decodeUnknownSync(BattleFillSchema)(encoded)).toEqual(fill);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleFillSchema)({
          ...fill,
          value: {
            ...fill.value,
            heroicInspirationReroll: {
              kind: "decline",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            },
          },
        }),
      ),
    ).toBe(true);
  });
});

function sessionWithHeroicInspiration(
  session: BattleRuntimeSession,
  id: CombatantId,
): BattleRuntimeSession {
  const creature = session.state.combatants.get(id);
  if (creature?.origin.kind !== "character") {
    throw new Error("Expected a character combatant.");
  }
  const combatants = new Map(session.state.combatants).set(id, {
    ...creature,
    origin: {
      ...creature.origin,
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    },
  });
  return battleRuntimeSessionForTest({
    ...session,
    state: { ...session.state, combatants },
  });
}

function fighterBattle(inspiration: HeroicInspiration): BattleState {
  return startBattleRight({
    battleId: battleId("heroic-inspiration-attack-roll"),
    combatants: [
      characterSeed({ initiative: 20, heroicInspiration: inspiration }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function halflingFighterBattle(inspiration: HeroicInspiration): BattleState {
  const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  return startBattleRight({
    battleId: battleId("heroic-inspiration-halfling-attack-roll"),
    combatants: [
      characterSeed({
        initiative: 20,
        heroicInspiration: inspiration,
        characterUnitRefs: [unitRef.success],
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function longswordRollHole(state: BattleState) {
  const subject = fighterAttackSubject(state, "Longsword");
  const targetSelection = targetFill(
    requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    ),
    goblinId,
  );
  const roll = requireHole(
    resolveBattleSubject({ state, subject, fills: [targetSelection] }),
    "attackRoll",
  );
  return { subject, targetSelection, roll };
}

function startOpportunityAttack(state: BattleState, attackName: string) {
  const subject = {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "move",
  } satisfies BattleSubject;
  const movement = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "movement",
  );
  const awaitingReaction = resolveBattleSubject({
    state,
    subject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          {
            reactorId: goblinId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(
              characterAttackSubjectForTest(state, goblinId, attackName),
            ),
          },
        ],
      }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Opportunity Attack interrupt.");
  }
  const decision = battleFrontierInterruptDecisionForState(
    awaitingReaction.state,
  );
  if (decision === null || decision === undefined) {
    throw new Error("Expected Opportunity Attack decision.");
  }
  const choice = reactionChoiceWithSubject(decision.choices);
  const startedReaction = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(decision.decisionHole, {
      kind: "resolve",
      responderId: goblinId,
      choice: opportunityAttackProcedureSelectionForTest(choice),
    }),
  });
  if (startedReaction.tag !== "needsHoles") {
    throw new Error("Expected Opportunity Attack roll hole.");
  }
  return {
    state: startedReaction.state,
    subject: choice.subject,
    attackRoll: requireHole(startedReaction, "attackRoll"),
  };
}

function holeKinds(
  result: BattleResolutionResult,
): readonly BattleHole["kind"][] {
  return result.tag === "needsHoles"
    ? battleResolutionHolesForTest(result).map((hole) => hole.kind)
    : [];
}

function goblinHp(state: BattleState): number {
  return Number(state.combatants.get(goblinId)?.hp);
}

function heroicInspiration(
  state: BattleState,
  id: CombatantId,
): HeroicInspiration | undefined {
  const creature = state.combatants.get(id);
  return creature?.origin.kind === "character"
    ? creature.origin.heroicInspiration
    : undefined;
}

function reroll(input: {
  readonly total: number;
  readonly naturalD20: number;
}): NonNullable<AttackRollValue["heroicInspirationReroll"]> {
  return {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      total: input.total,
      d20TestRoll: {
        tag: "single",
        naturalD20: DieRollResult(input.naturalD20),
      },
    },
  };
}

function naturalOneReroll(input: {
  readonly total: number;
  readonly naturalD20: number;
}): NonNullable<AttackRollValue["d20TestNaturalOneReroll"]> {
  return {
    kind: "reroll",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      total: input.total,
      d20TestRoll: {
        tag: "single",
        naturalD20: DieRollResult(input.naturalD20),
      },
    },
  };
}

function rerollRolledDie(input: {
  readonly die: "first" | "second";
  readonly naturalD20: number;
  readonly total: number;
}): NonNullable<AttackRollValue["heroicInspirationReroll"]> {
  return {
    kind: "rerollRolledDie",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      die: input.die,
      result: {
        total: input.total,
        d20TestRoll: {
          tag: "multiple",
          first: DieRollResult(input.naturalD20),
          second: DieRollResult(input.naturalD20),
          rollMode: "advantage",
        },
      },
    },
  };
}

function declineReroll(): NonNullable<
  AttackRollValue["heroicInspirationReroll"]
> {
  return { kind: "decline", effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND };
}
