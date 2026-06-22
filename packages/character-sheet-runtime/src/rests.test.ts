// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.short-rest-spell-slot-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.weapon-mastery-reselection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.pact-slot-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.rest-triggered-heroic-inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B wizard_arcane_recovery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection AT-L1-04 fighter_weapon_mastery barbarian_weapon_mastery paladin_weapon_mastery ranger_weapon_mastery rogue_weapon_mastery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-WARLOCK-MAGICAL-CUNNING warlock_magical_cunning
import { Option } from "effect";
import { describe, expect, test } from "vitest";
import {
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  DieRollResult,
  Hp,
  abilityScoreAssignment,
  armorClassBuild,
  build,
  characterSheetCurrentHp,
  characterSheetHitDice,
  characterSheetHitPointMaximum,
  characterSheetId,
  characterSheetLongRestCalendarGate,
  characterSheetPactSlots,
  characterSheetSpellSlots,
  completeLongRest,
  completeMagicalCunningRite,
  completeShortRest,
  createFreshCharacterSheet,
  elapsedTimeTicks,
  expectRight,
  finishLongRest,
  finishShortRest,
  interruptLongRest,
  interruptShortRest,
  requireRight,
  resourceCount,
  selectedClassChoiceUnitIds,
  spellSlotLevel,
  startLongRest,
  startShortRest,
  unitLibrary,
  warlockMagicalCunningBuild,
  weaponMasteryBuild,
  weaponMasteryLongRestReselectionTestName,
  wizardBuild,
  wizardWarlockBuild,
} from "./test-support.ts";
import type {
  CharacterBuild,
  CharacterSheetWeaponMasteryReselection,
} from "./test-support.ts";

const magicalCunningPactSlotRecoveryTestName =
  "Magical Cunning completed 1-minute rite recovers half rounded up expended Pact Slots once per Long Rest and resets on Long Rest";
const magicalCunningRoundUpTestName =
  "Magical Cunning rounds a three-slot Pact Magic maximum up";
const magicalCunningFeatureOwnershipTestName =
  "Magical Cunning requires Warlock level 2 feature ownership";

describe("Character Sheet runtime / rests", () => {
  test("rest start gates keep calendar wait separate from rest benefits", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rest-start"),
        build,
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const zeroHp = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rest-start-zero"),
        build,
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(startShortRest({ sheet })).toMatchObject({
      _tag: "Right",
      right: {
        tag: "shortRestStarted",
        requiredRestTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      },
    });
    const shortRest = requireRight(startShortRest({ sheet }));
    expect(
      finishShortRest({
        rest: shortRest,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
        ),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Short Rest requires 1 hour before benefits can be received.",
      },
    });
    expect(startShortRest({ sheet: zeroHp })).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Short Rest requires the Character Sheet to have at least 1 HP.",
      },
    });
    expect(
      startLongRest({ sheet: zeroHp, timing: { tag: "noPriorLongRest" } }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest requires the Character Sheet to have at least 1 HP.",
      },
    });

    const oneTickBeforeWait = elapsedTimeTicks(
      Number(CHARACTER_SHEET_LONG_REST_WAIT_TICKS) - 1,
    );
    expect(
      characterSheetLongRestCalendarGate({
        tag: "elapsedSinceLastLongRest",
        elapsedTicks: oneTickBeforeWait,
      }),
    ).toEqual({
      tag: "mustWait",
      requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
      remainingTicks: elapsedTimeTicks(1),
    });
    expect(
      startLongRest({
        sheet,
        timing: {
          tag: "elapsedSinceLastLongRest",
          elapsedTicks: oneTickBeforeWait,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest requires waiting 16 hours after finishing the previous Long Rest.",
      },
    });
    expect(
      startLongRest({
        sheet,
        timing: {
          tag: "elapsedSinceLastLongRest",
          elapsedTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
        },
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        tag: "longRestStarted",
        requiredRestTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
        nextLongRestStartWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
      },
    });
    const longRest = requireRight(
      startLongRest({
        sheet,
        timing: {
          tag: "elapsedSinceLastLongRest",
          elapsedTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
        },
      }),
    );
    expect(
      finishLongRest({
        rest: longRest,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) - 1,
        ),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest requires the full required duration before benefits can be received.",
      },
    });
  });

  test("Long Rest restores HP, Hit Point Dice, maximum reduction, Spell Slots, Pact Slots, and Arcane Recovery use", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:long-rest"),
        build: wizardWarlockBuild(),
        currentHp: Hp(1),
        tempHp: Hp(3),
        hitPointMaximumReduction: Hp(4),
        unitLibrary,
        spentHitDice: [
          { classUnitId: "class_wizard", spent: resourceCount(1) },
        ],
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(2),
          },
        ],
        pactSlots: { expended: resourceCount(1) },
        restFeatureUses: [
          {
            tag: "arcaneRecovery",
            usedSinceLongRest: true,
          },
        ],
      }),
    );

    const rested = requireRight(completeLongRest({ sheet, unitLibrary }));

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: characterSheetHitPointMaximum(rested),
      tempHp: 0,
    });
    expect(rested.hitPointMaximumReduction).toBe(0);
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1, spent: 0 },
    ]);
    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 2, expended: 0 },
    ]);
    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
    expect(rested.restFeatureUses).toEqual([]);
  });

  test("Long Rest grants Heroic Inspiration from retained rest-triggered feature facts", () => {
    const humanBuild: CharacterBuild = {
      ...armorClassBuild({ startingClass: "class_fighter" }),
      species: "species_human",
      speciesSize: "medium",
    };

    for (const initialHeroicInspiration of [
      CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
      CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
    ] as const) {
      const sheet = requireRight(
        createFreshCharacterSheet({
          characterId: characterSheetId(
            `character:resourceful:${initialHeroicInspiration.tag}`,
          ),
          build: humanBuild,
          currentHp: Hp(6),
          tempHp: Hp(0),
          unitLibrary,
          heroicInspiration: initialHeroicInspiration,
        }),
      );

      const rested = requireRight(completeLongRest({ sheet, unitLibrary }));

      expect(rested.heroicInspiration).toEqual(
        CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
      );
    }
  });

  test("Long Rest preserves Heroic Inspiration state without retained rest-triggered feature facts", () => {
    for (const initialHeroicInspiration of [
      CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
      CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
    ] as const) {
      const sheet = requireRight(
        createFreshCharacterSheet({
          characterId: characterSheetId(
            `character:no-resourceful:${initialHeroicInspiration.tag}`,
          ),
          build,
          currentHp: Hp(6),
          tempHp: Hp(0),
          unitLibrary,
          heroicInspiration: initialHeroicInspiration,
        }),
      );

      const rested = requireRight(completeLongRest({ sheet, unitLibrary }));

      expect(rested.heroicInspiration).toEqual(initialHeroicInspiration);
    }
  });

  test("Long Rest reports unknown retained Heroic Inspiration Unit refs", () => {
    const humanBuild: CharacterBuild = {
      ...armorClassBuild({ startingClass: "class_fighter" }),
      species: "species_human",
      speciesSize: "medium",
    };
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:resourceful-missing-unit"),
        build: humanBuild,
        currentHp: Hp(6),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const missingResourcefulUnitLibrary = {
      getUnit: (id: Parameters<typeof unitLibrary.getUnit>[0]) =>
        id === "species_human_resourceful"
          ? Option.none()
          : unitLibrary.getUnit(id),
      requireUnit: (id: Parameters<typeof unitLibrary.requireUnit>[0]) => {
        if (id === "species_human_resourceful") {
          throw new Error("Resourceful fixture Unit is intentionally missing.");
        }
        return unitLibrary.requireUnit(id);
      },
      listUnits: () =>
        unitLibrary
          .listUnits()
          .filter((unit) => unit.id !== "species_human_resourceful"),
    };

    expect(
      completeLongRest({ sheet, unitLibrary: missingResourcefulUnitLibrary }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Unknown Unit id: species_human_resourceful" },
    });
  });

  test(weaponMasteryLongRestReselectionTestName, () => {
    const cases = [
      {
        classUnitId: "class_fighter",
        featureUnitId: "fighter_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger", "weapon_spear"],
        after: ["weapon_longsword", "weapon_dagger", "weapon_shortsword"],
      },
      {
        classUnitId: "class_barbarian",
        featureUnitId: "barbarian_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger"],
        after: ["weapon_longsword", "weapon_shortsword"],
      },
      {
        classUnitId: "class_paladin",
        featureUnitId: "paladin_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger"],
        after: ["weapon_spear", "weapon_flail"],
      },
      {
        classUnitId: "class_ranger",
        featureUnitId: "ranger_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger"],
        after: ["weapon_spear", "weapon_flail"],
      },
      {
        classUnitId: "class_rogue",
        featureUnitId: "rogue_weapon_mastery",
        before: ["weapon_dagger", "weapon_shortbow"],
        after: ["weapon_spear", "weapon_shortsword"],
      },
    ] as const;

    for (const testCase of cases) {
      const sheet = requireRight(
        createFreshCharacterSheet({
          characterId: characterSheetId(
            `character:${testCase.featureUnitId}:long-rest`,
          ),
          build: weaponMasteryBuild({
            startingClass: testCase.classUnitId,
            featureUnitId: testCase.featureUnitId,
            selectedWeaponUnitIds: testCase.before,
          }),
          currentHp: Hp(6),
          tempHp: Hp(2),
          unitLibrary,
        }),
      );
      const reselection = {
        featureUnitId: testCase.featureUnitId,
        selectedWeaponUnitIds: testCase.after,
      } satisfies CharacterSheetWeaponMasteryReselection;

      const rested = requireRight(
        completeLongRest({
          sheet,
          unitLibrary,
          weaponMasteryReselections: [reselection],
        }),
      );

      expect(
        selectedClassChoiceUnitIds(rested.build, testCase.featureUnitId),
      ).toEqual(testCase.after);
      expect(rested.hitPoints).toEqual({
        tag: "positive",
        currentHp: characterSheetHitPointMaximum(rested),
        tempHp: 0,
      });
    }
  });

  test("rejects Weapon Mastery Long Rest reselection above the Surface change count", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:fighter-mastery-reject"),
        build: weaponMasteryBuild({
          startingClass: "class_fighter",
          featureUnitId: "fighter_weapon_mastery",
          selectedWeaponUnitIds: [
            "weapon_longsword",
            "weapon_dagger",
            "weapon_spear",
          ],
        }),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const result = completeLongRest({
      sheet,
      unitLibrary,
      weaponMasteryReselections: [
        {
          featureUnitId: "fighter_weapon_mastery",
          selectedWeaponUnitIds: [
            "weapon_longsword",
            "weapon_shortsword",
            "weapon_flail",
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Weapon Mastery Long Rest reselection changes too many weapon choices.",
      },
    });
  });

  test("uses the class-level Weapon Mastery count for Long Rest reselection", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:fighter-level-4-mastery"),
        build: weaponMasteryBuild({
          startingClass: "class_fighter",
          advancements: ["class_fighter", "class_fighter", "class_fighter"],
          featureUnitId: "fighter_weapon_mastery",
          selectedWeaponUnitIds: [
            "weapon_longsword",
            "weapon_dagger",
            "weapon_spear",
            "weapon_shortbow",
          ],
        }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const rested = requireRight(
      completeLongRest({
        sheet,
        unitLibrary,
        weaponMasteryReselections: [
          {
            featureUnitId: "fighter_weapon_mastery",
            selectedWeaponUnitIds: [
              "weapon_longsword",
              "weapon_dagger",
              "weapon_spear",
              "weapon_flail",
            ],
          },
        ],
      }),
    );

    expect(
      selectedClassChoiceUnitIds(rested.build, "fighter_weapon_mastery"),
    ).toEqual([
      "weapon_longsword",
      "weapon_dagger",
      "weapon_spear",
      "weapon_flail",
    ]);
  });

  test("Short Rest restores Pact Slots without touching ordinary Spell Slots", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-pact"),
        build: wizardWarlockBuild(),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
        pactSlots: { expended: resourceCount(1) },
      }),
    );

    const rested = requireRight(completeShortRest({ sheet, unitLibrary }));

    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 2, expended: 1 },
    ]);
    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
  });

  test("Short Rest spends Hit Dice to restore HP without touching Spell Slots", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-hit-dice"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        currentHp: Hp(7),
        tempHp: Hp(2),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    );

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: characterSheetHitPointMaximum(rested),
      tempHp: 2,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 1 },
    ]);
    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 3, expended: 1 },
    ]);
  });

  test("rest interruptions apply only the RAW rest benefits they grant", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rest-interruption"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(interruptShortRest({ sheet, interruption: "takeDamage" })).toEqual({
      tag: "shortRestInterruptedNoBenefit",
      sheet,
      interruption: "takeDamage",
    });

    const earlyLongRestInterruption = requireRight(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
        ),
        interruption: "castNonCantripSpell",
        interruptionsIncludingThisOne: resourceCount(1),
      }),
    );
    expect(earlyLongRestInterruption).toMatchObject({
      tag: "longRestInterruptedNoBenefit",
      interruption: "castNonCantripSpell",
      requiredLongRestTicks: elapsedTimeTicks(
        Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) +
          Number(CHARACTER_SHEET_SHORT_REST_TICKS),
      ),
    });
    expect(earlyLongRestInterruption.rest).toMatchObject({
      tag: "longRestStarted",
      sheet,
      requiredRestTicks: earlyLongRestInterruption.requiredLongRestTicks,
    });
    expect(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
        ),
        interruption: "takeDamage",
        interruptionsIncludingThisOne: resourceCount(1),
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Interrupted Long Rest before 1 hour cannot receive Short Rest benefit inputs.",
      },
    });
    expect(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
        interruption: {
          tag: "physicalExertion",
          durationTicks: elapsedTimeTicks(
            Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
          ),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest physical exertion interruption requires at least 1 hour.",
      },
    });
    for (const restedTicks of [
      CHARACTER_SHEET_LONG_REST_BASE_TICKS,
      elapsedTimeTicks(Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) + 1),
    ]) {
      expect(
        interruptLongRest({
          sheet,
          unitLibrary,
          restedTicks,
          interruption: "takeDamage",
          interruptionsIncludingThisOne: resourceCount(1),
        }),
      ).toMatchObject({
        _tag: "Left",
        left: {
          message:
            "Long Rest interruption requires rested time before the required Long Rest duration.",
        },
      });
    }

    const lateLongRestInterruption = requireRight(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
        interruption: {
          tag: "physicalExertion",
          durationTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
        },
        interruptionsIncludingThisOne: resourceCount(1),
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    );

    expect(lateLongRestInterruption.tag).toBe(
      "longRestInterruptedWithShortRestBenefits",
    );
    expect(lateLongRestInterruption.interruption).toEqual({
      tag: "physicalExertion",
      durationTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
    });
    expect(lateLongRestInterruption.requiredLongRestTicks).toBe(
      Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) +
        Number(CHARACTER_SHEET_SHORT_REST_TICKS),
    );
    expect(lateLongRestInterruption.rest).toMatchObject({
      tag: "longRestStarted",
      requiredRestTicks: lateLongRestInterruption.requiredLongRestTicks,
    });
    expect(characterSheetCurrentHp(lateLongRestInterruption.rest.sheet)).toBe(
      12,
    );
    expect(
      requireRight(
        characterSheetHitDice(lateLongRestInterruption.rest.sheet, unitLibrary),
      ),
    ).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 1 },
    ]);
    expect(
      characterSheetSpellSlots(lateLongRestInterruption.rest.sheet),
    ).toEqual([{ spellLevel: 1, count: 3, expended: 1 }]);
  });

  test("Short Rest applies minimum healing to each spent Hit Die", () => {
    const lowConWizardBuild: CharacterBuild = {
      ...wizardBuild({ wizardAdvancements: 1 }),
      abilityScores: expectRight(
        abilityScoreAssignment({
          str: 13,
          dex: 14,
          con: 8,
          int: 16,
          wis: 12,
          cha: 10,
        }),
      ),
    };
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-minimum-hit-dice"),
        build: lowConWizardBuild,
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [
          { classUnitId: "class_wizard", roll: DieRollResult(1) },
          { classUnitId: "class_wizard", roll: DieRollResult(1) },
        ],
      }),
    );

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: characterSheetHitPointMaximum(rested),
      tempHp: 0,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 2 },
    ]);
  });

  test("Short Rest rejects spending more Hit Dice than remain", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-spent-hit-dice"),
        build: wizardBuild({ wizardAdvancements: 0 }),
        currentHp: Hp(4),
        tempHp: Hp(0),
        unitLibrary,
        spentHitDice: [
          { classUnitId: "class_wizard", spent: resourceCount(1) },
        ],
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Short Rest cannot spend more Hit Dice than remain." },
    });
  });

  test("Arcane Recovery refunds expended ordinary Spell Slots once per Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:arcane-recovery"),
        build: wizardBuild({ wizardAdvancements: 3 }),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(2),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
          ],
        },
      }),
    );

    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 4, expended: 2 },
      { spellLevel: 2, count: 3, expended: 0 },
    ]);
    expect(rested.restFeatureUses).toEqual([
      { tag: "arcaneRecovery", usedSinceLongRest: true },
    ]);
    expect(
      completeShortRest({
        sheet: rested,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(1), count: resourceCount(1) },
          ],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Arcane Recovery cannot be used again until a Long Rest.",
      },
    });
  });

  test("Arcane Recovery rejects refunds above its level budget", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:arcane-recovery-budget"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(1), count: resourceCount(2) },
          ],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Arcane Recovery refund exceeds half Wizard level rounded up.",
      },
    });
  });

  test("rejects Arcane Recovery use state for sheets without the feature", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:arcane-recovery-non-owner"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      tempHp: Hp(0),
      unitLibrary,
      restFeatureUses: [
        {
          tag: "arcaneRecovery",
          usedSinceLongRest: true,
        },
      ],
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      },
    });
  });

  test(magicalCunningPactSlotRecoveryTestName, () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:magical-cunning"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 1,
          pactSlotCount: 2,
          pactSlotLevel: 1,
        }),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(2) },
      }),
    );

    const recovered = requireRight(
      completeMagicalCunningRite({ sheet, unitLibrary }),
    );

    expect(characterSheetPactSlots(recovered)).toEqual({
      slotLevel: 1,
      count: 2,
      expended: 1,
    });
    expect(recovered.restFeatureUses).toEqual([
      { tag: "magicalCunning", usedSinceLongRest: true },
    ]);
    expect(
      completeMagicalCunningRite({ sheet: recovered, unitLibrary }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Magical Cunning cannot be used again until a Long Rest.",
      },
    });

    const rested = requireRight(
      completeLongRest({ sheet: recovered, unitLibrary }),
    );

    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 2,
      expended: 0,
    });
    expect(rested.restFeatureUses).toEqual([]);
  });

  test(magicalCunningRoundUpTestName, () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:magical-cunning-round-up"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 10,
          pactSlotCount: 3,
          pactSlotLevel: 5,
        }),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(3) },
      }),
    );

    const recovered = requireRight(
      completeMagicalCunningRite({ sheet, unitLibrary }),
    );

    expect(characterSheetPactSlots(recovered)).toEqual({
      slotLevel: 5,
      count: 3,
      expended: 1,
    });
  });

  test(magicalCunningFeatureOwnershipTestName, () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:magical-cunning-level-one"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 0,
          pactSlotCount: 1,
          pactSlotLevel: 1,
        }),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(1) },
      }),
    );

    expect(completeMagicalCunningRite({ sheet, unitLibrary })).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Magical Cunning requires the Warlock Magical Cunning feature.",
      },
    });
  });
});
