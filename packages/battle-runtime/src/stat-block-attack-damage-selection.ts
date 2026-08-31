// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.attack-procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
import type { PositiveInteger, ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Brand, Match, Schema } from "effect";

export const STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS = [
  "rolled",
  "static",
] as const;
export type StatBlockDamageComponentNotation =
  (typeof STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS)[number];

export const StatBlockBaseDamageComponentOrdinal = Schema.Int.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(1)),
  Schema.brand("StatBlockBaseDamageComponentOrdinal"),
);
export type StatBlockBaseDamageComponentOrdinal =
  typeof StatBlockBaseDamageComponentOrdinal.Type;
const makeStatBlockBaseDamageComponentOrdinal =
  Brand.nominal<StatBlockBaseDamageComponentOrdinal>();
const decodeStatBlockBaseDamageComponentOrdinal = Schema.decodeUnknownResult(
  StatBlockBaseDamageComponentOrdinal,
);

export function parseStatBlockBaseDamageComponentOrdinal(input: unknown) {
  return decodeStatBlockBaseDamageComponentOrdinal(input);
}

export function statBlockBaseDamageComponentOrdinal(
  value: PositiveInteger,
): StatBlockBaseDamageComponentOrdinal {
  return makeStatBlockBaseDamageComponentOrdinal(value);
}

export const StatBlockAttackDamageComponentRef = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("baseDamageComponent"),
    ordinal: StatBlockBaseDamageComponentOrdinal,
  }),
  Schema.Struct({
    kind: Schema.Literal("advantageBonusDamageComponent"),
  }),
]);
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
  notation: Schema.Literals(STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS),
});
export type StatBlockAttackDamageComponentSelection =
  typeof StatBlockAttackDamageComponentSelection.Type;

export const StatBlockAttackDamageSelection = Schema.NonEmptyArray(
  StatBlockAttackDamageComponentSelection,
).pipe(
  Schema.check(
    Schema.makeFilter(
      statBlockAttackDamageSelectionHasCanonicalComponentRoles,
      {
        message:
          "Stat Block Attack damage selection must list base component refs 1 through N in order, followed only by the optional Advantage bonus component ref.",
      },
    ),
  ),
  Schema.brand("StatBlockAttackDamageSelection"),
);
export type StatBlockAttackDamageSelection =
  typeof StatBlockAttackDamageSelection.Type;

const decodeStatBlockAttackDamageSelection = Schema.decodeUnknownResult(
  StatBlockAttackDamageSelection,
);

export function parseStatBlockAttackDamageSelection(input: unknown) {
  return decodeStatBlockAttackDamageSelection(input);
}

export function statBlockAttackDamageSelection(
  selections: ReadonlyNonEmptyArray<StatBlockAttackDamageComponentSelection>,
) {
  return decodeStatBlockAttackDamageSelection(selections);
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

function statBlockAttackDamageSelectionHasCanonicalComponentRoles(
  selection: ReadonlyNonEmptyArray<StatBlockAttackDamageComponentSelection>,
): boolean {
  const [firstSelection, ...remainingSelections] = selection;
  return statBlockAttackDamageComponentRefsMatchSelectionRoles([
    firstSelection.componentRef,
    ...remainingSelections.map(({ componentRef }) => componentRef),
  ]);
}

export function statBlockAttackDamageComponentRefsMatchSelectionRoles(
  componentRefs: ReadonlyNonEmptyArray<StatBlockAttackDamageComponentRef>,
): boolean {
  const [firstComponentRef] = componentRefs;
  return (
    firstComponentRef.kind === "baseDamageComponent" &&
    componentRefs.every((componentRef, index) =>
      Match.value(componentRef).pipe(
        Match.discriminatorsExhaustive("kind")({
          baseDamageComponent: ({ ordinal }) => ordinal === index + 1,
          advantageBonusDamageComponent: () =>
            index === componentRefs.length - 1,
        }),
      ),
    )
  );
}
