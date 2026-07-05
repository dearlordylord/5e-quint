import { Match } from "effect";

export const CHARACTER_BATTLE_ROUTE_SUBJECTS = [
  "sheetToBattleInit",
  "battleToSheetSettlement",
  "handoffResourceProjection",
  "handoffFeatureResourceProjection",
  "handoffSelectedReference",
  "handoffBattleMutation",
  "handoffEncounterComposition",
  "handoffParticipantMembership",
  "handoffSubjectProfileAvailability",
  "handoffInitiativeCurrentActor",
] as const;
export type CharacterBattleRouteSubject =
  (typeof CHARACTER_BATTLE_ROUTE_SUBJECTS)[number];

export const CHARACTER_BATTLE_ROUTE_HOLES = [
  "identityMatch",
  "hitPointProjection",
  "spellResourceProjection",
  "featureResourceProjection",
  "settlementConflict",
] as const;
export type CharacterBattleRouteHole =
  (typeof CHARACTER_BATTLE_ROUTE_HOLES)[number];

export const CHARACTER_BATTLE_ROUTE_FILLS = [
  "sheetProjection",
  "battleDelta",
  "resourceDelta",
  "settlementRejection",
] as const;
export type CharacterBattleRouteFill =
  (typeof CHARACTER_BATTLE_ROUTE_FILLS)[number];

export const CHARACTER_BATTLE_ROUTE_COMPOSITION_FACTS = [
  "sheetDerivedParticipantCandidate",
  "nonSheetParticipantMembership",
  "encounterSideRelationshipOwnership",
  "subjectProfileAvailabilityOwnership",
  "initiativeCountOwnership",
  "stableInitiativeOrderOwnership",
  "currentActorOwnership",
] as const;
export type CharacterBattleRouteCompositionFact =
  (typeof CHARACTER_BATTLE_ROUTE_COMPOSITION_FACTS)[number];

export const CHARACTER_BATTLE_ROUTE_HANDOFF_FACTS = [
  "selectedReferenceRetention",
  "sourceExactSpellSlotDelta",
  "sourceExactPactSlotDelta",
  "featureResourceDelta",
  "settlementConflict",
  "zeroHpStableLifecycle",
  "buildHitPointMaximumInput",
] as const;
export type CharacterBattleRouteHandoffFact =
  (typeof CHARACTER_BATTLE_ROUTE_HANDOFF_FACTS)[number];

export const CHARACTER_BATTLE_ROUTE_OWNERS = [
  "characterBattleSheet",
  "characterBattleBuildProjection",
  "characterBattleInitProjection",
  "characterBattleRuntime",
  "characterBattleSettlement",
  "characterBattleResourceProjection",
  "characterBattleEncounterSetup",
  "characterBattleSubjectProfile",
  "characterBattleInitiative",
] as const;
export type CharacterBattleRouteOwner =
  (typeof CHARACTER_BATTLE_ROUTE_OWNERS)[number];

export const CHARACTER_BATTLE_INIT_PROJECTION_ROUTE_ACTIONS = [
  "doProjectSheetHitPointsArmorClassConditionsAndProfiles",
  "doProjectSheetSpellcastingAndMetamagic",
  "doProjectPurePactMagicSlot",
  "doRejectMixedSpellAndPactSlotInit",
  "doRejectBuildMaximumAboveBuildMaximum",
  "doRejectStableRecoveryProgressDuringInit",
] as const;
export type CharacterBattleInitProjectionRouteAction =
  (typeof CHARACTER_BATTLE_INIT_PROJECTION_ROUTE_ACTIONS)[number];

export const CHARACTER_BATTLE_ENCOUNTER_COMPOSITION_ROUTE_ACTIONS = [
  "doProjectSheetCombatantForEncounter",
  "doComposeParticipantMembership",
  "doComposeSubjectProfiles",
  "doComposeInitiativeCurrentActor",
  "doEnterComposedBattleRuntime",
] as const;
export type CharacterBattleEncounterCompositionRouteAction =
  (typeof CHARACTER_BATTLE_ENCOUNTER_COMPOSITION_ROUTE_ACTIONS)[number];

export type CharacterBattleRouteEvent =
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

export function projectCharacterSheetToBattleRoute(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "projectCharacterSheetToBattle",
    subject: input.subject,
    owner: input.owner,
  };
}

export function enterBattleRuntimeRoute(input: {
  readonly subject: CharacterBattleRouteSubject;
  readonly owner: CharacterBattleRouteOwner;
}): CharacterBattleRouteEvent {
  return {
    kind: "enterBattleRuntime",
    subject: input.subject,
    owner: input.owner,
  };
}

export function composeBattleEncounterRoute(input: {
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

export function rejectCharacterBattleHandoffRoute(input: {
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

export function settleBattleToCharacterSheetRoute(input: {
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

export function recordCharacterBattleHandoffFactsRoute(input: {
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

export function initialCharacterBattleInitProjectionRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
}

export function characterBattleInitProjectionRouteAfter(
  action: CharacterBattleInitProjectionRouteAction,
): readonly CharacterBattleRouteEvent[] {
  return routeAfterAction(
    CHARACTER_BATTLE_INIT_PROJECTION_ROUTE_ACTIONS,
    characterBattleInitProjectionRouteStep,
    action,
  );
}

export function characterBattleInitProjectionRouteStep(
  route: readonly CharacterBattleRouteEvent[],
  action: CharacterBattleInitProjectionRouteAction,
): readonly CharacterBattleRouteEvent[] {
  return Match.value(action).pipe(
    Match.when("doProjectSheetHitPointsArmorClassConditionsAndProfiles", () =>
      sheetHitPointsArmorClassConditionsAndProfilesRoute(route),
    ),
    Match.when("doProjectSheetSpellcastingAndMetamagic", () =>
      sheetSpellcastingAndMetamagicRoute(route),
    ),
    Match.when("doProjectPurePactMagicSlot", () =>
      purePactMagicSlotRoute(route),
    ),
    Match.when("doRejectMixedSpellAndPactSlotInit", () =>
      rejectMixedSpellAndPactSlotRoute(route),
    ),
    Match.when("doRejectBuildMaximumAboveBuildMaximum", () =>
      rejectMaximumRoute(route),
    ),
    Match.when("doRejectStableRecoveryProgressDuringInit", () =>
      rejectStableRecoveryRoute(route),
    ),
    Match.exhaustive,
  );
}

export function initialCharacterBattleEncounterCompositionRoute(): readonly CharacterBattleRouteEvent[] {
  return [];
}

export function characterBattleEncounterCompositionRoute(): readonly CharacterBattleRouteEvent[] {
  return routeAfterAction(
    CHARACTER_BATTLE_ENCOUNTER_COMPOSITION_ROUTE_ACTIONS,
    characterBattleEncounterCompositionRouteStep,
    "doEnterComposedBattleRuntime",
  );
}

export function characterBattleEncounterCompositionRouteStep(
  route: readonly CharacterBattleRouteEvent[],
  action: CharacterBattleEncounterCompositionRouteAction,
): readonly CharacterBattleRouteEvent[] {
  return Match.value(action).pipe(
    Match.when("doProjectSheetCombatantForEncounter", () =>
      projectSheetCombatantForEncounterRoute(route),
    ),
    Match.when("doComposeParticipantMembership", () =>
      composeParticipantMembershipRoute(route),
    ),
    Match.when("doComposeSubjectProfiles", () =>
      composeSubjectProfilesRoute(route),
    ),
    Match.when("doComposeInitiativeCurrentActor", () =>
      composeInitiativeCurrentActorRoute(route),
    ),
    Match.when("doEnterComposedBattleRuntime", () =>
      enterComposedBattleRuntimeRoute(route),
    ),
    Match.exhaustive,
  );
}

function routeAfterAction<Action extends string>(
  actions: readonly Action[],
  step: (
    route: readonly CharacterBattleRouteEvent[],
    action: Action,
  ) => readonly CharacterBattleRouteEvent[],
  target: Action,
): readonly CharacterBattleRouteEvent[] {
  let route: readonly CharacterBattleRouteEvent[] = [];
  for (const action of actions) {
    route = step(route, action);
    if (action === target) return route;
  }
  return route;
}

function sheetHitPointsArmorClassConditionsAndProfilesRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattleRoute({
      subject: "sheetToBattleInit",
      owner: "characterBattleSheet",
    }),
    projectCharacterSheetToBattleRoute({
      subject: "sheetToBattleInit",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "sheetToBattleInit",
      facts: ["buildHitPointMaximumInput"],
      owner: "characterBattleBuildProjection",
    }),
    enterBattleRuntimeRoute({
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
    projectCharacterSheetToBattleRoute({
      subject: "handoffResourceProjection",
      owner: "characterBattleSheet",
    }),
    projectCharacterSheetToBattleRoute({
      subject: "handoffFeatureResourceProjection",
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "handoffResourceProjection",
      facts: ["sourceExactSpellSlotDelta"],
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "handoffFeatureResourceProjection",
      facts: ["featureResourceDelta"],
      owner: "characterBattleResourceProjection",
    }),
    enterBattleRuntimeRoute({
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
    projectCharacterSheetToBattleRoute({
      subject: "handoffResourceProjection",
      owner: "characterBattleResourceProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "handoffResourceProjection",
      facts: ["sourceExactPactSlotDelta"],
      owner: "characterBattleResourceProjection",
    }),
    enterBattleRuntimeRoute({
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
    rejectCharacterBattleHandoffRoute({
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
    rejectCharacterBattleHandoffRoute({
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
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["settlementConflict"],
      owner: "characterBattleInitProjection",
    }),
  ];
}

function projectSheetCombatantForEncounterRoute(
  route: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetToBattleRoute({
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
    composeBattleEncounterRoute({
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
    composeBattleEncounterRoute({
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
    composeBattleEncounterRoute({
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
    enterBattleRuntimeRoute({
      subject: "handoffEncounterComposition",
      owner: "characterBattleRuntime",
    }),
  ];
}

function uniqueSorted<const Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  return Array.from(new Set(values)).sort();
}
