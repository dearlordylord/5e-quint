import type { PlaySessionNextOperationName } from "../play-session-tool-names.ts";
import {
  CHATGPT_OPERATION_EXPOSURE,
  type ChatGptToolName,
} from "./operation-tool-plan.ts";
import { chatGptToolsForExposure } from "./exposure-tools.ts";
import {
  chatGptBattleGuidanceTools,
  type ChatGptBattleGuidance,
} from "./battle-guidance.ts";

export function chatGptNextOperations(
  operations: readonly PlaySessionNextOperationName[],
  battle: ChatGptBattleGuidance,
): readonly ChatGptToolName[] {
  const mapped = operations.flatMap((operation) =>
    chatGptToolsForExposure(CHATGPT_OPERATION_EXPOSURE.publicTools[operation]),
  );
  return [...new Set([...mapped, ...chatGptBattleGuidanceTools(battle)])];
}
