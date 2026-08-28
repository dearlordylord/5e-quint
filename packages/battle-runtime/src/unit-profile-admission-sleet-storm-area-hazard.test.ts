// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME sleet_storm
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME sleet_storm
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME sleet_storm doReplaySleetStormAreaHazard
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-sleet-storm-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { describe, expect, test } from "vitest";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { spellId } from "./identity.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
  movementFill,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  readyTargetRayOfFrost,
  spellBattle,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  sleetStormAreaFill,
  sleetStormAreaHazardSaveAct,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  battleObscurementZones,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  sleetStormAreaId,
  sleetStormUnitId,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission.test-support.ts";
import { discoverBattleActCandidates, discoverBattleActs } from "./index.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

const syntheticTargetConcentrationSpellId =
  "synthetic_sleet_storm_concentration_fixture";
type OngoingSpellRecord = SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >;
};
type OngoingOperation = OngoingSpellRecord["mechanics"]["operations"][number];

function castSleetStorm() {
  return castSleetStormForTargetTurn("withoutReadiedSpell");
}

function castSleetStormWithTargetReadiedRay() {
  return castSleetStormForTargetTurn("withReadiedRayOfFrost");
}

function castSleetStormForTargetTurn(
  targetTurnSetup: "withoutReadiedSpell" | "withReadiedRayOfFrost",
) {
  const spell = spellRecord(sleetStormUnitId);
  const state = (
    targetTurnSetup === "withReadiedRayOfFrost"
      ? spellBattleWithTargetRayOfFrost
      : spellBattle
  )({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  const act = spellAct({
    session: state,
    spellId: sleetStormUnitId,
    slotLevel: 3,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [sleetStormAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Sleet Storm cast to resolve.");
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Sleet Storm caster End Turn to resolve.");
  }
  const targetTurnSession = battleRuntimeSessionForTest({
    ...state,
    state: targetTurn.state,
  });
  return {
    spell,
    act,
    cast: cast.state,
    targetTurn:
      targetTurnSetup === "withReadiedRayOfFrost"
        ? readyTargetRayOfFrost(targetTurnSession).state
        : targetTurn.state,
  };
}

function stateWithTargetConcentration(state: BattleState): BattleState {
  const target = requireCombatant(state, spellTargetId);
  const concentrationEffect = {
    kind: "spellArmorClassBonus",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(syntheticTargetConcentrationSpellId),
    ),
    sourceCombatantId: spellTargetId,
    bonus: 1,
    negatesRepeatedDamageAllocation: false,
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
    },
  } as const;
  const concentratingState = {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(syntheticTargetConcentrationSpellId),
        ),
        effectKind: "spellEffect",
      },
    }),
  };
  return battleStateWithAllocatedEffectForTest({
    state: concentratingState,
    ownerId: spellTargetId,
    effect: concentrationEffect,
  });
}

function sleetStormWithAreaMembershipSaveLimits(
  id: string,
  usageLimitFor: (
    operation: OngoingOperation,
  ) => OngoingOperation["usageLimit"],
): SpellRecord {
  const base = spellRecord(sleetStormUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Sleet Storm ongoing effect mechanics.");
  }
  // Test-only synthetic records keep the parsed SpellRecord shape while changing
  // usage-limit facts that the admission gate must reject.
  return decodeSpellRecordForTest({
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      operations: base.mechanics.operations.map((operation) =>
        isSleetStormAreaMembershipSaveOperation(operation)
          ? { ...operation, usageLimit: usageLimitFor(operation) }
          : operation,
      ),
    },
  });
}

function isSleetStormAreaMembershipSaveOperation(
  operation: OngoingOperation,
): boolean {
  return (
    operation.trigger.kind === "on_creature_enters_area" ||
    operation.trigger.kind === "on_creature_starts_turn_in_area"
  );
}

function expectSpellNotAdmitted(spell: SpellRecord): void {
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  expect(
    discoverBattleActs(state).some(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId ===
          spellId(spell.id),
    ),
  ).toBe(false);
}

describe("Task 11 deterministic Sleet Storm area-hazard admission", () => {
  test("sleet storm is admitted as a one-minute point-origin Cylinder area hazard", () => {
    const spell = spellRecord(sleetStormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            sleetStormUnitId &&
          battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
          Number(battleActSpellSlotPresentation(act)?.invocation.slotLevel) ===
            2,
      ),
    ).toBe(false);
    const thirdLevelAct = spellAct({
      session: state,
      spellId: sleetStormUnitId,
      slotLevel: 3,
    });
    const fourthLevelAct = spellAct({
      session: state,
      spellId: sleetStormUnitId,
      slotLevel: 4,
    });

    expect({
      ...thirdLevelAct.subject,
      invocation: battleActSpellPresentation(thirdLevelAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(sleetStormUnitId, 3, "sleetStormAreaHazard"),
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(thirdLevelAct.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Spell area",
        area: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(20),
          heightFeet: movementFeet(40),
        },
      }),
    );
    expect(spellHoleInvocation(state, [area])).toEqual(
      expect.objectContaining({
        procedure: "sleetStormAreaHazard",
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(20),
          heightFeet: movementFeet(40),
        },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: movementFeet(150),
      }),
    );
    expect(spellHoleInvocation(state, fourthLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "sleetStormAreaHazard",
        resource: { tag: "spellSlot", slotLevel: 4 },
      }),
    );
  });

  test("sleet storm admission rejects save gates with missing shared limit groups", () => {
    expectSpellNotAdmitted(
      sleetStormWithAreaMembershipSaveLimits(
        "synthetic_sleet_storm_missing_save_limit_group",
        () => ({ kind: "once_per_turn" }),
      ),
    );
  });

  test("sleet storm admission rejects save gates with distinct shared limit groups", () => {
    expectSpellNotAdmitted(
      sleetStormWithAreaMembershipSaveLimits(
        "synthetic_sleet_storm_distinct_save_limit_groups",
        (operation) => ({
          kind: "once_per_turn",
          limitGroup:
            operation.trigger.kind === "on_creature_enters_area"
              ? "synthetic_sleet_storm_entry_save_per_turn"
              : "synthetic_sleet_storm_start_turn_save_per_turn",
        }),
      ),
    );
  });

  test("cast records the source-owned Sleet Storm area effect and concentration", () => {
    const { act, cast } = castSleetStorm();

    expect(requireCombatant(cast, spellCasterId)).toMatchObject({
      concentration: {
        sourceProcedureRef: act.subject.procedureRef,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "sleetStormAreaHazard",
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          areaId: sleetStormAreaId,
          radiusFeet: movementFeet(20),
          heightFeet: movementFeet(40),
          save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
          savedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(10),
          },
        }),
      ],
    });
  });

  test("active Sleet Storm projects Difficult Terrain and Heavily Obscured Cylinder facts", () => {
    const { act, targetTurn } = castSleetStorm();
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "move",
    };
    const moveHole = requireResultHole(
      resolveBattleSubject({
        state: targetTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const sleetStormDifficultTerrain = {
      kind: "areaDifficultTerrain" as const,
      sources: [
        {
          kind: "sleetStormHazard" as const,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: act.subject.procedureRef,
          areaId: sleetStormAreaId,
        },
      ],
      totalDistanceFeet: movementFeet(10),
      difficultTerrainDistanceFeet: movementFeet(5),
    };

    expect(
      resolveBattleSubject({
        state: targetTurn,
        subject: moveSubject,
        fills: [
          movementFill(moveHole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain: sleetStormDifficultTerrain,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain.",
    });

    const moved = resolveBattleSubject({
      state: targetTurn,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: sleetStormDifficultTerrain,
        }),
      ],
    });
    if (moved.tag !== "resolved") {
      throw new Error("Expected Sleet Storm Difficult Terrain movement.");
    }
    expect(requireCombatant(moved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
    expect(battleObscurementZones(targetTurn)).toEqual([
      expect.objectContaining({
        kind: "spellObscurementZone",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        obscurement: "heavilyObscured",
        area: {
          kind: "pointOriginCylinder",
          areaId: sleetStormAreaId,
          radiusFeet: movementFeet(20),
          heightFeet: movementFeet(40),
        },
      }),
    ]);
  });

  test("save commands require a caller-supplied area-membership trigger fact", () => {
    const { targetTurn } = castSleetStorm();
    expect(
      discoverBattleActCandidates(targetTurn).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "sleetStormAreaHazardSave",
      ),
    ).toBe(false);

    const entryAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    expect(entryAct.subject.areaMembershipTrigger).toEqual({
      kind: "firstEntryOnTurn",
      areaId: sleetStormAreaId,
    });
    expect(
      resolveBattleSubject({
        state: targetTurn,
        subject: entryAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "needsHoles" });
  });

  test("entry save failure applies Prone, breaks target Concentration, and records shared per-turn resolution", () => {
    const { targetTurn } = castSleetStorm();
    const concentrating = stateWithTargetConcentration(targetTurn);
    const entryAct = sleetStormAreaHazardSaveAct(
      concentrating,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");

    const failed = resolveBattleSubject({
      state: concentrating,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, false),
      ],
    });
    if (failed.tag !== "resolved") {
      throw new Error("Expected Sleet Storm entry save to resolve.");
    }

    expect(requireCombatant(failed.state, spellTargetId)).toMatchObject({
      concentration: null,
      conditions: expect.objectContaining({ prone: true }),
      activeEffects: [],
    });
    expect(requireCombatant(failed.state, spellCasterId).activeEffects).toEqual(
      [
        expect.objectContaining({
          kind: "sleetStormAreaHazard",
          savedThisTurn: [spellTargetId],
        }),
      ],
    );
    expect(
      discoverBattleActCandidates(failed.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "sleetStormAreaHazardSave",
      ),
    ).toBe(false);
  });

  test("entry failure replays after a declined readied-spell Reaction and breaks the held spell", () => {
    const { targetTurn } = castSleetStormWithTargetReadiedRay();
    const entryAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: targetTurn,
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
      concentration: null,
      conditions: expect.objectContaining({ prone: true }),
    });
    expect(declined.state.readiedSpells.has(spellTargetId)).toBe(false);
    expect(
      requireCombatant(declined.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "sleetStormAreaHazard",
        savedThisTurn: [spellTargetId],
      }),
    ]);
  });

  test("save resolution rejects a fill from the other Sleet Storm trigger hole", () => {
    const { targetTurn } = castSleetStorm();
    const entryAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const startTurnAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    const wrongHole = requireHole(
      startTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state: targetTurn,
        subject: entryAct.subject,
        fills: [
          singleTargetSavingThrowOutcomeFill(wrongHole, spellTargetId, false),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(requireCombatant(targetTurn, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: false }),
      activeEffects: [],
    });
  });

  test("entry save suppresses a later start-turn save in the same shared turn limit group", () => {
    const { targetTurn } = castSleetStorm();
    const entryAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    const entryResolved = resolveBattleSubject({
      state: targetTurn,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, true),
      ],
    });
    if (entryResolved.tag !== "resolved") {
      throw new Error("Expected Sleet Storm entry save to resolve.");
    }

    const startTurnAct = sleetStormAreaHazardSaveAct(
      entryResolved.state,
      spellTargetId,
      "startsTurnInArea",
    );

    expect(
      resolveBattleSubject({
        state: entryResolved.state,
        subject: startTurnAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Sleet Storm save was already resolved for this target this turn.",
    });
    expect(
      requireCombatant(entryResolved.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "sleetStormAreaHazard",
        savedThisTurn: [spellTargetId],
      }),
    ]);
  });

  test("successful start-turn save marks the shared ledger and resets on the next turn", () => {
    const { targetTurn } = castSleetStorm();
    const startTurnAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    const startTurnSave = requireHole(
      startTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    const succeeded = resolveBattleSubject({
      state: targetTurn,
      subject: startTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(startTurnSave, spellTargetId, true),
      ],
    });
    if (succeeded.tag !== "resolved") {
      throw new Error("Expected Sleet Storm start-turn save to resolve.");
    }
    expect(requireCombatant(succeeded.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: false }),
    });
    expect(
      requireCombatant(succeeded.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "sleetStormAreaHazard",
        savedThisTurn: [spellTargetId],
      }),
    ]);
    expect(
      discoverBattleActCandidates(succeeded.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "sleetStormAreaHazardSave",
      ),
    ).toBe(false);

    const nextTurn = endTurn({
      state: succeeded.state,
      actorId: spellTargetId,
    });
    if (nextTurn.tag !== "resolved") {
      throw new Error("Expected turn boundary to resolve.");
    }
    expect(
      requireCombatant(nextTurn.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "sleetStormAreaHazard",
        savedThisTurn: [],
      }),
    ]);
  });

  test("start-turn save suppresses a later entry save in the same shared turn limit group", () => {
    const { targetTurn } = castSleetStorm();
    const startTurnAct = sleetStormAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    const startTurnSave = requireHole(
      startTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const startTurnResolved = resolveBattleSubject({
      state: targetTurn,
      subject: startTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(startTurnSave, spellTargetId, true),
      ],
    });
    if (startTurnResolved.tag !== "resolved") {
      throw new Error("Expected Sleet Storm start-turn save to resolve.");
    }

    const entryAct = sleetStormAreaHazardSaveAct(
      startTurnResolved.state,
      spellTargetId,
      "entersArea",
    );

    expect(
      resolveBattleSubject({
        state: startTurnResolved.state,
        subject: entryAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Sleet Storm save was already resolved for this target this turn.",
    });
    expect(
      requireCombatant(startTurnResolved.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "sleetStormAreaHazard",
        savedThisTurn: [spellTargetId],
      }),
    ]);
  });
});

defineSelectedIdentityReplayWitness({
  describeLabel:
    "L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME selected identity replay",
  taskId: "L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME",
  initialProjection: {
    unitId: sleetStormUnitId,
    procedure: "initial",
    areaEffects: 0,
  },
  units: [
    {
      unitId: sleetStormUnitId,
      procedures: [
        {
          actionName: "doReplaySleetStormAreaHazard",
          projectionAfter: {
            unitId: sleetStormUnitId,
            procedure: "sleetStormAreaHazard",
            areaEffects: 1,
          },
          discover: () => {
            const { act, cast } = castSleetStorm();
            const caster = requireCombatant(cast, spellCasterId);
            return {
              unitId: sleetStormUnitId,
              procedure: "sleetStormAreaHazard",
              areaEffects: caster.activeEffects.filter(
                (effect) =>
                  effect.kind === "sleetStormAreaHazard" &&
                  effect.sourceProcedureRef === act.subject.procedureRef,
              ).length,
            };
          },
        },
      ],
    },
  ],
});
