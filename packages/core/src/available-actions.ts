import { Match, Schema } from "effect"

import { guards } from "#/machine-guards.ts"
import { rootEventHandlers, turnPhaseConfig } from "#/machine-states.ts"
import type { DndContext, DndEvent, StartTurnEffect } from "#/machine-types.ts"
import type { D20Roll } from "#/types.ts"

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
  "START_TURN",
  "USE_SECOND_WIND",
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
  readonly START_TURN: SimpleToken<"START_TURN">
  readonly USE_SECOND_WIND: SimpleToken<"USE_SECOND_WIND">
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
const StartTurnResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("START_TURN"),
})
const UseSecondWindResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("USE_SECOND_WIND"),
})
const ExitCombatResolvedActionSchema = Schema.Struct({
  type: Schema.Literal("EXIT_COMBAT"),
})

export const RESOLVED_ACTION_SCHEMAS = [
  EnterCombatResolvedActionSchema,
  StartTurnResolvedActionSchema,
  UseSecondWindResolvedActionSchema,
  ExitCombatResolvedActionSchema,
] as const
export const ResolvedActionTokenSchema = Schema.Union(...RESOLVED_ACTION_SCHEMAS)

export type StartTurnRuntimeInputs = {
  readonly extraAttacks?: number
  readonly isGrappling: boolean
  readonly grappledTargetTwoSizesSmaller: boolean
  readonly deathSaveRoll?: D20Roll
  readonly deathSaveRoll2?: D20Roll
  readonly conMod?: number
  readonly startOfTurnEffects: ReadonlyArray<StartTurnEffect>
  readonly rechargedAbilities?: ReadonlyArray<string>
}

export type UseSecondWindRuntimeInputs = {
  readonly d10Roll: number
}

export type ResolutionRequest =
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "ENTER_COMBAT" }>
      readonly outcome: string
      readonly runtime: "none"
      readonly event: Extract<DndEvent, { readonly type: "ENTER_COMBAT" }>
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "START_TURN" }>
      readonly outcome: string
      readonly runtime: "startTurn"
    }
  | {
      readonly token: Extract<ResolvedActionToken, { readonly type: "USE_SECOND_WIND" }>
      readonly outcome: string
      readonly runtime: "secondWind"
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
  | { readonly runtime: "secondWind"; readonly values: UseSecondWindRuntimeInputs }

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
    Match.when({ type: "START_TURN" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "startTurn" as const,
    })),
    Match.when({ type: "USE_SECOND_WIND" }, (resolved) => ({
      token: resolved,
      outcome: available.outcome.summary,
      runtime: "secondWind" as const,
    })),
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
    Match.exhaustive,
  )
}
