import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import * as path from "node:path";

import {
  type AvailableBattleAct,
  battleActSpellPresentation,
  battleAmmunitionStock,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  battleCreatureInitFromStatBlock as parseBattleCreatureInitFromStatBlock,
  battleId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  classUnitId,
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  DRUID_WILD_SHAPE_UNIT_ID,
  fillCreationHoles,
  finalizeCharacterDraft,
  copperPieceAmount,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  MONK_MONKS_FOCUS_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  sorcererMetamagicOptionId,
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
  applyLayOnHands,
  characterSheetCurrentHp,
  characterSheetTempHp,
  characterSheetId,
  completeLongRest,
  completeShortRest,
  convertFontOfMagicSorceryPointsToSpellSlot,
  convertFontOfMagicSpellSlotToSorceryPoints,
  createFreshCharacterSheet,
  finishLongRest,
  finishShortRest,
  startLongRest,
  startShortRest,
  useMonkUncannyMetabolismWhenRollingInitiative,
  type CharacterSheet,
  type CharacterSheetInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
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
  appendCharacterBattleFeatureResourceHandoffRoute,
  characterBattleInitiativeScore,
  characterSheetBattleInit,
  characterBattleEncounterCompositionRouteStep,
  characterBattleInitProjectionRouteStep,
  characterBattleSettlementRouteStep,
  characterSessionSheetDerivedBattleActsRouteStep,
  CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS,
  composeBattleEncounterRoute as composeBattleEncounter,
  enterBattleRuntimeRoute as enterBattleRuntime,
  initialCharacterBattleFeatureResourceHandoffRoute,
  initialCharacterBattleEncounterCompositionRoute,
  initialCharacterBattleInitProjectionRoute,
  initialCharacterBattleSettlementRoute,
  initialCharacterSessionSheetDerivedBattleActsRoute,
  projectCharacterSheetToBattleRoute as projectCharacterSheetToBattle,
  recordCharacterBattleHandoffFactsRoute as recordCharacterBattleHandoffFacts,
  rejectCharacterBattleHandoffRoute as rejectCharacterBattleHandoff,
  settleBattleToCharacterSheetRoute as settleBattleToCharacterSheet,
  characterSheetBattleInitWithRoute,
  settleCharacterSheetFromBattle,
  startBattleFromCharacterSheetAndStatBlock,
  characterBattleRuntimeIssueMessage,
  type CharacterBattleFeatureResourceRouteObservation,
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

import { testAmmunitionStocksForStatBlock } from "./ammunition-stock.test-support.ts";

function battleCreatureInitFromStatBlock(
  input: Omit<
    Parameters<typeof parseBattleCreatureInitFromStatBlock>[0],
    "ammunitionStocks"
  >,
) {
  return expectRight(
    parseBattleCreatureInitFromStatBlock({
      ...input,
      ammunitionStocks: testAmmunitionStocksForStatBlock(input.statBlock),
    }),
  );
}

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
  SheetDerivedParticipantCandidateRouteFact: "sheetDerivedParticipantCandidate",
  NonSheetParticipantMembershipRouteFact: "nonSheetParticipantMembership",
  SubjectProfileAvailabilityOwnershipRouteFact:
    "subjectProfileAvailabilityOwnership",
  InitiativeCountOwnershipRouteFact: "initiativeCountOwnership",
  StableInitiativeOrderOwnershipRouteFact: "stableInitiativeOrderOwnership",
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
  it(
    "routes Character Sheet to battle init projection through handoff owners",
    async () => {
      await runRouteMbt({
        specFileName: "character-battle-init-projection.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          battleInitRouteDriverSchema,
          battleInitRouteActions,
          initialCharacterBattleInitProjectionRoute,
        ),
        maxSteps: 6,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Origin feat selected-reference handoff without authored dispatch",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes sheet-derived encounter composition before battle entry",
    async () => {
      await runRouteMbt({
        specFileName: "character-battle-encounter-composition.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          encounterCompositionRouteDriverSchema,
          encounterCompositionRouteActions,
          initialCharacterBattleEncounterCompositionRoute,
        ),
        maxSteps: 5,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes sheet-derived battle acts and source-exact slot settlement",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-session-sheet-derived-battle-acts.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          sheetDerivedBattleActsRouteDriverSchema,
          sheetDerivedBattleActsRouteActions,
          initialCharacterSessionSheetDerivedBattleActsRoute,
        ),
        maxSteps: 2,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes battle settlement back to sheet-owned resource state",
    async () => {
      await runRouteMbt({
        specFileName: "character-battle-settlement.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          settlementRouteDriverSchema,
          settlementRouteActions,
          initialCharacterBattleSettlementRoute,
        ),
        maxSteps: 11,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes character layer projection boundaries through existing owners",
    async () => {
      await runRouteMbt({
        specFileName: "character-layer-projection-lifecycle.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          lifecycleRouteDriverSchema,
          lifecycleRouteActions,
          initialCharacterLayerRoute,
        ),
        maxSteps: 5,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes feature-resource handoff through sheet and battle owners",
    async () => {
      await runRouteMbt({
        specFileName: "character-sheet-feature-resources.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          featureResourceRouteDriverSchema,
          featureResourceRouteActions,
          initialCharacterBattleFeatureResourceHandoffRoute,
        ),
        maxSteps: 14,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
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

const originFeatRouteActions = indexedActionEntries(
  originFeatRouteDriverSchema,
  [
    [
      "doFinalizeCriminalAlertOriginFeat",
      originFeatSelectedReferenceRetentionRoute,
    ],
    [
      "doProjectAlertInitiativeHandoff",
      originFeatSelectedReferenceInitiativeHandoffRoute,
    ],
  ],
);

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

const settlementRouteActions = indexedActionEntries(
  settlementRouteDriverSchema,
  [
    ...CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS.map(
      (action) => [action, settlementRouteStep(action)] as const,
    ),
  ],
);

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
      layOnHandsRestoresHpAndRemovesPoisonedRoute,
    ],
    ["doRejectLayOnHandsOverspend", rejectLayOnHandsOverspendRoute],
    ["doLongRestClearsLayOnHandsPool", longRestClearsLayOnHandsPoolRoute],
    ["doShortRestRecoversUseCountPools", shortRestRecoversUseCountPoolsRoute],
    [
      "doLongRestClearsPointPoolAndUseState",
      longRestClearsPointPoolAndUseStateRoute,
    ],
    ["doFontOfMagicSlotToPoints", fontOfMagicSlotToPointsRoute],
    [
      "doRejectFontOfMagicAmbiguousSlotSource",
      rejectFontOfMagicAmbiguousSlotSourceRoute,
    ],
    ["doFontOfMagicPointsToSlot", fontOfMagicPointsToSlotRoute],
    [
      "doRejectFontOfMagicInsufficientPoints",
      rejectFontOfMagicInsufficientPointsRoute,
    ],
    [
      "doShortRestPreservesUncannyUseState",
      shortRestPreservesUncannyUseStateRoute,
    ],
    ["doLongRestClearsUncannyUseState", longRestClearsUncannyUseStateRoute],
    [
      "doUncannyMetabolismRecoversFocusAndHeals",
      uncannyMetabolismRecoversFocusAndHealsRoute,
    ],
    [
      "doRejectUncannyMetabolismRepeatUse",
      rejectUncannyMetabolismRepeatUseRoute,
    ],
    [
      "doMetamagicBridgeUsesSharedPointPool",
      metamagicBridgeUsesSharedPointPoolRoute,
    ],
  ],
);

function layOnHandsRestoresHpAndRemovesPoisonedRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const source = featureResourceSheetFixture({
    characterIdText: "character:route-lay-on-hands-source",
    build: featureResourceBaseBuild({
      startingClass: "class_paladin",
      advancements: ["class_paladin"],
    }),
    currentHp: 12,
  });
  const target = featureResourceSheetFixture({
    characterIdText: "character:route-lay-on-hands-target",
    build: featureResourceBaseBuild({ startingClass: "class_fighter" }),
    currentHp: 3,
    conditions: ["poisoned"],
  });
  const result = applyLayOnHands({
    source,
    target,
    unitLibrary,
    restoreHp: Hp(2),
    removePoisoned: true,
  });
  const accepted = expectRight(result);
  expect(characterSheetCurrentHp(accepted.target)).toBe(5);
  expect(accepted.target.conditions).not.toContain("poisoned");
  return appendObservedFeatureResourceRoute(route, {
    tag: "layOnHands",
    result,
  });
}

function rejectLayOnHandsOverspendRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-lay-on-hands-overspend",
    build: featureResourceBaseBuild({ startingClass: "class_paladin" }),
    currentHp: 6,
    conditions: ["poisoned"],
  });
  const result = applyLayOnHands({
    source: sheet,
    target: sheet,
    unitLibrary,
    restoreHp: Hp(1),
    removePoisoned: true,
  });
  expect(Either.isLeft(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "layOnHands",
    result,
  });
}

function longRestClearsLayOnHandsPoolRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const source = featureResourceSheetFixture({
    characterIdText: "character:route-lay-on-hands-long-rest",
    build: featureResourceBaseBuild({ startingClass: "class_paladin" }),
    currentHp: 6,
  });
  const spent = expectRight(
    applyLayOnHands({
      source,
      target: source,
      unitLibrary,
      restoreHp: Hp(4),
      removePoisoned: false,
    }),
  ).source;
  const result = completeLongRestForFeatureResourceRoute(spent);
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "featureResourceRest",
    result,
  });
}

function shortRestRecoversUseCountPoolsRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const druid = featureResourceSheetFixture({
    characterIdText: "character:route-druid-use-count-short-rest",
    build: featureResourceBaseBuild({
      startingClass: "class_druid",
      advancements: ["class_druid"],
    }),
    currentHp: 15,
    druidWildShapeKnownFormStatBlockIds: [
      authoredStatBlockId("stat_block_rat"),
      authoredStatBlockId("stat_block_riding_horse"),
      authoredStatBlockId("stat_block_spider"),
      authoredStatBlockId("stat_block_wolf"),
    ],
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: DRUID_WILD_SHAPE_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const monk = featureResourceSheetFixture({
    characterIdText: "character:route-monk-focus-short-rest",
    build: featureResourceMonkBuild(2),
    currentHp: 15,
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const druidResult = completeShortRestForFeatureResourceRoute(druid);
  const monkResult = completeShortRestForFeatureResourceRoute(monk);
  expect(Either.isRight(druidResult)).toBe(true);
  expect(Either.isRight(monkResult)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "featureResourceRest",
    result: monkResult,
  });
}

function longRestClearsPointPoolAndUseStateRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-sorcerer-point-pool-long-rest",
    build: featureResourceSorcererFontOfMagicBuild({ level: 2 }),
    currentHp: 12,
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const result = completeLongRestForFeatureResourceRoute(sheet);
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "featureResourceRest",
    result,
  });
}

function fontOfMagicSlotToPointsRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-font-slot-to-points",
    build: featureResourceSorcererFontOfMagicBuild({
      level: 3,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    }),
    currentHp: 17,
    spellSlotExpenditures: [
      { spellLevel: spellSlotLevel(2), expended: resourceCount(1) },
    ],
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(3),
      },
    ],
  });
  const result = convertFontOfMagicSpellSlotToSorceryPoints({
    sheet,
    unitLibrary,
    spellLevel: spellSlotLevel(2),
  });
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "fontOfMagicSlotToPoints",
    result,
  });
}

function rejectFontOfMagicAmbiguousSlotSourceRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const created = fontOfMagicCreatedLevel3RouteSheet();
  const result = convertFontOfMagicSpellSlotToSorceryPoints({
    sheet: created,
    unitLibrary,
    spellLevel: spellSlotLevel(3),
  });
  expect(Either.isLeft(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "fontOfMagicSlotToPoints",
    result,
  });
}

function fontOfMagicPointsToSlotRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-font-points-to-slot",
    build: featureResourceSorcererFontOfMagicBuild({
      level: 5,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    }),
    currentHp: 24,
  });
  const result = convertFontOfMagicSorceryPointsToSpellSlot({
    sheet,
    unitLibrary,
    spellLevel: spellSlotLevel(3),
  });
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "fontOfMagicPointsToSlot",
    result,
  });
}

function rejectFontOfMagicInsufficientPointsRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-font-insufficient-points",
    build: featureResourceSorcererFontOfMagicBuild({
      level: 3,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    }),
    currentHp: 17,
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(1),
      },
    ],
  });
  const result = convertFontOfMagicSorceryPointsToSpellSlot({
    sheet,
    unitLibrary,
    spellLevel: spellSlotLevel(2),
  });
  expect(Either.isLeft(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "fontOfMagicPointsToSlot",
    result,
  });
}

function shortRestPreservesUncannyUseStateRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-uncanny-short-rest",
    build: featureResourceMonkBuild(2),
    currentHp: 15,
    restFeatureUses: [{ tag: "uncannyMetabolism", usedSinceLongRest: true }],
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const result = completeShortRestForFeatureResourceRoute(sheet);
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "featureResourceRest",
    result,
  });
}

function longRestClearsUncannyUseStateRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-uncanny-long-rest",
    build: featureResourceMonkBuild(2),
    currentHp: 15,
    restFeatureUses: [{ tag: "uncannyMetabolism", usedSinceLongRest: true }],
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const result = completeLongRestForFeatureResourceRoute(sheet);
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "featureResourceRest",
    result,
  });
}

function uncannyMetabolismRecoversFocusAndHealsRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-uncanny-use",
    build: featureResourceMonkBuild(2),
    currentHp: 8,
    tempHp: 3,
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const result = useMonkUncannyMetabolismWhenRollingInitiative({
    sheet,
    unitLibrary,
    martialArtsRoll: DieRollResult(4),
  });
  const recovered = expectRight(result);
  expect(characterSheetCurrentHp(recovered)).toBe(14);
  expect(characterSheetTempHp(recovered)).toBe(3);
  return appendObservedFeatureResourceRoute(route, {
    tag: "uncannyMetabolism",
    result,
  });
}

function rejectUncannyMetabolismRepeatUseRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const used = expectRight(
    useMonkUncannyMetabolismWhenRollingInitiative({
      sheet: featureResourceSheetFixture({
        characterIdText: "character:route-uncanny-repeat",
        build: featureResourceMonkBuild(2),
        currentHp: 8,
        tempHp: 3,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
      unitLibrary,
      martialArtsRoll: DieRollResult(4),
    }),
  );
  const result = useMonkUncannyMetabolismWhenRollingInitiative({
    sheet: used,
    unitLibrary,
    martialArtsRoll: DieRollResult(4),
  });
  expect(Either.isLeft(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "uncannyMetabolism",
    result,
  });
}

function metamagicBridgeUsesSharedPointPoolRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  const characterSheetIdValue = characterSheetId(
    "character:route-metamagic-feature-resource-bridge",
  );
  const sorcererCombatantId = combatantId(
    "combatant:route-metamagic-feature-resource-bridge",
  );
  const sheet = featureResourceSheetFixture({
    characterIdText: characterSheetIdValue,
    build: featureResourceSorcererMetamagicBuild(),
    currentHp: 24,
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(1),
      },
    ],
  });
  const characterInit = expectRight(
    characterSheetBattleInit({
      sheet,
      unitLibrary,
      statBlockCatalog,
      combatantId: sorcererCombatantId,
      displayName: "Sorcerer",
      initiative: initiativeScore(12),
      ammunitionStocks: [],
    }),
  );
  if (characterInit.creatureInit.kind !== "character") {
    throw new Error("Expected character battle creature init.");
  }
  const targetCombatantId = combatantId("combatant:route-metamagic-skeleton");
  const battle = expectRight(
    startBattle({
      battleId: battleId("battle:route-metamagic-feature-resource-bridge"),
      combatants: [
        characterInit,
        battleCreatureInitFromStatBlock({
          combatantId: targetCombatantId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
        }),
      ],
    }),
  );
  const act = requireHeightenedBurningHandsAct(battle, sorcererCombatantId);
  const heightenedTargetHole = requireBattleHoleFromList(
    act.initialHoles,
    "targetChoice",
  );
  const heightenedTarget = targetChoiceFill(
    heightenedTargetHole,
    targetCombatantId,
  );
  const awaitingSave = resolveBattleSubject({
    state: battle.state,
    subject: act.subject,
    fills: [heightenedTarget],
  });
  const saveHole = requireBattleHole(awaitingSave, "savingThrowOutcome");
  const failedSave = areaSavingThrowOutcomeFill(saveHole, sorcererCombatantId, [
    { targetId: targetCombatantId, succeeded: false },
  ]);
  const awaitingDamage = resolveBattleSubject({
    state: battle.state,
    subject: act.subject,
    fills: [heightenedTarget, failedSave],
  });
  const damageHole = requireBattleHole(awaitingDamage, "rolledDice");
  const resolved = requireBattleResolved(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [
        heightenedTarget,
        failedSave,
        damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
      ],
    }),
  );
  const settledCombatant = resolved.state.combatants.get(sorcererCombatantId);
  if (settledCombatant?.origin.kind !== "character") {
    throw new Error("Expected resolved Sorcerer character combatant.");
  }
  const result = settleCharacterSheetFromBattle({
    sheet,
    state: resolved.state,
    context: battle.context,
    unitLibrary,
    combatant: settledCombatant,
  });
  expect(Either.isRight(result)).toBe(true);
  return appendObservedFeatureResourceRoute(route, {
    tag: "metamagicBattleBridgeAccepted",
    result,
  });
}

function appendObservedFeatureResourceRoute(
  route: readonly CharacterBattleRouteEvent[],
  observation: CharacterBattleFeatureResourceRouteObservation,
): readonly CharacterBattleRouteEvent[] {
  return appendCharacterBattleFeatureResourceHandoffRoute(route, observation);
}

function requireHeightenedBurningHandsAct(
  session: BattleRuntimeSession,
  actorId: ReturnType<typeof combatantId>,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
} {
  const expectedInvocation = spellSlotInvocationRef(
    "burning_hands",
    1,
    "saveGatedDamage",
  );
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "actionSpell" }
      >;
    } =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === actorId &&
      JSON.stringify(battleActSpellPresentation(candidate)?.invocation) ===
        JSON.stringify(expectedInvocation) &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === "saving_throw_disadvantage",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Burning Hands battle act.");
  }
  return act;
}

function requireBattleHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} battle hole, got ${result.tag}.`);
  }
  return requireBattleHoleFromList(result.holes, kind);
}

function requireBattleHoleFromList<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} battle hole.`);
  }
  return hole;
}

function requireBattleResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }
  return result;
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: ReturnType<typeof combatantId>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
  };
}

function areaSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  originAnchorId: ReturnType<typeof combatantId>,
  outcomes: readonly {
    readonly targetId: ReturnType<typeof combatantId>;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one damage roll group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

function rolledDiceGroup(
  results: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = results;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [
      DieRollResult(firstResult),
      ...restResults.map((result) => DieRollResult(result)),
    ],
  };
}

function completeShortRestForFeatureResourceRoute(sheet: CharacterSheet) {
  const rest = expectRight(startShortRest({ sheet }));
  const completion = expectRight(
    finishShortRest({
      rest,
      restedTicks: elapsedTimeTicks(600),
    }),
  );
  return completeShortRest({ completion, unitLibrary });
}

function completeLongRestForFeatureResourceRoute(sheet: CharacterSheet) {
  const rest = expectRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  const completion = expectRight(
    finishLongRest({
      rest,
      restedTicks: elapsedTimeTicks(4800),
    }),
  );
  return completeLongRest({ completion, unitLibrary });
}

function fontOfMagicCreatedLevel3RouteSheet(): CharacterSheet {
  const sheet = featureResourceSheetFixture({
    characterIdText: "character:route-font-created-level-3",
    build: featureResourceSorcererFontOfMagicBuild({
      level: 5,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    }),
    currentHp: 24,
  });
  return expectRight(
    convertFontOfMagicSorceryPointsToSpellSlot({
      sheet,
      unitLibrary,
      spellLevel: spellSlotLevel(3),
    }),
  );
}

function featureResourceSheetFixture(
  input: {
    readonly characterIdText: string;
    readonly build: CharacterBuild;
    readonly currentHp: number;
    readonly tempHp?: number;
  } & Partial<
    Pick<
      CharacterSheetInput,
      | "conditions"
      | "spellSlotExpenditures"
      | "resourceExpenditures"
      | "restFeatureUses"
      | "druidWildShapeKnownFormStatBlockIds"
    >
  >,
): CharacterSheet {
  return expectRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(input.characterIdText),
      build: input.build,
      currentHp: Hp(input.currentHp),
      tempHp: Hp(input.tempHp ?? 0),
      hitPointMaximumReduction: Hp(0),
      conditions: input.conditions ?? [],
      unitLibrary,
      ...(input.spellSlotExpenditures === undefined
        ? {}
        : { spellSlotExpenditures: input.spellSlotExpenditures }),
      ...(input.resourceExpenditures === undefined
        ? {}
        : { resourceExpenditures: input.resourceExpenditures }),
      ...(input.restFeatureUses === undefined
        ? {}
        : { restFeatureUses: input.restFeatureUses }),
      ...(input.druidWildShapeKnownFormStatBlockIds === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              input.druidWildShapeKnownFormStatBlockIds,
          }),
    }),
  );
}

function featureResourceBaseBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId(input.startingClass)),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(authoredUnitId(classId)),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 10,
        wis: 16,
        cha: 16,
      }),
    ),
    proficiencyChoices: [],
    magicInitiateSpellAccesses: [],
    features: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
}

function featureResourceMonkBuild(level: number): CharacterBuild {
  return featureResourceBaseBuild({
    startingClass: "class_monk",
    advancements: Array.from({ length: level - 1 }, () => "class_monk"),
  });
}

function featureResourceSorcererFontOfMagicBuild(input: {
  readonly level: number;
  readonly spellSlots?: readonly {
    readonly spellLevel: number;
    readonly count: number;
  }[];
  readonly preparedSpells?: readonly string[];
}): CharacterBuild {
  return {
    ...featureResourceBaseBuild({
      startingClass: "class_sorcerer",
      advancements: Array.from(
        { length: input.level - 1 },
        () => "class_sorcerer",
      ),
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_sorcerer"),
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: (input.preparedSpells ?? []).map(authoredUnitId),
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: input.spellSlots ?? [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function featureResourceSorcererMetamagicBuild(): CharacterBuild {
  const build = featureResourceSorcererFontOfMagicBuild({
    level: 5,
    spellSlots: [
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 2 },
    ],
    preparedSpells: ["burning_hands"],
  });
  return {
    ...build,
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
        optionId: expectRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
        optionId: expectRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
  };
}

function originFeatSelectedReferenceRetentionRoute(): readonly CharacterBattleRouteEvent[] {
  const build = criminalAlertRouteBuild();
  const projection = characterSheetBattleInitWithRoute({
    sheet: characterSheetForBuild(build),
    unitLibrary,
    statBlockCatalog,
    combatantId: combatantId("combatant:route-origin-feat-retention"),
    displayName: "Route Origin Feat Retention",
    initiative: alertInitiativeScoreForBuild(build),
    ammunitionStocks: [],
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
      ammunitionStocks: [],
    },
    statBlockBattleInput: {
      combatantId: combatantId("combatant:route-origin-feat-skeleton"),
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      initiative: initiativeScore(10),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    },
  });
  if (Either.isLeft(entry)) {
    throw new Error(characterBattleRuntimeIssueMessage(entry.left.issue));
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
    throw new Error(JSON.stringify(sheet.left));
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
  return (route) =>
    characterSessionSheetDerivedBattleActsRouteStep(route, action);
}

function settlementRouteStep(
  action: CharacterBattleSettlementRouteAction,
): RouteAppender {
  return (route) => characterBattleSettlementRouteStep(route, action);
}

function initialCharacterLayerRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
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
  const parsedUnitId = unitChoiceSourceUnitId(authoredUnitId(unitId));
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
  const parsedEquipmentUnitId = loadoutEquipmentUnitId(
    authoredUnitId(equipmentUnitId),
  );
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

function routeCompositionFact(
  raw: unknown,
): CharacterBattleRouteCompositionFact {
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
  throw new Error(
    `Expected Quint ${expectedTag} variant value field ${field}.`,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted<const Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
