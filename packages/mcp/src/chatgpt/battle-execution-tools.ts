import type { ChatGptBattleOperationToolName } from "./protocol-operation.ts";
import type { ProtocolToolDefinition } from "../tool-definition-contract.ts";
import {
  battlePendingTransactionViewForSession,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Match, Result } from "effect";
import type { McpPlaySessionRoot } from "../composition-root.ts";
import { battleToolNames } from "../battle-tool-input.ts";
import {
  handleBattleToolCall,
  handleResolveBattleActToolCall,
} from "../battle-tools.ts";
import { decodeToolArgs } from "../schema-codec.ts";
import { errorContent } from "../tool-content.ts";
import { DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS } from "../tool-definition-contract.ts";
import {
  CHATGPT_TOOL_PLAN,
  type ChatGptToolName,
} from "./operation-tool-plan.ts";
import {
  chatGptBattleSubjectExposure,
  chatGptInterruptDecisionExposure,
} from "./battle-operation-routing.ts";
import {
  ChatGptBattleExecutionArgsSchema,
  chatGptBattleExecutionInputSchema,
  type ChatGptBattleExecutionArgs,
} from "./battle-execution-schema.ts";
import type { ChatGptExecutionTool } from "./stateful-tool.ts";

function battleOperationInstructions(name: ChatGptBattleOperationToolName) {
  return Match.value(CHATGPT_TOOL_PLAN[name].family).pipe(
    Match.when(
      "reactions",
      () =>
        "Select the current interruptDecision with choice.fills: [] and no subject. The pending transaction owns the parent. Answer subsequent ordinary holes through answer_battle_hole; select nested Reactions through their own named tools.",
    ),
    Match.whenOr(
      "battleActions",
      "spells",
      "features",
      "events",
      "companions",
      () =>
        "Select an Act by copying its current subject, without fill. The operation opens any initial holes; answer ordinary holes through answer_battle_hole. To select a Reaction, supply only its interruptDecision fill with choice.fills: [], without a subject. The pending transaction owns the parent.",
    ),
    Match.exhaustive,
  );
}

export function defineChatGptBattleTool<
  const Name extends ChatGptBattleOperationToolName,
>(
  name: Name,
): ChatGptExecutionTool & {
  readonly definition: ProtocolToolDefinition & { readonly name: Name };
} {
  return {
    definition: {
      name,
      title: name.replaceAll("_", " "),
      description: `${CHATGPT_TOOL_PLAN[name].description} ${battleOperationInstructions(name)}`,
      inputSchema: chatGptBattleExecutionInputSchema(name),
      annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    },
    handle(root: McpPlaySessionRoot, input: unknown) {
      const decoded = decodeToolArgs(
        ChatGptBattleExecutionArgsSchema,
        input,
        name,
      );
      return Result.isFailure(decoded)
        ? decoded.failure
        : executeChatGptBattleTool(root, name, decoded.success);
    },
  };
}

function executeChatGptBattleTool(
  root: McpPlaySessionRoot,
  name: ChatGptBattleOperationToolName,
  args: ChatGptBattleExecutionArgs,
) {
  const battle = root.sessionStore.battleState;
  if (battle.tag !== "activeBattle")
    return errorContent("This operation requires an active Battle.", {
      code: "NO_ACTIVE_BATTLE",
    });
  if (!("fill" in args)) {
    const route = chatGptBattleSubjectExposure(
      battle.session.state,
      args.subject,
    );
    if (Result.isFailure(route)) return route.failure;
    if (!route.success.tools.some((tool) => tool === name))
      return operationMismatch(name, route.success.tools);
    return handleResolveBattleActToolCall(
      root,
      {
        subject: args.subject,
        reactionSpellTargetFacts: args.reactionSpellTargetFacts ?? [],
      },
      "chatgpt",
    );
  }
  return executeChatGptReactionSelection(root, name, args, battle.session);
}

function executeChatGptReactionSelection(
  root: McpPlaySessionRoot,
  name: ChatGptBattleOperationToolName,
  args: Extract<ChatGptBattleExecutionArgs, { readonly fill: object }>,
  session: BattleRuntimeSession,
) {
  const transaction = root.sessionStore.getPendingBattleTransaction();
  if (transaction === null)
    return errorContent(
      "A Reaction requires the current pending Battle transaction.",
      { code: "BATTLE_CONTINUATION_REQUIRED" },
    );
  const pending = battlePendingTransactionViewForSession(transaction, session);
  if (pending.tag !== "valid")
    return errorContent(
      "The pending Battle transaction does not belong to this session.",
      { code: "BATTLE_TRANSACTION_DEFECT", issue: pending },
    );
  if (pending.view.frontier.kind !== "interruptDecision")
    return errorContent(
      "A Reaction requires the current interrupt decision frontier.",
      { code: "BATTLE_REACTION_DECISION_REQUIRED" },
    );
  const route = chatGptInterruptDecisionExposure(
    session.state,
    pending.view.subject,
    args.fill.value,
  );
  if (Result.isFailure(route)) return route.failure;
  if (!route.success.tools.some((tool) => tool === name))
    return operationMismatch(name, route.success.tools);
  return handleBattleToolCall(root, {
    name: battleToolNames.fillBattleHole,
    args: { subject: pending.view.subject, fill: args.fill },
  });
}
function operationMismatch(
  name: ChatGptBattleOperationToolName,
  tools: readonly ChatGptToolName[],
) {
  return errorContent(
    "The selected operation belongs to another named ChatGPT tool.",
    {
      code: "CHATGPT_TOOL_OPERATION_MISMATCH",
      requestedTool: name,
      allowedTools: tools,
    },
  );
}
