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

import {
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
} from "./battle-reducer/failed-saving-throw-reroll.ts";
import {
  fighterIndomitableUnitId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
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
  spellCasterId,
  spellTargetId,
  unitLibrary,
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
});

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
