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

import { Match, Schema } from "effect";
import { STANDARD_ACTION_KINDS } from "@dnd/shared/game-facts";
import { SpellSlotLevel, spellSlotLevel } from "@dnd/shared/types";
import { AbilitySchema, DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { DamageType } from "@dnd/surface/surface/types";
import {
  BattleAreaId,
  BattleActiveEffectExecutionRef,
  BattleAttackProcedureExecutionRef,
  BattleLineDirectionId,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
  CombatantId,
  BattleStatBlockProcedureExecutionRef,
  BattleStatBlockExecutionScopeRef,
  SpellId,
  spellId as makeSpellId,
} from "./identity.ts";
import {
  BATTLE_INTERRUPT_TRIGGERS,
  BATTLE_READIED_SPELL_TRIGGERS,
} from "./battle-interrupt-triggers.ts";
import {
  SELF_TRANSFORMATION_NATURAL_WEAPONS_MODE_KIND,
  SELF_TRANSFORMATION_NON_NATURAL_WEAPON_MODE_KINDS,
} from "./battle-reducer/domain-constants.ts";
import {
  CHARACTER_BATTLE_METAMAGIC_EFFECT_KINDS,
  type CharacterBattleMetamagicEffectKind,
} from "./character-battle-resources.ts";
import {
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_SPELL_DAMAGE_TYPES,
} from "./battle-reducer/metamagic-transmuted-facts.ts";
import { attackExecutionSelectionKey } from "./battle-action-options.ts";

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
export const BATTLE_MOVEMENT_SPEED_KINDS = [
  "walk",
  "climb",
  "swim",
  "fly",
] as const;
export type BattleMovementSpeedKind =
  (typeof BATTLE_MOVEMENT_SPEED_KINDS)[number];
export const BATTLE_SPECIAL_SPEED_KINDS = [
  "climb",
  "swim",
  "fly",
] as const satisfies ReadonlyArray<Exclude<BattleMovementSpeedKind, "walk">>;
export type BattleSpecialSpeedKind =
  (typeof BATTLE_SPECIAL_SPEED_KINDS)[number];
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

export const BattleSubjectTextSchema = Schema.NonEmptyTrimmedString;
const RejectRedundantSpellProcedureSourceFields = {
  sourceProcedureRef: Schema.optionalWith(Schema.Never, { exact: true }),
} as const;
const RejectRedundantSpellSourceFields = {
  ...RejectRedundantSpellProcedureSourceFields,
  sourceCombatantId: Schema.optionalWith(Schema.Never, { exact: true }),
} as const;

export const BattleSleetStormAreaMembershipTriggerSchema = Schema.Union(
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("firstEntryOnTurn"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("turnStartInArea"),
    areaId: BattleAreaId,
  }),
);
export type BattleSleetStormAreaMembershipTrigger =
  typeof BattleSleetStormAreaMembershipTriggerSchema.Type;

export const BattleInsectPlagueAreaMembershipTriggerSchema = Schema.Union(
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("appearsInArea"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("firstEntryOnTurn"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("turnEndInArea"),
    areaId: BattleAreaId,
  }),
);
export type BattleInsectPlagueAreaMembershipTrigger =
  typeof BattleInsectPlagueAreaMembershipTriggerSchema.Type;

export const BattleCloudkillAreaMembershipTriggerSchema = Schema.Union(
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("appearsInArea"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("areaMovesIntoSpace"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("firstEntryOnTurn"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...RejectRedundantSpellSourceFields,
    kind: Schema.Literal("turnEndInArea"),
    areaId: BattleAreaId,
  }),
);
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

export const SpellInvocationRefSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("cantrip"),
    spellId: SpellId,
    procedure: Schema.Literal(...CANTRIP_SPELL_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("spellSlot"),
    spellId: SpellId,
    slotLevel: SpellSlotLevel,
    procedure: Schema.Literal(...SPELL_SLOT_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("classFeatureFreeCast"),
    spellId: SpellId,
    resourcePoolRef: BattleResourcePoolExecutionRef,
    procedure: Schema.Literal("afterHitDamage", "markedDamageRider"),
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
    procedure: Schema.Literal(
      "markedDamageRiderTransfer",
      "objectContactDamageRepeat",
      "spiritualWeaponRepeatAttack",
      "spellCreatedHeldObjectAttack",
      "spellCreatedHeldObjectReEvoke",
    ),
  }),
);
export type SpellInvocationRef = typeof SpellInvocationRefSchema.Type;
export type SpellInvocationRefEncoded = typeof SpellInvocationRefSchema.Encoded;

export function cantripSpellInvocationRef(
  rawSpellId: string,
  procedure: CantripSpellProcedure,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: makeSpellId(rawSpellId),
    procedure,
  };
}

export function spellSlotInvocationRef(
  rawSpellId: string,
  rawSlotLevel: number,
  procedure: SpellSlotProcedure,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: makeSpellId(rawSpellId),
    slotLevel: spellSlotLevel(rawSlotLevel),
    procedure,
  };
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

export function classFeatureFreeCastSpellInvocationRef(
  rawSpellId: string,
  resourcePoolRef: BattleResourcePoolExecutionRef,
  procedure: "afterHitDamage" | "markedDamageRider",
): SpellInvocationRef {
  return {
    tag: "classFeatureFreeCast",
    spellId: makeSpellId(rawSpellId),
    resourcePoolRef,
    procedure,
  };
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

export const SpellSubjectModeSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("cast"),
  }),
  Schema.Struct({
    tag: Schema.Literal("ready"),
    trigger: Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
  }),
);
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
const TransmutedSpellDamageTypeSchema = Schema.Literal(
  ...TRANSMUTED_SPELL_DAMAGE_TYPES,
);

export const SpellMetamagicSelectionSchema = Schema.Union(
  Schema.Struct({
    effectKind: Schema.Literal(...NON_TRANSMUTED_SPELL_METAMAGIC_EFFECT_KINDS),
  }),
  Schema.Struct({
    effectKind: Schema.Literal(TRANSMUTED_METAMAGIC_EFFECT_KIND),
    targetDamageType: TransmutedSpellDamageTypeSchema,
  }),
);
export type SpellMetamagicSelection = typeof SpellMetamagicSelectionSchema.Type;

const SpellMetamagicSelectionsSchema = Schema.NonEmptyArray(
  SpellMetamagicSelectionSchema,
);

export const BattleAttackExecutionAbilitySchema = Schema.Union(
  AbilitySchema,
  Schema.Literal("spellcasting"),
);

const CharacterAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleAttackProcedureExecutionRef,
  attackAbility: BattleAttackExecutionAbilitySchema,
  attackDamageType: DamageTypeSchema,
  attackName: Schema.optionalWith(Schema.Never, { exact: true }),
});

const StatBlockAttackExecutionSelectionSchema = Schema.Struct({
  procedureRef: BattleStatBlockProcedureExecutionRef,
  attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
  attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
  attackName: Schema.optionalWith(Schema.Never, { exact: true }),
});

export const BattleAttackExecutionSelectionSchema = Schema.Union(
  CharacterAttackExecutionSelectionSchema,
  StatBlockAttackExecutionSelectionSchema,
);
export type BattleAttackExecutionSelection =
  typeof BattleAttackExecutionSelectionSchema.Type;

export const BattleInterruptAttackExecutionSelectionSchema = Schema.Union(
  CharacterAttackExecutionSelectionSchema,
  StatBlockAttackExecutionSelectionSchema,
);
export type BattleInterruptAttackExecutionSelection =
  typeof BattleInterruptAttackExecutionSelectionSchema.Type;

// BattleSubject is a replay key returned by discoverBattleActs and copied back
// by callers. It identifies one discovered runtime act; it is not Surface
// authored content, provenance, or a complete taxonomy of D&D actions.
export const BattleSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("attack"),
    procedureRef: BattleAttackProcedureExecutionRef,
    attackAbility: BattleAttackExecutionAbilitySchema,
    attackDamageType: DamageTypeSchema,
    attackName: Schema.optionalWith(Schema.Never, { exact: true }),
    statBlockSection: Schema.optionalWith(Schema.Never, { exact: true }),
    statBlockDamageNotation: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("attack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
    attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
    attackName: Schema.optionalWith(Schema.Never, { exact: true }),
    statBlockSection: Schema.optionalWith(Schema.Never, { exact: true }),
    statBlockDamageNotation: Schema.optionalWith(Schema.Literal("static"), {
      exact: true,
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("pactOfTheChainFamiliarAttack"),
    actorId: CombatantId,
    familiarId: CombatantId,
    procedureRef: BattleStatBlockProcedureExecutionRef,
    statBlockDamageNotation: Schema.optionalWith(Schema.Literal("static"), {
      exact: true,
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("creatureAttack"),
    actorId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("dash"),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
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
    readyTrigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
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
    effectRef: BattleActiveEffectExecutionRef,
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
  Schema.Union(
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
  ),
  Schema.Struct({
    tag: Schema.Literal("bonusAction"),
    actorId: CombatantId,
    action: Schema.Literal("statBlockActionOption"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    standardAction: Schema.Literal(...STANDARD_ACTION_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
    sourceEffectRef: BattleActiveEffectExecutionRef,
    action: Schema.Literal("dash"),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    sourceEffectRef: Schema.optionalWith(Schema.Never, { exact: true }),
    action: Schema.Literal("dash"),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
    sourceEffectRef: Schema.optionalWith(Schema.Never, { exact: true }),
    action: Schema.Literal("disengage", "hide"),
  }),
  Schema.Union(
    Schema.Struct({
      tag: Schema.Literal("monkFocusOption"),
      actorId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      resourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
      option: Schema.Literal("flurryOfBlows"),
    }),
    Schema.Struct({
      tag: Schema.Literal("monkFocusOption"),
      actorId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      resourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
      option: Schema.Literal("patientDefense"),
      mode: Schema.Literal(...MONK_FOCUS_PATIENT_DEFENSE_MODES),
    }),
    Schema.Struct({
      tag: Schema.Literal("monkFocusOption"),
      actorId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      resourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
      option: Schema.Literal("stepOfTheWind"),
      mode: Schema.Literal(...MONK_FOCUS_STEP_OF_THE_WIND_MODES),
      speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
    }),
  ),
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
    invocation: Schema.optionalWith(Schema.Never, { exact: true }),
    mode: SpellSubjectModeSchema,
    metamagic: Schema.optionalWith(SpellMetamagicSelectionsSchema, {
      exact: true,
    }),
    componentWeaponItemId: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionSpell"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    invocation: Schema.optionalWith(Schema.Never, { exact: true }),
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
    metamagic: Schema.optionalWith(SpellMetamagicSelectionsSchema, {
      exact: true,
    }),
    componentWeaponItemId: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionDashSpell"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    invocation: Schema.optionalWith(Schema.Never, { exact: true }),
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeature"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeatureHeldWeaponActivation"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalWith(Schema.Never, { exact: true }),
    weaponItemId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("druidWildShape"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalWith(Schema.Never, { exact: true }),
    action: Schema.Literal("assumeForm"),
    formExecutionRef: BattleStatBlockExecutionScopeRef,
    formStatBlockId: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("druidWildShape"),
    actorId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalWith(Schema.Never, { exact: true }),
    action: Schema.Literal("dismiss"),
  }),
  Schema.Struct({
    tag: Schema.Literal("companionLifecycle"),
    actorId: CombatantId,
    action: Schema.Literal(
      "temporarilyDismiss",
      "reappear",
      "permanentlyDismiss",
    ),
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
    invocation: Schema.optionalWith(Schema.Never, { exact: true }),
    companionId: CombatantId,
    spellAction: Schema.Literal("action", "bonusAction"),
    mode: SpellCastSubjectModeSchema,
    metamagic: Schema.optionalWith(SpellMetamagicSelectionsSchema, {
      exact: true,
    }),
    componentWeaponItemId: Schema.optionalWith(Schema.Never, { exact: true }),
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
  Schema.extend(
    Schema.Struct({
      tag: Schema.Literal("runtimeCommand"),
      actorId: CombatantId,
      command: Schema.Literal("opportunityAttack"),
      reactorId: CombatantId,
      targetId: CombatantId,
    }),
    BattleInterruptAttackExecutionSelectionSchema,
  ),
  Schema.extend(
    Schema.Struct({
      tag: Schema.Literal("runtimeCommand"),
      actorId: CombatantId,
      command: Schema.Literal("retaliationAttack"),
      reactorId: CombatantId,
      targetId: CombatantId,
    }),
    BattleInterruptAttackExecutionSelectionSchema,
  ),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("greaseGroundHazardSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
    trigger: Schema.Literal("entersArea", "endsTurnInArea"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("webRestraintSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
    trigger: Schema.Literal("entersArea", "startsTurnInArea"),
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
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("webRestrainedNoLongerInArea"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("webAreaRemoved"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("gustOfWindLineSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
    directionId: BattleLineDirectionId,
    trigger: Schema.Literal("endsTurnInLine"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("gustOfWindLineDirectionChange"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
    directionId: BattleLineDirectionId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneSave"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
    trigger: Schema.Literal(
      "endsTurnWithinFiveFeetOfSphere",
      "appearsInArea",
      "areaMovesIntoSpace",
      "entersArea",
      "endsTurnInArea",
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("moonbeamCylinderExit"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneReposition"),
    ...RejectRedundantSpellSourceFields,
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("movableZoneRam"),
    ...RejectRedundantSpellSourceFields,
    targetId: CombatantId,
    areaId: BattleSubjectTextSchema,
    trigger: Schema.Literal("rammedBySphere"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseSpellCreatedHeldObject"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("protectionRelevantEffectSave"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
    relevantEffect: Schema.Literal("charmed", "frightened", "possession"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("creatureTypeProtectionConditionAttempt"),
    sourceCombatantId: CombatantId,
    condition: Schema.Literal("charmed", "frightened"),
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
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("wardingBondSeparation"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("jumpMovementReplacement"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("dragonsBreathExhale"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("replaceSelfTransformationMode"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
    mode: Schema.Literal(...SELF_TRANSFORMATION_NON_NATURAL_WEAPON_MODE_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("replaceSelfTransformationMode"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
    mode: Schema.Literal(SELF_TRANSFORMATION_NATURAL_WEAPONS_MODE_KIND),
    naturalWeaponDamageType: DamageTypeSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandGrovel"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandDrop"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandApproach"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandFlee"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("levitateAltitudeControl"),
    ...RejectRedundantSpellSourceFields,
    effectRef: BattleActiveEffectExecutionRef,
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("creatureFalls"),
    fallingCreatureId: CombatantId,
  }),
);
type BattleSubjectWireValue = typeof BattleSubjectSchema.Type;
export type BattleSubject = BattleSubjectWireValue;

function battleActionSubjectProcedureRefs(
  subject: Extract<BattleSubject, { readonly tag: "action" }>,
): readonly BattleProcedureExecutionRef[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("action")({
      attack: (value) => [value.procedureRef],
      dash: () => [],
      disengage: () => [],
      dodge: () => [],
      helpAttack: () => [],
      hide: () => [],
      multiattack: (value) => [value.procedureRef],
      ready: () => [],
      search: () => [],
      grapple: () => [],
      shove: () => [],
      escapeGrapple: () => [],
      escapeSpellRestraint: () => [],
      shakeAwakeFromSleep: () => [],
      shakeAwakeFromHypnoticPattern: () => [],
    }),
  );
}

function battleRuntimeCommandProcedureRefs(
  subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): readonly BattleProcedureExecutionRef[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      endTurn: () => [],
      endConcentration: () => [],
      move: () => [],
      standFromProne: () => [],
      releaseReadiedSpell: (value) => [value.procedureRef],
      releaseReadiedMovement: () => [],
      castTriggeredReactionSpell: (value) => [value.procedureRef],
      castAttackHitBonusActionSpell: (value) => [value.procedureRef],
      releaseGrapple: () => [],
      opportunityAttack: (value) => [value.procedureRef],
      retaliationAttack: (value) => [value.procedureRef],
      greaseGroundHazardSave: () => [],
      webRestraintSave: () => [],
      sleetStormAreaHazardSave: () => [],
      insectPlagueAreaHazardSave: () => [],
      cloudkillAreaHazardSave: () => [],
      disperseCloudkill: () => [],
      webRestrainedNoLongerInArea: () => [],
      webAreaRemoved: () => [],
      gustOfWindLineSave: () => [],
      gustOfWindLineDirectionChange: () => [],
      movableZoneSave: () => [],
      moonbeamCylinderExit: () => [],
      movableZoneReposition: () => [],
      movableZoneRam: () => [],
      releaseSpellCreatedHeldObject: () => [],
      protectionRelevantEffectSave: () => [],
      creatureTypeProtectionConditionAttempt: () => [],
      creatureTypeProtectionPossessionAttempt: () => [],
      disperseFogCloud: () => [],
      wardingBondSeparation: () => [],
      jumpMovementReplacement: () => [],
      dragonsBreathExhale: () => [],
      replaceSelfTransformationMode: () => [],
      commandGrovel: () => [],
      commandDrop: () => [],
      commandApproach: () => [],
      commandFlee: () => [],
      levitateAltitudeControl: () => [],
      creatureFalls: () => [],
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
      creatureAttack: () => [],
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
      companionLifecycle: () => [],
      findFamiliarSharedSenses: () => [],
      findFamiliarTouchSpell: (value) => [value.procedureRef],
      runtimeCommand: battleRuntimeCommandProcedureRefs,
    }),
  );
}

export type BattleSubjectBoundExecutionReference =
  | {
      readonly kind: "activeEffect";
      readonly ownerId: CombatantId;
      readonly effectRef: BattleActiveEffectExecutionRef;
    }
  | {
      readonly kind: "statBlockScope";
      readonly ownerId: CombatantId;
      readonly scopeRef: BattleStatBlockExecutionScopeRef;
    };

function battleActionSubjectBoundExecutionReferences(
  subject: Extract<BattleSubject, { readonly tag: "action" }>,
): readonly BattleSubjectBoundExecutionReference[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("action")({
      attack: () => [],
      dash: () => [],
      disengage: () => [],
      dodge: () => [],
      helpAttack: () => [],
      hide: () => [],
      multiattack: () => [],
      ready: () => [],
      search: () => [],
      grapple: () => [],
      shove: () => [],
      escapeGrapple: () => [],
      escapeSpellRestraint: (value) => [
        {
          kind: "activeEffect" as const,
          ownerId: value.targetId,
          effectRef: value.effectRef,
        },
      ],
      shakeAwakeFromSleep: () => [],
      shakeAwakeFromHypnoticPattern: () => [],
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
      dismiss: () => [],
    }),
  );
}

function battleRuntimeCommandBoundExecutionReferences(
  subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
): readonly BattleSubjectBoundExecutionReference[] {
  const actorEffect = (value: {
    readonly actorId: CombatantId;
    readonly effectRef: BattleActiveEffectExecutionRef;
  }): readonly BattleSubjectBoundExecutionReference[] => [
    {
      kind: "activeEffect",
      ownerId: value.actorId,
      effectRef: value.effectRef,
    },
  ];
  const targetEffect = (value: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleActiveEffectExecutionRef;
  }): readonly BattleSubjectBoundExecutionReference[] => [
    {
      kind: "activeEffect",
      ownerId: value.targetId,
      effectRef: value.effectRef,
    },
  ];
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      endTurn: () => [],
      endConcentration: () => [],
      move: () => [],
      standFromProne: () => [],
      releaseReadiedSpell: () => [],
      releaseReadiedMovement: () => [],
      castTriggeredReactionSpell: () => [],
      castAttackHitBonusActionSpell: () => [],
      releaseGrapple: () => [],
      opportunityAttack: () => [],
      retaliationAttack: () => [],
      greaseGroundHazardSave: () => [],
      webRestraintSave: () => [],
      sleetStormAreaHazardSave: () => [],
      insectPlagueAreaHazardSave: () => [],
      cloudkillAreaHazardSave: () => [],
      disperseCloudkill: () => [],
      webRestrainedNoLongerInArea: () => [],
      webAreaRemoved: () => [],
      gustOfWindLineSave: () => [],
      gustOfWindLineDirectionChange: () => [],
      movableZoneSave: () => [],
      moonbeamCylinderExit: () => [],
      movableZoneReposition: () => [],
      movableZoneRam: () => [],
      releaseSpellCreatedHeldObject: actorEffect,
      protectionRelevantEffectSave: actorEffect,
      creatureTypeProtectionConditionAttempt: () => [],
      creatureTypeProtectionPossessionAttempt: () => [],
      disperseFogCloud: () => [],
      wardingBondSeparation: targetEffect,
      jumpMovementReplacement: actorEffect,
      dragonsBreathExhale: actorEffect,
      replaceSelfTransformationMode: actorEffect,
      commandGrovel: actorEffect,
      commandDrop: actorEffect,
      commandApproach: actorEffect,
      commandFlee: actorEffect,
      levitateAltitudeControl: targetEffect,
      creatureFalls: () => [],
    }),
  );
}

export function battleSubjectBoundExecutionReferences(
  subject: BattleSubject,
): readonly BattleSubjectBoundExecutionReference[] {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: battleActionSubjectBoundExecutionReferences,
      pactOfTheChainFamiliarAttack: () => [],
      creatureAttack: () => [],
      bonusAction: () => [],
      bonusActionStandardAction:
        battleBonusActionStandardActionBoundExecutionReferences,
      monkFocusOption: () => [],
      monkFocusFlurryOfBlowsStrike: () => [],
      actionSpell: () => [],
      bonusActionSpell: () => [],
      bonusActionDashSpell: () => [],
      unitFeature: () => [],
      unitFeatureHeldWeaponActivation: () => [],
      druidWildShape: battleDruidWildShapeBoundExecutionReferences,
      companionLifecycle: () => [],
      findFamiliarSharedSenses: () => [],
      findFamiliarTouchSpell: () => [],
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
  if (subject.tag === "action" && subject.action === "shakeAwakeFromSleep") {
    return JSON.stringify([subject.tag, subject.actorId, subject.action]);
  }
  if (
    subject.tag === "action" &&
    subject.action === "shakeAwakeFromHypnoticPattern"
  ) {
    return JSON.stringify([subject.tag, subject.actorId, subject.action]);
  }
  if (subject.tag === "action" && subject.action === "shove") {
    return JSON.stringify([subject.tag, subject.actorId, subject.action]);
  }
  if (subject.tag === "bonusActionDashSpell") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.procedureRef,
      spellSubjectModeKey(subject.mode),
      subject.speedKind,
    ]);
  }
  if (
    subject.tag === "bonusAction" &&
    (subject.action === "offHandAttack" ||
      subject.action === "martialArtsUnarmedStrike")
  ) {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.action,
      attackExecutionSelectionKey(subject),
    ]);
  }
  if (subject.tag === "monkFocusOption") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.procedureRef,
      subject.option,
      "mode" in subject ? subject.mode : null,
      "speedKind" in subject ? subject.speedKind : null,
    ]);
  }
  if (subject.tag === "monkFocusFlurryOfBlowsStrike") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.focusProcedureRef,
      subject.procedureRef,
    ]);
  }
  if (subject.tag === "druidWildShape") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.procedureRef,
      subject.action,
      "formExecutionRef" in subject ? subject.formExecutionRef : null,
    ]);
  }
  if (subject.tag === "companionLifecycle") {
    return JSON.stringify([subject.tag, subject.actorId, subject.action]);
  }
  if (subject.tag === "findFamiliarSharedSenses") {
    return JSON.stringify([subject.tag, subject.actorId, subject.familiarId]);
  }
  if (subject.tag === "findFamiliarTouchSpell") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.procedureRef,
      subject.companionId,
      subject.spellAction,
      spellSubjectModeKey(subject.mode),
      spellMetamagicSelectionKey(subject.metamagic),
    ]);
  }
  if (subject.tag === "unitFeatureHeldWeaponActivation") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.procedureRef,
      subject.weaponItemId,
    ]);
  }
  if (subject.tag === "pactOfTheChainFamiliarAttack") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.familiarId,
      subject.procedureRef,
      subject.statBlockDamageNotation ?? "rolled",
    ]);
  }
  if (subject.tag === "creatureAttack") {
    return JSON.stringify([subject.tag, subject.actorId, subject.targetId]);
  }
  return Match.value(subject).pipe(
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
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        "readyTrigger" in action ? action.readyTrigger : null,
      ]),
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
    Match.when({ tag: "action", action: "escapeSpellRestraint" }, (action) =>
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
        "readiedSpellCasterId" in command ? command.readiedSpellCasterId : null,
        "readiedMovementActorId" in command
          ? command.readiedMovementActorId
          : null,
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
        "trigger" in command ? command.trigger : null,
        "areaMembershipTrigger" in command
          ? JSON.stringify(command.areaMembershipTrigger)
          : null,
        "relevantEffect" in command ? command.relevantEffect : null,
      ]),
    ),
    Match.exhaustive,
  );
}
