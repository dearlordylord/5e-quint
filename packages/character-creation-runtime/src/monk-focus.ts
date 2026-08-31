// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_RESOURCE.PROJECTION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Result, Option } from "effect";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import type {
  Ability,
  UnitRecord,
  UseCountResource,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import {
  classLevelLinearValueAtClassLevel,
  isClassLevelLinearPerLevel,
} from "./class-level-scaling.ts";
import type { CharacterBuild } from "./types.ts";
import { characterBuildClassFeatureOwnerLevel } from "./class-feature-facts.ts";
import {
  projectCharacterCreationClassFeatureSources,
  type CharacterCreationClassFeatureFacts,
  type CharacterCreationClassFeatureSource,
} from "./character-feature-projection.ts";

export const MONK_MONKS_FOCUS_UNIT_ID = authoredUnitId("monk_monks_focus");
const MONK_MONKS_FOCUS_SAVE_DC_ABILITY = "wis" as const satisfies Ability;

type MonkFocusFeature = CharacterCreationClassFeatureFacts & {
  readonly className: "monk";
  readonly mechanics: Extract<
    CharacterCreationClassFeatureFacts["mechanics"],
    { readonly family: "resource_container" }
  > & {
    readonly resource: UseCountResource;
    readonly resetCadence: { readonly kind: "short_or_long_rest" };
    readonly effectSaveDc: {
      readonly kind: "class_feature_ability_save_dc";
      readonly base: 8;
      readonly ability: typeof MONK_MONKS_FOCUS_SAVE_DC_ABILITY;
    };
  };
};

type MonkFocusInitialOption = Pick<
  MonkFocusFeature["mechanics"]["optionSet"]["initialOptions"][number],
  "id" | "displayName"
>;

export type CharacterBuildMonksFocusFacts = {
  readonly unitId: UnitRecord["id"];
  readonly focusPointUseCount: {
    readonly maximum: ResourceCount;
    readonly shortRestRefillsAll: true;
    readonly longRestRefillsAll: true;
  };
  readonly initialOptions: readonly MonkFocusInitialOption[];
  readonly saveDc: {
    readonly base: 8;
    readonly ability: typeof MONK_MONKS_FOCUS_SAVE_DC_ABILITY;
    readonly includesProficiencyBonus: true;
  };
};

export type CharacterBuildMonksFocusFactsIssue = {
  readonly tag: "monksFocusFactsIssue";
  readonly message: string;
};

export function characterBuildMonksFocusFacts(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterBuildMonksFocusFacts | undefined,
  CharacterBuildMonksFocusFactsIssue
> {
  const featureUnitIds = characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  );
  const featureUnits = projectCharacterCreationClassFeatureSources(
    featureUnitIds,
    input.unitLibrary,
  ).filter(
    (
      source,
    ): source is CharacterCreationClassFeatureSource & {
      readonly facts: MonkFocusFeature;
    } => isMonkFocusFeature(source.facts),
  );
  if (featureUnits.length > 1) {
    return monksFocusFactsIssue(
      "Monk Focus projection supports exactly one matching feature.",
    );
  }
  const featureUnit = featureUnits[0];
  if (featureUnit === undefined) {
    if (featureUnitIds.includes(MONK_MONKS_FOCUS_UNIT_ID)) {
      const installed = input.unitLibrary.getUnit(MONK_MONKS_FOCUS_UNIT_ID);
      if (Option.isNone(installed)) {
        return monksFocusFactsIssue("Monk's Focus requires an installed Unit.");
      }
      return monksFocusFactsIssue(
        "Monk's Focus requires the installed Surface feature record.",
      );
    }
    return Result.succeed(undefined);
  }

  const monkLevel = characterBuildClassFeatureOwnerLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.facts,
  });
  if (Result.isFailure(monkLevel)) {
    return monksFocusFactsIssue(monkLevel.failure.message);
  }

  const focusPointMaximum = monkFocusPointMaximum({
    feature: featureUnit.facts,
    monkLevel: monkLevel.success,
  });
  if (Result.isFailure(focusPointMaximum)) {
    return Result.fail(focusPointMaximum.failure);
  }

  return Result.succeed({
    unitId: featureUnit.unitId,
    focusPointUseCount: {
      maximum: focusPointMaximum.success,
      shortRestRefillsAll: true,
      longRestRefillsAll: true,
    },
    initialOptions: featureUnit.facts.mechanics.optionSet.initialOptions.map(
      (option) => ({
        id: option.id,
        displayName: option.displayName,
      }),
    ),
    saveDc: {
      base: featureUnit.facts.mechanics.effectSaveDc.base,
      ability: featureUnit.facts.mechanics.effectSaveDc.ability,
      includesProficiencyBonus: true,
    },
  });
}

function isMonkFocusFeature(
  unit: CharacterCreationClassFeatureFacts,
): unit is MonkFocusFeature {
  return (
    unit.className === "monk" &&
    unit.mechanics.family === "resource_container" &&
    unit.mechanics.resource.kind === "use_count" &&
    unit.mechanics.resetCadence.kind === "short_or_long_rest" &&
    unit.mechanics.effectSaveDc?.kind === "class_feature_ability_save_dc" &&
    unit.mechanics.effectSaveDc.base === 8 &&
    unit.mechanics.effectSaveDc.ability === MONK_MONKS_FOCUS_SAVE_DC_ABILITY
  );
}

function monkFocusPointMaximum(input: {
  readonly feature: MonkFocusFeature;
  readonly monkLevel: number;
}): Result.Result<ResourceCount, CharacterBuildMonksFocusFactsIssue> {
  const cap = input.feature.mechanics.resource.cap;
  if (
    cap.kind !== "linear_per_level" ||
    !isClassLevelLinearPerLevel(cap) ||
    cap.base !== 2 ||
    cap.perLevel !== 1 ||
    cap.startingAtLevel !== 2
  ) {
    return monksFocusFactsIssue(
      "Monk's Focus requires Monk-level Focus Point scaling facts.",
    );
  }
  return Result.succeed(
    resourceCount(classLevelLinearValueAtClassLevel(cap, input.monkLevel)),
  );
}

function monksFocusFactsIssue(
  message: string,
): Result.Result<never, CharacterBuildMonksFocusFactsIssue> {
  return Result.fail({ tag: "monksFocusFactsIssue", message });
}
