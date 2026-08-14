// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.bard-magical-secrets-spell-access character-creation.class-feature-feat-choice
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110C-02-MAGICAL-SECRETS-SPELL-ACCESS bard_magical_secrets
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110B-03-SUBCLASS-GRANTS-AND-REPEATED-FEATURES rogue_ability_score_improvement_l10
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  abilityScoreAssignment,
  advanceCharacterBuildClassLevel,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitId,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  creationHoleId,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  copperPieceAmount,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterDraft,
  type CharacterProgression,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type CreationHoleIdText,
  type UnitChoiceKey,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

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
      _tag: "Right",
      right: {
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
    if (Either.isRight(result)) {
      const bardSource = result.right.spellcasting?.sources.find(
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
      _tag: "Left",
      left: { code: "invalidListPreparedSpellChoice", spellId: "hex" },
    });
  });

  test(rogueAbilityScoreImprovementLevelTenTestName, () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-10-rogue-asi",
      progression: testProgression(authoredUnitId("class_rogue"), 10),
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

function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource?: Readonly<
    Record<string, readonly CreationChoiceOptionId[]>
  >;
}): CharacterDraft {
  let draft = createCharacterDraft({
    draftId: characterDraftId(input.draftId),
  });
  draft = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(progressionOptionId(input.progression)),
    }),
  );

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) return draft;
    draft = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map((hole) =>
          supportedFillForHole(hole, input.preferredOptionIdsBySource),
        ),
      }),
    );
  }
  throw new Error("Supported Rogue level-10 fixture still has holes.");
}

function supportedFillForHole(
  hole: CreationHole,
  preferredOptionIdsBySource?: Readonly<
    Record<string, readonly CreationChoiceOptionId[]>
  >,
): CreationFill {
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: expectRight(
        abilityScoreAssignment({
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        }),
      ),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(`No supported options for discovered hole ${hole.holeId}.`);
  }
  const holeOptionIdSet = new Set(
    hole.options.map((option) => option.optionId),
  );
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const preferredOptionIds =
    hole.source.tag === "unitChoice"
      ? (preferredOptionIdsBySource?.[unitChoiceSourceKey(hole.source)] ??
        soldierBackgroundFixtureOptionIds(hole.source))
      : hole.source.tag === "draft" && hole.source.path === "draft.background"
        ? [creationChoiceOptionId("background_soldier")]
        : undefined;
  const selectedOptionIds = (preferredOptionIds ?? [...holeOptionIdSet])
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(`Not enough supported options for hole ${hole.holeId}.`);
  }

  return { kind: "choice", holeId: hole.holeId, optionIds: selectedOptionIds };
}

function initialManifestFills(
  selectedProgressionOptionId: string,
): readonly CreationFill[] {
  return [
    choiceFill(
      "cc:draft:draft.progression.initial",
      selectedProgressionOptionId,
    ),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: expectRight(
        abilityScoreAssignment({
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        }),
      ),
    },
    {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function choiceFill(holeId: string, optionId: string): CreationFill {
  return {
    kind: "choice",
    holeId: creationHoleId(holeId as CreationHoleIdText),
    optionIds: [creationChoiceOptionId(optionId)],
  };
}

function testProgression(
  classUnitIdText: UnitRecord["id"],
  classLevel: number,
): CharacterProgression {
  return expectRight(
    parseCharacterProgressionShape({
      startingClass: expectRight(
        classUnitIdFromUnitId({ unitLibrary, classUnitId: classUnitIdText }),
      ),
      advancements: Array.from({ length: classLevel - 1 }, () => ({
        classUnitId: expectRight(
          classUnitIdFromUnitId({ unitLibrary, classUnitId: classUnitIdText }),
        ),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    }),
  );
}

function testUnitChoiceSourceKey(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): string {
  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: expectRight(unitChoiceSourceUnitId(unitId)),
    choiceKey,
  });
}

function requireAcceptedBatch(
  result: ReturnType<typeof fillCreationHoles>,
): CharacterDraft {
  if (result.tag !== "accepted") {
    throw new Error(`Expected accepted fill batch: ${JSON.stringify(result)}`);
  }
  return result.draft;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right: ${JSON.stringify(result.left)}`);
  }
  return result.right;
}
