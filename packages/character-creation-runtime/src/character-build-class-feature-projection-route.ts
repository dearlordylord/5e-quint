import { Either } from "effect";

import { characterBuildResources } from "./finalization.ts";
import {
  characterBuildMonkUncannyMetabolismFacts,
  type CharacterBuildMonkUncannyMetabolismFacts,
  type CharacterBuildMonkUncannyMetabolismFactsIssue,
} from "./monk-uncanny-metabolism.ts";
import {
  characterBuildMonksFocusFacts,
  type CharacterBuildMonksFocusFacts,
  type CharacterBuildMonksFocusFactsIssue,
} from "./monk-focus.ts";
import {
  characterBuildSorcererFontOfMagicFacts,
  type CharacterBuildSorcererFontOfMagicFacts,
  type CharacterBuildSorcererFontOfMagicFactsIssue,
} from "./sorcerer-font-of-magic.ts";
import {
  characterBuildSorcererMetamagicFacts,
  type CharacterBuildSorcererMetamagicFacts,
  type CharacterBuildSorcererMetamagicFactsIssue,
} from "./sorcerer-metamagic.ts";
import type {
  CharacterBuild,
  CharacterBuildResource,
  UnitCatalog,
} from "./types.ts";

export type CharacterBuildProjectionRouteSubject = "buildProjection";

export type CharacterBuildProjectionRouteOwner = "characterBuild";

export type CharacterBuildProjectionRouteFact = "buildProjectionInput";

export type CharacterCreationBuildProjectionRouteEvent =
  | {
      readonly kind: "projectCharacterBuildFacts";
      readonly subject: CharacterBuildProjectionRouteSubject;
      readonly owner: CharacterBuildProjectionRouteOwner;
    }
  | {
      readonly kind: "recordCreationFacts";
      readonly subject: CharacterBuildProjectionRouteSubject;
      readonly facts: readonly CharacterBuildProjectionRouteFact[];
      readonly owner: CharacterBuildProjectionRouteOwner;
    };

export type CharacterBuildClassFeatureFactsProjection = {
  readonly resources: readonly CharacterBuildResource[];
  readonly monksFocus: CharacterBuildMonksFocusFacts | undefined;
  readonly monkUncannyMetabolism:
    | CharacterBuildMonkUncannyMetabolismFacts
    | undefined;
  readonly sorcererFontOfMagic:
    | CharacterBuildSorcererFontOfMagicFacts
    | undefined;
  readonly sorcererMetamagic:
    | CharacterBuildSorcererMetamagicFacts
    | undefined;
};

export type CharacterBuildClassFeatureFactsProjectionIssue =
  | CharacterBuildMonksFocusFactsIssue
  | CharacterBuildMonkUncannyMetabolismFactsIssue
  | CharacterBuildSorcererFontOfMagicFactsIssue
  | CharacterBuildSorcererMetamagicFactsIssue;

export type CharacterBuildClassFeatureFactsProjectionRoute<
  RouteEvent,
> = {
  readonly build: CharacterBuild;
  readonly facts: CharacterBuildClassFeatureFactsProjection;
  readonly route: readonly (RouteEvent | CharacterCreationBuildProjectionRouteEvent)[];
};

export function characterBuildClassFeatureFactsProjectionWithRoute<RouteEvent>(
  input: {
    readonly build: CharacterBuild;
    readonly unitLibrary: UnitCatalog;
    readonly route: readonly RouteEvent[];
  },
): Either.Either<
  CharacterBuildClassFeatureFactsProjectionRoute<RouteEvent>,
  CharacterBuildClassFeatureFactsProjectionIssue
> {
  const monksFocus = characterBuildMonksFocusFacts(input);
  if (Either.isLeft(monksFocus)) return Either.left(monksFocus.left);
  const monkUncannyMetabolism =
    characterBuildMonkUncannyMetabolismFacts(input);
  if (Either.isLeft(monkUncannyMetabolism)) {
    return Either.left(monkUncannyMetabolism.left);
  }
  const sorcererFontOfMagic = characterBuildSorcererFontOfMagicFacts(input);
  if (Either.isLeft(sorcererFontOfMagic)) {
    return Either.left(sorcererFontOfMagic.left);
  }
  const sorcererMetamagic = characterBuildSorcererMetamagicFacts(input);
  if (Either.isLeft(sorcererMetamagic)) {
    return Either.left(sorcererMetamagic.left);
  }

  return Either.right({
    build: input.build,
    facts: {
      resources: characterBuildResources(input.build, input.unitLibrary),
      monksFocus: monksFocus.right,
      monkUncannyMetabolism: monkUncannyMetabolism.right,
      sorcererFontOfMagic: sorcererFontOfMagic.right,
      sorcererMetamagic: sorcererMetamagic.right,
    },
    route: [
      ...input.route,
      routeProjectCharacterBuildFacts(),
      routeRecordCharacterBuildProjectionInputFact(),
    ],
  });
}

function routeProjectCharacterBuildFacts(): CharacterCreationBuildProjectionRouteEvent {
  return {
    kind: "projectCharacterBuildFacts",
    subject: "buildProjection",
    owner: "characterBuild",
  };
}

function routeRecordCharacterBuildProjectionInputFact(): CharacterCreationBuildProjectionRouteEvent {
  return {
    kind: "recordCreationFacts",
    subject: "buildProjection",
    facts: ["buildProjectionInput"],
    owner: "characterBuild",
  };
}
