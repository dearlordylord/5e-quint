import {
  spendMatchingActionResource,
  type ActionEconomySpendError,
  type ActionEconomyState,
  type RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import * as Result from "effect/Result";
import type { CombatantId } from "../identity.ts";
import type {
  ClassFeatureExtraAttackActionResource,
  StatBlockMultiattackActionResource,
} from "./battle-runtime-protocol.ts";

export function isStatBlockMultiattackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is StatBlockMultiattackActionResource {
  return (
    resource.source === "statBlockMultiattack" &&
    resource.sourceOwnerId === actorId
  );
}

export function isClassFeatureExtraAttackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is ClassFeatureExtraAttackActionResource {
  return (
    resource.source === "classFeatureExtraAttack" &&
    resource.sourceOwnerId === actorId
  );
}

export function canSpendEscapeGrappleActionResource(
  resources: ActionEconomyState,
  actorId: CombatantId,
): boolean {
  return Result.isSuccess(spendEscapeGrappleActionResource(resources, actorId));
}

export function spendEscapeGrappleActionResource<T extends ActionEconomyState>(
  resources: T,
  actorId: CombatantId,
): Result.Result<T, ActionEconomySpendError> {
  return spendMatchingActionResource(
    resources,
    "attack",
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, actorId) &&
      !isStatBlockMultiattackActionResource(resource, actorId),
  );
}
