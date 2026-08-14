import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay movement-forced-movement dissonant_whispers command expeditious_retreat ranger_roving barbarian_fast_movement
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B5-CLASS-FEATURE-IDENTITY-BATCH-2 monk_unarmored_movement
// UNIT-IDENTITY-REPLAY: movement-forced-movement dissonant_whispers doDissonantWhispersForcedReactionMovement
// UNIT-IDENTITY-REPLAY: movement-forced-movement command doCommandFleeTargetTurn
// UNIT-IDENTITY-REPLAY: movement-forced-movement expeditious_retreat doExpeditiousRetreatImmediateDash
// UNIT-IDENTITY-REPLAY: movement-forced-movement ranger_roving doRangerRovingClimbSwimMovement
// UNIT-IDENTITY-REPLAY: movement-forced-movement barbarian_fast_movement doBarbarianFastMovementDash
// UNIT-IDENTITY-REPLAY: B5-CLASS-FEATURE-IDENTITY-BATCH-2 monk_unarmored_movement doMonkUnarmoredMovementDash
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
  type MovementFeet,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleReducerStartRouteEvent,
  battleId,
  battleUnitRefWithSupportProfiles,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  endTurn,
  initiativeScore,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleProcedureExecutionRef,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type BattleUnitRef,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleReducerRouteEventsForDiscoveredAct } from "./battle-reducer/reducer-route.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintList,
  quintVariantMappedValue,
  quintVariantTag,
  quintStateRecord,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

type MovementCompelledMovementSpellId =
  | "dissonant_whispers"
  | "command"
  | "expeditious_retreat";
type MovementCompelledMovementFeatureId =
  | "ranger_roving"
  | "barbarian_fast_movement"
  | "monk_unarmored_movement";

type MovementCompelledMovementSelectedIdentityProjection = {
  readonly casterSpeedFeet: number;
  readonly casterRemainingFeet: number;
  readonly casterDashBonusFeet: number;
  readonly currentTurnBonusActionUnspent: boolean;
  readonly casterConcentrating: boolean;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly spellDashBonusActionEffectCount: number;
  readonly targetHp: number;
  readonly targetReactionAvailable: boolean;
  readonly dissonantMovementFillRequired: boolean;
  readonly targetMovementSpentFeet: number;
  readonly commandMovementFillRequired: boolean;
  readonly commandPendingEffectObserved: boolean;
  readonly commandPendingEffectCount: number;
  readonly climbSpeedFeet: number;
  readonly swimSpeedFeet: number;
  readonly lastResult:
    | "init"
    | "dissonantWhispers"
    | "commandFlee"
    | "expeditiousRetreat"
    | "rangerRoving"
    | "barbarianFastMovement"
    | "monkUnarmoredMovement";
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionDashSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionDashSpell" }
  >;
};
type RuntimeMoveAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "move" }
  >;
};
type RuntimeCommandFleeAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
  >;
};
type DashAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "dash" }
  >;
};

const casterId = combatantId("movement-forced-movement-caster");
const targetId = combatantId("movement-forced-movement-target");
const dissonantExistingTurnMovementSpentFeet = movementFeet(7);

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Movement and forced movement selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Movement and forced movement selected identity replay",
  taskId: "movement-forced-movement",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-movement-forced-movement-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      DissonantWhispers: "dissonantWhispers",
      CommandFlee: "commandFlee",
      ExpeditiousRetreat: "expeditiousRetreat",
      RangerRoving: "rangerRoving",
      BarbarianFastMovement: "barbarianFastMovement",
      MonkUnarmoredMovement: "monkUnarmoredMovement",
    },
  },
  projectionSchema: {
    casterSpeedFeet: "int",
    casterRemainingFeet: "int",
    casterDashBonusFeet: "int",
    currentTurnBonusActionUnspent: "bool",
    casterConcentrating: "bool",
    spellSlotSpentThisTurn: "bool",
    level1SlotsRemaining: "int",
    spellDashBonusActionEffectCount: "int",
    targetHp: "int",
    targetReactionAvailable: "bool",
    dissonantMovementFillRequired: "bool",
    targetMovementSpentFeet: "int",
    commandMovementFillRequired: "bool",
    commandPendingEffectObserved: "bool",
    commandPendingEffectCount: "int",
    climbSpeedFeet: "int",
    swimSpeedFeet: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "dissonant_whispers",
      procedures: [
        {
          actionName: "doDissonantWhispersForcedReactionMovement",
          discover: dissonantWhispersForcedReactionMovement,
        },
      ],
    },
    {
      unitId: "command",
      procedures: [
        {
          actionName: "doCommandFleeTargetTurn",
          discover: commandFleeTargetTurn,
        },
      ],
    },
    {
      unitId: "expeditious_retreat",
      procedures: [
        {
          actionName: "doExpeditiousRetreatImmediateDash",
          discover: expeditiousRetreatImmediateDash,
        },
      ],
    },
    {
      unitId: "ranger_roving",
      procedures: [
        {
          actionName: "doRangerRovingClimbSwimMovement",
          discover: rangerRovingClimbSwimMovement,
        },
      ],
    },
    {
      unitId: "barbarian_fast_movement",
      procedures: [
        {
          actionName: "doBarbarianFastMovementDash",
          discover: barbarianFastMovementDash,
        },
      ],
    },
    {
      unitId: "monk_unarmored_movement",
      procedures: [
        {
          actionName: "doMonkUnarmoredMovementDash",
          discover: monkUnarmoredMovementDash,
        },
      ],
    },
  ],
});

type MovementCompelledMovementRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
};

type MovementPresentationResourceFact =
  | "movementReplacementFixedBudgetSpend"
  | "movementReplacementDistanceProjection"
  | "forcedMovementNoOwnMovementResource"
  | "forcedMovementDistanceProjection";

type MovementPresentationTableFact =
  | "tableSuppliedMovementPathWitness"
  | "landingSpacePresentationWitness"
  | "directionAwayFromSourcePresentationWitness"
  | "areaGeometryPresentationWitness"
  | "audibleEffectPresentationWitness";

type MovementPresentationObjectBoundaryFact =
  | "objectUnsecuredBoundary"
  | "objectEntirelyWithinAreaBoundary"
  | "objectPushProjection";

type MovementReplacementLandingOutcomeFact =
  | "landingAcceptedNoCheck"
  | "landingAcceptedDifficultTerrainAcrobaticsPassed"
  | "landingAcceptedDifficultTerrainAcrobaticsFailedProne"
  | "landingRejectedIllegal";

type MovementPresentationRouteFact =
  | {
      readonly kind: "resource";
      readonly resource: MovementPresentationResourceFact;
    }
  | {
      readonly kind: "tablePresentation";
      readonly presentation: MovementPresentationTableFact;
    }
  | {
      readonly kind: "objectBoundary";
      readonly boundary: MovementPresentationObjectBoundaryFact;
    }
  | {
      readonly kind: "landingOutcome";
      readonly outcome: MovementReplacementLandingOutcomeFact;
    };

type MovementPresentationRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
  readonly facts: readonly MovementPresentationRouteFact[];
};

const movementCompelledMovementRouteDriverSchema = {
  init: {},
  doDissonantWhispersForcedReactionMovement: {},
  doCommandFleeTargetTurn: {},
  doExpeditiousRetreatImmediateDash: {},
  doRangerRovingClimbSwimMovement: {},
  doBarbarianFastMovementDash: {},
  doMonkUnarmoredMovementDash: {},
  step: {},
} as const;

const movementPresentationRouteDriverSchema = {
  init: {},
  doRouteMovementReplacementLandingAcceptedNoCheck: {},
  doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsPassed: {},
  doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsFailedProne:
    {},
  doRouteMovementReplacementLandingRejectedIllegal: {},
  doRouteForcedCreatureMovementPresentation: {},
  doRouteObjectPushPresentation: {},
  step: {},
} as const;

describe("Movement and forced movement substrate route MBT", () => {
  it(
    "routes movement, compelled movement, and special-speed substrates",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-movement-forced-movement-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createMovementCompelledMovementRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: movementCompelledMovementRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes movement replacement, forced movement, and object-push presentation through generic facts",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-movement-presentation.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createMovementPresentationRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: movementPresentationRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

describe("Movement and compelled movement public reducer route replay", () => {
  it("observes copied movement substrate qRoute through public reducer entrypoints", () => {
    expect(replayDissonantWhispersForcedReactionMovementRoute()).toEqual(
      movementCompelledMovementRouteProjection(
        "doDissonantWhispersForcedReactionMovement",
      ),
    );
    expect(replayCommandFleeTargetTurnRoute()).toEqual(
      movementCompelledMovementRouteProjection("doCommandFleeTargetTurn"),
    );
    expect(replayExpeditiousRetreatImmediateDashRoute()).toEqual(
      movementCompelledMovementRouteProjection(
        "doExpeditiousRetreatImmediateDash",
      ),
    );
    expect(replayRangerRovingSpecialSpeedMovementRoute()).toEqual(
      movementCompelledMovementRouteProjection(
        "doRangerRovingClimbSwimMovement",
      ),
    );
    expect(replayBarbarianFastMovementDashRoute()).toEqual(
      movementCompelledMovementRouteProjection("doBarbarianFastMovementDash"),
    );
    expect(replayMonkUnarmoredMovementDashRoute()).toEqual(
      movementCompelledMovementRouteProjection("doMonkUnarmoredMovementDash"),
    );
  });
});

type MovementCompelledMovementRouteAction = Exclude<
  keyof typeof movementCompelledMovementRouteDriverSchema,
  "init" | "step"
>;

function movementCompelledMovementRouteProjection(
  actionName: MovementCompelledMovementRouteAction,
): readonly ReducerRouteEvent[] {
  const driver = createMovementCompelledMovementRouteDriver()();
  driver.actions.init.handler({});
  driver.actions[actionName].handler({});
  if (driver.getState === undefined) {
    throw new Error("Expected movement forced movement route driver state.");
  }
  return driver.getState().route;
}

function replayDissonantWhispersForcedReactionMovementRoute(): readonly BattleReducerRouteEvent[] {
  const state = movementCompelledMovementSpellBattle({
    sourceClassName: "bard",
    preparedSpells: [spellRecord("dissonant_whispers")],
    targetHp: 30,
    targetMaxHp: 30,
  });
  const act = actionSpellAct(state, "dissonant_whispers");
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(target, act.subject.procedureRef);
  const savingThrow = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
    "savingThrowOutcome",
  );
  const saveFill = savingThrowOutcomeFill(savingThrow, [
    { targetId, succeeded: false },
  ]);
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damageRoll, [[3, 4, 5]]);
  const movement = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill, damageFill],
    }),
    "movement",
  );
  const moved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      saveFill,
      damageFill,
      movementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  requireResolvedRouteResult(moved, "Dissonant Whispers forced movement");
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfMovementSubstrate(act, "Dissonant Whispers discovery"),
    ...routeEventsOfMovementSubstrate(moved, "Dissonant Whispers movement"),
  ];
}

function replayCommandFleeTargetTurnRoute(): readonly BattleReducerRouteEvent[] {
  const state = movementCompelledMovementSpellBattle({
    sourceClassName: "cleric",
    preparedSpells: [spellRecord("command")],
  });
  const act = actionSpellAct(state, "command");
  const target = requireHole(act.initialHoles, "spellTargetList");
  const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
  const targetFill = spellTargetListFill(target, act.subject.procedureRef, [
    targetId,
  ]);
  const optionFill: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  > = {
    kind: "commandOptionChoice",
    holeId: commandOption.holeId,
    value: "flee",
  };
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetFill, optionFill],
  });
  const savingThrow = requireResultHole(awaitingSave, "savingThrowOutcome");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      optionFill,
      savingThrowOutcomeFill(savingThrow, [{ targetId, succeeded: false }]),
    ],
  });
  requireResolvedRouteResult(cast, "Command cast");
  const targetTurn = endTurn({ state: cast.state, actorId: casterId });
  requireResolvedRouteResult(targetTurn, "Command caster End Turn");
  const flee = commandFleeAct(targetTurn.state);
  const movement = requireHole(flee.initialHoles, "movement");
  const moved = resolveBattleSubject({
    state: targetTurn.state,
    subject: flee.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  requireResolvedRouteResult(moved, "Command Flee movement");
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfMovementSubstrate(awaitingSave, "Command Flee discovery"),
    ...routeEventsOfMovementSubstrate(moved, "Command Flee movement"),
  ];
}

function replayExpeditiousRetreatImmediateDashRoute(): readonly BattleReducerRouteEvent[] {
  const state = movementCompelledMovementSpellBattle({
    sourceClassName: "wizard",
    preparedSpells: [spellRecord("expeditious_retreat")],
  });
  const act = bonusActionDashSpellAct(state, "expeditious_retreat");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [],
  });
  requireResolvedRouteResult(resolved, "Expeditious Retreat Dash");
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfMovementSubstrate(act, "Expeditious Retreat discovery"),
    ...routeEventsOfMovementSubstrate(
      resolved,
      "Expeditious Retreat resolution",
    ),
  ];
}

function replayRangerRovingSpecialSpeedMovementRoute(): readonly BattleReducerRouteEvent[] {
  const state = rovingBattle();
  const act = moveAct(state);
  const movement = requireHole(act.initialHoles, "movement");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      movementFill(movement, {
        speedKind: "climb",
        movementCostFeet: 15,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  requireResolvedRouteResult(resolved, "Roving special-speed movement");
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfMovementSubstrate(act, "Roving movement discovery"),
    ...routeEventsOfMovementSubstrate(resolved, "Roving movement resolution"),
  ];
}

function replayBarbarianFastMovementDashRoute(): readonly BattleReducerRouteEvent[] {
  return replayPassiveSpeedDashRoute(fastMovementBattle(), "Barbarian Dash");
}

function replayMonkUnarmoredMovementDashRoute(): readonly BattleReducerRouteEvent[] {
  return replayPassiveSpeedDashRoute(
    monkUnarmoredMovementBattle(),
    "Monk Unarmored Movement Dash",
  );
}

function replayPassiveSpeedDashRoute(
  state: BattleState,
  label: string,
): readonly BattleReducerRouteEvent[] {
  const act = dashAct(state);
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [],
  });
  requireResolvedRouteResult(resolved, label);
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfMovementSubstrate(act, `${label} discovery`),
    ...routeEventsOfMovementSubstrate(resolved, `${label} resolution`),
  ];
}

type BattleReducerRouteSubject = Exclude<
  BattleReducerRouteEvent,
  { readonly kind: "startBattle" }
>["subject"];
const MOVEMENT_SUBSTRATE_ROUTE_SUBJECTS = [
  "compelledMovement",
  "movementResource",
  "specialSpeedProjection",
] as const satisfies ReadonlyArray<BattleReducerRouteSubject>;
type MovementSubstrateRouteSubject =
  (typeof MOVEMENT_SUBSTRATE_ROUTE_SUBJECTS)[number];

function routeEventsOfMovementSubstrate(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
): readonly BattleReducerRouteEvent[] {
  const events = (source.routeEvents ?? []).filter(
    (
      event,
    ): event is BattleReducerRouteEvent & {
      readonly subject: MovementSubstrateRouteSubject;
    } =>
      event.kind !== "startBattle" &&
      isMovementSubstrateRouteSubject(event.subject),
  );
  if (events.length === 0) {
    throw new Error(`Expected movement substrate route events for ${label}.`);
  }
  return events;
}

function isMovementSubstrateRouteSubject(
  subject: BattleReducerRouteSubject,
): subject is MovementSubstrateRouteSubject {
  return MOVEMENT_SUBSTRATE_ROUTE_SUBJECTS.some(
    (candidate) => candidate === subject,
  );
}

function requireResolvedRouteResult(
  result: BattleResolutionResult,
  label: string,
): asserts result is BattleResolutionResult & {
  readonly tag: "resolved";
} {
  if (result.tag !== "resolved") {
    throw new Error(`Expected ${label} to resolve, got ${result.tag}.`);
  }
}

function createMovementCompelledMovementRouteDriver() {
  return defineDriver<
    typeof movementCompelledMovementRouteDriverSchema,
    MovementCompelledMovementRouteProjection
  >(movementCompelledMovementRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    reset();

    return {
      init: reset,
      doDissonantWhispersForcedReactionMovement: () => {
        route = appendCompelledMovementRoute(route, [
          { kind: "targetChoice" },
          { kind: "savingThrowOutcome" },
          { kind: "rolledDice" },
          { kind: "movement" },
        ]);
      },
      doCommandFleeTargetTurn: () => {
        route = [
          ...appendCompelledMovementRoute(route, [
            { kind: "spellTargetList" },
            { kind: "commandOptionChoice" },
            { kind: "savingThrowOutcome" },
            { kind: "movement" },
          ]),
          ...compelledMovementOwners(
            "battleActiveEffect",
            "battleTurnBoundary",
          ),
        ];
      },
      doExpeditiousRetreatImmediateDash: () => {
        route = appendSpellGrantedDashRoute(route);
      },
      doRangerRovingClimbSwimMovement: () => {
        route = appendSpecialSpeedMovementRoute(route);
      },
      doBarbarianFastMovementDash: () => {
        route = appendPassiveSpeedDashRoute(route);
      },
      doMonkUnarmoredMovementDash: () => {
        route = appendPassiveSpeedDashRoute(route);
      },
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

function appendCompelledMovementRoute(
  route: readonly ReducerRouteEvent[],
  holes: readonly Pick<BattleHole, "kind">[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "compelledMovement",
      holes,
      owner: "battleSpellSlotAndActionEconomy",
    }),
    reducerRouteResolveBattleSubject({
      subject: "compelledMovement",
      fill: "movement",
      holes: [],
      owner: "battleMovementResource",
    }),
    ...compelledMovementOwners("battleActionEconomy", "battleInterruptStack"),
  ];
}

function compelledMovementOwners(
  ...owners: readonly ReducerRouteEvent["owner"][]
): readonly ReducerRouteEvent[] {
  return owners.map((owner) =>
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "compelledMovement",
      holes: [],
      owner,
    }),
  );
}

function appendSpellGrantedDashRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "movementResource",
      holes: [],
      owner: "battleSpellSlotAndActionEconomy",
    }),
    ...movementResourceOwners(
      "battleSpellSlotAndActionEconomy",
      "battleActiveEffect",
      "battleMovementResource",
    ),
  ];
}

function appendPassiveSpeedDashRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "movementResource",
      holes: [],
      owner: "battleActionEconomy",
    }),
    ...movementResourceOwners(
      "battleActionEconomy",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

function movementResourceOwners(
  ...owners: readonly ReducerRouteEvent["owner"][]
): readonly ReducerRouteEvent[] {
  return owners.map((owner) =>
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementResource",
      holes: [],
      owner,
    }),
  );
}

function appendSpecialSpeedMovementRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "specialSpeedProjection",
      holes: [],
      owner: "battleCreatureState",
    }),
    ...specialSpeedProjectionOwners(
      "battleCreatureState",
      "battleMovementResource",
    ),
    reducerRouteDiscoverBattleActs({
      subject: "movementResource",
      holes: [{ kind: "movement" }],
      owner: "battleMovementResource",
    }),
    reducerRouteResolveBattleSubject({
      subject: "movementResource",
      fill: "movement",
      holes: [],
      owner: "battleMovementResource",
    }),
  ];
}

function specialSpeedProjectionOwners(
  ...owners: readonly ReducerRouteEvent["owner"][]
): readonly ReducerRouteEvent[] {
  return owners.map((owner) =>
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "specialSpeedProjection",
      holes: [],
      owner,
    }),
  );
}

const movementCompelledMovementRouteStateCheck = stateCheck(
  normalizeMovementCompelledMovementRouteQuintState,
  compareMovementCompelledMovementRouteStates,
);

function createMovementPresentationRouteDriver() {
  return defineDriver<
    typeof movementPresentationRouteDriverSchema,
    MovementPresentationRouteProjection
  >(movementPresentationRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [];
    let facts: readonly MovementPresentationRouteFact[] = [];

    function reset(): void {
      route = [reducerRouteStartBattle("battleActionEconomy")];
      facts = [];
    }

    reset();

    return {
      init: reset,
      doRouteMovementReplacementLandingAcceptedNoCheck: () => {
        route = appendMovementReplacementPresentationRoute(route);
        facts = movementReplacementAcceptedPresentationFacts(
          "landingAcceptedNoCheck",
        );
      },
      doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsPassed:
        () => {
          route = appendMovementReplacementPresentationRoute(route);
          facts = movementReplacementAcceptedPresentationFacts(
            "landingAcceptedDifficultTerrainAcrobaticsPassed",
          );
        },
      doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsFailedProne:
        () => {
          route = appendMovementReplacementFailedLandingProneRoute(route);
          facts = movementReplacementAcceptedPresentationFacts(
            "landingAcceptedDifficultTerrainAcrobaticsFailedProne",
          );
        },
      doRouteMovementReplacementLandingRejectedIllegal: () => {
        route = appendMovementReplacementIllegalLandingRejectedRoute(route);
        facts = movementReplacementLandingRejectedIllegalFacts;
      },
      doRouteForcedCreatureMovementPresentation: () => {
        route = appendForcedCreatureMovementPresentationRoute(route);
        facts = forcedCreatureMovementPresentationFacts;
      },
      doRouteObjectPushPresentation: () => {
        route = appendObjectPushPresentationRoute(route);
        facts = objectPushPresentationFacts;
      },
      step: () => {},
      getState: () => ({ route, facts }),
    };
  });
}

function appendMovementReplacementPresentationRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "movementPresentation",
      holes: [{ kind: "movement" }],
      owner: "battleMovementResource",
    }),
    reducerRouteResolveBattleSubject({
      subject: "movementPresentation",
      fill: "movement",
      holes: [],
      owner: "battleMovementResource",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementPresentation",
      holes: [],
      owner: "battleTablePresentation",
    }),
  ];
}

function appendMovementReplacementFailedLandingProneRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...appendMovementReplacementPresentationRoute(route),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementPresentation",
      holes: [],
      owner: "battleConditionLifecycle",
    }),
  ];
}

function appendMovementReplacementIllegalLandingRejectedRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "movementPresentation",
      holes: [],
      owner: "battleTablePresentation",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementPresentation",
      holes: [],
      owner: "battleTablePresentation",
    }),
  ];
}

function appendForcedCreatureMovementPresentationRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "movementPresentation",
      holes: [{ kind: "savingThrowOutcome" }, { kind: "movement" }],
      owner: "battleSavingThrowOutcome",
    }),
    reducerRouteResolveBattleSubject({
      subject: "movementPresentation",
      fill: "savingThrowOutcome",
      holes: [{ kind: "movement" }],
      owner: "battleSavingThrowOutcome",
    }),
    reducerRouteResolveBattleSubject({
      subject: "movementPresentation",
      fill: "movement",
      holes: [],
      owner: "battleMovementResource",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementPresentation",
      holes: [],
      owner: "battleTablePresentation",
    }),
  ];
}

function appendObjectPushPresentationRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "movementPresentation",
      holes: [],
      owner: "battleObjectTargetBoundary",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementPresentation",
      holes: [],
      owner: "battleObjectTargetBoundary",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "movementPresentation",
      holes: [],
      owner: "battleTablePresentation",
    }),
  ];
}

function movementReplacementAcceptedPresentationFacts(
  outcome: MovementReplacementLandingOutcomeFact,
): readonly MovementPresentationRouteFact[] {
  return [
    {
      kind: "resource",
      resource: "movementReplacementFixedBudgetSpend",
    },
    {
      kind: "resource",
      resource: "movementReplacementDistanceProjection",
    },
    {
      kind: "tablePresentation",
      presentation: "tableSuppliedMovementPathWitness",
    },
    {
      kind: "tablePresentation",
      presentation: "landingSpacePresentationWitness",
    },
    {
      kind: "landingOutcome",
      outcome,
    },
  ] as const satisfies readonly MovementPresentationRouteFact[];
}

const movementReplacementLandingRejectedIllegalFacts = [
  {
    kind: "landingOutcome",
    outcome: "landingRejectedIllegal",
  },
] as const satisfies readonly MovementPresentationRouteFact[];

const forcedCreatureMovementPresentationFacts = [
  {
    kind: "resource",
    resource: "forcedMovementNoOwnMovementResource",
  },
  {
    kind: "resource",
    resource: "forcedMovementDistanceProjection",
  },
  {
    kind: "tablePresentation",
    presentation: "directionAwayFromSourcePresentationWitness",
  },
  {
    kind: "tablePresentation",
    presentation: "areaGeometryPresentationWitness",
  },
] as const satisfies readonly MovementPresentationRouteFact[];

const objectPushPresentationFacts = [
  {
    kind: "objectBoundary",
    boundary: "objectUnsecuredBoundary",
  },
  {
    kind: "objectBoundary",
    boundary: "objectEntirelyWithinAreaBoundary",
  },
  {
    kind: "objectBoundary",
    boundary: "objectPushProjection",
  },
  {
    kind: "tablePresentation",
    presentation: "directionAwayFromSourcePresentationWitness",
  },
  {
    kind: "tablePresentation",
    presentation: "audibleEffectPresentationWitness",
  },
] as const satisfies readonly MovementPresentationRouteFact[];

const movementPresentationRouteStateCheck = stateCheck(
  normalizeMovementPresentationRouteQuintState,
  compareMovementPresentationRouteStates,
);

function normalizeMovementPresentationRouteQuintState(
  raw: unknown,
): MovementPresentationRouteProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
    facts: decodeMovementPresentationRouteFacts(quintField(state, "qFacts")),
  };
}

function compareMovementPresentationRouteStates(
  spec: MovementPresentationRouteProjection,
  impl: MovementPresentationRouteProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const MOVEMENT_PRESENTATION_RESOURCE_BY_VARIANT_TAG = {
  MovementReplacementFixedBudgetSpend: "movementReplacementFixedBudgetSpend",
  MovementReplacementDistanceProjection:
    "movementReplacementDistanceProjection",
  ForcedMovementNoOwnMovementResource: "forcedMovementNoOwnMovementResource",
  ForcedMovementDistanceProjection: "forcedMovementDistanceProjection",
} as const satisfies Readonly<Record<string, MovementPresentationResourceFact>>;

const MOVEMENT_PRESENTATION_TABLE_BY_VARIANT_TAG = {
  TableSuppliedMovementPathWitness: "tableSuppliedMovementPathWitness",
  LandingSpacePresentationWitness: "landingSpacePresentationWitness",
  DirectionAwayFromSourcePresentationWitness:
    "directionAwayFromSourcePresentationWitness",
  AreaGeometryPresentationWitness: "areaGeometryPresentationWitness",
  AudibleEffectPresentationWitness: "audibleEffectPresentationWitness",
} as const satisfies Readonly<Record<string, MovementPresentationTableFact>>;

const MOVEMENT_PRESENTATION_OBJECT_BOUNDARY_BY_VARIANT_TAG = {
  ObjectUnsecuredBoundary: "objectUnsecuredBoundary",
  ObjectEntirelyWithinAreaBoundary: "objectEntirelyWithinAreaBoundary",
  ObjectPushProjection: "objectPushProjection",
} as const satisfies Readonly<
  Record<string, MovementPresentationObjectBoundaryFact>
>;

const MOVEMENT_REPLACEMENT_LANDING_OUTCOME_BY_VARIANT_TAG = {
  LandingAcceptedNoCheck: "landingAcceptedNoCheck",
  LandingAcceptedDifficultTerrainAcrobaticsPassed:
    "landingAcceptedDifficultTerrainAcrobaticsPassed",
  LandingAcceptedDifficultTerrainAcrobaticsFailedProne:
    "landingAcceptedDifficultTerrainAcrobaticsFailedProne",
  LandingRejectedIllegal: "landingRejectedIllegal",
} as const satisfies Readonly<
  Record<string, MovementReplacementLandingOutcomeFact>
>;

function decodeMovementPresentationRouteFacts(
  raw: unknown,
): readonly MovementPresentationRouteFact[] {
  return quintList(raw, "qFacts").map(decodeMovementPresentationRouteFact);
}

function decodeMovementPresentationRouteFact(
  raw: unknown,
): MovementPresentationRouteFact {
  const tag = quintVariantTag(raw, "qFacts[]");
  if (tag === "RouteMovementPresentationResource") {
    const payload = movementPresentationFactPayload(raw);
    return {
      kind: "resource",
      resource: quintVariantMappedValue(
        quintField(payload, "resource"),
        "qFacts[].resource",
        MOVEMENT_PRESENTATION_RESOURCE_BY_VARIANT_TAG,
        "movement/presentation resource fact",
      ),
    };
  }
  if (tag === "RouteMovementPresentationTable") {
    const payload = movementPresentationFactPayload(raw);
    return {
      kind: "tablePresentation",
      presentation: quintVariantMappedValue(
        quintField(payload, "presentation"),
        "qFacts[].presentation",
        MOVEMENT_PRESENTATION_TABLE_BY_VARIANT_TAG,
        "movement/presentation table fact",
      ),
    };
  }
  if (tag === "RouteMovementPresentationObjectBoundary") {
    const payload = movementPresentationFactPayload(raw);
    return {
      kind: "objectBoundary",
      boundary: quintVariantMappedValue(
        quintField(payload, "boundary"),
        "qFacts[].boundary",
        MOVEMENT_PRESENTATION_OBJECT_BOUNDARY_BY_VARIANT_TAG,
        "movement/presentation object-boundary fact",
      ),
    };
  }
  if (tag === "RouteMovementPresentationLandingOutcome") {
    const payload = movementPresentationFactPayload(raw);
    return {
      kind: "landingOutcome",
      outcome: quintVariantMappedValue(
        quintField(payload, "outcome"),
        "qFacts[].outcome",
        MOVEMENT_REPLACEMENT_LANDING_OUTCOME_BY_VARIANT_TAG,
        "movement replacement landing outcome fact",
      ),
    };
  }

  throw new Error(`Unknown movement/presentation route fact: ${tag}.`);
}

function movementPresentationFactPayload(
  raw: unknown,
): Readonly<Record<string, unknown>> {
  const value = quintField(quintStateRecord(raw), "value");
  return quintStateRecord(value);
}

function normalizeMovementCompelledMovementRouteQuintState(
  raw: unknown,
): MovementCompelledMovementRouteProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareMovementCompelledMovementRouteStates(
  spec: MovementCompelledMovementRouteProjection,
  impl: MovementCompelledMovementRouteProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function resolvedProjection(
  result: BattleResolutionResult,
  flags: {
    readonly lastResult: Exclude<
      MovementCompelledMovementSelectedIdentityProjection["lastResult"],
      "init"
    >;
    readonly dissonantMovementFillRequired?: boolean;
    readonly commandMovementFillRequired?: boolean;
    readonly commandPendingEffectObserved?: boolean;
  },
): MovementCompelledMovementSelectedIdentityProjection {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected movement and forced movement action to resolve, got ${result.tag}: ${
        "reason" in result ? result.reason : "unknown"
      } ${"message" in result ? result.message : ""}`,
    );
  }
  return projectMovementCompelledMovementSelectedIdentityState(result.state, {
    lastResult: flags.lastResult,
    dissonantMovementFillRequired: flags.dissonantMovementFillRequired ?? false,
    commandMovementFillRequired: flags.commandMovementFillRequired ?? false,
    commandPendingEffectObserved: flags.commandPendingEffectObserved ?? false,
  });
}

function dissonantWhispersForcedReactionMovement(): MovementCompelledMovementSelectedIdentityProjection {
  let dissonantMovementFillRequired = false;
  const state = withTargetTurnMovementSpent(
    movementCompelledMovementSpellBattle({
      sourceClassName: "bard",
      preparedSpells: [spellRecord("dissonant_whispers")],
      targetHp: 30,
      targetMaxHp: 30,
    }),
    dissonantExistingTurnMovementSpentFeet,
  );
  return resolvedProjection(
    resolveDissonantWhispersForcedReactionMovement(state, () => {
      dissonantMovementFillRequired = true;
    }),
    { lastResult: "dissonantWhispers", dissonantMovementFillRequired },
  );
}

function withTargetTurnMovementSpent(
  state: BattleState,
  movementSpentFeet: MovementFeet,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected Dissonant Whispers movement target.");
  }
  const combatants = new Map(state.combatants);
  combatants.set(targetId, { ...target, movementSpentFeet });
  return { ...state, combatants };
}

function commandFleeTargetTurn(): MovementCompelledMovementSelectedIdentityProjection {
  let commandPendingEffectObserved = false;
  let commandMovementFillRequired = false;
  const state = movementCompelledMovementSpellBattle({
    sourceClassName: "cleric",
    preparedSpells: [spellRecord("command")],
  });
  return resolvedProjection(
    resolveCommandFleeTargetTurn(
      state,
      (castState) => {
        commandPendingEffectObserved =
          commandPendingEffectCount(castState) === 1;
      },
      () => {
        commandMovementFillRequired = true;
      },
    ),
    {
      lastResult: "commandFlee",
      commandMovementFillRequired,
      commandPendingEffectObserved,
    },
  );
}

function expeditiousRetreatImmediateDash(): MovementCompelledMovementSelectedIdentityProjection {
  const state = movementCompelledMovementSpellBattle({
    sourceClassName: "wizard",
    preparedSpells: [spellRecord("expeditious_retreat")],
  });
  return resolvedProjection(resolveExpeditiousRetreatImmediateDash(state), {
    lastResult: "expeditiousRetreat",
  });
}

function rangerRovingClimbSwimMovement(): MovementCompelledMovementSelectedIdentityProjection {
  return resolvedProjection(resolveRovingClimbSwimMovement(rovingBattle()), {
    lastResult: "rangerRoving",
  });
}

function barbarianFastMovementDash(): MovementCompelledMovementSelectedIdentityProjection {
  return resolvedProjection(
    resolveBarbarianFastMovementDash(fastMovementBattle()),
    {
      lastResult: "barbarianFastMovement",
    },
  );
}

function monkUnarmoredMovementDash(): MovementCompelledMovementSelectedIdentityProjection {
  return resolvedProjection(
    resolveMonkUnarmoredMovementDash(monkUnarmoredMovementBattle()),
    { lastResult: "monkUnarmoredMovement" },
  );
}

function expectedProjection(
  overrides: Partial<MovementCompelledMovementSelectedIdentityProjection> = {},
): MovementCompelledMovementSelectedIdentityProjection {
  return {
    casterSpeedFeet: 30,
    casterRemainingFeet: 30,
    casterDashBonusFeet: 0,
    currentTurnBonusActionUnspent: true,
    casterConcentrating: false,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    spellDashBonusActionEffectCount: 0,
    targetHp: 12,
    targetReactionAvailable: true,
    dissonantMovementFillRequired: false,
    targetMovementSpentFeet: 0,
    commandMovementFillRequired: false,
    commandPendingEffectObserved: false,
    commandPendingEffectCount: 0,
    climbSpeedFeet: 0,
    swimSpeedFeet: 0,
    lastResult: "init",
    ...overrides,
  };
}

function resolveDissonantWhispersForcedReactionMovement(
  state: BattleState,
  onMovementFillRequired: () => void,
): BattleResolutionResult {
  const act = actionSpellAct(state, "dissonant_whispers");
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(target, act.subject.procedureRef);
  const savingThrow = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
    "savingThrowOutcome",
  );
  const saveFill = savingThrowOutcomeFill(savingThrow, [
    { targetId, succeeded: false },
  ]);
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damageRoll, [[3, 4, 5]]);
  const movement = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill, damageFill],
    }),
    "movement",
  );
  onMovementFillRequired();

  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      saveFill,
      damageFill,
      movementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
}

function resolveCommandFleeTargetTurn(
  state: BattleState,
  onCastResolved: (castState: BattleState) => void,
  onMovementFillRequired: () => void,
): BattleResolutionResult {
  const act = actionSpellAct(state, "command");
  const target = requireHole(act.initialHoles, "spellTargetList");
  const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
  const targetFill = spellTargetListFill(target, act.subject.procedureRef, [
    targetId,
  ]);
  const optionFill: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  > = {
    kind: "commandOptionChoice",
    holeId: commandOption.holeId,
    value: "flee",
  };
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    }),
    "savingThrowOutcome",
  );
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      optionFill,
      savingThrowOutcomeFill(savingThrow, [{ targetId, succeeded: false }]),
    ],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Command cast to resolve, got ${cast.tag}.`);
  }
  onCastResolved(cast.state);

  const targetTurn = endTurn({ state: cast.state, actorId: casterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error(
      `Expected Command caster End Turn to resolve, got ${targetTurn.tag}.`,
    );
  }
  const flee = commandFleeAct(targetTurn.state);
  const movement = requireHole(flee.initialHoles, "movement");
  onMovementFillRequired();
  return resolveBattleSubject({
    state: targetTurn.state,
    subject: flee.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
}

function resolveExpeditiousRetreatImmediateDash(
  state: BattleState,
): BattleResolutionResult {
  const act = bonusActionDashSpellAct(state, "expeditious_retreat");
  return resolveBattleSubject({ state, subject: act.subject, fills: [] });
}

function resolveRovingClimbSwimMovement(
  state: BattleState,
): BattleResolutionResult {
  const climbAct = moveAct(state);
  const climbMovement = requireHole(climbAct.initialHoles, "movement");
  const climbed = resolveBattleSubject({
    state,
    subject: climbAct.subject,
    fills: [
      movementFill(climbMovement, {
        speedKind: "climb",
        movementCostFeet: 15,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (climbed.tag !== "resolved") {
    throw new Error(`Expected Roving climb Movement, got ${climbed.tag}.`);
  }

  const swimAct = moveAct(climbed.state);
  const swimMovement = requireHole(swimAct.initialHoles, "movement");
  return resolveBattleSubject({
    state: climbed.state,
    subject: swimAct.subject,
    fills: [
      movementFill(swimMovement, {
        speedKind: "swim",
        movementCostFeet: 25,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
}

function resolveBarbarianFastMovementDash(
  state: BattleState,
): BattleResolutionResult {
  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: casterId,
      action: "dash",
      speedKind: "walk",
    },
    fills: [],
  });
}

function resolveMonkUnarmoredMovementDash(
  state: BattleState,
): BattleResolutionResult {
  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: casterId,
      action: "dash",
      speedKind: "walk",
    },
    fills: [],
  });
}

function movementCompelledMovementSpellBattle(
  input: {
    readonly sourceClassName?: "bard" | "cleric" | "wizard";
    readonly preparedSpells?: readonly SpellRecord[];
    readonly spellSlots?: readonly {
      readonly spellLevel: 1;
      readonly count: number;
    }[];
    readonly targetHp?: number;
    readonly targetMaxHp?: number;
  } = {},
): BattleState {
  return movementCompelledMovementBattle({
    caster: {
      spellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: input.sourceClassName ?? "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: input.preparedSpells ?? [],
        featurePreparedSpells: [],
        spellAccesses: [],
        invocationSpellAccesses: [],
        spellbookRitualSpellAccesses: [],
        spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
      },
      classLevels: [{ className: input.sourceClassName ?? "wizard", level: 1 }],
    },
    target: {
      ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
      ...(input.targetMaxHp === undefined ? {} : { maxHp: input.targetMaxHp }),
    },
  });
}

function fastMovementBattle(): BattleState {
  return movementCompelledMovementBattle({
    battleName: "fast-movement",
    caster: {
      displayName: "Fast Barbarian",
      characterUnitRefs: [featureBattleUnitRef("barbarian_fast_movement")],
      classLevels: [{ className: "barbarian", level: 5 }],
    },
  });
}

function monkUnarmoredMovementBattle(): BattleState {
  return movementCompelledMovementBattle({
    battleName: "monk-unarmored-movement",
    caster: {
      displayName: "Unarmored Monk",
      characterUnitRefs: [featureBattleUnitRef("monk_unarmored_movement")],
      classLevels: [{ className: "monk", level: 2 }],
    },
  });
}

function rovingBattle(): BattleState {
  return movementCompelledMovementBattle({
    battleName: "roving",
    caster: {
      displayName: "Roving Ranger",
      characterUnitRefs: [featureBattleUnitRef("ranger_roving")],
      classLevels: [{ className: "ranger", level: 6 }],
    },
  });
}

function movementCompelledMovementBattle(input: {
  readonly battleName?: string;
  readonly caster?: {
    readonly displayName?: string;
    readonly spellcasting?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"];
    readonly characterUnitRefs?: readonly BattleUnitRef[];
    readonly classLevels?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["classLevels"];
  };
  readonly target?: {
    readonly currentHp?: number;
    readonly maxHp?: number;
  };
}): BattleState {
  const result = startBattle({
    battleId: battleId(
      `movement-forced-movement-selected-identity-${
        input.battleName ?? "spell"
      }`,
    ),
    combatants: [
      movementCompelledMovementCreature({
        combatantId: casterId,
        displayName: input.caster?.displayName ?? "Movement spellcaster",
        initiative: 20,
        characterUnitRefs: input.caster?.characterUnitRefs ?? [],
        ...(input.caster?.spellcasting === undefined
          ? {}
          : { spellcasting: input.caster.spellcasting }),
        ...(input.caster?.classLevels === undefined
          ? {}
          : { classLevels: input.caster.classLevels }),
      }),
      movementCompelledMovementCreature({
        combatantId: targetId,
        displayName: "Movement target",
        initiative: 10,
        ...(input.target?.currentHp === undefined
          ? {}
          : { currentHp: input.target.currentHp }),
        ...(input.target?.maxHp === undefined
          ? {}
          : { maxHp: input.target.maxHp }),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right.state;
}

function movementCompelledMovementCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly characterUnitRefs?: readonly BattleUnitRef[];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [
        {
          className:
            input.spellcasting?.spellcastingSource.tag === "classSpellcasting"
              ? input.spellcasting.spellcastingSource.className
              : "wizard",
          level: 1,
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function spellRecord(spellId: MovementCompelledMovementSpellId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function featureBattleUnitRef(
  unitId: MovementCompelledMovementFeatureId,
): BattleUnitRef {
  const unit = unitLibrary.requireUnit(unitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function actionSpellAct(
  state: BattleState,
  spellId: Extract<
    MovementCompelledMovementSpellId,
    "command" | "dissonant_whispers"
  >,
): ActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell",
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action Spell act.`);
  }
  return withReducerRouteEvents(state, act);
}

function bonusActionDashSpellAct(
  state: BattleState,
  spellId: Extract<MovementCompelledMovementSpellId, "expeditious_retreat">,
): BonusActionDashSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is BonusActionDashSpellAct =>
      candidate.subject.tag === "bonusActionDashSpell",
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action Dash spell act.`);
  }
  return withReducerRouteEvents(state, act);
}

function moveAct(state: BattleState): RuntimeMoveAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is RuntimeMoveAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === casterId &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected runtime Movement command.");
  }
  return withReducerRouteEvents(state, act);
}

function dashAct(state: BattleState): DashAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is DashAct =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === casterId &&
      candidate.subject.action === "dash",
  );
  if (act === undefined) {
    throw new Error("Expected Dash action.");
  }
  return withReducerRouteEvents(state, act);
}

function withReducerRouteEvents<TAct extends AvailableBattleAct>(
  state: BattleState,
  act: TAct,
): TAct & { readonly routeEvents: readonly BattleReducerRouteEvent[] } {
  return {
    ...act,
    routeEvents: battleReducerRouteEventsForDiscoveredAct(state, act) ?? [],
  };
}

function commandFleeAct(state: BattleState): RuntimeCommandFleeAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is RuntimeCommandFleeAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === targetId &&
      candidate.subject.command === "commandFlee",
  );
  if (act === undefined) {
    throw new Error("Expected Command Flee runtime command.");
  }
  return act;
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return requireHole(result.holes, kind);
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  sourceProcedureRef: BattleProcedureExecutionRef,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef,
      },
    ],
  };
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  sourceProcedureRef: BattleProcedureExecutionRef,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget" as const,
      casterId,
      targetId,
      sourceProcedureRef,
    })),
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function commandFleeMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      commandFlee: {
        kind: "commandFleeFastestAvailableRouteAwayFromCaster",
      },
    },
  };
}

function commandPendingEffectCount(state: BattleState): number {
  return (
    state.combatants.get(targetId)?.activeEffects.filter(
      (
        effect,
      ): effect is BattleActiveEffect & {
        readonly kind: "commandPending";
      } =>
        effect.kind === "commandPending" &&
        effect.sourceCombatantId === casterId,
    ).length ?? 0
  );
}

function spellDashBonusActionEffectCount(state: BattleState): number {
  return (
    state.combatants.get(casterId)?.activeEffects.filter(
      (
        effect,
      ): effect is BattleActiveEffect & {
        readonly kind: "spellDashBonusAction";
      } =>
        effect.kind === "spellDashBonusAction" &&
        effect.sourceCombatantId === casterId,
    ).length ?? 0
  );
}

function projectMovementCompelledMovementSelectedIdentityState(
  state: BattleState,
  flags: {
    readonly lastResult: MovementCompelledMovementSelectedIdentityProjection["lastResult"];
    readonly dissonantMovementFillRequired: boolean;
    readonly commandMovementFillRequired: boolean;
    readonly commandPendingEffectObserved: boolean;
  },
): MovementCompelledMovementSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === casterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (caster === undefined || target === undefined) {
    throw new Error("Expected movement selected identity combatants.");
  }
  const targetState = state.combatants.get(targetId);
  const casterState = state.combatants.get(casterId);
  if (targetState === undefined || casterState === undefined) {
    throw new Error("Expected movement selected identity state combatants.");
  }
  return {
    casterSpeedFeet: caster.movement.speedFeet,
    casterRemainingFeet: caster.movement.remainingFeet,
    casterDashBonusFeet: snapshot.turn.dashMovementBonusFeet,
    currentTurnBonusActionUnspent:
      state.currentTurnResources.currentHasBonusAction,
    casterConcentrating: casterState.concentration !== null,
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    level1SlotsRemaining: level1SlotsRemaining(state, casterId),
    spellDashBonusActionEffectCount: spellDashBonusActionEffectCount(state),
    targetHp: target.hp,
    targetReactionAvailable: targetState.reactionAvailable,
    dissonantMovementFillRequired: flags.dissonantMovementFillRequired,
    targetMovementSpentFeet: Number(targetState.movementSpentFeet),
    commandMovementFillRequired: flags.commandMovementFillRequired,
    commandPendingEffectObserved: flags.commandPendingEffectObserved,
    commandPendingEffectCount: commandPendingEffectCount(state),
    climbSpeedFeet: speedKindFeet(caster, "climb"),
    swimSpeedFeet: speedKindFeet(caster, "swim"),
    lastResult: flags.lastResult,
  };
}

function speedKindFeet(
  combatant: ReturnType<typeof snapshotBattle>["combatants"][number],
  kind: Extract<
    Extract<BattleFill, { readonly kind: "movement" }>["value"]["speedKind"],
    "climb" | "swim"
  >,
): number {
  return (
    combatant.movement.speedKinds.find((speedKind) => speedKind.kind === kind)
      ?.speedFeet ?? 0
  );
}

function level1SlotsRemaining(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return 0;
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}
