import {
  discoverBattleActs,
  resolveBattleSubject,
  sameBattleSubject,
  snapshotBattle,
  type BattleResolutionResult,
  type BattleState,
} from "@dnd/battle-runtime";
import { Either } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  decodeDiscoverBattleActsArgs,
  decodeEndBattleArgs,
  decodeEndTurnArgs,
  decodeFillBattleHoleArgs,
  decodeReadBattleStateArgs,
  decodeResolveBattleActArgs,
  decodeSelectStatBlockArgs,
  discoverBattleActsInputSchema,
  endBattleInputSchema,
  endTurnInputSchema,
  fillBattleHoleInputSchema,
  readBattleStateInputSchema,
  resolveBattleActInputSchema,
  selectStatBlockInputSchema,
} from "./battle-tool-input.ts";
import { finalizeCharacterSessionsFromBattle } from "./battle-handoff.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import { battleStateProjection } from "./battle-state-projection.ts";
import { handleStartBattleToolCall } from "./start-battle-tool.ts";
import { startBattleInputSchema } from "./start-battle-tool-input.ts";
import type { BattleFillSession } from "./session-store.ts";
import {
  mcpOutputJsonSchema,
  schemaJsonContent,
  type ToolError,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

export const battleToolDefinitions = [
  {
    name: "select_stat_block",
    description:
      "Select an SRD Surface Stat Block for the battle session. This stores only the Stat Block id in the MCP session.",
    inputSchema: selectStatBlockInputSchema,
    outputSchema: mcpOutputJsonSchema(SelectStatBlockOutputSchema),
  },
  {
    name: "start_battle",
    description:
      "Start the battle session from finalized Character Builds and the selected SRD Stat Block. The caller must provide Initiative scores for every character combatant and the Stat Block combatant.",
    inputSchema: startBattleInputSchema,
    outputSchema: mcpOutputJsonSchema(StartBattleOutputSchema),
  },
  {
    name: "read_battle_state",
    description:
      "Return the stored battle state projection and current battle snapshot, including discoverable battle acts.",
    inputSchema: readBattleStateInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleSessionOutputSchema),
  },
  {
    name: "discover_battle_acts",
    description:
      "Return the current battle snapshot and available acts for the current combatant. Supported acts include character and Stat Block Attack subjects, Fighter 2 Action Surge, Wizard Magic-action spell acts, and End Turn.",
    inputSchema: discoverBattleActsInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleSessionOutputSchema),
  },
  {
    name: "fill_battle_hole",
    description:
      "Fill one hole for a selected battle act subject. MCP stores transient target, attack-roll, and damage-result fills until the battle runtime resolves the act.",
    inputSchema: fillBattleHoleInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: "resolve_battle_act",
    description:
      "Resolve a selected battle act subject that does not need holes, such as Action Surge.",
    inputSchema: resolveBattleActInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: "end_turn",
    description:
      "Resolve the current actor's End Turn runtime command and store the returned BattleState.",
    inputSchema: endTurnInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: "end_battle",
    description:
      "Finalize the stored battle session and hand character-owned post-battle facts, including current HP, back to durable character session state.",
    inputSchema: endBattleInputSchema,
    outputSchema: mcpOutputJsonSchema(EndBattleOutputSchema),
  },
] as const;

const BATTLE_TOOL_NAMES = battleToolDefinitions.map(
  (tool) => tool.name,
) satisfies ReadonlyArray<(typeof battleToolDefinitions)[number]["name"]>;
type BattleToolName = (typeof BATTLE_TOOL_NAMES)[number];

export type BattleToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isBattleToolName(name: string): name is BattleToolName {
  return battleToolDefinitions.some((tool) => tool.name === name);
}

export function handleBattleToolCall(
  root: McpCompositionRoot,
  name: string,
  args: unknown,
): BattleToolResult {
  if (!isBattleToolName(name)) {
    return errorContent(`Unknown Surface-runtime battle tool: ${name}`);
  }

  if (name === "select_stat_block") {
    const statBlockId = decodeSelectStatBlockArgs(args, name);
    if (Either.isLeft(statBlockId)) return statBlockId.left;
    try {
      const selected = root.sessionStore.selectStatBlock(statBlockId.right);
      return schemaJsonContent(SelectStatBlockOutputSchema, {
        selectedStatBlock: selected,
        session: root.sessionStore.snapshot(),
      });
    } catch (error) {
      return unknownStatBlockContent(statBlockId.right, error);
    }
  }

  if (name === "start_battle") {
    return handleStartBattleToolCall(root, args);
  }

  if (name === "read_battle_state") {
    const decoded = decodeReadBattleStateArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    return schemaJsonContent(
      BattleSessionOutputSchema,
      battleSessionPayload(root, root.sessionStore.battleState),
    );
  }

  if (name === "discover_battle_acts") {
    const decoded = decodeDiscoverBattleActsArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    return schemaJsonContent(
      BattleSessionOutputSchema,
      battleSessionPayload(root, root.sessionStore.battleState),
    );
  }

  if (name === "fill_battle_hole") {
    const decoded = decodeFillBattleHoleArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    const state = root.sessionStore.battleState;
    if (state == null) return noStoredBattleContent();

    const subject = decoded.right.subject;
    const previous = root.sessionStore.transientBattleFills;
    if (previous !== null && !sameBattleSubject(previous.subject, subject)) {
      return errorContent("A different battle subject has pending fills.", {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject: previous.subject,
        requestedSubject: subject,
      });
    }

    const fills = [...(previous?.fills ?? []), decoded.right.fill];
    const result = resolveBattleSubject({ state, subject, fills });
    if (result.tag === "resolved") {
      root.sessionStore.battleState = result.state;
      root.sessionStore.transientBattleFills = null;
      return schemaJsonContent(
        BattleResolutionOutputSchema,
        battleResolutionPayload(root, result),
      );
    }
    if (result.tag === "needsHoles") {
      root.sessionStore.transientBattleFills = { subject, fills };
      return schemaJsonContent(
        BattleResolutionOutputSchema,
        battleResolutionPayload(root, result),
      );
    }

    return schemaJsonContent(
      BattleResolutionOutputSchema,
      battleResolutionPayload(root, result),
    );
  }

  if (name === "resolve_battle_act") {
    const decoded = decodeResolveBattleActArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    const state = activeBattleWithoutPendingFills(
      root,
      "Cannot resolve another act with pending fills.",
    );
    if (Either.isLeft(state)) return state.left;
    const availableAct = discoverBattleActs(state.right).find((act) =>
      sameBattleSubject(act.subject, decoded.right.subject),
    );
    if (availableAct === undefined) {
      return errorContent("Battle act is not currently available.", {
        code: "BATTLE_ACT_NOT_AVAILABLE",
        subject: decoded.right.subject,
      });
    }
    if (availableAct.initialHoles.length > 0) {
      return errorContent("Battle act requires hole fills.", {
        code: "BATTLE_ACT_REQUIRES_HOLES",
        subject: decoded.right.subject,
      });
    }
    const result = resolveBattleSubject({
      state: state.right,
      subject: decoded.right.subject,
      fills: [],
    });
    if (result.tag === "resolved") {
      root.sessionStore.battleState = result.state;
    }
    return schemaJsonContent(
      BattleResolutionOutputSchema,
      battleResolutionPayload(root, result),
    );
  }

  if (name === "end_turn") {
    const decoded = decodeEndTurnArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    const state = activeBattleWithoutPendingFills(
      root,
      "Cannot end turn with pending battle fills.",
    );
    if (Either.isLeft(state)) return state.left;
    const result = resolveBattleSubject({
      state: state.right,
      subject: {
        tag: "runtimeCommand",
        actorId: decoded.right.actorId,
        command: "endTurn",
      },
      fills: [],
    });
    if (result.tag === "resolved") {
      root.sessionStore.battleState = result.state;
      root.sessionStore.transientBattleFills = null;
    }
    return schemaJsonContent(
      BattleResolutionOutputSchema,
      battleResolutionPayload(root, result),
    );
  }

  if (name === "end_battle") {
    const decoded = decodeEndBattleArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    const state = activeBattleWithoutPendingFills(
      root,
      "Cannot end battle with pending battle fills.",
    );
    if (Either.isLeft(state)) return state.left;

    const handoff = finalizeCharacterSessionsFromBattle(root, state.right);
    if (handoff !== null) return handoff;
    root.sessionStore.battleState = null;
    root.sessionStore.transientBattleFills = null;

    return schemaJsonContent(EndBattleOutputSchema, {
      endedBattleId: state.right.battleId,
      characters: Array.from(root.sessionStore.characters.entries()).map(
        ([sourceDraftId, session]) => ({
          sourceDraftId,
          session,
        }),
      ),
      session: root.sessionStore.snapshot(),
    });
  }

  const unhandledToolName: never = name;
  return errorContent(
    `Unhandled Surface-runtime battle tool: ${unhandledToolName}`,
  );
}

function unknownStatBlockContent(statBlockId: string, error: unknown) {
  return errorContent(`Unknown Stat Block: ${statBlockId}`, {
    code: "UNKNOWN_STAT_BLOCK",
    statBlockId,
    message: error instanceof Error ? error.message : String(error),
  });
}

function battleSessionPayload(
  root: McpCompositionRoot,
  state: BattleState | null,
) {
  return {
    battleState: state === null ? null : battleStateProjection(state),
    snapshot: state === null ? null : snapshotBattle(state),
    session: root.sessionStore.snapshot(),
  };
}

function battleResolutionPayload(
  root: McpCompositionRoot,
  result: BattleResolutionResult,
) {
  return {
    result: battleResolutionResultPayload(result),
    battleState:
      result.tag === "resolved" ? battleStateProjection(result.state) : null,
    snapshot: result.snapshot,
    session: root.sessionStore.snapshot(),
  };
}

function battleResolutionResultPayload(result: BattleResolutionResult) {
  if (result.tag === "resolved") {
    return {
      tag: result.tag,
      snapshot: result.snapshot,
    };
  }

  return result;
}

function noStoredBattleContent() {
  return errorContent("No battle session has been started.", {
    code: "NO_BATTLE_SESSION",
  });
}

function activeBattleWithoutPendingFills(
  root: McpCompositionRoot,
  pendingMessage: string,
): Either.Either<BattleState, ToolError> {
  const state = root.sessionStore.battleState;
  if (state == null) return Either.left(noStoredBattleContent());
  const pendingFills = root.sessionStore.transientBattleFills;
  return pendingFills === null
    ? Either.right(state)
    : Either.left(pendingBattleFillsContent(pendingFills, pendingMessage));
}

function pendingBattleFillsContent(
  pendingFills: BattleFillSession,
  message: string,
) {
  return errorContent(message, {
    code: "BATTLE_FILLS_PENDING",
    pendingSubject: pendingFills.subject,
  });
}
