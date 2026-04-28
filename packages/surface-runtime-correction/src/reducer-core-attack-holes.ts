import { holeId, holeInstanceKey } from "#/reducer-types.ts";
import type { RuntimeHole } from "#/reducer-types.ts";

export function coreAttackTargetHole(): RuntimeHole {
  return {
    holeInstanceKey: holeInstanceKey("core:attack:target"),
    holeId: holeId("core_attack_target"),
    kind: "targetChoice",
    label: "attack target",
  };
}

export function coreAttackRollHole(): RuntimeHole {
  return {
    holeInstanceKey: holeInstanceKey("core:attack:attackRoll"),
    holeId: holeId("core_attack_roll"),
    kind: "attackRoll",
    label: "attack roll",
  };
}
