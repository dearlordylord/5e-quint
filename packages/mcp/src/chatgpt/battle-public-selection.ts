import { Result } from "effect";
import type { McpPlaySessionRoot } from "../composition-root.ts";
import type { PlaySessionId } from "../play-session.ts";
import { type ToolError } from "../schema-codec.ts";
import { decodeToolArgs } from "../schema-codec.ts";
import { errorContent } from "../tool-content.ts";
import { battleActSelections } from "./battle-act-selection.ts";
import {
  ChatGptBattlePublicArgsSchema,
  ChatGptBattleExecutionArgsSchema,
  type ChatGptBattleExecutionArgs,
} from "./battle-execution-schema.ts";
import { chatGptBattleSubjectExposure } from "./battle-operation-routing.ts";
import type { ChatGptBattleOperationToolName } from "./protocol-operation.ts";

export function resolvePublicBattleSelection(
  root: McpPlaySessionRoot,
  playSessionId: PlaySessionId,
  name: ChatGptBattleOperationToolName,
  input: unknown,
): Result.Result<ChatGptBattleExecutionArgs, ToolError> {
  const decoded = decodeToolArgs(ChatGptBattlePublicArgsSchema, input, name);
  if (Result.isFailure(decoded)) return Result.fail(decoded.failure);
  const args = decoded.success;
  if ("fill" in args) return Result.succeed(args);
  const battle = root.sessionStore.battleState;
  if (battle.tag !== "activeBattle")
    return Result.fail(
      errorContent("This operation requires an active Battle.", {
        code: "NO_ACTIVE_BATTLE",
      }),
    );
  const selection = battleActSelections(root, playSessionId).find(
    (candidate) => candidate.actKey === args.actKey,
  );
  if (selection === undefined)
    return Result.fail(
      errorContent(
        "The Act key is not offered by this Play Session's current frontier. Rediscover available Acts.",
        { code: "BATTLE_ACT_KEY_NOT_AVAILABLE" },
      ),
    );
  const route = chatGptBattleSubjectExposure(
    battle.session.state,
    selection.subject,
  );
  if (Result.isFailure(route)) return Result.fail(route.failure);
  if (!route.success.tools.some((tool) => tool === name))
    return Result.fail(
      errorContent("The selected Act belongs to another named ChatGPT tool.", {
        code: "CHATGPT_TOOL_OPERATION_MISMATCH",
        requestedTool: name,
        allowedTools: route.success.tools,
      }),
    );
  return decodeToolArgs(
    ChatGptBattleExecutionArgsSchema,
    {
      subject: selection.subject,
      ...(args.reactionSpellTargetFacts === undefined
        ? {}
        : {
            reactionSpellTargetFacts: args.reactionSpellTargetFacts,
          }),
    },
    name,
  );
}
