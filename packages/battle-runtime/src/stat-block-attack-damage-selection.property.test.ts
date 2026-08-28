import fc from "fast-check";
import { Either, Schema } from "effect";
import { describe, expect, it } from "vitest";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

import {
  statBlockAttackDamageSelectionForDamage,
  type StatBlockAttackDamage,
  type StatBlockAttackDamageComponent,
} from "./battle-action-options.ts";
import {
  selectedStatBlockAttackDamageHasCanonicalComponentRefs,
  selectedStatBlockAttackDamageOptions,
} from "./statblock-attack-damage-support.ts";
import {
  StatBlockAttackDamageSelection,
  statBlockAdvantageBonusDamageComponentRef,
  statBlockAttackDamageSelection,
  statBlockAttackDamageSelectionKey,
  statBlockAttackDamageSelectionsEqual,
  statBlockBaseDamageComponentOrdinal,
  statBlockBaseDamageComponentRef,
  type StatBlockAttackDamageComponentRef,
  type StatBlockAttackDamageComponentSelection,
  type StatBlockDamageComponentNotation,
} from "./stat-block-attack-damage-selection.ts";

const notationArbitrary = fc.constantFrom("rolled" as const, "static" as const);

const componentShapeArbitrary = fc.constantFrom(
  "intrinsicStatic" as const,
  "rollable" as const,
);

const advantageBonusShapeArbitrary = fc.constantFrom(
  "none" as const,
  "intrinsicStatic" as const,
  "rollable" as const,
);

describe("Stat Block per-component damage selection properties", () => {
  it("has permutation-independent equality and canonical keys", () => {
    fc.assert(
      fc.property(
        fc.array(notationArbitrary, { minLength: 1, maxLength: 6 }),
        fc.option(notationArbitrary, { nil: undefined }),
        (baseNotations, advantageBonusNotation) => {
          const selections = componentSelections(
            baseNotations,
            advantageBonusNotation,
          );
          const forward = statBlockAttackDamageSelection(selections);
          const [firstReversedSelection, ...remainingReversedSelections] = [
            ...selections,
          ].reverse();
          if (firstReversedSelection === undefined) {
            throw new Error(
              "A reversed non-empty selection must remain non-empty.",
            );
          }
          const reverse = statBlockAttackDamageSelection([
            firstReversedSelection,
            ...remainingReversedSelections,
          ]);

          expect(statBlockAttackDamageSelectionsEqual(forward, reverse)).toBe(
            true,
          );
          expect(statBlockAttackDamageSelectionKey(forward)).toBe(
            statBlockAttackDamageSelectionKey(reverse),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects every duplicate component role regardless of notation", () => {
    const componentRefArbitrary = fc.oneof(
      fc
        .integer({ min: 1, max: 20 })
        .map((ordinal) =>
          statBlockBaseDamageComponentRef(
            statBlockBaseDamageComponentOrdinal(ordinal),
          ),
        ),
      fc.constant(statBlockAdvantageBonusDamageComponentRef),
    );

    fc.assert(
      fc.property(
        componentRefArbitrary,
        notationArbitrary,
        notationArbitrary,
        (componentRef, firstNotation, secondNotation) => {
          const decoded = Schema.decodeUnknownEither(
            StatBlockAttackDamageSelection,
          )([
            { componentRef, notation: firstNotation },
            { componentRef, notation: secondNotation },
          ]);
          expect(Either.isLeft(decoded)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("enumerates the exact canonical product of each component's admitted choices", () => {
    fc.assert(
      fc.property(
        fc.array(componentShapeArbitrary, { minLength: 1, maxLength: 5 }),
        advantageBonusShapeArbitrary,
        (baseShapes, advantageBonusShape) => {
          const damage = projectedDamage(baseShapes, advantageBonusShape);
          const options = selectedStatBlockAttackDamageOptions(damage);
          const rollableComponentCount =
            baseShapes.filter((shape) => shape === "rollable").length +
            (advantageBonusShape === "rollable" ? 1 : 0);
          const expectedOptionCount = 2 ** rollableComponentCount;
          const selectionKeys = options.map((option) =>
            statBlockAttackDamageSelectionKey(
              statBlockAttackDamageSelectionForDamage(option),
            ),
          );

          expect(options).toHaveLength(expectedOptionCount);
          expect(new Set(selectionKeys).size).toBe(expectedOptionCount);
          expect(
            options.every(
              selectedStatBlockAttackDamageHasCanonicalComponentRefs,
            ),
          ).toBe(true);
          expect(
            options.every(
              (option) =>
                statBlockAttackDamageSelectionForDamage(option).length ===
                baseShapes.length + (advantageBonusShape === "none" ? 0 : 1),
            ),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

function componentSelections(
  baseNotations: readonly StatBlockDamageComponentNotation[],
  advantageBonusNotation: StatBlockDamageComponentNotation | undefined,
): ReadonlyNonEmptyArray<StatBlockAttackDamageComponentSelection> {
  const baseSelections = baseNotations.map(
    (notation, index): StatBlockAttackDamageComponentSelection => ({
      componentRef: statBlockBaseDamageComponentRef(
        statBlockBaseDamageComponentOrdinal(index + 1),
      ),
      notation,
    }),
  );
  const [first, ...remaining] = baseSelections;
  if (first === undefined) {
    throw new Error("Property generator must supply one base component.");
  }
  return [
    first,
    ...remaining,
    ...(advantageBonusNotation === undefined
      ? []
      : [
          {
            componentRef: statBlockAdvantageBonusDamageComponentRef,
            notation: advantageBonusNotation,
          } as const,
        ]),
  ];
}

function projectedDamage(
  baseShapes: readonly ("intrinsicStatic" | "rollable")[],
  advantageBonusShape: "none" | "intrinsicStatic" | "rollable",
): StatBlockAttackDamage {
  const baseComponents = baseShapes.map((shape, index) =>
    projectedDamageComponent(
      statBlockBaseDamageComponentRef(
        statBlockBaseDamageComponentOrdinal(index + 1),
      ),
      shape,
    ),
  );
  const [first, ...remaining] = baseComponents;
  if (first === undefined) {
    throw new Error("Property generator must supply one base component.");
  }
  return {
    baseComponents: [first, ...remaining],
    ...(advantageBonusShape === "none"
      ? {}
      : {
          advantageBonus: projectedDamageComponent(
            statBlockAdvantageBonusDamageComponentRef,
            advantageBonusShape,
          ),
        }),
  };
}

function projectedDamageComponent(
  componentRef: StatBlockAttackDamageComponentRef,
  shape: "intrinsicStatic" | "rollable",
): StatBlockAttackDamageComponent {
  return shape === "rollable"
    ? {
        componentRef,
        damageType: "slashing",
        expr: { dice: 1, dieSize: 6, flat: 1 },
        static: 4,
      }
    : {
        componentRef,
        damageType: "slashing",
        static: 3,
      };
}
