// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.cleric-divine-intervention-session-invocation
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  DRUID_WILD_SHAPE_UNIT_ID,
  DRUID_WILD_SHAPE_KNOWN_FORM_ISSUE_CODES,
  MONK_MONKS_FOCUS_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  type CharacterBuild,
  type CharacterBuildDruidWildShapeKnownFormReplacement,
  type DruidWildShapeKnownFormIssue,
  type CharacterBuildHitDiePool,
  type CharacterBuildMonkUncannyMetabolismFacts,
  type CharacterBuildResource,
  type MagicInitiateSpellcastingAbility,
  type UnitCatalog,
} from "../../character-creation-runtime/src/consumer-protocol.ts";
import {
  CONDITIONS,
  type Ability,
  type SurfaceSkill,
} from "@dnd/shared/game-facts";
import {
  type AbilityModifier,
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
} from "@dnd/surface/surface/stat-block-catalog-contract";
import type {
  SpawnedCompanionCreatureTypeOverride,
  SpawnedCompanionCreatureTypeOverrideChoice,
  PactOfTheChainSpawnedCompanionFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  type ChargePoolResource,
  type CreatureType,
  type DamageType,
  type DruidCircleLandChoice,
  type PointPoolResource,
  type RestResetCadence,
  type UnitRecord,
  type UseCountResource,
} from "@dnd/surface/surface/types";
import { Brand, Result, Option, Schema } from "effect";

import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";

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
// discriminant in the authored data, not an id list. Keep additions tied to
// supported Character Sheet resource profiles and focused owner evidence.
// authored-id-dispatch-allow: character-sheet-resource-support-admission-boundary
export const CHARACTER_SHEET_USE_COUNT_RESOURCE_UNIT_IDS = [
  DRUID_WILD_SHAPE_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  // authored-id-dispatch-allow: character-sheet-resource-support-admission-boundary
  authoredUnitId("cleric_divine_intervention"),
  // authored-id-dispatch-allow: character-sheet-resource-support-admission-boundary
  authoredUnitId("ranger_tireless"),
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export type CharacterSheetUseCountResourceUnitId =
  (typeof CHARACTER_SHEET_USE_COUNT_RESOURCE_UNIT_IDS)[number];
// AUTHORED-IDENTITY DEBT — support gate; a tolerated exception, NOT a pattern to
// copy. Enumerates the authored Unit ids whose point-pool resource the sheet tracks
// here. The durable form is a typed support-profile discriminant in the authored
// data, not an id list. Keep additions tied to supported Character Sheet
// resource profiles and focused owner evidence.
// authored-id-dispatch-allow: character-sheet-resource-support-admission-boundary
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
export const COMMUNE_CASTING_REST_FEATURE_TAG =
  "communeCastingSinceLongRest" as const;
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

const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);
export const CharacterSheetIdSchema = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("CharacterId"),
);
export type CharacterSheetId = typeof CharacterSheetIdSchema.Type;

export const characterSheetId: (value: string) => CharacterSheetId =
  CharacterSheetIdSchema.make;

export const CharacterSheetRetainedCompanionId =
  NonEmptyTrimmedStringSchema.pipe(
    Schema.brand("CharacterSheetRetainedCompanionId"),
  );
export type CharacterSheetRetainedCompanionId =
  typeof CharacterSheetRetainedCompanionId.Type;

export function parseCharacterSheetRetainedCompanionId(
  value: string,
): Result.Result<CharacterSheetRetainedCompanionId, CharacterSheetIssue> {
  return Result.mapError(
    Schema.decodeUnknownResult(CharacterSheetRetainedCompanionId)(value),
    () => ({
      tag: "characterSheetIssue",
      message: "Retained companion id must be non-empty and trimmed.",
    }),
  );
}

export type CharacterSheetTelepathicBondTargetId = string &
  Brand.Brand<"CharacterSheetTelepathicBondTargetId">;
const CharacterSheetTelepathicBondTargetId =
  Brand.nominal<CharacterSheetTelepathicBondTargetId>();

export function characterSheetTelepathicBondTargetId(
  value: string,
): Result.Result<CharacterSheetTelepathicBondTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Telepathic Bond target requires target id.")
    : Result.succeed(CharacterSheetTelepathicBondTargetId(value));
}

export type CharacterSheetScryingTargetId = string &
  Brand.Brand<"CharacterSheetScryingTargetId">;
const CharacterSheetScryingTargetId =
  Brand.nominal<CharacterSheetScryingTargetId>();

export function characterSheetScryingTargetId(
  value: string,
): Result.Result<CharacterSheetScryingTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Scrying target requires target id.")
    : Result.succeed(CharacterSheetScryingTargetId(value));
}

export type CharacterSheetScryingLocationId = string &
  Brand.Brand<"CharacterSheetScryingLocationId">;
const CharacterSheetScryingLocationId =
  Brand.nominal<CharacterSheetScryingLocationId>();

export function characterSheetScryingLocationId(
  value: string,
): Result.Result<CharacterSheetScryingLocationId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Scrying location requires location id.")
    : Result.succeed(CharacterSheetScryingLocationId(value));
}

export type CharacterSheetSeemingTargetId = string &
  Brand.Brand<"CharacterSheetSeemingTargetId">;
const CharacterSheetSeemingTargetId =
  Brand.nominal<CharacterSheetSeemingTargetId>();

export function characterSheetSeemingTargetId(
  value: string,
): Result.Result<CharacterSheetSeemingTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Seeming target requires target id.")
    : Result.succeed(CharacterSheetSeemingTargetId(value));
}

export type CharacterSheetDreamTargetId = string &
  Brand.Brand<"CharacterSheetDreamTargetId">;
const CharacterSheetDreamTargetId =
  Brand.nominal<CharacterSheetDreamTargetId>();

export function characterSheetDreamTargetId(
  value: string,
): Result.Result<CharacterSheetDreamTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Dream target requires target id.")
    : Result.succeed(CharacterSheetDreamTargetId(value));
}

export type CharacterSheetDreamMessengerId = string &
  Brand.Brand<"CharacterSheetDreamMessengerId">;
const CharacterSheetDreamMessengerId =
  Brand.nominal<CharacterSheetDreamMessengerId>();

export function characterSheetDreamMessengerId(
  value: string,
): Result.Result<CharacterSheetDreamMessengerId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Dream messenger requires messenger id.")
    : Result.succeed(CharacterSheetDreamMessengerId(value));
}

export type CharacterSheetTeleportationCircleSigilSequenceId = string &
  Brand.Brand<"CharacterSheetTeleportationCircleSigilSequenceId">;
const CharacterSheetTeleportationCircleSigilSequenceId =
  Brand.nominal<CharacterSheetTeleportationCircleSigilSequenceId>();

export function characterSheetTeleportationCircleSigilSequenceId(
  value: string,
): Result.Result<
  CharacterSheetTeleportationCircleSigilSequenceId,
  CharacterSheetIssue
> {
  return value.length === 0
    ? characterSheetIssue(
        "Teleportation Circle destination requires sigil sequence id.",
      )
    : Result.succeed(CharacterSheetTeleportationCircleSigilSequenceId(value));
}

export type CharacterSheetPasswallSurfaceId = string &
  Brand.Brand<"CharacterSheetPasswallSurfaceId">;
const CharacterSheetPasswallSurfaceId =
  Brand.nominal<CharacterSheetPasswallSurfaceId>();

export function characterSheetPasswallSurfaceId(
  value: string,
): Result.Result<CharacterSheetPasswallSurfaceId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Passwall surface requires surface id.")
    : Result.succeed(CharacterSheetPasswallSurfaceId(value));
}

export type CharacterSheetWallOfForceBarrierId = string &
  Brand.Brand<"CharacterSheetWallOfForceBarrierId">;
const CharacterSheetWallOfForceBarrierId =
  Brand.nominal<CharacterSheetWallOfForceBarrierId>();

export function characterSheetWallOfForceBarrierId(
  value: string,
): Result.Result<CharacterSheetWallOfForceBarrierId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Wall of Force barrier requires barrier id.")
    : Result.succeed(CharacterSheetWallOfForceBarrierId(value));
}

export type CharacterSheetAntilifeShellBarrierId = string &
  Brand.Brand<"CharacterSheetAntilifeShellBarrierId">;
const CharacterSheetAntilifeShellBarrierId =
  Brand.nominal<CharacterSheetAntilifeShellBarrierId>();

export function characterSheetAntilifeShellBarrierId(
  value: string,
): Result.Result<CharacterSheetAntilifeShellBarrierId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Antilife Shell barrier requires barrier id.")
    : Result.succeed(CharacterSheetAntilifeShellBarrierId(value));
}

export type CharacterSheetWallOfStoneWallId = string &
  Brand.Brand<"CharacterSheetWallOfStoneWallId">;
const CharacterSheetWallOfStoneWallId =
  Brand.nominal<CharacterSheetWallOfStoneWallId>();

export function characterSheetWallOfStoneWallId(
  value: string,
): Result.Result<CharacterSheetWallOfStoneWallId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Wall of Stone wall requires wall id.")
    : Result.succeed(CharacterSheetWallOfStoneWallId(value));
}

export type CharacterSheetTreeStrideTreeId = string &
  Brand.Brand<"CharacterSheetTreeStrideTreeId">;
const CharacterSheetTreeStrideTreeId =
  Brand.nominal<CharacterSheetTreeStrideTreeId>();

export function characterSheetTreeStrideTreeId(
  value: string,
): Result.Result<CharacterSheetTreeStrideTreeId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Tree Stride tree requires tree id.")
    : Result.succeed(CharacterSheetTreeStrideTreeId(value));
}

export type CharacterSheetTreeStrideTreeKind = string &
  Brand.Brand<"CharacterSheetTreeStrideTreeKind">;
const CharacterSheetTreeStrideTreeKind =
  Brand.nominal<CharacterSheetTreeStrideTreeKind>();

export function characterSheetTreeStrideTreeKind(
  value: string,
): Result.Result<CharacterSheetTreeStrideTreeKind, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Tree Stride tree requires tree kind.")
    : Result.succeed(CharacterSheetTreeStrideTreeKind(value));
}

export type CharacterSheetCreationObjectId = string &
  Brand.Brand<"CharacterSheetCreationObjectId">;
const CharacterSheetCreationObjectId =
  Brand.nominal<CharacterSheetCreationObjectId>();

export function characterSheetCreationObjectId(
  value: string,
): Result.Result<CharacterSheetCreationObjectId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Creation object requires object id.")
    : Result.succeed(CharacterSheetCreationObjectId(value));
}

export type CharacterSheetTelekinesisTargetId = string &
  Brand.Brand<"CharacterSheetTelekinesisTargetId">;
const CharacterSheetTelekinesisTargetId =
  Brand.nominal<CharacterSheetTelekinesisTargetId>();

export function characterSheetTelekinesisTargetId(
  value: string,
): Result.Result<CharacterSheetTelekinesisTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Telekinesis target requires target id.")
    : Result.succeed(CharacterSheetTelekinesisTargetId(value));
}

export type CharacterSheetArcaneHandObjectId = string &
  Brand.Brand<"CharacterSheetArcaneHandObjectId">;
const CharacterSheetArcaneHandObjectId =
  Brand.nominal<CharacterSheetArcaneHandObjectId>();

export function characterSheetArcaneHandObjectId(
  value: string,
): Result.Result<CharacterSheetArcaneHandObjectId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Arcane Hand object requires object id.")
    : Result.succeed(CharacterSheetArcaneHandObjectId(value));
}

export type CharacterSheetSpellLifecycleObjectId = string &
  Brand.Brand<"CharacterSheetSpellLifecycleObjectId">;
const CharacterSheetSpellLifecycleObjectId =
  Brand.nominal<CharacterSheetSpellLifecycleObjectId>();

export function characterSheetSpellLifecycleObjectId(
  value: string,
): Result.Result<CharacterSheetSpellLifecycleObjectId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Spell lifecycle object requires object id.")
    : Result.succeed(CharacterSheetSpellLifecycleObjectId(value));
}

export type CharacterSheetSpellLifecycleCreatureId = string &
  Brand.Brand<"CharacterSheetSpellLifecycleCreatureId">;
const CharacterSheetSpellLifecycleCreatureId =
  Brand.nominal<CharacterSheetSpellLifecycleCreatureId>();

export function characterSheetSpellLifecycleCreatureId(
  value: string,
): Result.Result<CharacterSheetSpellLifecycleCreatureId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Spell lifecycle creature requires creature id.")
    : Result.succeed(CharacterSheetSpellLifecycleCreatureId(value));
}

export type CharacterSheetHallowAreaId = string &
  Brand.Brand<"CharacterSheetHallowAreaId">;
const CharacterSheetHallowAreaId = Brand.nominal<CharacterSheetHallowAreaId>();

export function characterSheetHallowAreaId(
  value: string,
): Result.Result<CharacterSheetHallowAreaId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Hallow area requires area id.")
    : Result.succeed(CharacterSheetHallowAreaId(value));
}

export type CharacterSheetAwakenTargetId = string &
  Brand.Brand<"CharacterSheetAwakenTargetId">;
const CharacterSheetAwakenTargetId =
  Brand.nominal<CharacterSheetAwakenTargetId>();

export function characterSheetAwakenTargetId(
  value: string,
): Result.Result<CharacterSheetAwakenTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Awaken target requires target id.")
    : Result.succeed(CharacterSheetAwakenTargetId(value));
}

export type CharacterSheetGeasTargetId = string &
  Brand.Brand<"CharacterSheetGeasTargetId">;
const CharacterSheetGeasTargetId = Brand.nominal<CharacterSheetGeasTargetId>();

export function characterSheetGeasTargetId(
  value: string,
): Result.Result<CharacterSheetGeasTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Geas target requires target id.")
    : Result.succeed(CharacterSheetGeasTargetId(value));
}

export type CharacterSheetDominatePersonTargetId = string &
  Brand.Brand<"CharacterSheetDominatePersonTargetId">;
const CharacterSheetDominatePersonTargetId =
  Brand.nominal<CharacterSheetDominatePersonTargetId>();

export function characterSheetDominatePersonTargetId(
  value: string,
): Result.Result<CharacterSheetDominatePersonTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Dominate Person target requires target id.")
    : Result.succeed(CharacterSheetDominatePersonTargetId(value));
}

export type CharacterSheetModifyMemoryTargetId = string &
  Brand.Brand<"CharacterSheetModifyMemoryTargetId">;
const CharacterSheetModifyMemoryTargetId =
  Brand.nominal<CharacterSheetModifyMemoryTargetId>();

export function characterSheetModifyMemoryTargetId(
  value: string,
): Result.Result<CharacterSheetModifyMemoryTargetId, CharacterSheetIssue> {
  return value.length === 0
    ? characterSheetIssue("Modify Memory target requires target id.")
    : Result.succeed(CharacterSheetModifyMemoryTargetId(value));
}

export type CharacterSheetCompanionCreatureTypeOverride =
  SpawnedCompanionCreatureTypeOverride;

export type CharacterSheetCompanionFormSelection =
  PactOfTheChainSpawnedCompanionFormSelection;

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
  readonly creatureTypeOverrideChoiceId?: SpawnedCompanionCreatureTypeOverrideChoice["optionId"];
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

export type CharacterSheetFiendishResilience = {
  readonly damageType: DamageType;
};

export type CharacterSheetNatureWard = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly conditionImmunities: readonly ["poisoned"];
  readonly resistance: {
    readonly damageType: DamageType;
    readonly land: DruidCircleLandChoice;
  };
};

export type CharacterSheetAuraOfCourage = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly conditionImmunities: readonly ["frightened"];
  readonly auraMembershipSource: {
    readonly kind: "auraOfProtection";
    readonly condition: "frightened";
  };
};

export type CharacterSheetSelfRestoration = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly turnEndRemovableConditions: readonly [
    "charmed",
    "frightened",
    "poisoned",
  ];
  readonly foodAndDrinkExhaustionPrevented: true;
};

export type CharacterSheetEmpoweredEvocation = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellSourceUnitId: UnitRecord["id"];
  readonly school: "evocation";
  readonly damageRollAbility: "int";
  readonly damageRollCount: 1;
  readonly damageRollModifier: AbilityModifier;
};

export type CharacterSheetPassiveDefenseProjection = {
  readonly damageResistances: readonly DamageType[];
  readonly conditionImmunities: readonly CharacterSheetCondition[];
  readonly auraOfCourage?: CharacterSheetAuraOfCourage;
  readonly selfRestoration?: CharacterSheetSelfRestoration;
  readonly fiendishResilience?: CharacterSheetFiendishResilience;
  readonly naturesWard?: CharacterSheetNatureWard;
};

export const CHARACTER_SHEET_EXHAUSTION_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;
export type CharacterSheetExhaustionLevel =
  (typeof CHARACTER_SHEET_EXHAUSTION_LEVELS)[number];

export type CharacterSheet =
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: SpellcastingCharacterBuild;
      readonly hitPointMaximumReduction: HpType;
      readonly exhaustionLevel: CharacterSheetExhaustionLevel;
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
      readonly fiendishResilience?: CharacterSheetFiendishResilience;
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
      readonly createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[];
      readonly pactSlotExpenditure: CharacterPactSlotExpenditure | undefined;
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterSheetId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly hitPointMaximumReduction: HpType;
      readonly exhaustionLevel: CharacterSheetExhaustionLevel;
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
      readonly fiendishResilience?: CharacterSheetFiendishResilience;
      readonly spellSlotExpenditures?: never;
      readonly createdSpellSlots?: never;
      readonly pactSlotExpenditure?: never;
    };

export const CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES = [
  "hitPointStateInvalid",
  "temporaryHitPointsNotZero",
  "hitPointMaximumReductionNotZero",
  "exhaustionNotZero",
  "conditionsNotEmpty",
  "spentHitDiceNotEmpty",
  "restFeatureUsesNotEmpty",
  "resourceExpendituresNotEmpty",
  "heroicInspirationNotEmpty",
  "spellSlotStateUnexpected",
  "spellSlotStateInvalid",
  "pactSlotStateUnexpected",
  "pactSlotStateInvalid",
  "bookOfShadowsPresenceInvalid",
  "wildShapeKnownFormsUnexpected",
  "wildShapeKnownFormsRequired",
  "wildShapeStatBlockCatalogRequired",
  "wildShapeKnownFormsInvalid",
  "druidCircleLandInvalid",
  "fiendishResilienceInvalid",
] as const;
export const CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES = [
  ...CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES,
  ...DRUID_WILD_SHAPE_KNOWN_FORM_ISSUE_CODES,
] as const;

export type CharacterSheetConstructionIssue =
  | {
      readonly code: Exclude<
        (typeof CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES)[number],
        DruidWildShapeKnownFormIssue["code"]
      >;
    }
  | DruidWildShapeKnownFormIssue;

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
    }
  | {
      readonly tag: typeof COMMUNE_CASTING_REST_FEATURE_TAG;
      readonly usedSinceLongRest: true;
      readonly castCount: ResourceCount;
    };

export type CharacterSheetTaggedResourceExpenditure = {
  readonly tag: "layOnHandsHealingPool";
  readonly expended: ResourceCount;
};

export type CharacterSheetSpellAccessFreeCastKey = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellId: UnitRecord["id"];
};

export type CharacterSheetSpellAccessFreeCastExpenditure =
  CharacterSheetSpellAccessFreeCastKey & {
    readonly tag: "spellAccessFreeCast";
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
  | CharacterSheetSpellAccessFreeCastExpenditure
  | CharacterSheetUseCountResourceExpenditure
  | CharacterSheetPointPoolResourceExpenditure;

export type CharacterSheetLayOnHandsResource = CharacterBuildResource & {
  readonly unitId: UnitRecord["id"];
  readonly resource: ChargePoolResource;
};

export type CharacterSheetSpellAccessFreeCastResource =
  CharacterSheetSpellAccessFreeCastKey & {
    readonly tag: "spellAccessFreeCast";
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
  | (CharacterSheetSpellAccessFreeCastResource & {
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
  readonly fiendishResilienceDamageType?: DamageType;
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
  readonly fiendishResilienceDamageType?: DamageType;
  readonly statBlockCatalog?: StatBlockCatalog;
};

export type CharacterSheetWeaponMasteryReselectionAcceptedRoute = readonly [
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
  readonly timing: {
    readonly cumulativeRestedTicks: ElapsedTimeTicks;
    readonly elapsedSincePreviousInterruptionTicks: ElapsedTimeTicks;
  };
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

type CharacterSheetInputFacts = {
  readonly characterId: CharacterSheetId;
  readonly build: CharacterBuild;
  readonly currentHp?: HpType;
  readonly tempHp: HpType;
  readonly hitPointMaximumReduction: HpType;
  readonly exhaustionLevel?: CharacterSheetExhaustionLevel;
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
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
  readonly druidCircleLand?: CharacterSheetDruidCircleLand;
  readonly fiendishResilience?: CharacterSheetFiendishResilience;
  readonly statBlockCatalog?: StatBlockCatalog;
};

export type CharacterSheetInput = CharacterSheetInputFacts;

export type CharacterSheetRebuildInput = CharacterSheetInputFacts & {
  readonly companion: CharacterSheetCompanion;
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

export const WILD_SHAPE_STAT_BLOCK_CATALOG_REQUIRED_MESSAGE =
  "Wild Shape known forms require a valid SRD Stat Block catalog.";

type CharacterSheetMessageIssue = {
  readonly tag: "characterSheetIssue";
  readonly code?: never;
  readonly message: string;
};

export type CharacterSheetWildShapeStatBlockCatalogRequiredIssue = {
  readonly tag: "characterSheetIssue";
  readonly code: "wildShapeStatBlockCatalogRequired";
  readonly message: typeof WILD_SHAPE_STAT_BLOCK_CATALOG_REQUIRED_MESSAGE;
};

export type CharacterSheetIssue =
  | CharacterSheetMessageIssue
  | CharacterSheetWildShapeStatBlockCatalogRequiredIssue;

export function characterSheetIssue(
  message: string,
): Result.Result<never, CharacterSheetMessageIssue> {
  return Result.fail({ tag: "characterSheetIssue", message });
}

export function wildShapeStatBlockCatalogRequiredIssue(): Result.Result<
  never,
  CharacterSheetWildShapeStatBlockCatalogRequiredIssue
> {
  return Result.fail({
    tag: "characterSheetIssue",
    code: "wildShapeStatBlockCatalogRequired",
    message: WILD_SHAPE_STAT_BLOCK_CATALOG_REQUIRED_MESSAGE,
  });
}

export function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Result.Result<UnitRecord, CharacterSheetIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Result.succeed(unit.value)
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
  readonly spell: CharacterSheetSpellSource;
  readonly spellcastingSourceUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
};

export type CharacterSheetSpellbookRitualInvocation = {
  readonly tag: "spellbookRitual";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
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
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellcastingSourceUnitId: UnitRecord["id"];
  readonly spellSlotCost: { readonly kind: "none" };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "bookOfShadows";
  readonly additionalCastingTimeMinutes: typeof RITUAL_ADDITIONAL_CASTING_TIME_MINUTES;
  readonly requiresBookOfShadowsOnPerson: true;
};

export type CharacterSheetContactPatronInvocation = {
  readonly tag: "contactPatron";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly featureUnitId: UnitRecord["id"];
  readonly freeCastResource: CharacterSheetSpellAccessFreeCastKey;
  readonly spellSlotCost: { readonly kind: "none" };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_feature";
  readonly savingThrow: {
    readonly ability: Ability;
    readonly dc: DifficultyClass;
    readonly outcome: "automatic_success";
    readonly scope: "patron_contact";
  };
  readonly questions: {
    readonly count: PositiveInteger;
    readonly answerOwner: "gm";
    readonly primaryAnswer: "one_word";
    readonly unknownAnswer: "unclear";
    readonly misleadingAnswerFallback: "short_phrase_if_one_word_misleading";
    readonly window: TimeSpanDuration;
  };
};

export type CharacterSheetContactPatronResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetContactPatronInvocation;
};

export type CharacterSheetDivineInterventionInvocation = {
  readonly tag: "divineIntervention";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly featureUnitId: UnitRecord["id"];
  readonly spellList: "cleric";
  readonly activationAction: "magic";
  readonly spellSlotCost: { readonly kind: "none" };
  readonly materialComponentRequirement: {
    readonly kind: "not_required_by_feature";
    readonly suppressesSpellMaterialComponents: true;
  };
  readonly preparationRequirement: "not_required";
  readonly requiredSpellAccess: "class_spell_list";
  readonly castingTime: { readonly kind: "action" };
};

export type CharacterSheetDivineInterventionResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetDivineInterventionInvocation;
};

export type CharacterSheetCommuneInvocation = {
  readonly tag: "commune";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly questions: {
    readonly count: PositiveInteger;
    readonly answerOwner: "gm";
    readonly primaryAnswer: "yes_no";
    readonly unknownAnswer: "unclear";
    readonly misleadingAnswerFallback: "short_phrase_if_one_word_misleading";
    readonly window: TimeSpanDuration;
  };
  readonly repeatedCasting: {
    readonly previousCastCountSinceLongRest: ResourceCount;
    readonly noAnswerChancePercent: number;
  };
};

export type CharacterSheetCommuneResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetCommuneInvocation;
};

export type CharacterSheetCommuneWithNatureFactCategory =
  | "settlements"
  | "planar_portals"
  | "powerful_creatures"
  | "plants_minerals_beasts"
  | "bodies_of_water";

export type CharacterSheetCommuneWithNatureInvocation = {
  readonly tag: "communeWithNature";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly facts: {
    readonly count: PositiveInteger;
    readonly answerOwner: "gm";
    readonly scope: {
      readonly outdoorsRadiusMiles: number;
      readonly naturalUndergroundRadiusFeet: number;
      readonly blockedWhenNatureReplacedByConstruction: true;
    };
    readonly categories: readonly CharacterSheetCommuneWithNatureFactCategory[];
  };
};

export type CharacterSheetCommuneWithNatureResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetCommuneWithNatureInvocation;
};

export const LEGEND_LORE_SUBJECT_KIND_VALUES = [
  "person",
  "place",
  "object",
] as const;
export type CharacterSheetLegendLoreSubjectKind =
  (typeof LEGEND_LORE_SUBJECT_KIND_VALUES)[number];
export const LEGEND_LORE_PRIOR_KNOWLEDGE_VALUES = [
  "none",
  "some",
  "detailed",
] as const;
export type CharacterSheetLegendLorePriorKnowledge =
  (typeof LEGEND_LORE_PRIOR_KNOWLEDGE_VALUES)[number];
export const LEGEND_LORE_MATERIAL_COMPONENTS = {
  consumedIncenseCostGp: 250,
  ivoryStripCount: 4,
  ivoryStripCostGpEach: 50,
} as const;
export type CharacterSheetLegendLoreMaterialComponents =
  typeof LEGEND_LORE_MATERIAL_COMPONENTS;
export type CharacterSheetLegendLoreCasting = {
  readonly tag: "completedLegendLoreCasting";
  readonly materialComponents: CharacterSheetLegendLoreMaterialComponents;
};
export type CharacterSheetLegendLoreSubject =
  | {
      readonly tag: "famous";
      readonly subjectKind: CharacterSheetLegendLoreSubjectKind;
      readonly description: string;
      readonly priorKnowledge: CharacterSheetLegendLorePriorKnowledge;
    }
  | {
      readonly tag: "notFamous";
      readonly subjectKind: CharacterSheetLegendLoreSubjectKind;
      readonly description: string;
    };
export type CharacterSheetLegendLoreOutcome =
  | {
      readonly tag: "gmSummary";
      readonly answerOwner: "gm";
      readonly accuracy: "accurate";
      readonly expression: "literal_or_figurative_poetic";
      readonly precisionBasis: CharacterSheetLegendLorePriorKnowledge;
    }
  | {
      readonly tag: "notFamousFailure";
      readonly answerOwner: "gm";
      readonly signal: "sad_trombone_notes";
    };
export type CharacterSheetLegendLoreInvocation = {
  readonly tag: "legendLore";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "minutes";
    readonly amount: 10;
  };
  readonly materialComponents: CharacterSheetLegendLoreMaterialComponents;
  readonly subject: CharacterSheetLegendLoreSubject;
  readonly lore: CharacterSheetLegendLoreOutcome;
};
export type CharacterSheetLegendLoreResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetLegendLoreInvocation;
};

export type CharacterSheetTelepathicBondTarget = {
  readonly targetId: CharacterSheetTelepathicBondTargetId;
  readonly willing: true;
  readonly withinRangeFeet: 30;
  readonly canCommunicateInLanguage: true;
  readonly plane: "same_plane_as_caster";
};
export type CharacterSheetTelepathicBondInvocation = {
  readonly tag: "telepathicBond";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly ritualAvailable: true;
  readonly rangeFeet: 30;
  readonly targetLimit: PositiveInteger;
  readonly duration: TimeSpanDuration;
  readonly targets: readonly CharacterSheetTelepathicBondTarget[];
  readonly communication: {
    readonly answerOwner: "session";
    readonly sharedLanguageRequired: false;
    readonly distanceLimit: "any_distance_same_plane";
    readonly otherPlanesExcluded: true;
  };
};
export type CharacterSheetTelepathicBondResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetTelepathicBondInvocation;
};

export const SCRYING_TARGET_KNOWLEDGE_FACTS = [
  { tag: "secondhand", saveModifier: 5 },
  { tag: "firsthand", saveModifier: 0 },
  { tag: "extensive", saveModifier: -5 },
] as const;
export type CharacterSheetScryingTargetKnowledge =
  (typeof SCRYING_TARGET_KNOWLEDGE_FACTS)[number];
export const SCRYING_TARGET_CONNECTION_FACTS = [
  {
    tag: "none",
    objectChoice: "none",
    saveModifier: 0,
  },
  {
    tag: "pictureOrOtherLikeness",
    objectChoice: "picture_or_other_likeness",
    saveModifier: -2,
  },
  {
    tag: "garmentOrOtherPossession",
    objectChoice: "garment_or_other_possession",
    saveModifier: -4,
  },
  {
    tag: "bodyPartLockOfHairOrBitOfNail",
    objectChoice: "body_part_lock_of_hair_or_bit_of_nail",
    saveModifier: -10,
  },
] as const;
export type CharacterSheetScryingTargetConnection =
  (typeof SCRYING_TARGET_CONNECTION_FACTS)[number];
export type CharacterSheetScryingSavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetScryingCreatureTarget = {
  readonly tag: "creature";
  readonly targetId: CharacterSheetScryingTargetId;
  readonly plane: "same_plane_as_caster";
  readonly knowledge: CharacterSheetScryingTargetKnowledge;
  readonly connection: CharacterSheetScryingTargetConnection;
  readonly savingThrowOutcome: CharacterSheetScryingSavingThrowOutcome;
};
export type CharacterSheetScryingLocationTarget = {
  readonly tag: "location";
  readonly locationId: CharacterSheetScryingLocationId;
  readonly seenByCaster: true;
};
export type CharacterSheetScryingTarget =
  | CharacterSheetScryingCreatureTarget
  | CharacterSheetScryingLocationTarget;
export const SCRYING_MATERIAL_COMPONENTS = {
  focusCostGpMinimum: 1000,
  consumed: false,
  focusExamples: ["crystal_ball", "mirror", "water_filled_font"],
} as const;
export type CharacterSheetScryingMaterialComponents =
  typeof SCRYING_MATERIAL_COMPONENTS;
export type CharacterSheetScryingCasting = {
  readonly tag: "completedScryingCasting";
  readonly materialComponents: CharacterSheetScryingMaterialComponents;
};
export type CharacterSheetScryingSensor =
  | {
      readonly tag: "movingWithCreatureTarget";
      readonly visibility: "invisible";
      readonly tangibility: "intangible";
      readonly maxDistanceFromTargetFeet: 10;
      readonly casterPerception: "see_and_hear_as_if_there";
      readonly visibleAppearance: "fist_sized_luminous_orb";
      readonly remoteContentsOwner: "table";
      readonly specialSenseVisibilityOwner: "table";
      readonly mapPlacementOwner: "table";
    }
  | {
      readonly tag: "stationaryAtSeenLocation";
      readonly visibility: "invisible";
      readonly tangibility: "intangible";
      readonly casterPerception: "see_and_hear_as_if_there";
      readonly visibleAppearance: "fist_sized_luminous_orb";
      readonly remoteContentsOwner: "table";
      readonly specialSenseVisibilityOwner: "table";
      readonly mapPlacementOwner: "table";
    };
export type CharacterSheetScryingOutcome =
  | {
      readonly tag: "creatureSaveSucceeded";
      readonly targetAffected: false;
      readonly retryLockout: {
        readonly targetId: CharacterSheetScryingTargetId;
        readonly duration: TimeSpanDuration;
      };
    }
  | {
      readonly tag: "creatureSaveFailed";
      readonly sensor: Extract<
        CharacterSheetScryingSensor,
        { readonly tag: "movingWithCreatureTarget" }
      >;
    }
  | {
      readonly tag: "locationSensor";
      readonly sensor: Extract<
        CharacterSheetScryingSensor,
        { readonly tag: "stationaryAtSeenLocation" }
      >;
    };
export type CharacterSheetScryingInvocation = {
  readonly tag: "scrying";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "minutes";
    readonly amount: 10;
  };
  readonly materialComponents: CharacterSheetScryingMaterialComponents;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly target: CharacterSheetScryingTarget;
  readonly savingThrow:
    | {
        readonly tag: "requiredForCreatureTarget";
        readonly ability: "wis";
        readonly dc: "caster_spell_save_dc";
        readonly targetAwareness: "feels_uneasy_without_knowing_source";
        readonly knowledge: CharacterSheetScryingTargetKnowledge;
        readonly connection: CharacterSheetScryingTargetConnection;
      }
    | {
        readonly tag: "notRequiredForSeenLocation";
      };
  readonly outcome: CharacterSheetScryingOutcome;
};
export type CharacterSheetScryingResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetScryingInvocation;
};

export const SEEMING_HEIGHT_CHANGE_FEET_VALUES = [-1, 0, 1] as const;
export type CharacterSheetSeemingHeightChangeFeet =
  (typeof SEEMING_HEIGHT_CHANGE_FEET_VALUES)[number];
export const SEEMING_APPARENT_WEIGHT_CHANGE_VALUES = [
  "lighter",
  "unchanged",
  "heavier",
] as const;
export type CharacterSheetSeemingApparentWeightChange =
  (typeof SEEMING_APPARENT_WEIGHT_CHANGE_VALUES)[number];
export type CharacterSheetSeemingAppearance = {
  readonly bodyAndEquipmentAppearance: "changed";
  readonly heightChangeFeet: CharacterSheetSeemingHeightChangeFeet;
  readonly apparentWeightChange: CharacterSheetSeemingApparentWeightChange;
  readonly sameBasicArrangementOfLimbs: true;
  readonly appearanceDetailOwner: "session";
};
export type CharacterSheetSeemingSavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetSeemingWillingTarget = {
  readonly targetId: CharacterSheetSeemingTargetId;
  readonly willingness: "willing";
  readonly visibleByCaster: true;
  readonly withinRangeFeet: 30;
  readonly appearance: CharacterSheetSeemingAppearance;
};
export type CharacterSheetSeemingUnwillingTarget = {
  readonly targetId: CharacterSheetSeemingTargetId;
  readonly willingness: "unwilling";
  readonly visibleByCaster: true;
  readonly withinRangeFeet: 30;
  readonly savingThrowOutcome: CharacterSheetSeemingSavingThrowOutcome;
  readonly appearance: CharacterSheetSeemingAppearance;
};
export type CharacterSheetSeemingTarget =
  | CharacterSheetSeemingWillingTarget
  | CharacterSheetSeemingUnwillingTarget;
export type CharacterSheetSeemingTargetOutcome =
  | {
      readonly tag: "targetDisguised";
      readonly targetId: CharacterSheetSeemingTargetId;
      readonly saveRequired: false;
      readonly appearance: CharacterSheetSeemingAppearance;
    }
  | {
      readonly tag: "unwillingSaveFailed";
      readonly targetId: CharacterSheetSeemingTargetId;
      readonly saveRequired: true;
      readonly appearance: CharacterSheetSeemingAppearance;
    }
  | {
      readonly tag: "unwillingSaveSucceeded";
      readonly targetId: CharacterSheetSeemingTargetId;
      readonly saveRequired: true;
      readonly affected: false;
    };
export type CharacterSheetSeemingInvocation = {
  readonly tag: "seeming";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly rangeFeet: 30;
  readonly duration: TimeSpanDuration;
  readonly targets: readonly CharacterSheetSeemingTarget[];
  readonly savingThrow: {
    readonly tag: "unwillingTargetsOnly";
    readonly ability: "cha";
    readonly dc: "caster_spell_save_dc";
  };
  readonly illusion: {
    readonly channels: readonly ["visual"];
    readonly sameOrDifferentAppearancesAllowed: true;
    readonly changesBodiesAndEquipment: true;
    readonly maxHeightChangeFeet: 1;
    readonly sameBasicArrangementOfLimbsRequired: true;
    readonly physicalInspection: {
      readonly failsToHoldUp: true;
      readonly objectsPassThroughAddedAppearance: true;
    };
    readonly studyReveal: {
      readonly action: "study";
      readonly ability: "int";
      readonly skill: "investigation";
      readonly dc: "caster_spell_save_dc";
      readonly success: "aware_target_is_disguised";
    };
    readonly targetAppearanceRenderingOwner: "table";
    readonly ongoingPerceptionAdjudicationOwner: "table";
  };
  readonly outcomes: readonly CharacterSheetSeemingTargetOutcome[];
};
export type CharacterSheetSeemingResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetSeemingInvocation;
};

export const DREAM_MATERIAL_COMPONENTS = {
  sand: "handful",
} as const;
export type CharacterSheetDreamMaterialComponents =
  typeof DREAM_MATERIAL_COMPONENTS;
export type CharacterSheetDreamCasting = {
  readonly tag: "completedDreamCasting";
  readonly materialComponents: CharacterSheetDreamMaterialComponents;
};
export type CharacterSheetDreamTarget = {
  readonly targetId: CharacterSheetDreamTargetId;
  readonly knownByCaster: true;
  readonly plane: "same_plane_as_caster";
  readonly sleepStateOwner: "table";
};
export type CharacterSheetDreamMessenger =
  | {
      readonly tag: "caster";
    }
  | {
      readonly tag: "willingTouchedCreature";
      readonly messengerId: CharacterSheetDreamMessengerId;
      readonly willing: true;
      readonly touchedByCaster: true;
    };
export type CharacterSheetDreamNightmare = {
  readonly tag: "nightmare";
  readonly messageWordCount: number;
  readonly savingThrowOutcome:
    | { readonly tag: "succeeded" }
    | { readonly tag: "failed" };
};
export type CharacterSheetDreamMode =
  | {
      readonly tag: "conversation";
    }
  | CharacterSheetDreamNightmare;
export type CharacterSheetDreamOutcome =
  | {
      readonly tag: "conversation";
      readonly targetRecall: "perfect_on_waking";
      readonly dreamContentsOwner: "table";
      readonly dreamDeliveryOwner: "table";
    }
  | {
      readonly tag: "nightmareSaveSucceeded";
      readonly restBenefitDenied: false;
      readonly damage: null;
    }
  | {
      readonly tag: "nightmareSaveFailed";
      readonly restBenefitDenied: {
        readonly timing: "target_rest";
        readonly stateMutationOwner: "table";
      };
      readonly damage: {
        readonly diceCount: 3;
        readonly dieSize: 6;
        readonly damageType: "psychic";
        readonly timing: "when_target_wakes";
        readonly applicationOwner: "table";
      };
    };
export type CharacterSheetDreamInvocation = {
  readonly tag: "dream";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "minutes";
    readonly amount: 1;
  };
  readonly range: "special";
  readonly duration: TimeSpanDuration;
  readonly materialComponents: CharacterSheetDreamMaterialComponents;
  readonly target: CharacterSheetDreamTarget;
  readonly messenger: CharacterSheetDreamMessenger;
  readonly trance: {
    readonly messengerCondition: "incapacitated";
    readonly messengerSpeedFeet: 0;
    readonly messengerCanEndAnyTime: true;
  };
  readonly targetSleepContract: {
    readonly targetMustBeSamePlaneCreatureKnownByCaster: true;
    readonly sleepStateOwner: "table";
    readonly awakeAtCastOptions: readonly ["end_spell", "wait_for_sleep"];
  };
  readonly messengerAppearance: {
    readonly owner: "table";
  };
  readonly mode: CharacterSheetDreamMode;
  readonly savingThrow:
    | {
        readonly tag: "notRequiredForConversation";
      }
    | {
        readonly tag: "requiredForNightmare";
        readonly ability: "wis";
        readonly dc: "caster_spell_save_dc";
        readonly maxMessageWords: 10;
      };
  readonly outcome: CharacterSheetDreamOutcome;
};
export type CharacterSheetDreamResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetDreamInvocation;
};

export const AWAKEN_MATERIAL_COMPONENTS = {
  agateCostGpMinimum: 1000,
  consumed: true,
} as const;
export type CharacterSheetAwakenMaterialComponents =
  typeof AWAKEN_MATERIAL_COMPONENTS;
export type CharacterSheetAwakenCasting = {
  readonly tag: "completedAwakenCasting";
  readonly materialComponents: CharacterSheetAwakenMaterialComponents;
};
export type CharacterSheetAwakenTarget =
  | {
      readonly tag: "beastOrPlantCreature";
      readonly targetId: CharacterSheetAwakenTargetId;
      readonly creatureType: "beast" | "plant";
      readonly intelligenceScore: number;
      readonly languageGranted: string;
    }
  | {
      readonly tag: "naturalPlant";
      readonly targetId: CharacterSheetAwakenTargetId;
      readonly languageGranted: string;
    };
export type CharacterSheetAwakenTransformation = {
  readonly intelligenceScore: 10;
  readonly language: {
    readonly source: "one_language_the_caster_knows";
    readonly selectedLanguage: string;
  };
  readonly naturalPlantCreatureChange:
    | {
        readonly applies: true;
        readonly creatureType: "plant";
        readonly gainsMovement: true;
        readonly gainsHumanlikeSenses: true;
        readonly statisticsOwner: "gm-table";
        readonly suggestedStatistics: readonly [
          "awakened_shrub",
          "awakened_tree",
        ];
      }
    | {
        readonly applies: false;
      };
};
export type CharacterSheetAwakenCharmContract = {
  readonly condition: "charmed";
  readonly duration: TimeSpanDuration;
  readonly endsIfCasterOrAlliesDamageTarget: true;
  readonly attitudeAfterConditionEndsOwner: "gm-table";
};
export type CharacterSheetAwakenInvocation = {
  readonly tag: "awaken";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "hours";
    readonly amount: 8;
  };
  readonly range: "touch";
  readonly materialComponents: CharacterSheetAwakenMaterialComponents;
  readonly target: CharacterSheetAwakenTarget;
  readonly transformation: CharacterSheetAwakenTransformation;
  readonly charm: CharacterSheetAwakenCharmContract;
  readonly tableStateOwners: readonly [
    "stat-block-or-creature-conversion",
    "world-plant-object-mutation",
    "social-attitude-after-charm",
  ];
};
export type CharacterSheetAwakenResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetAwakenInvocation;
};

export type CharacterSheetGeasSavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetGeasTarget =
  | {
      readonly targetId: CharacterSheetGeasTargetId;
      readonly visibleByCaster: true;
      readonly withinRangeFeet: 60;
      readonly understandsCommand: true;
      readonly savingThrowOutcome: CharacterSheetGeasSavingThrowOutcome;
    }
  | {
      readonly targetId: CharacterSheetGeasTargetId;
      readonly visibleByCaster: true;
      readonly withinRangeFeet: 60;
      readonly understandsCommand: false;
    };
export type CharacterSheetGeasCommand =
  | {
      readonly tag: "validCommand";
      readonly commandText: string;
      readonly certainDeath: false;
      readonly adjudicationOwner: "table";
    }
  | {
      readonly tag: "suicidalCommand";
      readonly commandText: string;
      readonly certainDeath: true;
      readonly adjudicationOwner: "table";
    };
export type CharacterSheetGeasOutcome =
  | {
      readonly tag: "spellEndedBySuicidalCommand";
      readonly affected: false;
      readonly endReason: "suicidal_command";
      readonly adjudicationOwner: "table";
    }
  | {
      readonly tag: "targetCannotUnderstandCommand";
      readonly affected: false;
      readonly automaticSuccess: true;
    }
  | {
      readonly tag: "savingThrowSucceeded";
      readonly affected: false;
    }
  | {
      readonly tag: "savingThrowFailed";
      readonly affected: true;
      readonly condition: "charmed";
      readonly duration: TimeSpanDuration;
      readonly commandCompliance: {
        readonly commandContentOwner: "table";
        readonly counterCommandAdjudicationOwner: "table";
      };
      readonly damage: {
        readonly diceCount: 5;
        readonly dieSize: 10;
        readonly damageType: "psychic";
        readonly trigger: "acts_directly_counter_to_command";
        readonly maxFrequency: "once_per_day";
        readonly applicationOwner: "table";
      };
      readonly endedBySpells: readonly [
        "remove_curse",
        "greater_restoration",
        "wish",
      ];
    };
export type CharacterSheetGeasInvocation = {
  readonly tag: "geas";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "minutes";
    readonly amount: 1;
  };
  readonly rangeFeet: 60;
  readonly components: readonly ["v"];
  readonly target: CharacterSheetGeasTarget;
  readonly command: CharacterSheetGeasCommand;
  readonly savingThrow: {
    readonly ability: "wis";
    readonly dc: "caster_spell_save_dc";
    readonly automaticSuccessIfTargetCannotUnderstandCommand: true;
  };
  readonly outcome: CharacterSheetGeasOutcome;
};
export type CharacterSheetGeasResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetGeasInvocation;
};

export type CharacterSheetDominatePersonSavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetDominatePersonTarget = {
  readonly targetId: CharacterSheetDominatePersonTargetId;
  readonly visibleByCaster: true;
  readonly withinRangeFeet: 60;
  readonly creatureType: "humanoid";
  readonly fightingCasterOrAllies: boolean;
  readonly savingThrowOutcome: CharacterSheetDominatePersonSavingThrowOutcome;
};
export type CharacterSheetDominatePersonOutcome =
  | {
      readonly tag: "savingThrowSucceeded";
      readonly affected: false;
    }
  | {
      readonly tag: "savingThrowFailed";
      readonly affected: true;
      readonly condition: "charmed";
      readonly duration: TimeSpanDuration;
      readonly concentrationRequired: true;
      readonly telepathicCommandLink: {
        readonly actionCost: "none";
        readonly commandTransmissionOwner: "character-sheet-session";
        readonly obedienceAdjudicationOwner: "table";
      };
      readonly repeatSave: {
        readonly trigger: "target_takes_damage";
        readonly ability: "wis";
        readonly dc: "caster_spell_save_dc";
        readonly onSuccess: "ends_on_target";
        readonly observationOwner: "table-session";
      };
    };
export type CharacterSheetDominatePersonInvocation = {
  readonly tag: "dominate_person";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "action";
  };
  readonly rangeFeet: 60;
  readonly components: readonly ["v", "s"];
  readonly target: CharacterSheetDominatePersonTarget;
  readonly savingThrow: {
    readonly ability: "wis";
    readonly dc: "caster_spell_save_dc";
    readonly advantageIfCasterOrAlliesAreFightingTarget: boolean;
  };
  readonly outcome: CharacterSheetDominatePersonOutcome;
};
export type CharacterSheetDominatePersonResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetDominatePersonInvocation;
};

export type CharacterSheetModifyMemorySavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetModifyMemoryTarget = {
  readonly targetId: CharacterSheetModifyMemoryTargetId;
  readonly visibleByCaster: true;
  readonly withinRangeFeet: 30;
  readonly fightingCaster: boolean;
  readonly understandsCasterLanguage: boolean;
  readonly savingThrowOutcome: CharacterSheetModifyMemorySavingThrowOutcome;
};
export type CharacterSheetModifyMemoryChangeKind =
  | "eliminate"
  | "clarify"
  | "change_details"
  | "create";
export type CharacterSheetModifyMemoryMemoryEdit = {
  readonly eventAgeHoursMax: 24;
  readonly eventDurationMinutesMax: 10;
  readonly changeKind: CharacterSheetModifyMemoryChangeKind;
  readonly spokenDescription: string;
  readonly descriptionCompleteBeforeSpellEnd: boolean;
  readonly behaviorConsequenceOwner: "table";
  readonly nonsensicalMemoryAdjudicationOwner: "table";
};
export type CharacterSheetModifyMemoryOutcome =
  | {
      readonly tag: "savingThrowSucceeded";
      readonly affected: false;
    }
  | {
      readonly tag: "targetCannotUnderstandLanguage";
      readonly affected: true;
      readonly conditionsDuringSpell: readonly ["charmed", "incapacitated"];
      readonly memoryAltered: false;
      readonly reason: "target_cannot_understand_spoken_description";
    }
  | {
      readonly tag: "descriptionIncomplete";
      readonly affected: true;
      readonly conditionsDuringSpell: readonly ["charmed", "incapacitated"];
      readonly memoryAltered: false;
      readonly reason: "spell_ended_before_description_complete";
    }
  | {
      readonly tag: "memoryModified";
      readonly affected: true;
      readonly conditionsDuringSpell: readonly ["charmed", "incapacitated"];
      readonly memoryAltered: true;
      readonly takesHold: "when_spell_ends";
      readonly restoredBySpells: readonly [
        "remove_curse",
        "greater_restoration",
      ];
      readonly behaviorConsequenceOwner: "table";
      readonly nonsensicalMemoryAdjudicationOwner: "table";
    };
export type CharacterSheetModifyMemoryInvocation = {
  readonly tag: "modify_memory";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "action";
  };
  readonly rangeFeet: 30;
  readonly components: readonly ["v", "s"];
  readonly concentration: {
    readonly upTo: TimeSpanDuration;
    readonly earlyEnd: readonly [
      "target_takes_damage",
      "targeted_by_another_spell",
    ];
    readonly noMemoryModifiedOnEarlyEnd: true;
  };
  readonly target: CharacterSheetModifyMemoryTarget;
  readonly memoryEdit: CharacterSheetModifyMemoryMemoryEdit;
  readonly savingThrow: {
    readonly ability: "wis";
    readonly dc: "caster_spell_save_dc";
    readonly advantageIfFightingCaster: true;
  };
  readonly charmState: {
    readonly conditions: readonly ["charmed", "incapacitated"];
    readonly unawareOfSurroundings: true;
    readonly canHearCaster: true;
  };
  readonly outcome: CharacterSheetModifyMemoryOutcome;
};
export type CharacterSheetModifyMemoryResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetModifyMemoryInvocation;
};

export type CharacterSheetMisleadCasting = {
  readonly casterSpeedFeet: number;
};
export type CharacterSheetMisleadInvocation = {
  readonly tag: "mislead";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "action";
  };
  readonly range: "self";
  readonly components: readonly ["s"];
  readonly concentration: {
    readonly upTo: TimeSpanDuration;
    readonly doubleDurationMatchesConcentration: true;
  };
  readonly invisibility: {
    readonly condition: "invisible";
    readonly startsWhenDoubleAppears: true;
    readonly earlyEnd: readonly [
      "caster_makes_attack_roll",
      "caster_deals_damage",
      "caster_casts_spell",
    ];
  };
  readonly illusoryDouble: {
    readonly appearsWhereCasterStands: true;
    readonly tangible: false;
    readonly invulnerable: true;
    readonly movementControl: {
      readonly action: "magic";
      readonly maxDistanceFeet: number;
      readonly basedOnCasterSpeedMultiplier: 2;
      readonly movementPathOwner: "table";
    };
    readonly behaviorControl: {
      readonly gesturesSpeaksAndBehavesAsCasterChooses: true;
      readonly behaviorRenderingOwner: "table";
    };
    readonly remoteSenses: {
      readonly sight: "through_double_eyes";
      readonly hearing: "through_double_ears";
      readonly asIfLocatedAtDouble: true;
      readonly sensoryContentsOwner: "table";
    };
    readonly mapPlacementOwner: "table";
  };
};
export type CharacterSheetMisleadResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetMisleadInvocation;
};

export const TELEPORTATION_CIRCLE_MATERIAL_COMPONENTS = {
  consumedRareInksCostGp: 50,
} as const;
export type CharacterSheetTeleportationCircleMaterialComponents =
  typeof TELEPORTATION_CIRCLE_MATERIAL_COMPONENTS;
export type CharacterSheetTeleportationCircleCasting = {
  readonly tag: "completedTeleportationCircleCasting";
  readonly materialComponents: CharacterSheetTeleportationCircleMaterialComponents;
};
export type CharacterSheetTeleportationCircleDestination = {
  readonly sigilSequenceId: CharacterSheetTeleportationCircleSigilSequenceId;
  readonly knownByCaster: true;
  readonly destinationKind: "permanent_teleportation_circle";
  readonly plane: "same_plane_as_caster";
};
export type CharacterSheetTeleportationCircleInvocation = {
  readonly tag: "teleportationCircle";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "minutes";
    readonly amount: 1;
  };
  readonly rangeFeet: 10;
  readonly drawnCircleRadiusFeet: 5;
  readonly duration: TimeSpanDuration;
  readonly materialComponents: CharacterSheetTeleportationCircleMaterialComponents;
  readonly destination: CharacterSheetTeleportationCircleDestination;
  readonly portal: {
    readonly opensWithinDrawnCircle: true;
    readonly openUntil: "end_of_casters_next_turn";
    readonly entrantArrival: "within_5_feet_or_nearest_unoccupied";
    readonly samePlaneDestinationRequired: true;
  };
  readonly permanentCircleCreation: {
    readonly cadence: "daily";
    readonly requiredCastCount: 365;
    readonly locationRequirement: "same_location";
  };
};
export type CharacterSheetTeleportationCircleResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetTeleportationCircleInvocation;
};

export const PASSWALL_SURFACE_MATERIAL_VALUES = [
  "wood",
  "plaster",
  "stone",
] as const;
export type CharacterSheetPasswallSurfaceMaterial =
  (typeof PASSWALL_SURFACE_MATERIAL_VALUES)[number];
export const PASSWALL_SURFACE_KIND_VALUES = [
  "wall",
  "ceiling",
  "floor",
] as const;
export type CharacterSheetPasswallSurfaceKind =
  (typeof PASSWALL_SURFACE_KIND_VALUES)[number];
export type CharacterSheetPasswallSurface = {
  readonly surfaceId: CharacterSheetPasswallSurfaceId;
  readonly material: CharacterSheetPasswallSurfaceMaterial;
  readonly surfaceKind: CharacterSheetPasswallSurfaceKind;
  readonly visiblePointWithinRange: true;
};
export type CharacterSheetPasswallDimensions = {
  readonly widthFeet: number;
  readonly heightFeet: number;
  readonly depthFeet: number;
};
export type CharacterSheetPasswallInvocation = {
  readonly tag: "passwall";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly rangeFeet: 30;
  readonly duration: TimeSpanDuration;
  readonly surface: CharacterSheetPasswallSurface;
  readonly dimensions: CharacterSheetPasswallDimensions;
  readonly passage: {
    readonly createsNoStructuralInstability: true;
    readonly ejectionWhenOpeningDisappears: "nearest_unoccupied_space_to_cast_surface";
  };
};
export type CharacterSheetPasswallResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetPasswallInvocation;
};

export type CharacterSheetWallOfForceWallShape = {
  readonly kind: "flatPanels";
  readonly panelCount: number;
  readonly panelWidthFeet: 10;
  readonly panelHeightFeet: 10;
  readonly panelContiguity: "table_witnessed";
  readonly thicknessInches: 0.25;
};
export type CharacterSheetWallOfForceGlobeOrDomeShape = {
  readonly kind: "globeOrDome";
  readonly radiusFeet: number;
  readonly thicknessInches: 0.25;
};
export type CharacterSheetWallOfForceShape =
  | CharacterSheetWallOfForceWallShape
  | CharacterSheetWallOfForceGlobeOrDomeShape;
export type CharacterSheetWallOfForcePlacement = {
  readonly barrierId: CharacterSheetWallOfForceBarrierId;
  readonly pointWithinRange: true;
  readonly orientation: "table_witnessed";
  readonly support: "free_floating_or_solid_surface";
};
export type CharacterSheetWallOfForceInvocation = {
  readonly tag: "wallOfForce";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 120;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly shape: CharacterSheetWallOfForceShape;
  readonly placement: CharacterSheetWallOfForcePlacement;
  readonly barrier: {
    readonly invisible: true;
    readonly physicalPassage: "blocked";
    readonly effectBlockingOwner: "table";
    readonly containmentAndSideChoiceOwner: "table";
    readonly geometryOwner: "table";
    readonly initialCreaturePush: {
      readonly trigger: "wall_cuts_through_creature_space";
      readonly distanceFeet: 5;
      readonly sideChoiceOwner: "caster_and_table";
    };
    readonly damageImmunity: "all_damage";
    readonly cannotBeDispelledBy: "dispel_magic";
    readonly destroyedBy: "disintegrate";
    readonly disintegrateHarmsInside: false;
    readonly etherealTravel: "blocked";
  };
};
export type CharacterSheetWallOfForceResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetWallOfForceInvocation;
};

export const ANTILIFE_SHELL_ALLOWED_BARRIER_INTERACTION_VALUES = [
  "spells",
  "ranged_attacks",
  "reach_weapon_attacks",
] as const;
export type CharacterSheetAntilifeShellAllowedBarrierInteraction =
  (typeof ANTILIFE_SHELL_ALLOWED_BARRIER_INTERACTION_VALUES)[number];
export const ANTILIFE_SHELL_EXCEPTED_CREATURE_TYPE_VALUES = [
  "construct",
  "undead",
] as const;
export type CharacterSheetAntilifeShellExceptedCreatureType =
  (typeof ANTILIFE_SHELL_EXCEPTED_CREATURE_TYPE_VALUES)[number];
export type CharacterSheetAntilifeShellBarrierPlacement = {
  readonly barrierId: CharacterSheetAntilifeShellBarrierId;
  readonly casterOriginWitnessed: true;
};
export type CharacterSheetAntilifeShellInvocation = {
  readonly tag: "antilifeShell";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly range: { readonly kind: "self" };
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly placement: CharacterSheetAntilifeShellBarrierPlacement;
  readonly barrier: {
    readonly origin: "caster";
    readonly shape: {
      readonly kind: "emanation";
      readonly radiusFeet: 10;
      readonly movesWithCaster: true;
    };
    readonly prevents: readonly ["creature_passage", "creature_reach_through"];
    readonly exceptCreatureTypes: readonly CharacterSheetAntilifeShellExceptedCreatureType[];
    readonly allowedThroughBarrier: readonly CharacterSheetAntilifeShellAllowedBarrierInteraction[];
    readonly crossingMembershipOwner: "table";
    readonly forcedPassageByCasterMovement: {
      readonly endsSpell: true;
      readonly owner: "table";
    };
  };
};
export type CharacterSheetAntilifeShellResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetAntilifeShellInvocation;
};

export type CharacterSheetWallOfStoneShape = {
  readonly kind: "stonePanels";
  readonly panelCount: 10;
  readonly panelWidthFeet: 10;
  readonly panelHeightFeet: 10 | 20;
  readonly thicknessInches: 6 | 3;
  readonly panelContiguity: "table_witnessed";
};
export type CharacterSheetWallOfStonePlacement = {
  readonly wallId: CharacterSheetWallOfStoneWallId;
  readonly pointWithinRange: true;
  readonly geometry: "table_witnessed";
  readonly mergesWithExistingStone: true;
  readonly solidlySupportedByExistingStone: true;
  readonly occupiesNoCreatureOrObjectSpace: true;
};
export type CharacterSheetWallOfStoneInvocation = {
  readonly tag: "wallOfStone";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 120;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly permanentIfMaintainedFullDuration: true;
  readonly placement: CharacterSheetWallOfStonePlacement;
  readonly shape: CharacterSheetWallOfStoneShape;
  readonly wall: {
    readonly material: "nonmagical_solid_stone";
    readonly anyShapeDesiredOwner: "table";
    readonly initialCreaturePush: {
      readonly trigger: "wall_cuts_through_creature_space";
      readonly distanceFeet: 5;
      readonly sideChoiceOwner: "caster_and_table";
    };
    readonly enclosureEscape: {
      readonly savingThrowAbility: "dex";
      readonly onSuccess: "may_use_reaction_move_up_to_speed";
      readonly owner: "table";
    };
    readonly durability: {
      readonly ac: 15;
      readonly hitPointsPerInchOfThickness: 30;
      readonly damageImmunities: readonly ["poison", "psychic"];
      readonly panelDamageOwner: "table_object_state";
      readonly connectedPanelCollapseOwner: "dm_table";
    };
    readonly permanence: {
      readonly ifConcentrationMaintainedFullDuration: true;
      readonly cannotBeDispelled: true;
    };
    readonly disappearsWhenSpellEndsBeforePermanence: true;
  };
};
export type CharacterSheetWallOfStoneResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetWallOfStoneInvocation;
};

export type CharacterSheetTreeStrideTree = {
  readonly treeId: CharacterSheetTreeStrideTreeId;
  readonly treeKind: CharacterSheetTreeStrideTreeKind;
  readonly living: true;
  readonly atLeastCasterSize: true;
};
export type CharacterSheetTreeStrideDestinationTree =
  CharacterSheetTreeStrideTree & {
    readonly within500FeetOfEntryTree: true;
  };
export type CharacterSheetTreeStrideInvocation = {
  readonly tag: "treeStride";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly transport: {
    readonly entryMovementCostFeet: 5;
    readonly destinationMovementCostFeet: 5;
    readonly destinationSearchRadiusFeet: 500;
    readonly usesPerTurn: 1;
    readonly mustEndTurnOutsideTree: true;
    readonly destinationKindRequirement: "same_kind_living_tree_at_least_caster_size";
  };
};
export type CharacterSheetTreeStrideTransitInput = {
  readonly invocation: CharacterSheetTreeStrideInvocation;
  readonly entryTree: CharacterSheetTreeStrideTree;
  readonly destinationTree?: CharacterSheetTreeStrideDestinationTree;
  readonly movementAvailableFeet: number;
  readonly usedThisTurn: boolean;
};
export type CharacterSheetTreeStrideTransitResult = {
  readonly arrivalTree: CharacterSheetTreeStrideTree;
  readonly movementSpentFeet: number;
  readonly usedThisTurn: true;
  readonly endsOutsideTree: true;
};
export type CharacterSheetTreeStrideResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetTreeStrideInvocation;
};

export const CREATION_OBJECT_MATERIAL_VALUES = [
  "vegetable_matter",
  "stone_or_crystal",
  "precious_metals",
  "gems",
  "adamantine_or_mithral",
] as const;
export type CharacterSheetCreationObjectMaterial =
  (typeof CREATION_OBJECT_MATERIAL_VALUES)[number];
export type CharacterSheetCreationObject = {
  readonly objectId: CharacterSheetCreationObjectId;
  readonly materials: readonly CharacterSheetCreationObjectMaterial[];
  readonly formAndMaterialSeenByCaster: true;
  readonly cubeSideFeet: number;
};
export type CharacterSheetCreationInvocation = {
  readonly tag: "creation";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "minutes";
    readonly amount: 1;
  };
  readonly rangeFeet: 30;
  readonly maxCubeSideFeet: number;
  readonly object: CharacterSheetCreationObject;
  readonly objectDuration: TimeSpanDuration;
  readonly materialComponentUse: "causes_other_spell_to_fail";
};
export type CharacterSheetCreationResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetCreationInvocation;
};

export type CharacterSheetTelekinesisSavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetTelekinesisTarget =
  | {
      readonly tag: "creature";
      readonly targetId: CharacterSheetTelekinesisTargetId;
      readonly visibleWithinRange: true;
      readonly hugeOrSmaller: true;
      readonly savingThrowOutcome: CharacterSheetTelekinesisSavingThrowOutcome;
    }
  | {
      readonly tag: "unattendedObject";
      readonly objectId: CharacterSheetTelekinesisTargetId;
      readonly visibleWithinRange: true;
      readonly hugeOrSmaller: true;
    }
  | {
      readonly tag: "wornOrCarriedObject";
      readonly objectId: CharacterSheetTelekinesisTargetId;
      readonly carrierId: CharacterSheetTelekinesisTargetId;
      readonly visibleWithinRange: true;
      readonly hugeOrSmaller: true;
      readonly carrierSavingThrowOutcome: CharacterSheetTelekinesisSavingThrowOutcome;
    }
  | {
      readonly tag: "fineObjectControl";
      readonly objectId: CharacterSheetTelekinesisTargetId;
      readonly visibleWithinRange: true;
    };
export type CharacterSheetTelekinesisEffect =
  | { readonly tag: "creatureSaveSucceeded"; readonly affected: false }
  | {
      readonly tag: "creatureSaveFailed";
      readonly forceMoveUpToFeet: 30;
      readonly movementDirection: "any_direction";
      readonly condition: "restrained";
      readonly conditionDuration: "until_end_of_caster_next_turn";
      readonly suspendedIfLifted: true;
      readonly fallsUnlessReapplied: true;
      readonly tablePlacementOwner: "table";
    }
  | {
      readonly tag: "moveUnattendedObject";
      readonly moveUpToFeet: 30;
      readonly tableObjectOwner: "table";
    }
  | {
      readonly tag: "wornOrCarriedObjectSaveSucceeded";
      readonly affected: false;
    }
  | {
      readonly tag: "wornOrCarriedObjectSaveFailed";
      readonly pullAway: true;
      readonly moveUpToFeet: 30;
      readonly tableObjectOwner: "table";
    }
  | {
      readonly tag: "fineObjectControl";
      readonly tableObjectOwner: "table";
    };
export type CharacterSheetTelekinesisInvocation = {
  readonly tag: "telekinesis";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 60;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly target: CharacterSheetTelekinesisTarget;
  readonly savingThrow: {
    readonly creatureOrCarrierAbility: "str";
    readonly dc: "caster_spell_save_dc";
  };
  readonly initialExertion: CharacterSheetTelekinesisEffect;
  readonly laterTurnControl: {
    readonly action: "magic_action";
    readonly mayChooseNewVisibleTargetWithinRange: true;
    readonly availableModes: readonly [
      "creature",
      "unattended_object",
      "worn_or_carried_object",
      "fine_object_control",
    ];
  };
};
export type CharacterSheetTelekinesisResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetTelekinesisInvocation;
};

export type CharacterSheetArcaneHandSpace = {
  readonly objectId: CharacterSheetArcaneHandObjectId;
  readonly unoccupiedSpaceVisibleWithinRange: true;
};
export type CharacterSheetArcaneHandInvocation = {
  readonly tag: "arcaneHand";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 120;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly hand: {
    readonly objectId: CharacterSheetArcaneHandObjectId;
    readonly creatureSize: "large";
    readonly objectArmorClass: 20;
    readonly hitPointMaximum: HpType;
    readonly occupiesSpace: false;
    readonly dropsToZeroEndsSpell: true;
    readonly mapPlacementOwner: "table";
  };
  readonly command: {
    readonly onCast: true;
    readonly laterTurnAction: "bonus_action";
    readonly moveDistanceFeet: 60;
    readonly movementPathOwner: "table";
    readonly availableEffects: readonly [
      "clenched_fist",
      "forceful_hand",
      "grasping_hand",
      "interposing_hand",
    ];
  };
  readonly effectContracts: {
    readonly clenchedFist: {
      readonly attackKind: "melee_spell_attack";
      readonly reachFeet: 5;
      readonly baseDamageDice: { readonly count: 5; readonly die: 8 };
      readonly damageType: "force";
      readonly damageDicePerSlotAboveBase: {
        readonly count: 2;
        readonly die: 8;
      };
    };
    readonly forcefulHand: {
      readonly targetSizeMaximum: "huge";
      readonly savingThrowAbility: "str";
      readonly basePushFeet: 5;
      readonly pushFeetPerSpellcastingAbilityModifier: 5;
      readonly handMovesWithTarget: true;
      readonly remainsWithinFeet: 5;
    };
    readonly graspingHand: {
      readonly targetSizeMaximum: "huge";
      readonly savingThrowAbility: "dex";
      readonly condition: "grappled";
      readonly escapeDc: "caster_spell_save_dc";
      readonly crushAction: "bonus_action";
      readonly crushDamageDice: { readonly count: 4; readonly die: 6 };
      readonly crushAddsSpellcastingAbilityModifier: true;
      readonly damageDicePerSlotAboveBase: {
        readonly count: 2;
        readonly die: 6;
      };
    };
    readonly interposingHand: {
      readonly coverGrantedToCaster: "half_cover";
      readonly difficultTerrainForEnemies: true;
    };
  };
};
export type CharacterSheetArcaneHandResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetArcaneHandInvocation;
};

export const ANIMATE_OBJECTS_SIZE_VALUES = [
  "medium_or_smaller",
  "large",
  "huge",
] as const;
export type CharacterSheetAnimateObjectsSize =
  (typeof ANIMATE_OBJECTS_SIZE_VALUES)[number];
export type CharacterSheetAnimateObjectsTarget = {
  readonly objectId: CharacterSheetSpellLifecycleObjectId;
  readonly size: CharacterSheetAnimateObjectsSize;
  readonly nonmagical: true;
  readonly withinRange: true;
  readonly notWornOrCarried: true;
  readonly notFixedToSurface: true;
};
export type CharacterSheetAnimatedObjectContract = {
  readonly objectId: CharacterSheetSpellLifecycleObjectId;
  readonly creatureType: "construct";
  readonly size: CharacterSheetAnimateObjectsSize;
  readonly capacityWeight: number;
  readonly armorClass: 15;
  readonly hitPointMaximum: HpType;
  readonly slam: {
    readonly attackBonus: "caster_spell_attack_modifier";
    readonly reachFeet: 5;
    readonly damageType: "force";
    readonly dice: { readonly count: number; readonly die: 4 | 6 | 12 };
    readonly flat: 3;
    readonly addsSpellcastingAbilityModifier: boolean;
  };
  readonly zeroHp: {
    readonly revertsToObjectForm: true;
    readonly remainingDamageCarriesOverToObject: true;
  };
};
export type CharacterSheetAnimateObjectsInvocation = {
  readonly tag: "animateObjects";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 120;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly selectedObjectCapacity: {
    readonly maximumWeight: number;
    readonly usedWeight: number;
    readonly source: "spellcasting_ability_modifier";
  };
  readonly animatedObjects: readonly CharacterSheetAnimatedObjectContract[];
  readonly companionControl: {
    readonly allyToCasterAndAllies: true;
    readonly initiative: "shared_with_caster";
    readonly turnOrder: "immediately_after_caster";
    readonly commandAction: "bonus_action";
    readonly commandRangeFeet: 500;
    readonly sameCommandToMultipleObjects: true;
    readonly defaultBehavior: "dodge_and_avoid_harm";
    readonly tableCommandOwner: "table";
    readonly battleCreatureLifecycleOwner: "table";
  };
};
export type CharacterSheetAnimateObjectsResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetAnimateObjectsInvocation;
};

export const CONJURE_ELEMENTAL_ELEMENT_VALUES = [
  "air",
  "earth",
  "fire",
  "water",
] as const;
export type CharacterSheetConjureElementalElement =
  (typeof CONJURE_ELEMENTAL_ELEMENT_VALUES)[number];
export type CharacterSheetConjureElementalSpirit = {
  readonly spiritId: CharacterSheetSpellLifecycleCreatureId;
  readonly element: CharacterSheetConjureElementalElement;
  readonly unoccupiedSpaceWithinRange: true;
};
export type CharacterSheetConjureElementalInvocation = {
  readonly tag: "conjureElemental";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 60;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly spirit: {
    readonly spiritId: CharacterSheetSpellLifecycleCreatureId;
    readonly size: "large";
    readonly intangible: true;
    readonly origin: "elemental_planes";
    readonly element: CharacterSheetConjureElementalElement;
    readonly damageType: DamageType;
    readonly placementOwner: "table";
  };
  readonly hazard: {
    readonly trigger: "enters_space_or_starts_turn_within_5_feet";
    readonly casterCanForceSave: true;
    readonly onlyIfNoRestrainedCreature: true;
    readonly savingThrowAbility: "dex";
    readonly dc: "caster_spell_save_dc";
    readonly firstFailedSaveDamageDice: {
      readonly count: number;
      readonly die: 8;
    };
    readonly repeatFailedSaveDamageDice: {
      readonly count: number;
      readonly die: 8;
    };
    readonly restrainedUntilSpellEnds: true;
    readonly repeatSaveAtStartOfRestrainedTurns: true;
    readonly tableTriggerOwner: "table";
  };
};
export type CharacterSheetConjureElementalResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetConjureElementalInvocation;
};

export const SUMMON_DRAGON_DAMAGE_TYPE_VALUES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const satisfies ReadonlyArray<DamageType>;
export type CharacterSheetSummonDragonDamageType =
  (typeof SUMMON_DRAGON_DAMAGE_TYPE_VALUES)[number];
export type CharacterSheetSummonDragonSpirit = {
  readonly spiritId: CharacterSheetSpellLifecycleCreatureId;
  readonly damageType: CharacterSheetSummonDragonDamageType;
  readonly unoccupiedSpaceVisibleWithinRange: true;
  readonly engravedDragonObjectWorth500Gp: true;
};
export type CharacterSheetSummonDragonInvocation = {
  readonly tag: "summonDragon";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "action" };
  readonly rangeFeet: 60;
  readonly duration: TimeSpanDuration;
  readonly concentrationRequired: true;
  readonly spirit: {
    readonly spiritId: CharacterSheetSpellLifecycleCreatureId;
    readonly creatureType: "dragon";
    readonly size: "large";
    readonly armorClass: number;
    readonly hitPointMaximum: HpType;
    readonly speedsFeet: {
      readonly walk: 30;
      readonly fly: 60;
      readonly swim: 30;
    };
    readonly sharedResistance: CharacterSheetSummonDragonDamageType;
    readonly disappearsAtZeroHpOrSpellEnd: true;
    readonly placementOwner: "table";
  };
  readonly companionControl: {
    readonly allyToCasterAndAllies: true;
    readonly initiative: "shared_with_caster";
    readonly turnOrder: "immediately_after_caster";
    readonly commandAction: "no_action_required";
    readonly defaultBehavior: "dodge_and_avoid_danger";
    readonly tableCommandOwner: "table";
    readonly battleCreatureLifecycleOwner: "table";
  };
  readonly actions: {
    readonly rend: {
      readonly attackBonus: "caster_spell_attack_modifier";
      readonly reachFeet: 10;
      readonly damageType: "piercing";
      readonly damageDice: { readonly count: 1; readonly die: 6 };
      readonly flatDamage: number;
    };
    readonly breathWeapon: {
      readonly savingThrowAbility: "dex";
      readonly dc: "caster_spell_save_dc";
      readonly area: { readonly kind: "cone"; readonly lengthFeet: 30 };
      readonly damageType: CharacterSheetSummonDragonDamageType;
      readonly damageDice: { readonly count: 2; readonly die: 6 };
      readonly success: "half_damage";
    };
    readonly multiattack: {
      readonly rendCount: number;
      readonly breathWeaponCount: 1;
    };
  };
};
export type CharacterSheetSummonDragonResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetSummonDragonInvocation;
};

export const PLANAR_BINDING_TARGET_CREATURE_TYPE_VALUES = [
  "celestial",
  "elemental",
  "fey",
  "fiend",
] as const satisfies ReadonlyArray<CreatureType>;
export type CharacterSheetPlanarBindingTargetCreatureType =
  (typeof PLANAR_BINDING_TARGET_CREATURE_TYPE_VALUES)[number];
export type CharacterSheetPlanarBindingSavingThrowOutcome =
  | { readonly tag: "succeeded" }
  | { readonly tag: "failed" };
export type CharacterSheetPlanarBindingTarget = {
  readonly creatureId: CharacterSheetSpellLifecycleCreatureId;
  readonly creatureType: CharacterSheetPlanarBindingTargetCreatureType;
  readonly withinRangeForEntireCasting: true;
  readonly savingThrowOutcome: CharacterSheetPlanarBindingSavingThrowOutcome;
  readonly summonedOrCreatedBySpell: boolean;
  readonly hostile: boolean;
};
export type CharacterSheetPlanarBindingInvocation = {
  readonly tag: "planarBinding";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly castLevel: SpellSlotLevel;
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: { readonly kind: "hours"; readonly amount: 1 };
  readonly rangeFeet: 60;
  readonly duration: TimeSpanDuration;
  readonly materialComponentSpend: {
    readonly consumedJewelCostGpMinimum: 1000;
  };
  readonly target: CharacterSheetPlanarBindingTarget;
  readonly savingThrow: {
    readonly ability: "cha";
    readonly dc: "caster_spell_save_dc";
  };
  readonly outcome:
    | { readonly tag: "saveSucceeded"; readonly bound: false }
    | {
        readonly tag: "saveFailed";
        readonly bound: true;
        readonly commandFollowing: "best_of_ability";
        readonly hostileTargetTwistsCommands: boolean;
        readonly extendsSummoningOrCreationSpellDuration: boolean;
        readonly reportingOrReturnOwner: "table";
        readonly commandExecutionOwner: "table";
      };
};
export type CharacterSheetPlanarBindingResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetPlanarBindingInvocation;
};

export const HALLOW_MATERIAL_COMPONENTS = {
  consumedIncenseCostGpMinimum: 1000,
} as const;
export type CharacterSheetHallowMaterialComponents =
  typeof HALLOW_MATERIAL_COMPONENTS;
export type CharacterSheetHallowCasting = {
  readonly tag: "completedHallowCasting";
  readonly materialComponents: CharacterSheetHallowMaterialComponents;
};
export const HALLOW_WARD_CREATURE_TYPE_VALUES = [
  "aberration",
  "celestial",
  "elemental",
  "fey",
  "fiend",
  "undead",
] as const satisfies ReadonlyArray<CreatureType>;
export type CharacterSheetHallowWardCreatureType =
  (typeof HALLOW_WARD_CREATURE_TYPE_VALUES)[number];
export type CharacterSheetHallowCreatureTypes = readonly [
  CharacterSheetHallowWardCreatureType,
  ...CharacterSheetHallowWardCreatureType[],
];
export type CharacterSheetHallowExtraEffectCreatureTypes = readonly [
  CreatureType,
  ...CreatureType[],
];
export const HALLOW_EXTRA_EFFECT_VALUES = [
  "courage",
  "darkness",
  "daylight",
  "peaceful_rest",
  "extradimensional_interference",
  "fear",
  "resistance",
  "silence",
  "tongues",
  "vulnerability",
] as const;
export type CharacterSheetHallowExtraEffectKind =
  (typeof HALLOW_EXTRA_EFFECT_VALUES)[number];
export type CharacterSheetHallowArea = {
  readonly areaId: CharacterSheetHallowAreaId;
  readonly radiusFeet: number;
  readonly touchedPointWithinReach: true;
  readonly areaAlreadyHallowed: false;
};
export type CharacterSheetHallowExtraEffect =
  | {
      readonly kind: "courage";
      readonly affectedCreatureTypes: CharacterSheetHallowExtraEffectCreatureTypes;
    }
  | { readonly kind: "darkness" }
  | { readonly kind: "daylight" }
  | { readonly kind: "peaceful_rest" }
  | {
      readonly kind: "extradimensional_interference";
      readonly affectedCreatureTypes: CharacterSheetHallowExtraEffectCreatureTypes;
    }
  | {
      readonly kind: "fear";
      readonly affectedCreatureTypes: CharacterSheetHallowExtraEffectCreatureTypes;
    }
  | {
      readonly kind: "resistance";
      readonly affectedCreatureTypes: CharacterSheetHallowExtraEffectCreatureTypes;
      readonly damageType: DamageType;
    }
  | { readonly kind: "silence" }
  | {
      readonly kind: "tongues";
      readonly affectedCreatureTypes: CharacterSheetHallowExtraEffectCreatureTypes;
    }
  | {
      readonly kind: "vulnerability";
      readonly affectedCreatureTypes: CharacterSheetHallowExtraEffectCreatureTypes;
      readonly damageType: DamageType;
    };
export type CharacterSheetHallowInvocation = {
  readonly tag: "hallow";
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterSheetSpellSource["mechanics"]["level"];
  readonly spellSlotCost: {
    readonly kind: "ordinary";
    readonly spellLevel: SpellSlotLevel;
  };
  readonly preparationRequirement: "prepared";
  readonly requiredSpellAccess: "class_prepared";
  readonly castingTime: {
    readonly kind: "hours";
    readonly amount: 24;
  };
  readonly range: "touch";
  readonly duration: "until_dispelled";
  readonly materialComponents: CharacterSheetHallowMaterialComponents;
  readonly area: CharacterSheetHallowArea;
  readonly hallowedWard: {
    readonly blockedCreatureTypes: CharacterSheetHallowCreatureTypes;
    readonly preventsPossessionCharmedFrightenedFromBlockedTypes: true;
  };
  readonly extraEffect: CharacterSheetHallowExtraEffect;
  readonly durableArea: {
    readonly persistenceOwner: "table";
    readonly spatialMembershipOwner: "table";
    readonly dispelEndingOwner: "table";
  };
};
export type CharacterSheetHallowResult = {
  readonly sheet: CharacterSheet;
  readonly invocation: CharacterSheetHallowInvocation;
};

export type CharacterSheetClassFeaturePreparedSpellAccess = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellIds: readonly UnitRecord["id"][];
};

export type CharacterSheetSpellAccess =
  | {
      readonly source: "classFeature";
      readonly sourceUnitId: UnitRecord["id"];
      readonly spellId: UnitRecord["id"];
      readonly spellcastingAbility: Ability;
      readonly preparation: "alwaysPrepared";
    }
  | {
      readonly source: "magicInitiate";
      readonly sourceUnitId: UnitRecord["id"];
      readonly spellId: UnitRecord["id"];
      readonly spellcastingAbility: MagicInitiateSpellcastingAbility;
      readonly preparation: "learnedCantrip" | "alwaysPrepared";
    };

export type CharacterSheetSpellInvocation =
  | CharacterSheetSpellbookRitualInvocation
  | CharacterSheetBookOfShadowsRitualInvocation
  | CharacterSheetContactPatronInvocation
  | CharacterSheetDivineInterventionInvocation
  | CharacterSheetCommuneInvocation
  | CharacterSheetCommuneWithNatureInvocation
  | CharacterSheetLegendLoreInvocation
  | CharacterSheetTelepathicBondInvocation
  | CharacterSheetScryingInvocation
  | CharacterSheetSeemingInvocation
  | CharacterSheetDreamInvocation
  | CharacterSheetAwakenInvocation
  | CharacterSheetGeasInvocation
  | CharacterSheetDominatePersonInvocation
  | CharacterSheetModifyMemoryInvocation
  | CharacterSheetMisleadInvocation
  | CharacterSheetTeleportationCircleInvocation
  | CharacterSheetPasswallInvocation
  | CharacterSheetWallOfForceInvocation
  | CharacterSheetAntilifeShellInvocation
  | CharacterSheetWallOfStoneInvocation
  | CharacterSheetTelekinesisInvocation
  | CharacterSheetTreeStrideInvocation
  | CharacterSheetCreationInvocation
  | CharacterSheetArcaneHandInvocation
  | CharacterSheetAnimateObjectsInvocation
  | CharacterSheetConjureElementalInvocation
  | CharacterSheetSummonDragonInvocation
  | CharacterSheetPlanarBindingInvocation
  | CharacterSheetHallowInvocation;

// AUTHORED-IDENTITY DEBT — not the norm. Matches the hard-coded use-count Unit-id
// support set; the durable form admits via a typed support-profile discriminant
// (the bare resource shape over-admits), not an id list.
export function isCharacterSheetUseCountResourceUnitId(
  unitId: UnitRecord["id"],
): unitId is CharacterSheetUseCountResourceUnitId {
  // authored-id-dispatch-allow: character-sheet-resource-support-admission-boundary
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
  // authored-id-dispatch-allow: character-sheet-resource-support-admission-boundary
  return CHARACTER_SHEET_POINT_POOL_RESOURCE_UNIT_IDS.some(
    (supportedUnitId) => supportedUnitId === unitId,
  );
}
