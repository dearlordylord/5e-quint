// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_RESOURCE.PROJECTION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Result, Option } from "effect";
import {
  resourceCount,
  spellSlotLevel,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  PointPoolResource,
  ResourcePoolOperation,
  UnitRecord,
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

export const SORCERER_FONT_OF_MAGIC_UNIT_ID = authoredUnitId(
  "sorcerer_font_of_magic",
);

type SorcererFontOfMagicSpellSlotCreationOperation = Extract<
  ResourcePoolOperation,
  { readonly kind: "point_pool_to_spell_slot" }
>;

type SorcererFontOfMagicFeature = CharacterCreationClassFeatureFacts & {
  readonly className: "sorcerer";
  readonly mechanics: Extract<
    CharacterCreationClassFeatureFacts["mechanics"],
    { readonly family: "resource_pool" }
  > & {
    readonly resource: PointPoolResource & {
      readonly kind: "point_pool";
    };
    readonly resetCadence: { readonly kind: "long_rest" };
  };
};

export type CharacterBuildSorcererFontOfMagicFacts = {
  readonly unitId: UnitRecord["id"];
  readonly sorceryPointPool: {
    readonly poolId: PointPoolResource["poolId"];
    readonly maximum: ResourceCount;
    readonly longRestRefillsAll: true;
  };
  readonly spellSlotCreation: {
    readonly ownerClassLevel: number;
    readonly operation: SorcererFontOfMagicSpellSlotCreationOperation;
  };
};

export type CharacterBuildSorcererFontOfMagicFactsIssue = {
  readonly tag: "sorcererFontOfMagicFactsIssue";
  readonly message: string;
};

export function characterBuildSorcererFontOfMagicFacts(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterBuildSorcererFontOfMagicFacts | undefined,
  CharacterBuildSorcererFontOfMagicFactsIssue
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
      readonly facts: SorcererFontOfMagicFeature;
    } => isSorcererFontOfMagicFeature(source.facts),
  );
  if (featureUnits.length > 1) {
    return sorcererFontOfMagicFactsIssue(
      "Sorcery-point projection supports exactly one matching feature.",
    );
  }
  const featureUnit = featureUnits[0];
  if (featureUnit === undefined) {
    if (featureUnitIds.includes(SORCERER_FONT_OF_MAGIC_UNIT_ID)) {
      const installed = input.unitLibrary.getUnit(
        SORCERER_FONT_OF_MAGIC_UNIT_ID,
      );
      if (Option.isNone(installed)) {
        return sorcererFontOfMagicFactsIssue(
          "Font of Magic requires an installed Unit.",
        );
      }
      return sorcererFontOfMagicFactsIssue(
        "Font of Magic requires the installed Surface feature record.",
      );
    }
    return Result.succeed(undefined);
  }

  const ownerClassLevel = characterBuildClassFeatureOwnerLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.facts,
  });
  if (Result.isFailure(ownerClassLevel)) {
    return sorcererFontOfMagicFactsIssue(ownerClassLevel.failure.message);
  }

  const maximum = sorceryPointMaximum({
    feature: featureUnit.facts,
    ownerClassLevel: ownerClassLevel.success,
  });
  if (Result.isFailure(maximum)) return Result.fail(maximum.failure);
  const spellSlotCreation = fontOfMagicSpellSlotCreationOperation(
    featureUnit.facts,
  );
  if (Result.isFailure(spellSlotCreation)) {
    return Result.fail(spellSlotCreation.failure);
  }

  return Result.succeed({
    unitId: featureUnit.unitId,
    sorceryPointPool: {
      poolId: featureUnit.facts.mechanics.resource.poolId,
      maximum: maximum.success,
      longRestRefillsAll: true,
    },
    spellSlotCreation: {
      ownerClassLevel: ownerClassLevel.success,
      operation: spellSlotCreation.success,
    },
  });
}

function isSorcererFontOfMagicFeature(
  unit: CharacterCreationClassFeatureFacts,
): unit is SorcererFontOfMagicFeature {
  return (
    unit.className === "sorcerer" &&
    unit.mechanics.family === "resource_pool" &&
    unit.mechanics.resource.kind === "point_pool" &&
    unit.mechanics.resetCadence.kind === "long_rest" &&
    unit.mechanics.operations.some(isSpellSlotToPointPoolOperation)
  );
}

function isSpellSlotToPointPoolOperation(
  operation: ResourcePoolOperation,
): boolean {
  return (
    operation.kind === "spell_slot_to_point_pool" &&
    operation.activationCost.kind === "free" &&
    operation.pointGain.kind === "equal_to_spell_slot_level"
  );
}

function isPointPoolToSpellSlotOperation(
  operation: ResourcePoolOperation,
): operation is SorcererFontOfMagicSpellSlotCreationOperation {
  return (
    operation.kind === "point_pool_to_spell_slot" &&
    operation.activationCost.kind === "bonus_action" &&
    operation.createdSlotExpiry.kind === "long_rest"
  );
}

function fontOfMagicSpellSlotCreationOperation(
  feature: SorcererFontOfMagicFeature,
): Result.Result<
  SorcererFontOfMagicSpellSlotCreationOperation,
  CharacterBuildSorcererFontOfMagicFactsIssue
> {
  const operation = feature.mechanics.operations.find(
    isPointPoolToSpellSlotOperation,
  );
  if (operation === undefined) {
    return sorcererFontOfMagicFactsIssue(
      "Font of Magic requires Spell Slot creation source facts.",
    );
  }
  return Result.succeed(operation);
}

export function fontOfMagicSpellSlotCreationOption(input: {
  readonly facts: CharacterBuildSorcererFontOfMagicFacts;
  readonly spellLevel: SpellSlotLevel;
}):
  | SorcererFontOfMagicSpellSlotCreationOperation["options"][number]
  | undefined {
  return input.facts.spellSlotCreation.operation.options.find(
    (option) => option.spellSlotLevel === spellSlotLevel(input.spellLevel),
  );
}

function sorceryPointMaximum(input: {
  readonly feature: SorcererFontOfMagicFeature;
  readonly ownerClassLevel: number;
}): Result.Result<ResourceCount, CharacterBuildSorcererFontOfMagicFactsIssue> {
  const cap = input.feature.mechanics.resource.cap;
  if (cap.kind !== "linear_per_level" || !isClassLevelLinearPerLevel(cap)) {
    return sorcererFontOfMagicFactsIssue(
      "Font of Magic requires class-level Sorcery Point scaling facts.",
    );
  }

  return Result.succeed(
    resourceCount(
      classLevelLinearValueAtClassLevel(cap, input.ownerClassLevel),
    ),
  );
}

function sorcererFontOfMagicFactsIssue(
  message: string,
): Result.Result<never, CharacterBuildSorcererFontOfMagicFactsIssue> {
  return Result.fail({ tag: "sorcererFontOfMagicFactsIssue", message });
}
