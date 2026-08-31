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
import { Match } from "effect";

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
  return Match.value(effect).pipe(
    Match.discriminatorsExhaustive("lifecycle")({
      stationary: (stationaryEffect) =>
        isStationaryFacts(facts)
          ? { kind: "stationary" as const, effect: stationaryEffect, facts }
          : undefined,
      sourceTurnTranslation: (translatingEffect) =>
        isTranslatingFacts(facts)
          ? {
              kind: "sourceTurnTranslation" as const,
              effect: translatingEffect,
              facts,
            }
          : undefined,
      collisionReposition: (collisionEffect) =>
        isCollisionFacts(facts)
          ? {
              kind: "collisionReposition" as const,
              effect: collisionEffect,
              facts,
            }
          : undefined,
      directedReposition: (directedEffect) =>
        isDirectedFacts(facts)
          ? {
              kind: "directedReposition" as const,
              effect: directedEffect,
              facts,
            }
          : undefined,
    }),
  );
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
