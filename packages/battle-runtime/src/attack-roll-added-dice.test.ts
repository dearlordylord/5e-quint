// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-failed-d20-test
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// A Bardic Inspiration die added to an attack roll that misses, through the
// battle: weapon attacks, Spell Attacks and Opportunity Attacks. The die comes
// after the roll's rerolls, while the roll misses the target's Armor Class as
// it stands (ASSUMPTIONS.md A68), and a Reaction that turns a hit into a miss
// leaves the attacker the die to add (A70).
import {
  HEROIC_INSPIRATION_AVAILABLE,
  type HeroicInspiration,
} from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { BattleFillSchema } from "./battle-reducer/battle-codecs.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
import { BARDIC_INSPIRATION_DIE_MESSAGES } from "./battle-reducer/bardic-inspiration-failed-d20-test.ts";
import { D20_TEST_ADDED_DIE_BEFORE_REROLLS_MESSAGE } from "./battle-reducer/d20-test-after-roll-decisions.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  attackTargetSpatialFact,
  battleFrontierInterruptDecisionForState,
  battleResolutionHolesForTest,
  characterAttackSubjectForTest,
  characterSeed,
  combatantHasBardicInspirationDie,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsResource,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  greataxeWeaponMasterySelections,
  interruptDecisionFill,
  masteryCleaveUnitRefs,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  reactionModifierChoice,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  rolledDiceGroup,
  skeletonId,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testGreataxeAttack,
  testShortswordAttack,
  unitFeatureDecisionFill,
  withBardicInspirationDie,
  wizardSpellcasting,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
} from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";
import {
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionOperation,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { movementFeet } from "@dnd/shared/types";
import {
  battleId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

type AttackRollValue = Parameters<typeof attackRollFill>[1];

describe("a Bardic Inspiration die on a weapon attack roll", () => {
  test("a missed attack roll is asked again with the die", () => {
    const attack = longswordAttack();

    expect(
      requireHole(attack.attempt({ total: 14, naturalD20: 10 }), "attackRoll"),
    ).toMatchObject({
      holeId: attack.roll.holeId,
      bardicInspirationDice: [
        {
          effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
          rollerId: fighterId,
          dieSize: 6,
        },
      ],
    });
  });

  test("a die that turns the miss into a hit is expended, and so is one that falls short", () => {
    const attack = longswordAttack();
    const hit = attack.attempt({
      total: 14,
      naturalD20: 10,
      d20TestAddedDice: [bardicDie(2)],
    });
    expect(holeKinds(hit)).toEqual(["rolledDice"]);
    const hitValue = {
      total: 14,
      naturalD20: 10,
      d20TestAddedDice: [bardicDie(2)],
    } satisfies AttackRollValue;
    const damaged = requireResolved(
      attack.attempt(
        hitValue,
        damageRollFill(requireHole(hit, "rolledDice"), 4),
      ),
    );
    expect(hp(damaged.state, goblinId)).toBeLessThan(
      hp(attack.state, goblinId),
    );
    expect(combatantHasBardicInspirationDie(damaged.state, fighterId)).toBe(
      false,
    );

    const missed = requireResolved(
      attack.attempt({
        total: 10,
        naturalD20: 6,
        d20TestAddedDice: [bardicDie(3)],
      }),
    );
    expect(hp(missed.state, goblinId)).toBe(hp(attack.state, goblinId));
    expect(combatantHasBardicInspirationDie(missed.state, fighterId)).toBe(
      false,
    );
  });

  test("a natural 1 still misses, whatever the die adds", () => {
    const attack = longswordAttack();
    expect(
      requireHole(attack.attempt({ total: 8, naturalD20: 1 }), "attackRoll"),
    ).toHaveProperty("bardicInspirationDice");

    const missed = requireResolved(
      attack.attempt({
        total: 8,
        naturalD20: 1,
        d20TestAddedDice: [bardicDie(6)],
      }),
    );
    expect(hp(missed.state, goblinId)).toBe(hp(attack.state, goblinId));
    expect(combatantHasBardicInspirationDie(missed.state, fighterId)).toBe(
      false,
    );
  });

  test("a declined die is kept", () => {
    const attack = longswordAttack();
    const missed = requireResolved(
      attack.attempt({
        total: 14,
        naturalD20: 10,
        d20TestAddedDice: [declineBardic()],
      }),
    );

    expect(hp(missed.state, goblinId)).toBe(hp(attack.state, goblinId));
    expect(combatantHasBardicInspirationDie(missed.state, fighterId)).toBe(
      true,
    );
  });

  test("a hit is not offered the die and refuses one", () => {
    const attack = longswordAttack();
    expect(holeKinds(attack.attempt({ total: 20, naturalD20: 15 }))).toEqual([
      "rolledDice",
    ]);

    expect(
      attack.attempt({
        total: 20,
        naturalD20: 15,
        d20TestAddedDice: [declineBardic()],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: BARDIC_INSPIRATION_DIE_MESSAGES.notFailed,
    });
  });

  test("a roller without a die, or a face outside it, is refused", () => {
    expect(
      longswordAttack({ withDie: false }).attempt({
        total: 14,
        naturalD20: 10,
        d20TestAddedDice: [bardicDie(2)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: BARDIC_INSPIRATION_DIE_MESSAGES.unavailable,
    });
    expect(
      longswordAttack().attempt({
        total: 14,
        naturalD20: 10,
        d20TestAddedDice: [bardicDie(7)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: BARDIC_INSPIRATION_DIE_MESSAGES.dieRoll,
    });
  });

  test("the die comes after a Heroic Inspiration reroll, on the roll it leaves", () => {
    const attack = longswordAttack({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const askedReroll = requireHole(
      attack.attempt({ total: 3, naturalD20: 2 }),
      "attackRoll",
    );
    expect(askedReroll).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    expect(askedReroll).not.toHaveProperty("bardicInspirationDice");
    expect(
      attack.attempt({
        total: 3,
        naturalD20: 2,
        d20TestAddedDice: [bardicDie(2)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_ADDED_DIE_BEFORE_REROLLS_MESSAGE,
    });

    const hit = attack.attempt({
      total: 3,
      naturalD20: 2,
      d20TestRerolls: [heroicReroll({ total: 14, naturalD20: 13 })],
      d20TestAddedDice: [bardicDie(2)],
    });
    expect(holeKinds(hit)).toEqual(["rolledDice"]);
    expect(combatantHasBardicInspirationDie(stateAfter(hit), fighterId)).toBe(
      false,
    );
  });

  test("continuation fill equality and the fill codec keep the added die", () => {
    const { roll } = longswordAttack();
    const added = attackRollFill(roll, {
      total: 14,
      naturalD20: 10,
      d20TestAddedDice: [bardicDie(2)],
    });
    const declined = attackRollFill(roll, {
      total: 14,
      naturalD20: 10,
      d20TestAddedDice: [declineBardic()],
    });

    expect(battleContinuationFillEquals(added, { ...added })).toBe(true);
    expect(battleContinuationFillEquals(added, declined)).toBe(false);
    expect(
      battleContinuationFillEquals(
        added,
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
      ),
    ).toBe(false);

    const encoded = Schema.encodeSync(BattleFillSchema)(added);
    expect(Schema.decodeUnknownSync(BattleFillSchema)(encoded)).toEqual(added);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleFillSchema)({
          ...added,
          value: { ...added.value, d20TestAddedDice: [] },
        }),
      ),
    ).toBe(true);
  });
});

describe("a Bardic Inspiration die on other attack rolls", () => {
  test("a Spell Attack that misses is offered the caster's die", () => {
    const rayOfFrost = spellRecord("ray_of_frost");
    const session = spellBattle({ cantrips: [rayOfFrost] });
    const state = withBardicInspirationDie(session.state, spellCasterId);
    const act = spellAct({ session, spellId: rayOfFrost.id });
    const targetSelection = spellTargetFill(
      requireHole(
        resolveBattleSubject({ state, subject: act.subject, fills: [] }),
        "targetChoice",
      ),
      rayOfFrost.id,
      spellCasterId,
      spellTargetId,
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );
    const attempt = (value: AttackRollValue) =>
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetSelection, attackRollFill(roll, value)],
      });

    expect(
      requireHole(attempt({ total: 4, naturalD20: 2 }), "attackRoll"),
    ).toMatchObject({
      bardicInspirationDice: [
        {
          effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
          rollerId: spellCasterId,
        },
      ],
    });
    const hit = attempt({
      total: 4,
      naturalD20: 2,
      d20TestAddedDice: [bardicDie(6)],
    });
    expect(holeKinds(hit)).toEqual(
      holeKinds(attempt({ total: 20, naturalD20: 15 })),
    );
    expect(
      combatantHasBardicInspirationDie(stateAfter(hit), spellCasterId),
    ).toBe(false);
  });

  test("an Opportunity Attack that misses is offered the reactor's die", () => {
    const state = startBattleRight({
      battleId: battleId("bardic-inspiration-opportunity-reactor"),
      combatants: [
        characterSeed({ initiative: 20, attack: testShortswordAttack() }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic Inspired Reactor",
          initiative: 10,
          attack: testShortswordAttack(),
        }),
      ],
    });
    const opportunity = startOpportunityAttack(
      withBardicInspirationDie(state, goblinId),
      "Shortsword",
    );
    const attempt = (value: AttackRollValue) =>
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [attackRollFill(opportunity.attackRoll, value)],
      });

    expect(
      requireHole(attempt({ total: 3, naturalD20: 2 }), "attackRoll"),
    ).toMatchObject({
      bardicInspirationDice: [
        { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND, rollerId: goblinId },
      ],
    });
    const missed = requireResolved(
      attempt({
        total: 3,
        naturalD20: 2,
        d20TestAddedDice: [bardicDie(1)],
      }),
    );
    expect(combatantHasBardicInspirationDie(missed.state, goblinId)).toBe(
      false,
    );
  });
});

describe("a Bardic Inspiration die across the rolls of one subject", () => {
  test("a Cleave attack roll that misses is offered the die", () => {
    const cleave = greataxeCleave();
    const fills = cleave.cleaveFills({ total: 15, naturalD20: 10 });

    expect(
      requireHole(
        cleave.attempt([
          ...fills,
          cleave.cleaveRollFill({ total: 5, naturalD20: 3 }),
        ]),
        "attackRoll",
      ),
    ).toMatchObject({
      label: "Cleave attack roll",
      bardicInspirationDice: [
        { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND, rollerId: fighterId },
      ],
    });
  });

  test("a die spent on the primary attack roll is not offered on the Cleave roll", () => {
    const cleave = greataxeCleave();
    const fills = cleave.cleaveFills({
      total: 13,
      naturalD20: 9,
      d20TestAddedDice: [bardicDie(2)],
    });
    const missedCleave = cleave.attempt([
      ...fills,
      cleave.cleaveRollFill({ total: 5, naturalD20: 3 }),
    ]);

    expect(missedCleave.tag).toBe("resolved");
    expect(
      combatantHasBardicInspirationDie(stateAfter(missedCleave), fighterId),
    ).toBe(false);
    expect(
      cleave.attempt([
        ...fills,
        cleave.cleaveRollFill({
          total: 5,
          naturalD20: 3,
          d20TestAddedDice: [bardicDie(4)],
        }),
      ]).tag,
    ).toBe("invalid");
  });

  test("a die spent on one ray of a Spell Attack sequence is not offered on the next", () => {
    const scorchingRay = spellRecord("scorching_ray");
    const session = spellBattle({
      preparedSpells: [scorchingRay],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = withBardicInspirationDie(session.state, spellCasterId);
    const act = spellAct({ session, spellId: scorchingRay.id, slotLevel: 2 });
    const targetSelections = act.initialHoles.flatMap((hole) =>
      hole.kind === "targetChoice"
        ? [spellTargetFill(hole, scorchingRay.id, spellCasterId, spellTargetId)]
        : [],
    );
    const resolve = (fills: readonly BattleFill[]) =>
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [...targetSelections, ...fills],
      });
    const firstRay = requireHole(resolve([]), "attackRoll");
    expect(
      requireHole(
        resolve([attackRollFill(firstRay, { total: 4, naturalD20: 2 })]),
        "attackRoll",
      ),
    ).toMatchObject({ holeId: firstRay.holeId, bardicInspirationDice: [{}] });
    const firstRayWithDie = attackRollFill(firstRay, {
      total: 4,
      naturalD20: 2,
      d20TestAddedDice: [bardicDie(1)],
    });
    const secondRay = requireHole(resolve([firstRayWithDie]), "attackRoll");
    expect(secondRay.holeId).not.toBe(firstRay.holeId);

    const afterSecondMiss = requireHole(
      resolve([
        firstRayWithDie,
        attackRollFill(secondRay, { total: 4, naturalD20: 2 }),
      ]),
      "attackRoll",
    );
    expect(afterSecondMiss.holeId).not.toBe(secondRay.holeId);
    expect(afterSecondMiss).not.toHaveProperty("bardicInspirationDice");
    expect(
      resolve([
        firstRayWithDie,
        attackRollFill(secondRay, {
          total: 4,
          naturalD20: 2,
          d20TestAddedDice: [bardicDie(1)],
        }),
      ]).tag,
    ).toBe("invalid");
  });
});

describe("a Bardic Inspiration die after a Reaction turns the hit into a miss", () => {
  test("after Shield, the attacker is offered the die against the raised Armor Class", () => {
    const rayOfFrost = spellRecord("ray_of_frost");
    const battle = spellBattle({
      cantrips: [rayOfFrost],
      targetHp: 30,
      targetMaxHp: 30,
      targetSpellcasting: wizardSpellcasting({
        cantrips: [],
        preparedSpells: [spellRecord("shield")],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
    });
    const session = battleRuntimeSessionForTest({
      ...battle,
      state: withBardicInspirationDie(battle.state, spellCasterId),
    });
    const { subject } = spellAct({ session, spellId: rayOfFrost.id });
    const settle = (
      previous: NeedsHolesTransactionResult | null,
      operation: BattleRuntimeTransactionOperation,
    ) =>
      settleBattleRuntimeTransaction({
        session: previous?.resolution.session ?? session,
        transaction: previous?.transaction ?? null,
        operation,
      });
    const submit = (
      previous: NeedsHolesTransactionResult | null,
      fills: readonly BattleFill[],
    ) => settle(previous, { kind: "ordinarySubject", subject, fills });
    const started = requireTransactionNeedsHoles(submit(null, []));
    const targeted = requireTransactionNeedsHoles(
      submit(started, [
        spellTargetFill(
          transactionHole(started, "targetChoice"),
          rayOfFrost.id,
          spellCasterId,
          spellTargetId,
        ),
      ]),
    );
    // The target's Armor Class is 10, and 15 with Shield.
    const roll = transactionHole(targeted, "attackRoll");
    const awaitingShield = requireTransactionNeedsHoles(
      submit(targeted, [attackRollFill(roll, { total: 13, naturalD20: 11 })]),
    );
    const afterShield = requireTransactionNeedsHoles(
      settle(awaitingShield, {
        kind: "interruptDecision",
        fill: shieldDecision(awaitingShield.resolution.session.state),
      }),
    );
    expect(transactionHole(afterShield, "attackRoll")).toMatchObject({
      holeId: roll.holeId,
      bardicInspirationDice: [
        {
          effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
          rollerId: spellCasterId,
        },
      ],
    });

    const short = submit(afterShield, [
      attackRollFill(roll, {
        total: 13,
        naturalD20: 11,
        d20TestAddedDice: [bardicDie(1)],
      }),
    ]);
    if (short.tag !== "settled") {
      throw new Error(
        `Expected the missed ray to settle, got ${short.tag}${short.tag === "invalid" ? `: ${short.resolution.message}` : ""}.`,
      );
    }
    expect(hp(short.session.state, spellTargetId)).toBe(30);
    expect(
      combatantHasBardicInspirationDie(short.session.state, spellCasterId),
    ).toBe(false);

    const hit = requireTransactionNeedsHoles(
      submit(afterShield, [
        attackRollFill(roll, {
          total: 13,
          naturalD20: 11,
          d20TestAddedDice: [bardicDie(2)],
        }),
      ]),
    );
    expect(transactionHole(hit, "rolledDice")).toBeDefined();
  });
});

describe("a Bardic Inspiration die after Cutting Words", () => {
  test("after Cutting Words lowers the hit into a miss, the attacker is offered the die", () => {
    const cuttingWords = cuttingWordsAttackOnlyUnit();
    const started = startBattleSessionRight({
      battleId: battleId("bardic-inspiration-after-cutting-words"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          characterUnitRefs: [
            {
              unit: cuttingWords,
              supportProfiles: ["reactionRollOrDamageReduction"],
            },
          ],
        }),
      ],
    });
    const session = battleRuntimeSessionForTest({
      ...started,
      state: withBardicInspirationDie(started.state, goblinId),
    });
    const subject = goblinAttackSubject(session.state, "Scimitar");
    const settle = (
      previous: NeedsHolesTransactionResult | null,
      operation: BattleRuntimeTransactionOperation,
    ) =>
      settleBattleRuntimeTransaction({
        session: previous?.resolution.session ?? session,
        transaction: previous?.transaction ?? null,
        operation,
      });
    const submit = (
      previous: NeedsHolesTransactionResult | null,
      fills: readonly BattleFill[],
    ) => settle(previous, { kind: "ordinarySubject", subject, fills });
    const started0 = requireTransactionNeedsHoles(submit(null, []));
    const targeted = requireTransactionNeedsHoles(
      submit(started0, [
        targetFill(transactionHole(started0, "targetChoice"), fighterId),
      ]),
    );
    const roll = transactionHole(targeted, "attackRoll");
    const awaitingReaction = requireTransactionNeedsHoles(
      submit(targeted, [attackRollFill(roll, { total: 12, naturalD20: 10 })]),
    );
    const decision = battleFrontierInterruptDecisionForState(
      awaitingReaction.resolution.session.state,
    );
    if (decision === null || decision === undefined) {
      throw new Error("Expected the attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      decision.choices,
      cuttingWords.id,
      "attackRollReduction",
    );
    const reductionHole = choice.initialHoles[0];
    if (reductionHole === undefined) {
      throw new Error("Expected the Cutting Words roll hole.");
    }
    const afterCuttingWords = requireTransactionNeedsHoles(
      settle(awaitingReaction, {
        kind: "interruptDecision",
        fill: interruptDecisionFill(decision.decisionHole, {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: "attackRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: reductionHole.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        }),
      }),
    );
    expect(transactionHole(afterCuttingWords, "attackRoll")).toMatchObject({
      holeId: roll.holeId,
      bardicInspirationDice: [
        { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND, rollerId: goblinId },
      ],
    });

    const hit = requireTransactionNeedsHoles(
      submit(afterCuttingWords, [
        attackRollFill(roll, {
          total: 12,
          naturalD20: 10,
          d20TestAddedDice: [bardicDie(6)],
        }),
      ]),
    );
    expect(transactionHole(hit, "rolledDice")).toBeDefined();
  });
});

/** A Fighter's Longsword attack on the goblin, the Fighter holding a d6 Bardic Inspiration die. */
function longswordAttack(
  input: {
    readonly withDie?: boolean;
    readonly heroicInspiration?: HeroicInspiration;
  } = {},
) {
  const started = startBattleRight({
    battleId: battleId("bardic-inspiration-attack-roll"),
    combatants: [
      characterSeed({
        initiative: 20,
        ...(input.heroicInspiration === undefined
          ? {}
          : { heroicInspiration: input.heroicInspiration }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const state =
    input.withDie === false
      ? started
      : withBardicInspirationDie(started, fighterId);
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
  return {
    state,
    roll,
    attempt: (value: AttackRollValue, ...later: readonly BattleFill[]) =>
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection, attackRollFill(roll, value), ...later],
      }),
  };
}

function greataxeCleave() {
  const state = withBardicInspirationDie(
    startBattleRight({
      battleId: battleId("bardic-die-cleave"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Table-Chosen Second Target",
          initiative: 9,
          currentHp: 10,
          maxHp: 10,
          attack: null,
        }),
      ],
    }),
    fighterId,
  );
  const subject = fighterAttackSubject(state, "Greataxe");
  const attempt = (fills: readonly BattleFill[]) =>
    resolveBattleSubject({ state, subject, fills });
  const primaryTarget = attackInitialTargetHole(state, subject);
  const targetSelection = attackTargetFill(
    primaryTarget,
    fighterId,
    goblinId,
    attackExecutionSelectionForSubjectForTest(subject),
  );
  const primaryRoll = attackRollHoleAfterTarget(
    state,
    primaryTarget,
    subject,
    goblinId,
  );
  let cleaveRoll: BattleHole | null = null;
  /** The fills up to the Cleave attack roll, after a primary roll that hits. */
  const cleaveFills = (primary: AttackRollValue): readonly BattleFill[] => {
    const primaryFills = [
      targetSelection,
      attackRollFill(primaryRoll, primary),
    ];
    const damaged = [
      ...primaryFills,
      damageRollFill(requireHole(attempt(primaryFills), "rolledDice"), 1),
    ];
    const decision = requireHole(attempt(damaged), "unitFeatureDecision");
    const withCleave = [...damaged, unitFeatureDecisionFill(decision, "use")];
    const target = requireHole(attempt(withCleave), "targetChoice");
    const fills = [
      ...withCleave,
      targetFill(target, skeletonId, [
        attackTargetSpatialFact(
          fighterId,
          skeletonId,
          attackExecutionSelectionForSubjectForTest(subject),
        ),
        {
          kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
          attackerId: fighterId,
          firstTargetId: goblinId,
          secondTargetId: skeletonId,
        },
      ]),
    ];
    cleaveRoll = requireHole(attempt(fills), "attackRoll");
    return fills;
  };
  const cleaveRollFill = (value: AttackRollValue) => {
    if (cleaveRoll?.kind !== "attackRoll") {
      throw new Error("Expected the Cleave attack roll hole.");
    }
    return attackRollFill(cleaveRoll, value);
  };
  return { state, attempt, cleaveFills, cleaveRollFill };
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

/** The target casts Shield in the attack-hit Reaction window. */
function shieldDecision(
  state: BattleState,
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  const decision = battleFrontierInterruptDecisionForState(state);
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
  return interruptDecisionFill(decision.decisionHole, {
    kind: "resolve",
    responderId: spellTargetId,
    choice: {
      kind: "castTriggeredReactionSpell",
      procedureRef: shield.subject.procedureRef,
      fills: [],
    },
  });
}

type NeedsHolesTransactionResult = Extract<
  BattleRuntimeTransactionResult,
  { readonly tag: "needsHoles" }
>;

function requireTransactionNeedsHoles(
  result: BattleRuntimeTransactionResult,
): NeedsHolesTransactionResult {
  if (result.tag !== "needsHoles") {
    const detail =
      result.tag === "invalid" ? `: ${result.resolution.message}` : "";
    throw new Error(
      `Expected the transaction to need holes, got ${result.tag}${detail}.`,
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

function stateAfter(result: BattleResolutionResult): BattleState {
  if (result.tag === "invalid") {
    throw new Error(`Expected an admitted roll, got: ${result.message}`);
  }
  return result.state;
}

function holeKinds(result: BattleResolutionResult): BattleHole["kind"][] {
  return result.tag === "needsHoles"
    ? battleResolutionHolesForTest(result).map((hole) => hole.kind)
    : [];
}

function hp(state: BattleState, id: CombatantId): number {
  return Number(state.combatants.get(id)?.hp);
}

function bardicDie(dieRoll: number) {
  return {
    kind: "addDie",
    effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
    dieRoll: DieRollResult(dieRoll),
  } as const;
}

function declineBardic() {
  return {
    kind: "decline",
    effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  } as const;
}

function heroicReroll(input: {
  readonly total: number;
  readonly naturalD20: number;
}): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "attackRoll" }
  >["value"]["d20TestRerolls"]
>[number] {
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
