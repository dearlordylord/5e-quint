import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV40 grease
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-grease-ground-hazard
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-heightened-save-disadvantage
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { HEIGHTENED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleEffectExecutionRefForTest,
  battleId,
  battleStateWithAllocatedEffectForTest,
  battleStateWithAllSpellSlotsExpended,
  characterSeed,
  startBattleSessionRight,
  statBlockCreatureInit,
  Result,
  Schema,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  greaseAreaId,
  greaseUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveSecondTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  battleAreaId,
  BattleSnapshotSchema,
  type AvailableBattleAct,
  type BattleRuntimeSession,
  type BattleState,
  discoverBattleActCandidates,
} from "./index.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  endCasterTurnAndReadyTargetRayOfFrost,
  spellBattle,
  spellBattleWithTargetReadiedRay,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  greaseGroundHazardEndTurnAct,
  greaseGroundHazardSaveAct,
  greaseSavingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  elapsedTimeTicks,
  endTurn,
  Hp,
  resolveBattleSubject,
  sameBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

describe("QMBT14 deterministic Grease ground hazard admission", () => {
  test("grease is admitted as a one-minute point-origin Cube ground hazard", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(greaseUnitId, 1, "greaseGroundHazard"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Cube Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(session, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "greaseGroundHazard",
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const state = session.state;
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
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
      }),
    ]);
  });
  test("Grease rejects pre-resolution admission when its Spell Slot is expended", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const staleState = battleStateWithAllSpellSlotsExpended(
      session.state,
      spellCasterId,
    );

    expect(
      resolveBattleSubject({
        state: staleState,
        subject: act.subject,
        fills: [
          greaseSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Action-time spell act no longer has its required runtime spell resource.",
    });
  });
  test("grease cast leaves a successful appearance save standing while creating the hazard", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        greaseSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Grease cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).conditions,
    ).not.toEqual(expect.objectContaining({ prone: true }));
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "greaseGroundHazard",
        areaId: greaseAreaId,
      }),
    ]);
  });
  test("grease applies Prone only to creatures that fail a multi-target appearance save", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      extraTargetIds: [thunderwaveSecondTargetId],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        greaseSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: true },
          { targetId: thunderwaveSecondTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Grease cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).conditions,
    ).not.toEqual(expect.objectContaining({ prone: true }));
    expect(
      requireCombatant(resolved.state, thunderwaveSecondTargetId).conditions,
    ).toEqual(expect.objectContaining({ prone: true }));
  });
  test("a failed Grease appearance save opens the target's readied-spell Reaction", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattleWithTargetReadiedRay({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        greaseSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    expect(requireCombatant(declined.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: true }),
    });
    expect(
      requireCombatant(declined.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "greaseGroundHazard",
        areaId: greaseAreaId,
      }),
    ]);
  });
  test("Grease end-turn failure resumes End Turn after a declined readied-spell Reaction", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const castAct = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const castSave = requireHole(castAct.initialHoles, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [greaseSavingThrowOutcomeFill(castSave, [])],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Grease cast to resolve.");
    }
    const readied = endCasterTurnAndReadyTargetRayOfFrost({
      session: battleRuntimeSessionForTest({ ...session, state: cast.state }),
      casterId: spellCasterId,
    });

    const endTurnAct = greaseGroundHazardEndTurnAct(readied, spellTargetId);
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const endTurnReaction = resolveBattleSubject({
      state: readied.state,
      subject: endTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(endTurnSave, spellTargetId, false),
      ],
    });
    expect(endTurnReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    const afterDecline =
      declineTargetReadiedSpellAfterFailedSave(endTurnReaction);
    expect(requireCombatant(afterDecline.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: true }),
    });
    expect(afterDecline.snapshot).toMatchObject({
      currentActorId: spellCasterId,
      pendingInterrupt: null,
    });
  });
  test("Grease entry failure opens a readied-spell Reaction before applying Prone", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const castAct = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const castSave = requireHole(castAct.initialHoles, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [greaseSavingThrowOutcomeFill(castSave, [])],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Grease cast to resolve.");
    }

    const targetTurn = endCasterTurnAndReadyTargetRayOfFrost({
      session: battleRuntimeSessionForTest({ ...session, state: cast.state }),
      casterId: spellCasterId,
    });
    const entryAct = greaseGroundHazardSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: targetTurn.state,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, false),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    expect(requireCombatant(declined.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: true }),
    });
  });
  test("Heightened Grease requires its selected target before save resolution", () => {
    const { session, act, heightenedTarget } = heightenedGreaseCastSetup();

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "targetChoice",
          holeId: heightenedTarget.holeId,
        },
      ],
    });
  });
  test("Heightened Grease stores the selected target on the ground hazard occurrence", () => {
    const cast = castHeightenedGreaseWithSelectedTarget();

    const greaseEffect = requireCombatant(
      cast.state,
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const state = session.state;
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const state = session.state;
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
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    expect(entrySave).toMatchObject({
      ability: "dex",
      greaseGroundHazard: {
        targetId: spellTargetId,
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        trigger: "entersArea",
      },
    });
    const caster = requireCombatant(targetTurn.state, spellCasterId);
    const stateWithoutHazard = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.filter(
          (effect) => effect.kind !== "greaseGroundHazard",
        ),
      }),
    };
    expect(
      resolveBattleSubject({
        state: stateWithoutHazard,
        subject: entryAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Grease ground-hazard save is no longer available.",
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
    const session = castHeightenedGreaseWithSelectedTarget();
    const cast = session.state;
    const targetTurn = endTurn({
      state: cast,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }
    const selectedEntryAct = greaseGroundHazardSaveAct(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const state = session.state;
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
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
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
    const session = castHeightenedGreaseWithSelectedTarget();
    const cast = session.state;
    const targetTurn = endTurn({
      state: cast,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Grease caster end turn to resolve.");
    }

    const endTurnAct = greaseGroundHazardEndTurnAct(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
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
      battleRuntimeSessionForTest({
        state: selectedTurnDone.state,
        context: session.context,
      }),
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
      areaId: greaseAreaId,
      effectRef: battleEffectExecutionRefForTest("grease-subject-a"),
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
        {
          ...base,
          areaId: battleAreaId("second-grease-ground-area"),
          trigger: "entersArea",
        },
      ),
    ).toBe(false);
    expect(
      sameBattleSubject(
        { ...base, trigger: "entersArea" },
        {
          ...base,
          effectRef: battleEffectExecutionRefForTest("grease-subject-b"),
          trigger: "entersArea",
        },
      ),
    ).toBe(false);
  });
  test("a Grease subject rejects a fresh same-shape replacement but accepts a same-ref clone", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ session, spellId: greaseUnitId, slotLevel: 1 });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        greaseSavingThrowOutcomeFill(
          requireHole(act.initialHoles, "savingThrowOutcome"),
          [],
        ),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Grease cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const selected = greaseGroundHazardEndTurnAct(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      spellTargetId,
    );
    const owner = requireCombatant(targetTurn.state, spellCasterId);
    const effect = owner.activeEffects.find(
      (candidate) => candidate.kind === "greaseGroundHazard",
    );
    if (effect?.kind !== "greaseGroundHazard") {
      throw new Error("Expected Grease occurrence.");
    }
    const { effectRef: selectedRef, ...template } = effect;
    const overlappingState = battleStateWithAllocatedEffectForTest({
      state: targetTurn.state,
      ownerId: spellCasterId,
      effect: template,
    });
    const overlappingEffect = requireCombatant(
      overlappingState,
      spellCasterId,
    ).activeEffects.find(
      (candidate) =>
        candidate.kind === "greaseGroundHazard" &&
        candidate.effectRef !== selectedRef,
    );
    if (overlappingEffect?.kind !== "greaseGroundHazard") {
      throw new Error("Expected overlapping Grease occurrence.");
    }
    const overlappingAct = discoverBattleActCandidates(overlappingState).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "greaseGroundHazardSave" &&
        candidate.subject.effectRef === overlappingEffect.effectRef,
    );
    if (
      overlappingAct?.subject.tag !== "runtimeCommand" ||
      overlappingAct.subject.command !== "greaseGroundHazardSave"
    ) {
      throw new Error("Expected overlapping Grease save act.");
    }
    const overlappingNeedsSave = resolveBattleSubject({
      state: overlappingState,
      subject: overlappingAct.subject,
      fills: [],
    });
    if (overlappingNeedsSave.tag !== "needsHoles") {
      throw new Error("Expected overlapping Grease save hole.");
    }
    const encodedOverlapSnapshot = Schema.encodeSync(BattleSnapshotSchema)(
      overlappingNeedsSave.snapshot,
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)({
          ...encodedOverlapSnapshot,
          acts: [
            {
              subject: overlappingAct.subject,
              initialHoles: selected.initialHoles,
            },
          ],
        }),
      ),
    ).toBe(true);
    const withoutSelected: BattleState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellCasterId, {
        ...owner,
        activeEffects: owner.activeEffects.filter(
          (candidate) => candidate.effectRef !== selectedRef,
        ),
      }),
    };
    const replacement = battleStateWithAllocatedEffectForTest({
      state: withoutSelected,
      ownerId: spellCasterId,
      effect: template,
    });
    expect(
      resolveBattleSubject({
        state: replacement,
        subject: selected.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const sameRefClone: BattleState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellCasterId, {
        ...owner,
        activeEffects: owner.activeEffects.map((candidate) =>
          candidate.effectRef === selectedRef ? { ...candidate } : candidate,
        ),
      }),
    };
    expect(
      resolveBattleSubject({
        state: sameRefClone,
        subject: selected.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "needsHoles" });
  });
  test("grease end-turn save asks for End Turn holes before advancing", () => {
    const spell = spellRecord(greaseUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const state = session.state;
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
      battleRuntimeSessionForTest({
        state: stateWithZeroHpCaster,
        context: session.context,
      }),
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

function heightenedGreaseCastSetup() {
  const spell = spellRecord(greaseUnitId);
  const session = startBattleSessionRight({
    battleId: battleId("heightened-grease-ground-hazard"),
    combatants: [
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Sorcerer",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
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
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
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
  const state = session.state;
  const act = heightenedGreaseAct(state);
  const heightenedTarget = requireHole(act.initialHoles, "targetChoice");
  return { session, act, heightenedTarget };
}

function castHeightenedGreaseWithSelectedTarget(): BattleRuntimeSession {
  const { session, act, heightenedTarget } = heightenedGreaseCastSetup();
  const awaitingSave = resolveBattleSubject({
    state: session.state,
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
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
    snapshot: awaitingSave.snapshot,
    subject: act.subject,
    holes: awaitingSave.holes,
  });
  const savingThrow = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: session.state,
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
  return battleRuntimeSessionForTest({
    state: resolved.state,
    context: session.context,
  });
}

function heightenedGreaseAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
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
