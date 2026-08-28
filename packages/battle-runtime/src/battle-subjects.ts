// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.retaliation-reaction-attack
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form spell.invocation-flaming-sphere-hazard-ram spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
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

import { Match, Schema, Tuple } from "effect";
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
  "shakeAwakeFromSleep",
  "shakeAwakeFromHypnoticPattern",
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
  "greaseGroundHazardSave",
  "webRestraintSave",
  "sleetStormAreaHazardSave",
  "insectPlagueAreaHazardSave",
  "cloudkillAreaHazardSave",
  "disperseCloudkill",
  "webRestrainedNoLongerInArea",
  "webAreaRemoved",
  "gustOfWindLineSave",
  "gustOfWindLineDirectionChange",
  "movableZoneSave",
  "moonbeamCylinderExit",
  "movableZoneReposition",
  "movableZoneRam",
  "releaseSpellCreatedHeldObject",
  "protectionRelevantEffectSave",
  "creatureTypeProtectionConditionAttempt",
  "creatureTypeProtectionPossessionAttempt",
  "disperseFogCloud",
  "wardingBondSeparation",
  "jumpMovementReplacement",
  "dragonsBreathExhale",
  "replaceSelfTransformationMode",
  "commandGrovel",
  "commandDrop",
  "commandApproach",
  "commandFlee",
  "levitateAltitudeControl",
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

export const BattleSleetStormAreaMembershipTriggerSchema = Schema.Union([
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
export type BattleSleetStormAreaMembershipTrigger =
  typeof BattleSleetStormAreaMembershipTriggerSchema.Type;

export const BattleInsectPlagueAreaMembershipTriggerSchema = Schema.Union([
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
export type BattleInsectPlagueAreaMembershipTrigger =
  typeof BattleInsectPlagueAreaMembershipTriggerSchema.Type;

export const BattleCloudkillAreaMembershipTriggerSchema = Schema.Union([
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
export type BattleCloudkillAreaMembershipTrigger =
  typeof BattleCloudkillAreaMembershipTriggerSchema.Type;

export const CANTRIP_SPELL_PROCEDURES = [
  "heldLight",
  "objectLight",
  "heldLightHurl",
  "dancingLightsSeparateCast",
  "dancingLightsCombinedCast",
  "dancingLightsReposition",
  "damageReduction",
  "makeStable",
  "spellAttackSequence",
  "spellHostedWeaponAttack",
  "weaponAttackOverride",
  "spellAttackDamage",
  "saveGatedDamage",
  "rollModifier",
  "thaumaturgyBoomingVoice",
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
  "sleepTargetAdmission",
  "hideousLaughter",
  "hypnoticPattern",
  "slowActivePenalties",
  "greaseGroundHazard",
  "webRestraintHazard",
  "gustOfWindLine",
  "fogCloudObscurement",
  "magicalDarknessPointOrigin",
  "antimagicFieldOngoingSpellSuppression",
  "flamingSphere",
  "spiritualWeaponAttackProxy",
  "spikeGrowthMovementHazard",
  "moonbeam",
  "sleetStormAreaHazard",
  "insectPlagueAreaHazard",
  "cloudkillAreaHazard",
  "objectContactDamage",
  "spellCreatedHeldObject",
  "command",
  "repeatedDamageAllocation",
  "directHitPointRestoration",
  "rollModifier",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "levitatedCreature",
  "wardingBond",
  "scalarBuff",
  "selfTransformationMode",
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  "creatureTypeProtection",
  "blurAttackRollDefense",
  "seeInvisibleObserverSight",
  "mirrorImageHitInterception",
  "conditionRemovalProtection",
  "chosenDamageResistance",
  "hastePositive",
  "directConditionRemoval",
  "weaponDamageRider",
  "magicWeaponEnhancement",
  "afterHitDamage",
  "afterHitSaveGatedCondition",
  "abilityD20TestRollModeSaveGate",
  "afterHitTimedDamageAndSave",
  "afterHitDamageAndIllumination",
  "markedDamageRider",
  "expeditiousRetreatDash",
  "jumpMovementReplacement",
  "dragonsBreathInitial",
  "selfTeleport",
  "sanctuaryTargetingInterdiction",
  "directCondition",
  "persistentArmorEffect",
  "shieldReaction",
  "counterspell",
  "objectLight",
  "ongoingSpellEnd",
  "featherFallMitigation",
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
      "spiritualWeaponRepeatAttack",
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
    | "spiritualWeaponRepeatAttack"
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

const CharacterAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleAttackProcedureExecutionRef,
  attackAbility: BattleAttackExecutionAbilitySchema,
  attackDamageType: DamageTypeSchema,
  attackName: Schema.optionalKey(Schema.Never),
});

const RolledStatBlockAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleStatBlockProcedureExecutionRef,
  attackAbility: Schema.optionalKey(Schema.Never),
  attackDamageType: Schema.optionalKey(Schema.Never),
  attackName: Schema.optionalKey(Schema.Never),
  statBlockDamageNotation: Schema.optionalKey(Schema.Never),
});

const StaticStatBlockAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleStatBlockProcedureExecutionRef,
  attackAbility: Schema.optionalKey(Schema.Never),
  attackDamageType: Schema.optionalKey(Schema.Never),
  attackName: Schema.optionalKey(Schema.Never),
  statBlockDamageNotation: Schema.Literal("static"),
});

const StatBlockAttackExecutionSelectionSchema = Schema.Union([
  RolledStatBlockAttackExecutionSelectionSchema,
  StaticStatBlockAttackExecutionSelectionSchema,
]);

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
    StatBlockAttackExecutionSelectionSchema.mapMembers(
      Tuple.map(Schema.fieldsAssign(fields)),
    ),
  ]);

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
    statBlockDamageNotation: Schema.optionalKey(Schema.Never),
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
    statBlockDamageNotation: Schema.optionalKey(Schema.Never),
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
    statBlockDamageNotation: Schema.Literal("static"),
  }),
  Schema.Struct({
    tag: Schema.Literal("pactOfTheChainFamiliarAttack"),
    actorId: CombatantId,
    familiarId: CombatantId,
    procedureRef: BattleStatBlockProcedureExecutionRef,
    statBlockDamageNotation: Schema.optionalKey(Schema.Literal("static")),
  }),
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
    action: Schema.Literal("multiattack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("search"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("ready"),
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
    action: Schema.Literal("shakeAwakeFromSleep"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("shakeAwakeFromHypnoticPattern"),
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
    tag: Schema.Literal("findFamiliarSharedSenses"),
    actorId: CombatantId,
    familiarId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("findFamiliarTouchSpell"),
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
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseReadiedSpell"),
    readiedSpellCasterId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseReadiedMovement"),
    readiedMovementActorId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("reportReadyTrigger"),
    readiedActorId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseReadiedAction"),
    reactorId: CombatantId,
  }),
  Schema.Struct({
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
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("castTriggeredReactionSpell"),
    reactorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("castAttackHitBonusActionSpell"),
    casterId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseGrapple"),
    targetId: CombatantId,
  }),
  battleInterruptAttackExecutionSelectionWithFields({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("opportunityAttack"),
    reactorId: CombatantId,
    targetId: CombatantId,
    distanceFeet: MovementFeet,
  }),
  battleInterruptAttackExecutionSelectionWithFields({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("retaliationAttack"),
    reactorId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("greaseGroundHazardSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literals(["entersArea", "endsTurnInArea"]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("webRestraintSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    trigger: Schema.Literals(["entersArea", "startsTurnInArea"]),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("sleetStormAreaHazardSave"),
    areaMembershipTrigger: BattleSleetStormAreaMembershipTriggerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("insectPlagueAreaHazardSave"),
    areaMembershipTrigger: BattleInsectPlagueAreaMembershipTriggerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("cloudkillAreaHazardSave"),
    areaMembershipTrigger: BattleCloudkillAreaMembershipTriggerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("disperseCloudkill"),
    ...RejectRedundantSpellSourceFields,
    effectOwnerId: CombatantId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("webRestrainedNoLongerInArea"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("webAreaRemoved"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("gustOfWindLineSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
    effectRef: BattleEffectExecutionRef,
    directionId: BattleLineDirectionId,
    trigger: Schema.Literal("endsTurnInLine"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("gustOfWindLineDirectionChange"),
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
    command: Schema.Literal("moonbeamCylinderExit"),
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
    command: Schema.Literal("disperseFogCloud"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("wardingBondSeparation"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("jumpMovementReplacement"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("dragonsBreathExhale"),
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
    command: Schema.Literal("commandGrovel"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandDrop"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandApproach"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandFlee"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("levitateAltitudeControl"),
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

export type BattleReadyActionSubject = Exclude<
  Extract<BattleSubject, { readonly tag: "action" }>,
  { readonly action: "attack" | "multiattack" | "ready" }
>;

export const BattleReadyActionSubjectSchema = BattleSubjectSchema.pipe(
  Schema.refine(
    (subject): subject is BattleReadyActionSubject =>
      subject.tag === "action" &&
      subject.action !== "attack" &&
      subject.action !== "multiattack" &&
      subject.action !== "ready",
  ),
);

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
      shakeAwakeFromSleep: noProcedureExecutionReferences,
      shakeAwakeFromHypnoticPattern: noProcedureExecutionReferences,
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
      greaseGroundHazardSave: noProcedureExecutionReferences,
      webRestraintSave: noProcedureExecutionReferences,
      sleetStormAreaHazardSave: noProcedureExecutionReferences,
      insectPlagueAreaHazardSave: noProcedureExecutionReferences,
      cloudkillAreaHazardSave: noProcedureExecutionReferences,
      disperseCloudkill: noProcedureExecutionReferences,
      webRestrainedNoLongerInArea: noProcedureExecutionReferences,
      webAreaRemoved: noProcedureExecutionReferences,
      gustOfWindLineSave: noProcedureExecutionReferences,
      gustOfWindLineDirectionChange: noProcedureExecutionReferences,
      movableZoneSave: noProcedureExecutionReferences,
      moonbeamCylinderExit: noProcedureExecutionReferences,
      movableZoneReposition: noProcedureExecutionReferences,
      movableZoneRam: noProcedureExecutionReferences,
      releaseSpellCreatedHeldObject: noProcedureExecutionReferences,
      protectionRelevantEffectSave: noProcedureExecutionReferences,
      creatureTypeProtectionConditionAttempt: noProcedureExecutionReferences,
      creatureTypeProtectionPossessionAttempt: noProcedureExecutionReferences,
      disperseFogCloud: noProcedureExecutionReferences,
      wardingBondSeparation: noProcedureExecutionReferences,
      jumpMovementReplacement: noProcedureExecutionReferences,
      dragonsBreathExhale: noProcedureExecutionReferences,
      replaceSelfTransformationMode: noProcedureExecutionReferences,
      commandGrovel: noProcedureExecutionReferences,
      commandDrop: noProcedureExecutionReferences,
      commandApproach: noProcedureExecutionReferences,
      commandFlee: noProcedureExecutionReferences,
      levitateAltitudeControl: noProcedureExecutionReferences,
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
      pactOfTheChainFamiliarAttack: (value) => [value.procedureRef],
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
      findFamiliarSharedSenses: noProcedureExecutionReferences,
      findFamiliarTouchSpell: (value) => [value.procedureRef],
      runtimeCommand: battleRuntimeCommandProcedureRefs,
    }),
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
      shakeAwakeFromSleep: noBoundExecutionReferences,
      shakeAwakeFromHypnoticPattern: noBoundExecutionReferences,
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
      greaseGroundHazardSave: activeEffectOccurrence,
      webRestraintSave: activeEffectOccurrence,
      sleetStormAreaHazardSave: (value) =>
        activeEffectOccurrence(value.areaMembershipTrigger),
      insectPlagueAreaHazardSave: (value) =>
        activeEffectOccurrence(value.areaMembershipTrigger),
      cloudkillAreaHazardSave: (value) =>
        activeEffectOccurrence(value.areaMembershipTrigger),
      disperseCloudkill: ownedEffect,
      webRestrainedNoLongerInArea: activeEffectOccurrence,
      webAreaRemoved: activeEffectOccurrence,
      gustOfWindLineSave: activeEffectOccurrence,
      gustOfWindLineDirectionChange: activeEffectOccurrence,
      movableZoneSave: activeEffectOccurrence,
      moonbeamCylinderExit: activeEffectOccurrence,
      movableZoneReposition: activeEffectOccurrence,
      movableZoneRam: activeEffectOccurrence,
      releaseSpellCreatedHeldObject: actorEffect,
      protectionRelevantEffectSave: actorEffect,
      creatureTypeProtectionConditionAttempt: noBoundExecutionReferences,
      creatureTypeProtectionPossessionAttempt: noBoundExecutionReferences,
      disperseFogCloud: noBoundExecutionReferences,
      wardingBondSeparation: targetEffect,
      jumpMovementReplacement: actorEffect,
      dragonsBreathExhale: actorEffect,
      replaceSelfTransformationMode: actorEffect,
      commandGrovel: actorEffect,
      commandDrop: actorEffect,
      commandApproach: actorEffect,
      commandFlee: actorEffect,
      levitateAltitudeControl: targetEffect,
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
      pactOfTheChainFamiliarAttack: noBoundExecutionReferences,
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
      findFamiliarSharedSenses: noBoundExecutionReferences,
      findFamiliarTouchSpell: noBoundExecutionReferences,
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
      | "findFamiliarTouchSpell"
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
    subject.tag === "findFamiliarTouchSpell" ||
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation" ||
    subject.tag === "druidWildShape" ||
    subject.tag === "bonusActionStandardAction" ||
    subject.tag === "monkFocusOption"
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
    Match.when({ tag: "action", action: "shakeAwakeFromSleep" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when(
      { tag: "action", action: "shakeAwakeFromHypnoticPattern" },
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
    Match.when({ tag: "findFamiliarSharedSenses" }, (sharedSenses) =>
      JSON.stringify([
        sharedSenses.tag,
        sharedSenses.actorId,
        sharedSenses.familiarId,
      ]),
    ),
    Match.when({ tag: "findFamiliarTouchSpell" }, (spell) =>
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
    Match.when({ tag: "pactOfTheChainFamiliarAttack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.familiarId,
        attack.procedureRef,
        attack.statBlockDamageNotation ?? "rolled",
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
            "statBlockDamageNotation" in attack
              ? (attack.statBlockDamageNotation ?? "rolled")
              : null,
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
            "effectRef" in command ? command.effectRef : null,
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

function runtimeCommandAreaMembershipTrigger(
  command: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): string | null {
  return "areaMembershipTrigger" in command
    ? JSON.stringify(command.areaMembershipTrigger)
    : null;
}
