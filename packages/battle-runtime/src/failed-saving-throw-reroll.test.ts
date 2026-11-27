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
import { DieRollResult } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import grantedAreaSaveDamageActionInput from "../../surface/content/dragons_breath.json";
import {
  endTurn,
  requireResolved,
  resolveBattleSubject,
  type BattleState,
} from "./battle-runtime.test-support.ts";
import {
  FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleD20TestRoll,
  type BattleHole,
  type BattleRolledSavingThrowOutcome,
} from "./battle-state-execution.ts";
import {
  FAILED_SAVING_THROW_REROLL_MODE_MESSAGE,
  FAILED_SAVING_THROW_REROLL_NOT_FAILED_MESSAGE,
  FAILED_SAVING_THROW_REROLL_UNAVAILABLE_MESSAGE,
  failedSavingThrowRerollOutcomeIssue,
} from "./battle-reducer/failed-saving-throw-reroll.ts";
import {
  dragonsBreathUnitId,
  fighterIndomitableUnitId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  damageTypeChoiceFill,
  knownWillingSpellTargetListFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  decodeUnitRecordSync,
  discoverBattleActCandidates,
  spellCasterId,
  spellTargetId,
  unitLibrary,
  type BattleFill,
  type CombatantId,
  type SpellRecord,
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
    const exhale = exhaleOnIndomitableCaster();
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

function exhaleOnIndomitableCaster() {
  const indomitable = unitLibrary.requireUnit(fighterIndomitableUnitId);
  const session = spellBattle({
    preparedSpells: [dragonsBreathSpell()],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [
      { className: "wizard", level: 3 },
      { className: "fighter", level: 9 },
    ],
    casterSpellcastingSourceClassName: "wizard",
    casterUnitRefs: [{ unit: indomitable, supportProfiles: [] }],
    casterResources: [{ unit: indomitable }],
  });
  const act = bonusSpellAct({
    session,
    spellId: dragonsBreathUnitId,
    slotLevel: 2,
  });
  const cast = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetListFill(
          requireHole(act.initialHoles, "spellTargetList"),
          spellCasterId,
          dragonsBreathUnitId,
          [spellTargetId],
        ),
        damageTypeChoiceFill(
          requireHole(act.initialHoles, "damageTypeChoice"),
          "lightning",
        ),
      ],
    }),
  ).state;
  const ended = endTurn({ state: cast, actorId: spellCasterId });
  if (ended.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  const exhaleAct = discoverBattleActCandidates(ended.state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "grantedAreaSaveDamageAction",
  );
  if (exhaleAct === undefined) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return {
    state: ended.state,
    subject: exhaleAct.subject,
    saveHole: requireHole(exhaleAct.initialHoles, "savingThrowOutcome"),
  };
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(grantedAreaSaveDamageActionInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function exhaleSaveFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcome: Omit<BattleRolledSavingThrowOutcome, "targetId">,
): BattleFill {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId],
      },
      outcomes: [{ targetId: spellCasterId, ...outcome }],
    },
  };
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
