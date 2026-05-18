import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  abilityScoreAssignment,
  characterBuildArmorTraining,
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  characterBuildProficiencies,
  characterBuildResources,
  characterBuildSpellcastingSlotCapacity,
  classLevelForUnit,
  classUnitId,
  classUnitIdToClassName,
  CHARACTER_CLASS_LEVELS,
  computeTotalLevel,
  characterEquipmentItemSourceFromId,
  eldritchInvocationOptionForInvocationId,
  eldritchInvocationRepeatableChoiceSatisfiesRule,
  eldritchInvocationId,
  languageFromSurfaceLanguageId,
  parseCharacterEquipmentItemId,
  progressionClassUnitIds,
  STANDARD_LANGUAGES,
  weaponMasteryChoiceProfileForFeature,
  type CharacterBuild,
  type CharacterBuildBookOfShadowsSpellAccess,
  type CharacterBuildEquipment,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildFeature,
  type CharacterBuildHitDiePool,
  type CharacterBuildPactMagicSlotPool,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildResource,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingFocus,
  type CharacterBuildSpellcastingSource,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  ABILITIES,
  CONDITIONS,
  LANGUAGES,
  SKILLS,
  SURFACE_SKILLS,
  type Ability,
  type SurfaceSkill,
} from "@dnd/shared/game-facts";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
  type Condition,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  elapsedTimeTicksFromTimeSpanDuration,
  parseElapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
  type ElapsedTimeTicks,
  type PositiveElapsedTimeTicks,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import {
  abilityModifier,
  armorClass,
  armorClassDelta,
  currentArmorClass,
  defaultArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassBaseSource,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { abilityScoreToMod } from "@dnd/shared-algebras/ability-score-algebra";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  holeId,
  holeInstanceKey,
  type FilledHoleValue,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  STABLE_RECOVERY_ROLL_DICE_EXPR,
  advanceStableRecovery,
  advanceStableRecoveryWithRoll,
  type StableRecovery,
} from "@dnd/shared-algebras/stable-recovery-algebra";
import type {
  Hp as HpType,
  ResourceCount,
  SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  ChargePoolResource,
  ClassFeatureComponentMechanics,
  EquipmentPredicate,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  allCantripsFromAnyClassSpellList,
  allCantripsFromClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
} from "@dnd/surface/surface/schema";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import {
  isSupportedClassFeatureSpellFreeCastResourceTag,
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  type SupportedClassFeatureSpellFreeCastResourceTag,
} from "@dnd/surface/surface/types";
import { Brand, Either, Match, Option } from "effect";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.armor-class-base-formula
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.short-rest-spell-slot-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.spellbook-ritual-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.weapon-mastery-reselection
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ability-check-proficiency-bonus
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.pact-slot-recovery

const WEAPON_PROFICIENCY_CATEGORY_VALUES = ["simple", "martial"] as const;
const ARMOR_TRAINING_CATEGORY_VALUES = [
  "light",
  "medium",
  "heavy",
  "shield",
] as const;
export const BARD_JACK_OF_ALL_TRADES_UNIT_ID =
  "bard_jack_of_all_trades" as const satisfies UnitRecord["id"];
const WARLOCK_MAGICAL_CUNNING_UNIT_ID =
  "warlock_magical_cunning" as const satisfies UnitRecord["id"];
const ARCANE_RECOVERY_REST_FEATURE_TAG = "arcaneRecovery" as const;
const MAGICAL_CUNNING_REST_FEATURE_TAG = "magicalCunning" as const;
const JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR = 2;
const LAY_ON_HANDS_POISONED_REMOVAL_COST = resourceCount(5);
const RITUAL_ADDITIONAL_CASTING_TIME_MINUTES = 10;
type StoredClassFeatureLanguageFact =
  CharacterBuild["classFeatureLanguages"][number];
type StoredClassFeatureLanguage = StoredClassFeatureLanguageFact["language"];
type StoredClassFeatureLanguageProjection = {
  readonly fixedLanguagesBySourceUnitId: ReadonlyMap<
    UnitRecord["id"],
    ReadonlySet<StoredClassFeatureLanguage>
  >;
  readonly fixedLanguages: ReadonlySet<StoredClassFeatureLanguage>;
  readonly choiceCountsBySourceUnitId: ReadonlyMap<UnitRecord["id"], number>;
};
const CHARACTER_SHEET_CONDITIONS = CONDITIONS.filter(
  (condition): condition is CharacterSheetCondition =>
    condition !== "unconscious",
);

export type CharacterSheetId = string & Brand.Brand<"CharacterId">;
const CharacterSheetId = Brand.nominal<CharacterSheetId>();

export function characterSheetId(value: string): CharacterSheetId {
  return CharacterSheetId(value);
}

type SpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting: NonNullable<CharacterBuild["spellcasting"]>;
};

type NonSpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting?: undefined;
};

type CharacterSheetWithSpellSlots = CharacterSheet & {
  readonly build: SpellcastingCharacterBuild;
  readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
};

export type CharacterSheet =
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: SpellcastingCharacterBuild;
      readonly maximumHp: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly conditions: readonly CharacterSheetCondition[];
      readonly spentHitDice: readonly CharacterSheetSpentHitDiePool[];
      readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
      readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
      readonly bookOfShadowsPresence:
        | CharacterSheetBookOfShadowsPresence
        | undefined;
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
      readonly pactSlotExpenditure: CharacterPactSlotExpenditure | undefined;
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly maximumHp: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly conditions: readonly CharacterSheetCondition[];
      readonly spentHitDice: readonly CharacterSheetSpentHitDiePool[];
      readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
      readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
      readonly bookOfShadowsPresence?: never;
      readonly spellSlotExpenditures?: never;
      readonly pactSlotExpenditure?: never;
    };

export type CharacterSheetCondition = Exclude<Condition, "unconscious">;

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: SpellSlotLevel;
  readonly expended: ResourceCount;
};

export type CharacterPactSlotExpenditure = {
  readonly slotLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetBookOfShadowsPresence =
  | { readonly tag: "onPerson" }
  | { readonly tag: "notOnPerson" };

export type CharacterSheetSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetPactSlotState = CharacterPactSlotExpenditure;

export type CharacterSheetSpentHitDiePool = {
  readonly classUnitId: UnitRecord["id"];
  readonly spent: ResourceCount;
};

export type CharacterSheetHitDieState = CharacterBuildHitDiePool & {
  readonly spent: ResourceCount;
};

export type CharacterSheetHitDieSpend = {
  readonly classUnitId: UnitRecord["id"];
  readonly roll: DieRollResult;
};

export type CharacterSheetRestFeatureUse =
  | {
      readonly tag: typeof ARCANE_RECOVERY_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
    }
  | {
      readonly tag: typeof MAGICAL_CUNNING_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
    };

export type CharacterSheetResourceExpenditure = {
  readonly tag:
    | "layOnHandsHealingPool"
    | SupportedClassFeatureSpellFreeCastResourceTag;
  readonly expended: ResourceCount;
};

type CharacterSheetLayOnHandsResource = CharacterBuildResource & {
  readonly unitId: UnitRecord["id"];
  readonly resource: ChargePoolResource;
};

type CharacterSheetClassFeatureSpellFreeCastResource = {
  readonly unitId: UnitRecord["id"];
  readonly tag: SupportedClassFeatureSpellFreeCastResourceTag;
  readonly count: ResourceCount;
};

export type CharacterSheetResourceState =
  | (CharacterSheetLayOnHandsResource & {
      readonly tag: "layOnHandsHealingPool";
      readonly count: ResourceCount;
      readonly expended: ResourceCount;
    })
  | (CharacterSheetClassFeatureSpellFreeCastResource & {
      readonly expended: ResourceCount;
    });

export type CharacterSheetArcaneRecoverySlotRefund = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
};

export type CharacterSheetShortRestInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spendHitDice?: readonly CharacterSheetHitDieSpend[];
  readonly arcaneRecovery?: {
    readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
  };
};

export type CharacterSheetMagicalCunningInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
};

export type CharacterSheetWeaponMasteryReselection = {
  readonly featureUnitId: UnitRecord["id"];
  readonly selectedWeaponUnitIds: ReadonlyNonEmptyArray<UnitRecord["id"]>;
};

export type CharacterSheetLongRestInput =
  | {
      readonly sheet: CharacterSheet;
      readonly unitLibrary?: never;
      readonly weaponMasteryReselections?: never;
    }
  | {
      readonly sheet: CharacterSheet;
      readonly unitLibrary: UnitCatalog;
      readonly weaponMasteryReselections: ReadonlyNonEmptyArray<CharacterSheetWeaponMasteryReselection>;
    };

export type CharacterSheetLayOnHandsInput = {
  readonly source: CharacterSheet;
  readonly target: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly restoreHp: HpType;
  readonly removePoisoned: boolean;
};

export type CharacterSheetLayOnHandsResult = {
  readonly source: CharacterSheet;
  readonly target: CharacterSheet;
};

export type CharacterSheetInput = {
  readonly characterId: CharacterSheetId;
  readonly build: CharacterBuild;
  readonly maximumHp: HpType;
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly conditions: readonly CharacterSheetCondition[];
  readonly unitLibrary: UnitCatalog;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
  readonly spentHitDice?: readonly CharacterSheetSpentHitDiePool[];
  readonly spellSlots?: readonly CharacterSheetSpellSlotState[];
  readonly pactSlots?: CharacterSheetPactSlotState;
  readonly bookOfShadowsPresence?: CharacterSheetBookOfShadowsPresence;
  readonly restFeatureUses?: readonly CharacterSheetRestFeatureUse[];
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
};

export type CharacterSheetPositiveHpUnconscious = {
  readonly tag: "knockedOut";
};

export const CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS = {
  tag: "knockedOut",
} as const satisfies CharacterSheetPositiveHpUnconscious;

type CharacterSheetPendingDeathSaveCount = Exclude<DeathSaveCount, 3>;

export type CharacterSheetPendingDeathSaves = {
  readonly successes: CharacterSheetPendingDeathSaveCount;
  readonly failures: CharacterSheetPendingDeathSaveCount;
};

export type CharacterSheetDeadDeathSaves = {
  readonly successes: CharacterSheetPendingDeathSaveCount;
  readonly failures: 3;
};

type CharacterSheetStableZeroHpLifecycle = {
  readonly tag: "stable";
  readonly recovery: CharacterSheetStableRecovery;
};

export type CharacterSheetStableRecovery = StableRecovery;

export type CharacterSheetZeroHpLifecycle =
  | {
      readonly tag: "unstable";
      readonly deathSaves: CharacterSheetPendingDeathSaves;
    }
  | CharacterSheetStableZeroHpLifecycle
  | {
      readonly tag: "dead";
      readonly deathSaves: CharacterSheetDeadDeathSaves;
    };

export type CharacterSheetZeroHpLifecycleInput =
  | { readonly tag: "unstable"; readonly deathSaves: DeathSaves }
  | CharacterSheetStableZeroHpLifecycle
  | { readonly tag: "dead"; readonly deathSaves: DeathSaves };

export type CharacterSheetHitPoints =
  | {
      readonly tag: "positive";
      readonly currentHp: HpType;
      readonly tempHp: HpType;
    }
  | { readonly tag: "knockedOut"; readonly tempHp: HpType }
  | {
      readonly tag: "zero";
      readonly tempHp: HpType;
      readonly lifecycle: CharacterSheetZeroHpLifecycle;
    };

export type CharacterSheetHitPointsInput = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

export type CharacterSheetIssue = {
  readonly tag: "characterSheetIssue";
  readonly message: string;
};

export type CharacterSheetElapsedTimeResult =
  | {
      readonly tag: "resolved";
      readonly sheet: CharacterSheet;
      readonly elapsedTicks: ElapsedTimeTicks;
    }
  | {
      readonly tag: "needsHoles";
      readonly sheet: CharacterSheet;
      readonly holes: ReadonlyNonEmptyArray<RuntimeHole>;
      readonly elapsedTicks: ElapsedTimeTicks;
      readonly remainingTicks: PositiveElapsedTimeTicks;
    }
  | {
      readonly tag: "invalid";
      readonly sheet: CharacterSheet;
      readonly reason: "invalidFill";
      readonly message: string;
    };

export type CharacterSheetTimePassedInput = {
  readonly sheet: CharacterSheet;
  readonly duration: TimeSpanDuration;
  readonly fills: readonly FilledHoleValue[];
};

export type CharacterSheetArmorClassBaseChoice =
  | { readonly kind: "default_unarmored" }
  | { readonly kind: "class_feature"; readonly unitId: UnitRecord["id"] };

export type CharacterSheetArmorClassStateInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly baseChoice?: CharacterSheetArmorClassBaseChoice;
};

export type CharacterSheetAbilityCheckOtherProficiencyBonusState =
  | { readonly tag: "noOtherProficiencyBonus" }
  | { readonly tag: "otherProficiencyBonusApplies" };

export const CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS = {
  tag: "noOtherProficiencyBonus",
} as const satisfies CharacterSheetAbilityCheckOtherProficiencyBonusState;

export const CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES = {
  tag: "otherProficiencyBonusApplies",
} as const satisfies CharacterSheetAbilityCheckOtherProficiencyBonusState;

export type CharacterSheetAbilityCheckProficiencyBonusInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly skill: SurfaceSkill;
  readonly otherProficiencyBonus: CharacterSheetAbilityCheckOtherProficiencyBonusState;
};

export type CharacterSheetAbilityCheckProficiencyBonus =
  | {
      readonly tag: "none";
      readonly bonus: 0;
    }
  | {
      readonly tag: "skillProficiency";
      readonly skill: SurfaceSkill;
      readonly bonus: number;
    }
  | {
      readonly tag: "expertise";
      readonly skill: SurfaceSkill;
      readonly bonus: number;
    }
  | {
      readonly tag: "jackOfAllTrades";
      readonly sourceUnitId: typeof BARD_JACK_OF_ALL_TRADES_UNIT_ID;
      readonly skill: SurfaceSkill;
      readonly bonus: number;
    };

export type CharacterSheetSpellInvocationInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
  readonly invocation: CharacterSheetSpellInvocationKind;
};

export type CharacterSheetSpellInvocationKind = {
  readonly kind: "ritual";
};

export type CharacterSheetSpellbookRitualAccessInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
};

export type CharacterSheetSpellbookRitualAccess = {
  readonly tag: "spellbookRitual";
  readonly spell: SpellRecord;
  readonly spellcastingSourceUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
};

export type CharacterSheetSpellbookRitualInvocation = {
  readonly tag: "spellbookRitual";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: SpellRecord["mechanics"]["level"];
  readonly spellcastingSourceUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
  readonly spellSlotCost: { readonly kind: "none" };
  readonly preparationRequirement: "not_required";
  readonly requiredSpellAccess: "spellbook";
  readonly additionalCastingTimeMinutes: typeof RITUAL_ADDITIONAL_CASTING_TIME_MINUTES;
  readonly requiresReadingSpellbook: true;
};

export type CharacterSheetBookOfShadowsRitualInvocation = {
  readonly tag: "bookOfShadowsRitual";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: SpellRecord["mechanics"]["level"];
  readonly spellcastingSourceUnitId: UnitRecord["id"];
  readonly spellSlotCost: { readonly kind: "none" };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "bookOfShadows";
  readonly additionalCastingTimeMinutes: typeof RITUAL_ADDITIONAL_CASTING_TIME_MINUTES;
  readonly requiresBookOfShadowsOnPerson: true;
};

export type CharacterSheetSpellInvocation =
  | CharacterSheetSpellbookRitualInvocation
  | CharacterSheetBookOfShadowsRitualInvocation;

export function characterSheetIssue(
  message: string,
): Either.Either<never, CharacterSheetIssue> {
  return Either.left({ tag: "characterSheetIssue", message });
}

export function characterSheetAbilityCheckProficiencyBonus(
  input: CharacterSheetAbilityCheckProficiencyBonusInput,
): Either.Either<
  CharacterSheetAbilityCheckProficiencyBonus,
  CharacterSheetIssue
> {
  const proficiencies = characterBuildProficiencies(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(proficiencies)) {
    return characterSheetIssue(
      proficiencies.left.map((issue) => issue.message).join("; "),
    );
  }

  const proficiencyBonus = proficiencyBonusForCharacterLevel(
    computeTotalLevel(input.build.progression),
  );
  if (proficiencies.right.expertise.includes(input.skill)) {
    return Either.right({
      tag: "expertise",
      skill: input.skill,
      bonus: proficiencyBonus * 2,
    });
  }
  if (proficiencies.right.skills.includes(input.skill)) {
    return Either.right({
      tag: "skillProficiency",
      skill: input.skill,
      bonus: proficiencyBonus,
    });
  }
  const ownsJackOfAllTrades = characterBuildOwnsJackOfAllTradesFeature(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(ownsJackOfAllTrades)) {
    return Either.left(ownsJackOfAllTrades.left);
  }
  return Match.value(input.otherProficiencyBonus).pipe(
    Match.when({ tag: "otherProficiencyBonusApplies" }, () =>
      Either.right({
        tag: "none" as const,
        bonus: 0 as const,
      }),
    ),
    Match.when({ tag: "noOtherProficiencyBonus" }, () =>
      ownsJackOfAllTrades.right
        ? Either.right({
            tag: "jackOfAllTrades" as const,
            sourceUnitId: BARD_JACK_OF_ALL_TRADES_UNIT_ID,
            skill: input.skill,
            bonus: Math.floor(
              proficiencyBonus / JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR,
            ),
          })
        : Either.right({
            tag: "none" as const,
            bonus: 0 as const,
          }),
    ),
    Match.exhaustive,
  );
}

function characterBuildOwnsJackOfAllTradesFeature(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
): Either.Either<boolean, CharacterSheetIssue> {
  if (
    !characterBuildOwnsFeatureUnit(
      build,
      unitLibrary,
      BARD_JACK_OF_ALL_TRADES_UNIT_ID,
    )
  ) {
    return Either.right(false);
  }
  const unit = getRequiredUnit(unitLibrary, BARD_JACK_OF_ALL_TRADES_UNIT_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (
    unit.right.kind === "class_feature" &&
    unit.right.mechanics.family === "passive" &&
    unit.right.mechanics.grants.some(
      (grant) => grant.kind === "jack_of_all_trades_ability_check_bonus",
    )
  ) {
    return Either.right(true);
  }
  return characterSheetIssue(
    "Jack of All Trades requires the installed Surface feature record.",
  );
}

function characterBuildOwnsFeatureUnit(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): boolean {
  return characterBuildFeatureUnitIds(build, unitLibrary).includes(unitId);
}

export function createFreshCharacterSheet(
  input: CharacterSheetInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const hitPointCapacity = characterSheetHitPointCapacity(input);
  if (Either.isLeft(hitPointCapacity))
    return Either.left(hitPointCapacity.left);
  const spentHitDice = spentHitDiceFromInput(input);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const restFeatureUses = restFeatureUsesFromInput(input);
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const conditions = conditionsFromInput(input.conditions);
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const resourceExpenditures = resourceExpendituresFromInput(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }

  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
      );
    }
    if (input.pactSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Pact Slot state.",
      );
    }
    const hitPoints = characterSheetHitPoints(input);
    if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
    return Either.right({
      tag: "available",
      characterId: input.characterId,
      build: input.build,
      maximumHp: input.maximumHp,
      hitPoints: hitPoints.right,
      conditions: conditions.right,
      spentHitDice: spentHitDice.right,
      restFeatureUses: restFeatureUses.right,
      resourceExpenditures: resourceExpenditures.right,
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Character build spellcasting state is inconsistent.",
    );
  }
  const build = input.build;
  const hitPoints = characterSheetHitPoints(input);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spellSlotExpenditures = spellSlotExpendituresFromInput({
    build,
    ...(input.spellSlots === undefined ? {} : { spellSlots: input.spellSlots }),
  });
  if (Either.isLeft(spellSlotExpenditures)) {
    return Either.left(spellSlotExpenditures.left);
  }
  const pactSlotExpenditure = pactSlotExpenditureFromInput({
    build,
    ...(input.pactSlots === undefined ? {} : { pactSlots: input.pactSlots }),
  });
  if (Either.isLeft(pactSlotExpenditure)) {
    return Either.left(pactSlotExpenditure.left);
  }

  return Either.right({
    tag: "available",
    characterId: input.characterId,
    build,
    maximumHp: input.maximumHp,
    hitPoints: hitPoints.right,
    conditions: conditions.right,
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
    resourceExpenditures: resourceExpenditures.right,
    bookOfShadowsPresence: bookOfShadowsPresence.right,
    spellSlotExpenditures: spellSlotExpenditures.right,
    pactSlotExpenditure: pactSlotExpenditure.right,
  });
}

function bookOfShadowsPresenceFromInput(
  input: CharacterSheetInput,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(input.build)) {
    return input.bookOfShadowsPresence === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  return Either.right(input.bookOfShadowsPresence ?? { tag: "onPerson" });
}

function characterBuildHasBookOfShadows(build: CharacterBuild): boolean {
  return (
    build.spellcasting?.sources.some(
      (source) => source.bookOfShadows !== undefined,
    ) ?? false
  );
}

export function parseCharacterSheet(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Sheet.");
  if (value.tag !== "available") {
    return characterSheetIssue("Expected available Character Sheet.");
  }
  if (typeof value.characterId !== "string") {
    return characterSheetIssue("Character Sheet requires character id.");
  }
  const build = parseCharacterBuild(value.build, unitLibrary);
  if (Either.isLeft(build)) return Either.left(build.left);
  const bookOfShadowsPresence = parseStoredCharacterSheetBookOfShadowsPresence(
    build.right,
    value.bookOfShadowsPresence,
  );
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  const maximumHp = parseHp(value.maximumHp);
  if (Either.isLeft(maximumHp)) return Either.left(maximumHp.left);
  const hitPoints = parseStoredHitPoints(value.hitPoints);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const conditions = parseStoredConditions(value.conditions);
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const spentHitDice = parseStoredSpentHitDice(value.spentHitDice);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const resourceExpenditures = parseStoredResourceExpenditures(
    value.resourceExpenditures,
  );
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const spellSlots = parseStoredSpellSlots(build.right, value);
  if (Either.isLeft(spellSlots)) return Either.left(spellSlots.left);
  const pactSlots = parseStoredPactSlots(build.right, value);
  if (Either.isLeft(pactSlots)) return Either.left(pactSlots.left);
  const restFeatureUses = parseStoredRestFeatureUses(
    build.right,
    unitLibrary,
    value.restFeatureUses,
  );
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);

  return createFreshCharacterSheet({
    characterId: characterSheetId(value.characterId),
    build: build.right,
    maximumHp: maximumHp.right,
    currentHp: hitPoints.right.currentHp,
    tempHp: hitPoints.right.tempHp,
    conditions: conditions.right,
    unitLibrary,
    ...(hitPoints.right.positiveHpUnconscious === undefined
      ? {}
      : { positiveHpUnconscious: hitPoints.right.positiveHpUnconscious }),
    ...(hitPoints.right.zeroHpLifecycle === undefined
      ? {}
      : { zeroHpLifecycle: hitPoints.right.zeroHpLifecycle }),
    ...(spellSlots.right === undefined ? {} : { spellSlots: spellSlots.right }),
    ...(pactSlots.right === undefined ? {} : { pactSlots: pactSlots.right }),
    ...(bookOfShadowsPresence.right === undefined
      ? {}
      : { bookOfShadowsPresence: bookOfShadowsPresence.right }),
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
    resourceExpenditures: resourceExpenditures.right,
  });
}

export function characterSheetHitPoints(
  input: CharacterSheetHitPointsInput,
): Either.Either<CharacterSheetHitPoints, CharacterSheetIssue> {
  if (!isNonNegativeInteger(input.tempHp)) {
    return characterSheetIssue(
      "Character Sheet Temporary Hit Points must be nonnegative.",
    );
  }
  const tempHp = input.tempHp;
  if (Number(input.currentHp) > 0) {
    if (input.zeroHpLifecycle !== undefined) {
      return characterSheetIssue(
        "Positive-HP Character Sheet cannot carry zero-HP state.",
      );
    }
    if (
      input.positiveHpUnconscious !== undefined &&
      Number(input.currentHp) !== 1
    ) {
      return characterSheetIssue(
        "Knocked Out Character Sheet must have exactly 1 current HP.",
      );
    }
    return Either.right(
      input.positiveHpUnconscious === undefined
        ? { tag: "positive", currentHp: input.currentHp, tempHp }
        : { tag: "knockedOut", tempHp },
    );
  }
  if (input.positiveHpUnconscious !== undefined) {
    return characterSheetIssue(
      "Zero-HP Character Sheet cannot carry Knock Out Unconscious state.",
    );
  }
  const lifecycle = canonicalZeroHpLifecycle(
    input.zeroHpLifecycle ?? {
      tag: "unstable",
      deathSaves: { successes: 0, failures: 0 },
    },
  );
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({ tag: "zero", tempHp, lifecycle: lifecycle.right });
}

export function characterSheetCurrentHp(sheet: CharacterSheet): HpType {
  return characterSheetHitPointsCurrentHp(sheet.hitPoints);
}

export function characterSheetTempHp(sheet: CharacterSheet): HpType {
  return sheet.hitPoints.tempHp;
}

export function characterSheetHitPointsCurrentHp(
  hitPoints: CharacterSheetHitPoints,
): HpType {
  if (hitPoints.tag === "positive") return hitPoints.currentHp;
  return hitPoints.tag === "knockedOut" ? Hp(1) : Hp(0);
}

export function characterSheetSpellSlots(
  sheet: CharacterSheet,
): readonly CharacterSheetSpellSlotState[] | undefined {
  if (!isCharacterSheetWithSpellSlots(sheet)) return undefined;
  return characterBuildSpellcastingSlotCapacity(sheet.build).map((slot) => {
    const expenditure = requireSpellSlotExpenditure(
      sheet.spellSlotExpenditures,
      spellSlotLevel(slot.spellLevel),
    );
    return {
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: expenditure.expended,
    };
  });
}

export function characterSheetPactSlots(
  sheet: CharacterSheet,
): CharacterSheetPactSlotState | undefined {
  return "pactSlotExpenditure" in sheet ? sheet.pactSlotExpenditure : undefined;
}

export function characterSheetHitDice(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterSheetHitDieState[], CharacterSheetIssue> {
  const capacity = characterBuildHitDice(sheet.build, unitLibrary);
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  return Either.right(
    capacity.right.map((pool) => ({
      ...pool,
      spent:
        sheet.spentHitDice.find(
          (spent) => spent.classUnitId === pool.classUnitId,
        )?.spent ?? resourceCount(0),
    })),
  );
}

export function characterSheetResources(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterSheetResourceState[], CharacterSheetIssue> {
  const resources: CharacterSheetResourceState[] = [];
  const layOnHandsResource = layOnHandsResourceForBuild(
    sheet.build,
    unitLibrary,
  );
  if (Either.isLeft(layOnHandsResource))
    return Either.left(layOnHandsResource.left);
  if (layOnHandsResource.right !== null) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: layOnHandsResource.right,
    });
    if (Either.isLeft(count)) return Either.left(count.left);
    resources.push({
      ...layOnHandsResource.right,
      tag: "layOnHandsHealingPool",
      count: count.right,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) => expenditure.tag === "layOnHandsHealingPool",
        )?.expended ?? resourceCount(0),
    });
  }

  const freeCastResources = classFeatureSpellFreeCastResourcesForBuild(
    sheet.build,
    unitLibrary,
  );
  if (Either.isLeft(freeCastResources)) {
    return Either.left(freeCastResources.left);
  }
  for (const freeCastResource of freeCastResources.right) {
    resources.push({
      ...freeCastResource,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) => expenditure.tag === freeCastResource.tag,
        )?.expended ?? resourceCount(0),
    });
  }

  return Either.right(resources);
}

export function characterSheetSpellInvocation(
  input: CharacterSheetSpellInvocationInput,
): Either.Either<CharacterSheetSpellInvocation, CharacterSheetIssue> {
  const bookOfShadowsRitual =
    characterSheetBookOfShadowsRitualInvocation(input);
  if (bookOfShadowsRitual !== null) {
    return bookOfShadowsRitual;
  }
  return characterSheetSpellbookRitualInvocation(input);
}

export function characterSheetSpellbookRitualAccess(
  input: CharacterSheetSpellbookRitualAccessInput,
): Either.Either<CharacterSheetSpellbookRitualAccess, CharacterSheetIssue> {
  return characterSheetSpellbookRitualAccessForSpell(input, {
    missingSpellbookMessage:
      "Wizard Ritual Adept requires the spell in the spellbook.",
  });
}

export function characterSheetSpellbookRitualAccessesForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterSheetSpellbookRitualAccess[],
  CharacterSheetIssue
> {
  if (!isSpellcastingBuild(input.build)) {
    return Either.right([]);
  }
  const feature = optionalSpellbookRitualAccessFeatureForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(feature)) return Either.left(feature.left);
  if (feature.right === null) return Either.right([]);

  const accesses: CharacterSheetSpellbookRitualAccess[] = [];
  for (const source of input.build.spellcasting.sources) {
    if (source.spellbook.length === 0) continue;
    const sourceClassName = classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId: source.sourceUnitId,
    });
    if (Either.isLeft(sourceClassName) || sourceClassName.right !== "wizard") {
      return characterSheetIssue(
        "Spellbook Ritual Access must be attached to the Wizard spellcasting source.",
      );
    }
    for (const spellId of source.spellbook) {
      const spell = getRequiredUnit(input.unitLibrary, spellId);
      if (Either.isLeft(spell)) return Either.left(spell.left);
      if (!isSpellRecord(spell.right)) {
        return characterSheetIssue(
          "Spellbook Ritual Access requires Spell records in the spellbook.",
        );
      }
      if (!spellHasLeveledRitualTag(spell.right)) continue;
      accesses.push({
        tag: "spellbookRitual",
        spell: spell.right,
        spellcastingSourceUnitId: source.sourceUnitId,
        featureUnitId: feature.right.id,
      });
    }
  }
  return Either.right(accesses);
}

export function characterBuildHasSpellbookSpell(input: {
  readonly build: CharacterBuild;
  readonly spellId: UnitRecord["id"];
}): boolean {
  return (
    input.build.spellcasting?.sources.some((source) =>
      source.spellbook.some((spellId) => spellId === input.spellId),
    ) ?? false
  );
}

export function completeShortRest(
  input: CharacterSheetShortRestInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Short Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const pactRecovered = recoverPactSlots(input.sheet);
  const hitDiceSpent = spendHitDice({
    sheet: pactRecovered,
    unitLibrary: input.unitLibrary,
    spendHitDice: input.spendHitDice,
  });
  if (Either.isLeft(hitDiceSpent)) return Either.left(hitDiceSpent.left);
  if (input.arcaneRecovery === undefined)
    return Either.right(hitDiceSpent.right);
  return applyArcaneRecovery({
    sheet: hitDiceSpent.right,
    unitLibrary: input.unitLibrary,
    refundSpellSlots: input.arcaneRecovery.refundSpellSlots,
  });
}

export function completeLongRest(
  input: CharacterSheetLongRestInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Long Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const hitPoints = characterSheetHitPoints({
    currentHp: input.sheet.maximumHp,
    tempHp: Hp(0),
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  if (isCharacterSheetWithSpellSlots(input.sheet)) {
    const build = characterSheetLongRestBuild(input, input.sheet.build);
    if (Either.isLeft(build)) return Either.left(build.left);
    return Either.right({
      ...input.sheet,
      build: build.right,
      hitPoints: hitPoints.right,
      spentHitDice: [],
      restFeatureUses: [],
      resourceExpenditures: [],
      spellSlotExpenditures: input.sheet.spellSlotExpenditures.map(
        (expenditure) => ({
          ...expenditure,
          expended: resourceCount(0),
        }),
      ),
      pactSlotExpenditure:
        input.sheet.pactSlotExpenditure === undefined
          ? undefined
          : { ...input.sheet.pactSlotExpenditure, expended: resourceCount(0) },
    });
  }
  const build = characterSheetLongRestBuild(input, input.sheet.build);
  if (Either.isLeft(build)) return Either.left(build.left);
  return Either.right({
    ...input.sheet,
    build: build.right,
    hitPoints: hitPoints.right,
    spentHitDice: [],
    restFeatureUses: [],
    resourceExpenditures: [],
  });
}

export function completeMagicalCunningRite(
  input: CharacterSheetMagicalCunningInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (
    !("pactSlotExpenditure" in input.sheet) ||
    input.sheet.pactSlotExpenditure === undefined
  ) {
    return characterSheetIssue("Magical Cunning requires Pact Slot state.");
  }
  const profile = pactSlotRecoveryProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG,
    )
  ) {
    return characterSheetIssue(
      "Magical Cunning cannot be used again until a Long Rest.",
    );
  }
  const pactSlots = input.sheet.pactSlotExpenditure;
  if (pactSlots.expended < resourceCount(1)) {
    return characterSheetIssue(
      "Magical Cunning must recover expended Pact Slots.",
    );
  }
  const recovered = magicalCunningRecoveredPactSlots({
    pactSlots,
    profile: profile.right,
  });
  return Either.right({
    ...input.sheet,
    pactSlotExpenditure: {
      ...pactSlots,
      expended: resourceCount(Math.max(0, pactSlots.expended - recovered)),
    },
    restFeatureUses: [
      ...input.sheet.restFeatureUses,
      {
        tag: MAGICAL_CUNNING_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
  });
}

function characterSheetLongRestBuild<TBuild extends CharacterBuild>(
  input: CharacterSheetLongRestInput,
  build: TBuild,
): Either.Either<TBuild, CharacterSheetIssue> {
  if (input.weaponMasteryReselections === undefined) {
    return Either.right(build);
  }
  return characterBuildWithWeaponMasteryReselections({
    build,
    unitLibrary: input.unitLibrary,
    reselections: input.weaponMasteryReselections,
  });
}

function characterBuildWithWeaponMasteryReselections<
  TBuild extends CharacterBuild,
>(input: {
  readonly build: TBuild;
  readonly unitLibrary: UnitCatalog;
  readonly reselections: ReadonlyNonEmptyArray<CharacterSheetWeaponMasteryReselection>;
}): Either.Either<TBuild, CharacterSheetIssue> {
  if (input.reselections.length === 0) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection input must be nonempty.",
    );
  }
  const ownedFeatureUnitIds = new Set(
    characterBuildFeatureUnitIds(input.build, input.unitLibrary),
  );
  const reselectedWeaponUnitIdsByFeature = new Map<
    UnitRecord["id"],
    readonly UnitRecord["id"][]
  >();

  for (const reselection of input.reselections) {
    if (reselectedWeaponUnitIdsByFeature.has(reselection.featureUnitId)) {
      return characterSheetIssue(
        "Weapon Mastery Long Rest reselection must not duplicate feature sources.",
      );
    }
    if (!ownedFeatureUnitIds.has(reselection.featureUnitId)) {
      return characterSheetIssue(
        "Weapon Mastery Long Rest reselection requires the Character Build to own the feature.",
      );
    }
    const selectedWeaponUnitIds = selectedWeaponMasteryUnitIdsForLongRest({
      build: input.build,
      unitLibrary: input.unitLibrary,
      reselection,
    });
    if (Either.isLeft(selectedWeaponUnitIds)) {
      return Either.left(selectedWeaponUnitIds.left);
    }
    reselectedWeaponUnitIdsByFeature.set(
      reselection.featureUnitId,
      selectedWeaponUnitIds.right,
    );
  }

  return Either.right({
    ...input.build,
    features: characterBuildFeaturesWithWeaponMasteryReselections(
      input.build.features,
      reselectedWeaponUnitIdsByFeature,
    ),
  });
}

function selectedWeaponMasteryUnitIdsForLongRest(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly reselection: CharacterSheetWeaponMasteryReselection;
}): Either.Either<readonly UnitRecord["id"][], CharacterSheetIssue> {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: input.reselection.featureUnitId,
    unitLibrary: input.unitLibrary,
  });
  if (profile === undefined) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection requires a Weapon Mastery class-feature Unit.",
    );
  }
  if (profile.longRestChangeCount < 1) {
    return characterSheetIssue(
      "Weapon Mastery class-feature Unit does not support Long Rest reselection.",
    );
  }

  const currentWeaponUnitIds = selectedWeaponMasteryUnitIds(
    input.build,
    input.reselection.featureUnitId,
  );
  if (
    currentWeaponUnitIds.length !== profile.choiceCount ||
    new Set(currentWeaponUnitIds).size !== currentWeaponUnitIds.length
  ) {
    return characterSheetIssue(
      "Existing Weapon Mastery selections must match the feature choice count.",
    );
  }

  const selectedWeaponUnitIds = input.reselection.selectedWeaponUnitIds;
  if (selectedWeaponUnitIds.length !== profile.choiceCount) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must match the feature choice count.",
    );
  }
  if (new Set(selectedWeaponUnitIds).size !== selectedWeaponUnitIds.length) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must not duplicate weapon choices.",
    );
  }

  const eligibleWeaponUnitIds = new Set(
    profile.eligibleWeapons.map((weapon) => weapon.id),
  );
  if (
    selectedWeaponUnitIds.some((unitId) => !eligibleWeaponUnitIds.has(unitId))
  ) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must choose eligible proficient weapons.",
    );
  }

  const currentWeaponUnitIdSet = new Set(currentWeaponUnitIds);
  const changedChoiceCount = selectedWeaponUnitIds.filter(
    (unitId) => !currentWeaponUnitIdSet.has(unitId),
  ).length;
  if (changedChoiceCount > profile.longRestChangeCount) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection changes too many weapon choices.",
    );
  }

  return Either.right([...selectedWeaponUnitIds]);
}

function selectedWeaponMasteryUnitIds(
  build: CharacterBuild,
  featureUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.unitId]
      : [],
  );
}

function characterBuildFeaturesWithWeaponMasteryReselections(
  features: readonly CharacterBuildFeature[],
  selectedWeaponUnitIdsByFeature: ReadonlyMap<
    UnitRecord["id"],
    readonly UnitRecord["id"][]
  >,
): readonly CharacterBuildFeature[] {
  const insertedFeatureUnitIds = new Set<UnitRecord["id"]>();
  const nextFeatures: CharacterBuildFeature[] = [];

  for (const feature of features) {
    const selectedWeaponUnitIds =
      feature.kind === "selectedClassChoice"
        ? selectedWeaponUnitIdsByFeature.get(feature.selectedFromUnitId)
        : undefined;
    if (selectedWeaponUnitIds === undefined) {
      nextFeatures.push(feature);
      continue;
    }

    if (!insertedFeatureUnitIds.has(feature.selectedFromUnitId)) {
      nextFeatures.push(
        ...selectedWeaponUnitIds.map((unitId) => ({
          kind: "selectedClassChoice" as const,
          unitId,
          selectedFromUnitId: feature.selectedFromUnitId,
        })),
      );
      insertedFeatureUnitIds.add(feature.selectedFromUnitId);
    }
  }

  for (const [
    featureUnitId,
    selectedWeaponUnitIds,
  ] of selectedWeaponUnitIdsByFeature) {
    if (insertedFeatureUnitIds.has(featureUnitId)) continue;
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

export function applyLayOnHands(
  input: CharacterSheetLayOnHandsInput,
): Either.Either<CharacterSheetLayOnHandsResult, CharacterSheetIssue> {
  const spend = layOnHandsSpend(input);
  if (Either.isLeft(spend)) return Either.left(spend.left);

  const sourceAfterSpend = spendCharacterSheetResource({
    sheet: input.source,
    unitLibrary: input.unitLibrary,
    amount: spend.right,
  });
  if (Either.isLeft(sourceAfterSpend))
    return Either.left(sourceAfterSpend.left);

  const sourceIsTarget = input.source.characterId === input.target.characterId;
  const targetBase = sourceIsTarget ? sourceAfterSpend.right : input.target;
  const targetAfterHealing = applyLayOnHandsTargetEffects({
    sheet: targetBase,
    restoreHp: input.restoreHp,
    removePoisoned: input.removePoisoned,
  });
  if (Either.isLeft(targetAfterHealing)) {
    return Either.left(targetAfterHealing.left);
  }

  return Either.right(
    sourceIsTarget
      ? {
          source: targetAfterHealing.right,
          target: targetAfterHealing.right,
        }
      : {
          source: sourceAfterSpend.right,
          target: targetAfterHealing.right,
        },
  );
}

export function characterSheetArmorClassState(
  input: CharacterSheetArmorClassStateInput,
): Either.Either<ArmorClassState, CharacterSheetIssue> {
  const { build, unitLibrary } = input;
  const loadout = build.equipment.loadout;
  const defaultState = defaultArmorClassState();
  const armorTraining = characterBuildArmorTraining(build, unitLibrary);
  if (Either.isLeft(armorTraining)) {
    return characterSheetIssue(
      armorTraining.left.map((issue) => issue.message).join("; "),
    );
  }

  const armor =
    loadout.armor == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(loadout.armor).unitId,
        );
  if (armor !== undefined && Either.isLeft(armor)) {
    return Either.left(armor.left);
  }

  const shield =
    loadout.shield == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(loadout.shield).unitId,
        );
  if (shield !== undefined && Either.isLeft(shield)) {
    return Either.left(shield.left);
  }

  const base =
    armor?.right.kind === "armor"
      ? Either.right(armorBaseSource(armor.right))
      : selectedUnarmoredBaseSource(input, {
          wearingArmor: false,
          wieldingShield: shield?.right.kind === "shield",
        });
  if (Either.isLeft(base)) return Either.left(base.left);

  const bonuses: ArmorClassState["bonuses"][number][] = [];
  if (shield?.right.kind === "shield") {
    bonuses.push({
      kind: "shield",
      bonus: armorClassDelta(shield.right.armorClassProjection.bonus),
      handUse: shield.right.armorClassProjection.handUse,
      trainingRequired: shield.right.armorClassProjection.trainingRequired,
      sourceUnitId: shield.right.id,
    });
  }

  return Either.right({
    ...defaultState,
    abilityModifiers: characterSheetAbilityModifiers(build),
    base: base.right,
    bonuses,
    armorTraining: new Set(armorTraining.right),
    leftHandUse:
      shield?.right.kind === "shield"
        ? "shield"
        : loadout.offHandWeapon == null
          ? "free"
          : "offWeapon",
    rightHandUse: loadout.weapon == null ? "free" : "mainWeapon",
  });
}

export function characterSheetArmorClass(
  input: CharacterSheetArmorClassStateInput,
): Either.Either<ReturnType<typeof currentArmorClass>, CharacterSheetIssue> {
  const state = characterSheetArmorClassState(input);
  return Either.isLeft(state)
    ? Either.left(state.left)
    : Either.right(currentArmorClass(state.right));
}

export function timePassed(
  input: CharacterSheetTimePassedInput,
): CharacterSheetElapsedTimeResult {
  // Future ASSUMPTIONS.md work: out-of-battle elapsed rounds may imply
  // turn-boundary Death Saving Throws, but this operation currently only
  // handles calendar-time Stable recovery.
  const totalTicks = elapsedTimeTicksFromTimeSpanDuration(input.duration);
  if (Either.isLeft(totalTicks)) {
    return invalidElapsedTimeResult(
      input.sheet,
      `Invalid elapsed-time duration: ${totalTicks.left.kind}.`,
    );
  }
  const consumed = passStableRecoveryTime({
    sheet: input.sheet,
    ticks: totalTicks.right,
    fills: input.fills,
  });
  if (consumed.tag !== "resolved") return consumed;
  return {
    tag: "resolved",
    sheet: consumed.sheet,
    elapsedTicks: consumed.elapsedTicks,
  };
}

type CharacterSheetArmorClassBaseCandidate = {
  readonly choice: CharacterSheetArmorClassBaseChoice;
  readonly base: ArmorClassBaseSource;
};
type CharacterSheetArmorClassEquipmentState = {
  readonly wearingArmor: boolean;
  readonly wieldingShield: boolean;
};
type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
>;
type ModifyAcSetBaseGrant = Extract<
  Extract<
    ClassFeatureComponentMechanics,
    { readonly family: "passive" }
  >["grants"][number],
  { readonly kind: "modify_ac_set_base" }
>;
type RestSpellSlotRecoveryMechanics = Extract<
  CharacterSheetClassFeatureRecord["mechanics"],
  { readonly family: "rest_spell_slot_recovery" }
>;
type CharacterSheetRestSpellSlotRecoveryFeature =
  CharacterSheetClassFeatureRecord & {
    readonly mechanics: RestSpellSlotRecoveryMechanics;
  };
type CharacterSheetRestSpellSlotRecoveryProfile = {
  readonly feature: CharacterSheetRestSpellSlotRecoveryFeature;
  readonly classUnitId: UnitRecord["id"];
};
type PactSlotRecoveryMechanics = Extract<
  CharacterSheetClassFeatureRecord["mechanics"],
  { readonly family: "pact_slot_recovery" }
>;
type CharacterSheetPactSlotRecoveryFeature =
  CharacterSheetClassFeatureRecord & {
    readonly mechanics: PactSlotRecoveryMechanics;
  };
type CharacterSheetPactSlotRecoveryProfile = {
  readonly feature: CharacterSheetPactSlotRecoveryFeature;
  readonly classUnitId: UnitRecord["id"];
};
type SpellbookRitualAccessMechanics = Extract<
  CharacterSheetClassFeatureRecord["mechanics"],
  { readonly family: "spellbook_ritual_access" }
>;
type CharacterSheetSpellbookRitualFeature = CharacterSheetClassFeatureRecord & {
  readonly mechanics: SpellbookRitualAccessMechanics;
};

function selectedUnarmoredBaseSource(
  input: CharacterSheetArmorClassStateInput,
  equipment: CharacterSheetArmorClassEquipmentState,
): Either.Either<ArmorClassBaseSource, CharacterSheetIssue> {
  const defaultBase = {
    choice: { kind: "default_unarmored" },
    base: defaultArmorClassState().base,
  } as const satisfies CharacterSheetArmorClassBaseCandidate;
  const classFeatureCandidateResult =
    characterSheetClassFeatureArmorClassBaseCandidates(
      input.build,
      input.unitLibrary,
      equipment,
    );
  if (Either.isLeft(classFeatureCandidateResult)) {
    return Either.left(classFeatureCandidateResult.left);
  }
  const candidates = [defaultBase, ...classFeatureCandidateResult.right];
  const baseChoice = input.baseChoice;
  if (baseChoice !== undefined) {
    const selected = candidates.find((candidate) =>
      armorClassChoiceEquals(candidate.choice, baseChoice),
    );
    return selected === undefined
      ? characterSheetIssue(
          "Selected Armor Class base formula is not available.",
        )
      : Either.right(selected.base);
  }
  const classFeatureCandidates = candidates.filter(
    (candidate) => candidate.choice.kind === "class_feature",
  );
  if (classFeatureCandidates.length === 0)
    return Either.right(defaultBase.base);
  if (classFeatureCandidates.length === 1) {
    return Either.right(classFeatureCandidates[0].base);
  }
  return characterSheetIssue(
    "Multiple class-feature Armor Class base formulas are available; choose one.",
  );
}

function characterSheetClassFeatureArmorClassBaseCandidates(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  equipment: CharacterSheetArmorClassEquipmentState,
): Either.Either<
  readonly CharacterSheetArmorClassBaseCandidate[],
  CharacterSheetIssue
> {
  const candidates: CharacterSheetArmorClassBaseCandidate[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    candidates.push(...armorClassBaseCandidatesForUnit(unit.right, equipment));
  }
  return Either.right(candidates);
}

function armorClassBaseCandidatesForUnit(
  unit: UnitRecord,
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (unit.kind !== "class_feature") return [];
  return armorClassBaseCandidatesForClassFeatureMechanics(
    unit.id,
    unit.mechanics,
    equipment,
  );
}

function armorClassBaseCandidatesForClassFeatureMechanics(
  unitId: UnitRecord["id"],
  mechanics: CharacterSheetClassFeatureRecord["mechanics"],
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (mechanics.family === "composite") {
    return mechanics.parts.flatMap((part) =>
      armorClassBaseCandidatesForClassFeatureComponent(unitId, part, equipment),
    );
  }
  if (mechanics.family !== "passive") return [];
  return armorClassBaseCandidatesForClassFeatureComponent(
    unitId,
    mechanics,
    equipment,
  );
}

function armorClassBaseCandidatesForClassFeatureComponent(
  unitId: UnitRecord["id"],
  mechanics: ClassFeatureComponentMechanics,
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (mechanics.family !== "passive") return [];
  if (!equipmentPredicateMatches(mechanics.condition, equipment)) {
    return [];
  }
  return mechanics.grants.flatMap((grant) => {
    if (grant.kind !== "modify_ac_set_base") return [];
    const base = armorClassBaseSourceForFormula(unitId, grant.formula);
    return base === undefined
      ? []
      : [{ choice: { kind: "class_feature", unitId }, base }];
  });
}

function equipmentPredicateMatches(
  predicate: EquipmentPredicate | undefined,
  equipment: CharacterSheetArmorClassEquipmentState,
): boolean {
  if (predicate === undefined || predicate.kind === "always") return true;
  if (predicate.kind === "unarmored") return !equipment.wearingArmor;
  if (predicate.kind === "not_wielding_shield")
    return !equipment.wieldingShield;
  if (predicate.kind === "all_of") {
    return predicate.predicates.every((part) =>
      equipmentPredicateMatches(part, equipment),
    );
  }
  if (predicate.kind === "holding_item") return false;
  if (predicate.kind === "peering_through_item") return false;
  if (predicate.kind === "wearing_item") return false;
  if (predicate.kind === "unarmed_or_monk_weapons_only") return false;
  if (predicate.kind === "wearing_armor") return false;
  if (predicate.kind === "not_wearing_armor") return !equipment.wearingArmor;
  if (predicate.kind === "wielding_weapon") return false;
  const exhaustive: never = predicate;
  return exhaustive;
}

function armorClassBaseSourceForFormula(
  sourceUnitId: UnitRecord["id"],
  formula: ModifyAcSetBaseGrant["formula"],
): ArmorClassBaseSource | undefined {
  if (formula.kind === "base_plus_dex") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex"],
      source: "spell_base_plus_ability",
      sourceUnitId,
    };
  }
  if (formula.kind === "base_plus_dex_con") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "con"],
      source: "unarmored_defense",
      sourceUnitId,
    };
  }
  if (formula.kind === "base_plus_dex_wis") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "wis"],
      source: "unarmored_defense",
      sourceUnitId,
    };
  }
  return undefined;
}

function armorBaseSource(
  armor: Extract<UnitRecord, { readonly kind: "armor" }>,
): ArmorClassBaseSource {
  return {
    kind: "armor",
    formula: armor.acFormula,
    category: armor.category,
  };
}

function characterSheetAbilityModifiers(
  build: Pick<CharacterBuild, "abilityScores">,
): ArmorClassState["abilityModifiers"] {
  return {
    ...zeroAbilityModifiers(),
    str: abilityModifier(abilityScoreToMod(build.abilityScores.str)),
    dex: abilityModifier(abilityScoreToMod(build.abilityScores.dex)),
    con: abilityModifier(abilityScoreToMod(build.abilityScores.con)),
    int: abilityModifier(abilityScoreToMod(build.abilityScores.int)),
    wis: abilityModifier(abilityScoreToMod(build.abilityScores.wis)),
    cha: abilityModifier(abilityScoreToMod(build.abilityScores.cha)),
  };
}

function armorClassChoiceEquals(
  left: CharacterSheetArmorClassBaseChoice,
  right: CharacterSheetArmorClassBaseChoice,
): boolean {
  return left.kind === "default_unarmored"
    ? right.kind === "default_unarmored"
    : right.kind === "class_feature" && left.unitId === right.unitId;
}

function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Either.Either<UnitRecord, CharacterSheetIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : characterSheetIssue(`Unknown Unit id: ${unitId}`);
}

function characterSheetBookOfShadowsRitualInvocation(
  input: CharacterSheetSpellInvocationInput,
): Either.Either<
  CharacterSheetBookOfShadowsRitualInvocation,
  CharacterSheetIssue
> | null {
  if (!isSpellcastingBuild(input.sheet.build)) {
    return null;
  }
  const source = input.sheet.build.spellcasting.sources.find((candidate) =>
    candidate.bookOfShadows?.ritualSpells.some(
      (spellId) => spellId === input.spellId,
    ),
  );
  if (source === undefined) {
    return null;
  }
  if (input.sheet.bookOfShadowsPresence?.tag !== "onPerson") {
    return characterSheetIssue(
      "Book of Shadows Ritual requires the book on your person.",
    );
  }
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  if (!isSpellRecord(spell.right)) {
    return characterSheetIssue("Ritual spell invocation requires a Spell.");
  }
  if (!spellHasRitualTag(spell.right)) {
    return characterSheetIssue(
      "Ritual spell invocation requires a ritual-tagged Spell Definition.",
    );
  }
  return Either.right({
    tag: "bookOfShadowsRitual",
    spellId: input.spellId,
    spellLevel: spell.right.mechanics.level,
    spellcastingSourceUnitId: source.sourceUnitId,
    spellSlotCost: { kind: "none" },
    preparationRequirement: "prepared",
    requiredSpellAccess: "bookOfShadows",
    additionalCastingTimeMinutes: RITUAL_ADDITIONAL_CASTING_TIME_MINUTES,
    requiresBookOfShadowsOnPerson: true,
  });
}

function characterSheetSpellbookRitualInvocation(
  input: CharacterSheetSpellInvocationInput,
): Either.Either<CharacterSheetSpellbookRitualInvocation, CharacterSheetIssue> {
  const access = characterSheetSpellbookRitualAccess({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    spellId: input.spellId,
  });
  if (Either.isLeft(access)) return Either.left(access.left);
  return Either.right({
    tag: "spellbookRitual",
    spellId: access.right.spell.id,
    spellLevel: access.right.spell.mechanics.level,
    spellcastingSourceUnitId: access.right.spellcastingSourceUnitId,
    featureUnitId: access.right.featureUnitId,
    spellSlotCost: { kind: "none" },
    preparationRequirement: "not_required",
    requiredSpellAccess: "spellbook",
    additionalCastingTimeMinutes: RITUAL_ADDITIONAL_CASTING_TIME_MINUTES,
    requiresReadingSpellbook: true,
  });
}

function characterSheetSpellbookRitualAccessForSpell(
  input: CharacterSheetSpellbookRitualAccessInput,
  messages: { readonly missingSpellbookMessage: string },
): Either.Either<CharacterSheetSpellbookRitualAccess, CharacterSheetIssue> {
  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Ritual spell invocation requires spellcasting Spell Access.",
    );
  }
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  if (!isSpellRecord(spell.right)) {
    return characterSheetIssue("Ritual spell invocation requires a Spell.");
  }
  if (!spellHasLeveledRitualTag(spell.right)) {
    return characterSheetIssue(
      "Ritual spell invocation requires a ritual-tagged Spell Definition.",
    );
  }
  const source = input.build.spellcasting.sources.find((candidate) =>
    candidate.spellbook.some((spellId) => spellId === input.spellId),
  );
  if (source === undefined) {
    return characterSheetIssue(messages.missingSpellbookMessage);
  }
  const sourceClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: source.sourceUnitId,
  });
  if (Either.isLeft(sourceClassName) || sourceClassName.right !== "wizard") {
    return characterSheetIssue(
      "Spellbook Ritual Access must be attached to the Wizard spellcasting source.",
    );
  }
  const feature = spellbookRitualAccessFeatureForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(feature)) return Either.left(feature.left);
  return Either.right({
    tag: "spellbookRitual",
    spell: spell.right,
    spellcastingSourceUnitId: source.sourceUnitId,
    featureUnitId: feature.right.id,
  });
}

function spellbookRitualAccessFeatureForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheetSpellbookRitualFeature, CharacterSheetIssue> {
  const feature = optionalSpellbookRitualAccessFeatureForBuild(
    build,
    unitLibrary,
  );
  if (Either.isLeft(feature)) return Either.left(feature.left);
  if (feature.right === null) {
    return characterSheetIssue(
      "Spellbook ritual invocation requires a spellbook Ritual Access feature.",
    );
  }
  return Either.right(feature.right);
}

function optionalSpellbookRitualAccessFeatureForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterSheetSpellbookRitualFeature | null,
  CharacterSheetIssue
> {
  const features: CharacterSheetSpellbookRitualFeature[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = unitLibrary.getUnit(unitId);
    if (Option.isNone(unit)) {
      continue;
    }
    if (isSpellbookRitualAccessFeature(unit.value)) {
      features.push(unit.value);
    }
  }
  if (features.length === 0) {
    return Either.right(null);
  }
  if (features.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one spellbook Ritual Access feature.",
    );
  }
  const feature = features[0];
  if (feature === undefined) {
    return Either.right(null);
  }
  return Either.right(feature);
}

function isSpellRecord(unit: UnitRecord): unit is SpellRecord {
  return unit.kind === "spell";
}

function spellHasRitualTag(spell: SpellRecord): boolean {
  return "ritual" in spell.mechanics.castingTime
    ? spell.mechanics.castingTime.ritual === true
    : false;
}

function spellHasLeveledRitualTag(spell: SpellRecord): boolean {
  return spell.mechanics.level >= 1 && spellHasRitualTag(spell);
}

function requireSpellSlotExpenditure(
  expenditures: readonly CharacterSpellSlotExpenditure[],
  spellLevel: SpellSlotLevel,
): CharacterSpellSlotExpenditure {
  const expenditure = expenditures.find(
    (candidate) => candidate.spellLevel === spellLevel,
  );
  if (expenditure !== undefined) return expenditure;
  throw new Error(
    `Available spellcasting Character Sheet is missing Spell Slot expenditure for level ${spellLevel}.`,
  );
}

function spellSlotExpendituresFromInput(
  input: Pick<CharacterSheetInput, "spellSlots"> & {
    readonly build: SpellcastingCharacterBuild;
  },
): Either.Either<
  readonly CharacterSpellSlotExpenditure[],
  CharacterSheetIssue
> {
  const runtimeSlots =
    input.spellSlots ??
    characterBuildSpellcastingSlotCapacity(input.build).map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: resourceCount(0),
    }));
  const buildSlots = characterBuildSpellcastingSlotCapacity(input.build);
  if (runtimeSlots.length !== buildSlots.length) {
    return characterSheetIssue(
      "Spell Slot state must match build capacity exactly.",
    );
  }
  const runtimeLevels = new Set<number>();
  for (const runtimeSlot of runtimeSlots) {
    if (runtimeLevels.has(runtimeSlot.spellLevel)) {
      return characterSheetIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    runtimeLevels.add(runtimeSlot.spellLevel);
  }
  const expenditures: CharacterSpellSlotExpenditure[] = [];
  for (const buildSlot of buildSlots) {
    const runtimeSlot = runtimeSlots.find(
      (candidate) =>
        candidate.spellLevel === spellSlotLevel(buildSlot.spellLevel),
    );
    if (
      runtimeSlot === undefined ||
      runtimeSlot.count !== resourceCount(buildSlot.count) ||
      !Number.isInteger(runtimeSlot.expended) ||
      runtimeSlot.expended < 0 ||
      runtimeSlot.expended > buildSlot.count
    ) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${buildSlot.spellLevel}.`,
      );
    }
    expenditures.push({
      spellLevel: spellSlotLevel(buildSlot.spellLevel),
      expended: resourceCount(runtimeSlot.expended),
    });
  }
  return Either.right(expenditures);
}

function pactSlotExpenditureFromInput(
  input: Pick<CharacterSheetInput, "pactSlots"> & {
    readonly build: SpellcastingCharacterBuild;
  },
): Either.Either<
  CharacterPactSlotExpenditure | undefined,
  CharacterSheetIssue
> {
  const pactMagic = characterBuildPactSlotCapacity(input.build);
  if (pactMagic === undefined) {
    return input.pactSlots === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Pact Slot state must match Pact Magic build capacity.",
        );
  }
  const pactSlots =
    input.pactSlots ??
    ({
      slotLevel: spellSlotLevel(pactMagic.slotLevel),
      count: resourceCount(pactMagic.count),
      expended: resourceCount(0),
    } satisfies CharacterSheetPactSlotState);
  if (
    pactSlots.slotLevel !== spellSlotLevel(pactMagic.slotLevel) ||
    pactSlots.count !== resourceCount(pactMagic.count) ||
    !Number.isInteger(pactSlots.expended) ||
    pactSlots.expended < 0 ||
    pactSlots.expended > pactMagic.count
  ) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return Either.right({
    slotLevel: spellSlotLevel(pactMagic.slotLevel),
    count: resourceCount(pactMagic.count),
    expended: resourceCount(pactSlots.expended),
  });
}

function spentHitDiceFromInput(
  input: Pick<CharacterSheetInput, "build" | "spentHitDice" | "unitLibrary">,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  const capacity = characterBuildHitDice(input.build, input.unitLibrary);
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  const spentHitDice = input.spentHitDice ?? [];
  const spentByClass = new Map<UnitRecord["id"], ResourceCount>();
  for (const spent of spentHitDice) {
    if (spentByClass.has(spent.classUnitId)) {
      return characterSheetIssue("Spent Hit Dice state must not duplicate.");
    }
    spentByClass.set(spent.classUnitId, spent.spent);
  }
  const capacityByClass = new Map(
    capacity.right.map((pool) => [pool.classUnitId, pool]),
  );
  const result = [];
  for (const spent of spentHitDice) {
    const pool = capacityByClass.get(spent.classUnitId);
    if (pool === undefined) {
      return characterSheetIssue(
        "Spent Hit Dice state must match build Hit Dice exactly.",
      );
    }
    if (
      !Number.isInteger(spent.spent) ||
      spent.spent < 0 ||
      spent.spent > pool.total
    ) {
      return characterSheetIssue(
        "Spent Hit Dice state cannot exceed build Hit Dice.",
      );
    }
    if (spent.spent > 0) {
      result.push({
        classUnitId: spent.classUnitId,
        spent: resourceCount(spent.spent),
      });
    }
  }
  return Either.right(result);
}

function restFeatureUsesFromInput(
  input: Pick<CharacterSheetInput, "build" | "restFeatureUses" | "unitLibrary">,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  const uses = input.restFeatureUses ?? [];
  const usedFeatureTags = new Set<string>();
  for (const use of uses) {
    if (use.usedSinceLongRest !== true) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    if (usedFeatureTags.has(use.tag)) {
      return characterSheetIssue("Rest feature use state must not duplicate.");
    }
    const featureUseState = restFeatureUseStateMatchesBuild(input, use);
    if (Either.isLeft(featureUseState))
      return Either.left(featureUseState.left);
    usedFeatureTags.add(use.tag);
  }
  return Either.right([...uses]);
}

function restFeatureUseStateMatchesBuild(
  input: Pick<CharacterSheetInput, "build" | "unitLibrary">,
  use: CharacterSheetRestFeatureUse,
): Either.Either<void, CharacterSheetIssue> {
  if (use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        restSpellSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        pactSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Magical Cunning rest feature use requires the Warlock Magical Cunning feature.",
      );
    }
    return Either.right(undefined);
  }
  return characterSheetIssue("Expected supported rest feature use state.");
}

function conditionsFromInput(
  conditions: readonly CharacterSheetCondition[],
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  const active = new Set<CharacterSheetCondition>();
  for (const condition of conditions) {
    if (!CHARACTER_SHEET_CONDITIONS.some((allowed) => allowed === condition)) {
      return characterSheetIssue(
        "Character Sheet condition state must contain supported non-Unconscious conditions.",
      );
    }
    if (active.has(condition)) {
      return characterSheetIssue(
        "Character Sheet condition state must not duplicate.",
      );
    }
    active.add(condition);
  }
  return Either.right([...conditions]);
}

function resourceExpendituresFromInput(
  input: Pick<
    CharacterSheetInput,
    "build" | "resourceExpenditures" | "unitLibrary"
  >,
): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetIssue
> {
  const expenditures = input.resourceExpenditures ?? [];
  const layOnHandsResource = layOnHandsResourceForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(layOnHandsResource)) {
    return Either.left(layOnHandsResource.left);
  }
  const freeCastResources = classFeatureSpellFreeCastResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(freeCastResources)) {
    return Either.left(freeCastResources.left);
  }
  const seen = new Set<CharacterSheetResourceExpenditure["tag"]>();
  const result: CharacterSheetResourceExpenditure[] = [];
  for (const expenditure of expenditures) {
    if (seen.has(expenditure.tag)) {
      return characterSheetIssue(
        "Character Sheet resource expenditure state must not duplicate.",
      );
    }
    seen.add(expenditure.tag);
    const count = characterSheetResourceExpenditureCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      layOnHandsResource: layOnHandsResource.right,
      freeCastResources: freeCastResources.right,
      expenditureTag: expenditure.tag,
    });
    if (Either.isLeft(count)) return Either.left(count.left);
    if (
      !Number.isInteger(expenditure.expended) ||
      expenditure.expended < 0 ||
      expenditure.expended > count.right
    ) {
      return characterSheetIssue(
        "Character Sheet resource expenditure cannot exceed build resource capacity.",
      );
    }
    if (expenditure.expended > 0) {
      result.push({
        tag: expenditure.tag,
        expended: resourceCount(expenditure.expended),
      });
    }
  }
  return Either.right(result);
}

function characterSheetResourceExpenditureCapacity(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly layOnHandsResource: CharacterSheetLayOnHandsResource | null;
  readonly freeCastResources: readonly CharacterSheetClassFeatureSpellFreeCastResource[];
  readonly expenditureTag: CharacterSheetResourceExpenditure["tag"];
}): Either.Either<ResourceCount, CharacterSheetIssue> {
  if (input.expenditureTag === "layOnHandsHealingPool") {
    if (input.layOnHandsResource === null) {
      return characterSheetIssue(
        "Lay On Hands healing pool expenditure requires the Paladin Lay On Hands feature.",
      );
    }
    return characterSheetResourceCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      resource: input.layOnHandsResource,
    });
  }
  const freeCastResource = input.freeCastResources.find(
    (resource) => resource.tag === input.expenditureTag,
  );
  if (freeCastResource === undefined) {
    return characterSheetIssue(
      "Class feature spell free-cast expenditure requires the matching class feature.",
    );
  }
  return Either.right(freeCastResource.count);
}

function layOnHandsResourceForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheetLayOnHandsResource | null, CharacterSheetIssue> {
  for (const resource of characterBuildResources(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    const layOnHandsResource = layOnHandsHealingPoolResourceForUnit(unit.right);
    if (layOnHandsResource !== null) {
      return Either.right({
        unitId: resource.unitId,
        resource: layOnHandsResource,
      });
    }
  }
  return Either.right(null);
}

function layOnHandsHealingPoolResourceForUnit(
  unit: UnitRecord,
): ChargePoolResource | null {
  if (unit.kind !== "class_feature" || unit.className !== "paladin") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost?.kind !== "bonus_action" ||
    mechanics.resetCadence?.kind !== "long_rest" ||
    mechanics.resource?.kind !== "charge_pool" ||
    mechanics.resource.cap.kind !== "linear_per_level" ||
    mechanics.resource.cap.axis !== "class" ||
    mechanics.resource.cap.base !== 5 ||
    mechanics.resource.cap.perLevel !== 5 ||
    mechanics.resource.cap.startingAtLevel !== 1
  ) {
    return null;
  }
  const healsFromSpentPool = mechanics.phases.some(
    (phase) =>
      phase.kind === "direct" &&
      (phase.effects?.some(
        (effect) =>
          effect.kind === "heal_hp" &&
          effect.amount.kind === "resource_spent" &&
          effect.target === "target_creature",
      ) ??
        false),
  );
  return healsFromSpentPool ? mechanics.resource : null;
}

function classFeatureSpellFreeCastResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterSheetClassFeatureSpellFreeCastResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetClassFeatureSpellFreeCastResource[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    build,
    unitLibrary,
  )) {
    const unit = unitLibrary.getUnit(featureUnitId);
    if (Option.isNone(unit)) continue;
    const resource = classFeatureSpellFreeCastResourceForUnit(unit.value);
    if (resource !== null) {
      resources.push({ unitId: featureUnitId, ...resource });
    }
  }
  return Either.right(resources);
}

function classFeatureSpellFreeCastResourceForUnit(
  unit: UnitRecord,
): Pick<
  CharacterSheetClassFeatureSpellFreeCastResource,
  "tag" | "count"
> | null {
  const grants = supportedClassFeatureSpellFreeCastGrantsForUnit(unit);
  if (grants === null) {
    return null;
  }
  return {
    tag: grants.profile.resourceTag,
    count: resourceCount(grants.freeCastGrant.count),
  };
}

type CharacterSheetResourceCapacityInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly resource: CharacterBuildResource;
};

function characterSheetResourceCapacity(
  input: CharacterSheetResourceCapacityInput,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  const unit = getRequiredUnit(input.unitLibrary, input.resource.unitId);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  const cap = input.resource.resource.cap;
  if (cap.kind === "fixed") return Either.right(resourceCount(cap.uses));
  if (cap.kind === "linear_per_level") {
    if (cap.axis !== "class") {
      return characterSheetIssue(
        "Character Sheet resource level scaling must use class level.",
      );
    }
    if (unit.right.kind !== "class_feature") {
      return characterSheetIssue(
        "Class-level resource scaling requires a class feature Unit.",
      );
    }
    const level = classFeatureOwnerLevel(input, unit.right);
    if (Either.isLeft(level)) return Either.left(level.left);
    return Either.right(
      resourceCount(
        cap.base +
          Math.max(0, level.right - cap.startingAtLevel) * cap.perLevel,
      ),
    );
  }
  if (cap.kind === "proficiency_bonus") {
    return Either.right(
      resourceCount(
        proficiencyBonusForCharacterLevel(
          input.build.progression.advancements.length + 1,
        ),
      ),
    );
  }
  return characterSheetIssue(
    "Character Sheet resource capacity is not supported by this runtime.",
  );
}

function classFeatureOwnerLevel(
  input: Pick<CharacterSheetResourceCapacityInput, "build" | "unitLibrary">,
  feature: CharacterSheetClassFeatureRecord,
): Either.Either<number, CharacterSheetIssue> {
  for (const classId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = getRequiredUnit(input.unitLibrary, classId);
    if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
    if (
      classUnit.right.kind === "class" &&
      classUnit.right.className === feature.className
    ) {
      return Either.right(classLevelForUnit(input.build.progression, classId));
    }
  }
  return characterSheetIssue(
    "Class-feature resource requires the owning class in progression.",
  );
}

function proficiencyBonusForCharacterLevel(totalLevel: number): number {
  return 2 + Math.floor((totalLevel - 1) / 4);
}

function characterBuildHitDice(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterBuildHitDiePool[], CharacterSheetIssue> {
  const hitPoints = characterBuildHitPoints(build, unitLibrary);
  return Either.isLeft(hitPoints)
    ? characterSheetIssue(
        hitPoints.left.map((issue) => issue.message).join("; "),
      )
    : Either.right(hitPoints.right.hitDice);
}

function characterBuildPactSlotCapacity(
  build: Pick<CharacterBuild, "spellcasting">,
): CharacterBuildPactMagicSlotPool | undefined {
  return build.spellcasting?.slotPools.pactMagic;
}

function recoverPactSlots(sheet: CharacterSheet): CharacterSheet {
  if (
    !("pactSlotExpenditure" in sheet) ||
    sheet.pactSlotExpenditure === undefined
  ) {
    return sheet;
  }
  return {
    ...sheet,
    pactSlotExpenditure: {
      ...sheet.pactSlotExpenditure,
      expended: resourceCount(0),
    },
  };
}

function spendHitDice(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spendHitDice: readonly CharacterSheetHitDieSpend[] | undefined;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.spendHitDice === undefined) return Either.right(input.sheet);
  if (input.spendHitDice.length === 0) {
    return characterSheetIssue("Short Rest Hit Dice spending cannot be empty.");
  }
  const hitDice = characterSheetHitDice(input.sheet, input.unitLibrary);
  if (Either.isLeft(hitDice)) return Either.left(hitDice.left);
  const hitDiceByClass = new Map(
    hitDice.right.map((pool) => [pool.classUnitId, pool]),
  );
  const spentThisRest = new Map<UnitRecord["id"], ResourceCount>();
  let healingTotal = 0;
  const constitutionModifier = abilityScoreToMod(
    input.sheet.build.abilityScores.con,
  );
  for (const spend of input.spendHitDice) {
    const pool = hitDiceByClass.get(spend.classUnitId);
    if (pool === undefined) {
      return characterSheetIssue(
        "Short Rest Hit Dice spend must match build Hit Dice.",
      );
    }
    if (
      !Number.isInteger(Number(spend.roll)) ||
      spend.roll < 1 ||
      spend.roll > pool.dieSize
    ) {
      return characterSheetIssue(
        `Short Rest Hit Die roll must be within d${pool.dieSize}.`,
      );
    }
    healingTotal += Math.max(1, spend.roll + constitutionModifier);
    spentThisRest.set(
      spend.classUnitId,
      resourceCount((spentThisRest.get(spend.classUnitId) ?? 0) + 1),
    );
  }
  const nextSpentHitDice = input.sheet.spentHitDice.map((spent) => ({
    ...spent,
  }));
  for (const [classUnitId, spentCount] of spentThisRest.entries()) {
    const pool = hitDiceByClass.get(classUnitId);
    if (pool === undefined || pool.spent + spentCount > pool.total) {
      return characterSheetIssue(
        "Short Rest cannot spend more Hit Dice than remain.",
      );
    }
    const existingIndex = nextSpentHitDice.findIndex(
      (spent) => spent.classUnitId === classUnitId,
    );
    if (existingIndex === -1) {
      nextSpentHitDice.push({ classUnitId, spent: spentCount });
    } else {
      nextSpentHitDice[existingIndex] = {
        classUnitId,
        spent: resourceCount(
          nextSpentHitDice[existingIndex].spent + spentCount,
        ),
      };
    }
  }
  const currentHp = characterSheetCurrentHp(input.sheet);
  const healedHp = Hp(
    Math.min(input.sheet.maximumHp, currentHp + healingTotal),
  );
  const hitPoints = characterSheetHitPoints({
    currentHp: healedHp,
    tempHp: characterSheetTempHp(input.sheet),
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  return Either.right({
    ...input.sheet,
    hitPoints: hitPoints.right,
    spentHitDice: nextSpentHitDice,
  });
}

function layOnHandsSpend(
  input: Pick<CharacterSheetLayOnHandsInput, "restoreHp" | "removePoisoned">,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  if (!Number.isInteger(input.restoreHp) || input.restoreHp < 0) {
    return characterSheetIssue(
      "Lay On Hands HP restoration must be nonnegative.",
    );
  }
  const spend = resourceCount(
    input.restoreHp +
      (input.removePoisoned ? LAY_ON_HANDS_POISONED_REMOVAL_COST : 0),
  );
  return spend === 0
    ? characterSheetIssue("Lay On Hands must restore HP or remove Poisoned.")
    : Either.right(spend);
}

function spendCharacterSheetResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly amount: ResourceCount;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const resource = resources.right.find(
    (candidate) => candidate.tag === "layOnHandsHealingPool",
  );
  if (resource === undefined) {
    return characterSheetIssue(
      "Lay On Hands requires the Paladin Lay On Hands feature.",
    );
  }
  if (resource.expended + input.amount > resource.count) {
    return characterSheetIssue(
      "Lay On Hands cannot spend more healing pool than remains.",
    );
  }

  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) => expenditure.tag !== "layOnHandsHealingPool",
  );
  nextExpenditures.push({
    tag: "layOnHandsHealingPool",
    expended: resourceCount(resource.expended + input.amount),
  });
  return Either.right({
    ...input.sheet,
    resourceExpenditures: nextExpenditures,
  });
}

function applyLayOnHandsTargetEffects(input: {
  readonly sheet: CharacterSheet;
  readonly restoreHp: HpType;
  readonly removePoisoned: boolean;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.removePoisoned) {
    if (!input.sheet.conditions.some((condition) => condition === "poisoned")) {
      return characterSheetIssue(
        "Lay On Hands Poisoned removal requires a Poisoned target.",
      );
    }
  }
  const conditions = input.removePoisoned
    ? input.sheet.conditions.filter((condition) => condition !== "poisoned")
    : input.sheet.conditions;

  if (input.restoreHp === 0) {
    return Either.right({ ...input.sheet, conditions });
  }
  if (
    input.sheet.hitPoints.tag === "zero" &&
    input.sheet.hitPoints.lifecycle.tag === "dead"
  ) {
    return characterSheetIssue(
      "Lay On Hands cannot restore HP to a dead target.",
    );
  }
  const currentHp = characterSheetCurrentHp(input.sheet);
  if (currentHp + input.restoreHp > input.sheet.maximumHp) {
    return characterSheetIssue(
      "Lay On Hands HP restoration cannot exceed the target's missing HP.",
    );
  }
  const hitPoints = characterSheetHitPoints({
    currentHp: Hp(currentHp + input.restoreHp),
    tempHp: characterSheetTempHp(input.sheet),
  });
  return Either.isLeft(hitPoints)
    ? Either.left(hitPoints.left)
    : Either.right({
        ...input.sheet,
        hitPoints: hitPoints.right,
        conditions,
      });
}

function applyArcaneRecovery(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Arcane Recovery requires ordinary Spell Slot state.",
    );
  }
  const profile = restSpellSlotRecoveryProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG,
    )
  ) {
    return characterSheetIssue(
      "Arcane Recovery cannot be used again until a Long Rest.",
    );
  }
  const sheet = input.sheet;
  const refund = arcaneRecoverySpellSlotRefund({
    sheet,
    profile: profile.right,
    refundSpellSlots: input.refundSpellSlots,
  });
  if (Either.isLeft(refund)) return Either.left(refund.left);
  return Either.right({
    ...sheet,
    spellSlotExpenditures: refund.right,
    restFeatureUses: [
      ...sheet.restFeatureUses,
      {
        tag: ARCANE_RECOVERY_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
  });
}

function arcaneRecoverySpellSlotRefund(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly profile: CharacterSheetRestSpellSlotRecoveryProfile;
  readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
}): Either.Either<
  readonly CharacterSpellSlotExpenditure[],
  CharacterSheetIssue
> {
  if (input.refundSpellSlots.length === 0) {
    return characterSheetIssue("Arcane Recovery must recover expended slots.");
  }
  const classLevel = classLevelForUnit(
    input.sheet.build.progression,
    input.profile.classUnitId,
  );
  const maximumCombinedSlotLevels = Math.ceil(classLevel / 2);
  const maximumSlotLevelExclusive =
    input.profile.feature.mechanics.recoveredSlotLevelCap
      .maximumSlotLevelExclusive;
  let combinedSlotLevels = 0;
  const refundByLevel = new Map<SpellSlotLevel, ResourceCount>();
  for (const refund of input.refundSpellSlots) {
    if (refund.spellLevel >= spellSlotLevel(maximumSlotLevelExclusive)) {
      return characterSheetIssue(
        "Arcane Recovery cannot recover level 6 or higher Spell Slots.",
      );
    }
    if (!Number.isInteger(refund.count) || refund.count < 1) {
      return characterSheetIssue(
        "Arcane Recovery refund counts must be positive.",
      );
    }
    combinedSlotLevels += refund.spellLevel * refund.count;
    refundByLevel.set(
      refund.spellLevel,
      resourceCount((refundByLevel.get(refund.spellLevel) ?? 0) + refund.count),
    );
  }
  if (combinedSlotLevels > maximumCombinedSlotLevels) {
    return characterSheetIssue(
      "Arcane Recovery refund exceeds half Wizard level rounded up.",
    );
  }
  const updated = input.sheet.spellSlotExpenditures.map((expenditure) => {
    const refundCount = refundByLevel.get(expenditure.spellLevel) ?? 0;
    return {
      ...expenditure,
      expended: resourceCount(expenditure.expended - refundCount),
    };
  });
  const knownLevels = new Set(
    input.sheet.spellSlotExpenditures.map((slot) => slot.spellLevel),
  );
  for (const [spellLevel, refundCount] of refundByLevel.entries()) {
    if (!knownLevels.has(spellLevel)) {
      return characterSheetIssue(
        "Arcane Recovery refund must match existing Spell Slot levels.",
      );
    }
    const original = input.sheet.spellSlotExpenditures.find(
      (slot) => slot.spellLevel === spellLevel,
    );
    if (original === undefined || refundCount > original.expended) {
      return characterSheetIssue(
        "Arcane Recovery cannot refund more Spell Slots than are expended.",
      );
    }
  }
  return Either.right(updated);
}

function magicalCunningRecoveredPactSlots(input: {
  readonly pactSlots: CharacterPactSlotExpenditure;
  readonly profile: CharacterSheetPactSlotRecoveryProfile;
}): ResourceCount {
  return Match.value(input.profile.feature.mechanics.recoveryCap.kind).pipe(
    Match.when("half_maximum_rounded_up", () =>
      resourceCount(Math.ceil(input.pactSlots.count / 2)),
    ),
    Match.exhaustive,
  );
}

function restSpellSlotRecoveryProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterSheetRestSpellSlotRecoveryProfile,
  CharacterSheetIssue
> {
  const features: CharacterSheetRestSpellSlotRecoveryFeature[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    if (!isRestSpellSlotRecoveryFeature(unit.right)) {
      continue;
    }
    features.push(unit.right);
  }
  if (features.length === 0) {
    return characterSheetIssue(
      "Arcane Recovery requires a Short Rest Spell Slot recovery feature.",
    );
  }
  if (features.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Short Rest Spell Slot recovery feature.",
    );
  }
  const feature = features[0];
  if (feature === undefined) {
    return characterSheetIssue(
      "Arcane Recovery requires a Short Rest Spell Slot recovery feature.",
    );
  }
  return restSpellSlotRecoveryProfileForFeature({
    build,
    unitLibrary,
    feature,
  });
}

function restSpellSlotRecoveryProfileForFeature(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly feature: CharacterSheetRestSpellSlotRecoveryFeature;
}): Either.Either<
  CharacterSheetRestSpellSlotRecoveryProfile,
  CharacterSheetIssue
> {
  for (const progressionClassUnitId of progressionClassUnitIds(
    input.build.progression,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, progressionClassUnitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    if (
      unit.right.kind === "class" &&
      unit.right.className === input.feature.className
    ) {
      return Either.right({
        feature: input.feature,
        classUnitId: progressionClassUnitId,
      });
    }
  }
  return characterSheetIssue(
    "Short Rest Spell Slot recovery feature must belong to a class in the build progression.",
  );
}

function pactSlotRecoveryProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheetPactSlotRecoveryProfile, CharacterSheetIssue> {
  const profiles: CharacterSheetPactSlotRecoveryProfile[] = [];
  for (const classUnitId of progressionClassUnitIds(build.progression)) {
    const unit = getRequiredUnit(unitLibrary, classUnitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    const facts = readClassCreationFacts(unit.right);
    if (facts.tag !== "readable") continue;
    const classLevel = classLevelForUnit(build.progression, classUnitId);
    for (const grant of facts.value.featureGrants) {
      if (grant.level > classLevel) continue;
      const feature = unitLibrary.getUnit(grant.unitId);
      if (
        Option.isSome(feature) &&
        isPactSlotRecoveryFeature(feature.value) &&
        unit.right.kind === "class" &&
        unit.right.className === feature.value.className
      ) {
        profiles.push({ feature: feature.value, classUnitId });
      }
    }
  }
  if (profiles.length === 0) {
    return characterSheetIssue(
      "Magical Cunning requires the Warlock Magical Cunning feature.",
    );
  }
  if (profiles.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Pact Slot recovery feature.",
    );
  }
  const profile = profiles[0];
  if (profile === undefined) {
    return characterSheetIssue(
      "Magical Cunning requires the Warlock Magical Cunning feature.",
    );
  }
  return Either.right(profile);
}

function isCharacterSheetWithSpellSlots(
  sheet: CharacterSheet,
): sheet is CharacterSheetWithSpellSlots {
  return "spellSlotExpenditures" in sheet;
}

function isRestSpellSlotRecoveryFeature(
  unit: UnitRecord,
): unit is CharacterSheetRestSpellSlotRecoveryFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "rest_spell_slot_recovery" &&
    unit.mechanics.recoveryTrigger === "short_rest" &&
    unit.mechanics.resetCadence.kind === "long_rest" &&
    unit.mechanics.recoveredSlotLevelCap.kind === "half_class_level_rounded_up"
  );
}

function isPactSlotRecoveryFeature(
  unit: UnitRecord,
): unit is CharacterSheetPactSlotRecoveryFeature {
  return (
    unit.kind === "class_feature" &&
    unit.id === WARLOCK_MAGICAL_CUNNING_UNIT_ID &&
    unit.mechanics.family === "pact_slot_recovery" &&
    unit.mechanics.activationCost.kind === "one_minute_rite" &&
    unit.mechanics.resource.kind === "pact_slots" &&
    unit.mechanics.resource.source === "class_record_pact_magic" &&
    unit.mechanics.requiresExpendedSlots === true &&
    unit.mechanics.recoveryCap.kind === "half_maximum_rounded_up" &&
    unit.mechanics.resetCadence.kind === "long_rest"
  );
}

function isSpellbookRitualAccessFeature(
  unit: UnitRecord,
): unit is CharacterSheetSpellbookRitualFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "spellbook_ritual_access" &&
    unit.mechanics.source === "spellbook" &&
    unit.mechanics.preparationRequirement === "not_prepared"
  );
}

function characterSheetHitPointCapacity(
  input: Pick<CharacterSheetInput, "maximumHp" | "currentHp">,
): Either.Either<void, CharacterSheetIssue> {
  if (input.maximumHp < 1) {
    return characterSheetIssue("Character Sheet maximum HP must be positive.");
  }
  if (input.currentHp > input.maximumHp) {
    return characterSheetIssue(
      "Character Sheet current HP exceeds maximum HP.",
    );
  }
  return Either.right(undefined);
}

type ParsedStoredHitPoints = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

function parseStoredHitPoints(
  value: unknown,
): Either.Either<ParsedStoredHitPoints, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected Character Sheet hit points.");
  const tempHp =
    value.tempHp === undefined ? Either.right(Hp(0)) : parseHp(value.tempHp);
  if (Either.isLeft(tempHp)) return Either.left(tempHp.left);
  if (value.tag === "positive") {
    const currentHp = parseHp(value.currentHp);
    return Either.isLeft(currentHp)
      ? Either.left(currentHp.left)
      : Either.right({ currentHp: currentHp.right, tempHp: tempHp.right });
  }
  if (value.tag === "knockedOut") {
    return Either.right({
      currentHp: Hp(1),
      tempHp: tempHp.right,
      positiveHpUnconscious: CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
    });
  }
  if (value.tag !== "zero") {
    return characterSheetIssue("Expected Character Sheet hit point state.");
  }
  const lifecycle = parseStoredZeroHpLifecycle(value.lifecycle);
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({
        currentHp: Hp(0),
        tempHp: tempHp.right,
        zeroHpLifecycle: lifecycle.right,
      });
}

function parseStoredZeroHpLifecycle(
  value: unknown,
): Either.Either<CharacterSheetZeroHpLifecycleInput, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected zero-HP lifecycle.");
  if (value.tag === "stable") {
    const recovery = parseStoredStableRecovery(value.recovery);
    return Either.isLeft(recovery)
      ? Either.left(recovery.left)
      : Either.right({ tag: "stable", recovery: recovery.right });
  }
  if (value.tag !== "unstable" && value.tag !== "dead") {
    return characterSheetIssue("Expected zero-HP lifecycle state.");
  }
  const deathSaves = parseStoredDeathSaves(value.deathSaves);
  return Either.isLeft(deathSaves)
    ? Either.left(deathSaves.left)
    : Either.right({ tag: value.tag, deathSaves: deathSaves.right });
}

function parseStoredStableRecovery(
  value: unknown,
): Either.Either<CharacterSheetStableRecovery, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Stable recovery state.");
  }
  if (value.kind === "regains1HpAfter1d4Hours") {
    if (typeof value.elapsedBeforeRecoveryRoll !== "number") {
      return characterSheetIssue(
        "Stable recovery elapsed time must be elapsed-time ticks.",
      );
    }
    const elapsedBeforeRecoveryRoll = parseElapsedTimeTicks(
      value.elapsedBeforeRecoveryRoll,
    );
    return Either.isLeft(elapsedBeforeRecoveryRoll)
      ? characterSheetIssue(
          "Stable recovery elapsed time must be elapsed-time ticks.",
        )
      : Either.right({
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedBeforeRecoveryRoll.right,
        });
  }
  if (value.kind !== "regains1HpAfter") {
    return characterSheetIssue("Expected Stable recovery state.");
  }
  if (typeof value.remaining !== "number") {
    return characterSheetIssue(
      "Stable recovery remaining time must be positive elapsed-time ticks.",
    );
  }
  const remaining = parsePositiveElapsedTimeTicks(value.remaining);
  return Either.isLeft(remaining)
    ? characterSheetIssue(
        "Stable recovery remaining time must be positive elapsed-time ticks.",
      )
    : Either.right({ kind: "regains1HpAfter", remaining: remaining.right });
}

function parseStoredDeathSaves(
  value: unknown,
): Either.Either<DeathSaves, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected death saves.");
  if (!isDeathSaveCount(value.successes) || !isDeathSaveCount(value.failures)) {
    return characterSheetIssue("Death saves must be counts from 0 to 3.");
  }
  return Either.right({ successes: value.successes, failures: value.failures });
}

function parseStoredSpellSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Either.Either<
  readonly CharacterSheetSpellSlotState[] | undefined,
  CharacterSheetIssue
> {
  if (!isSpellcastingBuild(build)) {
    return value.spellSlotExpenditures === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
        );
  }
  if (!Array.isArray(value.spellSlotExpenditures)) {
    return characterSheetIssue(
      "Spellcasting Character Sheet requires Spell Slot state.",
    );
  }
  const parsed = [];
  for (const expenditure of value.spellSlotExpenditures) {
    if (!isRecord(expenditure)) {
      return characterSheetIssue("Expected Spell Slot expenditure.");
    }
    const spellLevel = parseSpellSlotLevel(expenditure.spellLevel);
    const expended = parseResourceCount(expenditure.expended);
    if (Either.isLeft(spellLevel)) return Either.left(spellLevel.left);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    const capacity = characterBuildSpellcastingSlotCapacity(build).find(
      (slot) => slot.spellLevel === spellLevel.right,
    );
    if (capacity === undefined) {
      return characterSheetIssue(
        "Spell Slot state does not match build capacity.",
      );
    }
    parsed.push({
      spellLevel: spellLevel.right,
      count: resourceCount(capacity.count),
      expended: expended.right,
    });
  }
  return Either.right(parsed);
}

function parseStoredPactSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterSheetPactSlotState | undefined, CharacterSheetIssue> {
  const pactMagic = characterBuildPactSlotCapacity(build);
  if (pactMagic === undefined) {
    return value.pactSlotExpenditure === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet without Pact Magic cannot carry Pact Slot state.",
        );
  }
  if (!isRecord(value.pactSlotExpenditure)) {
    return characterSheetIssue(
      "Pact Magic Character Sheet requires Pact Slot state.",
    );
  }
  const slotLevel = parseSpellSlotLevel(value.pactSlotExpenditure.slotLevel);
  const count = parseResourceCount(value.pactSlotExpenditure.count);
  const expended = parseResourceCount(value.pactSlotExpenditure.expended);
  if (Either.isLeft(slotLevel)) return Either.left(slotLevel.left);
  if (Either.isLeft(count)) return Either.left(count.left);
  if (Either.isLeft(expended)) return Either.left(expended.left);
  if (
    slotLevel.right !== spellSlotLevel(pactMagic.slotLevel) ||
    count.right !== resourceCount(pactMagic.count)
  ) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return Either.right({
    slotLevel: slotLevel.right,
    count: count.right,
    expended: expended.right,
  });
}

function parseStoredSpentHitDice(
  value: unknown,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Sheet requires spent Hit Dice state.",
    );
  }
  const spentHitDice = [];
  for (const spent of value) {
    if (!isRecord(spent) || typeof spent.classUnitId !== "string") {
      return characterSheetIssue("Expected spent Hit Dice state.");
    }
    const spentCount = parseResourceCount(spent.spent);
    if (Either.isLeft(spentCount)) return Either.left(spentCount.left);
    spentHitDice.push({
      classUnitId: spent.classUnitId,
      spent: spentCount.right,
    });
  }
  return Either.right(spentHitDice);
}

function parseStoredConditions(
  value: unknown,
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Sheet requires condition state.");
  }
  const conditions: CharacterSheetCondition[] = [];
  for (const condition of value) {
    if (typeof condition !== "string") {
      return characterSheetIssue("Expected Character Sheet condition.");
    }
    const supportedCondition = CHARACTER_SHEET_CONDITIONS.find(
      (allowed) => allowed === condition,
    );
    if (supportedCondition === undefined) {
      return characterSheetIssue(
        "Character Sheet condition state must contain supported non-Unconscious conditions.",
      );
    }
    conditions.push(supportedCondition);
  }
  return conditionsFromInput(conditions);
}

function parseStoredResourceExpenditures(
  value: unknown,
): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Sheet requires resource expenditure state.",
    );
  }
  const expenditures: CharacterSheetResourceExpenditure[] = [];
  for (const expenditure of value) {
    if (
      !isRecord(expenditure) ||
      (expenditure.tag !== "layOnHandsHealingPool" &&
        !isSupportedClassFeatureSpellFreeCastResourceTag(expenditure.tag))
    ) {
      return characterSheetIssue(
        "Expected Character Sheet resource expenditure.",
      );
    }
    const expended = parseResourceCount(expenditure.expended);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    expenditures.push({
      tag: expenditure.tag,
      expended: expended.right,
    });
  }
  return Either.right(expenditures);
}

function parseStoredRestFeatureUses(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: unknown,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  if (value === undefined) return Either.right([]);
  if (!Array.isArray(value)) {
    return characterSheetIssue("Expected Character Sheet rest feature uses.");
  }
  const uses: CharacterSheetRestFeatureUse[] = [];
  for (const use of value) {
    if (!isRecord(use)) {
      return characterSheetIssue("Expected Character Sheet rest feature use.");
    }
    if (
      (use.tag !== ARCANE_RECOVERY_REST_FEATURE_TAG &&
        use.tag !== MAGICAL_CUNNING_REST_FEATURE_TAG) ||
      use.usedSinceLongRest !== true
    ) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    uses.push({
      tag: use.tag,
      usedSinceLongRest: true,
    });
  }
  return restFeatureUsesFromInput({
    build,
    unitLibrary,
    restFeatureUses: uses,
  });
}

function passStableRecoveryTime(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly fills: readonly FilledHoleValue[];
}): CharacterSheetElapsedTimeResult {
  if (input.sheet.hitPoints.tag !== "zero") {
    return {
      tag: "resolved",
      sheet: input.sheet,
      elapsedTicks: input.ticks,
    };
  }
  const lifecycle = input.sheet.hitPoints.lifecycle;
  if (lifecycle.tag !== "stable") {
    return {
      tag: "resolved",
      sheet: input.sheet,
      elapsedTicks: input.ticks,
    };
  }
  if (lifecycle.recovery.kind === "regains1HpAfter") {
    if (input.fills.length !== 0) {
      return invalidElapsedTimeResult(
        input.sheet,
        "Elapsed-time recovery received fills when no roll is pending.",
      );
    }
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
    });
  }
  const hole = stableRecoveryRollHole(input.sheet.characterId);
  const fill = stableRecoveryFillFor(input.fills, hole);
  if (fill === undefined && input.fills.length !== 0) {
    return invalidElapsedTimeResult(
      input.sheet,
      "Elapsed-time recovery received a fill for a different hole.",
    );
  }
  if (fill !== undefined && input.fills.length !== 1) {
    return invalidElapsedTimeResult(
      input.sheet,
      "Elapsed-time recovery accepts exactly one matching fill.",
    );
  }
  if (fill === undefined) {
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
      hole,
    });
  }
  const roll = stableRecoveryRollFromFill(fill);
  return Either.isLeft(roll)
    ? invalidElapsedTimeResult(input.sheet, roll.left.message)
    : passStableRecoveryRuleWithRoll({
        sheet: input.sheet,
        ticks: input.ticks,
        roll: roll.right,
        hole,
      });
}

function passStableRecoveryRule(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly hole?: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return { tag: "resolved", sheet, elapsedTicks: input.ticks };
  }
  const recovery = sheet.hitPoints.lifecycle.recovery;
  const advanced =
    recovery.kind === "regains1HpAfter"
      ? advanceStableRecovery({ recovery, ticks: input.ticks })
      : advanceStableRecovery({ recovery, ticks: input.ticks });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  if (advanced.right.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet,
      holes: [input.hole ?? stableRecoveryRollHole(sheet.characterId)],
      elapsedTicks: advanced.right.elapsedTicks,
      remainingTicks: advanced.right.remainingTicks,
    };
  }
  if (advanced.right.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: sheet.hitPoints.tempHp,
      }),
      elapsedTicks: advanced.right.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(sheet, {
      ...sheet.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: advanced.right.recovery,
      },
    }),
    elapsedTicks: advanced.right.elapsedTicks,
  };
}

function passStableRecoveryRuleWithRoll(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly roll: DieRollResult;
  readonly hole: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable" ||
    sheet.hitPoints.lifecycle.recovery.kind !== "regains1HpAfter1d4Hours"
  ) {
    return invalidElapsedTimeResult(
      sheet,
      "Elapsed-time recovery received a roll when no roll is pending.",
    );
  }
  const advanced = advanceStableRecoveryWithRoll({
    recovery: sheet.hitPoints.lifecycle.recovery,
    ticks: input.ticks,
    roll: input.roll,
  });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  if (advanced.right.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet,
      holes: [input.hole],
      elapsedTicks: advanced.right.elapsedTicks,
      remainingTicks: advanced.right.remainingTicks,
    };
  }
  if (advanced.right.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: sheet.hitPoints.tempHp,
      }),
      elapsedTicks: advanced.right.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(sheet, {
      ...sheet.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: advanced.right.recovery,
      },
    }),
    elapsedTicks: advanced.right.elapsedTicks,
  };
}

function stableRecoveryRollHole(characterId: CharacterSheetId): RuntimeHole {
  return {
    kind: "rolledDice",
    holeId: holeId(`character-sheet:${characterId}:stable-recovery-roll`),
    holeInstanceKey: holeInstanceKey(
      `character-sheet:${characterId}:stable-recovery-roll`,
    ),
    label: "Stable recovery 1d4 hours",
  };
}

function stableRecoveryFillFor(
  fills: readonly FilledHoleValue[],
  hole: RuntimeHole,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (
      candidate,
    ): candidate is Extract<FilledHoleValue, { readonly kind: "rolledDice" }> =>
      candidate.kind === "rolledDice" && candidate.holeId === hole.holeId,
  );
}

function stableRecoveryRollFromFill(
  fill: Extract<FilledHoleValue, { readonly kind: "rolledDice" }>,
): Either.Either<DieRollResult, CharacterSheetIssue> {
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: STABLE_RECOVERY_ROLL_DICE_EXPR.dice,
    dieSize: STABLE_RECOVERY_ROLL_DICE_EXPR.dieSize,
  });
  if (validation !== null) {
    return characterSheetIssue(validation.reason);
  }
  const group = fill.value[0];
  const roll = group?.results[0];
  return roll === undefined
    ? characterSheetIssue("Stable recovery requires one d4 roll.")
    : Either.right(roll);
}

function invalidElapsedTimeResult(
  sheet: CharacterSheet,
  message: string,
): CharacterSheetElapsedTimeResult {
  return {
    tag: "invalid",
    sheet,
    reason: "invalidFill",
    message,
  };
}

function replaceCharacterSheetHitPoints(
  sheet: CharacterSheet,
  hitPoints: CharacterSheetHitPoints,
): CharacterSheet {
  return isCharacterSheetWithSpellSlots(sheet)
    ? {
        ...sheet,
        hitPoints,
        spellSlotExpenditures: sheet.spellSlotExpenditures,
      }
    : { ...sheet, hitPoints };
}

function parseHp(value: unknown): Either.Either<HpType, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(Hp(value))
    : characterSheetIssue("Expected nonnegative HP.");
}

function parseResourceCount(
  value: unknown,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(resourceCount(value))
    : characterSheetIssue("Expected nonnegative resource count.");
}

function parseSpellSlotLevel(
  value: unknown,
): Either.Either<SpellSlotLevel, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Either.right(spellSlotLevel(value))
    : characterSheetIssue("Expected positive Spell Slot level.");
}

function canonicalZeroHpLifecycle(
  lifecycle: CharacterSheetZeroHpLifecycleInput,
): Either.Either<CharacterSheetZeroHpLifecycle, CharacterSheetIssue> {
  if (lifecycle.tag === "stable") return Either.right(lifecycle);
  if (lifecycle.tag === "dead") {
    const { successes, failures } = lifecycle.deathSaves;
    if (successes === 3 || failures !== 3) {
      return characterSheetIssue(
        "Dead Character Sheet requires exactly three death save failures.",
      );
    }
    return Either.right({ tag: "dead", deathSaves: { successes, failures } });
  }
  const { successes, failures } = lifecycle.deathSaves;
  if (successes === 3 || failures === 3) {
    return characterSheetIssue(
      "Unstable Character Sheet cannot carry terminal death save counts.",
    );
  }
  return Either.right({ tag: "unstable", deathSaves: { successes, failures } });
}

function parseCharacterBuild(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuild, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Build.");
  const progression = parseStoredProgression(value.progression);
  if (Either.isLeft(progression)) return Either.left(progression.left);
  if (typeof value.background !== "string") {
    return characterSheetIssue("Character Build requires background Unit id.");
  }
  if (typeof value.species !== "string") {
    return characterSheetIssue("Character Build requires species Unit id.");
  }
  const originLanguages = parseStoredOriginLanguages(value.originLanguages);
  if (Either.isLeft(originLanguages)) return Either.left(originLanguages.left);
  const alignment = parseStoredAlignment(value.alignment);
  if (Either.isLeft(alignment)) return Either.left(alignment.left);
  const abilityScores = parseStoredAbilityScores(value.abilityScores);
  if (Either.isLeft(abilityScores)) return Either.left(abilityScores.left);
  const proficiencyChoices = parseStoredProficiencyChoices(
    value.proficiencyChoices,
  );
  if (Either.isLeft(proficiencyChoices)) {
    return Either.left(proficiencyChoices.left);
  }
  const features = parseStoredFeatures(value.features, unitLibrary);
  if (Either.isLeft(features)) return Either.left(features.left);
  const classFeatureLanguages = parseStoredClassFeatureLanguages({
    value: value.classFeatureLanguages,
    originLanguages: originLanguages.right,
    build: { progression: progression.right },
    unitLibrary,
  });
  if (Either.isLeft(classFeatureLanguages)) {
    return Either.left(classFeatureLanguages.left);
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcasting(value.spellcasting);
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  const equipment = parseStoredEquipment(value.equipment);
  if (Either.isLeft(equipment)) return Either.left(equipment.left);

  const build: CharacterBuild = {
    progression: progression.right,
    background: value.background,
    species: value.species,
    originLanguages: originLanguages.right,
    classFeatureLanguages: classFeatureLanguages.right,
    alignment: alignment.right,
    abilityScores: abilityScores.right,
    proficiencyChoices: proficiencyChoices.right,
    features: features.right,
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    equipment: equipment.right,
  };
  const bookOfShadowsIssue = storedBookOfShadowsSelectionIssue(
    build,
    unitLibrary,
  );
  if (Either.isLeft(bookOfShadowsIssue)) {
    return Either.left(bookOfShadowsIssue.left);
  }
  const eldritchInvocationIssue =
    storedEldritchInvocationKnownCantripSelectionIssue(build, unitLibrary);
  return Either.isLeft(eldritchInvocationIssue)
    ? Either.left(eldritchInvocationIssue.left)
    : Either.right(build);
}

function storedEldritchInvocationKnownCantripSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const knownWarlockCantrips = knownWarlockCantripIdsForStoredBuild(
    build,
    unitLibrary,
  );
  for (const feature of build.features) {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.kind !== "repeatable" ||
      feature.selection.repeatableChoice.kind !== "knownWarlockCantrip"
    ) {
      continue;
    }
    if (
      !knownWarlockCantrips.has(feature.selection.repeatableChoice.cantripId)
    ) {
      return characterSheetIssue(
        "Character Build Eldritch Invocation repeatable known cantrip choice must be a known Warlock cantrip.",
      );
    }
  }
  return Either.right(undefined);
}

function knownWarlockCantripIdsForStoredBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ReadonlySet<UnitRecord["id"]> {
  const cantripIds = new Set<UnitRecord["id"]>();
  for (const source of build.spellcasting?.sources ?? []) {
    const sourceClassName = classUnitIdToClassName({
      unitLibrary,
      classUnitId: source.sourceUnitId,
    });
    if (Either.isLeft(sourceClassName) || sourceClassName.right !== "warlock") {
      continue;
    }
    for (const cantripId of source.cantrips) {
      if (allCantripsFromClassSpellList("warlock", [cantripId])) {
        cantripIds.add(cantripId);
      }
    }
  }
  return cantripIds;
}

function parseStoredProgression(
  value: unknown,
): Either.Either<CharacterBuild["progression"], CharacterSheetIssue> {
  if (!isRecord(value) || typeof value.startingClass !== "string") {
    return characterSheetIssue("Character Build requires progression.");
  }
  if (!Array.isArray(value.advancements)) {
    return characterSheetIssue(
      "Character Build progression requires advancements.",
    );
  }
  const advancements = [];
  for (const advancement of value.advancements) {
    if (
      !isRecord(advancement) ||
      typeof advancement.classUnitId !== "string" ||
      !isRecord(advancement.hitPointRule) ||
      advancement.hitPointRule.tag !== "fixedHigherLevelGain"
    ) {
      return characterSheetIssue(
        "Character Build progression advancement is invalid.",
      );
    }
    advancements.push({
      classUnitId: classUnitId(advancement.classUnitId),
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    });
  }
  const totalLevel = 1 + advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return characterSheetIssue("Character Build progression is invalid.");
  }
  return Either.right({
    startingClass: classUnitId(value.startingClass),
    advancements,
  });
}

function storedBookOfShadowsSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const sources =
    build.spellcasting?.sources.filter(
      (source) => source.bookOfShadows !== undefined,
    ) ?? [];
  if (sources.length === 0) {
    return Either.right(undefined);
  }
  if (sources.length !== 1) {
    return characterSheetIssue(
      "Character Build supports one Book of Shadows Spell Access source.",
    );
  }
  if (!hasSelectedWarlockEldritchInvocation(build, unitLibrary)) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access requires Pact of the Tome.",
    );
  }
  const source = sources[0];
  const access = source.bookOfShadows;
  if (access === undefined) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access source is missing its selection.",
    );
  }
  const sourceUnit = getRequiredUnit(unitLibrary, source.sourceUnitId);
  if (Either.isLeft(sourceUnit)) {
    return Either.left(sourceUnit.left);
  }
  if (
    sourceUnit.right.kind !== "class" ||
    sourceUnit.right.className !== "warlock"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access requires the Warlock spellcasting source.",
    );
  }
  const selectedSpellIds = [...access.cantrips, ...access.ritualSpells];
  if (new Set(selectedSpellIds).size !== selectedSpellIds.length) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access selections must be distinct.",
    );
  }
  const preparedOrKnown = new Set([
    ...source.cantrips,
    ...source.preparedSpells,
    ...featurePreparedSpellIdsForBuild(build, unitLibrary),
  ]);
  if (selectedSpellIds.some((spellId) => preparedOrKnown.has(spellId))) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
    );
  }
  if (!allCantripsFromAnyClassSpellList(access.cantrips)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrips must come from class spell lists.",
    );
  }
  if (
    !allLeveledSpellsFromAnyClassSpellList(
      access.ritualSpells.map((spellId) => ({ spellId, spellLevel: 1 })),
    )
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual spells must be level-1 spells from class spell lists.",
    );
  }
  const cantrips = spellRecordsForIds(unitLibrary, access.cantrips);
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  const ritualSpells = spellRecordsForIds(unitLibrary, access.ritualSpells);
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  if (cantrips.right.some((spell) => spell.mechanics.level !== 0)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrip selections must be cantrip Spell Definitions.",
    );
  }
  if (
    ritualSpells.right.some(
      (spell) =>
        spell.mechanics.level !== 1 ||
        !("ritual" in spell.mechanics.castingTime) ||
        spell.mechanics.castingTime.ritual !== true,
    )
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual selections must be level-1 ritual-tagged Spell Definitions.",
    );
  }
  return Either.right(undefined);
}

function hasSelectedWarlockEldritchInvocation(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): boolean {
  return build.features.some((feature) => {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.invocationId !==
        eldritchInvocationId("pact_of_the_tome")
    ) {
      return false;
    }
    const source = unitLibrary.getUnit(feature.selectedFromUnitId);
    if (Option.isNone(source) || source.value.kind !== "class_feature") {
      return false;
    }
    const mechanics = source.value.mechanics;
    return (
      mechanics.family === "feature_choice" &&
      mechanics.optionSource.kind === "class_feature_options" &&
      mechanics.optionSource.className === "warlock" &&
      mechanics.optionSource.optionKind === "eldritch_invocation"
    );
  });
}

function featurePreparedSpellIdsForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  const spellIds: UnitRecord["id"][] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = unitLibrary.getUnit(unitId);
    if (
      Option.isNone(unit) ||
      unit.value.kind !== "class_feature" ||
      unit.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    for (const grant of unit.value.mechanics.grants) {
      if (grant.kind === "grant_spell_access" && grant.mode === "prepared") {
        spellIds.push(grant.spellId);
      }
    }
  }
  return spellIds;
}

function spellRecordsForIds(
  unitLibrary: UnitCatalog,
  spellIds: readonly UnitRecord["id"][],
): Either.Either<readonly SpellRecord[], CharacterSheetIssue> {
  const spells: SpellRecord[] = [];
  for (const spellId of spellIds) {
    const spell = getRequiredUnit(unitLibrary, spellId);
    if (Either.isLeft(spell)) {
      return Either.left(spell.left);
    }
    if (!isSpellRecord(spell.right)) {
      return characterSheetIssue(
        `Character Build Book of Shadows selection must reference Spell Definitions: ${spellId}`,
      );
    }
    spells.push(spell.right);
  }
  return Either.right(spells);
}

function parseStoredOriginLanguages(
  value: unknown,
): Either.Either<CharacterBuild["originLanguages"], CharacterSheetIssue> {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value[0] !== "Common" ||
    !value.every(isStandardLanguage) ||
    new Set(value).size !== value.length
  ) {
    return characterSheetIssue("Character Build requires origin languages.");
  }
  return Either.right(value as unknown as CharacterBuild["originLanguages"]);
}

function parseStoredClassFeatureLanguages(input: {
  readonly value: unknown;
  readonly originLanguages: CharacterBuild["originLanguages"];
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuild["classFeatureLanguages"],
  CharacterSheetIssue
> {
  const { value, originLanguages, build, unitLibrary } = input;
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Build requires class-feature languages.",
    );
  }

  const knownLanguages = new Set<StoredClassFeatureLanguage>(originLanguages);
  const ownedClassFeatureUnitIds = new Set(
    storedClassFeatureLanguageSourceUnitIds(build, unitLibrary),
  );
  const expectedProjection = storedClassFeatureLanguageProjection({
    ownedClassFeatureUnitIds,
    unitLibrary,
  });
  if (Either.isLeft(expectedProjection)) {
    return Either.left(expectedProjection.left);
  }
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const classFeatureLanguages: StoredClassFeatureLanguageFact[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      (item.kind !== "classFeatureLanguageGrant" &&
        item.kind !== "classFeatureLanguageChoice") ||
      typeof item.sourceUnitId !== "string" ||
      !isLanguage(item.language)
    ) {
      return characterSheetIssue(
        "Character Build requires class-feature language facts.",
      );
    }
    const languageFact: StoredClassFeatureLanguageFact = {
      kind: item.kind,
      sourceUnitId: item.sourceUnitId,
      language: item.language,
    };

    if (!ownedClassFeatureUnitIds.has(languageFact.sourceUnitId)) {
      return characterSheetIssue(
        `Character Build class-feature language source Unit ${languageFact.sourceUnitId} is not owned by the build.`,
      );
    }
    if (knownLanguages.has(languageFact.language)) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    if (
      languageFact.kind === "classFeatureLanguageChoice" &&
      expectedProjection.right.fixedLanguages.has(languageFact.language)
    ) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    const sourceMatch = storedClassFeatureLanguageMatchesSourceUnit({
      languageFact,
      unitLibrary,
    });
    if (Either.isLeft(sourceMatch)) {
      return Either.left(sourceMatch.left);
    }
    if (languageFact.kind === "classFeatureLanguageChoice") {
      choiceCountsBySourceUnitId.set(
        languageFact.sourceUnitId,
        (choiceCountsBySourceUnitId.get(languageFact.sourceUnitId) ?? 0) + 1,
      );
    } else {
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(languageFact.sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(languageFact.language);
      fixedLanguagesBySourceUnitId.set(
        languageFact.sourceUnitId,
        sourceLanguages,
      );
    }

    knownLanguages.add(languageFact.language);
    classFeatureLanguages.push(languageFact);
  }

  for (const [sourceUnitId, expectedLanguages] of expectedProjection.right
    .fixedLanguagesBySourceUnitId) {
    const storedLanguages =
      fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
      new Set<StoredClassFeatureLanguage>();
    for (const expectedLanguage of expectedLanguages) {
      if (!storedLanguages.has(expectedLanguage)) {
        return characterSheetIssue(
          `Character Build class-feature language projection is incomplete for source Unit ${sourceUnitId}.`,
        );
      }
    }
  }

  for (const [sourceUnitId, expectedCount] of expectedProjection.right
    .choiceCountsBySourceUnitId) {
    const selectedCount = choiceCountsBySourceUnitId.get(sourceUnitId) ?? 0;
    if (selectedCount !== expectedCount) {
      return characterSheetIssue(
        `Character Build class-feature language choices for source Unit ${sourceUnitId} must match the source choice count.`,
      );
    }
  }

  return Either.right(classFeatureLanguages);
}

function storedClassFeatureLanguageSourceUnitIds(
  build: Pick<CharacterBuild, "progression">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return progressionClassUnitIds(build.progression).flatMap((classUnitId) => {
    const unit = unitLibrary.getUnit(classUnitId);
    if (Option.isNone(unit)) return [];
    const facts = readClassCreationFacts(unit.value);
    if (facts.tag !== "readable") return [];
    return facts.value.featureGrants
      .filter(
        (grant) =>
          grant.level <= classLevelForUnit(build.progression, classUnitId),
      )
      .map((grant) => grant.unitId);
  });
}

function storedClassFeatureLanguageMatchesSourceUnit(input: {
  readonly languageFact: StoredClassFeatureLanguageFact;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<void, CharacterSheetIssue> {
  const sourceUnit = input.unitLibrary.getUnit(input.languageFact.sourceUnitId);
  if (
    Option.isNone(sourceUnit) ||
    sourceUnit.value.kind !== "class_feature" ||
    sourceUnit.value.mechanics.family !== "passive"
  ) {
    return characterSheetIssue(
      `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
    );
  }

  if (input.languageFact.kind === "classFeatureLanguageChoice") {
    return storedClassFeatureLanguageChoiceGrantCount(sourceUnit.value) ===
      undefined
      ? characterSheetIssue(
          `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
        )
      : Either.right(undefined);
  }

  const matches = sourceUnit.value.mechanics.grants.some((grant) => {
    if (grant.kind !== "grant_language") return false;
    const language = languageFromSurfaceLanguageId(grant.languageId);
    return (
      Either.isRight(language) && language.right === input.languageFact.language
    );
  });
  return matches
    ? Either.right(undefined)
    : characterSheetIssue(
        `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
      );
}

function storedClassFeatureLanguageProjection(input: {
  readonly ownedClassFeatureUnitIds: ReadonlySet<UnitRecord["id"]>;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<StoredClassFeatureLanguageProjection, CharacterSheetIssue> {
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const fixedLanguages = new Set<StoredClassFeatureLanguage>();
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  for (const sourceUnitId of input.ownedClassFeatureUnitIds) {
    const sourceUnit = input.unitLibrary.getUnit(sourceUnitId);
    if (
      Option.isNone(sourceUnit) ||
      sourceUnit.value.kind !== "class_feature" ||
      sourceUnit.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    const choiceCount = storedClassFeatureLanguageChoiceGrantCount(
      sourceUnit.value,
    );
    if (choiceCount !== undefined) {
      choiceCountsBySourceUnitId.set(sourceUnitId, choiceCount);
    }
    for (const grant of sourceUnit.value.mechanics.grants) {
      if (grant.kind !== "grant_language") continue;
      const language = languageFromSurfaceLanguageId(grant.languageId);
      if (Either.isLeft(language)) {
        return characterSheetIssue(
          `Unsupported class-feature language id ${grant.languageId} on Unit ${sourceUnitId}.`,
        );
      }
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(language.right);
      fixedLanguagesBySourceUnitId.set(sourceUnitId, sourceLanguages);
      fixedLanguages.add(language.right);
    }
  }
  return Either.right({
    fixedLanguagesBySourceUnitId,
    fixedLanguages,
    choiceCountsBySourceUnitId,
  });
}

function storedClassFeatureLanguageChoiceGrantCount(
  sourceUnit: UnitRecord,
): number | undefined {
  if (
    sourceUnit.kind !== "class_feature" ||
    sourceUnit.mechanics.family !== "passive"
  ) {
    return undefined;
  }
  const choiceGrantCount = sourceUnit.mechanics.grants.reduce(
    (count, grant) =>
      grant.kind === "grant_language_choice" &&
      grant.source === "character_creation_language_tables"
        ? count + grant.count
        : count,
    0,
  );
  return choiceGrantCount === 0 ? undefined : choiceGrantCount;
}

function parseStoredAlignment(
  value: unknown,
): Either.Either<CharacterBuild["alignment"], CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !ALIGNMENT_ORDERS.some((order) => order === value.order) ||
    !ALIGNMENT_MORALITIES.some((morality) => morality === value.morality)
  ) {
    return characterSheetIssue("Character Build requires alignment.");
  }
  return Either.right(value as CharacterBuild["alignment"]);
}

function parseStoredAbilityScores(
  value: unknown,
): Either.Either<CharacterBuild["abilityScores"], CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Character Build requires ability scores.");
  }
  const scores = Object.fromEntries(
    ABILITIES.map((ability) => [ability, value[ability]]),
  );
  const parsed = abilityScoreAssignment(scores);
  return Either.isLeft(parsed)
    ? characterSheetIssue("Character Build ability scores are invalid.")
    : Either.right(parsed.right);
}

function parseStoredProficiencyChoices(
  value: unknown,
): Either.Either<
  readonly CharacterBuildProficiencyChoiceSubject[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires proficiency choices.");
  }
  const choices = [];
  for (const choice of value) {
    if (!isRecord(choice) || typeof choice.kind !== "string") {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
    if (
      choice.kind === "skill" &&
      SKILLS.some((skill) => skill === choice.skill)
    ) {
      choices.push({ kind: "skill", skill: choice.skill });
    } else if (
      choice.kind === "weapon_category" &&
      WEAPON_PROFICIENCY_CATEGORY_VALUES.some(
        (category) => category === choice.category,
      )
    ) {
      choices.push({ kind: "weapon_category", category: choice.category });
    } else if (
      choice.kind === "armor_category" &&
      ARMOR_TRAINING_CATEGORY_VALUES.some(
        (category) => category === choice.category,
      )
    ) {
      choices.push({ kind: "armor_category", category: choice.category });
    } else if (choice.kind === "tool" && typeof choice.toolId === "string") {
      choices.push({ kind: "tool", toolId: choice.toolId });
    } else {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
  }
  return Either.right(
    choices as readonly CharacterBuildProficiencyChoiceSubject[],
  );
}

function parseStoredFeatures(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterBuildFeature[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires features.");
  }
  const features = [];
  for (const feature of value) {
    if (!isRecord(feature) || typeof feature.selectedFromUnitId !== "string") {
      return characterSheetIssue("Character Build feature is invalid.");
    }
    if (
      feature.kind === "selectedClassChoice" &&
      typeof feature.unitId === "string"
    ) {
      features.push({
        kind: "selectedClassChoice" as const,
        unitId: feature.unitId,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
    } else if (
      feature.kind === "selectedEldritchInvocation" &&
      isRecord(feature.selection)
    ) {
      const selection = parseStoredEldritchInvocationSelection(
        feature.selection,
        unitLibrary,
      );
      if (Either.isLeft(selection)) {
        return Either.left(selection.left);
      }
      features.push({
        kind: "selectedEldritchInvocation" as const,
        selection: selection.right,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
    } else if (feature.kind === "abilityCheckBonus") {
      const abilityCheckBonus = parseStoredAbilityCheckBonusFeature({
        feature,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
      if (Either.isLeft(abilityCheckBonus)) {
        return Either.left(abilityCheckBonus.left);
      }
      features.push(abilityCheckBonus.right);
    } else {
      return characterSheetIssue("Character Build feature is invalid.");
    }
  }
  return Either.right(features);
}

function parseStoredEldritchInvocationSelection(
  value: Readonly<Record<string, unknown>>,
  unitLibrary: UnitCatalog,
): Either.Either<
  Extract<
    CharacterBuildFeature,
    { readonly kind: "selectedEldritchInvocation" }
  >["selection"],
  CharacterSheetIssue
> {
  if (typeof value.invocationId !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  const invocationId = eldritchInvocationId(value.invocationId);
  const option = eldritchInvocationOptionForInvocationId(invocationId);
  if (option === undefined) {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  if (option.repeatability.kind === "once") {
    return value.kind === "nonRepeatable"
      ? Either.right({ kind: "nonRepeatable", invocationId })
      : characterSheetIssue(
          "Character Build Eldritch Invocation selection is invalid.",
        );
  }

  if (value.kind !== "repeatable") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  const repeatableChoiceInput = value.repeatableChoice;
  const repeatableChoice = parseStoredEldritchInvocationRepeatableChoice(
    repeatableChoiceInput,
  );
  if (Either.isLeft(repeatableChoice)) {
    return Either.left(repeatableChoice.left);
  }

  return eldritchInvocationRepeatableChoiceSatisfiesRule({
    unitLibrary,
    choiceRule: option.repeatability.choice,
    repeatableChoice: repeatableChoice.right,
  })
    ? Either.right({
        kind: "repeatable",
        invocationId,
        repeatableChoice: repeatableChoice.right,
      })
    : characterSheetIssue(
        "Character Build Eldritch Invocation repeatable choice is invalid.",
      );
}

function parseStoredEldritchInvocationRepeatableChoice(
  value: unknown,
): Either.Either<
  CharacterBuildEldritchInvocationRepeatableChoice,
  CharacterSheetIssue
> {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation repeatable choice is invalid.",
    );
  }
  if (
    value.kind === "knownWarlockCantrip" &&
    typeof value.cantripId === "string"
  ) {
    return Either.right({
      kind: "knownWarlockCantrip",
      cantripId: value.cantripId,
    });
  }
  if (value.kind === "originFeat" && typeof value.featUnitId === "string") {
    return Either.right({
      kind: "originFeat",
      featUnitId: value.featUnitId,
    });
  }
  return characterSheetIssue(
    "Character Build Eldritch Invocation repeatable choice is invalid.",
  );
}

function parseStoredAbilityCheckBonusFeature(input: {
  readonly feature: Readonly<Record<string, unknown>>;
  readonly selectedFromUnitId: string;
}): Either.Either<CharacterBuildFeature, CharacterSheetIssue> {
  const { feature } = input;
  if (
    !Array.isArray(feature.skills) ||
    !feature.skills.every(isSurfaceSkill) ||
    !isAbility(feature.ability) ||
    !isRecord(feature.bonus) ||
    feature.bonus.kind !== "abilityModifier" ||
    !isAbility(feature.bonus.ability) ||
    typeof feature.bonus.minimum !== "number"
  ) {
    return characterSheetIssue("Character Build feature is invalid.");
  }

  return Either.right({
    kind: "abilityCheckBonus" as const,
    ability: feature.ability,
    skills: feature.skills,
    bonus: {
      kind: "abilityModifier" as const,
      ability: feature.bonus.ability,
      minimum: feature.bonus.minimum,
    },
    selectedFromUnitId: input.selectedFromUnitId,
  });
}

function parseStoredSpellcasting(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0
  ) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  const sources = value.sources.map(parseStoredSpellcastingSource);
  const firstIssue = sources.find(Either.isLeft);
  if (firstIssue !== undefined) return Either.left(firstIssue.left);
  const slotPools = parseStoredSpellSlotPools(value.slotPools);
  if (Either.isLeft(slotPools)) return Either.left(slotPools.left);
  const parsedSources = sources
    .filter(Either.isRight)
    .map((source) => source.right);
  return Either.right({
    sources: parsedSources as unknown as CharacterBuildSpellcasting["sources"],
    slotPools: slotPools.right,
  });
}

function parseStoredSpellcastingSource(
  value: unknown,
): Either.Either<CharacterBuildSpellcastingSource, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    typeof value.sourceUnitId !== "string" ||
    !isAbility(value.spellcastingAbility) ||
    !isStringArray(value.cantrips) ||
    !isStringArray(value.spellbook) ||
    !isStringArray(value.preparedSpells) ||
    !Array.isArray(value.spellcastingFocuses)
  ) {
    return characterSheetIssue(
      "Character Build spellcasting source is invalid.",
    );
  }
  const bookOfShadows =
    value.bookOfShadows === undefined
      ? undefined
      : parseStoredBookOfShadowsSpellAccess(value.bookOfShadows);
  if (bookOfShadows !== undefined && Either.isLeft(bookOfShadows)) {
    return Either.left(bookOfShadows.left);
  }
  return Either.right({
    sourceUnitId: value.sourceUnitId,
    spellcastingAbility: value.spellcastingAbility,
    cantrips: value.cantrips,
    spellbook: value.spellbook,
    preparedSpells: value.preparedSpells,
    spellcastingFocuses:
      value.spellcastingFocuses as readonly CharacterBuildSpellcastingFocus[],
    ...(bookOfShadows === undefined
      ? {}
      : { bookOfShadows: bookOfShadows.right }),
  });
}

function parseStoredBookOfShadowsSpellAccess(
  value: unknown,
): Either.Either<CharacterBuildBookOfShadowsSpellAccess, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    value.tag !== "bookOfShadows" ||
    value.spellcastingFocus !== "book_of_shadows"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access is invalid.",
    );
  }
  const cantrips = parseStoredBookOfShadowsCantripIds(value.cantrips);
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  const ritualSpells = parseStoredBookOfShadowsRitualSpellIds(
    value.ritualSpells,
  );
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  return Either.right({
    tag: value.tag,
    cantrips: cantrips.right,
    ritualSpells: ritualSpells.right,
    spellcastingFocus: value.spellcastingFocus,
  });
}

function parseStoredCharacterSheetBookOfShadowsPresence(
  build: CharacterBuild,
  value: unknown,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(build)) {
    return value === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  if (
    !isRecord(value) ||
    (value.tag !== "onPerson" && value.tag !== "notOnPerson")
  ) {
    return characterSheetIssue(
      "Character Sheet Book of Shadows presence is invalid.",
    );
  }
  return Either.right({ tag: value.tag });
}

function parseStoredBookOfShadowsCantripIds(
  value: unknown,
): Either.Either<
  CharacterBuildBookOfShadowsSpellAccess["cantrips"],
  CharacterSheetIssue
> {
  if (!isStringArray(value)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrips are invalid.",
    );
  }
  const [first, second, third, ...extra] = value;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    extra.length !== 0
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows requires exactly three cantrips.",
    );
  }
  return Either.right([first, second, third]);
}

function parseStoredBookOfShadowsRitualSpellIds(
  value: unknown,
): Either.Either<
  CharacterBuildBookOfShadowsSpellAccess["ritualSpells"],
  CharacterSheetIssue
> {
  if (!isStringArray(value)) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual spells are invalid.",
    );
  }
  const [first, second, ...extra] = value;
  if (first === undefined || second === undefined || extra.length !== 0) {
    return characterSheetIssue(
      "Character Build Book of Shadows requires exactly two Ritual spells.",
    );
  }
  return Either.right([first, second]);
}

function parseStoredSpellSlotPools(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting["slotPools"], CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build spellcasting requires slot pools.",
    );
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcastingSlotPool(value.spellcasting);
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  const pactMagic =
    value.pactMagic === undefined
      ? undefined
      : parseStoredPactMagicSlotPool(value.pactMagic);
  if (pactMagic !== undefined && Either.isLeft(pactMagic)) {
    return Either.left(pactMagic.left);
  }
  return Either.right({
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    ...(pactMagic === undefined ? {} : { pactMagic: pactMagic.right }),
  });
}

function parseStoredSpellcastingSlotPool(
  value: unknown,
): Either.Either<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["spellcasting"]>,
  CharacterSheetIssue
> {
  if (
    !isRecord(value) ||
    value.kind !== "spellcasting" ||
    !Array.isArray(value.slots)
  ) {
    return characterSheetIssue(
      "Character Build spellcasting slot pool is invalid.",
    );
  }
  const slots = [];
  for (const slot of value.slots) {
    if (
      !isRecord(slot) ||
      !isPositiveInteger(slot.spellLevel) ||
      !isPositiveInteger(slot.count)
    ) {
      return characterSheetIssue(
        "Character Build Spell Slot capacity is invalid.",
      );
    }
    slots.push({ spellLevel: slot.spellLevel, count: slot.count });
  }
  return Either.right({ kind: "spellcasting", slots });
}

function parseStoredPactMagicSlotPool(
  value: unknown,
): Either.Either<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["pactMagic"]>,
  CharacterSheetIssue
> {
  if (
    !isRecord(value) ||
    value.kind !== "pactMagic" ||
    !isPositiveInteger(value.slotLevel) ||
    !isPositiveInteger(value.count)
  ) {
    return characterSheetIssue(
      "Character Build Pact Magic slot pool is invalid.",
    );
  }
  return Either.right({
    kind: "pactMagic",
    slotLevel: value.slotLevel,
    count: value.count,
  });
}

function parseStoredEquipment(
  value: unknown,
): Either.Either<CharacterBuildEquipment, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.owned) ||
    !isRecord(value.loadout)
  ) {
    return characterSheetIssue("Character Build requires equipment.");
  }
  const owned = [];
  for (const item of value.owned) {
    if (
      !isRecord(item) ||
      typeof item.itemId !== "string" ||
      typeof item.unitId !== "string"
    ) {
      return characterSheetIssue(
        "Character Build owned equipment item is invalid.",
      );
    }
    const parsedItemId = parseCharacterEquipmentItemId(item.itemId);
    if (Either.isLeft(parsedItemId)) {
      return characterSheetIssue(
        "Character Build owned equipment item id is invalid.",
      );
    }
    owned.push({ itemId: item.itemId, unitId: item.unitId });
  }
  const loadout = parseStoredLoadout(value.loadout);
  if (Either.isLeft(loadout)) return Either.left(loadout.left);
  return Either.right({
    owned,
    loadout: loadout.right,
  } as unknown as CharacterBuildEquipment);
}

function parseStoredLoadout(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterBuildEquipment["loadout"], CharacterSheetIssue> {
  const armor = parseOptionalEquipmentItemId(value.armor, "armor");
  if (Either.isLeft(armor)) return Either.left(armor.left);
  const shield = parseOptionalEquipmentItemId(value.shield, "shield");
  if (Either.isLeft(shield)) return Either.left(shield.left);
  const weapon = parseStoredMainWeapon(value.weapon);
  if (Either.isLeft(weapon)) return Either.left(weapon.left);
  const offHandWeapon = parseStoredOffHandWeapon(value.offHandWeapon);
  if (Either.isLeft(offHandWeapon)) return Either.left(offHandWeapon.left);
  return Either.right({
    ...(armor.right === undefined ? {} : { armor: armor.right }),
    ...(shield.right === undefined ? {} : { shield: shield.right }),
    ...(weapon.right === undefined ? {} : { weapon: weapon.right }),
    ...(offHandWeapon.right === undefined
      ? {}
      : { offHandWeapon: offHandWeapon.right }),
  } as CharacterBuildEquipment["loadout"]);
}

function parseStoredMainWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["weapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value) || value.grip !== "one_handed") {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "main");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["weapon"]
    >["itemId"],
    grip: "one_handed",
  });
}

function parseStoredOffHandWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["offHandWeapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "off");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["offHandWeapon"]
    >["itemId"],
  });
}

function parseOptionalEquipmentItemId(
  value: unknown,
  slot: "armor" | "shield" | "main" | "off",
): Either.Either<
  CharacterBuildEquipment["owned"][number]["itemId"] | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (typeof value !== "string") {
    return characterSheetIssue("Character Build equipment item id is invalid.");
  }
  const parsed = parseCharacterEquipmentItemId(value);
  if (Either.isLeft(parsed) || parsed.right.slot !== slot) {
    return characterSheetIssue(
      "Character Build equipment item slot is invalid.",
    );
  }
  return Either.right(
    value as CharacterBuildEquipment["owned"][number]["itemId"],
  );
}

function isAbility(value: unknown): value is Ability {
  return ABILITIES.some((ability) => ability === value);
}

function isSurfaceSkill(value: unknown): value is SurfaceSkill {
  return SURFACE_SKILLS.some((skill) => skill === value);
}

function isStandardLanguage(value: unknown): value is string {
  return STANDARD_LANGUAGES.some((language) => language === value);
}

function isLanguage(
  value: unknown,
): value is CharacterBuild["classFeatureLanguages"][number]["language"] {
  return LANGUAGES.some((language) => language === value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isDeathSaveCount(value: unknown): value is DeathSaveCount {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

function isNonSpellcastingBuild(
  build: CharacterBuild,
): build is NonSpellcastingCharacterBuild {
  return build.spellcasting === undefined;
}
