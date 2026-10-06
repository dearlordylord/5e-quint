import { CHATGPT_CONTEXT_TOOLS } from "./context-tool-plans.ts";
import { CHATGPT_CHARACTER_TOOLS } from "./character-tool-plans.ts";
import { CHATGPT_BATTLE_TOOLS } from "./battle-tool-plans.ts";
import { CHATGPT_MAGIC_TOOLS } from "./magic-tool-plans.ts";

const TOOL_PLAN_PARTS = {
  context: CHATGPT_CONTEXT_TOOLS,
  character: CHATGPT_CHARACTER_TOOLS,
  battle: CHATGPT_BATTLE_TOOLS,
  magic: CHATGPT_MAGIC_TOOLS,
} as const;
type ToolPlanParts = typeof TOOL_PLAN_PARTS;
type KeysOfUnion<T> = T extends object ? keyof T : never;
type OverlappingToolNames = {
  [Part in keyof ToolPlanParts]: keyof ToolPlanParts[Part] &
    KeysOfUnion<ToolPlanParts[Exclude<keyof ToolPlanParts, Part>]>;
}[keyof ToolPlanParts];

// A name has one descriptor owner; spreads must never overwrite another part.
export const CHATGPT_TOOL_PLAN = {
  ...TOOL_PLAN_PARTS.context,
  ...TOOL_PLAN_PARTS.character,
  ...TOOL_PLAN_PARTS.battle,
  ...TOOL_PLAN_PARTS.magic,
} as const satisfies [OverlappingToolNames] extends [never]
  ? object
  : Readonly<Record<OverlappingToolNames, never>>;
export type ChatGptToolName = keyof typeof CHATGPT_TOOL_PLAN;
export type ChatGptToolFamily =
  (typeof CHATGPT_TOOL_PLAN)[ChatGptToolName]["family"];
