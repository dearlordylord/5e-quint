// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-ROGUE-EXPERTISE rogue_expertise
// UNIT-IDENTITY-MBT-REPLAY: L1D2-ROGUE-EXPERTISE rogue_expertise doSelectLevelOneOwnedSkillExpertise doSelectLevelSixAdditionalOwnedSkillExpertise
// KERNEL-COVERAGE: parity-witness CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  SKILLS,
  type Skill,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  abilityScoreAssignment,
  characterBuildProficiencies,
  characterBuildUnitRefs,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  computeTotalLevel,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  progressionOptionId,
  type AbilityScoreAssignment,
  type CharacterBuild,
  type CharacterDraft,
  type CharacterProgression,
  type CreationBatchFillResult,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type UnitChoiceKey,
} from "./index.ts";
import {
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  SRD_ROGUE_CLASS_UNIT_ID,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

const ROGUE_EXPERTISE_UNIT_ID = "rogue_expertise";
const LEVEL_ONE_ROGUE_SKILL_PROFICIENCIES = [
  "acrobatics",
  "perception",
  "sleight_of_hand",
  "stealth",
] as const satisfies ReadonlyArray<Skill>;
const LEVEL_ONE_EXPERTISE_SKILLS = [
  "sleight_of_hand",
  "stealth",
] as const satisfies ReadonlyArray<Skill>;
const LEVEL_SIX_EXPERTISE_SKILLS = [
  "acrobatics",
  "perception",
  "sleight_of_hand",
  "stealth",
] as const satisfies ReadonlyArray<Skill>;

type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;
type RogueExpertiseResult = "levelOne" | "levelSix";
type RogueExpertiseProjectionInput = {
  readonly draftId: string;
  readonly totalLevel: 1 | 6;
  readonly selectedSkillProficiencies: readonly Skill[];
  readonly selectedExpertiseSkills: readonly Skill[];
  readonly outcome: RogueExpertiseResult;
};
type RogueExpertiseFacts = {
  readonly selectedExpertiseChoiceCount: number;
  readonly buildExpertiseCount: number;
  readonly ownedSkillProficiencyCount: number;
  readonly rogueExpertiseUnitRefPresent: boolean;
  readonly totalLevel: number;
};
type PreferredOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;
type RogueExpertiseSelectedIdentityDriverAction = Exclude<
  keyof typeof rogueExpertiseSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly RogueExpertiseSelectedIdentityDriverAction[];
  readonly expected: RogueExpertiseSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-ROGUE-EXPERTISE";
  readonly unitId: typeof ROGUE_EXPERTISE_UNIT_ID;
  readonly actions: readonly RogueExpertiseSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const rogueExpertiseSelectedIdentityDriverSchema = {
  init: {},
  doSelectLevelOneOwnedSkillExpertise: {},
  doSelectLevelSixAdditionalOwnedSkillExpertise: {},
  step: {},
} as const;

const expertisePresenceSchema = {
  rogueExpertiseUnitRefPresent: z.literal(true),
  sleightOfHandExpertisePresent: z.literal(true),
  stealthExpertisePresent: z.literal(true),
} as const;
const rogueExpertiseSelectedIdentityProjectionSchema = z.discriminatedUnion(
  "outcome",
  [
    z.object({
      outcome: z.literal("init"),
      selectedExpertiseUnitId: z.literal("none"),
      selectedExpertiseChoiceCount: z.literal(0),
      buildExpertiseCount: z.literal(0),
      ownedSkillProficiencyCount: z.literal(0),
      rogueExpertiseUnitRefPresent: z.literal(false),
      acrobaticsExpertisePresent: z.literal(false),
      perceptionExpertisePresent: z.literal(false),
      sleightOfHandExpertisePresent: z.literal(false),
      stealthExpertisePresent: z.literal(false),
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("levelOne"),
      selectedExpertiseUnitId: z.literal(ROGUE_EXPERTISE_UNIT_ID),
      selectedExpertiseChoiceCount: z.literal(2),
      buildExpertiseCount: z.literal(2),
      ownedSkillProficiencyCount: z.literal(6),
      ...expertisePresenceSchema,
      acrobaticsExpertisePresent: z.literal(false),
      perceptionExpertisePresent: z.literal(false),
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("levelSix"),
      selectedExpertiseUnitId: z.literal(ROGUE_EXPERTISE_UNIT_ID),
      selectedExpertiseChoiceCount: z.literal(4),
      buildExpertiseCount: z.literal(4),
      ownedSkillProficiencyCount: z.literal(6),
      ...expertisePresenceSchema,
      acrobaticsExpertisePresent: z.literal(true),
      perceptionExpertisePresent: z.literal(true),
      totalLevel: z.literal(6),
    }),
  ],
);
type RogueExpertiseSelectedIdentityProjection = z.infer<
  typeof rogueExpertiseSelectedIdentityProjectionSchema
>;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation Rogue Expertise selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-ROGUE-EXPERTISE",
    unitId: "rogue_expertise",
    actions: [
      "doSelectLevelOneOwnedSkillExpertise",
      "doSelectLevelSixAdditionalOwnedSkillExpertise",
    ],
    sequences: [
      {
        name: "rogue-one-finalizes-two-owned-skill-expertise-choices",
        actions: ["doSelectLevelOneOwnedSkillExpertise"],
        expected: levelOneExpertiseProjection(),
      },
      {
        name: "rogue-six-finalizes-four-owned-skill-expertise-choices",
        actions: ["doSelectLevelSixAdditionalOwnedSkillExpertise"],
        expected: levelSixExpertiseProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const quintStateSchema = z.object({
  outcome: z.unknown().transform(outcomeField),
  selectedExpertiseUnitId: z.union([
    z.literal("none"),
    z.literal(ROGUE_EXPERTISE_UNIT_ID),
  ]),
  selectedExpertiseChoiceCount: z.bigint(),
  buildExpertiseCount: z.bigint(),
  ownedSkillProficiencyCount: z.bigint(),
  rogueExpertiseUnitRefPresent: z.boolean(),
  acrobaticsExpertisePresent: z.boolean(),
  perceptionExpertisePresent: z.boolean(),
  sleightOfHandExpertisePresent: z.boolean(),
  stealthExpertisePresent: z.boolean(),
  totalLevel: z.bigint(),
});

const qntOutcomeByVariant = {
  CharacterCreationRogueExpertiseSelectedIdentityInit: "init",
  CharacterCreationRogueExpertiseSelectedIdentityLevelOne: "levelOne",
  CharacterCreationRogueExpertiseSelectedIdentityLevelSix: "levelSix",
} as const;

function outcomeField(
  raw: unknown,
): (typeof qntOutcomeByVariant)[keyof typeof qntOutcomeByVariant] {
  const tag = nullaryVariantTag(raw, "qState.outcome");
  const outcome = Object.entries(qntOutcomeByVariant).find(
    ([variant]) => variant === tag,
  )?.[1];
  if (outcome !== undefined) return outcome;
  throw new Error(`Unknown Quint outcome variant ${tag}.`);
}

function nullaryVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object" && "tag" in raw) {
    const record = Object.fromEntries(Object.entries(raw));
    const tag = record["tag"];
    if (typeof tag === "string") return tag;
  }
  throw new Error(`Expected Quint variant field ${field}.`);
}

describe("Character Creation Rogue Expertise selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<RogueExpertiseSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createRogueExpertiseSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation Rogue Expertise selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation Rogue Expertise selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation Rogue Expertise selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-rogue-expertise-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createRogueExpertiseSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: rogueExpertiseSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createRogueExpertiseSelectedIdentityDriver() {
  return defineDriver(rogueExpertiseSelectedIdentityDriverSchema, () => {
    let projection: RogueExpertiseSelectedIdentityProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doSelectLevelOneOwnedSkillExpertise: () => {
        projection = levelOneExpertiseProjection();
      },
      doSelectLevelSixAdditionalOwnedSkillExpertise: () => {
        projection = levelSixExpertiseProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): Extract<
  RogueExpertiseSelectedIdentityProjection,
  { readonly outcome: "init" }
> {
  return {
    outcome: "init",
    selectedExpertiseUnitId: "none",
    selectedExpertiseChoiceCount: 0,
    buildExpertiseCount: 0,
    ownedSkillProficiencyCount: 0,
    rogueExpertiseUnitRefPresent: false,
    acrobaticsExpertisePresent: false,
    perceptionExpertisePresent: false,
    sleightOfHandExpertisePresent: false,
    stealthExpertisePresent: false,
    totalLevel: 1,
  };
}

function levelOneExpertiseProjection(): RogueExpertiseSelectedIdentityProjection {
  return rogueExpertiseProjection({
    draftId: "rogue-expertise-selected-identity-level-one",
    totalLevel: 1,
    selectedSkillProficiencies: LEVEL_ONE_ROGUE_SKILL_PROFICIENCIES,
    selectedExpertiseSkills: LEVEL_ONE_EXPERTISE_SKILLS,
    outcome: "levelOne",
  });
}

function levelSixExpertiseProjection(): RogueExpertiseSelectedIdentityProjection {
  return rogueExpertiseProjection({
    draftId: "rogue-expertise-selected-identity-level-six",
    totalLevel: 6,
    selectedSkillProficiencies: LEVEL_ONE_ROGUE_SKILL_PROFICIENCIES,
    selectedExpertiseSkills: LEVEL_SIX_EXPERTISE_SKILLS,
    outcome: "levelSix",
  });
}

function rogueExpertiseProjection(
  input: RogueExpertiseProjectionInput,
): RogueExpertiseSelectedIdentityProjection {
  const draft = completeRogueDraft(input);
  const finalized = finalizeCharacterDraft({ draft, unitLibrary });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected Rogue Expertise selected identity draft to finalize, received ${finalized.tag}.`,
    );
  }

  const facts = rogueExpertiseFacts({
    draft,
    build: finalized.build,
    input,
  });
  return rogueExpertiseSelectedIdentityProjectionSchema.parse({
    outcome: input.outcome,
    selectedExpertiseUnitId: ROGUE_EXPERTISE_UNIT_ID,
    selectedExpertiseChoiceCount: facts.selectedExpertiseChoiceCount,
    buildExpertiseCount: facts.buildExpertiseCount,
    ownedSkillProficiencyCount: facts.ownedSkillProficiencyCount,
    rogueExpertiseUnitRefPresent: facts.rogueExpertiseUnitRefPresent,
    acrobaticsExpertisePresent:
      input.selectedExpertiseSkills.includes("acrobatics"),
    perceptionExpertisePresent:
      input.selectedExpertiseSkills.includes("perception"),
    sleightOfHandExpertisePresent:
      input.selectedExpertiseSkills.includes("sleight_of_hand"),
    stealthExpertisePresent: input.selectedExpertiseSkills.includes("stealth"),
    totalLevel: facts.totalLevel,
  });
}

function completeRogueDraft(
  input: RogueExpertiseProjectionInput,
): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftId),
  });
  const progression = rogueProgression(input.totalLevel);
  const preferredOptionIdsBySource = preferredRogueOptionIdsBySource(input);

  draft = acceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: discoverCreationHoles({ draft, unitLibrary }).map((hole) =>
        supportProfileFillForHole({
          hole,
          progression,
          preferredOptionIdsBySource,
        }),
      ),
    }),
  ).draft;

  draft = acceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          choiceHoleByUnit(
            discoverCreationHoles({ draft, unitLibrary }),
            SRD_ROGUE_CLASS_UNIT_ID,
            CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
          ),
          input.selectedSkillProficiencies.map(creationChoiceOptionId),
        ),
      ],
    }),
  ).draft;

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      return draft;
    }

    draft = acceptedBatch(
      fillCreationHoles({
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
      }),
    ).draft;
  }

  throw new Error(
    `Rogue Expertise selected identity fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

function rogueProgression(totalLevel: 1 | 6): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({
    unitLibrary,
    classUnitId: SRD_ROGUE_CLASS_UNIT_ID,
  });
  if (Either.isLeft(parsedClassUnitId)) {
    throw new Error(
      `Invalid Rogue class Unit id: ${JSON.stringify(parsedClassUnitId.left)}`,
    );
  }
  const parsedProgression = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.right,
    advancements: Array.from({ length: totalLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.right,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Either.isLeft(parsedProgression)) {
    throw new Error(
      `Invalid Rogue Expertise selected identity progression: ${JSON.stringify(parsedProgression.left)}`,
    );
  }

  return parsedProgression.right;
}

function preferredRogueOptionIdsBySource(
  input: RogueExpertiseProjectionInput,
): PreferredOptionIdsBySource {
  return {
    [choiceSourceKey(
      SRD_ROGUE_CLASS_UNIT_ID,
      CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
    )]: input.selectedSkillProficiencies.map(creationChoiceOptionId),
    [choiceSourceKey(
      ROGUE_EXPERTISE_UNIT_ID,
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    )]: input.selectedExpertiseSkills.map(creationChoiceOptionId),
  };
}

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

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for Rogue Expertise selected identity hole ${hole.holeId}.`,
    );
  }
  const holeOptionIdSet = new Set(
    hole.options.map((option) => option.optionId),
  );
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const preferredOptionIds = preferredOptionIdsForHole({
    hole,
    progression: input.progression,
    preferredOptionIdsBySource: input.preferredOptionIdsBySource,
  });
  const defaultOptionIds = hole.options.map((option) => option.optionId);
  const selectedOptionIds = (preferredOptionIds ?? defaultOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough support-profile options for Rogue Expertise selected identity hole ${hole.holeId}.`,
    );
  }

  return choiceFill(hole, selectedOptionIds);
}

function preferredOptionIdsForHole(input: {
  readonly hole: ChoiceCreationHole;
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
  if (source.tag === "draft" && source.path === "draft.species") {
    return [creationChoiceOptionId("species_orc")];
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

function rogueExpertiseFacts(input: {
  readonly draft: CharacterDraft;
  readonly build: CharacterBuild;
  readonly input: RogueExpertiseProjectionInput;
}): RogueExpertiseFacts {
  const selectedClassSkills = selectedSkillsFromChoice(
    input.draft,
    SRD_ROGUE_CLASS_UNIT_ID,
    CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  );
  if (
    !sameSkillList(selectedClassSkills, input.input.selectedSkillProficiencies)
  ) {
    throw new Error(
      `Expected Rogue skill proficiency choices ${input.input.selectedSkillProficiencies.join(",")}, received ${selectedClassSkills.join(",")}.`,
    );
  }

  const selectedExpertiseSkills = selectedSkillsFromChoice(
    input.draft,
    ROGUE_EXPERTISE_UNIT_ID,
    CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  );
  if (
    !sameSkillList(selectedExpertiseSkills, input.input.selectedExpertiseSkills)
  ) {
    throw new Error(
      `Expected Rogue Expertise choices ${input.input.selectedExpertiseSkills.join(",")}, received ${selectedExpertiseSkills.join(",")}.`,
    );
  }

  const proficiencies = expectRight(
    characterBuildProficiencies(input.build, unitLibrary),
  );
  if (!sameSkillList(proficiencies.expertise, selectedExpertiseSkills)) {
    throw new Error(
      `Expected CharacterBuild Expertise projection ${selectedExpertiseSkills.join(",")}, received ${proficiencies.expertise.join(",")}.`,
    );
  }
  for (const skill of selectedExpertiseSkills) {
    if (!proficiencies.skills.includes(skill)) {
      throw new Error(
        `Expected selected Expertise skill ${skill} to be an owned skill proficiency.`,
      );
    }
  }

  const unitRefIds = characterBuildUnitRefs(input.build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  return {
    selectedExpertiseChoiceCount: selectedExpertiseSkills.length,
    buildExpertiseCount: proficiencies.expertise.length,
    ownedSkillProficiencyCount: proficiencies.skills.length,
    rogueExpertiseUnitRefPresent: unitRefIds.includes(ROGUE_EXPERTISE_UNIT_ID),
    totalLevel: computeTotalLevel(input.build.progression),
  };
}

function choiceHoleByUnit(
  holes: readonly CreationHole[],
  unitId: string,
  choiceKey: UnitChoiceKey,
): ChoiceCreationHole {
  const hole = holes.find(
    (candidate): candidate is ChoiceCreationHole =>
      candidate.kind === "choice" &&
      candidate.source.tag === "unitChoice" &&
      candidate.source.unitId === unitId &&
      candidate.source.choiceKey === choiceKey,
  );
  if (hole === undefined) {
    throw new Error(
      `Expected Rogue Expertise selected identity choice hole for ${unitId}/${choiceKey}.`,
    );
  }

  return hole;
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

function choiceFill(
  hole: ChoiceCreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): CreationFill {
  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds,
  };
}

function acceptedBatch(
  result: CreationBatchFillResult,
): Extract<CreationBatchFillResult, { readonly tag: "accepted" }> {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected Rogue Expertise selected identity fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
    );
  }

  return result;
}

function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Rogue Expertise selected identity Standard Array fixture must parse.",
    );
  }

  return parsed.right;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}.`,
    );
  }

  return result.right;
}

function qStateValue(raw: unknown): unknown {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "qState" in raw
  ) {
    return Object.fromEntries(Object.entries(raw))["qState"];
  }
  throw new Error("Expected Quint qState record.");
}

function normalizeQuintState(
  raw: unknown,
): RogueExpertiseSelectedIdentityProjection {
  const parsed = quintStateSchema.parse(qStateValue(raw));
  return rogueExpertiseSelectedIdentityProjectionSchema.parse({
    outcome: parsed.outcome,
    selectedExpertiseUnitId: parsed.selectedExpertiseUnitId,
    selectedExpertiseChoiceCount: Number(parsed.selectedExpertiseChoiceCount),
    buildExpertiseCount: Number(parsed.buildExpertiseCount),
    ownedSkillProficiencyCount: Number(parsed.ownedSkillProficiencyCount),
    rogueExpertiseUnitRefPresent: parsed.rogueExpertiseUnitRefPresent,
    acrobaticsExpertisePresent: parsed.acrobaticsExpertisePresent,
    perceptionExpertisePresent: parsed.perceptionExpertisePresent,
    sleightOfHandExpertisePresent: parsed.sleightOfHandExpertisePresent,
    stealthExpertisePresent: parsed.stealthExpertisePresent,
    totalLevel: Number(parsed.totalLevel),
  });
}

function compareProjection(
  spec: RogueExpertiseSelectedIdentityProjection,
  impl: RogueExpertiseSelectedIdentityProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const rogueExpertiseSelectedIdentityStateCheck = stateCheck(
  normalizeQuintState,
  compareProjection,
);
