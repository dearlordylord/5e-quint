import type {
  BattleCreatureState,
  BattleState,
} from "../../battle-state-execution.ts";
import {
  characterResourceIsClassFeatureFreeCastForSpell,
  type CharacterBattleResourceOwnership,
} from "../../character-battle-resources.ts";
import { resourceHasUsesRemaining } from "../../character-battle-resource-execution.ts";
import type { BattleResourcePoolExecutionRef } from "../../identity.ts";
import type { UnitId } from "@dnd/shared/game-facts";
import {
  spellAdmissionBattleProjection,
  type SpellAdmissionActor,
  type SpellAdmissionContext,
} from "./profile.ts";

function isSpellAdmissionActor(
  actor: BattleCreatureState,
): actor is SpellAdmissionActor {
  return (
    actor.origin.kind === "character" &&
    actor.origin.spellcasting !== undefined &&
    actor.origin.spellcasting.canCastSpells
  );
}

export function spellAdmissionContextFor(
  actor: BattleCreatureState,
  state: BattleState | undefined,
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
): SpellAdmissionContext | null {
  if (!isSpellAdmissionActor(actor)) return null;
  return {
    actor,
    battle: spellAdmissionBattleProjection(state),
    availableClassFeatureFreeCastResourcePoolRefsForSpell: (
      spellId: UnitId,
    ): readonly BattleResourcePoolExecutionRef[] =>
      resourceOwnership.flatMap((owner) => {
        const resource = actor.origin.resources.find(
          (candidate) => candidate.resourcePoolRef === owner.resourcePoolRef,
        );
        return resource !== undefined &&
          characterResourceIsClassFeatureFreeCastForSpell(owner, spellId) &&
          resourceHasUsesRemaining(resource)
          ? [resource.resourcePoolRef]
          : [];
      }),
  };
}
