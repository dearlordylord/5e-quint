// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B6-CLASS-FEATURE-IDENTITY-BATCH-3 sorcerer_font_of_magic sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: B6-CLASS-FEATURE-IDENTITY-BATCH-3 sorcerer_font_of_magic doProjectSorcererFontAndMetamagic
// UNIT-IDENTITY-MBT-REPLAY: B6-CLASS-FEATURE-IDENTITY-BATCH-3 sorcerer_metamagic doProjectSorcererFontAndMetamagic
// KERNEL-COVERAGE: parity-witness CREATION.CLASS_FEATURE_RESOURCE.PROJECTION CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  abilityScoreAssignment,
  characterBuildMonkUncannyMetabolismFacts,
  characterBuildMonksFocusFacts,
  characterBuildResources,
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSorcererMetamagicFacts,
  classUnitId,
  sorcererMetamagicOptionId,
  type CharacterBuild,
  type CharacterBuildSorcererMetamagicFacts,
} from "./index.ts";

const classFeatureProjectionScenarios = [
  "init",
  "monk-focus-uncanny-metabolism",
  "sorcerer-font-metamagic",
] as const;
type ClassFeatureProjectionScenario =
  (typeof classFeatureProjectionScenarios)[number];
const classFeatureProjectionReplayStepCount =
  classFeatureProjectionScenarios.length - 1;

type ClassFeatureProjection = {
  readonly outcome: ClassFeatureProjectionScenario;
  readonly resourceUnitId: string;
  readonly resourceKind: string;
  readonly resourceMaximum: number;
  readonly shortRestRefillsAll: boolean;
  readonly longRestRefillsAll: boolean;
  readonly sourceFactKind: string;
  readonly linkedResourceUnitId: string;
  readonly knownOptionCount: number;
  readonly spellUseLimit: string;
  readonly martialArtsDieSourceUnitId: string;
  readonly martialArtsDieDice: number;
  readonly martialArtsDieSize: number;
  readonly monkLevelBonus: number;
  readonly metamagicOwnerClassLevel: number;
  readonly metamagicChoiceCount: number;
  readonly metamagicSelectionRepeatability: string;
  readonly metamagicSorceryPointPoolId: string;
  readonly firstMetamagicOptionId: string;
  readonly firstMetamagicSorceryPointCost: number;
  readonly firstMetamagicStackingMode: string;
  readonly firstMetamagicEffectKind: string;
  readonly secondMetamagicOptionId: string;
  readonly secondMetamagicSorceryPointCost: number;
  readonly secondMetamagicStackingMode: string;
  readonly secondMetamagicEffectKind: string;
  readonly replayIndex: number;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation class-feature projection catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const driverSchema = {
  init: {},
  doProjectMonkFocusAndUncannyMetabolism: {},
  doProjectSorcererFontAndMetamagic: {},
  step: {},
} as const;
type ClassFeatureProjectionDriverAction = Exclude<
  keyof typeof driverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ClassFeatureProjectionDriverAction[];
  readonly expected: ClassFeatureProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B6-CLASS-FEATURE-IDENTITY-BATCH-3";
  readonly unitId: "sorcerer_font_of_magic" | "sorcerer_metamagic";
  readonly actions: readonly ClassFeatureProjectionDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B6-CLASS-FEATURE-IDENTITY-BATCH-3",
    unitId: "sorcerer_font_of_magic",
    actions: ["doProjectSorcererFontAndMetamagic"],
    sequences: [
      {
        name: "selected-sorcerer-font-projects-shared-point-pool",
        actions: ["doProjectSorcererFontAndMetamagic"],
        expected: projectSorcererFontAndMetamagic(),
      },
    ],
  },
  {
    taskId: "B6-CLASS-FEATURE-IDENTITY-BATCH-3",
    unitId: "sorcerer_metamagic",
    actions: ["doProjectSorcererFontAndMetamagic"],
    sequences: [
      {
        name: "selected-sorcerer-metamagic-projects-option-facts",
        actions: ["doProjectSorcererFontAndMetamagic"],
        expected: projectSorcererFontAndMetamagic(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

function createClassFeatureProjectionDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectMonkFocusAndUncannyMetabolism: () => {
        projection = projectMonkFocusAndUncannyMetabolism();
      },
      doProjectSorcererFontAndMetamagic: () => {
        projection = projectSorcererFontAndMetamagic();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

const classFeatureProjectionStateCheck = stateCheck(
  normalizeClassFeatureProjectionQuintState,
  compareClassFeatureProjectionState,
);

describe("Character Creation class-feature resource and source fact deterministic QNT replay", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<ClassFeatureProjectionDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createClassFeatureProjectionDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation class-feature projection action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation class-feature projection driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays class-feature resource and source fact projections", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-class-feature-projections.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createClassFeatureProjectionDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: classFeatureProjectionReplayStepCount,
      stateCheck: classFeatureProjectionStateCheck,
    });
  }, 120_000);
});

function initialProjection(): ClassFeatureProjection {
  return {
    outcome: "init",
    resourceUnitId: "none",
    resourceKind: "none",
    resourceMaximum: 0,
    shortRestRefillsAll: false,
    longRestRefillsAll: false,
    sourceFactKind: "none",
    linkedResourceUnitId: "none",
    knownOptionCount: 0,
    spellUseLimit: "none",
    martialArtsDieSourceUnitId: "none",
    martialArtsDieDice: 0,
    martialArtsDieSize: 0,
    monkLevelBonus: 0,
    metamagicOwnerClassLevel: 0,
    metamagicChoiceCount: 0,
    metamagicSelectionRepeatability: "none",
    metamagicSorceryPointPoolId: "none",
    firstMetamagicOptionId: "none",
    firstMetamagicSorceryPointCost: 0,
    firstMetamagicStackingMode: "none",
    firstMetamagicEffectKind: "none",
    secondMetamagicOptionId: "none",
    secondMetamagicSorceryPointCost: 0,
    secondMetamagicStackingMode: "none",
    secondMetamagicEffectKind: "none",
    replayIndex: 0,
  };
}

function projectMonkFocusAndUncannyMetabolism(): ClassFeatureProjection {
  const build = classBuild({ startingClass: "class_monk", totalLevel: 2 });
  const resource = requiredBuildResource(build, "monk_monks_focus");
  const focusFacts = requireDefined(
    requireRight(characterBuildMonksFocusFacts({ build, unitLibrary })),
    "Expected Monk 2 build to project Monk's Focus facts.",
  );
  const uncannyFacts = requireDefined(
    requireRight(
      characterBuildMonkUncannyMetabolismFacts({ build, unitLibrary }),
    ),
    "Expected Monk 2 build to project Uncanny Metabolism facts.",
  );

  return {
    outcome: "monk-focus-uncanny-metabolism",
    resourceUnitId: resource.unitId,
    resourceKind: resource.resource.kind,
    resourceMaximum: focusFacts.focusPointUseCount.maximum,
    shortRestRefillsAll: focusFacts.focusPointUseCount.shortRestRefillsAll,
    longRestRefillsAll: focusFacts.focusPointUseCount.longRestRefillsAll,
    sourceFactKind: "uncanny_metabolism",
    linkedResourceUnitId: uncannyFacts.focusRecovery.resourceUnitId,
    knownOptionCount: 0,
    spellUseLimit: "none",
    martialArtsDieSourceUnitId: uncannyFacts.healing.martialArtsDieSourceUnitId,
    martialArtsDieDice: uncannyFacts.healing.martialArtsDie.dice,
    martialArtsDieSize: uncannyFacts.healing.martialArtsDie.dieSize,
    monkLevelBonus: uncannyFacts.healing.monkLevelBonus,
    metamagicOwnerClassLevel: 0,
    metamagicChoiceCount: 0,
    metamagicSelectionRepeatability: "none",
    metamagicSorceryPointPoolId: "none",
    firstMetamagicOptionId: "none",
    firstMetamagicSorceryPointCost: 0,
    firstMetamagicStackingMode: "none",
    firstMetamagicEffectKind: "none",
    secondMetamagicOptionId: "none",
    secondMetamagicSorceryPointCost: 0,
    secondMetamagicStackingMode: "none",
    secondMetamagicEffectKind: "none",
    replayIndex: 1,
  };
}

function projectSorcererFontAndMetamagic(): ClassFeatureProjection {
  const build = classBuild({
    startingClass: "class_sorcerer",
    totalLevel: 2,
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
  });
  const resource = requiredBuildResource(build, "sorcerer_font_of_magic");
  const fontFacts = requireDefined(
    requireRight(
      characterBuildSorcererFontOfMagicFacts({ build, unitLibrary }),
    ),
    "Expected Sorcerer 2 build to project Font of Magic facts.",
  );
  const metamagicFacts = requireDefined(
    requireRight(characterBuildSorcererMetamagicFacts({ build, unitLibrary })),
    "Expected Sorcerer 2 build to project Metamagic facts.",
  );
  const empoweredSpell = requiredKnownMetamagicOption(
    metamagicFacts,
    "sorcerer_empowered_spell",
  );
  const heightenedSpell = requiredKnownMetamagicOption(
    metamagicFacts,
    "sorcerer_heightened_spell",
  );

  return {
    outcome: "sorcerer-font-metamagic",
    resourceUnitId: resource.unitId,
    resourceKind: resource.resource.kind,
    resourceMaximum: fontFacts.sorceryPointPool.maximum,
    shortRestRefillsAll: false,
    longRestRefillsAll: fontFacts.sorceryPointPool.longRestRefillsAll,
    sourceFactKind: "sorcerer_metamagic",
    linkedResourceUnitId: metamagicFacts.sorceryPointResource.resourceUnitId,
    knownOptionCount: metamagicFacts.knownOptions.length,
    spellUseLimit: metamagicFacts.spellUseLimit,
    martialArtsDieSourceUnitId: "none",
    martialArtsDieDice: 0,
    martialArtsDieSize: 0,
    monkLevelBonus: 0,
    metamagicOwnerClassLevel: metamagicFacts.ownerClassLevel,
    metamagicChoiceCount: metamagicFacts.choiceCount,
    metamagicSelectionRepeatability: metamagicFacts.selectionRepeatability,
    metamagicSorceryPointPoolId: metamagicFacts.sorceryPointResource.poolId,
    firstMetamagicOptionId: empoweredSpell.optionId,
    firstMetamagicSorceryPointCost: empoweredSpell.sorceryPointCost,
    firstMetamagicStackingMode: empoweredSpell.stackingMode,
    firstMetamagicEffectKind: empoweredSpell.effectKind,
    secondMetamagicOptionId: heightenedSpell.optionId,
    secondMetamagicSorceryPointCost: heightenedSpell.sorceryPointCost,
    secondMetamagicStackingMode: heightenedSpell.stackingMode,
    secondMetamagicEffectKind: heightenedSpell.effectKind,
    replayIndex: 2,
  };
}

function classBuild(input: {
  readonly startingClass: string;
  readonly totalLevel: 1 | 2;
  readonly features?: CharacterBuild["features"];
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
    proficiencyChoices: [],
    features: input.features ?? [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function requiredBuildResource(
  build: CharacterBuild,
  unitId: string,
): ReturnType<typeof characterBuildResources>[number] {
  const resource = characterBuildResources(build, unitLibrary).find(
    (candidate) => candidate.unitId === unitId,
  );
  if (resource === undefined) {
    throw new Error(`Expected CharacterBuild resource ${unitId}.`);
  }
  return resource;
}

function normalizeClassFeatureProjectionQuintState(
  raw: unknown,
): ClassFeatureProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  return {
    outcome: outcomeField(state["outcome"]),
    resourceUnitId: stringField(
      state["resourceUnitId"],
      "qState.resourceUnitId",
    ),
    resourceKind: stringField(state["resourceKind"], "qState.resourceKind"),
    resourceMaximum: numberFromQuintInt(
      state["resourceMaximum"],
      "qState.resourceMaximum",
    ),
    shortRestRefillsAll: booleanField(
      state["shortRestRefillsAll"],
      "qState.shortRestRefillsAll",
    ),
    longRestRefillsAll: booleanField(
      state["longRestRefillsAll"],
      "qState.longRestRefillsAll",
    ),
    sourceFactKind: stringField(
      state["sourceFactKind"],
      "qState.sourceFactKind",
    ),
    linkedResourceUnitId: stringField(
      state["linkedResourceUnitId"],
      "qState.linkedResourceUnitId",
    ),
    knownOptionCount: numberFromQuintInt(
      state["knownOptionCount"],
      "qState.knownOptionCount",
    ),
    spellUseLimit: stringField(state["spellUseLimit"], "qState.spellUseLimit"),
    martialArtsDieSourceUnitId: stringField(
      state["martialArtsDieSourceUnitId"],
      "qState.martialArtsDieSourceUnitId",
    ),
    martialArtsDieDice: numberFromQuintInt(
      state["martialArtsDieDice"],
      "qState.martialArtsDieDice",
    ),
    martialArtsDieSize: numberFromQuintInt(
      state["martialArtsDieSize"],
      "qState.martialArtsDieSize",
    ),
    monkLevelBonus: numberFromQuintInt(
      state["monkLevelBonus"],
      "qState.monkLevelBonus",
    ),
    metamagicOwnerClassLevel: numberFromQuintInt(
      state["metamagicOwnerClassLevel"],
      "qState.metamagicOwnerClassLevel",
    ),
    metamagicChoiceCount: numberFromQuintInt(
      state["metamagicChoiceCount"],
      "qState.metamagicChoiceCount",
    ),
    metamagicSelectionRepeatability: stringField(
      state["metamagicSelectionRepeatability"],
      "qState.metamagicSelectionRepeatability",
    ),
    metamagicSorceryPointPoolId: stringField(
      state["metamagicSorceryPointPoolId"],
      "qState.metamagicSorceryPointPoolId",
    ),
    firstMetamagicOptionId: stringField(
      state["firstMetamagicOptionId"],
      "qState.firstMetamagicOptionId",
    ),
    firstMetamagicSorceryPointCost: numberFromQuintInt(
      state["firstMetamagicSorceryPointCost"],
      "qState.firstMetamagicSorceryPointCost",
    ),
    firstMetamagicStackingMode: stringField(
      state["firstMetamagicStackingMode"],
      "qState.firstMetamagicStackingMode",
    ),
    firstMetamagicEffectKind: stringField(
      state["firstMetamagicEffectKind"],
      "qState.firstMetamagicEffectKind",
    ),
    secondMetamagicOptionId: stringField(
      state["secondMetamagicOptionId"],
      "qState.secondMetamagicOptionId",
    ),
    secondMetamagicSorceryPointCost: numberFromQuintInt(
      state["secondMetamagicSorceryPointCost"],
      "qState.secondMetamagicSorceryPointCost",
    ),
    secondMetamagicStackingMode: stringField(
      state["secondMetamagicStackingMode"],
      "qState.secondMetamagicStackingMode",
    ),
    secondMetamagicEffectKind: stringField(
      state["secondMetamagicEffectKind"],
      "qState.secondMetamagicEffectKind",
    ),
    replayIndex: numberFromQuintInt(state["replayIndex"], "qState.replayIndex"),
  };
}

function compareClassFeatureProjectionState(
  runtime: ClassFeatureProjection,
  quint: ClassFeatureProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint class-feature projection state.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function recordField(
  raw: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = raw[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record field ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
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

const qntOutcomeByVariant = {
  CharacterCreationClassFeatureProjectionsInit: "init",
  CharacterCreationClassFeatureProjectionsMonkFocusUncannyMetabolism:
    "monk-focus-uncanny-metabolism",
  CharacterCreationClassFeatureProjectionsSorcererFontMetamagic:
    "sorcerer-font-metamagic",
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

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value !== undefined) return value;
  throw new Error(message);
}

function requiredKnownMetamagicOption(
  facts: CharacterBuildSorcererMetamagicFacts,
  optionId: string,
): CharacterBuildSorcererMetamagicFacts["knownOptions"][number] {
  const option = facts.knownOptions.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (option !== undefined) return option;
  throw new Error(`Expected Metamagic option fact ${optionId}.`);
}
