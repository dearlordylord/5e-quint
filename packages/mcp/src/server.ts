import { Effect, JSONSchema, Match, Schema } from "effect";
import { createActor, type ActorRefFrom } from "xstate";

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
  type TableEventCommand,
} from "@dnd/core/available-actions.ts";
import { classLevel } from "@dnd/core/types.ts";

import { executeControlCommand } from "./server-control.ts";
import {
  buildBattleRuntimeInputs,
  buildRuntimeInputs,
} from "./server-runtime.ts";
import {
  battleSnapshotUnchanged,
  encodeBattleRuntimeState,
  errorContent,
  jsonContent,
  snapshotFingerprint,
} from "./server-shared.ts";

export const DEMO_ACTOR_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};
const DEMO_STARTING_DAMAGE = 10;

export type DndActor = ActorRefFrom<typeof creatureMachine>;
export type BattleActor = ActorRefFrom<typeof battleMachine>;
export type CreatureActionHost = {
  readonly scope: "creature";
  readonly actor: DndActor;
};
export type BattleActionHost = {
  readonly scope: "battle";
  readonly actor: BattleActor;
};
export type SupportedActionHost = CreatureActionHost | BattleActionHost;

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
    if (cost.action) groups.action.push(token);
    else if (cost.bonusAction) groups.bonusAction.push(token);
    else if (cost.reaction) groups.reaction.push(token);
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
const strictCommandParseOptions = { onExcessProperty: "error" } as const;

export const toolDefinitions = [
  {
    name: "get_state",
    description: "Returns the current creature or battle host state as JSON.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_available_actions",
    description: `Returns available scoped action tokens grouped by action economy cost. Creature scope exposes: ${EXPOSED_ACTION_TYPES.join(", ")}. Battle scope exposes the currently owned battle actions and interrupt reactions for the live battle window.`,
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "execute_action",
    description:
      "Execute a resolved scoped action token. User-facing choices must already be filled; MCP supplies engine-only values like prerolls.",
    inputSchema: executeActionJsonSchema,
  },
  {
    name: "preview_action",
    description:
      "Preview a resolved scoped action token without spending resources or mutating state.",
    inputSchema: executeActionJsonSchema,
  },
  {
    name: "execute_control_command",
    description:
      "Execute a narrow session, turn, rest, or monster-control command. Supported battle turn commands require explicit runtime facts; MCP does not invent hidden start/end-turn inputs.",
    inputSchema: executeControlCommandJsonSchema,
  },
  {
    name: "record_table_event",
    description:
      "Record a narrow DM/table/world fact. The initial surface validates event shape but reports unsupported events until warning-aware table events are wired.",
    inputSchema: recordTableEventJsonSchema,
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

function unsupportedTableEventContent(command: TableEventCommand) {
  return errorContent("Table event is not implemented yet", {
    code: "TABLE_EVENT_NOT_IMPLEMENTED",
    command,
  });
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

function executeResolvedAction(host: SupportedActionHost, args: unknown) {
  const decoded = Schema.decodeUnknownEither(ResolvedActionTokenSchema)(args);
  if (decoded._tag === "Left") {
    return errorContent("Invalid execute_action input", String(decoded.left));
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) => {
      if (decoded.right.scope !== "creature") {
        return scopeMismatchContent(decoded.right.scope, "creature");
      }
      return executeCreatureResolvedAction(actor, decoded.right);
    }),
    Match.when({ scope: "battle" }, ({ actor }) => {
      if (decoded.right.scope !== "battle") {
        return scopeMismatchContent(decoded.right.scope, "battle");
      }
      return executeBattleResolvedAction(actor, decoded.right);
    }),
    Match.exhaustive,
  );
}

function previewResolvedAction(host: SupportedActionHost, args: unknown) {
  const decoded = Schema.decodeUnknownEither(ResolvedActionTokenSchema)(args);
  if (decoded._tag === "Left") {
    return errorContent("Invalid preview_action input", String(decoded.left));
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) => {
      if (decoded.right.scope !== "creature") {
        return scopeMismatchContent(decoded.right.scope, "creature");
      }
      const snapshot = actor.getSnapshot();
      return jsonContent(
        previewAction(snapshot.context, snapshot.tags, decoded.right),
      );
    }),
    Match.when({ scope: "battle" }, ({ actor }) => {
      if (decoded.right.scope !== "battle") {
        return scopeMismatchContent(decoded.right.scope, "battle");
      }
      return jsonContent(
        previewBattleAction(actor.getSnapshot().context, decoded.right),
      );
    }),
    Match.exhaustive,
  );
}

function recordTableEvent(host: SupportedActionHost, args: unknown) {
  const decoded = Schema.decodeUnknownEither(
    TableEventCommandSchema,
    strictCommandParseOptions,
  )(args);
  if (decoded._tag === "Left") {
    return errorContent(
      "Invalid record_table_event input",
      String(decoded.left),
    );
  }

  if (decoded.right.scope !== host.scope) {
    return errorContent(
      `Table event scope ${decoded.right.scope} does not match the current ${host.scope} host.`,
      "TABLE_EVENT_SCOPE_MISMATCH",
    );
  }

  return unsupportedTableEventContent(decoded.right);
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
