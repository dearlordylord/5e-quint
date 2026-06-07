// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import type {
  BattleHole,
  BattleCompanionReappearanceInitiativeHole,
  BattleCompanionReappearancePlacementHole,
  BattleFindFamiliarConnectionHole,
  BattleHeldObjectFactsHole,
} from "./battle-reducer.ts";
import { FIND_FAMILIAR_TELEPATHY_RANGE_FEET } from "./find-familiar-telepathy.ts";
import type { BattleCompanionStateId } from "./companion-state.ts";
import type { CombatantId } from "./identity.ts";

export const FIND_FAMILIAR_TOUCH_DELIVERY_TARGET_LABEL =
  "Familiar touch delivery target";

export function findFamiliarTouchDeliveryTargetHoles(
  holes: readonly BattleHole[],
): readonly BattleHole[] {
  return holes.map((hole) =>
    hole.kind === "targetChoice"
      ? {
          ...hole,
          label: FIND_FAMILIAR_TOUCH_DELIVERY_TARGET_LABEL,
          requiresTableSpatialFact: true,
        }
      : hole,
  );
}

export function findFamiliarConnectionHole(input: {
  readonly ownerId: CombatantId;
  readonly companionId: CombatantId;
}): BattleFindFamiliarConnectionHole {
  const key = `battle:find-familiar:connection:${input.ownerId}:${input.companionId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "findFamiliarConnection",
    label: "Familiar within 100 feet",
    ownerId: input.ownerId,
    companionId: input.companionId,
    rangeFeet: FIND_FAMILIAR_TELEPATHY_RANGE_FEET,
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
  readonly companionId: BattleCompanionStateId;
}): BattleCompanionReappearancePlacementHole {
  const key = `battle:companion:reappearance-placement:${input.ownerId}:${input.companionId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "companionReappearancePlacement",
    label: "Companion reappearance space",
    ownerId: input.ownerId,
    companionId: input.companionId,
  };
}

export function companionReappearanceInitiativeHole(input: {
  readonly ownerId: CombatantId;
  readonly companionId: BattleCompanionStateId;
}): BattleCompanionReappearanceInitiativeHole {
  const key = `battle:companion:reappearance-initiative:${input.ownerId}:${input.companionId}`;
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "companionReappearanceInitiative",
    label: "Companion reappearance Initiative",
    ownerId: input.ownerId,
    companionId: input.companionId,
  };
}
