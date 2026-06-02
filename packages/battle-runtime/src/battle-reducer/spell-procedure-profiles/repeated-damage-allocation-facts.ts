import { type SpellSlotLevel, spellSlotLevel } from "@dnd/shared/types";

import type { SupportedSpellInvocation } from "../../battle-reducer.ts";

export const repeatedDamageAllocationMinimumSlotLevel = spellSlotLevel(1);
export const repeatedDamageAllocationMinimumTargetCount = 1;

export type RepeatedDamageAllocationAdmissionFacts = {
  readonly hasSpellAccess: true;
  readonly selectedSlotLevel: SpellSlotLevel;
  readonly repeatedEffectCount: number;
};

export type RepeatedDamageAllocationInvocationFacts =
  RepeatedDamageAllocationAdmissionFacts & {
    readonly targetCount: number;
    readonly targetsAreValid: boolean;
  };

export type RepeatedDamageAllocationInvocationResourceFacts =
  RepeatedDamageAllocationInvocationFacts & {
    readonly invocationAction: "magicAction";
    readonly slotSpend: {
      readonly tag: "spellSlot";
      readonly minimumSlotLevel: SpellSlotLevel;
    };
    readonly targetCardinality: {
      readonly tag: "bounded";
      readonly minimumTargetCount: typeof repeatedDamageAllocationMinimumTargetCount;
      readonly maximumTargetCount: number;
    };
  };

const repeatedDamageAllocationActionKindByInvocationAction = {
  magicAction: "magic",
} as const satisfies Record<
  RepeatedDamageAllocationInvocationResourceFacts["invocationAction"],
  "magic"
>;

export type RepeatedDamageAllocationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "repeatedDamageAllocation" }
>;

export function repeatedDamageAllocationAdmissionFacts(input: {
  readonly selectedSlotLevel: SpellSlotLevel;
  readonly repeatedEffectCount: number;
}): RepeatedDamageAllocationAdmissionFacts {
  return {
    hasSpellAccess: true,
    selectedSlotLevel: input.selectedSlotLevel,
    repeatedEffectCount: input.repeatedEffectCount,
  };
}

export function repeatedDamageAllocationAdmissionFactsForInvocation(
  invocation: RepeatedDamageAllocationInvocation,
): RepeatedDamageAllocationAdmissionFacts {
  return repeatedDamageAllocationAdmissionFacts({
    selectedSlotLevel: invocation.resource.slotLevel,
    repeatedEffectCount: invocation.targeting.repeatedEffectCount,
  });
}

export function repeatedDamageAllocationInvocationFacts(input: {
  readonly invocation: RepeatedDamageAllocationInvocation;
  readonly targetCount: number;
  readonly targetsAreValid: boolean;
}): RepeatedDamageAllocationInvocationFacts {
  return {
    ...repeatedDamageAllocationAdmissionFactsForInvocation(input.invocation),
    targetCount: input.targetCount,
    targetsAreValid: input.targetsAreValid,
  };
}

export function repeatedDamageAllocationInvocationResourceFacts(
  facts: RepeatedDamageAllocationInvocationFacts,
): RepeatedDamageAllocationInvocationResourceFacts {
  return {
    ...facts,
    invocationAction: "magicAction",
    slotSpend: {
      tag: "spellSlot",
      minimumSlotLevel: repeatedDamageAllocationMinimumSlotLevel,
    },
    targetCardinality: repeatedDamageAllocationTargetCardinality(facts),
  };
}

export function repeatedDamageAllocationTargetCardinality(
  facts:
    | RepeatedDamageAllocationAdmissionFacts
    | RepeatedDamageAllocationInvocationFacts,
): RepeatedDamageAllocationInvocationResourceFacts["targetCardinality"] {
  return {
    tag: "bounded",
    minimumTargetCount: repeatedDamageAllocationMinimumTargetCount,
    maximumTargetCount: facts.repeatedEffectCount,
  };
}

export function legalRepeatedDamageAllocationInvocationFacts(
  facts: RepeatedDamageAllocationInvocationFacts,
): boolean {
  const resourceFacts = repeatedDamageAllocationInvocationResourceFacts(facts);
  return (
    resourceFacts.hasSpellAccess &&
    resourceFacts.selectedSlotLevel >=
      resourceFacts.slotSpend.minimumSlotLevel &&
    resourceFacts.targetCount >=
      resourceFacts.targetCardinality.minimumTargetCount &&
    resourceFacts.targetCount <=
      resourceFacts.targetCardinality.maximumTargetCount
  );
}

export function repeatedDamageAllocationInvocationCanAffectTargets(
  facts: RepeatedDamageAllocationInvocationFacts,
): boolean {
  return (
    legalRepeatedDamageAllocationInvocationFacts(facts) && facts.targetsAreValid
  );
}

export function repeatedDamageAllocationActionKind(
  facts: RepeatedDamageAllocationInvocationResourceFacts,
): "magic" {
  return repeatedDamageAllocationActionKindByInvocationAction[
    facts.invocationAction
  ];
}
