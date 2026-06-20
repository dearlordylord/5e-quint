// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS

import { grantSpellEffectActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import { Either } from "effect";

import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  BattleTurnResources,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";

type SpellGrantedActionResourceEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellGrantedActionResource" }
>;

export function spellGrantedActionResourceTurnResources(
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  if (actor === undefined) {
    return resources;
  }

  return actor.activeEffects
    .filter((effect) => effect.kind === "spellGrantedActionResource")
    .reduce((nextResources, effect) => {
      const granted = grantSpellEffectActionResource(
        nextResources,
        effect.sourceCombatantId,
        effect.sourceSpellId,
        effect.restriction,
      );
      return Either.isLeft(granted) ? nextResources : granted.right;
    }, resources);
}

export function battleStateWithCurrentActorSpellGrantedActionResourcesForTargets(
  state: BattleState,
  targetIds: readonly CombatantId[],
): BattleState {
  const actorId = currentActorId(state);
  if (!targetIds.includes(actorId)) {
    return state;
  }

  return {
    ...state,
    currentTurnResources: spellGrantedActionResourceTurnResources(
      state.currentTurnResources,
      state.combatants.get(actorId),
    ),
  };
}

export function battleStateWithoutCurrentActorSpellGrantedActionResourcesForEffects(
  state: BattleState,
  expiredEffects: readonly BattleActiveEffect[],
): BattleState {
  const currentTurnResources =
    currentTurnResourcesWithoutSpellGrantedActionResourcesForEffects(
      state.currentTurnResources,
      expiredEffects,
    );
  return currentTurnResources === state.currentTurnResources
    ? state
    : { ...state, currentTurnResources };
}

function currentTurnResourcesWithoutSpellGrantedActionResourcesForEffects(
  resources: BattleTurnResources,
  expiredEffects: readonly BattleActiveEffect[],
): BattleTurnResources {
  const expiredResources = expiredEffects.filter(isSpellGrantedActionResource);
  if (expiredResources.length === 0) {
    return resources;
  }

  const actionResources = resources.actionResources.filter(
    (resource) =>
      !expiredResources.some((effect) =>
        spellEffectActionResourceMatchesEffect(resource, effect),
      ),
  );
  return actionResources.length === resources.actionResources.length
    ? resources
    : { ...resources, actionResources };
}

function isSpellGrantedActionResource(
  effect: BattleActiveEffect,
): effect is SpellGrantedActionResourceEffect {
  return effect.kind === "spellGrantedActionResource";
}

function spellEffectActionResourceMatchesEffect(
  resource: RuntimeActionResource,
  effect: SpellGrantedActionResourceEffect,
): boolean {
  return (
    resource.source === "spellEffect" &&
    resource.sourceOwnerId === effect.sourceCombatantId &&
    resource.sourceSpellId === effect.sourceSpellId
  );
}
