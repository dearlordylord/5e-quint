// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-MISSING-FLAMING-SPHERE flaming_sphere
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-flaming-sphere-hazard-ram
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
import { describe, expect, test } from "vitest";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  flamingSphereAreaFill,
  flamingSphereEndTurnAct,
  flamingSphereRamAct,
  flamingSphereRamMovementFill,
  flamingSphereRepositionAct,
  flamingSphereRepositionMovementFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  sameBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import {
  flamingSphereAreaId,
  flamingSphereUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import type { BattleFill } from "./index.ts";

describe("L12G deterministic Flaming Sphere admission", () => {
  test("flaming sphere is admitted as a movable fire Sphere hazard", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const secondLevelAct = spellAct({
      state,
      spellId: flamingSphereUnitId,
      slotLevel: 2,
    });
    const thirdLevelAct = spellAct({
      state,
      spellId: flamingSphereUnitId,
      slotLevel: 3,
    });

    expect(secondLevelAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(flamingSphereUnitId, 2, "flamingSphere"),
      mode: { tag: "cast" },
    });
    const area = requireHole(secondLevelAct.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Flaming Sphere area",
        area: {
          kind: "pointOriginSphereDiameter",
          diameterFeet: movementFeet(5),
        },
      }),
    );
    expect(spellHoleInvocation([area])).toEqual(
      expect.objectContaining({
        procedure: "flamingSphere",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginSphereDiameter",
          diameterFeet: movementFeet(5),
        },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: movementFeet(60),
        ramMaxMoveFeet: movementFeet(30),
        damage: { expr: { dice: 2, dieSize: 6 }, damageType: "fire" },
      }),
    );
    expect(spellHoleInvocation(thirdLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "flamingSphere",
        damage: { expr: { dice: 3, dieSize: 6 }, damageType: "fire" },
      }),
    );
  });

  test("cast records the source-owned sphere hazard", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "flamingSphere",
        sourceSpellId: flamingSphereUnitId,
        sourceCombatantId: spellCasterId,
        areaId: flamingSphereAreaId,
        save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
        damage: { expr: { dice: 2, dieSize: 6 }, damageType: "fire" },
        ramMaxMoveFeet: movementFeet(30),
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
  });

  test("end-within-5-feet save applies failed-save fire damage before ending the turn", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }

    const endWithinFiveFeet = flamingSphereEndTurnAct(targetTurn.state);
    const save = requireHole(
      endWithinFiveFeet.initialHoles,
      "savingThrowOutcome",
    );
    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: endWithinFiveFeet.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: endWithinFiveFeet.subject,
      fills: [failedSave, damageRollFillWithGroups(damage, [[3, 4]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected Flaming Sphere end-within-5-feet damage to resolve.",
      );
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(13));
  });

  test("end-within-5-feet save rejects duplicate target Concentration fills", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const target = requireCombatant(targetTurn.state, spellTargetId);
    const stateWithConcentratingTarget = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        concentration: {
          sourceSpellId: flamingSphereUnitId,
          effectKind: "spellEffect" as const,
        },
      }),
    };

    const endWithinFiveFeet = flamingSphereEndTurnAct(
      stateWithConcentratingTarget,
    );
    const save = requireHole(
      endWithinFiveFeet.initialHoles,
      "savingThrowOutcome",
    );
    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: stateWithConcentratingTarget,
      subject: endWithinFiveFeet.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[3, 4]]);
    const needsConcentration = resolveBattleSubject({
      state: stateWithConcentratingTarget,
      subject: endWithinFiveFeet.subject,
      fills: [failedSave, damageFill],
    });
    const concentration = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    const succeededConcentration = {
      kind: "concentrationSavingThrow",
      holeId: concentration.holeId,
      value: { succeeded: true },
    } satisfies Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    >;
    const failedConcentration = {
      ...succeededConcentration,
      value: { succeeded: false },
    };

    expect(
      resolveBattleSubject({
        state: stateWithConcentratingTarget,
        subject: endWithinFiveFeet.subject,
        fills: [
          failedSave,
          damageFill,
          succeededConcentration,
          failedConcentration,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Movable zone end-within-5-feet save received duplicate sphere fills.",
    });
  });

  test("reposition spends the caster Bonus Action without save or damage", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }

    const reposition = flamingSphereRepositionAct(cast.state);
    const movement = requireHole(
      reposition.initialHoles,
      "movableZoneRepositionMovement",
    );
    expect(reposition.initialHoles).toEqual([
      expect.objectContaining({
        kind: "movableZoneRepositionMovement",
        movableZone: expect.objectContaining({
          sourceCombatantId: spellCasterId,
          sourceSpellId: flamingSphereUnitId,
          areaId: flamingSphereAreaId,
          maxMoveFeet: movementFeet(30),
        }),
        requiresTableSpatialFact: true,
      }),
    ]);
    const resolved = resolveBattleSubject({
      state: cast.state,
      subject: reposition.subject,
      fills: [flamingSphereRepositionMovementFill(movement)],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellCasterId,
        turn: { bonusActionAvailable: false },
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere reposition to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(20));
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(
      requireCombatant(cast.state, spellCasterId).hp,
    );
  });

  test("ram spends the caster Bonus Action and applies successful-save half damage", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }

    const ram = flamingSphereRamAct(cast.state);
    const movement = requireHole(
      ram.initialHoles,
      "movableZoneRamMovement",
    );
    expect(movement).toEqual(
      expect.objectContaining({
        label: "flaming_sphere ram movement",
        movableZone: expect.objectContaining({
          targetId: spellTargetId,
          sourceCombatantId: spellCasterId,
          sourceSpellId: flamingSphereUnitId,
          areaId: flamingSphereAreaId,
          maxMoveFeet: movementFeet(30),
        }),
        requiresTableSpatialFact: true,
      }),
    );
    const save = requireHole(ram.initialHoles, "savingThrowOutcome");
    const succeededSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      true,
    );
    const needsDamage = resolveBattleSubject({
      state: cast.state,
      subject: ram.subject,
      fills: [flamingSphereRamMovementFill(movement), succeededSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const resolved = resolveBattleSubject({
      state: cast.state,
      subject: ram.subject,
      fills: [
        flamingSphereRamMovementFill(movement),
        succeededSave,
        damageRollFillWithGroups(damage, [[3, 3]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellCasterId,
        turn: { bonusActionAvailable: false },
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere ram to resolve.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(17));
  });

  test("ram discovery includes the caster as a creature-space target", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }

    const selfRam = flamingSphereRamAct(
      cast.state,
      spellCasterId,
      spellCasterId,
    );
    expect(selfRam.subject).toEqual(
      expect.objectContaining({
        actorId: spellCasterId,
        targetId: spellCasterId,
        sourceCombatantId: spellCasterId,
        sourceSpellId: flamingSphereUnitId,
        areaId: flamingSphereAreaId,
      }),
    );
    expect(
      requireHole(selfRam.initialHoles, "movableZoneRamMovement"),
    ).toEqual(
      expect.objectContaining({
        movableZone: expect.objectContaining({ targetId: spellCasterId }),
      }),
    );
    expect(requireHole(selfRam.initialHoles, "savingThrowOutcome")).toEqual(
      expect.objectContaining({
        movableZone: expect.objectContaining({ targetId: spellCasterId }),
      }),
    );
  });

  test("ram rejects missing and over-cap movement witnesses", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }

    const ram = flamingSphereRamAct(cast.state);
    const movement = requireHole(
      ram.initialHoles,
      "movableZoneRamMovement",
    );
    const save = requireHole(ram.initialHoles, "savingThrowOutcome");
    const succeededSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      true,
    );

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [succeededSave],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "movableZoneRamMovement" })],
    });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [flamingSphereRamMovementFill(movement, 31), succeededSave],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable zone ram movement distance exceeds the spell's maximum.",
    });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [flamingSphereRamMovementFill(movement, 0), succeededSave],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable zone ram movement distance must be a positive integer.",
    });
  });

  test("ram rejects stale accepted-kind fills for unrelated holes", () => {
    const spell = spellRecord(flamingSphereUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: flamingSphereUnitId, slotLevel: 2 });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [flamingSphereAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Flaming Sphere cast to resolve.");
    }

    const ram = flamingSphereRamAct(cast.state);
    const movement = requireHole(
      ram.initialHoles,
      "movableZoneRamMovement",
    );
    const movementFill = flamingSphereRamMovementFill(movement);
    const save = requireHole(ram.initialHoles, "savingThrowOutcome");
    const succeededSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      true,
    );
    const staleSave = { ...succeededSave, holeId: area.holeId };
    const staleConcentration = {
      kind: "concentrationSavingThrow",
      holeId: area.holeId,
      value: { succeeded: true },
    } satisfies Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    >;

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [movementFill, succeededSave, staleSave],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable zone ram received a fill for an unrelated hole.",
    });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [movementFill, succeededSave, staleConcentration],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable zone ram received a fill for an unrelated hole.",
    });

    const needsDamage = resolveBattleSubject({
      state: cast.state,
      subject: ram.subject,
      fills: [movementFill, succeededSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[3, 3]]);
    const staleDamage = { ...damageFill, holeId: area.holeId };

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [movementFill, succeededSave, damageFill, staleDamage],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable zone ram received a fill for an unrelated hole.",
    });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: ram.subject,
        fills: [movementFill, succeededSave, damageFill, staleConcentration],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable zone ram received a fill for an unrelated hole.",
    });
  });

  test("subject identity distinguishes sphere triggers and area ids", () => {
    const base = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      sourceCombatantId: spellCasterId,
      sourceSpellId: spellId(flamingSphereUnitId),
      areaId: flamingSphereAreaId,
    };

    expect(
      sameBattleSubject(
        {
          ...base,
          command: "movableZoneSave",
          trigger: "endsTurnWithinFiveFeetOfSphere",
        },
        {
          ...base,
          command: "movableZoneRam",
          actorId: spellCasterId,
          targetId: spellTargetId,
          trigger: "rammedBySphere",
        },
      ),
    ).toBe(false);
    expect(
      sameBattleSubject(
        {
          ...base,
          command: "movableZoneSave",
          trigger: "endsTurnWithinFiveFeetOfSphere",
        },
        {
          ...base,
          command: "movableZoneSave",
          areaId: battleAreaId("second-flaming-sphere-area"),
          trigger: "endsTurnWithinFiveFeetOfSphere",
        },
      ),
    ).toBe(false);
  });
});
