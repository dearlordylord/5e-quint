import { describe, expect, test } from "vitest";

import {
  battleProcedureExecutionRefForTest,
  fighterId,
} from "../battle-runtime.test-support.ts";
import type {
  BattleAttackDamageEvent,
  BattlePendingAttackDamageReduction,
} from "../battle-state-execution.ts";
import { attackDamageEventAfterPendingReduction } from "./attack-damage-events.ts";

describe("attack damage events", () => {
  test("applies a pending reduction to aggregate damage", () => {
    const event = {
      kind: "aggregateDamage",
      damageByTypeBeforeTargetAdjustments: [
        { damageType: "slashing", amount: 10 },
      ],
    } satisfies BattleAttackDamageEvent;
    const reduction = {
      reactorId: fighterId,
      procedureRef: battleProcedureExecutionRefForTest(
        "synthetic-aggregate-damage-reduction",
      ),
      reduction: { kind: "halfDamage" },
      reductionAmount: 5,
    } satisfies BattlePendingAttackDamageReduction;

    expect(attackDamageEventAfterPendingReduction(event, reduction)).toEqual({
      kind: "aggregateDamage",
      damageByTypeBeforeTargetAdjustments: [
        { damageType: "slashing", amount: 5 },
      ],
    });
  });
});
