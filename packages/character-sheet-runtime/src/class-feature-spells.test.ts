// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-prepared-spell-access
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  Result,
  Hp,
  armorClassBuild,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  characterSheetClassFeatureSelectedReferenceProjection,
  characterSheetId,
  parseCharacterSheet,
  rebuildCharacterSheetFixture,
  requireRight,
  storedAvailableSheetInput,
  subclassPreparedSpellAccessBlocksBookOfShadowsDuplicateTestName,
  subclassPreparedSpellAccessProgressionTestName,
  unitLibrary,
} from "./test-support.test-support.ts";

describe("Character Sheet runtime / class feature prepared spells", () => {
  test("projects retained class-feature selected references through the public route", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:class-feature-references"),
        build: armorClassBuild({
          startingClass: "class_cleric",
          advancements: ["class_cleric", "class_cleric"],
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_cleric"),
              unitId: authoredUnitId("subclass_cleric_life_domain"),
            },
            {
              kind: "abilityCheckBonus",
              selectedFromUnitId: authoredUnitId("class_cleric"),
              ability: "wis",
              skills: [],
              bonus: {
                kind: "abilityModifier",
                ability: "wis",
                minimum: 1,
              },
            },
          ],
        }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      characterSheetClassFeatureSelectedReferenceProjection({
        sheet,
        unitLibrary,
      }),
    ).toMatchObject({
      selectedClassChoiceUnitIds: ["subclass_cleric_life_domain"],
      qRoute: [
        {
          kind: "retainCharacterSheetSelectedReferences",
          subject: "selectedReferenceProjection",
          owner: "selectedReference",
        },
        {
          kind: "projectCharacterSheetFacts",
          subject: "selectedReferenceProjection",
          owner: "buildProjection",
        },
      ],
    });
  });

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
              selectedFromUnitId: authoredUnitId("class_warlock"),
              unitId: authoredUnitId("subclass_warlock_fiend_patron"),
            },
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: authoredUnitId(
                "warlock_eldritch_invocations",
              ),
              selection: {
                kind: "nonRepeatable",
                invocationId: "pact_of_the_tome",
              },
            },
          ],
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("class_warlock"),
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

    expect(Result.isFailure(sheet)).toBe(true);
    if (Result.isFailure(sheet)) {
      expect(sheet.failure.message).toBe(
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
              selectedFromUnitId: authoredUnitId(input.startingClass),
              unitId: authoredUnitId(input.subclassUnitId),
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
