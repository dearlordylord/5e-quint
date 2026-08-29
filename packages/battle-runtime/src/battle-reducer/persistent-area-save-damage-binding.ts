import type {
  BattleActiveEffect,
  BattleCreatureState,
} from "../battle-state-execution.ts";
import { characterRetainedSpellProcedureExecution } from "../character-execution-queries.ts";
import type {
  CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution,
  DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution,
  SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution,
  StationaryPersistentAreaSaveDamageSpellProcedureExecution,
} from "../procedure-execution/spell-procedure-execution.ts";
import * as Match from "effect/Match";

type PersistentAreaSaveDamageEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaSaveDamage" }
>;
type StationaryEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: { readonly kind: "stationary" } }
>;
type TranslatingEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: { readonly kind: "sourceTurnTranslation" } }
>;
type CollisionEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly savedThisTurn?: never }
>;
type DirectedEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly shapeShiftSuppressed: readonly unknown[] }
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
  if (effect.lifecycle.kind !== "casterActionReposition") {
    return undefined;
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
  return effect.lifecycle.kind === "stationary";
}

function isTranslatingEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is TranslatingEffect {
  return effect.lifecycle.kind === "sourceTurnTranslation";
}

function isCollisionEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is CollisionEffect {
  return (
    effect.lifecycle.kind === "casterActionReposition" &&
    effect.savedThisTurn === undefined &&
    effect.shapeShiftSuppressed === undefined
  );
}

function isDirectedEffect(
  effect: PersistentAreaSaveDamageEffect,
): effect is DirectedEffect {
  return (
    effect.lifecycle.kind === "casterActionReposition" &&
    effect.savedThisTurn !== undefined &&
    effect.shapeShiftSuppressed !== undefined
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

export function persistentAreaSaveDamageRepositionKind(lifecycle: {
  readonly actionCost: "magicAction" | "bonusAction";
  readonly collisionDisposition: "stopAndAffectAdjacent" | "ignoreObstacles";
}): "collisionReposition" | "directedReposition" {
  return Match.value(lifecycle.collisionDisposition).pipe(
    Match.when("stopAndAffectAdjacent", () => "collisionReposition" as const),
    Match.when("ignoreObstacles", () => "directedReposition" as const),
    Match.exhaustive,
  );
}
