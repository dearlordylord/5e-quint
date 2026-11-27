// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-failed-d20-test unit-feature.failed-ability-check-resource-boost
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// Dice added to a failed D20 Test through the battle: a Bardic Inspiration
// die on ability checks and saving throws, and the failed ability check
// resource boost (Fighter, Tactical Mind) on ability checks. The dice come
// after the test's rerolls, each while the test still fails, and the boost's
// use is spent only when the check then succeeds (ASSUMPTIONS.md A67).
import { HEROIC_INSPIRATION_AVAILABLE } from "@dnd/shared/game-facts";
import { classLevel, DieRollResult, difficultyClass } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  abilityCheckFill,
  characterBattleFeatureInitForTest,
  characterResourceUses,
  characterSeed,
  combatantHasBardicInspirationDie,
  fighterId,
  goblinId,
  grantBardicInspirationToGoblin,
  hidePrerequisites,
  holeId,
  requireResolved,
  resolveBattleSubject,
  resource,
  resourceCount,
  startBattleRight,
  statBlockCreatureInit,
  supportedBattleUnitRef,
  unitLibrary,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleActiveEffect,
  type BattleD20TestRoll,
  type BattleFill,
  type BattleTakenFailedAbilityCheckResourceBoost,
} from "./battle-state-execution.ts";
import { D20_TEST_ADDED_DIE_BEFORE_REROLLS_MESSAGE } from "./battle-reducer/d20-test-after-roll-decisions.ts";
import { BARDIC_INSPIRATION_DIE_MESSAGES } from "./battle-reducer/bardic-inspiration-failed-d20-test.ts";
import { FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES } from "./battle-reducer/failed-ability-check-resource-boost.ts";
import {
  exhaleOnConcentratingCaster,
  exhaleSaveFill,
} from "./dragons-breath-exhale.test-support.ts";
import { viciousMockeryUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleId,
  spellCasterId,
  spellTargetId,
  type CombatantId,
} from "./unit-profile-admission.test-support.ts";

type AbilityCheckFill = Extract<BattleFill, { readonly kind: "abilityCheck" }>;
type AbilityCheckAddedDice = NonNullable<
  AbilityCheckFill["value"]["d20TestAddedDice"]
>;

describe("the failed ability check resource boost on a Hide check", () => {
  test("a check that fails is asked again with the boost", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 2 });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [abilityCheckFill(check, 13)],
        }),
        "abilityCheck",
      ),
    ).toMatchObject({
      failedAbilityCheckResourceBoosts: [
        {
          effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
          rollerId: fighterId,
          dieSize: 10,
        },
      ],
    });
  });

  test("a boost that turns the check spends one use and the new total stands", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 2 });

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [boost(3)])],
      }),
    ).state;

    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(16),
    });
    expect(characterResourceUses(hidden, fighterId)).toEqual([
      resourceCount(1),
    ]);
  });

  test("a boost on a check that still fails keeps its use", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 2 });

    const failed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 10), [boost(4)])],
      }),
    ).state;

    expect(failed.combatants.get(fighterId)?.hidden).toBeNull();
    expect(characterResourceUses(failed, fighterId)).toEqual([
      resourceCount(2),
    ]);
  });

  test("a check that succeeds is not offered the boost, and a decision on it is refused", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 2 });

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [abilityCheckFill(check, 15)],
      }),
    ).state;
    expect(characterResourceUses(hidden, fighterId)).toEqual([
      resourceCount(2),
    ]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 15), [declineBoost()])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES.notFailed,
    });
  });

  test("a roller without a use left is not offered the boost, and it is refused", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 0 });

    expect(
      requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [abilityCheckFill(check, 13)],
        }),
      ).state.combatants.get(fighterId)?.hidden,
    ).toBeNull();
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [boost(3)])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES.unavailable,
    });
  });

  test("a boost roll that is not a face of its die is refused", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 2 });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [boost(11)])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES.dieRoll,
    });
  });

  test("a replay accepts a boost the first pass took though the check still failed", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 0 });
    const fill = withAddedDice(abilityCheckFill(check, 10), [boost(4)]);
    const replaying = withTakenBoost(state, subject, {
      holeId: check.holeId,
      useSpent: false,
    });

    const failed = requireResolved(
      resolveBattleSubject({ state: replaying, subject, fills: [fill] }),
    ).state;

    expect(failed.combatants.get(fighterId)?.hidden).toBeNull();
    expect(characterResourceUses(failed, fighterId)).toEqual([
      resourceCount(0),
    ]);
  });

  test("a replay accepts the boost that turned the check without spending a second use", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 0 });
    const replaying = withTakenBoost(state, subject, {
      holeId: check.holeId,
      useSpent: true,
    });

    const hidden = requireResolved(
      resolveBattleSubject({
        state: replaying,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [boost(3)])],
      }),
    ).state;

    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(16),
    });
    expect(characterResourceUses(hidden, fighterId)).toEqual([
      resourceCount(0),
    ]);
  });

  test("a use spent on another roll of the subject lets a decline stand and refuses the boost", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 0 });
    const replaying = withTakenBoost(state, subject, {
      holeId: holeId("another-ability-check"),
      useSpent: true,
    });

    expect(
      requireResolved(
        resolveBattleSubject({
          state: replaying,
          subject,
          fills: [withAddedDice(abilityCheckFill(check, 13), [declineBoost()])],
        }),
      ).state.combatants.get(fighterId)?.hidden,
    ).toBeNull();
    expect(
      resolveBattleSubject({
        state: replaying,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [boost(3)])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES.unavailable,
    });
  });

  test("a boost taken on another roll without spending its use doesn't count as the spend", () => {
    const { state, subject, check } = hideCheck({ tacticalMindUses: 0 });
    const replaying = withTakenBoost(state, subject, {
      holeId: holeId("another-ability-check"),
      useSpent: false,
    });

    expect(
      resolveBattleSubject({
        state: replaying,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [declineBoost()])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES.unavailable,
    });
  });
});

describe("a Bardic Inspiration die on a Hide check", () => {
  test("a die that turns the check is expended and the new total stands", () => {
    const { state, subject, check } = hideCheck({ bardicInspiration: true });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [abilityCheckFill(check, 13)],
        }),
        "abilityCheck",
      ),
    ).toMatchObject({
      bardicInspirationDice: [
        {
          effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
          rollerId: fighterId,
          dieSize: 6,
        },
      ],
    });
    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [bardicDie(2)])],
      }),
    ).state;

    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(15),
    });
    expect(combatantHasBardicInspirationDie(hidden, fighterId)).toBe(false);
  });

  test("a die is expended even when the check still fails", () => {
    const { state, subject, check } = hideCheck({ bardicInspiration: true });

    const failed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 8), [bardicDie(6)])],
      }),
    ).state;

    expect(failed.combatants.get(fighterId)?.hidden).toBeNull();
    expect(combatantHasBardicInspirationDie(failed, fighterId)).toBe(false);
  });

  test("a declined die is kept", () => {
    const { state, subject, check } = hideCheck({ bardicInspiration: true });

    const failed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [declineBardic()])],
      }),
    ).state;

    expect(failed.combatants.get(fighterId)?.hidden).toBeNull();
    expect(combatantHasBardicInspirationDie(failed, fighterId)).toBe(true);
  });

  test("a roll that is not a face of the held die is refused", () => {
    const { state, subject, check } = hideCheck({ bardicInspiration: true });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [bardicDie(7)])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: BARDIC_INSPIRATION_DIE_MESSAGES.dieRoll,
    });
  });

  test("a roller without a die is refused", () => {
    const { state, subject, check } = hideCheck({});

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(abilityCheckFill(check, 13), [declineBardic()])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: BARDIC_INSPIRATION_DIE_MESSAGES.unavailable,
    });
  });
});

describe("both dice on one Hide check", () => {
  test.each([
    ["the boost first", [boost(1), bardicDie(4)]],
    ["the Bardic die first", [bardicDie(4), boost(1)]],
  ] as const)(
    "with %s, each falls short alone and the check succeeds with both, spending both",
    (_order, dice) => {
      const { state, subject, check } = hideCheck({
        tacticalMindUses: 2,
        bardicInspiration: true,
      });

      const hidden = requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [withAddedDice(abilityCheckFill(check, 10), dice)],
        }),
      ).state;

      expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
        discoveryDc: difficultyClass(15),
      });
      expect(combatantHasBardicInspirationDie(hidden, fighterId)).toBe(false);
      expect(characterResourceUses(hidden, fighterId)).toEqual([
        resourceCount(1),
      ]);
    },
  );

  test("a die the first one already made succeed is refused", () => {
    const { state, subject, check } = hideCheck({
      tacticalMindUses: 2,
      bardicInspiration: true,
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          withAddedDice(abilityCheckFill(check, 13), [boost(5), bardicDie(1)]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: BARDIC_INSPIRATION_DIE_MESSAGES.notFailed,
    });
  });

  test("a die declined before the other fell short is asked again", () => {
    const { state, subject, check } = hideCheck({
      tacticalMindUses: 2,
      bardicInspiration: true,
    });

    const asked = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          withAddedDice(abilityCheckFill(check, 10), [
            declineBardic(),
            boost(1),
          ]),
        ],
      }),
      "abilityCheck",
    );

    expect(asked).toMatchObject({
      bardicInspirationDice: [
        { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND },
      ],
    });
    expect(asked).not.toHaveProperty("failedAbilityCheckResourceBoosts");
  });
});

describe("added dice come after the check's rerolls", () => {
  test("the die is offered only once the reroll is decided, on the roll it leaves", () => {
    const { state, subject, check } = hideCheck({
      bardicInspiration: true,
      heroicInspiration: true,
    });

    const askedReroll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [abilityCheckFill(check, { total: 7, naturalD20: 3 })],
      }),
      "abilityCheck",
    );
    expect(askedReroll).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    expect(askedReroll).not.toHaveProperty("bardicInspirationDice");

    const rerolled = abilityCheckFill(check, {
      total: 7,
      naturalD20: 3,
      d20TestRerolls: [
        {
          kind: "reroll",
          effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
          replacement: {
            total: 13,
            d20TestRoll: { tag: "single", naturalD20: DieRollResult(9) },
          },
        },
      ],
    });
    expect(
      requireResultHole(
        resolveBattleSubject({ state, subject, fills: [rerolled] }),
        "abilityCheck",
      ),
    ).toMatchObject({
      bardicInspirationDice: [
        { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND },
      ],
    });

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [withAddedDice(rerolled, [bardicDie(2)])],
      }),
    ).state;
    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(15),
    });
  });

  test("a die before the reroll is decided is refused", () => {
    const { state, subject, check } = hideCheck({
      bardicInspiration: true,
      heroicInspiration: true,
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          withAddedDice(abilityCheckFill(check, { total: 7, naturalD20: 3 }), [
            bardicDie(2),
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_ADDED_DIE_BEFORE_REROLLS_MESSAGE,
    });
  });
});

describe("a Bardic Inspiration die on a saving throw", () => {
  test("a failed save is asked again with the die, and the table's ruling with it stands", () => {
    const { state, subject, targetSelection, savingThrow } =
      viciousMockerySave();
    const failedSave = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false, naturalD20: 5 },
    ]);

    expect(
      requireResultHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetSelection, failedSave],
        }),
        "savingThrowOutcome",
      ),
    ).toMatchObject({
      bardicInspirationDice: [
        {
          effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
          rollerId: spellTargetId,
          dieSize: 6,
        },
      ],
    });
    const saved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          withOutcomeAddedDice(failedSave, [
            savingThrowBardicDie({ dieRoll: 4, succeeded: true }),
          ]),
        ],
      }),
    ).state;

    expect(hp(saved, spellTargetId)).toBe(hp(state, spellTargetId));
    expect(combatantHasBardicInspirationDie(saved, spellTargetId)).toBe(false);
  });

  test("a die that leaves the save failed is expended once across the damage that follows", () => {
    const { state, subject, targetSelection, savingThrow } =
      viciousMockerySave();
    const save = withOutcomeAddedDice(
      savingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: false, naturalD20: 5 },
      ]),
      [savingThrowBardicDie({ dieRoll: 1, succeeded: false })],
    );

    const needsDamage = resolveBattleSubject({
      state,
      subject,
      fills: [targetSelection, save],
    });
    if (needsDamage.tag !== "needsHoles") throw new Error("Expected damage.");
    expect(
      combatantHasBardicInspirationDie(needsDamage.state, spellTargetId),
    ).toBe(false);
    const damage = damageRollFillWithGroups(
      requireResultHole(needsDamage, "rolledDice"),
      [[3]],
    );
    // The replay starts from the suspended state, where the die is gone, so
    // the save's die is read from the record of its spend.
    const damaged = requireResolved(
      resolveBattleSubject({
        state: needsDamage.state,
        subject,
        fills: [targetSelection, save, damage],
      }),
    ).state;

    expect(hp(damaged, spellTargetId)).toBe(hp(state, spellTargetId) - 3);
    expect(combatantHasBardicInspirationDie(damaged, spellTargetId)).toBe(
      false,
    );
    expect(damaged.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
  });

  test("a saving throw is never offered the ability check boost", () => {
    const { state, subject, targetSelection, savingThrow } =
      viciousMockerySave();

    expect(
      requireResultHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetSelection,
            savingThrowOutcomeFill(savingThrow, [
              { targetId: spellTargetId, succeeded: false, naturalD20: 5 },
            ]),
          ],
        }),
        "savingThrowOutcome",
      ),
    ).not.toHaveProperty("failedAbilityCheckResourceBoosts");
  });
});

describe("a Bardic Inspiration die on a Concentration save", () => {
  test("a failed Concentration save is asked again with the die, which keeps Concentration", () => {
    const exhale = exhaleOnConcentratingCaster({});
    const state = withBardicInspirationDie(exhale.state, spellCasterId);
    const save = exhaleSaveFill(exhale.saveHole, {
      succeeded: true,
      d20TestRoll: single(15),
    });
    const damage = damageRollFillWithGroups(
      requireResultHole(
        resolveBattleSubject({ state, subject: exhale.subject, fills: [save] }),
        "rolledDice",
      ),
      [[3, 3, 3]],
    );
    const concentration = requireResultHole(
      resolveBattleSubject({
        state,
        subject: exhale.subject,
        fills: [save, damage],
      }),
      "concentrationSavingThrow",
    );
    const concentrationFill = (
      value: ConcentrationSaveFill["value"],
    ): ConcentrationSaveFill => ({
      kind: "concentrationSavingThrow",
      holeId: concentration.holeId,
      value,
    });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state,
          subject: exhale.subject,
          fills: [
            save,
            damage,
            concentrationFill({ succeeded: false, d20TestRoll: single(8) }),
          ],
        }),
        "concentrationSavingThrow",
      ),
    ).toMatchObject({
      bardicInspirationDice: [
        {
          effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
          rollerId: spellCasterId,
          dieSize: 6,
        },
      ],
    });
    const kept = requireResolved(
      resolveBattleSubject({
        state,
        subject: exhale.subject,
        fills: [
          save,
          damage,
          concentrationFill({
            succeeded: false,
            d20TestRoll: single(8),
            d20TestAddedDice: [
              savingThrowBardicDie({ dieRoll: 3, succeeded: true }),
            ],
          }),
        ],
      }),
    ).state;

    expect(requireCombatant(kept, spellCasterId).concentration).not.toBeNull();
    expect(combatantHasBardicInspirationDie(kept, spellCasterId)).toBe(false);
  });
});

function hideCheck(input: {
  readonly tacticalMindUses?: number;
  readonly bardicInspiration?: boolean;
  readonly heroicInspiration?: boolean;
}) {
  const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
  const started = startBattleRight({
    battleId: battleId("failed-test-added-dice-hide"),
    combatants: [
      characterSeed({
        initiative: 20,
        ...(input.heroicInspiration === true
          ? { heroicInspiration: HEROIC_INSPIRATION_AVAILABLE }
          : {}),
        ...(input.tacticalMindUses === undefined
          ? {}
          : {
              classLevel: 2,
              resources: [resource({ usesRemaining: input.tacticalMindUses })],
              unitFeatures: [
                characterBattleFeatureInitForTest(tacticalMindUnit, [
                  { className: "fighter", level: classLevel(2) },
                ]),
              ],
              characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
            }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    hidePrerequisites: hidePrerequisites([
      [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
  const state =
    input.bardicInspiration === true
      ? withBardicInspirationDie(started, fighterId)
      : started;
  const subject = {
    tag: "action",
    actorId: fighterId,
    action: "hide",
  } satisfies BattleSubject;
  const check = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "abilityCheck",
  );
  return { state, subject, check };
}

function viciousMockerySave() {
  const session = spellBattle({
    cantrips: [spellRecord(viciousMockeryUnitId)],
  });
  const state = withBardicInspirationDie(session.state, spellTargetId);
  const act = spellAct({ session, spellId: viciousMockeryUnitId });
  const targetSelection = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    viciousMockeryUnitId,
    spellCasterId,
    spellTargetId,
  );
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetSelection],
    }),
    "savingThrowOutcome",
  );
  return { state, subject: act.subject, targetSelection, savingThrow };
}

/** The state with a d6 Bardic Inspiration die, granted by a Bard, held by the creature. */
function withBardicInspirationDie(
  state: BattleState,
  holderId: CombatantId,
): BattleState {
  const die = grantBardicInspirationToGoblin()
    .combatants.get(goblinId)
    ?.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "bardicInspirationDie" }
      > => effect.kind === "bardicInspirationDie",
    );
  const holder = state.combatants.get(holderId);
  if (die === undefined || holder === undefined) {
    throw new Error("Expected a granted die and its holder.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(holderId, {
      ...holder,
      activeEffects: [...holder.activeEffects, die],
    }),
  };
}

function withAddedDice(
  fill: AbilityCheckFill,
  dice: AbilityCheckAddedDice,
): AbilityCheckFill {
  return { ...fill, value: { ...fill.value, d20TestAddedDice: dice } };
}

type ConcentrationSaveFill = Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>;

type SavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type SavingThrowAddedDice = NonNullable<
  Extract<
    SavingThrowFill["value"]["outcomes"][number],
    { readonly d20TestRoll: unknown }
  >["d20TestAddedDice"]
>;

function withOutcomeAddedDice(
  fill: SavingThrowFill,
  dice: SavingThrowAddedDice,
): SavingThrowFill {
  return {
    ...fill,
    value: {
      ...fill.value,
      outcomes: fill.value.outcomes.map((outcome) =>
        "d20TestRoll" in outcome
          ? { ...outcome, d20TestAddedDice: dice }
          : outcome,
      ),
    },
    // Spreading the value keeps its area or targeted variant, but TypeScript
    // can't follow a spread of that union, so the fill is asserted back to
    // the type it was built from.
  } as SavingThrowFill;
}

function boost(dieRoll: number) {
  return {
    kind: "addDie",
    effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
    dieRoll: DieRollResult(dieRoll),
  } as const;
}

function declineBoost() {
  return {
    kind: "decline",
    effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
  } as const;
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

function savingThrowBardicDie(input: {
  readonly dieRoll: number;
  readonly succeeded: boolean;
}) {
  return { ...bardicDie(input.dieRoll), succeeded: input.succeeded } as const;
}

/**
 * The state replaying the subject after a first pass that took the Fighter's
 * boost on the named roll, spending its use only where it says so.
 */
function withTakenBoost(
  state: BattleState,
  subject: BattleSubject,
  taken: Pick<
    BattleTakenFailedAbilityCheckResourceBoost,
    "holeId" | "useSpent"
  >,
): BattleState {
  return {
    ...state,
    subjectResolutionPhase: {
      kind: "subjectContinuation",
      subject,
      acceptedFailedAbilityCheckResourceBoosts: [
        { ...taken, rollerId: fighterId, dieSize: 10 },
      ],
    },
  };
}

function single(
  d20: number,
): Extract<BattleD20TestRoll, { readonly tag: "single" }> {
  return { tag: "single", naturalD20: DieRollResult(d20) };
}

function hp(state: BattleState, id: CombatantId): number {
  return Number(state.combatants.get(id)?.hp);
}
