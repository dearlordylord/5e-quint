// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.failed-saving-throw-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// Indomitable on a saving throw a battle asks for (SRD 5.2.1 classes.md,
// Fighter, Indomitable): the saving throw hole is asked again while the save
// stands failed and the Fighter has a use left; the save is rerolled with the
// Fighter level added, and the reroll spends the use. It joins the
// other reroll sources in the order the roller chooses (ASSUMPTIONS.md A55).
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
  type HeroicInspiration,
} from "@dnd/shared/game-facts";
import { d20Roll, DieRollResult } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  deathSavingThrowFill,
  endTurn,
  requireResolved,
  resolveBattleSubject,
  type BattleState,
} from "./battle-runtime.test-support.ts";
import {
  FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleD20TestRoll,
} from "./battle-state-execution.ts";
import {
  FAILED_SAVING_THROW_REROLL_MODE_MESSAGE,
  FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE,
  FAILED_SAVING_THROW_REROLL_UNAVAILABLE_MESSAGE,
  failedSavingThrowRerollOutcomeIssue,
} from "./battle-reducer/failed-saving-throw-reroll.ts";
import {
  fighterIndomitableUnitId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  exhaleOnConcentratingCaster,
  exhaleSaveFill,
} from "./dragons-breath-exhale.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
  unitLibrary,
  type BattleFill,
  type CombatantId,
} from "./unit-profile-admission.test-support.ts";

describe("Indomitable on a failed saving throw", () => {
  test("a Fighter 9 whose save fails is asked again with the Fighter-level reroll", () => {
    const save = viciousMockerySave();

    expect(save.savingThrow).not.toHaveProperty("failedSavingThrowRerolls");
    expect(
      requireResultHole(
        resolveBattleSubject({
          state: save.state,
          subject: save.subject,
          fills: [
            save.targetSelection,
            save.fill({ succeeded: false, d20: 5 }),
          ],
        }),
        "savingThrowOutcome",
      ),
    ).toMatchObject({
      failedSavingThrowRerolls: [
        {
          effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
          rollerId: spellTargetId,
          bonus: 9,
        },
      ],
    });
  });

  test("a save that succeeds is not offered the reroll, and a decision on it is refused", () => {
    const save = viciousMockerySave();

    expect(
      requireResolved(
        resolveBattleSubject({
          state: save.state,
          subject: save.subject,
          fills: [
            save.targetSelection,
            save.fill({ succeeded: true, d20: 15 }),
          ],
        }),
      ).state.combatants.get(spellTargetId)?.hp,
    ).toBe(save.state.combatants.get(spellTargetId)?.hp);
    expect(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: true,
            d20: 15,
            d20TestRerolls: [declineIndomitable()],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE,
    });
  });

  test("a reroll that succeeds stands, and spends the use", () => {
    const save = viciousMockerySave();

    const saved = requireResolved(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: false,
            d20: 5,
            d20TestRerolls: [rerollIndomitable({ succeeded: true, d20: 7 })],
          }),
        ],
      }),
    );

    expect(hp(saved.state, spellTargetId)).toBe(hp(save.state, spellTargetId));
    expect(indomitableUses(saved.state, spellTargetId)).toBe(0);
    expect(saved.state.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
  });

  test("the new roll stands even when it fails again, and still spends the use", () => {
    const save = viciousMockerySave();

    const failedAgain = resolveBattleSubject({
      state: save.state,
      subject: save.subject,
      fills: [
        save.targetSelection,
        save.fill({
          succeeded: false,
          d20: 5,
          d20TestRerolls: [rerollIndomitable({ succeeded: false, d20: 2 })],
        }),
      ],
    });

    requireResultHole(failedAgain, "rolledDice");
    if (failedAgain.tag !== "needsHoles") throw new Error("Expected damage.");
    expect(indomitableUses(failedAgain.state, spellTargetId)).toBe(0);
  });

  test("declining keeps the failed save and the use", () => {
    const save = viciousMockerySave();

    const failed = resolveBattleSubject({
      state: save.state,
      subject: save.subject,
      fills: [
        save.targetSelection,
        save.fill({
          succeeded: false,
          d20: 5,
          d20TestRerolls: [declineIndomitable()],
        }),
      ],
    });

    requireResultHole(failed, "rolledDice");
    if (failed.tag !== "needsHoles") throw new Error("Expected damage.");
    expect(indomitableUses(failed.state, spellTargetId)).toBe(1);
  });

  test("a Fighter with no use left is not offered the reroll and can't take it", () => {
    const save = viciousMockerySave({ usesRemaining: 0 });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state: save.state,
          subject: save.subject,
          fills: [
            save.targetSelection,
            save.fill({ succeeded: false, d20: 5 }),
          ],
        }),
        "rolledDice",
      ),
    ).toBeDefined();
    expect(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: false,
            d20: 5,
            d20TestRerolls: [rerollIndomitable({ succeeded: true, d20: 7 })],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_SAVING_THROW_REROLL_UNAVAILABLE_MESSAGE,
    });
  });

  test("a replay of the subject after the reroll doesn't spend a second use", () => {
    const save = viciousMockerySave();
    const rerolledSave = save.fill({
      succeeded: false,
      d20: 5,
      d20TestRerolls: [rerollIndomitable({ succeeded: false, d20: 2 })],
    });
    const needsDamage = resolveBattleSubject({
      state: save.state,
      subject: save.subject,
      fills: [save.targetSelection, rerolledSave],
    });
    if (needsDamage.tag !== "needsHoles") throw new Error("Expected damage.");
    expect(indomitableUses(needsDamage.state, spellTargetId)).toBe(0);

    const replayed = requireResolved(
      resolveBattleSubject({
        state: needsDamage.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          rerolledSave,
          damageRollFillWithGroups(
            requireResultHole(needsDamage, "rolledDice"),
            [[3]],
          ),
        ],
      }),
    );
    expect(indomitableUses(replayed.state, spellTargetId)).toBe(0);
    expect(hp(replayed.state, spellTargetId)).toBe(
      hp(save.state, spellTargetId) - 3,
    );
  });

  test("the new roll keeps the save's roll mode", () => {
    const save = viciousMockerySave();

    expect(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: false,
            d20: 5,
            d20TestRerolls: [
              {
                kind: "reroll",
                effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
                replacement: {
                  succeeded: true,
                  d20TestRoll: {
                    tag: "multiple",
                    rollMode: "advantage",
                    first: DieRollResult(3),
                    second: DieRollResult(14),
                  },
                },
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_SAVING_THROW_REROLL_MODE_MESSAGE,
    });
  });
});

describe("Indomitable under Advantage or Disadvantage", () => {
  const failedPair = (rollMode: "advantage" | "disadvantage") =>
    ({
      tag: "multiple",
      rollMode,
      first: DieRollResult(4),
      second: DieRollResult(3),
    }) as const;

  test.each(["advantage", "disadvantage"] as const)(
    "under %s the reroll replaces one chosen die",
    (rollMode) => {
      expect(
        failedSavingThrowRerollOutcomeIssue({
          availability: "available",
          roll: { succeeded: false, d20TestRoll: failedPair(rollMode) },
          decision: {
            kind: "rerollRolledDie",
            effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
            replacement: {
              die: "second",
              result: {
                succeeded: true,
                d20TestRoll: {
                  ...failedPair(rollMode),
                  second: DieRollResult(18),
                },
              },
            },
          },
        }),
      ).toBeNull();
    },
  );

  test("a chosen-die reroll can't change the die it keeps", () => {
    expect(
      failedSavingThrowRerollOutcomeIssue({
        availability: "available",
        roll: { succeeded: false, d20TestRoll: failedPair("advantage") },
        decision: {
          kind: "rerollRolledDie",
          effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
          replacement: {
            die: "second",
            result: {
              succeeded: true,
              d20TestRoll: {
                ...failedPair("advantage"),
                first: DieRollResult(9),
                second: DieRollResult(18),
              },
            },
          },
        },
      }),
    ).not.toBeNull();
  });
});

describe("Indomitable alongside Heroic Inspiration (A55)", () => {
  test("a Heroic Inspiration reroll that fails again is asked about Indomitable on the new roll", () => {
    const save = viciousMockerySave({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const heroicInspirationReroll = {
      kind: "reroll",
      effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
      replacement: { succeeded: false, d20TestRoll: single(3) },
    } as const;

    expect(
      requireResultHole(
        resolveBattleSubject({
          state: save.state,
          subject: save.subject,
          fills: [
            save.targetSelection,
            save.fill({
              succeeded: false,
              d20: 5,
              d20TestRerolls: [heroicInspirationReroll],
            }),
          ],
        }),
        "savingThrowOutcome",
      ),
    ).toMatchObject({
      failedSavingThrowRerolls: [
        { effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND, bonus: 9 },
      ],
    });
    const saved = requireResolved(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: false,
            d20: 5,
            d20TestRerolls: [
              heroicInspirationReroll,
              rerollIndomitable({ succeeded: true, d20: 12 }),
            ],
          }),
        ],
      }),
    );
    expect(indomitableUses(saved.state, spellTargetId)).toBe(0);
    expect(heroicInspiration(saved.state, spellTargetId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("Indomitable can go first, and Heroic Inspiration then rerolls its new roll", () => {
    const save = viciousMockerySave({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const saved = requireResolved(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: false,
            d20: 5,
            d20TestRerolls: [
              rerollIndomitable({ succeeded: false, d20: 2 }),
              {
                kind: "reroll",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
                replacement: { succeeded: true, d20TestRoll: single(17) },
              },
            ],
          }),
        ],
      }),
    );
    expect(hp(saved.state, spellTargetId)).toBe(hp(save.state, spellTargetId));
    expect(indomitableUses(saved.state, spellTargetId)).toBe(0);
    expect(heroicInspiration(saved.state, spellTargetId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("once Heroic Inspiration turns the save into a success, a decline of Indomitable answers no offer", () => {
    const save = viciousMockerySave({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    expect(
      resolveBattleSubject({
        state: save.state,
        subject: save.subject,
        fills: [
          save.targetSelection,
          save.fill({
            succeeded: false,
            d20: 5,
            d20TestRerolls: [
              {
                kind: "reroll",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
                replacement: { succeeded: true, d20TestRoll: single(17) },
              },
              declineIndomitable(),
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE,
    });
  });
});

describe("Indomitable on a Concentration save", () => {
  test("a failed Concentration save is asked again with the reroll, which keeps Concentration", () => {
    const indomitable = unitLibrary.requireUnit(fighterIndomitableUnitId);
    const exhale = exhaleOnConcentratingCaster({
      casterClassLevels: [
        { className: "wizard", level: 3 },
        { className: "fighter", level: 9 },
      ],
      casterSpellcastingSourceClassName: "wizard",
      casterUnitRefs: [{ unit: indomitable, supportProfiles: [] }],
      casterResources: [{ unit: indomitable }],
    });
    const save = exhaleSaveFill(exhale.saveHole, {
      succeeded: true,
      d20TestRoll: single(15),
    });
    const needsDamage = resolveBattleSubject({
      state: exhale.state,
      subject: exhale.subject,
      fills: [save],
    });
    const damage = damageRollFillWithGroups(
      requireResultHole(needsDamage, "rolledDice"),
      [[3, 3, 3]],
    );
    const concentration = requireResultHole(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [save, damage],
      }),
      "concentrationSavingThrow",
    );
    const concentrationFill = (
      value: Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >["value"],
    ): BattleFill => ({
      kind: "concentrationSavingThrow",
      holeId: concentration.holeId,
      value,
    });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state: exhale.state,
          subject: exhale.subject,
          fills: [
            save,
            damage,
            concentrationFill({ succeeded: false, d20TestRoll: single(4) }),
          ],
        }),
        "concentrationSavingThrow",
      ),
    ).toMatchObject({
      failedSavingThrowRerolls: [
        {
          effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
          rollerId: spellCasterId,
          bonus: 9,
        },
      ],
    });
    const kept = requireResolved(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [
          save,
          damage,
          concentrationFill({
            succeeded: false,
            d20TestRoll: single(4),
            d20TestRerolls: [rerollIndomitable({ succeeded: true, d20: 6 })],
          }),
        ],
      }),
    );
    expect(requireCombatant(kept.state, spellCasterId).concentration).not.toBe(
      null,
    );
    expect(indomitableUses(kept.state, spellCasterId)).toBe(0);
  });
});

describe("Indomitable on a Death Saving Throw", () => {
  test("a failed death save is asked again with the Fighter-level reroll", () => {
    const dying = dyingFighter();

    expect(
      requireResultHole(
        endTurn({
          state: dying.state,
          actorId: spellCasterId,
          fills: [deathSavingThrowFill(dying.deathSave, 6)],
        }),
        "deathSavingThrow",
      ),
    ).toMatchObject({
      failedSavingThrowRerolls: [
        {
          effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
          rollerId: spellTargetId,
          bonus: 9,
        },
      ],
    });
  });

  test("the bonus counts toward 10, and the reroll spends the use", () => {
    const dying = dyingFighter();
    const saved = dying.resolve({
      roll: 6,
      d20TestRerolls: [rerollIndomitableDeathSave(2)],
    });

    expect(deathSaves(saved, spellTargetId)).toEqual({
      successes: 1,
      failures: 0,
    });
    expect(indomitableUses(saved, spellTargetId)).toBe(0);
  });

  test("a 1 on the new d20 is two failures and a 20 regains a Hit Point, whatever the bonus", () => {
    const dying = dyingFighter();
    const failed = dying.resolve({
      roll: 6,
      d20TestRerolls: [rerollIndomitableDeathSave(1)],
    });
    expect(deathSaves(failed, spellTargetId)).toEqual({
      successes: 0,
      failures: 2,
    });
    expect(indomitableUses(failed, spellTargetId)).toBe(0);

    const revived = dying.resolve({
      roll: 6,
      d20TestRerolls: [rerollIndomitableDeathSave(20)],
    });
    expect(hp(revived, spellTargetId)).toBe(1);
  });

  test("a decline keeps the failure and the use", () => {
    const dying = dyingFighter();
    const failed = dying.resolve({
      roll: 6,
      d20TestRerolls: [declineIndomitable()],
    });

    expect(deathSaves(failed, spellTargetId)).toEqual({
      successes: 0,
      failures: 1,
    });
    expect(indomitableUses(failed, spellTargetId)).toBe(1);
  });

  test("a natural 1 is offered the reroll, which can turn it into a success", () => {
    const dying = dyingFighter();
    const saved = dying.resolve({
      roll: 1,
      d20TestRerolls: [rerollIndomitableDeathSave(5)],
    });

    expect(deathSaves(saved, spellTargetId)).toEqual({
      successes: 1,
      failures: 0,
    });
  });

  test("a death save that succeeds is not offered the reroll, and a decision on it is refused", () => {
    const dying = dyingFighter();

    expect(deathSaves(dying.resolve({ roll: 12 }), spellTargetId)).toEqual({
      successes: 1,
      failures: 0,
    });
    expect(
      endTurn({
        state: dying.state,
        actorId: spellCasterId,
        fills: [
          deathSavingThrowFill(dying.deathSave, {
            roll: 12,
            d20TestRerolls: [declineIndomitable()],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE,
    });
  });

  test("a Fighter without a use left is not offered the reroll, and it is refused", () => {
    const dying = dyingFighter({ usesRemaining: 0 });

    expect(deathSaves(dying.resolve({ roll: 6 }), spellTargetId)).toEqual({
      successes: 0,
      failures: 1,
    });
    expect(
      endTurn({
        state: dying.state,
        actorId: spellCasterId,
        fills: [
          deathSavingThrowFill(dying.deathSave, {
            roll: 6,
            d20TestRerolls: [rerollIndomitableDeathSave(15)],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: FAILED_SAVING_THROW_REROLL_UNAVAILABLE_MESSAGE,
    });
  });

  test("a Heroic Inspiration reroll after Indomitable keeps the bonus", () => {
    const dying = dyingFighter({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const saved = dying.resolve({
      roll: 6,
      d20TestRerolls: [
        rerollIndomitableDeathSave(1),
        rerollHeroicInspirationDeathSave(2),
      ],
    });

    expect(deathSaves(saved, spellTargetId)).toEqual({
      successes: 1,
      failures: 0,
    });
    expect(indomitableUses(saved, spellTargetId)).toBe(0);
    expect(heroicInspiration(saved, spellTargetId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("Indomitable after a Heroic Inspiration reroll that still fails", () => {
    const dying = dyingFighter({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });

    expect(
      requireResultHole(
        endTurn({
          state: dying.state,
          actorId: spellCasterId,
          fills: [
            deathSavingThrowFill(dying.deathSave, {
              roll: 4,
              d20TestRerolls: [rerollHeroicInspirationDeathSave(5)],
            }),
          ],
        }),
        "deathSavingThrow",
      ),
    ).toMatchObject({
      failedSavingThrowRerolls: [{ bonus: 9 }],
    });
    const saved = dying.resolve({
      roll: 4,
      d20TestRerolls: [
        rerollHeroicInspirationDeathSave(5),
        rerollIndomitableDeathSave(3),
      ],
    });
    expect(deathSaves(saved, spellTargetId)).toEqual({
      successes: 1,
      failures: 0,
    });
  });
});

/**
 * A Fighter 9 with Indomitable at 0 Hit Points, whose turn starts when the
 * caster ends theirs, with the Death Saving Throw hole that start asks.
 */
function dyingFighter(
  input: {
    readonly usesRemaining?: number;
    readonly heroicInspiration?: HeroicInspiration;
  } = {},
) {
  const indomitable = unitLibrary.requireUnit(fighterIndomitableUnitId);
  const session = spellBattle({
    targetHp: 0,
    targetClassLevels: [{ className: "fighter", level: 9 }],
    targetUnitRefs: [{ unit: indomitable, supportProfiles: [] }],
    targetResources: [
      {
        unit: indomitable,
        ...(input.usesRemaining === undefined
          ? {}
          : { usesRemaining: input.usesRemaining }),
      },
    ],
    ...(input.heroicInspiration === undefined
      ? {}
      : { targetHeroicInspiration: input.heroicInspiration }),
  });
  const state = session.state;
  const deathSave = requireResultHole(
    endTurn({ state, actorId: spellCasterId }),
    "deathSavingThrow",
  );
  return {
    state,
    deathSave,
    resolve: (roll: Parameters<typeof deathSavingThrowFill>[1]) =>
      requireResolved(
        endTurn({
          state,
          actorId: spellCasterId,
          fills: [deathSavingThrowFill(deathSave, roll)],
        }),
      ).state,
  };
}

function rerollIndomitableDeathSave(d20: number) {
  return {
    kind: "reroll",
    effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
    replacement: d20Roll(d20),
  } as const;
}

function rerollHeroicInspirationDeathSave(d20: number) {
  return {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: d20Roll(d20),
  } as const;
}

function deathSaves(state: BattleState, id: CombatantId) {
  const lifecycle = state.combatants.get(id)?.zeroHpLifecycle;
  if (lifecycle === undefined || !("deathSaves" in lifecycle)) {
    throw new Error("Expected a creature that makes Death Saving Throws.");
  }
  return lifecycle.deathSaves.tag === "dying"
    ? lifecycle.deathSaves.deathSaves
    : lifecycle.deathSaves;
}

function viciousMockerySave(
  input: {
    readonly usesRemaining?: number;
    readonly heroicInspiration?: HeroicInspiration;
  } = {},
) {
  const indomitable = unitLibrary.requireUnit(fighterIndomitableUnitId);
  const state = spellBattle({
    cantrips: [spellRecord(viciousMockeryUnitId)],
    targetClassLevels: [{ className: "fighter", level: 9 }],
    targetUnitRefs: [{ unit: indomitable, supportProfiles: [] }],
    targetResources: [
      {
        unit: indomitable,
        ...(input.usesRemaining === undefined
          ? {}
          : { usesRemaining: input.usesRemaining }),
      },
    ],
    ...(input.heroicInspiration === undefined
      ? {}
      : { targetHeroicInspiration: input.heroicInspiration }),
  });
  const act = spellAct({ session: state, spellId: viciousMockeryUnitId });
  const targetSelection = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    viciousMockeryUnitId,
    spellCasterId,
    spellTargetId,
  );
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetSelection],
    }),
    "savingThrowOutcome",
  );
  return {
    state: state.state,
    subject: act.subject,
    targetSelection,
    savingThrow,
    fill: (outcome: {
      readonly succeeded: boolean;
      readonly d20: number;
      readonly d20TestRerolls?: SingleRollRerolls;
    }) =>
      savingThrowOutcomeFill(savingThrow, [
        {
          targetId: spellTargetId,
          succeeded: outcome.succeeded,
          naturalD20: outcome.d20,
          ...(outcome.d20TestRerolls === undefined
            ? {}
            : { d20TestRerolls: outcome.d20TestRerolls }),
        },
      ]),
  };
}

type SingleRollRerolls = NonNullable<
  Extract<
    Parameters<typeof savingThrowOutcomeFill>[1][number],
    {
      readonly rolledD20s?: never;
      readonly d20TestRoll?: never;
      readonly withoutRoll?: never;
    }
  >["d20TestRerolls"]
>;

function single(
  d20: number,
): Extract<BattleD20TestRoll, { readonly tag: "single" }> {
  return { tag: "single", naturalD20: DieRollResult(d20) };
}

function rerollIndomitable(input: {
  readonly succeeded: boolean;
  readonly d20: number;
}) {
  return {
    kind: "reroll",
    effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
    replacement: { succeeded: input.succeeded, d20TestRoll: single(input.d20) },
  } as const;
}

function declineIndomitable() {
  return {
    kind: "decline",
    effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
  } as const;
}

function hp(state: BattleState, id: CombatantId): number {
  return Number(state.combatants.get(id)?.hp);
}

function indomitableUses(state: BattleState, id: CombatantId): number {
  const creature = state.combatants.get(id);
  if (creature?.origin.kind !== "character") return Number.NaN;
  const [resource] = creature.origin.resources;
  return resource !== undefined && "usesRemaining" in resource
    ? Number(resource.usesRemaining)
    : Number.NaN;
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
