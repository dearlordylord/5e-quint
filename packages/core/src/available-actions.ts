import { Match, Schema } from "effect"

import {
  MetamagicOptionSchema,
} from "#/features/class-sorcerer.ts"
import {
  getModeledPreparedSpellInfo,
  MODELED_PREPARED_SPELLS,
  ModeledPreparedSpellSchema,
  type ModeledPreparedSpell,
} from "#/features/spell-available-actions.ts"
import { CLASS_NAMES, classHitDie, type ClassName } from "#/features/class-tables.ts"
import { relentlessRageDC } from "#/features/class-barbarian.ts"
import { flurryOfBlowsStrikes, pMartialArtsDie } from "#/features/class-monk.ts"
import { tirelessTempHp } from "#/features/class-ranger.ts"
import { slotCreationCost, type MetamagicOption } from "#/features/class-sorcerer.ts"
import type { BattleContext, BattleEvent } from "#/battle-machine-types.ts"
import { bardicInspirationDie } from "#/features/class-bard.ts"
import {
  canUseHeroicInspirationNow,
  guards,
  legalArcaneRecoveryLevels,
  legalConvertPointsToSlotLevels,
  legalConvertSlotToPointsLevels,
  legalDivineSmiteLevels,
  legalFontSlotRestoreLevels,
  legalLayOnHandsAmounts,
  legalMetamagicOptions,
  legalMysticArcanumLevels,
  legalPreparedSpellSlotLevels,
  legalWildResurgenceChargeLevels,
} from "#/machine-guards.ts"
import { rootEventHandlers, turnPhaseConfig } from "#/machine-states.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import { CreatureId, SpellSlotLevel, type D20Roll, type SpellName, type SpellSlotLevel as SpellSlotLevelValue } from "#/types.ts"

export type ResourceCost = {
  readonly action?: true
  readonly bonusAction?: true
  readonly reaction?: true
  readonly movement?: number
  readonly charge?: string
}

export type OutcomeDescription = {
  readonly summary: string
}

export const ACTION_SCOPES = ["creature", "battle"] as const
export type ActionScope = (typeof ACTION_SCOPES)[number]

export type Hole<T> = { readonly options: ReadonlyArray<T> }
export type MaybeHole<T> = T | Hole<T>
export type FillHoles<T> = {
  readonly [K in keyof T]: T[K] extends Hole<infer V> ? V : T[K]
}

const DUMMY_EVENT: DndEvent = { type: "STABILIZE" }
const guardArgs = (context: DndContext): { context: DndContext; event: DndEvent } => ({
  context,
  event: DUMMY_EVENT,
})

function displaySpellName(spellName: SpellName): string {
  return spellName
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ")
}

export const SUPPORTED_ACTION_TYPES = [
  "ENTER_COMBAT",
  "USE_HEROIC_INSPIRATION",
  "CAST_PREPARED_SPELL",
  "START_TURN",
  "USE_ACTION_SURGE",
  "USE_INDOMITABLE",
  "USE_TACTICAL_MIND",
  "CONVERT_SLOT_TO_POINTS",
  "CONVERT_POINTS_TO_SLOT",
  "ENTER_RAGE",
  "END_RAGE",
  "EXTEND_RAGE_BA",
  "DECLARE_RECKLESS",
  "USE_LAY_ON_HANDS",
  "USE_DIVINE_SMITE",
  "FLURRY_OF_BLOWS",
  "PATIENT_DEFENSE_FREE",
  "PATIENT_DEFENSE_FOCUS",
  "STEP_OF_THE_WIND_FREE",
  "STEP_OF_THE_WIND_FOCUS",
  "WHOLENESS_OF_BODY",
  "UNCANNY_METABOLISM",
  "USE_ARCANE_RECOVERY",
  "USE_OVERCHANNEL",
  "USE_METAMAGIC",
  "USE_MYSTIC_ARCANUM",
  "USE_SECOND_WIND",
  "USE_TIRELESS",
  "USE_SNEAK_ATTACK",
  "USE_STEADY_AIM",
  "CUNNING_ACTION_DASH",
  "CUNNING_ACTION_DISENGAGE",
  "CUNNING_ACTION_HIDE",
  "USE_CLERIC_CHANNEL_DIVINITY",
  "USE_FONT_SLOT_RESTORE",
  "USE_PALADIN_CHANNEL_DIVINITY",
  "USE_WILD_RESURGENCE_CHARGE",
  "USE_NATURES_VEIL",
  "USE_BARDIC_INSPIRATION",
  "USE_PEERLESS_SKILL",
  "USE_RELENTLESS_RAGE",
  "SHORT_REST",
  "EXIT_COMBAT",
] as const
export type SupportedActionType = (typeof SUPPORTED_ACTION_TYPES)[number]

type SimpleToken<T extends SupportedActionType> = {
  readonly type: T
  readonly cost: ResourceCost
  readonly outcome: OutcomeDescription
}

type TokenByType = {
  readonly ENTER_COMBAT: SimpleToken<"ENTER_COMBAT">
  readonly USE_HEROIC_INSPIRATION: SimpleToken<"USE_HEROIC_INSPIRATION">
  readonly CAST_PREPARED_SPELL: SimpleToken<"CAST_PREPARED_SPELL"> & {
    readonly spellName: ModeledPreparedSpell
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly START_TURN: SimpleToken<"START_TURN">
  readonly USE_ACTION_SURGE: SimpleToken<"USE_ACTION_SURGE">
  readonly USE_INDOMITABLE: SimpleToken<"USE_INDOMITABLE">
  readonly USE_TACTICAL_MIND: SimpleToken<"USE_TACTICAL_MIND">
  readonly CONVERT_SLOT_TO_POINTS: SimpleToken<"CONVERT_SLOT_TO_POINTS"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly CONVERT_POINTS_TO_SLOT: SimpleToken<"CONVERT_POINTS_TO_SLOT"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly ENTER_RAGE: SimpleToken<"ENTER_RAGE">
  readonly END_RAGE: SimpleToken<"END_RAGE">
  readonly EXTEND_RAGE_BA: SimpleToken<"EXTEND_RAGE_BA">
  readonly DECLARE_RECKLESS: SimpleToken<"DECLARE_RECKLESS">
  readonly USE_LAY_ON_HANDS: SimpleToken<"USE_LAY_ON_HANDS"> & {
    readonly amount: Hole<number>
  }
  readonly USE_DIVINE_SMITE: SimpleToken<"USE_DIVINE_SMITE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly FLURRY_OF_BLOWS: SimpleToken<"FLURRY_OF_BLOWS">
  readonly PATIENT_DEFENSE_FREE: SimpleToken<"PATIENT_DEFENSE_FREE">
  readonly PATIENT_DEFENSE_FOCUS: SimpleToken<"PATIENT_DEFENSE_FOCUS">
  readonly STEP_OF_THE_WIND_FREE: SimpleToken<"STEP_OF_THE_WIND_FREE">
  readonly STEP_OF_THE_WIND_FOCUS: SimpleToken<"STEP_OF_THE_WIND_FOCUS">
  readonly WHOLENESS_OF_BODY: SimpleToken<"WHOLENESS_OF_BODY">
  readonly UNCANNY_METABOLISM: SimpleToken<"UNCANNY_METABOLISM">
  readonly USE_ARCANE_RECOVERY: SimpleToken<"USE_ARCANE_RECOVERY"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_OVERCHANNEL: SimpleToken<"USE_OVERCHANNEL">
  readonly USE_METAMAGIC: SimpleToken<"USE_METAMAGIC"> & {
    readonly option: Hole<MetamagicOption>
  }
  readonly USE_MYSTIC_ARCANUM: SimpleToken<"USE_MYSTIC_ARCANUM"> & {
    readonly spellLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_SECOND_WIND: SimpleToken<"USE_SECOND_WIND">
  readonly USE_TIRELESS: SimpleToken<"USE_TIRELESS">
  readonly USE_SNEAK_ATTACK: SimpleToken<"USE_SNEAK_ATTACK">
  readonly USE_STEADY_AIM: SimpleToken<"USE_STEADY_AIM">
  readonly CUNNING_ACTION_DASH: SimpleToken<"CUNNING_ACTION_DASH">
  readonly CUNNING_ACTION_DISENGAGE: SimpleToken<"CUNNING_ACTION_DISENGAGE">
  readonly CUNNING_ACTION_HIDE: SimpleToken<"CUNNING_ACTION_HIDE">
  readonly USE_CLERIC_CHANNEL_DIVINITY: SimpleToken<"USE_CLERIC_CHANNEL_DIVINITY">
  readonly USE_FONT_SLOT_RESTORE: SimpleToken<"USE_FONT_SLOT_RESTORE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_PALADIN_CHANNEL_DIVINITY: SimpleToken<"USE_PALADIN_CHANNEL_DIVINITY">
  readonly USE_WILD_RESURGENCE_CHARGE: SimpleToken<"USE_WILD_RESURGENCE_CHARGE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_NATURES_VEIL: SimpleToken<"USE_NATURES_VEIL">
  readonly USE_BARDIC_INSPIRATION: SimpleToken<"USE_BARDIC_INSPIRATION">
  readonly USE_PEERLESS_SKILL: SimpleToken<"USE_PEERLESS_SKILL">
  readonly USE_RELENTLESS_RAGE: SimpleToken<"USE_RELENTLESS_RAGE">
  readonly SHORT_REST: SimpleToken<"SHORT_REST"> & {
    readonly availableHitDice: ReadonlyArray<{
      readonly className: ClassName
      readonly remaining: number
      readonly dieSize: number
    }>
  }
  readonly EXIT_COMBAT: SimpleToken<"EXIT_COMBAT">
}

type CreatureActionToken = TokenByType[SupportedActionType] & { readonly scope: "creature" }
export type BattleActionToken =
  | {
      readonly scope: "battle"
      readonly actorId: string
      readonly type: "CAST_SHIELD"
      readonly cost: { readonly reaction: true; readonly charge: "spellSlot" }
      readonly outcome: OutcomeDescription
    }
  | {
      readonly scope: "battle"
      readonly actorId: string
      readonly type: "USE_PARRY"
      readonly cost: { readonly reaction: true }
      readonly outcome: OutcomeDescription
    }
  | {
      readonly scope: "battle"
      readonly actorId: string
      readonly type: "USE_CUTTING_WORDS"
      readonly cost: { readonly reaction: true; readonly charge: "bardicInspiration" }
      readonly outcome: OutcomeDescription
    }
  | {
      readonly scope: "battle"
      readonly actorId: string
      readonly type: "USE_UNCANNY_DODGE"
      readonly cost: { readonly reaction: true }
      readonly outcome: OutcomeDescription
    }
  | {
      readonly scope: "battle"
      readonly actorId: string
      readonly type: "USE_DEFLECT_ATTACKS"
      readonly cost: { readonly reaction: true }
      readonly outcome: OutcomeDescription
    }
export type ActionToken = CreatureActionToken | BattleActionToken
type ResolvedTokenByType = {
  readonly ENTER_COMBAT: { readonly type: "ENTER_COMBAT" }
  readonly USE_HEROIC_INSPIRATION: { readonly type: "USE_HEROIC_INSPIRATION" }
  readonly CAST_PREPARED_SPELL: { readonly type: "CAST_PREPARED_SPELL"; readonly spellName: ModeledPreparedSpell; readonly slotLevel: SpellSlotLevelValue }
  readonly START_TURN: { readonly type: "START_TURN" }
  readonly USE_ACTION_SURGE: { readonly type: "USE_ACTION_SURGE" }
  readonly USE_INDOMITABLE: { readonly type: "USE_INDOMITABLE" }
  readonly USE_TACTICAL_MIND: { readonly type: "USE_TACTICAL_MIND" }
  readonly CONVERT_SLOT_TO_POINTS: { readonly type: "CONVERT_SLOT_TO_POINTS"; readonly slotLevel: SpellSlotLevelValue }
  readonly CONVERT_POINTS_TO_SLOT: { readonly type: "CONVERT_POINTS_TO_SLOT"; readonly slotLevel: SpellSlotLevelValue }
  readonly ENTER_RAGE: { readonly type: "ENTER_RAGE" }
  readonly END_RAGE: { readonly type: "END_RAGE" }
  readonly EXTEND_RAGE_BA: { readonly type: "EXTEND_RAGE_BA" }
  readonly DECLARE_RECKLESS: { readonly type: "DECLARE_RECKLESS" }
  readonly USE_LAY_ON_HANDS: { readonly type: "USE_LAY_ON_HANDS"; readonly amount: number }
  readonly USE_DIVINE_SMITE: { readonly type: "USE_DIVINE_SMITE"; readonly slotLevel: SpellSlotLevelValue }
  readonly FLURRY_OF_BLOWS: { readonly type: "FLURRY_OF_BLOWS" }
  readonly PATIENT_DEFENSE_FREE: { readonly type: "PATIENT_DEFENSE_FREE" }
  readonly PATIENT_DEFENSE_FOCUS: { readonly type: "PATIENT_DEFENSE_FOCUS" }
  readonly STEP_OF_THE_WIND_FREE: { readonly type: "STEP_OF_THE_WIND_FREE" }
  readonly STEP_OF_THE_WIND_FOCUS: { readonly type: "STEP_OF_THE_WIND_FOCUS" }
  readonly WHOLENESS_OF_BODY: { readonly type: "WHOLENESS_OF_BODY" }
  readonly UNCANNY_METABOLISM: { readonly type: "UNCANNY_METABOLISM" }
  readonly USE_ARCANE_RECOVERY: { readonly type: "USE_ARCANE_RECOVERY"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_OVERCHANNEL: { readonly type: "USE_OVERCHANNEL" }
  readonly USE_METAMAGIC: { readonly type: "USE_METAMAGIC"; readonly option: MetamagicOption }
  readonly USE_MYSTIC_ARCANUM: { readonly type: "USE_MYSTIC_ARCANUM"; readonly spellLevel: SpellSlotLevelValue }
  readonly USE_SECOND_WIND: { readonly type: "USE_SECOND_WIND" }
  readonly USE_TIRELESS: { readonly type: "USE_TIRELESS" }
  readonly USE_SNEAK_ATTACK: { readonly type: "USE_SNEAK_ATTACK" }
  readonly USE_STEADY_AIM: { readonly type: "USE_STEADY_AIM" }
  readonly CUNNING_ACTION_DASH: { readonly type: "CUNNING_ACTION_DASH" }
  readonly CUNNING_ACTION_DISENGAGE: { readonly type: "CUNNING_ACTION_DISENGAGE" }
  readonly CUNNING_ACTION_HIDE: { readonly type: "CUNNING_ACTION_HIDE" }
  readonly USE_CLERIC_CHANNEL_DIVINITY: { readonly type: "USE_CLERIC_CHANNEL_DIVINITY" }
  readonly USE_FONT_SLOT_RESTORE: { readonly type: "USE_FONT_SLOT_RESTORE"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_PALADIN_CHANNEL_DIVINITY: { readonly type: "USE_PALADIN_CHANNEL_DIVINITY" }
  readonly USE_WILD_RESURGENCE_CHARGE: { readonly type: "USE_WILD_RESURGENCE_CHARGE"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_NATURES_VEIL: { readonly type: "USE_NATURES_VEIL" }
  readonly USE_BARDIC_INSPIRATION: { readonly type: "USE_BARDIC_INSPIRATION" }
  readonly USE_PEERLESS_SKILL: { readonly type: "USE_PEERLESS_SKILL" }
  readonly USE_RELENTLESS_RAGE: { readonly type: "USE_RELENTLESS_RAGE" }
  readonly SHORT_REST: { readonly type: "SHORT_REST"; readonly spendHitDice: ReadonlyArray<ClassName> }
  readonly EXIT_COMBAT: { readonly type: "EXIT_COMBAT" }
}
type CreatureResolvedActionToken = ResolvedTokenByType[SupportedActionType] & { readonly scope: "creature" }
type SpecificBattleResolvedActionToken =
  | { readonly scope: "battle"; readonly actorId: string; readonly type: "CAST_SHIELD" }
  | { readonly scope: "battle"; readonly actorId: string; readonly type: "USE_PARRY" }
  | { readonly scope: "battle"; readonly actorId: string; readonly type: "USE_CUTTING_WORDS" }
  | { readonly scope: "battle"; readonly actorId: string; readonly type: "USE_UNCANNY_DODGE" }
  | { readonly scope: "battle"; readonly actorId: string; readonly type: "USE_DEFLECT_ATTACKS" }

export type BattleResolvedActionToken = SpecificBattleResolvedActionToken
export type ResolvedActionToken = CreatureResolvedActionToken | BattleResolvedActionToken

const EnterCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("ENTER_COMBAT"),
})
const UseHeroicInspirationResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_HEROIC_INSPIRATION"),
})
const CastPreparedSpellResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CAST_PREPARED_SPELL"),
  spellName: ModeledPreparedSpellSchema,
  slotLevel: SpellSlotLevel,
})
const StartTurnResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("START_TURN"),
})
const UseActionSurgeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_ACTION_SURGE"),
})
const UseIndomitableResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_INDOMITABLE"),
})
const UseTacticalMindResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_TACTICAL_MIND"),
})
const ConvertSlotToPointsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CONVERT_SLOT_TO_POINTS"),
  slotLevel: SpellSlotLevel,
})
const ConvertPointsToSlotResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CONVERT_POINTS_TO_SLOT"),
  slotLevel: SpellSlotLevel,
})
const EnterRageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("ENTER_RAGE"),
})
const EndRageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("END_RAGE"),
})
const ExtendRageBAResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXTEND_RAGE_BA"),
})
const DeclareRecklessResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("DECLARE_RECKLESS"),
})
const UseLayOnHandsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_LAY_ON_HANDS"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
})
const UseDivineSmiteResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_DIVINE_SMITE"),
  slotLevel: SpellSlotLevel,
})
const FlurryOfBlowsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("FLURRY_OF_BLOWS"),
})
const PatientDefenseFreeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("PATIENT_DEFENSE_FREE"),
})
const PatientDefenseFocusResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("PATIENT_DEFENSE_FOCUS"),
})
const StepOfTheWindFreeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("STEP_OF_THE_WIND_FREE"),
})
const StepOfTheWindFocusResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("STEP_OF_THE_WIND_FOCUS"),
})
const WholenessOfBodyResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("WHOLENESS_OF_BODY"),
})
const UncannyMetabolismResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("UNCANNY_METABOLISM"),
})
const UseArcaneRecoveryResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_ARCANE_RECOVERY"),
  slotLevel: SpellSlotLevel,
})
const UseOverchannelResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_OVERCHANNEL"),
})
const UseMetamagicResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_METAMAGIC"),
  option: MetamagicOptionSchema,
})
const UseMysticArcanumResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_MYSTIC_ARCANUM"),
  spellLevel: SpellSlotLevel,
})
const UseSecondWindResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_SECOND_WIND"),
})
const UseTirelessResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_TIRELESS"),
})
const UseSneakAttackResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_SNEAK_ATTACK"),
})
const UseSteadyAimResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_STEADY_AIM"),
})
const CunningActionDashResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CUNNING_ACTION_DASH"),
})
const CunningActionDisengageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CUNNING_ACTION_DISENGAGE"),
})
const CunningActionHideResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("CUNNING_ACTION_HIDE"),
})
const UseClericChannelDivinityResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_CLERIC_CHANNEL_DIVINITY"),
})
const UseFontSlotRestoreResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_FONT_SLOT_RESTORE"),
  slotLevel: SpellSlotLevel,
})
const UsePaladinChannelDivinityResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_PALADIN_CHANNEL_DIVINITY"),
})
const UseWildResurgenceChargeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_WILD_RESURGENCE_CHARGE"),
  slotLevel: SpellSlotLevel,
})
const UseNaturesVeilResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_NATURES_VEIL"),
})
const UseBardicInspirationResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_BARDIC_INSPIRATION"),
})
const UsePeerlessSkillResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_PEERLESS_SKILL"),
})
const UseRelentlessRageResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_RELENTLESS_RAGE"),
})
const ShortRestResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("SHORT_REST"),
  spendHitDice: Schema.Array(Schema.Literal(...CLASS_NAMES)),
})
const ExitCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXIT_COMBAT"),
})

const PrimaryCreatureResolvedActionTokenSchema = Schema.Union(
  EnterCombatResolvedActionSchema,
  UseHeroicInspirationResolvedActionSchema,
  CastPreparedSpellResolvedActionSchema,
  StartTurnResolvedActionSchema,
  UseActionSurgeResolvedActionSchema,
  UseIndomitableResolvedActionSchema,
  UseTacticalMindResolvedActionSchema,
  ConvertSlotToPointsResolvedActionSchema,
  ConvertPointsToSlotResolvedActionSchema,
  EnterRageResolvedActionSchema,
  EndRageResolvedActionSchema,
  ExtendRageBAResolvedActionSchema,
  DeclareRecklessResolvedActionSchema,
  UseLayOnHandsResolvedActionSchema,
  UseDivineSmiteResolvedActionSchema,
  FlurryOfBlowsResolvedActionSchema,
  PatientDefenseFreeResolvedActionSchema,
  PatientDefenseFocusResolvedActionSchema,
  StepOfTheWindFreeResolvedActionSchema,
  StepOfTheWindFocusResolvedActionSchema,
  WholenessOfBodyResolvedActionSchema,
  UncannyMetabolismResolvedActionSchema,
).pipe(Schema.attachPropertySignature("scope", "creature"))

const SecondaryCreatureResolvedActionTokenSchema = Schema.Union(
  UseArcaneRecoveryResolvedActionSchema,
  UseOverchannelResolvedActionSchema,
  UseMetamagicResolvedActionSchema,
  UseMysticArcanumResolvedActionSchema,
  UseSecondWindResolvedActionSchema,
  UseTirelessResolvedActionSchema,
  UseSneakAttackResolvedActionSchema,
  UseSteadyAimResolvedActionSchema,
  CunningActionDashResolvedActionSchema,
  CunningActionDisengageResolvedActionSchema,
  CunningActionHideResolvedActionSchema,
  UseClericChannelDivinityResolvedActionSchema,
  UseFontSlotRestoreResolvedActionSchema,
  UsePaladinChannelDivinityResolvedActionSchema,
  UseWildResurgenceChargeResolvedActionSchema,
  UseNaturesVeilResolvedActionSchema,
  UseBardicInspirationResolvedActionSchema,
  UsePeerlessSkillResolvedActionSchema,
  UseRelentlessRageResolvedActionSchema,
  ShortRestResolvedActionSchema,
  ExitCombatResolvedActionSchema,
).pipe(Schema.attachPropertySignature("scope", "creature"))

const BattleResolvedActionTokenSchema = Schema.Struct({
  scope: Schema.Literal("battle"),
  actorId: Schema.String,
  type: Schema.String,
})

export const RESOLVED_ACTION_SCHEMAS = [
  PrimaryCreatureResolvedActionTokenSchema,
  SecondaryCreatureResolvedActionTokenSchema,
  BattleResolvedActionTokenSchema,
] as const
export const ResolvedActionTokenSchema = Schema.Union(
  PrimaryCreatureResolvedActionTokenSchema,
  SecondaryCreatureResolvedActionTokenSchema,
  BattleResolvedActionTokenSchema,
)

export type StartTurnRuntimeInputs = {
  readonly extraAttacks?: number
  readonly deathSaveRoll?: D20Roll
  readonly deathSaveRoll2?: D20Roll
  readonly rechargedAbilities?: ReadonlyArray<string>
}

export type UseSecondWindRuntimeInputs = {
  readonly d10Roll: number
}

export type UseTacticalMindRuntimeInputs = {
  readonly boostedCheckSucceeds: boolean
}

export type WholenessOfBodyRuntimeInputs = {
  readonly healRoll: number
}

export type UncannyMetabolismRuntimeInputs = {
  readonly healRoll: number
}

export type UseTirelessRuntimeInputs = {
  readonly d8Roll: number
}

export type UsePeerlessSkillRuntimeInputs = {
  readonly success: boolean
}

export type UseRelentlessRageRuntimeInputs = {
  readonly conSaveSucceeded: boolean
}

export type ShortRestRuntimeInputs = {
  readonly hdRolls: ReadonlyArray<{ readonly className: ClassName; readonly roll: number }>
}

export type ResolutionRequest =
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "ENTER_COMBAT" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "ENTER_COMBAT" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_HEROIC_INSPIRATION" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_HEROIC_INSPIRATION" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "CAST_PREPARED_SPELL" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "CAST_PREPARED_SPELL" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "START_TURN" }>
      readonly outcome: string
      readonly runtime: "startTurn"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_ACTION_SURGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_ACTION_SURGE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_INDOMITABLE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_INDOMITABLE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_TACTICAL_MIND" }>
      readonly outcome: string
      readonly runtime: "tacticalMind"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "CONVERT_SLOT_TO_POINTS" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "CONVERT_SLOT_TO_POINTS" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "CONVERT_POINTS_TO_SLOT" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "CONVERT_POINTS_TO_SLOT" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "ENTER_RAGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "ENTER_RAGE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "END_RAGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "END_RAGE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "EXTEND_RAGE_BA" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "EXTEND_RAGE_BA" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "DECLARE_RECKLESS" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "DECLARE_RECKLESS" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_LAY_ON_HANDS" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_LAY_ON_HANDS" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_DIVINE_SMITE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_DIVINE_SMITE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "FLURRY_OF_BLOWS" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "FLURRY_OF_BLOWS" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "PATIENT_DEFENSE_FREE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "PATIENT_DEFENSE_FREE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "PATIENT_DEFENSE_FOCUS" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "PATIENT_DEFENSE_FOCUS" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "STEP_OF_THE_WIND_FREE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "STEP_OF_THE_WIND_FREE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "STEP_OF_THE_WIND_FOCUS" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "STEP_OF_THE_WIND_FOCUS" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "WHOLENESS_OF_BODY" }>
      readonly outcome: string
      readonly runtime: "wholenessOfBody"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "UNCANNY_METABOLISM" }>
      readonly outcome: string
      readonly runtime: "uncannyMetabolism"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_ARCANE_RECOVERY" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_ARCANE_RECOVERY" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_OVERCHANNEL" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_OVERCHANNEL" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_METAMAGIC" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_METAMAGIC" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_MYSTIC_ARCANUM" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_MYSTIC_ARCANUM" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_SECOND_WIND" }>
      readonly outcome: string
      readonly runtime: "secondWind"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_TIRELESS" }>
      readonly outcome: string
      readonly runtime: "tireless"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_SNEAK_ATTACK" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_SNEAK_ATTACK" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_STEADY_AIM" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_STEADY_AIM" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "CUNNING_ACTION_DASH" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "CUNNING_ACTION_DASH" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "CUNNING_ACTION_DISENGAGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "CUNNING_ACTION_DISENGAGE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "CUNNING_ACTION_HIDE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "CUNNING_ACTION_HIDE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_CLERIC_CHANNEL_DIVINITY" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_CLERIC_CHANNEL_DIVINITY" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_FONT_SLOT_RESTORE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_FONT_SLOT_RESTORE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_PALADIN_CHANNEL_DIVINITY" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_PALADIN_CHANNEL_DIVINITY" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_WILD_RESURGENCE_CHARGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_WILD_RESURGENCE_CHARGE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_NATURES_VEIL" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_NATURES_VEIL" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_BARDIC_INSPIRATION" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_BARDIC_INSPIRATION" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_PEERLESS_SKILL" }>
      readonly outcome: string
      readonly runtime: "peerlessSkill"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_RELENTLESS_RAGE" }>
      readonly outcome: string
      readonly runtime: "relentlessRage"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "SHORT_REST" }>
      readonly outcome: string
      readonly runtime: "shortRest"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "EXIT_COMBAT" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "EXIT_COMBAT" }>
    }

export type ResolutionRuntimeInputs =
  | { readonly runtime: "none" }
  | { readonly runtime: "startTurn"; readonly values: StartTurnRuntimeInputs }
  | { readonly runtime: "tacticalMind"; readonly values: UseTacticalMindRuntimeInputs }
  | { readonly runtime: "wholenessOfBody"; readonly values: WholenessOfBodyRuntimeInputs }
  | { readonly runtime: "uncannyMetabolism"; readonly values: UncannyMetabolismRuntimeInputs }
  | { readonly runtime: "secondWind"; readonly values: UseSecondWindRuntimeInputs }
  | { readonly runtime: "tireless"; readonly values: UseTirelessRuntimeInputs }
  | { readonly runtime: "peerlessSkill"; readonly values: UsePeerlessSkillRuntimeInputs }
  | { readonly runtime: "relentlessRage"; readonly values: UseRelentlessRageRuntimeInputs }
  | { readonly runtime: "shortRest"; readonly values: ShortRestRuntimeInputs }

export type FinalizedAction =
  | { readonly ok: true; readonly event: DndEvent; readonly outcome: string }
  | { readonly ok: false; readonly error: ActionResolutionError }

export type FinalizedBattleAction =
  | { readonly ok: true; readonly event: BattleEvent; readonly outcome: string }
  | { readonly ok: false; readonly error: ActionResolutionError }

export type BattleResolutionRequest =
  | {
      readonly token: Extract<BattleResolvedActionToken, { readonly type: "USE_UNCANNY_DODGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_RESOLVE_DMG_REACTION" }>
    }
  | {
      readonly token: Extract<BattleResolvedActionToken, { readonly type: "CAST_SHIELD" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_RESOLVE_HIT_REACTION" }>
    }
  | {
      readonly token: Extract<BattleResolvedActionToken, { readonly type: "USE_PARRY" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<BattleEvent, { readonly type: "BATTLE_RESOLVE_HIT_REACTION" }>
    }
  | {
      readonly token: Extract<BattleResolvedActionToken, { readonly type: "USE_CUTTING_WORDS" }>
      readonly outcome: string
      readonly runtime: "cuttingWords"
    }

export type BattleResolutionRuntimeInputs =
  | { readonly runtime: "none" }
  | { readonly runtime: "cuttingWords"; readonly values: { readonly reduction: number } }

export type ActionResolutionErrorCode =
  | "ACTION_NOT_AVAILABLE"
  | "ACTION_NOT_SUPPORTED"
  | "RUNTIME_INPUT_MISMATCH"
  | "INVALID_RUNTIME_INPUT"

export type ActionResolutionError = {
  readonly code: ActionResolutionErrorCode
  readonly message: string
}

type ActionSpec<T extends SupportedActionType> = {
  readonly buildToken: (context: DndContext) => TokenByType[T] | ReadonlyArray<TokenByType[T]> | null
}

function creatureActionToken<T extends TokenByType[SupportedActionType]>(token: T): T & { readonly scope: "creature" } {
  return { scope: "creature", ...token }
}

const ACTION_SPECS: { readonly [K in SupportedActionType]: ActionSpec<K> } = {
  ENTER_COMBAT: {
    buildToken: (context) =>
      !context.inCombat && !context.dead
        ? {
            type: "ENTER_COMBAT",
            cost: {},
            outcome: { summary: "Enter combat (begin tracking turns and action economy)" },
          }
        : null,
  },
  USE_HEROIC_INSPIRATION: {
    buildToken: (context) =>
      canUseHeroicInspirationNow(context)
        ? {
            type: "USE_HEROIC_INSPIRATION",
            cost: {},
            outcome: { summary: "Spend Heroic Inspiration to reroll a die and use the new roll" },
          }
        : null,
  },
  CAST_PREPARED_SPELL: {
    buildToken: (context) =>
      MODELED_PREPARED_SPELLS.flatMap((spellName) => {
        if (!context.preparedSpells.has(spellName)) return []
        const spell = getModeledPreparedSpellInfo(spellName)
        if (spell == null) return []
        const slotLevels = legalPreparedSpellSlotLevels(context, spellName)
        if (slotLevels.length === 0) return []
        return [{
          type: "CAST_PREPARED_SPELL" as const,
          spellName,
          slotLevel: { options: slotLevels },
          cost: spell.castingTime === "bonusAction" ? { bonusAction: true, charge: "spellSlot" } : { action: true, charge: "spellSlot" },
          outcome: {
            summary:
              spell.concentration
                ? `Cast ${displaySpellName(spellName)} with a spell slot of the chosen level and begin concentrating on it`
                : `Cast ${displaySpellName(spellName)} with a spell slot of the chosen level`,
          },
        }]
      }),
  },
  START_TURN: {
    buildToken: (context) =>
      context.inCombat
        ? {
            type: "START_TURN",
            cost: {},
            outcome: { summary: "Start your turn (reset action economy, process start-of-turn effects)" },
          }
        : null,
  },
  USE_ACTION_SURGE: {
    buildToken: (context) =>
      guards.canActionSurge(guardArgs(context))
        ? {
            type: "USE_ACTION_SURGE",
            cost: { charge: "actionSurge" },
            outcome: { summary: "Expend one Action Surge use to gain one additional action this turn" },
          }
        : null,
  },
  USE_INDOMITABLE: {
    buildToken: (context) =>
      guards.canIndomitable(guardArgs(context))
        ? {
            type: "USE_INDOMITABLE",
            cost: { charge: "indomitable" },
            outcome: { summary: "Expend one Indomitable use to reroll the failed saving throw and add your Fighter level" },
          }
        : null,
  },
  USE_TACTICAL_MIND: {
    buildToken: (context) =>
      guards.canTacticalMind(guardArgs(context))
        ? {
            type: "USE_TACTICAL_MIND",
            cost: { charge: "secondWind" },
            outcome: {
              summary: "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
            },
          }
        : null,
  },
  CONVERT_SLOT_TO_POINTS: {
    buildToken: (context) => {
      const slotLevels = legalConvertSlotToPointsLevels(context)
      if (slotLevels.length === 0) return null
      return {
        type: "CONVERT_SLOT_TO_POINTS",
        slotLevel: { options: slotLevels },
        cost: { charge: "spellSlot" },
        outcome: { summary: "Expend a spell slot to gain sorcery points equal to its level" },
      }
    },
  },
  CONVERT_POINTS_TO_SLOT: {
    buildToken: (context) => {
      const slotLevels = legalConvertPointsToSlotLevels(context)
      if (slotLevels.length === 0) return null
      return {
        type: "CONVERT_POINTS_TO_SLOT",
        slotLevel: { options: slotLevels },
        cost: { bonusAction: true, charge: "sorceryPoints" },
        outcome: { summary: "Spend sorcery points to create a spell slot of the chosen level" },
      }
    },
  },
  ENTER_RAGE: {
    buildToken: (context) =>
      guards.canEnterRage(guardArgs(context))
        ? {
            type: "ENTER_RAGE",
            cost: { bonusAction: true, charge: "rage" },
            outcome: { summary: "Enter a Rage, expend one Rage use, and consume your bonus action" },
          }
        : null,
  },
  END_RAGE: {
    buildToken: (context) =>
      guards.isRaging(guardArgs(context))
        ? {
            type: "END_RAGE",
            cost: {},
            outcome: { summary: "End your Rage" },
          }
        : null,
  },
  EXTEND_RAGE_BA: {
    buildToken: (context) =>
      guards.canExtendRageBA(guardArgs(context))
        ? {
            type: "EXTEND_RAGE_BA",
            cost: { bonusAction: true },
            outcome: { summary: "Use your bonus action to keep your Rage going this turn" },
          }
        : null,
  },
  DECLARE_RECKLESS: {
    buildToken: (context) =>
      guards.canDeclareReckless(guardArgs(context))
        ? {
            type: "DECLARE_RECKLESS",
            cost: {},
            outcome: { summary: "Declare Reckless Attack for this turn" },
          }
        : null,
  },
  USE_LAY_ON_HANDS: {
    buildToken: (context) => {
      const amounts = legalLayOnHandsAmounts(context)
      if (amounts.length === 0) return null
      return {
        type: "USE_LAY_ON_HANDS",
        amount: { options: amounts },
        cost: { bonusAction: true, charge: "layOnHandsPool" },
        outcome: { summary: "Spend Lay on Hands points to restore up to that many HP" },
      }
    },
  },
  USE_DIVINE_SMITE: {
    buildToken: (context) => {
      const slotLevels = legalDivineSmiteLevels(context)
      if (slotLevels.length === 0) return null
      return {
        type: "USE_DIVINE_SMITE",
        slotLevel: { options: slotLevels },
        cost: { bonusAction: true, charge: "spellSlot" },
        outcome: { summary: "Expend a spell slot of the chosen level to use Divine Smite" },
      }
    },
  },
  FLURRY_OF_BLOWS: {
    buildToken: (context) => {
      const monk = context.classStates.monk
      if (!monk || !guards.canMonkFocusBA(guardArgs(context))) return null
      return {
        type: "FLURRY_OF_BLOWS",
        cost: { bonusAction: true, charge: "focusPoint" },
        outcome: {
          summary: `Spend 1 Focus Point to make ${flurryOfBlowsStrikes(monk.level)} unarmed strike${flurryOfBlowsStrikes(monk.level) === 1 ? "" : "s"} as a bonus action`,
        },
      }
    },
  },
  PATIENT_DEFENSE_FREE: {
    buildToken: (context) =>
      guards.canMonkFreeBA(guardArgs(context))
        ? {
            type: "PATIENT_DEFENSE_FREE",
            cost: { bonusAction: true },
            outcome: { summary: "Take the Disengage action as a bonus action" },
          }
        : null,
  },
  PATIENT_DEFENSE_FOCUS: {
    buildToken: (context) =>
      guards.canMonkFocusBA(guardArgs(context))
        ? {
            type: "PATIENT_DEFENSE_FOCUS",
            cost: { bonusAction: true, charge: "focusPoint" },
            outcome: { summary: "Spend 1 Focus Point to Disengage and Dodge as a bonus action" },
          }
        : null,
  },
  STEP_OF_THE_WIND_FREE: {
    buildToken: (context) =>
      guards.canMonkFreeBA(guardArgs(context))
        ? {
            type: "STEP_OF_THE_WIND_FREE",
            cost: { bonusAction: true },
            outcome: { summary: "Take the Dash action as a bonus action" },
          }
        : null,
  },
  STEP_OF_THE_WIND_FOCUS: {
    buildToken: (context) =>
      guards.canMonkFocusBA(guardArgs(context))
        ? {
            type: "STEP_OF_THE_WIND_FOCUS",
            cost: { bonusAction: true, charge: "focusPoint" },
            outcome: { summary: "Spend 1 Focus Point to Dash and Disengage as a bonus action" },
          }
        : null,
  },
  WHOLENESS_OF_BODY: {
    buildToken: (context) => {
      const monk = context.classStates.monk
      if (!monk || !guards.canWholenessOfBody(guardArgs(context))) return null
      // The current machine stores wholenessMax (max charges), which is derived from
      // Wisdom modifier with a minimum of 1. That preserves the exact modifier only
      // when WIS >= 1; low-WIS monks would need explicit modifier state for exact text.
      return {
        type: "WHOLENESS_OF_BODY",
        cost: { bonusAction: true, charge: "wholenessOfBody" },
        outcome: {
          summary: `Heal 1d${pMartialArtsDie(monk.level)} + ${monk.wholenessMax} HP (minimum 1)`,
        },
      }
    },
  },
  UNCANNY_METABOLISM: {
    buildToken: (context) => {
      const monk = context.classStates.monk
      if (!monk || !guards.canUncannyMetabolism(guardArgs(context))) return null
      return {
        type: "UNCANNY_METABOLISM",
        cost: { charge: "uncannyMetabolism" },
        outcome: {
          summary: `Regain all expended Focus Points and heal 1d${pMartialArtsDie(monk.level)} + ${monk.level} HP`,
        },
      }
    },
  },
  USE_ARCANE_RECOVERY: {
    buildToken: (context) => {
      const slotLevels = legalArcaneRecoveryLevels(context)
      if (slotLevels.length === 0) return null
      return {
        type: "USE_ARCANE_RECOVERY",
        slotLevel: { options: slotLevels },
        cost: { charge: "arcaneRecovery" },
        outcome: { summary: "Recover one expended spell slot of the chosen level and use Arcane Recovery" },
      }
    },
  },
  USE_OVERCHANNEL: {
    buildToken: (context) => {
      if (!guards.canOverchannel(guardArgs(context))) return null
      if (context.pendingResolution?.kind !== "overchannel") return null
      return {
        type: "USE_OVERCHANNEL",
        cost: {},
        outcome: {
          summary: `Overchannel the qualifying ${displaySpellName(context.pendingResolution.spellName)} cast at slot level ${context.pendingResolution.slotLevel} for maximum damage`,
        },
      }
    },
  },
  USE_METAMAGIC: {
    buildToken: (context) => {
      const legalOptions = legalMetamagicOptions(context)
      // Presence of the token means "there is at least one legal option right now".
      // If legality shrinks to zero during the current cast (for example after using
      // a non-stackable Metamagic option), omit the whole token rather than returning
      // an empty hole payload that the caller could not execute.
      if (legalOptions.length === 0) return null
      return {
        type: "USE_METAMAGIC",
        option: { options: legalOptions },
        cost: { charge: "sorceryPoints" },
        outcome: { summary: "Apply a currently legal known Metamagic option to the spell you are casting" },
      }
    },
  },
  USE_MYSTIC_ARCANUM: {
    buildToken: (context) => {
      const spellLevels = legalMysticArcanumLevels(context)
      if (spellLevels.length === 0) return null
      return {
        type: "USE_MYSTIC_ARCANUM",
        spellLevel: { options: spellLevels },
        cost: { charge: "mysticArcanum" },
        outcome: { summary: "Cast an unused Mystic Arcanum spell of the chosen level without expending a slot" },
      }
    },
  },
  USE_SECOND_WIND: {
    buildToken: (context) =>
      guards.canSecondWind(guardArgs(context))
        ? {
            type: "USE_SECOND_WIND",
            cost: { bonusAction: true, charge: "secondWind" },
            outcome: { summary: `Heal 1d10 + ${context.classStates.fighter?.level ?? 0} HP` },
          }
        : null,
  },
  USE_TIRELESS: {
    buildToken: (context) => {
      const ranger = context.classStates.ranger
      if (!ranger || !guards.canTireless(guardArgs(context))) return null
      return {
        type: "USE_TIRELESS",
        cost: { action: true, charge: "tireless" },
        outcome: { summary: `Gain 1d8 + ${ranger.tirelessMax} temporary HP (minimum 1)` },
      }
    },
  },
  USE_SNEAK_ATTACK: {
    buildToken: (context) =>
      guards.canSneakAttack(guardArgs(context))
        ? {
            type: "USE_SNEAK_ATTACK",
            cost: {},
            outcome: { summary: "Apply Sneak Attack damage to the qualifying hit" },
          }
        : null,
  },
  USE_STEADY_AIM: {
    buildToken: (context) =>
      guards.canSteadyAim(guardArgs(context))
        ? {
            type: "USE_STEADY_AIM",
            cost: { bonusAction: true },
            outcome: { summary: "Use Steady Aim to gain Advantage on your next attack roll; your speed becomes 0 until end of turn" },
          }
        : null,
  },
  CUNNING_ACTION_DASH: {
    buildToken: (context) =>
      guards.canCunningAction(guardArgs(context))
        ? {
            type: "CUNNING_ACTION_DASH",
            cost: { bonusAction: true },
            outcome: { summary: "Take the Dash action as a bonus action" },
          }
        : null,
  },
  CUNNING_ACTION_DISENGAGE: {
    buildToken: (context) =>
      guards.canCunningAction(guardArgs(context))
        ? {
            type: "CUNNING_ACTION_DISENGAGE",
            cost: { bonusAction: true },
            outcome: { summary: "Take the Disengage action as a bonus action" },
          }
        : null,
  },
  CUNNING_ACTION_HIDE: {
    buildToken: (context) =>
      guards.canCunningAction(guardArgs(context))
        ? {
            type: "CUNNING_ACTION_HIDE",
            cost: { bonusAction: true },
            outcome: { summary: "Take the Hide action as a bonus action" },
          }
        : null,
  },
  USE_CLERIC_CHANNEL_DIVINITY: {
    buildToken: (context) =>
      guards.canClericCD(guardArgs(context))
        ? {
            type: "USE_CLERIC_CHANNEL_DIVINITY",
            cost: { charge: "channelDivinity" },
            outcome: { summary: "Expend one Cleric Channel Divinity use" },
          }
        : null,
  },
  USE_FONT_SLOT_RESTORE: {
    buildToken: (context) => {
      const slotLevels = legalFontSlotRestoreLevels(context)
      if (slotLevels.length === 0) return null
      return {
        type: "USE_FONT_SLOT_RESTORE",
        slotLevel: { options: slotLevels },
        cost: { charge: "spellSlot" },
        outcome: { summary: "Expend a spell slot to regain one Bardic Inspiration use" },
      }
    },
  },
  USE_PALADIN_CHANNEL_DIVINITY: {
    buildToken: (context) =>
      guards.canPaladinCD(guardArgs(context))
        ? {
            type: "USE_PALADIN_CHANNEL_DIVINITY",
            cost: { charge: "channelDivinity" },
            outcome: { summary: "Expend one Paladin Channel Divinity use" },
          }
        : null,
  },
  USE_WILD_RESURGENCE_CHARGE: {
    buildToken: (context) => {
      const slotLevels = legalWildResurgenceChargeLevels(context)
      if (slotLevels.length === 0) return null
      return {
        type: "USE_WILD_RESURGENCE_CHARGE",
        slotLevel: { options: slotLevels },
        cost: { charge: "spellSlot" },
        outcome: { summary: "Expend a spell slot to regain one Wild Shape use" },
      }
    },
  },
  USE_NATURES_VEIL: {
    buildToken: (context) =>
      guards.canNaturesVeil(guardArgs(context))
        ? {
            type: "USE_NATURES_VEIL",
            cost: { bonusAction: true, charge: "naturesVeil" },
            outcome: { summary: "Expend one Nature's Veil use to become Invisible" },
          }
        : null,
  },
  USE_BARDIC_INSPIRATION: {
    buildToken: (context) =>
      guards.canBardicInspiration(guardArgs(context))
        ? {
            type: "USE_BARDIC_INSPIRATION",
            cost: { bonusAction: true, charge: "bardicInspiration" },
            outcome: { summary: "Expend one Bardic Inspiration use to inspire another creature" },
          }
        : null,
  },
  USE_PEERLESS_SKILL: {
    buildToken: (context) => {
      if (!guards.canPeerlessSkill(guardArgs(context))) return null
      const mode = context.pendingResolution?.kind === "peerlessSkill" ? context.pendingResolution.mode : "abilityCheck"
      return {
        type: "USE_PEERLESS_SKILL",
        cost: { charge: "bardicInspiration" },
        outcome: {
          summary:
            mode === "attackRoll"
              ? "Add your Bardic Inspiration die to the failed attack roll; expend it only if the roll now succeeds"
              : "Add your Bardic Inspiration die to the failed ability check; expend it only if the check now succeeds",
        },
      }
    },
  },
  USE_RELENTLESS_RAGE: {
    buildToken: (context) => {
      if (!guards.canRelentlessRage(guardArgs(context))) return null
      const barbarian = context.classStates.barbarian
      if (!barbarian) return null
      const dc = relentlessRageDC(barbarian.relentlessRageTimesUsed)
      return {
        type: "USE_RELENTLESS_RAGE",
        cost: {},
        outcome: {
          summary: `Make a DC ${dc} Constitution save to stay at ${2 * barbarian.level} HP instead of dropping to 0`,
        },
      }
    },
  },
  SHORT_REST: {
    buildToken: (context) => {
      if (!canBenefitFromShortRest(context)) return null
      const availableHitDice = shortRestAvailableHitDice(context)
      return {
        type: "SHORT_REST",
        availableHitDice,
        cost: {},
        outcome: {
          summary:
            availableHitDice.length === 0
              ? "Finish a short rest and recharge short-rest features"
              : "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features",
        },
      }
    },
  },
  EXIT_COMBAT: {
    buildToken: (context) =>
      context.inCombat
        ? {
            type: "EXIT_COMBAT",
            cost: {},
            outcome: { summary: "Leave combat (stop tracking turns)" },
          }
        : null,
  },
}

const ROOT_ACTIONS = new Set(Object.keys(rootEventHandlers))
const ACTING_ACTIONS = new Set(Object.keys(turnPhaseConfig.states.acting.on))
const OUT_OF_COMBAT_ACTIONS = new Set(Object.keys(turnPhaseConfig.states.outOfCombat.on))
const WAITING_ACTIONS = new Set(Object.keys(turnPhaseConfig.states.waitingForTurn.on))

function isAcceptedByMachine(type: SupportedActionType, tags: ReadonlySet<string>): boolean {
  if (ROOT_ACTIONS.has(type)) return true
  if (ACTING_ACTIONS.has(type) && tags.has("canAct")) return true
  if (OUT_OF_COMBAT_ACTIONS.has(type) && tags.has("outOfCombat")) return true
  if (WAITING_ACTIONS.has(type) && tags.has("inCombat") && !tags.has("canAct")) return true
  return false
}

export const EXPOSED_ACTION_TYPES = SUPPORTED_ACTION_TYPES

export function getAvailableActions(context: DndContext, tags: ReadonlySet<string>): ReadonlyArray<ActionToken> {
  return SUPPORTED_ACTION_TYPES.flatMap((type) => {
    if (!isAcceptedByMachine(type, tags)) return []
    const builtToken = ACTION_SPECS[type].buildToken(context)
    if (builtToken == null) return []
    if (Array.isArray(builtToken)) return builtToken.map((entry) => creatureActionToken(entry))
    const singleToken = builtToken as TokenByType[SupportedActionType]
    return [creatureActionToken(singleToken)]
  })
}

function battleToken<T extends BattleActionToken>(token: Omit<T, "scope">): T {
  return { scope: "battle", ...token } as T
}

function hitReactionToken(actorId: string, reaction: "RShield" | "RParry" | "RCuttingWords"): BattleActionToken {
  return Match.value(reaction).pipe(
    Match.when("RShield", () =>
      battleToken({
        actorId,
        type: "CAST_SHIELD",
        cost: { reaction: true, charge: "spellSlot" },
        outcome: { summary: "Use your reaction to cast Shield against the triggering attack" },
      }),
    ),
    Match.when("RParry", () =>
      battleToken({
        actorId,
        type: "USE_PARRY",
        cost: { reaction: true },
        outcome: { summary: "Use your reaction to add your Parry bonus against the triggering melee weapon attack" },
      }),
    ),
    Match.when("RCuttingWords", () =>
      battleToken({
        actorId,
        type: "USE_CUTTING_WORDS",
        cost: { reaction: true, charge: "bardicInspiration" },
        outcome: { summary: "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll" },
      }),
    ),
    Match.exhaustive,
  )
}

function damageReactionToken(actorId: string, reaction: "RUncannyDodge" | "RDeflectAttacks"): BattleActionToken {
  return Match.value(reaction).pipe(
    Match.when("RUncannyDodge", () =>
      battleToken({
        actorId,
        type: "USE_UNCANNY_DODGE",
        cost: { reaction: true },
        outcome: { summary: "Use your reaction to halve the triggering attack's damage against you" },
      }),
    ),
    Match.when("RDeflectAttacks", () =>
      battleToken({
        actorId,
        type: "USE_DEFLECT_ATTACKS",
        cost: { reaction: true },
        outcome: { summary: "Use your reaction to reduce the triggering attack's damage with Deflect Attacks" },
      }),
    ),
    Match.exhaustive,
  )
}

export function getAvailableBattleActions(context: BattleContext): ReadonlyArray<BattleActionToken> {
  const awaitCtx = context.awaitCtx
  if (awaitCtx == null) return []

  const interrupt = awaitCtx.interrupt
  if (interrupt.tag === "PIAttackHit") {
    const tokens: Array<BattleActionToken> = []
    for (const [actorId, legalReactions] of interrupt.ctx.legalReactionsByCreature) {
      if (!awaitCtx.eligible.has(actorId)) continue
      for (const reaction of legalReactions) {
        tokens.push(hitReactionToken(actorId, reaction))
      }
    }
    return tokens
  }

  if (interrupt.tag === "PIAttackDamage") {
    const tokens: Array<BattleActionToken> = []
    for (const [actorId, legalReactions] of interrupt.ctx.legalReactionsByCreature) {
      if (!awaitCtx.eligible.has(actorId)) continue
      for (const reaction of legalReactions) {
        tokens.push(damageReactionToken(actorId, reaction))
      }
    }
    return tokens
  }

  return []
}

function availableBattleTokenForType(
  context: BattleContext,
  type: BattleActionToken["type"],
  actorId: string,
): BattleActionToken | undefined {
  return getAvailableBattleActions(context).find((token) => token.type === type && token.actorId === actorId)
}

export function resolveBattleAction(
  context: BattleContext,
  token: BattleResolvedActionToken,
): BattleResolutionRequest | ActionResolutionError {
  if (
    token.type !== "USE_UNCANNY_DODGE" &&
    token.type !== "CAST_SHIELD" &&
    token.type !== "USE_PARRY" &&
    token.type !== "USE_CUTTING_WORDS"
  ) {
    return {
      code: "ACTION_NOT_SUPPORTED",
      message: `${token.type} is not implemented yet through the battle action surface.`,
    }
  }

  const availableToken = availableBattleTokenForType(context, token.type, token.actorId)
  if (availableToken == null) {
    return {
      code: "ACTION_NOT_AVAILABLE",
      message: `${token.type} is not currently available for ${token.actorId} in this battle state.`,
    }
  }

  return Match.value(token).pipe(
    Match.when({ type: "USE_UNCANNY_DODGE" }, (specificToken) => ({
      token: specificToken,
      outcome: availableToken.outcome.summary,
      runtime: "none" as const,
      event: {
        type: "BATTLE_RESOLVE_DMG_REACTION" as const,
        reactorId: CreatureId(specificToken.actorId),
        decision: { tag: "RUncannyDodge" as const },
      },
    })),
    Match.when({ type: "CAST_SHIELD" }, (specificToken) => ({
      token: specificToken,
      outcome: availableToken.outcome.summary,
      runtime: "none" as const,
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION" as const,
        reactorId: CreatureId(specificToken.actorId),
        decision: { tag: "RShield" as const },
      },
    })),
    Match.when({ type: "USE_PARRY" }, (specificToken) => ({
      token: specificToken,
      outcome: availableToken.outcome.summary,
      runtime: "none" as const,
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION" as const,
        reactorId: CreatureId(specificToken.actorId),
        decision: {
          tag: "RParry" as const,
          bonus: context.creatures.get(CreatureId(specificToken.actorId))?.parryAcBonus ?? 0,
        },
      },
    })),
    Match.when({ type: "USE_CUTTING_WORDS" }, (specificToken) => ({
      token: specificToken,
      outcome: availableToken.outcome.summary,
      runtime: "cuttingWords" as const,
    })),
    Match.exhaustive,
  )
}

export function finalizeBattleResolution(
  request: BattleResolutionRequest,
  runtimeInputs: BattleResolutionRuntimeInputs,
  context: BattleContext,
): FinalizedBattleAction {
  if (request.runtime === "none") {
    if (runtimeInputs.runtime !== "none") return battleRuntimeMismatch("none", runtimeInputs.runtime)
    return { ok: true, event: request.event, outcome: request.outcome }
  }

  if (runtimeInputs.runtime !== "cuttingWords") return battleRuntimeMismatch("cuttingWords", runtimeInputs.runtime)
  const bardLevel = context.creatures.get(CreatureId(request.token.actorId))?.bardLevel ?? 0
  const maxReduction = bardicInspirationDie(bardLevel)
  const reduction = runtimeInputs.values.reduction
  if (reduction < 1 || reduction > maxReduction) {
    return {
      ok: false,
      error: {
        code: "INVALID_RUNTIME_INPUT",
        message: `Cutting Words reduction must be between 1 and ${maxReduction}.`,
      },
    }
  }
  return {
    ok: true,
    event: {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId(request.token.actorId),
      decision: { tag: "RCuttingWords", reduction },
    },
    outcome: `${request.outcome} (${reduction})`,
  }
}

function runtimeMismatch(expected: ResolutionRuntimeInputs["runtime"], actual: ResolutionRuntimeInputs["runtime"]): FinalizedAction {
  return {
    ok: false as const,
    error: {
      code: "RUNTIME_INPUT_MISMATCH" as const,
      message: `Expected ${expected} runtime inputs, received ${actual}.`,
    },
  }
}

function battleRuntimeMismatch(
  expected: BattleResolutionRuntimeInputs["runtime"],
  actual: BattleResolutionRuntimeInputs["runtime"],
): FinalizedBattleAction {
  return {
    ok: false,
    error: {
      code: "RUNTIME_INPUT_MISMATCH",
      message: `Expected ${expected} runtime inputs, received ${actual}.`,
    },
  }
}

function availableTokenForType(
  context: DndContext,
  tags: ReadonlySet<string>,
  type: SupportedActionType,
): CreatureActionToken | undefined {
  return getAvailableActions(context, tags).find((token): token is CreatureActionToken => token.scope === "creature" && token.type === type)
}

function shortRestAvailableHitDice(context: DndContext): ReadonlyArray<{
  readonly className: ClassName
  readonly remaining: number
  readonly dieSize: number
}> {
  return CLASS_NAMES.flatMap((className) => {
    const remaining = context.hitDiceRemaining[className]
    return remaining > 0 ? [{ className, remaining, dieSize: classHitDie(className) }] : []
  })
}

function canBenefitFromShortRest(context: DndContext): boolean {
  if (context.inCombat || context.hp < 1) return false
  if (shortRestAvailableHitDice(context).length > 0) return true
  if (context.pactSlotsCurrent < context.pactSlotsMax) return true
  if (Object.values(context.rechargeAvailable).some((available) => !available)) return true

  const fighter = context.classStates.fighter
  if (fighter && (fighter.secondWindCharges < fighter.secondWindMax || fighter.actionSurgeCharges < fighter.actionSurgeMax)) {
    return true
  }

  const barbarian = context.classStates.barbarian
  if (barbarian && (barbarian.rageCharges < barbarian.rageMaxCharges || barbarian.relentlessRageTimesUsed > 0)) {
    return true
  }

  const monk = context.classStates.monk
  if (monk && monk.focusPoints < monk.focusMax) return true

  const paladin = context.classStates.paladin
  if (paladin && paladin.paladinChannelDivinityCharges < paladin.paladinChannelDivinityMax) return true

  const cleric = context.classStates.cleric
  if (cleric && cleric.clericChannelDivinityCharges < cleric.clericChannelDivinityMax) return true

  const druid = context.classStates.druid
  if (druid && druid.wildShapeCharges < druid.wildShapeMax) return true

  const bard = context.classStates.bard
  if (bard && bard.bardicInspirationCharges < bard.bardicInspirationMax) return true

  const sorcerer = context.classStates.sorcerer
  if (sorcerer && !sorcerer.sorcerousRestorationUsed) return true

  return false
}

function isLegalShortRestSpendPlan(context: DndContext, spendHitDice: ReadonlyArray<ClassName>): boolean {
  if (context.inCombat || context.hp < 1) return false
  const remaining = { ...context.hitDiceRemaining }
  for (const className of spendHitDice) {
    if (remaining[className] <= 0) return false
    remaining[className]--
  }
  return true
}

export function resolveAction(
  context: DndContext,
  tags: ReadonlySet<string>,
  token: ResolvedActionToken,
): ResolutionRequest | ActionResolutionError {
  if (token.scope === "battle") {
    return {
      code: "ACTION_NOT_SUPPORTED",
      message: `${token.type} is battle-scoped and cannot execute through the creature action pipeline.`,
    }
  }
  if (token.type === "CAST_PREPARED_SPELL") {
    if (!isAcceptedByMachine(token.type, tags)) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.type} is not currently available in this state.`,
      }
    }
    const spell = getModeledPreparedSpellInfo(token.spellName)
    if (spell == null) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${token.spellName} is not currently available in this state.`,
      }
    }
    if (!legalPreparedSpellSlotLevels(context, token.spellName).includes(token.slotLevel)) {
      return {
        code: "ACTION_NOT_AVAILABLE",
        message: `${displaySpellName(token.spellName)} with a level ${token.slotLevel} slot is not currently available in this state.`,
      }
    }
    return {
      token,
      outcome: spell.concentration
        ? `Cast ${displaySpellName(token.spellName)} with a level ${token.slotLevel} spell slot and begin concentrating on it`
        : `Cast ${displaySpellName(token.spellName)} with a level ${token.slotLevel} spell slot`,
      runtime: "none",
      event: { type: "CAST_PREPARED_SPELL", spellName: token.spellName, slotLevel: token.slotLevel },
    }
  }

  const available = availableTokenForType(context, tags, token.type)
  if (available == null) {
    return {
      code: "ACTION_NOT_AVAILABLE" as const,
      message: `${token.type} is not currently available in this state.`,
    }
  }

  switch (token.type) {
    case "ENTER_COMBAT":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "ENTER_COMBAT" } }
    case "USE_HEROIC_INSPIRATION":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_HEROIC_INSPIRATION" } }
    case "START_TURN":
      return { token, outcome: available.outcome.summary, runtime: "startTurn" }
    case "USE_ACTION_SURGE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_ACTION_SURGE" } }
    case "USE_INDOMITABLE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_INDOMITABLE" } }
    case "USE_TACTICAL_MIND":
      return { token, outcome: available.outcome.summary, runtime: "tacticalMind" }
    case "CONVERT_SLOT_TO_POINTS":
      if (!legalConvertSlotToPointsLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Level ${token.slotLevel} slot conversion is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to gain ${token.slotLevel} sorcery points`,
        runtime: "none",
        event: { type: "CONVERT_SLOT_TO_POINTS", slotLevel: token.slotLevel },
      }
    case "CONVERT_POINTS_TO_SLOT":
      if (!legalConvertPointsToSlotLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Creating a level ${token.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Spend ${slotCreationCost(token.slotLevel)} sorcery points to create a level ${token.slotLevel} spell slot`,
        runtime: "none",
        event: { type: "CONVERT_POINTS_TO_SLOT", slotLevel: token.slotLevel },
      }
    case "ENTER_RAGE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "ENTER_RAGE" } }
    case "END_RAGE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "END_RAGE" } }
    case "EXTEND_RAGE_BA":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "EXTEND_RAGE_BA" } }
    case "DECLARE_RECKLESS":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "DECLARE_RECKLESS" } }
    case "USE_LAY_ON_HANDS":
      if (!legalLayOnHandsAmounts(context).includes(token.amount)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Spending ${token.amount} Lay on Hands points is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Spend ${token.amount} Lay on Hands point${token.amount === 1 ? "" : "s"} to restore up to ${token.amount} HP`,
        runtime: "none",
        event: { type: "USE_LAY_ON_HANDS", amount: token.amount },
      }
    case "USE_DIVINE_SMITE":
      if (!legalDivineSmiteLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Divine Smite with a level ${token.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to use Divine Smite`,
        runtime: "none",
        event: { type: "USE_DIVINE_SMITE", slotLevel: token.slotLevel },
      }
    case "FLURRY_OF_BLOWS":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "FLURRY_OF_BLOWS" } }
    case "PATIENT_DEFENSE_FREE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "PATIENT_DEFENSE_FREE" } }
    case "PATIENT_DEFENSE_FOCUS":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "PATIENT_DEFENSE_FOCUS" } }
    case "STEP_OF_THE_WIND_FREE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "STEP_OF_THE_WIND_FREE" } }
    case "STEP_OF_THE_WIND_FOCUS":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "STEP_OF_THE_WIND_FOCUS" } }
    case "WHOLENESS_OF_BODY":
      return { token, outcome: available.outcome.summary, runtime: "wholenessOfBody" }
    case "UNCANNY_METABOLISM":
      return { token, outcome: available.outcome.summary, runtime: "uncannyMetabolism" }
    case "USE_ARCANE_RECOVERY":
      if (!legalArcaneRecoveryLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Arcane Recovery for a level ${token.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Recover one expended level ${token.slotLevel} spell slot`,
        runtime: "none",
        event: { type: "USE_ARCANE_RECOVERY", slotLevel: token.slotLevel },
      }
    case "USE_OVERCHANNEL":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_OVERCHANNEL" } }
    case "USE_METAMAGIC": {
      const legalOptions = legalMetamagicOptions(context)
      if (!legalOptions.includes(token.option)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `${token.option} Metamagic is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Apply ${token.option} Metamagic`,
        runtime: "none",
        event: { type: "USE_METAMAGIC", option: token.option },
      }
    }
    case "USE_MYSTIC_ARCANUM":
      if (!legalMysticArcanumLevels(context).includes(token.spellLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Mystic Arcanum level ${token.spellLevel} is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Cast your Mystic Arcanum spell of level ${token.spellLevel}`,
        runtime: "none",
        event: { type: "USE_MYSTIC_ARCANUM", spellLevel: token.spellLevel },
      }
    case "USE_SECOND_WIND":
      return { token, outcome: available.outcome.summary, runtime: "secondWind" }
    case "USE_TIRELESS":
      return { token, outcome: available.outcome.summary, runtime: "tireless" }
    case "USE_SNEAK_ATTACK":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_SNEAK_ATTACK" } }
    case "USE_STEADY_AIM":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_STEADY_AIM" } }
    case "CUNNING_ACTION_DASH":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "CUNNING_ACTION_DASH" } }
    case "CUNNING_ACTION_DISENGAGE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "CUNNING_ACTION_DISENGAGE" } }
    case "CUNNING_ACTION_HIDE":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "CUNNING_ACTION_HIDE" } }
    case "USE_CLERIC_CHANNEL_DIVINITY":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_CLERIC_CHANNEL_DIVINITY" } }
    case "USE_FONT_SLOT_RESTORE":
      if (!legalFontSlotRestoreLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Font of Inspiration restore with a level ${token.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to regain one Bardic Inspiration use`,
        runtime: "none",
        event: { type: "USE_FONT_SLOT_RESTORE", slotLevel: token.slotLevel },
      }
    case "USE_PALADIN_CHANNEL_DIVINITY":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_PALADIN_CHANNEL_DIVINITY" } }
    case "USE_WILD_RESURGENCE_CHARGE":
      if (!legalWildResurgenceChargeLevels(context).includes(token.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: `Wild Resurgence with a level ${token.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token,
        outcome: `Expend a level ${token.slotLevel} spell slot to regain one Wild Shape use`,
        runtime: "none",
        event: { type: "USE_WILD_RESURGENCE_CHARGE", slotLevel: token.slotLevel },
      }
    case "USE_NATURES_VEIL":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_NATURES_VEIL" } }
    case "USE_BARDIC_INSPIRATION":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "USE_BARDIC_INSPIRATION" } }
    case "USE_PEERLESS_SKILL":
      return { token, outcome: available.outcome.summary, runtime: "peerlessSkill" }
    case "USE_RELENTLESS_RAGE":
      return { token, outcome: available.outcome.summary, runtime: "relentlessRage" }
    case "SHORT_REST":
      if (!isLegalShortRestSpendPlan(context, token.spendHitDice)) {
        return {
          code: "ACTION_NOT_AVAILABLE",
          message: "The chosen short-rest hit-die spending plan is not currently available in this state.",
        }
      }
      return {
        token,
        outcome:
          token.spendHitDice.length === 0
            ? "Finish a short rest and recharge short-rest features"
            : `Finish a short rest and spend hit dice in this order: ${token.spendHitDice.join(", ")}`,
        runtime: "shortRest",
      }
    case "EXIT_COMBAT":
      return { token, outcome: available.outcome.summary, runtime: "none", event: { type: "EXIT_COMBAT" } }
  }
}

export function finalizeResolution(
  request: ResolutionRequest,
  runtimeInputs: ResolutionRuntimeInputs,
  context: DndContext,
): FinalizedAction {
  return Match.value(request).pipe(
    Match.when({ runtime: "none" }, (resolved): FinalizedAction =>
      runtimeInputs.runtime === "none"
        ? { ok: true as const, event: resolved.event, outcome: resolved.outcome }
        : runtimeMismatch("none", runtimeInputs.runtime),
    ),
    Match.when({ runtime: "startTurn" }, (resolved): FinalizedAction => {
      if (runtimeInputs.runtime !== "startTurn") return runtimeMismatch("startTurn", runtimeInputs.runtime)
      return {
        ok: true as const,
        event: {
          ...runtimeInputs.values,
          type: "START_TURN" as const,
        },
        outcome: resolved.outcome,
      }
    }),
    Match.when({ runtime: "tacticalMind" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "tacticalMind") return runtimeMismatch("tacticalMind", runtimeInputs.runtime)
      return {
        ok: true as const,
        event: {
          type: "USE_TACTICAL_MIND" as const,
          boostedCheckSucceeds: runtimeInputs.values.boostedCheckSucceeds,
        },
        outcome: runtimeInputs.values.boostedCheckSucceeds
          ? "Tactical Mind turned the failed ability check into a success"
          : "Tactical Mind failed to turn the ability check into a success, so Second Wind was not expended",
      }
    }),
    Match.when({ runtime: "wholenessOfBody" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "wholenessOfBody") return runtimeMismatch("wholenessOfBody", runtimeInputs.runtime)
      const monkLevel = context.classStates.monk?.level ?? 0
      const maxDie = pMartialArtsDie(monkLevel)
      const wisMod = context.classStates.monk?.wholenessMax ?? 0
      const minHeal = Math.max(1, 1 + wisMod)
      const maxHeal = Math.max(1, maxDie + wisMod)
      if (runtimeInputs.values.healRoll < minHeal || runtimeInputs.values.healRoll > maxHeal) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Wholeness of Body heal amount must be between ${minHeal} and ${maxHeal}, received ${runtimeInputs.values.healRoll}.`,
          },
        }
      }
      return {
        ok: true as const,
        event: {
          type: "WHOLENESS_OF_BODY" as const,
          healRoll: runtimeInputs.values.healRoll,
        },
        outcome: `Healed ${runtimeInputs.values.healRoll} HP with Wholeness of Body`,
      }
    }),
    Match.when({ runtime: "uncannyMetabolism" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "uncannyMetabolism") return runtimeMismatch("uncannyMetabolism", runtimeInputs.runtime)
      const monkLevel = context.classStates.monk?.level ?? 0
      const maxDie = pMartialArtsDie(monkLevel)
      if (runtimeInputs.values.healRoll < 1 || runtimeInputs.values.healRoll > maxDie) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Uncanny Metabolism die roll must be between 1 and ${maxDie}, received ${runtimeInputs.values.healRoll}.`,
          },
        }
      }
      return {
        ok: true as const,
        event: {
          type: "UNCANNY_METABOLISM" as const,
          healRoll: runtimeInputs.values.healRoll,
        },
        outcome: `Regained all Focus Points and healed 1d${maxDie}(${runtimeInputs.values.healRoll}) + ${monkLevel} = ${
          runtimeInputs.values.healRoll + monkLevel
        } HP`,
      }
    }),
    Match.when({ runtime: "secondWind" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "secondWind") return runtimeMismatch("secondWind", runtimeInputs.runtime)
      if (runtimeInputs.values.d10Roll < 1 || runtimeInputs.values.d10Roll > 10) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Second Wind d10 roll must be between 1 and 10, received ${runtimeInputs.values.d10Roll}.`,
          },
        }
      }
      const fighterLevel = context.classStates.fighter?.level ?? 0
      return {
        ok: true as const,
        event: {
          type: "USE_SECOND_WIND" as const,
          d10Roll: runtimeInputs.values.d10Roll,
        },
        outcome: `Healed 1d10(${runtimeInputs.values.d10Roll}) + ${fighterLevel} = ${
          runtimeInputs.values.d10Roll + fighterLevel
        } HP`,
      }
    }),
    Match.when({ runtime: "tireless" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "tireless") return runtimeMismatch("tireless", runtimeInputs.runtime)
      if (runtimeInputs.values.d8Roll < 1 || runtimeInputs.values.d8Roll > 8) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Tireless d8 roll must be between 1 and 8, received ${runtimeInputs.values.d8Roll}.`,
          },
        }
      }
      const wisComponent = context.classStates.ranger?.tirelessMax ?? 0
      const tempHp = tirelessTempHp(runtimeInputs.values.d8Roll, wisComponent)
      return {
        ok: true as const,
        event: {
          type: "USE_TIRELESS" as const,
          d8Roll: runtimeInputs.values.d8Roll,
        },
        outcome: `Gained 1d8(${runtimeInputs.values.d8Roll}) + ${Math.max(1, wisComponent)} = ${tempHp} temporary HP`,
      }
    }),
    Match.when({ runtime: "peerlessSkill" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "peerlessSkill") return runtimeMismatch("peerlessSkill", runtimeInputs.runtime)
      const mode = context.pendingResolution?.kind === "peerlessSkill" ? context.pendingResolution.mode : "abilityCheck"
      return {
        ok: true as const,
        event: {
          type: "USE_PEERLESS_SKILL" as const,
          success: runtimeInputs.values.success,
        },
        outcome: runtimeInputs.values.success
          ? `Peerless Skill turned the failed ${mode === "attackRoll" ? "attack roll" : "ability check"} into a success`
          : `Peerless Skill failed to turn the ${mode === "attackRoll" ? "attack roll" : "ability check"} into a success, so Bardic Inspiration was not expended`,
      }
    }),
    Match.when({ runtime: "relentlessRage" }, (): FinalizedAction => {
      if (runtimeInputs.runtime !== "relentlessRage") return runtimeMismatch("relentlessRage", runtimeInputs.runtime)
      const barbarianLevel = context.classStates.barbarian?.level ?? 0
      return {
        ok: true as const,
        event: {
          type: "USE_RELENTLESS_RAGE" as const,
          conSaveSucceeded: runtimeInputs.values.conSaveSucceeded,
        },
        outcome: runtimeInputs.values.conSaveSucceeded
          ? `Relentless Rage succeeded; HP becomes ${2 * barbarianLevel}`
          : "Relentless Rage failed; HP remains 0",
      }
    }),
    Match.when({ runtime: "shortRest" }, (resolved): FinalizedAction => {
      if (runtimeInputs.runtime !== "shortRest") return runtimeMismatch("shortRest", runtimeInputs.runtime)
      if (runtimeInputs.values.hdRolls.length !== resolved.token.spendHitDice.length) {
        return {
          ok: false as const,
          error: {
            code: "INVALID_RUNTIME_INPUT" as const,
            message: `Short Rest expected ${resolved.token.spendHitDice.length} hit-die roll(s), received ${runtimeInputs.values.hdRolls.length}.`,
          },
        }
      }
      for (const [index, expectedClassName] of resolved.token.spendHitDice.entries()) {
        const actual = runtimeInputs.values.hdRolls[index]
        const dieSize = classHitDie(expectedClassName)
        if (actual == null || actual.className !== expectedClassName) {
          return {
            ok: false as const,
            error: {
              code: "INVALID_RUNTIME_INPUT" as const,
              message: `Short Rest roll ${index + 1} must be for ${expectedClassName}, received ${actual?.className ?? "missing"}.`,
            },
          }
        }
        if (actual.roll < 1 || actual.roll > dieSize) {
          return {
            ok: false as const,
            error: {
              code: "INVALID_RUNTIME_INPUT" as const,
              message: `Short Rest roll ${index + 1} for ${expectedClassName} must be between 1 and ${dieSize}, received ${actual.roll}.`,
            },
          }
        }
      }
      return {
        ok: true as const,
        event: {
          type: "SHORT_REST" as const,
          hdRolls: runtimeInputs.values.hdRolls,
        },
        outcome: resolved.token.spendHitDice.length === 0
          ? resolved.outcome
          : `Spent hit dice in order: ${runtimeInputs.values.hdRolls
              .map(({ className, roll }) => `${className} d${classHitDie(className)}(${roll})`)
              .join(", ")}`,
      }
    }),
    Match.exhaustive,
  )
}
