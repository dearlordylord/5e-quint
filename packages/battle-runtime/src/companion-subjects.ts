// UNIT-PROFILE-COVERAGE: runtime-owner spell.companion-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import type {
  BattleHole,
  BattleCompanionReappearanceInitiativeHole,
  BattleCompanionReappearancePlacementHole,
  BattleSpawnedCompanionConnectionHole,
  BattleHeldObjectFactsHole,
} from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";
import type { MovementFeet } from "@dnd/shared/types";

export const COMPANION_TOUCH_DELIVERY_TARGET_LABEL =
  "Familiar touch delivery target";

export function spawnedCompanionTouchDeliveryTargetHoles(
  holes: readonly BattleHole[],
): readonly BattleHole[] {
  return holes.map((hole) =>
    hole.kind === "targetChoice"
      ? {
          ...hole,
          label: COMPANION_TOUCH_DELIVERY_TARGET_LABEL,
          requiresTableSpatialFact: true,
        }
      : hole,
  );
}

export function spawnedCompanionConnectionHole(input: {
  readonly ownerId: CombatantId;
  readonly companionId: CombatantId;
  readonly rangeFeet: MovementFeet;
}): BattleSpawnedCompanionConnectionHole {
  const key = `battle:companion:connection:${input.ownerId}:${input.companionId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "spawnedCompanionConnection",
    label: `Familiar within ${input.rangeFeet} feet`,
    ownerId: input.ownerId,
    companionId: input.companionId,
    rangeFeet: input.rangeFeet,
    requiresTableSpatialFact: true,
  };
}

export function companionHeldObjectFactsHole(input: {
  readonly companionId: CombatantId;
}): BattleHeldObjectFactsHole {
  const key = `battle:companion:held-objects:${input.companionId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "heldObjectFacts",
    label: "Familiar held objects",
    actorId: input.companionId,
  };
}

export function companionReappearancePlacementHole(input: {
  readonly ownerId: CombatantId;
}): BattleCompanionReappearancePlacementHole {
  const key = `battle:companion:reappearance-placement:${input.ownerId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "companionReappearancePlacement",
    label: "Companion reappearance space",
    ownerId: input.ownerId,
  };
}

export function companionReappearanceInitiativeHole(input: {
  readonly ownerId: CombatantId;
}): BattleCompanionReappearanceInitiativeHole {
  const key = `battle:companion:reappearance-initiative:${input.ownerId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "companionReappearanceInitiative",
    label: "Companion reappearance Initiative",
    ownerId: input.ownerId,
  };
}
