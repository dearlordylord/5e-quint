import type { MovementFeet } from "@dnd/shared/types";
import type {
  BattleGustOfWindLinePushDisposition,
  BattleSpellAreaChoice,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

export function validateGustOfWindLineAreaPushFacts(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly failedTargetIds: readonly CombatantId[];
  readonly pushDistanceFeet: MovementFeet;
}): string | null {
  const area = input.area;
  if (area === undefined || area.kind !== "gustOfWindLineArea") {
    return "Gust of Wind requires caller-supplied Line area, direction, and failed-save push facts.";
  }
  const failedTargetIds = new Set(input.failedTargetIds);
  const pushedTargetIds = new Set<CombatantId>();
  for (const push of area.creaturePushes) {
    if (!failedTargetIds.has(push.targetId)) {
      return "Gust of Wind push facts must match failed-save targets.";
    }
    if (pushedTargetIds.has(push.targetId)) {
      return "Gust of Wind push facts must not duplicate targets.";
    }
    pushedTargetIds.add(push.targetId);
    const dispositionValidation = validateGustOfWindLinePushDisposition(
      push.disposition,
      input.pushDistanceFeet,
    );
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
  }
  return pushedTargetIds.size === failedTargetIds.size
    ? null
    : "Gust of Wind push facts must cover every failed-save target.";
}

function validateGustOfWindLinePushDisposition(
  disposition: BattleGustOfWindLinePushDisposition,
  distanceFeet: MovementFeet,
): string | null {
  if (disposition.distanceFeet !== distanceFeet) {
    return "Gust of Wind push disposition must use the spell's 15-foot distance.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Gust of Wind push disposition must not provoke Opportunity Attacks.";
  }
  if (disposition.kind === "pushed") {
    return disposition.destinationId.length === 0
      ? "Gust of Wind pushed destinations must be caller-supplied non-empty table positions."
      : null;
  }
  return null;
}
