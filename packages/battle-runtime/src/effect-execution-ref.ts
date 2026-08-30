import type {
  BattleActiveEffect,
  BattleEffectOccurrenceIdentity,
  BattleEffectOccurrenceTemplate,
  BattleSourcedActiveEffectTemplate,
} from "./active-effect/types.ts";
import type { BattleActiveEffectSource } from "./active-effect/source.ts";
import type { BattleEffectExecutionRef, CombatantId } from "./identity.ts";
import {
  battleEffectExecutionRef,
  battleEffectExecutionOrdinal,
} from "./identity.ts";
import type {
  BattleCreatureState,
  BattleState,
  BattleStoredLightEmitter,
  BattleStoredLightEmitterTemplate,
} from "./battle-state-execution.ts";

export type ReplayAddressableSpellActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "compelledNextTurnBehavior"
      | "persistentAreaSaveDamage"
      | "grantedAreaSaveDamageAction"
      | "movableLightManifestation"
      | "heldLight"
      | "fixedCostMovementReplacement"
      | "spellObjectContactDamage"
      | "spellMarkedDamageRider"
      | "spellDashBonusAction"
      | "spatialMeleeSpellAttackProxy"
      | "possession"
      | "selfTransformation"
      | "spellCondition"
      | "spellConditionRepeatSave"
      | "spellCreatedHeldObject"
      | "spellGrantedActionResource"
      | "controlledVerticalSuspension"
      | "linkedDefenseResistanceDamageShare";
  }
>;
export type SpellActiveEffect = ReplayAddressableSpellActiveEffect;
export type BattleSourcedEffectOccurrence = Extract<
  BattleActiveEffect,
  BattleActiveEffectSource & BattleEffectOccurrenceIdentity
>;
export type BattleActiveEffectOccurrenceTemplate =
  BattleActiveEffect extends infer Effect
    ? Effect extends BattleActiveEffect
      ? BattleEffectOccurrenceTemplate<Effect>
      : never
    : never;
type BattleAllocatedActiveEffectOccurrence = BattleActiveEffect &
  BattleEffectOccurrenceIdentity;
type BattleAllocatedSourcedEffectOccurrence = Extract<
  BattleActiveEffect,
  BattleActiveEffectSource
> &
  BattleEffectOccurrenceIdentity;
type AllocatedActiveEffectForTemplate<Template> =
  Template extends BattleActiveEffectOccurrenceTemplate
    ? Omit<Template, "effectRef"> & BattleEffectOccurrenceIdentity
    : never;
type AllocatedStoredLightEmitterForTemplate<Template> =
  Template extends BattleStoredLightEmitterTemplate
    ? Omit<Template, "effectRef"> & BattleEffectOccurrenceIdentity
    : never;
export type BattleSourcedEffectOccurrenceTemplate =
  BattleSourcedActiveEffectTemplate<
    Extract<BattleActiveEffect, BattleActiveEffectSource>
  >;
export type BattleSourcedEffectOccurrenceTemplateList = readonly [
  BattleSourcedEffectOccurrenceTemplate,
  ...BattleSourcedEffectOccurrenceTemplate[],
];
export type BattleEffectOccurrenceAllocationTemplate =
  | {
      readonly kind: "activeEffect";
      readonly effect: BattleActiveEffectOccurrenceTemplate;
    }
  | {
      readonly kind: "storedLightEmitter";
      readonly emitter: BattleStoredLightEmitterTemplate;
    };
export type BattleAllocatedEffectOccurrence =
  | {
      readonly kind: "activeEffect";
      readonly effect: BattleAllocatedActiveEffectOccurrence;
    }
  | {
      readonly kind: "storedLightEmitter";
      readonly emitter: BattleStoredLightEmitter;
    };
export function spellActiveEffectExecutionRef(
  effect: ReplayAddressableSpellActiveEffect,
): BattleEffectExecutionRef {
  return effect.effectRef;
}

export function spellActiveEffectForExecutionRef(
  effects: readonly BattleActiveEffect[],
  effectRef: BattleEffectExecutionRef,
): ReplayAddressableSpellActiveEffect | undefined {
  return effects.find(
    (effect): effect is ReplayAddressableSpellActiveEffect =>
      effect.effectRef === effectRef,
  );
}

export function allocateBattleEffectExecutionRef(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
}):
  | {
      readonly tag: "allocated";
      readonly state: BattleState;
      readonly owner: BattleCreatureState;
      readonly effectRef: BattleEffectExecutionRef;
    }
  | { readonly tag: "ownerNotFound"; readonly ownerId: CombatantId } {
  const owner = input.state.combatants.get(input.ownerId);
  if (owner === undefined) {
    return { tag: "ownerNotFound", ownerId: input.ownerId };
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner,
  });
  const combatants = new Map(input.state.combatants).set(
    input.ownerId,
    allocation.owner,
  );
  return {
    tag: "allocated",
    state: { ...input.state, combatants },
    owner: allocation.owner,
    effectRef: allocation.effectRef,
  };
}

export function allocateBattleEffectExecutionRefForCreature<
  Owner extends BattleCreatureState,
>(input: {
  readonly owner: Owner;
}): {
  readonly owner: Owner;
  readonly effectRef: BattleEffectExecutionRef;
} {
  const ordinal = Number(input.owner.nextEffectOrdinal);
  return {
    owner: {
      ...input.owner,
      nextEffectOrdinal: battleEffectExecutionOrdinal(ordinal + 1),
    },
    effectRef: battleEffectExecutionRef(
      JSON.stringify({
        kind: "effectOccurrence",
        ownerScopeRef: input.owner.origin.execution.scopeRef,
        ordinal,
      }),
    ),
  };
}

export function allocateBattleEffectOccurrencesForCreature(input: {
  readonly owner: BattleCreatureState;
  readonly effects: BattleSourcedEffectOccurrenceTemplateList;
}): {
  readonly owner: BattleCreatureState;
  readonly effects: readonly BattleAllocatedSourcedEffectOccurrence[];
} {
  let owner = input.owner;
  const effects: BattleAllocatedSourcedEffectOccurrence[] = [];
  for (const effect of input.effects) {
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner,
      effect,
    });
    owner = allocation.owner;
    effects.push(allocation.effect);
  }
  return { owner, effects };
}

export function allocateBattleEffectOccurrenceForCreature<
  Owner extends BattleCreatureState,
  Effect extends BattleActiveEffectOccurrenceTemplate,
>(input: {
  readonly owner: Owner;
  readonly effect: Effect;
}): {
  readonly owner: Owner;
  readonly effect: AllocatedActiveEffectForTemplate<Effect>;
} {
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: input.owner,
  });
  return {
    owner: allocation.owner,
    effect: { ...input.effect, effectRef: allocation.effectRef },
  };
}

export function allocateBattleStoredLightEmitterForCreature<
  Owner extends BattleCreatureState,
  Emitter extends BattleStoredLightEmitterTemplate,
>(input: {
  readonly owner: Owner;
  readonly emitter: Emitter;
}): {
  readonly owner: Owner;
  readonly emitter: AllocatedStoredLightEmitterForTemplate<Emitter>;
} {
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: input.owner,
  });
  return {
    owner: allocation.owner,
    emitter: { ...input.emitter, effectRef: allocation.effectRef },
  };
}

export function allocateBattleEffectOccurrenceTemplatesForCreature<
  Owner extends BattleCreatureState,
>(input: {
  readonly owner: Owner;
  readonly occurrences: readonly BattleEffectOccurrenceAllocationTemplate[];
}): {
  readonly owner: Owner;
  readonly occurrences: readonly BattleAllocatedEffectOccurrence[];
} {
  let owner = input.owner;
  const occurrences: BattleAllocatedEffectOccurrence[] = [];
  for (const occurrence of input.occurrences) {
    const allocation = allocateBattleEffectExecutionRefForCreature({ owner });
    owner = allocation.owner;
    if (occurrence.kind === "activeEffect") {
      occurrences.push({
        kind: "activeEffect",
        effect: { ...occurrence.effect, effectRef: allocation.effectRef },
      });
    } else {
      occurrences.push({
        kind: "storedLightEmitter",
        emitter: { ...occurrence.emitter, effectRef: allocation.effectRef },
      });
    }
  }
  return { owner, occurrences };
}
