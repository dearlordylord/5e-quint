import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { SimpleActionMap, SimpleDriver } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

const MBT_TEST_TIMEOUT_MS = 120_000;

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
type CharacterBattleRouteSubject =
  (typeof SUBJECT_BY_TAG)[keyof typeof SUBJECT_BY_TAG];

const HOLE_BY_TAG = {
  HandoffIdentityMatchHoleFamily: "identityMatch",
  HandoffHitPointProjectionHoleFamily: "hitPointProjection",
  HandoffSpellResourceProjectionHoleFamily: "spellResourceProjection",
  HandoffFeatureResourceProjectionHoleFamily: "featureResourceProjection",
  HandoffSettlementConflictHoleFamily: "settlementConflict",
} as const;
type CharacterBattleRouteHole =
  (typeof HOLE_BY_TAG)[keyof typeof HOLE_BY_TAG];

const FILL_BY_TAG = {
  HandoffSheetProjectionFill: "sheetProjection",
  HandoffBattleDeltaFill: "battleDelta",
  HandoffResourceDeltaFill: "resourceDelta",
  HandoffSettlementRejectionFill: "settlementRejection",
} as const;
type CharacterBattleRouteFill =
  (typeof FILL_BY_TAG)[keyof typeof FILL_BY_TAG];

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
type CharacterBattleRouteCompositionFact =
  (typeof COMPOSITION_FACT_BY_TAG)[keyof typeof COMPOSITION_FACT_BY_TAG];

const HANDOFF_FACT_BY_TAG = {
  HandoffSelectedReferenceRetentionFact: "selectedReferenceRetention",
  HandoffSourceExactSpellSlotDeltaFact: "sourceExactSpellSlotDelta",
  HandoffSourceExactPactSlotDeltaFact: "sourceExactPactSlotDelta",
  HandoffFeatureResourceDeltaFact: "featureResourceDelta",
  HandoffSettlementConflictFact: "settlementConflict",
  HandoffZeroHpStableLifecycleFact: "zeroHpStableLifecycle",
  HandoffBuildHitPointMaximumInputFact: "buildHitPointMaximumInput",
} as const;
type CharacterBattleRouteHandoffFact =
  (typeof HANDOFF_FACT_BY_TAG)[keyof typeof HANDOFF_FACT_BY_TAG];

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
type CharacterBattleRouteOwner =
  (typeof OWNER_BY_TAG)[keyof typeof OWNER_BY_TAG];

type CharacterBattleRouteEvent =
  | {
      readonly kind: "projectCharacterSheetToBattle";
      readonly subject: CharacterBattleRouteSubject;
      readonly owner: CharacterBattleRouteOwner;
    }
  | {
      readonly kind: "enterBattleRuntime";
      readonly subject: CharacterBattleRouteSubject;
      readonly owner: CharacterBattleRouteOwner;
    }
  | {
      readonly kind: "composeBattleEncounter";
      readonly subject: CharacterBattleRouteSubject;
      readonly facts: readonly CharacterBattleRouteCompositionFact[];
      readonly owner: CharacterBattleRouteOwner;
    }
  | {
      readonly kind: "settleBattleToCharacterSheet";
      readonly subject: CharacterBattleRouteSubject;
      readonly fill: CharacterBattleRouteFill;
      readonly holes: readonly CharacterBattleRouteHole[];
      readonly owner: CharacterBattleRouteOwner;
    }
  | {
      readonly kind: "rejectCharacterBattleHandoff";
      readonly subject: CharacterBattleRouteSubject;
      readonly fill: CharacterBattleRouteFill;
      readonly holes: readonly CharacterBattleRouteHole[];
      readonly owner: CharacterBattleRouteOwner;
    }
  | {
      readonly kind: "recordCharacterBattleHandoffFacts";
      readonly subject: CharacterBattleRouteSubject;
      readonly facts: readonly CharacterBattleRouteHandoffFact[];
      readonly owner: CharacterBattleRouteOwner;
    };

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

const settlementRouteDriverSchema = {
  init: {},
  doSettleHitPointsConditionsSlotsAndPreservedSheetState: {},
  doSettleFeatureResourceExpenditure: {},
  doRejectAmbiguousCreatedSpellSlotSource: {},
  doRejectMismatchedCharacterIdentity: {},
  doRejectMaximumHpDrift: {},
  doRejectActiveWildShapeHandoff: {},
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
        initialBattleInitRoute,
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
        initialOriginFeatRoute,
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
        initialEncounterCompositionRoute,
      ),
      maxSteps: 5,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes battle settlement back to sheet-owned resource state", async () => {
    await runRouteMbt({
      specFileName: "character-battle-settlement.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        settlementRouteDriverSchema,
        settlementRouteActions,
        initialBattleSettlementRoute,
      ),
      maxSteps: 8,
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
      sheetHitPointsArmorClassConditionsAndProfilesRoute,
    ],
    [
      "doProjectSheetSpellcastingAndMetamagic",
      sheetSpellcastingAndMetamagicRoute,
    ],
    ["doProjectPurePactMagicSlot", purePactMagicSlotRoute],
    [
      "doRejectMixedSpellAndPactSlotInit",
      rejectMixedSpellAndPactSlotRoute,
    ],
    ["doRejectBuildMaximumAboveBuildMaximum", rejectMaximumRoute],
    [
      "doRejectStableRecoveryProgressDuringInit",
      rejectStableRecoveryRoute,
    ],
  ],
);

const originFeatRouteActions = indexedActionEntries(originFeatRouteDriverSchema, [
  ["doFinalizeCriminalAlertOriginFeat", retainOriginFeatRoute],
  ["doProjectAlertInitiativeHandoff", projectInitiativeHandoffRoute],
]);

const encounterCompositionRouteActions = indexedActionEntries(
  encounterCompositionRouteDriverSchema,
  [
    [
      "doProjectSheetCombatantForEncounter",
      projectSheetCombatantForEncounterRoute,
    ],
    ["doComposeParticipantMembership", composeParticipantMembershipRoute],
    ["doComposeSubjectProfiles", composeSubjectProfilesRoute],
    [
      "doComposeInitiativeCurrentActor",
      composeInitiativeCurrentActorRoute,
    ],
    ["doEnterComposedBattleRuntime", enterComposedBattleRuntimeRoute],
  ],
);

const settlementRouteActions = indexedActionEntries(settlementRouteDriverSchema, [
  [
    "doSettleHitPointsConditionsSlotsAndPreservedSheetState",
    settleHitPointsConditionsSlotsAndPreservedSheetStateRoute,
  ],
  ["doSettleFeatureResourceExpenditure", settleFeatureResourceExpenditureRoute],
  [
    "doRejectAmbiguousCreatedSpellSlotSource",
    rejectAmbiguousCreatedSpellSlotSourceRoute,
  ],
  ["doRejectMismatchedCharacterIdentity", rejectIdentityMismatchRoute],
  ["doRejectMaximumHpDrift", rejectMaximumHpDriftRoute],
  ["doRejectActiveWildShapeHandoff", rejectSettlementConflictRoute],
  ["doRejectStableRecoveryProgressHandoff", rejectSettlementConflictRoute],
  ["doSettleZeroHpStableLifecycle", settleZeroHpStableLifecycleRoute],
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

function initialBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
}

function initialOriginFeatRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
}

function initialEncounterCompositionRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
}

function initialBattleSettlementRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleSheet",
    }),
    enterBattleRuntime({
      subject: "handoffBattleMutation",
      owner: "characterBattleRuntime",
    }),
  ];
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

function sheetHitPointsArmorClassConditionsAndProfilesRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleSheet",
    }),
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "sheetToBattleInit",
      facts: ["buildHitPointMaximumInput"],
      owner: "characterBattleBuildProjection",
    }),
    enterBattleRuntime({
      subject: "sheetToBattleInit",
      owner: "characterBattleInitProjection",
    }),
  ];
}

function sheetSpellcastingAndMetamagicRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "handoffResourceProjection",
      owner: "characterBattleSheet",
    }),
    projectCharacterSheetToBattle({
      subject: "handoffFeatureResourceProjection",
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffResourceProjection",
      facts: ["sourceExactSpellSlotDelta"],
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffFeatureResourceProjection",
      facts: ["featureResourceDelta"],
      owner: "characterBattleResourceProjection",
    }),
    enterBattleRuntime({
      subject: "handoffResourceProjection",
      owner: "characterBattleInitProjection",
    }),
  ];
}

function purePactMagicSlotRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "handoffResourceProjection",
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffResourceProjection",
      facts: ["sourceExactPactSlotDelta"],
      owner: "characterBattleResourceProjection",
    }),
    enterBattleRuntime({
      subject: "handoffResourceProjection",
      owner: "characterBattleInitProjection",
    }),
  ];
}

function rejectMixedSpellAndPactSlotRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "handoffResourceProjection",
      fill: "resourceDelta",
      holes: ["spellResourceProjection"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function rejectMaximumRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["hitPointProjection"],
      owner: "characterBattleBuildProjection",
    }),
  ];
}

function rejectStableRecoveryRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["settlementConflict"],
      owner: "characterBattleInitProjection",
    }),
  ];
}

function retainOriginFeatRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "handoffSelectedReference",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffSelectedReference",
      facts: ["selectedReferenceRetention"],
      owner: "characterBattleBuildProjection",
    }),
  ];
}

function projectInitiativeHandoffRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "handoffSelectedReference",
      owner: "characterBattleInitProjection",
    }),
    enterBattleRuntime({
      subject: "handoffSelectedReference",
      owner: "characterBattleRuntime",
    }),
  ];
}

function projectSheetCombatantForEncounterRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleInitProjection",
    }),
  ];
}

function composeParticipantMembershipRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    composeBattleEncounter({
      subject: "handoffParticipantMembership",
      facts: [
        "encounterSideRelationshipOwnership",
        "nonSheetParticipantMembership",
        "sheetDerivedParticipantCandidate",
      ],
      owner: "characterBattleEncounterSetup",
    }),
  ];
}

function composeSubjectProfilesRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    composeBattleEncounter({
      subject: "handoffSubjectProfileAvailability",
      facts: ["subjectProfileAvailabilityOwnership"],
      owner: "characterBattleSubjectProfile",
    }),
  ];
}

function composeInitiativeCurrentActorRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    composeBattleEncounter({
      subject: "handoffInitiativeCurrentActor",
      facts: [
        "currentActorOwnership",
        "initiativeCountOwnership",
        "stableInitiativeOrderOwnership",
      ],
      owner: "characterBattleInitiative",
    }),
  ];
}

function enterComposedBattleRuntimeRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    enterBattleRuntime({
      subject: "handoffEncounterComposition",
      owner: "characterBattleRuntime",
    }),
  ];
}

function settleHitPointsConditionsSlotsAndPreservedSheetStateRoute(
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
    settleBattleToCharacterSheet({
      subject: "handoffResourceProjection",
      fill: "resourceDelta",
      holes: [],
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffResourceProjection",
      facts: ["sourceExactPactSlotDelta", "sourceExactSpellSlotDelta"],
      owner: "characterBattleResourceProjection",
    }),
    projectCharacterSheetToBattle({
      subject: "sheetToBattleInit",
      owner: "characterBattleSheet",
    }),
  ];
}

function settleFeatureResourceExpenditureRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    settleBattleToCharacterSheet({
      subject: "handoffFeatureResourceProjection",
      fill: "resourceDelta",
      holes: [],
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffFeatureResourceProjection",
      facts: ["featureResourceDelta"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function rejectAmbiguousCreatedSpellSlotSourceRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "handoffResourceProjection",
      fill: "settlementRejection",
      holes: ["spellResourceProjection", "settlementConflict"],
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "handoffResourceProjection",
      facts: ["settlementConflict"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

function rejectIdentityMismatchRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "battleToSheetSettlement",
      fill: "settlementRejection",
      holes: ["identityMatch"],
      owner: "characterBattleSettlement",
    }),
  ];
}

function rejectMaximumHpDriftRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "battleToSheetSettlement",
      fill: "settlementRejection",
      holes: ["hitPointProjection"],
      owner: "characterBattleSettlement",
    }),
  ];
}

function rejectSettlementConflictRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    rejectCharacterBattleHandoff({
      subject: "battleToSheetSettlement",
      fill: "settlementRejection",
      holes: ["settlementConflict"],
      owner: "characterBattleSettlement",
    }),
    recordCharacterBattleHandoffFacts({
      subject: "battleToSheetSettlement",
      facts: ["settlementConflict"],
      owner: "characterBattleSettlement",
    }),
  ];
}

function settleZeroHpStableLifecycleRoute(
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
    recordCharacterBattleHandoffFacts({
      subject: "battleToSheetSettlement",
      facts: ["zeroHpStableLifecycle"],
      owner: "characterBattleSettlement",
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

function projectCharacterSheetToBattle(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "projectCharacterSheetToBattle",
    subject: input.subject,
    owner: input.owner,
  };
}

function enterBattleRuntime(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "enterBattleRuntime",
    subject: input.subject,
    owner: input.owner,
  };
}

function composeBattleEncounter(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly facts: readonly CharacterBattleRouteCompositionFact[];
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "composeBattleEncounter",
    subject: input.subject,
    facts: uniqueSorted(input.facts),
    owner: input.owner,
  };
}

function settleBattleToCharacterSheet(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly fill: CharacterBattleRouteFill;
  readonly holes: readonly CharacterBattleRouteHole[];
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "settleBattleToCharacterSheet",
    subject: input.subject,
    fill: input.fill,
    holes: uniqueSorted(input.holes),
    owner: input.owner,
  };
}

function rejectCharacterBattleHandoff(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly fill: CharacterBattleRouteFill;
  readonly holes: readonly CharacterBattleRouteHole[];
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "rejectCharacterBattleHandoff",
    subject: input.subject,
    fill: input.fill,
    holes: uniqueSorted(input.holes),
    owner: input.owner,
  };
}

function recordCharacterBattleHandoffFacts(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly facts: readonly CharacterBattleRouteHandoffFact[];
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "recordCharacterBattleHandoffFacts",
    subject: input.subject,
    facts: uniqueSorted(input.facts),
    owner: input.owner,
  };
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
