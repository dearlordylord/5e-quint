// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME moonbeam
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-moonbeam-movable-zone
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
import { describe, expect, test } from "vitest";
import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import {
  activeDruidWildShapeForm,
  battleShapeShiftedRuntimeState,
  battleSpellEffectOccurrenceId,
  combatantShapeShiftingSuppressed,
  type BattleState,
  type BattleSubject,
  type BattleActiveEffect,
  type SpellShapeShiftedFormActiveEffect,
} from "./index.ts";
import {
  BattleHoleSchema,
  BattleSnapshotSchema,
  characterSeed,
  Either,
  Schema,
  startBattleRight,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  characterCreature,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  moonbeamAreaFill,
  moonbeamEndTurnSaveAct,
  moonbeamRepositionAct,
  moonbeamRepositionMovementFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleId,
  breakBattleConcentration,
  DieRollResult,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  resourceCount,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import {
  moonbeamAreaId,
  moonbeamUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE } from "./battle-reducer.ts";

describe("L12G deterministic Moonbeam admission", () => {
  test("moonbeam is admitted as a movable Cylinder CON-save radiant hazard", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const secondLevelAct = spellAct({
      state,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const thirdLevelAct = spellAct({
      state,
      spellId: moonbeamUnitId,
      slotLevel: 3,
    });

    expect(secondLevelAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(moonbeamUnitId, 2, "moonbeam"),
      mode: { tag: "cast" },
    });
    const area = requireHole(secondLevelAct.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Moonbeam area",
        area: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(5),
          heightFeet: movementFeet(40),
        },
      }),
    );
    expect(spellHoleInvocation([area])).toEqual(
      expect.objectContaining({
        procedure: "moonbeam",
        spell,
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
    expect(spellHoleInvocation(thirdLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "moonbeam",
        damage: { expr: { dice: 3, dieSize: 10 }, damageType: "radiant" },
      }),
    );
  });

  test("moonbeam invocation holes decode through the public battle codec", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const encodedHole = Schema.encodeSync(BattleHoleSchema)(area);
    const decodedHole =
      Schema.decodeUnknownEither(BattleHoleSchema)(encodedHole);
    if (Either.isLeft(decodedHole)) {
      throw new Error(String(decodedHole.left));
    }
    if (!("spell" in decodedHole.right)) {
      throw new Error("Expected decoded Moonbeam area hole to carry a spell.");
    }
    expect(decodedHole.right.spell).toMatchObject({
      procedure: "moonbeam",
      targeting: {
        kind: "pointOriginCylinder",
        radiusFeet: movementFeet(5),
        heightFeet: movementFeet(40),
      },
      damage: { expr: { dice: 2, dieSize: 10 }, damageType: "radiant" },
    });

    const resolved = resolveBattleSubject({
      state,
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
      Either.isRight(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(encodedSnapshot),
      ),
    ).toBe(true);
  });

  test("cast records the source-owned moonbeam cylinder effect", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "moonbeam",
        sourceSpellId: moonbeamUnitId,
        sourceCombatantId: spellCasterId,
        areaId: moonbeamAreaId,
        save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
        damage: { expr: { dice: 2, dieSize: 10 }, damageType: "radiant" },
        repositionMaxMoveFeet: movementFeet(60),
        savedThisTurn: [],
        shapeShiftSuppressed: [],
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
  });

  test("end-turn save applies failed-save radiant damage before ending the turn", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
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

    const endTurnSave = moonbeamEndTurnSaveAct(targetTurn.state);
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
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
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

    const endTurnSave = moonbeamEndTurnSaveAct(targetTurn.state);
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
                  groupIndex: 0,
                  resultIndex: 0,
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
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
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

    const endTurnSave = moonbeamEndTurnSaveAct(targetTurn.state);
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

  test("table-triggered save is limited once per creature per turn and resets on turn advance", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
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
    const saveSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "movableZoneSave" as const,
      sourceCombatantId: spellCasterId,
      sourceSpellId: spellId(moonbeamUnitId),
      areaId: moonbeamAreaId,
      trigger: "entersArea" as const,
    };

    const needsSave = resolveBattleSubject({
      state: targetTurn.state,
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
      state: targetTurn.state,
      subject: saveSubject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const firstSave = resolveBattleSubject({
      state: targetTurn.state,
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
    ).activeEffects.find((effect) => effect.kind === "moonbeam");
    expect(activeMoonbeam).toEqual(
      expect.objectContaining({ savedThisTurn: [spellTargetId] }),
    );

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

    const endTurnSave = moonbeamEndTurnSaveAct(duplicateSave.state);
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
        (effect) => effect.kind === "moonbeam",
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
      const cast = moonbeamCastOverWildShapedTarget();
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
          (effect) => effect.kind === "moonbeam",
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
    const cast = moonbeamCastOverWildShapedTarget();
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
        (effect) => effect.kind === "moonbeam",
      ),
    ).toEqual(expect.objectContaining({ shapeShiftSuppressed: [] }));
  });

  test("failed save reverts a spell-effect shape-shift through the shared owner", () => {
    const cast = moonbeamCastOverSpellShapeShiftedTarget();
    const failed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: false,
    });
    const target = requireCombatant(failed, spellTargetId);

    expect(battleShapeShiftedRuntimeState(target).kind).toBe("trueForm");
    expect(
      target.activeEffects.some(
        (effect) =>
          effect.kind === "spellShapeShiftedForm" &&
          effect.sourceEffectId ===
            syntheticSpellShapeShiftEffect.sourceEffectId,
      ),
    ).toBe(false);
    expect(combatantShapeShiftingSuppressed(failed, spellTargetId)).toBe(true);
  });

  test("successful save preserves a spell-effect shape-shift through the shared owner", () => {
    const cast = moonbeamCastOverSpellShapeShiftedTarget();
    const resolved = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: true,
    });
    const target = requireCombatant(resolved, spellTargetId);

    expect(battleShapeShiftedRuntimeState(target).kind).toBe("shapeShifted");
    expect(
      target.activeEffects.some(
        (effect) =>
          effect.kind === "spellShapeShiftedForm" &&
          effect.sourceEffectId ===
            syntheticSpellShapeShiftEffect.sourceEffectId,
      ),
    ).toBe(true);
    expect(combatantShapeShiftingSuppressed(resolved, spellTargetId)).toBe(
      false,
    );
  });

  test("failed save clears the full shape-shift owner slot before suppression", () => {
    const cast = moonbeamCastOverSpellShapeShiftedTarget({
      activeShapeShiftOwners: [
        syntheticDruidWildShapeEffect,
        syntheticSpellShapeShiftEffect,
      ],
      useActiveEffectBoundary: false,
    });
    const failed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: false,
    });
    const target = requireCombatant(failed, spellTargetId);

    expect(battleShapeShiftedRuntimeState(target).kind).toBe("trueForm");
    expect(
      target.activeEffects.some(
        (effect) =>
          effect.kind === "druidWildShapeForm" ||
          effect.kind === "spellShapeShiftedForm",
      ),
    ).toBe(false);
    expect(combatantShapeShiftingSuppressed(failed, spellTargetId)).toBe(true);
  });

  test("duplicate same-turn save does not repeat shape-shift rider effects", () => {
    const cast = moonbeamCastOverWildShapedTarget();
    const saveSubject = moonbeamSaveSubject("entersArea");
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
        (effect) => effect.kind === "moonbeam",
      ),
    ).toEqual(
      expect.objectContaining({
        shapeShiftSuppressed: [spellTargetId],
        savedThisTurn: [spellTargetId],
      }),
    );
  });

  test("table-supplied Cylinder exit clears shape-shift suppression", () => {
    const cast = moonbeamCastOverWildShapedTarget();
    const suppressed = resolveMoonbeamSaveForShapeShiftedTarget({
      state: cast,
      trigger: "appearsInArea",
      succeeded: false,
    });

    const exited = resolveBattleSubject({
      state: suppressed,
      subject: moonbeamCylinderExitSubject(),
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
        (effect) => effect.kind === "moonbeam",
      ),
    ).toEqual(expect.objectContaining({ shapeShiftSuppressed: [] }));
    expect(
      discoverBattleActs(exited.state).some(
        (act) =>
          act.subject.tag === "druidWildShape" &&
          act.subject.action === "assumeForm",
      ),
    ).toBe(true);
  });

  test("spell cleanup clears shape-shift suppression with the Moonbeam effect", () => {
    const cast = moonbeamCastOverWildShapedTarget();
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
        (effect) => effect.kind === "moonbeam",
      ),
    ).toBe(false);
  });

  test("reposition spends magic action and offers moonbeamRepositionMovement hole", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
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

    const repositionAct = moonbeamRepositionAct(casterTurn.state);
    expect(repositionAct.subject).toMatchObject({
      command: "movableZoneReposition",
      areaId: moonbeamAreaId,
    });
    const movementHole = requireHole(
      repositionAct.initialHoles,
      "movableZoneRepositionMovement",
    );
    const moveFill = moonbeamRepositionMovementFill(movementHole, 30);
    const resolved = resolveBattleSubject({
      state: casterTurn.state,
      subject: repositionAct.subject,
      fills: [moveFill],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
  });

  test("breaking concentration removes the movable cylinder effect", () => {
    const spell = spellRecord(moonbeamUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: moonbeamUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [moonbeamAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Moonbeam cast to resolve.");
    }

    const broken = breakBattleConcentration(cast.state, spellCasterId);

    expect(requireCombatant(broken, spellCasterId).concentration).toBeNull();
    expect(
      requireCombatant(broken, spellCasterId).activeEffects.some(
        (effect) => effect.kind === "moonbeam",
      ),
    ).toBe(false);
  });
});

const syntheticSpellShapeShiftEffect: SpellShapeShiftedFormActiveEffect = {
  kind: "spellShapeShiftedForm",
  sourceCombatantId: spellCasterId,
  sourceSpellId: "synthetic_shape_spell",
  sourceEffectId: battleSpellEffectOccurrenceId("synthetic-shape-spell-effect"),
  replacementForm: {
    kind: "runtimeCreatureForm",
    creatureSize: "large",
  },
  expiresAt: { kind: "concentration", combatantId: spellCasterId },
};
const syntheticDruidWildShapeEffect: Extract<
  BattleActiveEffect,
  { readonly kind: "druidWildShapeForm" }
> = {
  kind: "druidWildShapeForm",
  sourceCombatantId: spellTargetId,
  sourceUnitId: "synthetic_wild_shape_feature",
  formStatBlockId: "synthetic_beast_form",
  formLimbs: { kind: "cannotHandleObjects" },
  equipmentDisposition: [],
  resources: {
    legendaryActionUsesRemaining: resourceCount(0),
    dailyUses: [],
    unavailableRechargeParts: [],
    unavailableRestRechargeParts: [],
  },
  expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
};

function moonbeamCastOverWildShapedTarget(): BattleState {
  const spell = spellRecord(moonbeamUnitId);
  const initial = startBattleRight({
    battleId: battleId("battle-moonbeam-shape-shift-rider"),
    combatants: [
      characterSeed({
        combatantId: spellTargetId,
        displayName: "Shape-shifted Target",
        initiative: 20,
        side: oppositionSide,
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
        side: partySide,
        classLevels: [{ className: "druid", level: 3 }],
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spell],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          sourceClassName: "druid",
        },
      }),
    ],
  });
  const wildShape = discoverBattleActs(initial).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === "assumeForm" &&
      act.subject.formStatBlockId === "stat_block_riding_horse",
  )?.subject;
  if (wildShape?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape assume-form act.");
  }
  const initialAssume = resolveBattleSubject({
    state: initial,
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
          state: initial,
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
    state: casterTurn.state,
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
  return targetTurn.state;
}

function moonbeamCastOverSpellShapeShiftedTarget(
  input: {
    readonly activeShapeShiftOwners?: readonly BattleActiveEffect[];
    readonly useActiveEffectBoundary?: boolean;
  } = {},
): BattleState {
  const spell = spellRecord(moonbeamUnitId);
  const initial = startBattleRight({
    battleId: battleId("battle-moonbeam-spell-shape-shift-rider"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Spell Shape-shifted Target",
        initiative: 20,
        side: oppositionSide,
        currentHp: 30,
        maxHp: 30,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Moonbeam Caster",
        initiative: 10,
        side: partySide,
        classLevels: [{ className: "druid", level: 3 }],
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spell],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          sourceClassName: "druid",
        },
      }),
    ],
  });
  const target = requireCombatant(initial, spellTargetId);
  const combatants = new Map(initial.combatants);
  const activeEffects = [
    ...target.activeEffects,
    ...(input.activeShapeShiftOwners ?? [syntheticSpellShapeShiftEffect]),
  ];
  combatants.set(
    spellTargetId,
    input.useActiveEffectBoundary === false
      ? { ...target, activeEffects }
      : battleCreatureWithSpellActiveEffects(target, activeEffects),
  );
  const shaped = { ...initial, combatants };
  const casterTurn = endTurn({ state: shaped, actorId: spellTargetId });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected shape-shifted target End Turn to resolve.");
  }
  const act = spellAct({
    state: casterTurn.state,
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
  return targetTurn.state;
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
  const subject = moonbeamSaveSubject(input.trigger);
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

function moonbeamSaveSubject(
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
    sourceCombatantId: spellCasterId,
    sourceSpellId: spellId(moonbeamUnitId),
    areaId: moonbeamAreaId,
    trigger,
  };
}

function moonbeamCylinderExitSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "moonbeamCylinderExit" }
> {
  return {
    tag: "runtimeCommand",
    actorId: spellTargetId,
    command: "moonbeamCylinderExit",
    sourceCombatantId: spellCasterId,
    sourceSpellId: spellId(moonbeamUnitId),
    areaId: moonbeamAreaId,
  };
}
