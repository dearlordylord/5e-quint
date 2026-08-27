import { Result } from "effect";

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
  readonly sorcererMetamagic: CharacterBuildSorcererMetamagicFacts | undefined;
};

export type CharacterBuildClassFeatureFactsProjectionIssue =
  | CharacterBuildMonksFocusFactsIssue
  | CharacterBuildMonkUncannyMetabolismFactsIssue
  | CharacterBuildSorcererFontOfMagicFactsIssue
  | CharacterBuildSorcererMetamagicFactsIssue;

export type CharacterBuildClassFeatureFactsProjectionRoute<RouteEvent> = {
  readonly build: CharacterBuild;
  readonly facts: CharacterBuildClassFeatureFactsProjection;
  readonly route: readonly (
    | RouteEvent
    | CharacterCreationBuildProjectionRouteEvent
  )[];
};

export type CharacterBuildProjectionRoute<RouteEvent> = {
  readonly build: CharacterBuild;
  readonly route: readonly (
    | RouteEvent
    | CharacterCreationBuildProjectionRouteEvent
  )[];
};

export function characterBuildProjectionWithRoute<RouteEvent>(input: {
  readonly build: CharacterBuild;
  readonly route: readonly RouteEvent[];
}): CharacterBuildProjectionRoute<RouteEvent> {
  return {
    build: input.build,
    route: [...input.route, routeProjectCharacterBuildFacts()],
  };
}

export function characterBuildClassFeatureFactsProjectionWithRoute<
  RouteEvent,
>(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly route: readonly RouteEvent[];
}): Result.Result<
  CharacterBuildClassFeatureFactsProjectionRoute<RouteEvent>,
  CharacterBuildClassFeatureFactsProjectionIssue
> {
  const monksFocus = characterBuildMonksFocusFacts(input);
  if (Result.isFailure(monksFocus)) return Result.fail(monksFocus.failure);
  const monkUncannyMetabolism = characterBuildMonkUncannyMetabolismFacts(input);
  if (Result.isFailure(monkUncannyMetabolism)) {
    return Result.fail(monkUncannyMetabolism.failure);
  }
  const sorcererFontOfMagic = characterBuildSorcererFontOfMagicFacts(input);
  if (Result.isFailure(sorcererFontOfMagic)) {
    return Result.fail(sorcererFontOfMagic.failure);
  }
  const sorcererMetamagic = characterBuildSorcererMetamagicFacts(input);
  if (Result.isFailure(sorcererMetamagic)) {
    return Result.fail(sorcererMetamagic.failure);
  }

  return Result.succeed({
    build: input.build,
    facts: {
      resources: characterBuildResources(input.build, input.unitLibrary),
      monksFocus: monksFocus.success,
      monkUncannyMetabolism: monkUncannyMetabolism.success,
      sorcererFontOfMagic: sorcererFontOfMagic.success,
      sorcererMetamagic: sorcererMetamagic.success,
    },
    route: [
      ...characterBuildProjectionWithRoute(input).route,
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
