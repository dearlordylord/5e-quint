import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import type {
  BattleActiveEffectExecutionRef,
  BattleAreaId,
} from "../identity.ts";
import type { BattleAreaWindStrengthHole } from "../battle-state-execution.ts";

export function areaWindStrengthHole(
  areaId: BattleAreaId,
  effectRef: BattleActiveEffectExecutionRef,
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
