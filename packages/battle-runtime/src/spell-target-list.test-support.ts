import type { BattleFill, BattleHole } from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";
import { battleProcedureExecutionRefForSpellHoleForTest } from "./battle-runtime.test-support.ts";

export function spellTargetListFillForTest(
  hole: BattleHole,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  if (hole.kind !== "spellTargetList") {
    throw new Error("Expected spellTargetList hole.");
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds: [targetId] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(hole),
      },
    ],
  };
}
