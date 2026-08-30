// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.attack-procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.retaliation-reaction-attack
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form spell.invocation-flaming-sphere-hazard-ram spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-granted-action
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE

import { Match, Schema } from "effect";
import { STANDARD_ACTION_KINDS } from "@dnd/shared/game-facts";
import {
  MovementFeet,
  SpellSlotLevel,
  spellSlotLevel,
} from "@dnd/shared/types";
import { AbilitySchema, DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { DamageType } from "@dnd/surface/surface/types";
import { BATTLE_READIED_SPELL_TRIGGERS } from "./battle-interrupt-triggers.ts";
import {
  BattleAreaId,
  BattleEffectExecutionRef,
  BattleAttackProcedureExecutionRef,
  BattleLineDirectionId,
  BattleObjectId,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
  BattleSpellAccessExecutionRef,
  CombatantId,
  BattleStatBlockProcedureExecutionRef,
  BattleStatBlockExecutionScopeRef,
  battleProcedureExecutionRefBelongsToCombatant,
  SpellId,
  spellId as makeSpellId,
} from "./identity.ts";
import {
  SELF_TRANSFORMATION_NATURAL_WEAPONS_MODE_KIND,
  SELF_TRANSFORMATION_NON_NATURAL_WEAPON_MODE_KINDS,
} from "./battle-reducer/domain-constants.ts";
import { type CharacterBattleMetamagicEffectKind } from "./character-battle-resource-execution.ts";
import { SORCERER_METAMAGIC_EFFECT_KINDS as CHARACTER_BATTLE_METAMAGIC_EFFECT_KINDS } from "@dnd/surface/surface/schema";
import {
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_SPELL_DAMAGE_TYPES,
} from "./battle-reducer/metamagic-transmuted-facts.ts";
import { attackExecutionSelectionKey } from "./battle-action-options.ts";
import {
  StatBlockAttackDamageSelection,
  statBlockAttackDamageSelectionKey,
} from "./stat-block-attack-damage-selection.ts";

const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);

export const BATTLE_SUBJECT_ACTIONS = [
  "attack",
  "dash",
  "disengage",
  "dodge",
  "helpAttack",
  "hide",
  "multiattack",
  "ready",
  "search",
  "grapple",
  "shove",
  "escapeGrapple",
  "escapeSpellRestraint",
  "shakeAwakeFromStagedCondition",
  "shakeAwakeFromAreaControl",
] as const;
export type BattleSubjectAction = (typeof BATTLE_SUBJECT_ACTIONS)[number];

export const BATTLE_SUBJECT_BONUS_ACTIONS = [
  "offHandAttack",
  "martialArtsUnarmedStrike",
  "statBlockActionOption",
] as const;
export type BattleSubjectBonusAction =
  (typeof BATTLE_SUBJECT_BONUS_ACTIONS)[number];

export const BATTLE_RUNTIME_COMMANDS = [
  "endTurn",
  "endConcentration",
  "move",
  "standFromProne",
  "releaseReadiedSpell",
  "releaseReadiedMovement",
  "reportReadyTrigger",
  "releaseReadiedAction",
  "releaseReadiedAttack",
  "castTriggeredReactionSpell",
  "castAttackHitBonusActionSpell",
  "releaseGrapple",
  "opportunityAttack",
  "retaliationAttack",
  "persistentAreaSaveConditionSave",
  "persistentAreaSaveConditionEscapeSave",
  "persistentAreaSaveCompositeSave",
  "persistentAreaSaveDamageSave",
  "endPersistentAreaSaveDamageForEnvironment",
  "endPersistentAreaSaveConditionEscapeForDeparture",
  "endPersistentAreaSaveConditionEscapeForAreaRemoval",
  "directionalPersistentAreaSave",
  "directionalPersistentAreaDirectionChange",
  "movableZoneSave",
  "persistentAreaSaveDamageExit",
  "movableZoneReposition",
  "movableZoneRam",
  "releaseSpellCreatedHeldObject",
  "protectionRelevantEffectSave",
  "creatureTypeProtectionConditionAttempt",
  "creatureTypeProtectionPossessionAttempt",
  "endPersistentAreaTraitForEnvironment",
  "linkedDefenseResistanceDamageShareSeparation",
  "fixedCostMovementReplacement",
  "grantedAreaSaveDamageAction",
  "replaceSelfTransformationMode",
  "executeCompelledGrovel",
  "executeCompelledDrop",
  "executeCompelledApproach",
  "executeCompelledFlee",
  "controlledVerticalSuspensionAltitudeControl",
  "creatureFalls",
] as const;
export type BattleRuntimeCommand = (typeof BATTLE_RUNTIME_COMMANDS)[number];
export {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BATTLE_SPECIAL_SPEED_KINDS,
  type BattleMovementSpeedKind,
  type BattleSpecialSpeedKind,
} from "./active-effect/execution-vocabulary.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  type BattleMovementSpeedKind,
} from "./active-effect/execution-vocabulary.ts";
export const MONK_FOCUS_PATIENT_DEFENSE_MODES = [
  "freeDisengage",
  "focusDisengageDodge",
] as const;
export type MonkFocusPatientDefenseMode =
  (typeof MONK_FOCUS_PATIENT_DEFENSE_MODES)[number];
export const MONK_FOCUS_STEP_OF_THE_WIND_MODES = [
  "freeDash",
  "focusDisengageDash",
] as const;
export type MonkFocusStepOfTheWindMode =
  (typeof MONK_FOCUS_STEP_OF_THE_WIND_MODES)[number];

export const BattleSubjectTextSchema = NonEmptyTrimmedStringSchema;
const RejectRedundantSpellProcedureSourceFields = {
  sourceProcedureRef: Schema.optionalKey(Schema.Never),
} as const;
const RejectRedundantSpellSourceFields = {
  ...RejectRedundantSpellProcedureSourceFields,
  sourceCombatantId: Schema.optionalKey(Schema.Never),
} as const;

export const BattlePersistentAreaSaveCompositeTriggerSchema = Schema.Union([
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("firstEntryOnTurn"),
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("turnStartInArea"),
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
]);
export type BattlePersistentAreaSaveCompositeTrigger =
  typeof BattlePersistentAreaSaveCompositeTriggerSchema.Type;

export const BattleStationaryPersistentAreaSaveDamageTriggerSchema =
  Schema.Union([
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("appearsInArea"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("firstEntryOnTurn"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("turnEndInArea"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
  ]);
export type BattleStationaryPersistentAreaSaveDamageTrigger =
  typeof BattleStationaryPersistentAreaSaveDamageTriggerSchema.Type;

export const BattleTranslatingPersistentAreaSaveDamageTriggerSchema =
  Schema.Union([
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("appearsInArea"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("areaMovesIntoSpace"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("firstEntryOnTurn"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
    Schema.Struct({
      ...RejectRedundantSpellSourceFields,
      kind: Schema.Literal("turnEndInArea"),
      areaId: BattleAreaId,
      effectRef: BattleEffectExecutionRef,
    }),
  ]);
export type BattleTranslatingPersistentAreaSaveDamageTrigger =
  typeof BattleTranslatingPersistentAreaSaveDamageTriggerSchema.Type;

export const CANTRIP_SPELL_PROCEDURES = [
  "heldLight",
  "objectLight",
  "heldLightHurl",
  "movableLightManifestation",
  "damageReduction",
  "makeStable",
  "spellAttackSequence",
  "spellHostedWeaponAttack",
  "weaponAttackOverride",
  "spellAttackDamage",
  "saveGatedDamage",
  "rollModifier",
  "temporaryAbilityCheckRollMode",
] as const;
export type CantripSpellProcedure = (typeof CANTRIP_SPELL_PROCEDURES)[number];

export const SPELL_DAMAGE_PROCEDURES = [
  "spellAttackDamage",
  "saveGatedDamage",
] as const;
export type SpellDamageProcedure = (typeof SPELL_DAMAGE_PROCEDURES)[number];

export const SPELL_SLOT_PROCEDURES = [
  ...SPELL_DAMAGE_PROCEDURES,
  "attackBurstSaveDamage",
  "chainedSpellAttackDamage",
  "spellAttackSequence",
  "saveGatedCondition",
  "saveGatedConditionImmunity",
  "saveGatedAttackRollAdvantage",
  "stagedSaveCondition",
  "saveGatedConditionWithRepeat",
  "saveGatedAreaControl",
  "saveGatedTurnConstraintBundle",
  "persistentAreaSaveCondition",
  "persistentAreaSaveConditionEscape",
  "directionalPersistentArea",
  "persistentAreaTrait",
  "magicalDarknessPointOrigin",
  "magicSuppressionEmanation",
  "persistentAreaSaveDamage",
  "spatialMeleeSpellAttackProxy",
  "areaMovementDistanceDamage",
  "persistentAreaSaveComposite",
  "objectContactDamage",
  "spellCreatedHeldObject",
  "compelledNextTurnBehavior",
  "repeatedDamageAllocation",
  "directHitPointRestoration",
  "rollModifier",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "controlledVerticalSuspension",
  "linkedDefenseResistanceDamageShare",
  "scalarBuff",
  "selfTransformationMode",
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  "creatureTypeProtection",
  "perceptionGatedAttackRollDefense",
  "seeInvisibleObserverSight",
  "duplicateHitInterception",
  "conditionRemovalProtection",
  "chosenDamageResistance",
  "compositeTargetBuffWithAftermath",
  "directConditionRemoval",
  "weaponDamageRider",
  "weaponAttackDamageEnhancement",
  "afterHitDamage",
  "afterHitSaveGatedCondition",
  "abilityD20TestRollModeSaveGate",
  "afterHitTimedDamageAndSave",
  "afterHitDamageAndIllumination",
  "markedDamageRider",
  "grantedAlternateActionCost",
  "fixedCostMovementReplacement",
  "grantedAreaSaveDamageAction",
  "selfTeleport",
  "targetingSaveInterdiction",
  "directCondition",
  "persistentArmorEffect",
  "triggeredArmorDefense",
  "spellCastInterruptionReaction",
  "objectLight",
  "ongoingSpellEnd",
  "fallingCreatureMitigationReaction",
] as const;
export type SpellSlotProcedure = (typeof SPELL_SLOT_PROCEDURES)[number];
export const SpellInvocationSourceRefSchema = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("classSpellcasting") }),
  Schema.Struct({
    tag: Schema.Literal("spellAccess"),
    spellAccessRef: BattleSpellAccessExecutionRef,
  }),
]);
export type SpellInvocationSourceRef =
  typeof SpellInvocationSourceRefSchema.Type;

export const SpellInvocationRefSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("cantrip"),
    spellId: SpellId,
    source: SpellInvocationSourceRefSchema,
    procedure: Schema.Literals(CANTRIP_SPELL_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("spellSlot"),
    spellId: SpellId,
    source: SpellInvocationSourceRefSchema,
    slotLevel: SpellSlotLevel,
    procedure: Schema.Literals(SPELL_SLOT_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("spellAccessFreeCast"),
    spellId: SpellId,
    source: SpellInvocationSourceRefSchema,
    resourcePoolRef: BattleResourcePoolExecutionRef,
    procedure: Schema.Literals(SPELL_SLOT_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("armorOfShadows"),
    spellId: SpellId,
    procedure: Schema.Literal("persistentArmorEffect"),
  }),
  Schema.Struct({
    tag: Schema.Literal("spellEffect"),
    spellId: SpellId,
    sourceCombatantId: CombatantId,
    procedure: Schema.Literals([
      "markedDamageRiderTransfer",
      "objectContactDamageRepeat",
      "spatialMeleeSpellAttackProxy",
      "spellCreatedHeldObjectAttack",
      "spellCreatedHeldObjectReEvoke",
    ]),
  }),
]);
export type SpellInvocationRef = typeof SpellInvocationRefSchema.Type;
export type SpellInvocationRefEncoded = typeof SpellInvocationRefSchema.Encoded;

export function scopedCantripSpellInvocationRef(
  rawSpellId: string,
  procedure: CantripSpellProcedure,
  source: SpellInvocationSourceRef,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: makeSpellId(rawSpellId),
    source,
    procedure,
  };
}

export function cantripSpellInvocationRef(
  rawSpellId: string,
  procedure: CantripSpellProcedure,
): SpellInvocationRef {
  return scopedCantripSpellInvocationRef(rawSpellId, procedure, {
    tag: "classSpellcasting",
  });
}

export function scopedSpellSlotInvocationRef(
  rawSpellId: string,
  rawSlotLevel: number,
  procedure: SpellSlotProcedure,
  source: SpellInvocationSourceRef,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: makeSpellId(rawSpellId),
    source,
    slotLevel: spellSlotLevel(rawSlotLevel),
    procedure,
  };
}

export function spellSlotInvocationRef(
  rawSpellId: string,
  rawSlotLevel: number,
  procedure: SpellSlotProcedure,
): SpellInvocationRef {
  return scopedSpellSlotInvocationRef(rawSpellId, rawSlotLevel, procedure, {
    tag: "classSpellcasting",
  });
}

export function spellEffectInvocationRef(
  rawSpellId: string,
  sourceCombatantId: CombatantId,
  procedure:
    | "markedDamageRiderTransfer"
    | "objectContactDamageRepeat"
    | "spatialMeleeSpellAttackProxy"
    | "spellCreatedHeldObjectAttack"
    | "spellCreatedHeldObjectReEvoke",
): SpellInvocationRef {
  return {
    tag: "spellEffect",
    spellId: makeSpellId(rawSpellId),
    sourceCombatantId,
    procedure,
  };
}

export function scopedSpellAccessFreeCastSpellInvocationRef(
  rawSpellId: string,
  resourcePoolRef: BattleResourcePoolExecutionRef,
  procedure: SpellSlotProcedure,
  source: Extract<
    SpellInvocationRef,
    { readonly tag: "spellAccessFreeCast" }
  >["source"],
): SpellInvocationRef;
export function scopedSpellAccessFreeCastSpellInvocationRef(
  rawSpellId: string,
  resourcePoolRef: BattleResourcePoolExecutionRef,
  procedure: SpellSlotProcedure,
  source: SpellInvocationSourceRef,
): SpellInvocationRef {
  return {
    tag: "spellAccessFreeCast",
    spellId: makeSpellId(rawSpellId),
    source,
    resourcePoolRef,
    procedure,
  };
}

export function spellAccessFreeCastSpellInvocationRef(
  rawSpellId: string,
  resourcePoolRef: BattleResourcePoolExecutionRef,
  procedure: SpellSlotProcedure,
): SpellInvocationRef {
  return scopedSpellAccessFreeCastSpellInvocationRef(
    rawSpellId,
    resourcePoolRef,
    procedure,
    { tag: "classSpellcasting" },
  );
}

export function armorOfShadowsSpellInvocationRef(
  rawSpellId: string,
): SpellInvocationRef {
  return {
    tag: "armorOfShadows",
    spellId: makeSpellId(rawSpellId),
    procedure: "persistentArmorEffect",
  };
}

export const SpellSubjectModeSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("cast"),
  }),
  Schema.Struct({
    tag: Schema.Literal("ready"),
    trigger: Schema.Literals(BATTLE_READIED_SPELL_TRIGGERS),
  }),
]);
export type SpellSubjectMode = typeof SpellSubjectModeSchema.Type;
const SpellCastSubjectModeSchema = Schema.Struct({
  tag: Schema.Literal("cast"),
});

const NON_TRANSMUTED_SPELL_METAMAGIC_EFFECT_KINDS = [
  ...CHARACTER_BATTLE_METAMAGIC_EFFECT_KINDS.filter(
    (
      effectKind,
    ): effectKind is Exclude<
      CharacterBattleMetamagicEffectKind,
      typeof TRANSMUTED_METAMAGIC_EFFECT_KIND
    > => effectKind !== TRANSMUTED_METAMAGIC_EFFECT_KIND,
  ),
] as const;
const TransmutedSpellDamageTypeSchema = Schema.Literals(
  TRANSMUTED_SPELL_DAMAGE_TYPES,
);

export const SpellMetamagicSelectionSchema = Schema.Union([
  Schema.Struct({
    effectKind: Schema.Literals(NON_TRANSMUTED_SPELL_METAMAGIC_EFFECT_KINDS),
  }),
  Schema.Struct({
    effectKind: Schema.Literal(TRANSMUTED_METAMAGIC_EFFECT_KIND),
    targetDamageType: TransmutedSpellDamageTypeSchema,
  }),
]);
export type SpellMetamagicSelection = typeof SpellMetamagicSelectionSchema.Type;

const SpellMetamagicSelectionsSchema = Schema.NonEmptyArray(
  SpellMetamagicSelectionSchema,
);

export const BattleAttackExecutionAbilitySchema = Schema.Union([
  AbilitySchema,
  Schema.Literal("spellcasting"),
]);

export const CharacterAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleAttackProcedureExecutionRef,
  attackAbility: BattleAttackExecutionAbilitySchema,
  attackDamageType: DamageTypeSchema,
  attackName: Schema.optionalKey(Schema.Never),
  statBlockDamageSelection: Schema.optionalKey(Schema.Never),
});

const StatBlockAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleStatBlockProcedureExecutionRef,
  attackAbility: Schema.optionalKey(Schema.Never),
  attackDamageType: Schema.optionalKey(Schema.Never),
  attackName: Schema.optionalKey(Schema.Never),
  statBlockDamageSelection: StatBlockAttackDamageSelection,
});

export const BattleAttackExecutionSelectionSchema = Schema.Union([
  CharacterAttackExecutionSelectionSchema,
  StatBlockAttackExecutionSelectionSchema,
]);
export type BattleAttackExecutionSelection =
  typeof BattleAttackExecutionSelectionSchema.Type;

export const ReadyTriggerDescription = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("ReadyTriggerDescription"),
);
export type ReadyTriggerDescription = typeof ReadyTriggerDescription.Type;
export const readyTriggerDescription: (
  value: string,
) => ReadyTriggerDescription = ReadyTriggerDescription.make;

export const BattleInterruptAttackExecutionSelectionSchema = Schema.Union([
  CharacterAttackExecutionSelectionSchema,
  StatBlockAttackExecutionSelectionSchema,
]);
export type BattleInterruptAttackExecutionSelection =
  typeof BattleInterruptAttackExecutionSelectionSchema.Type;

export const battleInterruptAttackExecutionSelectionWithFields = <
  const Fields extends Schema.Struct.Fields,
>(
  fields: Fields,
) =>
  Schema.Union([
    CharacterAttackExecutionSelectionSchema.pipe(Schema.fieldsAssign(fields)),
    StatBlockAttackExecutionSelectionSchema.pipe(Schema.fieldsAssign(fields)),
  ]);

const BattleInterruptReleaseReadiedSpellSubjectSchema = Schema.Struct({
  tag: Schema.Literal("runtimeCommand"),
  actorId: CombatantId,
  command: Schema.Literal("releaseReadiedSpell"),
  readiedSpellCasterId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
});

const BattleInterruptReleaseReadiedMovementSubjectSchema = Schema.Struct({
  tag: Schema.Literal("runtimeCommand"),
  actorId: CombatantId,
  command: Schema.Literal("releaseReadiedMovement"),
  readiedMovementActorId: CombatantId,
});

const BattleInterruptReleaseReadiedActionSubjectSchema = Schema.Struct({
  tag: Schema.Literal("runtimeCommand"),
  actorId: CombatantId,
  command: Schema.Literal("releaseReadiedAction"),
  reactorId: CombatantId,
});

const BattleInterruptReleaseReadiedAttackSubjectSchema = Schema.Struct({
  tag: Schema.Literal("runtimeCommand"),
  actorId: CombatantId,
  command: Schema.Literal("releaseReadiedAttack"),
  reactorId: CombatantId,
  targetId: CombatantId,
  procedureRef: Schema.Union([
    BattleAttackProcedureExecutionRef,
    BattleStatBlockProcedureExecutionRef,
  ]),
  attackAbility: Schema.optionalKey(Schema.Never),
  attackDamageType: Schema.optionalKey(Schema.Never),
});

const BattleInterruptCastTriggeredReactionSpellSubjectSchema = Schema.Struct({
  tag: Schema.Literal("runtimeCommand"),
  actorId: CombatantId,
  command: Schema.Literal("castTriggeredReactionSpell"),
  reactorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
});

const BattleInterruptCastAttackHitBonusActionSpellSubjectSchema = Schema.Struct(
  {
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("castAttackHitBonusActionSpell"),
    casterId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
  },
);

const BattleInterruptOpportunityAttackSubjectSchema =
  battleInterruptAttackExecutionSelectionWithFields({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("opportunityAttack"),
    reactorId: CombatantId,
    targetId: CombatantId,
    distanceFeet: MovementFeet,
  });

const BattleInterruptRetaliationAttackSubjectSchema =
  battleInterruptAttackExecutionSelectionWithFields({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("retaliationAttack"),
    reactorId: CombatantId,
    targetId: CombatantId,
  });

export const BattleInterruptSubjectSchema = Schema.Union([
  BattleInterruptReleaseReadiedSpellSubjectSchema,
  BattleInterruptReleaseReadiedMovementSubjectSchema,
  BattleInterruptReleaseReadiedActionSubjectSchema,
  BattleInterruptReleaseReadiedAttackSubjectSchema,
  BattleInterruptCastTriggeredReactionSpellSubjectSchema,
  BattleInterruptCastAttackHitBonusActionSpellSubjectSchema,
  BattleInterruptOpportunityAttackSubjectSchema,
  BattleInterruptRetaliationAttackSubjectSchema,
]);
export type BattleInterruptSubject = typeof BattleInterruptSubjectSchema.Type;

export const BattleReadyActionSubjectSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("dash"),
    speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("disengage"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("dodge"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("helpAttack"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("hide"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("search"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("grapple"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("shove"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("escapeGrapple"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("escapeSpellRestraint"),
    ...RejectRedundantSpellProcedureSourceFields,
    targetId: CombatantId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("shakeAwakeFromStagedCondition"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("shakeAwakeFromAreaControl"),
  }),
]);
export type BattleReadyActionSubject =
  typeof BattleReadyActionSubjectSchema.Type;

// BattleSubject is a replay key returned by discoverBattleActs and copied back
// by callers. It identifies one discovered runtime act; it is not Surface
// authored content, provenance, or a complete taxonomy of D&D actions.
export const BattleSubjectSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("attack"),
    procedureRef: BattleAttackProcedureExecutionRef,
    attackAbility: BattleAttackExecutionAbilitySchema,
    attackDamageType: DamageTypeSchema,
    attackName: Schema.optionalKey(Schema.Never),
    statBlockSection: Schema.optionalKey(Schema.Never),
    statBlockDamageSelection: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("attack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attackAbility: Schema.optionalKey(Schema.Never),
    attackDamageType: Schema.optionalKey(Schema.Never),
    attackName: Schema.optionalKey(Schema.Never),
    statBlockSection: Schema.optionalKey(Schema.Never),
    statBlockDamageSelection: StatBlockAttackDamageSelection,
  }),
  Schema.Struct({
    tag: Schema.Literal("companionAttack"),
    actorId: CombatantId,
    familiarId: CombatantId,
    procedureRef: BattleStatBlockProcedureExecutionRef,
    statBlockDamageSelection: StatBlockAttackDamageSelection,
  }),
  BattleReadyActionSubjectSchema,
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("multiattack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("ready"),
  }),
  Schema.Union([
    Schema.Struct({
      tag: Schema.Literal("bonusAction"),
      actorId: CombatantId,
      action: Schema.Literal("offHandAttack"),
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
    }),
    Schema.Struct({
      tag: Schema.Literal("bonusAction"),
      actorId: CombatantId,
      action: Schema.Literal("martialArtsUnarmedStrike"),
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
    }),
  ]),
  Schema.Struct({
    tag: Schema.Literal("bonusAction"),
    actorId: CombatantId,
    action: Schema.Literal("statBlockActionOption"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    standardAction: Schema.Literals(STANDARD_ACTION_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalKey(Schema.Never),
    sourceEffectRef: BattleEffectExecutionRef,
    action: Schema.Literal("dash"),
    speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    sourceEffectRef: Schema.optionalKey(Schema.Never),
    action: Schema.Literal("dash"),
    speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalKey(Schema.Never),
    sourceEffectRef: Schema.optionalKey(Schema.Never),
    action: Schema.Literals(["disengage", "hide"]),
  }),
  Schema.Union([
    Schema.Struct({
      tag: Schema.Literal("monkFocusOption"),
      actorId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      resourceUnitId: Schema.optionalKey(Schema.Never),
      option: Schema.Literal("flurryOfBlows"),
    }),
    Schema.Struct({
      tag: Schema.Literal("monkFocusOption"),
      actorId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      resourceUnitId: Schema.optionalKey(Schema.Never),
      option: Schema.Literal("patientDefense"),
      mode: Schema.Literals(MONK_FOCUS_PATIENT_DEFENSE_MODES),
    }),
    Schema.Struct({
      tag: Schema.Literal("monkFocusOption"),
      actorId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      resourceUnitId: Schema.optionalKey(Schema.Never),
      option: Schema.Literal("stepOfTheWind"),
      mode: Schema.Literals(MONK_FOCUS_STEP_OF_THE_WIND_MODES),
      speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
    }),
  ]),
  Schema.Struct({
    tag: Schema.Literal("monkFocusFlurryOfBlowsStrike"),
    actorId: CombatantId,
    focusProcedureRef: BattleProcedureExecutionRef,
    procedureRef: BattleAttackProcedureExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("actionSpell"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    invocation: Schema.optionalKey(Schema.Never),
    mode: SpellSubjectModeSchema,
    metamagic: Schema.optionalKey(SpellMetamagicSelectionsSchema),
    componentWeaponObjectId: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionSpell"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    invocation: Schema.optionalKey(Schema.Never),
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
    metamagic: Schema.optionalKey(SpellMetamagicSelectionsSchema),
    componentWeaponObjectId: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionDashSpell"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    invocation: Schema.optionalKey(Schema.Never),
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
    speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeature"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeatureHeldWeaponActivation"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalKey(Schema.Never),
    weaponItemId: BattleObjectId,
  }),
  Schema.Struct({
    tag: Schema.Literal("druidWildShape"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalKey(Schema.Never),
    action: Schema.Literal("assumeForm"),
    formExecutionRef: BattleStatBlockExecutionScopeRef,
    formStatBlockId: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    tag: Schema.Literal("druidWildShape"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalKey(Schema.Never),
    action: Schema.Literal("dismiss"),
  }),
  Schema.Struct({
    tag: Schema.Literal("companionLifecycle"),
    actorId: CombatantId,
    action: Schema.Literals([
      "temporarilyDismiss",
      "reappear",
      "permanentlyDismiss",
    ]),
  }),
  Schema.Struct({
    tag: Schema.Literal("spawnedCompanionSharedSenses"),
    actorId: CombatantId,
    familiarId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("spawnedCompanionTouchSpellProxy"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    invocation: Schema.optionalKey(Schema.Never),
    companionId: CombatantId,
    spellAction: Schema.Literals(["action", "bonusAction"]),
    mode: SpellCastSubjectModeSchema,
    metamagic: Schema.optionalKey(SpellMetamagicSelectionsSchema),
    componentWeaponObjectId: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endTurn"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endConcentration"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("move"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("standFromProne"),
  }),
  BattleInterruptReleaseReadiedSpellSubjectSchema,
  BattleInterruptReleaseReadiedMovementSubjectSchema,
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("reportReadyTrigger"),
    readiedActorId: CombatantId,
  }),
  BattleInterruptReleaseReadiedActionSubjectSchema,
  BattleInterruptReleaseReadiedAttackSubjectSchema,
  BattleInterruptCastTriggeredReactionSpellSubjectSchema,
  BattleInterruptCastAttackHitBonusActionSpellSubjectSchema,
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseGrapple"),
    targetId: CombatantId,
  }),
  BattleInterruptOpportunityAttackSubjectSchema,
  BattleInterruptRetaliationAttackSubjectSchema,
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("persistentAreaSaveConditionSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literals(["entersArea", "endsTurnInArea"]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("persistentAreaSaveConditionEscapeSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literals(["entersArea", "startsTurnInArea"]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("persistentAreaSaveCompositeSave"),
    areaMembershipTrigger: BattlePersistentAreaSaveCompositeTriggerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("persistentAreaSaveDamageSave"),
    areaMembershipTrigger:
      BattleStationaryPersistentAreaSaveDamageTriggerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("persistentAreaSaveDamageSave"),
    areaMembershipTrigger:
      BattleTranslatingPersistentAreaSaveDamageTriggerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endPersistentAreaSaveDamageForEnvironment"),
    ...RejectRedundantSpellSourceFields,
    effectOwnerId: CombatantId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endPersistentAreaSaveConditionEscapeForDeparture"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal(
      "endPersistentAreaSaveConditionEscapeForAreaRemoval",
    ),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("directionalPersistentAreaSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    directionId: BattleLineDirectionId,
    trigger: Schema.Literal("endsTurnInLine"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("directionalPersistentAreaDirectionChange"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    directionId: BattleLineDirectionId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literal("endsTurnWithinFiveFeetOfSphere"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literals([
      "appearsInArea",
      "areaMovesIntoSpace",
      "entersArea",
      "endsTurnInArea",
    ]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("persistentAreaSaveDamageExit"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneReposition"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneRam"),
    ...RejectRedundantSpellSourceFields,
    targetId: CombatantId,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literal("rammedBySphere"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseSpellCreatedHeldObject"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("protectionRelevantEffectSave"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
    relevantEffect: Schema.Literals(["charmed", "frightened", "possession"]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("creatureTypeProtectionConditionAttempt"),
    sourceCombatantId: CombatantId,
    condition: Schema.Literals(["charmed", "frightened"]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("creatureTypeProtectionPossessionAttempt"),
    sourceCombatantId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endPersistentAreaTraitForEnvironment"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("linkedDefenseResistanceDamageShareSeparation"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("fixedCostMovementReplacement"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("grantedAreaSaveDamageAction"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("replaceSelfTransformationMode"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
    mode: Schema.Literals(SELF_TRANSFORMATION_NON_NATURAL_WEAPON_MODE_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("replaceSelfTransformationMode"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
    mode: Schema.Literal(SELF_TRANSFORMATION_NATURAL_WEAPONS_MODE_KIND),
    naturalWeaponDamageType: DamageTypeSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("executeCompelledGrovel"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("executeCompelledDrop"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("executeCompelledApproach"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("executeCompelledFlee"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("controlledVerticalSuspensionAltitudeControl"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("creatureFalls"),
    fallingCreatureId: CombatantId,
  }),
]);
type BattleSubjectWireValue = typeof BattleSubjectSchema.Type;
export type BattleSubject = BattleSubjectWireValue;

export const BattleReadyResponseSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("movement") }),
  Schema.Struct({
    kind: Schema.Literal("attack"),
    selection: BattleAttackExecutionSelectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    subject: BattleReadyActionSubjectSchema,
  }),
]);
export type BattleReadyResponse = typeof BattleReadyResponseSchema.Type;

// A held response is a read-model fact, not an executable replay key. The
// eventual interrupt choice carries its stable procedure reference; resolution
// recovers the complete attack selection from the internal held response.
export const BattleReadyResponseSnapshotSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("movement") }),
  Schema.Struct({
    kind: Schema.Literal("attack"),
    procedureRef: Schema.Union([
      BattleAttackProcedureExecutionRef,
      BattleStatBlockProcedureExecutionRef,
    ]),
    selection: Schema.optionalKey(Schema.Never),
    attackAbility: Schema.optionalKey(Schema.Never),
    attackDamageType: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    subject: BattleReadyActionSubjectSchema,
  }),
]);
export type BattleReadyResponseSnapshot =
  typeof BattleReadyResponseSnapshotSchema.Type;

const noProcedureExecutionReferences =
  (): readonly BattleProcedureExecutionRef[] => [];

function battleActionSubjectProcedureRefs(
  subject: Extract<BattleSubject, { readonly tag: "action" }>,
): readonly BattleProcedureExecutionRef[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("action")({
      attack: (value) => [value.procedureRef],
      dash: noProcedureExecutionReferences,
      disengage: noProcedureExecutionReferences,
      dodge: noProcedureExecutionReferences,
      helpAttack: noProcedureExecutionReferences,
      hide: noProcedureExecutionReferences,
      multiattack: (value) => [value.procedureRef],
      ready: noProcedureExecutionReferences,
      search: noProcedureExecutionReferences,
      grapple: noProcedureExecutionReferences,
      shove: noProcedureExecutionReferences,
      escapeGrapple: noProcedureExecutionReferences,
      escapeSpellRestraint: noProcedureExecutionReferences,
      shakeAwakeFromStagedCondition: noProcedureExecutionReferences,
      shakeAwakeFromAreaControl: noProcedureExecutionReferences,
    }),
  );
}

function battleRuntimeCommandProcedureRefs(
  subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): readonly BattleProcedureExecutionRef[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      endTurn: noProcedureExecutionReferences,
      endConcentration: noProcedureExecutionReferences,
      move: noProcedureExecutionReferences,
      standFromProne: noProcedureExecutionReferences,
      releaseReadiedSpell: (value) => [value.procedureRef],
      releaseReadiedMovement: noProcedureExecutionReferences,
      reportReadyTrigger: noProcedureExecutionReferences,
      releaseReadiedAction: noProcedureExecutionReferences,
      releaseReadiedAttack: (value) => [value.procedureRef],
      castTriggeredReactionSpell: (value) => [value.procedureRef],
      castAttackHitBonusActionSpell: (value) => [value.procedureRef],
      releaseGrapple: noProcedureExecutionReferences,
      opportunityAttack: (value) => [value.procedureRef],
      retaliationAttack: (value) => [value.procedureRef],
      persistentAreaSaveConditionSave: noProcedureExecutionReferences,
      persistentAreaSaveConditionEscapeSave: noProcedureExecutionReferences,
      persistentAreaSaveCompositeSave: noProcedureExecutionReferences,
      persistentAreaSaveDamageSave: noProcedureExecutionReferences,
      endPersistentAreaSaveDamageForEnvironment: noProcedureExecutionReferences,
      endPersistentAreaSaveConditionEscapeForDeparture:
        noProcedureExecutionReferences,
      endPersistentAreaSaveConditionEscapeForAreaRemoval:
        noProcedureExecutionReferences,
      directionalPersistentAreaSave: noProcedureExecutionReferences,
      directionalPersistentAreaDirectionChange: noProcedureExecutionReferences,
      movableZoneSave: noProcedureExecutionReferences,
      persistentAreaSaveDamageExit: noProcedureExecutionReferences,
      movableZoneReposition: noProcedureExecutionReferences,
      movableZoneRam: noProcedureExecutionReferences,
      releaseSpellCreatedHeldObject: noProcedureExecutionReferences,
      protectionRelevantEffectSave: noProcedureExecutionReferences,
      creatureTypeProtectionConditionAttempt: noProcedureExecutionReferences,
      creatureTypeProtectionPossessionAttempt: noProcedureExecutionReferences,
      endPersistentAreaTraitForEnvironment: noProcedureExecutionReferences,
      linkedDefenseResistanceDamageShareSeparation:
        noProcedureExecutionReferences,
      fixedCostMovementReplacement: noProcedureExecutionReferences,
      grantedAreaSaveDamageAction: noProcedureExecutionReferences,
      replaceSelfTransformationMode: noProcedureExecutionReferences,
      executeCompelledGrovel: noProcedureExecutionReferences,
      executeCompelledDrop: noProcedureExecutionReferences,
      executeCompelledApproach: noProcedureExecutionReferences,
      executeCompelledFlee: noProcedureExecutionReferences,
      controlledVerticalSuspensionAltitudeControl:
        noProcedureExecutionReferences,
      creatureFalls: noProcedureExecutionReferences,
    }),
  );
}

export function battleSubjectProcedureRefs(
  subject: BattleSubject,
): readonly BattleProcedureExecutionRef[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: battleActionSubjectProcedureRefs,
      companionAttack: (value) => [value.procedureRef],
      bonusAction: (value) => [value.procedureRef],
      bonusActionStandardAction: (value) => [value.procedureRef],
      monkFocusOption: (value) => [value.procedureRef],
      monkFocusFlurryOfBlowsStrike: (value) => [
        value.focusProcedureRef,
        value.procedureRef,
      ],
      actionSpell: (value) => [value.procedureRef],
      bonusActionSpell: (value) => [value.procedureRef],
      bonusActionDashSpell: (value) => [value.procedureRef],
      unitFeature: (value) => [value.procedureRef],
      unitFeatureHeldWeaponActivation: (value) => [value.procedureRef],
      druidWildShape: (value) => [value.procedureRef],
      companionLifecycle: noProcedureExecutionReferences,
      spawnedCompanionSharedSenses: noProcedureExecutionReferences,
      spawnedCompanionTouchSpellProxy: (value) => [value.procedureRef],
      runtimeCommand: battleRuntimeCommandProcedureRefs,
    }),
  );
}

export function battleSubjectProcedureRefsBelongToOwners(
  subject: BattleSubject,
): boolean {
  const runtimeRequestOwner = (
    value: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
  ): CombatantId =>
    Match.value(value).pipe(
      Match.discriminatorsExhaustive("command")({
        endTurn: (v) => v.actorId,
        endConcentration: (v) => v.actorId,
        move: (v) => v.actorId,
        standFromProne: (v) => v.actorId,
        releaseReadiedSpell: (v) => v.readiedSpellCasterId,
        releaseReadiedMovement: (v) => v.actorId,
        reportReadyTrigger: (v) => v.actorId,
        releaseReadiedAction: (v) => v.actorId,
        releaseReadiedAttack: (v) => v.reactorId,
        castTriggeredReactionSpell: (v) => v.reactorId,
        castAttackHitBonusActionSpell: (v) => v.casterId,
        releaseGrapple: (v) => v.actorId,
        opportunityAttack: (v) => v.reactorId,
        retaliationAttack: (v) => v.reactorId,
        persistentAreaSaveConditionSave: (v) => v.actorId,
        persistentAreaSaveConditionEscapeSave: (v) => v.actorId,
        persistentAreaSaveCompositeSave: (v) => v.actorId,
        persistentAreaSaveDamageSave: (v) => v.actorId,
        endPersistentAreaSaveDamageForEnvironment: (v) => v.actorId,
        endPersistentAreaSaveConditionEscapeForDeparture: (v) => v.actorId,
        endPersistentAreaSaveConditionEscapeForAreaRemoval: (v) => v.actorId,
        directionalPersistentAreaSave: (v) => v.actorId,
        directionalPersistentAreaDirectionChange: (v) => v.actorId,
        movableZoneSave: (v) => v.actorId,
        persistentAreaSaveDamageExit: (v) => v.actorId,
        movableZoneReposition: (v) => v.actorId,
        movableZoneRam: (v) => v.actorId,
        releaseSpellCreatedHeldObject: (v) => v.actorId,
        protectionRelevantEffectSave: (v) => v.actorId,
        creatureTypeProtectionConditionAttempt: (v) => v.actorId,
        creatureTypeProtectionPossessionAttempt: (v) => v.actorId,
        endPersistentAreaTraitForEnvironment: (v) => v.actorId,
        linkedDefenseResistanceDamageShareSeparation: (v) => v.actorId,
        fixedCostMovementReplacement: (v) => v.actorId,
        grantedAreaSaveDamageAction: (v) => v.actorId,
        replaceSelfTransformationMode: (v) => v.actorId,
        executeCompelledGrovel: (v) => v.actorId,
        executeCompelledDrop: (v) => v.actorId,
        executeCompelledApproach: (v) => v.actorId,
        executeCompelledFlee: (v) => v.actorId,
        controlledVerticalSuspensionAltitudeControl: (v) => v.actorId,
        creatureFalls: (v) => v.fallingCreatureId,
      }),
    );
  const ownerId = Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: (value) => value.actorId,
      companionAttack: (value) => value.familiarId,
      bonusAction: (value) => value.actorId,
      bonusActionStandardAction: (value) => value.actorId,
      monkFocusOption: (value) => value.actorId,
      monkFocusFlurryOfBlowsStrike: (value) => value.actorId,
      actionSpell: (value) => value.actorId,
      bonusActionSpell: (value) => value.actorId,
      bonusActionDashSpell: (value) => value.actorId,
      unitFeature: (value) => value.actorId,
      unitFeatureHeldWeaponActivation: (value) => value.actorId,
      druidWildShape: (value) => value.actorId,
      companionLifecycle: (value) => value.actorId,
      spawnedCompanionSharedSenses: (value) => value.actorId,
      spawnedCompanionTouchSpellProxy: (value) => value.actorId,
      runtimeCommand: runtimeRequestOwner,
    }),
  );
  return battleSubjectProcedureRefs(subject).every((procedureRef) =>
    battleProcedureExecutionRefBelongsToCombatant(procedureRef, ownerId),
  );
}

export type BattleSubjectBoundExecutionReference =
  | {
      readonly kind: "activeEffect";
      readonly ownerId: CombatantId;
      readonly effectRef: BattleEffectExecutionRef;
    }
  | {
      readonly kind: "activeEffectOccurrence";
      readonly effectRef: BattleEffectExecutionRef;
    }
  | {
      readonly kind: "statBlockScope";
      readonly ownerId: CombatantId;
      readonly scopeRef: BattleStatBlockExecutionScopeRef;
    };

const noBoundExecutionReferences =
  (): readonly BattleSubjectBoundExecutionReference[] => [];

function battleActionSubjectBoundExecutionReferences(
  subject: Extract<BattleSubject, { readonly tag: "action" }>,
): readonly BattleSubjectBoundExecutionReference[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("action")({
      attack: noBoundExecutionReferences,
      dash: noBoundExecutionReferences,
      disengage: noBoundExecutionReferences,
      dodge: noBoundExecutionReferences,
      helpAttack: noBoundExecutionReferences,
      hide: noBoundExecutionReferences,
      multiattack: noBoundExecutionReferences,
      ready: noBoundExecutionReferences,
      search: noBoundExecutionReferences,
      grapple: noBoundExecutionReferences,
      shove: noBoundExecutionReferences,
      escapeGrapple: noBoundExecutionReferences,
      escapeSpellRestraint: (value) => [
        {
          kind: "activeEffect" as const,
          ownerId: value.targetId,
          effectRef: value.effectRef,
        },
      ],
      shakeAwakeFromStagedCondition: noBoundExecutionReferences,
      shakeAwakeFromAreaControl: noBoundExecutionReferences,
    }),
  );
}

function battleBonusActionStandardActionBoundExecutionReferences(
  subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction" }
  >,
): readonly BattleSubjectBoundExecutionReference[] {
  return subject.sourceEffectRef === undefined
    ? []
    : [
        {
          kind: "activeEffect",
          ownerId: subject.actorId,
          effectRef: subject.sourceEffectRef,
        },
      ];
}

function battleDruidWildShapeBoundExecutionReferences(
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
): readonly BattleSubjectBoundExecutionReference[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("action")({
      assumeForm: (value) => [
        {
          kind: "statBlockScope" as const,
          ownerId: value.actorId,
          scopeRef: value.formExecutionRef,
        },
      ],
      dismiss: noBoundExecutionReferences,
    }),
  );
}

function battleRuntimeCommandBoundExecutionReferences(
  subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): readonly BattleSubjectBoundExecutionReference[] {
  const actorEffect = (value: {
    readonly actorId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
  }): readonly BattleSubjectBoundExecutionReference[] => [
    {
      kind: "activeEffect",
      ownerId: value.actorId,
      effectRef: value.effectRef,
    },
  ];
  const targetEffect = (value: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
  }): readonly BattleSubjectBoundExecutionReference[] => [
    {
      kind: "activeEffect",
      ownerId: value.targetId,
      effectRef: value.effectRef,
    },
  ];
  const activeEffectOccurrence = (value: {
    readonly effectRef: BattleEffectExecutionRef;
  }): readonly BattleSubjectBoundExecutionReference[] => [
    { kind: "activeEffectOccurrence", effectRef: value.effectRef },
  ];
  const ownedEffect = (value: {
    readonly effectOwnerId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
  }): readonly BattleSubjectBoundExecutionReference[] => [
    {
      kind: "activeEffect",
      ownerId: value.effectOwnerId,
      effectRef: value.effectRef,
    },
  ];
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      endTurn: noBoundExecutionReferences,
      endConcentration: noBoundExecutionReferences,
      move: noBoundExecutionReferences,
      standFromProne: noBoundExecutionReferences,
      releaseReadiedSpell: noBoundExecutionReferences,
      releaseReadiedMovement: noBoundExecutionReferences,
      reportReadyTrigger: noBoundExecutionReferences,
      releaseReadiedAction: noBoundExecutionReferences,
      releaseReadiedAttack: noBoundExecutionReferences,
      castTriggeredReactionSpell: noBoundExecutionReferences,
      castAttackHitBonusActionSpell: noBoundExecutionReferences,
      releaseGrapple: noBoundExecutionReferences,
      opportunityAttack: noBoundExecutionReferences,
      retaliationAttack: noBoundExecutionReferences,
      persistentAreaSaveConditionSave: activeEffectOccurrence,
      persistentAreaSaveConditionEscapeSave: activeEffectOccurrence,
      persistentAreaSaveCompositeSave: (value) =>
        activeEffectOccurrence(value.areaMembershipTrigger),
      persistentAreaSaveDamageSave: (value) =>
        activeEffectOccurrence(value.areaMembershipTrigger),
      endPersistentAreaSaveDamageForEnvironment: ownedEffect,
      endPersistentAreaSaveConditionEscapeForDeparture: activeEffectOccurrence,
      endPersistentAreaSaveConditionEscapeForAreaRemoval:
        activeEffectOccurrence,
      directionalPersistentAreaSave: activeEffectOccurrence,
      directionalPersistentAreaDirectionChange: activeEffectOccurrence,
      movableZoneSave: activeEffectOccurrence,
      persistentAreaSaveDamageExit: activeEffectOccurrence,
      movableZoneReposition: activeEffectOccurrence,
      movableZoneRam: activeEffectOccurrence,
      releaseSpellCreatedHeldObject: actorEffect,
      protectionRelevantEffectSave: actorEffect,
      creatureTypeProtectionConditionAttempt: noBoundExecutionReferences,
      creatureTypeProtectionPossessionAttempt: noBoundExecutionReferences,
      endPersistentAreaTraitForEnvironment: noBoundExecutionReferences,
      linkedDefenseResistanceDamageShareSeparation: targetEffect,
      fixedCostMovementReplacement: actorEffect,
      grantedAreaSaveDamageAction: actorEffect,
      replaceSelfTransformationMode: actorEffect,
      executeCompelledGrovel: actorEffect,
      executeCompelledDrop: actorEffect,
      executeCompelledApproach: actorEffect,
      executeCompelledFlee: actorEffect,
      controlledVerticalSuspensionAltitudeControl: targetEffect,
      creatureFalls: noBoundExecutionReferences,
    }),
  );
}

export function battleSubjectBoundExecutionReferences(
  subject: BattleSubject,
): readonly BattleSubjectBoundExecutionReference[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: battleActionSubjectBoundExecutionReferences,
      companionAttack: noBoundExecutionReferences,
      bonusAction: noBoundExecutionReferences,
      bonusActionStandardAction:
        battleBonusActionStandardActionBoundExecutionReferences,
      monkFocusOption: noBoundExecutionReferences,
      monkFocusFlurryOfBlowsStrike: noBoundExecutionReferences,
      actionSpell: noBoundExecutionReferences,
      bonusActionSpell: noBoundExecutionReferences,
      bonusActionDashSpell: noBoundExecutionReferences,
      unitFeature: noBoundExecutionReferences,
      unitFeatureHeldWeaponActivation: noBoundExecutionReferences,
      druidWildShape: battleDruidWildShapeBoundExecutionReferences,
      companionLifecycle: noBoundExecutionReferences,
      spawnedCompanionSharedSenses: noBoundExecutionReferences,
      spawnedCompanionTouchSpellProxy: noBoundExecutionReferences,
      runtimeCommand: battleRuntimeCommandBoundExecutionReferences,
    }),
  );
}

export type CharacterProcedureBattleSubject = Extract<
  BattleSubject,
  {
    readonly tag:
      | "actionSpell"
      | "bonusActionSpell"
      | "bonusActionDashSpell"
      | "spawnedCompanionTouchSpellProxy"
      | "unitFeature"
      | "unitFeatureHeldWeaponActivation"
      | "druidWildShape"
      | "bonusActionStandardAction"
      | "monkFocusOption";
  }
>;

export function isCharacterProcedureBattleSubject(
  subject: BattleSubject,
): subject is CharacterProcedureBattleSubject {
  return (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "spawnedCompanionTouchSpellProxy" ||
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation" ||
    subject.tag === "druidWildShape" ||
    subject.tag === "bonusActionStandardAction" ||
    subject.tag === "monkFocusOption"
  );
}

export type BattleReadyTriggerReportSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "reportReadyTrigger";
  }
>;

export function isBattleReadyTriggerReportSubject(
  subject: BattleSubject,
): subject is BattleReadyTriggerReportSubject {
  return (
    subject.tag === "runtimeCommand" && subject.command === "reportReadyTrigger"
  );
}

export type ActionHideSubject = {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "hide";
};
export type ActionSearchSubject = {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "search";
};
export type BonusActionStandardActionSubject = {
  readonly tag: "bonusActionStandardAction";
  readonly actorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
} & (
  | {
      readonly action: "dash";
      readonly speedKind: BattleMovementSpeedKind;
    }
  | {
      readonly action: "disengage" | "hide";
    }
);
export type MonkFocusOptionSubject = Extract<
  BattleSubject,
  { readonly tag: "monkFocusOption" }
>;
export type MonkFocusFlurryOfBlowsStrikeSubject = Extract<
  BattleSubject,
  { readonly tag: "monkFocusFlurryOfBlowsStrike" }
>;

export function battleSubjectForReplay(subject: BattleSubject): BattleSubject {
  return subject;
}

export function sameBattleSubject(
  left: BattleSubject,
  right: BattleSubject,
): boolean {
  return (
    battleSubjectKey(battleSubjectForReplay(left)) ===
    battleSubjectKey(battleSubjectForReplay(right))
  );
}

function spellSubjectModeKey(mode: SpellSubjectMode): readonly unknown[] {
  return mode.tag === "cast" ? [mode.tag] : [mode.tag, mode.trigger];
}

function spellMetamagicSelectionKey(
  selections:
    | readonly {
        readonly effectKind: CharacterBattleMetamagicEffectKind;
        readonly targetDamageType?: DamageType;
      }[]
    | undefined,
): readonly unknown[] {
  return selections === undefined
    ? []
    : [...selections]
        .map((selection) => [
          selection.effectKind,
          selection.targetDamageType ?? null,
        ])
        .sort(([left], [right]) => String(left).localeCompare(String(right)));
}

function battleSubjectKey(subject: BattleSubject): string {
  return Match.value(subject).pipe(
    Match.when(
      { tag: "action", action: "shakeAwakeFromStagedCondition" },
      (action) => JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when(
      { tag: "action", action: "shakeAwakeFromAreaControl" },
      (action) => JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "shove" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "bonusActionDashSpell" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spell.procedureRef,
        spellSubjectModeKey(spell.mode),
        spell.speedKind,
      ]),
    ),
    Match.when({ tag: "bonusAction", action: "offHandAttack" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        attackExecutionSelectionKey(action),
      ]),
    ),
    Match.when(
      { tag: "bonusAction", action: "martialArtsUnarmedStrike" },
      (action) =>
        JSON.stringify([
          action.tag,
          action.actorId,
          action.action,
          attackExecutionSelectionKey(action),
        ]),
    ),
    Match.when({ tag: "monkFocusOption" }, (option) =>
      JSON.stringify([
        option.tag,
        option.actorId,
        option.procedureRef,
        option.option,
        "mode" in option ? option.mode : null,
        "speedKind" in option ? option.speedKind : null,
      ]),
    ),
    Match.when({ tag: "monkFocusFlurryOfBlowsStrike" }, (strike) =>
      JSON.stringify([
        strike.tag,
        strike.actorId,
        strike.focusProcedureRef,
        strike.procedureRef,
      ]),
    ),
    Match.when({ tag: "druidWildShape" }, (wildShape) =>
      JSON.stringify([
        wildShape.tag,
        wildShape.actorId,
        wildShape.procedureRef,
        wildShape.action,
        "formExecutionRef" in wildShape ? wildShape.formExecutionRef : null,
      ]),
    ),
    Match.when({ tag: "companionLifecycle" }, (companion) =>
      JSON.stringify([companion.tag, companion.actorId, companion.action]),
    ),
    Match.when({ tag: "spawnedCompanionSharedSenses" }, (sharedSenses) =>
      JSON.stringify([
        sharedSenses.tag,
        sharedSenses.actorId,
        sharedSenses.familiarId,
      ]),
    ),
    Match.when({ tag: "spawnedCompanionTouchSpellProxy" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spell.procedureRef,
        spell.companionId,
        spell.spellAction,
        spellSubjectModeKey(spell.mode),
        spellMetamagicSelectionKey(spell.metamagic),
      ]),
    ),
    Match.when({ tag: "unitFeatureHeldWeaponActivation" }, (activation) =>
      JSON.stringify([
        activation.tag,
        activation.actorId,
        activation.procedureRef,
        activation.weaponItemId,
      ]),
    ),
    Match.when({ tag: "companionAttack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.familiarId,
        attack.procedureRef,
        statBlockAttackDamageSelectionKey(attack.statBlockDamageSelection),
      ]),
    ),
    Match.orElse((remainingSubject) =>
      Match.value(remainingSubject).pipe(
        Match.when({ tag: "action", action: "attack" }, (attack) =>
          JSON.stringify([
            attack.tag,
            attack.actorId,
            attack.action,
            attackExecutionSelectionKey(attack),
          ]),
        ),
        Match.when({ tag: "action", action: "dash" }, (action) =>
          JSON.stringify([
            action.tag,
            action.actorId,
            action.action,
            action.speedKind,
          ]),
        ),
        Match.when({ tag: "action", action: "disengage" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "dodge" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "helpAttack" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "hide" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "multiattack" }, (action) =>
          JSON.stringify([
            action.tag,
            action.actorId,
            action.action,
            action.procedureRef,
          ]),
        ),
        Match.when({ tag: "action", action: "ready" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "search" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "grapple" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when({ tag: "action", action: "escapeGrapple" }, (action) =>
          JSON.stringify([action.tag, action.actorId, action.action]),
        ),
        Match.when(
          { tag: "action", action: "escapeSpellRestraint" },
          (action) =>
            JSON.stringify([
              action.tag,
              action.actorId,
              action.action,
              action.targetId,
              action.effectRef,
            ]),
        ),
        Match.when(
          { tag: "bonusAction", action: "statBlockActionOption" },
          (action) =>
            JSON.stringify([
              action.tag,
              action.actorId,
              action.action,
              action.procedureRef,
              action.standardAction,
            ]),
        ),
        Match.when({ tag: "bonusActionStandardAction" }, (action) =>
          JSON.stringify([
            action.tag,
            action.actorId,
            action.procedureRef,
            action.action,
            "speedKind" in action ? action.speedKind : null,
          ]),
        ),
        Match.when({ tag: "actionSpell" }, (spell) =>
          JSON.stringify([
            spell.tag,
            spell.actorId,
            spell.procedureRef,
            spellSubjectModeKey(spell.mode),
            spellMetamagicSelectionKey(spell.metamagic),
          ]),
        ),
        Match.when({ tag: "bonusActionSpell" }, (spell) =>
          JSON.stringify([
            spell.tag,
            spell.actorId,
            spell.procedureRef,
            spellSubjectModeKey(spell.mode),
            spellMetamagicSelectionKey(spell.metamagic),
          ]),
        ),
        Match.when({ tag: "unitFeature" }, (feature) =>
          JSON.stringify([feature.tag, feature.actorId, feature.procedureRef]),
        ),
        Match.when({ tag: "runtimeCommand" }, (command) =>
          JSON.stringify([
            command.tag,
            command.actorId,
            command.command,
            "readiedSpellCasterId" in command
              ? command.readiedSpellCasterId
              : null,
            "readiedMovementActorId" in command
              ? command.readiedMovementActorId
              : null,
            "readiedActorId" in command ? command.readiedActorId : null,
            "targetId" in command ? command.targetId : null,
            "reactorId" in command ? command.reactorId : null,
            "procedureRef" in command ? command.procedureRef : null,
            "attackAbility" in command ? (command.attackAbility ?? null) : null,
            "attackDamageType" in command
              ? (command.attackDamageType ?? null)
              : null,
            "sourceCombatantId" in command ? command.sourceCombatantId : null,
            "condition" in command ? command.condition : null,
            "mode" in command ? command.mode : null,
            "naturalWeaponDamageType" in command
              ? command.naturalWeaponDamageType
              : null,
            "areaId" in command ? command.areaId : null,
            runtimeCommandEffectOccurrenceKey(command),
            "trigger" in command ? command.trigger : null,
            runtimeCommandAreaMembershipTrigger(command),
            "relevantEffect" in command ? command.relevantEffect : null,
          ]),
        ),
        Match.exhaustive,
      ),
    ),
  );
}

function runtimeCommandEffectOccurrenceKey(
  command: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): BattleEffectExecutionRef | null {
  return "effectRef" in command ? command.effectRef : null;
}

function runtimeCommandAreaMembershipTrigger(
  command: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): string | null {
  return "areaMembershipTrigger" in command
    ? JSON.stringify(command.areaMembershipTrigger)
    : null;
}
