// KERNEL-COVERAGE: runtime-owner CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.fighter-fighting-style-advancement-replacement
import { Brand, Either, Match, Option } from "effect";
import type { ClassName } from "@dnd/shared/game-facts";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import {
  allCantripsFromClassSpellList,
  classSpellListPreparedSpellLevel,
} from "@dnd/surface/surface/schema";
import type {
  ClassSpellcastingCreation,
  ClassFeatureRecord,
  ClassRecord,
  EffectAtom,
  FeatRecord,
  PactMagicSpellcastingCreation,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  classFeatureGrantChoiceHoles,
  choiceOptionIdsFitHole,
} from "./discovery.ts";
import { classLevelChoiceCountAtLevel } from "./class-level-scaling.ts";
import {
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  classLevelForUnit,
  characterProgressionWithClassLevelGain,
  type CharacterProgressionLevelIssue,
  type ClassUnitId,
  type FixedHigherLevelClassHitPointRule,
} from "./character-progression-types.ts";
import {
  creationChoiceOptionId,
  eldritchInvocationId,
  type CharacterBuild,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildFeature,
  type CharacterBuildPactMagicSlotPool,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingSource,
  type ChoiceCreationHole,
  type EldritchInvocationId,
  type UnitCatalog,
} from "./types.ts";
import {
  eldritchInvocationOptionForInvocationId,
  eldritchInvocationRepeatableChoiceSatisfiesRule,
  isRepeatableEldritchInvocation,
  knownWarlockCantripSatisfiesEldritchInvocationRule,
  type EldritchInvocationPrerequisite,
  type EldritchInvocationRepeatableChoiceRule,
  type EldritchInvocationSelection,
} from "./eldritch-invocations.ts";

const FIGHTER_CLASS_NAME = "fighter" as const satisfies ClassName;
const WARLOCK_CLASS_NAME = "warlock" as const satisfies ClassName;
const FIGHTING_STYLE_FEAT_CATEGORY =
  "fighting_style" as const satisfies FeatRecord["category"];
const EMPTY_WARLOCK_PACT_MAGIC_LEVEL_GAIN = {
  gainedCantrips: [],
  gainedPreparedSpells: [],
} as const satisfies CharacterBuildWarlockPactMagicLevelGain;

export type FighterClassUnitId = ClassUnitId &
  Brand.Brand<"FighterClassUnitId">;
const FighterClassUnitId = Brand.nominal<FighterClassUnitId>();

export type WarlockClassUnitId = ClassUnitId &
  Brand.Brand<"WarlockClassUnitId">;
const WarlockClassUnitId = Brand.nominal<WarlockClassUnitId>();

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

export type CharacterBuildWarlockPactMagicLevelGain = {
  readonly gainedCantrips: readonly UnitRecord["id"][];
  readonly cantripReplacement?: {
    readonly replaceCantripId: UnitRecord["id"];
    readonly selectedCantripId: UnitRecord["id"];
  };
  readonly gainedPreparedSpells: readonly UnitRecord["id"][];
  readonly preparedSpellReplacement?: {
    readonly replaceSpellId: UnitRecord["id"];
    readonly selectedSpellId: UnitRecord["id"];
  };
};

export type CharacterBuildWarlockLevelGain = {
  readonly tag: "warlockLevelGain";
  readonly classUnitId: WarlockClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly eldritchInvocations: {
    readonly gainedInvocations: readonly EldritchInvocationSelection[];
    readonly replacement?: {
      readonly replaceInvocation: EldritchInvocationSelection;
      readonly selectedInvocation: EldritchInvocationSelection;
    };
  };
};

export type CharacterBuildWarlockEldritchInvocationSelectionInput =
  | {
      readonly kind: "nonRepeatable";
      readonly invocationId: string | EldritchInvocationId;
    }
  | {
      readonly kind: "repeatable";
      readonly invocationId: string | EldritchInvocationId;
      readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
    };

export type CharacterBuildClassLevelGain =
  | CharacterBuildPlainClassLevelGain
  | CharacterBuildFighterFightingStyleReplacementLevelGain
  | CharacterBuildWarlockLevelGain;

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
      readonly code: "nonWarlockClassLevelGain";
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
      readonly code: "missingEldritchInvocationFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "ambiguousEldritchInvocationFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitIds: readonly UnitRecord["id"][];
      readonly message: string;
    }
  | {
      readonly code: "unknownEldritchInvocation";
      readonly invocationId: EldritchInvocationId;
      readonly message: string;
    }
  | {
      readonly code: "invalidEldritchInvocationSelectionCount";
      readonly warlockLevel: number;
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidEldritchInvocationGainCount";
      readonly warlockLevel: number;
      readonly expectedGains: number;
      readonly actualGains: number;
      readonly message: string;
    }
  | {
      readonly code: "missingSelectedEldritchInvocation";
      readonly invocationId: EldritchInvocationId;
      readonly message: string;
    }
  | {
      readonly code: "ambiguousSelectedEldritchInvocation";
      readonly invocationId: EldritchInvocationId;
      readonly count: number;
      readonly message: string;
    }
  | {
      readonly code: "sameEldritchInvocationReplacement";
      readonly invocationId: EldritchInvocationId;
      readonly message: string;
    }
  | {
      readonly code: "missingRepeatableEldritchInvocationChoice";
      readonly invocationId: EldritchInvocationId;
      readonly message: string;
    }
  | {
      readonly code: "invalidRepeatableEldritchInvocationChoice";
      readonly invocationId: EldritchInvocationId;
      readonly repeatableChoice?: CharacterBuildEldritchInvocationRepeatableChoice;
      readonly message: string;
    }
  | {
      readonly code: "lockedEldritchInvocationReplacement";
      readonly replaceInvocationId: EldritchInvocationId;
      readonly dependentInvocationId: EldritchInvocationId;
      readonly message: string;
    }
  | {
      readonly code: "duplicateEldritchInvocationSelection";
      readonly invocationId: EldritchInvocationId;
      readonly message: string;
    }
  | {
      readonly code: "missingWarlockPactMagicSpellcasting";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicCantripSelectionCount";
      readonly warlockLevel: number;
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicCantripGainCount";
      readonly warlockLevel: number;
      readonly expectedGains: number;
      readonly actualGains: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicPreparedSpellSelectionCount";
      readonly warlockLevel: number;
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicPreparedSpellGainCount";
      readonly warlockLevel: number;
      readonly expectedGains: number;
      readonly actualGains: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicSlotProjection";
      readonly warlockLevel: number;
      readonly expectedCount: number;
      readonly expectedSlotLevel: number;
      readonly actualCount?: number;
      readonly actualSlotLevel?: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicCantripChoice";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidWarlockPactMagicPreparedSpellChoice";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingWarlockPactMagicCantripReplacement";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingWarlockPactMagicPreparedSpellReplacement";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "sameWarlockPactMagicCantripReplacement";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "sameWarlockPactMagicPreparedSpellReplacement";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "duplicateWarlockPactMagicCantrip";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "duplicateWarlockPactMagicPreparedSpell";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "unmetEldritchInvocationPrerequisite";
      readonly invocationId: EldritchInvocationId;
      readonly prerequisite: EldritchInvocationPrerequisite;
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
type EldritchInvocationReplacement = NonNullable<
  CharacterBuildWarlockLevelGain["eldritchInvocations"]["replacement"]
>;
type SelectedEldritchInvocationFeature = Extract<
  CharacterBuildFeature,
  { readonly kind: "selectedEldritchInvocation" }
>;
type EldritchInvocationFeatureChoice = {
  readonly featureUnitId: UnitRecord["id"];
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    {
      readonly family: "feature_choice";
      readonly choiceKey: typeof ELDRITCH_INVOCATIONS_CHOICE_KEY;
    }
  >;
};
type PactMagicProgressionRow =
  PactMagicSpellcastingCreation["pactMagicProgression"][number];

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

export function warlockClassUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
}): Either.Either<WarlockClassUnitId, CharacterBuildAdvancementIssue> {
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

  if (facts.value.className !== WARLOCK_CLASS_NAME) {
    return Either.left({
      code: "nonWarlockClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.value.className,
      message:
        "Eldritch Invocation lifecycle choices are only legal when gaining a Warlock level.",
    });
  }

  return Either.right(WarlockClassUnitId(input.classUnitId));
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

export function warlockLevelGain(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly pactMagic?: CharacterBuildWarlockPactMagicLevelGain;
  readonly gainedInvocations: readonly CharacterBuildWarlockEldritchInvocationSelectionInput[];
  readonly replacement?: {
    readonly replaceInvocation: CharacterBuildWarlockEldritchInvocationSelectionInput;
    readonly selectedInvocation: CharacterBuildWarlockEldritchInvocationSelectionInput;
  };
}): Either.Either<
  CharacterBuildWarlockLevelGain,
  CharacterBuildAdvancementIssue
> {
  const classUnitId = warlockClassUnitId(input);
  if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);

  const gainedInvocations = parseEldritchInvocationSelections({
    unitLibrary: input.unitLibrary,
    selections: input.gainedInvocations,
  });
  if (Either.isLeft(gainedInvocations)) {
    return Either.left(gainedInvocations.left);
  }

  const replacement =
    input.replacement === undefined
      ? undefined
      : parseEldritchInvocationReplacement({
          unitLibrary: input.unitLibrary,
          replacement: input.replacement,
        });
  if (replacement !== undefined && Either.isLeft(replacement)) {
    return Either.left(replacement.left);
  }

  return Either.right({
    tag: "warlockLevelGain",
    classUnitId: classUnitId.right,
    hitPointRule: input.hitPointRule,
    pactMagic: input.pactMagic ?? EMPTY_WARLOCK_PACT_MAGIC_LEVEL_GAIN,
    eldritchInvocations: {
      gainedInvocations: gainedInvocations.right,
      ...(replacement === undefined ? {} : { replacement: replacement.right }),
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

  const spellcasting = updateSpellcastingForClassLevelGain(input);
  if (Either.isLeft(spellcasting)) return Either.left(spellcasting.left);
  const buildForFeatureUpdate = characterBuildWithSpellcasting(
    input.build,
    spellcasting.right,
  );

  const features = Match.value(input.levelGain).pipe(
    Match.when({ tag: "classLevelGain" }, (levelGain) =>
      plainClassLevelGainFeatures({
        build: buildForFeatureUpdate,
        unitLibrary: input.unitLibrary,
        levelGain,
      }),
    ),
    Match.when(
      { tag: "fighterLevelGainWithFightingStyleReplacement" },
      (levelGain) =>
        replaceFightingStyleSelectedFeature({
          build: buildForFeatureUpdate,
          unitLibrary: input.unitLibrary,
          levelGain,
        }),
    ),
    Match.when({ tag: "warlockLevelGain" }, (levelGain) =>
      updateWarlockEldritchInvocations({
        build: buildForFeatureUpdate,
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
    ...buildForFeatureUpdate,
    progression: progression.right,
    features: features.right,
  });
}

function characterBuildWithSpellcasting(
  build: CharacterBuild,
  spellcasting: CharacterBuild["spellcasting"],
): CharacterBuild {
  const { spellcasting: _spellcasting, ...buildWithoutSpellcasting } = build;
  return spellcasting === undefined
    ? buildWithoutSpellcasting
    : { ...buildWithoutSpellcasting, spellcasting };
}

function updateSpellcastingForClassLevelGain(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildClassLevelGain;
}): Either.Either<
  CharacterBuild["spellcasting"],
  CharacterBuildAdvancementIssue
> {
  if (input.levelGain.tag === "warlockLevelGain") {
    return updateWarlockPactMagic({
      build: input.build,
      unitLibrary: input.unitLibrary,
      levelGain: input.levelGain,
    });
  }

  if (input.levelGain.tag !== "classLevelGain") {
    return Either.right(input.build.spellcasting);
  }

  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);

  const facts = readClassCreationFacts(classUnit.right);
  if (
    facts.tag !== "readable" ||
    facts.value.className !== WARLOCK_CLASS_NAME
  ) {
    return Either.right(input.build.spellcasting);
  }

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const warlockSpellcasting =
    "spellcasting" in facts.value ? facts.value.spellcasting : undefined;
  const unchanged = warlockPactMagicCanRemainUnchanged({
    build: input.build,
    classUnitId: WarlockClassUnitId(input.levelGain.classUnitId),
    currentWarlockLevel,
    nextWarlockLevel: currentWarlockLevel + 1,
    ...(warlockSpellcasting === undefined
      ? {}
      : { spellcasting: warlockSpellcasting }),
  });
  if (Either.isLeft(unchanged)) return Either.left(unchanged.left);

  return Either.right(input.build.spellcasting);
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

function parseEldritchInvocationSelections(input: {
  readonly unitLibrary: UnitCatalog;
  readonly selections: readonly CharacterBuildWarlockEldritchInvocationSelectionInput[];
}): Either.Either<
  readonly EldritchInvocationSelection[],
  CharacterBuildAdvancementIssue
> {
  const parsed: EldritchInvocationSelection[] = [];
  for (const selection of input.selections) {
    const parsedSelection = parseEldritchInvocationSelection({
      unitLibrary: input.unitLibrary,
      selection,
    });
    if (Either.isLeft(parsedSelection)) {
      return Either.left(parsedSelection.left);
    }
    parsed.push(parsedSelection.right);
  }

  return Either.right(parsed);
}

function parseEldritchInvocationSelection(input: {
  readonly unitLibrary: UnitCatalog;
  readonly selection: CharacterBuildWarlockEldritchInvocationSelectionInput;
}): Either.Either<EldritchInvocationSelection, CharacterBuildAdvancementIssue> {
  const invocationId = parseKnownEldritchInvocationId(
    input.selection.invocationId,
  );
  if (Either.isLeft(invocationId)) return Either.left(invocationId.left);

  const option = eldritchInvocationOptionForInvocationId(invocationId.right);
  if (option === undefined) {
    return Either.left({
      code: "unknownEldritchInvocation",
      invocationId: invocationId.right,
      message: `Unknown Eldritch Invocation id ${invocationId.right}.`,
    });
  }

  if (option.repeatability.kind === "once") {
    if (input.selection.kind !== "nonRepeatable") {
      return Either.left({
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: invocationId.right,
        repeatableChoice: input.selection.repeatableChoice,
        message:
          "Only Repeatable Eldritch Invocations can carry an associated repeatable choice.",
      });
    }
    return Either.right({
      kind: "nonRepeatable",
      invocationId: invocationId.right,
    });
  }

  if (input.selection.kind !== "repeatable") {
    return Either.left({
      code: "missingRepeatableEldritchInvocationChoice",
      invocationId: invocationId.right,
      message:
        "Repeatable Eldritch Invocation selections must include the associated cantrip or Origin feat choice.",
    });
  }
  const repeatableChoice = input.selection.repeatableChoice;

  if (
    !repeatableChoiceMatchesRule({
      unitLibrary: input.unitLibrary,
      invocationId: invocationId.right,
      repeatableChoice,
    })
  ) {
    return Either.left({
      code: "invalidRepeatableEldritchInvocationChoice",
      invocationId: invocationId.right,
      repeatableChoice,
      message:
        "Repeatable Eldritch Invocation selection does not match that invocation's associated choice rule.",
    });
  }

  return Either.right({
    kind: "repeatable",
    invocationId: invocationId.right,
    repeatableChoice,
  });
}

function parseKnownEldritchInvocationId(
  invocationId: string | EldritchInvocationId,
): Either.Either<EldritchInvocationId, CharacterBuildAdvancementIssue> {
  const parsed = eldritchInvocationId(invocationId);
  if (eldritchInvocationOptionForInvocationId(parsed) === undefined) {
    return Either.left({
      code: "unknownEldritchInvocation",
      invocationId: parsed,
      message: `Unknown Eldritch Invocation id ${parsed}.`,
    });
  }

  return Either.right(parsed);
}

function parseEldritchInvocationReplacement(input: {
  readonly unitLibrary: UnitCatalog;
  readonly replacement: {
    readonly replaceInvocation: CharacterBuildWarlockEldritchInvocationSelectionInput;
    readonly selectedInvocation: CharacterBuildWarlockEldritchInvocationSelectionInput;
  };
}): Either.Either<
  EldritchInvocationReplacement,
  CharacterBuildAdvancementIssue
> {
  const replaceInvocation = parseEldritchInvocationSelection({
    unitLibrary: input.unitLibrary,
    selection: input.replacement.replaceInvocation,
  });
  if (Either.isLeft(replaceInvocation)) {
    return Either.left(replaceInvocation.left);
  }

  const selectedInvocation = parseEldritchInvocationSelection({
    unitLibrary: input.unitLibrary,
    selection: input.replacement.selectedInvocation,
  });
  if (Either.isLeft(selectedInvocation)) {
    return Either.left(selectedInvocation.left);
  }

  if (
    eldritchInvocationSelectionsMatch(
      replaceInvocation.right,
      selectedInvocation.right,
    )
  ) {
    return Either.left({
      code: "sameEldritchInvocationReplacement",
      invocationId: selectedInvocation.right.invocationId,
      message:
        "Eldritch Invocation replacement must choose a different invocation.",
    });
  }

  return Either.right({
    replaceInvocation: replaceInvocation.right,
    selectedInvocation: selectedInvocation.right,
  });
}

function plainClassLevelGainFeatures(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildPlainClassLevelGain;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);

  const facts = readClassCreationFacts(classUnit.right);
  if (facts.tag !== "readable") {
    return Either.left({
      code: "unreadableClassUnit",
      classUnitId: input.levelGain.classUnitId,
      message: `Cannot read class creation facts for ${input.levelGain.classUnitId}.`,
    });
  }

  if (facts.value.className !== WARLOCK_CLASS_NAME) {
    return Either.right(input.build.features);
  }

  const featureChoice = eldritchInvocationFeatureForWarlockClass({
    unitLibrary: input.unitLibrary,
    classUnitId: WarlockClassUnitId(input.levelGain.classUnitId),
  });
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);

  const nextWarlockLevel =
    classLevelForUnit(input.build.progression, input.levelGain.classUnitId) + 1;
  const expectedCount = eldritchInvocationCountAtLevel(
    featureChoice.right.mechanics,
    nextWarlockLevel,
  );
  const selectedCount = selectedEldritchInvocationFeaturesForFeature(
    input.build.features,
    featureChoice.right.featureUnitId,
  ).length;

  return selectedCount === expectedCount
    ? Either.right(input.build.features)
    : Either.left({
        code: "invalidEldritchInvocationSelectionCount",
        warlockLevel: nextWarlockLevel,
        expectedCount,
        actualCount: selectedCount,
        message:
          "A plain Warlock level gain would leave the build with the wrong number of Eldritch Invocations.",
      });
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

function updateWarlockEldritchInvocations(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildWarlockLevelGain;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const featureChoice = eldritchInvocationFeatureForWarlockClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const nextWarlockLevel = currentWarlockLevel + 1;
  const selectedFeatures = selectedEldritchInvocationFeaturesForFeature(
    input.build.features,
    featureChoice.right.featureUnitId,
  );
  const currentExpectedCount = eldritchInvocationCountAtLevel(
    featureChoice.right.mechanics,
    currentWarlockLevel,
  );
  if (selectedFeatures.length !== currentExpectedCount) {
    return Either.left({
      code: "invalidEldritchInvocationSelectionCount",
      warlockLevel: currentWarlockLevel,
      expectedCount: currentExpectedCount,
      actualCount: selectedFeatures.length,
      message:
        "Cannot apply Warlock invocation lifecycle choices to a build whose current invocation count does not match its Warlock level.",
    });
  }

  const nextExpectedCount = eldritchInvocationCountAtLevel(
    featureChoice.right.mechanics,
    nextWarlockLevel,
  );
  const expectedGains = nextExpectedCount - selectedFeatures.length;
  const gainedInvocations =
    input.levelGain.eldritchInvocations.gainedInvocations;
  if (gainedInvocations.length !== expectedGains) {
    return Either.left({
      code: "invalidEldritchInvocationGainCount",
      warlockLevel: nextWarlockLevel,
      expectedGains,
      actualGains: gainedInvocations.length,
      message:
        "Warlock level gain must include exactly the new Eldritch Invocation choices from the Warlock Features table.",
    });
  }

  const replacedInvocations = replaceEldritchInvocationSelection({
    selectedInvocations: selectedFeatures.map(
      eldritchInvocationSelectionFromFeature,
    ),
    ...(input.levelGain.eldritchInvocations.replacement === undefined
      ? {}
      : { replacement: input.levelGain.eldritchInvocations.replacement }),
  });
  if (Either.isLeft(replacedInvocations)) {
    return Either.left(replacedInvocations.left);
  }

  const finalInvocations = [...replacedInvocations.right, ...gainedInvocations];
  const duplicateInvocationId =
    duplicateEldritchInvocationSelectionId(finalInvocations);
  if (duplicateInvocationId !== undefined) {
    return Either.left({
      code: "duplicateEldritchInvocationSelection",
      invocationId: duplicateInvocationId,
      message:
        "The same Eldritch Invocation selection cannot be selected more than once.",
    });
  }

  const prerequisiteIssue = unmetEldritchInvocationPrerequisite({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
    warlockLevel: nextWarlockLevel,
    selectedInvocations: finalInvocations,
  });
  if (prerequisiteIssue !== undefined) {
    return Either.left(prerequisiteIssue);
  }

  return Either.right([
    ...input.build.features.filter(
      (feature) =>
        !isSelectedEldritchInvocationFromFeature(
          feature,
          featureChoice.right.featureUnitId,
        ),
    ),
    ...finalInvocations.map(
      (selection): CharacterBuildFeature =>
        eldritchInvocationSelectionFeature(
          selection,
          featureChoice.right.featureUnitId,
        ),
    ),
  ]);
}

function replaceEldritchInvocationSelection(input: {
  readonly selectedInvocations: readonly EldritchInvocationSelection[];
  readonly replacement?: EldritchInvocationReplacement;
}): Either.Either<
  readonly EldritchInvocationSelection[],
  CharacterBuildAdvancementIssue
> {
  if (input.replacement === undefined) {
    return Either.right(input.selectedInvocations);
  }
  const replacement = input.replacement;

  const matchingIndexes = input.selectedInvocations.flatMap(
    (selection, index) =>
      eldritchInvocationSelectionsMatch(
        selection,
        replacement.replaceInvocation,
      )
        ? [index]
        : [],
  );
  if (matchingIndexes.length === 0) {
    return Either.left({
      code: "missingSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      message:
        "Cannot replace an Eldritch Invocation that the build has not selected.",
    });
  }
  if (matchingIndexes.length > 1) {
    return Either.left({
      code: "ambiguousSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      count: matchingIndexes.length,
      message:
        "Cannot replace an Eldritch Invocation selection when multiple matching selections exist.",
    });
  }

  const replaceIndex = matchingIndexes[0];
  if (replaceIndex === undefined) {
    return Either.left({
      code: "missingSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      message:
        "Cannot replace an Eldritch Invocation that the build has not selected.",
    });
  }

  const retainedInvocations = input.selectedInvocations.filter(
    (_selection, index) => index !== replaceIndex,
  );
  const dependentInvocationId = retainedInvocations.find((selection) =>
    eldritchInvocationRequiresKnownInvocation({
      invocationId: selection.invocationId,
      requiredInvocationId: replacement.replaceInvocation.invocationId,
    }),
  )?.invocationId;
  if (dependentInvocationId !== undefined) {
    return Either.left({
      code: "lockedEldritchInvocationReplacement",
      replaceInvocationId: replacement.replaceInvocation.invocationId,
      dependentInvocationId,
      message:
        "An Eldritch Invocation cannot be replaced while another selected invocation has it as a prerequisite.",
    });
  }

  return Either.right(
    input.selectedInvocations.map((selection, index) =>
      index === replaceIndex ? replacement.selectedInvocation : selection,
    ),
  );
}

function updateWarlockPactMagic(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildWarlockLevelGain;
}): Either.Either<CharacterBuildSpellcasting, CharacterBuildAdvancementIssue> {
  const spellcasting = input.build.spellcasting;
  const source = warlockSpellcastingSource(
    input.build,
    input.levelGain.classUnitId,
  );
  const facts = warlockPactMagicSpellcastingForClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  if (Either.isLeft(facts)) return Either.left(facts.left);

  if (spellcasting === undefined || source === undefined) {
    return Either.left({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the build has no Warlock spellcasting source.",
    });
  }

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const currentProgression = pactMagicProgressionAtLevel(
    facts.right,
    currentWarlockLevel,
  );
  const nextProgression = pactMagicProgressionAtLevel(
    facts.right,
    currentWarlockLevel + 1,
  );

  const currentIssue = currentPactMagicStateIssue({
    source,
    progression: currentProgression,
    ...(spellcasting.slotPools.pactMagic === undefined
      ? {}
      : { pactMagicSlotPool: spellcasting.slotPools.pactMagic }),
  });
  if (currentIssue !== undefined) return Either.left(currentIssue);

  const cantrips = applyWarlockPactMagicCantripChanges({
    currentCantrips: source.cantrips,
    pactMagic: input.levelGain.pactMagic,
    currentProgression,
    nextProgression,
  });
  if (Either.isLeft(cantrips)) return Either.left(cantrips.left);

  const preparedSpells = applyWarlockPactMagicPreparedSpellChanges({
    currentPreparedSpells: source.preparedSpells,
    pactMagic: input.levelGain.pactMagic,
    currentProgression,
    nextProgression,
  });
  if (Either.isLeft(preparedSpells)) return Either.left(preparedSpells.left);

  return Either.right({
    ...spellcasting,
    sources: mapCharacterBuildSpellcastingSources(
      spellcasting.sources,
      (candidate) =>
        candidate.sourceUnitId === input.levelGain.classUnitId
          ? {
              ...candidate,
              cantrips: cantrips.right,
              preparedSpells: preparedSpells.right,
            }
          : candidate,
    ),
    slotPools: {
      ...spellcasting.slotPools,
      pactMagic: pactMagicSlotPoolFromProgression(nextProgression),
    },
  });
}

function mapCharacterBuildSpellcastingSources(
  sources: CharacterBuildSpellcasting["sources"],
  f: (
    source: CharacterBuildSpellcastingSource,
  ) => CharacterBuildSpellcastingSource,
): CharacterBuildSpellcasting["sources"] {
  const [firstSource, ...remainingSources] = sources;
  return [f(firstSource), ...remainingSources.map(f)];
}

function warlockPactMagicCanRemainUnchanged(input: {
  readonly build: CharacterBuild;
  readonly classUnitId: WarlockClassUnitId;
  readonly currentWarlockLevel: number;
  readonly nextWarlockLevel: number;
  readonly spellcasting?: ClassSpellcastingCreation;
}): Either.Either<void, CharacterBuildAdvancementIssue> {
  if (input.spellcasting?.kind !== "pact_magic_spellcasting_creation") {
    return Either.left({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the class has no Pact Magic facts.",
    });
  }

  const source = warlockSpellcastingSource(input.build, input.classUnitId);
  const pactMagicSlotPool = input.build.spellcasting?.slotPools.pactMagic;
  if (source === undefined || pactMagicSlotPool === undefined) {
    return Either.left({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the build has no Pact Magic spellcasting facts.",
    });
  }

  const currentProgression = pactMagicProgressionAtLevel(
    input.spellcasting,
    input.currentWarlockLevel,
  );
  const nextProgression = pactMagicProgressionAtLevel(
    input.spellcasting,
    input.nextWarlockLevel,
  );
  const currentIssue = currentPactMagicStateIssue({
    source,
    pactMagicSlotPool,
    progression: currentProgression,
  });
  if (currentIssue !== undefined) return Either.left(currentIssue);

  if (source.cantrips.length !== nextProgression.cantripTotal) {
    return Either.left({
      code: "invalidWarlockPactMagicCantripGainCount",
      warlockLevel: input.nextWarlockLevel,
      expectedGains:
        nextProgression.cantripTotal - currentProgression.cantripTotal,
      actualGains: 0,
      message:
        "A plain Warlock level gain would leave the build with the wrong number of Pact Magic cantrips.",
    });
  }
  if (source.preparedSpells.length !== nextProgression.preparedSpellTotal) {
    return Either.left({
      code: "invalidWarlockPactMagicPreparedSpellGainCount",
      warlockLevel: input.nextWarlockLevel,
      expectedGains:
        nextProgression.preparedSpellTotal -
        currentProgression.preparedSpellTotal,
      actualGains: 0,
      message:
        "A plain Warlock level gain would leave the build with the wrong number of Pact Magic prepared spells.",
    });
  }
  if (
    pactMagicSlotPool.count !== nextProgression.pactSlotCount ||
    pactMagicSlotPool.slotLevel !== nextProgression.pactSlotLevel
  ) {
    return Either.left(
      invalidPactMagicSlotProjectionIssue({
        warlockLevel: input.nextWarlockLevel,
        progression: nextProgression,
        pactMagicSlotPool,
      }),
    );
  }

  return Either.right(undefined);
}

function applyWarlockPactMagicCantripChanges(input: {
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly currentProgression: PactMagicProgressionRow;
  readonly nextProgression: PactMagicProgressionRow;
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.currentCantrips.length !== input.currentProgression.cantripTotal) {
    return Either.left({
      code: "invalidWarlockPactMagicCantripSelectionCount",
      warlockLevel: input.currentProgression.atLevel,
      expectedCount: input.currentProgression.cantripTotal,
      actualCount: input.currentCantrips.length,
      message:
        "Cannot advance Warlock Pact Magic from a build whose current cantrip count does not match its Warlock level.",
    });
  }

  const expectedGains =
    input.nextProgression.cantripTotal - input.currentProgression.cantripTotal;
  if (input.pactMagic.gainedCantrips.length !== expectedGains) {
    return Either.left({
      code: "invalidWarlockPactMagicCantripGainCount",
      warlockLevel: input.nextProgression.atLevel,
      expectedGains,
      actualGains: input.pactMagic.gainedCantrips.length,
      message:
        "Warlock Pact Magic cantrip gains must match the Warlock Features table.",
    });
  }

  const replacedCantrips = replaceWarlockPactMagicCantrip({
    currentCantrips: input.currentCantrips,
    replacement: input.pactMagic.cantripReplacement,
  });
  if (Either.isLeft(replacedCantrips))
    return Either.left(replacedCantrips.left);

  const finalCantrips = [
    ...replacedCantrips.right,
    ...input.pactMagic.gainedCantrips,
  ];
  const invalidCantrip = finalCantrips.find(
    (cantripId) => !isWarlockCantrip(cantripId),
  );
  if (invalidCantrip !== undefined) {
    return Either.left({
      code: "invalidWarlockPactMagicCantripChoice",
      cantripId: invalidCantrip,
      message:
        "Warlock Pact Magic cantrips must be chosen from the Warlock cantrip list.",
    });
  }

  const duplicateCantrip = duplicateValue(finalCantrips);
  if (duplicateCantrip !== undefined) {
    return Either.left({
      code: "duplicateWarlockPactMagicCantrip",
      cantripId: duplicateCantrip,
      message: "Warlock Pact Magic cantrips must be distinct.",
    });
  }

  return finalCantrips.length === input.nextProgression.cantripTotal
    ? Either.right(finalCantrips)
    : Either.left({
        code: "invalidWarlockPactMagicCantripSelectionCount",
        warlockLevel: input.nextProgression.atLevel,
        expectedCount: input.nextProgression.cantripTotal,
        actualCount: finalCantrips.length,
        message:
          "Warlock Pact Magic cantrip changes must leave the build with the table count for the new Warlock level.",
      });
}

function applyWarlockPactMagicPreparedSpellChanges(input: {
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly currentProgression: PactMagicProgressionRow;
  readonly nextProgression: PactMagicProgressionRow;
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (
    input.currentPreparedSpells.length !==
    input.currentProgression.preparedSpellTotal
  ) {
    return Either.left({
      code: "invalidWarlockPactMagicPreparedSpellSelectionCount",
      warlockLevel: input.currentProgression.atLevel,
      expectedCount: input.currentProgression.preparedSpellTotal,
      actualCount: input.currentPreparedSpells.length,
      message:
        "Cannot advance Warlock Pact Magic from a build whose current prepared-spell count does not match its Warlock level.",
    });
  }

  const expectedGains =
    input.nextProgression.preparedSpellTotal -
    input.currentProgression.preparedSpellTotal;
  if (input.pactMagic.gainedPreparedSpells.length !== expectedGains) {
    return Either.left({
      code: "invalidWarlockPactMagicPreparedSpellGainCount",
      warlockLevel: input.nextProgression.atLevel,
      expectedGains,
      actualGains: input.pactMagic.gainedPreparedSpells.length,
      message:
        "Warlock Pact Magic prepared-spell gains must match the Warlock Features table.",
    });
  }

  const replacedPreparedSpells = replaceWarlockPactMagicPreparedSpell({
    currentPreparedSpells: input.currentPreparedSpells,
    replacement: input.pactMagic.preparedSpellReplacement,
  });
  if (Either.isLeft(replacedPreparedSpells)) {
    return Either.left(replacedPreparedSpells.left);
  }

  const finalPreparedSpells = [
    ...replacedPreparedSpells.right,
    ...input.pactMagic.gainedPreparedSpells,
  ];
  const invalidSpell = finalPreparedSpells.find(
    (spellId) =>
      !warlockPreparedSpellIsEligible({
        spellId,
        maximumSpellLevel: input.nextProgression.pactSlotLevel,
      }),
  );
  if (invalidSpell !== undefined) {
    return Either.left({
      code: "invalidWarlockPactMagicPreparedSpellChoice",
      spellId: invalidSpell,
      message:
        "Warlock Pact Magic prepared spells must be Warlock spells no higher than the Pact Slot level for the new Warlock level.",
    });
  }

  const duplicateSpell = duplicateValue(finalPreparedSpells);
  if (duplicateSpell !== undefined) {
    return Either.left({
      code: "duplicateWarlockPactMagicPreparedSpell",
      spellId: duplicateSpell,
      message: "Warlock Pact Magic prepared spells must be distinct.",
    });
  }

  return finalPreparedSpells.length === input.nextProgression.preparedSpellTotal
    ? Either.right(finalPreparedSpells)
    : Either.left({
        code: "invalidWarlockPactMagicPreparedSpellSelectionCount",
        warlockLevel: input.nextProgression.atLevel,
        expectedCount: input.nextProgression.preparedSpellTotal,
        actualCount: finalPreparedSpells.length,
        message:
          "Warlock Pact Magic prepared-spell changes must leave the build with the table count for the new Warlock level.",
      });
}

function replaceWarlockPactMagicCantrip(input: {
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly replacement?: CharacterBuildWarlockPactMagicLevelGain["cantripReplacement"];
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Either.right(input.currentCantrips);
  }

  if (
    input.replacement.replaceCantripId === input.replacement.selectedCantripId
  ) {
    return Either.left({
      code: "sameWarlockPactMagicCantripReplacement",
      cantripId: input.replacement.selectedCantripId,
      message:
        "Warlock Pact Magic cantrip replacement must choose a different Warlock cantrip.",
    });
  }

  if (!input.currentCantrips.includes(input.replacement.replaceCantripId)) {
    return Either.left({
      code: "missingWarlockPactMagicCantripReplacement",
      cantripId: input.replacement.replaceCantripId,
      message:
        "Cannot replace a Pact Magic cantrip that the build does not know.",
    });
  }

  return Either.right(
    input.currentCantrips.map((cantripId) =>
      cantripId === input.replacement?.replaceCantripId
        ? input.replacement.selectedCantripId
        : cantripId,
    ),
  );
}

function replaceWarlockPactMagicPreparedSpell(input: {
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly replacement?: CharacterBuildWarlockPactMagicLevelGain["preparedSpellReplacement"];
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Either.right(input.currentPreparedSpells);
  }

  if (input.replacement.replaceSpellId === input.replacement.selectedSpellId) {
    return Either.left({
      code: "sameWarlockPactMagicPreparedSpellReplacement",
      spellId: input.replacement.selectedSpellId,
      message:
        "Warlock Pact Magic prepared-spell replacement must choose a different Warlock spell.",
    });
  }

  if (!input.currentPreparedSpells.includes(input.replacement.replaceSpellId)) {
    return Either.left({
      code: "missingWarlockPactMagicPreparedSpellReplacement",
      spellId: input.replacement.replaceSpellId,
      message:
        "Cannot replace a Pact Magic prepared spell that the build does not have prepared.",
    });
  }

  return Either.right(
    input.currentPreparedSpells.map((spellId) =>
      spellId === input.replacement?.replaceSpellId
        ? input.replacement.selectedSpellId
        : spellId,
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

    return classFeatureGrantChoiceHoles(
      feature.value.id,
      input.unitLibrary,
    ).filter(
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

function eldritchInvocationFeatureForWarlockClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
}): Either.Either<
  EldritchInvocationFeatureChoice,
  CharacterBuildAdvancementIssue
> {
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

  const featureChoices = facts.value.featureGrants.flatMap((grant) => {
    const feature = input.unitLibrary.getUnit(grant.unitId);
    if (
      Option.isNone(feature) ||
      feature.value.kind !== "class_feature" ||
      feature.value.mechanics.family !== "feature_choice" ||
      feature.value.mechanics.choiceKey !== ELDRITCH_INVOCATIONS_CHOICE_KEY
    ) {
      return [];
    }

    return [
      {
        featureUnitId: feature.value.id,
        mechanics: feature.value.mechanics,
      },
    ];
  });

  if (featureChoices.length === 0) {
    return Either.left({
      code: "missingEldritchInvocationFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Warlock class-feature Eldritch Invocation choice.",
    });
  }

  if (featureChoices.length > 1) {
    return Either.left({
      code: "ambiguousEldritchInvocationFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: featureChoices.map((feature) => feature.featureUnitId),
      message:
        "Cannot update Eldritch Invocations because multiple Warlock invocation choices were found.",
    });
  }

  const featureChoice = featureChoices[0];
  return featureChoice === undefined
    ? Either.left({
        code: "missingEldritchInvocationFeatureChoice",
        classUnitId: input.classUnitId,
        message:
          "Cannot find the Warlock class-feature Eldritch Invocation choice.",
      })
    : Either.right(featureChoice);
}

function eldritchInvocationCountAtLevel(
  mechanics: EldritchInvocationFeatureChoice["mechanics"],
  warlockLevel: number,
): number {
  return classLevelChoiceCountAtLevel(mechanics.choiceCount, warlockLevel);
}

function selectedEldritchInvocationFeaturesForFeature(
  features: readonly CharacterBuildFeature[],
  featureUnitId: UnitRecord["id"],
): readonly SelectedEldritchInvocationFeature[] {
  return features.filter(
    (feature): feature is SelectedEldritchInvocationFeature =>
      isSelectedEldritchInvocationFromFeature(feature, featureUnitId),
  );
}

function isSelectedEldritchInvocationFromFeature(
  feature: CharacterBuildFeature,
  featureUnitId: UnitRecord["id"],
): feature is SelectedEldritchInvocationFeature {
  return (
    feature.kind === "selectedEldritchInvocation" &&
    feature.selectedFromUnitId === featureUnitId
  );
}

function eldritchInvocationSelectionFromFeature(
  feature: SelectedEldritchInvocationFeature,
): EldritchInvocationSelection {
  return feature.selection;
}

function eldritchInvocationSelectionFeature(
  selection: EldritchInvocationSelection,
  selectedFromUnitId: UnitRecord["id"],
): CharacterBuildFeature {
  return {
    kind: "selectedEldritchInvocation",
    selectedFromUnitId,
    selection,
  };
}

function duplicateEldritchInvocationSelectionId(
  selections: readonly EldritchInvocationSelection[],
): EldritchInvocationId | undefined {
  const seen = new Set<EldritchInvocationId>();
  const seenRepeatableSelections = new Set<string>();
  for (const selection of selections) {
    if (isRepeatableEldritchInvocation(selection.invocationId)) {
      const selectionKey = eldritchInvocationSelectionKey(selection);
      if (seenRepeatableSelections.has(selectionKey)) {
        return selection.invocationId;
      }
      seenRepeatableSelections.add(selectionKey);
      continue;
    }

    if (seen.has(selection.invocationId)) {
      return selection.invocationId;
    }
    seen.add(selection.invocationId);
  }

  return undefined;
}

function eldritchInvocationSelectionKey(
  selection: EldritchInvocationSelection,
): string {
  if (selection.kind === "nonRepeatable") {
    return `${selection.invocationId}:nonRepeatable`;
  }

  return selection.repeatableChoice.kind === "knownWarlockCantrip"
    ? `${selection.invocationId}:cantrip:${selection.repeatableChoice.cantripId}`
    : `${selection.invocationId}:originFeat:${selection.repeatableChoice.featUnitId}`;
}

function eldritchInvocationSelectionsMatch(
  left: EldritchInvocationSelection,
  right: EldritchInvocationSelection,
): boolean {
  if (left.invocationId !== right.invocationId || left.kind !== right.kind) {
    return false;
  }
  return left.kind === "nonRepeatable"
    ? true
    : right.kind === "repeatable" &&
        repeatableChoicesMatch(left.repeatableChoice, right.repeatableChoice);
}

function repeatableChoicesMatch(
  left: CharacterBuildEldritchInvocationRepeatableChoice,
  right: CharacterBuildEldritchInvocationRepeatableChoice,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  return left.kind === "knownWarlockCantrip"
    ? right.kind === "knownWarlockCantrip" && left.cantripId === right.cantripId
    : right.kind === "originFeat" && left.featUnitId === right.featUnitId;
}

function unmetEldritchInvocationPrerequisite(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
  readonly warlockLevel: number;
  readonly selectedInvocations: readonly EldritchInvocationSelection[];
}): CharacterBuildAdvancementIssue | undefined {
  for (const selection of input.selectedInvocations) {
    const option = eldritchInvocationOptionForInvocationId(
      selection.invocationId,
    );
    if (option === undefined) {
      return {
        code: "unknownEldritchInvocation",
        invocationId: selection.invocationId,
        message: `Unknown Eldritch Invocation id ${selection.invocationId}.`,
      };
    }

    const repeatableChoiceIssue = invalidRepeatableChoiceIssue({
      build: input.build,
      unitLibrary: input.unitLibrary,
      classUnitId: input.classUnitId,
      selection,
      repeatability: option.repeatability,
    });
    if (repeatableChoiceIssue !== undefined) {
      return repeatableChoiceIssue;
    }

    const unmet = option.prerequisites.find(
      (prerequisite) =>
        !eldritchInvocationPrerequisiteSatisfied({
          ...input,
          prerequisite,
        }),
    );
    if (unmet !== undefined) {
      return {
        code: "unmetEldritchInvocationPrerequisite",
        invocationId: selection.invocationId,
        prerequisite: unmet,
        message: `${selection.invocationId} does not meet its Eldritch Invocation prerequisite.`,
      };
    }
  }

  return undefined;
}

function eldritchInvocationPrerequisiteSatisfied(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
  readonly warlockLevel: number;
  readonly selectedInvocations: readonly EldritchInvocationSelection[];
  readonly prerequisite: EldritchInvocationPrerequisite;
}): boolean {
  if (input.prerequisite.kind === "minimumWarlockLevel") {
    return input.warlockLevel >= input.prerequisite.level;
  }

  if (input.prerequisite.kind === "knownInvocation") {
    const requiredInvocationId = input.prerequisite.invocationId;
    return input.selectedInvocations.some(
      (selection) => selection.invocationId === requiredInvocationId,
    );
  }

  return hasKnownWarlockCantripForInvocationPrerequisite({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
    cantrip: input.prerequisite.cantrip,
  });
}

function eldritchInvocationRequiresKnownInvocation(input: {
  readonly invocationId: EldritchInvocationId;
  readonly requiredInvocationId: EldritchInvocationId;
}): boolean {
  return (
    eldritchInvocationOptionForInvocationId(
      input.invocationId,
    )?.prerequisites.some(
      (prerequisite) =>
        prerequisite.kind === "knownInvocation" &&
        prerequisite.invocationId === input.requiredInvocationId,
    ) ?? false
  );
}

function invalidRepeatableChoiceIssue(input: {
  readonly build: Pick<CharacterBuild, "spellcasting">;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
  readonly selection: EldritchInvocationSelection;
  readonly repeatability: NonNullable<
    ReturnType<typeof eldritchInvocationOptionForInvocationId>
  >["repeatability"];
}): CharacterBuildAdvancementIssue | undefined {
  if (input.repeatability.kind === "once") {
    return input.selection.kind === "nonRepeatable"
      ? undefined
      : {
          code: "invalidRepeatableEldritchInvocationChoice",
          invocationId: input.selection.invocationId,
          repeatableChoice: input.selection.repeatableChoice,
          message:
            "Only Repeatable Eldritch Invocations can carry an associated repeatable choice.",
        };
  }

  if (input.selection.kind === "nonRepeatable") {
    return {
      code: "missingRepeatableEldritchInvocationChoice",
      invocationId: input.selection.invocationId,
      message:
        "Repeatable Eldritch Invocation selections must include the associated cantrip or Origin feat choice.",
    };
  }

  return repeatableChoiceAvailableForBuild({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
    choiceRule: input.repeatability.choice,
    repeatableChoice: input.selection.repeatableChoice,
  })
    ? undefined
    : {
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: input.selection.invocationId,
        repeatableChoice: input.selection.repeatableChoice,
        message:
          "Repeatable Eldritch Invocation selection is not available to this build.",
      };
}

function hasKnownWarlockCantripForInvocationPrerequisite(input: {
  readonly build: Pick<CharacterBuild, "spellcasting">;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
  readonly cantrip: Extract<
    EldritchInvocationPrerequisite,
    { readonly kind: "knownWarlockCantrip" }
  >["cantrip"];
}): boolean {
  return knownWarlockCantripIds(input.build, input.classUnitId).some(
    (cantripId) =>
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: input.unitLibrary,
        cantripId,
        cantrip: input.cantrip,
      }),
  );
}

function knownWarlockCantripIds(
  build: Pick<CharacterBuild, "spellcasting">,
  classUnitId: WarlockClassUnitId,
): readonly UnitRecord["id"][] {
  return (
    warlockSpellcastingSource(build, classUnitId)?.cantrips.filter(
      (cantripId) =>
        allCantripsFromClassSpellList(WARLOCK_CLASS_NAME, [cantripId]),
    ) ?? []
  );
}

function repeatableChoiceMatchesRule(input: {
  readonly unitLibrary: UnitCatalog;
  readonly invocationId: EldritchInvocationId;
  readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
}): boolean {
  const option = eldritchInvocationOptionForInvocationId(input.invocationId);
  if (option?.repeatability.kind !== "repeatable") {
    return false;
  }

  return eldritchInvocationRepeatableChoiceSatisfiesRule({
    unitLibrary: input.unitLibrary,
    choiceRule: option.repeatability.choice,
    repeatableChoice: input.repeatableChoice,
  });
}

function repeatableChoiceAvailableForBuild(input: {
  readonly build: Pick<CharacterBuild, "spellcasting">;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
  readonly choiceRule: EldritchInvocationRepeatableChoiceRule;
  readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
}): boolean {
  if (
    !eldritchInvocationRepeatableChoiceSatisfiesRule({
      unitLibrary: input.unitLibrary,
      choiceRule: input.choiceRule,
      repeatableChoice: input.repeatableChoice,
    })
  ) {
    return false;
  }

  return input.choiceRule.kind !== "knownWarlockCantrip"
    ? true
    : input.repeatableChoice.kind === "knownWarlockCantrip" &&
        knownWarlockCantripIds(input.build, input.classUnitId).includes(
          input.repeatableChoice.cantripId,
        );
}

function warlockSpellcastingSource(
  build: Pick<CharacterBuild, "spellcasting">,
  classUnitId: WarlockClassUnitId,
): CharacterBuildSpellcastingSource | undefined {
  return build.spellcasting?.sources.find(
    (source) => source.sourceUnitId === classUnitId,
  );
}

function warlockPactMagicSpellcastingForClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
}): Either.Either<
  PactMagicSpellcastingCreation,
  CharacterBuildAdvancementIssue
> {
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

  if (facts.value.spellcasting?.kind !== "pact_magic_spellcasting_creation") {
    return Either.left({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message: "Cannot find Warlock Pact Magic class spellcasting facts.",
    });
  }

  return Either.right(facts.value.spellcasting);
}

function pactMagicProgressionAtLevel(
  spellcasting: PactMagicSpellcastingCreation,
  warlockLevel: number,
): PactMagicProgressionRow {
  const row = spellcasting.pactMagicProgression.reduce<
    PactMagicProgressionRow | undefined
  >(
    (best, candidate) =>
      candidate.atLevel <= warlockLevel &&
      (best === undefined || candidate.atLevel > best.atLevel)
        ? candidate
        : best,
    undefined,
  );
  const firstRow = spellcasting.pactMagicProgression[0];
  return row ?? firstRow;
}

function currentPactMagicStateIssue(input: {
  readonly source: CharacterBuildSpellcastingSource;
  readonly pactMagicSlotPool?: CharacterBuildPactMagicSlotPool;
  readonly progression: PactMagicProgressionRow;
}): CharacterBuildAdvancementIssue | undefined {
  if (input.source.cantrips.length !== input.progression.cantripTotal) {
    return {
      code: "invalidWarlockPactMagicCantripSelectionCount",
      warlockLevel: input.progression.atLevel,
      expectedCount: input.progression.cantripTotal,
      actualCount: input.source.cantrips.length,
      message:
        "Cannot advance Warlock Pact Magic from a build whose current cantrip count does not match its Warlock level.",
    };
  }

  if (
    input.source.preparedSpells.length !== input.progression.preparedSpellTotal
  ) {
    return {
      code: "invalidWarlockPactMagicPreparedSpellSelectionCount",
      warlockLevel: input.progression.atLevel,
      expectedCount: input.progression.preparedSpellTotal,
      actualCount: input.source.preparedSpells.length,
      message:
        "Cannot advance Warlock Pact Magic from a build whose current prepared-spell count does not match its Warlock level.",
    };
  }

  if (
    input.pactMagicSlotPool?.count !== input.progression.pactSlotCount ||
    input.pactMagicSlotPool?.slotLevel !== input.progression.pactSlotLevel
  ) {
    return invalidPactMagicSlotProjectionIssue({
      warlockLevel: input.progression.atLevel,
      progression: input.progression,
      ...(input.pactMagicSlotPool === undefined
        ? {}
        : { pactMagicSlotPool: input.pactMagicSlotPool }),
    });
  }

  return undefined;
}

function invalidPactMagicSlotProjectionIssue(input: {
  readonly warlockLevel: number;
  readonly progression: PactMagicProgressionRow;
  readonly pactMagicSlotPool?: CharacterBuildPactMagicSlotPool;
}): CharacterBuildAdvancementIssue {
  return {
    code: "invalidWarlockPactMagicSlotProjection",
    warlockLevel: input.warlockLevel,
    expectedCount: input.progression.pactSlotCount,
    expectedSlotLevel: input.progression.pactSlotLevel,
    ...(input.pactMagicSlotPool === undefined
      ? {}
      : {
          actualCount: input.pactMagicSlotPool.count,
          actualSlotLevel: input.pactMagicSlotPool.slotLevel,
        }),
    message:
      "Warlock Pact Magic slot capacity must match the Warlock Features table.",
  };
}

function pactMagicSlotPoolFromProgression(
  progression: PactMagicProgressionRow,
): CharacterBuildPactMagicSlotPool {
  return {
    kind: "pactMagic",
    count: progression.pactSlotCount,
    slotLevel: progression.pactSlotLevel,
  };
}

function isWarlockCantrip(cantripId: UnitRecord["id"]): boolean {
  return allCantripsFromClassSpellList(WARLOCK_CLASS_NAME, [cantripId]);
}

function warlockPreparedSpellIsEligible(input: {
  readonly spellId: UnitRecord["id"];
  readonly maximumSpellLevel: number;
}): boolean {
  const spellLevel = classSpellListPreparedSpellLevel(
    WARLOCK_CLASS_NAME,
    input.spellId,
  );
  return spellLevel !== undefined && spellLevel <= input.maximumSpellLevel;
}

function duplicateValue<T>(values: readonly T[]): T | undefined {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }

  return undefined;
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
