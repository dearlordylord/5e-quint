import { Result } from "effect";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  abilityScoreAssignment,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles,
  fillCreationHoles,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type AbilityScoreAssignment,
  type CharacterDraft,
  type CharacterDraftPath,
  type CharacterProgression,
  type ClassHitPointRule,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type CreationHoleIdText,
  type UnitCatalog,
  type UnitChoiceKey,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

/**
 * Canonical supported-progression fill helpers (issue #528, Step 2): one
 * shared implementation of the discover/fill loop and its satellite helpers,
 * replacing per-test-file copies whose defaults had diverged. Divergent
 * choices (standard-array assignment, species/background defaults, fixture
 * option chains, pass budget) are explicit options. Helpers throw on invalid
 * test fixtures; production APIs keep their `Result`/tagged-union boundaries.
 */

export type PreferredSupportedFillOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;

export type SupportedFillFixtureOptionIds = (source: {
  readonly unitId: UnitRecord["id"];
  readonly choiceKey: UnitChoiceKey;
}) => readonly CreationChoiceOptionId[] | undefined;

const DEFAULT_STANDARD_ARRAY_ASSIGNMENT = {
  str: 15,
  dex: 14,
  con: 13,
  int: 8,
  wis: 10,
  cha: 12,
} as const satisfies RawAbilityScoreAssignment;

const DEFAULT_MAX_FILL_PASSES = 12;

export function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Result.isFailure(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.success;
}

export function requireAcceptedBatch(
  result: ReturnType<typeof fillCreationHoles>,
): CharacterDraft {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }

  return result.draft;
}

export function holeSummary(
  holes: readonly CreationHole[],
): readonly (readonly [CreationHole["kind"], string, readonly string[]])[] {
  return holes.map((hole) => [
    hole.kind,
    hole.holeId,
    hole.kind === "abilityScores"
      ? hole.methods
      : "options" in hole
        ? hole.options.map((option) => option.optionId)
        : [],
  ]);
}

export function testUnitChoiceSourceKey(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): string {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Result.isFailure(sourceUnitId)) {
    throw new Error(
      `Invalid test Unit choice source Unit id: ${JSON.stringify(sourceUnitId.failure)}`,
    );
  }

  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: sourceUnitId.success,
    choiceKey,
  });
}

export function testProgression(
  unitLibrary: UnitCatalog,
  classUnitId: UnitRecord["id"],
  classLevel: number,
  hitPointRule: ClassHitPointRule = classLevel === 1
    ? { tag: "levelOneMaximumHitDie" }
    : { tag: "fixedHigherLevelGain" },
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Result.isFailure(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.failure)}`,
    );
  }
  if (classLevel === 1 && hitPointRule.tag !== "levelOneMaximumHitDie") {
    throw new Error("Invalid test progression: level 1 requires maximum HP.");
  }
  if (classLevel > 1 && hitPointRule.tag !== "fixedHigherLevelGain") {
    throw new Error(
      "Invalid test progression: post-start levels require fixed HP.",
    );
  }
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.success,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.success,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Result.isFailure(result)) {
    throw new Error(
      `Invalid test progression: ${JSON.stringify(result.failure)}`,
    );
  }

  return result.success;
}

export function choiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    // Test fixtures pass discovered hole ids as text, so they cast at the same
    // protocol boundary as caller-provided fill payloads.
    holeId: creationHoleId(holeId as CreationHoleIdText),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

export function initialManifestFills(
  selectedProgressionOptionId: CreationChoiceOptionId = creationChoiceOptionId(
    "13:class_fighter:level_1:maximum_hit_die",
  ),
  speciesUnitId: UnitRecord["id"] = PHASE1_SPECIES_ORC_UNIT_ID,
  backgroundUnitId: UnitRecord["id"] = PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
): readonly CreationFill[] {
  return [
    choiceFill(
      "cc:draft:draft.progression.initial",
      selectedProgressionOptionId,
    ),
    choiceFill("cc:draft:draft.background", backgroundUnitId),
    choiceFill("cc:draft:draft.species", speciesUnitId),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: testAbilityScoreAssignment(DEFAULT_STANDARD_ARRAY_ASSIGNMENT),
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

export function manifestFixtureOptionIds(source: {
  readonly unitId: UnitRecord["id"];
  readonly choiceKey: UnitChoiceKey;
}): readonly CreationChoiceOptionId[] | undefined {
  if (source.choiceKey === CLASS_EQUIPMENT_CHOICE_KEY) {
    return [
      creationChoiceOptionId(
        source.unitId === "class_fighter" ? "option_c" : "option_b",
      ),
    ];
  }
  if (source.choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY) {
    return [creationChoiceOptionId("option_b")];
  }
  if (
    source.unitId === "wizard_evocation_savant" &&
    source.choiceKey === WIZARD_SPELLBOOK_CHOICE_KEY
  ) {
    return [
      creationChoiceOptionId("gust_of_wind"),
      creationChoiceOptionId("shatter"),
    ];
  }
  if (
    source.unitId === "barbarian_primal_knowledge" &&
    source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY
  ) {
    return [creationChoiceOptionId("nature")];
  }

  return soldierBackgroundFixtureOptionIds(source);
}

export function supportedFillForHole(input: {
  readonly hole: CreationHole;
  readonly progressionOption: CreationChoiceOptionId;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
  readonly standardArrayAssignment?: RawAbilityScoreAssignment;
  readonly speciesOptionId?: CreationChoiceOptionId;
  readonly backgroundOptionId?: CreationChoiceOptionId;
  readonly draftPathOptionIds?: Partial<
    Record<CharacterDraftPath, readonly CreationChoiceOptionId[]>
  >;
  readonly fixtureOptionIds?: SupportedFillFixtureOptionIds;
}): CreationFill {
  const hole = input.hole;
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: testAbilityScoreAssignment(
        input.standardArrayAssignment ?? DEFAULT_STANDARD_ARRAY_ASSIGNMENT,
      ),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for discovered test hole: ${hole.holeId}`,
    );
  }
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const holeOptionIds = hole.options.map((option) => option.optionId);
  const source = hole.source;
  const preferredOptionIds =
    source.tag === "draft"
      ? source.path === "draft.progression.initial"
        ? [input.progressionOption]
        : source.path === "draft.background"
          ? [
              input.backgroundOptionId ??
                creationChoiceOptionId(PHASE1_BACKGROUND_SOLDIER_UNIT_ID),
            ]
          : source.path === "draft.species"
            ? [
                input.speciesOptionId ??
                  creationChoiceOptionId(PHASE1_SPECIES_ORC_UNIT_ID),
              ]
            : input.draftPathOptionIds?.[source.path]
      : source.tag === "unitChoice"
        ? (input.preferredOptionIdsBySource?.[unitChoiceSourceKey(source)] ??
          (input.fixtureOptionIds ?? soldierBackgroundFixtureOptionIds)(source))
        : undefined;
  const holeOptionIdSet = new Set(holeOptionIds);
  const selectedOptionIds = (preferredOptionIds ?? holeOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough supported options for discovered test hole: ${hole.holeId}; preferred=${JSON.stringify(
        preferredOptionIds,
      )}; supported=${JSON.stringify(supportedOptionIds)}; holeOptions=${JSON.stringify(
        holeOptionIds,
      )}`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: selectedOptionIds,
  };
}

export function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly unitLibrary: UnitCatalog;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
  readonly standardArrayAssignment?: RawAbilityScoreAssignment;
  readonly speciesUnitId?: UnitRecord["id"];
  readonly backgroundUnitId?: UnitRecord["id"];
  readonly draftPathOptionIds?: Partial<
    Record<CharacterDraftPath, readonly CreationChoiceOptionId[]>
  >;
  readonly fixtureOptionIds?: SupportedFillFixtureOptionIds;
  readonly maxFillPasses?: number;
}): CharacterDraft {
  const progressionOption = progressionOptionId(input.progression);

  return completeCreationDraftWithFill({
    draftId: input.draftId,
    unitLibrary: input.unitLibrary,
    fillForHole: (hole) =>
      supportedFillForHole({
        hole,
        progressionOption,
        ...(input.preferredOptionIdsBySource === undefined
          ? {}
          : { preferredOptionIdsBySource: input.preferredOptionIdsBySource }),
        ...(input.standardArrayAssignment === undefined
          ? {}
          : { standardArrayAssignment: input.standardArrayAssignment }),
        ...(input.speciesUnitId === undefined
          ? {}
          : { speciesOptionId: creationChoiceOptionId(input.speciesUnitId) }),
        ...(input.backgroundUnitId === undefined
          ? {}
          : {
              backgroundOptionId: creationChoiceOptionId(
                input.backgroundUnitId,
              ),
            }),
        ...(input.draftPathOptionIds === undefined
          ? {}
          : { draftPathOptionIds: input.draftPathOptionIds }),
        ...(input.fixtureOptionIds === undefined
          ? {}
          : { fixtureOptionIds: input.fixtureOptionIds }),
      }),
    ...(input.maxFillPasses === undefined
      ? {}
      : { maxFillPasses: input.maxFillPasses }),
  });
}

export function completeCreationDraftWithFill(input: {
  readonly draftId: string;
  readonly unitLibrary: UnitCatalog;
  readonly fillForHole: (hole: CreationHole) => CreationFill;
  readonly maxFillPasses?: number;
}): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary: input.unitLibrary,
    draftId: characterDraftId(input.draftId),
  });
  const maxFillPasses = input.maxFillPasses ?? DEFAULT_MAX_FILL_PASSES;

  for (let pass = 0; pass < maxFillPasses; pass += 1) {
    const holes = discoverCreationHoles({
      draft,
      unitLibrary: input.unitLibrary,
    });
    if (holes.length === 0) {
      return draft;
    }

    draft = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary: input.unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map(input.fillForHole),
      }),
    );
  }

  throw new Error(
    `Supported progression fixture still has holes after iterative fills: ${JSON.stringify(
      holeSummary(
        discoverCreationHoles({ draft, unitLibrary: input.unitLibrary }),
      ),
    )}`,
  );
}
