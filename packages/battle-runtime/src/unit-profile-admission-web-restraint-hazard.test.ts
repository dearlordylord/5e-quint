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
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  webAreaFill,
  webAreaRemovedAct,
  webRestrainedNoLongerInAreaAct,
  webRestraintSaveAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellId, type CombatantId } from "./identity.ts";
import {
  battleObscurementZones,
  battlePerceptionRollModeForObscurement,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type { BattleSubject } from "./unit-profile-admission-test-support.ts";
import {
  ensnaringStrikeHelperId,
  spellCasterId,
  spellTargetId,
  webAreaId,
  webUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import { discoverBattleActs } from "./index.ts";

function castWeb(
  input: { readonly extraTargetIds?: readonly CombatantId[] } = {},
) {
  const spell = spellRecord(webUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    ...(input.extraTargetIds === undefined
      ? {}
      : { extraTargetIds: input.extraTargetIds }),
  });
  const act = spellAct({ state, spellId: webUnitId, slotLevel: 2 });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [webAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Web cast to resolve.");
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Web caster End Turn to resolve.");
  }
  return { spell, cast: cast.state, targetTurn: targetTurn.state };
}

function failedWebEntryState() {
  const { targetTurn } = castWeb();
  const entryAct = webRestraintSaveAct(targetTurn, spellTargetId, "entersArea");
  const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
  const failed = resolveBattleSubject({
    state: targetTurn,
    subject: entryAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, false),
    ],
  });
  if (failed.tag !== "resolved") {
    throw new Error("Expected Web entry save to resolve.");
  }
  return failed.state;
}

describe("L12G deterministic Web restraint-hazard admission", () => {
  test("web is admitted as a one-hour point-origin Cube restraint hazard", () => {
    const spell = spellRecord(webUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const secondLevelAct = spellAct({
      state,
      spellId: webUnitId,
      slotLevel: 2,
    });
    const thirdLevelAct = spellAct({
      state,
      spellId: webUnitId,
      slotLevel: 3,
    });

    expect(secondLevelAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(webUnitId, 2, "webRestraintHazard"),
      mode: { tag: "cast" },
    });
    const area = requireHole(secondLevelAct.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Web area",
        area: { kind: "pointOriginCube", sideFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation([area])).toEqual(
      expect.objectContaining({
        procedure: "webRestraintHazard",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: { kind: "pointOriginCube", sideFeet: movementFeet(20) },
        durationTicks: elapsedTimeTicks(600),
        rangeFeet: movementFeet(60),
      }),
    );
    expect(spellHoleInvocation(thirdLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "webRestraintHazard",
        resource: { tag: "spellSlot", slotLevel: 3 },
      }),
    );
  });

  test("cast records the source-owned web area effect and concentration", () => {
    const { cast } = castWeb();

    expect(requireCombatant(cast, spellCasterId)).toMatchObject({
      concentration: { sourceSpellId: webUnitId, effectKind: "spellEffect" },
      activeEffects: [
        expect.objectContaining({
          kind: "webRestraintHazard",
          sourceSpellId: webUnitId,
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
    const { spell, targetTurn } = castWeb();
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
    const webDifficultTerrain = {
      kind: "areaDifficultTerrain" as const,
      sources: [
        {
          kind: "webAreaHazard" as const,
          sourceCombatantId: spellCasterId,
          sourceSpellId: spell.id,
          areaId: webAreaId,
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
      state: targetTurn,
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
    expect(battleObscurementZones(targetTurn)).toEqual([
      expect.objectContaining({
        kind: "spellObscurementZone",
        sourceSpellId: spell.id,
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
    const failed = failedWebEntryState();

    expect(requireCombatant(failed, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          sourceSpellId: webUnitId,
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
    expect(requireCombatant(failed, spellCasterId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "webRestraintHazard",
        entrySavedThisTurn: [spellTargetId],
        startTurnSavedThisTurn: [],
      }),
    ]);
    expect(
      discoverBattleActs(failed).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "webRestraintSave" &&
          act.subject.trigger === "entersArea",
      ),
    ).toBe(false);
  });

  test("save resolution rejects a fill from another Web trigger hole", () => {
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
      conditions: expect.objectContaining({ restrained: false }),
      activeEffects: [],
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
      state: targetTurn,
      subject: startTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(startTurnSave, spellTargetId, false),
      ],
    });
    if (restrained.tag !== "resolved") {
      throw new Error("Expected Web start-turn save to resolve.");
    }
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
      discoverBattleActs(restrained.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "webRestraintSave" &&
          act.subject.trigger === "startsTurnInArea",
      ),
    ).toBe(false);

    const escapeAct = discoverBattleActs(restrained.state).find(
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
      concentration: { sourceSpellId: webUnitId, effectKind: "spellEffect" },
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
      state: targetTurn,
      subject: startTurnAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(startTurnSave, spellTargetId, false),
      ],
    });
    if (restrained.tag !== "resolved") {
      throw new Error("Expected Web start-turn save to resolve.");
    }
    const helperTurn = endTurn({
      state: restrained.state,
      actorId: spellTargetId,
    });
    if (helperTurn.tag !== "resolved") {
      throw new Error("Expected Web helper turn to start.");
    }

    expect(
      discoverBattleActs(helperTurn.state).some(
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
          sourceSpellId: spellId(webUnitId),
          sourceCombatantId: spellCasterId,
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("table cleanup removes restrained condition and area removal ends the spell", () => {
    const noLongerInWebsState = failedWebEntryState();
    const noLongerInWebsAct = webRestrainedNoLongerInAreaAct(
      noLongerInWebsState,
      spellTargetId,
    );
    const noLongerRestrained = resolveBattleSubject({
      state: noLongerInWebsState,
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

    const areaRemovalState = failedWebEntryState();
    const removed = resolveBattleSubject({
      state: areaRemovalState,
      subject: webAreaRemovedAct(areaRemovalState).subject,
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
  });

  test("duration expiration removes the Web area and Web-owned restraint", () => {
    const restrained = failedWebEntryState();
    const caster = requireCombatant(restrained, spellCasterId);
    const nearlyExpiredCombatants = new Map(restrained.combatants).set(
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
    const expiredCombatants = tickDurationEffects(nearlyExpiredCombatants);

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
