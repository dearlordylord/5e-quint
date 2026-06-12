// Shared ongoing-feature occurrence/expiration helpers extracted from
// battle-reducer.ts. Cycle #20 in REFACTOR_MAP.md — both T (attack_roll) and
// J (unit_features) need these helpers; hoisting them here lets both clusters
// import from a common leaf without forming a J↔T cycle. Mechanical
// extraction — no behavior change.
// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING

import { Round } from "@dnd/shared/types";
import type { CombatantId } from "../identity.ts";
import type {
  OngoingFeatureExtensionTrigger,
  OngoingFeatureLifecycleProfile,
  SupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleState,
  EndOfTurnOngoingFeatureExpiration,
  OngoingFeatureExpiration,
} from "../battle-reducer.ts";

export function activeOngoingFeatureOccurrenceFromProfile(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): ActiveOngoingFeatureOccurrence {
  const expiresAt = ongoingFeatureExpirationFromProfile(
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

export function ongoingFeatureExpirationFromProfile(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
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
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  > | null,
  trigger: OngoingFeatureExtensionTrigger,
): boolean {
  return (
    profile !== null &&
    ongoingFeatureLifecycleHasExtensionTrigger(profile.lifecycle, trigger)
  );
}
