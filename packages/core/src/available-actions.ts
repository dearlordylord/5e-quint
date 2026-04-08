import { Match, Schema } from "effect"

import {
  MetamagicOptionSchema,
} from "#/features/class-sorcerer.ts"
import { CLASS_NAMES, classHitDie, type ClassName } from "#/features/class-tables.ts"
import { relentlessRageDC } from "#/features/class-barbarian.ts"
import { pMartialArtsDie } from "#/features/class-monk.ts"
import { tirelessTempHp } from "#/features/class-ranger.ts"
import { slotCreationCost, type MetamagicOption } from "#/features/class-sorcerer.ts"
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
  legalWildResurgenceChargeLevels,
} from "#/machine-guards.ts"
import { rootEventHandlers, turnPhaseConfig } from "#/machine-states.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import { SpellSlotLevel, type D20Roll, type SpellSlotLevel as SpellSlotLevelValue } from "#/types.ts"

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

export const SUPPORTED_ACTION_TYPES = [
  "ENTER_COMBAT",
  "USE_HEROIC_INSPIRATION",
  "START_TURN",
  "USE_TACTICAL_MIND",
  "CONVERT_SLOT_TO_POINTS",
  "CONVERT_POINTS_TO_SLOT",
  "USE_LAY_ON_HANDS",
  "USE_DIVINE_SMITE",
  "WHOLENESS_OF_BODY",
  "UNCANNY_METABOLISM",
  "USE_ARCANE_RECOVERY",
  "USE_METAMAGIC",
  "USE_MYSTIC_ARCANUM",
  "USE_SECOND_WIND",
  "USE_TIRELESS",
  "USE_FONT_SLOT_RESTORE",
  "USE_WILD_RESURGENCE_CHARGE",
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
  readonly START_TURN: SimpleToken<"START_TURN">
  readonly USE_TACTICAL_MIND: SimpleToken<"USE_TACTICAL_MIND">
  readonly CONVERT_SLOT_TO_POINTS: SimpleToken<"CONVERT_SLOT_TO_POINTS"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly CONVERT_POINTS_TO_SLOT: SimpleToken<"CONVERT_POINTS_TO_SLOT"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_LAY_ON_HANDS: SimpleToken<"USE_LAY_ON_HANDS"> & {
    readonly amount: Hole<number>
  }
  readonly USE_DIVINE_SMITE: SimpleToken<"USE_DIVINE_SMITE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly WHOLENESS_OF_BODY: SimpleToken<"WHOLENESS_OF_BODY">
  readonly UNCANNY_METABOLISM: SimpleToken<"UNCANNY_METABOLISM">
  readonly USE_ARCANE_RECOVERY: SimpleToken<"USE_ARCANE_RECOVERY"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_METAMAGIC: SimpleToken<"USE_METAMAGIC"> & {
    readonly option: Hole<MetamagicOption>
  }
  readonly USE_MYSTIC_ARCANUM: SimpleToken<"USE_MYSTIC_ARCANUM"> & {
    readonly spellLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_SECOND_WIND: SimpleToken<"USE_SECOND_WIND">
  readonly USE_TIRELESS: SimpleToken<"USE_TIRELESS">
  readonly USE_FONT_SLOT_RESTORE: SimpleToken<"USE_FONT_SLOT_RESTORE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
  readonly USE_WILD_RESURGENCE_CHARGE: SimpleToken<"USE_WILD_RESURGENCE_CHARGE"> & {
    readonly slotLevel: Hole<SpellSlotLevelValue>
  }
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

export type ActionToken = TokenByType[SupportedActionType]
type ResolvedTokenByType = {
  readonly ENTER_COMBAT: { readonly type: "ENTER_COMBAT" }
  readonly USE_HEROIC_INSPIRATION: { readonly type: "USE_HEROIC_INSPIRATION" }
  readonly START_TURN: { readonly type: "START_TURN" }
  readonly USE_TACTICAL_MIND: { readonly type: "USE_TACTICAL_MIND" }
  readonly CONVERT_SLOT_TO_POINTS: { readonly type: "CONVERT_SLOT_TO_POINTS"; readonly slotLevel: SpellSlotLevelValue }
  readonly CONVERT_POINTS_TO_SLOT: { readonly type: "CONVERT_POINTS_TO_SLOT"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_LAY_ON_HANDS: { readonly type: "USE_LAY_ON_HANDS"; readonly amount: number }
  readonly USE_DIVINE_SMITE: { readonly type: "USE_DIVINE_SMITE"; readonly slotLevel: SpellSlotLevelValue }
  readonly WHOLENESS_OF_BODY: { readonly type: "WHOLENESS_OF_BODY" }
  readonly UNCANNY_METABOLISM: { readonly type: "UNCANNY_METABOLISM" }
  readonly USE_ARCANE_RECOVERY: { readonly type: "USE_ARCANE_RECOVERY"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_METAMAGIC: { readonly type: "USE_METAMAGIC"; readonly option: MetamagicOption }
  readonly USE_MYSTIC_ARCANUM: { readonly type: "USE_MYSTIC_ARCANUM"; readonly spellLevel: SpellSlotLevelValue }
  readonly USE_SECOND_WIND: { readonly type: "USE_SECOND_WIND" }
  readonly USE_TIRELESS: { readonly type: "USE_TIRELESS" }
  readonly USE_FONT_SLOT_RESTORE: { readonly type: "USE_FONT_SLOT_RESTORE"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_WILD_RESURGENCE_CHARGE: { readonly type: "USE_WILD_RESURGENCE_CHARGE"; readonly slotLevel: SpellSlotLevelValue }
  readonly USE_PEERLESS_SKILL: { readonly type: "USE_PEERLESS_SKILL" }
  readonly USE_RELENTLESS_RAGE: { readonly type: "USE_RELENTLESS_RAGE" }
  readonly SHORT_REST: { readonly type: "SHORT_REST"; readonly spendHitDice: ReadonlyArray<ClassName> }
  readonly EXIT_COMBAT: { readonly type: "EXIT_COMBAT" }
}
export type ResolvedActionToken = ResolvedTokenByType[SupportedActionType]

const EnterCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("ENTER_COMBAT"),
})
const UseHeroicInspirationResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_HEROIC_INSPIRATION"),
})
const StartTurnResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("START_TURN"),
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
const UseLayOnHandsResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_LAY_ON_HANDS"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
})
const UseDivineSmiteResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_DIVINE_SMITE"),
  slotLevel: SpellSlotLevel,
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
const UseFontSlotRestoreResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_FONT_SLOT_RESTORE"),
  slotLevel: SpellSlotLevel,
})
const UseWildResurgenceChargeResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_WILD_RESURGENCE_CHARGE"),
  slotLevel: SpellSlotLevel,
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

const PrimaryResolvedActionTokenSchema = Schema.Union(
  EnterCombatResolvedActionSchema,
  UseHeroicInspirationResolvedActionSchema,
  StartTurnResolvedActionSchema,
  UseTacticalMindResolvedActionSchema,
  ConvertSlotToPointsResolvedActionSchema,
  ConvertPointsToSlotResolvedActionSchema,
  UseLayOnHandsResolvedActionSchema,
  UseDivineSmiteResolvedActionSchema,
  WholenessOfBodyResolvedActionSchema,
  UncannyMetabolismResolvedActionSchema,
)

const SecondaryResolvedActionTokenSchema = Schema.Union(
  UseArcaneRecoveryResolvedActionSchema,
  UseMetamagicResolvedActionSchema,
  UseMysticArcanumResolvedActionSchema,
  UseSecondWindResolvedActionSchema,
  UseTirelessResolvedActionSchema,
  UseFontSlotRestoreResolvedActionSchema,
  UseWildResurgenceChargeResolvedActionSchema,
  UsePeerlessSkillResolvedActionSchema,
  UseRelentlessRageResolvedActionSchema,
  ShortRestResolvedActionSchema,
  ExitCombatResolvedActionSchema,
)

export const RESOLVED_ACTION_SCHEMAS = [
  EnterCombatResolvedActionSchema,
  UseHeroicInspirationResolvedActionSchema,
  StartTurnResolvedActionSchema,
  UseTacticalMindResolvedActionSchema,
  ConvertSlotToPointsResolvedActionSchema,
  ConvertPointsToSlotResolvedActionSchema,
  UseLayOnHandsResolvedActionSchema,
  UseDivineSmiteResolvedActionSchema,
  WholenessOfBodyResolvedActionSchema,
  UncannyMetabolismResolvedActionSchema,
  UseArcaneRecoveryResolvedActionSchema,
  UseMetamagicResolvedActionSchema,
  UseMysticArcanumResolvedActionSchema,
  UseSecondWindResolvedActionSchema,
  UseTirelessResolvedActionSchema,
  UseFontSlotRestoreResolvedActionSchema,
  UseWildResurgenceChargeResolvedActionSchema,
  UsePeerlessSkillResolvedActionSchema,
  UseRelentlessRageResolvedActionSchema,
  ShortRestResolvedActionSchema,
  ExitCombatResolvedActionSchema,
] as const
export const ResolvedActionTokenSchema = Schema.Union(PrimaryResolvedActionTokenSchema, SecondaryResolvedActionTokenSchema)

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
      readonly token: Extract<ResolvedActionToken, { readonly type: "START_TURN" }>
      readonly outcome: string
      readonly runtime: "startTurn"
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
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_FONT_SLOT_RESTORE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_FONT_SLOT_RESTORE" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_WILD_RESURGENCE_CHARGE" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "USE_WILD_RESURGENCE_CHARGE" }>
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
  readonly buildToken: (context: DndContext) => TokenByType[T] | null
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
    const token = ACTION_SPECS[type].buildToken(context)
    return token === null ? [] : [token]
  })
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

function availableTokenForType(
  context: DndContext,
  tags: ReadonlySet<string>,
  type: SupportedActionType,
): ActionToken | undefined {
  return getAvailableActions(context, tags).find((token) => token.type === type)
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
