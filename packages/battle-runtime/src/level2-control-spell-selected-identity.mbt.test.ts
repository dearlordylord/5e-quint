import { battleProcedureExecutionRefForTest } from "./battle-runtime-test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  resolveBattleSubject,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime-test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH calm_emotions charm_person darkness enthrall gust_of_wind invisibility levitate see_invisibility spike_growth web
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH calm_emotions doDiscoverCalmEmotionsConditionImmunity
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH charm_person doDiscoverCharmPersonSaveGatedCondition
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH darkness doDiscoverDarknessPointOrigin
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH enthrall doDiscoverEnthrallPerceptionPenalty
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH gust_of_wind doDiscoverGustOfWindLine
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH invisibility doDiscoverInvisibilityDirectCondition
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH levitate doDiscoverLevitateCreature
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH see_invisibility doDiscoverSeeInvisibilityObserverSight
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH spike_growth doDiscoverSpikeGrowthMovementHazard
// UNIT-IDENTITY-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH web doDiscoverWebRestraintHazard
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  battleReducerStartRouteEvent,
  discoverBattleActs,
  endTurn,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleReducerRouteOwnerGroup,
  type BattleReducerRouteSubjectFamily,
  type BattleState,
  type BattleActDiscoverySubject as BattleSubject,
} from "./index.ts";
import {
  calmEmotionsUnitId,
  charmPersonUnitId,
  darknessUnitId,
  enthrallUnitId,
  gustOfWindUnitId,
  invisibilityUnitId,
  levitateUnitId,
  seeInvisibilityUnitId,
  spikeGrowthAreaId,
  spellCasterId,
  spellTargetId,
  spikeGrowthUnitId,
  webUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  movementFill,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spikeGrowthAreaFill,
  webAreaFill,
  webRestraintSaveAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2ControlSpellUnitIds = [
  calmEmotionsUnitId,
  charmPersonUnitId,
  darknessUnitId,
  enthrallUnitId,
  gustOfWindUnitId,
  invisibilityUnitId,
  levitateUnitId,
  seeInvisibilityUnitId,
  spikeGrowthUnitId,
  webUnitId,
] as const;
type Level2ControlSpellUnitId = (typeof level2ControlSpellUnitIds)[number];
type Level2ControlSpellSelectedIdentityResult =
  | "init"
  | "calmEmotionsConditionImmunity"
  | "charmPersonSaveGatedCondition"
  | "darknessPointOrigin"
  | "enthrallPerceptionPenalty"
  | "gustOfWindLine"
  | "invisibilityDirectCondition"
  | "levitateCreature"
  | "seeInvisibilityObserverSight"
  | "spikeGrowthMovementHazard"
  | "webRestraintHazard";
type Level2ControlSpellSelectedIdentityProjection = {
  readonly lastResult: Level2ControlSpellSelectedIdentityResult;
};
type SelectedLevel2ControlSpellInvocation = {
  readonly spellId: Level2ControlSpellUnitId;
  readonly slotLevel: 1 | 2;
  readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
  readonly result: Exclude<Level2ControlSpellSelectedIdentityResult, "init">;
};

const LEVEL2_CONTROL_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  CalmEmotionsConditionImmunity: "calmEmotionsConditionImmunity",
  CharmPersonSaveGatedCondition: "charmPersonSaveGatedCondition",
  DarknessPointOrigin: "darknessPointOrigin",
  EnthrallPerceptionPenalty: "enthrallPerceptionPenalty",
  GustOfWindLine: "gustOfWindLine",
  InvisibilityDirectCondition: "invisibilityDirectCondition",
  LevitateCreature: "levitateCreature",
  SeeInvisibilityObserverSight: "seeInvisibilityObserverSight",
  SpikeGrowthMovementHazard: "spikeGrowthMovementHazard",
  WebRestraintHazard: "webRestraintHazard",
} as const satisfies Readonly<
  Record<string, Level2ControlSpellSelectedIdentityResult>
>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Level 2 control spell selected identity replay",
  taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level2-control-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: LEVEL2_CONTROL_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: { lastResult: "variant" },
  initialProjection: expectedProjection("init"),
  units: [
    {
      unitId: calmEmotionsUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverCalmEmotionsConditionImmunity", {
          spellId: calmEmotionsUnitId,
          slotLevel: 2,
          procedure: "saveGatedConditionImmunity",
          result: "calmEmotionsConditionImmunity",
        }),
      ],
    },
    {
      unitId: charmPersonUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverCharmPersonSaveGatedCondition", {
          spellId: charmPersonUnitId,
          slotLevel: 2,
          procedure: "saveGatedCondition",
          result: "charmPersonSaveGatedCondition",
        }),
      ],
    },
    {
      unitId: darknessUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverDarknessPointOrigin", {
          spellId: darknessUnitId,
          slotLevel: 2,
          procedure: "magicalDarknessPointOrigin",
          result: "darknessPointOrigin",
        }),
      ],
    },
    {
      unitId: enthrallUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverEnthrallPerceptionPenalty", {
          spellId: enthrallUnitId,
          slotLevel: 2,
          procedure: "rollModifier",
          result: "enthrallPerceptionPenalty",
        }),
      ],
    },
    {
      unitId: gustOfWindUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverGustOfWindLine", {
          spellId: gustOfWindUnitId,
          slotLevel: 2,
          procedure: "gustOfWindLine",
          result: "gustOfWindLine",
        }),
      ],
    },
    {
      unitId: invisibilityUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverInvisibilityDirectCondition", {
          spellId: invisibilityUnitId,
          slotLevel: 2,
          procedure: "directCondition",
          result: "invisibilityDirectCondition",
        }),
      ],
    },
    {
      unitId: levitateUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverLevitateCreature", {
          spellId: levitateUnitId,
          slotLevel: 2,
          procedure: "levitatedCreature",
          result: "levitateCreature",
        }),
      ],
    },
    {
      unitId: seeInvisibilityUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverSeeInvisibilityObserverSight", {
          spellId: seeInvisibilityUnitId,
          slotLevel: 2,
          procedure: "seeInvisibleObserverSight",
          result: "seeInvisibilityObserverSight",
        }),
      ],
    },
    {
      unitId: spikeGrowthUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverSpikeGrowthMovementHazard", {
          spellId: spikeGrowthUnitId,
          slotLevel: 2,
          procedure: "spikeGrowthMovementHazard",
          result: "spikeGrowthMovementHazard",
        }),
      ],
    },
    {
      unitId: webUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverWebRestraintHazard", {
          spellId: webUnitId,
          slotLevel: 2,
          procedure: "webRestraintHazard",
          result: "webRestraintHazard",
        }),
      ],
    },
  ],
});

describe("Level 2 control spell public reducer route replay", () => {
  it("observes selected concentration hazard qRoute through public reducer entrypoints", () => {
    expect(replaySpikeGrowthMovementHazardRoute()).toEqual(
      expectedSpikeGrowthMovementHazardRoute(),
    );
    expect(replayWebRestraintHazardRoute()).toEqual(
      expectedWebRestraintHazardRoute(),
    );
  });
});

type RouteDiscoverEvent = Extract<
  BattleReducerRouteEvent,
  { readonly kind: "discoverBattleActs" }
>;
type RouteResolveEvent = Extract<
  BattleReducerRouteEvent,
  { readonly kind: "resolveBattleSubject" }
>;
type RouteHoles = RouteDiscoverEvent["holes"];
type HazardCastReplay = {
  readonly route: readonly BattleReducerRouteEvent[];
  readonly state: BattleState;
};

function replaySpikeGrowthMovementHazardRoute(): readonly BattleReducerRouteEvent[] {
  const cast = spikeGrowthHazardCastReplay();
  const route = [...cast.route];
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Spike Growth caster End Turn to resolve.");
  }
  const move = moveAct(targetTurn.state);
  route.push(...routeEventsOfSubject(move, "Spike Growth movement discovery"));
  const movement = requireHole(move.initialHoles, "movement");
  const needsDamage = resolveBattleSubject({
    state: targetTurn.state,
    subject: move.subject,
    fills: [spikeGrowthMovementFill(movement)],
  });
  route.push(...routeEventsOfSubject(needsDamage, "Spike Growth movement"));
  if (needsDamage.tag !== "needsHoles") {
    throw new Error("Expected Spike Growth movement to request damage.");
  }
  const damage = requireHole(needsDamage.holes, "rolledDice");
  const damaged = resolveBattleSubject({
    state: targetTurn.state,
    subject: move.subject,
    fills: [
      spikeGrowthMovementFill(movement),
      damageRollFillWithGroups(damage, [[3, 4]]),
    ],
  });
  route.push(...routeEventsOfSubject(damaged, "Spike Growth damage"));
  if (damaged.tag !== "resolved") {
    throw new Error("Expected Spike Growth damage to resolve.");
  }
  const casterTurn = endTurn({ state: damaged.state, actorId: spellTargetId });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected target End Turn after Spike Growth damage.");
  }
  route.push(
    ...endConcentrationSpatialRoute(
      casterTurn.state,
      "Spike Growth concentration cleanup",
    ),
  );
  return route;
}

function replayWebRestraintHazardRoute(): readonly BattleReducerRouteEvent[] {
  const cast = webHazardCastReplay();
  const route = [...cast.route];
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Web caster End Turn to resolve.");
  }
  const saveAct = webRestraintSaveAct(
    targetTurn.state,
    spellTargetId,
    "entersArea",
  );
  route.push(...routeEventsOfSubject(saveAct, "Web save discovery"));
  const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const saved = resolveBattleSubject({
    state: targetTurn.state,
    subject: saveAct.subject,
    fills: [singleTargetSavingThrowOutcomeFill(save, spellTargetId, false)],
  });
  route.push(...routeEventsOfSubject(saved, "Web save"));
  if (saved.tag !== "resolved") {
    throw new Error("Expected Web save to resolve.");
  }
  const casterTurn = endTurn({ state: saved.state, actorId: spellTargetId });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected target End Turn after Web save.");
  }
  route.push(
    ...endConcentrationSpatialRoute(
      casterTurn.state,
      "Web concentration cleanup",
    ),
  );
  return route;
}

function spikeGrowthHazardCastReplay(): HazardCastReplay {
  const route: BattleReducerRouteEvent[] = [startRoute()];
  const state = selectedSpellBattle(spellRecord(spikeGrowthUnitId), 2);
  const act = spellAct({ state, spellId: spikeGrowthUnitId, slotLevel: 2 });
  route.push(...routeEventsOfSubject(act, "Spike Growth discovery"));
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [spikeGrowthAreaFill(area)],
  });
  route.push(...routeEventsOfSubject(cast, "Spike Growth cast"));
  if (cast.tag !== "resolved") {
    throw new Error("Expected Spike Growth cast to resolve.");
  }
  return { route, state: cast.state };
}

function webHazardCastReplay(): HazardCastReplay {
  const route: BattleReducerRouteEvent[] = [startRoute()];
  const state = selectedSpellBattle(spellRecord(webUnitId), 2);
  const act = spellAct({ state, spellId: webUnitId, slotLevel: 2 });
  route.push(...routeEventsOfSubject(act, "Web discovery"));
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [webAreaFill(area)],
  });
  route.push(...routeEventsOfSubject(cast, "Web cast"));
  if (cast.tag !== "resolved") {
    throw new Error("Expected Web cast to resolve.");
  }
  return { route, state: cast.state };
}

function endConcentrationSpatialRoute(
  state: BattleState,
  label: string,
): readonly BattleReducerRouteEvent[] {
  const subject = {
    tag: "runtimeCommand",
    actorId: spellCasterId,
    command: "endConcentration",
  } as const satisfies Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
  >;
  const ended = resolveBattleSubject({
    state,
    subject,
    fills: [],
  });
  if (ended.tag !== "resolved") {
    throw new Error(
      `Expected ${label} to resolve, got ${ended.tag}${
        ended.tag === "invalid" ? `: ${ended.message}` : ""
      }.`,
    );
  }
  return routeEventsOfSubject(ended, label);
}

function moveAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "move" }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "move" }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Move act.");
  }
  return act;
}

function spikeGrowthMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
): Extract<BattleFill, { readonly kind: "movement" }> {
  return movementFill(hole, {
    movementCostFeet: 15,
    provokedOpportunityAttacks: [],
    areaDifficultTerrain: {
      kind: "areaDifficultTerrain",
      sources: [
        {
          kind: "spikeGrowthHazard",
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(spikeGrowthUnitId),
          ),
          areaId: spikeGrowthAreaId,
          damageDistanceFeet: movementFeet(5),
        },
      ],
      totalDistanceFeet: movementFeet(10),
      difficultTerrainDistanceFeet: movementFeet(5),
    },
  });
}

function expectedSpikeGrowthMovementHazardRoute(): readonly BattleReducerRouteEvent[] {
  return [
    ...expectedConcentrationBackedAreaHazardAdmissionRoute(),
    ...hazardMovementDamageRoute(),
    ...concentrationBreakHazardCleanupRoute(),
  ];
}

function expectedWebRestraintHazardRoute(): readonly BattleReducerRouteEvent[] {
  return [
    ...expectedConcentrationBackedAreaHazardAdmissionRoute(),
    spatialResolveWithoutFill("battleObscurementProjection"),
    spatialResolveWithoutFill("battleSightProjection"),
    ...hazardSavingThrowRoute(),
    ...concentrationBreakHazardCleanupRoute(),
  ];
}

function expectedConcentrationBackedAreaHazardAdmissionRoute(): readonly BattleReducerRouteEvent[] {
  return [
    startRoute(),
    spatialDiscover(["targetChoice"], "battleSpellSlotAndActionEconomy"),
    spatialResolve("targetChoice", [], "battleAreaShape"),
    spatialResolveWithoutFill("battleActiveEffect"),
    spatialResolveWithoutFill("battleConcentration"),
    spatialResolveWithoutFill("battleAreaHazard"),
    spatialResolveWithoutFill("battleCreatureSpaceMovement"),
  ];
}

function hazardSavingThrowRoute(): readonly BattleReducerRouteEvent[] {
  return [
    spatialDiscover(["savingThrowOutcome"], "battleAreaHazard"),
    spatialResolve("savingThrowOutcome", [], "battleSavingThrowOutcome"),
    spatialResolveWithoutFill("battleConditionLifecycle"),
  ];
}

function hazardMovementDamageRoute(): readonly BattleReducerRouteEvent[] {
  return [
    spatialDiscover(["movement"], "battleAreaHazard"),
    spatialResolve("movement", ["rolledDice"], "battleMovementResource"),
    spatialResolve("rolledDice", [], "battleHitPoint"),
  ];
}

function concentrationBreakHazardCleanupRoute(): readonly BattleReducerRouteEvent[] {
  return [
    spatialResolveWithoutFill("battleConcentration"),
    spatialResolveWithoutFill("battleAreaHazard"),
    spatialResolveWithoutFill("battleActiveEffect"),
  ];
}

function startRoute(): BattleReducerRouteEvent {
  return battleReducerStartRouteEvent();
}

function spatialDiscover(
  holes: RouteHoles,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: "spatialEffect",
    holes,
    owner,
  };
}

function spatialResolve(
  fill: RouteResolveEvent["fill"],
  holes: RouteHoles,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: "spatialEffect",
    fill,
    holes,
    owner,
  };
}

function spatialResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "spatialEffect",
    holes: [],
    owner,
  };
}

function routeEventsOfSubject(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
  subject: BattleReducerRouteSubjectFamily = "spatialEffect",
): readonly BattleReducerRouteEvent[] {
  const events = (source.routeEvents ?? []).filter(
    (
      event,
    ): event is Exclude<BattleReducerRouteEvent, { kind: "startBattle" }> =>
      event.kind !== "startBattle" && event.subject === subject,
  );
  if (events.length === 0) {
    throw new Error(
      `Expected ${subject} public reducer route events for ${label}.`,
    );
  }
  return events;
}

function selectedSpellProcedure(
  actionName: `do${string}`,
  input: SelectedLevel2ControlSpellInvocation,
) {
  return {
    actionName,
    discover: () => recordDiscoveredInvocation(input),
  };
}

function recordDiscoveredInvocation(
  input: SelectedLevel2ControlSpellInvocation,
): Level2ControlSpellSelectedIdentityProjection {
  const spell = selectedSpellRecord(input.spellId);
  const state = selectedSpellBattle(spell, input.slotLevel);
  const act = spellAct({
    state,
    spellId: input.spellId,
    slotLevel: input.slotLevel,
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
      spellSlotInvocationRef(input.spellId, input.slotLevel, input.procedure),
    ),
    mode: { tag: "cast" },
  });
  return expectedProjection(input.result);
}

function expectedProjection(
  lastResult: Level2ControlSpellSelectedIdentityResult,
): Level2ControlSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(
  spell: SpellRecord,
  slotLevel: 1 | 2,
): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2ControlSpellUnitId): SpellRecord {
  if (!level2ControlSpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(`Expected selected level 2 control spell id ${unitId}.`);
  }
  return spellRecord(unitId);
}
