// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME moonbeam
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-moonbeam-movable-zone
import { describe, expect, test } from "vitest";
import {
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
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import {
  moonbeamAreaId,
  moonbeamUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";

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
});
