import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
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
