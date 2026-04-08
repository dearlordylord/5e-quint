import { Effect, JSONSchema, Match, Random, Schema } from "effect"
import { createActor, type ActorRefFrom, type SnapshotFrom } from "xstate"

import { creatureMachine } from "@dnd/core/machine.ts"
import type { DndMachineInput } from "@dnd/core/machine-types.ts"
import {
  EXPOSED_ACTION_TYPES,
  finalizeResolution,
  getAvailableActions,
  resolveAction,
  ResolvedActionTokenSchema,
  type ActionToken,
  type ResolutionRequest,
  type ResourceCost,
  type ResolutionRuntimeInputs,
} from "@dnd/core/available-actions.ts"
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

export function serializeContext(context: unknown): unknown {
  return JSON.parse(
    JSON.stringify(context, (_key, value) => {
      if (value != null && typeof value === "object" && "_tag" in value) {
        if (value._tag === "None") return null
        if (value._tag === "Some") return value.value
      }
      if (value instanceof Set) return [...value]
      return value
    }),
  )
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
    description: "Returns the current creature state (HP, conditions, resources, class features, turn economy) as JSON.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_available_actions",
    description: `Returns available action tokens grouped by action economy cost. Phase 1 exposes: ${EXPOSED_ACTION_TYPES.join(", ")}.`,
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "execute_action",
    description: "Execute a resolved action token. User-facing choices must already be filled; MCP supplies engine-only values like prerolls.",
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
  return JSON.stringify({
    value: snapshot.value,
    tags: [...snapshot.tags].sort(),
    context: serializeContext(snapshot.context),
  })
}

function buildRuntimeInputs(request: ResolutionRequest): Effect.Effect<ResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "none" }, () => Effect.succeed({ runtime: "none" as const })),
    Match.when({ runtime: "startTurn" }, () =>
      Effect.succeed({
        runtime: "startTurn" as const,
        values: {
          isGrappling: false,
          grappledTargetTwoSizesSmaller: false,
          startOfTurnEffects: [],
        },
      }),
    ),
    Match.when({ runtime: "secondWind" }, () =>
      Effect.map(Random.nextIntBetween(1, 11), (d10Roll) => ({
        runtime: "secondWind" as const,
        values: { d10Roll },
      })),
    ),
    Match.exhaustive,
  )
}

function executeResolvedAction(actor: DndActor, args: unknown) {
  const decoded = Schema.decodeUnknownEither(ResolvedActionTokenSchema)(args)
  if (decoded._tag === "Left") {
    return errorContent("Invalid execute_action input", String(decoded.left))
  }

  const before = actor.getSnapshot()
  const resolution = resolveAction(before.context, before.tags, decoded.right)
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code)
  }

  const runtimeInputs = Effect.runSync(buildRuntimeInputs(resolution))
  const finalized = finalizeResolution(resolution, runtimeInputs, before.context)
  if (!finalized.ok) {
    return errorContent(finalized.error.message, finalized.error.code)
  }

  actor.send(finalized.event)

  const after = actor.getSnapshot()
  if (snapshotFingerprint(before) === snapshotFingerprint(after)) {
    return errorContent("Action was not accepted by the machine", decoded.right.type)
  }

  return jsonContent({
    success: true,
    outcome: finalized.outcome,
    state: serializeContext(after.context),
  })
}

export function handleToolCall(actor: DndActor, name: string, args: unknown) {
  if (name === "get_state") {
    return jsonContent(serializeContext(actor.getSnapshot().context))
  }

  if (name === "get_available_actions") {
    const snapshot = actor.getSnapshot()
    return jsonContent(groupByCost(getAvailableActions(snapshot.context, snapshot.tags)))
  }

  if (name === "execute_action") {
    return executeResolvedAction(actor, args)
  }

  return errorContent(`Unknown tool: ${name}`)
}
