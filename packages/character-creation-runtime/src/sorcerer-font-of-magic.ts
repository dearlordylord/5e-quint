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
  ClassFeatureRecord,
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

export const SORCERER_FONT_OF_MAGIC_UNIT_ID = authoredUnitId(
  "sorcerer_font_of_magic",
);

type SorcererFontOfMagicSpellSlotCreationOperation = Extract<
  ResourcePoolOperation,
  { readonly kind: "point_pool_to_spell_slot" }
>;

type SorcererFontOfMagicFeature = ClassFeatureRecord & {
  readonly className: "sorcerer";
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "resource_pool" }
  > & {
    readonly resource: PointPoolResource & {
      readonly kind: "point_pool";
    };
    readonly resetCadence: { readonly kind: "long_rest" };
  };
};

export type CharacterBuildSorcererFontOfMagicFacts = {
  readonly unitId: typeof SORCERER_FONT_OF_MAGIC_UNIT_ID;
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
  if (
    !characterBuildFeatureUnitIds(input.build, input.unitLibrary).includes(
      authoredUnitId(SORCERER_FONT_OF_MAGIC_UNIT_ID),
    )
  ) {
    return Result.succeed(undefined);
  }

  const featureUnit = input.unitLibrary.getUnit(SORCERER_FONT_OF_MAGIC_UNIT_ID);
  if (Option.isNone(featureUnit)) {
    return sorcererFontOfMagicFactsIssue(
      "Font of Magic requires an installed Unit.",
    );
  }
  if (!isSorcererFontOfMagicFeature(featureUnit.value)) {
    return sorcererFontOfMagicFactsIssue(
      "Font of Magic requires the installed Surface feature record.",
    );
  }

  const ownerClassLevel = characterBuildClassFeatureOwnerLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.value,
  });
  if (Result.isFailure(ownerClassLevel)) {
    return sorcererFontOfMagicFactsIssue(ownerClassLevel.failure.message);
  }

  const maximum = sorceryPointMaximum({
    feature: featureUnit.value,
    ownerClassLevel: ownerClassLevel.success,
  });
  if (Result.isFailure(maximum)) return Result.fail(maximum.failure);
  const spellSlotCreation = fontOfMagicSpellSlotCreationOperation(
    featureUnit.value,
  );
  if (Result.isFailure(spellSlotCreation)) {
    return Result.fail(spellSlotCreation.failure);
  }

  return Result.succeed({
    unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
    sorceryPointPool: {
      poolId: featureUnit.value.mechanics.resource.poolId,
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
  unit: UnitRecord,
): unit is SorcererFontOfMagicFeature {
  return (
    unit.kind === "class_feature" &&
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
