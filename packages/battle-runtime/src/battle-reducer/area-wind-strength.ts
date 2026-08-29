// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.TRANSLATING_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import type { BattleAreaId, BattleEffectExecutionRef } from "../identity.ts";
import type { BattleAreaWindStrengthHole } from "../battle-state-execution.ts";

export function areaWindStrengthHole(
  areaId: BattleAreaId,
  effectRef: BattleEffectExecutionRef,
): BattleAreaWindStrengthHole {
  const key = `battle:area-wind-strength:${areaId}:${effectRef}`;
  return {
    kind: "areaWindStrength",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Wind strength in the area",
    areaId,
  };
}
