// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-prepared-spell-access
import { describe, expect, test } from "vitest";
import {
  Either,
  armorClassBuild,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  parseCharacterSheet,
  storedAvailableSheetInput,
  subclassPreparedSpellAccessBlocksBookOfShadowsDuplicateTestName,
  subclassPreparedSpellAccessProgressionTestName,
  unitLibrary
} from "./test-support.ts";

describe("Character Sheet runtime / class feature prepared spells", () => {
  test(subclassPreparedSpellAccessBlocksBookOfShadowsDuplicateTestName, () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:fiend-duplicate-book-spell",
        build: {
          ...armorClassBuild({
            startingClass: "class_warlock",
            advancements: ["class_warlock", "class_warlock"],
          }),
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: "class_warlock",
              unitId: "subclass_warlock_fiend_patron",
            },
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: "warlock_eldritch_invocations",
              selection: {
                kind: "nonRepeatable",
                invocationId: "pact_of_the_tome",
              },
            },
          ],
          spellcasting: {
            sources: [
              {
                sourceUnitId: "class_warlock",
                spellcastingAbility: "cha",
                cantrips: [],
                spellbook: [],
                preparedSpells: [],
                spellcastingFocuses: ["arcane_focus"],
                bookOfShadows: {
                  tag: "bookOfShadows",
                  cantrips: ["fire_bolt", "minor_illusion", "spare_the_dying"],
                  ritualSpells: ["burning_hands", "detect_magic"],
                  spellcastingFocus: "book_of_shadows",
                },
              },
            ],
            slotPools: {
              pactMagic: {
                kind: "pactMagic",
                slotLevel: 2,
                count: 2,
              },
            },
          },
        },
      }),
      unitLibrary,
    );

    expect(Either.isLeft(sheet)).toBe(true);
    if (Either.isLeft(sheet)) {
      expect(sheet.left.message).toBe(
        "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
      );
    }
  });

  test(subclassPreparedSpellAccessProgressionTestName, () => {
    const subclassAccess = (input: {
      readonly startingClass: string;
      readonly advancements: readonly string[];
      readonly subclassUnitId: string;
      readonly featureUnitId: string;
    }) =>
      characterSheetClassFeaturePreparedSpellAccessesForBuild({
        build: armorClassBuild({
          startingClass: input.startingClass,
          advancements: input.advancements,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: input.startingClass,
              unitId: input.subclassUnitId,
            },
          ],
        }),
        unitLibrary,
      }).find((access) => access.sourceUnitId === input.featureUnitId)
        ?.spellIds;

    expect(
      subclassAccess({
        startingClass: "class_cleric",
        advancements: ["class_cleric", "class_cleric"],
        subclassUnitId: "subclass_cleric_life_domain",
        featureUnitId: "cleric_life_domain_spells",
      }),
    ).toEqual(["aid", "bless", "cure_wounds", "lesser_restoration"]);
    expect(
      subclassAccess({
        startingClass: "class_cleric",
        advancements: Array.from({ length: 8 }, () => "class_cleric"),
        subclassUnitId: "subclass_cleric_life_domain",
        featureUnitId: "cleric_life_domain_spells",
      }),
    ).toEqual([
      "aid",
      "bless",
      "cure_wounds",
      "lesser_restoration",
      "mass_healing_word",
      "revivify",
      "aura_of_life",
      "death_ward",
      "greater_restoration",
      "mass_cure_wounds",
    ]);
    expect(
      subclassAccess({
        startingClass: "class_paladin",
        advancements: Array.from({ length: 8 }, () => "class_paladin"),
        subclassUnitId: "subclass_paladin_oath_of_devotion",
        featureUnitId: "paladin_oath_of_devotion_spells",
      }),
    ).toEqual([
      "protection_from_evil_and_good",
      "shield_of_faith",
      "aid",
      "zone_of_truth",
      "beacon_of_hope",
      "dispel_magic",
    ]);
    expect(
      subclassAccess({
        startingClass: "class_sorcerer",
        advancements: Array.from({ length: 8 }, () => "class_sorcerer"),
        subclassUnitId: "subclass_sorcerer_draconic_sorcery",
        featureUnitId: "sorcerer_draconic_spells",
      }),
    ).toEqual([
      "alter_self",
      "chromatic_orb",
      "command",
      "dragons_breath",
      "fear",
      "fly",
      "arcane_eye",
      "charm_monster",
      "legend_lore",
      "summon_dragon",
    ]);
    expect(
      subclassAccess({
        startingClass: "class_warlock",
        advancements: Array.from({ length: 8 }, () => "class_warlock"),
        subclassUnitId: "subclass_warlock_fiend_patron",
        featureUnitId: "warlock_fiend_spells",
      }),
    ).toEqual([
      "burning_hands",
      "command",
      "scorching_ray",
      "suggestion",
      "fireball",
      "stinking_cloud",
      "fire_shield",
      "wall_of_fire",
      "geas",
      "insect_plague",
    ]);
  });
});
