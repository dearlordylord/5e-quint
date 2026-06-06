// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV40 grease
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-grease-ground-hazard
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-heightened-save-disadvantage
import { resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { HEIGHTENED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  battleId,
  characterSeed,
  partySide,
  startBattleRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  greaseAreaId,
  greaseUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveSecondTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  type AvailableBattleAct,
  type BattleState,
  discoverBattleActs,
} from "./index.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  greaseGroundHazardEndTurnAct,
  greaseGroundHazardSaveAct,
  greaseSavingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  elapsedTimeTicks,
  endTurn,
  Hp,
  resolveBattleSubject,
  sameBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

describe("QMBT14 deterministic Grease ground hazard admission", () => {
  test("grease is admitted as a one-minute point-origin Cube ground hazard", () => {
    const spell = spellRecord(greaseUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: greaseUnitId,
      slotLevel: 1,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(greaseUnitId, 1, "greaseGroundHazard"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Grease point-origin Cube Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "greaseGroundHazard",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "dex",
        targeting: { kind: "pointOriginCube", sideFeet: 10 },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("grease cast records the ground hazard and applies Prone on failed appearance saves", () => {
    const spell = spellRecord(greaseUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: greaseUnitId, slotLevel: 1 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        greaseSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
        combatants: [
          expect.objectContaining({ combatantId: spellCasterId }),
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Grease cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "greaseGroundHazard",
        sourceSpellId: greaseUnitId,
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
      }),
    ]);
  });
  test("Heightened Grease stores the selected target on the ground hazard occurrence", () => {
    const cast = castHeightenedGreaseWithSelectedTarget();

    const greaseEffect = requireCombatant(
      cast,
      spellCasterId,
    ).activeEffects.find((effect) => effect.kind === "greaseGroundHazard");

    expect(greaseEffect).toEqual(
      expect.objectContaining({
        kind: "greaseGroundHazard",
        areaId: greaseAreaId,
        heightenedSpellTargetDisadvantage: {
          kind: "heightenedSpellTargetDisadvantage",
          targetId: spellTargetId,
        },
      }),
    );
  });
  test("grease saving throw resolution rejects non-ground-area facts", () => {
    const spell = spellRecord(greaseUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: greaseUnitId, slotLevel: 1 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrow.holeId,
            value: {
              area: {
                originAnchorId: spellCasterId,
                affectedTargetIds: [spellTargetId],
              },
              outcomes: [{ targetId: spellTargetId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Grease requires a ground-area id.",
    });
  });
  test("grease entry saves are table-triggered through the active ground hazard", () => {
    const spell = spellRecord(greaseUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: greaseUnitId, slotLevel: 1 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [greaseSavingThrowOutcomeFill(savingThrow, [])],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Grease empty-area cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }

    const entryAct = greaseGroundHazardSaveAct(
      targetTurn.state,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    expect(entrySave).toMatchObject({
      ability: "dex",
      greaseGroundHazard: {
        targetId: spellTargetId,
        sourceSpellId: greaseUnitId,
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        trigger: "entersArea",
      },
    });
    const entrySucceeded = resolveBattleSubject({
      state: targetTurn.state,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, true),
      ],
    });
    if (entrySucceeded.tag !== "resolved") {
      throw new Error("Expected Grease entry save to resolve.");
    }
    expect(requireCombatant(entrySucceeded.state, spellTargetId)).toMatchObject(
      { conditions: expect.not.arrayContaining(["prone"]) },
    );
  });
  test("Heightened Grease entry saves project Disadvantage for the selected target", () => {
    const cast = castHeightenedGreaseWithSelectedTarget();
    const targetTurn = endTurn({
      state: cast,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }
    const selectedEntryAct = greaseGroundHazardSaveAct(
      targetTurn.state,
      spellTargetId,
      "entersArea",
    );
    const selectedEntrySave = requireHole(
      selectedEntryAct.initialHoles,
      "savingThrowOutcome",
    );

    expect(selectedEntrySave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });

    const entryFailed = resolveBattleSubject({
      state: targetTurn.state,
      subject: selectedEntryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(
          selectedEntrySave,
          spellTargetId,
          false,
        ),
      ],
    });

    expect(entryFailed).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
  });
  test("grease end-turn saves resolve at the End Turn boundary", () => {
    const spell = spellRecord(greaseUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: greaseUnitId, slotLevel: 1 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [greaseSavingThrowOutcomeFill(savingThrow, [])],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Grease empty-area cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }

    const endTurnAct = greaseGroundHazardEndTurnAct(
      targetTurn.state,
      spellTargetId,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const endTurnFailed = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(endTurnSave, spellTargetId, false),
      ],
    });

    expect(endTurnFailed).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellCasterId,
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ],
      },
    });
  });
  test("Heightened Grease end-turn saves project Disadvantage only for the selected target", () => {
    const cast = castHeightenedGreaseWithSelectedTarget();
    const targetTurn = endTurn({
      state: cast,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }

    const endTurnAct = greaseGroundHazardEndTurnAct(
      targetTurn.state,
      spellTargetId,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    expect(endTurnSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });

    const selectedTurnDone = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(endTurnSave, spellTargetId, true),
      ],
    });
    if (selectedTurnDone.tag !== "resolved") {
      throw new Error("Expected selected Grease end-turn save to resolve.");
    }

    const nonSelectedEndTurnAct = greaseGroundHazardEndTurnAct(
      selectedTurnDone.state,
      thunderwaveSecondTargetId,
    );
    const nonSelectedEndTurnSave = requireHole(
      nonSelectedEndTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    expect(nonSelectedEndTurnSave.targetRollModes).not.toContainEqual({
      targetId: thunderwaveSecondTargetId,
      rollMode: "disadvantage",
    });
  });
  test("grease subject identity distinguishes hazards and triggers", () => {
    const base = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "greaseGroundHazardSave" as const,
      sourceCombatantId: spellCasterId,
      sourceSpellId: spellId(greaseUnitId),
      areaId: greaseAreaId,
    };

    expect(
      sameBattleSubject(
        { ...base, trigger: "entersArea" },
        { ...base, trigger: "endsTurnInArea" },
      ),
    ).toBe(false);
    expect(
      sameBattleSubject(
        { ...base, trigger: "entersArea" },
        { ...base, areaId: "second-grease-ground-area", trigger: "entersArea" },
      ),
    ).toBe(false);
    expect(
      sameBattleSubject(
        { ...base, trigger: "entersArea" },
        {
          ...base,
          sourceCombatantId: spellTargetId,
          trigger: "entersArea",
        },
      ),
    ).toBe(false);
    expect(
      sameBattleSubject(
        { ...base, trigger: "entersArea" },
        {
          ...base,
          sourceSpellId: spellId("other_spell"),
          trigger: "entersArea",
        },
      ),
    ).toBe(false);
  });
  test("grease end-turn save asks for End Turn holes before advancing", () => {
    const spell = spellRecord(greaseUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: greaseUnitId, slotLevel: 1 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [greaseSavingThrowOutcomeFill(savingThrow, [])],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Grease empty-area cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }
    const caster = requireCombatant(targetTurn.state, spellCasterId);
    const stateWithZeroHpCaster = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellCasterId, {
        ...caster,
        hp: Hp(0),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    };
    const endTurnAct = greaseGroundHazardEndTurnAct(
      stateWithZeroHpCaster,
      spellTargetId,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const needsDeathSave = resolveBattleSubject({
      state: stateWithZeroHpCaster,
      subject: endTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(endTurnSave, spellTargetId, true),
      ],
    });

    expect(needsDeathSave).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        currentActorId: spellTargetId,
      },
    });
  });
});

function castHeightenedGreaseWithSelectedTarget(): BattleState {
  const spell = spellRecord(greaseUnitId);
  const state = startBattleRight({
    battleId: battleId("heightened-grease-ground-hazard"),
    combatants: [
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: [
            {
              effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
              stackingMode: "one_per_spell",
              sorceryPointCost: resourceCount(2),
            },
          ],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spell],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      statBlockCreatureInit({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
      }),
      statBlockCreatureInit({
        combatantId: thunderwaveSecondTargetId,
        displayName: "Second Target",
        initiative: 9,
      }),
    ],
  });
  const act = heightenedGreaseAct(state);
  const heightenedTarget = requireHole(act.initialHoles, "targetChoice");
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      {
        kind: "targetChoice",
        holeId: heightenedTarget.holeId,
        value: spellTargetId,
      },
    ],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Heightened Grease to request a save hole.");
  }
  const savingThrow = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      {
        kind: "targetChoice",
        holeId: heightenedTarget.holeId,
        value: spellTargetId,
      },
      greaseSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: true },
      ]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Heightened Grease to resolve.");
  }
  return resolved.state;
}

function heightenedGreaseAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "greaseGroundHazard" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Grease act.");
  }
  return act;
}
