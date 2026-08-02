import { NonNegativeInteger, resourceCount } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterBattleResourceUsage,
  spendCharacterPointPoolResource,
  spendCharacterResourceUse,
  type CharacterBattlePointPoolResourceState,
  type CharacterBattleUseCountResourceState,
} from "./character-battle-resource-execution.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "./identity.ts";

const resourcePoolRef = battleResourcePoolExecutionRef(
  battleCharacterExecutionScopeRef(
    battleId("synthetic-resource-execution-test"),
    combatantId("synthetic-resource-owner"),
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);

const limitedResource = {
  resourcePoolRef,
  resource: {
    kind: "use_count",
    cap: { kind: "fixed", uses: 1 },
  },
  usesRemaining: resourceCount(1),
  usedThisTurn: false,
} satisfies CharacterBattleUseCountResourceState;

const unlimitedResource = {
  resourcePoolRef,
  resource: {
    kind: "use_count",
    cap: { kind: "unlimited" },
  },
  usedThisTurn: false,
} satisfies CharacterBattleUseCountResourceState;

const pointPoolResource = {
  resourcePoolRef,
  resource: {
    kind: "point_pool",
    poolId: "synthetic_points",
    cap: { kind: "fixed", uses: 4 },
  },
  pointsRemaining: resourceCount(4),
} satisfies CharacterBattlePointPoolResourceState;

describe("character battle resource execution", () => {
  test("spends only positive affordable point-pool costs", () => {
    expect(
      spendCharacterPointPoolResource({
        resource: limitedResource,
        points: resourceCount(1),
      }),
    ).toEqual(
      Either.left({
        tag: "characterBattlePointPoolSpendIssue",
        message: "Only point-pool character battle resources can spend points.",
      }),
    );
    expect(
      spendCharacterPointPoolResource({
        resource: pointPoolResource,
        points: resourceCount(0),
      }),
    ).toEqual(
      Either.left({
        tag: "characterBattlePointPoolSpendIssue",
        message: "Point-pool spending requires a positive point cost.",
      }),
    );
    expect(
      spendCharacterPointPoolResource({
        resource: pointPoolResource,
        points: resourceCount(5),
      }),
    ).toEqual(
      Either.left({
        tag: "characterBattlePointPoolSpendIssue",
        message: "Point-pool resource has insufficient remaining points.",
      }),
    );
    expect(
      spendCharacterPointPoolResource({
        resource: pointPoolResource,
        points: resourceCount(2),
      }),
    ).toEqual(
      Either.right({
        ...pointPoolResource,
        pointsRemaining: resourceCount(2),
      }),
    );
  });

  test("spends limited uses while preserving explicitly unlimited resources", () => {
    expect(characterBattleResourceUsage(limitedResource)).toBe("limited");
    expect(characterBattleResourceUsage(unlimitedResource)).toBe("unlimited");
    expect(characterBattleResourceUsage(pointPoolResource)).toBe("pointPool");
    expect(spendCharacterResourceUse(limitedResource)).toEqual({
      ...limitedResource,
      usesRemaining: resourceCount(0),
    });
    expect(spendCharacterResourceUse(unlimitedResource)).toBe(
      unlimitedResource,
    );
  });
});
