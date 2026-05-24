// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B4-CLASS-FEATURE-IDENTITY-BATCH-1 bard_expertise cleric_channel_divinity druid_wild_shape druid_wild_companion
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 bard_expertise doSelectBardExpertise
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 cleric_channel_divinity doProjectClericChannelDivinity
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 druid_wild_shape doProjectDruidWildShape
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 druid_wild_companion doProjectDruidWildCompanion
import * as path from "node:path";

import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  SKILLS,
  type Skill,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  abilityScoreAssignment,
  characterBuildDruidWildShapeFacts,
  characterBuildFeatureUnitIds,
  characterBuildProficiencies,
  characterBuildResources,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterBuild,
  type CharacterDraft,
  type CharacterProgression,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type UnitChoiceKey,
} from "./index.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";
import {
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";

const TASK_ID = "B4-CLASS-FEATURE-IDENTITY-BATCH-1";
const BARD_EXPERTISE_UNIT_ID = "bard_expertise";
const CLERIC_CHANNEL_DIVINITY_UNIT_ID = "cleric_channel_divinity";
const DRUID_WILD_SHAPE_UNIT_ID = "druid_wild_shape";
const DRUID_WILD_COMPANION_UNIT_ID = "druid_wild_companion";
const BARD_CLASS_UNIT_ID = "class_bard";
const BARD_SKILL_PROFICIENCIES = [
  "athletics",
  "intimidation",
  "performance",
] as const satisfies ReadonlyArray<Skill>;
const BARD_EXPERTISE_SKILLS = [
  "athletics",
  "intimidation",
] as const satisfies ReadonlyArray<Skill>;

const classFeatureSelectedIdentityResults = [
  "init",
  "bard-expertise",
  "cleric-channel-divinity",
  "druid-wild-shape",
  "druid-wild-companion",
] as const;
type ClassFeatureSelectedIdentityResult =
  (typeof classFeatureSelectedIdentityResults)[number];
type ClassFeatureSelectedIdentityUnitId =
  | typeof BARD_EXPERTISE_UNIT_ID
  | typeof CLERIC_CHANNEL_DIVINITY_UNIT_ID
  | typeof DRUID_WILD_SHAPE_UNIT_ID
  | typeof DRUID_WILD_COMPANION_UNIT_ID;
type ClassFeatureSelectedIdentityProjection = {
  readonly lastResult: ClassFeatureSelectedIdentityResult;
  readonly featureUnitId: ClassFeatureSelectedIdentityUnitId | "none";
  readonly linkedUnitId: UnitRecord["id"] | "none";
  readonly choiceCount: number;
  readonly resourceMaximum: number;
  readonly knownFormCount: number;
  readonly shortRestRefill: number;
  readonly longRestRefillsAll: boolean;
  readonly accepted: boolean;
};
type ClassFeatureSelectedIdentityDriverAction = Exclude<
  keyof typeof classFeatureSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ClassFeatureSelectedIdentityDriverAction[];
  readonly expected: ClassFeatureSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: typeof TASK_ID;
  readonly unitId: ClassFeatureSelectedIdentityUnitId;
  readonly actions: readonly ClassFeatureSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const classFeatureSelectedIdentityDriverSchema = {
  init: {},
  doSelectBardExpertise: {},
  doProjectClericChannelDivinity: {},
  doProjectDruidWildShape: {},
  doProjectDruidWildCompanion: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation class-feature selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "bard_expertise",
    actions: ["doSelectBardExpertise"],
    sequences: [
      {
        name: "selected-bard-expertise-finalizes-owned-skill-expertise",
        actions: ["doSelectBardExpertise"],
        expected: bardExpertiseProjection(),
      },
    ],
  },
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "cleric_channel_divinity",
    actions: ["doProjectClericChannelDivinity"],
    sequences: [
      {
        name: "selected-cleric-channel-divinity-projects-resource-container",
        actions: ["doProjectClericChannelDivinity"],
        expected: clericChannelDivinityProjection(),
      },
    ],
  },
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "druid_wild_shape",
    actions: ["doProjectDruidWildShape"],
    sequences: [
      {
        name: "selected-druid-wild-shape-projects-resource-and-known-forms",
        actions: ["doProjectDruidWildShape"],
        expected: druidWildShapeProjection(),
      },
    ],
  },
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "druid_wild_companion",
    actions: ["doProjectDruidWildCompanion"],
    sequences: [
      {
        name: "selected-druid-wild-companion-projects-wild-shape-spend-link",
        actions: ["doProjectDruidWildCompanion"],
        expected: druidWildCompanionProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const classFeatureSelectedIdentityStateCheck = stateCheck(
  normalizeClassFeatureSelectedIdentityQuintState,
  compareClassFeatureSelectedIdentityState,
);

describe("Character Creation class-feature selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ClassFeatureSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createClassFeatureSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation class-feature selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation class-feature selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation class-feature selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-class-feature-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createClassFeatureSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: classFeatureSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createClassFeatureSelectedIdentityDriver() {
  return defineDriver(classFeatureSelectedIdentityDriverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doSelectBardExpertise: () => {
        projection = bardExpertiseProjection();
      },
      doProjectClericChannelDivinity: () => {
        projection = clericChannelDivinityProjection();
      },
      doProjectDruidWildShape: () => {
        projection = druidWildShapeProjection();
      },
      doProjectDruidWildCompanion: () => {
        projection = druidWildCompanionProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): ClassFeatureSelectedIdentityProjection {
  return {
    lastResult: "init",
    featureUnitId: "none",
    linkedUnitId: "none",
    choiceCount: 0,
    resourceMaximum: 0,
    knownFormCount: 0,
    shortRestRefill: 0,
    longRestRefillsAll: false,
    accepted: false,
  };
}

function bardExpertiseProjection(): ClassFeatureSelectedIdentityProjection {
  const draft = completeBardExpertiseDraft();
  const selectedExpertiseSkills = selectedSkillsFromChoice(
    draft,
    BARD_EXPERTISE_UNIT_ID,
    CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  );
  if (!sameSkillList(selectedExpertiseSkills, BARD_EXPERTISE_SKILLS)) {
    throw new Error(
      `Expected Bard Expertise choices ${BARD_EXPERTISE_SKILLS.join(",")}, received ${selectedExpertiseSkills.join(",")}.`,
    );
  }
  const finalized = finalizeCharacterDraft({ draft, unitLibrary });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected Bard Expertise selected identity draft to finalize, received ${finalized.tag}.`,
    );
  }
  const proficiencies = requireRight(
    characterBuildProficiencies(finalized.build, unitLibrary),
  );
  if (!sameSkillList(proficiencies.expertise, selectedExpertiseSkills)) {
    throw new Error(
      `Expected Bard Expertise projection ${selectedExpertiseSkills.join(",")}, received ${proficiencies.expertise.join(",")}.`,
    );
  }
  requiredBuildFeatureUnitId(finalized.build, BARD_EXPERTISE_UNIT_ID);
  return {
    lastResult: "bard-expertise",
    featureUnitId: requiredSelectedChoiceFeatureUnitId(
      draft,
      BARD_EXPERTISE_UNIT_ID,
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    ),
    linkedUnitId: "none",
    choiceCount: selectedExpertiseSkills.length,
    resourceMaximum: 0,
    knownFormCount: 0,
    shortRestRefill: 0,
    longRestRefillsAll: false,
    accepted: true,
  };
}

function completeBardExpertiseDraft(): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("bard-expertise-selected-identity"),
  });
  const progression = classProgression(BARD_CLASS_UNIT_ID, 2);
  const preferredOptionIdsBySource = {
    [choiceSourceKey(BARD_CLASS_UNIT_ID, CLASS_SKILL_PROFICIENCY_CHOICE_KEY)]:
      BARD_SKILL_PROFICIENCIES.map(creationChoiceOptionId),
    [choiceSourceKey(
      BARD_EXPERTISE_UNIT_ID,
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    )]: BARD_EXPERTISE_SKILLS.map(creationChoiceOptionId),
  };

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      return draft;
    }

    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: holes.map((hole) =>
        supportProfileFillForHole({
          hole,
          progression,
          preferredOptionIdsBySource,
        }),
      ),
    });
    if (result.tag !== "accepted") {
      throw new Error(
        `Expected Bard Expertise selected identity fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
      );
    }
    draft = result.draft;
  }

  throw new Error(
    `Bard Expertise selected identity fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

function clericChannelDivinityProjection(): ClassFeatureSelectedIdentityProjection {
  const build = classBuild({ startingClass: "class_cleric", totalLevel: 2 });
  const resource = requiredBuildResource(build, CLERIC_CHANNEL_DIVINITY_UNIT_ID);
  if (resource.resource.kind !== "use_count") {
    throw new Error("Expected Cleric Channel Divinity use-count resource.");
  }
  const unit = unitLibrary.requireUnit(CLERIC_CHANNEL_DIVINITY_UNIT_ID);
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "resource_container"
  ) {
    throw new Error("Expected Cleric Channel Divinity resource container.");
  }
  if (resource.resource.cap.kind !== "threshold_tiers") {
    throw new Error(
      "Expected Cleric Channel Divinity threshold-tiered use-count resource.",
    );
  }
  if (unit.mechanics.resetCadence.kind !== "partial_short_full_long") {
    throw new Error(
      "Expected Cleric Channel Divinity partial Short Rest reset cadence.",
    );
  }
  return {
    lastResult: "cleric-channel-divinity",
    featureUnitId: expectedClassFeatureUnitId(
      resource.unitId,
      CLERIC_CHANNEL_DIVINITY_UNIT_ID,
    ),
    linkedUnitId: "none",
    choiceCount: unit.mechanics.optionSet.initialOptions.length,
    resourceMaximum: resource.resource.cap.base,
    knownFormCount: 0,
    shortRestRefill: unit.mechanics.resetCadence.shortRestRefill,
    longRestRefillsAll: true,
    accepted: true,
  };
}

function druidWildShapeProjection(): ClassFeatureSelectedIdentityProjection {
  const build = classBuild({ startingClass: "class_druid", totalLevel: 2 });
  const facts = requireDefined(
    requireRight(characterBuildDruidWildShapeFacts({ build, unitLibrary })),
    "Expected Druid Wild Shape facts.",
  );
  return {
    lastResult: "druid-wild-shape",
    featureUnitId: expectedClassFeatureUnitId(
      facts.unitId,
      DRUID_WILD_SHAPE_UNIT_ID,
    ),
    linkedUnitId: "none",
    choiceCount: 0,
    resourceMaximum: facts.useCount.maximum,
    knownFormCount: facts.knownFormRoster.count,
    shortRestRefill: facts.useCount.shortRestRefill,
    longRestRefillsAll: facts.useCount.longRestRefillsAll,
    accepted: true,
  };
}

function druidWildCompanionProjection(): ClassFeatureSelectedIdentityProjection {
  const build = classBuild({ startingClass: "class_druid", totalLevel: 2 });
  const featureUnitId = requiredBuildFeatureUnitId(
    build,
    DRUID_WILD_COMPANION_UNIT_ID,
  );
  const unit = unitLibrary.requireUnit(featureUnitId);
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "druid_wild_companion_spell_cast"
  ) {
    throw new Error("Expected Druid Wild Companion spell-cast feature.");
  }
  const linkedSpend = unit.mechanics.spendOptions.find(
    (option) => option.kind === "one_class_feature_use",
  );
  if (linkedSpend === undefined) {
    throw new Error("Expected Wild Companion to spend a class-feature use.");
  }
  return {
    lastResult: "druid-wild-companion",
    featureUnitId,
    linkedUnitId: linkedSpend.resourceUnitId,
    choiceCount: unit.mechanics.spendOptions.length,
    resourceMaximum: 0,
    knownFormCount: 0,
    shortRestRefill: 0,
    longRestRefillsAll: false,
    accepted: true,
  };
}

function classProgression(
  classUnitIdValue: UnitRecord["id"],
  totalLevel: 2,
): CharacterProgression {
  return {
    startingClass: classUnitId(classUnitIdValue),
    advancements: Array.from({ length: totalLevel - 1 }, () => ({
      classUnitId: classUnitId(classUnitIdValue),
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  };
}

function classBuild(input: {
  readonly startingClass: UnitRecord["id"];
  readonly totalLevel: 2;
  readonly proficiencyChoices?: CharacterBuild["proficiencyChoices"];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: Array.from({ length: input.totalLevel - 1 }, () => ({
        classUnitId: classUnitId(input.startingClass),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: input.proficiencyChoices ?? [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

type PreferredOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;

function supportProfileFillForHole(input: {
  readonly hole: CreationHole;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOptionIdsBySource;
}): CreationFill {
  const hole = input.hole;
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: requireRight(
        abilityScoreAssignment({
          str: 8,
          dex: 14,
          con: 13,
          int: 10,
          wis: 12,
          cha: 15,
        }),
      ),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for Bard Expertise selected identity hole ${hole.holeId}.`,
    );
  }
  const selectedOptionIds = (
    preferredOptionIdsForHole({
      hole,
      progression: input.progression,
      preferredOptionIdsBySource: input.preferredOptionIdsBySource,
    }) ?? hole.options.map((option) => option.optionId)
  )
    .filter((optionId) =>
      hole.options.some((option) => option.optionId === optionId),
    )
    .filter((optionId) => supportedOptionIds.includes(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough support-profile options for Bard Expertise selected identity hole ${hole.holeId}.`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: selectedOptionIds,
  };
}

function preferredOptionIdsForHole(input: {
  readonly hole: Extract<CreationHole, { readonly kind: "choice" }>;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOptionIdsBySource;
}): readonly CreationChoiceOptionId[] | undefined {
  const source = input.hole.source;
  if (source.tag === "draft" && source.path === "draft.progression.initial") {
    return [progressionOptionId(input.progression)];
  }
  if (source.tag === "draft" && source.path === "draft.background") {
    return [creationChoiceOptionId("background_soldier")];
  }
  if (source.tag !== "unitChoice") {
    return undefined;
  }

  return (
    input.preferredOptionIdsBySource[
      choiceSourceKey(source.unitId, source.choiceKey)
    ] ?? soldierBackgroundFixtureOptionIds(source)
  );
}

function requiredSelectedChoiceFeatureUnitId(
  draft: CharacterDraft,
  unitId: ClassFeatureSelectedIdentityUnitId,
  choiceKey: UnitChoiceKey,
): ClassFeatureSelectedIdentityUnitId {
  const selection = draft.selections.choices.find(
    (candidate) =>
      candidate.kind === "unitChoice" &&
      candidate.source.unitId === unitId &&
      candidate.source.choiceKey === choiceKey,
  );
  if (selection !== undefined) return unitId;
  throw new Error(`Expected selected Unit choice from ${unitId}/${choiceKey}.`);
}

function selectedSkillsFromChoice(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): readonly Skill[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.flatMap((option) =>
          skillFromOptionId(option.optionId),
        )
      : [],
  );
}

function skillFromOptionId(optionId: CreationChoiceOptionId): readonly Skill[] {
  const skill = SKILLS.find((candidate) => candidate === optionId);
  return skill === undefined ? [] : [skill];
}

function sameSkillList(
  left: readonly Skill[],
  right: readonly Skill[],
): boolean {
  return (
    left.length === right.length &&
    left.every((skill, index) => skill === right[index])
  );
}

function choiceSourceKey(unitId: string, choiceKey: UnitChoiceKey): string {
  return `${unitId}/${choiceKey}`;
}

function requiredBuildResource(
  build: CharacterBuild,
  unitId: ClassFeatureSelectedIdentityUnitId,
): ReturnType<typeof characterBuildResources>[number] {
  const resource = characterBuildResources(build, unitLibrary).find(
    (candidate) => candidate.unitId === unitId,
  );
  if (resource !== undefined) return resource;
  throw new Error(`Expected CharacterBuild resource ${unitId}.`);
}

function requiredBuildFeatureUnitId(
  build: CharacterBuild,
  unitId: ClassFeatureSelectedIdentityUnitId,
): ClassFeatureSelectedIdentityUnitId {
  if (
    characterBuildFeatureUnitIds(build, unitLibrary).some(
      (candidate) => candidate === unitId,
    )
  ) {
    return unitId;
  }
  throw new Error(`Expected CharacterBuild feature Unit ${unitId}.`);
}

function expectedClassFeatureUnitId(
  actual: UnitRecord["id"],
  expected: ClassFeatureSelectedIdentityUnitId,
): ClassFeatureSelectedIdentityUnitId {
  if (actual === expected) return expected;
  throw new Error(`Expected class-feature Unit ${expected}, received ${actual}.`);
}

function normalizeClassFeatureSelectedIdentityQuintState(
  raw: unknown,
): ClassFeatureSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: resultField(state["qLastResult"]),
    featureUnitId: featureUnitIdField(state["qFeatureUnitId"]),
    linkedUnitId: stringField(state["qLinkedUnitId"], "qLinkedUnitId"),
    choiceCount: numberFromQuintInt(state["qChoiceCount"], "qChoiceCount"),
    resourceMaximum: numberFromQuintInt(
      state["qResourceMaximum"],
      "qResourceMaximum",
    ),
    knownFormCount: numberFromQuintInt(
      state["qKnownFormCount"],
      "qKnownFormCount",
    ),
    shortRestRefill: numberFromQuintInt(
      state["qShortRestRefill"],
      "qShortRestRefill",
    ),
    longRestRefillsAll: booleanField(
      state["qLongRestRefillsAll"],
      "qLongRestRefillsAll",
    ),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
  };
}

function compareClassFeatureSelectedIdentityState(
  runtime: ClassFeatureSelectedIdentityProjection,
  quint: ClassFeatureSelectedIdentityProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function resultField(raw: unknown): ClassFeatureSelectedIdentityResult {
  if (
    raw === "init" ||
    raw === "bard-expertise" ||
    raw === "cleric-channel-divinity" ||
    raw === "druid-wild-shape" ||
    raw === "druid-wild-companion"
  ) {
    return raw;
  }
  throw new Error(`Unknown class-feature selected identity result ${String(raw)}.`);
}

function featureUnitIdField(
  raw: unknown,
): ClassFeatureSelectedIdentityProjection["featureUnitId"] {
  if (
    raw === "none" ||
    raw === BARD_EXPERTISE_UNIT_ID ||
    raw === CLERIC_CHANNEL_DIVINITY_UNIT_ID ||
    raw === DRUID_WILD_SHAPE_UNIT_ID ||
    raw === DRUID_WILD_COMPANION_UNIT_ID
  ) {
    return raw;
  }
  throw new Error(
    `Unknown class-feature selected identity Unit id ${String(raw)}.`,
  );
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint class-feature selected identity state.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function stringField(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  throw new Error(`Expected string field ${field}.`);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected boolean field ${field}.`);
}

function requireRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isRight(result)) return result.right;
  const left = result.left;
  if (
    left !== null &&
    typeof left === "object" &&
    "message" in left &&
    typeof left.message === "string"
  ) {
    throw new Error(left.message);
  }
  throw new Error(JSON.stringify(left));
}

function requireDefined<T>(value: T, message: string): NonNullable<T> {
  if (value !== undefined && value !== null) return value;
  throw new Error(message);
}
