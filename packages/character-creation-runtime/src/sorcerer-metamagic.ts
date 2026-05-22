// KERNEL-COVERAGE: runtime-owner CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION
import { Either, Option } from "effect";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import type {
  ClassFeatureRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { CharacterBuild, UnitCatalog } from "./types.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import { characterBuildClassFeatureOwnerLevel } from "./class-feature-facts.ts";
import { classLevelChoiceCountAtLevel } from "./class-level-scaling.ts";
import {
  characterBuildSorcererFontOfMagicFacts,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  type CharacterBuildSorcererFontOfMagicFacts,
} from "./sorcerer-font-of-magic.ts";
import {
  sorcererMetamagicOptionId,
  type SorcererMetamagicOptionId,
} from "./types.ts";

export const SORCERER_METAMAGIC_UNIT_ID =
  "sorcerer_metamagic" as const satisfies UnitRecord["id"];

type SorcererMetamagicMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "metamagic_options" }
>;

type SorcererMetamagicFeature = ClassFeatureRecord & {
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
  readonly unitId: typeof SORCERER_METAMAGIC_UNIT_ID;
  readonly ownerClassLevel: number;
  readonly choiceCount: number;
  readonly knownOptions: readonly CharacterBuildSorcererMetamagicOptionFact[];
  readonly selectionRepeatability: "unique";
  readonly sorceryPointResource: {
    readonly resourceUnitId: typeof SORCERER_FONT_OF_MAGIC_UNIT_ID;
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
}): Either.Either<
  CharacterBuildSorcererMetamagicFacts | undefined,
  CharacterBuildSorcererMetamagicFactsIssue
> {
  const selectedOptionIds = characterBuildSorcererMetamagicOptionIds(
    input.build,
    SORCERER_METAMAGIC_UNIT_ID,
  );
  if (
    !characterBuildFeatureUnitIds(input.build, input.unitLibrary).includes(
      SORCERER_METAMAGIC_UNIT_ID,
    )
  ) {
    return selectedOptionIds.length === 0
      ? Either.right(undefined)
      : sorcererMetamagicFactsIssue(
          "Metamagic option selections require the retained Metamagic feature.",
        );
  }

  const featureUnit = input.unitLibrary.getUnit(SORCERER_METAMAGIC_UNIT_ID);
  if (Option.isNone(featureUnit)) {
    return sorcererMetamagicFactsIssue("Metamagic requires an installed Unit.");
  }
  if (!isSorcererMetamagicFeature(featureUnit.value)) {
    return sorcererMetamagicFactsIssue(
      "Metamagic requires the installed Surface feature record.",
    );
  }

  const ownerClassLevel = characterBuildClassFeatureOwnerLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.value,
  });
  if (Either.isLeft(ownerClassLevel)) {
    return sorcererMetamagicFactsIssue(ownerClassLevel.left.message);
  }

  const choiceCount = classLevelChoiceCountAtLevel(
    featureUnit.value.mechanics.choiceCount,
    ownerClassLevel.right,
  );
  if (selectedOptionIds.length !== choiceCount) {
    return sorcererMetamagicFactsIssue(
      "Metamagic known option count must match the Sorcerer level.",
    );
  }
  if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
    return sorcererMetamagicFactsIssue(
      "Metamagic known options must be unique.",
    );
  }

  const knownOptions: CharacterBuildSorcererMetamagicOptionFact[] = [];
  for (const optionId of selectedOptionIds) {
    const optionFact = metamagicOptionFact(featureUnit.value, optionId);
    if (optionFact === null) {
      return sorcererMetamagicFactsIssue(
        "Metamagic known options must come from the installed Surface option roster.",
      );
    }
    knownOptions.push(optionFact);
  }

  const fontOfMagicFacts = characterBuildSorcererFontOfMagicFacts(input);
  if (Either.isLeft(fontOfMagicFacts)) {
    return sorcererMetamagicFactsIssue(fontOfMagicFacts.left.message);
  }
  if (fontOfMagicFacts.right === undefined) {
    return sorcererMetamagicFactsIssue(
      "Metamagic requires the shared Font of Magic Sorcery Point resource.",
    );
  }

  return Either.right({
    unitId: SORCERER_METAMAGIC_UNIT_ID,
    ownerClassLevel: ownerClassLevel.right,
    choiceCount,
    knownOptions,
    selectionRepeatability:
      featureUnit.value.mechanics.selectionRepeatability.kind,
    sorceryPointResource: {
      resourceUnitId: featureUnit.value.mechanics.spends.resourceUnitId,
      poolId: fontOfMagicFacts.right.sorceryPointPool.poolId,
    },
    spellUseLimit: featureUnit.value.mechanics.spellUseLimit.kind,
  });
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
  unit: UnitRecord,
): unit is SorcererMetamagicFeature {
  return (
    unit.kind === "class_feature" &&
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
  if (option === undefined) return null;

  return {
    optionId,
    sorceryPointCost: resourceCount(option.sorceryPointCost),
    stackingMode: option.stackingMode,
    effectKind: option.effectKind,
  };
}

export function parseSorcererMetamagicOptionId(
  optionId: string,
): Either.Either<
  SorcererMetamagicOptionId,
  CharacterBuildSorcererMetamagicFactsIssue
> {
  const parsed = sorcererMetamagicOptionId(optionId);
  return Either.isRight(parsed)
    ? Either.right(parsed.right)
    : sorcererMetamagicFactsIssue("Unknown Sorcerer Metamagic option id.");
}

function sorcererMetamagicFactsIssue(
  message: string,
): Either.Either<never, CharacterBuildSorcererMetamagicFactsIssue> {
  return Either.left({ tag: "sorcererMetamagicFactsIssue", message });
}
