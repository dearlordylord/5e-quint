// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.bard-magical-secrets-spell-access character-creation.class-feature-feat-choice
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110C-02-MAGICAL-SECRETS-SPELL-ACCESS bard_magical_secrets
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110B-03-SUBCLASS-GRANTS-AND-REPEATED-FEATURES rogue_ability_score_improvement_l10
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Result } from "effect";

import {
  abilityScoreAssignment,
  advanceCharacterBuildClassLevel,
  classUnitId,
  creationChoiceOptionId,
  finalizeCharacterDraft,
  copperPieceAmount,
  type CharacterBuild,
} from "./index.ts";
import {
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  completeSupportedProgressionDraft,
  testProgression,
  testUnitChoiceSourceKey,
} from "./supported-progression-fill.test-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

export const bardMagicalSecretsLevelTenSpellAccessTestName =
  "Bard Magical Secrets widens level-10 prepared-spell gains and replacements";
export const bardMagicalSecretsLevelTenSpellAccessGateTestName =
  "Bard level-10 advancement still rejects spells outside Magical Secrets lists";
export const rogueAbilityScoreImprovementLevelTenTestName =
  "Rogue level-10 Ability Score Improvement finalizes through the existing repeated feat-choice owner";

describe("Level 10 character support", () => {
  test(bardMagicalSecretsLevelTenSpellAccessTestName, () => {
    const build = bardLevelNineBuild();
    const result = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: {
        tag: "classLevelGainWithListPreparedSpellcasting",
        classUnitId: classUnitId(authoredUnitId("class_bard")),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        preparedSpellcasting: {
          gainedPreparedSpells: [authoredUnitId("fireball")],
          preparedSpellReplacement: {
            replaceSpellId: authoredUnitId("charm_person"),
            selectedSpellId: authoredUnitId("revivify"),
          },
        },
      },
    });

    expect(result).toMatchObject({
      _tag: "Success",
      success: {
        spellcasting: {
          sources: [
            expect.objectContaining({
              sourceUnitId: "class_bard",
              preparedSpells: expect.arrayContaining(["fireball", "revivify"]),
            }),
          ],
          slotPools: {
            spellcasting: {
              slots: [
                { spellLevel: 1, count: 4 },
                { spellLevel: 2, count: 3 },
                { spellLevel: 3, count: 3 },
                { spellLevel: 4, count: 3 },
                { spellLevel: 5, count: 2 },
              ],
            },
          },
        },
      },
    });
    if (Result.isSuccess(result)) {
      const bardSource = result.success.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_bard",
      );
      expect(bardSource?.preparedSpells).toHaveLength(15);
      expect(bardSource?.preparedSpells).not.toContain("charm_person");
    }
  });

  test(bardMagicalSecretsLevelTenSpellAccessGateTestName, () => {
    const result = advanceCharacterBuildClassLevel({
      build: bardLevelNineBuild(),
      unitLibrary,
      levelGain: {
        tag: "classLevelGainWithListPreparedSpellcasting",
        classUnitId: classUnitId(authoredUnitId("class_bard")),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        preparedSpellcasting: {
          gainedPreparedSpells: [authoredUnitId("hex")],
        },
      },
    });

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidListPreparedSpellChoice", spellId: "hex" },
    });
  });

  test(rogueAbilityScoreImprovementLevelTenTestName, () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-10-rogue-asi",
      unitLibrary,
      progression: testProgression(
        unitLibrary,
        authoredUnitId("class_rogue"),
        10,
      ),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          authoredUnitId("rogue_ability_score_improvement_l4"),
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("feat_ability_score_improvement")],
        [testUnitChoiceSourceKey(
          authoredUnitId("rogue_ability_score_improvement_l4"),
          CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        )]: [creationChoiceOptionId("ability_score:str:+2:max20")],
        [testUnitChoiceSourceKey(
          authoredUnitId("rogue_ability_score_improvement_l8"),
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("feat_ability_score_improvement")],
        [testUnitChoiceSourceKey(
          authoredUnitId("rogue_ability_score_improvement_l8"),
          CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        )]: [creationChoiceOptionId("ability_score:dex:+2:max20")],
        [testUnitChoiceSourceKey(
          authoredUnitId("rogue_ability_score_improvement_l10"),
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("feat_ability_score_improvement")],
        [testUnitChoiceSourceKey(
          authoredUnitId("rogue_ability_score_improvement_l10"),
          CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        )]: [creationChoiceOptionId("ability_score:wis:+2:max20")],
      },
    });

    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result).toMatchObject({
      tag: "ready",
      build: {
        features: expect.arrayContaining([
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "rogue_ability_score_improvement_l10",
            unitId: "feat_ability_score_improvement",
          },
        ]),
        abilityScores: expect.objectContaining({
          wis: 12,
        }),
      },
    });
  });
});

function bardLevelNineBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_bard")),
      advancements: Array.from({ length: 8 }, () => ({
        classUnitId: classUnitId(authoredUnitId("class_bard")),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 15,
      }),
    ),
    proficiencyChoices: [],
    features: [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: authoredUnitId("class_bard"),
        unitId: authoredUnitId("subclass_bard_college_of_lore"),
      },
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: authoredUnitId("class_bard"),
        unitId: authoredUnitId("bard_magical_secrets"),
      },
    ],
    magicInitiateSpellAccesses: [],
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_bard"),
          spellcastingAbility: "cha",
          cantrips: [
            authoredUnitId("light"),
            authoredUnitId("minor_illusion"),
            authoredUnitId("vicious_mockery"),
          ],
          spellbook: [],
          preparedSpells: [
            authoredUnitId("charm_person"),
            authoredUnitId("color_spray"),
            authoredUnitId("cure_wounds"),
            authoredUnitId("dissonant_whispers"),
            authoredUnitId("healing_word"),
            authoredUnitId("heroism"),
            authoredUnitId("invisibility"),
            authoredUnitId("shatter"),
            authoredUnitId("dispel_magic"),
            authoredUnitId("fear"),
            authoredUnitId("hypnotic_pattern"),
            authoredUnitId("slow"),
            authoredUnitId("sending"),
            authoredUnitId("speak_with_dead"),
          ],
          spellcastingFocuses: ["musical_instrument"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 3 },
            { spellLevel: 4, count: 3 },
            { spellLevel: 5, count: 1 },
          ],
        },
      },
    },
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
}

function expectRight<T, E>(result: Result.Result<T, E>): T {
  if (Result.isFailure(result)) {
    throw new Error(`Expected Right: ${JSON.stringify(result.failure)}`);
  }
  return result.success;
}
