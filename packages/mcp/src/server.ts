import { Effect, JSONSchema, Match } from "effect";

import { encodeDndContext } from "@dnd/core/context-encoding.ts";
import {
  EXPOSED_ACTION_TYPES,
  finalizeBattleResolution,
  finalizeResolution,
  getAvailableActions,
  getAvailableBattleActions,
  previewAction,
  previewBattleAction,
  ControlCommandSchema,
  resolveAuthoredBattleAction,
  resolveBattleAction,
  resolveAction,
  ResolvedActionTokenSchema,
  type AuthoredBattleResolvedActionToken,
  type ActionToken,
  type BattleResolvedActionToken,
  type ResolvedActionToken,
  type ResourceCost,
  TableEventCommandSchema,
} from "@dnd/core/available-actions.ts";

import { decodeResolvedActionInput } from "./server-action-decode.ts";

import {
  createBattleHost,
  createDemoHost,
  type BattleActionHost,
  type CreatureActionHost,
} from "./host-factories.ts";
import { characterToolDefinitions } from "./character-session.ts";
import { executeControlCommand } from "./server-control.ts";
import {
  buildBattleRuntimeInputs,
  buildRuntimeInputs,
  decodeProjectedPreparedSpellRuntimeInputs,
} from "./server-runtime.ts";
import {
  decodeBattleAttackRuntimeInputs,
  decodeBattleGrappleRuntimeInputs,
  decodeBattleMoveRuntimeInputs,
  decodeBattleSaveSpellRuntimeInputs,
  RUNTIME_SCHEMAS_BY_TAG,
} from "./server-battle-attack-runtime.ts";
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
import { StartBattleInputSchema } from "./start-battle.ts";
import { recordTableEvent } from "./server-table-events.ts";

export type { BattleActor, DndActor, SupportedActionHost };
export {
  createBattleHost,
  createDemoHost,
  type BattleActionHost,
  type CreatureActionHost,
};

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

export const startBattleJsonSchema = JSONSchema.make(
  StartBattleInputSchema,
) as unknown as McpObjectInputSchema;

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
  ...characterToolDefinitions,
  {
    name: "start_battle",
    description:
      "Start a battle by projecting a participant roster into an initial BATTLE_INIT batch. Participants can come from the active Fighter host, the stored Fighter sheet, monster stat blocks, or basic raw PC/Monster configs. This promotes already-authored or boundary-provided creatures into battle participation; it does not handle mid-fight roster changes.",
    inputSchema: startBattleJsonSchema,
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
      "Execute a narrow session, turn, rest, or monster-control command. Supported battle turn commands require explicit runtime facts; MCP does not invent hidden start/end-turn inputs. Battle lifecycle commands control which already-authored creatures participate in battle; they do not create creatures from nothing. This surface does not mirror lifecycle flows already kept on execute_action, including SHORT_REST.",
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
  args: unknown,
) {
  const before = actor.getSnapshot();
  const resolution = resolveAction(before.context, before.tags, token);
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code);
  }

  const runtimeInputs =
    resolution.runtime === "projectedPreparedSpell"
      ? decodeProjectedPreparedSpellRuntimeInputs(args, "CAST_PREPARED_SPELL")
      : Effect.runSync(buildRuntimeInputs(resolution, before.context));
  if ("code" in runtimeInputs) {
    return errorContent(runtimeInputs.message, runtimeInputs.code);
  }
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
  tokenScope: ResolvedActionToken["scope"],
  hostScope: "creature" | "battle",
) {
  return errorContent(
    `Action scope ${tokenScope} does not match the current ${hostScope} host.`,
    "ACTION_SCOPE_MISMATCH",
  );
}

function isBattleHostActionToken(
  token: ResolvedActionToken,
): token is BattleResolvedActionToken | AuthoredBattleResolvedActionToken {
  return token.scope === "battle" || token.scope === "authoredBattle";
}

function executeBattleResolvedAction(
  actor: BattleActor,
  token: BattleResolvedActionToken | AuthoredBattleResolvedActionToken,
  args: unknown,
) {
  const before = actor.getSnapshot();
  const resolution =
    token.scope === "authoredBattle"
      ? resolveAuthoredBattleAction(before.context, token)
      : resolveBattleAction(before.context, token);
  if ("code" in resolution) {
    return errorContent(resolution.message, resolution.code);
  }

  const runtimeInputs =
    resolution.runtime === "battleAttack"
      ? decodeBattleAttackRuntimeInputs(args, before.context, resolution.token)
      : resolution.runtime === "battleGrapple"
        ? decodeBattleGrappleRuntimeInputs(args, resolution.token)
        : resolution.runtime === "battleMove"
          ? decodeBattleMoveRuntimeInputs(args, resolution.token)
          : resolution.runtime === "battleSaveSpell"
            ? decodeBattleSaveSpellRuntimeInputs(args, resolution.token)
            : Effect.runSync(
                buildBattleRuntimeInputs(resolution, before.context),
              );
  if ("code" in runtimeInputs) {
    return errorContent(runtimeInputs.message, runtimeInputs.code);
  }
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
  const decoded = decodeResolvedActionInput("execute_action", args);
  if ("isError" in decoded) {
    return decoded;
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) => {
      if (decoded.scope !== "creature") {
        return scopeMismatchContent(decoded.scope, "creature");
      }
      return executeCreatureResolvedAction(actor, decoded, args);
    }),
    Match.when({ scope: "battle" }, ({ actor }) => {
      if (!isBattleHostActionToken(decoded)) {
        return scopeMismatchContent(decoded.scope, "battle");
      }
      return executeBattleResolvedAction(actor, decoded, args);
    }),
    Match.exhaustive,
  );
}

type BattlePreview = ReturnType<typeof previewBattleAction>;

function annotateBattlePreviewWithRuntimeSchema(preview: BattlePreview) {
  if (!preview.ok) return preview;
  if (
    preview.runtime !== "battleAttack" &&
    preview.runtime !== "battleGrapple" &&
    preview.runtime !== "battleMove" &&
    preview.runtime !== "battleSaveSpell"
  ) {
    return preview;
  }
  return {
    ...preview,
    runtimeSchema: RUNTIME_SCHEMAS_BY_TAG[preview.runtime],
  };
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
      if (!isBattleHostActionToken(decoded)) {
        return scopeMismatchContent(decoded.scope, "battle");
      }
      return jsonContent(
        annotateBattlePreviewWithRuntimeSchema(
          previewBattleAction(actor.getSnapshot().context, decoded),
        ),
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
