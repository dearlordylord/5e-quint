import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  armorClassBuild,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  requireSuccess,
  sorcererFontOfMagicBuild,
  unitLibrary,
  warlockSpellcastingWithCantrips,
  wizardBuild,
  type CharacterBuild,
} from "./test-support.test-support.ts";
import {
  characterBuildHasBookOfShadows,
  parseCharacterBuild,
  parseResourceCount,
  parseStoredCharacterSheetBookOfShadowsPresence,
  parseStoredDruidCircleLand,
  parseStoredDruidWildShapeKnownForms,
  parseStoredHitPoints,
  parseStoredPactSlots,
  parseStoredResourceExpenditures,
  parseStoredSpellSlots,
} from "./stored-sheet-parser.ts";

const fighterBuild = armorClassBuild({ startingClass: "class_fighter" });
const wizard = wizardBuild({ wizardAdvancements: 0 });
const sorcerer = sorcererFontOfMagicBuild();
const warlock: CharacterBuild = {
  ...armorClassBuild({ startingClass: "class_warlock" }),
  spellcasting: warlockSpellcastingWithCantrips(["eldritch_blast"]),
};

describe("stored Character Sheet primitive parsers", () => {
  test("resource counts parse exactly the nonnegative integers", () => {
    fc.assert(
      fc.property(fc.integer(), (value) => {
        expect(Result.isSuccess(parseResourceCount(value))).toBe(value >= 0);
      }),
    );
    fc.assert(
      fc.property(
        fc.oneof(
          fc
            .double({ noNaN: true, noDefaultInfinity: true })
            .filter(Number.isFinite),
          fc.string(),
          fc.boolean(),
          fc.constant(null),
        ),
        (value) => {
          if (typeof value !== "number" || !Number.isInteger(value)) {
            expect(Result.isFailure(parseResourceCount(value))).toBe(true);
          }
        },
      ),
    );
  });

  test.each([
    {
      name: "non-object hit points",
      value: null,
      expected: "Expected Character Sheet hit points.",
    },
    {
      name: "invalid temporary HP",
      value: { tag: "positive", currentHp: 1, tempHp: -1 },
      expected: "Expected nonnegative HP.",
    },
    {
      name: "unknown HP state",
      value: { tag: "other" },
      expected: "Expected Character Sheet hit point state.",
    },
    {
      name: "unknown zero-HP lifecycle",
      value: { tag: "zero", lifecycle: { tag: "other" } },
      expected: "Expected zero-HP lifecycle state.",
    },
    {
      name: "non-object Stable recovery",
      value: { tag: "zero", lifecycle: { tag: "stable", recovery: null } },
      expected: "Expected Stable recovery state.",
    },
    {
      name: "non-numeric recovery-roll elapsed time",
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: {
            kind: "regains1HpAfter1d4Hours",
            elapsedBeforeRecoveryRoll: "0",
          },
        },
      },
      expected: "Stable recovery elapsed time must be elapsed-time ticks.",
    },
    {
      name: "invalid recovery-roll elapsed time",
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: {
            kind: "regains1HpAfter1d4Hours",
            elapsedBeforeRecoveryRoll: -1,
          },
        },
      },
      expected: "Stable recovery elapsed time must be elapsed-time ticks.",
    },
    {
      name: "non-numeric fixed recovery time",
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: { kind: "regains1HpAfter", remaining: "1" },
        },
      },
      expected:
        "Stable recovery remaining time must be positive elapsed-time ticks.",
    },
    {
      name: "non-positive fixed recovery time",
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: { kind: "regains1HpAfter", remaining: 0 },
        },
      },
      expected:
        "Stable recovery remaining time must be positive elapsed-time ticks.",
    },
    {
      name: "non-object death saves",
      value: {
        tag: "zero",
        lifecycle: { tag: "unstable", deathSaves: null },
      },
      expected: "Expected death saves.",
    },
    {
      name: "out-of-range death saves",
      value: {
        tag: "zero",
        lifecycle: {
          tag: "dead",
          deathSaves: { successes: -1, failures: 0 },
        },
      },
      expected: "Death saves must be counts from 0 to 3.",
    },
  ])("returns a typed issue for $name", ({ value, expected }) => {
    expectIssue(parseStoredHitPoints(value), expected);
  });
});

describe("stored Character Sheet Spell Slot parsers", () => {
  test("accepts omitted state for builds without either slot source", () => {
    expect(parseStoredSpellSlots(fighterBuild, unitLibrary, {})).toEqual(
      Result.succeed(undefined),
    );
    expect(parseStoredPactSlots(fighterBuild, {})).toEqual(
      Result.succeed(undefined),
    );
  });

  test("accepts omitted Pact Slot expenditure for a Pact Magic build", () => {
    expect(parseStoredPactSlots(warlock, {})).toEqual(
      Result.succeed(undefined),
    );
  });

  test.each([
    {
      name: "derived capacity",
      build: wizard,
      value: { spellSlots: [] },
      expected:
        "Stored Character Sheet must not carry build-derived ordinary Spell Slot capacity.",
    },
    {
      name: "state on a non-spellcaster",
      build: fighterBuild,
      value: { spellSlotExpenditures: [] },
      expected:
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
    },
    {
      name: "non-list expenditures",
      build: wizard,
      value: { spellSlotExpenditures: null },
      expected: "Spell Slot expenditure state must be a list.",
    },
    {
      name: "non-object expenditure",
      build: wizard,
      value: { spellSlotExpenditures: [null] },
      expected: "Expected Spell Slot expenditure.",
    },
    {
      name: "extra expenditure key",
      build: wizard,
      value: {
        spellSlotExpenditures: [{ spellLevel: 1, expended: 0, capacity: 2 }],
      },
      expected:
        "Spell Slot expenditure state must contain exactly spell level and expended count.",
    },
    {
      name: "invalid expenditure level",
      build: wizard,
      value: { spellSlotExpenditures: [{ spellLevel: 0, expended: 0 }] },
      expected: "Expected positive Spell Slot level.",
    },
    {
      name: "invalid expenditure count",
      build: wizard,
      value: { spellSlotExpenditures: [{ spellLevel: 1, expended: -1 }] },
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "duplicate expenditure level",
      build: wizard,
      value: {
        spellSlotExpenditures: [
          { spellLevel: 1, expended: 0 },
          { spellLevel: 1, expended: 0 },
        ],
      },
      expected: "Spell Slot state must not duplicate spell levels.",
    },
    {
      name: "expenditure for absent capacity",
      build: wizard,
      value: { spellSlotExpenditures: [{ spellLevel: 9, expended: 0 }] },
      expected: "Spell Slot state does not match build capacity.",
    },
    {
      name: "expenditure above capacity",
      build: wizard,
      value: { spellSlotExpenditures: [{ spellLevel: 1, expended: 99 }] },
      expected: "Spell Slot state does not match build capacity for level 1.",
    },
    {
      name: "non-list created slots",
      build: wizard,
      value: { createdSpellSlots: null },
      expected: "Created Spell Slot state must be a list.",
    },
    {
      name: "non-object created slot",
      build: wizard,
      value: { createdSpellSlots: [null] },
      expected: "Expected Created Spell Slot state.",
    },
    {
      name: "extra created-slot key",
      build: wizard,
      value: {
        createdSpellSlots: [
          { spellLevel: 1, count: 1, expended: 0, capacity: 1 },
        ],
      },
      expected:
        "Created Spell Slot state must contain exactly spell level, count, and expended count.",
    },
    {
      name: "invalid created-slot level",
      build: wizard,
      value: {
        createdSpellSlots: [{ spellLevel: 0, count: 1, expended: 0 }],
      },
      expected: "Expected positive Spell Slot level.",
    },
    {
      name: "invalid created-slot count",
      build: wizard,
      value: {
        createdSpellSlots: [{ spellLevel: 1, count: 0, expended: 0 }],
      },
      expected: "Expected positive resource count.",
    },
    {
      name: "invalid created-slot expenditure",
      build: wizard,
      value: {
        createdSpellSlots: [{ spellLevel: 1, count: 1, expended: -1 }],
      },
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "duplicate created-slot level",
      build: wizard,
      value: {
        createdSpellSlots: [
          { spellLevel: 1, count: 1, expended: 0 },
          { spellLevel: 1, count: 1, expended: 0 },
        ],
      },
      expected: "Created Spell Slot state must not duplicate spell levels.",
    },
    {
      name: "created-slot expenditure above count",
      build: wizard,
      value: {
        createdSpellSlots: [{ spellLevel: 1, count: 1, expended: 2 }],
      },
      expected: "Created Spell Slot expenditure cannot exceed count.",
    },
  ])("rejects $name", ({ build, value, expected }) => {
    expectIssue(parseStoredSpellSlots(build, unitLibrary, value), expected);
  });

  test("parses ordinary and created expenditures together", () => {
    const result = parseStoredSpellSlots(sorcerer, unitLibrary, {
      spellSlotExpenditures: [{ spellLevel: 1, expended: 1 }],
      createdSpellSlots: [{ spellLevel: 1, count: 1, expended: 1 }],
    });
    expect(Result.isSuccess(result), JSON.stringify(result)).toBe(true);
  });

  test.each([
    {
      name: "derived Pact Slot capacity",
      build: warlock,
      value: { pactSlots: {} },
      expected:
        "Stored Character Sheet must not carry build-derived Pact Slot capacity.",
    },
    {
      name: "Pact state without Pact Magic",
      build: fighterBuild,
      value: { pactSlotExpenditure: { expended: 0 } },
      expected:
        "Character Sheet without Pact Magic cannot carry Pact Slot state.",
    },
    {
      name: "non-object expenditure",
      build: warlock,
      value: { pactSlotExpenditure: null },
      expected: "Pact Slot expenditure state must be an object.",
    },
    {
      name: "extra expenditure key",
      build: warlock,
      value: { pactSlotExpenditure: { expended: 0, count: 1 } },
      expected:
        "Pact Slot expenditure state must contain exactly expended count.",
    },
    {
      name: "invalid expenditure",
      build: warlock,
      value: { pactSlotExpenditure: { expended: -1 } },
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "expenditure above capacity",
      build: warlock,
      value: { pactSlotExpenditure: { expended: 99 } },
      expected: "Pact Slot state must match Pact Magic build capacity.",
    },
  ])("rejects $name", ({ build, value, expected }) => {
    expectIssue(parseStoredPactSlots(build, value), expected);
  });

  test("normalizes zero Pact Slot expenditure and retains positive expenditure", () => {
    expect(
      parseStoredPactSlots(warlock, {
        pactSlotExpenditure: { expended: 0 },
      }),
    ).toEqual(Result.succeed(undefined));
    expect(
      parseStoredPactSlots(warlock, {
        pactSlotExpenditure: { expended: 1 },
      }),
    ).toEqual(Result.succeed({ expended: 1 }));
  });
});

describe("stored Character Sheet resource and optional feature-state parsers", () => {
  test("round-trips each supported resource expenditure shape", () => {
    const value = [
      { tag: "layOnHandsHealingPool", expended: 2 },
      {
        tag: "useCountResource",
        unitId: "druid_wild_shape",
        expended: 1,
      },
      {
        tag: "pointPoolResource",
        unitId: "sorcerer_font_of_magic",
        expended: 3,
      },
      {
        tag: "spellAccessFreeCast",
        sourceUnitId: "feat_magic_initiate_wizard",
        spellId: "burning_hands",
        expended: 1,
      },
    ];
    expect(parseStoredResourceExpenditures(value)).toEqual(
      Result.succeed(value),
    );
  });

  test.each([
    {
      name: "non-list state",
      value: null,
      expected: "Character Sheet requires resource expenditure state.",
    },
    {
      name: "unknown expenditure",
      value: [{ tag: "unknown", expended: 0 }],
      expected: "Expected Character Sheet resource expenditure.",
    },
    {
      name: "non-record expenditure",
      value: [null],
      expected: "Expected Character Sheet resource expenditure.",
    },
    {
      name: "invalid use-count expenditure count",
      value: [
        {
          tag: "useCountResource",
          unitId: "druid_wild_shape",
          expended: -1,
        },
      ],
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "invalid point-pool expenditure count",
      value: [
        {
          tag: "pointPoolResource",
          unitId: "sorcerer_font_of_magic",
          expended: -1,
        },
      ],
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "invalid Spell Access free-cast expenditure count",
      value: [
        {
          tag: "spellAccessFreeCast",
          sourceUnitId: "feat_magic_initiate_wizard",
          spellId: "burning_hands",
          expended: -1,
        },
      ],
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "extra Spell Access free-cast field",
      value: [
        {
          tag: "spellAccessFreeCast",
          sourceUnitId: "feat_magic_initiate_wizard",
          spellId: "burning_hands",
          expended: 0,
          count: 1,
        },
      ],
      expected:
        "Character Sheet Spell Access free-cast expenditure must contain exactly tag, source Unit id, spell Unit id, and expended count.",
    },
    {
      name: "extra keyed field",
      value: [
        {
          tag: "useCountResource",
          unitId: "druid_wild_shape",
          expended: 0,
          count: 2,
        },
      ],
      expected:
        "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    },
    {
      name: "extra tagged field",
      value: [{ tag: "layOnHandsHealingPool", expended: 0, unitId: "x" }],
      expected:
        "Character Sheet tagged resource expenditure must contain exactly tag and expended count.",
    },
    {
      name: "invalid expenditure count",
      value: [{ tag: "layOnHandsHealingPool", expended: -1 }],
      expected: "Expected nonnegative resource count.",
    },
    {
      name: "non-string use-count Unit id",
      value: [{ tag: "useCountResource", unitId: 1, expended: 0 }],
      expected:
        "Character Sheet use-count expenditure requires a supported class feature Unit id.",
    },
    {
      name: "unsupported point-pool Unit id",
      value: [{ tag: "pointPoolResource", unitId: "unknown", expended: 0 }],
      expected:
        "Character Sheet point-pool expenditure requires a supported class feature Unit id.",
    },
  ])("rejects $name", ({ value, expected }) => {
    expectIssue(parseStoredResourceExpenditures(value), expected);
  });

  test("distinguishes omitted, valid, and invalid Wild Shape state", () => {
    expect(parseStoredDruidWildShapeKnownForms(undefined)).toEqual(
      Result.succeed(undefined),
    );
    expect(
      parseStoredDruidWildShapeKnownForms({
        statBlockIds: ["stat_block_rat"],
      }),
    ).toEqual(Result.succeed({ statBlockIds: ["stat_block_rat"] }));
    expectIssue(
      parseStoredDruidWildShapeKnownForms({ statBlockIds: [1] }),
      "Expected Wild Shape known-form state.",
    );
  });

  test("distinguishes omitted, valid, and invalid Circle of the Land state", () => {
    expect(parseStoredDruidCircleLand(undefined)).toEqual(
      Result.succeed(undefined),
    );
    expect(parseStoredDruidCircleLand({ land: "temperate" })).toEqual(
      Result.succeed({ land: "temperate" }),
    );
    expectIssue(
      parseStoredDruidCircleLand({ land: "moon" }),
      "Expected Circle of the Land selected land state.",
    );
  });

  test("requires Book of Shadows presence exactly when the build selected access", () => {
    const bookBuild: CharacterBuild = {
      ...warlock,
      spellcasting: {
        ...warlock.spellcasting!,
        sources: [
          {
            ...warlock.spellcasting!.sources[0],
            bookOfShadows: {
              tag: "bookOfShadows",
              cantrips: [
                authoredUnitId("fire_bolt"),
                authoredUnitId("spare_the_dying"),
                authoredUnitId("minor_illusion"),
              ],
              ritualSpells: [
                authoredUnitId("detect_magic"),
                authoredUnitId("detect_poison_and_disease"),
              ],
              spellcastingFocus: "book_of_shadows",
            },
          },
        ],
      },
    };

    expect(characterBuildHasBookOfShadows(fighterBuild)).toBe(false);
    expect(characterBuildHasBookOfShadows(bookBuild)).toBe(true);
    expect(
      parseStoredCharacterSheetBookOfShadowsPresence(fighterBuild, undefined),
    ).toEqual(Result.succeed(undefined));
    expectIssue(
      parseStoredCharacterSheetBookOfShadowsPresence(fighterBuild, {
        tag: "onPerson",
      }),
      "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
    );
    expectIssue(
      parseStoredCharacterSheetBookOfShadowsPresence(bookBuild, undefined),
      "Character Sheet Book of Shadows presence is invalid.",
    );
    expect(
      parseStoredCharacterSheetBookOfShadowsPresence(bookBuild, {
        tag: "onPerson",
      }),
    ).toEqual(Result.succeed({ tag: "onPerson" }));
  });
});

describe("stored Character Build parser", () => {
  test("round-trips the canonical fixture", () => {
    expect(parseCharacterBuild(fighterBuild, unitLibrary)).toEqual(
      Result.succeed(fighterBuild),
    );
  });

  test("round-trips every supported proficiency-choice shape", () => {
    const choice = fc.constantFrom(
      { kind: "skill" as const, skill: "athletics" as const },
      { kind: "skill_expertise" as const, skill: "stealth" as const },
      { kind: "weapon_category" as const, category: "martial" as const },
      { kind: "armor_category" as const, category: "medium" as const },
      { kind: "tool" as const, toolId: "thieves_tools" },
    );

    fc.assert(
      fc.property(fc.array(choice, { maxLength: 8 }), (proficiencyChoices) => {
        const result = parseCharacterBuild(
          { ...fighterBuild, proficiencyChoices },
          unitLibrary,
        );
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.success.proficiencyChoices).toEqual(proficiencyChoices);
        }
      }),
    );
  });

  test("parses each supported stored feature shape", () => {
    const features = [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: "fighter_weapon_mastery",
        unitId: "weapon_longsword",
      },
      {
        kind: "abilityCheckBonus",
        selectedFromUnitId: "cleric_divine_order",
        ability: "int",
        skills: ["arcana", "religion"],
        bonus: { kind: "abilityModifier", ability: "wis", minimum: 1 },
      },
    ];
    const result = parseCharacterBuild(
      { ...fighterBuild, features },
      unitLibrary,
    );

    expect(Result.isSuccess(result), JSON.stringify(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.success.features).toEqual(features);
    }
  });

  test("parses a selected Draconic Ancestry fact from its species source", () => {
    const species = unitLibrary.requireUnit("species_dragonborn");
    if (species.kind !== "species" || !("draconicAncestry" in species)) {
      throw new Error(
        "The SRD Dragonborn test fixture must carry Draconic Ancestry.",
      );
    }
    const ancestorId = species.draconicAncestry.damageType.options[0]?.id;
    if (ancestorId === undefined) {
      throw new Error(
        "The SRD Dragonborn test fixture must offer a Draconic Ancestry.",
      );
    }
    const result = parseCharacterBuild(
      {
        ...fighterBuild,
        species: "species_dragonborn",
        speciesChoiceFacts: {
          draconicAncestry: {
            kind: "draconicAncestry",
            ancestorId,
          },
        },
      },
      unitLibrary,
    );

    expect(Result.isSuccess(result), JSON.stringify(result)).toBe(true);
  });

  test("parses owned equipment and its loadout identity", () => {
    const equipped = armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_chain_mail",
      shield: true,
    });
    expect(parseCharacterBuild(equipped, unitLibrary)).toEqual(
      Result.succeed(equipped),
    );

    const mainWeaponUnitId = authoredUnitId("weapon_quarterstaff");
    const offHandWeaponUnitId = authoredUnitId("weapon_dagger");
    const mainWeaponItemId = characterEquipmentItemId({
      slot: "main",
      unitId: requireSuccess(characterEquipmentItemUnitId(mainWeaponUnitId)),
    });
    const offHandWeaponItemId = characterEquipmentItemId({
      slot: "off",
      unitId: requireSuccess(characterEquipmentItemUnitId(offHandWeaponUnitId)),
    });
    const armed = {
      ...fighterBuild,
      equipment: {
        ...fighterBuild.equipment,
        owned: [
          {
            kind: "authoredCatalogItem",
            itemId: mainWeaponItemId,
            authoredItemId: "synthetic_arcane_focus_quarterstaff",
            spellcastingFocusKind: "arcane",
            quantity: 1,
          },
          {
            kind: "catalogItem",
            itemId: offHandWeaponItemId,
            quantity: 1,
          },
          {
            kind: "authoredStartingItem",
            itemName: "Spellbook",
            quantity: 1,
          },
          {
            kind: "selectedToolItem",
            toolProficiencyId: "smiths_tools",
            quantity: 1,
          },
        ],
        loadout: {
          weapon: {
            itemId: mainWeaponItemId,
            grip: "one_handed" as const,
          },
          offHandWeapon: { itemId: offHandWeaponItemId },
        },
      },
    };
    expect(parseCharacterBuild(armed, unitLibrary)).toEqual(
      Result.succeed(armed),
    );
  });

  test("parses retained starting currency", () => {
    const withCurrency = {
      ...fighterBuild,
      equipment: {
        ...fighterBuild.equipment,
        startingEquipmentCurrencyRemainderCp: 1300,
      },
    };

    expect(parseCharacterBuild(withCurrency, unitLibrary)).toEqual(
      Result.succeed(withCurrency),
    );
    expectIssue(
      parseCharacterBuild(
        {
          ...fighterBuild,
          equipment: {
            ...fighterBuild.equipment,
            startingEquipmentCurrencyRemainderCp: -1,
          },
        },
        unitLibrary,
      ),
      "Character Build starting-equipment currency remainder is invalid.",
    );
    expectIssue(
      parseCharacterBuild(
        {
          ...fighterBuild,
          equipment: {
            ...fighterBuild.equipment,
            startingEquipmentCurrencyRemainderCp: 0.5,
          },
        },
        unitLibrary,
      ),
      "Character Build starting-equipment currency remainder is invalid.",
    );
    expectIssue(
      parseCharacterBuild(
        {
          ...fighterBuild,
          equipment: {
            ...fighterBuild.equipment,
            startingEquipmentCurrencyRemainderCp: Number.MAX_SAFE_INTEGER + 1,
          },
        },
        unitLibrary,
      ),
      "Character Build starting-equipment currency remainder is invalid.",
    );
    const {
      startingEquipmentCurrencyRemainderCp:
        _startingEquipmentCurrencyRemainderCp,
      ...equipmentWithoutCurrency
    } = withCurrency.equipment;
    expectIssue(
      parseCharacterBuild(
        {
          ...fighterBuild,
          equipment: equipmentWithoutCurrency,
        },
        unitLibrary,
      ),
      "Character Build starting-equipment currency remainder is required.",
    );
  });

  test.each([
    {
      name: "a non-object build",
      value: null,
      expected: "Expected Character Build.",
    },
    {
      name: "missing progression",
      value: { ...fighterBuild, progression: null },
      expected: "Character Build requires progression.",
    },
    {
      name: "missing progression advancements",
      value: {
        ...fighterBuild,
        progression: { startingClass: "class_fighter" },
      },
      expected: "Character Build progression requires advancements.",
    },
    {
      name: "a malformed progression advancement",
      value: {
        ...fighterBuild,
        progression: {
          startingClass: "class_fighter",
          advancements: [{ classUnitId: "class_fighter" }],
        },
      },
      expected: "Character Build progression advancement is invalid.",
    },
    {
      name: "a progression above level 20",
      value: {
        ...fighterBuild,
        progression: {
          startingClass: "class_fighter",
          advancements: Array.from({ length: 20 }, () => ({
            classUnitId: "class_fighter",
            hitPointRule: { tag: "fixedHigherLevelGain" },
          })),
        },
      },
      expected: "Character Build progression is invalid.",
    },
    {
      name: "a non-string background",
      value: { ...fighterBuild, background: null },
      expected: "Character Build requires background Unit id.",
    },
    {
      name: "a non-string species",
      value: { ...fighterBuild, species: null },
      expected: "Character Build requires species Unit id.",
    },
    {
      name: "missing origin languages",
      value: { ...fighterBuild, originLanguages: null },
      expected: "Character Build requires origin languages.",
    },
    {
      name: "origin languages without Common first",
      value: {
        ...fighterBuild,
        originLanguages: ["Dwarvish", "Common", "Goblin"],
      },
      expected: "Character Build requires origin languages.",
    },
    {
      name: "duplicate origin languages",
      value: {
        ...fighterBuild,
        originLanguages: ["Common", "Dwarvish", "Dwarvish"],
      },
      expected: "Character Build requires origin languages.",
    },
    {
      name: "an invalid alignment order",
      value: {
        ...fighterBuild,
        alignment: { order: "orderly", morality: "good" },
      },
      expected: "Character Build requires alignment.",
    },
    {
      name: "invalid ability scores",
      value: { ...fighterBuild, abilityScores: { str: 30 } },
      expected: "Character Build ability scores are invalid.",
    },
    {
      name: "non-list proficiency choices",
      value: { ...fighterBuild, proficiencyChoices: null },
      expected: "Character Build requires proficiency choices.",
    },
    {
      name: "a non-object proficiency choice",
      value: { ...fighterBuild, proficiencyChoices: [null] },
      expected: "Character Build proficiency choice is invalid.",
    },
    {
      name: "an unsupported proficiency choice",
      value: {
        ...fighterBuild,
        proficiencyChoices: [{ kind: "skill", skill: "flying" }],
      },
      expected: "Character Build proficiency choice is invalid.",
    },
    {
      name: "an unsupported tool proficiency",
      value: {
        ...fighterBuild,
        proficiencyChoices: [{ kind: "tool", toolId: "tool:synthetic" }],
      },
      expected: "Character Build proficiency choice is invalid.",
    },
    {
      name: "non-list features",
      value: { ...fighterBuild, features: null },
      expected: "Character Build requires features.",
    },
    {
      name: "a feature without source identity",
      value: {
        ...fighterBuild,
        features: [{ kind: "selectedClassChoice", unitId: "weapon_dagger" }],
      },
      expected: "Character Build feature is invalid.",
    },
    {
      name: "an invalid selected class choice",
      value: {
        ...fighterBuild,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "fighter_weapon_mastery",
            unitId: null,
          },
        ],
      },
      expected: "Character Build feature is invalid.",
    },
    {
      name: "an invalid Ability Check bonus skill",
      value: {
        ...fighterBuild,
        features: [
          {
            kind: "abilityCheckBonus",
            selectedFromUnitId: "cleric_divine_order",
            ability: "int",
            skills: ["flying"],
            bonus: { kind: "abilityModifier", ability: "wis", minimum: 1 },
          },
        ],
      },
      expected: "Character Build feature is invalid.",
    },
    {
      name: "an invalid Ability Check bonus payload",
      value: {
        ...fighterBuild,
        features: [
          {
            kind: "abilityCheckBonus",
            selectedFromUnitId: "cleric_divine_order",
            ability: "int",
            skills: ["arcana"],
            bonus: { kind: "flat", ability: "wis", minimum: 1 },
          },
        ],
      },
      expected: "Character Build feature is invalid.",
    },
    {
      name: "an unknown species Unit",
      value: { ...fighterBuild, species: "species_unknown" },
      expected: "Character Build species Unit id is unknown.",
    },
    {
      name: "a non-species Unit as species",
      value: { ...fighterBuild, species: "class_fighter" },
      expected:
        "Character Build species Unit id must reference a species Unit.",
    },
    {
      name: "Draconic Ancestry on a species without its source",
      value: {
        ...fighterBuild,
        speciesChoiceFacts: {
          draconicAncestry: {
            kind: "draconicAncestry",
            ancestorId: "red",
          },
        },
      },
      expected:
        "Character Build cannot carry Draconic Ancestry fact for species without a Draconic Ancestry source.",
    },
    {
      name: "non-object species choice facts",
      value: {
        ...fighterBuild,
        species: "species_dragonborn",
        speciesChoiceFacts: null,
      },
      expected: "Expected Character Build species choice facts.",
    },
    {
      name: "unsupported species choice fact keys",
      value: {
        ...fighterBuild,
        species: "species_dragonborn",
        speciesChoiceFacts: { unknown: true },
      },
      expected:
        "Character Build species choice facts must contain exactly supported species choice facts.",
    },
    {
      name: "non-object Draconic Ancestry",
      value: {
        ...fighterBuild,
        species: "species_dragonborn",
        speciesChoiceFacts: { draconicAncestry: null },
      },
      expected: "Expected Character Build Draconic Ancestry fact.",
    },
    {
      name: "malformed Draconic Ancestry",
      value: {
        ...fighterBuild,
        species: "species_dragonborn",
        speciesChoiceFacts: {
          draconicAncestry: {
            kind: "draconicAncestry",
            ancestorId: 1,
          },
        },
      },
      expected:
        "Character Build Draconic Ancestry fact must contain exactly selected ancestry fact fields.",
    },
    {
      name: "unknown Draconic Ancestry option",
      value: {
        ...fighterBuild,
        species: "species_dragonborn",
        speciesChoiceFacts: {
          draconicAncestry: {
            kind: "draconicAncestry",
            ancestorId: "synthetic_unknown",
          },
        },
      },
      expected:
        "Character Build Draconic Ancestry fact must reference the selected species source table.",
    },
    {
      name: "missing equipment",
      value: { ...fighterBuild, equipment: null },
      expected: "Character Build requires equipment.",
    },
    {
      name: "a malformed owned equipment item",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [null],
          loadout: {},
        },
      },
      expected: "Character Build owned equipment item is invalid.",
    },
    {
      name: "an invalid owned equipment item id",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [
            {
              kind: "catalogItem",
              itemId: "invalid",
              quantity: 1,
            },
          ],
          loadout: {},
        },
      },
      expected: "Character Build owned equipment item id is invalid.",
    },
    {
      name: "a blank authored starting item",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [
            { kind: "authoredStartingItem", itemName: "  ", quantity: 1 },
          ],
          loadout: {},
        },
      },
      expected: "Character Build authored starting equipment item is invalid.",
    },
    {
      name: "an unsupported selected tool item",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [
            {
              kind: "selectedToolItem",
              toolProficiencyId: "synthetic_tool",
              quantity: 1,
            },
          ],
          loadout: {},
        },
      },
      expected: "Character Build selected-tool equipment item is invalid.",
    },
    {
      name: "a malformed authored catalog item",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [
            {
              kind: "authoredCatalogItem",
              itemId: "main:weapon_quarterstaff",
              authoredItemId: "",
              spellcastingFocusKind: "arcane",
              quantity: 1,
            },
          ],
          loadout: {},
        },
      },
      expected: "Character Build authored catalog equipment item is invalid.",
    },
    {
      name: "an invalid authored catalog item id",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [
            {
              kind: "authoredCatalogItem",
              itemId: "invalid",
              authoredItemId: "synthetic_focus",
              spellcastingFocusKind: "arcane",
              quantity: 1,
            },
          ],
          loadout: {},
        },
      },
      expected:
        "Character Build authored catalog equipment item id is invalid.",
    },
    {
      name: "an unknown owned equipment item kind",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [{ kind: "unknown", itemId: "invalid", quantity: 1 }],
          loadout: {},
        },
      },
      expected: "Character Build owned equipment item is invalid.",
    },
    {
      name: "a weapon loadout with an extra field",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          loadout: {
            weapon: {
              itemId: "main:weapon_quarterstaff",
              grip: "one_handed",
              extra: true,
            },
          },
        },
      },
      expected: "Character Build weapon loadout is invalid.",
    },
    {
      name: "a loadout item that is not owned",
      value: {
        ...fighterBuild,
        equipment: {
          ...fighterBuild.equipment,
          owned: [],
          loadout: {
            weapon: {
              itemId: characterEquipmentItemId({
                slot: "main",
                unitId: requireSuccess(
                  characterEquipmentItemUnitId(
                    authoredUnitId("weapon_quarterstaff"),
                  ),
                ),
              }),
              grip: "one_handed",
            },
          },
        },
      },
      expected:
        "Character Build loadout must reference owned catalog equipment.",
    },
  ])("rejects $name", ({ value, expected }) => {
    expectIssue(parseCharacterBuild(value, unitLibrary), expected);
  });
});

function expectIssue(
  result: Result.Result<unknown, { readonly message: string }>,
  message: string,
): void {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(result.failure.message).toBe(message);
  }
}
