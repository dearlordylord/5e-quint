import { Match, Schema } from "effect"

import {
  MetamagicOptionSchema,
} from "#/features/class-sorcerer.ts"
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
type HoleKeys<T> = { [K in keyof T]: T[K] extends Hole<unknown> ? K : never }[keyof T]

const DUMMY_EVENT: DndEvent = { type: "STABILIZE" }
const guardArgs = (context: DndContext): { context: DndContext; event: DndEvent } => ({
  context,
  event: DUMMY_EVENT,
})

export const SUPPORTED_ACTION_TYPES = [
  "ENTER_COMBAT",
  "USE_HEROIC_INSPIRATION",
  "START_TURN",
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
  readonly EXIT_COMBAT: SimpleToken<"EXIT_COMBAT">
}

export type ActionToken = TokenByType[SupportedActionType]
type ResolvedTokenByType = {
  readonly [K in SupportedActionType]: Pick<FillHoles<TokenByType[K]>, "type" | HoleKeys<TokenByType[K]>>
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
const ExitCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXIT_COMBAT"),
})

export const RESOLVED_ACTION_SCHEMAS = [
  EnterCombatResolvedActionSchema,
  UseHeroicInspirationResolvedActionSchema,
  StartTurnResolvedActionSchema,
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
  ExitCombatResolvedActionSchema,
] as const
export const ResolvedActionTokenSchema = Schema.Union(...RESOLVED_ACTION_SCHEMAS)

export type StartTurnRuntimeInputs = {
  readonly extraAttacks?: number
  readonly deathSaveRoll?: D20Roll
  readonly deathSaveRoll2?: D20Roll
  readonly conMod?: number
  readonly rechargedAbilities?: ReadonlyArray<string>
}

export type UseSecondWindRuntimeInputs = {
  readonly d10Roll: number
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
      readonly token: Extract<ResolvedActionToken, { readonly type: "EXIT_COMBAT" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "EXIT_COMBAT" }>
    }

export type ResolutionRuntimeInputs =
  | { readonly runtime: "none" }
  | { readonly runtime: "startTurn"; readonly values: StartTurnRuntimeInputs }
  | { readonly runtime: "wholenessOfBody"; readonly values: WholenessOfBodyRuntimeInputs }
  | { readonly runtime: "uncannyMetabolism"; readonly values: UncannyMetabolismRuntimeInputs }
  | { readonly runtime: "secondWind"; readonly values: UseSecondWindRuntimeInputs }
  | { readonly runtime: "tireless"; readonly values: UseTirelessRuntimeInputs }

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

  return Match.value(token).pipe(
    Match.when({ type: "ENTER_COMBAT" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "none" as const,
      event: { type: "ENTER_COMBAT" as const },
    })),
    Match.when({ type: "USE_HEROIC_INSPIRATION" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "none" as const,
      event: { type: "USE_HEROIC_INSPIRATION" as const },
    })),
    Match.when({ type: "START_TURN" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "startTurn" as const,
    })),
    Match.when({ type: "CONVERT_SLOT_TO_POINTS" }, (resolved) => {
      if (!legalConvertSlotToPointsLevels(context).includes(resolved.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Level ${resolved.slotLevel} slot conversion is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Expend a level ${resolved.slotLevel} spell slot to gain ${resolved.slotLevel} sorcery points`,
        runtime: "none" as const,
        event: { type: "CONVERT_SLOT_TO_POINTS" as const, slotLevel: resolved.slotLevel },
      }
    }),
    Match.when({ type: "CONVERT_POINTS_TO_SLOT" }, (resolved) => {
      if (!legalConvertPointsToSlotLevels(context).includes(resolved.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Creating a level ${resolved.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Spend ${slotCreationCost(resolved.slotLevel)} sorcery points to create a level ${resolved.slotLevel} spell slot`,
        runtime: "none" as const,
        event: { type: "CONVERT_POINTS_TO_SLOT" as const, slotLevel: resolved.slotLevel },
      }
    }),
    Match.when({ type: "USE_LAY_ON_HANDS" }, (resolved) => {
      if (!legalLayOnHandsAmounts(context).includes(resolved.amount)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Spending ${resolved.amount} Lay on Hands points is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Spend ${resolved.amount} Lay on Hands point${resolved.amount === 1 ? "" : "s"} to restore up to ${resolved.amount} HP`,
        runtime: "none" as const,
        event: { type: "USE_LAY_ON_HANDS" as const, amount: resolved.amount },
      }
    }),
    Match.when({ type: "USE_DIVINE_SMITE" }, (resolved) => {
      if (!legalDivineSmiteLevels(context).includes(resolved.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Divine Smite with a level ${resolved.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Expend a level ${resolved.slotLevel} spell slot to use Divine Smite`,
        runtime: "none" as const,
        event: { type: "USE_DIVINE_SMITE" as const, slotLevel: resolved.slotLevel },
      }
    }),
    Match.when({ type: "WHOLENESS_OF_BODY" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "wholenessOfBody" as const,
    })),
    Match.when({ type: "UNCANNY_METABOLISM" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "uncannyMetabolism" as const,
    })),
    Match.when({ type: "USE_ARCANE_RECOVERY" }, (resolved) => {
      if (!legalArcaneRecoveryLevels(context).includes(resolved.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Arcane Recovery for a level ${resolved.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Recover one expended level ${resolved.slotLevel} spell slot`,
        runtime: "none" as const,
        event: { type: "USE_ARCANE_RECOVERY" as const, slotLevel: resolved.slotLevel },
      }
    }),
    Match.when({ type: "USE_METAMAGIC" }, (resolved) => {
      const legalOptions = legalMetamagicOptions(context)
      if (!legalOptions.includes(resolved.option)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `${resolved.option} Metamagic is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Apply ${resolved.option} Metamagic`,
        runtime: "none" as const,
        event: { type: "USE_METAMAGIC" as const, option: resolved.option },
      }
    }),
    Match.when({ type: "USE_MYSTIC_ARCANUM" }, (resolved) => {
      if (!legalMysticArcanumLevels(context).includes(resolved.spellLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Mystic Arcanum level ${resolved.spellLevel} is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Cast your Mystic Arcanum spell of level ${resolved.spellLevel}`,
        runtime: "none" as const,
        event: { type: "USE_MYSTIC_ARCANUM" as const, spellLevel: resolved.spellLevel },
      }
    }),
    Match.when({ type: "USE_SECOND_WIND" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "secondWind" as const,
    })),
    Match.when({ type: "USE_TIRELESS" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "tireless" as const,
    })),
    Match.when({ type: "USE_FONT_SLOT_RESTORE" }, (resolved) => {
      if (!legalFontSlotRestoreLevels(context).includes(resolved.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Font of Inspiration restore with a level ${resolved.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Expend a level ${resolved.slotLevel} spell slot to regain one Bardic Inspiration use`,
        runtime: "none" as const,
        event: { type: "USE_FONT_SLOT_RESTORE" as const, slotLevel: resolved.slotLevel },
      }
    }),
    Match.when({ type: "USE_WILD_RESURGENCE_CHARGE" }, (resolved) => {
      if (!legalWildResurgenceChargeLevels(context).includes(resolved.slotLevel)) {
        return {
          code: "ACTION_NOT_AVAILABLE" as const,
          message: `Wild Resurgence with a level ${resolved.slotLevel} slot is not currently available in this state.`,
        }
      }
      return {
        token: resolved,
        outcome: `Expend a level ${resolved.slotLevel} spell slot to regain one Wild Shape use`,
        runtime: "none" as const,
        event: { type: "USE_WILD_RESURGENCE_CHARGE" as const, slotLevel: resolved.slotLevel },
      }
    }),
    Match.when({ type: "EXIT_COMBAT" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "none" as const,
      event: { type: "EXIT_COMBAT" as const },
    })),
    Match.exhaustive,
  )
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
    Match.exhaustive,
  )
}
