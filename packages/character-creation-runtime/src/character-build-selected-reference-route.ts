import { Either } from "effect";

import type { CharacterBuild, CharacterBuildFeature } from "./types.ts";

const MIN_SELECTED_REFERENCE_COUNT = 1;
const SELECTED_REFERENCE_FEATURE_KINDS = [
  "selectedClassChoice",
  "selectedEldritchInvocation",
  "selectedSorcererMetamagicOption",
] as const satisfies ReadonlyArray<CharacterBuildFeature["kind"]>;

export type CharacterBuildSelectedReferenceRouteSubject = "selectedReference";

export type CharacterBuildSelectedReferenceRouteOwner =
  "creationSelectedReference";

export type CharacterBuildSelectedReferenceRouteFact =
  "selectedReferenceRetention";

export type CharacterCreationSelectedReferenceRouteEvent =
  | {
      readonly kind: "retainCreationSelectedReferences";
      readonly subject: CharacterBuildSelectedReferenceRouteSubject;
      readonly owner: CharacterBuildSelectedReferenceRouteOwner;
    }
  | {
      readonly kind: "recordCreationFacts";
      readonly subject: CharacterBuildSelectedReferenceRouteSubject;
      readonly facts: readonly CharacterBuildSelectedReferenceRouteFact[];
      readonly owner: CharacterBuildSelectedReferenceRouteOwner;
    };

export type CharacterBuildSelectedReferenceRoute<RouteEvent> = {
  readonly build: CharacterBuild;
  readonly route: readonly (
    | RouteEvent
    | CharacterCreationSelectedReferenceRouteEvent
  )[];
};

export type CharacterBuildSelectedReferenceRouteIssue = {
  readonly tag: "noSelectedReferences";
  readonly message: string;
};

export function characterBuildSelectedReferencesWithRoute<RouteEvent>(input: {
  readonly build: CharacterBuild;
  readonly route: readonly RouteEvent[];
}): Either.Either<
  CharacterBuildSelectedReferenceRoute<RouteEvent>,
  CharacterBuildSelectedReferenceRouteIssue
> {
  const selectedReferenceCount = characterBuildSelectedReferenceCount(
    input.build,
  );
  if (selectedReferenceCount < MIN_SELECTED_REFERENCE_COUNT) {
    return Either.left({
      tag: "noSelectedReferences",
      message: "CharacterBuild has no retained selected references to route.",
    });
  }
  return Either.right({
    build: input.build,
    route: [...input.route, routeRetainCreationSelectedReferences()],
  });
}

export function recordCharacterBuildSelectedReferenceRetentionWithRoute<
  RouteEvent,
>(
  input: CharacterBuildSelectedReferenceRoute<RouteEvent>,
): CharacterBuildSelectedReferenceRoute<
  RouteEvent | CharacterCreationSelectedReferenceRouteEvent
> {
  return {
    build: input.build,
    route: [...input.route, routeRecordSelectedReferenceRetentionFact()],
  };
}

export function characterBuildSelectedReferenceCount(
  build: CharacterBuild,
): number {
  return (
    build.features.filter(isSelectedReferenceFeature).length +
    (build.spellcasting?.sources.reduce(
      (count, source) =>
        count +
        source.cantrips.length +
        source.spellbook.length +
        source.preparedSpells.length +
        (source.bookOfShadows?.cantrips.length ?? 0) +
        (source.bookOfShadows?.ritualSpells.length ?? 0),
      0,
    ) ?? 0)
  );
}

function isSelectedReferenceFeature(feature: CharacterBuildFeature): boolean {
  return SELECTED_REFERENCE_FEATURE_KINDS.some(
    (selectedReferenceKind) => selectedReferenceKind === feature.kind,
  );
}

function routeRetainCreationSelectedReferences(): CharacterCreationSelectedReferenceRouteEvent {
  return {
    kind: "retainCreationSelectedReferences",
    subject: "selectedReference",
    owner: "creationSelectedReference",
  };
}

function routeRecordSelectedReferenceRetentionFact(): CharacterCreationSelectedReferenceRouteEvent {
  return {
    kind: "recordCreationFacts",
    subject: "selectedReference",
    facts: ["selectedReferenceRetention"],
    owner: "creationSelectedReference",
  };
}
