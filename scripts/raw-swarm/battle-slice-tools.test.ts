import { describe, expect, test } from "vitest";

import {
  battleSliceToolDefinitions,
  canonicalBattleSliceToolDefinitions,
} from "./battle-slice-tools.ts";

describe("RAW swarm battle-slice MCP contract", () => {
  test("keeps canonical inputs while bounding the cold-client tool list", () => {
    expect(battleSliceToolDefinitions).toHaveLength(11);
    expect(JSON.stringify(battleSliceToolDefinitions).length).toBeLessThan(
      16_384,
    );

    battleSliceToolDefinitions.forEach((definition, index) => {
      const canonical = canonicalBattleSliceToolDefinitions[index];
      expect(canonical).toBeDefined();
      expect(definition.name).toBe(canonical?.name);
      expect(definition.inputSchema).toBe(canonical?.inputSchema);
      expect(definition).not.toHaveProperty("outputSchema");
    });
  });
});
