import { battleActSpellPresentation } from "./battle-act-composition.ts";
import type { BattleProcedureExecutionRef } from "./index.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-03-INSECT-PLAGUE-AREA-HAZARD insect_plague
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-insect-plague-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import insectPlagueInput from "../../surface/content/insect_plague.json";

import {
  damageRollFillWithGroups,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  insectPlagueAreaFill,
  insectPlagueAreaHazardSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  insectPlagueAreaId,
  insectPlagueUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleObscurementZones,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type BattleSubject,
} from "./unit-profile-admission-test-support.ts";

function castInsectPlague() {
  const spell = insectPlagueSpellRecord();
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 5, count: 1 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
  const act = spellAct({ state, spellId: insectPlagueUnitId, slotLevel: 5 });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [insectPlagueAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(
      `Expected Insect Plague cast to resolve: ${JSON.stringify(cast)}`,
    );
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Insect Plague caster End Turn to resolve.");
  }
  return { spell, state, act, cast: cast.state, targetTurn: targetTurn.state };
}

function insectPlagueSpellRecord(): SpellRecord {
  const unit = decodeUnitRecordSync(insectPlagueInput);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function insectPlagueDifficultTerrainFact(
  sourceProcedureRef: BattleProcedureExecutionRef,
) {
  return {
    kind: "areaDifficultTerrain" as const,
    sources: [
      {
        kind: "insectPlagueHazard" as const,
        sourceCombatantId: spellCasterId,
        sourceProcedureRef,
        areaId: insectPlagueAreaId,
      },
    ],
    totalDistanceFeet: movementFeet(10),
    difficultTerrainDistanceFeet: movementFeet(5),
  };
}

function resolveInsectPlagueSave(input: {
  readonly state: ReturnType<typeof castInsectPlague>["cast"];
  readonly succeeded: boolean;
}) {
  const saveAct = insectPlagueAreaHazardSaveAct(
    input.state,
    spellTargetId,
    "appearsInArea",
  );
  const saveHole = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const pendingDamage = resolveBattleSubject({
    state: input.state,
    subject: saveAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(
        saveHole,
        spellTargetId,
        input.succeeded,
      ),
    ],
  });
  if (pendingDamage.tag === "invalid") {
    throw new Error(
      `Expected Insect Plague save to request damage: ${JSON.stringify(pendingDamage)}`,
    );
  }
  expect(pendingDamage).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "rolledDice" })],
  });
  const damageHole = requireResultHole(pendingDamage, "rolledDice");
  return resolveBattleSubject({
    state: input.state,
    subject: saveAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(
        saveHole,
        spellTargetId,
        input.succeeded,
      ),
      damageRollFillWithGroups(damageHole, [[5, 5, 5, 5]]),
    ],
  });
}

describe("L19E deterministic Insect Plague area-hazard admission", () => {
  test("insect plague is admitted as a ten-minute point-origin Sphere hazard", () => {
    const { spell, state, act } = castInsectPlague();

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        insectPlagueUnitId,
        5,
        "insectPlagueAreaHazard",
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Insect Plague area",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation(state, [area])).toEqual(
      expect.objectContaining({
        procedure: "insectPlagueAreaHazard",
        spell,
        resource: { tag: "spellSlot", slotLevel: 5 },
        ability: "con",
        targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
        durationTicks: elapsedTimeTicks(100),
        rangeFeet: movementFeet(300),
        damage: {
          expr: { dice: 4, dieSize: 10 },
          damageType: "piercing",
        },
      }),
    );
  });

  test("cast records the active hazard and projects Lightly Obscured and Difficult Terrain facts", () => {
    const { act, cast, targetTurn } = castInsectPlague();

    expect(requireCombatant(cast, spellCasterId)).toMatchObject({
      concentration: {
        sourceProcedureRef: act.subject.procedureRef,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "insectPlagueAreaHazard",
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          areaId: insectPlagueAreaId,
          radiusFeet: movementFeet(20),
          save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
          damage: { expr: { dice: 4, dieSize: 10 }, damageType: "piercing" },
          savedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(100),
          },
        }),
      ],
    });
    expect(battleObscurementZones(cast)).toEqual([
      expect.objectContaining({
        kind: "spellObscurementZone",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        obscurement: "lightlyObscured",
        area: {
          kind: "pointOriginSphere",
          areaId: insectPlagueAreaId,
          radiusFeet: movementFeet(20),
        },
      }),
    ]);

    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "move",
    };
    const moveRequest = resolveBattleSubject({
      state: targetTurn,
      subject: moveSubject,
      fills: [],
    });
    if (moveRequest.tag === "invalid") {
      throw new Error(
        `Expected Insect Plague movement to request a movement fill: ${JSON.stringify(moveRequest)}`,
      );
    }
    const moveHole = requireResultHole(moveRequest, "movement");
    const moved = resolveBattleSubject({
      state: targetTurn,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: insectPlagueDifficultTerrainFact(
            act.subject.procedureRef,
          ),
        }),
      ],
    });
    expect(moved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({
              spentFeet: movementFeet(15),
            }),
          }),
        ]),
      },
    });
  });

  test("appearance save applies full or half Piercing damage through the active hazard", () => {
    const { cast } = castInsectPlague();
    const failed = resolveInsectPlagueSave({ state: cast, succeeded: false });
    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(0) }),
        ]),
      },
    });

    const { cast: secondCast } = castInsectPlague();
    const succeeded = resolveInsectPlagueSave({
      state: secondCast,
      succeeded: true,
    });
    expect(succeeded).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(10) }),
        ]),
      },
    });
  });

  test("entry and end-turn saves share the once-per-turn hazard ledger", () => {
    const { targetTurn } = castInsectPlague();
    const entryAct = insectPlagueAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const saveHole = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    const pendingDamage = resolveBattleSubject({
      state: targetTurn,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, true),
      ],
    });
    if (pendingDamage.tag === "invalid") {
      throw new Error(
        `Expected Insect Plague entry save to request damage: ${JSON.stringify(pendingDamage)}`,
      );
    }
    const damageHole = requireResultHole(pendingDamage, "rolledDice");
    const entrySaved = resolveBattleSubject({
      state: targetTurn,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, true),
        damageRollFillWithGroups(damageHole, [[1, 1, 1, 1]]),
      ],
    });
    if (entrySaved.tag !== "resolved") {
      throw new Error("Expected Insect Plague entry save to resolve.");
    }

    expect(
      insectPlagueAreaHazardSaveAct(
        entrySaved.state,
        spellTargetId,
        "endsTurnInArea",
      ).subject,
    ).toEqual(
      expect.objectContaining({ command: "insectPlagueAreaHazardSave" }),
    );
    expect(
      resolveBattleSubject({
        state: entrySaved.state,
        subject: insectPlagueAreaHazardSaveAct(
          entrySaved.state,
          spellTargetId,
          "endsTurnInArea",
        ).subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Insect Plague save was already resolved for this target this turn.",
    });

    const nextTurn = endTurn({
      state: entrySaved.state,
      actorId: spellTargetId,
    });
    expect(nextTurn.tag).toBe("resolved");
  });
});
