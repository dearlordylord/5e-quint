import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import type {
  BattleProcedureExecutionRef,
  BattleRuntimeSession,
} from "./index.ts";
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
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  insectPlagueAreaFill,
  insectPlagueAreaHazardSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  insectPlagueAreaId,
  insectPlagueUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  battleObscurementZones,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type BattleSubject,
} from "./unit-profile-admission.test-support.ts";

function castInsectPlague() {
  const spell = insectPlagueSpellRecord();
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 5, count: 1 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
  const act = spellAct({
    session,
    spellId: insectPlagueUnitId,
    slotLevel: 5,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
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
  return {
    spell,
    session,
    state: session.state,
    act,
    cast: cast.state,
    targetTurn: targetTurn.state,
  };
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
  readonly session: BattleRuntimeSession;
  readonly succeeded: boolean;
}) {
  const saveAct = insectPlagueAreaHazardSaveAct(
    input.session,
    spellTargetId,
    "appearsInArea",
  );
  const saveHole = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const pendingDamage = resolveBattleSubject({
    state: input.session.state,
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
    state: input.session.state,
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
    const { session, act } = castInsectPlague();

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "spellAreaChoice" })],
    });

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
        label: "Spell area",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation(session, [area])).toEqual(
      expect.objectContaining({
        procedure: "insectPlagueAreaHazard",
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

  test("cast projects its obscured difficult-terrain hazard and rejects replay after slot spend", () => {
    const { act, cast, session, targetTurn } = castInsectPlague();

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
    expect(
      resolveBattleSubject({
        state: {
          ...cast,
          currentTurnResources: session.state.currentTurnResources,
        },
        subject: act.subject,
        fills: [
          insectPlagueAreaFill(
            requireHole(act.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Action-time spell act no longer has its required runtime spell resource.",
    });

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
    const first = castInsectPlague();
    const failed = resolveInsectPlagueSave({
      session: battleRuntimeSessionForTest({
        state: first.cast,
        context: first.session.context,
      }),
      succeeded: false,
    });
    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(0) }),
        ]),
      },
    });

    const second = castInsectPlague();
    const succeeded = resolveInsectPlagueSave({
      session: battleRuntimeSessionForTest({
        state: second.cast,
        context: second.session.context,
      }),
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
    const { session, targetTurn } = castInsectPlague();
    const targetTurnSession = battleRuntimeSessionForTest({
      state: targetTurn,
      context: session.context,
    });
    const entryAct = insectPlagueAreaHazardSaveAct(
      targetTurnSession,
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
        battleRuntimeSessionForTest({
          state: entrySaved.state,
          context: session.context,
        }),
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
          battleRuntimeSessionForTest({
            state: entrySaved.state,
            context: session.context,
          }),
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

  test("rejects a previously discovered save after concentration removes the hazard", () => {
    const { session, cast } = castInsectPlague();
    const saveAct = insectPlagueAreaHazardSaveAct(
      battleRuntimeSessionForTest({ state: cast, context: session.context }),
      spellTargetId,
      "appearsInArea",
    );
    const ended = resolveBattleSubject({
      state: cast,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endConcentration",
      },
      fills: [],
    });
    if (ended.tag !== "resolved") {
      throw new Error("Expected Insect Plague concentration to end.");
    }

    expect(
      resolveBattleSubject({
        state: ended.state,
        subject: saveAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Insect Plague save is no longer available.",
    });
  });
});
