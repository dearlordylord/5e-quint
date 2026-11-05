import { Match } from "effect";
import { battleToolNames } from "../battle-tool-input.ts";
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
  const battleTools = chatGptBattleGuidanceTools(battle);
  const general = [...new Set([...mapped, ...battleTools])];
  const continuation = [
    ...new Set([...battleTools, battleToolNames.readBattleState]),
  ];
  return Match.value(battle).pipe(
    Match.when({ kind: "noBattle" }, () => general),
    Match.when({ kind: "initialInitiativeSetup" }, () => general),
    Match.when({ kind: "acts" }, () => general),
    Match.when({ kind: "ordinaryContinuation" }, () => continuation),
    Match.when({ kind: "reactionDecision" }, () => continuation),
    Match.exhaustive,
  );
}
