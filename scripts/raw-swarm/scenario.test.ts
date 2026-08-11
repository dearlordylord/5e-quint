import { describe, expect, test } from "vitest";
import { Either } from "effect";

import { parseScenario } from "./scenario.ts";

describe("RAW swarm scenario boundary", () => {
  test("rejects an empty battle roster", () => {
    const result = parseScenario({
      id: "probe",
      kind: "scripted-probe",
      rawCitations: [],
      setup: { battleId: "battle", participants: [] },
      script: [],
      expectations: [],
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects impossible natural d20 results", () => {
    const result = parseScenario({
      id: "probe",
      kind: "scripted-probe",
      rawCitations: [],
      setup: {
        battleId: "battle",
        participants: [
          { combatantId: "one", statBlockId: "stat_block_one", initiative: 1 },
        ],
      },
      script: [
        {
          kind: "meleeAttackHit",
          actor: "one",
          actSelector: { labelContains: "Attack", subjectKind: "attack" },
          resolution: {
            targetChoice: "two",
            attackRoll: 25,
            attackNaturalD20: 21,
            damage: {
              kind: "retainsPositiveHitPoints",
              rolledDice: [[1]],
            },
          },
          then: "continue",
        },
      ],
      expectations: [],
    });

    expect(Either.isLeft(result)).toBe(true);
  });
});
