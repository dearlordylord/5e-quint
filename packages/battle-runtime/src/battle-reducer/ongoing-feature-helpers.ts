// Attack rolls and unit features share these occurrence/expiration helpers
// through a common leaf to avoid a cycle between those owners.
// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING

import { Round } from "@dnd/shared/types";
import type { CombatantId } from "../identity.ts";
import type {
  OngoingFeatureExtensionTrigger,
  OngoingFeatureLifecycleProfile,
} from "../unit-feature-support.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-admission.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleState,
  EndOfTurnOngoingFeatureExpiration,
  OngoingFeatureExpiration,
} from "../battle-state-execution.ts";

type OngoingFeatureExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "ongoingFeature" }
>;

export function activeOngoingFeatureOccurrenceFromExecution(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: OngoingFeatureExecution,
): ActiveOngoingFeatureOccurrence {
  const expiresAt = ongoingFeatureExpirationFromExecution(
    state,
    actorId,
    unitFeature,
  );
  if (unitFeature.lifecycle.kind === "roundExtended") {
    return {
      kind: "roundExtended",
      expiresAt: requireEndOfTurnOngoingFeatureExpiration(expiresAt),
      maxExpiresAt: {
        kind: "endOfTurn",
        combatantId: actorId,
        round: Round(
          Number(state.initiative.round) +
            unitFeature.lifecycle.maximumDurationRounds,
        ),
      },
    };
  }
  if (unitFeature.lifecycle.kind === "fixedDuration") {
    return {
      kind: "fixedDuration",
      expiresAt: requireEndOfTurnOngoingFeatureExpiration(expiresAt),
    };
  }
  return {
    kind: "turnBoundary",
    expiresAt,
  };
}

export function requireEndOfTurnOngoingFeatureExpiration(
  expiration: OngoingFeatureExpiration,
): EndOfTurnOngoingFeatureExpiration {
  if (expiration.kind !== "endOfTurn") {
    throw new Error(
      "Duration-based ongoing features must expire at end of turn.",
    );
  }
  return expiration;
}

export function ongoingFeatureExpirationFromExecution(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: OngoingFeatureExecution,
): OngoingFeatureExpiration {
  if (
    unitFeature.lifecycle.kind === "turnBoundary" &&
    unitFeature.lifecycle.initialExpiration === "startOfNextTurn"
  ) {
    return { kind: "startOfTurn", combatantId: actorId };
  }
  const rounds =
    unitFeature.lifecycle.kind === "fixedDuration"
      ? unitFeature.lifecycle.maximumDurationRounds
      : 1;
  return {
    kind: "endOfTurn",
    combatantId: actorId,
    round: Round(Number(state.initiative.round) + rounds),
  };
}

export function extendOngoingFeatureToEndOfNextTurn(
  state: BattleState,
  actorId: CombatantId,
  occurrence: ActiveOngoingFeatureOccurrence,
): ActiveOngoingFeatureOccurrence {
  if (occurrence.kind !== "roundExtended") {
    return occurrence;
  }
  const nextExpiresAt: OngoingFeatureExpiration = {
    kind: "endOfTurn",
    combatantId: actorId,
    round: Round(Number(state.initiative.round) + 1),
  };
  return {
    ...occurrence,
    expiresAt: clampOngoingFeatureExpiration(nextExpiresAt, occurrence),
  };
}

export function clampOngoingFeatureExpiration(
  nextExpiresAt: OngoingFeatureExpiration,
  occurrence: Extract<
    ActiveOngoingFeatureOccurrence,
    { readonly kind: "roundExtended" }
  >,
): EndOfTurnOngoingFeatureExpiration {
  const endOfTurn = requireEndOfTurnOngoingFeatureExpiration(nextExpiresAt);
  if (Number(endOfTurn.round) <= Number(occurrence.maxExpiresAt.round)) {
    return endOfTurn;
  }
  return occurrence.maxExpiresAt;
}

export function ongoingFeatureLifecycleHasExtensionTrigger(
  lifecycle: OngoingFeatureLifecycleProfile,
  trigger: OngoingFeatureExtensionTrigger,
): boolean {
  return (
    lifecycle.kind === "roundExtended" &&
    lifecycle.extensionTriggers.includes(trigger)
  );
}

export function ongoingFeatureProfileHasExtensionTrigger(
  profile: OngoingFeatureExecution | null,
  trigger: OngoingFeatureExtensionTrigger,
): boolean {
  return (
    profile !== null &&
    ongoingFeatureLifecycleHasExtensionTrigger(profile.lifecycle, trigger)
  );
}
