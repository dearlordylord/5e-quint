import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { decodeStartBattleArgs } from "./start-battle-tool-input.ts";

describe("start battle tool input", () => {
  test("requires explicit Initiative mode and companion admissions", () => {
    expect(
      Either.isLeft(
        decodeStartBattleArgs({
          battleId: "battle-with-implicit-empty-state",
          initialCombatants: [
            {
              kind: "statBlock",
              statBlockId: "stat_block_goblin",
              combatantId: "goblin-a",
              initiative: 14,
              ammunitionStocks: [],
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  test("rejects omitted ammunition stock instead of treating it as empty", () => {
    const decoded = decodeStartBattleArgs({
      battleId: "battle-with-omitted-ammunition",
      initiativeMode: "direct",
      companionAdmissions: [],
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

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("decodes a battle roster without encounter-wide relationship partitions", () => {
    const decoded = decodeStartBattleArgs({
      battleId: "battle-with-rule-local-relationships",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin",
          combatantId: "goblin-a",
          initiative: 14,
          ammunitionStocks: [],
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    });

    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isLeft(decoded)) return;
    expect(decoded.right.initialCombatants[0]).not.toHaveProperty("side");
  });

  test.each([
    [
      "character session",
      {
        kind: "characterSession",
        characterId: "character-a",
        combatantId: "character-combatant-a",
        initiative: 16,
        ammunitionStocks: [],
        side: "party",
      },
    ],
    [
      "Stat Block",
      {
        kind: "statBlock",
        statBlockId: "stat_block_goblin",
        combatantId: "goblin-a",
        initiative: 14,
        ammunitionStocks: [],
        admissionSource: { kind: "encounterParticipant" },
        side: "opposition",
      },
    ],
  ] as const)("rejects legacy side on the %s branch", (_label, combatant) => {
    const decoded = decodeStartBattleArgs({
      battleId: "battle-without-global-relationships",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [combatant],
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });
});
