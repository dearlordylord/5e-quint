import { Schema } from "effect";
import { PlaySessionIdSchema } from "../src/play-session.ts";
import type { McpPlaySessionRoot } from "../src/composition-root.ts";
import { chatGptBattleGuidance as ownedGuidance } from "../src/chatgpt/battle-guidance.ts";
export { battleMovementInputGuidance } from "../src/chatgpt/battle-guidance.ts";
export const guidancePlaySessionId = Schema.decodeUnknownSync(
  PlaySessionIdSchema,
)("play-session:00000000-0000-4000-8000-000000000001");
export function chatGptBattleGuidance(root: McpPlaySessionRoot) {
  return ownedGuidance(root, guidancePlaySessionId);
}
