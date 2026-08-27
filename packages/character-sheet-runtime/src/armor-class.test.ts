// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.armor-class-base-formula
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B barbarian_unarmored_defense monk_unarmored_defense
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A15 sorcerer_draconic_resilience
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  Result,
  abilityScoreAssignment,
  armorClassBuild,
  characterSheetArmorClass,
  characterSheetArmorClassProjection,
  characterSheetArmorClassState,
  characterSheetUnarmoredArmorClassBase,
  currentArmorClass,
  draconicResilienceArmorClassProjectionTestName,
  expectRight,
  requireRight,
  unitLibrary,
} from "./test-support.test-support.ts";

describe("Character Sheet runtime / armor class", () => {
  test("derives default unarmored Armor Class from Dexterity", () => {
    const input = {
      build: armorClassBuild({ startingClass: "class_fighter" }),
      unitLibrary,
    };
    const state = requireRight(characterSheetArmorClassState(input));

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
    expect(requireRight(characterSheetArmorClass(input))).toBe(12);
    expect(
      requireRight(
        characterSheetUnarmoredArmorClassBase({
          ...input,
          wieldingShield: false,
        }),
      ),
    ).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
  });

  test("derives Barbarian Unarmored Defense and still allows Shield bonus", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          shield: true,
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "unarmored_defense",
      sourceUnitId: authoredUnitId("barbarian_unarmored_defense"),
    });
    expect(currentArmorClass(state)).toBe(15);
  });

  test(draconicResilienceArmorClassProjectionTestName, () => {
    const baseSorcererBuild = {
      ...armorClassBuild({
        startingClass: "class_sorcerer",
        advancements: ["class_sorcerer", "class_sorcerer"],
      }),
      abilityScores: expectRight(
        abilityScoreAssignment({
          str: 8,
          dex: 14,
          con: 12,
          int: 10,
          wis: 10,
          cha: 16,
        }),
      ),
    };
    expect(
      currentArmorClass(
        requireRight(
          characterSheetArmorClassState({
            build: baseSorcererBuild,
            unitLibrary,
          }),
        ),
      ),
    ).toBe(12);

    const state = requireRight(
      characterSheetArmorClassState({
        build: {
          ...baseSorcererBuild,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_sorcerer"),
              unitId: authoredUnitId("subclass_sorcerer_draconic_sorcery"),
            },
          ],
        },
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "class_feature_base_plus_ability",
      sourceUnitId: authoredUnitId("sorcerer_draconic_resilience"),
      abilityModifiers: ["dex", "cha"],
    });
    expect(currentArmorClass(state)).toBe(15);
  });

  test("suppresses Monk Unarmored Defense while wielding a Shield", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_monk", shield: true }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("requires an Armor Class base choice when multiple class formulas apply", () => {
    const input = {
      build: armorClassBuild({
        startingClass: "class_barbarian",
        advancements: ["class_monk"],
      }),
      unitLibrary,
    };
    const result = characterSheetArmorClassState(input);

    expect(Result.isFailure(result)).toBe(true);
    expect(Result.isFailure(characterSheetArmorClass(input))).toBe(true);
  });

  test("rejects missing class-feature Units while deriving Armor Class base formulas", () => {
    const result = characterSheetArmorClassState({
      build: {
        ...armorClassBuild({ startingClass: "class_fighter" }),
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_fighter"),
            unitId: authoredUnitId("missing_unarmored_defense"),
          },
        ],
      },
      unitLibrary,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { message: "Unknown Unit id: missing_unarmored_defense" },
    });
  });

  test("uses the selected Armor Class base formula for multiclass characters", () => {
    const monkState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: authoredUnitId("monk_unarmored_defense"),
        },
      }),
    );
    const barbarianState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: authoredUnitId("barbarian_unarmored_defense"),
        },
      }),
    );

    expect(monkState.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: authoredUnitId("monk_unarmored_defense"),
    });
    expect(currentArmorClass(monkState)).toBe(15);
    expect(barbarianState.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: authoredUnitId("barbarian_unarmored_defense"),
    });
    expect(currentArmorClass(barbarianState)).toBe(13);
  });

  test("uses worn armor instead of unarmored base formulas", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          armor: "armor_chain_mail",
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "armor",
      category: "heavy",
    });
    expect(currentArmorClass(state)).toBe(16);
  });

  test("retains main-hand and off-hand weapon use in Armor Class state", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_fighter",
          weapon: "weapon_longsword",
          offHandWeapon: "weapon_dagger",
        }),
        unitLibrary,
      }),
    );

    expect(state.leftHandUse).toBe("offWeapon");
    expect(state.rightHandUse).toBe("mainWeapon");
  });

  test("projects Armor Class selected-reference qRoute through the public projection entrypoint", () => {
    const projection = requireRight(
      characterSheetArmorClassProjection({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
          shield: true,
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: authoredUnitId("barbarian_unarmored_defense"),
        },
      }),
    );

    expect(currentArmorClass(projection.state)).toBe(15);
    expect(projection.armorClass).toBe(15);
    expect(projection.qRoute).toEqual([
      {
        kind: "retainCharacterSheetSelectedReferences",
        subject: "selectedReferenceProjection",
        owner: "selectedReference",
      },
      {
        kind: "projectCharacterSheetFacts",
        subject: "armorClassProjection",
        owner: "buildProjection",
      },
    ]);
  });
});
