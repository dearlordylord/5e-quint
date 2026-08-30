import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  battleStateWithAllocatedEffectForTest,
} from "./battle-runtime.test-support.ts";
import {
  battleActDruidWildShapePresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME moonbeam
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-moonbeam-movable-zone
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
import { describe, expect, test } from "vitest";
import {
  activeDruidWildShapeForm,
  combatantShapeShiftingSuppressed,
  type BattleActiveEffect,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  BattleHoleSchema,
  BattleSnapshotSchema,
  characterSeed,
  concentrationSavingThrowFill,
  Result,
  interruptDecisionFill,
  Schema,
  startBattleSessionRight,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  characterCreature,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  readyTargetRayOfFrost,
  spellBattle,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  moonbeamAreaFill,
  moonbeamEndTurnSaveAct,
  moonbeamRepositionAct,
  moonbeamRepositionMovementFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  webAreaFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleId,
  breakBattleConcentration,
  DieRollResult,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import {
  moonbeamAreaId,
  moonbeamUnitId,
  longstriderUnitId,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  unitLibrary,
  webUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE } from "./battle-reducer/spell-reroll-issues.ts";
import {
  addMovablePersistentAreaShapeShiftSuppression,
  markMovablePersistentAreaSavedThisTurn,
  removeMovablePersistentAreaShapeShiftSuppression,
} from "./battle-reducer/spells-active-effects.ts";
import { boundPersistentAreaSaveDamageEffect } from "./battle-reducer/persistent-area-save-damage-binding.ts";
import type { MovablePersistentAreaEffect } from "./battle-reducer/persistent-spatial-spell-discovery.ts";

type MoonbeamEffect = MovablePersistentAreaEffect;

describe("L12G deterministic Moonbeam admission", () => {
  test("admission correlates the initial save with the selected area hole without recognizing its authored spelling", () => {
    const spell = spellRecord(moonbeamUnitId);
    if (
      spell.mechanics.family !== "ongoing_effect" ||
      spell.mechanics.attachment.kind !== "hole" ||
      spell.mechanics.initialPhase?.kind !== "save_gate" ||
      spell.mechanics.initialPhase.attachment?.kind !== "hole"
    ) {
      throw new Error("Expected a hole-attached ongoing save fixture.");
    }
    const renamedHoleId = "synthetic_directed_area";
    const renamed = decodeSpellRecordForTest({
      ...spell,
      mechanics: {
        ...spell.mechanics,
        attachment: {
          ...spell.mechanics.attachment,
          holeId: renamedHoleId,
        },
        initialPhase: {
          ...spell.mechanics.initialPhase,
          attachment: {
            ...spell.mechanics.initialPhase.attachment,
            holeId: renamedHoleId,
          },
        },
      },
    });
    const session = spellBattle({
      preparedSpells: [renamed],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(
      discoverBattleActs(session).some((candidate) => {
        const invocation = battleActSpellPresentation(candidate)?.invocation;
        return (
          invocation?.spellId === moonbeamUnitId &&
          invocation.procedure === "persistentAreaSaveDamage"
        );
      }),
    ).toBe(true);
  });

  test("admission rejects an initial save whose area reference differs from the selected area hole", () => {
    const spell = spellRecord(moonbeamUnitId);
    if (
      spell.mechanics.family !== "ongoing_effect" ||
      spell.mechanics.initialPhase?.kind !== "save_gate" ||
      spell.mechanics.initialPhase.attachment?.kind !== "hole"
    ) {
      throw new Error("Expected a hole-attached ongoing save fixture.");
    }
    const mismatched = decodeSpellRecordForTest({
      ...spell,
      mechanics: {
        ...spell.mechanics,
        initialPhase: {
          ...spell.mechanics.initialPhase,
          attachment: {
            ...spell.mechanics.initialPhase.attachment,
            holeId: "synthetic_unrelated_area",
          },
        },
      },
    });
    const session = spellBattle({
      preparedSpells: [mismatched],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          battleActSpellPresentation(candidate)?.invocation.spellId ===
          moonbeamUnitId,
      ),
    ).toBe(false);
  });

  test("persistentAreaSaveDamage discovery projects a movable Cylinder CON-save radiant hazard", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const secondLevelAct = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const thirdLevelAct = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 3,
    });

    expect({
      ...secondLevelAct.subject,
      invocation: battleActSpellPresentation(secondLevelAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(moonbeamUnitId, 2, "persistentAreaSaveDamage"),
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(secondLevelAct.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Spell area",
        area: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(5),
          heightFeet: movementFeet(40),
        },
      }),
    );
    expect(spellHoleInvocation(state, [area])).toEqual(
      expect.objectContaining({
        procedure: "persistentAreaSaveDamage",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(5),
          heightFeet: movementFeet(40),
        },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: movementFeet(120),
        repositionMaxMoveFeet: movementFeet(60),
        damage: { expr: { dice: 2, dieSize: 10 }, damageType: "radiant" },
      }),
    );
    expect(spellHoleInvocation(state, thirdLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "persistentAreaSaveDamage",
        damage: { expr: { dice: 3, dieSize: 10 }, damageType: "radiant" },
      }),
    );
  });

  test("persistentAreaSaveDamage invocation holes decode through the public battle codec", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const encodedHole = Schema.encodeSync(BattleHoleSchema)(area);
    const decodedHole =
      Schema.decodeUnknownResult(BattleHoleSchema)(encodedHole);
    if (Result.isFailure(decodedHole)) {
      throw new Error(String(decodedHole.failure));
    }
    expect(decodedHole.success).toEqual(
      expect.objectContaining({
        kind: "spellAreaChoice",
        sourceProcedureRef: act.subject.procedureRef,
        area: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(5),
          heightFeet: movementFeet(40),
        },
      }),
    );
    expect(decodedHole.success).not.toHaveProperty("spell");

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const encodedSnapshot = Schema.encodeSync(BattleSnapshotSchema)(
      resolved.snapshot,
    );
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(encodedSnapshot),
      ),
    ).toBe(true);
  });

  test("cast records the source-owned persistentAreaSaveDamage cylinder effect", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.activeEffects).toEqual([
      expect.objectContaining({
        kind: "persistentAreaSaveDamage",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: moonbeamAreaId,
        lifecycle: "directedReposition",
        savedThisTurn: [],
        shapeShiftSuppressed: [],
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
    const beam = caster.activeEffects.find(
      (effect) =>
        effect.kind === "persistentAreaSaveDamage" &&
        effect.lifecycle === "directedReposition",
    );
    if (
      beam?.kind !== "persistentAreaSaveDamage" ||
      beam.lifecycle !== "directedReposition"
    ) {
      throw new Error("Expected the active directed-reposition area effect.");
    }
    expect(boundPersistentAreaSaveDamageEffect(caster, beam)?.kind).toBe(
      "directedReposition",
    );
    const mismatchedCollisionState = {
      kind: beam.kind,
      lifecycle: "collisionReposition",
      effectRef: beam.effectRef,
      sourceProcedureRef: beam.sourceProcedureRef,
      sourceCombatantId: beam.sourceCombatantId,
      areaId: beam.areaId,
      expiresAt: beam.expiresAt,
    } as const satisfies BattleActiveEffect;
    expect(
      boundPersistentAreaSaveDamageEffect(caster, mismatchedCollisionState),
    ).toBeUndefined();
  });

  test("recasting the same Moonbeam occurrence replaces its source-owned area effect", () => {
    const spell = spellRecord(moonbeamUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      casterClassLevels: [{ className: "druid", level: 3 }],
    });
    const act = spellAct({
      session,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    expect(
      requireCombatant(cast.state, spellCasterId).activeEffects.filter(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toHaveLength(1);

    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to end before recast.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target turn to end before recast.");
    }
    const recastSession = battleSessionWithState(session, casterTurn.state);
    const recastAct = spellAct({
      session: recastSession,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const recastArea = requireHole(recastAct.initialHoles, "spellAreaChoice");
    const recast = resolveBattleSubject({
      state: casterTurn.state,
      subject: recastAct.subject,
      fills: [moonbeamAreaFill(recastArea)],
    });
    if (recast.tag !== "resolved") {
      throw new Error("Expected Moonbeam recast to resolve.");
    }

    expect(
      requireCombatant(recast.state, spellCasterId).activeEffects.filter(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "persistentAreaSaveDamage",
        sourceProcedureRef: recastAct.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        areaId: moonbeamAreaId,
        savedThisTurn: [],
        shapeShiftSuppressed: [],
      }),
    ]);
  });

  test("Moonbeam marker updates preserve an unrelated timed spell effect", () => {
    const persistentAreaSaveDamage = spellRecord(moonbeamUnitId);
    const longstrider = spellRecord(longstriderUnitId);
    const session = spellBattle({
      preparedSpells: [persistentAreaSaveDamage, longstrider],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
      casterClassLevels: [{ className: "druid", level: 3 }],
    });
    const longstriderAct = spellAct({
      session,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const longstriderTarget = requireHole(
      longstriderAct.initialHoles,
      "targetChoice",
    );
    const longstriderCast = resolveBattleSubject({
      state: session.state,
      subject: longstriderAct.subject,
      fills: [
        spellTargetFill(
          longstriderTarget,
          longstriderUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    if (longstriderCast.tag !== "resolved") {
      throw new Error("Expected Longstrider cast to resolve.");
    }
    expect(
      requireCombatant(longstriderCast.state, spellCasterId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "speedDelta",
          sourceCombatantId: spellCasterId,
        }),
      ]),
    );
    const targetTurn = endTurn({
      state: longstriderCast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to end after Longstrider.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target turn to end after Longstrider.");
    }

    const persistentAreaSaveDamageAct = spellAct({
      session: battleSessionWithState(session, casterTurn.state),
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const persistentAreaSaveDamageArea = requireHole(
      persistentAreaSaveDamageAct.initialHoles,
      "spellAreaChoice",
    );
    const persistentAreaSaveDamageCast = resolveBattleSubject({
      state: casterTurn.state,
      subject: persistentAreaSaveDamageAct.subject,
      fills: [moonbeamAreaFill(persistentAreaSaveDamageArea)],
    });
    if (persistentAreaSaveDamageCast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const persistentAreaSaveDamageEffect = requireMoonbeamEffect(
      persistentAreaSaveDamageCast.state,
    );

    const marked = markMovablePersistentAreaSavedThisTurn(
      persistentAreaSaveDamageCast.state,
      spellTargetId,
      persistentAreaSaveDamageEffect,
    );
    const suppressed = addMovablePersistentAreaShapeShiftSuppression(
      marked,
      spellTargetId,
      persistentAreaSaveDamageEffect,
    );
    expect(requireCombatant(marked, spellCasterId).activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "persistentAreaSaveDamage",
          savedThisTurn: [spellTargetId],
          shapeShiftSuppressed: [],
        }),
      ]),
    );
    expect(requireCombatant(suppressed, spellCasterId).activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "persistentAreaSaveDamage",
          savedThisTurn: [spellTargetId],
          shapeShiftSuppressed: [spellTargetId],
        }),
      ]),
    );
    const restored = removeMovablePersistentAreaShapeShiftSuppression(
      suppressed,
      spellTargetId,
      persistentAreaSaveDamageEffect,
    );

    expect(requireCombatant(restored, spellCasterId).activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "speedDelta",
          sourceCombatantId: spellCasterId,
        }),
        expect.objectContaining({
          kind: "persistentAreaSaveDamage",
          savedThisTurn: [spellTargetId],
          shapeShiftSuppressed: [],
        }),
      ]),
    );
  });

  test("end-turn save applies failed-save radiant damage before ending the turn", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }

    const endTurnSave = moonbeamEndTurnSaveAct(
      battleSessionWithState(state, targetTurn.state),
    );
    const save = requireHole(endTurnSave.initialHoles, "savingThrowOutcome");
    expect(save).toMatchObject({
      ability: "con",
    });
    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnSave.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnSave.subject,
      fills: [failedSave, damageRollFillWithGroups(damage, [[5, 8]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam end-turn damage to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(17));
  });

  test("end-turn damage rejects inert Empowered Spell reroll fills", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }

    const endTurnSave = moonbeamEndTurnSaveAct(
      battleSessionWithState(state, targetTurn.state),
    );
    const save = requireHole(endTurnSave.initialHoles, "savingThrowOutcome");
    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnSave.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[5, 8]]);

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: endTurnSave.subject,
        fills: [
          failedSave,
          {
            ...damageFill,
            spellDamageReroll: {
              kind: "reroll",
              effectKind: "damage_dice_reroll",
              dice: [
                {
                  original: DieRollResult(5),
                  replacement: DieRollResult(1),
                },
              ],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE,
    });
  });

  test("end-turn save applies half radiant damage on success", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }

    const endTurnSave = moonbeamEndTurnSaveAct(
      battleSessionWithState(state, targetTurn.state),
    );
    const save = requireHole(endTurnSave.initialHoles, "savingThrowOutcome");
    const succeededSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      true,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnSave.subject,
      fills: [succeededSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnSave.subject,
      fills: [succeededSave, damageRollFillWithGroups(damage, [[5, 8]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam half-damage save to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(24));
  });

  test("failed end-turn save routes applied damage through target Concentration before completing End Turn", () => {
    const concentrating = battleWithTargetWebConcentration();
    const endTurnSave = moonbeamEndTurnSaveAct(concentrating);
    const save = requireHole(endTurnSave.initialHoles, "savingThrowOutcome");
    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: concentrating.state,
      subject: endTurnSave.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[5, 8]]);
    const needsConcentration = resolveBattleSubject({
      state: concentrating.state,
      subject: endTurnSave.subject,
      fills: [failedSave, damageFill],
    });
    const concentration = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ damageAmount: 13 });

    const resolved = resolveBattleSubject({
      state: concentrating.state,
      subject: endTurnSave.subject,
      fills: [
        failedSave,
        damageFill,
        concentrationSavingThrowFill(concentration, false),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam damage and End Turn to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      hp: Hp(17),
      concentration: null,
      activeEffects: [],
    });
  });

  test("failed table-triggered Moonbeam save opens a readied-spell Reaction", () => {
    const spell = spellRecord(moonbeamUnitId);
    const session = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "druid", level: 3 }],
    });
    const castAct = spellAct({
      session,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        moonbeamAreaFill(requireHole(castAct.initialHoles, "spellAreaChoice")),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
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
        ...session,
        state: targetTurn.state,
      }),
    );
    const endTurnAct = moonbeamEndTurnSaveAct(readied);
    const save = requireHole(endTurnAct.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: readied.state,
      subject: endTurnAct.subject,
      fills: [singleTargetSavingThrowOutcomeFill(save, spellTargetId, false)],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Moonbeam save Reaction.");
    }
    const pendingInterrupt = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    );
    if (pendingInterrupt === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("table-triggered save is limited once per creature per turn and resets on turn advance", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const selectedMoonbeam = requireCombatant(
      targetTurn.state,
      spellCasterId,
    ).activeEffects.find(
      (effect) => effect.kind === "persistentAreaSaveDamage",
    );
    if (selectedMoonbeam?.kind !== "persistentAreaSaveDamage") {
      throw new Error("Expected the selected Moonbeam occurrence.");
    }
    const { effectRef: _selectedEffectRef, ...overlappingMoonbeamTemplate } =
      selectedMoonbeam;
    const overlappingState = battleStateWithAllocatedEffectForTest({
      state: targetTurn.state,
      ownerId: spellCasterId,
      effect: overlappingMoonbeamTemplate,
    });
    const saveSubject = persistentAreaSaveDamageSaveSubject(
      overlappingState,
      "entersArea",
    );

    const needsSave = resolveBattleSubject({
      state: overlappingState,
      subject: saveSubject,
      fills: [],
    });
    const save = requireResultHole(needsSave, "savingThrowOutcome");
    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: overlappingState,
      subject: saveSubject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const firstSave = resolveBattleSubject({
      state: overlappingState,
      subject: saveSubject,
      fills: [failedSave, damageRollFillWithGroups(damage, [[5, 8]])],
    });
    if (firstSave.tag !== "resolved") {
      throw new Error("Expected Moonbeam table-triggered save to resolve.");
    }
    expect(requireCombatant(firstSave.state, spellTargetId).hp).toBe(Hp(17));
    const activeMoonbeam = requireCombatant(
      firstSave.state,
      spellCasterId,
    ).activeEffects.find(
      (effect) => effect.kind === "persistentAreaSaveDamage",
    );
    expect(activeMoonbeam).toEqual(
      expect.objectContaining({ savedThisTurn: [spellTargetId] }),
    );
    const persistentAreaSaveDamageOccurrences = requireCombatant(
      firstSave.state,
      spellCasterId,
    ).activeEffects.filter(
      (effect) => effect.kind === "persistentAreaSaveDamage",
    );
    expect(
      persistentAreaSaveDamageOccurrences.find(
        (effect) => effect.effectRef === saveSubject.effectRef,
      ),
    ).toEqual(expect.objectContaining({ savedThisTurn: [spellTargetId] }));
    expect(
      persistentAreaSaveDamageOccurrences.find(
        (effect) => effect.effectRef !== saveSubject.effectRef,
      ),
    ).toEqual(expect.objectContaining({ savedThisTurn: [] }));

    const duplicateSave = resolveBattleSubject({
      state: firstSave.state,
      subject: saveSubject,
      fills: [],
    });
    expect(duplicateSave).toMatchObject({ tag: "resolved" });
    if (duplicateSave.tag !== "resolved") {
      throw new Error("Expected duplicate Moonbeam save to resolve.");
    }
    expect(requireCombatant(duplicateSave.state, spellTargetId).hp).toBe(
      Hp(17),
    );

    const endTurnSave = moonbeamEndTurnSaveAct(
      battleSessionWithState(state, duplicateSave.state),
    );
    const nextTurn = resolveBattleSubject({
      state: duplicateSave.state,
      subject: endTurnSave.subject,
      fills: [],
    });
    if (nextTurn.tag !== "resolved") {
      throw new Error("Expected duplicate end-turn save to advance the turn.");
    }
    expect(requireCombatant(nextTurn.state, spellTargetId).hp).toBe(Hp(17));
    expect(
      requireCombatant(nextTurn.state, spellCasterId).activeEffects.find(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toEqual(expect.objectContaining({ savedThisTurn: [] }));
  });

  test.each([
    "appearsInArea",
    "areaMovesIntoSpace",
    "entersArea",
    "endsTurnInArea",
  ] as const)(
    "failed %s save reverts an active shape-shift and suppresses shape-shifting",
    (trigger) => {
      const cast = persistentAreaSaveDamageCastOverWildShapedTarget();
      const resolved = resolveMoonbeamSaveForShapeShiftedTarget({
        state: cast,
        trigger,
        succeeded: false,
      });

      expect(
        activeDruidWildShapeForm(requireCombatant(resolved, spellTargetId)),
      ).toBeNull();
      expect(combatantShapeShiftingSuppressed(resolved, spellTargetId)).toBe(
        true,
      );
      expect(
        requireCombatant(resolved, spellCasterId).activeEffects.find(
          (effect) => effect.kind === "persistentAreaSaveDamage",
        ),
      ).toEqual(
        expect.objectContaining({
          shapeShiftSuppressed: [spellTargetId],
          savedThisTurn: trigger === "endsTurnInArea" ? [] : [spellTargetId],
        }),
      );
    },
  );

  test("successful save leaves an active shape-shift and shape-shifting unsuppressed", () => {
    const cast = persistentAreaSaveDamageCastOverWildShapedTarget();
    const resolved = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: true,
    });

    expect(
      activeDruidWildShapeForm(requireCombatant(resolved, spellTargetId)),
    ).not.toBeNull();
    expect(combatantShapeShiftingSuppressed(resolved, spellTargetId)).toBe(
      false,
    );
    expect(
      requireCombatant(resolved, spellCasterId).activeEffects.find(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toEqual(expect.objectContaining({ shapeShiftSuppressed: [] }));
  });

  test("Moonbeam suppression rejects a Wild Shape subject selected before the failed save", () => {
    const scenario = persistentAreaSaveDamageCastOverWildShapedTargetScenario();
    const suppressed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: scenario.state,
      trigger: "appearsInArea",
      succeeded: false,
    });

    expect(
      resolveBattleSubject({
        state: suppressed,
        subject: scenario.preselectedWildShapeSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: expect.stringContaining("suppressed"),
    });
  });

  test("duplicate same-turn save does not repeat shape-shift rider effects", () => {
    const cast = persistentAreaSaveDamageCastOverWildShapedTarget();
    const saveSubject = persistentAreaSaveDamageSaveSubject(cast, "entersArea");
    const firstSave = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "entersArea",
      succeeded: false,
    });

    const duplicateSave = resolveBattleSubject({
      state: firstSave,
      subject: saveSubject,
      fills: [],
    });

    expect(duplicateSave).toMatchObject({ tag: "resolved" });
    if (duplicateSave.tag !== "resolved") {
      throw new Error("Expected duplicate Moonbeam save to resolve.");
    }
    expect(
      activeDruidWildShapeForm(
        requireCombatant(duplicateSave.state, spellTargetId),
      ),
    ).toBeNull();
    expect(
      requireCombatant(duplicateSave.state, spellCasterId).activeEffects.find(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toEqual(
      expect.objectContaining({
        shapeShiftSuppressed: [spellTargetId],
        savedThisTurn: [spellTargetId],
      }),
    );
  });

  test("validated Moonbeam marker replay remains idempotent", () => {
    const failed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: persistentAreaSaveDamageCastOverWildShapedTarget(),
      trigger: "appearsInArea",
      succeeded: false,
    });
    const effect = requireMoonbeamEffect(failed);

    const replayed = markMovablePersistentAreaSavedThisTurn(
      failed,
      spellTargetId,
      effect,
    );

    expect(
      requireCombatant(replayed, spellCasterId).activeEffects.find(
        (activeEffect) => activeEffect.kind === "persistentAreaSaveDamage",
      ),
    ).toEqual(
      expect.objectContaining({
        shapeShiftSuppressed: [spellTargetId],
        savedThisTurn: [spellTargetId],
      }),
    );
  });

  test("table-supplied Cylinder exit clears shape-shift suppression", () => {
    const cast = persistentAreaSaveDamageCastOverWildShapedTarget();
    const suppressed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: false,
    });

    const exited = resolveBattleSubject({
      state: suppressed,
      subject: persistentAreaSaveDamageExitSubject(suppressed),
      fills: [],
    });

    expect(exited).toMatchObject({ tag: "resolved" });
    if (exited.tag !== "resolved") {
      throw new Error("Expected Moonbeam Cylinder exit cleanup to resolve.");
    }
    expect(combatantShapeShiftingSuppressed(exited.state, spellTargetId)).toBe(
      false,
    );
    expect(
      requireCombatant(exited.state, spellCasterId).activeEffects.find(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toEqual(expect.objectContaining({ shapeShiftSuppressed: [] }));
    expect(
      discoverBattleActCandidates(exited.state).some(
        (act) =>
          act.subject.tag === "druidWildShape" &&
          act.subject.action === "assumeForm",
      ),
    ).toBe(true);
  });

  test("spell cleanup clears shape-shift suppression with the Moonbeam effect", () => {
    const cast = persistentAreaSaveDamageCastOverWildShapedTarget();
    const suppressed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: false,
    });

    const cleaned = breakBattleConcentration(suppressed, spellCasterId);

    expect(combatantShapeShiftingSuppressed(cleaned, spellTargetId)).toBe(
      false,
    );
    expect(
      requireCombatant(cleaned, spellCasterId).activeEffects.some(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toBe(false);
  });

  test("reposition spends magic action and offers persistentAreaSaveDamageRepositionMovement hole", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const repositionAct = moonbeamRepositionAct(
      battleSessionWithState(state, casterTurn.state),
    );
    expect({
      ...repositionAct.subject,
      invocation: battleActSpellPresentation(repositionAct)?.invocation,
    }).toMatchObject({
      command: "movableZoneReposition",
      areaId: moonbeamAreaId,
    });
    const movementHole = requireHole(
      repositionAct.initialHoles,
      "movableZoneRepositionMovement",
    );
    const moveFill = moonbeamRepositionMovementFill(movementHole, 30);
    expect(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repositionAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({ kind: "movableZoneRepositionMovement" }),
      ],
    });
    const resolved = resolveBattleSubject({
      state: casterTurn.state,
      subject: repositionAct.subject,
      fills: [moveFill],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam reposition to resolve.");
    }
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject: repositionAct.subject,
        fills: [moveFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Movable zone reposition requires an available Magic action.",
    });
  });

  test("breaking concentration removes the movable cylinder effect", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const staleSave = moonbeamEndTurnSaveAct(
      battleSessionWithState(state, targetTurn.state),
    );

    const broken = breakBattleConcentration(targetTurn.state, spellCasterId);

    expect(requireCombatant(broken, spellCasterId).concentration).toBeNull();
    expect(
      requireCombatant(broken, spellCasterId).activeEffects.some(
        (effect) => effect.kind === "persistentAreaSaveDamage",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: broken,
        subject: staleSave.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Movable zone save is no longer available.",
    });
  });
});

function battleWithTargetWebConcentration(): BattleRuntimeSession {
  const persistentAreaSaveDamage = spellRecord(moonbeamUnitId);
  const web = spellRecord(webUnitId);
  const initial = startBattleSessionRight({
    battleId: battleId(
      "battle-persistentAreaSaveDamage-target-web-concentration",
    ),
    combatants: [
      characterSeed({
        combatantId: spellTargetId,
        displayName: "Web Caster Target",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "wizard", level: 3 }],
        spellcasting: wizardSpellcasting({
          preparedSpells: [web],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        }),
        currentHp: 30,
        maxHp: 30,
      }),
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Moonbeam Caster",
        initiative: 10,
        attack: null,
        classLevels: [{ className: "druid", level: 3 }],
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [persistentAreaSaveDamage],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "druid",
            abilityModifier: 3,
          },
        },
      }),
    ],
  });
  const webAct = spellAct({
    session: initial,
    spellId: webUnitId,
    slotLevel: 2,
  });
  const webArea = requireHole(webAct.initialHoles, "spellAreaChoice");
  const webCast = resolveBattleSubject({
    state: initial.state,
    subject: webAct.subject,
    fills: [webAreaFill(webArea)],
  });
  if (webCast.tag !== "resolved") {
    throw new Error("Expected target Web cast to resolve.");
  }
  const casterTurn = endTurn({
    state: webCast.state,
    actorId: spellTargetId,
  });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected target Web caster End Turn to resolve.");
  }

  const persistentAreaSaveDamageAct = spellAct({
    session: battleSessionWithState(initial, casterTurn.state),
    spellId: moonbeamUnitId,
    slotLevel: 2,
  });
  const persistentAreaSaveDamageArea = requireHole(
    persistentAreaSaveDamageAct.initialHoles,
    "spellAreaChoice",
  );
  const persistentAreaSaveDamageCast = resolveBattleSubject({
    state: casterTurn.state,
    subject: persistentAreaSaveDamageAct.subject,
    fills: [moonbeamAreaFill(persistentAreaSaveDamageArea)],
  });
  if (persistentAreaSaveDamageCast.tag !== "resolved") {
    throw new Error("Expected Moonbeam cast to resolve.");
  }
  const targetTurn = endTurn({
    state: persistentAreaSaveDamageCast.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Moonbeam caster End Turn to resolve.");
  }
  return battleSessionWithState(initial, targetTurn.state);
}

function persistentAreaSaveDamageCastOverWildShapedTarget(): BattleState {
  return persistentAreaSaveDamageCastOverWildShapedTargetScenario().state;
}

function persistentAreaSaveDamageCastOverWildShapedTargetScenario(): {
  readonly state: BattleState;
  readonly preselectedWildShapeSubject: Extract<
    BattleSubject,
    { readonly tag: "druidWildShape" }
  >;
} {
  const spell = spellRecord(moonbeamUnitId);
  const initial = startBattleSessionRight({
    battleId: battleId("battle-persistentAreaSaveDamage-shape-shift-rider"),
    combatants: [
      characterSeed({
        combatantId: spellTargetId,
        displayName: "Shape-shifted Target",
        initiative: 20,
        classLevels: [{ className: "druid", level: 2 }],
        resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
        druidWildShapeAvailableForms: [
          statBlockCatalog.requireStatBlock("stat_block_rat"),
          statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
          statBlockCatalog.requireStatBlock("stat_block_lizard"),
          statBlockCatalog.requireStatBlock("stat_block_cat"),
        ],
        currentHp: 30,
        maxHp: 30,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Moonbeam Caster",
        initiative: 10,
        classLevels: [{ className: "druid", level: 3 }],
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spell],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "druid",
            abilityModifier: 3,
          },
        },
      }),
    ],
  });
  const wildShape = discoverBattleActs(initial).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === "assumeForm" &&
      battleActDruidWildShapePresentation(act)?.formStatBlockId ===
        "stat_block_riding_horse",
  )?.subject;
  if (wildShape?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape assume-form act.");
  }
  const initialAssume = resolveBattleSubject({
    state: initial.state,
    subject: wildShape,
    fills: [],
  });
  const equipmentDispositionHole =
    initialAssume.tag === "needsHoles"
      ? initialAssume.holes.find(
          (hole) => hole.kind === "wildShapeEquipmentDisposition",
        )
      : undefined;
  const assumed =
    equipmentDispositionHole === undefined
      ? initialAssume
      : resolveBattleSubject({
          state: initial.state,
          subject: wildShape,
          fills: [
            {
              kind: "wildShapeEquipmentDisposition",
              holeId: equipmentDispositionHole.holeId,
              value: {
                formLimbs: { kind: "canHandleObjects" },
                choices: equipmentDispositionHole.candidates.map((item) => ({
                  item,
                  disposition: "merges" as const,
                })),
              },
            },
          ],
        });
  if (assumed.tag !== "resolved") {
    throw new Error("Expected Druid Wild Shape assume-form to resolve.");
  }
  const casterTurn = endTurn({ state: assumed.state, actorId: spellTargetId });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected shape-shifted target End Turn to resolve.");
  }
  const act = spellAct({
    session: battleSessionWithState(initial, casterTurn.state),
    spellId: moonbeamUnitId,
    slotLevel: 2,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: casterTurn.state,
    subject: act.subject,
    fills: [moonbeamAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Moonbeam cast to resolve.");
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  return {
    state: targetTurn.state,
    preselectedWildShapeSubject: wildShape,
  };
}

function resolveMoonbeamSaveForShapeShiftedTarget(input: {
  readonly state: BattleState;
  readonly trigger: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneSave";
    }
  >["trigger"];
  readonly succeeded: boolean;
}): BattleState {
  const subject = persistentAreaSaveDamageSaveSubject(
    input.state,
    input.trigger,
  );
  const needsSave = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [],
  });
  if (needsSave.tag === "invalid") {
    throw new Error(needsSave.message);
  }
  const save = requireResultHole(needsSave, "savingThrowOutcome");
  const saveFill = singleTargetSavingThrowOutcomeFill(
    save,
    spellTargetId,
    input.succeeded,
  );
  const needsDamage = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [saveFill],
  });
  const damage = requireResultHole(needsDamage, "rolledDice");
  const resolved = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [saveFill, damageRollFillWithGroups(damage, [[5, 8]])],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Moonbeam shape-shift rider save to resolve.");
  }
  return resolved.state;
}

function battleSessionWithState(
  session: BattleRuntimeSession,
  state: BattleState,
): BattleRuntimeSession {
  return battleRuntimeSessionForTest({ ...session, state });
}

function persistentAreaSaveDamageSaveSubject(
  state: BattleState,
  trigger: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneSave";
    }
  >["trigger"],
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "movableZoneSave" }
> {
  return {
    tag: "runtimeCommand",
    actorId: spellTargetId,
    command: "movableZoneSave",
    areaId: moonbeamAreaId,
    effectRef: activeMoonbeamEffectRef(state),
    trigger,
  };
}

function persistentAreaSaveDamageExitSubject(state: BattleState): Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "persistentAreaSaveDamageExit";
  }
> {
  return {
    tag: "runtimeCommand",
    actorId: spellTargetId,
    command: "persistentAreaSaveDamageExit",
    areaId: moonbeamAreaId,
    effectRef: activeMoonbeamEffectRef(state),
  };
}

function activeMoonbeamEffectRef(state: BattleState) {
  const effect = [...state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (candidate) =>
        candidate.kind === "persistentAreaSaveDamage" &&
        candidate.areaId === moonbeamAreaId,
    );
  if (effect?.kind !== "persistentAreaSaveDamage") {
    throw new Error("Expected active Moonbeam occurrence.");
  }
  return effect.effectRef;
}

function requireMoonbeamEffect(state: BattleState): MoonbeamEffect {
  const owner = requireCombatant(state, spellCasterId);
  const effect = owner.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "persistentAreaSaveDamage" }
    > =>
      candidate.kind === "persistentAreaSaveDamage" &&
      candidate.areaId === moonbeamAreaId,
  );
  const binding =
    effect === undefined
      ? undefined
      : boundPersistentAreaSaveDamageEffect(owner, effect);
  if (binding?.kind !== "directedReposition") {
    throw new Error("Expected bound Moonbeam active effect.");
  }
  return {
    ...binding.effect,
    lifecycle: binding.facts.lifecycle,
    save: { ability: binding.facts.ability, dc: binding.facts.dc },
    repositionMaxMoveFeet: binding.facts.repositionMaxMoveFeet,
    damage: binding.facts.damage,
  };
}
