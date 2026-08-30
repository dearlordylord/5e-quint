import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME gust_of_wind
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
import { resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { HEIGHTENED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  characterSeed,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  readyTargetRayOfFrost,
  spellBattle,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  directionalPersistentAreaDirectionChangeAct,
  directionalPersistentAreaDirectionChoiceFill,
  directionalPersistentAreaEndTurnSaveAct,
  directionalPersistentAreaSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleId,
  breakBattleConcentration,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  movementDeltaFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type AvailableBattleAct,
  type BattleRuntimeSession,
  type BattleState,
} from "./unit-profile-admission.test-support.ts";
import { battleFrontierInterruptDecisionForState } from "./index.ts";
import {
  greaseAreaId,
  greaseUnitId,
  gustOfWindAreaId,
  gustOfWindEastDirectionId,
  gustOfWindNorthDirectionId,
  gustOfWindUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveSecondTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";

describe("L12G deterministic Gust of Wind Line admission", () => {
  test("gust of wind is admitted as a self-origin Line STR-save concentration spell", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          gustOfWindUnitId,
          2,
          "directionalPersistentArea",
        ),
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell self-origin Line Saving Throw outcomes",
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "directionalPersistentArea",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "str",
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: movementFeet(0),
        pushDistanceFeet: movementFeet(15),
        movementCost: {
          multiplier: 2,
          appliesTo: "towardSource",
        },
      }),
    );
  });

  test("gust of wind admission requires the repeated end-turn Line save", () => {
    const base = spellRecord(gustOfWindUnitId);
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Gust of Wind ongoing effect mechanics.");
    }
    const operations = base.mechanics.operations.filter(
      (operation) => operation.trigger.kind !== "on_creature_ends_turn_in_area",
    );
    if (operations.length === 0) {
      throw new Error("Expected retained Gust of Wind operations.");
    }
    const spell = {
      ...base,
      mechanics: {
        ...base.mechanics,
        operations: operations as [
          (typeof operations)[number],
          ...(typeof operations)[number][],
        ],
      },
    };
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.procedure ===
            "directionalPersistentArea",
      ),
    ).toBe(false);
  });

  test("gust of wind admission uses Line shape instead of authored hole id", () => {
    const spell = gustOfWindWithLineHoleId("synthetic_line_for_admission");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "directionalPersistentArea",
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
      }),
    );
  });

  test("cast records the source-owned Line and Concentration state", () => {
    const cast = castGustOfWind([]);
    const caster = requireCombatant(cast.state, spellCasterId);

    expect(caster.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toEqual([
      expect.objectContaining({
        kind: "directionalPersistentArea",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: gustOfWindAreaId,
        directionId: gustOfWindNorthDirectionId,
        heightenedSpellTargetDisadvantage: null,
        castTurn: {
          actorId: spellCasterId,
          round: 1,
        },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
  });

  test("failed appearance save requires table-supplied Line push facts", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          directionalPersistentAreaSavingThrowOutcomeFill(
            savingThrow,
            [{ targetId: spellTargetId, succeeded: false }],
            { creaturePushes: [] },
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "directional persistent area push facts must cover every failed-save target.",
    });
  });

  test("end-turn save resolves at the End Turn boundary", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
  });
  test("failed table-triggered Gust of Wind save opens a readied-spell Reaction", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const initialSession = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const castAct = spellAct({
      session: initialSession,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const cast = resolveBattleSubject({
      state: initialSession.state,
      subject: castAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(
          requireHole(castAct.initialHoles, "savingThrowOutcome"),
          [],
        ),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Gust of Wind cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: initialSession.context,
      }),
    );
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(readied.state);
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const awaitingReaction = resolveBattleSubject({
      state: readied.state,
      subject: endTurnAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    expect(declined.snapshot).toMatchObject({
      currentActorId: spellCasterId,
    });
    expect(battleFrontierInterruptDecisionForState(declined.state)).toBeNull();
  });

  test("movement closer to the caster through the Line spends two feet per foot", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const lineEffect = directionalPersistentAreaEffect(targetTurn.state);
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          directionalPersistentAreaMovement: {
            kind: "directionalPersistentAreaMovement",
            effectRef: lineEffect.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: lineEffect.sourceProcedureRef,
            areaId: gustOfWindAreaId,
            directionId: gustOfWindNorthDirectionId,
            totalDistanceFeet: movementFeet(5),
            closerDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: 10 }),
          }),
        ]),
      },
    });
  });

  test("movement through a recast Line requires the current occurrence reference", () => {
    const session = gustOfWindBattle(2);
    const firstCast = resolveGustOfWindCast({ session, outcomes: [] });
    const staleEffect = directionalPersistentAreaEffect(firstCast.state);
    const casterTurn = advanceToCasterLaterTurn(firstCast.state);
    const casterBeforeRecast = requireCombatant(casterTurn, spellCasterId);
    const recast = resolveGustOfWindCast({
      session: battleRuntimeSessionForTest({
        state: casterTurn,
        context: session.context,
      }),
      outcomes: [],
    });
    const freshEffect = directionalPersistentAreaEffect(recast.state);
    const casterAfterRecast = requireCombatant(recast.state, spellCasterId);

    expect(freshEffect.effectRef).not.toBe(staleEffect.effectRef);
    expect(Number(casterAfterRecast.nextEffectOrdinal)).toBe(
      Number(casterBeforeRecast.nextEffectOrdinal) + 1,
    );
    expect(casterAfterRecast.activeEffects).toContainEqual(freshEffect);
    expect(
      requireCombatant(recast.state, spellTargetId).activeEffects.some(
        (effect) => effect.effectRef === freshEffect.effectRef,
      ),
    ).toBe(false);
    assertBattleSnapshotCodecRoundTripForTest(recast.snapshot);

    const targetTurn = endTurn({
      state: recast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const lineMovement = (effectRef: typeof staleEffect.effectRef) =>
      movementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        directionalPersistentAreaMovement: {
          kind: "directionalPersistentAreaMovement",
          effectRef,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: freshEffect.sourceProcedureRef,
          areaId: gustOfWindAreaId,
          directionId: gustOfWindNorthDirectionId,
          totalDistanceFeet: movementFeet(5),
          closerDistanceFeet: movementFeet(5),
        },
      });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [lineMovement(staleEffect.effectRef)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "directional persistent area Line movement fact does not match an active directional persistent area Line.",
    });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [lineMovement(freshEffect.effectRef)],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("movement closer to the caster rejects mismatched Line movement cost", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const lineEffect = directionalPersistentAreaEffect(targetTurn.state);
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
            directionalPersistentAreaMovement: {
              kind: "directionalPersistentAreaMovement",
              effectRef: lineEffect.effectRef,
              sourceCombatantId: spellCasterId,
              sourceProcedureRef: lineEffect.sourceProcedureRef,
              areaId: gustOfWindAreaId,
              directionId: gustOfWindNorthDirectionId,
              totalDistanceFeet: movementFeet(5),
              closerDistanceFeet: movementFeet(5),
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "directional persistent area Line movement must spend total distance plus 1 extra foot for every foot moved closer to the caster through the Line.",
    });
  });

  test("movement cost composes Grease and Gust of Wind Line facts", () => {
    const session = gustOfWindBattle(1);
    const cast = resolveGustOfWindCast({ session, outcomes: [] });
    const greased = withGreaseGroundHazard(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    );
    const targetTurn = endTurn({
      state: greased,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const lineEffect = directionalPersistentAreaEffect(targetTurn.state);
    const greaseEffect = persistentAreaSaveConditionEffect(targetTurn.state);
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "persistentAreaSaveCondition",
                effectRef: greaseEffect.effectRef,
                sourceCombatantId: spellCasterId,
                sourceProcedureRef: greaseEffect.sourceProcedureRef,
                areaId: greaseAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(5),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
          directionalPersistentAreaMovement: {
            kind: "directionalPersistentAreaMovement",
            effectRef: lineEffect.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: lineEffect.sourceProcedureRef,
            areaId: gustOfWindAreaId,
            directionId: gustOfWindNorthDirectionId,
            totalDistanceFeet: movementFeet(5),
            closerDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: 15 }),
          }),
        ]),
      },
    });
  });

  test("area movement rejects a stale mechanically identical hazard occurrence", () => {
    const session = gustOfWindBattle(1);
    const cast = resolveGustOfWindCast({ session, outcomes: [] });
    const greased = withGreaseGroundHazard(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    );
    const staleEffect = persistentAreaSaveConditionEffect(greased);
    const casterBeforeReplacement = requireCombatant(greased, spellCasterId);
    const withReplacement = withGreaseGroundHazard(
      battleRuntimeSessionForTest({ ...session, state: greased }),
    );
    const replacementCaster = requireCombatant(withReplacement, spellCasterId);
    const freshEffect = replacementCaster.activeEffects.find(
      (effect) =>
        effect.kind === "persistentAreaSaveCondition" &&
        effect.effectRef !== staleEffect.effectRef,
    );
    if (freshEffect?.kind !== "persistentAreaSaveCondition") {
      throw new Error("Expected a fresh allocated Grease occurrence.");
    }
    expect(Number(replacementCaster.nextEffectOrdinal)).toBe(
      Number(casterBeforeReplacement.nextEffectOrdinal) + 1,
    );
    const replacedState: BattleState = {
      ...withReplacement,
      combatants: new Map(withReplacement.combatants).set(spellCasterId, {
        ...replacementCaster,
        activeEffects: replacementCaster.activeEffects.filter(
          (effect) => effect.effectRef !== staleEffect.effectRef,
        ),
      }),
    };
    const targetTurn = endTurn({
      state: replacedState,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const difficultTerrainMovement = (
      effectRef: typeof staleEffect.effectRef,
    ) =>
      movementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        areaDifficultTerrain: {
          kind: "areaDifficultTerrain",
          sources: [
            {
              kind: "persistentAreaSaveCondition",
              effectRef,
              sourceCombatantId: spellCasterId,
              sourceProcedureRef: freshEffect.sourceProcedureRef,
              areaId: greaseAreaId,
            },
          ],
          totalDistanceFeet: movementFeet(5),
          difficultTerrainDistanceFeet: movementFeet(5),
        },
      });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [difficultTerrainMovement(staleEffect.effectRef)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.",
    });
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [difficultTerrainMovement(freshEffect.effectRef)],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected current Grease occurrence to resolve.");
    }
    assertBattleSnapshotCodecRoundTripForTest(resolved.snapshot);
  });

  test("caster can spend a Bonus Action to replace the active Line direction", () => {
    const cast = castGustOfWind([]);
    expect(
      discoverBattleActCandidates(cast.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "directionalPersistentAreaDirectionChange",
      ),
    ).toBe(false);
    const laterTurnBase = advanceToCasterLaterTurn(cast.state);
    const unrelatedEffect = {
      kind: "speedDelta",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-gust-of-wind-composition",
      ),
      sourceCombatantId: spellCasterId,
      deltaFeet: movementDeltaFeet(10),
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
    } as const;
    const laterTurn = battleStateWithAllocatedEffectForTest({
      state: laterTurnBase,
      ownerId: spellCasterId,
      effect: unrelatedEffect,
    });
    const selectedGust = directionalPersistentAreaEffect(laterTurn);
    const { effectRef: _selectedEffectRef, ...overlappingGustTemplate } =
      selectedGust;
    const overlappingState = battleStateWithAllocatedEffectForTest({
      state: laterTurn,
      ownerId: spellCasterId,
      effect: overlappingGustTemplate,
    });
    const directionAct =
      directionalPersistentAreaDirectionChangeAct(overlappingState);
    const directionHole = requireHole(
      directionAct.initialHoles,
      "directionalPersistentAreaDirectionChoice",
    );
    const awaitingDirection = resolveBattleSubject({
      state: overlappingState,
      subject: directionAct.subject,
      fills: [],
    });
    if (awaitingDirection.tag !== "needsHoles") {
      throw new Error("Expected Gust of Wind direction choice.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingDirection.snapshot);

    const resolved = resolveBattleSubject({
      state: overlappingState,
      subject: directionAct.subject,
      fills: [directionalPersistentAreaDirectionChoiceFill(directionHole)],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionQuotaAvailable: false } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gust of Wind direction change to resolve.");
    }
    expect(directionalPersistentAreaEffect(resolved.state)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindEastDirectionId,
        heightenedSpellTargetDisadvantage: null,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(9),
        },
      }),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining(unrelatedEffect)]),
    );
    const gustEffects = requireCombatant(
      resolved.state,
      spellCasterId,
    ).activeEffects.filter(
      (effect) => effect.kind === "directionalPersistentArea",
    );
    expect(
      gustEffects.find(
        (effect) => effect.effectRef === directionAct.subject.effectRef,
      ),
    ).toEqual(
      expect.objectContaining({ directionId: gustOfWindEastDirectionId }),
    );
    expect(
      gustEffects.find(
        (effect) => effect.effectRef !== directionAct.subject.effectRef,
      ),
    ).toEqual(
      expect.objectContaining({ directionId: gustOfWindNorthDirectionId }),
    );
  });

  test("Heightened Gust of Wind stores the selected target on the Line occurrence", () => {
    const cast = castHeightenedGustOfWindWithSelectedTarget();

    expect(directionalPersistentAreaEffect(cast)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindNorthDirectionId,
        heightenedSpellTargetDisadvantage: {
          kind: "heightenedSpellTargetDisadvantage",
          targetId: spellTargetId,
        },
      }),
    );
  });

  test("Heightened Gust of Wind end-turn saves project Disadvantage only for the selected target", () => {
    const cast = castHeightenedGustOfWindWithSelectedTarget();
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }

    const selectedAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
      spellTargetId,
    );
    const selectedSave = requireHole(
      selectedAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(selectedSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });

    const secondTargetTurn = resolveBattleSubject({
      state: targetTurn.state,
      subject: selectedAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(selectedSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (secondTargetTurn.tag !== "resolved") {
      throw new Error("Expected selected target End Turn to resolve.");
    }

    const unselectedAct = directionalPersistentAreaEndTurnSaveAct(
      secondTargetTurn.state,
      thunderwaveSecondTargetId,
    );
    const unselectedSave = requireHole(
      unselectedAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(unselectedSave.targetRollModes).not.toContainEqual({
      targetId: thunderwaveSecondTargetId,
      rollMode: "disadvantage",
    });
  });

  test("Heightened Gust of Wind preserves the selected target through direction replacement", () => {
    const cast = castHeightenedGustOfWindWithSelectedTarget();
    const laterTurn = advanceHeightenedGustOfWindToCasterLaterTurn(cast);
    const directionAct = directionalPersistentAreaDirectionChangeAct(laterTurn);
    const directionHole = requireHole(
      directionAct.initialHoles,
      "directionalPersistentAreaDirectionChoice",
    );
    const changed = resolveBattleSubject({
      state: laterTurn,
      subject: directionAct.subject,
      fills: [directionalPersistentAreaDirectionChoiceFill(directionHole)],
    });
    if (changed.tag !== "resolved") {
      throw new Error("Expected Gust of Wind direction change to resolve.");
    }

    expect(directionalPersistentAreaEffect(changed.state)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindEastDirectionId,
        heightenedSpellTargetDisadvantage: {
          kind: "heightenedSpellTargetDisadvantage",
          targetId: spellTargetId,
        },
      }),
    );

    const targetTurn = endTurn({
      state: changed.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
      spellTargetId,
      gustOfWindAreaId,
      gustOfWindEastDirectionId,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(endTurnSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });
  });

  test("breaking Concentration removes the active Line", () => {
    const cast = castGustOfWind([]);
    const ended = breakBattleConcentration(cast.state, spellCasterId);

    expect(requireCombatant(ended, spellCasterId)).toEqual(
      expect.objectContaining({
        concentration: null,
        activeEffects: [],
      }),
    );
  });
  test("a Gust of Wind save subject becomes stale after Concentration ends", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
    );
    const ended = breakBattleConcentration(targetTurn.state, spellCasterId);
    expect(
      resolveBattleSubject({
        state: ended,
        subject: endTurnAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "directional persistent area Line save is no longer available.",
    });
  });
});

function castGustOfWind(
  outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[],
) {
  return resolveGustOfWindCast({
    session: gustOfWindBattle(1),
    outcomes,
  });
}

function gustOfWindBattle(spellSlotCount: number) {
  const spell = spellRecord(gustOfWindUnitId);
  return spellBattle({
    preparedSpells: [spell, spellRecord(greaseUnitId)],
    spellSlots: [
      { spellLevel: 1, count: 2 },
      { spellLevel: 2, count: spellSlotCount },
    ],
    casterClassLevels: [{ className: "wizard", level: 3 }],
  });
}

function resolveGustOfWindCast(input: {
  readonly session: BattleRuntimeSession;
  readonly outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[];
}) {
  const act = spellAct({
    session: input.session,
    spellId: gustOfWindUnitId,
    slotLevel: 2,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: input.session.state,
    subject: act.subject,
    fills: [
      directionalPersistentAreaSavingThrowOutcomeFill(
        savingThrow,
        input.outcomes,
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Gust of Wind cast to resolve.");
  }
  return resolved;
}

function castHeightenedGustOfWindWithSelectedTarget(): BattleState {
  const spell = spellRecord(gustOfWindUnitId);
  const state = startBattleSessionRight({
    battleId: battleId("heightened-gust-of-wind-line"),
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
            spellSlots: [{ spellLevel: 2, count: 1 }],
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
  const act = heightenedGustOfWindAct(state);
  const heightenedTarget = requireHole(act.initialHoles, "targetChoice");
  const heightenedTargetFill = {
    kind: "targetChoice" as const,
    holeId: heightenedTarget.holeId,
    value: spellTargetId,
  };
  const awaitingSave = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [heightenedTargetFill],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Heightened Gust of Wind to request a save hole.");
  }
  const savingThrow = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [
      heightenedTargetFill,
      directionalPersistentAreaSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: true },
        { targetId: thunderwaveSecondTargetId, succeeded: true },
      ]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Heightened Gust of Wind to resolve.");
  }
  return resolved.state;
}

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

function heightenedGustOfWindAct(state: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "directionalPersistentArea" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Gust of Wind act.");
  }
  return act;
}

function gustOfWindWithLineHoleId(
  holeId: string,
): ReturnType<typeof spellRecord> {
  const base = spellRecord(gustOfWindUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Gust of Wind ongoing effect mechanics.");
  }
  const attachment = base.mechanics.attachment;
  const initialPhase = base.mechanics.initialPhase;
  if (
    attachment.kind !== "hole" ||
    initialPhase?.kind !== "save_gate" ||
    initialPhase.attachment.kind !== "hole"
  ) {
    throw new Error("Expected Gust of Wind Line hole mechanics.");
  }
  const operations = base.mechanics.operations.map((operation) => {
    const effect = operation.effect;
    return operation.trigger.kind === "on_creature_ends_turn_in_area" &&
      effect.kind === "save_gate" &&
      effect.attachment?.kind === "hole"
      ? ({
          ...operation,
          effect: {
            ...effect,
            attachment: { ...effect.attachment, holeId },
          },
        } as typeof operation)
      : operation;
  });
  return decodeSpellRecordForTest({
    ...base,
    mechanics: {
      ...base.mechanics,
      attachment: { ...attachment, holeId },
      initialPhase: {
        ...initialPhase,
        attachment: { ...initialPhase.attachment, holeId },
      },
      operations,
    },
  });
}

function withGreaseGroundHazard(session: BattleRuntimeSession): BattleState {
  const sourceProcedureRef = requireCharacterSpellProcedureRefForTest(
    session,
    spellCasterId,
    spellSlotInvocationRef(greaseUnitId, 1, "persistentAreaSaveCondition"),
  );
  return battleStateWithAllocatedEffectForTest({
    state: session.state,
    ownerId: spellCasterId,
    effect: {
      kind: "persistentAreaSaveCondition" as const,
      sourceCombatantId: spellCasterId,
      sourceProcedureRef,
      areaId: greaseAreaId,
      heightenedSpellTargetDisadvantage: null,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(10),
      },
    },
  });
}

function persistentAreaSaveConditionEffect(state: BattleState) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "persistentAreaSaveCondition",
  );
  if (effect?.kind !== "persistentAreaSaveCondition") {
    throw new Error("Expected a Grease ground-hazard occurrence.");
  }
  return effect;
}

function moveAct(state: BattleState) {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Movement act.");
  }
  return act;
}

function advanceToCasterLaterTurn(state: BattleState) {
  const targetTurn = endTurn({
    state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  const endTurnAct = directionalPersistentAreaEndTurnSaveAct(targetTurn.state);
  const endTurnSave = requireHole(
    endTurnAct.initialHoles,
    "savingThrowOutcome",
  );
  const casterNextTurn = resolveBattleSubject({
    state: targetTurn.state,
    subject: endTurnAct.subject,
    fills: [
      directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
        { targetId: spellTargetId, succeeded: true },
      ]),
    ],
  });
  if (casterNextTurn.tag !== "resolved") {
    throw new Error("Expected target End Turn in Gust of Wind to resolve.");
  }
  return casterNextTurn.state;
}

function advanceHeightenedGustOfWindToCasterLaterTurn(state: BattleState) {
  const secondTargetTurn = advanceToCasterLaterTurn(state);
  const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
    secondTargetTurn,
    thunderwaveSecondTargetId,
  );
  const endTurnSave = requireHole(
    endTurnAct.initialHoles,
    "savingThrowOutcome",
  );
  const casterNextTurn = resolveBattleSubject({
    state: secondTargetTurn,
    subject: endTurnAct.subject,
    fills: [
      directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
        { targetId: thunderwaveSecondTargetId, succeeded: true },
      ]),
    ],
  });
  if (casterNextTurn.tag !== "resolved") {
    throw new Error(
      "Expected second target End Turn in Gust of Wind to resolve.",
    );
  }
  return casterNextTurn.state;
}

function directionalPersistentAreaEffect(state: BattleState) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "directionalPersistentArea",
  );
  if (effect === undefined) {
    throw new Error("Expected active Gust of Wind Line effect.");
  }
  return effect;
}
