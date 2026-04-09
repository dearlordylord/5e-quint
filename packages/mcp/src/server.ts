import { Effect, JSONSchema, Match, Random, Schema } from "effect"
import { createActor, type ActorRefFrom, type SnapshotFrom } from "xstate"

import { battleMachine } from "@dnd/core/battle-machine.ts"
import { creatureMachine } from "@dnd/core/machine.ts"
import { encodeDndContext, encodeDndSnapshot } from "@dnd/core/context-encoding.ts"
import type { BattleContext, CreatureId } from "@dnd/core/battle-machine-types.ts"
import type { DndMachineInput } from "@dnd/core/machine-types.ts"
import { bardicInspirationDie } from "@dnd/core/features/class-bard.ts"
import { classHitDie } from "@dnd/core/features/class-tables.ts"
import {
  EXPOSED_ACTION_TYPES,
  finalizeBattleResolution,
  finalizeResolution,
  getAvailableActions,
  getAvailableBattleActions,
  type BattleResolutionRequest,
  type BattleResolutionRuntimeInputs,
  resolveBattleAction,
  resolveAction,
  ResolvedActionTokenSchema,
  type ActionToken,
  type BattleResolvedActionToken,
  type ResolvedActionToken,
  type ResolutionRequest,
  type ResourceCost,
  type ResolutionRuntimeInputs,
} from "@dnd/core/available-actions.ts"
import { pMartialArtsDie } from "@dnd/core/features/class-monk.ts"
import { classLevel } from "@dnd/core/types.ts"

export const DEMO_ACTOR_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}
const DEMO_STARTING_DAMAGE = 10

export type DndActor = ActorRefFrom<typeof creatureMachine>
type DndSnapshot = SnapshotFrom<typeof creatureMachine>
export type BattleActor = ActorRefFrom<typeof battleMachine>
type BattleSnapshot = SnapshotFrom<typeof battleMachine>
export type CreatureActionHost = { readonly scope: "creature"; readonly actor: DndActor }
export type BattleActionHost = { readonly scope: "battle"; readonly actor: BattleActor }
export type SupportedActionHost = CreatureActionHost | BattleActionHost

export function createDemoActor(input: DndMachineInput = DEMO_ACTOR_INPUT): DndActor {
  const actor = createActor(creatureMachine, { input })
  actor.start()
  actor.send({
    type: "TAKE_DAMAGE",
    amount: DEMO_STARTING_DAMAGE,
    damageType: "slashing",
    resistances: new Set(),
    vulnerabilities: new Set(),
    immunities: new Set(),
    isCritical: false,
  })
  return actor
}

export function createDemoHost(input: DndMachineInput = DEMO_ACTOR_INPUT): CreatureActionHost {
  return { scope: "creature", actor: createDemoActor(input) }
}

export function createBattleHost(actor?: BattleActor): BattleActionHost {
  const battleActor = actor ?? createActor(battleMachine)
  battleActor.start()
  return { scope: "battle", actor: battleActor }
}

export function groupByCost(tokens: ReadonlyArray<ActionToken>): Record<string, ReadonlyArray<ActionToken>> {
  const groups: Record<string, ActionToken[]> = {
    action: [],
    bonusAction: [],
    reaction: [],
    free: [],
  }
  for (const token of tokens) {
    const cost: ResourceCost = token.cost
    if (cost.action) groups.action.push(token)
    else if (cost.bonusAction) groups.bonusAction.push(token)
    else if (cost.reaction) groups.reaction.push(token)
    else groups.free.push(token)
  }
  return groups
}

export const executeActionJsonSchema = JSONSchema.make(ResolvedActionTokenSchema)

export const toolDefinitions = [
  {
    name: "get_state",
    description: "Returns the current creature or battle host state as JSON.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_available_actions",
    description: `Returns available scoped action tokens grouped by action economy cost. Currently exposes creature actions: ${EXPOSED_ACTION_TYPES.join(", ")}.`,
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "execute_action",
    description: "Execute a resolved scoped action token. User-facing choices must already be filled; MCP supplies engine-only values like prerolls.",
    inputSchema: executeActionJsonSchema,
  },
] as const

function jsonContent(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] }
}

function errorContent(message: string, details?: unknown) {
  return {
    ...jsonContent(details == null ? { error: message } : { error: message, details }),
    isError: true as const,
  }
}

function snapshotFingerprint(snapshot: DndSnapshot): string {
  return JSON.stringify(encodeDndSnapshot(snapshot))
}

function battleSnapshotUnchanged(before: BattleSnapshot, after: BattleSnapshot): boolean {
  return before.context === after.context && JSON.stringify(before.value) === JSON.stringify(after.value)
}

function battlePhase(context: BattleContext) {
  if (context.awaitCtx !== null) return "awaitingReaction" as const
  if (context.aoeCtx !== null) return "resolvingAoE" as const
  if (context.movementCtx !== null) return "resolvingMovement" as const
  if (context.laCtx !== null) return "awaitingLegendaryAction" as const
  if (context.readyCtx !== null) return "awaitingReadiedAction" as const
  return "activeTurn" as const
}

function currentTurnCreatureId(context: BattleContext): CreatureId | null {
  return context.initiative[context.turnIndex] ?? null
}

function encodeBattleRuntimeState(snapshot: BattleSnapshot) {
  return {
    scope: "battle" as const,
    machineState: snapshot.value,
    tags: [...snapshot.tags].sort(),
    round: snapshot.context.round,
    turnIndex: snapshot.context.turnIndex,
    activeCreatureId: currentTurnCreatureId(snapshot.context),
    initiative: snapshot.context.initiative,
    creatureIds: [...snapshot.context.creatures.keys()].sort(),
    phase: battlePhase(snapshot.context),
    awaitingReaction: snapshot.context.awaitCtx !== null,
    resolvingAoE: snapshot.context.aoeCtx !== null,
    resolvingMovement: snapshot.context.movementCtx !== null,
    awaitingLegendaryAction: snapshot.context.laCtx !== null,
    awaitingReadiedAction: snapshot.context.readyCtx !== null,
  }
}

function buildRuntimeInputs(request: ResolutionRequest, context: DndSnapshot["context"]): Effect.Effect<ResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "none" }, () => Effect.succeed({ runtime: "none" as const })),
    Match.when({ runtime: "startTurn" }, () =>
      Effect.succeed({
        runtime: "startTurn" as const,
        values: {},
      }),
    ),
    // These actions already have an owned pending trigger window in core state.
    // The current machine/event contract still reduces the underlying reroll/save
    // math to a final success boolean, so MCP can only supply that boolean here.
    // For now the demo runtime samples it randomly; richer battle/session-level
    // roll ownership should replace this once the machine owns more than the
    // final success/failure outcome.
    Match.when({ runtime: "tacticalMind" }, () =>
      Effect.map(Random.nextBoolean, (boostedCheckSucceeds) => ({
        runtime: "tacticalMind" as const,
        values: { boostedCheckSucceeds },
      })),
    ),
    Match.when({ runtime: "wholenessOfBody" }, () => {
      const monk = context.classStates.monk
      const dieSize = pMartialArtsDie(monk?.level ?? 0)
      const wisMod = monk?.wholenessMax ?? 0
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (dieRoll) => ({
        runtime: "wholenessOfBody" as const,
        values: { healRoll: Math.max(1, dieRoll + wisMod) },
      }))
    }),
    Match.when({ runtime: "uncannyMetabolism" }, () => {
      const monk = context.classStates.monk
      const dieSize = pMartialArtsDie(monk?.level ?? 0)
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (healRoll) => ({
        runtime: "uncannyMetabolism" as const,
        values: { healRoll },
      }))
    }),
    Match.when({ runtime: "secondWind" }, () =>
      Effect.map(Random.nextIntBetween(1, 11), (d10Roll) => ({
        runtime: "secondWind" as const,
        values: { d10Roll },
      })),
    ),
    Match.when({ runtime: "tireless" }, () =>
      Effect.map(Random.nextIntBetween(1, 9), (d8Roll) => ({
        runtime: "tireless" as const,
        values: { d8Roll },
      })),
    ),
    Match.when({ runtime: "peerlessSkill" }, () =>
      Effect.map(Random.nextBoolean, (success) => ({
        runtime: "peerlessSkill" as const,
        values: { success },
      })),
    ),
    Match.when({ runtime: "relentlessRage" }, () =>
      Effect.map(Random.nextBoolean, (conSaveSucceeded) => ({
        runtime: "relentlessRage" as const,
        values: { conSaveSucceeded },
      })),
    ),
    Match.when({ runtime: "shortRest" }, (resolved) =>
      Effect.forEach(resolved.token.spendHitDice, (className) =>
        Effect.map(Random.nextIntBetween(1, classHitDie(className) + 1), (roll) => ({ className, roll })),
      ).pipe(
        Effect.map((hdRolls) => ({
          runtime: "shortRest" as const,
          values: { hdRolls },
        })),
      ),
    ),
    Match.exhaustive,
  )
}

function buildBattleRuntimeInputs(
  request: BattleResolutionRequest,
  context: BattleContext,
): Effect.Effect<BattleResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "none" }, () => Effect.succeed({ runtime: "none" as const })),
    Match.when({ runtime: "cuttingWords" }, () => {
      const bardLevel = context.creatures.get(request.token.actorId as CreatureId)?.bardLevel ?? 0
      const dieSize = bardicInspirationDie(bardLevel)
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (reduction) => ({
        runtime: "cuttingWords" as const,
        values: { reduction },
      }))
    }),
    Match.exhaustive,
  )
}

function executeCreatureResolvedAction(actor: DndActor, token: Extract<ResolvedActionToken, { readonly scope: "creature" }>) {
  const before = actor.getSnapshot()
  const resolution = resolveAction(before.context, before.tags, token)
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code)
  }

  const runtimeInputs = Effect.runSync(buildRuntimeInputs(resolution, before.context))
  const finalized = finalizeResolution(resolution, runtimeInputs, before.context)
  if (!finalized.ok) {
    return errorContent(finalized.error.message, finalized.error.code)
  }

  actor.send(finalized.event)

  const after = actor.getSnapshot()
  if (snapshotFingerprint(before) === snapshotFingerprint(after)) {
    return errorContent("Action was not accepted by the machine", token.type)
  }

  return jsonContent({
    success: true,
    outcome: finalized.outcome,
    state: encodeDndContext(after.context),
  })
}

function scopeMismatchContent(tokenScope: "creature" | "battle", hostScope: "creature" | "battle") {
  return errorContent(
    `Action scope ${tokenScope} does not match the current ${hostScope} host.`,
    "ACTION_SCOPE_MISMATCH",
  )
}

function isSupportedBattleResolvedActionToken(
  token: { readonly scope: "battle"; readonly actorId: string; readonly type: string },
): token is BattleResolvedActionToken {
  return (
    token.type === "CAST_SHIELD" ||
    token.type === "USE_PARRY" ||
    token.type === "USE_CUTTING_WORDS" ||
    token.type === "USE_UNCANNY_DODGE" ||
    token.type === "USE_DEFLECT_ATTACKS"
  )
}

function executeBattleResolvedAction(actor: BattleActor, token: BattleResolvedActionToken) {
  const before = actor.getSnapshot()
  const resolution = resolveBattleAction(before.context, token)
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code)
  }

  const runtimeInputs = Effect.runSync(buildBattleRuntimeInputs(resolution, before.context))
  const finalized = finalizeBattleResolution(resolution, runtimeInputs, before.context)
  if (!finalized.ok) {
    return errorContent(finalized.error.message, finalized.error.code)
  }

  actor.send(finalized.event)

  const after = actor.getSnapshot()
  if (battleSnapshotUnchanged(before, after)) {
    return errorContent("Action was not accepted by the battle machine", token.type)
  }

  return jsonContent({
    success: true,
    outcome: finalized.outcome,
    state: encodeBattleRuntimeState(after),
  })
}

function executeResolvedAction(host: SupportedActionHost, args: unknown) {
  const decoded = Schema.decodeUnknownEither(ResolvedActionTokenSchema)(args)
  if (decoded._tag === "Left") {
    return errorContent("Invalid execute_action input", String(decoded.left))
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) => {
      if (decoded.right.scope !== "creature") {
        return scopeMismatchContent(decoded.right.scope, "creature")
      }
      return executeCreatureResolvedAction(actor, decoded.right)
    }),
    Match.when({ scope: "battle" }, ({ actor }) => {
      if (decoded.right.scope !== "battle") {
        return scopeMismatchContent(decoded.right.scope, "battle")
      }
      if (!isSupportedBattleResolvedActionToken(decoded.right)) {
        return errorContent(`${decoded.right.type} is not implemented yet through the battle action surface.`, "ACTION_NOT_SUPPORTED")
      }
      return executeBattleResolvedAction(actor, decoded.right)
    }),
    Match.exhaustive,
  )
}

export function handleToolCall(host: SupportedActionHost, name: string, args: unknown) {
  if (name === "get_state") {
    return Match.value(host).pipe(
      Match.when({ scope: "creature" }, ({ actor }) => jsonContent(encodeDndContext(actor.getSnapshot().context))),
      Match.when({ scope: "battle" }, ({ actor }) => jsonContent(encodeBattleRuntimeState(actor.getSnapshot()))),
      Match.exhaustive,
    )
  }

  if (name === "get_available_actions") {
    return Match.value(host).pipe(
      Match.when({ scope: "creature" }, ({ actor }) => {
        const snapshot = actor.getSnapshot()
        return jsonContent(groupByCost(getAvailableActions(snapshot.context, snapshot.tags)))
      }),
      Match.when({ scope: "battle" }, ({ actor }) => jsonContent(groupByCost(getAvailableBattleActions(actor.getSnapshot().context)))),
      Match.exhaustive,
    )
  }

  if (name === "execute_action") {
    return executeResolvedAction(host, args)
  }

  return errorContent(`Unknown tool: ${name}`)
}
