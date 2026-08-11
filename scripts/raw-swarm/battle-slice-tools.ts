import { battleToolDefinitions } from "../../packages/mcp/src/battle-tools.ts";
import { contentToolDefinitions } from "../../packages/mcp/src/content-tools.ts";

export const canonicalBattleSliceToolDefinitions = [
  ...contentToolDefinitions,
  ...battleToolDefinitions,
];

// MCP outputSchema is optional. The handlers still encode and validate every
// structured result with the canonical Effect codecs; omitting only this
// repeated metadata keeps the Codex cold-client tools/list response bounded.
export const battleSliceToolDefinitions =
  canonicalBattleSliceToolDefinitions.map(
    ({ outputSchema: _validatedByHandler, ...definition }) => definition,
  );
