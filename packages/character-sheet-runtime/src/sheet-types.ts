import {
  DRUID_WILD_SHAPE_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  type CharacterBuild,
  type CharacterBuildDruidWildShapeKnownFormReplacement,
  type CharacterBuildHitDiePool,
  type CharacterBuildMonkUncannyMetabolismFacts,
  type CharacterBuildResource,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  CONDITIONS,
  type Ability,
  type SurfaceSkill,
} from "@dnd/shared/game-facts";
import {
  DieRollResult,
  type Hp as HpType,
  resourceCount,
  type Condition,
  type DifficultyClass,
  type PositiveInteger,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  elapsedTimeTicks,
  type ElapsedTimeTicks,
  type PositiveElapsedTimeTicks,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import type {
  ArmorClass,
  ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  RETAINED_COMPANION_PROTOCOL_TAGS,
  retainedCompanionProtocolFacts,
} from "@dnd/shared-algebras/companion-protocol-algebra";
import type {
  RetainedCompanionProtocol,
  RetainedCompanionProtocolFacts,
  RetainedCompanionProtocolTag,
} from "@dnd/shared-algebras/companion-protocol-algebra";
import type {
  FilledHoleValue,
  RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { StableRecovery } from "@dnd/shared-algebras/stable-recovery-algebra";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarCreatureTypeOverrideChoice,
  PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  type ChargePoolResource,
  type DruidCircleLandChoice,
  type PointPoolResource,
  type RestResetCadence,
  type SpellRecord,
  type UnitRecord,
  type UseCountResource,
} from "@dnd/surface/surface/types";
import { type SupportedClassFeatureSpellFreeCastResourceTag } from "@dnd/surface/surface/types";
import { Brand, Either, Option } from "effect";

export const WEAPON_PROFICIENCY_CATEGORY_VALUES = [
  "simple",
  "martial",
] as const;
export const ARMOR_TRAINING_CATEGORY_VALUES = [
  "light",
  "medium",
  "heavy",
  "shield",
] as const;
// AUTHORED-IDENTITY DEBT — support gate; a tolerated exception, NOT a pattern to
// copy. Enumerates the authored Unit ids whose use-count resource the sheet tracks
// here. Admission can't key on the bare shape (class_feature + use_count +
// resetCadence): ~10 SRD features share it (Rage, Action Surge, Bardic Inspiration,
// …), so shape alone would over-admit. The durable form is a typed support-profile
// discriminant in the authored data, not an id list. Don't extend.
export const CHARACTER_SHEET_USE_COUNT_RESOURCE_UNIT_IDS = [
  DRUID_WILD_SHAPE_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export type CharacterSheetUseCountResourceUnitId =
  (typeof CHARACTER_SHEET_USE_COUNT_RESOURCE_UNIT_IDS)[number];
// AUTHORED-IDENTITY DEBT — support gate; a tolerated exception, NOT a pattern to
// copy. Enumerates the authored Unit ids whose point-pool resource the sheet tracks
// here. The durable form is a typed support-profile discriminant in the authored
// data, not an id list. Don't extend.
export const CHARACTER_SHEET_POINT_POOL_RESOURCE_UNIT_IDS = [
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export type CharacterSheetPointPoolResourceUnitId =
  (typeof CHARACTER_SHEET_POINT_POOL_RESOURCE_UNIT_IDS)[number];
export const ARCANE_RECOVERY_REST_FEATURE_TAG = "arcaneRecovery" as const;
export const MAGICAL_CUNNING_REST_FEATURE_TAG = "magicalCunning" as const;
export const UNCANNY_METABOLISM_REST_FEATURE_TAG = "uncannyMetabolism" as const;
export const SORCEROUS_RESTORATION_REST_FEATURE_TAG =
  "sorcerousRestoration" as const;
export const SPELL_RECIPIENT_REST_LOCKOUT_TAG =
  "spellRecipientRestLockout" as const;
export const JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR = 2;
export const LAY_ON_HANDS_POISONED_REMOVAL_COST = resourceCount(5);
export const RITUAL_ADDITIONAL_CASTING_TIME_MINUTES = 10;
export type CharacterSheetShortRestBenefitHpGate =
  | "requiresShortRestStartHp"
  | "spellGrantedRestBenefit";
export const CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES = [
  "rollInitiative",
  "castNonCantripSpell",
  "takeDamage",
] as const;
export const characterSheetShortRestStartBrand: unique symbol = Symbol(
  "CharacterSheetShortRestStart",
);
export const characterSheetShortRestCompletionBrand: unique symbol = Symbol(
  "CharacterSheetShortRestCompletion",
);
export const characterSheetLongRestStartBrand: unique symbol = Symbol(
  "CharacterSheetLongRestStart",
);
export const characterSheetLongRestCompletionBrand: unique symbol = Symbol(
  "CharacterSheetLongRestCompletion",
);
export type CharacterSheetRestActivityInterruption =
  (typeof CHARACTER_SHEET_REST_ACTIVITY_INTERRUPTION_VALUES)[number];
export type CharacterSheetShortRestInterruption =
  CharacterSheetRestActivityInterruption;
export type CharacterSheetLongRestInterruption =
  | CharacterSheetRestActivityInterruption
  | {
      readonly tag: "physicalExertion";
      readonly durationTicks: ElapsedTimeTicks;
    };
export const CHARACTER_SHEET_SHORT_REST_TICKS = elapsedTimeTicks(
  ELAPSED_TIME_TICKS_PER_HOUR,
);
export const CHARACTER_SHEET_LONG_REST_BASE_TICKS = elapsedTimeTicks(
  ELAPSED_TIME_TICKS_PER_HOUR * 8,
);
export const CHARACTER_SHEET_LONG_REST_WAIT_TICKS = elapsedTimeTicks(
  ELAPSED_TIME_TICKS_PER_HOUR * 16,
);
export type CharacterSheetHeroicInspiration =
  | { readonly tag: "none" }
  | { readonly tag: "available" };
export const CHARACTER_SHEET_NO_HEROIC_INSPIRATION = {
  tag: "none",
} as const satisfies CharacterSheetHeroicInspiration;
export const CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE = {
  tag: "available",
} as const satisfies CharacterSheetHeroicInspiration;
export type StoredClassFeatureLanguageFact =
  CharacterBuild["classFeatureLanguages"][number];
export type StoredClassFeatureLanguage =
  StoredClassFeatureLanguageFact["language"];
export type StoredClassFeatureLanguageProjection = {
  readonly fixedLanguagesBySourceUnitId: ReadonlyMap<
    UnitRecord["id"],
    ReadonlySet<StoredClassFeatureLanguage>
  >;
  readonly fixedLanguages: ReadonlySet<StoredClassFeatureLanguage>;
  readonly choiceCountsBySourceUnitId: ReadonlyMap<UnitRecord["id"], number>;
};
export const CHARACTER_SHEET_CONDITIONS = CONDITIONS.filter(
  (condition): condition is CharacterSheetCondition =>
    condition !== "unconscious",
);
export const FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES = [
  "ordinary",
  "created",
] as const;
export type CharacterSheetFontOfMagicSpellSlotSource =
  (typeof FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES)[number];

export type CharacterSheetId = string & Brand.Brand<"CharacterId">;
const CharacterSheetId = Brand.nominal<CharacterSheetId>();

export function characterSheetId(value: string): CharacterSheetId {
  return CharacterSheetId(value);
}

export type CharacterSheetRetainedCompanionId = string &
  Brand.Brand<"CharacterSheetRetainedCompanionId">;
const CharacterSheetRetainedCompanionId =
  Brand.nominal<CharacterSheetRetainedCompanionId>();

export function parseCharacterSheetRetainedCompanionId(
  value: string,
): Either.Either<CharacterSheetRetainedCompanionId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Retained companion requires companion id.")
    : Either.right(CharacterSheetRetainedCompanionId(value));
}

export type CharacterSheetCompanionCreatureTypeOverride =
  FindFamiliarCreatureTypeOverride;

export type CharacterSheetCompanionFormSelection =
  PactOfTheChainFindFamiliarFormSelection;

export { RETAINED_COMPANION_PROTOCOL_TAGS, retainedCompanionProtocolFacts };

export type CharacterSheetRetainedCompanionProtocolTag =
  RetainedCompanionProtocolTag;

export type CharacterSheetRetainedCompanionProtocol = RetainedCompanionProtocol;

export type CharacterSheetRetainedCompanionProtocolFacts =
  RetainedCompanionProtocolFacts;

export type CharacterSheetRetainedCompanionCurrentHitPoints = HpType &
  PositiveInteger;

export type CharacterSheetRetainedCompanionHitPoints = {
  readonly currentHp: CharacterSheetRetainedCompanionCurrentHitPoints;
  readonly tempHp: HpType;
};

export type CharacterSheetRetainedCompanionResolvedFormProof = {
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly creatureTypeOverride: CharacterSheetCompanionCreatureTypeOverride;
  readonly resolvedStatBlockId: StatBlockId;
};

export type CharacterSheetRetainedCompanionManifestation =
  | ({
      readonly tag: "embodiedOutsideBattle";
    } & CharacterSheetRetainedCompanionResolvedFormProof & {
        readonly hitPoints: CharacterSheetRetainedCompanionHitPoints;
      })
  | ({
      readonly tag: "temporarilyDismissed";
    } & CharacterSheetRetainedCompanionResolvedFormProof & {
        readonly hitPoints: CharacterSheetRetainedCompanionHitPoints;
      })
  | ({
      readonly tag: "disappearedAtZeroHitPoints";
    } & CharacterSheetRetainedCompanionResolvedFormProof);

export type CharacterSheetRetainedCompanionState = {
  readonly companionId: CharacterSheetRetainedCompanionId;
  readonly protocol: CharacterSheetRetainedCompanionProtocol;
  readonly manifestation: CharacterSheetRetainedCompanionManifestation;
};

export type CharacterSheetCompanion =
  | { readonly tag: "none" }
  | {
      readonly tag: "retainedOneAtATime";
      readonly companion: CharacterSheetRetainedCompanionState;
    };

export type CharacterSheetRetainedCompanionCreationSource =
  | {
      readonly tag: "spellSlotSpellCast";
      readonly spellId: UnitRecord["id"];
      readonly spellLevel: SpellSlotLevel;
    }
  | {
      readonly tag: "ritualSpell";
      readonly spellId: UnitRecord["id"];
    }
  | {
      readonly tag: "invocationSpellAccess";
      readonly spellId: UnitRecord["id"];
    }
  | {
      readonly tag: "classFeatureSpellCast";
      readonly featureUnitId: UnitRecord["id"];
      readonly spend:
        | { readonly tag: "spellSlot"; readonly spellLevel: SpellSlotLevel }
        | {
            readonly tag: "useCountResource";
            readonly resourceUnitId: UnitRecord["id"];
          };
    };

export type CharacterSheetRetainedCompanionCreationInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly companionId: CharacterSheetRetainedCompanionId;
  readonly source: CharacterSheetRetainedCompanionCreationSource;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly creatureTypeOverrideChoiceId?: FindFamiliarCreatureTypeOverrideChoice["optionId"];
};

export type SpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting: NonNullable<CharacterBuild["spellcasting"]>;
};

export type NonSpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting?: undefined;
};

export type CharacterSheetWithSpellSlots = CharacterSheet & {
  readonly build: SpellcastingCharacterBuild;
  readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
  readonly createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[];
};

export type CharacterSheet =
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: SpellcastingCharacterBuild;
      readonly hitPointMaximumReduction: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly conditions: readonly CharacterSheetCondition[];
      readonly spentHitDice: readonly CharacterSheetSpentHitDiePool[];
      readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
      readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
      readonly heroicInspiration: CharacterSheetHeroicInspiration;
      readonly companion: CharacterSheetCompanion;
      readonly bookOfShadowsPresence:
        | CharacterSheetBookOfShadowsPresence
        | undefined;
      readonly druidWildShapeKnownForms?: CharacterSheetDruidWildShapeKnownForms;
      readonly druidCircleLand?: CharacterSheetDruidCircleLand;
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
      readonly createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[];
      readonly pactSlotExpenditure: CharacterPactSlotExpenditure | undefined;
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly hitPointMaximumReduction: HpType;
      readonly hitPoints: CharacterSheetHitPoints;
      readonly conditions: readonly CharacterSheetCondition[];
      readonly spentHitDice: readonly CharacterSheetSpentHitDiePool[];
      readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
      readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
      readonly heroicInspiration: CharacterSheetHeroicInspiration;
      readonly companion: CharacterSheetCompanion;
      readonly bookOfShadowsPresence?: never;
      readonly druidWildShapeKnownForms?: CharacterSheetDruidWildShapeKnownForms;
      readonly druidCircleLand?: CharacterSheetDruidCircleLand;
      readonly spellSlotExpenditures?: never;
      readonly createdSpellSlots?: never;
      readonly pactSlotExpenditure?: never;
    };

export type CharacterSheetCondition = Exclude<Condition, "unconscious">;

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: SpellSlotLevel;
  readonly expended: ResourceCount;
};

export type CharacterPactSlotExpenditure = {
  readonly expended: ResourceCount;
};

export type CharacterSheetBookOfShadowsPresence =
  | { readonly tag: "onPerson" }
  | { readonly tag: "notOnPerson" };

export type CharacterSheetDruidWildShapeKnownForms = {
  readonly statBlockIds: readonly StatBlockId[];
};

export type CharacterSheetDruidCircleLand = {
  readonly land: DruidCircleLandChoice;
};

export type CharacterSheetDruidCircleLandPreparedSpellAccess = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellcastingSourceUnitId: UnitRecord["id"];
  readonly land: DruidCircleLandChoice;
  readonly druidLevel: number;
  readonly spellIds: readonly UnitRecord["id"][];
};

export type CharacterSheetDruidWildShapeKnownFormReplacement =
  CharacterBuildDruidWildShapeKnownFormReplacement;

export type CharacterSheetSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetCreatedSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterSheetSpellSlotSourceState = {
  readonly ordinarySpellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
  readonly createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[];
};

export type CharacterSheetPactSlotState = {
  readonly slotLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

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

export type CharacterSheetHitPointRecoveryOverflow =
  | { readonly tag: "capAtMaximum" }
  | {
      readonly tag: "rejectAboveMaximum";
      readonly message: string;
    };

export type CharacterSheetRestFeatureUse =
  | {
      readonly tag: typeof ARCANE_RECOVERY_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
    }
  | {
      readonly tag: typeof MAGICAL_CUNNING_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
    }
  | {
      readonly tag: typeof UNCANNY_METABOLISM_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
    }
  | {
      readonly tag: typeof SORCEROUS_RESTORATION_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
    }
  | {
      readonly tag: typeof SPELL_RECIPIENT_REST_LOCKOUT_TAG;
      readonly spellId: UnitRecord["id"];
      readonly usedSinceLongRest: true;
    };

export type CharacterSheetTaggedResourceExpenditure = {
  readonly tag:
    | "layOnHandsHealingPool"
    | SupportedClassFeatureSpellFreeCastResourceTag;
  readonly expended: ResourceCount;
};

export type CharacterSheetUseCountResourceExpenditure = {
  readonly tag: "useCountResource";
  readonly unitId: UnitRecord["id"];
  readonly expended: ResourceCount;
};

export type CharacterSheetPointPoolResourceExpenditure = {
  readonly tag: "pointPoolResource";
  readonly unitId: CharacterSheetPointPoolResourceUnitId;
  readonly expended: ResourceCount;
};

export type CharacterSheetResourceExpenditure =
  | CharacterSheetTaggedResourceExpenditure
  | CharacterSheetUseCountResourceExpenditure
  | CharacterSheetPointPoolResourceExpenditure;

export type CharacterSheetLayOnHandsResource = CharacterBuildResource & {
  readonly unitId: UnitRecord["id"];
  readonly resource: ChargePoolResource;
};

export type CharacterSheetClassFeatureSpellFreeCastResource = {
  readonly unitId: UnitRecord["id"];
  readonly tag: SupportedClassFeatureSpellFreeCastResourceTag;
  readonly count: ResourceCount;
};

export type CharacterSheetUseCountResource = CharacterBuildResource & {
  readonly unitId: UnitRecord["id"];
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};

export type CharacterSheetPointPoolResource = CharacterBuildResource & {
  readonly unitId: CharacterSheetPointPoolResourceUnitId;
  readonly resource: PointPoolResource;
  readonly resetCadence: Extract<
    RestResetCadence,
    { readonly kind: "long_rest" }
  >;
};

export type CharacterSheetResourceState =
  | (CharacterSheetLayOnHandsResource & {
      readonly tag: "layOnHandsHealingPool";
      readonly count: ResourceCount;
      readonly expended: ResourceCount;
    })
  | (CharacterSheetClassFeatureSpellFreeCastResource & {
      readonly expended: ResourceCount;
    })
  | (CharacterSheetUseCountResource & {
      readonly tag: "useCountResource";
      readonly count: ResourceCount;
      readonly expended: ResourceCount;
    })
  | (CharacterSheetPointPoolResource & {
      readonly tag: "pointPoolResource";
      readonly count: ResourceCount;
      readonly expended: ResourceCount;
    });

export type CharacterSheetSorceryPointPoolResourceState = Extract<
  CharacterSheetResourceState,
  { readonly tag: "pointPoolResource" }
> & {
  readonly unitId: typeof SORCERER_FONT_OF_MAGIC_UNIT_ID;
};

export type CharacterSheetMonksFocusSaveDc = {
  readonly unitId: typeof MONK_MONKS_FOCUS_UNIT_ID;
  readonly dc: DifficultyClass;
};

export type CharacterSheetMonkUncannyMetabolismUseState =
  CharacterBuildMonkUncannyMetabolismFacts & {
    readonly usedSinceLongRest: boolean;
    readonly focusRecovery: CharacterBuildMonkUncannyMetabolismFacts["focusRecovery"] & {
      readonly resourceUnitId: typeof MONK_MONKS_FOCUS_UNIT_ID;
    };
  };

export type CharacterSheetMonkUncannyMetabolismInitiativeInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly martialArtsRoll: DieRollResult;
};

export type CharacterSheetArcaneRecoverySlotRefund = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
};

export type CharacterSheetFontOfMagicSlotToSorceryPointsInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource?: CharacterSheetFontOfMagicSpellSlotSource;
};

export type CharacterSheetFontOfMagicSorceryPointsToSpellSlotInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellLevel: SpellSlotLevel;
};

export type CharacterSheetSorcerousRestorationInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly recoverSorceryPoints: ResourceCount;
};

export type CharacterSheetShortRestStart = {
  readonly tag: "shortRestStarted";
  readonly sheet: CharacterSheet;
  readonly requiredRestTicks: typeof CHARACTER_SHEET_SHORT_REST_TICKS;
  readonly [characterSheetShortRestStartBrand]: true;
};

export type CharacterSheetShortRestStartInput = {
  readonly sheet: CharacterSheet;
};

export type CharacterSheetShortRestCompletion = {
  readonly tag: "shortRestCompleted";
  readonly startedRest: CharacterSheetShortRestStart;
  readonly restedTicks: ElapsedTimeTicks;
  readonly [characterSheetShortRestCompletionBrand]: true;
};

export type CharacterSheetShortRestCompletionInput = {
  readonly rest: CharacterSheetShortRestStart;
  readonly restedTicks: ElapsedTimeTicks;
};

export type CharacterSheetShortRestInput = {
  readonly completion: CharacterSheetShortRestCompletion;
  readonly unitLibrary: UnitCatalog;
  readonly spendHitDice?: readonly CharacterSheetHitDieSpend[];
  readonly arcaneRecovery?: {
    readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
  };
  readonly sorcerousRestoration?: {
    readonly recoverSorceryPoints: ResourceCount;
  };
};

export type CharacterSheetShortRestInterruptionInput = {
  readonly rest: CharacterSheetShortRestStart;
  readonly interruption: CharacterSheetShortRestInterruption;
};

export type CharacterSheetShortRestInterruptionOutcome = {
  readonly tag: "shortRestInterruptedNoBenefit";
  readonly sheet: CharacterSheet;
  readonly interruption: CharacterSheetShortRestInterruption;
};

export type CharacterSheetMagicalCunningInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
};

export type CharacterSheetWeaponMasteryReselection = {
  readonly featureUnitId: UnitRecord["id"];
  readonly selectedWeaponUnitIds: ReadonlyNonEmptyArray<UnitRecord["id"]>;
};

export type CharacterSheetWeaponMasterySelectedReferenceProjectionRoute =
  readonly [
    {
      readonly kind: "retainCharacterSheetSelectedReferences";
      readonly subject: "selectedReferenceProjection";
      readonly owner: "selectedReference";
    },
    {
      readonly kind: "projectCharacterSheetFacts";
      readonly subject: "buildFactsProjection";
      readonly owner: "buildProjection";
    },
  ];

export type CharacterSheetWeaponMasterySelectedReferenceProjection = {
  readonly featureUnitId: UnitRecord["id"];
  readonly classUnitId: UnitRecord["id"];
  readonly selectedWeaponUnitIds: readonly UnitRecord["id"][];
  readonly choiceCount: number;
  readonly longRestChangeCount: number;
  readonly eligibleWeaponUnitIds: readonly UnitRecord["id"][];
  readonly qRoute: CharacterSheetWeaponMasterySelectedReferenceProjectionRoute;
};

export type CharacterSheetLongRestStartTiming =
  | { readonly tag: "noPriorLongRest" }
  | {
      readonly tag: "elapsedSinceLastLongRest";
      readonly elapsedTicks: ElapsedTimeTicks;
    };

export type CharacterSheetLongRestCalendarGate =
  | {
      readonly tag: "canStart";
      readonly requiredWaitTicks: typeof CHARACTER_SHEET_LONG_REST_WAIT_TICKS;
    }
  | {
      readonly tag: "mustWait";
      readonly requiredWaitTicks: typeof CHARACTER_SHEET_LONG_REST_WAIT_TICKS;
      readonly remainingTicks: ElapsedTimeTicks;
    };

export type CharacterSheetLongRestStartInput = {
  readonly sheet: CharacterSheet;
  readonly timing: CharacterSheetLongRestStartTiming;
};

export type CharacterSheetLongRestStart = {
  readonly tag: "longRestStarted";
  readonly sheet: CharacterSheet;
  readonly requiredRestTicks: ElapsedTimeTicks;
  readonly nextLongRestStartWaitTicks: typeof CHARACTER_SHEET_LONG_REST_WAIT_TICKS;
  readonly [characterSheetLongRestStartBrand]: true;
};

export type CharacterSheetLongRestCompletion = {
  readonly tag: "longRestCompleted";
  readonly startedRest: CharacterSheetLongRestStart;
  readonly restedTicks: ElapsedTimeTicks;
  readonly [characterSheetLongRestCompletionBrand]: true;
};

export type CharacterSheetLongRestCompletionInput = {
  readonly rest: CharacterSheetLongRestStart;
  readonly restedTicks: ElapsedTimeTicks;
};

export type CharacterSheetLongRestInput = {
  readonly completion: CharacterSheetLongRestCompletion;
  readonly unitLibrary: UnitCatalog;
  readonly weaponMasteryReselections?: ReadonlyNonEmptyArray<CharacterSheetWeaponMasteryReselection>;
  readonly druidWildShapeKnownFormReplacement?: CharacterSheetDruidWildShapeKnownFormReplacement;
  readonly druidCircleLandChoice?: DruidCircleLandChoice;
  readonly statBlockCatalog?: StatBlockCatalog;
};

export type CharacterSheetWeaponMasteryReselectionAcceptedRoute =
  readonly [
    {
      readonly kind: "retainCharacterSheetSelectedReferences";
      readonly subject: "selectedReferenceProjection";
      readonly owner: "selectedReference";
    },
    {
      readonly kind: "completeCharacterSheetRest";
      readonly subject: "selectedReferenceProjection";
      readonly fill: "projectionSelection";
      readonly holes: readonly [];
      readonly owner: "selectedReference";
    },
  ];

export type CharacterSheetWeaponMasteryReselectionRejectedRoute = readonly [
  {
    readonly kind: "resolveCharacterSheetSubject";
    readonly subject: "selectedReferenceProjection";
    readonly fill: "projectionSelection";
    readonly holes: readonly ["projectionChoice"];
    readonly owner: "selectedReference";
  },
];

export type CharacterSheetWeaponMasteryReselectionRouteResult =
  | {
      readonly tag: "accepted";
      readonly route: "weaponMastery";
      readonly sheet: CharacterSheet;
      readonly qRoute: CharacterSheetWeaponMasteryReselectionAcceptedRoute;
    }
  | {
      readonly tag: "rejected";
      readonly route: "weaponMastery";
      readonly issue: CharacterSheetIssue;
      readonly qRoute: CharacterSheetWeaponMasteryReselectionRejectedRoute;
    }
  | {
      readonly tag: "rejected";
      readonly route: "none";
      readonly issue: CharacterSheetIssue;
      readonly qRoute: readonly [];
    };

export type CharacterSheetLongRestInterruptionInput = {
  readonly rest: CharacterSheetLongRestStart;
  readonly unitLibrary: UnitCatalog;
  readonly restedTicks: ElapsedTimeTicks;
  readonly interruption: CharacterSheetLongRestInterruption;
  readonly spendHitDice?: readonly CharacterSheetHitDieSpend[];
  readonly arcaneRecovery?: {
    readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
  };
  readonly sorcerousRestoration?: {
    readonly recoverSorceryPoints: ResourceCount;
  };
};

export type CharacterSheetLongRestInterruptionOutcome =
  | {
      readonly tag: "longRestInterruptedNoBenefit";
      readonly rest: CharacterSheetLongRestStart;
      readonly interruption: CharacterSheetLongRestInterruption;
      readonly requiredLongRestTicks: ElapsedTimeTicks;
    }
  | {
      readonly tag: "longRestInterruptedWithShortRestBenefits";
      readonly rest: CharacterSheetLongRestStart;
      readonly interruption: CharacterSheetLongRestInterruption;
      readonly requiredLongRestTicks: ElapsedTimeTicks;
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

export type CharacterSheetLayOnHandsRoute = readonly [
  {
    readonly kind: "resolveCharacterSheetSubject";
    readonly subject: "featureResource";
    readonly fill: "resourceSpend";
    readonly holes: readonly [];
    readonly owner: "featureResource";
  },
  {
    readonly kind: "projectCharacterSheetFacts";
    readonly subject: "hitPoint";
    readonly owner: "hitPoint";
  },
  {
    readonly kind: "recordCharacterSheetFacts";
    readonly subject: "featureResource";
    readonly facts: readonly ["featureResourceSpend"];
    readonly owner: "featureResource";
  },
];

export type CharacterSheetLayOnHandsRouteResult =
  CharacterSheetLayOnHandsResult & {
    readonly qRoute: CharacterSheetLayOnHandsRoute;
  };

export type CharacterSheetSpellRestBenefitRecipientEligibility = {
  readonly remainedWithinRangeForEntireCasting: true;
};

export type CharacterSheetSpellRestBenefitRecipient = {
  readonly sheet: CharacterSheet;
  readonly eligibility: CharacterSheetSpellRestBenefitRecipientEligibility;
  readonly healingRolls: readonly DieRollResult[];
  readonly spendHitDice?: readonly CharacterSheetHitDieSpend[];
  readonly arcaneRecovery?: {
    readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
  };
  readonly sorcerousRestoration?: {
    readonly recoverSorceryPoints: ResourceCount;
  };
};

export type CharacterSheetSpellRestBenefitInput = {
  readonly caster: CharacterSheet;
  readonly spellId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotSource?: CharacterSheetFontOfMagicSpellSlotSource;
  readonly recipients: ReadonlyNonEmptyArray<CharacterSheetSpellRestBenefitRecipient>;
};

export type CharacterSheetSpellRestBenefitResult = {
  readonly caster: CharacterSheet;
  readonly recipients: readonly CharacterSheet[];
};

export type CharacterSheetInput = {
  readonly characterId: CharacterSheetId;
  readonly build: CharacterBuild;
  readonly currentHp?: HpType;
  readonly tempHp: HpType;
  readonly hitPointMaximumReduction: HpType;
  readonly conditions: readonly CharacterSheetCondition[];
  readonly unitLibrary: UnitCatalog;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
  readonly spentHitDice?: readonly CharacterSheetSpentHitDiePool[];
  readonly spellSlotExpenditures?: readonly CharacterSpellSlotExpenditure[];
  readonly pactSlots?: CharacterPactSlotExpenditure;
  readonly bookOfShadowsPresence?: CharacterSheetBookOfShadowsPresence;
  readonly restFeatureUses?: readonly CharacterSheetRestFeatureUse[];
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
  readonly heroicInspiration?: CharacterSheetHeroicInspiration;
  readonly companion?: CharacterSheetCompanion;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
  readonly druidCircleLand?: CharacterSheetDruidCircleLand;
  readonly statBlockCatalog?: StatBlockCatalog;
};

export type CharacterSheetPositiveHpUnconscious = {
  readonly tag: "knockedOut";
};

export const CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS = {
  tag: "knockedOut",
} as const satisfies CharacterSheetPositiveHpUnconscious;

export type CharacterSheetPendingDeathSaveCount = Exclude<DeathSaveCount, 3>;

export type CharacterSheetPendingDeathSaves = {
  readonly successes: CharacterSheetPendingDeathSaveCount;
  readonly failures: CharacterSheetPendingDeathSaveCount;
};

export type CharacterSheetDeadDeathSaves = {
  readonly successes: CharacterSheetPendingDeathSaveCount;
  readonly failures: 3;
};

export type CharacterSheetStableZeroHpLifecycle = {
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

export type CharacterSheetHitPointMaximumProjectionRoute = readonly [
  {
    readonly kind: "projectCharacterSheetFacts";
    readonly subject: "hitPoint";
    readonly owner: "hitPoint";
  },
  {
    readonly kind: "recordCharacterSheetFacts";
    readonly subject: "hitPoint";
    readonly facts: readonly ["hitPointMaximumArithmeticInput"];
    readonly owner: "buildProjection";
  },
];

export type CharacterSheetHitPointMaximumProjection = {
  readonly normalHitPointMaximum: HpType;
  readonly effectiveHitPointMaximum: HpType;
  readonly hitPointMaximumReduction: HpType;
  readonly qRoute: CharacterSheetHitPointMaximumProjectionRoute;
};

export type CharacterSheetIssue = {
  readonly tag: "characterSheetIssue";
  readonly message: string;
};

export function characterSheetIssue(
  message: string,
): Either.Either<never, CharacterSheetIssue> {
  return Either.left({ tag: "characterSheetIssue", message });
}

export function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Either.Either<UnitRecord, CharacterSheetIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : characterSheetIssue(`Unknown Unit id: ${unitId}`);
}

export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

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

export type CharacterSheetArmorClassProjectionRoute = readonly [
  {
    readonly kind: "retainCharacterSheetSelectedReferences";
    readonly subject: "selectedReferenceProjection";
    readonly owner: "selectedReference";
  },
  {
    readonly kind: "projectCharacterSheetFacts";
    readonly subject: "armorClassProjection";
    readonly owner: "buildProjection";
  },
];

export type CharacterSheetArmorClassProjection = {
  readonly state: ArmorClassState;
  readonly armorClass: ArmorClass;
  readonly qRoute: CharacterSheetArmorClassProjectionRoute;
};

export type CharacterSheetClassFeatureSelectedReferenceProjectionRoute =
  readonly [
    {
      readonly kind: "retainCharacterSheetSelectedReferences";
      readonly subject: "selectedReferenceProjection";
      readonly owner: "selectedReference";
    },
    {
      readonly kind: "projectCharacterSheetFacts";
      readonly subject: "selectedReferenceProjection";
      readonly owner: "buildProjection";
    },
  ];

export type CharacterSheetClassFeatureSelectedReferenceProjection = {
  readonly classFeatureUnitIds: readonly UnitRecord["id"][];
  readonly selectedClassChoiceUnitIds: readonly UnitRecord["id"][];
  readonly qRoute: CharacterSheetClassFeatureSelectedReferenceProjectionRoute;
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
      readonly sourceUnitId: UnitRecord["id"];
      readonly skill: SurfaceSkill;
      readonly bonus: number;
    };

export const CHARACTER_SHEET_ROUTE_SUBJECTS = [
  "sheetState",
  "hitPoint",
  "rest",
  "featureResource",
  "spellResource",
  "buildFactsProjection",
  "armorClassProjection",
  "abilityCheckProjection",
  "selectedReferenceProjection",
] as const;
export type CharacterSheetRouteSubject =
  (typeof CHARACTER_SHEET_ROUTE_SUBJECTS)[number];

export const CHARACTER_SHEET_ROUTE_HOLES = [
  "hitDiceSpend",
  "restBenefitChoice",
  "resourceSpend",
  "recoveryChoice",
  "projectionChoice",
] as const;
export type CharacterSheetRouteHole =
  (typeof CHARACTER_SHEET_ROUTE_HOLES)[number];

export const CHARACTER_SHEET_ROUTE_FILLS = [
  "hitDiceSpend",
  "restDuration",
  "resourceSpend",
  "recoverySelection",
  "projectionSelection",
] as const;
export type CharacterSheetRouteFill =
  (typeof CHARACTER_SHEET_ROUTE_FILLS)[number];

export const CHARACTER_SHEET_ROUTE_OWNERS = [
  "characterSheetState",
  "hitPoint",
  "hitDice",
  "spellSlot",
  "pactSlot",
  "featureResource",
  "buildProjection",
  "selectedReference",
] as const;
export type CharacterSheetRouteOwner =
  (typeof CHARACTER_SHEET_ROUTE_OWNERS)[number];

export const CHARACTER_SHEET_ROUTE_FACTS = [
  "ordinarySpellSlotDelta",
  "pactSlotDelta",
  "createdSlotExpiry",
  "restBenefitWindow",
  "featureRecoveryState",
  "featureResourceSpend",
  "hitPointMaximumArithmeticInput",
  "spellResourceRejection",
] as const;
export type CharacterSheetRouteFact =
  (typeof CHARACTER_SHEET_ROUTE_FACTS)[number];

export type CharacterSheetRouteEvent =
  | {
      readonly kind: "createCharacterSheet";
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "projectCharacterSheetFacts";
      readonly subject: CharacterSheetRouteSubject;
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "retainCharacterSheetSelectedReferences";
      readonly subject: CharacterSheetRouteSubject;
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "resolveCharacterSheetSubject";
      readonly subject: CharacterSheetRouteSubject;
      readonly fill: CharacterSheetRouteFill;
      readonly holes: readonly CharacterSheetRouteHole[];
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "completeCharacterSheetRest";
      readonly subject: CharacterSheetRouteSubject;
      readonly fill: CharacterSheetRouteFill;
      readonly holes: readonly CharacterSheetRouteHole[];
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "recordCharacterSheetFacts";
      readonly subject: CharacterSheetRouteSubject;
      readonly facts: readonly CharacterSheetRouteFact[];
      readonly owner: CharacterSheetRouteOwner;
    };

export type CharacterSheetAbilityCheckProficiencyBonusRouteEvent = {
  readonly kind: "projectCharacterSheetFacts";
  readonly subject: "abilityCheckProjection";
  readonly owner: "buildProjection";
};

export type CharacterSheetAbilityCheckProficiencyBonusProjection = {
  readonly proficiencyBonus: CharacterSheetAbilityCheckProficiencyBonus;
  readonly qRoute: readonly [
    CharacterSheetAbilityCheckProficiencyBonusRouteEvent,
  ];
};

export type CharacterSheetArcaneRecoveryRestRouteResult =
  | {
      readonly tag: "accepted";
      readonly route: "arcaneRecovery";
      readonly sheet: CharacterSheet;
      readonly qRoute: readonly [CharacterSheetRouteEvent];
    }
  | {
      readonly tag: "accepted";
      readonly route: "none";
      readonly sheet: CharacterSheet;
      readonly qRoute: readonly [];
    }
  | {
      readonly tag: "rejected";
      readonly route: "arcaneRecovery";
      readonly issue: CharacterSheetIssue;
      readonly qRoute: readonly [CharacterSheetRouteEvent];
    }
  | {
      readonly tag: "rejected";
      readonly route: "none";
      readonly issue: CharacterSheetIssue;
      readonly qRoute: readonly [];
    };

export type CharacterSheetAbilityCheckAbilityInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly skill: SurfaceSkill;
  readonly defaultAbility: Ability;
  readonly activeFeatureUnitIds: readonly UnitRecord["id"][];
};

export type CharacterSheetAbilityCheckAbilitySubstitution = {
  readonly ability: Ability;
  readonly sourceUnitId: UnitRecord["id"];
  readonly requiredActiveFeatureUnitId?: UnitRecord["id"];
};

export type CharacterSheetAbilityCheckAbility = {
  readonly defaultAbility: Ability;
  readonly optionalSubstitutions: readonly CharacterSheetAbilityCheckAbilitySubstitution[];
};

export type CharacterSheetJumpDistanceAbilityInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly defaultAbility: Ability;
};

export type CharacterSheetJumpDistanceAbilitySubstitution = {
  readonly ability: Ability;
  readonly replaces: Ability;
  readonly sourceUnitId: UnitRecord["id"];
};

export type CharacterSheetJumpDistanceAbility = {
  readonly defaultAbility: Ability;
  readonly optionalSubstitutions: readonly CharacterSheetJumpDistanceAbilitySubstitution[];
};

export type CharacterSheetLinkedSpeedGrant = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly speedKind: "fly" | "swim" | "climb" | "burrow";
  readonly feet: number | { readonly kind: "walk_speed" };
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

type CharacterSheetSpellbookRitualInvocationRetainRouteEvent = {
  readonly kind: "retainCharacterSheetSelectedReferences";
  readonly subject: "selectedReferenceProjection";
  readonly owner: "selectedReference";
};

type CharacterSheetSpellbookRitualInvocationResolveRouteEvent<
  Holes extends readonly [] | readonly ["projectionChoice"],
> = {
  readonly kind: "resolveCharacterSheetSubject";
  readonly subject: "spellResource";
  readonly fill: "projectionSelection";
  readonly holes: Holes;
  readonly owner: "selectedReference";
};

export type CharacterSheetSpellbookRitualAcceptedInvocationRoute = readonly [
  CharacterSheetSpellbookRitualInvocationRetainRouteEvent,
  {
    readonly kind: "resolveCharacterSheetSubject";
    readonly subject: "spellResource";
    readonly fill: "projectionSelection";
    readonly holes: readonly [];
    readonly owner: "selectedReference";
  },
];

export type CharacterSheetSpellbookRitualRejectedInvocationRoute = readonly [
  CharacterSheetSpellbookRitualInvocationRetainRouteEvent,
  CharacterSheetSpellbookRitualInvocationResolveRouteEvent<
    readonly ["projectionChoice"]
  >,
];

export type CharacterSheetSpellbookRitualInvocationRoute =
  | CharacterSheetSpellbookRitualAcceptedInvocationRoute
  | CharacterSheetSpellbookRitualRejectedInvocationRoute;

export type CharacterSheetSpellbookRitualInvocationProjection =
  | {
      readonly tag: "accepted";
      readonly invocation: CharacterSheetSpellbookRitualInvocation;
      readonly qRoute: CharacterSheetSpellbookRitualAcceptedInvocationRoute;
    }
  | {
      readonly tag: "rejected";
      readonly issue: CharacterSheetIssue;
      readonly qRoute: CharacterSheetSpellbookRitualRejectedInvocationRoute;
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

export type CharacterSheetClassFeaturePreparedSpellAccess = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellIds: readonly UnitRecord["id"][];
};

export type CharacterSheetSpellInvocation =
  | CharacterSheetSpellbookRitualInvocation
  | CharacterSheetBookOfShadowsRitualInvocation;

// AUTHORED-IDENTITY DEBT — not the norm. Matches the hard-coded use-count Unit-id
// support set; the durable form admits via a typed support-profile discriminant
// (the bare resource shape over-admits), not an id list.
export function isCharacterSheetUseCountResourceUnitId(
  unitId: UnitRecord["id"],
): unitId is CharacterSheetUseCountResourceUnitId {
  return CHARACTER_SHEET_USE_COUNT_RESOURCE_UNIT_IDS.some(
    (supportedUnitId) => supportedUnitId === unitId,
  );
}

// AUTHORED-IDENTITY DEBT — not the norm. Matches the hard-coded point-pool Unit-id
// support set; the durable form admits via a typed support-profile discriminant,
// not an id list.
export function isCharacterSheetPointPoolResourceUnitId(
  unitId: UnitRecord["id"],
): unitId is CharacterSheetPointPoolResourceUnitId {
  return CHARACTER_SHEET_POINT_POOL_RESOURCE_UNIT_IDS.some(
    (supportedUnitId) => supportedUnitId === unitId,
  );
}
