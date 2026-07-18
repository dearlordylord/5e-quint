import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { decodeStartBattleArgs } from "./start-battle-tool-input.ts";

describe("start battle tool input", () => {
  test("decodes a battle roster without encounter-wide relationship partitions", () => {
    const decoded = decodeStartBattleArgs({
      battleId: "battle-with-rule-local-relationships",
      initialCombatants: [
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin",
          combatantId: "goblin-a",
          initiative: 14,
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    });

    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isLeft(decoded)) return;
    expect(decoded.right.initialCombatants[0]).not.toHaveProperty("side");
  });
});
