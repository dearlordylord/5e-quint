import { describe, expect, test } from "vitest";
import {
  battleAreaId,
  combatantId,
  type BattleFill,
  type BattleHole,
  type CombatantId,
} from "./index.ts";
import {
  baneUnitId,
  dissonantWhispersUnitId,
  enthrallUnitId,
  greaseUnitId,
  holdPersonUnitId,
  sleepUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
  selfOriginCubePushArea,
  thunderwaveSavingThrowOutcomeFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  movementFeet,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";

type SavingThrowValue = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>["value"];
type SavingThrowHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;
type ActionSpellAct = ReturnType<typeof spellAct>;

function outcome(targetId: CombatantId) {
  return { targetId, succeeded: false } as const;
}

function expectPublicSaveValidation(input: {
  readonly value: SavingThrowValue;
  readonly session: ReturnType<typeof spellBattle>;
  readonly act: ActionSpellAct;
  readonly priorFills?: readonly BattleFill[];
  readonly hole: SavingThrowHole;
  readonly expected: string | null;
}) {
  const baseFill = savingThrowOutcomeFill(
    input.hole,
    input.value.outcomes.map(({ targetId, succeeded }) => ({
      targetId,
      succeeded,
    })),
  );
  const result = resolveBattleSubject({
    state: input.session.state,
    subject: input.act.subject,
    fills: [
      ...(input.priorFills ?? []),
      {
        ...baseFill,
        value: input.value,
      },
    ],
  });
  if (input.expected === null) {
    expect(result.tag).not.toBe("invalid");
  } else {
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: input.expected,
    });
  }
}

describe("public Saving Throw outcome validation", () => {
  test("validates save-gated roll-modifier outcome lists", () => {
    const secondTargetId = combatantId("save-validation:bane-target-2");
    const thirdTargetId = combatantId("save-validation:bane-target-3");
    const foreignTargetId = combatantId("save-validation:foreign-target");
    const baneSession = spellBattle({
      preparedSpells: [spellRecord(baneUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      extraTargetIds: [secondTargetId, thirdTargetId],
    });
    const baneAct = spellAct({
      session: baneSession,
      spellId: baneUnitId,
      slotLevel: 1,
    });
    const baneTargetList = requireHole(baneAct.initialHoles, "spellTargetList");
    const baneTargetFill = spellTargetListFill(
      baneTargetList,
      spellCasterId,
      baneUnitId,
      [spellTargetId, secondTargetId, thirdTargetId],
    );
    const baneSave = requireResultHole(
      resolveBattleSubject({
        state: baneSession.state,
        subject: baneAct.subject,
        fills: [baneTargetFill],
      }),
      "savingThrowOutcome",
    );
    const expectBaneValidation = (
      value: SavingThrowValue,
      expected: string | null,
    ) =>
      expectPublicSaveValidation({
        value,
        expected,
        session: baneSession,
        act: baneAct,
        priorFills: [baneTargetFill],
        hole: baneSave,
      });

    expectBaneValidation(
      { outcomes: [] },
      "Save-gated roll modifier spell must include at least one target Saving Throw outcome.",
    );
    expectBaneValidation(
      { outcomes: [outcome(foreignTargetId)] },
      "Save-gated roll modifier spell target must be a combatant in this battle.",
    );
    expectBaneValidation(
      {
        outcomes: [outcome(spellTargetId), outcome(spellTargetId)],
      },
      "Save-gated roll modifier spell Saving Throw outcomes must not duplicate targets.",
    );
    expectBaneValidation(
      {
        outcomes: [
          outcome(spellCasterId),
          outcome(spellTargetId),
          outcome(secondTargetId),
          outcome(thirdTargetId),
        ],
      },
      "Save-gated roll modifier spell Saving Throw outcomes exceed the selected spell's target count.",
    );

    const enthrallSession = spellBattle({
      preparedSpells: [spellRecord(enthrallUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const enthrallAct = spellAct({
      session: enthrallSession,
      spellId: enthrallUnitId,
      slotLevel: 2,
    });
    const enthrallTargetList = requireHole(
      enthrallAct.initialHoles,
      "spellTargetList",
    );
    const enthrallTargetFill = spellTargetListFill(
      enthrallTargetList,
      spellCasterId,
      enthrallUnitId,
      [spellTargetId],
    );
    const enthrallSave = requireResultHole(
      resolveBattleSubject({
        state: enthrallSession.state,
        subject: enthrallAct.subject,
        fills: [enthrallTargetFill],
      }),
      "savingThrowOutcome",
    );
    expectPublicSaveValidation({
      value: { outcomes: [outcome(spellTargetId)] },
      session: enthrallSession,
      act: enthrallAct,
      priorFills: [enthrallTargetFill],
      hole: enthrallSave,
      expected: null,
    });
  });

  test("validates single-target and target-list save outcomes", () => {
    const dissonantSession = spellBattle({
      preparedSpells: [spellRecord(dissonantWhispersUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const dissonantAct = spellAct({
      session: dissonantSession,
      spellId: dissonantWhispersUnitId,
      slotLevel: 1,
    });
    const dissonantTarget = requireHole(
      dissonantAct.initialHoles,
      "targetChoice",
    );
    const dissonantTargetFill = spellTargetFill(
      dissonantTarget,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const dissonantSave = requireResultHole(
      resolveBattleSubject({
        state: dissonantSession.state,
        subject: dissonantAct.subject,
        fills: [dissonantTargetFill],
      }),
      "savingThrowOutcome",
    );
    const singleTargetCases: ReadonlyArray<{
      readonly value: SavingThrowValue;
      readonly expected: string | null;
    }> = [
      {
        value: { outcomes: [] },
        expected:
          "Save-gate spell must include at least one affected target Saving Throw outcome.",
      },
      {
        value: { outcomes: [outcome(spellCasterId)] },
        expected:
          "Single-target save-gate spell Saving Throw outcome must match the selected target.",
      },
      {
        value: { outcomes: [outcome(spellTargetId)] },
        expected: null,
      },
    ];
    for (const testCase of singleTargetCases) {
      expectPublicSaveValidation({
        ...testCase,
        session: dissonantSession,
        act: dissonantAct,
        priorFills: [dissonantTargetFill],
        hole: dissonantSave,
      });
    }

    const secondTargetId = combatantId("save-validation:hold-target-2");
    const holdSession = spellBattle({
      preparedSpells: [spellRecord(holdPersonUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const holdAct = spellAct({
      session: holdSession,
      spellId: holdPersonUnitId,
      slotLevel: 3,
    });
    const holdTargetList = requireHole(holdAct.initialHoles, "spellTargetList");
    const targetListCases: ReadonlyArray<{
      readonly value: SavingThrowValue;
      readonly targetListIds: readonly CombatantId[];
      readonly expected: string | null;
    }> = [
      {
        value: {
          area: {
            originAnchorId: spellCasterId,
            affectedTargetIds: [spellTargetId],
          },
          outcomes: [outcome(spellTargetId)],
        },
        targetListIds: [spellTargetId],
        expected:
          "Target-list save-gate spell outcomes must not include area facts.",
      },
      {
        value: { outcomes: [] },
        targetListIds: [spellTargetId],
        expected:
          "Target-list save-gate spell must include at least one target Saving Throw outcome.",
      },
      {
        value: {
          outcomes: [outcome(spellTargetId), outcome(secondTargetId)],
        },
        targetListIds: [spellTargetId],
        expected:
          "Target-list save-gate spell Saving Throw outcomes exceed the selected spell's target count.",
      },
      {
        value: { outcomes: [outcome(spellCasterId)] },
        targetListIds: [spellTargetId],
        expected:
          "Target-list save-gate spell Saving Throw outcomes must match the selected targets.",
      },
      {
        value: {
          outcomes: [outcome(spellTargetId), outcome(spellTargetId)],
        },
        targetListIds: [spellTargetId, secondTargetId],
        expected:
          "Target-list save-gate spell Saving Throw outcomes must not duplicate targets.",
      },
      {
        value: {
          outcomes: [outcome(spellTargetId), outcome(secondTargetId)],
        },
        targetListIds: [spellTargetId, secondTargetId],
        expected: null,
      },
    ];
    for (const testCase of targetListCases) {
      const targetFill = spellTargetListFill(
        holdTargetList,
        spellCasterId,
        holdPersonUnitId,
        testCase.targetListIds,
      );
      const save = requireResultHole(
        resolveBattleSubject({
          state: holdSession.state,
          subject: holdAct.subject,
          fills: [targetFill],
        }),
        "savingThrowOutcome",
      );
      expectPublicSaveValidation({
        value: testCase.value,
        expected: testCase.expected,
        session: holdSession,
        act: holdAct,
        priorFills: [targetFill],
        hole: save,
      });
    }
  });

  test("validates Sleep point-origin target facts", () => {
    const foreignTargetId = combatantId("save-validation:sleep-foreign");
    const session = spellBattle({
      preparedSpells: [spellRecord(sleepUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: sleepUnitId,
      slotLevel: 1,
    });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const area = {
      originAnchorId: spellCasterId,
      affectedTargetIds: [spellTargetId],
    } as const;
    const cases: ReadonlyArray<{
      readonly value: SavingThrowValue;
      readonly expected: string | null;
    }> = [
      {
        value: {
          area: { ...area, originAnchorId: foreignTargetId },
          outcomes: [outcome(spellTargetId)],
        },
        expected:
          "Sleep point-origin Sphere origin anchor must be a combatant in this battle.",
      },
      {
        value: {
          area: {
            ...area,
            affectedTargetIds: [spellTargetId, spellTargetId],
          },
          outcomes: [outcome(spellTargetId)],
        },
        expected:
          "Sleep point-origin Sphere targets must not duplicate targets.",
      },
      {
        value: { area: { ...area, affectedTargetIds: [] }, outcomes: [] },
        expected: "Sleep must target at least one selected creature.",
      },
      {
        value: {
          area: { ...area, affectedTargetIds: [foreignTargetId] },
          outcomes: [outcome(foreignTargetId)],
        },
        expected:
          "Sleep point-origin Sphere target must be a combatant in this battle.",
      },
      {
        value: { area, outcomes: [outcome(spellCasterId)] },
        expected:
          "Sleep Saving Throw outcomes must match selected Sphere targets.",
      },
      {
        value: {
          area,
          outcomes: [outcome(spellTargetId), outcome(spellTargetId)],
        },
        expected: "Sleep Saving Throw outcomes must not duplicate targets.",
      },
      {
        value: { area, outcomes: [] },
        expected:
          "Sleep Saving Throw outcomes must cover every selected target that is not an automatic success.",
      },
      { value: { area, outcomes: [outcome(spellTargetId)] }, expected: null },
    ];
    for (const testCase of cases) {
      expectPublicSaveValidation({
        ...testCase,
        session,
        act,
        hole: save,
      });
    }
  });

  test("validates Grease ground-area target facts", () => {
    const secondTargetId = combatantId("save-validation:grease-target-2");
    const foreignTargetId = combatantId("save-validation:grease-foreign");
    const session = spellBattle({
      preparedSpells: [spellRecord(greaseUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const area = {
      kind: "persistentAreaSaveConditionArea",
      areaId: battleAreaId("save-validation:grease-area"),
      originAnchorId: spellCasterId,
      affectedTargetIds: [spellTargetId],
    } as const;
    const cases: ReadonlyArray<{
      readonly value: SavingThrowValue;
      readonly expected: string | null;
    }> = [
      {
        value: {
          area: { ...area, originAnchorId: foreignTargetId },
          outcomes: [outcome(spellTargetId)],
        },
        expected:
          "Grease ground-area origin anchor must be a combatant in this battle.",
      },
      {
        value: {
          area: {
            ...area,
            affectedTargetIds: [spellTargetId, spellTargetId],
          },
          outcomes: [outcome(spellTargetId)],
        },
        expected:
          "Grease ground-area affected targets must not duplicate targets.",
      },
      {
        value: {
          area: { ...area, affectedTargetIds: [foreignTargetId] },
          outcomes: [outcome(foreignTargetId)],
        },
        expected:
          "Grease ground-area affected target must be a combatant in this battle.",
      },
      {
        value: { area, outcomes: [outcome(secondTargetId)] },
        expected:
          "Grease Saving Throw outcomes must match the table-supplied ground-area affected targets.",
      },
      {
        value: {
          area,
          outcomes: [outcome(spellTargetId), outcome(spellTargetId)],
        },
        expected: "Grease Saving Throw outcomes must not duplicate targets.",
      },
      {
        value: { area, outcomes: [] },
        expected:
          "Grease Saving Throw outcomes must cover every table-supplied ground-area affected target.",
      },
      { value: { area, outcomes: [outcome(spellTargetId)] }, expected: null },
    ];
    for (const testCase of cases) {
      expectPublicSaveValidation({
        ...testCase,
        session,
        act,
        hole: save,
      });
    }
  });

  test("validates Thunderwave post-save area facts", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(thunderwaveUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: thunderwaveUnitId,
      slotLevel: 1,
    });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const outcomeInput = [
      { targetId: spellTargetId, succeeded: false },
    ] as const;

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [savingThrowOutcomeFill(save, outcomeInput)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Thunderwave requires caller-supplied push, object, and audible-boom area facts.",
    });

    const area = selfOriginCubePushArea([spellTargetId], [spellTargetId]);
    const fill = thunderwaveSavingThrowOutcomeFill(save, outcomeInput);
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          {
            ...fill,
            value: {
              ...fill.value,
              area: {
                ...area,
                unsecuredObjectPushes: area.unsecuredObjectPushes.map(
                  (push) => ({
                    ...push,
                    disposition: {
                      ...push.disposition,
                      distanceFeet: movementFeet(5),
                    },
                  }),
                ),
              },
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Thunderwave push disposition must use the spell's 10-foot distance.",
    });
  });
});
