import { Effect, JSONSchema, Random, Schema } from "effect"
import { NodeRuntime } from "@effect/platform-node"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { createActor } from "xstate"

import { creatureMachine } from "@dnd/core/machine.ts"
import type { DndEvent, DndMachineInput } from "@dnd/core/machine-types.ts"
import {
  getAvailableActions,
  EXPOSED_ACTION_TYPES,
  HOLE_ACTION_TYPES,
  type ActionToken,
  type ResourceCost,
} from "@dnd/core/available-actions.ts"
import { classLevel, SpellSlotLevel } from "@dnd/core/types.ts"
import { MetamagicOptionSchema } from "@dnd/core/features/class-sorcerer.ts"

// --- Actor setup ---

const FIGHTER_5_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(5),
  effectiveSpeed: 30,
}

const actor = createActor(creatureMachine, { input: FIGHTER_5_INPUT })
actor.start()

// --- Effect Schemas for tool inputs ---

// Simple actions: just { type: "X" }, no extra fields — everything exposed minus hole actions
const holeSet: ReadonlySet<string> = new Set(HOLE_ACTION_TYPES)
const SimpleActionSchemas = EXPOSED_ACTION_TYPES
  .filter((t) => !holeSet.has(t))
  .map((t) => Schema.Struct({ type: Schema.Literal(t) }))

// Actions with slotLevel hole
const SlotLevelActions = [
  "CONVERT_SLOT_TO_POINTS",
  "CONVERT_POINTS_TO_SLOT",
  "USE_ARCANE_RECOVERY",
  "USE_FONT_SLOT_RESTORE",
  "USE_WILD_RESURGENCE_CHARGE",
  "USE_DIVINE_SMITE",
] as const
const SlotLevelActionSchemas = SlotLevelActions.map(
  (t) => Schema.Struct({ type: Schema.Literal(t), slotLevel: SpellSlotLevel })
)

const UseMysticArcanum = Schema.Struct({
  type: Schema.Literal("USE_MYSTIC_ARCANUM"),
  spellLevel: SpellSlotLevel,
})

const UseLayOnHands = Schema.Struct({
  type: Schema.Literal("USE_LAY_ON_HANDS"),
  amount: Schema.Number.pipe(Schema.int(), Schema.positive()),
})

const UseMetamagic = Schema.Struct({
  type: Schema.Literal("USE_METAMAGIC"),
  option: MetamagicOptionSchema,
})

const ExecuteActionParams = Schema.Union(
  ...SimpleActionSchemas,
  ...SlotLevelActionSchemas,
  UseMysticArcanum,
  UseLayOnHands,
  UseMetamagic,
)

// TODO: derive MCP input schemas from ExecuteInput<K> instead of hand-writing them.
// The .map() over EXPOSED_ACTION_TYPES loses literal type specificity, so a single structural
// check can't verify all variants. See plan.

const executeActionJsonSchema = JSONSchema.make(ExecuteActionParams)

// --- Context serialization schema ---
// TODO: Define a proper Effect Schema for DndContext with Option → null, Set → array transforms.
// For now, use a JSON.stringify replacer as a stopgap until the DndContext schema is built.

function serializeContext(ctx: unknown): unknown {
  return JSON.parse(JSON.stringify(ctx, (_key, value) => {
    if (value != null && typeof value === "object" && "_tag" in value) {
      if (value._tag === "None") return null
      if (value._tag === "Some") return value.value
    }
    if (value instanceof Set) return [...value]
    return value
  }))
}

function groupByCost(tokens: ReadonlyArray<ActionToken>): Record<string, ReadonlyArray<ActionToken>> {
  const groups: Record<string, ActionToken[]> = {
    action: [], bonusAction: [], reaction: [], free: [],
  }
  for (const t of tokens) {
    const c: ResourceCost = t.cost
    if (c.action) groups.action.push(t)
    else if (c.bonusAction) groups.bonusAction.push(t)
    else if (c.reaction) groups.reaction.push(t)
    else groups.free.push(t)
  }
  return groups
}

const server = new Server(
  { name: "dnd-available-actions", version: "0.1.0" },
  { capabilities: { tools: {} } },
)

const toolDefinitions = [
  {
    name: "get_state",
    description: "Returns the current creature state (HP, conditions, resources, class features, turn economy) as JSON.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_available_actions",
    description: "Returns available action tokens grouped by action economy cost (action, bonusAction, reaction, free). Each token describes one legal action with its cost, outcome summary, and any choice holes the caller must fill.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "execute_action",
    description: "Execute a player action. Provide the action type and any required choice fields (slotLevel, spellLevel, amount, option). Phase 1: only USE_SECOND_WIND is fully implemented.",
    inputSchema: executeActionJsonSchema,
  },
]

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case "get_state": {
      const ctx = actor.getSnapshot().context
      return {
        content: [{ type: "text", text: JSON.stringify(serializeContext(ctx), null, 2) }],
      }
    }

    case "get_available_actions": {
      const snap = actor.getSnapshot()
      const tokens = getAvailableActions(snap.context, snap.tags)
      const grouped = groupByCost(tokens)
      return {
        content: [{ type: "text", text: JSON.stringify(grouped, null, 2) }],
      }
    }

    case "execute_action": {
      const parseResult = Schema.decodeUnknownEither(ExecuteActionParams)(args)
      if (parseResult._tag === "Left") {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Invalid input", details: String(parseResult.left) }) }],
          isError: true,
        }
      }
      const parsed = parseResult.right

      const ok = (outcome: string) => {
        const ctx = actor.getSnapshot().context
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ success: true, outcome, state: serializeContext(ctx) }, null, 2),
          }],
        }
      }

      // Actions needing server-generated fields (dice rolls, etc.)
      if (parsed.type === "USE_SECOND_WIND") {
        const d10Roll = Effect.runSync(Random.nextIntBetween(1, 11))
        actor.send({ type: parsed.type, d10Roll })
        const fighterLevel = actor.getSnapshot().context.classStates.fighter?.level ?? 0
        return ok(`Healed 1d10(${d10Roll}) + ${fighterLevel} = ${d10Roll + fighterLevel} HP`)
      }

      // TODO: START_TURN payload is wrong — baseSpeed, armorPenalty, extraAttacks etc. are
      // battle-context fields that the MCP consumer shouldn't provide. These should come from
      // creature state or a battle manager. Hardcoded for Phase 1 Fighter 5 demo. See plan.
      if (parsed.type === "START_TURN") {
        actor.send({
          type: parsed.type,
          baseSpeed: 30,
          armorPenalty: 0,
          extraAttacks: 1,
          callerSpeedModifier: 1,
          isGrappling: false,
          grappledTargetTwoSizesSmaller: false,
          startOfTurnEffects: [],
        })
        return ok("Started your turn")
      }

      // Capture outcome summary BEFORE sending (action may no longer be available after)
      const preSnap = actor.getSnapshot()
      const preToken = getAvailableActions(preSnap.context, preSnap.tags)
        .find((t) => t.type === parsed.type)
      const summary = preToken?.outcome.summary ?? `Executed ${parsed.type}`

      // Zero-payload actions — forward directly to actor
      actor.send({ type: parsed.type } as DndEvent)
      return ok(summary)
    }

    default:
      return {
        content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        isError: true,
      }
  }
})

// --- Start ---

const program = Effect.gen(function* () {
  const transport = new StdioServerTransport()
  yield* Effect.promise(() => server.connect(transport))
  yield* Effect.log("dnd-available-actions MCP server started on stdio")
  // Keep alive until signal
  yield* Effect.never
})

NodeRuntime.runMain(
  program.pipe(
    Effect.catchAllCause((cause) => Effect.logError("MCP server crashed", cause)),
  ),
)
