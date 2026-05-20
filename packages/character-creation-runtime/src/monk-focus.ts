import { Either, Option } from "effect";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import type {
  Ability,
  ClassFeatureRecord,
  UnitRecord,
  UseCountResource,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import {
  classLevelForUnit,
  progressionClassUnitIds,
} from "./character-progression-types.ts";
import {
  classLevelLinearValueAtClassLevel,
  isClassLevelLinearPerLevel,
} from "./class-level-scaling.ts";
import type { CharacterBuild } from "./types.ts";

export const MONK_MONKS_FOCUS_UNIT_ID =
  "monk_monks_focus" as const satisfies UnitRecord["id"];
const MONK_MONKS_FOCUS_SAVE_DC_ABILITY = "wis" as const satisfies Ability;

type MonkFocusFeature = ClassFeatureRecord & {
  readonly className: "monk";
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
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
  readonly unitId: typeof MONK_MONKS_FOCUS_UNIT_ID;
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
}): Either.Either<
  CharacterBuildMonksFocusFacts | undefined,
  CharacterBuildMonksFocusFactsIssue
> {
  if (
    !characterBuildFeatureUnitIds(input.build, input.unitLibrary).includes(
      MONK_MONKS_FOCUS_UNIT_ID,
    )
  ) {
    return Either.right(undefined);
  }
  const featureUnit = input.unitLibrary.getUnit(MONK_MONKS_FOCUS_UNIT_ID);
  if (Option.isNone(featureUnit)) {
    return monksFocusFactsIssue("Monk's Focus requires an installed Unit.");
  }
  if (!isMonkFocusFeature(featureUnit.value)) {
    return monksFocusFactsIssue(
      "Monk's Focus requires the installed Surface feature record.",
    );
  }

  const monkLevel = classLevelForMonkFocusFeature({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.value,
  });
  if (Either.isLeft(monkLevel)) return Either.left(monkLevel.left);

  const focusPointMaximum = monkFocusPointMaximum({
    feature: featureUnit.value,
    monkLevel: monkLevel.right,
  });
  if (Either.isLeft(focusPointMaximum)) {
    return Either.left(focusPointMaximum.left);
  }

  return Either.right({
    unitId: MONK_MONKS_FOCUS_UNIT_ID,
    focusPointUseCount: {
      maximum: focusPointMaximum.right,
      shortRestRefillsAll: true,
      longRestRefillsAll: true,
    },
    initialOptions: featureUnit.value.mechanics.optionSet.initialOptions.map(
      (option) => ({
        id: option.id,
        displayName: option.displayName,
      }),
    ),
    saveDc: {
      base: featureUnit.value.mechanics.effectSaveDc.base,
      ability: featureUnit.value.mechanics.effectSaveDc.ability,
      includesProficiencyBonus: true,
    },
  });
}

function isMonkFocusFeature(unit: UnitRecord): unit is MonkFocusFeature {
  return (
    unit.kind === "class_feature" &&
    unit.className === "monk" &&
    unit.mechanics.family === "resource_container" &&
    unit.mechanics.resource.kind === "use_count" &&
    unit.mechanics.resetCadence.kind === "short_or_long_rest" &&
    unit.mechanics.effectSaveDc?.kind === "class_feature_ability_save_dc" &&
    unit.mechanics.effectSaveDc.base === 8 &&
    unit.mechanics.effectSaveDc.ability === MONK_MONKS_FOCUS_SAVE_DC_ABILITY
  );
}

function classLevelForMonkFocusFeature(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
  readonly feature: MonkFocusFeature;
}): Either.Either<number, CharacterBuildMonksFocusFactsIssue> {
  for (const classUnitId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = input.unitLibrary.getUnit(classUnitId);
    if (
      Option.isSome(classUnit) &&
      classUnit.value.kind === "class" &&
      classUnit.value.className === input.feature.className
    ) {
      return Either.right(
        classLevelForUnit(input.build.progression, classUnitId),
      );
    }
  }
  return monksFocusFactsIssue(
    "Monk's Focus projection requires Monk class progression.",
  );
}

function monkFocusPointMaximum(input: {
  readonly feature: MonkFocusFeature;
  readonly monkLevel: number;
}): Either.Either<ResourceCount, CharacterBuildMonksFocusFactsIssue> {
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
  return Either.right(
    resourceCount(classLevelLinearValueAtClassLevel(cap, input.monkLevel)),
  );
}

function monksFocusFactsIssue(
  message: string,
): Either.Either<never, CharacterBuildMonksFocusFactsIssue> {
  return Either.left({ tag: "monksFocusFactsIssue", message });
}
