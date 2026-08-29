import type { MovementFeet } from "@dnd/shared/types";
import type {
  BattleDirectionalPersistentAreaPushDisposition,
  BattleSpellAreaChoice,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

export function validateDirectionalPersistentAreaAreaPushFacts(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly failedTargetIds: readonly CombatantId[];
  readonly pushDistanceFeet: MovementFeet;
}): string | null {
  const area = input.area;
  if (area === undefined || area.kind !== "directionalPersistentAreaArea") {
    return "directional persistent area requires caller-supplied Line area, direction, and failed-save push facts.";
  }
  const failedTargetIds = new Set(input.failedTargetIds);
  const pushedTargetIds = new Set<CombatantId>();
  for (const push of area.creaturePushes) {
    if (!failedTargetIds.has(push.targetId)) {
      return "directional persistent area push facts must match failed-save targets.";
    }
    if (pushedTargetIds.has(push.targetId)) {
      return "directional persistent area push facts must not duplicate targets.";
    }
    pushedTargetIds.add(push.targetId);
    const dispositionValidation =
      validateDirectionalPersistentAreaPushDisposition(
        push.disposition,
        input.pushDistanceFeet,
      );
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
  }
  return pushedTargetIds.size === failedTargetIds.size
    ? null
    : "directional persistent area push facts must cover every failed-save target.";
}

function validateDirectionalPersistentAreaPushDisposition(
  disposition: BattleDirectionalPersistentAreaPushDisposition,
  distanceFeet: MovementFeet,
): string | null {
  if (disposition.distanceFeet !== distanceFeet) {
    return "directional persistent area push disposition must use the spell's 15-foot distance.";
  }
  /* v8 ignore start -- @preserve -- The typed push-disposition union fixes this flag to false; the guard only protects untyped JavaScript callers outside the BattleFill contract. */
  if (disposition.provokesOpportunityAttacks !== false) {
    return "directional persistent area push disposition must not provoke Opportunity Attacks.";
  }
  /* v8 ignore stop -- @preserve */
  if (disposition.kind === "pushed") {
    /* v8 ignore start -- @preserve -- BattleTablePositionId admits only non-empty trimmed strings; this guard only protects untyped JavaScript callers outside the branded-id contract. */
    if (disposition.destinationId.length === 0) {
      return "directional persistent area pushed destinations must be caller-supplied non-empty table positions.";
    }
    /* v8 ignore stop -- @preserve */
    return null;
  }
  return null;
}
