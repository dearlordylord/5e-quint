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
import { D20_TEST_SOURCE_REPEATED_MESSAGE } from "./battle-reducer/d20-test-decision-sequence.ts";
import { D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE } from "./battle-reducer/d20-test-natural-one-reroll.ts";
import { HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE } from "./battle-reducer/heroic-inspiration-reroll.ts";
import { battleResolutionHolesForTest } from "./battle-runtime.test-support.ts";
import {
  PENDING_FRONTIER_RESUBMISSION_CHANGED_MESSAGE,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
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
  startBattleSessionRight,
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
  type BattleD20TestNaturalOneRerollDecision,
  type BattleFill,
  type BattleHeroicInspirationRerollDecision,
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
            d20TestRerolls: [declineReroll()],
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
            d20TestRerolls: [declineReroll()],
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
      d20TestRerolls: [reroll({ total: 16, naturalD20: 15 })],
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
            d20TestRerolls: [reroll({ total: 7, naturalD20: 2 })],
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
          d20TestRerolls: [
            rerollRolledDie({
              die: "first",
              first: 18,
              second: 4,
              total: 23,
            }),
          ],
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
            d20TestRerolls: [reroll({ total: 23, naturalD20: 18 })],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("a natural 1 offers both rerolls, and the roller decides in turn (A55)", () => {
    const state = halflingFighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    const naturalOne = { total: 2, naturalD20: 1 } as const;
    const resolveWith = (
      d20TestRerolls: NonNullable<AttackRollValue["d20TestRerolls"]>,
    ) =>
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, { ...naturalOne, d20TestRerolls }),
        ],
      });

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

    const afterLuckDeclined = requireHole(
      resolveWith([declineNaturalOneReroll()]),
      "attackRoll",
    );
    expect(afterLuckDeclined).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    expect(afterLuckDeclined).not.toHaveProperty("d20TestNaturalOneRerolls");

    const luckThenInspiration = requireResolved(
      resolveWith([
        naturalOneReroll({ total: 3, naturalD20: 2 }),
        reroll({ total: 4, naturalD20: 3 }),
      ]),
    );
    expect(heroicInspiration(luckThenInspiration.state, fighterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );

    const luckThenDecline = requireResolved(
      resolveWith([
        naturalOneReroll({ total: 3, naturalD20: 2 }),
        declineReroll(),
      ]),
    );
    expect(heroicInspiration(luckThenDecline.state, fighterId)).toEqual(
      HEROIC_INSPIRATION_AVAILABLE,
    );

    const inspirationRollsAnotherOne = requireHole(
      resolveWith([reroll({ total: 2, naturalD20: 1 })]),
      "attackRoll",
    );
    expect(inspirationRollsAnotherOne).toMatchObject({
      d20TestNaturalOneRerolls: [
        { effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND },
      ],
    });
    expect(inspirationRollsAnotherOne).not.toHaveProperty(
      "heroicInspirationRerolls",
    );

    const inspirationThenLuck = requireResolved(
      resolveWith([
        reroll({ total: 2, naturalD20: 1 }),
        naturalOneReroll({ total: 3, naturalD20: 2 }),
      ]),
    );
    expect(heroicInspiration(inspirationThenLuck.state, fighterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );

    expect(
      resolveWith([
        reroll({ total: 6, naturalD20: 5 }),
        naturalOneReroll({ total: 3, naturalD20: 2 }),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE,
    });
    expect(
      resolveWith([
        naturalOneReroll({ total: 2, naturalD20: 1 }),
        naturalOneReroll({ total: 3, naturalD20: 2 }),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_SOURCE_REPEATED_MESSAGE,
    });
  });

  test("a later reroll keeps the modifiers of the roll it replaces", () => {
    const state = halflingFighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            total: 2,
            naturalD20: 1,
            d20TestRerolls: [
              naturalOneReroll({ total: 3, naturalD20: 2 }),
              reroll({ total: 5, naturalD20: 3 }),
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Heroic Inspiration replacement roll must keep the original roll's modifiers; only the d20 changes.",
    });
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
      d20TestRerolls: [reroll({ total: 22, naturalD20: 20 })],
    });
    expect(holeKinds(rerolledHit)).toEqual(["rolledDice"]);

    const rerolledMiss = requireResolved(
      resolveRoll({
        total: 4,
        naturalD20: 2,
        d20TestRerolls: [reroll({ total: 5, naturalD20: 3 })],
      }),
    );
    expect(heroicInspiration(rerolledMiss.state, spellCasterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );

    const declinedMiss = requireResolved(
      resolveRoll({
        total: 4,
        naturalD20: 2,
        d20TestRerolls: [declineReroll()],
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
      d20TestRerolls: [reroll({ total: 14, naturalD20: 12 })],
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
        d20TestRerolls: [reroll({ total: 20, naturalD20: 18 })],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    });
    expect(holeKinds(resolveSecondRay({ total: 4, naturalD20: 2 }))).toEqual([
      "attackRoll",
    ]);
  });

  test("a reroll must keep the original roll's modifiers", () => {
    const state = fighterBattle(HEROIC_INSPIRATION_AVAILABLE);
    const { subject, targetSelection, roll } = longswordRollHole(state);
    const rerolledTo = (total: number) =>
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(roll, {
            total: 7,
            naturalD20: 2,
            d20TestRerolls: [reroll({ total, naturalD20: 3 })],
          }),
        ],
      });

    expect(requireResolved(rerolledTo(8)).state).toBeDefined();
    const inflated = rerolledTo(30);
    expect(inflated).toMatchObject({
      tag: "invalid",
      message:
        "Heroic Inspiration replacement roll must keep the original roll's modifiers; only the d20 changes.",
    });
  });

  test("a decision submitted once the roll is asked again replaces that roll's fill", () => {
    const session = startBattleSessionRight({
      battleId: battleId("heroic-inspiration-transaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject(session.state, "Longsword");
    const settle = (
      previous: NeedsHolesTransactionResult | null,
      fills: readonly BattleFill[],
    ) =>
      settleBattleRuntimeTransaction({
        session: previous?.resolution.session ?? session,
        transaction: previous?.transaction ?? null,
        operation: { kind: "ordinarySubject", subject, fills },
      });
    const started = requireTransactionNeedsHoles(settle(null, []));
    const targeted = requireTransactionNeedsHoles(
      settle(started, [
        targetFill(transactionHole(started, "targetChoice"), goblinId),
      ]),
    );
    const rolled = requireTransactionNeedsHoles(
      settle(targeted, [
        attackRollFill(transactionHole(targeted, "attackRoll"), {
          total: 7,
          naturalD20: 2,
        }),
      ]),
    );
    const askedAgain = transactionHole(rolled, "attackRoll");
    expect(askedAgain).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });

    for (const decision of [
      declineReroll(),
      reroll({ total: 8, naturalD20: 3 }),
    ]) {
      expect(
        settle(rolled, [
          attackRollFill(askedAgain, {
            total: 7,
            naturalD20: 2,
            d20TestRerolls: [decision],
          }),
        ]),
      ).toMatchObject({ tag: "settled" });
    }
    expect(
      settle(rolled, [
        attackRollFill(askedAgain, {
          total: 25,
          naturalD20: 20,
          d20TestRerolls: [declineReroll()],
        }),
      ]),
    ).toMatchObject({
      tag: "invalid",
      resolution: { message: PENDING_FRONTIER_RESUBMISSION_CHANGED_MESSAGE },
    });
  });

  test("an earlier roll's decline stays valid when a replay finds Heroic Inspiration spent", () => {
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
    const resolve = (fills: readonly BattleFill[]) =>
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [...targetSelections, ...fills],
      });
    const firstRayRoll = requireHole(resolve([]), "attackRoll");
    const firstRayDeclined = attackRollFill(firstRayRoll, {
      total: 4,
      naturalD20: 2,
      d20TestRerolls: [declineReroll()],
    });
    const secondRayRoll = requireHole(
      resolve([firstRayDeclined]),
      "attackRoll",
    );
    expect(secondRayRoll.holeId).not.toBe(firstRayRoll.holeId);
    const secondRayRerolled = attackRollFill(secondRayRoll, {
      total: 4,
      naturalD20: 2,
      d20TestRerolls: [reroll({ total: 20, naturalD20: 18 })],
    });
    const awaitingShield = resolve([firstRayDeclined, secondRayRerolled]);
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

    if (afterShield.tag === "invalid" || !("state" in afterShield)) {
      throw new Error(
        `Expected the replay to accept the decline: ${JSON.stringify(afterShield)}`,
      );
    }
    expect(heroicInspiration(afterShield.state, spellCasterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
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
            d20TestRerolls: [reroll({ total: 4, naturalD20: 3 })],
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
      d20TestRerolls: [declineReroll()],
    });
    const rerolled = attackRollFill(roll, {
      total: 3,
      naturalD20: 2,
      d20TestRerolls: [reroll({ total: 16, naturalD20: 15 })],
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
      d20TestRerolls: [
        rerollRolledDie({
          die: "first",
          first: 18,
          second: 4,
          total: 23,
        }),
      ],
    });

    const encoded = Schema.encodeSync(BattleFillSchema)(fill);
    expect(Schema.decodeUnknownSync(BattleFillSchema)(encoded)).toEqual(fill);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleFillSchema)({
          ...fill,
          value: {
            ...fill.value,
            d20TestRerolls: [
              { kind: "decline", effectKind: "not_a_reroll_source" },
            ],
          },
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleFillSchema)({
          ...fill,
          value: { ...fill.value, d20TestRerolls: [] },
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
        distanceFeet: 5,
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

type NeedsHolesTransactionResult = Extract<
  BattleRuntimeTransactionResult,
  { readonly tag: "needsHoles" }
>;

function requireTransactionNeedsHoles(
  result: BattleRuntimeTransactionResult,
): NeedsHolesTransactionResult {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected the transaction to need holes, got ${result.tag}.`,
    );
  }
  return result;
}

function transactionHole<Kind extends BattleHole["kind"]>(
  result: NeedsHolesTransactionResult,
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  const frontier = result.resolution.envelope.frontier;
  const holes: readonly BattleHole[] =
    frontier.kind === "interruptDecision"
      ? [frontier.decisionHole]
      : frontier.holes;
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected a ${kind} hole in the transaction result.`);
  }
  return hole;
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
}): BattleHeroicInspirationRerollDecision {
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
}): BattleD20TestNaturalOneRerollDecision {
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
  readonly first: number;
  readonly second: number;
  readonly total: number;
}): Extract<
  BattleHeroicInspirationRerollDecision,
  { readonly kind: "rerollRolledDie" }
> {
  return {
    kind: "rerollRolledDie",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      die: input.die,
      result: {
        total: input.total,
        d20TestRoll: {
          tag: "multiple",
          first: DieRollResult(input.first),
          second: DieRollResult(input.second),
          rollMode: "advantage",
        },
      },
    },
  };
}

function declineNaturalOneReroll(): BattleD20TestNaturalOneRerollDecision {
  return {
    kind: "decline",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  };
}

function declineReroll(): BattleHeroicInspirationRerollDecision {
  return { kind: "decline", effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND };
}
