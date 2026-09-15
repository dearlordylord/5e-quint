import { Match, Result } from "effect";
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
  parseCreationHoleId,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type AbilityScoreAssignment,
  type CharacterDraft,
  type CharacterDraftPath,
  type CharacterProgression,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type CreationHoleId,
  type UnitCatalog,
  type UnitChoiceKey,
  type UnitChoiceSource,
  type UnitChoiceSourceKey,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  SUPPORTED_LANGUAGE_OPTION_IDS,
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
 * option chains, draft-path option ids) are explicit options; the iterative
 * fill pass budget is the shared DEFAULT_MAX_FILL_PASSES. Helpers throw on
 * invalid test fixtures; production APIs keep their `Result`/tagged-union
 * boundaries.
 */

export type PreferredSupportedFillOptionIdsBySource = Readonly<
  Partial<Record<UnitChoiceSourceKey, readonly CreationChoiceOptionId[]>>
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

// Shared discover/fill pass budget; exported so probe loops align with it
// instead of re-deriving a local pass count.
export const DEFAULT_MAX_FILL_PASSES = 12;

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
): readonly (readonly [
  CreationHole["kind"],
  CreationHoleId,
  readonly string[],
])[] {
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
): UnitChoiceSourceKey {
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
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Result.isFailure(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.failure)}`,
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
  const parsedHoleId = parseCreationHoleId(holeId);
  if (parsedHoleId === null) {
    throw new Error(`Invalid test creation hole id: ${holeId}`);
  }
  return {
    kind: "choice",
    holeId: parsedHoleId,
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

export function initialManifestFills(
  selectedProgressionOptionId: CreationChoiceOptionId,
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
  if (source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY) {
    return [creationChoiceOptionId("weapon_dagger")];
  }
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
  /** Require an explicit preference instead of the fixture fallback for this source. */
  readonly requirePreferredOptionForSource?: (
    source: UnitChoiceSource,
  ) => boolean;
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
  const preferredOptionIds = Match.value(hole.source).pipe(
    Match.when({ tag: "draft" }, (source) =>
      source.path === "draft.progression.initial"
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
            : (input.draftPathOptionIds?.[source.path] ??
              (source.path === "draft.languages"
                ? SUPPORTED_LANGUAGE_OPTION_IDS
                : source.path === "draft.alignment"
                  ? [PHASE1_ALIGNMENT_OPTION_ID]
                  : undefined)),
    ),
    Match.when({ tag: "unitChoice" }, (source) => {
      const preferred =
        input.preferredOptionIdsBySource?.[unitChoiceSourceKey(source)];
      if (
        preferred === undefined &&
        input.requirePreferredOptionForSource?.(source) === true
      ) {
        throw new Error(
          `Missing explicit supported option preference for discovered test hole: ${hole.holeId}`,
        );
      }
      return (
        preferred ??
        (input.fixtureOptionIds ?? soldierBackgroundFixtureOptionIds)(source) ??
        (source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY
          ? [creationChoiceOptionId("weapon_dagger")]
          : undefined)
      );
    }),
    // Loadout holes carry granted equipment rather than chooser preferences, so
    // they intentionally fall back to the discovered hole options below.
    Match.when({ tag: "loadout" }, () => undefined),
    Match.exhaustive,
  );
  const holeOptionIdSet = new Set(holeOptionIds);
  const selectedOptionIds = (preferredOptionIds ?? holeOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  const requiredOptionCount =
    hole.source.tag === "unitChoice" &&
    hole.source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY
      ? choiceCardinalityBounds(hole.cardinality).min
      : choiceCardinalityBounds(hole.cardinality).max;
  if (selectedOptionIds.length < requiredOptionCount) {
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
  readonly requirePreferredOptionForSource?: (
    source: UnitChoiceSource,
  ) => boolean;
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
        ...(input.requirePreferredOptionForSource === undefined
          ? {}
          : {
              requirePreferredOptionForSource:
                input.requirePreferredOptionForSource,
            }),
      }),
  });
}

export function completeCreationDraftWithFill(input: {
  readonly draftId: string;
  readonly unitLibrary: UnitCatalog;
  readonly fillForHole: (hole: CreationHole) => CreationFill;
}): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary: input.unitLibrary,
    draftId: characterDraftId(input.draftId),
  });

  for (let pass = 0; pass < DEFAULT_MAX_FILL_PASSES; pass += 1) {
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
    `Supported progression fixture still has holes after ${DEFAULT_MAX_FILL_PASSES} fill passes: ${JSON.stringify(
      holeSummary(
        discoverCreationHoles({ draft, unitLibrary: input.unitLibrary }),
      ),
    )}`,
  );
}
