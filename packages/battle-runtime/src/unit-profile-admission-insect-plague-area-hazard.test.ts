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
import { requireResolved } from "./battle-runtime.test-support.ts";
import { allocateBattleEffectExecutionRefForCreature } from "./effect-execution-ref.ts";
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
import type { BattleInsectPlagueAreaHazardTrigger } from "./battle-state-execution.ts";
import { resolveInsectPlagueAreaSaveDamage } from "./battle-reducer/persistent-area-save-damage.ts";

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
  readonly trigger: BattleInsectPlagueAreaHazardTrigger;
}) {
  const saveAct = insectPlagueAreaHazardSaveAct(
    input.session,
    spellTargetId,
    input.trigger,
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

function insectPlagueSavedThisTurn(
  state: ReturnType<typeof castInsectPlague>["cast"],
) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "insectPlagueAreaHazard",
  );
  if (effect?.kind !== "insectPlagueAreaHazard") {
    throw new Error("Expected active Insect Plague area hazard.");
  }
  return effect.savedThisTurn;
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
    const failed = requireResolved(
      resolveInsectPlagueSave({
        session: battleRuntimeSessionForTest({
          state: first.cast,
          context: first.session.context,
        }),
        succeeded: false,
        trigger: "appearsInArea",
      }),
    );
    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(0) }),
        ]),
      },
    });
    expect(insectPlagueSavedThisTurn(failed.state)).toEqual([spellTargetId]);

    const second = castInsectPlague();
    const succeeded = resolveInsectPlagueSave({
      session: battleRuntimeSessionForTest({
        state: second.cast,
        context: second.session.context,
      }),
      succeeded: true,
      trigger: "appearsInArea",
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

  test("appearance, entry, and end-turn saves share one per-turn hazard ledger", () => {
    const { cast, session } = castInsectPlague();
    const appearanceSession = battleRuntimeSessionForTest({
      state: cast,
      context: session.context,
    });
    const appearanceAct = insectPlagueAreaHazardSaveAct(
      appearanceSession,
      spellTargetId,
      "appearsInArea",
    );
    expect(insectPlagueSavedThisTurn(cast)).toEqual([]);

    const combatantsWithoutTarget = new Map(cast.combatants);
    combatantsWithoutTarget.delete(spellTargetId);
    const stateWithoutTarget = { ...cast, combatants: combatantsWithoutTarget };
    expect(
      resolveInsectPlagueAreaSaveDamage({
        state: stateWithoutTarget,
        subject: appearanceAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Insect Plague save target is no longer available.",
    });
    expect(insectPlagueSavedThisTurn(stateWithoutTarget)).toEqual([]);

    const saveHole = requireHole(
      appearanceAct.initialHoles,
      "savingThrowOutcome",
    );
    const pendingDamage = resolveBattleSubject({
      state: cast,
      subject: appearanceAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, true),
      ],
    });
    if (pendingDamage.tag === "invalid") {
      throw new Error(
        `Expected Insect Plague appearance save to request damage: ${JSON.stringify(pendingDamage)}`,
      );
    }
    expect(insectPlagueSavedThisTurn(pendingDamage.state)).toEqual([]);

    const appeared = requireResolved(
      resolveInsectPlagueSave({
        session: appearanceSession,
        succeeded: true,
        trigger: "appearsInArea",
      }),
    );
    expect(insectPlagueSavedThisTurn(appeared.state)).toEqual([spellTargetId]);

    const entryAct = insectPlagueAreaHazardSaveAct(
      battleRuntimeSessionForTest({
        state: appeared.state,
        context: session.context,
      }),
      spellTargetId,
      "entersArea",
    );
    const duplicate = resolveInsectPlagueAreaSaveDamage({
      state: appeared.state,
      subject: entryAct.subject,
      fills: [],
    });
    expect(duplicate).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Insect Plague save was already resolved for this target this turn.",
    });
    expect(insectPlagueSavedThisTurn(appeared.state)).toEqual([spellTargetId]);

    const targetTurn = requireResolved(
      endTurn({ state: appeared.state, actorId: spellCasterId }),
    );
    expect(insectPlagueSavedThisTurn(targetTurn.state)).toEqual([]);

    const entrySaved = requireResolved(
      resolveInsectPlagueSave({
        session: battleRuntimeSessionForTest({
          state: targetTurn.state,
          context: session.context,
        }),
        succeeded: true,
        trigger: "entersArea",
      }),
    );
    expect(insectPlagueSavedThisTurn(entrySaved.state)).toEqual([
      spellTargetId,
    ]);

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
  });

  test("rejects a freshly fabricated appearance after the cast occurrence", () => {
    const { cast, session } = castInsectPlague();
    const appeared = requireResolved(
      resolveInsectPlagueSave({
        session: battleRuntimeSessionForTest({
          state: cast,
          context: session.context,
        }),
        succeeded: true,
        trigger: "appearsInArea",
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: appeared.state, actorId: spellCasterId }),
    );
    const fabricatedAppearance = insectPlagueAreaHazardSaveAct(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      spellTargetId,
      "appearsInArea",
    );

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: fabricatedAppearance.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Insect Plague appearance save is outside its cast occurrence.",
    });
    expect(insectPlagueSavedThisTurn(targetTurn.state)).toEqual([]);
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

  test("binds a discovered save to the exact Insect Plague occurrence across same-area replacement", () => {
    const { session, cast } = castInsectPlague();
    const saveAct = insectPlagueAreaHazardSaveAct(
      battleRuntimeSessionForTest({ state: cast, context: session.context }),
      spellTargetId,
      "appearsInArea",
    );
    const caster = requireCombatant(cast, spellCasterId);
    const effect = caster.activeEffects.find(
      (candidate) => candidate.kind === "insectPlagueAreaHazard",
    );
    if (effect?.kind !== "insectPlagueAreaHazard") {
      throw new Error("Expected active Insect Plague.");
    }
    const allocation = allocateBattleEffectExecutionRefForCreature({
      owner: caster,
    });
    const replacement = {
      ...effect,
      effectRef: allocation.effectRef,
      savedThisTurn: [],
    };
    const replacedState = {
      ...cast,
      combatants: new Map(cast.combatants).set(spellCasterId, {
        ...allocation.owner,
        activeEffects: allocation.owner.activeEffects.map((candidate) =>
          candidate === effect ? replacement : candidate,
        ),
      }),
    };

    expect(
      resolveBattleSubject({
        state: replacedState,
        subject: saveAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("rejects a save when one owner contains duplicate effect occurrence references", () => {
    const { session, cast } = castInsectPlague();
    const saveAct = insectPlagueAreaHazardSaveAct(
      battleRuntimeSessionForTest({ state: cast, context: session.context }),
      spellTargetId,
      "appearsInArea",
    );
    const caster = requireCombatant(cast, spellCasterId);
    const effect = caster.activeEffects.find(
      (candidate) => candidate.kind === "insectPlagueAreaHazard",
    );
    if (effect?.kind !== "insectPlagueAreaHazard") {
      throw new Error("Expected active Insect Plague.");
    }
    const stateWithDuplicateRef = {
      ...cast,
      combatants: new Map(cast.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: [...caster.activeEffects, { ...effect }],
      }),
    };

    expect(
      resolveBattleSubject({
        state: stateWithDuplicateRef,
        subject: saveAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("rejects a save when a different effect kind collides with its occurrence reference", () => {
    const { session, cast } = castInsectPlague();
    const saveAct = insectPlagueAreaHazardSaveAct(
      battleRuntimeSessionForTest({ state: cast, context: session.context }),
      spellTargetId,
      "appearsInArea",
    );
    const caster = requireCombatant(cast, spellCasterId);
    const effect = caster.activeEffects.find(
      (candidate) => candidate.kind === "insectPlagueAreaHazard",
    );
    if (effect?.kind !== "insectPlagueAreaHazard") {
      throw new Error("Expected active Insect Plague.");
    }
    const collidingUnrelatedEffect = {
      kind: "spellDashBonusAction" as const,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      expiresAt: effect.expiresAt,
    };
    const stateWithCrossKindCollision = {
      ...cast,
      combatants: new Map(cast.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: [...caster.activeEffects, collidingUnrelatedEffect],
      }),
    };

    const result = resolveBattleSubject({
      state: stateWithCrossKindCollision,
      subject: saveAct.subject,
      fills: [],
    });
    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      stateWithCrossKindCollision.combatants
        .get(spellCasterId)
        ?.activeEffects.includes(collidingUnrelatedEffect),
    ).toBe(true);
  });
});
