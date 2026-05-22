import { describe, expect, test } from "vitest";
import { Either, Option } from "effect";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";

import {
  abilityScoreAssignment,
  characterBuildProficiencies,
  characterBuildUnitRefs,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type AbilityScoreAssignment,
  type CharacterDraft,
  type CharacterProgression,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type UnitCatalog,
  type UnitChoiceKey,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  CLASS_SUBCLASS_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { eligibleExpertiseSkills } from "./discovery.ts";
import { wizardSpellcastingCreationAtLevel } from "./class-spellcasting.ts";

// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-WIZARD-SCHOLAR wizard_scholar
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-WIZARD-EVOKER-EVOCATION-SAVANT wizard_evocation_savant
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.wizard-spellbook-learning-choice

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("Wizard Scholar", () => {
  test("finalizes one listed owned skill as Scholar Expertise", () => {
    const wizard = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-2-wizard-scholar",
      progression: testProgression("class_wizard", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "class_wizard",
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("insight"),
          creationChoiceOptionId("arcana"),
        ],
      },
    });
    const selectedScholarExpertise = selectedChoiceOptionIds(
      wizard,
      "wizard_scholar",
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    );

    expect(selectedScholarExpertise).toEqual(["arcana"]);

    const wizardBuild = finalizeCharacterDraft({ draft: wizard, unitLibrary });
    expect(wizardBuild.tag).toBe("ready");
    if (wizardBuild.tag !== "ready") {
      return;
    }

    const proficiencies = expectRight(
      characterBuildProficiencies(wizardBuild.build, unitLibrary),
    );
    expect(proficiencies.skills).toEqual(
      expect.arrayContaining(["insight", "arcana"]),
    );
    expect(proficiencies.expertise).toEqual(["arcana"]);
    expect(wizardBuild.build.spellcasting?.sources[0]?.spellbook).toHaveLength(
      8,
    );
    expect(
      wizardBuild.build.spellcasting?.sources[0]?.preparedSpells,
    ).toHaveLength(5);
    expect(
      wizardBuild.build.spellcasting?.slotPools.spellcasting?.slots,
    ).toEqual([{ spellLevel: 1, count: 3 }]);
    expect(
      characterBuildUnitRefs(wizardBuild.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toContain("wizard_scholar");
  });

  test("rejects Scholar Expertise outside the listed skills", () => {
    const wizard = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-2-wizard-invalid-scholar",
      progression: testProgression("class_wizard", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "class_wizard",
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("insight"),
          creationChoiceOptionId("arcana"),
        ],
      },
    });
    const invalidScholar: CharacterDraft = {
      ...wizard,
      selections: {
        ...wizard.selections,
        choices: wizard.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "wizard_scholar" &&
          choice.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY
            ? {
                ...choice,
                options: choice.options.map((option) => ({
                  ...option,
                  optionId: creationChoiceOptionId("insight"),
                })),
              }
            : choice,
        ),
      },
    };

    expect(
      finalizeCharacterDraft({ draft: invalidScholar, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
    });
  });

  test("rejects Scholar Expertise in a skill that already has Expertise", () => {
    const expertWizardUnitLibrary = unitCatalogWithWizardPriorExpertise();
    const wizard = completeSupportedProgressionDraft({
      unitLibrary: expertWizardUnitLibrary,
      draftId: "draft:srd-level-2-wizard-duplicate-scholar-expertise",
      progression: testProgression("class_wizard", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "class_wizard",
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("arcana"),
          creationChoiceOptionId("history"),
        ],
        [testUnitChoiceSourceKey(
          "wizard_scholar",
          CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        )]: [creationChoiceOptionId("history")],
      },
    });
    const duplicateScholarExpertise: CharacterDraft = {
      ...wizard,
      selections: {
        ...wizard.selections,
        choices: wizard.selections.choices.map((choice) => {
          if (
            choice.kind === "unitChoice" &&
            choice.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY &&
            choice.source.unitId === "rogue_expertise"
          ) {
            return {
              ...choice,
              options: [
                { optionId: creationChoiceOptionId("arcana") },
                { optionId: creationChoiceOptionId("athletics") },
              ],
            };
          }
          if (
            choice.kind === "unitChoice" &&
            choice.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY &&
            choice.source.unitId === "wizard_scholar"
          ) {
            return {
              ...choice,
              options: choice.options.map((option) => ({
                ...option,
                optionId: creationChoiceOptionId("arcana"),
              })),
            };
          }

          return choice;
        }),
      },
    };

    expect(
      finalizeCharacterDraft({
        draft: duplicateScholarExpertise,
        unitLibrary: expertWizardUnitLibrary,
      }),
    ).toMatchObject({
      tag: "invalid",
    });
  });

  test("excludes existing Expertise from listed owned skill eligibility", () => {
    expect(
      eligibleExpertiseSkills(
        {
          kind: "listed_owned_skill_proficiencies_without_expertise",
          skills: ["arcana", "history"],
        },
        ["arcana", "history"],
        ["arcana"],
      ),
    ).toEqual(["history"]);
  });

  test("does not reuse lower Wizard spellcasting progression rows", () => {
    const classFacts = readableClassFacts("class_wizard");
    if (
      !("spellcasting" in classFacts) ||
      classFacts.spellcasting.kind !== "wizard_spellcasting_creation"
    ) {
      throw new Error("Expected Wizard spellcasting creation facts.");
    }

    expect(
      wizardSpellcastingCreationAtLevel(classFacts.spellcasting, 3),
    ).toMatchObject({
      spellbookAccess: { choose: 10 },
      preparedAccess: { choose: 6 },
      spellSlotProjection: {
        slots: [
          { spellLevel: 1, count: 4 },
          { spellLevel: 2, count: 2 },
        ],
      },
    });
  });

  test("discovers and finalizes Evocation Savant spellbook choices", () => {
    const wizard = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-3-wizard-evocation-savant",
      progression: testProgression("class_wizard", 3),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "class_wizard",
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("insight"),
          creationChoiceOptionId("arcana"),
        ],
        [testUnitChoiceSourceKey("class_wizard", CLASS_SUBCLASS_CHOICE_KEY)]: [
          creationChoiceOptionId("subclass_wizard_evoker"),
        ],
        [testUnitChoiceSourceKey("class_wizard", WIZARD_SPELLBOOK_CHOICE_KEY)]:
          [
            creationChoiceOptionId("detect_magic"),
            creationChoiceOptionId("feather_fall"),
            creationChoiceOptionId("mage_armor"),
            creationChoiceOptionId("magic_missile"),
            creationChoiceOptionId("shield"),
            creationChoiceOptionId("sleep"),
            creationChoiceOptionId("thunderwave"),
            creationChoiceOptionId("chromatic_orb"),
            creationChoiceOptionId("mirror_image"),
            creationChoiceOptionId("misty_step"),
          ],
        [testUnitChoiceSourceKey(
          "wizard_evocation_savant",
          WIZARD_SPELLBOOK_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("continual_flame"),
          creationChoiceOptionId("shatter"),
        ],
        [testUnitChoiceSourceKey(
          "class_wizard",
          WIZARD_PREPARED_SPELL_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("magic_missile"),
          creationChoiceOptionId("shield"),
          creationChoiceOptionId("thunderwave"),
          creationChoiceOptionId("chromatic_orb"),
          creationChoiceOptionId("continual_flame"),
          creationChoiceOptionId("shatter"),
        ],
      },
    });

    expect(
      selectedChoiceOptionIds(
        wizard,
        "wizard_evocation_savant",
        WIZARD_SPELLBOOK_CHOICE_KEY,
      ),
    ).toEqual([
      creationChoiceOptionId("continual_flame"),
      creationChoiceOptionId("shatter"),
    ]);

    const wizardBuild = finalizeCharacterDraft({ draft: wizard, unitLibrary });
    expect(wizardBuild.tag).toBe("ready");
    if (wizardBuild.tag !== "ready") {
      return;
    }

    expect(wizardBuild.build.spellcasting?.sources[0]?.spellbook).toEqual(
      expect.arrayContaining(["continual_flame", "shatter"]),
    );
    expect(wizardBuild.build.spellcasting?.sources[0]?.spellbook).toHaveLength(
      12,
    );
    expect(wizardBuild.build.spellcasting?.sources[0]?.preparedSpells).toEqual(
      expect.arrayContaining(["continual_flame", "shatter"]),
    );
    expect(
      characterBuildUnitRefs(wizardBuild.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "subclass_wizard_evoker",
        "wizard_evocation_savant",
      ]),
    );
  });

  test("rejects duplicate Evocation Savant spellbook selections", () => {
    const wizard = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-3-wizard-duplicate-evocation-savant",
      progression: testProgression("class_wizard", 3),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "class_wizard",
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("insight"),
          creationChoiceOptionId("arcana"),
        ],
        [testUnitChoiceSourceKey(
          "wizard_evocation_savant",
          WIZARD_SPELLBOOK_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("magic_missile"),
          creationChoiceOptionId("continual_flame"),
        ],
      },
    });

    expect(
      finalizeCharacterDraft({ draft: wizard, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
    });
  });
});

function testProgression(
  classUnitId: UnitRecord["id"],
  classLevel: number,
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Either.isLeft(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.left)}`,
    );
  }
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.right,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.right,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test progression: ${JSON.stringify(result.left)}`);
  }

  return result.right;
}

type PreferredSupportedFillOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;

function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly progression: CharacterProgression;
  readonly unitLibrary?: UnitCatalog;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
}): CharacterDraft {
  const testUnitLibrary = input.unitLibrary ?? unitLibrary;
  let draft = createCharacterDraft({
    unitLibrary: testUnitLibrary,
    draftId: characterDraftId(input.draftId),
  });
  const progressionOption = progressionOptionId(input.progression);

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({
      draft,
      unitLibrary: testUnitLibrary,
    });
    if (holes.length === 0) {
      return draft;
    }

    const result = fillCreationHoles({
      draft,
      unitLibrary: testUnitLibrary,
      expectedRevision: draft.revision,
      fills: holes.map((hole) =>
        supportedFillForHole({
          hole,
          ...(input.preferredOptionIdsBySource === undefined
            ? {}
            : {
                preferredOptionIdsBySource: input.preferredOptionIdsBySource,
              }),
          progressionOption,
        }),
      ),
    });
    if (result.tag !== "accepted") {
      throw new Error(
        `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
      );
    }
    draft = result.draft;
  }

  throw new Error(
    `Supported progression fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary: testUnitLibrary }).map(
        (hole) => hole.holeId,
      ),
    )}`,
  );
}

function supportedFillForHole(input: {
  readonly hole: CreationHole;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
  readonly progressionOption: CreationChoiceOptionId;
}): CreationFill {
  if (input.hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: input.hole.holeId,
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(input.hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for discovered test hole: ${input.hole.holeId}`,
    );
  }
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const holeOptionIds = input.hole.options.map((option) => option.optionId);
  const preferredOptionIds =
    input.hole.source.tag === "draft" &&
    input.hole.source.path === "draft.progression.initial"
      ? [input.progressionOption]
      : input.hole.source.tag === "unitChoice"
        ? input.preferredOptionIdsBySource?.[
            unitChoiceSourceKey(input.hole.source)
          ]
        : undefined;
  const holeOptionIdSet = new Set(holeOptionIds);
  const selectedOptionIds = (preferredOptionIds ?? holeOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(input.hole.cardinality).max);
  if (
    selectedOptionIds.length <
    choiceCardinalityBounds(input.hole.cardinality).max
  ) {
    throw new Error(
      `Not enough supported options for discovered test hole: ${input.hole.holeId}`,
    );
  }

  return {
    kind: "choice",
    holeId: input.hole.holeId,
    optionIds: selectedOptionIds,
  };
}

function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.right;
}

function testUnitChoiceSourceKey(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): string {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Either.isLeft(sourceUnitId)) {
    throw new Error(
      `Invalid test Unit choice source Unit id: ${JSON.stringify(sourceUnitId.left)}`,
    );
  }

  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: sourceUnitId.right,
    choiceKey,
  });
}

function selectedChoiceOptionIds(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: string,
): readonly CreationChoiceOptionId[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.map((option) => option.optionId)
      : [],
  );
}

function readableClassFacts(classUnitId: UnitRecord["id"]) {
  const facts = readClassCreationFacts(unitLibrary.requireUnit(classUnitId));
  if (facts.tag !== "readable") {
    throw new Error(`Expected readable class facts for ${classUnitId}.`);
  }

  return facts.value;
}

function unitCatalogWithWizardPriorExpertise(): UnitCatalog {
  const wizard = unitLibrary.requireUnit("class_wizard");
  if (wizard.kind !== "class") {
    throw new Error("Expected Wizard class Unit.");
  }

  return unitCatalogWithReplacementUnits([
    {
      ...wizard,
      featureGrants: [
        {
          level: 1,
          unitId: "rogue_expertise",
        },
        ...wizard.featureGrants,
      ],
    },
  ]);
}

function unitCatalogWithReplacementUnits(
  replacements: readonly UnitRecord[],
): UnitCatalog {
  const replacementById = new Map(
    replacements.map((unit) => [unit.id, unit] as const),
  );
  const originalUnitIds = new Set(
    unitLibrary.listUnits().map((unit) => unit.id),
  );

  return {
    getUnit: (id) => {
      const replacement = replacementById.get(id);
      return replacement === undefined
        ? unitLibrary.getUnit(id)
        : Option.some(replacement);
    },
    listUnits: () => [
      ...unitLibrary
        .listUnits()
        .map((unit) => replacementById.get(unit.id) ?? unit),
      ...replacements.filter((unit) => !originalUnitIds.has(unit.id)),
    ],
    requireUnit: (id) => replacementById.get(id) ?? unitLibrary.requireUnit(id),
  };
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }
  expect(Either.isRight(result)).toBe(true);

  return result.right;
}
