import { battlePendingTransactionViewForSession } from "@dnd/battle-runtime";
import { Result } from "effect";
import { handleFillBattleHoleToolCall } from "../battle-tool-transaction.ts";
import { decodeToolArgs } from "../schema-codec.ts";
import { errorContent } from "../tool-content.ts";
import { DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS } from "../tool-definition-contract.ts";
import {
  ChatGptBattleHoleArgsSchema,
  chatGptBattleHoleInputSchema,
} from "./battle-execution-schema.ts";
import { CHATGPT_TOOL_PLAN } from "./operation-tool-plan.ts";
import type { ChatGptExecutionTool } from "./stateful-tool.ts";

export const chatGptBattleHoleTool = {
  definition: {
    name: "answer_battle_hole",
    title: "Answer Battle hole",
    description: CHATGPT_TOOL_PLAN.answer_battle_hole.description,
    inputSchema: chatGptBattleHoleInputSchema(),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  },
  handle(root, input) {
    const decoded = decodeToolArgs(
      ChatGptBattleHoleArgsSchema,
      input,
      "answer_battle_hole",
    );
    if (Result.isFailure(decoded)) return decoded.failure;
    const battle = root.sessionStore.battleState;
    if (battle.tag !== "activeBattle")
      return errorContent("This operation requires an active Battle.", {
        code: "NO_ACTIVE_BATTLE",
      });
    const transaction = root.sessionStore.getPendingBattleTransaction();
    if (transaction === null)
      return errorContent(
        "Select a named Battle operation before answering a hole.",
        { code: "BATTLE_CONTINUATION_REQUIRED" },
      );
    const pending = battlePendingTransactionViewForSession(
      transaction,
      battle.session,
    );
    if (pending.tag !== "valid")
      return errorContent(
        "The pending Battle transaction does not belong to this session.",
        { code: "BATTLE_TRANSACTION_DEFECT", issue: pending },
      );
    if (pending.view.frontier.kind !== "ordinaryHoles")
      return errorContent(
        "Select the current Reaction through its named operation tool.",
        { code: "BATTLE_ORDINARY_HOLE_REQUIRED" },
      );
    return handleFillBattleHoleToolCall(root, {
      subject: pending.view.subject,
      fill: decoded.success.fill,
    });
  },
} as const satisfies ChatGptExecutionTool;
