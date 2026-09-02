import type {
  BattleState,
  BattleStoredLightEmitterTemplate,
} from "./battle-state-execution.ts";
import {
  allocateBattleEffectOccurrenceTemplatesForCreature,
  type BattleActiveEffectOccurrenceTemplate,
  type BattleAllocatedEffectOccurrence,
} from "./effect-execution-ref.ts";
import type { CombatantId } from "./identity.ts";

export function battleStateWithAllocatedEffectForTest(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly effect: BattleActiveEffectOccurrenceTemplate;
}): BattleState {
  return battleStateWithAllocatedEffectOccurrencesForTest({
    state: input.state,
    occurrences: [
      { kind: "activeEffect", ownerId: input.ownerId, effect: input.effect },
    ],
  }).state;
}

export function battleStateWithAllocatedEffectOccurrencesForTest(input: {
  readonly state: BattleState;
  readonly occurrences: readonly (
    | {
        readonly kind: "activeEffect";
        readonly ownerId: CombatantId;
        readonly effect: BattleActiveEffectOccurrenceTemplate;
      }
    | {
        readonly kind: "storedLightEmitter";
        readonly ownerId: CombatantId;
        readonly emitter: BattleStoredLightEmitterTemplate;
      }
  )[];
}): {
  readonly state: BattleState;
  readonly occurrences: readonly (BattleAllocatedEffectOccurrence & {
    readonly ownerId: CombatantId;
  })[];
} {
  return input.occurrences.reduce<{
    readonly state: BattleState;
    readonly occurrences: readonly (BattleAllocatedEffectOccurrence & {
      readonly ownerId: CombatantId;
    })[];
  }>(
    (result, occurrence) => {
      const owner = result.state.combatants.get(occurrence.ownerId);
      if (owner === undefined) {
        throw new Error(
          `Expected effect occurrence owner ${occurrence.ownerId}.`,
        );
      }
      const allocation = allocateBattleEffectOccurrenceTemplatesForCreature({
        owner,
        occurrences: [occurrence],
      });
      const allocated = allocation.occurrences[0];
      if (allocated === undefined) {
        throw new Error("A single occurrence template must allocate once.");
      }
      const state =
        allocated.kind === "activeEffect"
          ? {
              ...result.state,
              combatants: new Map(result.state.combatants).set(
                occurrence.ownerId,
                {
                  ...allocation.owner,
                  activeEffects: [
                    ...allocation.owner.activeEffects,
                    allocated.effect,
                  ],
                },
              ),
            }
          : {
              ...result.state,
              combatants: new Map(result.state.combatants).set(
                occurrence.ownerId,
                allocation.owner,
              ),
              lightEmitters: [...result.state.lightEmitters, allocated.emitter],
            };
      return {
        state,
        occurrences: [
          ...result.occurrences,
          { ...allocated, ownerId: occurrence.ownerId },
        ],
      };
    },
    { state: input.state, occurrences: [] },
  );
}
