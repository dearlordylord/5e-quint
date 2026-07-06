import * as path from "node:path";

import {
  battleCombatantSide,
  battleId,
  combatantId,
  initiativeScore,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterDraft,
  type CreationFill,
  type CreationHoleIdText,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import type { SimpleActionMap, SimpleDriver } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import {
  characterBattleInitiativeScore,
  characterBattleEncounterCompositionRouteStep,
  characterBattleInitProjectionRouteStep,
  characterBattleSettlementRouteStep,
  characterSessionSheetDerivedBattleActsRouteStep,
  CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS,
  composeBattleEncounterRoute as composeBattleEncounter,
  enterBattleRuntimeRoute as enterBattleRuntime,
  initialCharacterBattleEncounterCompositionRoute,
  initialCharacterBattleInitProjectionRoute,
  initialCharacterBattleSettlementRoute,
  initialCharacterSessionSheetDerivedBattleActsRoute,
  projectCharacterSheetToBattleRoute as projectCharacterSheetToBattle,
  recordCharacterBattleHandoffFactsRoute as recordCharacterBattleHandoffFacts,
  rejectCharacterBattleHandoffRoute as rejectCharacterBattleHandoff,
  settleBattleToCharacterSheetRoute as settleBattleToCharacterSheet,
  characterSheetBattleInitWithRoute,
  startBattleFromCharacterSheetAndStatBlock,
  type CharacterBattleEncounterCompositionRouteAction,
  type CharacterBattleInitProjectionRouteAction,
  type CharacterBattleRouteCompositionFact,
  type CharacterBattleRouteEvent,
  type CharacterBattleRouteFill,
  type CharacterBattleRouteHandoffFact,
  type CharacterBattleRouteHole,
  type CharacterBattleRouteOwner,
  type CharacterBattleRouteSubject,
  type CharacterBattleSettlementRouteAction,
  type CharacterSessionSheetDerivedBattleActsRouteAction,
} from "./index.ts";

const MBT_TEST_TIMEOUT_MS = 120_000;
const CRIMINAL_BACKGROUND_UNIT_ID = "background_criminal";

const SUBJECT_BY_TAG = {
  SheetToBattleInitRouteSubject: "sheetToBattleInit",
  BattleToSheetSettlementRouteSubject: "battleToSheetSettlement",
  HandoffResourceProjectionRouteSubject: "handoffResourceProjection",
  HandoffFeatureResourceProjectionRouteSubject:
    "handoffFeatureResourceProjection",
  HandoffSelectedReferenceRouteSubject: "handoffSelectedReference",
  HandoffBattleMutationRouteSubject: "handoffBattleMutation",
  HandoffEncounterCompositionRouteSubject: "handoffEncounterComposition",
  HandoffParticipantMembershipRouteSubject: "handoffParticipantMembership",
  HandoffSubjectProfileAvailabilityRouteSubject:
    "handoffSubjectProfileAvailability",
  HandoffInitiativeCurrentActorRouteSubject: "handoffInitiativeCurrentActor",
} as const;

const HOLE_BY_TAG = {
  HandoffIdentityMatchHoleFamily: "identityMatch",
  HandoffHitPointProjectionHoleFamily: "hitPointProjection",
  HandoffSpellResourceProjectionHoleFamily: "spellResourceProjection",
  HandoffFeatureResourceProjectionHoleFamily: "featureResourceProjection",
  HandoffSettlementConflictHoleFamily: "settlementConflict",
} as const;

const FILL_BY_TAG = {
  HandoffSheetProjectionFill: "sheetProjection",
  HandoffBattleDeltaFill: "battleDelta",
  HandoffResourceDeltaFill: "resourceDelta",
  HandoffSettlementRejectionFill: "settlementRejection",
} as const;

const COMPOSITION_FACT_BY_TAG = {
  SheetDerivedParticipantCandidateRouteFact:
    "sheetDerivedParticipantCandidate",
  NonSheetParticipantMembershipRouteFact: "nonSheetParticipantMembership",
  EncounterSideRelationshipOwnershipRouteFact:
    "encounterSideRelationshipOwnership",
  SubjectProfileAvailabilityOwnershipRouteFact:
    "subjectProfileAvailabilityOwnership",
  InitiativeCountOwnershipRouteFact: "initiativeCountOwnership",
  StableInitiativeOrderOwnershipRouteFact:
    "stableInitiativeOrderOwnership",
  CurrentActorOwnershipRouteFact: "currentActorOwnership",
} as const;

const HANDOFF_FACT_BY_TAG = {
  HandoffSelectedReferenceRetentionFact: "selectedReferenceRetention",
  HandoffSourceExactSpellSlotDeltaFact: "sourceExactSpellSlotDelta",
  HandoffSourceExactPactSlotDeltaFact: "sourceExactPactSlotDelta",
  HandoffFeatureResourceDeltaFact: "featureResourceDelta",
  HandoffSettlementConflictFact: "settlementConflict",
  HandoffZeroHpStableLifecycleFact: "zeroHpStableLifecycle",
  HandoffBuildHitPointMaximumInputFact: "buildHitPointMaximumInput",
} as const;

const OWNER_BY_TAG = {
  CharacterBattleSheetOwner: "characterBattleSheet",
  CharacterBattleBuildProjectionOwner: "characterBattleBuildProjection",
  CharacterBattleInitProjectionOwner: "characterBattleInitProjection",
  CharacterBattleRuntimeOwner: "characterBattleRuntime",
  CharacterBattleSettlementOwner: "characterBattleSettlement",
  CharacterBattleResourceProjectionOwner: "characterBattleResourceProjection",
  CharacterBattleEncounterSetupOwner: "characterBattleEncounterSetup",
  CharacterBattleSubjectProfileOwner: "characterBattleSubjectProfile",
  CharacterBattleInitiativeOwner: "characterBattleInitiative",
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character battle route connector catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

type RouteProjection = {
  readonly route: readonly CharacterBattleRouteEvent[];
};

type RouteDriverSchema = Record<string, Record<string, never>>;
type RouteAppender = (
  route: readonly CharacterBattleRouteEvent[],
) => readonly CharacterBattleRouteEvent[];
type IndexedRouteActionMap<Schema extends RouteDriverSchema> = Partial<
  Record<
    keyof Schema,
    {
      readonly replayIndex: number;
      readonly append: RouteAppender;
    }
  >
>;

const battleInitRouteDriverSchema = {
  init: {},
  doProjectSheetHitPointsArmorClassConditionsAndProfiles: {},
  doProjectSheetSpellcastingAndMetamagic: {},
  doProjectPurePactMagicSlot: {},
  doRejectMixedSpellAndPactSlotInit: {},
  doRejectBuildMaximumAboveBuildMaximum: {},
  doRejectStableRecoveryProgressDuringInit: {},
  step: {},
} as const;

const originFeatRouteDriverSchema = {
  init: {},
  doFinalizeCriminalAlertOriginFeat: {},
  doProjectAlertInitiativeHandoff: {},
  step: {},
} as const;

const encounterCompositionRouteDriverSchema = {
  init: {},
  doProjectSheetCombatantForEncounter: {},
  doComposeParticipantMembership: {},
  doComposeSubjectProfiles: {},
  doComposeInitiativeCurrentActor: {},
  doEnterComposedBattleRuntime: {},
  step: {},
} as const;

const sheetDerivedBattleActsRouteDriverSchema = {
  init: {},
  doEnterSheetDerivedSessionBattle: {},
  doSettleSheetDerivedSpellSlot: {},
  step: {},
} as const;

const settlementRouteDriverSchema = {
  init: {},
  doSettleHitPointsConditionsSlotsAndPreservedSheetState: {},
  doSettlePurePactMagicSlotExpenditure: {},
  doRejectMixedSpellAndPactSlotSettlement: {},
  doSettleFeatureResourceExpenditure: {},
  doRejectAmbiguousCreatedSpellSlotSource: {},
  doRejectMismatchedCharacterIdentity: {},
  doRejectMaximumHpDrift: {},
  doRejectActiveWildShapeHandoff: {},
  doRejectActiveBattleStateHandoff: {},
  doRejectStableRecoveryProgressHandoff: {},
  doSettleZeroHpStableLifecycle: {},
  step: {},
} as const;

const lifecycleRouteDriverSchema = {
  init: {},
  doFinalizeDraftToBuild: {},
  doCreateSheetFromBuild: {},
  doProjectSheetToBattleInit: {},
  doResolveSkeletonShortswordAttack: {},
  doSettleBattleToSheet: {},
  step: {},
} as const;

const featureResourceRouteDriverSchema = {
  init: {},
  doLayOnHandsRestoresHpAndRemovesPoisoned: {},
  doRejectLayOnHandsOverspend: {},
  doLongRestClearsLayOnHandsPool: {},
  doShortRestRecoversUseCountPools: {},
  doLongRestClearsPointPoolAndUseState: {},
  doFontOfMagicSlotToPoints: {},
  doRejectFontOfMagicAmbiguousSlotSource: {},
  doFontOfMagicPointsToSlot: {},
  doRejectFontOfMagicInsufficientPoints: {},
  doShortRestPreservesUncannyUseState: {},
  doLongRestClearsUncannyUseState: {},
  doUncannyMetabolismRecoversFocusAndHeals: {},
  doRejectUncannyMetabolismRepeatUse: {},
  doMetamagicBridgeUsesSharedPointPool: {},
  step: {},
} as const;

const routeStateCheck = stateCheck(
  normalizeCharacterBattleRouteQuintState,
  (spec: RouteProjection, impl: RouteProjection) => {
    expect(impl.route).toEqual(spec.route);
    return true;
  },
);

describe("character battle reducer route connector MBT", () => {
  it("routes Character Sheet to battle init projection through handoff owners", async () => {
    await runRouteMbt({
      specFileName: "character-battle-init-projection.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        battleInitRouteDriverSchema,
        battleInitRouteActions,
        initialCharacterBattleInitProjectionRoute,
      ),
      maxSteps: 6,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Origin feat selected-reference handoff without authored dispatch", async () => {
    await runRouteMbt({
      specFileName:
        "character-battle-origin-feat-selected-identity.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        originFeatRouteDriverSchema,
        originFeatRouteActions,
        () => [],
      ),
      maxSteps: 2,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes sheet-derived encounter composition before battle entry", async () => {
    await runRouteMbt({
      specFileName: "character-battle-encounter-composition.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        encounterCompositionRouteDriverSchema,
        encounterCompositionRouteActions,
        initialCharacterBattleEncounterCompositionRoute,
      ),
      maxSteps: 5,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes sheet-derived battle acts and source-exact slot settlement", async () => {
    await runRouteMbt({
      specFileName: "character-session-sheet-derived-battle-acts.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        sheetDerivedBattleActsRouteDriverSchema,
        sheetDerivedBattleActsRouteActions,
        initialCharacterSessionSheetDerivedBattleActsRoute,
      ),
      maxSteps: 2,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes battle settlement back to sheet-owned resource state", async () => {
    await runRouteMbt({
      specFileName: "character-battle-settlement.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        settlementRouteDriverSchema,
        settlementRouteActions,
        initialCharacterBattleSettlementRoute,
      ),
      maxSteps: 11,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes character layer projection boundaries through existing owners", async () => {
    await runRouteMbt({
      specFileName: "character-layer-projection-lifecycle.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        lifecycleRouteDriverSchema,
        lifecycleRouteActions,
        initialCharacterLayerRoute,
      ),
      maxSteps: 5,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes feature-resource handoff through sheet and battle owners", async () => {
    await runRouteMbt({
      specFileName: "character-sheet-feature-resources.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        featureResourceRouteDriverSchema,
        featureResourceRouteActions,
        initialFeatureResourceHandoffRoute,
      ),
      maxSteps: 14,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

const battleInitRouteActions = indexedActionEntries(
  battleInitRouteDriverSchema,
  [
    [
      "doProjectSheetHitPointsArmorClassConditionsAndProfiles",
      initProjectionRouteStep(
        "doProjectSheetHitPointsArmorClassConditionsAndProfiles",
      ),
    ],
    [
      "doProjectSheetSpellcastingAndMetamagic",
      initProjectionRouteStep("doProjectSheetSpellcastingAndMetamagic"),
    ],
    [
      "doProjectPurePactMagicSlot",
      initProjectionRouteStep("doProjectPurePactMagicSlot"),
    ],
    [
      "doRejectMixedSpellAndPactSlotInit",
      initProjectionRouteStep("doRejectMixedSpellAndPactSlotInit"),
    ],
    [
      "doRejectBuildMaximumAboveBuildMaximum",
      initProjectionRouteStep("doRejectBuildMaximumAboveBuildMaximum"),
    ],
    [
      "doRejectStableRecoveryProgressDuringInit",
      initProjectionRouteStep("doRejectStableRecoveryProgressDuringInit"),
    ],
  ],
);

const originFeatRouteActions = indexedActionEntries(originFeatRouteDriverSchema, [
  [
    "doFinalizeCriminalAlertOriginFeat",
    originFeatSelectedReferenceRetentionRoute,
  ],
  [
    "doProjectAlertInitiativeHandoff",
    originFeatSelectedReferenceInitiativeHandoffRoute,
  ],
]);

const encounterCompositionRouteActions = indexedActionEntries(
  encounterCompositionRouteDriverSchema,
  [
    [
      "doProjectSheetCombatantForEncounter",
      encounterCompositionRouteStep("doProjectSheetCombatantForEncounter"),
    ],
    [
      "doComposeParticipantMembership",
      encounterCompositionRouteStep("doComposeParticipantMembership"),
    ],
    [
      "doComposeSubjectProfiles",
      encounterCompositionRouteStep("doComposeSubjectProfiles"),
    ],
    [
      "doComposeInitiativeCurrentActor",
      encounterCompositionRouteStep("doComposeInitiativeCurrentActor"),
    ],
    [
      "doEnterComposedBattleRuntime",
      encounterCompositionRouteStep("doEnterComposedBattleRuntime"),
    ],
  ],
);

const sheetDerivedBattleActsRouteActions = indexedActionEntries(
  sheetDerivedBattleActsRouteDriverSchema,
  [
    [
      "doEnterSheetDerivedSessionBattle",
      sheetDerivedBattleActsRouteStep("doEnterSheetDerivedSessionBattle"),
    ],
    [
      "doSettleSheetDerivedSpellSlot",
      sheetDerivedBattleActsRouteStep("doSettleSheetDerivedSpellSlot"),
    ],
  ],
);

const settlementRouteActions = indexedActionEntries(settlementRouteDriverSchema, [
  ...CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS.map(
    (action) => [action, settlementRouteStep(action)] as const,
  ),
]);

const lifecycleRouteActions = indexedActionEntries(lifecycleRouteDriverSchema, [
  ["doFinalizeDraftToBuild", finalizeDraftToBuildRoute],
  ["doCreateSheetFromBuild", createSheetFromBuildRoute],
  ["doProjectSheetToBattleInit", projectSheetToBattleInitRoute],
  ["doResolveSkeletonShortswordAttack", resolveBattleRuntimeRoute],
  ["doSettleBattleToSheet", settleBattleToSheetRoute],
]);

const featureResourceRouteActions = indexedActionEntries(
  featureResourceRouteDriverSchema,
  [
    [
      "doLayOnHandsRestoresHpAndRemovesPoisoned",
      acceptedFeatureResourceWithHitPointRoute,
    ],
    [
      "doRejectLayOnHandsOverspend",
      rejectedFeatureResourceRoute(["featureResourceProjection"]),
    ],
    ["doLongRestClearsLayOnHandsPool", acceptedFeatureResourceRoute],
    ["doShortRestRecoversUseCountPools", acceptedFeatureResourceRoute],
    ["doLongRestClearsPointPoolAndUseState", acceptedFeatureResourceRoute],
    ["doFontOfMagicSlotToPoints", acceptedSpellResourceRoute],
    [
      "doRejectFontOfMagicAmbiguousSlotSource",
      rejectedSpellResourceRoute([
        "spellResourceProjection",
        "settlementConflict",
      ]),
    ],
    ["doFontOfMagicPointsToSlot", acceptedSpellResourceRoute],
    [
      "doRejectFontOfMagicInsufficientPoints",
      rejectedFeatureResourceRoute(["featureResourceProjection"]),
    ],
    ["doShortRestPreservesUncannyUseState", acceptedFeatureResourceRoute],
    ["doLongRestClearsUncannyUseState", acceptedFeatureResourceRoute],
    [
      "doUncannyMetabolismRecoversFocusAndHeals",
      acceptedFeatureResourceWithHitPointRoute,
    ],
    [
      "doRejectUncannyMetabolismRepeatUse",
      rejectedFeatureResourceRoute(["featureResourceProjection"]),
    ],
    ["doMetamagicBridgeUsesSharedPointPool", metamagicBattleBridgeRoute],
  ],
);

function originFeatSelectedReferenceRetentionRoute(): readonly CharacterBattleRouteEvent[] {
  const build = criminalAlertRouteBuild();
  const projection = characterSheetBattleInitWithRoute({
    sheet: characterSheetForBuild(build),
    unitLibrary,
    statBlockCatalog,
    combatantId: combatantId("combatant:route-origin-feat-retention"),
    displayName: "Route Origin Feat Retention",
    initiative: alertInitiativeScoreForBuild(build),
    side: battleCombatantSide("party"),
  });
  if (Either.isLeft(projection)) {
    throw new Error(projection.left.issue.message);
  }
  return selectedReferenceRouteEvents(projection.right.routeEvents).filter(
    (event) => event.owner === "characterBattleBuildProjection",
  );
}

function originFeatSelectedReferenceInitiativeHandoffRoute(): readonly CharacterBattleRouteEvent[] {
  const build = criminalAlertRouteBuild();
  const entry = startBattleFromCharacterSheetAndStatBlock({
    battleId: battleId("battle:route-origin-feat-runtime-entry"),
    character: {
      sheet: characterSheetForBuild(build),
      unitLibrary,
      statBlockCatalog,
      combatantId: combatantId("combatant:route-origin-feat-runtime-entry"),
      displayName: "Route Origin Feat Runtime Entry",
      initiative: alertInitiativeScoreForBuild(build),
      side: battleCombatantSide("party"),
    },
    statBlockBattleInput: {
      combatantId: combatantId("combatant:route-origin-feat-skeleton"),
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      initiative: initiativeScore(10),
      side: battleCombatantSide("monsters"),
    },
  });
  if (Either.isLeft(entry)) {
    throw new Error(entry.left.issue.message);
  }
  return selectedReferenceRouteEvents(entry.right.initProjectionRouteEvents);
}

function criminalAlertRouteBuild(): CharacterBuild {
  return finalizedFighterBuildForBackground({
    backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
    asiOptionId: "two_and_one:dex:con",
    toolOptionId: "thieves_tools",
  });
}

function selectedReferenceRouteEvents(
  routeEvents: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return routeEvents.filter(
    (event) => event.subject === "handoffSelectedReference",
  );
}

function characterSheetForBuild(build: CharacterBuild) {
  const sheet = createFreshCharacterSheet({
    characterId: characterSheetId("character:route-origin-feat"),
    build,
    currentHp: Hp(10),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary,
  });
  if (Either.isLeft(sheet)) {
    throw new Error(sheet.left.message);
  }
  return sheet.right;
}

function alertInitiativeScoreForBuild(build: CharacterBuild) {
  const score = characterBattleInitiativeScore({
    build,
    unitLibrary,
    rollTotal: 14,
    proficiencyBonusChoice: "add",
  });
  if (Either.isLeft(score)) {
    throw new Error(score.left.message);
  }
  return score.right;
}

function initProjectionRouteStep(
  action: CharacterBattleInitProjectionRouteAction,
): RouteAppender {
  return (route) => characterBattleInitProjectionRouteStep(route, action);
}

function encounterCompositionRouteStep(
  action: CharacterBattleEncounterCompositionRouteAction,
): RouteAppender {
  return (route) => characterBattleEncounterCompositionRouteStep(route, action);
}

function sheetDerivedBattleActsRouteStep(
  action: CharacterSessionSheetDerivedBattleActsRouteAction,
): RouteAppender {
  return (route) => characterSessionSheetDerivedBattleActsRouteStep(route, action);
}

function settlementRouteStep(
  action: CharacterBattleSettlementRouteAction,
): RouteAppender {
  return (route) => characterBattleSettlementRouteStep(route, action);
}

function initialCharacterLayerRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
}

function initialFeatureResourceHandoffRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    projectCharacterSheetToBattle({
      subject: "handoffFeatureResourceProjection",
      owner: "characterBattleSheet",
    }),
  ];
}

function finalizeDraftToBuildRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "sheetToBattleInit",
      facts: ["buildHitPointMaximumInput"],
      owner: "characterBattleBuildProjection",
    }),
  ];
}

function createSheetFromBuildRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleSheet",
    }),
  ];
}

function projectSheetToBattleInitRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    enterBattleRuntime({
      subject: "sheetToBattleInit",
      owner: "characterBattleInitProjection",
    }),
  ];
}

function resolveBattleRuntimeRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    enterBattleRuntime({
      subject: "handoffBattleMutation",
      owner: "characterBattleRuntime",
    }),
  ];
}

function settleBattleToSheetRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    settleBattleToCharacterSheet({
      subject: "battleToSheetSettlement",
      fill: "battleDelta",
      holes: [],
      owner: "characterBattleSettlement",
    }),
  ];
}

function acceptedFeatureResourceRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "handoffFeatureResourceProjection",
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffFeatureResourceProjection",
      facts: ["featureResourceDelta"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function acceptedFeatureResourceWithHitPointRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...acceptedFeatureResourceRoute(route),
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleSheet",
    }),
  ];
}

function rejectedFeatureResourceRoute(
  holes: readonly CharacterBattleRouteHole[],
): RouteAppender {
  return (route) => [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "handoffFeatureResourceProjection",
      fill: "resourceDelta",
      holes,
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffFeatureResourceProjection",
      facts: ["settlementConflict"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function acceptedSpellResourceRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...acceptedFeatureResourceRoute(route),
    projectCharacterSheetToBattle({
      subject: "handoffResourceProjection",
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffResourceProjection",
      facts: ["sourceExactSpellSlotDelta"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function rejectedSpellResourceRoute(
  holes: readonly CharacterBattleRouteHole[],
): RouteAppender {
  return (route) => [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "handoffResourceProjection",
      fill: "resourceDelta",
      holes,
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffResourceProjection",
      facts: ["settlementConflict"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function metamagicBattleBridgeRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...acceptedFeatureResourceRoute(route),
    enterBattleRuntime({
      subject: "handoffBattleMutation",
      owner: "characterBattleRuntime",
    }),
    enterBattleRuntime({
      subject: "handoffResourceProjection",
      owner: "characterBattleRuntime",
    }),
  ];
}

function finalizedFighterBuildForBackground(input: {
  readonly backgroundUnitId: string;
  readonly asiOptionId: string;
  readonly toolOptionId: string;
}): CharacterBuild {
  const finalized = finalizeCharacterDraft({
    draft: completeFighterDraftForBackground(input),
    unitLibrary,
  });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected ${input.backgroundUnitId} origin feat route draft to finalize, received ${finalized.tag}.`,
    );
  }
  return finalized.build;
}

function completeFighterDraftForBackground(input: {
  readonly backgroundUnitId: string;
  readonly asiOptionId: string;
  readonly toolOptionId: string;
}): CharacterDraft {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(`route-origin-feat-${input.backgroundUnitId}`),
  });
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
        choiceFill("cc:draft:draft.background", input.backgroundUnitId),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: expectRight(
            abilityScoreAssignment({
              str: 15,
              dex: 14,
              con: 13,
              int: 8,
              wis: 10,
              cha: 12,
            }),
          ),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          unitChoiceHoleId(
            "fighter_fighting_style",
            "class_feature_feat_choice",
          ),
          "defense",
        ),
        choiceFill(
          unitChoiceHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          unitChoiceHoleId(
            input.backgroundUnitId,
            "background_ability_score_increase",
          ),
          input.asiOptionId,
        ),
        choiceFill(
          unitChoiceHoleId(input.backgroundUnitId, "background_tool_choice"),
          input.toolOptionId,
        ),
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          unitChoiceHoleId(
            input.backgroundUnitId,
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          loadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted origin feat route fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }

  return result.draft;
}

function choiceFill(
  holeId: CreationHoleIdText,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: creationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function unitChoiceHoleId(
  unitId: string,
  choiceKey: UnitChoiceKey,
): CreationHoleIdText {
  const parsedUnitId = unitChoiceSourceUnitId(unitId);
  if (Either.isLeft(parsedUnitId)) {
    throw new Error(`Invalid route Unit choice source Unit id ${unitId}.`);
  }
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: parsedUnitId.right,
    choiceKey,
  });
}

function loadoutHoleId(
  equipmentUnitId: string,
  slot: LoadoutSlot,
): CreationHoleIdText {
  const parsedEquipmentUnitId = loadoutEquipmentUnitId(equipmentUnitId);
  if (Either.isLeft(parsedEquipmentUnitId)) {
    throw new Error(
      `Invalid route loadout equipment Unit id ${equipmentUnitId}.`,
    );
  }
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: parsedEquipmentUnitId.right,
    slot,
  });
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right, received ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function indexedActionEntries<const Schema extends RouteDriverSchema>(
  _schema: Schema,
  entries: readonly (readonly [keyof Schema, RouteAppender])[],
): IndexedRouteActionMap<Schema> {
  const out: Partial<
    Record<
      keyof Schema,
      { readonly replayIndex: number; readonly append: RouteAppender }
    >
  > = {};
  entries.forEach(([actionName, append], replayIndex) => {
    out[actionName] = { replayIndex, append };
  });
  return out;
}

function createIndexedRouteDriver<const Schema extends RouteDriverSchema>(
  schema: Schema,
  actionRoutes: IndexedRouteActionMap<Schema>,
  initialRoute: () => readonly CharacterBattleRouteEvent[],
) {
  return defineDriver(schema, () => {
    let replayIndex = 0;
    let route = initialRoute();
    const handlers: Partial<Record<keyof Schema, () => void>> = {};

    for (const actionName of Object.keys(schema) as Array<keyof Schema>) {
      if (actionName === "init") {
        handlers[actionName] = () => {
          replayIndex = 0;
          route = initialRoute();
        };
        continue;
      }
      if (actionName === "step") {
        handlers[actionName] = () => {};
        continue;
      }
      const routeForAction = actionRoutes[actionName];
      handlers[actionName] =
        routeForAction === undefined
          ? () => {}
          : () => {
              if (replayIndex !== routeForAction.replayIndex) return;
              route = routeForAction.append(route);
              replayIndex += 1;
            };
    }

    return {
      ...(handlers as Record<keyof Schema, () => void>),
      getState: (): RouteProjection => ({ route }),
    };
  });
}

async function runRouteMbt<Actions extends SimpleActionMap>(input: {
  readonly specFileName: string;
  readonly driver: () => SimpleDriver<RouteProjection, Actions>;
  readonly maxSteps: number;
}): Promise<void> {
  await run({
    spec: path.resolve(import.meta.dirname, "..", input.specFileName),
    init: "init",
    step: "step",
    driver: input.driver,
    backend: "typescript",
    nTraces: mbtTraceCount(),
    maxSteps: input.maxSteps,
    stateCheck: routeStateCheck,
  });
}

function mbtTraceCount(): number {
  return numberFromEnv("MBT_TRACES", 1);
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCharacterBattleRouteQuintState(
  raw: unknown,
): RouteProjection {
  const root = quintStateRecord(raw);
  const state = Object.hasOwn(root, "qState")
    ? quintRecordField(root, "qState")
    : root;
  return {
    route: decodeCharacterBattleRoute(quintField(state, "qRoute")),
  };
}

function decodeCharacterBattleRoute(
  raw: unknown,
): readonly CharacterBattleRouteEvent[] {
  return quintList(raw, "qRoute").map(decodeCharacterBattleRouteEvent);
}

function decodeCharacterBattleRouteEvent(
  raw: unknown,
): CharacterBattleRouteEvent {
  const tag = quintVariantTag(raw, "qRoute[]");
  if (tag === "RouteProjectCharacterSheetToBattle") {
    const payload = routePayload(raw, tag);
    return projectCharacterSheetToBattle({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteEnterBattleRuntime") {
    const payload = routePayload(raw, tag);
    return enterBattleRuntime({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteComposeBattleEncounter") {
    const payload = routePayload(raw, tag);
    return composeBattleEncounter({
      subject: routeSubject(quintField(payload, "subject")),
      facts: routeCompositionFacts(quintField(payload, "facts")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteSettleBattleToCharacterSheet") {
    const payload = routePayload(raw, tag);
    return settleBattleToCharacterSheet({
      subject: routeSubject(quintField(payload, "subject")),
      fill: routeFill(quintField(payload, "fill")),
      holes: routeHoles(quintField(payload, "holes")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteRejectCharacterBattleHandoff") {
    const payload = routePayload(raw, tag);
    return rejectCharacterBattleHandoff({
      subject: routeSubject(quintField(payload, "subject")),
      fill: routeFill(quintField(payload, "fill")),
      holes: routeHoles(quintField(payload, "holes")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteRecordCharacterBattleHandoffFacts") {
    const payload = routePayload(raw, tag);
    return recordCharacterBattleHandoffFacts({
      subject: routeSubject(quintField(payload, "subject")),
      facts: routeHandoffFacts(quintField(payload, "facts")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  throw new Error(`Unknown character-battle route event: ${tag}.`);
}

function routePayload(
  raw: unknown,
  expectedTag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, expectedTag, "qRoute[]");
  if (isRecord(value)) return value;
  throw new Error(`Expected character-battle route ${expectedTag} payload.`);
}

function routeSubject(raw: unknown): CharacterBattleRouteSubject {
  return mappedVariant(raw, SUBJECT_BY_TAG, "character-battle route subject");
}

function routeOwner(raw: unknown): CharacterBattleRouteOwner {
  return mappedVariant(raw, OWNER_BY_TAG, "character-battle route owner");
}

function routeHole(raw: unknown): CharacterBattleRouteHole {
  return mappedVariant(raw, HOLE_BY_TAG, "character-battle route hole");
}

function routeHoles(raw: unknown): readonly CharacterBattleRouteHole[] {
  return uniqueSorted(quintSet(raw, "qRoute[].holes").map(routeHole));
}

function routeCompositionFact(raw: unknown): CharacterBattleRouteCompositionFact {
  return mappedVariant(
    raw,
    COMPOSITION_FACT_BY_TAG,
    "character-battle route composition fact",
  );
}

function routeCompositionFacts(
  raw: unknown,
): readonly CharacterBattleRouteCompositionFact[] {
  return uniqueSorted(
    quintSet(raw, "qRoute[].facts").map(routeCompositionFact),
  );
}

function routeHandoffFact(raw: unknown): CharacterBattleRouteHandoffFact {
  return mappedVariant(
    raw,
    HANDOFF_FACT_BY_TAG,
    "character-battle route handoff fact",
  );
}

function routeHandoffFacts(
  raw: unknown,
): readonly CharacterBattleRouteHandoffFact[] {
  return uniqueSorted(quintSet(raw, "qRoute[].facts").map(routeHandoffFact));
}

function routeFill(raw: unknown): CharacterBattleRouteFill {
  return mappedVariant(raw, FILL_BY_TAG, "character-battle route fill");
}

function mappedVariant<
  const Value extends string,
  const Mapping extends Readonly<Record<string, Value>>,
>(raw: unknown, mapping: Mapping, label: string): Value {
  const tag = quintVariantTag(raw, label);
  if (hasOwnKey(mapping, tag)) {
    return mapping[tag];
  }
  throw new Error(`Unknown ${label}: ${tag}.`);
}

function hasOwnKey<T extends object>(
  value: T,
  key: PropertyKey,
): key is keyof T {
  return Object.hasOwn(value, key);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (isRecord(raw)) return raw;
  throw new Error("Expected Quint state to be an object.");
}

function quintField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): unknown {
  if (Object.hasOwn(state, field)) return state[field];
  throw new Error(`Expected Quint state field ${field}.`);
}

function quintRecordField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintField(state, field);
  if (isRecord(value)) return value;
  throw new Error(`Expected Quint state field ${field} to be a record.`);
}

function quintList(raw: unknown, field: string): readonly unknown[] {
  if (Array.isArray(raw)) return raw;
  throw new Error(`Expected Quint list field ${field}.`);
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  throw new Error(`Expected Quint set field ${field}.`);
}

function quintVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (isRecord(raw) && typeof raw["tag"] === "string") return raw["tag"];
  throw new Error(`Expected Quint variant tag field ${field}.`);
}

function quintVariantValue(
  raw: unknown,
  expectedTag: string,
  field: string,
): unknown {
  if (
    isRecord(raw) &&
    raw["tag"] === expectedTag &&
    Object.hasOwn(raw, "value")
  ) {
    return raw["value"];
  }
  throw new Error(`Expected Quint ${expectedTag} variant value field ${field}.`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted<const Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
