import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleAreaId, BattleEffectExecutionRef } from "../identity.ts";
import { characterRetainedSpellProcedureExecution } from "../character-execution-queries.ts";
import type {
  CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution,
  DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution,
  SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution,
  StationaryPersistentAreaSaveDamageSpellProcedureExecution,
} from "../procedure-execution/spell-procedure-execution.ts";
import { persistentAreaSaveDamageRepositionKind } from "./persistent-area-save-damage-lifecycle.ts";

export { persistentAreaSaveDamageRepositionKind } from "./persistent-area-save-damage-lifecycle.ts";

type PersistentAreaSaveDamageEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaSaveDamage" }
>;
type StationaryEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: "stationary" }
>;
type TranslatingEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: "sourceTurnTranslation" }
>;
type CollisionEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: "collisionReposition" }
>;
type DirectedEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: "directedReposition" }
>;

export type BoundPersistentAreaSaveDamageEffect =
  | {
      readonly kind: "stationary";
      readonly effect: StationaryEffect;
      readonly facts: StationaryPersistentAreaSaveDamageSpellProcedureExecution;
    }
  | {
      readonly kind: "sourceTurnTranslation";
      readonly effect: TranslatingEffect;
      readonly facts: SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution;
    }
  | {
      readonly kind: "collisionReposition";
      readonly effect: CollisionEffect;
      readonly facts: CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution;
    }
  | {
      readonly kind: "directedReposition";
      readonly effect: DirectedEffect;
      readonly facts: DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution;
    };

export function boundPersistentAreaSaveDamageEffectForArea(
  state: BattleState,
  effectRef: BattleEffectExecutionRef,
  areaId: BattleAreaId,
): BoundPersistentAreaSaveDamageEffect | undefined {
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate): candidate is PersistentAreaSaveDamageEffect =>
        candidate.kind === "persistentAreaSaveDamage" &&
        candidate.effectRef === effectRef &&
        candidate.areaId === areaId,
    );
    if (effect === undefined) continue;
    const owner = state.combatants.get(effect.sourceCombatantId);
    return owner === undefined
      ? undefined
      : boundPersistentAreaSaveDamageEffect(owner, effect);
  }
  return undefined;
}

export function boundPersistentAreaSaveDamageEffect(
  owner: BattleCreatureState,
  effect: PersistentAreaSaveDamageEffect,
): BoundPersistentAreaSaveDamageEffect | undefined {
  if (
    owner.origin.kind !== "character" ||
    effect.sourceCombatantId !== owner.combatantId
  ) {
    return undefined;
  }
  const facts = characterRetainedSpellProcedureExecution(
    owner.origin.execution,
    effect.sourceProcedureRef,
  );
  if (facts?.procedure !== "persistentAreaSaveDamage") return undefined;
  if (isStationaryEffect(effect) && isStationaryFacts(facts)) {
    return { kind: "stationary", effect, facts };
  }
  if (isTranslatingEffect(effect) && isTranslatingFacts(facts)) {
    return { kind: "sourceTurnTranslation", effect, facts };
  }
  if (isCollisionFacts(facts) && isCollisionEffect(effect)) {
    return { kind: "collisionReposition", effect, facts };
  }
  return isDirectedFacts(facts) && isDirectedEffect(effect)
    ? { kind: "directedReposition", effect, facts }
    : undefined;
}

function isStationaryEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is StationaryEffect {
  return effect.lifecycle === "stationary";
}

function isTranslatingEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is TranslatingEffect {
  return effect.lifecycle === "sourceTurnTranslation";
}

function isCollisionEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is CollisionEffect {
  return effect.lifecycle === "collisionReposition";
}

function isDirectedEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is DirectedEffect {
  return effect.lifecycle === "directedReposition";
}

function isStationaryFacts(
  facts: Extract<
    ReturnType<typeof characterRetainedSpellProcedureExecution>,
    { readonly procedure: "persistentAreaSaveDamage" }
  >,
): facts is StationaryPersistentAreaSaveDamageSpellProcedureExecution {
  return facts.lifecycle.kind === "stationary";
}

function isTranslatingFacts(
  facts: Extract<
    ReturnType<typeof characterRetainedSpellProcedureExecution>,
    { readonly procedure: "persistentAreaSaveDamage" }
  >,
): facts is SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution {
  return facts.lifecycle.kind === "sourceTurnTranslation";
}

function isCollisionFacts(
  facts: Extract<
    ReturnType<typeof characterRetainedSpellProcedureExecution>,
    { readonly procedure: "persistentAreaSaveDamage" }
  >,
): facts is CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution {
  return (
    facts.lifecycle.kind === "casterActionReposition" &&
    persistentAreaSaveDamageRepositionKind(facts.lifecycle) ===
      "collisionReposition"
  );
}

function isDirectedFacts(
  facts: Extract<
    ReturnType<typeof characterRetainedSpellProcedureExecution>,
    { readonly procedure: "persistentAreaSaveDamage" }
  >,
): facts is DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution {
  return (
    facts.lifecycle.kind === "casterActionReposition" &&
    persistentAreaSaveDamageRepositionKind(facts.lifecycle) ===
      "directedReposition"
  );
}
