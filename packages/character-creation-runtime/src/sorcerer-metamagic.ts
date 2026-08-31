// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Result, Option } from "effect";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { CharacterBuild, UnitCatalog } from "./types.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import { characterBuildClassFeatureOwnerLevel } from "./class-feature-facts.ts";
import { classLevelChoiceCountAtLevel } from "./class-level-scaling.ts";
import {
  characterBuildSorcererFontOfMagicFacts,
  type CharacterBuildSorcererFontOfMagicFacts,
} from "./sorcerer-font-of-magic.ts";
import {
  sorcererMetamagicOptionId,
  type SorcererMetamagicOptionId,
} from "./types.ts";
import {
  projectCharacterCreationClassFeatureSources,
  type CharacterCreationClassFeatureFacts,
  type CharacterCreationClassFeatureSource,
} from "./character-feature-projection.ts";

export const SORCERER_METAMAGIC_UNIT_ID = authoredUnitId("sorcerer_metamagic");

type SorcererMetamagicMechanics = Extract<
  CharacterCreationClassFeatureFacts["mechanics"],
  { readonly family: "metamagic_options" }
>;

type SorcererMetamagicFeature = CharacterCreationClassFeatureFacts & {
  readonly className: "sorcerer";
  readonly mechanics: SorcererMetamagicMechanics;
};

type SorcererMetamagicOption = SorcererMetamagicMechanics["options"][number];

export type CharacterBuildSorcererMetamagicOptionFact = {
  readonly optionId: SorcererMetamagicOptionId;
  readonly sorceryPointCost: ResourceCount;
  readonly stackingMode: SorcererMetamagicOption["stackingMode"];
  readonly effectKind: SorcererMetamagicOption["effectKind"];
};

export type CharacterBuildSorcererMetamagicFacts = {
  readonly unitId: UnitRecord["id"];
  readonly ownerClassLevel: number;
  readonly choiceCount: number;
  readonly knownOptions: readonly CharacterBuildSorcererMetamagicOptionFact[];
  readonly selectionRepeatability: "unique";
  readonly sorceryPointResource: {
    readonly resourceUnitId: UnitRecord["id"];
    readonly poolId: CharacterBuildSorcererFontOfMagicFacts["sorceryPointPool"]["poolId"];
  };
  readonly spellUseLimit: "one_per_spell_unless_option_allows_stacking";
};

export type CharacterBuildSorcererMetamagicFactsIssue = {
  readonly tag: "sorcererMetamagicFactsIssue";
  readonly message: string;
};

export function characterBuildSorcererMetamagicFacts(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterBuildSorcererMetamagicFacts | undefined,
  CharacterBuildSorcererMetamagicFactsIssue
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
      readonly facts: SorcererMetamagicFeature;
    } => isSorcererMetamagicFeature(source.facts),
  );
  if (featureUnits.length > 1) {
    return sorcererMetamagicFactsIssue(
      "Metamagic projection supports exactly one matching feature.",
    );
  }
  const featureUnit = featureUnits[0];
  if (featureUnit === undefined) {
    return missingSorcererMetamagicFacts(input, featureUnitIds);
  }
  const selectedOptionIds = characterBuildSorcererMetamagicOptionIds(
    input.build,
    featureUnit.unitId,
  );

  const ownerClassLevel = characterBuildClassFeatureOwnerLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.facts,
  });
  if (Result.isFailure(ownerClassLevel)) {
    return sorcererMetamagicFactsIssue(ownerClassLevel.failure.message);
  }

  const choiceCount = classLevelChoiceCountAtLevel(
    featureUnit.facts.mechanics.choiceCount,
    ownerClassLevel.success,
  );
  const knownOptions = sorcererMetamagicKnownOptions(
    featureUnit.facts,
    selectedOptionIds,
    choiceCount,
  );
  if (Result.isFailure(knownOptions)) {
    return Result.fail(knownOptions.failure);
  }

  const fontOfMagicFacts = characterBuildSorcererFontOfMagicFacts(input);
  if (Result.isFailure(fontOfMagicFacts)) {
    return sorcererMetamagicFactsIssue(fontOfMagicFacts.failure.message);
  }
  if (fontOfMagicFacts.success === undefined) {
    return sorcererMetamagicFactsIssue(
      "Metamagic requires the shared Font of Magic Sorcery Point resource.",
    );
  }

  return Result.succeed({
    unitId: featureUnit.unitId,
    ownerClassLevel: ownerClassLevel.success,
    choiceCount,
    knownOptions: knownOptions.success,
    selectionRepeatability:
      featureUnit.facts.mechanics.selectionRepeatability.kind,
    sorceryPointResource: {
      resourceUnitId: authoredUnitId(
        featureUnit.facts.mechanics.spends.resourceUnitId,
      ),
      poolId: fontOfMagicFacts.success.sorceryPointPool.poolId,
    },
    spellUseLimit: featureUnit.facts.mechanics.spellUseLimit.kind,
  });
}

function missingSorcererMetamagicFacts(
  input: Parameters<typeof characterBuildSorcererMetamagicFacts>[0],
  featureUnitIds: readonly UnitRecord["id"][],
): ReturnType<typeof characterBuildSorcererMetamagicFacts> {
  const hasSelections = input.build.features.some(
    (feature) => feature.kind === "selectedSorcererMetamagicOption",
  );
  if (!featureUnitIds.includes(SORCERER_METAMAGIC_UNIT_ID)) {
    return hasSelections
      ? sorcererMetamagicFactsIssue(
          "Metamagic option selections require the retained Metamagic feature.",
        )
      : Result.succeed(undefined);
  }
  return Option.isNone(input.unitLibrary.getUnit(SORCERER_METAMAGIC_UNIT_ID))
    ? sorcererMetamagicFactsIssue("Metamagic requires an installed Unit.")
    : sorcererMetamagicFactsIssue(
        "Metamagic requires the installed Surface feature record.",
      );
}

function sorcererMetamagicKnownOptions(
  feature: SorcererMetamagicFeature,
  selectedOptionIds: readonly SorcererMetamagicOptionId[],
  choiceCount: number,
): Result.Result<
  readonly CharacterBuildSorcererMetamagicOptionFact[],
  CharacterBuildSorcererMetamagicFactsIssue
> {
  if (selectedOptionIds.length !== choiceCount)
    return sorcererMetamagicFactsIssue(
      "Metamagic known option count must match the Sorcerer level.",
    );
  if (new Set(selectedOptionIds).size !== selectedOptionIds.length)
    return sorcererMetamagicFactsIssue(
      "Metamagic known options must be unique.",
    );
  const knownOptions: CharacterBuildSorcererMetamagicOptionFact[] = [];
  for (const optionId of selectedOptionIds) {
    const optionFact = metamagicOptionFact(feature, optionId);
    if (optionFact === null)
      return sorcererMetamagicFactsIssue(
        "Metamagic known options must come from the installed Surface option roster.",
      );
    knownOptions.push(optionFact);
  }
  return Result.succeed(knownOptions);
}

function characterBuildSorcererMetamagicOptionIds(
  build: Pick<CharacterBuild, "features">,
  featureUnitId: UnitRecord["id"],
): readonly SorcererMetamagicOptionId[] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedSorcererMetamagicOption" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.optionId]
      : [],
  );
}

function isSorcererMetamagicFeature(
  unit: CharacterCreationClassFeatureFacts,
): unit is SorcererMetamagicFeature {
  return (
    unit.className === "sorcerer" &&
    unit.mechanics.family === "metamagic_options"
  );
}

function metamagicOptionFact(
  feature: SorcererMetamagicFeature,
  optionId: SorcererMetamagicOptionId,
): CharacterBuildSorcererMetamagicOptionFact | null {
  const option = feature.mechanics.options.find(
    (candidate) => candidate.id === optionId,
  );
  /* v8 ignore start -- @preserve -- Finalization admits selected Metamagic ids from this exact installed option roster. */
  if (option === undefined) return null;
  /* v8 ignore stop -- @preserve */

  return {
    optionId,
    sorceryPointCost: resourceCount(option.sorceryPointCost),
    stackingMode: option.stackingMode,
    effectKind: option.effectKind,
  };
}

export function parseSorcererMetamagicOptionId(
  optionId: string,
): Result.Result<
  SorcererMetamagicOptionId,
  CharacterBuildSorcererMetamagicFactsIssue
> {
  const parsed = sorcererMetamagicOptionId(optionId);
  return Result.isSuccess(parsed)
    ? Result.succeed(parsed.success)
    : sorcererMetamagicFactsIssue("Unknown Sorcerer Metamagic option id.");
}

function sorcererMetamagicFactsIssue(
  message: string,
): Result.Result<never, CharacterBuildSorcererMetamagicFactsIssue> {
  return Result.fail({ tag: "sorcererMetamagicFactsIssue", message });
}
