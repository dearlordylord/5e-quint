// KERNEL-COVERAGE: parity-witness SHEET.FEATURE_RESOURCES.USE_COUNT_RECOVERY
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.use-count-resource-recovery
import { describe, expect, test } from "vitest";
import { Option, Result } from "effect";
import { projectFixtureCatalog } from "./class-feature-catalog.test-support.ts";
import { unitId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import { restoreUseCountResourceWithSpellSlot } from "./use-count-resource-recovery.ts";
import {
  completeShortRest,
  completeLongRest,
  requireSuccess,
  unitLibrary,
} from "./test-support.test-support.ts";
import { characterSheetSpellSlots } from "./spell-slots.ts";
import {
  bardSheet,
  inspirationExpended,
} from "./use-count-resource-recovery.test-support.ts";
describe("source-linked use-count recovery", () => {
  test("Font changes the existing pool's Short Rest recovery at level five", () => {
    expect(
      inspirationExpended(
        requireSuccess(completeShortRest({ sheet: bardSheet(4), unitLibrary })),
      ),
    ).toBe(1);
    expect(
      inspirationExpended(
        requireSuccess(completeShortRest({ sheet: bardSheet(5), unitLibrary })),
      ),
    ).toBe(0);
    expect(
      inspirationExpended(
        requireSuccess(completeLongRest({ sheet: bardSheet(5), unitLibrary })),
      ),
    ).toBe(0);
  });
  test("a slot exchange atomically spends one slot and restores one use", () => {
    const sheet = bardSheet(5);
    const result = requireSuccess(
      restoreUseCountResourceWithSpellSlot({
        sheet,
        unitLibrary,
        featureUnitId: unitId("bard_font_of_inspiration"),
        spellLevel: spellSlotLevel(2),
      }),
    );
    expect(inspirationExpended(result)).toBe(0);
    expect(
      characterSheetSpellSlots(result)?.find((slot) => slot.spellLevel === 2)
        ?.expended,
    ).toBe(1);
  });
  test.each([
    {
      level: 4 as const,
      expended: 1,
      featureUnitId: "bard_font_of_inspiration",
    },
    {
      level: 5 as const,
      expended: 0,
      featureUnitId: "bard_font_of_inspiration",
    },
    {
      level: 5 as const,
      expended: 1,
      featureUnitId: "bard_bardic_inspiration",
    },
  ])(
    "rejects missing feature, full pool, or forged owner %#",
    ({ level, expended, featureUnitId }) => {
      const result = restoreUseCountResourceWithSpellSlot({
        sheet: bardSheet(level, expended),
        unitLibrary,
        featureUnitId: unitId(featureUnitId),
        spellLevel: spellSlotLevel(1),
      });
      expect(result._tag).toBe("Failure");
    },
  );
});

test("unavailable Spell Slots reject recovery without changing the pool", () => {
  const sheet = bardSheet(5);
  for (const spellSlotSource of [undefined, "ordinary", "created"] as const) {
    const result = restoreUseCountResourceWithSpellSlot({
      sheet,
      unitLibrary,
      featureUnitId: unitId("bard_font_of_inspiration"),
      spellLevel: spellSlotLevel(9),
      ...(spellSlotSource === undefined ? {} : { spellSlotSource }),
    });
    expect(Result.isFailure(result)).toBe(true);
    expect(inspirationExpended(sheet)).toBe(1);
    expect(
      characterSheetSpellSlots(sheet)?.every((slot) => slot.expended === 0),
    ).toBe(true);
  }
});

test("unreadable recovery and resource records return typed errors", () => {
  const sheet = bardSheet(5);
  for (const missing of [
    "bard_font_of_inspiration",
    "bard_bardic_inspiration",
  ] as const) {
    const catalog = projectFixtureCatalog(unitLibrary, (unit) =>
      unit.id === missing ? Option.none() : Option.some(unit),
    );
    const result = restoreUseCountResourceWithSpellSlot({
      sheet,
      unitLibrary: catalog,
      featureUnitId: unitId("bard_font_of_inspiration"),
      spellLevel: spellSlotLevel(1),
    });
    expect(Result.isFailure(result)).toBe(true);
    expect(inspirationExpended(sheet)).toBe(1);
  }
});

test("a recovery declaration cannot spend a slot without its linked pool", () => {
  const sheet = bardSheet(5);
  const catalog = projectFixtureCatalog(unitLibrary, (unit) =>
    unit.kind === "class_feature" &&
    unit.className === "bard" &&
    unit.mechanics.family === "use_count_resource_recovery"
      ? Option.some({
          ...unit,
          mechanics: {
            ...unit.mechanics,
            resourceUnitId: unitId("synthetic_absent_use_pool"),
            family: "use_count_resource_recovery" as const,
          },
        })
      : Option.some(unit),
  );
  expect(
    restoreUseCountResourceWithSpellSlot({
      sheet,
      unitLibrary: catalog,
      featureUnitId: unitId("bard_font_of_inspiration"),
      spellLevel: spellSlotLevel(1),
    }),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      message: "Recovery feature requires its linked use-count resource.",
    },
  });
  expect(inspirationExpended(sheet)).toBe(1);
});
