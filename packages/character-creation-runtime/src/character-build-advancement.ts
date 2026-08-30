// KERNEL-COVERAGE: runtime-owner CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.class-feature-advancement-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.fighter-fighting-style-advancement-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.fighting-style-cantrip-advancement-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.weapon-mastery-level-gain
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.bard-magical-secrets-spell-access
import { Brand, Result, Match, Option } from "effect";
import type { ClassName } from "@dnd/shared/game-facts";
import { classCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import {
  allCantripsFromClassSpellList,
  classSpellListForClassName,
  classSpellListPreparedSpellLevel,
  type ClassSpellListName,
} from "@dnd/surface/surface/unit-catalog-core";
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
type MissingClassLevelGainTags = Exclude<
  CharacterBuildClassLevelGain["tag"],
  (typeof CHARACTER_BUILD_CLASS_LEVEL_GAIN_TAGS)[number]
>;
void (true satisfies [MissingClassLevelGainTags] extends [never]
  ? true
  : false);

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
}): Result.Result<FighterClassUnitId, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
  if (facts.className !== FIGHTER_CLASS_NAME) {
    return Result.fail({
      code: "nonFighterClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.className,
      message:
        "Fighting Style replacement is only legal when gaining a Fighter level.",
    });
  }

  return Result.succeed(FighterClassUnitId(input.classUnitId));
}

export function warlockClassUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
}): Result.Result<WarlockClassUnitId, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
  if (facts.className !== WARLOCK_CLASS_NAME) {
    return Result.fail({
      code: "nonWarlockClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.className,
      message:
        "Eldritch Invocation lifecycle choices are only legal when gaining a Warlock level.",
    });
  }

  return Result.succeed(WarlockClassUnitId(input.classUnitId));
}

export function sorcererClassUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
}): Result.Result<SorcererClassUnitId, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
  if (facts.className !== SORCERER_CLASS_NAME) {
    return Result.fail({
      code: "nonSorcererClassLevelGain",
      classUnitId: input.classUnitId,
      className: facts.className,
      message:
        "Metamagic lifecycle choices are only legal when gaining a Sorcerer level.",
    });
  }

  return Result.succeed(SorcererClassUnitId(input.classUnitId));
}

export function fightingStyleFeatUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
}): Result.Result<FightingStyleFeatUnitId, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    return Result.fail({
      code: "unknownUnitId",
      unitId: input.unitId,
      message: `Unknown Unit id ${input.unitId}.`,
    });
  }

  if (unit.value.kind !== "feat") {
    return Result.fail({
      code: "nonFightingStyleFeat",
      unitId: input.unitId,
      unitKind: unit.value.kind,
      message: `${input.unitId} is not a Fighting Style feat Unit.`,
    });
  }

  if (unit.value.category !== FIGHTING_STYLE_FEAT_CATEGORY) {
    return Result.fail({
      code: "nonFightingStyleFeat",
      unitId: input.unitId,
      featCategory: unit.value.category,
      message: `${input.unitId} is not a Fighting Style feat Unit.`,
    });
  }

  return Result.succeed(FightingStyleFeatUnitId(input.unitId));
}

export function fightingStyleCantripUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly unitId: UnitRecord["id"];
}): Result.Result<FightingStyleCantripUnitId, CharacterBuildAdvancementIssue> {
  const featureChoice = fightingStyleCantripFeatureChoiceForClass(input);
  /* v8 ignore start -- @preserve -- The typed Fighting Style cantrip route was admitted from this exact class feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  if (
    !allCantripsFromClassSpellList({
      className: featureChoice.success.grant.spellList,
      spellIds: [input.unitId],
      unitLibrary: input.unitLibrary,
    })
  ) {
    return Result.fail({
      code: "invalidFightingStyleCantripReplacement",
      cantripId: input.unitId,
      message:
        "Fighting Style cantrip replacement must choose a cantrip from the granted class spell list.",
    });
  }

  return Result.succeed(FightingStyleCantripUnitId(input.unitId));
}

export function weaponMasteryFeatureUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
}): Result.Result<WeaponMasteryFeatureUnitId, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    return Result.fail({
      code: "unknownUnitId",
      unitId: input.unitId,
      message: `Unknown Unit id ${input.unitId}.`,
    });
  }

  if (!isWeaponMasteryChoiceFeature(unit.value)) {
    return Result.fail({
      code: "nonWeaponMasteryFeature",
      unitId: input.unitId,
      unitKind: unit.value.kind,
      message: `${input.unitId} is not a Weapon Mastery class-feature Unit.`,
    });
  }

  return Result.succeed(WeaponMasteryFeatureUnitId(input.unitId));
}

export function weaponMasteryWeaponUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
}): Result.Result<WeaponMasteryWeaponUnitId, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    return Result.fail({
      code: "unknownUnitId",
      unitId: input.unitId,
      message: `Unknown Unit id ${input.unitId}.`,
    });
  }

  if (unit.value.kind !== "weapon") {
    return Result.fail({
      code: "nonWeaponMasteryWeapon",
      unitId: input.unitId,
      unitKind: unit.value.kind,
      message: `${input.unitId} is not a weapon Unit.`,
    });
  }

  return Result.succeed(WeaponMasteryWeaponUnitId(input.unitId));
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
}): Result.Result<
  CharacterBuildWeaponMasteryLevelGain,
  CharacterBuildAdvancementIssue
> {
  const featureUnitId = weaponMasteryFeatureUnitId({
    unitLibrary: input.unitLibrary,
    unitId: input.featureUnitId,
  });
  if (Result.isFailure(featureUnitId))
    return Result.fail(featureUnitId.failure);

  const selectedWeaponUnitIds: WeaponMasteryWeaponUnitId[] = [];
  for (const unitId of input.selectedWeaponUnitIds) {
    const selectedWeaponUnitId = weaponMasteryWeaponUnitId({
      unitLibrary: input.unitLibrary,
      unitId,
    });
    if (Result.isFailure(selectedWeaponUnitId)) {
      return Result.fail(selectedWeaponUnitId.failure);
    }
    selectedWeaponUnitIds.push(selectedWeaponUnitId.success);
  }

  if (input.fightingStyleReplacement !== undefined) {
    const classUnitId = fighterClassUnitId(input);
    if (Result.isFailure(classUnitId)) return Result.fail(classUnitId.failure);

    const selectedFeatUnitId = fightingStyleFeatUnitId({
      unitLibrary: input.unitLibrary,
      unitId: input.fightingStyleReplacement.selectedFeatUnitId,
    });
    if (Result.isFailure(selectedFeatUnitId)) {
      return Result.fail(selectedFeatUnitId.failure);
    }

    return Result.succeed({
      tag: "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
      classUnitId: classUnitId.success,
      hitPointRule: input.hitPointRule,
      weaponMastery: {
        featureUnitId: featureUnitId.success,
        selectedWeaponUnitIds,
      },
      fightingStyleReplacement: {
        selectedFeatUnitId: selectedFeatUnitId.success,
      },
    });
  }

  return Result.succeed({
    tag: "classLevelGainWithWeaponMasterySelection",
    classUnitId: input.classUnitId,
    hitPointRule: input.hitPointRule,
    weaponMastery: {
      featureUnitId: featureUnitId.success,
      selectedWeaponUnitIds,
    },
  });
}

export function fighterLevelGainWithFightingStyleReplacement(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  readonly selectedFeatUnitId: UnitRecord["id"];
}): Result.Result<
  CharacterBuildFighterFightingStyleReplacementLevelGain,
  CharacterBuildAdvancementIssue
> {
  const classUnitId = fighterClassUnitId(input);
  if (Result.isFailure(classUnitId)) return Result.fail(classUnitId.failure);

  const selectedFeatUnitId = fightingStyleFeatUnitId({
    unitLibrary: input.unitLibrary,
    unitId: input.selectedFeatUnitId,
  });
  if (Result.isFailure(selectedFeatUnitId)) {
    return Result.fail(selectedFeatUnitId.failure);
  }

  return Result.succeed({
    tag: "fighterLevelGainWithFightingStyleReplacement",
    classUnitId: classUnitId.success,
    hitPointRule: input.hitPointRule,
    replacement: {
      selectedFeatUnitId: selectedFeatUnitId.success,
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
}): Result.Result<
  CharacterBuildFightingStyleCantripReplacementLevelGain,
  CharacterBuildAdvancementIssue
> {
  const featureChoice = fightingStyleCantripFeatureChoiceForClass(input);
  /* v8 ignore start -- @preserve -- The typed Fighting Style replacement route was admitted from this exact cantrip feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  const replaceCantripId = fightingStyleCantripUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
    unitId: input.replaceCantripId,
  });
  /* v8 ignore start -- @preserve -- The route parser already narrowed the replaced cantrip id against the retained Fighting Style selection. */
  if (Result.isFailure(replaceCantripId))
    return Result.fail(replaceCantripId.failure);
  /* v8 ignore stop -- @preserve */

  const selectedCantripId = fightingStyleCantripUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
    unitId: input.selectedCantripId,
  });
  if (Result.isFailure(selectedCantripId)) {
    return Result.fail(selectedCantripId.failure);
  }

  return Result.succeed({
    tag: "classLevelGainWithFightingStyleCantripReplacement",
    classUnitId: input.classUnitId,
    hitPointRule: input.hitPointRule,
    replacement: {
      replaceCantripId: replaceCantripId.success,
      selectedCantripId: selectedCantripId.success,
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
}): Result.Result<
  CharacterBuildWarlockLevelGain,
  CharacterBuildAdvancementIssue
> {
  const classUnitId = warlockClassUnitId(input);
  /* v8 ignore start -- @preserve -- The typed Warlock route already established this selected class as Warlock. */
  if (Result.isFailure(classUnitId)) return Result.fail(classUnitId.failure);
  /* v8 ignore stop -- @preserve */

  const gainedInvocations = parseEldritchInvocationSelections({
    unitLibrary: input.unitLibrary,
    selections: input.gainedInvocations,
  });
  if (Result.isFailure(gainedInvocations)) {
    return Result.fail(gainedInvocations.failure);
  }

  const replacement =
    input.replacement === undefined
      ? undefined
      : parseEldritchInvocationReplacement({
          unitLibrary: input.unitLibrary,
          replacement: input.replacement,
        });
  if (replacement !== undefined && Result.isFailure(replacement)) {
    return Result.fail(replacement.failure);
  }

  return Result.succeed({
    tag: "warlockLevelGain",
    classUnitId: classUnitId.success,
    hitPointRule: input.hitPointRule,
    pactMagic: input.pactMagic ?? EMPTY_WARLOCK_PACT_MAGIC_LEVEL_GAIN,
    eldritchInvocations: {
      gainedInvocations: gainedInvocations.success,
      ...(replacement === undefined
        ? {}
        : { replacement: replacement.success }),
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
}): Result.Result<
  CharacterBuildSorcererMetamagicLevelGain,
  CharacterBuildAdvancementIssue
> {
  const classUnitId = sorcererClassUnitId(input);
  /* v8 ignore start -- @preserve -- The typed Sorcerer route already established this selected class as Sorcerer. */
  if (Result.isFailure(classUnitId)) return Result.fail(classUnitId.failure);
  /* v8 ignore stop -- @preserve */

  const gainedOptions = parseSorcererMetamagicOptionIds(input.gainedOptions);
  if (Result.isFailure(gainedOptions))
    return Result.fail(gainedOptions.failure);

  const replacement =
    input.replacement === undefined
      ? undefined
      : parseSorcererMetamagicReplacement(input.replacement);
  if (replacement !== undefined && Result.isFailure(replacement)) {
    return Result.fail(replacement.failure);
  }

  return Result.succeed({
    tag: "sorcererLevelGain",
    classUnitId: classUnitId.success,
    hitPointRule: input.hitPointRule,
    metamagic: {
      gainedOptions: gainedOptions.success,
      ...(replacement === undefined
        ? {}
        : { replacement: replacement.success }),
    },
  });
}

export function advanceCharacterBuildClassLevel(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildClassLevelGain;
}): Result.Result<CharacterBuild, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const spellcasting = updateSpellcastingForClassLevelGain(input);
  if (Result.isFailure(spellcasting)) return Result.fail(spellcasting.failure);
  const buildForFeatureUpdate = characterBuildWithSpellcasting(
    input.build,
    spellcasting.success,
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
  if (Result.isFailure(features)) return Result.fail(features.failure);

  const progression = characterProgressionWithClassLevelGain({
    progression: input.build.progression,
    classUnitId: input.levelGain.classUnitId,
    hitPointRule: input.levelGain.hitPointRule,
  });
  /* v8 ignore start -- @preserve -- A parsed level gain cannot make its already-valid progression nonconsecutive; this reports malformed direct inputs. */
  if (Result.isFailure(progression)) {
    return Result.fail({
      code: "invalidCharacterProgressionLevel",
      issue: progression.failure,
      message: "Cannot add class level to CharacterBuild progression.",
    });
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    ...buildForFeatureUpdate,
    progression: progression.success,
    features: features.success,
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
}): Result.Result<
  CharacterBuildFightingStyleReplacementRoute<RouteEvent>,
  CharacterBuildAdvancementIssue
> {
  const advanced = advanceCharacterBuildClassLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    levelGain: input.levelGain,
  });
  /* v8 ignore start -- @preserve -- The route constructor already admitted every class-level gain invariant consumed by the reducer. */
  if (Result.isFailure(advanced)) return Result.fail(advanced.failure);
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    build: advanced.success,
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
}): Result.Result<
  CharacterBuildWarlockLevelGainRoute<RouteEvent>,
  CharacterBuildAdvancementIssue
> {
  const advanced = advanceCharacterBuildClassLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    levelGain: input.levelGain,
  });
  if (Result.isSuccess(advanced)) {
    return Result.succeed({
      tag: "accepted",
      build: advanced.success,
      route: [...input.route, routeApplyWarlockLevelGainFill()],
    });
  }

  if (isWarlockInvocationRouteRejectionIssue(advanced.failure)) {
    return Result.succeed({
      tag: "rejected",
      build: input.build,
      issue: advanced.failure,
      route: [...input.route, routeRejectWarlockInvocationSelectionFill()],
    });
  }

  return Result.fail(advanced.failure);
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
}): Result.Result<
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
    return Result.succeed(input.build.spellcasting);
  }

  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
  if (facts.className !== WARLOCK_CLASS_NAME) {
    return Result.succeed(input.build.spellcasting);
  }

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  /* v8 ignore start -- @preserve -- Admitted Warlock class facts always include Pact Magic spellcasting creation data. */
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
  /* v8 ignore stop -- @preserve */
  if (Result.isFailure(unchanged)) return Result.fail(unchanged.failure);

  return Result.succeed(input.build.spellcasting);
}

function updateListPreparedSpellcasting(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildListPreparedSpellcastingOnlyLevelGain;
}): Result.Result<
  CharacterBuild["spellcasting"],
  CharacterBuildAdvancementIssue
> {
  const spellcasting = input.build.spellcasting;
  const source = spellcasting?.sources.find(
    (candidate) => candidate.sourceUnitId === input.levelGain.classUnitId,
  );
  if (spellcasting === undefined || source === undefined) {
    return Result.fail({
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
  if (Result.isFailure(preparedSpellcasting)) {
    return Result.fail(preparedSpellcasting.failure);
  }

  return Result.succeed({
    ...spellcasting,
    sources: mapCharacterBuildSpellcastingSources(
      spellcasting.sources,
      (candidate) =>
        candidate.sourceUnitId === input.levelGain.classUnitId
          ? {
              ...candidate,
              preparedSpells: preparedSpellcasting.success.preparedSpells,
            }
          : candidate,
    ),
    slotPools: {
      ...spellcasting.slotPools,
      spellcasting: {
        kind: "spellcasting",
        slots: preparedSpellcasting.success.spellSlots,
      },
    },
  });
}

function classUnitRecord(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Result.Result<ClassRecord, CharacterBuildAdvancementIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);
  /* v8 ignore start -- @preserve -- Supported advancement routes admit a class id from this catalog before calling the typed core. */
  if (Option.isNone(unit)) {
    return Result.fail({
      code: "unknownUnitId",
      unitId: input.classUnitId,
      message: `Unknown Unit id ${input.classUnitId}.`,
    });
  }

  if (unit.value.kind !== "class") {
    return Result.fail({
      code: "nonClassUnit",
      unitId: input.classUnitId,
      unitKind: unit.value.kind,
      message: `${input.classUnitId} is not a class Unit.`,
    });
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed(unit.value);
}

function parseEldritchInvocationSelections(input: {
  readonly unitLibrary: UnitCatalog;
  readonly selections: readonly CharacterBuildWarlockEldritchInvocationSelectionInput[];
}): Result.Result<
  readonly EldritchInvocationSelection[],
  CharacterBuildAdvancementIssue
> {
  const parsed: EldritchInvocationSelection[] = [];
  for (const selection of input.selections) {
    const parsedSelection = parseEldritchInvocationSelection({
      unitLibrary: input.unitLibrary,
      selection,
    });
    if (Result.isFailure(parsedSelection)) {
      return Result.fail(parsedSelection.failure);
    }
    parsed.push(parsedSelection.success);
  }

  return Result.succeed(parsed);
}

function parseEldritchInvocationSelection(input: {
  readonly unitLibrary: UnitCatalog;
  readonly selection: CharacterBuildWarlockEldritchInvocationSelectionInput;
}): Result.Result<EldritchInvocationSelection, CharacterBuildAdvancementIssue> {
  const invocationId = parseKnownEldritchInvocationId(
    input.selection.invocationId,
  );
  if (Result.isFailure(invocationId)) return Result.fail(invocationId.failure);

  const option = eldritchInvocationOptionForInvocationId(invocationId.success);
  /* v8 ignore start -- @preserve -- The closed invocation-id parser and installed option table are defined from the same roster. */
  if (option === undefined) {
    return Result.fail({
      code: "unknownEldritchInvocation",
      invocationId: invocationId.success,
      message: `Unknown Eldritch Invocation id ${invocationId.success}.`,
    });
  }
  /* v8 ignore stop -- @preserve */

  if (option.repeatability.kind === "once") {
    if (input.selection.kind !== "nonRepeatable") {
      return Result.fail({
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: invocationId.success,
        repeatableChoice: input.selection.repeatableChoice,
        message:
          "Only Repeatable Eldritch Invocations can carry an associated repeatable choice.",
      });
    }
    return Result.succeed({
      kind: "nonRepeatable",
      invocationId: invocationId.success,
    });
  }

  if (input.selection.kind !== "repeatable") {
    return Result.fail({
      code: "missingRepeatableEldritchInvocationChoice",
      invocationId: invocationId.success,
      message:
        "Repeatable Eldritch Invocation selections must include the associated cantrip or Origin feat choice.",
    });
  }
  const repeatableChoice = input.selection.repeatableChoice;

  if (
    !repeatableChoiceMatchesRule({
      unitLibrary: input.unitLibrary,
      invocationId: invocationId.success,
      repeatableChoice,
    })
  ) {
    return Result.fail({
      code: "invalidRepeatableEldritchInvocationChoice",
      invocationId: invocationId.success,
      repeatableChoice,
      message:
        "Repeatable Eldritch Invocation selection does not match that invocation's associated choice rule.",
    });
  }

  return Result.succeed({
    kind: "repeatable",
    invocationId: invocationId.success,
    repeatableChoice,
  });
}

function parseKnownEldritchInvocationId(
  invocationId: string | EldritchInvocationId,
): Result.Result<EldritchInvocationId, CharacterBuildAdvancementIssue> {
  const parsed = eldritchInvocationId(invocationId);
  if (eldritchInvocationOptionForInvocationId(parsed) === undefined) {
    return Result.fail({
      code: "unknownEldritchInvocation",
      invocationId: parsed,
      message: `Unknown Eldritch Invocation id ${parsed}.`,
    });
  }

  return Result.succeed(parsed);
}

function parseEldritchInvocationReplacement(input: {
  readonly unitLibrary: UnitCatalog;
  readonly replacement: {
    readonly replaceInvocation: CharacterBuildWarlockEldritchInvocationSelectionInput;
    readonly selectedInvocation: CharacterBuildWarlockEldritchInvocationSelectionInput;
  };
}): Result.Result<
  EldritchInvocationReplacement,
  CharacterBuildAdvancementIssue
> {
  const replaceInvocation = parseEldritchInvocationSelection({
    unitLibrary: input.unitLibrary,
    selection: input.replacement.replaceInvocation,
  });
  if (Result.isFailure(replaceInvocation)) {
    return Result.fail(replaceInvocation.failure);
  }

  const selectedInvocation = parseEldritchInvocationSelection({
    unitLibrary: input.unitLibrary,
    selection: input.replacement.selectedInvocation,
  });
  if (Result.isFailure(selectedInvocation)) {
    return Result.fail(selectedInvocation.failure);
  }

  if (
    eldritchInvocationSelectionsMatch(
      replaceInvocation.success,
      selectedInvocation.success,
    )
  ) {
    return Result.fail({
      code: "sameEldritchInvocationReplacement",
      invocationId: selectedInvocation.success.invocationId,
      message:
        "Eldritch Invocation replacement must choose a different invocation.",
    });
  }

  return Result.succeed({
    replaceInvocation: replaceInvocation.success,
    selectedInvocation: selectedInvocation.success,
  });
}

function parseSorcererMetamagicOptionIds(
  optionIds: readonly (string | SorcererMetamagicOptionId)[],
): Result.Result<
  readonly SorcererMetamagicOptionId[],
  CharacterBuildAdvancementIssue
> {
  const parsed: SorcererMetamagicOptionId[] = [];
  for (const optionId of optionIds) {
    const parsedOptionId = parseKnownSorcererMetamagicOptionId(optionId);
    if (Result.isFailure(parsedOptionId)) {
      return Result.fail(parsedOptionId.failure);
    }
    parsed.push(parsedOptionId.success);
  }

  return Result.succeed(parsed);
}

function parseKnownSorcererMetamagicOptionId(
  optionId: string | SorcererMetamagicOptionId,
): Result.Result<SorcererMetamagicOptionId, CharacterBuildAdvancementIssue> {
  const parsed = sorcererMetamagicOptionId(optionId);
  if (Result.isFailure(parsed)) {
    return Result.fail({
      code: "unknownSorcererMetamagicOption",
      optionId,
      message: `Unknown Sorcerer Metamagic option id ${optionId}.`,
    });
  }

  return Result.succeed(parsed.success);
}

function parseSorcererMetamagicReplacement(input: {
  readonly replaceOptionId: string | SorcererMetamagicOptionId;
  readonly selectedOptionId: string | SorcererMetamagicOptionId;
}): Result.Result<
  NonNullable<
    CharacterBuildSorcererMetamagicLevelGain["metamagic"]["replacement"]
  >,
  CharacterBuildAdvancementIssue
> {
  const replaceOptionId = parseKnownSorcererMetamagicOptionId(
    input.replaceOptionId,
  );
  if (Result.isFailure(replaceOptionId))
    return Result.fail(replaceOptionId.failure);

  const selectedOptionId = parseKnownSorcererMetamagicOptionId(
    input.selectedOptionId,
  );
  if (Result.isFailure(selectedOptionId)) {
    return Result.fail(selectedOptionId.failure);
  }

  if (replaceOptionId.success === selectedOptionId.success) {
    return Result.fail({
      code: "sameSorcererMetamagicReplacement",
      optionId: selectedOptionId.success,
      message:
        "Metamagic replacement must choose a different Metamagic option.",
    });
  }

  return Result.succeed({
    replaceOptionId: replaceOptionId.success,
    selectedOptionId: selectedOptionId.success,
  });
}

function plainClassLevelGainFeatures(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildPlainClassLevelGain;
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
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
    if (Result.isFailure(unchanged)) return Result.fail(unchanged.failure);

    return Result.succeed(input.build.features);
  }

  if (facts.className !== WARLOCK_CLASS_NAME) {
    return weaponMasterySelectionsCanRemainUnchanged({
      build: input.build,
      unitLibrary: input.unitLibrary,
      classUnit: classUnit.success,
      classUnitId: input.levelGain.classUnitId,
    });
  }

  const featureChoice = eldritchInvocationFeatureForWarlockClass({
    unitLibrary: input.unitLibrary,
    classUnitId: WarlockClassUnitId(input.levelGain.classUnitId),
  });
  /* v8 ignore start -- @preserve -- The typed plain-Warlock route was admitted from this exact invocation feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  const nextWarlockLevel =
    classLevelForUnit(input.build.progression, input.levelGain.classUnitId) + 1;
  const expectedCount = eldritchInvocationCountAtLevel(
    featureChoice.success.mechanics,
    nextWarlockLevel,
  );
  const selectedCount = selectedEldritchInvocationFeaturesForFeature(
    input.build.features,
    featureChoice.success.featureUnitId,
  ).length;

  return selectedCount === expectedCount
    ? Result.succeed(input.build.features)
    : Result.fail({
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
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const feature = weaponMasteryFeatureForClass(input);
  /* v8 ignore start -- @preserve -- The supported Weapon Mastery route was admitted from this exact class feature. */
  if (Result.isFailure(feature)) return Result.fail(feature.failure);
  /* v8 ignore stop -- @preserve */
  if (feature.success === undefined)
    return Result.succeed(input.build.features);

  const currentClassLevel = classLevelForUnit(
    input.build.progression,
    input.classUnitId,
  );
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: feature.success.id,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- The admitted Weapon Mastery feature always has a projected profile. */
  const levelProfiles =
    profile === undefined
      ? undefined
      : weaponMasteryChoiceProfilesForLevelGain(profile, currentClassLevel);
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The admitted Weapon Mastery feature supplies a profile covering its owning class level. */
  if (levelProfiles === undefined) {
    return Result.fail({
      code: "missingWeaponMasteryFeatureChoice",
      classUnitId: input.classUnitId,
      message: "Cannot find the class Weapon Mastery choice feature.",
    });
  }
  /* v8 ignore stop -- @preserve */
  const { currentProfile, nextProfile } = levelProfiles;

  const selectedWeaponUnitIds = selectedWeaponMasteryFeaturesForFeature(
    input.build.features,
    feature.success.id,
  ).map((selectedFeature) => selectedFeature.unitId);
  if (selectedWeaponUnitIds.length !== currentProfile.choiceCount) {
    return Result.fail({
      code: "invalidWeaponMasterySelectionCount",
      classLevel: currentClassLevel,
      featureUnitId: feature.success.id,
      expectedCount: currentProfile.choiceCount,
      actualCount: selectedWeaponUnitIds.length,
      message:
        "Cannot advance from a build whose current Weapon Mastery choices do not match its class level.",
    });
  }
  const duplicateSelection = duplicateWeaponMasterySelectionIssue(
    feature.success.id,
    selectedWeaponUnitIds,
  );
  if (duplicateSelection !== undefined) {
    return Result.fail(duplicateSelection);
  }

  return currentProfile.choiceCount === nextProfile.choiceCount
    ? Result.succeed(input.build.features)
    : Result.fail({
        code: "invalidWeaponMasterySelectionCount",
        classLevel: currentClassLevel + 1,
        featureUnitId: feature.success.id,
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
  /* v8 ignore start -- @preserve -- An admitted Weapon Mastery profile covers both adjacent supported class levels. */
  return Option.isNone(currentProfile) || Option.isNone(nextProfile)
    ? undefined
    : {
        currentProfile: currentProfile.value,
        nextProfile: nextProfile.value,
      };
  /* v8 ignore stop -- @preserve */
}

function updateWeaponMasterySelectedFeatures(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildWeaponMasteryLevelGain;
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const feature = weaponMasteryFeatureForClass({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnit: classUnit.success,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The supported Weapon Mastery level-gain route was admitted from this exact class feature. */
  if (Result.isFailure(feature)) return Result.fail(feature.failure);
  /* v8 ignore stop -- @preserve */
  if (feature.success === undefined) {
    return Result.fail({
      code: "missingWeaponMasteryFeatureChoice",
      classUnitId: input.levelGain.classUnitId,
      message: "Cannot find the class Weapon Mastery choice feature.",
    });
  }

  if (feature.success.id !== input.levelGain.weaponMastery.featureUnitId) {
    return Result.fail({
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
    featureUnitId: feature.success.id,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- The admitted Weapon Mastery level-gain feature always has a projected profile. */
  const levelProfiles =
    profile === undefined
      ? undefined
      : weaponMasteryChoiceProfilesForLevelGain(profile, currentClassLevel);
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The admitted Weapon Mastery level-gain route supplies a profile covering both adjacent levels. */
  if (levelProfiles === undefined) {
    return Result.fail({
      code: "missingWeaponMasteryFeatureChoice",
      classUnitId: input.levelGain.classUnitId,
      message: "Cannot find the class Weapon Mastery choice feature.",
    });
  }
  /* v8 ignore stop -- @preserve */
  const { currentProfile, nextProfile } = levelProfiles;

  const currentWeaponUnitIds = selectedWeaponMasteryFeaturesForFeature(
    input.build.features,
    feature.success.id,
  ).map((feature) => feature.unitId);
  if (currentWeaponUnitIds.length !== currentProfile.choiceCount) {
    return Result.fail({
      code: "invalidWeaponMasterySelectionCount",
      classLevel: currentClassLevel,
      featureUnitId: feature.success.id,
      expectedCount: currentProfile.choiceCount,
      actualCount: currentWeaponUnitIds.length,
      message:
        "Cannot advance from a build whose current Weapon Mastery choices do not match its class level.",
    });
  }
  const duplicateCurrentSelection = duplicateWeaponMasterySelectionIssue(
    feature.success.id,
    currentWeaponUnitIds,
  );
  if (duplicateCurrentSelection !== undefined) {
    return Result.fail(duplicateCurrentSelection);
  }

  const selectedWeaponUnitIds =
    input.levelGain.weaponMastery.selectedWeaponUnitIds;
  if (selectedWeaponUnitIds.length !== nextProfile.choiceCount) {
    return Result.fail({
      code: "invalidWeaponMasterySelectionCount",
      classLevel: currentClassLevel + 1,
      featureUnitId: feature.success.id,
      expectedCount: nextProfile.choiceCount,
      actualCount: selectedWeaponUnitIds.length,
      message:
        "Weapon Mastery level gain must leave the build with the table count for the new class level.",
    });
  }

  const duplicateSelectedWeapon = duplicateWeaponMasterySelectionIssue(
    feature.success.id,
    selectedWeaponUnitIds,
  );
  if (duplicateSelectedWeapon !== undefined) {
    return Result.fail(duplicateSelectedWeapon);
  }
  const selectedSet = new Set<UnitRecord["id"]>(selectedWeaponUnitIds);

  const eligibleWeaponUnitIds = new Set(
    nextProfile.eligibleWeapons.map((weapon) => weapon.id),
  );
  for (const weaponUnitId of selectedWeaponUnitIds) {
    if (!eligibleWeaponUnitIds.has(weaponUnitId)) {
      return Result.fail({
        code: "invalidWeaponMasterySelection",
        featureUnitId: feature.success.id,
        weaponUnitId,
        message:
          "Weapon Mastery level gain must choose eligible proficient weapons.",
      });
    }
  }

  for (const weaponUnitId of currentWeaponUnitIds) {
    if (!selectedSet.has(weaponUnitId)) {
      return Result.fail({
        code: "missingExistingWeaponMasterySelection",
        featureUnitId: feature.success.id,
        weaponUnitId,
        message:
          "Weapon Mastery level gain can add the new table choices but cannot replace existing mastered weapons.",
      });
    }
  }

  const weaponMasteryFeatures =
    characterBuildFeaturesWithWeaponMasterySelections(
      input.build.features,
      feature.success.id,
      selectedWeaponUnitIds,
    );

  return input.levelGain.tag !==
    "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement"
    ? Result.succeed(weaponMasteryFeatures)
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
}): Result.Result<
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

  /* v8 ignore start -- @preserve -- Supported class facts admit at most one Weapon Mastery choice feature for a class level. */
  if (featureUnitIds.length > 1) {
    return Result.fail({
      code: "ambiguousWeaponMasteryFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds,
      message: "Class has more than one Weapon Mastery choice feature.",
    });
  }

  const featureUnitId = featureUnitIds[0];
  if (featureUnitId === undefined) return Result.succeed(undefined);

  const unit = input.unitLibrary.getUnit(featureUnitId);
  return Option.isSome(unit) && isWeaponMasteryChoiceFeature(unit.value)
    ? Result.succeed(unit.value)
    : Result.fail({
        code: "missingWeaponMasteryFeatureChoice",
        classUnitId: input.classUnitId,
        message: "Cannot find the class Weapon Mastery choice feature.",
      });
  /* v8 ignore stop -- @preserve */
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
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const replacedFeatures = fightingStyleSelectedFeaturesReplaced({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
    selectedFeatUnitId: input.levelGain.replacement.selectedFeatUnitId,
  });
  if (Result.isFailure(replacedFeatures))
    return Result.fail(replacedFeatures.failure);

  const classUnit = classUnitRecord({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  return weaponMasterySelectionsCanRemainUnchanged({
    build: { ...input.build, features: replacedFeatures.success },
    unitLibrary: input.unitLibrary,
    classUnit: classUnit.success,
    classUnitId: input.levelGain.classUnitId,
  });
}

function fightingStyleSelectedFeaturesReplaced(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly selectedFeatUnitId: FightingStyleFeatUnitId;
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const classUnitId = fighterClassUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed Fighting Style replacement route already established the Fighter class identity. */
  if (Result.isFailure(classUnitId)) return Result.fail(classUnitId.failure);
  /* v8 ignore stop -- @preserve */

  const hole = fightingStyleFeatureChoiceHoleForFighterClass({
    unitLibrary: input.unitLibrary,
    classUnitId: classUnitId.success,
  });
  /* v8 ignore start -- @preserve -- The typed replacement route was admitted from this exact retained Fighting Style hole. */
  if (Result.isFailure(hole)) return Result.fail(hole.failure);
  /* v8 ignore stop -- @preserve */

  const featureUnitId = unitChoiceSourceUnitId(hole.success);
  /* v8 ignore start -- @preserve -- The admitted Fighting Style hole is Unit-sourced by its retained class feature. */
  if (featureUnitId === undefined) {
    return Result.fail({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }
  /* v8 ignore stop -- @preserve */

  const selectedFeatUnitId = input.selectedFeatUnitId;
  const selectedOptionId = creationChoiceOptionId(selectedFeatUnitId);
  /* v8 ignore start -- @preserve -- The replacement constructor admits only option ids from this exact Fighting Style hole. */
  if (!choiceOptionIdsFitHole(hole.success, [selectedOptionId])) {
    return Result.fail({
      code: "invalidFightingStyleReplacement",
      selectedFeatUnitId,
      message: `${selectedFeatUnitId} is not supported for this Fighting Style replacement.`,
    });
  }
  /* v8 ignore stop -- @preserve */

  const selectedFeatures = input.build.features.filter((feature) =>
    isSelectedFromFeature(feature, featureUnitId),
  );
  const currentSelection = selectedFeatures[0];
  if (currentSelection === undefined) {
    return Result.fail({
      code: "missingSelectedFightingStyle",
      featureUnitId,
      message:
        "Cannot replace Fighting Style because the build has no selected Fighting Style feat.",
    });
  }

  if (selectedFeatures.length > 1) {
    return Result.fail({
      code: "ambiguousSelectedFightingStyle",
      featureUnitId,
      count: selectedFeatures.length,
      message:
        "Cannot replace Fighting Style because the build has multiple selected Fighting Style feats.",
    });
  }

  if (currentSelection.unitId === selectedFeatUnitId) {
    return Result.fail({
      code: "sameFightingStyleReplacement",
      selectedFeatUnitId,
      message:
        "Fighting Style replacement must choose a different Fighting Style feat.",
    });
  }

  return Result.succeed(
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
}): Result.Result<
  CharacterBuild["spellcasting"],
  CharacterBuildAdvancementIssue
> {
  const featureChoice = fightingStyleCantripFeatureChoiceForClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed cantrip replacement route was admitted from this exact acquisition feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  const spellcasting = input.build.spellcasting;
  const source = spellcasting?.sources.find(
    (candidate) => candidate.sourceUnitId === input.levelGain.classUnitId,
  );
  if (spellcasting === undefined || source === undefined) {
    return Result.fail({
      code: "missingFightingStyleCantripSpellcastingSource",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot replace Fighting Style cantrips because the build has no matching class spellcasting source.",
    });
  }

  const cantrips = fightingStyleCantripsReplaced({
    currentCantrips: source.cantrips,
    featureChoice: featureChoice.success,
    replacement: input.levelGain.replacement,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(cantrips)) return Result.fail(cantrips.failure);

  const preparedSpellcasting = applyListPreparedSpellcastingLevelGain({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
    source,
    levelGain: input.levelGain.preparedSpellcasting,
  });
  /* v8 ignore start -- @preserve -- The typed list-prepared route was admitted against this exact spellcasting source and level row. */
  if (Result.isFailure(preparedSpellcasting)) {
    return Result.fail(preparedSpellcasting.failure);
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    ...spellcasting,
    sources: mapCharacterBuildSpellcastingSources(
      spellcasting.sources,
      (candidate) =>
        candidate.sourceUnitId === input.levelGain.classUnitId
          ? {
              ...candidate,
              cantrips: cantrips.success,
              preparedSpells: preparedSpellcasting.success.preparedSpells,
            }
          : candidate,
    ),
    slotPools: {
      ...spellcasting.slotPools,
      spellcasting: {
        kind: "spellcasting",
        slots: preparedSpellcasting.success.spellSlots,
      },
    },
  });
}

function fightingStyleCantripsReplaced(input: {
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly featureChoice: FightingStyleCantripFeatureChoice;
  readonly replacement: CharacterBuildFightingStyleCantripReplacementLevelGain["replacement"];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.currentCantrips.length !== input.featureChoice.grant.count) {
    return Result.fail({
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
    return Result.fail({
      code: "invalidFightingStyleCantripReplacement",
      cantripId: invalidCurrentCantrip,
      message:
        "Cannot replace Fighting Style cantrips from a build whose current cantrips do not match the granted class spell list.",
    });
  }

  if (
    input.replacement.replaceCantripId === input.replacement.selectedCantripId
  ) {
    return Result.fail({
      code: "sameFightingStyleCantripReplacement",
      cantripId: input.replacement.selectedCantripId,
      message:
        "Fighting Style cantrip replacement must choose a different cantrip.",
    });
  }

  if (!input.currentCantrips.includes(input.replacement.replaceCantripId)) {
    return Result.fail({
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
    return Result.fail({
      code: "duplicateFightingStyleCantripSelection",
      cantripId: duplicateCantrip,
      message: "Fighting Style cantrip selections must be distinct.",
    });
  }

  return Result.succeed(finalCantrips);
}

function applyListPreparedSpellcastingLevelGain(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: ClassUnitId;
  readonly source: CharacterBuildSpellcastingSource;
  readonly levelGain: CharacterBuildListPreparedSpellcastingLevelGain;
}): Result.Result<
  {
    readonly preparedSpells: readonly UnitRecord["id"][];
    readonly spellSlots: ListPreparedReadableSpellcasting["spellSlotProjection"]["slots"];
  },
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed route constructor already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
  if (!("spellcasting" in facts)) {
    return Result.fail({
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
  /* v8 ignore start -- @preserve -- The list-prepared level-gain route is admitted only when both adjacent table rows and its class spell list exist. */
  if (
    currentSpellcasting === undefined ||
    nextSpellcasting === undefined ||
    !isListPreparedSpellcastingCreation(currentSpellcasting) ||
    !isListPreparedSpellcastingCreation(nextSpellcasting) ||
    !isClassSpellListName(input.unitLibrary, facts.className)
  ) {
    return Result.fail({
      code: "missingListPreparedSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance list-prepared spellcasting because the current or next class level has no supported list-prepared spellcasting facts.",
    });
  }
  /* v8 ignore stop -- @preserve */

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
  if (Result.isFailure(preparedSpells))
    return Result.fail(preparedSpells.failure);

  return Result.succeed({
    preparedSpells: preparedSpells.success,
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
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (
    input.currentPreparedSpells.length !==
    input.currentSpellcasting.preparedAccess.choose
  ) {
    return Result.fail({
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
    return Result.fail({
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
  if (Result.isFailure(replacedPreparedSpells)) {
    return Result.fail(replacedPreparedSpells.failure);
  }

  const finalPreparedSpells = [
    ...replacedPreparedSpells.success,
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
    return Result.fail({
      code: "invalidListPreparedSpellChoice",
      spellId: invalidSpell,
      message:
        "List-prepared spell choices must come from the class spell list at a level available to the new class level.",
    });
  }

  const duplicateSpell = duplicateValue(finalPreparedSpells);
  if (duplicateSpell !== undefined) {
    return Result.fail({
      code: "duplicateListPreparedSpellSelection",
      spellId: duplicateSpell,
      message: "List-prepared spell choices must be distinct.",
    });
  }

  return Result.succeed(finalPreparedSpells);
}

function replaceListPreparedSpell(input: {
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly replacement?: CharacterBuildListPreparedSpellcastingLevelGain["preparedSpellReplacement"];
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Result.succeed(input.currentPreparedSpells);
  }
  const replacement = input.replacement;

  if (replacement.replaceSpellId === replacement.selectedSpellId) {
    return Result.fail({
      code: "sameListPreparedSpellReplacement",
      spellId: replacement.selectedSpellId,
      message: "List-prepared spell replacement must choose a different spell.",
    });
  }

  if (!input.currentPreparedSpells.includes(replacement.replaceSpellId)) {
    return Result.fail({
      code: "missingListPreparedSpellReplacement",
      spellId: replacement.replaceSpellId,
      message:
        "Cannot replace a list-prepared spell that the build does not have prepared.",
    });
  }

  return Result.succeed(
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
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const featureChoice = sorcererMetamagicFeatureForSorcererClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed Sorcerer level-gain route was admitted from this exact Metamagic feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  const sorcererLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const nextSorcererLevel = sorcererLevel + 1;
  const selectedFeatures = selectedSorcererMetamagicOptionFeaturesForFeature(
    input.build.features,
    featureChoice.success.featureUnitId,
  );
  const selectedOptionIds = selectedFeatures.map((feature) => feature.optionId);
  const selectionIssue = sorcererMetamagicSelectionCountIssue({
    mechanics: featureChoice.success.mechanics,
    sorcererLevel,
    selectedOptionIds,
  });
  if (selectionIssue !== undefined) {
    return Result.fail(selectionIssue);
  }

  const nextExpectedCount = sorcererMetamagicCountAtLevel(
    featureChoice.success.mechanics,
    nextSorcererLevel,
  );
  const expectedGains = nextExpectedCount - selectedOptionIds.length;
  const gainedOptions = input.levelGain.metamagic.gainedOptions;
  if (gainedOptions.length !== expectedGains) {
    return Result.fail({
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
        featureChoice.success.mechanics,
        optionId,
      ),
  );
  /* v8 ignore start -- @preserve -- The Metamagic level-gain parser admits gained option ids from this installed feature roster. */
  if (invalidGain !== undefined) {
    return Result.fail({
      code: "invalidSorcererMetamagicOption",
      optionId: invalidGain,
      message:
        "Metamagic option gains must come from the installed Surface option roster.",
    });
  }
  /* v8 ignore stop -- @preserve */

  const alreadyKnownGain = gainedOptions.find((optionId) =>
    selectedOptionIds.includes(optionId),
  );
  if (alreadyKnownGain !== undefined) {
    return Result.fail({
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
  if (Result.isFailure(replacedOptions)) {
    return Result.fail(replacedOptions.failure);
  }

  const finalOptions = [...replacedOptions.success, ...gainedOptions];
  const duplicateOption = duplicateValue(finalOptions);
  if (duplicateOption !== undefined) {
    return Result.fail({
      code: "duplicateSorcererMetamagicOption",
      optionId: duplicateOption,
      message: "Metamagic known options must remain distinct.",
    });
  }

  return Result.succeed([
    ...input.build.features.filter(
      (feature) =>
        !isSelectedSorcererMetamagicOptionFromFeature(
          feature,
          featureChoice.success.featureUnitId,
        ),
    ),
    ...finalOptions.map((optionId) =>
      sorcererMetamagicOptionFeature(
        optionId,
        featureChoice.success.featureUnitId,
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
}): Result.Result<void, CharacterBuildAdvancementIssue> {
  const featureChoice = sorcererMetamagicFeatureForSorcererClass(input);
  /* v8 ignore start -- @preserve -- The retained Sorcerer build was admitted from this exact Metamagic feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  const selectedOptionIds = selectedSorcererMetamagicOptionFeaturesForFeature(
    input.build.features,
    featureChoice.success.featureUnitId,
  ).map((feature) => feature.optionId);
  const selectionIssue = sorcererMetamagicSelectionCountIssue({
    mechanics: featureChoice.success.mechanics,
    sorcererLevel: input.sorcererLevel,
    selectedOptionIds,
  });
  if (selectionIssue !== undefined) {
    return Result.fail(selectionIssue);
  }

  const nextExpectedCount = sorcererMetamagicCountAtLevel(
    featureChoice.success.mechanics,
    input.nextSorcererLevel,
  );
  return selectedOptionIds.length === nextExpectedCount
    ? Result.succeed(undefined)
    : Result.fail({
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
  /* v8 ignore start -- @preserve -- Retained Metamagic selections were projected from this exact installed option roster. */
  if (invalidOption !== undefined) {
    return {
      code: "invalidSorcererMetamagicOption",
      optionId: invalidOption,
      message:
        "Metamagic known options must come from the installed Surface option roster.",
    };
  }
  /* v8 ignore stop -- @preserve */

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
}): Result.Result<
  readonly SorcererMetamagicOptionId[],
  CharacterBuildAdvancementIssue
> {
  if (input.replacement === undefined) {
    return Result.succeed(input.selectedOptionIds);
  }

  const replacement = input.replacement;
  if (!input.selectedOptionIds.includes(replacement.replaceOptionId)) {
    return Result.fail({
      code: "missingSelectedSorcererMetamagicOption",
      optionId: replacement.replaceOptionId,
      message:
        "Cannot replace a Metamagic option that the build does not know.",
    });
  }

  if (input.selectedOptionIds.includes(replacement.selectedOptionId)) {
    return Result.fail({
      code: "duplicateSorcererMetamagicOption",
      optionId: replacement.selectedOptionId,
      message:
        "Metamagic replacement must choose an option the build does not already know.",
    });
  }

  return Result.succeed(
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
}): Result.Result<
  readonly CharacterBuildFeature[],
  CharacterBuildAdvancementIssue
> {
  const featureChoice = eldritchInvocationFeatureForWarlockClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed Warlock level-gain route was admitted from this exact invocation feature choice. */
  if (Result.isFailure(featureChoice))
    return Result.fail(featureChoice.failure);
  /* v8 ignore stop -- @preserve */

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const nextWarlockLevel = currentWarlockLevel + 1;
  const selectedFeatures = selectedEldritchInvocationFeaturesForFeature(
    input.build.features,
    featureChoice.success.featureUnitId,
  );
  const currentExpectedCount = eldritchInvocationCountAtLevel(
    featureChoice.success.mechanics,
    currentWarlockLevel,
  );
  if (selectedFeatures.length !== currentExpectedCount) {
    return Result.fail({
      code: "invalidEldritchInvocationSelectionCount",
      warlockLevel: currentWarlockLevel,
      expectedCount: currentExpectedCount,
      actualCount: selectedFeatures.length,
      message:
        "Cannot apply Warlock invocation lifecycle choices to a build whose current invocation count does not match its Warlock level.",
    });
  }

  const nextExpectedCount = eldritchInvocationCountAtLevel(
    featureChoice.success.mechanics,
    nextWarlockLevel,
  );
  const expectedGains = nextExpectedCount - selectedFeatures.length;
  const gainedInvocations =
    input.levelGain.eldritchInvocations.gainedInvocations;
  if (gainedInvocations.length !== expectedGains) {
    return Result.fail({
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
  if (Result.isFailure(replacedInvocations)) {
    return Result.fail(replacedInvocations.failure);
  }

  const finalInvocations = [
    ...replacedInvocations.success,
    ...gainedInvocations,
  ];
  const duplicateInvocationId =
    duplicateEldritchInvocationSelectionId(finalInvocations);
  if (duplicateInvocationId !== undefined) {
    return Result.fail({
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
    return Result.fail(prerequisiteIssue);
  }

  return Result.succeed([
    ...input.build.features.filter(
      (feature) =>
        !isSelectedEldritchInvocationFromFeature(
          feature,
          featureChoice.success.featureUnitId,
        ),
    ),
    ...finalInvocations.map(
      (selection): CharacterBuildFeature =>
        eldritchInvocationSelectionFeature(
          selection,
          featureChoice.success.featureUnitId,
        ),
    ),
  ]);
}

function replaceEldritchInvocationSelection(input: {
  readonly selectedInvocations: readonly EldritchInvocationSelection[];
  readonly replacement?: EldritchInvocationReplacement;
}): Result.Result<
  readonly EldritchInvocationSelection[],
  CharacterBuildAdvancementIssue
> {
  if (input.replacement === undefined) {
    return Result.succeed(input.selectedInvocations);
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
    return Result.fail({
      code: "missingSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      message:
        "Cannot replace an Eldritch Invocation that the build has not selected.",
    });
  }
  /* v8 ignore start -- @preserve -- Valid CharacterBuild features cannot contain the same nonrepeatable invocation selection more than once. */
  if (remainingMatchingIndexes.length > 0) {
    return Result.fail({
      code: "ambiguousSelectedEldritchInvocation",
      invocationId: replacement.replaceInvocation.invocationId,
      count: matchingIndexes.length,
      message:
        "Cannot replace an Eldritch Invocation selection when multiple matching selections exist.",
    });
  }
  /* v8 ignore stop -- @preserve */

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
    return Result.fail({
      code: "lockedEldritchInvocationReplacement",
      replaceInvocationId: replacement.replaceInvocation.invocationId,
      dependentInvocationId,
      message:
        "An Eldritch Invocation cannot be replaced while another selected invocation has it as a prerequisite.",
    });
  }

  return Result.succeed(
    input.selectedInvocations.map((selection, index) =>
      index === replaceIndex ? replacement.selectedInvocation : selection,
    ),
  );
}

function updateWarlockPactMagic(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly levelGain: CharacterBuildWarlockLevelGain;
}): Result.Result<CharacterBuildSpellcasting, CharacterBuildAdvancementIssue> {
  const spellcasting = input.build.spellcasting;
  const source = warlockSpellcastingSource(
    input.build,
    input.levelGain.classUnitId,
  );
  const facts = warlockPactMagicSpellcastingForClass({
    unitLibrary: input.unitLibrary,
    classUnitId: input.levelGain.classUnitId,
  });
  /* v8 ignore start -- @preserve -- The typed Warlock route was admitted from class facts containing Pact Magic. */
  if (Result.isFailure(facts)) return Result.fail(facts.failure);
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- An admitted Warlock level gain retains the class's existing Pact Magic source and spellcasting projection. */
  if (spellcasting === undefined || source === undefined) {
    return Result.fail({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.levelGain.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the build has no Warlock spellcasting source.",
    });
  }
  /* v8 ignore stop -- @preserve */

  const currentWarlockLevel = classLevelForUnit(
    input.build.progression,
    input.levelGain.classUnitId,
  );
  const currentProgression = pactMagicProgressionAtLevel(
    facts.success,
    currentWarlockLevel,
  );
  const nextProgression = pactMagicProgressionAtLevel(
    facts.success,
    currentWarlockLevel + 1,
  );

  const currentIssue = currentPactMagicStateIssue({
    source,
    progression: currentProgression,
    /* v8 ignore start -- @preserve -- An admitted Warlock build always retains its Pact Magic slot pool. */
    ...(spellcasting.slotPools.pactMagic === undefined
      ? {}
      : { pactMagicSlotPool: spellcasting.slotPools.pactMagic }),
    /* v8 ignore stop -- @preserve */
  });
  if (currentIssue !== undefined) return Result.fail(currentIssue);

  const cantrips = applyWarlockPactMagicCantripChanges({
    unitLibrary: input.unitLibrary,
    currentCantrips: source.cantrips,
    pactMagic: input.levelGain.pactMagic,
    currentProgression,
    nextProgression,
  });
  if (Result.isFailure(cantrips)) return Result.fail(cantrips.failure);

  const preparedSpells = applyWarlockPactMagicPreparedSpellChanges({
    unitLibrary: input.unitLibrary,
    currentPreparedSpells: source.preparedSpells,
    pactMagic: input.levelGain.pactMagic,
    currentProgression,
    nextProgression,
  });
  if (Result.isFailure(preparedSpells))
    return Result.fail(preparedSpells.failure);

  return Result.succeed({
    ...spellcasting,
    sources: mapCharacterBuildSpellcastingSources(
      spellcasting.sources,
      (candidate) =>
        candidate.sourceUnitId === input.levelGain.classUnitId
          ? {
              ...candidate,
              cantrips: cantrips.success,
              preparedSpells: preparedSpells.success,
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
}): Result.Result<void, CharacterBuildAdvancementIssue> {
  /* v8 ignore start -- @preserve -- The typed plain-Warlock route retains Pact Magic class facts and its existing build source from support admission. */
  if (input.spellcasting?.kind !== "pact_magic_spellcasting_creation") {
    return Result.fail({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the class has no Pact Magic facts.",
    });
  }

  const source = warlockSpellcastingSource(input.build, input.classUnitId);
  const pactMagicSlotPool = input.build.spellcasting?.slotPools.pactMagic;
  if (source === undefined || pactMagicSlotPool === undefined) {
    return Result.fail({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message:
        "Cannot advance Warlock Pact Magic because the build has no Pact Magic spellcasting facts.",
    });
  }
  /* v8 ignore stop -- @preserve */

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
  /* v8 ignore start -- @preserve -- An admitted CharacterBuild already matches its current Pact Magic table row and slot projection. */
  if (currentIssue !== undefined) return Result.fail(currentIssue);
  /* v8 ignore stop -- @preserve */

  if (source.cantrips.length !== nextProgression.cantripTotal) {
    return Result.fail({
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
    return Result.fail({
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
    return Result.fail(
      invalidPactMagicSlotProjectionIssue({
        warlockLevel: input.nextWarlockLevel,
        progression: nextProgression,
        pactMagicSlotPool,
      }),
    );
  }

  return Result.succeed(undefined);
}

function applyWarlockPactMagicCantripChanges(input: {
  readonly unitLibrary: UnitCatalog;
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly currentProgression: PactMagicProgressionRow;
  readonly nextProgression: PactMagicProgressionRow;
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  /* v8 ignore start -- @preserve -- An admitted CharacterBuild stores the exact current Pact Magic cantrip table count. */
  if (input.currentCantrips.length !== input.currentProgression.cantripTotal) {
    return Result.fail({
      code: "invalidWarlockPactMagicCantripSelectionCount",
      warlockLevel: input.currentProgression.atLevel,
      expectedCount: input.currentProgression.cantripTotal,
      actualCount: input.currentCantrips.length,
      message:
        "Cannot advance Warlock Pact Magic from a build whose current cantrip count does not match its Warlock level.",
    });
  }
  /* v8 ignore stop -- @preserve */

  const expectedGains =
    input.nextProgression.cantripTotal - input.currentProgression.cantripTotal;
  if (input.pactMagic.gainedCantrips.length !== expectedGains) {
    return Result.fail({
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
  if (Result.isFailure(replacedCantrips))
    return Result.fail(replacedCantrips.failure);

  const finalCantrips = [
    ...replacedCantrips.success,
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
    return Result.fail({
      code: "invalidWarlockPactMagicCantripChoice",
      cantripId: invalidCantrip,
      message:
        "Warlock Pact Magic cantrips must be chosen from the Warlock cantrip list.",
    });
  }

  const duplicateCantrip = duplicateValue(finalCantrips);
  if (duplicateCantrip !== undefined) {
    return Result.fail({
      code: "duplicateWarlockPactMagicCantrip",
      cantripId: duplicateCantrip,
      message: "Warlock Pact Magic cantrips must be distinct.",
    });
  }

  /* v8 ignore start -- @preserve -- Exact gain cardinality plus count-preserving replacement makes a different final count impossible. */
  return finalCantrips.length === input.nextProgression.cantripTotal
    ? Result.succeed(finalCantrips)
    : Result.fail({
        code: "invalidWarlockPactMagicCantripSelectionCount",
        warlockLevel: input.nextProgression.atLevel,
        expectedCount: input.nextProgression.cantripTotal,
        actualCount: finalCantrips.length,
        message:
          "Warlock Pact Magic cantrip changes must leave the build with the table count for the new Warlock level.",
      });
  /* v8 ignore stop -- @preserve */
}

function applyWarlockPactMagicPreparedSpellChanges(input: {
  readonly unitLibrary: UnitCatalog;
  readonly currentPreparedSpells: readonly UnitRecord["id"][];
  readonly pactMagic: CharacterBuildWarlockPactMagicLevelGain;
  readonly currentProgression: PactMagicProgressionRow;
  readonly nextProgression: PactMagicProgressionRow;
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  /* v8 ignore start -- @preserve -- An admitted CharacterBuild stores the exact current Pact Magic prepared-spell table count. */
  if (
    input.currentPreparedSpells.length !==
    input.currentProgression.preparedSpellTotal
  ) {
    return Result.fail({
      code: "invalidWarlockPactMagicPreparedSpellSelectionCount",
      warlockLevel: input.currentProgression.atLevel,
      expectedCount: input.currentProgression.preparedSpellTotal,
      actualCount: input.currentPreparedSpells.length,
      message:
        "Cannot advance Warlock Pact Magic from a build whose current prepared-spell count does not match its Warlock level.",
    });
  }
  /* v8 ignore stop -- @preserve */

  const expectedGains =
    input.nextProgression.preparedSpellTotal -
    input.currentProgression.preparedSpellTotal;
  if (input.pactMagic.gainedPreparedSpells.length !== expectedGains) {
    return Result.fail({
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
  if (Result.isFailure(replacedPreparedSpells)) {
    return Result.fail(replacedPreparedSpells.failure);
  }

  const finalPreparedSpells = [
    ...replacedPreparedSpells.success,
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
    return Result.fail({
      code: "invalidWarlockPactMagicPreparedSpellChoice",
      spellId: invalidSpell,
      message:
        "Warlock Pact Magic prepared spells must be Warlock spells no higher than the Pact Slot level for the new Warlock level.",
    });
  }

  const duplicateSpell = duplicateValue(finalPreparedSpells);
  if (duplicateSpell !== undefined) {
    return Result.fail({
      code: "duplicateWarlockPactMagicPreparedSpell",
      spellId: duplicateSpell,
      message: "Warlock Pact Magic prepared spells must be distinct.",
    });
  }

  /* v8 ignore start -- @preserve -- Exact gain cardinality plus count-preserving replacement makes a different final count impossible. */
  return finalPreparedSpells.length === input.nextProgression.preparedSpellTotal
    ? Result.succeed(finalPreparedSpells)
    : Result.fail({
        code: "invalidWarlockPactMagicPreparedSpellSelectionCount",
        warlockLevel: input.nextProgression.atLevel,
        expectedCount: input.nextProgression.preparedSpellTotal,
        actualCount: finalPreparedSpells.length,
        message:
          "Warlock Pact Magic prepared-spell changes must leave the build with the table count for the new Warlock level.",
      });
  /* v8 ignore stop -- @preserve */
}

function replaceWarlockPactMagicCantrip(input: {
  readonly currentCantrips: readonly UnitRecord["id"][];
  readonly replacement?: CharacterBuildWarlockPactMagicLevelGain["cantripReplacement"];
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Result.succeed(input.currentCantrips);
  }
  const replacement = input.replacement;

  if (replacement.replaceCantripId === replacement.selectedCantripId) {
    return Result.fail({
      code: "sameWarlockPactMagicCantripReplacement",
      cantripId: replacement.selectedCantripId,
      message:
        "Warlock Pact Magic cantrip replacement must choose a different Warlock cantrip.",
    });
  }

  if (!input.currentCantrips.includes(replacement.replaceCantripId)) {
    return Result.fail({
      code: "missingWarlockPactMagicCantripReplacement",
      cantripId: replacement.replaceCantripId,
      message:
        "Cannot replace a Pact Magic cantrip that the build does not know.",
    });
  }

  return Result.succeed(
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
}): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  if (input.replacement === undefined) {
    return Result.succeed(input.currentPreparedSpells);
  }
  const replacement = input.replacement;

  if (replacement.replaceSpellId === replacement.selectedSpellId) {
    return Result.fail({
      code: "sameWarlockPactMagicPreparedSpellReplacement",
      spellId: replacement.selectedSpellId,
      message:
        "Warlock Pact Magic prepared-spell replacement must choose a different Warlock spell.",
    });
  }

  if (!input.currentPreparedSpells.includes(replacement.replaceSpellId)) {
    return Result.fail({
      code: "missingWarlockPactMagicPreparedSpellReplacement",
      spellId: replacement.replaceSpellId,
      message:
        "Cannot replace a Pact Magic prepared spell that the build does not have prepared.",
    });
  }

  return Result.succeed(
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
}): Result.Result<ChoiceCreationHole, CharacterBuildAdvancementIssue> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed Fighting Style route already admitted this Fighter class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
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

  /* v8 ignore start -- @preserve -- The supported Fighter catalog contains exactly one acquisition feature that owns the Fighting Style hole. */
  if (holes.length === 0) {
    return Result.fail({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }

  if (holes.length > 1) {
    return Result.fail({
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
    return Result.fail({
      code: "missingFightingStyleFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Fighter class-feature Fighting Style feat choice.",
    });
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed(hole);
}

function fightingStyleCantripFeatureChoiceForClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Result.Result<
  FightingStyleCantripFeatureChoice,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed Fighting Style cantrip route already admitted this class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
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

  /* v8 ignore start -- @preserve -- An admitted Fighting Style cantrip replacement has exactly one matching acquisition grant in its class facts. */
  if (choices.length === 0) {
    return Result.fail({
      code: "missingFightingStyleCantripFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find a class-feature acquisition choice that grants known cantrip access for this class level gain.",
    });
  }

  if (choices.length > 1) {
    return Result.fail({
      code: "ambiguousFightingStyleCantripFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: choices.map((choice) => choice.featureUnitId),
      message:
        "Cannot replace Fighting Style cantrips because multiple cantrip-granting class-feature acquisition choices were found.",
    });
  }

  const choice = choices[0];
  if (choice === undefined) {
    return Result.fail({
      code: "missingFightingStyleCantripFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find a class-feature acquisition choice that grants known cantrip access for this class level gain.",
    });
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed(choice);
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
}): Result.Result<
  EldritchInvocationFeatureChoice,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed Warlock route already admitted this Warlock class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
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

  /* v8 ignore start -- @preserve -- The supported Warlock catalog contains exactly one feature choice with the invocation choice key. */
  if (featureChoices.length === 0) {
    return Result.fail({
      code: "missingEldritchInvocationFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Warlock class-feature Eldritch Invocation choice.",
    });
  }

  if (featureChoices.length > 1) {
    return Result.fail({
      code: "ambiguousEldritchInvocationFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: featureChoices.map((feature) => feature.featureUnitId),
      message:
        "Cannot update Eldritch Invocations because multiple Warlock invocation choices were found.",
    });
  }

  const featureChoice = featureChoices[0];
  return featureChoice === undefined
    ? Result.fail({
        code: "missingEldritchInvocationFeatureChoice",
        classUnitId: input.classUnitId,
        message:
          "Cannot find the Warlock class-feature Eldritch Invocation choice.",
      })
    : Result.succeed(featureChoice);
  /* v8 ignore stop -- @preserve */
}

function sorcererMetamagicFeatureForSorcererClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: SorcererClassUnitId;
}): Result.Result<
  SorcererMetamagicFeatureChoice,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed Sorcerer route already admitted this Sorcerer class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
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

  /* v8 ignore start -- @preserve -- The supported Sorcerer catalog contains exactly one Metamagic option-choice feature. */
  if (featureChoices.length === 0) {
    return Result.fail({
      code: "missingSorcererMetamagicFeatureChoice",
      classUnitId: input.classUnitId,
      message:
        "Cannot find the Sorcerer class-feature Metamagic option choice.",
    });
  }

  if (featureChoices.length > 1) {
    return Result.fail({
      code: "ambiguousSorcererMetamagicFeatureChoice",
      classUnitId: input.classUnitId,
      featureUnitIds: featureChoices.map((feature) => feature.featureUnitId),
      message:
        "Cannot update Metamagic options because multiple Sorcerer Metamagic choices were found.",
    });
  }

  const featureChoice = featureChoices[0];
  return featureChoice === undefined
    ? Result.fail({
        code: "missingSorcererMetamagicFeatureChoice",
        classUnitId: input.classUnitId,
        message:
          "Cannot find the Sorcerer class-feature Metamagic option choice.",
      })
    : Result.succeed(featureChoice);
  /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- EldritchInvocationSelection carries an id already parsed against the closed installed invocation roster. */
    if (option === undefined) {
      return {
        code: "unknownEldritchInvocation",
        invocationId: selection.invocationId,
        message: `Unknown Eldritch Invocation id ${selection.invocationId}.`,
      };
    }
    /* v8 ignore stop -- @preserve */

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
  /* v8 ignore start -- @preserve -- Parsed invocation selections carry ids from the installed invocation option roster. */
  return (
    eldritchInvocationOptionForInvocationId(
      input.invocationId,
    )?.prerequisites.some(
      (prerequisite) =>
        prerequisite.kind === "knownInvocation" &&
        prerequisite.invocationId === input.requiredInvocationId,
    ) ?? false
  );
  /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- Parsing correlates once-only invocation ids with the nonRepeatable selection variant. */
    return input.selection.kind === "nonRepeatable"
      ? undefined
      : {
          code: "invalidRepeatableEldritchInvocationChoice",
          invocationId: input.selection.invocationId,
          repeatableChoice: input.selection.repeatableChoice,
          message:
            "Only Repeatable Eldritch Invocations can carry an associated repeatable choice.",
        };
    /* v8 ignore stop -- @preserve */
  }

  /* v8 ignore start -- @preserve -- Parsing correlates repeatable invocation ids with the repeatable selection variant. */
  if (input.selection.kind === "nonRepeatable") {
    return {
      code: "missingRepeatableEldritchInvocationChoice",
      invocationId: input.selection.invocationId,
      message:
        "Repeatable Eldritch Invocation selections must include the associated cantrip or Origin feat choice.",
    };
  }
  /* v8 ignore stop -- @preserve */

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
  /* v8 ignore start -- @preserve -- An admitted Warlock invocation workflow retains its Pact Magic spellcasting source. */
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
  /* v8 ignore stop -- @preserve */
}

function repeatableChoiceMatchesRule(input: {
  readonly unitLibrary: UnitCatalog;
  readonly invocationId: EldritchInvocationId;
  readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
}): boolean {
  const option = eldritchInvocationOptionForInvocationId(input.invocationId);
  /* v8 ignore start -- @preserve -- Parsed repeatable selections retain invocation ids whose installed option is repeatable. */
  if (option?.repeatability.kind !== "repeatable") {
    return false;
  }
  /* v8 ignore stop -- @preserve */

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
}): Result.Result<
  PactMagicSpellcastingCreation,
  CharacterBuildAdvancementIssue
> {
  const classUnit = classUnitRecord(input);
  /* v8 ignore start -- @preserve -- The typed Pact Magic route already admitted this Warlock class id from the same catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  /* v8 ignore stop -- @preserve */

  const facts = classCreationFacts(classUnit.success);
  /* v8 ignore start -- @preserve -- The branded Warlock class route is admitted only from class facts containing Pact Magic creation data. */
  if (facts.spellcasting?.kind !== "pact_magic_spellcasting_creation") {
    return Result.fail({
      code: "missingWarlockPactMagicSpellcasting",
      classUnitId: input.classUnitId,
      message: "Cannot find Warlock Pact Magic class spellcasting facts.",
    });
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed(facts.spellcasting);
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
  /* v8 ignore start -- @preserve -- A Warlock class level is at least one and the admitted Pact Magic table has a level-one row. */
  return row ?? firstRow;
  /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- An admitted Warlock build supplies the mismatched pool here; absence is a malformed direct build. */
    return invalidPactMagicSlotProjectionIssue({
      warlockLevel: input.progression.atLevel,
      progression: input.progression,
      ...(input.pactMagicSlotPool === undefined
        ? {}
        : { pactMagicSlotPool: input.pactMagicSlotPool }),
    });
    /* v8 ignore stop -- @preserve */
  }

  return undefined;
}

function invalidPactMagicSlotProjectionIssue(input: {
  readonly warlockLevel: number;
  readonly progression: PactMagicProgressionRow;
  readonly pactMagicSlotPool?: CharacterBuildPactMagicSlotPool;
}): CharacterBuildAdvancementIssue {
  /* v8 ignore start -- @preserve -- This diagnostic is constructed from an existing Pact Magic pool after detecting a value mismatch. */
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
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Callers pass only Unit-sourced class-feature choice holes to this helper. */
  return hole.source.tag === "unitChoice" ? hole.source.unitId : undefined;
  /* v8 ignore stop -- @preserve */
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
