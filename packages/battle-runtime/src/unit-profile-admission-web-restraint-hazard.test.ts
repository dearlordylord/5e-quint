import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleActiveEffectExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-WEB-TERRAIN-OBSCUREMENT-FIRE web
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-web-restraint-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
import { describe, expect, test } from "vitest";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
  abilityCheckFill,
  movementFill,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  webAreaFill,
  webAreaRemovedAct,
  webRestrainedNoLongerInAreaAct,
  webRestraintSaveAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { type CombatantId } from "./identity.ts";
import {
  battleObscurementZones,
  battlePerceptionRollModeForObscurement,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type { BattleSubject } from "./unit-profile-admission.test-support.ts";
import {
  ensnaringStrikeHelperId,
  spellCasterId,
  spellTargetId,
  webAreaId,
  webUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { discoverBattleActs, snapshotBattle } from "./index.ts";

function castWeb(
  input: { readonly extraTargetIds?: readonly CombatantId[] } = {},
) {
  const spell = spellRecord(webUnitId);
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    ...(input.extraTargetIds === undefined
      ? {}
      : { extraTargetIds: input.extraTargetIds }),
  });
  const act = spellAct({ session, spellId: webUnitId, slotLevel: 2 });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [webAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Web cast to resolve.");
  }
  const castSession = battleRuntimeSessionForTest({
    ...session,
    state: cast.state,
  });
  const targetTurn = endTurn({
    state: castSession.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Web caster End Turn to resolve.");
  }
  return {
    spell,
    cast: castSession,
    targetTurn: battleRuntimeSessionForTest({
      ...castSession,
      state: targetTurn.state,
    }),
  };
}

function failedWebEntrySession() {
  const { targetTurn } = castWeb();
  const entryAct = webRestraintSaveAct(targetTurn, spellTargetId, "entersArea");
  const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
  const failed = resolveBattleSubject({
    state: targetTurn.state,
    subject: entryAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, false),
    ],
  });
  if (failed.tag !== "resolved") {
    throw new Error("Expected Web entry save to resolve.");
  }
  return battleRuntimeSessionForTest({ ...targetTurn, state: failed.state });
}

describe("L12G deterministic Web restraint-hazard admission", () => {
  test("web is admitted as a one-hour point-origin Cube restraint hazard", () => {
    const spell = spellRecord(webUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const secondLevelAct = spellAct({
      session,
      spellId: webUnitId,
      slotLevel: 2,
    });
    const thirdLevelAct = spellAct({
      session,
      spellId: webUnitId,
      slotLevel: 3,
    });

    expect({
      ...secondLevelAct.subject,
      invocation: battleActSpellPresentation(secondLevelAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(webUnitId, 2, "webRestraintHazard"),
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(secondLevelAct.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Spell area",
        area: { kind: "pointOriginCube", sideFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation(session, [area])).toEqual(
      expect.objectContaining({
        procedure: "webRestraintHazard",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: { kind: "pointOriginCube", sideFeet: movementFeet(20) },
        durationTicks: elapsedTimeTicks(600),
        rangeFeet: movementFeet(60),
      }),
    );
    expect(spellHoleInvocation(session, thirdLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "webRestraintHazard",
        resource: { tag: "spellSlot", slotLevel: 3 },
      }),
    );
  });

  test("cast records the source-owned web area effect and concentration", () => {
    const { cast } = castWeb();

    expect(requireCombatant(cast.state, spellCasterId)).toMatchObject({
      concentration: {
        sourceProcedureRef: expect.any(String),
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "webRestraintHazard",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: spellCasterId,
          areaId: webAreaId,
          sideFeet: movementFeet(20),
          save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
          entrySavedThisTurn: [],
          startTurnSavedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(600),
          },
        }),
      ],
    });
  });

  test("active Web area projects Difficult Terrain movement cost and Lightly Obscured sight", () => {
    const { targetTurn } = castWeb();
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "move",
    };
    const moveHole = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const activeWeb = requireCombatant(
      targetTurn.state,
      spellCasterId,
    ).activeEffects.find((effect) => effect.kind === "webRestraintHazard");
    if (activeWeb === undefined) {
      throw new Error("Expected active Web hazard.");
    }
    const webDifficultTerrain = {
      kind: "areaDifficultTerrain" as const,
      sources: [
        {
          kind: "webAreaHazard" as const,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: activeWeb.sourceProcedureRef,
          areaId: webAreaId,
        },
      ],
      totalDistanceFeet: movementFeet(10),
      difficultTerrainDistanceFeet: movementFeet(5),
    };

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: moveSubject,
        fills: [
          movementFill(moveHole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain: webDifficultTerrain,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain.",
    });

    const moved = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: webDifficultTerrain,
        }),
      ],
    });
    if (moved.tag !== "resolved") {
      throw new Error("Expected Web Difficult Terrain movement to resolve.");
    }

    expect(requireCombatant(moved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
    expect(battleObscurementZones(targetTurn.state)).toEqual([
      expect.objectContaining({
        kind: "spellObscurementZone",
        sourceProcedureRef: activeWeb.sourceProcedureRef,
        sourceCombatantId: spellCasterId,
        obscurement: "lightlyObscured",
        area: {
          kind: "pointOriginCube",
          areaId: webAreaId,
          sideFeet: movementFeet(20),
        },
      }),
    ]);
    expect(battlePerceptionRollModeForObscurement("lightlyObscured")).toBe(
      "disadvantage",
    );
  });

  test("entry save failure restrains and records first-entry resolution for the turn", () => {
    const failed = failedWebEntrySession();

    expect(requireCombatant(failed.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: spellCasterId,
          condition: "restrained",
          escape: {
            kind: "abilityCheck",
            ability: "str",
            skill: "athletics",
            allowedActor: "target",
            successEnds: "condition",
          },
        }),
      ],
    });
    expect(requireCombatant(failed.state, spellCasterId).activeEffects).toEqual(
      [
        expect.objectContaining({
          kind: "webRestraintHazard",
          entrySavedThisTurn: [spellTargetId],
          startTurnSavedThisTurn: [],
        }),
      ],
    );
    expect(
      discoverBattleActs(failed).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "webRestraintSave" &&
          act.subject.trigger === "entersArea",
      ),
    ).toBe(false);
  });

  test("save resolution rejects a wrong hole and a repeated entry save", () => {
    const { targetTurn } = castWeb();
    const entryAct = webRestraintSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const startTurnAct = webRestraintSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: snapshotBattle(targetTurn.state),
      subject: entryAct.subject,
      holes: entryAct.initialHoles,
    });
    const wrongHole = requireHole(
      startTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: entryAct.subject,
        fills: [
          singleTargetSavingThrowOutcomeFill(wrongHole, spellTargetId, false),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(requireCombatant(targetTurn.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
      activeEffects: [],
    });
    const entryHole = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    const entryFill = singleTargetSavingThrowOutcomeFill(
      entryHole,
      spellTargetId,
      false,
    );
    const firstEntrySave = resolveBattleSubject({
      state: targetTurn.state,
      subject: entryAct.subject,
      fills: [entryFill],
    });
    if (firstEntrySave.tag !== "resolved") {
      throw new Error("Expected first Web entry save to resolve.");
    }
    expect(
      resolveBattleSubject({
        state: firstEntrySave.state,
        subject: entryAct.subject,
        fills: [entryFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Web Restraint save was already resolved for this target this turn.",
    });
  });

  test("start-turn failure restrains and Strength (Athletics) escape removes only the condition", () => {
    const { targetTurn } = castWeb();
    const startTurnAct = webRestraintSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    const startTurnSave = requireHole(
      startTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const restrained = resolveBattleSubject({
      state: targetTurn.state,
      subject: startTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(startTurnSave, spellTargetId, false),
      ],
    });
    if (restrained.tag !== "resolved") {
      throw new Error("Expected Web start-turn save to resolve.");
    }
    const restrainedSession = battleRuntimeSessionForTest({
      ...targetTurn,
      state: restrained.state,
    });
    expect(
      requireCombatant(restrained.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "webRestraintHazard",
        entrySavedThisTurn: [],
        startTurnSavedThisTurn: [spellTargetId],
      }),
    ]);
    expect(
      discoverBattleActs(restrainedSession).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "webRestraintSave" &&
          act.subject.trigger === "startsTurnInArea",
      ),
    ).toBe(false);

    const escapeAct = discoverBattleActs(restrainedSession).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint" &&
        act.subject.targetId === spellTargetId,
    );
    if (
      escapeAct?.subject.tag !== "action" ||
      escapeAct.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected Web escape action.");
    }
    expect(escapeAct.routeEvents).toBeUndefined();
    const escaped = resolveBattleSubject({
      state: restrained.state,
      subject: escapeAct.subject,
      fills: [
        abilityCheckFill(
          requireHole(escapeAct.initialHoles, "abilityCheck"),
          13,
        ),
      ],
    });
    if (escaped.tag !== "resolved") {
      throw new Error("Expected Web escape to resolve.");
    }
    expect(requireCombatant(escaped.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(requireCombatant(escaped.state, spellCasterId)).toMatchObject({
      concentration: {
        sourceProcedureRef: expect.any(String),
        effectKind: "spellEffect",
      },
      activeEffects: [expect.objectContaining({ kind: "webRestraintHazard" })],
    });
  });

  test("Web restraint escape is self-only and rejects helper escape subjects", () => {
    const { targetTurn } = castWeb({
      extraTargetIds: [ensnaringStrikeHelperId],
    });
    const startTurnAct = webRestraintSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    const startTurnSave = requireHole(
      startTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const restrained = resolveBattleSubject({
      state: targetTurn.state,
      subject: startTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(startTurnSave, spellTargetId, false),
      ],
    });
    if (restrained.tag !== "resolved") {
      throw new Error("Expected Web start-turn save to resolve.");
    }
    const restrainedSession = battleRuntimeSessionForTest({
      ...targetTurn,
      state: restrained.state,
    });
    const helperTurn = endTurn({
      state: restrainedSession.state,
      actorId: spellTargetId,
    });
    if (helperTurn.tag !== "resolved") {
      throw new Error("Expected Web helper turn to start.");
    }
    const helperTurnSession = battleRuntimeSessionForTest({
      ...restrainedSession,
      state: helperTurn.state,
    });

    expect(
      discoverBattleActs(helperTurnSession).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "escapeSpellRestraint" &&
          act.subject.actorId === ensnaringStrikeHelperId &&
          act.subject.targetId === spellTargetId,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: helperTurn.state,
        subject: {
          tag: "action",
          actorId: ensnaringStrikeHelperId,
          action: "escapeSpellRestraint",
          targetId: spellTargetId,
          effectRef: battleActiveEffectExecutionRefForTest(
            "stale-web-restraint",
          ),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("table cleanup removes restrained condition and area removal ends the spell", () => {
    const noLongerInWebsSession = failedWebEntrySession();
    const noLongerInWebsAct = webRestrainedNoLongerInAreaAct(
      noLongerInWebsSession,
      spellTargetId,
    );
    const noLongerRestrained = resolveBattleSubject({
      state: noLongerInWebsSession.state,
      subject: noLongerInWebsAct.subject,
      fills: [],
    });
    if (noLongerRestrained.tag !== "resolved") {
      throw new Error("Expected Web no-longer-in-area cleanup to resolve.");
    }
    expect(
      requireCombatant(noLongerRestrained.state, spellTargetId),
    ).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      requireCombatant(noLongerRestrained.state, spellCasterId).activeEffects,
    ).toEqual([expect.objectContaining({ kind: "webRestraintHazard" })]);
    expect(
      resolveBattleSubject({
        state: noLongerRestrained.state,
        subject: noLongerInWebsAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Web Restraint cleanup is no longer available.",
    });

    const areaRemovalSession = failedWebEntrySession();
    const areaRemovedAct = webAreaRemovedAct(areaRemovalSession);
    const removed = resolveBattleSubject({
      state: areaRemovalSession.state,
      subject: areaRemovedAct.subject,
      fills: [],
    });
    if (removed.tag !== "resolved") {
      throw new Error("Expected Web area removal to resolve.");
    }
    expect(requireCombatant(removed.state, spellCasterId)).toMatchObject({
      concentration: null,
      activeEffects: [],
    });
    expect(requireCombatant(removed.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      resolveBattleSubject({
        state: removed.state,
        subject: areaRemovedAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Web area is no longer active.",
    });
  });

  test("duration expiration removes the Web area and Web-owned restraint", () => {
    const restrained = failedWebEntrySession();
    const caster = requireCombatant(restrained.state, spellCasterId);
    const nearlyExpiredCombatants = new Map(restrained.state.combatants).set(
      spellCasterId,
      {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "webRestraintHazard" &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      },
    );
    const expiredCombatants = tickDurationEffects(
      nearlyExpiredCombatants,
    ).value;

    expect(expiredCombatants.get(spellCasterId)).toMatchObject({
      concentration: null,
      activeEffects: [],
    });
    expect(expiredCombatants.get(spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
      activeEffects: [],
    });
  });
});
