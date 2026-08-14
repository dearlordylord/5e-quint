import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { classCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  advanceCharacterBuildClassLevel,
  classLevelGainWithFightingStyleCantripReplacement,
  classUnitIdFromUnitId,
  eldritchInvocationId,
  fighterClassUnitId,
  fighterLevelGainWithFightingStyleReplacement,
  copperPieceAmount,
  fightingStyleFeatUnitId,
  sorcererClassUnitId,
  sorcererMetamagicOptionId,
  sorcererLevelGain,
  warlockClassUnitId,
  warlockLevelGain,
  weaponMasteryFeatureUnitId,
  weaponMasteryLevelGain,
  weaponMasteryWeaponUnitId,
  type CharacterBuild,
  type CharacterBuildFeature,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingSource,
  type CharacterBuildFighterFightingStyleReplacementLevelGain,
  type CharacterBuildWarlockLevelGain,
  type ClassUnitId,
  type SorcererMetamagicOptionId,
  type UnitCatalog,
} from "./index.ts";
import { classSpellcastingCreationAtLevel } from "./class-spellcasting.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog test fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

function parsedClassUnitId(
  classUnitId: string,
  catalog: UnitCatalog = unitLibrary,
): ClassUnitId {
  const parsed = classUnitIdFromUnitId({
    unitLibrary: catalog,
    classUnitId: authoredUnitId(classUnitId),
  });
  if (Either.isLeft(parsed)) {
    throw new Error(`Expected a class Unit fixture: ${classUnitId}.`);
  }
  return parsed.right;
}

const barbarianUnitId = parsedClassUnitId("class_barbarian");
const fighterUnitId = parsedClassUnitId("class_fighter");
const monkUnitId = parsedClassUnitId("class_monk");
const paladinUnitId = parsedClassUnitId("class_paladin");
const sorcererUnitId = parsedClassUnitId("class_sorcerer");
const warlockUnitId = parsedClassUnitId("class_warlock");
const wizardUnitId = parsedClassUnitId("class_wizard");
const typedWarlockClassUnitId = (() => {
  const parsed = warlockClassUnitId({
    unitLibrary,
    classUnitId: warlockUnitId,
  });
  if (Either.isLeft(parsed)) {
    throw new Error("The Warlock test fixture must use a Warlock class.");
  }
  return parsed.right;
})();
const fixedHitPoints = { tag: "fixedHigherLevelGain" } as const;
const fighterWeaponMasterySourceUnitId = authoredUnitId(
  "fighter_weapon_mastery",
);
const warlockInvocationSourceUnitId = authoredUnitId(
  "warlock_eldritch_invocations",
);

function buildForClass(
  classId: ClassUnitId,
  features: readonly CharacterBuildFeature[] = [],
): CharacterBuild {
  return {
    progression: {
      startingClass: classId,
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: {
      str: abilityScore(16),
      dex: abilityScore(14),
      con: abilityScore(14),
      int: abilityScore(8),
      wis: abilityScore(12),
      cha: abilityScore(10),
    },
    proficiencyChoices: [],
    features,
    magicInitiateSpellAccesses: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
}

function fighterBuild(
  features: readonly CharacterBuildFeature[] = [],
): CharacterBuild {
  return buildForClass(fighterUnitId, features);
}

function fighterWeaponMasteryFeatures(
  weaponUnitIds: readonly UnitRecord["id"][],
): readonly CharacterBuildFeature[] {
  return weaponUnitIds.map((unitId) => ({
    kind: "selectedClassChoice",
    selectedFromUnitId: fighterWeaponMasterySourceUnitId,
    unitId,
  }));
}

function fighterLevelThreeBuild(
  weaponUnitIds: readonly UnitRecord["id"][],
): CharacterBuild {
  const build = fighterBuild(fighterWeaponMasteryFeatures(weaponUnitIds));
  return {
    ...build,
    progression: {
      ...build.progression,
      advancements: [
        { classUnitId: fighterUnitId, hitPointRule: fixedHitPoints },
        { classUnitId: fighterUnitId, hitPointRule: fixedHitPoints },
      ],
    },
  };
}

function classAdvancementEntries(
  classUnitId: ClassUnitId,
  classLevel: number,
): CharacterBuild["progression"]["advancements"] {
  return Array.from({ length: classLevel - 1 }, () => ({
    classUnitId,
    hitPointRule: fixedHitPoints,
  }));
}

function spellcastingBuild(input: {
  readonly classUnitId: ClassUnitId;
  readonly classLevel: number;
  readonly cantrips?: readonly UnitRecord["id"][];
  readonly preparedSpells?: readonly UnitRecord["id"][];
  readonly pactMagicSlotPool?: CharacterBuildSpellcasting["slotPools"]["pactMagic"];
  readonly additionalSource?: boolean;
  readonly features?: readonly CharacterBuildFeature[];
}): CharacterBuild {
  const classRecord = unitLibrary.requireUnit(input.classUnitId);
  if (classRecord.kind !== "class") {
    throw new Error("The spellcasting fixture must use a class Unit.");
  }
  const facts = classCreationFacts(classRecord);
  if (!("spellcasting" in facts)) {
    throw new Error("The spellcasting fixture must use spellcasting facts.");
  }
  const row = classSpellcastingCreationAtLevel(
    facts.spellcasting,
    input.classLevel,
  );
  if (row === undefined) {
    throw new Error(
      "The spellcasting fixture must use a supported class level.",
    );
  }

  const source: CharacterBuildSpellcastingSource = {
    sourceUnitId: input.classUnitId,
    spellcastingAbility: facts.spellcasting.spellcastingAbility,
    cantrips:
      input.cantrips ??
      row.cantripAccess?.spellIds.slice(0, row.cantripAccess.choose) ??
      [],
    spellbook: [],
    preparedSpells:
      input.preparedSpells ??
      (row.preparedAccess.kind === "prepared_from_class_spell_list"
        ? row.preparedAccess.spells
            .slice(0, row.preparedAccess.choose)
            .map((spell) => spell.spellId)
        : row.preparedAccess.spellIds.slice(0, row.preparedAccess.choose)),
    spellcastingFocuses:
      "spellcastingFocus" in facts.spellcasting
        ? [facts.spellcasting.spellcastingFocus]
        : [facts.spellcasting.spellcastingFocuses[0]],
  };

  const slotPools: CharacterBuildSpellcasting["slotPools"] =
    row.kind === "pact_magic_spellcasting_creation"
      ? {
          pactMagic: input.pactMagicSlotPool ?? {
            kind: "pactMagic",
            count: row.pactSlotProjection.count,
            slotLevel: row.pactSlotProjection.spellLevel,
          },
        }
      : {
          spellcasting: {
            kind: "spellcasting",
            slots: row.spellSlotProjection.slots,
          },
        };

  const additionalSource = input.additionalSource
    ? [{ ...source, sourceUnitId: authoredUnitId("class_wizard") }]
    : [];
  return {
    ...buildForClass(input.classUnitId, input.features),
    progression: {
      startingClass: input.classUnitId,
      advancements: classAdvancementEntries(
        input.classUnitId,
        input.classLevel,
      ),
    },
    spellcasting: {
      sources: [source, ...additionalSource],
      slotPools,
    },
  };
}

function parsedSorcererMetamagicOption(
  optionId: string,
): SorcererMetamagicOptionId {
  const parsed = sorcererMetamagicOptionId(optionId);
  if (Either.isLeft(parsed)) {
    throw new Error(`Expected a Sorcerer Metamagic option: ${optionId}.`);
  }
  return parsed.right;
}

function fightingStyleReplacement(
  selectedFeatUnitId: UnitRecord["id"],
): CharacterBuildFighterFightingStyleReplacementLevelGain {
  const result = fighterLevelGainWithFightingStyleReplacement({
    unitLibrary,
    classUnitId: fighterUnitId,
    hitPointRule: fixedHitPoints,
    selectedFeatUnitId,
  });
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected a supported Fighting Style replacement: ${selectedFeatUnitId}.`,
    );
  }
  return result.right;
}

describe("Character Build advancement typed boundaries", () => {
  test("narrows only the matching class identity", () => {
    expect(
      fighterClassUnitId({ unitLibrary, classUnitId: fighterUnitId }),
    ).toHaveProperty("_tag", "Right");
    expect(
      fighterClassUnitId({ unitLibrary, classUnitId: wizardUnitId }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFighterClassLevelGain", className: "wizard" },
    });

    expect(
      warlockClassUnitId({ unitLibrary, classUnitId: warlockUnitId }),
    ).toHaveProperty("_tag", "Right");
    expect(
      warlockClassUnitId({ unitLibrary, classUnitId: wizardUnitId }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWarlockClassLevelGain", className: "wizard" },
    });

    expect(
      sorcererClassUnitId({ unitLibrary, classUnitId: sorcererUnitId }),
    ).toHaveProperty("_tag", "Right");
    expect(
      sorcererClassUnitId({ unitLibrary, classUnitId: wizardUnitId }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonSorcererClassLevelGain", className: "wizard" },
    });
  });

  test("narrows Fighting Style feats by Unit kind and category", () => {
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("feat_archery"),
      }),
    ).toHaveProperty("_tag", "Right");
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("weapon_longsword"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat", unitKind: "weapon" },
    });
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("feat_savage_attacker"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat", featCategory: "origin" },
    });
  });

  test("narrows Weapon Mastery sources by feature shape and weapon kind", () => {
    expect(
      weaponMasteryFeatureUnitId({
        unitLibrary,
        unitId: authoredUnitId("fighter_weapon_mastery"),
      }),
    ).toHaveProperty("_tag", "Right");
    expect(
      weaponMasteryFeatureUnitId({
        unitLibrary,
        unitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      weaponMasteryFeatureUnitId({
        unitLibrary,
        unitId: authoredUnitId("fighter_fighting_style"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWeaponMasteryFeature" },
    });

    expect(
      weaponMasteryWeaponUnitId({
        unitLibrary,
        unitId: authoredUnitId("weapon_longsword"),
      }),
    ).toHaveProperty("_tag", "Right");
    expect(
      weaponMasteryWeaponUnitId({
        unitLibrary,
        unitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      weaponMasteryWeaponUnitId({
        unitLibrary,
        unitId: authoredUnitId("class_fighter"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWeaponMasteryWeapon", unitKind: "class" },
    });
  });

  test("propagates narrowed Unit failures through level-gain constructors", () => {
    expect(
      weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        featureUnitId: authoredUnitId("synthetic_unknown"),
        selectedWeaponUnitIds: [],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        featureUnitId: authoredUnitId("fighter_weapon_mastery"),
        selectedWeaponUnitIds: [authoredUnitId("class_fighter")],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWeaponMasteryWeapon" },
    });
    expect(
      weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        featureUnitId: authoredUnitId("fighter_weapon_mastery"),
        selectedWeaponUnitIds: [authoredUnitId("weapon_longsword")],
        fightingStyleReplacement: {
          selectedFeatUnitId: authoredUnitId("feat_savage_attacker"),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat" },
    });
    expect(
      fighterLevelGainWithFightingStyleReplacement({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        selectedFeatUnitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
  });

  test("enforces the retained Fighting Style identity during replacement", () => {
    const fightingStyleSource = authoredUnitId("fighter_fighting_style");
    const selectedFeature = (
      unitId: UnitRecord["id"],
    ): CharacterBuildFeature => ({
      kind: "selectedClassChoice",
      selectedFromUnitId: fightingStyleSource,
      unitId,
    });
    const selectedWeapon = (
      unitId: UnitRecord["id"],
    ): CharacterBuildFeature => ({
      kind: "selectedClassChoice",
      selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
      unitId,
    });
    const replaceWithDefense = fightingStyleReplacement(
      authoredUnitId("defense"),
    );

    expect(
      advanceCharacterBuildClassLevel({
        build: fighterBuild(),
        unitLibrary,
        levelGain: replaceWithDefense,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "missingSelectedFightingStyle" },
    });
    expect(
      advanceCharacterBuildClassLevel({
        build: fighterBuild([
          selectedFeature(authoredUnitId("feat_archery")),
          selectedFeature(authoredUnitId("feat_great_weapon_fighting")),
        ]),
        unitLibrary,
        levelGain: replaceWithDefense,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "ambiguousSelectedFightingStyle", count: 2 },
    });
    expect(
      advanceCharacterBuildClassLevel({
        build: fighterBuild([selectedFeature(authoredUnitId("feat_archery"))]),
        unitLibrary,
        levelGain: fightingStyleReplacement(authoredUnitId("feat_archery")),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "sameFightingStyleReplacement",
        selectedFeatUnitId: "feat_archery",
      },
    });

    const replaced = advanceCharacterBuildClassLevel({
      build: fighterBuild([
        selectedFeature(authoredUnitId("feat_archery")),
        selectedWeapon(authoredUnitId("weapon_longsword")),
        selectedWeapon(authoredUnitId("weapon_dagger")),
        selectedWeapon(authoredUnitId("weapon_longbow")),
      ]),
      unitLibrary,
      levelGain: replaceWithDefense,
    });
    expect(replaced).toMatchObject({
      _tag: "Right",
      right: {
        features: expect.arrayContaining([
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "fighter_fighting_style",
            unitId: "defense",
          },
        ]),
        progression: {
          advancements: [
            {
              classUnitId: "class_fighter",
              hitPointRule: fixedHitPoints,
            },
          ],
        },
      },
    });
  });

  test("keeps valid Fighter Weapon Mastery selections across a plain level gain", () => {
    const selectedWeapons = fighterWeaponMasteryFeatures(
      ["weapon_longsword", "weapon_dagger", "weapon_shortbow"].map((unitId) =>
        authoredUnitId(unitId),
      ),
    );
    const levelGain = {
      tag: "classLevelGain",
      classUnitId: fighterUnitId,
      hitPointRule: fixedHitPoints,
    } as const;

    expect(
      advanceCharacterBuildClassLevel({
        build: fighterBuild(selectedWeapons.slice(0, 2)),
        unitLibrary,
        levelGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidWeaponMasterySelectionCount",
        classLevel: 1,
        expectedCount: 3,
        actualCount: 2,
      },
    });

    expect(
      advanceCharacterBuildClassLevel({
        build: fighterBuild(selectedWeapons),
        unitLibrary,
        levelGain,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        features: selectedWeapons,
        progression: {
          advancements: [
            {
              classUnitId: "class_fighter",
              hitPointRule: fixedHitPoints,
            },
          ],
        },
      },
    });
  });

  test("adds the Fighter level-four Weapon Mastery choice without replacing retained choices", () => {
    const retainedWeaponUnitIds = [
      authoredUnitId("weapon_longsword"),
      authoredUnitId("weapon_dagger"),
      authoredUnitId("weapon_shortbow"),
    ];
    const selectedWeaponUnitIds = [
      ...retainedWeaponUnitIds,
      authoredUnitId("weapon_greataxe"),
    ];
    const build = fighterBuild(
      fighterWeaponMasteryFeatures(retainedWeaponUnitIds),
    );
    const levelGain = weaponMasteryLevelGain({
      unitLibrary,
      classUnitId: fighterUnitId,
      hitPointRule: fixedHitPoints,
      featureUnitId: fighterWeaponMasterySourceUnitId,
      selectedWeaponUnitIds,
    });
    if (Either.isLeft(levelGain)) {
      throw new Error(
        `The Fighter level-four Weapon Mastery gain must parse: ${JSON.stringify(levelGain.left)}`,
      );
    }

    expect(
      advanceCharacterBuildClassLevel({
        build: {
          ...build,
          progression: {
            ...build.progression,
            advancements: [
              {
                classUnitId: fighterUnitId,
                hitPointRule: fixedHitPoints,
              },
              {
                classUnitId: fighterUnitId,
                hitPointRule: fixedHitPoints,
              },
            ],
          },
        },
        unitLibrary,
        levelGain: levelGain.right,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        features: fighterWeaponMasteryFeatures(selectedWeaponUnitIds),
        progression: {
          advancements: [{}, {}, {}],
        },
      },
    });
  });

  test("rejects incoherent Fighter level-four Weapon Mastery selections", () => {
    const retainedWeaponUnitIds = [
      authoredUnitId("weapon_longsword"),
      authoredUnitId("weapon_dagger"),
      authoredUnitId("weapon_shortbow"),
    ];
    const selectedWeaponUnitIds = [
      ...retainedWeaponUnitIds,
      authoredUnitId("weapon_greataxe"),
    ];
    const parsedLevelGain = (input: {
      readonly featureUnitId: UnitRecord["id"];
      readonly selectedWeaponUnitIds: readonly UnitRecord["id"][];
    }) => {
      const result = weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        ...input,
      });
      if (Either.isLeft(result)) {
        throw new Error(
          `The Weapon Mastery rejection fixture must parse: ${JSON.stringify(result.left)}`,
        );
      }
      return result.right;
    };

    const cases = [
      {
        buildWeaponUnitIds: retainedWeaponUnitIds,
        levelGain: parsedLevelGain({
          featureUnitId: authoredUnitId("paladin_weapon_mastery"),
          selectedWeaponUnitIds,
        }),
        code: "weaponMasteryFeatureClassMismatch",
      },
      {
        buildWeaponUnitIds: retainedWeaponUnitIds.slice(0, 2),
        levelGain: parsedLevelGain({
          featureUnitId: fighterWeaponMasterySourceUnitId,
          selectedWeaponUnitIds,
        }),
        code: "invalidWeaponMasterySelectionCount",
      },
      {
        buildWeaponUnitIds: retainedWeaponUnitIds,
        levelGain: parsedLevelGain({
          featureUnitId: fighterWeaponMasterySourceUnitId,
          selectedWeaponUnitIds: retainedWeaponUnitIds,
        }),
        code: "invalidWeaponMasterySelectionCount",
      },
      {
        buildWeaponUnitIds: [
          retainedWeaponUnitIds[0],
          retainedWeaponUnitIds[0],
          retainedWeaponUnitIds[2],
        ],
        levelGain: parsedLevelGain({
          featureUnitId: fighterWeaponMasterySourceUnitId,
          selectedWeaponUnitIds,
        }),
        code: "duplicateWeaponMasterySelection",
      },
      {
        buildWeaponUnitIds: retainedWeaponUnitIds,
        levelGain: parsedLevelGain({
          featureUnitId: fighterWeaponMasterySourceUnitId,
          selectedWeaponUnitIds: [
            ...retainedWeaponUnitIds,
            retainedWeaponUnitIds[0],
          ],
        }),
        code: "duplicateWeaponMasterySelection",
      },
      {
        buildWeaponUnitIds: retainedWeaponUnitIds,
        levelGain: parsedLevelGain({
          featureUnitId: fighterWeaponMasterySourceUnitId,
          selectedWeaponUnitIds: [
            authoredUnitId("weapon_longsword"),
            authoredUnitId("weapon_dagger"),
            authoredUnitId("weapon_greataxe"),
            authoredUnitId("weapon_flail"),
          ],
        }),
        code: "missingExistingWeaponMasterySelection",
      },
    ] as const;

    for (const testCase of cases) {
      expect(
        advanceCharacterBuildClassLevel({
          build: fighterLevelThreeBuild(testCase.buildWeaponUnitIds),
          unitLibrary,
          levelGain: testCase.levelGain,
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { code: testCase.code },
      });
    }
  });

  test("rejects a ranged weapon from the Barbarian melee Weapon Mastery roster", () => {
    const retainedWeaponUnitIds = [
      authoredUnitId("weapon_longsword"),
      authoredUnitId("weapon_dagger"),
    ];
    const levelGain = weaponMasteryLevelGain({
      unitLibrary,
      classUnitId: barbarianUnitId,
      hitPointRule: fixedHitPoints,
      featureUnitId: authoredUnitId("barbarian_weapon_mastery"),
      selectedWeaponUnitIds: [
        ...retainedWeaponUnitIds,
        authoredUnitId("weapon_shortbow"),
      ],
    });
    if (Either.isLeft(levelGain)) {
      throw new Error(
        `The Barbarian Weapon Mastery rejection fixture must parse: ${JSON.stringify(levelGain.left)}`,
      );
    }

    const build = buildForClass(
      barbarianUnitId,
      retainedWeaponUnitIds.map((unitId) => ({
        kind: "selectedClassChoice",
        selectedFromUnitId: authoredUnitId("barbarian_weapon_mastery"),
        unitId,
      })),
    );
    expect(
      advanceCharacterBuildClassLevel({
        build: {
          ...build,
          progression: {
            ...build.progression,
            advancements: [
              {
                classUnitId: barbarianUnitId,
                hitPointRule: fixedHitPoints,
              },
              {
                classUnitId: barbarianUnitId,
                hitPointRule: fixedHitPoints,
              },
            ],
          },
        },
        unitLibrary,
        levelGain: levelGain.right,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidWeaponMasterySelection",
        weaponUnitId: "weapon_shortbow",
      },
    });
  });

  test("rejects Weapon Mastery selection for a class without that feature", () => {
    const levelGain = weaponMasteryLevelGain({
      unitLibrary,
      classUnitId: monkUnitId,
      hitPointRule: fixedHitPoints,
      featureUnitId: fighterWeaponMasterySourceUnitId,
      selectedWeaponUnitIds: [
        authoredUnitId("weapon_longsword"),
        authoredUnitId("weapon_dagger"),
        authoredUnitId("weapon_shortbow"),
      ],
    });
    if (Either.isLeft(levelGain)) {
      throw new Error(
        `The unsupported Monk Weapon Mastery fixture must parse: ${JSON.stringify(levelGain.left)}`,
      );
    }

    expect(
      advanceCharacterBuildClassLevel({
        build: buildForClass(monkUnitId),
        unitLibrary,
        levelGain: levelGain.right,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "missingWeaponMasteryFeatureChoice",
        classUnitId: "class_monk",
      },
    });
  });

  test("requires matching spellcasting state for spellcasting level gains", () => {
    const cantripReplacement =
      classLevelGainWithFightingStyleCantripReplacement({
        unitLibrary,
        classUnitId: paladinUnitId,
        hitPointRule: fixedHitPoints,
        replaceCantripId: authoredUnitId("guidance"),
        selectedCantripId: authoredUnitId("thaumaturgy"),
        preparedSpellcasting: {
          gainedPreparedSpells: [authoredUnitId("command")],
        },
      });
    if (Either.isLeft(cantripReplacement)) {
      throw new Error(
        "The Paladin Blessed Warrior cantrip replacement fixture must be supported.",
      );
    }

    expect(
      advanceCharacterBuildClassLevel({
        build: buildForClass(paladinUnitId),
        unitLibrary,
        levelGain: cantripReplacement.right,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "missingFightingStyleCantripSpellcastingSource" },
    });
    expect(
      advanceCharacterBuildClassLevel({
        build: buildForClass(paladinUnitId),
        unitLibrary,
        levelGain: {
          tag: "classLevelGainWithListPreparedSpellcasting",
          classUnitId: paladinUnitId,
          hitPointRule: fixedHitPoints,
          preparedSpellcasting: {
            gainedPreparedSpells: [authoredUnitId("command")],
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "missingListPreparedSpellcasting" },
    });
  });

  test("rejects unknown invocation and Metamagic identities at construction", () => {
    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("synthetic_unknown"),
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "unknownEldritchInvocation",
        invocationId: "synthetic_unknown",
      },
    });
    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: sorcererUnitId,
        hitPointRule: fixedHitPoints,
        gainedOptions: ["synthetic_unknown"],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownSorcererMetamagicOption" },
    });
    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: sorcererUnitId,
        hitPointRule: fixedHitPoints,
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_empowered_spell",
          selectedOptionId: "sorcerer_empowered_spell",
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "sameSorcererMetamagicReplacement" },
    });
  });

  test("parses Eldritch Invocation repeatability and replacement identity", () => {
    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [
          {
            kind: "repeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("eldritch_blast"),
            },
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: "armor_of_shadows",
      },
    });

    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("agonizing_blast"),
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "missingRepeatableEldritchInvocationChoice",
        invocationId: "agonizing_blast",
      },
    });

    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [
          {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("eldritch_blast"),
            },
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: "lessons_of_the_first_ones",
      },
    });

    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [],
        replacement: {
          replaceInvocation: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
          selectedInvocation: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "sameEldritchInvocationReplacement",
        invocationId: "armor_of_shadows",
      },
    });
  });

  test("propagates replacement identity parsing failures", () => {
    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [],
        replacement: {
          replaceInvocation: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("synthetic_unknown"),
          },
          selectedInvocation: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "unknownEldritchInvocation",
        invocationId: "synthetic_unknown",
      },
    });

    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [],
        replacement: {
          replaceInvocation: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
          selectedInvocation: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("synthetic_unknown"),
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "unknownEldritchInvocation",
        invocationId: "synthetic_unknown",
      },
    });

    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: sorcererUnitId,
        hitPointRule: fixedHitPoints,
        gainedOptions: [],
        replacement: {
          replaceOptionId: "synthetic_unknown",
          selectedOptionId: "sorcerer_empowered_spell",
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "unknownSorcererMetamagicOption",
        optionId: "synthetic_unknown",
      },
    });

    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: sorcererUnitId,
        hitPointRule: fixedHitPoints,
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_empowered_spell",
          selectedOptionId: "synthetic_unknown",
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "unknownSorcererMetamagicOption",
        optionId: "synthetic_unknown",
      },
    });
  });

  test("rejects plain Sorcerer and Warlock gains from inconsistent retained choices", () => {
    const sorcererWithExtraOption = buildForClass(sorcererUnitId, [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
        optionId: parsedSorcererMetamagicOption("sorcerer_empowered_spell"),
      },
    ]);
    expect(
      advanceCharacterBuildClassLevel({
        build: sorcererWithExtraOption,
        unitLibrary,
        levelGain: {
          tag: "classLevelGain",
          classUnitId: sorcererUnitId,
          hitPointRule: fixedHitPoints,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidSorcererMetamagicSelectionCount",
        expectedCount: 0,
        actualCount: 1,
      },
    });

    expect(
      advanceCharacterBuildClassLevel({
        build: buildForClass(sorcererUnitId),
        unitLibrary,
        levelGain: {
          tag: "classLevelGain",
          classUnitId: sorcererUnitId,
          hitPointRule: fixedHitPoints,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidSorcererMetamagicGainCount",
        expectedGains: 2,
        actualGains: 0,
      },
    });

    expect(
      advanceCharacterBuildClassLevel({
        build: spellcastingBuild({
          classUnitId: warlockUnitId,
          classLevel: 11,
        }),
        unitLibrary,
        levelGain: {
          tag: "classLevelGain",
          classUnitId: warlockUnitId,
          hitPointRule: fixedHitPoints,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidEldritchInvocationSelectionCount",
        warlockLevel: 12,
        actualCount: 0,
      },
    });
  });

  test("keeps unrelated spellcasting sources while applying prepared-spell gains", () => {
    const build = spellcastingBuild({
      classUnitId: paladinUnitId,
      classLevel: 2,
      preparedSpells: [
        authoredUnitId("heroism"),
        authoredUnitId("searing_smite"),
        authoredUnitId("bless"),
      ],
      additionalSource: true,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId("paladin_weapon_mastery"),
          unitId: authoredUnitId("weapon_longsword"),
        },
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId("paladin_weapon_mastery"),
          unitId: authoredUnitId("weapon_dagger"),
        },
      ],
    });
    const result = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: {
        tag: "classLevelGainWithListPreparedSpellcasting",
        classUnitId: paladinUnitId,
        hitPointRule: fixedHitPoints,
        preparedSpellcasting: {
          gainedPreparedSpells: [authoredUnitId("command")],
        },
      },
    });

    expect(result).toMatchObject({
      _tag: "Right",
      right: {
        spellcasting: {
          sources: [
            {
              sourceUnitId: "class_paladin",
              preparedSpells: ["heroism", "searing_smite", "bless", "command"],
            },
            { sourceUnitId: "class_wizard" },
          ],
        },
      },
    });
  });

  test("rejects plain Fighter Weapon Mastery advancement without retained choices", () => {
    expect(
      advanceCharacterBuildClassLevel({
        build: fighterBuild(),
        unitLibrary,
        levelGain: {
          tag: "classLevelGain",
          classUnitId: fighterUnitId,
          hitPointRule: fixedHitPoints,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidWeaponMasterySelectionCount",
        expectedCount: 3,
        actualCount: 0,
      },
    });
  });

  test("keeps repeatable Warlock invocation identities distinct by Origin feat", () => {
    const originFeatChoice = {
      kind: "originFeat",
      featUnitId: authoredUnitId("feat_savage_attacker"),
    } as const;
    const build = spellcastingBuild({
      classUnitId: warlockUnitId,
      classLevel: 1,
      features: [
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: warlockInvocationSourceUnitId,
          selection: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: originFeatChoice,
          },
        },
      ],
    });
    const gain = warlockLevelGain({
      unitLibrary,
      classUnitId: warlockUnitId,
      hitPointRule: fixedHitPoints,
      pactMagic: {
        gainedCantrips: [],
        gainedPreparedSpells: [authoredUnitId("hex")],
      },
      gainedInvocations: [
        {
          kind: "nonRepeatable",
          invocationId: eldritchInvocationId("armor_of_shadows"),
        },
        {
          kind: "nonRepeatable",
          invocationId: eldritchInvocationId("devils_sight"),
        },
      ],
    });
    if (Either.isLeft(gain)) {
      throw new Error(
        `Expected Origin feat invocation gain: ${gain.left.message}`,
      );
    }

    const advanced = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: gain.right,
    });
    if (Either.isLeft(advanced)) {
      throw new Error(
        `Expected Origin feat invocation gain: ${advanced.left.message}`,
      );
    }
    expect(advanced.right.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: warlockInvocationSourceUnitId,
          selection: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: originFeatChoice,
          },
        },
      ]),
    );

    const sameOriginReplacementGain: CharacterBuildWarlockLevelGain = {
      ...gain.right,
      eldritchInvocations: {
        ...gain.right.eldritchInvocations,
        replacement: {
          replaceInvocation: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: {
              kind: "originFeat",
              featUnitId: authoredUnitId("feat_savage_attacker"),
            },
          },
          selectedInvocation: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: originFeatChoice,
          },
        },
      },
    };
    const replacedWithSameOrigin = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: sameOriginReplacementGain,
    });
    if (Either.isLeft(replacedWithSameOrigin)) {
      throw new Error(
        `Expected same-Origin invocation replacement: ${replacedWithSameOrigin.left.message}`,
      );
    }
    expect(replacedWithSameOrigin.right.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: warlockInvocationSourceUnitId,
          selection: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: originFeatChoice,
          },
        },
      ]),
    );

    const mismatchedChoiceReplacementGain: CharacterBuildWarlockLevelGain = {
      ...gain.right,
      eldritchInvocations: {
        ...gain.right.eldritchInvocations,
        replacement: {
          replaceInvocation: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("eldritch_blast"),
            },
          },
          selectedInvocation: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("lessons_of_the_first_ones"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("eldritch_blast"),
            },
          },
        },
      },
    };
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: mismatchedChoiceReplacementGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "missingSelectedEldritchInvocation" },
    });
  });

  test("rejects malformed or unavailable repeatable Warlock choices at advancement", () => {
    const source = spellcastingBuild({
      classUnitId: warlockUnitId,
      classLevel: 1,
      features: [
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: warlockInvocationSourceUnitId,
          selection: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("repelling_blast"),
          },
        },
      ],
    });
    const gainWithMalformedCurrentSelection: CharacterBuildWarlockLevelGain = {
      tag: "warlockLevelGain",
      classUnitId: typedWarlockClassUnitId,
      hitPointRule: fixedHitPoints,
      pactMagic: {
        gainedCantrips: [],
        gainedPreparedSpells: [authoredUnitId("hex")],
      },
      eldritchInvocations: {
        gainedInvocations: [
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("devils_sight"),
          },
        ],
      },
    };
    expect(
      advanceCharacterBuildClassLevel({
        build: source,
        unitLibrary,
        levelGain: gainWithMalformedCurrentSelection,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "missingRepeatableEldritchInvocationChoice",
        invocationId: "repelling_blast",
      },
    });

    const knownCantripBuild = spellcastingBuild({
      classUnitId: warlockUnitId,
      classLevel: 1,
      cantrips: [authoredUnitId("chill_touch"), authoredUnitId("mage_hand")],
      features: [
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: warlockInvocationSourceUnitId,
          selection: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
        },
      ],
    });
    const unavailableKnownCantripGain: CharacterBuildWarlockLevelGain = {
      ...gainWithMalformedCurrentSelection,
      eldritchInvocations: {
        gainedInvocations: [
          {
            kind: "repeatable",
            invocationId: eldritchInvocationId("repelling_blast"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("eldritch_blast"),
            },
          },
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("devils_sight"),
          },
        ],
      },
    };
    expect(
      advanceCharacterBuildClassLevel({
        build: knownCantripBuild,
        unitLibrary,
        levelGain: unavailableKnownCantripGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: "repelling_blast",
      },
    });

    const invalidRuleChoiceGain: CharacterBuildWarlockLevelGain = {
      ...gainWithMalformedCurrentSelection,
      eldritchInvocations: {
        gainedInvocations: [
          {
            kind: "repeatable",
            invocationId: eldritchInvocationId("repelling_blast"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("fire_bolt"),
            },
          },
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("devils_sight"),
          },
        ],
      },
    };
    const validInvocationBuild = spellcastingBuild({
      classUnitId: warlockUnitId,
      classLevel: 1,
      features: [
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: warlockInvocationSourceUnitId,
          selection: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("armor_of_shadows"),
          },
        },
      ],
    });
    expect(
      advanceCharacterBuildClassLevel({
        build: validInvocationBuild,
        unitLibrary,
        levelGain: invalidRuleChoiceGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: "repelling_blast",
      },
    });
  });
});
