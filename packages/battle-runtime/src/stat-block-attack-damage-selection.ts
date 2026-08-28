// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.attack-procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match, Schema } from "effect";

export const STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS = [
  "rolled",
  "static",
] as const;
export type StatBlockDamageComponentNotation =
  (typeof STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS)[number];

export const StatBlockBaseDamageComponentOrdinal = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("StatBlockBaseDamageComponentOrdinal"),
);
export type StatBlockBaseDamageComponentOrdinal =
  typeof StatBlockBaseDamageComponentOrdinal.Type;
export const statBlockBaseDamageComponentOrdinal: (
  value: number,
) => StatBlockBaseDamageComponentOrdinal =
  StatBlockBaseDamageComponentOrdinal.make;

export const StatBlockAttackDamageComponentRef = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("baseDamageComponent"),
    ordinal: StatBlockBaseDamageComponentOrdinal,
  }),
  Schema.Struct({
    kind: Schema.Literal("advantageBonusDamageComponent"),
  }),
);
export type StatBlockAttackDamageComponentRef =
  typeof StatBlockAttackDamageComponentRef.Type;

export function statBlockBaseDamageComponentRef(
  ordinal: StatBlockBaseDamageComponentOrdinal,
): StatBlockAttackDamageComponentRef {
  return { kind: "baseDamageComponent", ordinal };
}

export const statBlockAdvantageBonusDamageComponentRef = {
  kind: "advantageBonusDamageComponent",
} as const satisfies StatBlockAttackDamageComponentRef;

export const StatBlockAttackDamageComponentSelection = Schema.Struct({
  componentRef: StatBlockAttackDamageComponentRef,
  notation: Schema.Literal(...STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS),
});
export type StatBlockAttackDamageComponentSelection =
  typeof StatBlockAttackDamageComponentSelection.Type;

export const StatBlockAttackDamageSelection = Schema.NonEmptyArray(
  StatBlockAttackDamageComponentSelection,
).pipe(
  Schema.filter(statBlockAttackDamageSelectionHasUniqueComponentRefs, {
    message: () =>
      "Stat Block Attack damage selection must name each component at most once.",
  }),
  Schema.brand("StatBlockAttackDamageSelection"),
);
export type StatBlockAttackDamageSelection =
  typeof StatBlockAttackDamageSelection.Type;

export function statBlockAttackDamageSelection(
  selections: ReadonlyNonEmptyArray<StatBlockAttackDamageComponentSelection>,
): StatBlockAttackDamageSelection {
  return StatBlockAttackDamageSelection.make(selections);
}

export function statBlockAttackDamageComponentRefKey(
  componentRef: StatBlockAttackDamageComponentRef,
): string {
  return Match.value(componentRef).pipe(
    Match.discriminatorsExhaustive("kind")({
      baseDamageComponent: ({ ordinal }) => `base:${String(ordinal)}`,
      advantageBonusDamageComponent: () => "advantageBonus",
    }),
  );
}

export function statBlockAttackDamageSelectionKey(
  selection: StatBlockAttackDamageSelection,
): string {
  const entries = selection
    .map(
      ({ componentRef, notation }) =>
        [statBlockAttackDamageComponentRefKey(componentRef), notation] as const,
    )
    .sort(([leftRef], [rightRef]) =>
      String(leftRef).localeCompare(String(rightRef)),
    );
  return JSON.stringify(entries);
}

export function statBlockAttackDamageSelectionsEqual(
  left: StatBlockAttackDamageSelection,
  right: StatBlockAttackDamageSelection,
): boolean {
  return (
    statBlockAttackDamageSelectionKey(left) ===
    statBlockAttackDamageSelectionKey(right)
  );
}

export function statBlockAttackDamageSelectionUsesOnlyComponentNotation(
  selection: StatBlockAttackDamageSelection,
  notation: StatBlockDamageComponentNotation,
): boolean {
  return selection.every((component) => component.notation === notation);
}

function statBlockAttackDamageSelectionHasUniqueComponentRefs(
  selection: ReadonlyNonEmptyArray<StatBlockAttackDamageComponentSelection>,
): boolean {
  const componentRefs = selection.map(({ componentRef }) =>
    statBlockAttackDamageComponentRefKey(componentRef),
  );
  return new Set(componentRefs).size === componentRefs.length;
}
