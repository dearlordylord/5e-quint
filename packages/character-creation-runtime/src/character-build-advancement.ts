import { Brand, Either, Match, Option } from "effect";
import type { ClassName } from "@dnd/shared/game-facts";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type {
  ClassFeatureRecord,
  ClassRecord,
  EffectAtom,
  FeatRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  classFeatureGrantChoiceHoles,
  choiceOptionIdsFitHole,
} from "./discovery.ts";
import { CLASS_FEATURE_FEAT_CHOICE_KEY } from "./phase1-manifest.ts";
import {
  characterProgressionWithClassLevelGain,
  type CharacterProgressionLevelIssue,
  type ClassUnitId,
  type FixedHigherLevelClassHitPointRule,
} from "./character-progression-types.ts";
import {
  creationChoiceOptionId,
  type CharacterBuild,
  type CharacterBuildFeature,
  type ChoiceCreationHole,
  type UnitCatalog,
} from "./types.ts";

const FIGHTER_CLASS_NAME = "fighter" as const satisfies ClassName;
const FIGHTING_STYLE_FEAT_CATEGORY =
  "fighting_style" as const satisfies FeatRecord["category"];

export type FighterClassUnitId = ClassUnitId &
  Brand.Brand<"FighterClassUnitId">;
const FighterClassUnitId = Brand.nominal<FighterClassUnitId>();

export type FightingStyleFeatUnitId = UnitRecord["id"] &
  Brand.Brand<"FightingStyleFeatUnitId">;
const FightingStyleFeatUnitId = Brand.nominal<FightingStyleFeatUnitId>();

export type CharacterBuildPlainClassLevelGain = {
  readonly tag: "classLevelGain";
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
};

export type CharacterBuildFighterFightingStyleReplacementLevelGain = {
  readonly tag: "fighterLevelGainWithFightingStyleReplacement";
  readonly classUnitId: FighterClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly replacement: {
    readonly selectedFeatUnitId: FightingStyleFeatUnitId;
  };
};

export type CharacterBuildClassLevelGain =
  | CharacterBuildPlainClassLevelGain
  | CharacterBuildFighterFightingStyleReplacementLevelGain;

export type CharacterBuildAdvancementIssue =
  | {
      readonly code: "unknownUnitId";
      readonly unitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "nonClassUnit";
      readonly unitId: UnitRecord["id"];
      readonly unitKind: UnitRecord["kind"];
      readonly message: string;
    }
  | {
      readonly code: "unreadableClassUnit";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "nonFighterClassLevelGain";
      readonly classUnitId: UnitRecord["id"];
      readonly className?: ClassName;
      readonly message: string;
    }
  | {
      readonly code: "nonFightingStyleFeat";
      readonly unitId: UnitRecord["id"];
      readonly unitKind?: UnitRecord["kind"];
      readonly featCategory?: FeatRecord["category"];
      readonly message: string;
    }
  | {
      readonly code: "missingFightingStyleFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "ambiguousFightingStyleFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitIds: readonly UnitRecord["id"][];
      readonly message: string;
    }
  | {
      readonly code: "invalidFightingStyleReplacement";
      readonly selectedFeatUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingSelectedFightingStyle";
      readonly featureUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "ambiguousSelectedFightingStyle";
      readonly featureUnitId: UnitRecord["id"];
      readonly count: number;
      readonly message: string;
    }
  | {
      readonly code: "sameFightingStyleReplacement";
      readonly selectedFeatUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidCharacterProgressionLevel";
      readonly issue: CharacterProgressionLevelIssue;
      readonly message: string;
    };

type FightingStyleGrantFeat = Extract<
  EffectAtom,
  { readonly kind: "grant_feat" }
>;

export function fighterClassUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
}): Either.Either<FighterClassUnitId, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);

  const facts = readClassCreationFacts(classUnit.right);
  if (facts.tag !== "readable") {
    return Either.left({
      code: "unreadableClassUnit",
      classUnitId: input.classUnitId,
      message: `Cannot read class creation facts for ${input.classUnitId}.`,
    });
  }

  if (facts.value.className !== FIGHTER_CLASS_NAME) {
    return Either.left({
      code: "nonFighterClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.value.className,
      message:
        "Fighting Style replacement is only legal when gaining a Fighter level.",
    });
  }

  return Either.right(FighterClassUnitId(input.classUnitId));
}

export function fightingStyleFeatUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
}): Either.Either<FightingStyleFeatUnitId, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    return Either.left({
      code: "unknownUnitId",
      unitId: input.unitId,
      message: `Unknown Unit id ${input.unitId}.`,
    });
  }

  if (unit.value.kind !== "feat") {
    return Either.left({
      code: "nonFightingStyleFeat",
      unitId: input.unitId,
      unitKind: unit.value.kind,
      message: `${input.unitId} is not a Fighting Style feat Unit.`,
    });
  }

  if (unit.value.category !== FIGHTING_STYLE_FEAT_CATEGORY) {
    return Either.left({
      code: "nonFightingStyleFeat",
      unitId: input.unitId,
      featCategory: unit.value.category,
      message: `${input.unitId} is not a Fighting Style feat Unit.`,
    });
  }

  return Either.right(FightingStyleFeatUnitId(input.unitId));
}

export function fighterLevelGainWithFightingStyleReplacement(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly selectedFeatUnitId: UnitRecord["id"];
}): Either.Either<
  CharacterBuildFighterFightingStyleReplacementLevelGain,
  CharacterBuildAdvancementIssue
> {
  const classUnitId = fighterClassUnitId(input);
  if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);

  const selectedFeatUnitId = fightingStyleFeatUnitId({
    unitLibrary: input.unitLibrary,
    unitId: input.selectedFeatUnitId,
  });
  if (Either.isLeft(selectedFeatUnitId)) {
    return Either.left(selectedFeatUnitId.left);
  }

  return Either.right({
    tag: "fighterLevelGainWithFightingStyleReplacement",
    classUnitId: classUnitId.right,
    hitPointRule: input.hitPointRule,
    replacement: {
      selectedFeatUnitId: selectedFeatUnitId.right,
    },
  });
}

export function advanceCharacterBuildClassLevel(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildClassLevelGain;
}): Either.Either<CharacterBuild, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);

  const features = Match.value(input.levelGain).pipe(
    Match.when({ tag: "classLevelGain" }, () =>
      Either.right(input.build.features),
    ),
    Match.when(
      { tag: "fighterLevelGainWithFightingStyleReplacement" },
      (levelGain) =>
        replaceFightingStyleSelectedFeature({
          build: input.build,
          unitLibrary: input.unitLibrary,
          levelGain,
        }),
    ),
    Match.exhaustive,
  );
  if (Either.isLeft(features)) return Either.left(features.left);

  const progression = characterProgressionWithClassLevelGain({
    progression: input.build.progression,
    classUnitId: input.levelGain.classUnitId,
    hitPointRule: input.levelGain.hitPointRule,
  });
  if (Either.isLeft(progression)) {
    return Either.left({
      code: "invalidCharacterProgressionLevel",
      issue: progression.left,
      message: "Cannot add class level to CharacterBuild progression.",
    });
  }

  return Either.right({
    ...input.build,
    progression: progression.right,
    features: features.right,
  });
}

function classUnitRecord(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Either.Either<ClassRecord, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);
  if (Option.isNone(unit)) {
    return Either.left({
      code: "unknownUnitId",
      unitId: input.classUnitId,
      message: `Unknown Unit id ${input.classUnitId}.`,
    });
  }

  if (unit.value.kind !== "class") {
    return Either.left({
      code: "nonClassUnit",
      unitId: input.classUnitId,
      unitKind: unit.value.kind,
      message: `${input.classUnitId} is not a class Unit.`,
    });
  }

  return Either.right(unit.value);
}

function replaceFightingStyleSelectedFeature(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildFighterFightingStyleReplacementLevelGain;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnitId = fighterClassUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);

  const hole = fightingStyleFeatureChoiceHoleForFighterClass({
    unitLibrary: input.unitLibrary,
    classUnitId: classUnitId.right,
  });
  if (Either.isLeft(hole)) return Either.left(hole.left);

  const featureUnitId = unitChoiceSourceUnitId(hole.right);
  if (featureUnitId === undefined) {
    return Either.left({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }

  const selectedFeatUnitId = input.levelGain.replacement.selectedFeatUnitId;
  const selectedOptionId = creationChoiceOptionId(selectedFeatUnitId);
  if (!choiceOptionIdsFitHole(hole.right, [selectedOptionId])) {
    return Either.left({
      code: "invalidFightingStyleReplacement",
      selectedFeatUnitId,
      message: `${selectedFeatUnitId} is not supported for this Fighting Style replacement.`,
    });
  }

  const selectedFeatures = input.build.features.filter((feature) =>
    isSelectedFromFeature(feature, featureUnitId),
  );
  const currentSelection = selectedFeatures[0];
  if (currentSelection === undefined) {
    return Either.left({
      code: "missingSelectedFightingStyle",
      featureUnitId,
      message:
        "Cannot replace Fighting Style because the build has no selected Fighting Style feat.",
    });
  }

  if (selectedFeatures.length > 1) {
    return Either.left({
      code: "ambiguousSelectedFightingStyle",
      featureUnitId,
      count: selectedFeatures.length,
      message:
        "Cannot replace Fighting Style because the build has multiple selected Fighting Style feats.",
    });
  }

  if (currentSelection.unitId === selectedFeatUnitId) {
    return Either.left({
      code: "sameFightingStyleReplacement",
      selectedFeatUnitId,
      message:
        "Fighting Style replacement must choose a different Fighting Style feat.",
    });
  }

  return Either.right(
    input.build.features.map((feature) =>
      isSelectedFromFeature(feature, featureUnitId)
        ? { ...feature, unitId: selectedFeatUnitId }
        : feature,
    ),
  );
}

function fightingStyleFeatureChoiceHoleForFighterClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: FighterClassUnitId;
}): Either.Either<ChoiceCreationHole, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);

  const facts = readClassCreationFacts(classUnit.right);
  if (facts.tag !== "readable") {
    return Either.left({
      code: "unreadableClassUnit",
      classUnitId: input.classUnitId,
      message: `Cannot read class creation facts for ${input.classUnitId}.`,
    });
  }

  const holes = facts.value.featureGrants.flatMap((grant) => {
    const feature = input.unitLibrary.getUnit(grant.unitId);
    if (
      Option.isNone(feature) ||
      feature.value.kind !== "class_feature" ||
      !classFeatureGrantsFightingStyleFeat(feature.value)
    ) {
      return [];
    }

    return classFeatureGrantChoiceHoles(feature.value.id, input.unitLibrary)
      .filter(
        (hole) =>
          hole.source.tag === "unitChoice" &&
          hole.source.choiceKey === CLASS_FEATURE_FEAT_CHOICE_KEY,
      );
  });

  if (holes.length === 0) {
    return Either.left({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }

  if (holes.length > 1) {
    return Either.left({
      code: "ambiguousFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: holes.flatMap((hole) => {
        const unitId = unitChoiceSourceUnitId(hole);
        return unitId === undefined ? [] : [unitId];
      }),
      message:
        "Cannot replace Fighting Style because multiple Fighter Fighting Style choices were found.",
    });
  }

  const hole = holes[0];
  if (hole === undefined) {
    return Either.left({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }

  return Either.right(hole);
}

function classFeatureGrantsFightingStyleFeat(
  feature: ClassFeatureRecord,
): boolean {
  return (
    feature.mechanics.family === "passive" &&
    feature.mechanics.grants.some(
      (grant) =>
        grant.kind === "grant_feat" &&
        grantFeatCategories(grant).some(
          (category) => category === FIGHTING_STYLE_FEAT_CATEGORY,
        ),
    )
  );
}

function grantFeatCategories(
  grant: FightingStyleGrantFeat,
): readonly FeatRecord["category"][] {
  return "category" in grant ? [grant.category] : grant.categories;
}

function unitChoiceSourceUnitId(
  hole: ChoiceCreationHole,
): UnitRecord["id"] | undefined {
  return hole.source.tag === "unitChoice" ? hole.source.unitId : undefined;
}

function isSelectedFromFeature(
  feature: CharacterBuildFeature,
  sourceUnitId: UnitRecord["id"],
): feature is Extract<
  CharacterBuildFeature,
  { readonly kind: "selectedClassChoice" }
> {
  return (
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === sourceUnitId
  );
}
