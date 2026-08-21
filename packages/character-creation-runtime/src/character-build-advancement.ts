// KERNEL-COVERAGE: runtime-owner CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.class-feature-advancement-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.fighter-fighting-style-advancement-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.fighting-style-cantrip-advancement-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.weapon-mastery-level-gain
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.bard-magical-secrets-spell-access
import { Brand, Either, Match, Option } from "effect";
import type { ClassName } from "@dnd/shared/game-facts";
import { classCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import {
  allCantripsFromClassSpellList,
  classSpellListForClassName,
  classSpellListPreparedSpellLevel,
  type ClassSpellListName,
} from "@dnd/surface/surface/unit-catalog";
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
  sorcererMetamagicOptionId,
  type CharacterBuild,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildFeature,
  type CharacterBuildPactMagicSlotPool,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingSource,
  type ChoiceCreationHole,
  type EldritchInvocationId,
  type SorcererMetamagicOptionId,
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
import {
  availableSpellSlotLevels,
  classSpellcastingCreationAtLevel,
  isListPreparedSpellcastingCreation,
  type ListPreparedReadableSpellcasting,
} from "./class-spellcasting.ts";
import {
  isWeaponMasteryChoiceFeature,
  weaponMasteryChoiceProfileForClassLevel,
  weaponMasteryChoiceProfileForFeature,
  type WeaponMasteryChoiceFeature,
  type WeaponMasteryChoiceProfile,
  type WeaponMasteryChoiceProfileAtClassLevel,
} from "./weapon-mastery.ts";

const FIGHTER_CLASS_NAME = "fighter" as const satisfies ClassName;
const SORCERER_CLASS_NAME = "sorcerer" as const satisfies ClassName;
const WARLOCK_CLASS_NAME = "warlock" as const satisfies ClassName;
const FIGHTING_STYLE_FEAT_CATEGORY =
  "fighting_style" as const satisfies FeatRecord["category"];
const FIGHTING_STYLE_CANTRIP_SPELL_LEVEL = 0 as const;
const FIGHTING_STYLE_CANTRIP_REPLACEMENT_COUNT = 1 as const;
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

export type SorcererClassUnitId = ClassUnitId &
  Brand.Brand<"SorcererClassUnitId">;
const SorcererClassUnitId = Brand.nominal<SorcererClassUnitId>();

export type FightingStyleFeatUnitId = UnitRecord["id"] &
  Brand.Brand<"FightingStyleFeatUnitId">;
const FightingStyleFeatUnitId = Brand.nominal<FightingStyleFeatUnitId>();

export type FightingStyleCantripUnitId = UnitRecord["id"] &
  Brand.Brand<"FightingStyleCantripUnitId">;
const FightingStyleCantripUnitId = Brand.nominal<FightingStyleCantripUnitId>();

export type WeaponMasteryFeatureUnitId = UnitRecord["id"] &
  Brand.Brand<"WeaponMasteryFeatureUnitId">;
const WeaponMasteryFeatureUnitId = Brand.nominal<WeaponMasteryFeatureUnitId>();

export type WeaponMasteryWeaponUnitId = UnitRecord["id"] &
  Brand.Brand<"WeaponMasteryWeaponUnitId">;
const WeaponMasteryWeaponUnitId = Brand.nominal<WeaponMasteryWeaponUnitId>();

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

export type CharacterBuildFightingStyleCantripReplacementLevelGain = {
  readonly tag: "classLevelGainWithFightingStyleCantripReplacement";
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly replacement: {
    readonly replaceCantripId: FightingStyleCantripUnitId;
    readonly selectedCantripId: FightingStyleCantripUnitId;
  };
  readonly preparedSpellcasting: CharacterBuildListPreparedSpellcastingLevelGain;
};

export type CharacterBuildListPreparedSpellcastingOnlyLevelGain = {
  readonly tag: "classLevelGainWithListPreparedSpellcasting";
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly preparedSpellcasting: CharacterBuildListPreparedSpellcastingLevelGain;
};

export type CharacterBuildListPreparedSpellcastingLevelGain = {
  readonly gainedPreparedSpells: readonly UnitRecord["id"][];
  readonly preparedSpellReplacement?: {
    readonly replaceSpellId: UnitRecord["id"];
    readonly selectedSpellId: UnitRecord["id"];
  };
};

export type CharacterBuildWeaponMasteryOnlyLevelGain = {
  readonly tag: "classLevelGainWithWeaponMasterySelection";
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly weaponMastery: {
    readonly featureUnitId: WeaponMasteryFeatureUnitId;
    readonly selectedWeaponUnitIds: readonly WeaponMasteryWeaponUnitId[];
  };
};

export type CharacterBuildFighterWeaponMasteryAndFightingStyleReplacementLevelGain =
  {
    readonly tag: "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement";
    readonly classUnitId: FighterClassUnitId;
    readonly hitPointRule: FixedHigherLevelClassHitPointRule;
    readonly weaponMastery: {
      readonly featureUnitId: WeaponMasteryFeatureUnitId;
      readonly selectedWeaponUnitIds: readonly WeaponMasteryWeaponUnitId[];
    };
    readonly fightingStyleReplacement: {
      readonly selectedFeatUnitId: FightingStyleFeatUnitId;
    };
  };

export type CharacterBuildWeaponMasteryLevelGain =
  | CharacterBuildWeaponMasteryOnlyLevelGain
  | CharacterBuildFighterWeaponMasteryAndFightingStyleReplacementLevelGain;

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

export type CharacterBuildSorcererMetamagicLevelGain = {
  readonly tag: "sorcererLevelGain";
  readonly classUnitId: SorcererClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly metamagic: {
    readonly gainedOptions: readonly SorcererMetamagicOptionId[];
    readonly replacement?: {
      readonly replaceOptionId: SorcererMetamagicOptionId;
      readonly selectedOptionId: SorcererMetamagicOptionId;
    };
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
  | CharacterBuildListPreparedSpellcastingOnlyLevelGain
  | CharacterBuildFighterFightingStyleReplacementLevelGain
  | CharacterBuildFightingStyleCantripReplacementLevelGain
  | CharacterBuildWeaponMasteryLevelGain
  | CharacterBuildFighterWeaponMasteryAndFightingStyleReplacementLevelGain
  | CharacterBuildSorcererMetamagicLevelGain
  | CharacterBuildWarlockLevelGain;

export const CHARACTER_BUILD_CLASS_LEVEL_GAIN_TAGS = [
  "classLevelGain",
  "classLevelGainWithListPreparedSpellcasting",
  "fighterLevelGainWithFightingStyleReplacement",
  "classLevelGainWithFightingStyleCantripReplacement",
  "classLevelGainWithWeaponMasterySelection",
  "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
  "sorcererLevelGain",
  "warlockLevelGain",
] as const satisfies readonly CharacterBuildClassLevelGain["tag"][];

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
      readonly code: "nonSorcererClassLevelGain";
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
      readonly code: "missingFightingStyleCantripFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "ambiguousFightingStyleCantripFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitIds: readonly UnitRecord["id"][];
      readonly message: string;
    }
  | {
      readonly code: "missingFightingStyleCantripSpellcastingSource";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidFightingStyleCantripSelectionCount";
      readonly featureUnitId: UnitRecord["id"];
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidFightingStyleCantripReplacement";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingFightingStyleCantripReplacement";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "sameFightingStyleCantripReplacement";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "duplicateFightingStyleCantripSelection";
      readonly cantripId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingListPreparedSpellcasting";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidListPreparedSpellSelectionCount";
      readonly classLevel: number;
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidListPreparedSpellGainCount";
      readonly classLevel: number;
      readonly expectedGains: number;
      readonly actualGains: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidListPreparedSpellChoice";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingListPreparedSpellReplacement";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "sameListPreparedSpellReplacement";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "duplicateListPreparedSpellSelection";
      readonly spellId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "nonWeaponMasteryFeature";
      readonly unitId: UnitRecord["id"];
      readonly unitKind?: UnitRecord["kind"];
      readonly message: string;
    }
  | {
      readonly code: "nonWeaponMasteryWeapon";
      readonly unitId: UnitRecord["id"];
      readonly unitKind?: UnitRecord["kind"];
      readonly message: string;
    }
  | {
      readonly code: "missingWeaponMasteryFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "ambiguousWeaponMasteryFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitIds: readonly UnitRecord["id"][];
      readonly message: string;
    }
  | {
      readonly code: "weaponMasteryFeatureClassMismatch";
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidWeaponMasterySelectionCount";
      readonly classLevel: number;
      readonly featureUnitId: UnitRecord["id"];
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "duplicateWeaponMasterySelection";
      readonly featureUnitId: UnitRecord["id"];
      readonly weaponUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "invalidWeaponMasterySelection";
      readonly featureUnitId: UnitRecord["id"];
      readonly weaponUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "missingExistingWeaponMasterySelection";
      readonly featureUnitId: UnitRecord["id"];
      readonly weaponUnitId: UnitRecord["id"];
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
      readonly code: "missingSorcererMetamagicFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly message: string;
    }
  | {
      readonly code: "ambiguousSorcererMetamagicFeatureChoice";
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitIds: readonly UnitRecord["id"][];
      readonly message: string;
    }
  | {
      readonly code: "unknownSorcererMetamagicOption";
      readonly optionId: string;
      readonly message: string;
    }
  | {
      readonly code: "invalidSorcererMetamagicOption";
      readonly optionId: SorcererMetamagicOptionId;
      readonly message: string;
    }
  | {
      readonly code: "invalidSorcererMetamagicSelectionCount";
      readonly sorcererLevel: number;
      readonly expectedCount: number;
      readonly actualCount: number;
      readonly message: string;
    }
  | {
      readonly code: "invalidSorcererMetamagicGainCount";
      readonly sorcererLevel: number;
      readonly expectedGains: number;
      readonly actualGains: number;
      readonly message: string;
    }
  | {
      readonly code: "missingSelectedSorcererMetamagicOption";
      readonly optionId: SorcererMetamagicOptionId;
      readonly message: string;
    }
  | {
      readonly code: "sameSorcererMetamagicReplacement";
      readonly optionId: SorcererMetamagicOptionId;
      readonly message: string;
    }
  | {
      readonly code: "duplicateSorcererMetamagicOption";
      readonly optionId: SorcererMetamagicOptionId;
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
type FightingStyleCantripGrant = Extract<
  EffectAtom,
  { readonly kind: "grant_spell_access_choice" }
>;
type SupportedFightingStyleCantripGrant = FightingStyleCantripGrant & {
  readonly spellList: ClassSpellListName;
  readonly replacement: {
    readonly trigger: "class_level_gain";
    readonly replacementCount: typeof FIGHTING_STYLE_CANTRIP_REPLACEMENT_COUNT;
  };
};
type FightingStyleCantripFeatureChoice = {
  readonly featureUnitId: UnitRecord["id"];
  readonly grant: SupportedFightingStyleCantripGrant;
};
type EldritchInvocationReplacement = NonNullable<
  CharacterBuildWarlockLevelGain["eldritchInvocations"]["replacement"]
>;
type SelectedEldritchInvocationFeature = Extract<
  CharacterBuildFeature,
  { readonly kind: "selectedEldritchInvocation" }
>;
type SelectedSorcererMetamagicOptionFeature = Extract<
  CharacterBuildFeature,
  { readonly kind: "selectedSorcererMetamagicOption" }
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
type SorcererMetamagicFeatureChoice = {
  readonly featureUnitId: UnitRecord["id"];
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "metamagic_options" }
  >;
};
type PactMagicProgressionRow =
  PactMagicSpellcastingCreation["pactMagicProgression"][number];

export function fighterClassUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
}): Either.Either<FighterClassUnitId, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  if (facts.className !== FIGHTER_CLASS_NAME) {
    return Either.left({
      code: "nonFighterClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.className,
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
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  if (facts.className !== WARLOCK_CLASS_NAME) {
    return Either.left({
      code: "nonWarlockClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.className,
      message:
        "Eldritch Invocation lifecycle choices are only legal when gaining a Warlock level.",
    });
  }

  return Either.right(WarlockClassUnitId(input.classUnitId));
}

export function sorcererClassUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
}): Either.Either<SorcererClassUnitId, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  if (facts.className !== SORCERER_CLASS_NAME) {
    return Either.left({
      code: "nonSorcererClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.className,
      message:
        "Metamagic lifecycle choices are only legal when gaining a Sorcerer level.",
    });
  }

  return Either.right(SorcererClassUnitId(input.classUnitId));
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

export function fightingStyleCantripUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly unitId: UnitRecord["id"];
}): Either.Either<FightingStyleCantripUnitId, CharacterBuildAdvancementIssue> {
  const featureChoice = fightingStyleCantripFeatureChoiceForClass(input);
  /* v8 ignore start -- The typed Fighting Style cantrip route was admitted from this exact class feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

  if (
    !allCantripsFromClassSpellList({
      className: featureChoice.right.grant.spellList,
      spellIds: [input.unitId],
      unitLibrary: input.unitLibrary,
    })
  ) {
    return Either.left({
      code: "invalidFightingStyleCantripReplacement",
      cantripId: input.unitId,
      message:
        "Fighting Style cantrip replacement must choose a cantrip from the granted class spell list.",
    });
  }

  return Either.right(FightingStyleCantripUnitId(input.unitId));
}

export function weaponMasteryFeatureUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
}): Either.Either<WeaponMasteryFeatureUnitId, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    return Either.left({
      code: "unknownUnitId",
      unitId: input.unitId,
      message: `Unknown Unit id ${input.unitId}.`,
    });
  }

  if (!isWeaponMasteryChoiceFeature(unit.value)) {
    return Either.left({
      code: "nonWeaponMasteryFeature",
      unitId: input.unitId,
      unitKind: unit.value.kind,
      message: `${input.unitId} is not a Weapon Mastery class-feature Unit.`,
    });
  }

  return Either.right(WeaponMasteryFeatureUnitId(input.unitId));
}

export function weaponMasteryWeaponUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
}): Either.Either<WeaponMasteryWeaponUnitId, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    return Either.left({
      code: "unknownUnitId",
      unitId: input.unitId,
      message: `Unknown Unit id ${input.unitId}.`,
    });
  }

  if (unit.value.kind !== "weapon") {
    return Either.left({
      code: "nonWeaponMasteryWeapon",
      unitId: input.unitId,
      unitKind: unit.value.kind,
      message: `${input.unitId} is not a weapon Unit.`,
    });
  }

  return Either.right(WeaponMasteryWeaponUnitId(input.unitId));
}

export function weaponMasteryLevelGain(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly featureUnitId: UnitRecord["id"];
  readonly selectedWeaponUnitIds: readonly UnitRecord["id"][];
  readonly fightingStyleReplacement?: {
    readonly selectedFeatUnitId: UnitRecord["id"];
  };
}): Either.Either<
  CharacterBuildWeaponMasteryLevelGain,
  CharacterBuildAdvancementIssue
> {
  const featureUnitId = weaponMasteryFeatureUnitId({
    unitLibrary: input.unitLibrary,
    unitId: input.featureUnitId,
  });
  if (Either.isLeft(featureUnitId)) return Either.left(featureUnitId.left);

  const selectedWeaponUnitIds: WeaponMasteryWeaponUnitId[] = [];
  for (const unitId of input.selectedWeaponUnitIds) {
    const selectedWeaponUnitId = weaponMasteryWeaponUnitId({
      unitLibrary: input.unitLibrary,
      unitId,
    });
    if (Either.isLeft(selectedWeaponUnitId)) {
      return Either.left(selectedWeaponUnitId.left);
    }
    selectedWeaponUnitIds.push(selectedWeaponUnitId.right);
  }

  if (input.fightingStyleReplacement !== undefined) {
    const classUnitId = fighterClassUnitId(input);
    if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);

    const selectedFeatUnitId = fightingStyleFeatUnitId({
      unitLibrary: input.unitLibrary,
      unitId: input.fightingStyleReplacement.selectedFeatUnitId,
    });
    if (Either.isLeft(selectedFeatUnitId)) {
      return Either.left(selectedFeatUnitId.left);
    }

    return Either.right({
      tag: "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
      classUnitId: classUnitId.right,
      hitPointRule: input.hitPointRule,
      weaponMastery: {
        featureUnitId: featureUnitId.right,
        selectedWeaponUnitIds,
      },
      fightingStyleReplacement: {
        selectedFeatUnitId: selectedFeatUnitId.right,
      },
    });
  }

  return Either.right({
    tag: "classLevelGainWithWeaponMasterySelection",
    classUnitId: input.classUnitId,
    hitPointRule: input.hitPointRule,
    weaponMastery: {
      featureUnitId: featureUnitId.right,
      selectedWeaponUnitIds,
    },
  });
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

export function classLevelGainWithFightingStyleCantripReplacement(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly replaceCantripId: UnitRecord["id"];
  readonly selectedCantripId: UnitRecord["id"];
  readonly preparedSpellcasting: CharacterBuildListPreparedSpellcastingLevelGain;
}): Either.Either<
  CharacterBuildFightingStyleCantripReplacementLevelGain,
  CharacterBuildAdvancementIssue
> {
  const featureChoice = fightingStyleCantripFeatureChoiceForClass(input);
  /* v8 ignore start -- The typed Fighting Style replacement route was admitted from this exact cantrip feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

  const replaceCantripId = fightingStyleCantripUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
    unitId: input.replaceCantripId,
  });
  /* v8 ignore start -- The route parser already narrowed the replaced cantrip id against the retained Fighting Style selection. */
  if (Either.isLeft(replaceCantripId))
    return Either.left(replaceCantripId.left);
  /* v8 ignore stop */

  const selectedCantripId = fightingStyleCantripUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
    unitId: input.selectedCantripId,
  });
  if (Either.isLeft(selectedCantripId)) {
    return Either.left(selectedCantripId.left);
  }

  return Either.right({
    tag: "classLevelGainWithFightingStyleCantripReplacement",
    classUnitId: input.classUnitId,
    hitPointRule: input.hitPointRule,
    replacement: {
      replaceCantripId: replaceCantripId.right,
      selectedCantripId: selectedCantripId.right,
    },
    preparedSpellcasting: input.preparedSpellcasting,
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
  /* v8 ignore start -- The typed Warlock route already established this selected class as Warlock. */
  if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);
  /* v8 ignore stop */

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

export function sorcererLevelGain(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly gainedOptions: readonly (string | SorcererMetamagicOptionId)[];
  readonly replacement?: {
    readonly replaceOptionId: string | SorcererMetamagicOptionId;
    readonly selectedOptionId: string | SorcererMetamagicOptionId;
  };
}): Either.Either<
  CharacterBuildSorcererMetamagicLevelGain,
  CharacterBuildAdvancementIssue
> {
  const classUnitId = sorcererClassUnitId(input);
  /* v8 ignore start -- The typed Sorcerer route already established this selected class as Sorcerer. */
  if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);
  /* v8 ignore stop */

  const gainedOptions = parseSorcererMetamagicOptionIds(input.gainedOptions);
  if (Either.isLeft(gainedOptions)) return Either.left(gainedOptions.left);

  const replacement =
    input.replacement === undefined
      ? undefined
      : parseSorcererMetamagicReplacement(input.replacement);
  if (replacement !== undefined && Either.isLeft(replacement)) {
    return Either.left(replacement.left);
  }

  return Either.right({
    tag: "sorcererLevelGain",
    classUnitId: classUnitId.right,
    hitPointRule: input.hitPointRule,
    metamagic: {
      gainedOptions: gainedOptions.right,
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
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

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
    Match.when({ tag: "classLevelGainWithListPreparedSpellcasting" }, () =>
      plainClassLevelGainFeatures({
        build: buildForFeatureUpdate,
        unitLibrary: input.unitLibrary,
        levelGain: {
          tag: "classLevelGain",
          classUnitId: input.levelGain.classUnitId,
          hitPointRule: input.levelGain.hitPointRule,
        },
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
    Match.when(
      { tag: "classLevelGainWithFightingStyleCantripReplacement" },
      () =>
        plainClassLevelGainFeatures({
          build: buildForFeatureUpdate,
          unitLibrary: input.unitLibrary,
          levelGain: {
            tag: "classLevelGain",
            classUnitId: input.levelGain.classUnitId,
            hitPointRule: input.levelGain.hitPointRule,
          },
        }),
    ),
    Match.when(
      { tag: "classLevelGainWithWeaponMasterySelection" },
      (levelGain) =>
        updateWeaponMasterySelectedFeatures({
          build: buildForFeatureUpdate,
          unitLibrary: input.unitLibrary,
          levelGain,
        }),
    ),
    Match.when(
      {
        tag: "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
      },
      (levelGain) =>
        updateWeaponMasterySelectedFeatures({
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
    Match.when({ tag: "sorcererLevelGain" }, (levelGain) =>
      updateSorcererMetamagicOptions({
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
  /* v8 ignore start -- A parsed level gain cannot make its already-valid progression nonconsecutive; this reports malformed direct inputs. */
  if (Either.isLeft(progression)) {
    return Either.left({
      code: "invalidCharacterProgressionLevel",
      issue: progression.left,
      message: "Cannot add class level to CharacterBuild progression.",
    });
  }
  /* v8 ignore stop */

  return Either.right({
    ...buildForFeatureUpdate,
    progression: progression.right,
    features: features.right,
  });
}

export type CharacterBuildFightingStyleReplacementRouteSubject =
  "selectedReference";

export type CharacterBuildFightingStyleReplacementRouteOwner = "characterBuild";

export type CharacterBuildFightingStyleReplacementRouteFill = "choiceSet";

export type CharacterBuildFightingStyleReplacementRouteEvent = {
  readonly kind: "applyCreationFillBatch";
  readonly subject: CharacterBuildFightingStyleReplacementRouteSubject;
  readonly fills: readonly [CharacterBuildFightingStyleReplacementRouteFill];
  readonly holes: readonly [];
  readonly owner: CharacterBuildFightingStyleReplacementRouteOwner;
};

export type CharacterBuildFightingStyleReplacementRoute<RouteEvent> = {
  readonly build: CharacterBuild;
  readonly route: readonly (
    | RouteEvent
    | CharacterBuildFightingStyleReplacementRouteEvent
  )[];
};

export type CharacterBuildWarlockLevelGainRouteSubject = "selectedReference";

export type CharacterBuildWarlockLevelGainRouteFill = "choiceSet";

export type CharacterBuildWarlockLevelGainAcceptedRouteOwner = "characterBuild";

export type CharacterBuildWarlockLevelGainRejectedRouteOwner =
  "creationSupportProfileAdmission";

export type CharacterBuildWarlockLevelGainAcceptedRouteEvent = {
  readonly kind: "applyCreationFillBatch";
  readonly subject: CharacterBuildWarlockLevelGainRouteSubject;
  readonly fills: readonly [CharacterBuildWarlockLevelGainRouteFill];
  readonly holes: readonly [];
  readonly owner: CharacterBuildWarlockLevelGainAcceptedRouteOwner;
};

export type CharacterBuildWarlockLevelGainRejectedRouteEvent = {
  readonly kind: "applyCreationFillBatch";
  readonly subject: CharacterBuildWarlockLevelGainRouteSubject;
  readonly fills: readonly [CharacterBuildWarlockLevelGainRouteFill];
  readonly holes: readonly ["unitChoice"];
  readonly owner: CharacterBuildWarlockLevelGainRejectedRouteOwner;
};

export type CharacterBuildWarlockLevelGainRoute<RouteEvent> =
  | {
      readonly tag: "accepted";
      readonly build: CharacterBuild;
      readonly route: readonly (
        | RouteEvent
        | CharacterBuildWarlockLevelGainAcceptedRouteEvent
      )[];
    }
  | {
      readonly tag: "rejected";
      readonly build: CharacterBuild;
      readonly issue: CharacterBuildWarlockInvocationRouteRejectionIssue;
      readonly route: readonly (
        | RouteEvent
        | CharacterBuildWarlockLevelGainRejectedRouteEvent
      )[];
    };

export type CharacterBuildWarlockInvocationRouteRejectionIssue = Extract<
  CharacterBuildAdvancementIssue,
  {
    readonly code:
      | "lockedEldritchInvocationReplacement"
      | "duplicateEldritchInvocationSelection"
      | "unmetEldritchInvocationPrerequisite";
  }
>;

export function advanceCharacterBuildFightingStyleReplacementWithRoute<
  RouteEvent,
>(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildFighterFightingStyleReplacementLevelGain;
  readonly route: readonly RouteEvent[];
}): Either.Either<
  CharacterBuildFightingStyleReplacementRoute<RouteEvent>,
  CharacterBuildAdvancementIssue
> {
  const advanced = advanceCharacterBuildClassLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    levelGain: input.levelGain,
  });
  /* v8 ignore start -- The route constructor already admitted every class-level gain invariant consumed by the reducer. */
  if (Either.isLeft(advanced)) return Either.left(advanced.left);
  /* v8 ignore stop */

  return Either.right({
    build: advanced.right,
    route: [...input.route, routeApplyFightingStyleReplacementFill()],
  });
}

export function applyCharacterBuildWarlockLevelGainWithRoute<
  RouteEvent,
>(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildWarlockLevelGain;
  readonly route: readonly RouteEvent[];
}): Either.Either<
  CharacterBuildWarlockLevelGainRoute<RouteEvent>,
  CharacterBuildAdvancementIssue
> {
  const advanced = advanceCharacterBuildClassLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    levelGain: input.levelGain,
  });
  if (Either.isRight(advanced)) {
    return Either.right({
      tag: "accepted",
      build: advanced.right,
      route: [...input.route, routeApplyWarlockLevelGainFill()],
    });
  }

  if (isWarlockInvocationRouteRejectionIssue(advanced.left)) {
    return Either.right({
      tag: "rejected",
      build: input.build,
      issue: advanced.left,
      route: [...input.route, routeRejectWarlockInvocationSelectionFill()],
    });
  }

  return Either.left(advanced.left);
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

function routeApplyFightingStyleReplacementFill(): CharacterBuildFightingStyleReplacementRouteEvent {
  return {
    kind: "applyCreationFillBatch",
    subject: "selectedReference",
    fills: ["choiceSet"],
    holes: [],
    owner: "characterBuild",
  };
}

function routeApplyWarlockLevelGainFill(): CharacterBuildWarlockLevelGainAcceptedRouteEvent {
  return {
    kind: "applyCreationFillBatch",
    subject: "selectedReference",
    fills: ["choiceSet"],
    holes: [],
    owner: "characterBuild",
  };
}

function routeRejectWarlockInvocationSelectionFill(): CharacterBuildWarlockLevelGainRejectedRouteEvent {
  return {
    kind: "applyCreationFillBatch",
    subject: "selectedReference",
    fills: ["choiceSet"],
    holes: ["unitChoice"],
    owner: "creationSupportProfileAdmission",
  };
}

function isWarlockInvocationRouteRejectionIssue(
  issue: CharacterBuildAdvancementIssue,
): issue is CharacterBuildWarlockInvocationRouteRejectionIssue {
  return (
    issue.code === "lockedEldritchInvocationReplacement" ||
    issue.code === "duplicateEldritchInvocationSelection" ||
    issue.code === "unmetEldritchInvocationPrerequisite"
  );
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

  if (
    input.levelGain.tag === "classLevelGainWithFightingStyleCantripReplacement"
  ) {
    return updateFightingStyleCantrips({
      build: input.build,
      unitLibrary: input.unitLibrary,
      levelGain: input.levelGain,
    });
  }

  if (input.levelGain.tag === "classLevelGainWithListPreparedSpellcasting") {
    return updateListPreparedSpellcasting({
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
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  if (facts.className !== WARLOCK_CLASS_NAME) {
    return Either.right(input.build.spellcasting);
  }

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  /* v8 ignore start -- Admitted Warlock class facts always include Pact Magic spellcasting creation data. */
  const warlockSpellcasting =
    "spellcasting" in facts ? facts.spellcasting : undefined;
  const unchanged = warlockPactMagicCanRemainUnchanged({
    build: input.build,
    classUnitId: WarlockClassUnitId(input.levelGain.classUnitId),
    currentWarlockLevel,
    nextWarlockLevel: currentWarlockLevel + 1,
    ...(warlockSpellcasting === undefined
      ? {}
      : { spellcasting: warlockSpellcasting }),
  });
  /* v8 ignore stop */
  if (Either.isLeft(unchanged)) return Either.left(unchanged.left);

  return Either.right(input.build.spellcasting);
}

function updateListPreparedSpellcasting(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildListPreparedSpellcastingOnlyLevelGain;
}): Either.Either<
  CharacterBuild["spellcasting"],
  CharacterBuildAdvancementIssue
> {
  const spellcasting = input.build.spellcasting;
  const source = spellcasting?.sources.find(
    (candidate) => candidate.sourceUnitId === input.levelGain.classUnitId,
  );
  if (spellcasting === undefined || source === undefined) {
    return Either.left({
      code: "missingListPreparedSpellcasting",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot advance list-prepared spellcasting because the build has no matching class spellcasting source.",
    });
  }

  const preparedSpellcasting = applyListPreparedSpellcastingLevelGain({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
    source,
    levelGain: input.levelGain.preparedSpellcasting,
  });
  if (Either.isLeft(preparedSpellcasting)) {
    return Either.left(preparedSpellcasting.left);
  }

  return Either.right({
    ...spellcasting,
    sources: mapCharacterBuildSpellcastingSources(
      spellcasting.sources,
      (candidate) =>
        candidate.sourceUnitId === input.levelGain.classUnitId
          ? {
              ...candidate,
              preparedSpells: preparedSpellcasting.right.preparedSpells,
            }
          : candidate,
    ),
    slotPools: {
      ...spellcasting.slotPools,
      spellcasting: {
        kind: "spellcasting",
        slots: preparedSpellcasting.right.spellSlots,
      },
    },
  });
}

function classUnitRecord(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Either.Either<ClassRecord, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);
  /* v8 ignore start -- Supported advancement routes admit a class id from this catalog before calling the typed core. */
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
  /* v8 ignore stop */

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
  /* v8 ignore start -- The closed invocation-id parser and installed option table are defined from the same roster. */
  if (option === undefined) {
    return Either.left({
      code: "unknownEldritchInvocation",
      invocationId: invocationId.right,
      message: `Unknown Eldritch Invocation id ${invocationId.right}.`,
    });
  }
  /* v8 ignore stop */

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

function parseSorcererMetamagicOptionIds(
  optionIds: readonly (string | SorcererMetamagicOptionId)[],
): Either.Either<
  readonly SorcererMetamagicOptionId[],
  CharacterBuildAdvancementIssue
> {
  const parsed: SorcererMetamagicOptionId[] = [];
  for (const optionId of optionIds) {
    const parsedOptionId = parseKnownSorcererMetamagicOptionId(optionId);
    if (Either.isLeft(parsedOptionId)) {
      return Either.left(parsedOptionId.left);
    }
    parsed.push(parsedOptionId.right);
  }

  return Either.right(parsed);
}

function parseKnownSorcererMetamagicOptionId(
  optionId: string | SorcererMetamagicOptionId,
): Either.Either<SorcererMetamagicOptionId, CharacterBuildAdvancementIssue> {
  const parsed = sorcererMetamagicOptionId(optionId);
  if (Either.isLeft(parsed)) {
    return Either.left({
      code: "unknownSorcererMetamagicOption",
      optionId,
      message: `Unknown Sorcerer Metamagic option id ${optionId}.`,
    });
  }

  return Either.right(parsed.right);
}

function parseSorcererMetamagicReplacement(input: {
  readonly replaceOptionId: string | SorcererMetamagicOptionId;
  readonly selectedOptionId: string | SorcererMetamagicOptionId;
}): Either.Either<
  NonNullable<
    CharacterBuildSorcererMetamagicLevelGain["metamagic"]["replacement"]
  >,
  CharacterBuildAdvancementIssue
> {
  const replaceOptionId = parseKnownSorcererMetamagicOptionId(
    input.replaceOptionId,
  );
  if (Either.isLeft(replaceOptionId)) return Either.left(replaceOptionId.left);

  const selectedOptionId = parseKnownSorcererMetamagicOptionId(
    input.selectedOptionId,
  );
  if (Either.isLeft(selectedOptionId)) {
    return Either.left(selectedOptionId.left);
  }

  if (replaceOptionId.right === selectedOptionId.right) {
    return Either.left({
      code: "sameSorcererMetamagicReplacement",
      optionId: selectedOptionId.right,
      message:
        "Metamagic replacement must choose a different Metamagic option.",
    });
  }

  return Either.right({
    replaceOptionId: replaceOptionId.right,
    selectedOptionId: selectedOptionId.right,
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
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  if (facts.className === SORCERER_CLASS_NAME) {
    const sorcererClassUnitId = SorcererClassUnitId(
      input.levelGain.classUnitId,
    );
    const sorcererLevel = classLevelForUnit(
      input.build.progression,
      input.levelGain.classUnitId,
    );
    const unchanged = sorcererMetamagicCanRemainUnchanged({
      build: input.build,
      unitLibrary: input.unitLibrary,
      classUnitId: sorcererClassUnitId,
      sorcererLevel,
      nextSorcererLevel: sorcererLevel + 1,
    });
    if (Either.isLeft(unchanged)) return Either.left(unchanged.left);

    return Either.right(input.build.features);
  }

  if (facts.className !== WARLOCK_CLASS_NAME) {
    return weaponMasterySelectionsCanRemainUnchanged({
      build: input.build,
      unitLibrary: input.unitLibrary,
      classUnit: classUnit.right,
      classUnitId: input.levelGain.classUnitId,
    });
  }

  const featureChoice = eldritchInvocationFeatureForWarlockClass({
    unitLibrary: input.unitLibrary,
    classUnitId: WarlockClassUnitId(input.levelGain.classUnitId),
  });
  /* v8 ignore start -- The typed plain-Warlock route was admitted from this exact invocation feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

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

function weaponMasterySelectionsCanRemainUnchanged(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnit: ClassRecord;
  readonly classUnitId: ClassUnitId;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const feature = weaponMasteryFeatureForClass(input);
  /* v8 ignore start -- The supported Weapon Mastery route was admitted from this exact class feature. */
  if (Either.isLeft(feature)) return Either.left(feature.left);
  /* v8 ignore stop */
  if (feature.right === undefined) return Either.right(input.build.features);

  const currentClassLevel = classLevelForUnit(
    input.build.progression,
    input.classUnitId,
  );
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: feature.right.id,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- The admitted Weapon Mastery feature always has a projected profile. */
  const levelProfiles =
    profile === undefined
      ? undefined
      : weaponMasteryChoiceProfilesForLevelGain(profile, currentClassLevel);
  /* v8 ignore stop */
  /* v8 ignore start -- The admitted Weapon Mastery feature supplies a profile covering its owning class level. */
  if (levelProfiles === undefined) {
    return Either.left({
      code: "missingWeaponMasteryFeatureChoice",
      classUnitId: input.classUnitId,
      message: "Cannot find the class Weapon Mastery choice feature.",
    });
  }
  /* v8 ignore stop */
  const { currentProfile, nextProfile } = levelProfiles;

  const selectedWeaponUnitIds = selectedWeaponMasteryFeaturesForFeature(
    input.build.features,
    feature.right.id,
  ).map((selectedFeature) => selectedFeature.unitId);
  if (selectedWeaponUnitIds.length !== currentProfile.choiceCount) {
    return Either.left({
      code: "invalidWeaponMasterySelectionCount",
      classLevel: currentClassLevel,
      featureUnitId: feature.right.id,
      expectedCount: currentProfile.choiceCount,
      actualCount: selectedWeaponUnitIds.length,
      message:
        "Cannot advance from a build whose current Weapon Mastery choices do not match its class level.",
    });
  }
  const duplicateSelection = duplicateWeaponMasterySelectionIssue(
    feature.right.id,
    selectedWeaponUnitIds,
  );
  if (duplicateSelection !== undefined) {
    return Either.left(duplicateSelection);
  }

  return currentProfile.choiceCount === nextProfile.choiceCount
    ? Either.right(input.build.features)
    : Either.left({
        code: "invalidWeaponMasterySelectionCount",
        classLevel: currentClassLevel + 1,
        featureUnitId: feature.right.id,
        expectedCount: nextProfile.choiceCount,
        actualCount: selectedWeaponUnitIds.length,
        message:
          "A plain class level gain would leave the build with the wrong number of Weapon Mastery choices.",
      });
}

function weaponMasteryChoiceProfilesForLevelGain(
  profile: WeaponMasteryChoiceProfile,
  currentClassLevel: number,
):
  | {
      readonly currentProfile: WeaponMasteryChoiceProfileAtClassLevel;
      readonly nextProfile: WeaponMasteryChoiceProfileAtClassLevel;
    }
  | undefined {
  const currentProfile = weaponMasteryChoiceProfileForClassLevel(
    profile,
    currentClassLevel,
  );
  const nextProfile = weaponMasteryChoiceProfileForClassLevel(
    profile,
    currentClassLevel + 1,
  );
  /* v8 ignore start -- An admitted Weapon Mastery profile covers both adjacent supported class levels. */
  return Option.isNone(currentProfile) || Option.isNone(nextProfile)
    ? undefined
    : {
        currentProfile: currentProfile.value,
        nextProfile: nextProfile.value,
      };
  /* v8 ignore stop */
}

function updateWeaponMasterySelectedFeatures(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildWeaponMasteryLevelGain;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const feature = weaponMasteryFeatureForClass({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnit: classUnit.right,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- The supported Weapon Mastery level-gain route was admitted from this exact class feature. */
  if (Either.isLeft(feature)) return Either.left(feature.left);
  /* v8 ignore stop */
  if (feature.right === undefined) {
    return Either.left({
      code: "missingWeaponMasteryFeatureChoice",
      classUnitId: input.levelGain.classUnitId,
      message: "Cannot find the class Weapon Mastery choice feature.",
    });
  }

  if (feature.right.id !== input.levelGain.weaponMastery.featureUnitId) {
    return Either.left({
      code: "weaponMasteryFeatureClassMismatch",
      classUnitId: input.levelGain.classUnitId,
      featureUnitId: input.levelGain.weaponMastery.featureUnitId,
      message:
        "Weapon Mastery level gain must select weapons for the gaining class feature.",
    });
  }

  const currentClassLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: feature.right.id,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- The admitted Weapon Mastery level-gain feature always has a projected profile. */
  const levelProfiles =
    profile === undefined
      ? undefined
      : weaponMasteryChoiceProfilesForLevelGain(profile, currentClassLevel);
  /* v8 ignore stop */
  /* v8 ignore start -- The admitted Weapon Mastery level-gain route supplies a profile covering both adjacent levels. */
  if (levelProfiles === undefined) {
    return Either.left({
      code: "missingWeaponMasteryFeatureChoice",
      classUnitId: input.levelGain.classUnitId,
      message: "Cannot find the class Weapon Mastery choice feature.",
    });
  }
  /* v8 ignore stop */
  const { currentProfile, nextProfile } = levelProfiles;

  const currentWeaponUnitIds = selectedWeaponMasteryFeaturesForFeature(
    input.build.features,
    feature.right.id,
  ).map((feature) => feature.unitId);
  if (currentWeaponUnitIds.length !== currentProfile.choiceCount) {
    return Either.left({
      code: "invalidWeaponMasterySelectionCount",
      classLevel: currentClassLevel,
      featureUnitId: feature.right.id,
      expectedCount: currentProfile.choiceCount,
      actualCount: currentWeaponUnitIds.length,
      message:
        "Cannot advance from a build whose current Weapon Mastery choices do not match its class level.",
    });
  }
  const duplicateCurrentSelection = duplicateWeaponMasterySelectionIssue(
    feature.right.id,
    currentWeaponUnitIds,
  );
  if (duplicateCurrentSelection !== undefined) {
    return Either.left(duplicateCurrentSelection);
  }

  const selectedWeaponUnitIds =
    input.levelGain.weaponMastery.selectedWeaponUnitIds;
  if (selectedWeaponUnitIds.length !== nextProfile.choiceCount) {
    return Either.left({
      code: "invalidWeaponMasterySelectionCount",
      classLevel: currentClassLevel + 1,
      featureUnitId: feature.right.id,
      expectedCount: nextProfile.choiceCount,
      actualCount: selectedWeaponUnitIds.length,
      message:
        "Weapon Mastery level gain must leave the build with the table count for the new class level.",
    });
  }

  const duplicateSelectedWeapon = duplicateWeaponMasterySelectionIssue(
    feature.right.id,
    selectedWeaponUnitIds,
  );
  if (duplicateSelectedWeapon !== undefined) {
    return Either.left(duplicateSelectedWeapon);
  }
  const selectedSet = new Set<UnitRecord["id"]>(selectedWeaponUnitIds);

  const eligibleWeaponUnitIds = new Set(
    nextProfile.eligibleWeapons.map((weapon) => weapon.id),
  );
  for (const weaponUnitId of selectedWeaponUnitIds) {
    if (!eligibleWeaponUnitIds.has(weaponUnitId)) {
      return Either.left({
        code: "invalidWeaponMasterySelection",
        featureUnitId: feature.right.id,
        weaponUnitId,
        message:
          "Weapon Mastery level gain must choose eligible proficient weapons.",
      });
    }
  }

  for (const weaponUnitId of currentWeaponUnitIds) {
    if (!selectedSet.has(weaponUnitId)) {
      return Either.left({
        code: "missingExistingWeaponMasterySelection",
        featureUnitId: feature.right.id,
        weaponUnitId,
        message:
          "Weapon Mastery level gain can add the new table choices but cannot replace existing mastered weapons.",
      });
    }
  }

  const weaponMasteryFeatures =
    characterBuildFeaturesWithWeaponMasterySelections(
      input.build.features,
      feature.right.id,
      selectedWeaponUnitIds,
    );

  return input.levelGain.tag !==
    "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement"
    ? Either.right(weaponMasteryFeatures)
    : fightingStyleSelectedFeaturesReplaced({
        build: { ...input.build, features: weaponMasteryFeatures },
        unitLibrary: input.unitLibrary,
        classUnitId: input.levelGain.classUnitId,
        selectedFeatUnitId:
          input.levelGain.fightingStyleReplacement.selectedFeatUnitId,
      });
}

function characterBuildFeaturesWithWeaponMasterySelections(
  features: readonly CharacterBuildFeature[],
  featureUnitId: UnitRecord["id"],
  selectedWeaponUnitIds: readonly UnitRecord["id"][],
): readonly CharacterBuildFeature[] {
  const nextFeatures: CharacterBuildFeature[] = [];
  let inserted = false;

  for (const feature of features) {
    if (
      feature.kind !== "selectedClassChoice" ||
      feature.selectedFromUnitId !== featureUnitId
    ) {
      nextFeatures.push(feature);
      continue;
    }

    if (!inserted) {
      nextFeatures.push(
        ...selectedWeaponUnitIds.map((unitId) => ({
          kind: "selectedClassChoice" as const,
          unitId,
          selectedFromUnitId: featureUnitId,
        })),
      );
      inserted = true;
    }
  }

  if (!inserted) {
    nextFeatures.push(
      ...selectedWeaponUnitIds.map((unitId) => ({
        kind: "selectedClassChoice" as const,
        unitId,
        selectedFromUnitId: featureUnitId,
      })),
    );
  }

  return nextFeatures;
}

function weaponMasteryFeatureForClass(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnit: ClassRecord;
  readonly classUnitId: ClassUnitId;
}): Either.Either<
  WeaponMasteryChoiceFeature | undefined,
  CharacterBuildAdvancementIssue
> {
  const currentClassLevel = classLevelForUnit(
    input.build.progression,
    input.classUnitId,
  );
  const featureUnitIds = input.classUnit.featureGrants
    .filter((grant) => grant.level <= currentClassLevel)
    .map((grant) => grant.unitId)
    .filter((unitId) => {
      const unit = input.unitLibrary.getUnit(unitId);
      return Option.isSome(unit) && isWeaponMasteryChoiceFeature(unit.value);
    });

  /* v8 ignore start -- Supported class facts admit at most one Weapon Mastery choice feature for a class level. */
  if (featureUnitIds.length > 1) {
    return Either.left({
      code: "ambiguousWeaponMasteryFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds,
      message: "Class has more than one Weapon Mastery choice feature.",
    });
  }

  const featureUnitId = featureUnitIds[0];
  if (featureUnitId === undefined) return Either.right(undefined);

  const unit = input.unitLibrary.getUnit(featureUnitId);
  return Option.isSome(unit) && isWeaponMasteryChoiceFeature(unit.value)
    ? Either.right(unit.value)
    : Either.left({
        code: "missingWeaponMasteryFeatureChoice",
        classUnitId: input.classUnitId,
        message: "Cannot find the class Weapon Mastery choice feature.",
      });
  /* v8 ignore stop */
}

function selectedWeaponMasteryFeaturesForFeature(
  features: readonly CharacterBuildFeature[],
  featureUnitId: UnitRecord["id"],
): readonly Extract<
  CharacterBuildFeature,
  { readonly kind: "selectedClassChoice" }
>[] {
  return features.filter(
    (
      feature,
    ): feature is Extract<
      CharacterBuildFeature,
      { readonly kind: "selectedClassChoice" }
    > =>
      feature.kind === "selectedClassChoice" &&
      feature.selectedFromUnitId === featureUnitId,
  );
}

function duplicateWeaponMasterySelectionIssue(
  featureUnitId: UnitRecord["id"],
  weaponUnitIds: readonly UnitRecord["id"][],
):
  | Extract<
      CharacterBuildAdvancementIssue,
      { readonly code: "duplicateWeaponMasterySelection" }
    >
  | undefined {
  const duplicateWeaponUnitId = duplicateValue(weaponUnitIds);
  return duplicateWeaponUnitId === undefined
    ? undefined
    : {
        code: "duplicateWeaponMasterySelection",
        featureUnitId,
        weaponUnitId: duplicateWeaponUnitId,
        message: "Weapon Mastery choices must not duplicate weapon Units.",
      };
}

function replaceFightingStyleSelectedFeature(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildFighterFightingStyleReplacementLevelGain;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const replacedFeatures = fightingStyleSelectedFeaturesReplaced({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
    selectedFeatUnitId: input.levelGain.replacement.selectedFeatUnitId,
  });
  if (Either.isLeft(replacedFeatures))
    return Either.left(replacedFeatures.left);

  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  return weaponMasterySelectionsCanRemainUnchanged({
    build: { ...input.build, features: replacedFeatures.right },
    unitLibrary: input.unitLibrary,
    classUnit: classUnit.right,
    classUnitId: input.levelGain.classUnitId,
  });
}

function fightingStyleSelectedFeaturesReplaced(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly selectedFeatUnitId: FightingStyleFeatUnitId;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnitId = fighterClassUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
  });
  /* v8 ignore start -- The typed Fighting Style replacement route already established the Fighter class identity. */
  if (Either.isLeft(classUnitId)) return Either.left(classUnitId.left);
  /* v8 ignore stop */

  const hole = fightingStyleFeatureChoiceHoleForFighterClass({
    unitLibrary: input.unitLibrary,
    classUnitId: classUnitId.right,
  });
  /* v8 ignore start -- The typed replacement route was admitted from this exact retained Fighting Style hole. */
  if (Either.isLeft(hole)) return Either.left(hole.left);
  /* v8 ignore stop */

  const featureUnitId = unitChoiceSourceUnitId(hole.right);
  /* v8 ignore start -- The admitted Fighting Style hole is Unit-sourced by its retained class feature. */
  if (featureUnitId === undefined) {
    return Either.left({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }
  /* v8 ignore stop */

  const selectedFeatUnitId = input.selectedFeatUnitId;
  const selectedOptionId = creationChoiceOptionId(selectedFeatUnitId);
  /* v8 ignore start -- The replacement constructor admits only option ids from this exact Fighting Style hole. */
  if (!choiceOptionIdsFitHole(hole.right, [selectedOptionId])) {
    return Either.left({
      code: "invalidFightingStyleReplacement",
      selectedFeatUnitId,
      message: `${selectedFeatUnitId} is not supported for this Fighting Style replacement.`,
    });
  }
  /* v8 ignore stop */

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

function updateFightingStyleCantrips(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildFightingStyleCantripReplacementLevelGain;
}): Either.Either<
  CharacterBuild["spellcasting"],
  CharacterBuildAdvancementIssue
> {
  const featureChoice = fightingStyleCantripFeatureChoiceForClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- The typed cantrip replacement route was admitted from this exact acquisition feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

  const spellcasting = input.build.spellcasting;
  const source = spellcasting?.sources.find(
    (candidate) => candidate.sourceUnitId === input.levelGain.classUnitId,
  );
  if (spellcasting === undefined || source === undefined) {
    return Either.left({
      code: "missingFightingStyleCantripSpellcastingSource",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot replace Fighting Style cantrips because the build has no matching class spellcasting source.",
    });
  }

  const cantrips = fightingStyleCantripsReplaced({
    currentCantrips: source.cantrips,
    featureChoice: featureChoice.right,
    replacement: input.levelGain.replacement,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(cantrips)) return Either.left(cantrips.left);

  const preparedSpellcasting = applyListPreparedSpellcastingLevelGain({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
    source,
    levelGain: input.levelGain.preparedSpellcasting,
  });
  /* v8 ignore start -- The typed list-prepared route was admitted against this exact spellcasting source and level row. */
  if (Either.isLeft(preparedSpellcasting)) {
    return Either.left(preparedSpellcasting.left);
  }
  /* v8 ignore stop */

  return Either.right({
    ...spellcasting,
    sources: mapCharacterBuildSpellcastingSources(
      spellcasting.sources,
      (candidate) =>
        candidate.sourceUnitId === input.levelGain.classUnitId
          ? {
              ...candidate,
              cantrips: cantrips.right,
              preparedSpells: preparedSpellcasting.right.preparedSpells,
            }
          : candidate,
    ),
    slotPools: {
      ...spellcasting.slotPools,
      spellcasting: {
        kind: "spellcasting",
        slots: preparedSpellcasting.right.spellSlots,
      },
    },
  });
}

function fightingStyleCantripsReplaced(input: {
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly featureChoice: FightingStyleCantripFeatureChoice;
  readonly replacement: CharacterBuildFightingStyleCantripReplacementLevelGain["replacement"];
  readonly unitLibrary: UnitCatalog;
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.currentCantrips.length !== input.featureChoice.grant.count) {
    return Either.left({
      code: "invalidFightingStyleCantripSelectionCount",
      featureUnitId: input.featureChoice.featureUnitId,
      expectedCount: input.featureChoice.grant.count,
      actualCount: input.currentCantrips.length,
      message:
        "Cannot replace Fighting Style cantrips from a build whose current cantrip count does not match the feature grant.",
    });
  }

  const invalidCurrentCantrip = input.currentCantrips.find(
    (cantripId) =>
      !allCantripsFromClassSpellList({
        className: input.featureChoice.grant.spellList,
        spellIds: [cantripId],
        unitLibrary: input.unitLibrary,
      }),
  );
  if (invalidCurrentCantrip !== undefined) {
    return Either.left({
      code: "invalidFightingStyleCantripReplacement",
      cantripId: invalidCurrentCantrip,
      message:
        "Cannot replace Fighting Style cantrips from a build whose current cantrips do not match the granted class spell list.",
    });
  }

  if (
    input.replacement.replaceCantripId === input.replacement.selectedCantripId
  ) {
    return Either.left({
      code: "sameFightingStyleCantripReplacement",
      cantripId: input.replacement.selectedCantripId,
      message:
        "Fighting Style cantrip replacement must choose a different cantrip.",
    });
  }

  if (!input.currentCantrips.includes(input.replacement.replaceCantripId)) {
    return Either.left({
      code: "missingFightingStyleCantripReplacement",
      cantripId: input.replacement.replaceCantripId,
      message:
        "Cannot replace a Fighting Style cantrip that the build does not know.",
    });
  }

  const finalCantrips = input.currentCantrips.map((cantripId) =>
    cantripId === input.replacement.replaceCantripId
      ? input.replacement.selectedCantripId
      : cantripId,
  );
  const duplicateCantrip = duplicateValue(finalCantrips);
  if (duplicateCantrip !== undefined) {
    return Either.left({
      code: "duplicateFightingStyleCantripSelection",
      cantripId: duplicateCantrip,
      message: "Fighting Style cantrip selections must be distinct.",
    });
  }

  return Either.right(finalCantrips);
}

function applyListPreparedSpellcastingLevelGain(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly source: CharacterBuildSpellcastingSource;
  readonly levelGain: CharacterBuildListPreparedSpellcastingLevelGain;
}): Either.Either<
  {
    readonly preparedSpells: readonly UnitRecord["id"][];
    readonly spellSlots: ListPreparedReadableSpellcasting["spellSlotProjection"]["slots"];
  },
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed route constructor already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  if (!("spellcasting" in facts)) {
    return Either.left({
      code: "missingListPreparedSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance list-prepared spellcasting because the class has no readable spellcasting facts.",
    });
  }

  const currentClassLevel = classLevelForUnit(
    input.build.progression,
    input.classUnitId,
  );
  const currentSpellcasting = classSpellcastingCreationAtLevel(
    facts.spellcasting,
    currentClassLevel,
  );
  const nextSpellcasting = classSpellcastingCreationAtLevel(
    facts.spellcasting,
    currentClassLevel + 1,
  );
  /* v8 ignore start -- The list-prepared level-gain route is admitted only when both adjacent table rows and its class spell list exist. */
  if (
    currentSpellcasting === undefined ||
    nextSpellcasting === undefined ||
    !isListPreparedSpellcastingCreation(currentSpellcasting) ||
    !isListPreparedSpellcastingCreation(nextSpellcasting) ||
    !isClassSpellListName(input.unitLibrary, facts.className)
  ) {
    return Either.left({
      code: "missingListPreparedSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance list-prepared spellcasting because the current or next class level has no supported list-prepared spellcasting facts.",
    });
  }
  /* v8 ignore stop */

  const preparedSpells = applyListPreparedSpellChanges({
    eligibleSpellLists: listPreparedSpellEligibleSpellLists({
      build: input.build,
      unitLibrary: input.unitLibrary,
      className: facts.className,
      classUnitId: input.classUnitId,
      nextClassLevel: currentClassLevel + 1,
    }),
    currentPreparedSpells: input.source.preparedSpells,
    levelGain: input.levelGain,
    currentClassLevel,
    nextClassLevel: currentClassLevel + 1,
    currentSpellcasting,
    nextSpellcasting,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(preparedSpells)) return Either.left(preparedSpells.left);

  return Either.right({
    preparedSpells: preparedSpells.right,
    spellSlots: nextSpellcasting.spellSlotProjection.slots,
  });
}

function applyListPreparedSpellChanges(input: {
  readonly eligibleSpellLists: readonly ClassSpellListName[];
  readonly unitLibrary: UnitCatalog;
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly levelGain: CharacterBuildListPreparedSpellcastingLevelGain;
  readonly currentClassLevel: number;
  readonly nextClassLevel: number;
  readonly currentSpellcasting: ListPreparedReadableSpellcasting;
  readonly nextSpellcasting: ListPreparedReadableSpellcasting;
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (
    input.currentPreparedSpells.length !==
    input.currentSpellcasting.preparedAccess.choose
  ) {
    return Either.left({
      code: "invalidListPreparedSpellSelectionCount",
      classLevel: input.currentClassLevel,
      expectedCount: input.currentSpellcasting.preparedAccess.choose,
      actualCount: input.currentPreparedSpells.length,
      message:
        "Cannot advance list-prepared spellcasting from a build whose current prepared-spell count does not match its class level.",
    });
  }

  const expectedGains =
    input.nextSpellcasting.preparedAccess.choose -
    input.currentSpellcasting.preparedAccess.choose;
  if (input.levelGain.gainedPreparedSpells.length !== expectedGains) {
    return Either.left({
      code: "invalidListPreparedSpellGainCount",
      classLevel: input.nextClassLevel,
      expectedGains,
      actualGains: input.levelGain.gainedPreparedSpells.length,
      message:
        "List-prepared spell gains must match the class spellcasting progression table.",
    });
  }

  const replacedPreparedSpells = replaceListPreparedSpell({
    currentPreparedSpells: input.currentPreparedSpells,
    replacement: input.levelGain.preparedSpellReplacement,
  });
  if (Either.isLeft(replacedPreparedSpells)) {
    return Either.left(replacedPreparedSpells.left);
  }

  const finalPreparedSpells = [
    ...replacedPreparedSpells.right,
    ...input.levelGain.gainedPreparedSpells,
  ];
  const availableSpellLevels = availableSpellSlotLevels(
    input.nextSpellcasting.spellSlotProjection.slots,
  );
  const invalidSpell = finalPreparedSpells.find((spellId) => {
    const spellLevel = preparedSpellLevelFromEligibleLists(
      input.eligibleSpellLists,
      spellId,
      input.unitLibrary,
    );
    return spellLevel === undefined || !availableSpellLevels.has(spellLevel);
  });
  if (invalidSpell !== undefined) {
    return Either.left({
      code: "invalidListPreparedSpellChoice",
      spellId: invalidSpell,
      message:
        "List-prepared spell choices must come from the class spell list at a level available to the new class level.",
    });
  }

  const duplicateSpell = duplicateValue(finalPreparedSpells);
  if (duplicateSpell !== undefined) {
    return Either.left({
      code: "duplicateListPreparedSpellSelection",
      spellId: duplicateSpell,
      message: "List-prepared spell choices must be distinct.",
    });
  }

  return Either.right(finalPreparedSpells);
}

function replaceListPreparedSpell(input: {
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly replacement?: CharacterBuildListPreparedSpellcastingLevelGain["preparedSpellReplacement"];
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Either.right(input.currentPreparedSpells);
  }
  const replacement = input.replacement;

  if (replacement.replaceSpellId === replacement.selectedSpellId) {
    return Either.left({
      code: "sameListPreparedSpellReplacement",
      spellId: replacement.selectedSpellId,
      message: "List-prepared spell replacement must choose a different spell.",
    });
  }

  if (!input.currentPreparedSpells.includes(replacement.replaceSpellId)) {
    return Either.left({
      code: "missingListPreparedSpellReplacement",
      spellId: replacement.replaceSpellId,
      message:
        "Cannot replace a list-prepared spell that the build does not have prepared.",
    });
  }

  return Either.right(
    input.currentPreparedSpells.map((spellId) =>
      spellId === replacement.replaceSpellId
        ? replacement.selectedSpellId
        : spellId,
    ),
  );
}

function listPreparedSpellEligibleSpellLists(input: {
  readonly build: Pick<CharacterBuild, "features">;
  readonly unitLibrary: UnitCatalog;
  readonly className: ClassSpellListName;
  readonly classUnitId: ClassUnitId;
  readonly nextClassLevel: number;
}): readonly ClassSpellListName[] {
  const additionalSpellLists = input.build.features.flatMap((feature) => {
    if (
      feature.kind !== "selectedClassChoice" ||
      feature.selectedFromUnitId !== input.classUnitId
    ) {
      return [];
    }
    const unit = input.unitLibrary.getUnit(feature.unitId);
    if (
      Option.isNone(unit) ||
      unit.value.kind !== "class_feature" ||
      unit.value.className !== input.className ||
      unit.value.acquiredAtLevel > input.nextClassLevel ||
      unit.value.mechanics.family !== "prepared_spell_list_expansion" ||
      unit.value.mechanics.baseSpellList !== input.className
    ) {
      return [];
    }
    return unit.value.mechanics.additionalEligibleSpellLists;
  });
  return [...new Set([input.className, ...additionalSpellLists])];
}

function preparedSpellLevelFromEligibleLists(
  spellLists: readonly ClassSpellListName[],
  spellId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): number | undefined {
  for (const spellList of spellLists) {
    const spellLevel = classSpellListPreparedSpellLevel({
      className: spellList,
      spellId,
      unitLibrary,
    });
    if (spellLevel !== undefined) return spellLevel;
  }
  return undefined;
}

function updateSorcererMetamagicOptions(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildSorcererMetamagicLevelGain;
}): Either.Either<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const featureChoice = sorcererMetamagicFeatureForSorcererClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- The typed Sorcerer level-gain route was admitted from this exact Metamagic feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

  const sorcererLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const nextSorcererLevel = sorcererLevel + 1;
  const selectedFeatures = selectedSorcererMetamagicOptionFeaturesForFeature(
    input.build.features,
    featureChoice.right.featureUnitId,
  );
  const selectedOptionIds = selectedFeatures.map((feature) => feature.optionId);
  const selectionIssue = sorcererMetamagicSelectionCountIssue({
    mechanics: featureChoice.right.mechanics,
    sorcererLevel,
    selectedOptionIds,
  });
  if (selectionIssue !== undefined) {
    return Either.left(selectionIssue);
  }

  const nextExpectedCount = sorcererMetamagicCountAtLevel(
    featureChoice.right.mechanics,
    nextSorcererLevel,
  );
  const expectedGains = nextExpectedCount - selectedOptionIds.length;
  const gainedOptions = input.levelGain.metamagic.gainedOptions;
  if (gainedOptions.length !== expectedGains) {
    return Either.left({
      code: "invalidSorcererMetamagicGainCount",
      sorcererLevel: nextSorcererLevel,
      expectedGains,
      actualGains: gainedOptions.length,
      message:
        "Sorcerer level gain must include exactly the new Metamagic option choices from the Sorcerer Features table.",
    });
  }

  const invalidGain = gainedOptions.find(
    (optionId) =>
      !sorcererMetamagicOptionBelongsToFeature(
        featureChoice.right.mechanics,
        optionId,
      ),
  );
  /* v8 ignore start -- The Metamagic level-gain parser admits gained option ids from this installed feature roster. */
  if (invalidGain !== undefined) {
    return Either.left({
      code: "invalidSorcererMetamagicOption",
      optionId: invalidGain,
      message:
        "Metamagic option gains must come from the installed Surface option roster.",
    });
  }
  /* v8 ignore stop */

  const alreadyKnownGain = gainedOptions.find((optionId) =>
    selectedOptionIds.includes(optionId),
  );
  if (alreadyKnownGain !== undefined) {
    return Either.left({
      code: "duplicateSorcererMetamagicOption",
      optionId: alreadyKnownGain,
      message:
        "Metamagic option gains must choose options the build does not already know.",
    });
  }

  const replacedOptions = replaceSorcererMetamagicOptionSelection({
    selectedOptionIds,
    ...(input.levelGain.metamagic.replacement === undefined
      ? {}
      : { replacement: input.levelGain.metamagic.replacement }),
  });
  if (Either.isLeft(replacedOptions)) {
    return Either.left(replacedOptions.left);
  }

  const finalOptions = [...replacedOptions.right, ...gainedOptions];
  const duplicateOption = duplicateValue(finalOptions);
  if (duplicateOption !== undefined) {
    return Either.left({
      code: "duplicateSorcererMetamagicOption",
      optionId: duplicateOption,
      message: "Metamagic known options must remain distinct.",
    });
  }

  return Either.right([
    ...input.build.features.filter(
      (feature) =>
        !isSelectedSorcererMetamagicOptionFromFeature(
          feature,
          featureChoice.right.featureUnitId,
        ),
    ),
    ...finalOptions.map((optionId) =>
      sorcererMetamagicOptionFeature(
        optionId,
        featureChoice.right.featureUnitId,
      ),
    ),
  ]);
}

function sorcererMetamagicCanRemainUnchanged(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: SorcererClassUnitId;
  readonly sorcererLevel: number;
  readonly nextSorcererLevel: number;
}): Either.Either<void, CharacterBuildAdvancementIssue> {
  const featureChoice = sorcererMetamagicFeatureForSorcererClass(input);
  /* v8 ignore start -- The retained Sorcerer build was admitted from this exact Metamagic feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

  const selectedOptionIds = selectedSorcererMetamagicOptionFeaturesForFeature(
    input.build.features,
    featureChoice.right.featureUnitId,
  ).map((feature) => feature.optionId);
  const selectionIssue = sorcererMetamagicSelectionCountIssue({
    mechanics: featureChoice.right.mechanics,
    sorcererLevel: input.sorcererLevel,
    selectedOptionIds,
  });
  if (selectionIssue !== undefined) {
    return Either.left(selectionIssue);
  }

  const nextExpectedCount = sorcererMetamagicCountAtLevel(
    featureChoice.right.mechanics,
    input.nextSorcererLevel,
  );
  return selectedOptionIds.length === nextExpectedCount
    ? Either.right(undefined)
    : Either.left({
        code: "invalidSorcererMetamagicGainCount",
        sorcererLevel: input.nextSorcererLevel,
        expectedGains: nextExpectedCount - selectedOptionIds.length,
        actualGains: 0,
        message:
          "A plain Sorcerer level gain would leave the build with the wrong number of Metamagic options.",
      });
}

function sorcererMetamagicSelectionCountIssue(input: {
  readonly mechanics: SorcererMetamagicFeatureChoice["mechanics"];
  readonly sorcererLevel: number;
  readonly selectedOptionIds: readonly SorcererMetamagicOptionId[];
}): CharacterBuildAdvancementIssue | undefined {
  const expectedCount = sorcererMetamagicCountAtLevel(
    input.mechanics,
    input.sorcererLevel,
  );
  if (input.selectedOptionIds.length !== expectedCount) {
    return {
      code: "invalidSorcererMetamagicSelectionCount",
      sorcererLevel: input.sorcererLevel,
      expectedCount,
      actualCount: input.selectedOptionIds.length,
      message:
        "Cannot apply Sorcerer Metamagic lifecycle choices to a build whose current option count does not match its Sorcerer level.",
    };
  }

  const invalidOption = input.selectedOptionIds.find(
    (optionId) =>
      !sorcererMetamagicOptionBelongsToFeature(input.mechanics, optionId),
  );
  /* v8 ignore start -- Retained Metamagic selections were projected from this exact installed option roster. */
  if (invalidOption !== undefined) {
    return {
      code: "invalidSorcererMetamagicOption",
      optionId: invalidOption,
      message:
        "Metamagic known options must come from the installed Surface option roster.",
    };
  }
  /* v8 ignore stop */

  const duplicateOption = duplicateValue(input.selectedOptionIds);
  return duplicateOption === undefined
    ? undefined
    : {
        code: "duplicateSorcererMetamagicOption",
        optionId: duplicateOption,
        message: "Metamagic known options must be distinct.",
      };
}

function replaceSorcererMetamagicOptionSelection(input: {
  readonly selectedOptionIds: readonly SorcererMetamagicOptionId[];
  readonly replacement?: CharacterBuildSorcererMetamagicLevelGain["metamagic"]["replacement"];
}): Either.Either<
  readonly SorcererMetamagicOptionId[],
  CharacterBuildAdvancementIssue
> {
  if (input.replacement === undefined) {
    return Either.right(input.selectedOptionIds);
  }

  const replacement = input.replacement;
  if (!input.selectedOptionIds.includes(replacement.replaceOptionId)) {
    return Either.left({
      code: "missingSelectedSorcererMetamagicOption",
      optionId: replacement.replaceOptionId,
      message:
        "Cannot replace a Metamagic option that the build does not know.",
    });
  }

  if (input.selectedOptionIds.includes(replacement.selectedOptionId)) {
    return Either.left({
      code: "duplicateSorcererMetamagicOption",
      optionId: replacement.selectedOptionId,
      message:
        "Metamagic replacement must choose an option the build does not already know.",
    });
  }

  return Either.right(
    input.selectedOptionIds.map((optionId) =>
      optionId === replacement.replaceOptionId
        ? replacement.selectedOptionId
        : optionId,
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
  /* v8 ignore start -- The typed Warlock level-gain route was admitted from this exact invocation feature choice. */
  if (Either.isLeft(featureChoice)) return Either.left(featureChoice.left);
  /* v8 ignore stop */

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
  const [replaceIndex, ...remainingMatchingIndexes] = matchingIndexes;
  if (replaceIndex === undefined) {
    return Either.left({
      code: "missingSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      message:
        "Cannot replace an Eldritch Invocation that the build has not selected.",
    });
  }
  /* v8 ignore start -- Valid CharacterBuild features cannot contain the same nonrepeatable invocation selection more than once. */
  if (remainingMatchingIndexes.length > 0) {
    return Either.left({
      code: "ambiguousSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      count: matchingIndexes.length,
      message:
        "Cannot replace an Eldritch Invocation selection when multiple matching selections exist.",
    });
  }
  /* v8 ignore stop */

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
  /* v8 ignore start -- The typed Warlock route was admitted from class facts containing Pact Magic. */
  if (Either.isLeft(facts)) return Either.left(facts.left);
  /* v8 ignore stop */

  /* v8 ignore start -- An admitted Warlock level gain retains the class's existing Pact Magic source and spellcasting projection. */
  if (spellcasting === undefined || source === undefined) {
    return Either.left({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the build has no Warlock spellcasting source.",
    });
  }
  /* v8 ignore stop */

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
    /* v8 ignore start -- An admitted Warlock build always retains its Pact Magic slot pool. */
    ...(spellcasting.slotPools.pactMagic === undefined
      ? {}
      : { pactMagicSlotPool: spellcasting.slotPools.pactMagic }),
    /* v8 ignore stop */
  });
  if (currentIssue !== undefined) return Either.left(currentIssue);

  const cantrips = applyWarlockPactMagicCantripChanges({
    unitLibrary: input.unitLibrary,
    currentCantrips: source.cantrips,
    pactMagic: input.levelGain.pactMagic,
    currentProgression,
    nextProgression,
  });
  if (Either.isLeft(cantrips)) return Either.left(cantrips.left);

  const preparedSpells = applyWarlockPactMagicPreparedSpellChanges({
    unitLibrary: input.unitLibrary,
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
  /* v8 ignore start -- The typed plain-Warlock route retains Pact Magic class facts and its existing build source from support admission. */
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
  /* v8 ignore stop */

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
  /* v8 ignore start -- An admitted CharacterBuild already matches its current Pact Magic table row and slot projection. */
  if (currentIssue !== undefined) return Either.left(currentIssue);
  /* v8 ignore stop */

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
  readonly unitLibrary: UnitCatalog;
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly currentProgression: PactMagicProgressionRow;
  readonly nextProgression: PactMagicProgressionRow;
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  /* v8 ignore start -- An admitted CharacterBuild stores the exact current Pact Magic cantrip table count. */
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
  /* v8 ignore stop */

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
    (cantripId) =>
      !isWarlockCantrip({
        cantripId,
        unitLibrary: input.unitLibrary,
      }),
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

  /* v8 ignore start -- Exact gain cardinality plus count-preserving replacement makes a different final count impossible. */
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
  /* v8 ignore stop */
}

function applyWarlockPactMagicPreparedSpellChanges(input: {
  readonly unitLibrary: UnitCatalog;
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly currentProgression: PactMagicProgressionRow;
  readonly nextProgression: PactMagicProgressionRow;
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  /* v8 ignore start -- An admitted CharacterBuild stores the exact current Pact Magic prepared-spell table count. */
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
  /* v8 ignore stop */

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
        unitLibrary: input.unitLibrary,
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

  /* v8 ignore start -- Exact gain cardinality plus count-preserving replacement makes a different final count impossible. */
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
  /* v8 ignore stop */
}

function replaceWarlockPactMagicCantrip(input: {
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly replacement?: CharacterBuildWarlockPactMagicLevelGain["cantripReplacement"];
}): Either.Either<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Either.right(input.currentCantrips);
  }
  const replacement = input.replacement;

  if (replacement.replaceCantripId === replacement.selectedCantripId) {
    return Either.left({
      code: "sameWarlockPactMagicCantripReplacement",
      cantripId: replacement.selectedCantripId,
      message:
        "Warlock Pact Magic cantrip replacement must choose a different Warlock cantrip.",
    });
  }

  if (!input.currentCantrips.includes(replacement.replaceCantripId)) {
    return Either.left({
      code: "missingWarlockPactMagicCantripReplacement",
      cantripId: replacement.replaceCantripId,
      message:
        "Cannot replace a Pact Magic cantrip that the build does not know.",
    });
  }

  return Either.right(
    input.currentCantrips.map((cantripId) =>
      cantripId === replacement.replaceCantripId
        ? replacement.selectedCantripId
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
  const replacement = input.replacement;

  if (replacement.replaceSpellId === replacement.selectedSpellId) {
    return Either.left({
      code: "sameWarlockPactMagicPreparedSpellReplacement",
      spellId: replacement.selectedSpellId,
      message:
        "Warlock Pact Magic prepared-spell replacement must choose a different Warlock spell.",
    });
  }

  if (!input.currentPreparedSpells.includes(replacement.replaceSpellId)) {
    return Either.left({
      code: "missingWarlockPactMagicPreparedSpellReplacement",
      spellId: replacement.replaceSpellId,
      message:
        "Cannot replace a Pact Magic prepared spell that the build does not have prepared.",
    });
  }

  return Either.right(
    input.currentPreparedSpells.map((spellId) =>
      spellId === replacement.replaceSpellId
        ? replacement.selectedSpellId
        : spellId,
    ),
  );
}

function fightingStyleFeatureChoiceHoleForFighterClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: FighterClassUnitId;
}): Either.Either<ChoiceCreationHole, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed Fighting Style route already admitted this Fighter class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  const holes = facts.featureGrants.flatMap((grant) => {
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

  /* v8 ignore start -- The supported Fighter catalog contains exactly one acquisition feature that owns the Fighting Style hole. */
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
  /* v8 ignore stop */

  return Either.right(hole);
}

function fightingStyleCantripFeatureChoiceForClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Either.Either<
  FightingStyleCantripFeatureChoice,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed Fighting Style cantrip route already admitted this class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  const choices = facts.featureGrants.flatMap((grant) => {
    const feature = input.unitLibrary.getUnit(grant.unitId);
    if (
      Option.isNone(feature) ||
      feature.value.kind !== "class_feature" ||
      feature.value.className !== facts.className ||
      feature.value.mechanics.family !== "class_feature_acquisition_choice"
    ) {
      return [];
    }

    const cantripGrants = feature.value.mechanics.options.flatMap((option) =>
      option.mechanics.grants.flatMap((optionGrant) => {
        if (
          optionGrant.kind !== "grant_spell_access_choice" ||
          optionGrant.mode !== "known" ||
          optionGrant.spellLevel !== FIGHTING_STYLE_CANTRIP_SPELL_LEVEL ||
          optionGrant.replacement?.trigger !== "class_level_gain" ||
          optionGrant.replacement.replacementCount !==
            FIGHTING_STYLE_CANTRIP_REPLACEMENT_COUNT ||
          !isClassSpellListName(input.unitLibrary, optionGrant.spellList)
        ) {
          return [];
        }

        const supportedGrant: SupportedFightingStyleCantripGrant = {
          ...optionGrant,
          replacement: {
            trigger: optionGrant.replacement.trigger,
            replacementCount: FIGHTING_STYLE_CANTRIP_REPLACEMENT_COUNT,
          },
          spellList: optionGrant.spellList,
        };
        return [supportedGrant];
      }),
    );
    return cantripGrants.map((optionGrant) => ({
      featureUnitId: feature.value.id,
      grant: optionGrant,
    }));
  });

  /* v8 ignore start -- An admitted Fighting Style cantrip replacement has exactly one matching acquisition grant in its class facts. */
  if (choices.length === 0) {
    return Either.left({
      code: "missingFightingStyleCantripFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find a class-feature acquisition choice that grants known cantrip access for this class level gain.",
    });
  }

  if (choices.length > 1) {
    return Either.left({
      code: "ambiguousFightingStyleCantripFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: choices.map((choice) => choice.featureUnitId),
      message:
        "Cannot replace Fighting Style cantrips because multiple cantrip-granting class-feature acquisition choices were found.",
    });
  }

  const choice = choices[0];
  if (choice === undefined) {
    return Either.left({
      code: "missingFightingStyleCantripFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find a class-feature acquisition choice that grants known cantrip access for this class level gain.",
    });
  }
  /* v8 ignore stop */

  return Either.right(choice);
}

function isClassSpellListName(
  unitLibrary: UnitCatalog,
  spellList: string,
): spellList is ClassSpellListName {
  return (
    classSpellListForClassName({ className: spellList, unitLibrary }) !==
    undefined
  );
}

function eldritchInvocationFeatureForWarlockClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: WarlockClassUnitId;
}): Either.Either<
  EldritchInvocationFeatureChoice,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed Warlock route already admitted this Warlock class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  const featureChoices = facts.featureGrants.flatMap((grant) => {
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

  /* v8 ignore start -- The supported Warlock catalog contains exactly one feature choice with the invocation choice key. */
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
  /* v8 ignore stop */
}

function sorcererMetamagicFeatureForSorcererClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: SorcererClassUnitId;
}): Either.Either<
  SorcererMetamagicFeatureChoice,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- The typed Sorcerer route already admitted this Sorcerer class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  const featureChoices = facts.featureGrants.flatMap((grant) => {
    const feature = input.unitLibrary.getUnit(grant.unitId);
    if (
      Option.isNone(feature) ||
      feature.value.kind !== "class_feature" ||
      feature.value.mechanics.family !== "metamagic_options"
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

  /* v8 ignore start -- The supported Sorcerer catalog contains exactly one Metamagic option-choice feature. */
  if (featureChoices.length === 0) {
    return Either.left({
      code: "missingSorcererMetamagicFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Sorcerer class-feature Metamagic option choice.",
    });
  }

  if (featureChoices.length > 1) {
    return Either.left({
      code: "ambiguousSorcererMetamagicFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: featureChoices.map((feature) => feature.featureUnitId),
      message:
        "Cannot update Metamagic options because multiple Sorcerer Metamagic choices were found.",
    });
  }

  const featureChoice = featureChoices[0];
  return featureChoice === undefined
    ? Either.left({
        code: "missingSorcererMetamagicFeatureChoice",
        classUnitId: input.classUnitId,
        message:
          "Cannot find the Sorcerer class-feature Metamagic option choice.",
      })
    : Either.right(featureChoice);
  /* v8 ignore stop */
}

function eldritchInvocationCountAtLevel(
  mechanics: EldritchInvocationFeatureChoice["mechanics"],
  warlockLevel: number,
): number {
  return classLevelChoiceCountAtLevel(mechanics.choiceCount, warlockLevel);
}

function sorcererMetamagicCountAtLevel(
  mechanics: SorcererMetamagicFeatureChoice["mechanics"],
  sorcererLevel: number,
): number {
  return classLevelChoiceCountAtLevel(mechanics.choiceCount, sorcererLevel);
}

function sorcererMetamagicOptionBelongsToFeature(
  mechanics: SorcererMetamagicFeatureChoice["mechanics"],
  optionId: SorcererMetamagicOptionId,
): boolean {
  return mechanics.options.some((option) => option.id === optionId);
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

function selectedSorcererMetamagicOptionFeaturesForFeature(
  features: readonly CharacterBuildFeature[],
  featureUnitId: UnitRecord["id"],
): readonly SelectedSorcererMetamagicOptionFeature[] {
  return features.filter(
    (feature): feature is SelectedSorcererMetamagicOptionFeature =>
      isSelectedSorcererMetamagicOptionFromFeature(feature, featureUnitId),
  );
}

function isSelectedSorcererMetamagicOptionFromFeature(
  feature: CharacterBuildFeature,
  featureUnitId: UnitRecord["id"],
): feature is SelectedSorcererMetamagicOptionFeature {
  return (
    feature.kind === "selectedSorcererMetamagicOption" &&
    feature.selectedFromUnitId === featureUnitId
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

function sorcererMetamagicOptionFeature(
  optionId: SorcererMetamagicOptionId,
  selectedFromUnitId: UnitRecord["id"],
): CharacterBuildFeature {
  return {
    kind: "selectedSorcererMetamagicOption",
    selectedFromUnitId,
    optionId,
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
    /* v8 ignore start -- EldritchInvocationSelection carries an id already parsed against the closed installed invocation roster. */
    if (option === undefined) {
      return {
        code: "unknownEldritchInvocation",
        invocationId: selection.invocationId,
        message: `Unknown Eldritch Invocation id ${selection.invocationId}.`,
      };
    }
    /* v8 ignore stop */

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
  /* v8 ignore start -- Parsed invocation selections carry ids from the installed invocation option roster. */
  return (
    eldritchInvocationOptionForInvocationId(
      input.invocationId,
    )?.prerequisites.some(
      (prerequisite) =>
        prerequisite.kind === "knownInvocation" &&
        prerequisite.invocationId === input.requiredInvocationId,
    ) ?? false
  );
  /* v8 ignore stop */
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
    /* v8 ignore start -- Parsing correlates once-only invocation ids with the nonRepeatable selection variant. */
    return input.selection.kind === "nonRepeatable"
      ? undefined
      : {
          code: "invalidRepeatableEldritchInvocationChoice",
          invocationId: input.selection.invocationId,
          repeatableChoice: input.selection.repeatableChoice,
          message:
            "Only Repeatable Eldritch Invocations can carry an associated repeatable choice.",
        };
    /* v8 ignore stop */
  }

  /* v8 ignore start -- Parsing correlates repeatable invocation ids with the repeatable selection variant. */
  if (input.selection.kind === "nonRepeatable") {
    return {
      code: "missingRepeatableEldritchInvocationChoice",
      invocationId: input.selection.invocationId,
      message:
        "Repeatable Eldritch Invocation selections must include the associated cantrip or Origin feat choice.",
    };
  }
  /* v8 ignore stop */

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
  return knownWarlockCantripIds(
    input.build,
    input.classUnitId,
    input.unitLibrary,
  ).some((cantripId) =>
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
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  /* v8 ignore start -- An admitted Warlock invocation workflow retains its Pact Magic spellcasting source. */
  return (
    warlockSpellcastingSource(build, classUnitId)?.cantrips.filter(
      (cantripId) =>
        allCantripsFromClassSpellList({
          className: WARLOCK_CLASS_NAME,
          spellIds: [cantripId],
          unitLibrary,
        }),
    ) ?? []
  );
  /* v8 ignore stop */
}

function repeatableChoiceMatchesRule(input: {
  readonly unitLibrary: UnitCatalog;
  readonly invocationId: EldritchInvocationId;
  readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
}): boolean {
  const option = eldritchInvocationOptionForInvocationId(input.invocationId);
  /* v8 ignore start -- Parsed repeatable selections retain invocation ids whose installed option is repeatable. */
  if (option?.repeatability.kind !== "repeatable") {
    return false;
  }
  /* v8 ignore stop */

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
        knownWarlockCantripIds(
          input.build,
          input.classUnitId,
          input.unitLibrary,
        ).includes(input.repeatableChoice.cantripId);
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
  /* v8 ignore start -- The typed Pact Magic route already admitted this Warlock class id from the same catalog. */
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  /* v8 ignore stop */

  const facts = classCreationFacts(classUnit.right);
  /* v8 ignore start -- The branded Warlock class route is admitted only from class facts containing Pact Magic creation data. */
  if (facts.spellcasting?.kind !== "pact_magic_spellcasting_creation") {
    return Either.left({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message: "Cannot find Warlock Pact Magic class spellcasting facts.",
    });
  }
  /* v8 ignore stop */

  return Either.right(facts.spellcasting);
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
  /* v8 ignore start -- A Warlock class level is at least one and the admitted Pact Magic table has a level-one row. */
  return row ?? firstRow;
  /* v8 ignore stop */
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
    /* v8 ignore start -- An admitted Warlock build supplies the mismatched pool here; absence is a malformed direct build. */
    return invalidPactMagicSlotProjectionIssue({
      warlockLevel: input.progression.atLevel,
      progression: input.progression,
      ...(input.pactMagicSlotPool === undefined
        ? {}
        : { pactMagicSlotPool: input.pactMagicSlotPool }),
    });
    /* v8 ignore stop */
  }

  return undefined;
}

function invalidPactMagicSlotProjectionIssue(input: {
  readonly warlockLevel: number;
  readonly progression: PactMagicProgressionRow;
  readonly pactMagicSlotPool?: CharacterBuildPactMagicSlotPool;
}): CharacterBuildAdvancementIssue {
  /* v8 ignore start -- This diagnostic is constructed from an existing Pact Magic pool after detecting a value mismatch. */
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
  /* v8 ignore stop */
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

function isWarlockCantrip(input: {
  readonly cantripId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): boolean {
  return allCantripsFromClassSpellList({
    className: WARLOCK_CLASS_NAME,
    spellIds: [input.cantripId],
    unitLibrary: input.unitLibrary,
  });
}

function warlockPreparedSpellIsEligible(input: {
  readonly spellId: UnitRecord["id"];
  readonly maximumSpellLevel: number;
  readonly unitLibrary: UnitCatalog;
}): boolean {
  const spellLevel = classSpellListPreparedSpellLevel({
    className: WARLOCK_CLASS_NAME,
    spellId: input.spellId,
    unitLibrary: input.unitLibrary,
  });
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
  /* v8 ignore start -- Callers pass only Unit-sourced class-feature choice holes to this helper. */
  return hole.source.tag === "unitChoice" ? hole.source.unitId : undefined;
  /* v8 ignore stop */
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
