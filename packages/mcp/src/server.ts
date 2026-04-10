import { Effect, JSONSchema, Match, Schema } from "effect";
import { createActor } from "xstate";

import { battleMachine } from "@dnd/core/battle-machine.ts";
import { creatureMachine } from "@dnd/core/machine.ts";
import { encodeDndContext } from "@dnd/core/context-encoding.ts";
import type { DndMachineInput } from "@dnd/core/machine-types.ts";
import {
  EXPOSED_ACTION_TYPES,
  finalizeBattleResolution,
  finalizeResolution,
  getAvailableActions,
  getAvailableBattleActions,
  previewAction,
  previewBattleAction,
  ControlCommandSchema,
  resolveBattleAction,
  resolveAction,
  ResolvedActionTokenSchema,
  type ActionToken,
  type BattleResolvedActionToken,
  type ResolvedActionToken,
  type ResourceCost,
  TableEventCommandSchema,
} from "@dnd/core/available-actions.ts";
import { classLevel } from "@dnd/core/types.ts";

import { executeControlCommand } from "./server-control.ts";
import {
  buildBattleRuntimeInputs,
  buildRuntimeInputs,
} from "./server-runtime.ts";
import {
  type BattleActor,
  type DndActor,
  type SupportedActionHost,
  battleSnapshotUnchanged,
  encodeBattleRuntimeState,
  errorContent,
  jsonContent,
  snapshotFingerprint,
} from "./server-shared.ts";
import { recordTableEvent } from "./server-table-events.ts";

export const DEMO_ACTOR_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};
const DEMO_STARTING_DAMAGE = 10;

export type { BattleActor, DndActor, SupportedActionHost };
export type CreatureActionHost = {
  readonly scope: "creature";
  readonly actor: DndActor;
};
export type BattleActionHost = {
  readonly scope: "battle";
  readonly actor: BattleActor;
};

export function createDemoActor(
  input: DndMachineInput = DEMO_ACTOR_INPUT,
): DndActor {
  const actor = createActor(creatureMachine, { input });
  actor.start();
  actor.send({
    type: "TAKE_DAMAGE",
    amount: DEMO_STARTING_DAMAGE,
    damageType: "slashing",
    resistances: new Set(),
    vulnerabilities: new Set(),
    immunities: new Set(),
    isCritical: false,
  });
  return actor;
}

export function createDemoHost(
  input: DndMachineInput = DEMO_ACTOR_INPUT,
): CreatureActionHost {
  return { scope: "creature", actor: createDemoActor(input) };
}

export function createBattleHost(actor?: BattleActor): BattleActionHost {
  const battleActor = actor ?? createActor(battleMachine);
  battleActor.start();
  return { scope: "battle", actor: battleActor };
}

export function groupByCost(
  tokens: ReadonlyArray<ActionToken>,
): Record<string, ReadonlyArray<ActionToken>> {
  const groups: Record<string, ActionToken[]> = {
    action: [],
    bonusAction: [],
    reaction: [],
    free: [],
  };
  for (const token of tokens) {
    const cost: ResourceCost = token.cost;
    if (
      cost.some((item) => item.kind === "quota" && item.resource === "action")
    )
      groups.action.push(token);
    else if (
      cost.some(
        (item) => item.kind === "quota" && item.resource === "bonusAction",
      )
    )
      groups.bonusAction.push(token);
    else if (
      cost.some((item) => item.kind === "quota" && item.resource === "reaction")
    )
      groups.reaction.push(token);
    else groups.free.push(token);
  }
  return groups;
}

export const executeActionJsonSchema = JSONSchema.make(
  ResolvedActionTokenSchema,
);
export const executeControlCommandJsonSchema =
  JSONSchema.make(ControlCommandSchema);
export const recordTableEventJsonSchema = JSONSchema.make(
  TableEventCommandSchema,
);

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

const resolvedActionMcpInputSchema = {
  type: "object",
  required: ["type"],
  properties: {
    scope: {
      type: "string",
      enum: ["creature", "battle"],
      description:
        "Optional token scope. Creature tokens may omit this; battle tokens require battle scope.",
    },
    type: {
      type: "string",
      description:
        "Resolved action token type from get_available_actions, with any required user choice fields included.",
    },
  },
  additionalProperties: true,
} satisfies McpObjectInputSchema;

const scopedCommandMcpInputSchema = {
  type: "object",
  required: ["scope", "type"],
  properties: {
    scope: { type: "string", enum: ["creature", "battle"] },
    type: { type: "string" },
  },
  additionalProperties: true,
} satisfies McpObjectInputSchema;

export const toolDefinitions = [
  {
    name: "get_state",
    description: "Returns the current creature or battle host state as JSON.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_available_actions",
    description: `Returns available scoped action tokens grouped by action economy cost. Creature scope exposes: ${EXPOSED_ACTION_TYPES.join(", ")}. This lane also keeps lifecycle tokens such as SHORT_REST when the public step includes user choices or runtime resolution. Battle scope exposes the currently owned battle actions and interrupt reactions for the live battle window.`,
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "execute_action",
    description:
      "Execute a resolved scoped action token. User-facing choices must already be filled; this includes lifecycle tokens such as SHORT_REST when their public contract carries user choice or runtime-owned rolls. MCP supplies engine-only values like prerolls.",
    inputSchema: resolvedActionMcpInputSchema,
  },
  {
    name: "preview_action",
    description:
      "Preview a resolved scoped action token without spending resources or mutating state.",
    inputSchema: resolvedActionMcpInputSchema,
  },
  {
    name: "execute_control_command",
    description:
      "Execute a narrow session, turn, rest, or monster-control command. Supported battle turn commands require explicit runtime facts; MCP does not invent hidden start/end-turn inputs. This surface does not mirror lifecycle flows already kept on execute_action, including SHORT_REST.",
    inputSchema: scopedCommandMcpInputSchema,
  },
  {
    name: "record_table_event",
    description:
      "Record a narrow DM/table/world fact. Creature damage/recovery and condition/exhaustion events are applied with provenance warnings; unsupported table events return structured errors without mutating state.",
    inputSchema: scopedCommandMcpInputSchema,
  },
] as const;

function executeCreatureResolvedAction(
  actor: DndActor,
  token: Extract<ResolvedActionToken, { readonly scope: "creature" }>,
) {
  const before = actor.getSnapshot();
  const resolution = resolveAction(before.context, before.tags, token);
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code);
  }

  const runtimeInputs = Effect.runSync(
    buildRuntimeInputs(resolution, before.context),
  );
  const finalized = finalizeResolution(
    resolution,
    runtimeInputs,
    before.context,
  );
  if (!finalized.ok) {
    return errorContent(finalized.error.message, finalized.error.code);
  }

  actor.send(finalized.event);

  const after = actor.getSnapshot();
  if (snapshotFingerprint(before) === snapshotFingerprint(after)) {
    return errorContent("Action was not accepted by the machine", token.type);
  }

  return jsonContent({
    success: true,
    outcome: finalized.outcome,
    state: encodeDndContext(after.context),
  });
}

function scopeMismatchContent(
  tokenScope: "creature" | "battle",
  hostScope: "creature" | "battle",
) {
  return errorContent(
    `Action scope ${tokenScope} does not match the current ${hostScope} host.`,
    "ACTION_SCOPE_MISMATCH",
  );
}

function executeBattleResolvedAction(
  actor: BattleActor,
  token: BattleResolvedActionToken,
) {
  const before = actor.getSnapshot();
  const resolution = resolveBattleAction(before.context, token);
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code);
  }

  const runtimeInputs = Effect.runSync(
    buildBattleRuntimeInputs(resolution, before.context),
  );
  const finalized = finalizeBattleResolution(
    resolution,
    runtimeInputs,
    before.context,
  );
  if (!finalized.ok) {
    return errorContent(finalized.error.message, finalized.error.code);
  }

  actor.send(finalized.event);

  const after = actor.getSnapshot();
  if (battleSnapshotUnchanged(before, after)) {
    return errorContent(
      "Action was not accepted by the battle machine",
      token.type,
    );
  }

  return jsonContent({
    success: true,
    outcome: finalized.outcome,
    state: encodeBattleRuntimeState(after),
  });
}

type SchemaAstNode = {
  readonly _tag: string;
  readonly types?: ReadonlyArray<SchemaAstNode>;
  readonly from?: SchemaAstNode;
  readonly propertySignatures?: ReadonlyArray<{
    readonly name: PropertyKey;
    readonly type: SchemaAstNode;
  }>;
  readonly literal?: unknown;
};

function addResolvedActionTypesFromAst(
  ast: SchemaAstNode,
  actionTypes: Set<string>,
): void {
  if (ast._tag === "Union" && ast.types) {
    for (const type of ast.types) {
      addResolvedActionTypesFromAst(type, actionTypes);
    }
    return;
  }

  if (ast._tag === "Transformation" && ast.from) {
    addResolvedActionTypesFromAst(ast.from, actionTypes);
    return;
  }

  if (ast._tag !== "TypeLiteral" || !ast.propertySignatures) {
    return;
  }

  for (const property of ast.propertySignatures) {
    if (property.name !== "type") continue;
    if (property.type._tag !== "Literal") continue;
    if (typeof property.type.literal !== "string") continue;
    actionTypes.add(property.type.literal);
  }
}

function resolvedActionTypesFromSchema(): ReadonlySet<string> {
  const actionTypes = new Set<string>();
  addResolvedActionTypesFromAst(
    ResolvedActionTokenSchema.ast as SchemaAstNode,
    actionTypes,
  );
  return actionTypes;
}

const RESOLVED_ACTION_TYPES = resolvedActionTypesFromSchema();

function unknownActionTypeContent(
  toolName: "execute_action" | "preview_action",
  type: unknown,
) {
  const messageType =
    typeof type === "string" ? type : type == null ? "(missing)" : String(type);
  return errorContent(`Unknown ${toolName} type: ${messageType}`, {
    code: "UNKNOWN_ACTION_TYPE",
    type: typeof type === "string" ? type : null,
  });
}

function decodeResolvedActionInput(
  toolName: "execute_action" | "preview_action",
  args: unknown,
) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return unknownActionTypeContent(toolName, null);
  }

  const type = Reflect.get(args, "type");
  if (typeof type !== "string") {
    return unknownActionTypeContent(toolName, type);
  }
  if (!RESOLVED_ACTION_TYPES.has(type)) {
    return unknownActionTypeContent(toolName, type);
  }

  const decoded = Schema.decodeUnknownEither(ResolvedActionTokenSchema)(args);
  if (decoded._tag === "Left") {
    return errorContent(`Invalid ${toolName} input`, String(decoded.left));
  }

  return decoded.right;
}

function executeResolvedAction(host: SupportedActionHost, args: unknown) {
  const decoded = decodeResolvedActionInput("execute_action", args);
  if ("isError" in decoded) {
    return decoded;
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) => {
      if (decoded.scope !== "creature") {
        return scopeMismatchContent(decoded.scope, "creature");
      }
      return executeCreatureResolvedAction(actor, decoded);
    }),
    Match.when({ scope: "battle" }, ({ actor }) => {
      if (decoded.scope !== "battle") {
        return scopeMismatchContent(decoded.scope, "battle");
      }
      return executeBattleResolvedAction(actor, decoded);
    }),
    Match.exhaustive,
  );
}

function previewResolvedAction(host: SupportedActionHost, args: unknown) {
  const decoded = decodeResolvedActionInput("preview_action", args);
  if ("isError" in decoded) {
    return decoded;
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) => {
      if (decoded.scope !== "creature") {
        return scopeMismatchContent(decoded.scope, "creature");
      }
      const snapshot = actor.getSnapshot();
      return jsonContent(
        previewAction(snapshot.context, snapshot.tags, decoded),
      );
    }),
    Match.when({ scope: "battle" }, ({ actor }) => {
      if (decoded.scope !== "battle") {
        return scopeMismatchContent(decoded.scope, "battle");
      }
      return jsonContent(
        previewBattleAction(actor.getSnapshot().context, decoded),
      );
    }),
    Match.exhaustive,
  );
}

export function handleToolCall(
  host: SupportedActionHost,
  name: string,
  args: unknown,
) {
  if (name === "get_state") {
    return Match.value(host).pipe(
      Match.when({ scope: "creature" }, ({ actor }) =>
        jsonContent(encodeDndContext(actor.getSnapshot().context)),
      ),
      Match.when({ scope: "battle" }, ({ actor }) =>
        jsonContent(encodeBattleRuntimeState(actor.getSnapshot())),
      ),
      Match.exhaustive,
    );
  }

  if (name === "get_available_actions") {
    return Match.value(host).pipe(
      Match.when({ scope: "creature" }, ({ actor }) => {
        const snapshot = actor.getSnapshot();
        return jsonContent(
          groupByCost(getAvailableActions(snapshot.context, snapshot.tags)),
        );
      }),
      Match.when({ scope: "battle" }, ({ actor }) =>
        jsonContent(
          groupByCost(getAvailableBattleActions(actor.getSnapshot().context)),
        ),
      ),
      Match.exhaustive,
    );
  }

  if (name === "execute_action") {
    return executeResolvedAction(host, args);
  }

  if (name === "preview_action") {
    return previewResolvedAction(host, args);
  }

  if (name === "execute_control_command") {
    return executeControlCommand(host, args);
  }

  if (name === "record_table_event") {
    return recordTableEvent(host, args);
  }

  return errorContent(`Unknown tool: ${name}`);
}
