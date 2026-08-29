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
  parseStatBlockAttackDamageSelection,
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

const INVALID_COMPONENT_ROLE_SELECTIONS = [
  {
    name: "rejects a bonus-only selection",
    selection: [
      {
        componentRef: statBlockAdvantageBonusDamageComponentRef,
        notation: "static",
      },
    ],
  },
  {
    name: "rejects a gapped base ordinal",
    selection: [
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation: "static",
      },
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(3),
        ),
        notation: "rolled",
      },
    ],
  },
  {
    name: "rejects out-of-order base ordinals",
    selection: [
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(2),
        ),
        notation: "rolled",
      },
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation: "static",
      },
    ],
  },
  {
    name: "rejects an Advantage bonus before the base components",
    selection: [
      {
        componentRef: statBlockAdvantageBonusDamageComponentRef,
        notation: "rolled",
      },
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation: "static",
      },
    ],
  },
  {
    name: "rejects a duplicate Advantage bonus role",
    selection: [
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation: "static",
      },
      {
        componentRef: statBlockAdvantageBonusDamageComponentRef,
        notation: "rolled",
      },
      {
        componentRef: statBlockAdvantageBonusDamageComponentRef,
        notation: "static",
      },
    ],
  },
] as const;

describe("Stat Block per-component damage selection properties", () => {
  it("round-trips every canonical component-role selection", () => {
    fc.assert(
      fc.property(
        fc.array(notationArbitrary, { minLength: 1, maxLength: 6 }),
        fc.option(notationArbitrary, { nil: undefined }),
        (baseNotations, advantageBonusNotation) => {
          const selections = componentSelections(
            baseNotations,
            advantageBonusNotation,
          );
          const parsedSelection = statBlockAttackDamageSelection(selections);
          expect(Either.isRight(parsedSelection)).toBe(true);
          if (Either.isLeft(parsedSelection)) return;
          const selection = parsedSelection.right;
          const encoded = Schema.encodeSync(StatBlockAttackDamageSelection)(
            selection,
          );
          const decoded = Schema.decodeUnknownEither(
            StatBlockAttackDamageSelection,
          )(encoded);

          expect(Either.isRight(decoded)).toBe(true);
          if (Either.isLeft(decoded)) return;
          expect(
            statBlockAttackDamageSelectionsEqual(selection, decoded.right),
          ).toBe(true);
          expect(statBlockAttackDamageSelectionKey(decoded.right)).toBe(
            statBlockAttackDamageSelectionKey(selection),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it.each(INVALID_COMPONENT_ROLE_SELECTIONS)("$name", ({ selection }) => {
    const result = statBlockAttackDamageSelection(selection);
    expect(Either.isLeft(result)).toBe(true);
  });

  it("rejects a malformed zero base ordinal at the raw boundary", () => {
    expect(
      Either.isLeft(
        parseStatBlockAttackDamageSelection([
          {
            componentRef: { kind: "baseDamageComponent", ordinal: 0 },
            notation: "static",
          },
        ]),
      ),
    ).toBe(true);
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
          const decoded = statBlockAttackDamageSelection([
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
