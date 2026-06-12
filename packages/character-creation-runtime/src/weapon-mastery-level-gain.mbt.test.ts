// KERNEL-COVERAGE: parity-witness CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-creation.weapon-mastery-level-gain
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  abilityScoreAssignment,
  advanceCharacterBuildClassLevel,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  progressionOptionId,
  weaponMasteryLevelGain,
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
import { CLASS_FEATURE_PROFICIENCY_CHOICE_KEY } from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

const WEAPON_MASTERY_LEVEL_GAIN_RESULTS = [
  "init",
  "fighterLevelFourAccepted",
  "barbarianLevelFourAccepted",
  "fighterOverCountRejected",
  "fighterDuplicateRejected",
] as const;
const FIGHTER_CLASS_UNIT_ID = "class_fighter" as const;
const BARBARIAN_CLASS_UNIT_ID = "class_barbarian" as const;
const FIGHTER_WEAPON_MASTERY_UNIT_ID = "fighter_weapon_mastery" as const;
const BARBARIAN_WEAPON_MASTERY_UNIT_ID = "barbarian_weapon_mastery" as const;
const FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_spear",
  "weapon_flail",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS = [
  ...FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS,
  "weapon_shortsword",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const FIGHTER_OVER_COUNT_WEAPON_UNIT_IDS = [
  ...FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS,
  "weapon_shortbow",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const FIGHTER_DUPLICATE_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_spear",
  "weapon_flail",
  "weapon_longsword",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const BARBARIAN_LEVEL_THREE_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_dagger",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const BARBARIAN_LEVEL_FOUR_WEAPON_UNIT_IDS = [
  ...BARBARIAN_LEVEL_THREE_WEAPON_UNIT_IDS,
  "weapon_spear",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

type WeaponMasteryLevelGainResult =
  (typeof WEAPON_MASTERY_LEVEL_GAIN_RESULTS)[number];
type WeaponMasteryLevelGainDriverAction = Exclude<
  keyof typeof weaponMasteryLevelGainDriverSchema,
  "init" | "step"
>;
type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;
type AbilityScoreCreationHole = Extract<
  CreationHole,
  { readonly kind: "abilityScores" }
>;
type PreferredOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;
type WeaponMasteryLevelGainProjection = z.infer<
  typeof weaponMasteryLevelGainProjectionSchema
>;
type WeaponMasteryLevelGainReplaySequence = {
  readonly name: string;
  readonly actions: readonly WeaponMasteryLevelGainDriverAction[];
  readonly expected: WeaponMasteryLevelGainProjection;
};
type WeaponMasteryLevelGainReplay = {
  readonly obligationId: "CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT";
  readonly actions: readonly WeaponMasteryLevelGainDriverAction[];
  readonly sequences: readonly WeaponMasteryLevelGainReplaySequence[];
};

const weaponMasteryLevelGainDriverSchema = {
  init: {},
  doAcceptFighterLevelFourWeaponMasteryGain: {},
  doAcceptBarbarianLevelFourWeaponMasteryGain: {},
  doRejectFighterOverCountWeaponMasteryGain: {},
  doRejectFighterDuplicateWeaponMasteryGain: {},
  step: {},
} as const;
const qntStepByDriverAction = {
  doAcceptFighterLevelFourWeaponMasteryGain:
    "stepAcceptFighterLevelFourWeaponMasteryGain",
  doAcceptBarbarianLevelFourWeaponMasteryGain:
    "stepAcceptBarbarianLevelFourWeaponMasteryGain",
  doRejectFighterOverCountWeaponMasteryGain:
    "stepRejectFighterOverCountWeaponMasteryGain",
  doRejectFighterDuplicateWeaponMasteryGain:
    "stepRejectFighterDuplicateWeaponMasteryGain",
} as const satisfies Record<WeaponMasteryLevelGainDriverAction, string>;

const noRejectedGainSchema = {
  overCountRejected: z.literal(false),
  duplicateRejected: z.literal(false),
  rejectedWithoutStateChange: z.literal(false),
} as const;
const weaponMasteryLevelGainProjectionSchema = z.discriminatedUnion(
  "lastResult",
  [
    z.object({
      lastResult: z.literal("init"),
      classUnitId: z.literal("none"),
      featureUnitId: z.literal("none"),
      currentClassLevel: z.literal(0),
      nextClassLevel: z.literal(0),
      currentChoiceCount: z.literal(0),
      nextChoiceCount: z.literal(0),
      requestedWeaponCount: z.literal(0),
      selectedWeaponCount: z.literal(0),
      gainCount: z.literal(0),
      firstWeaponUnitId: z.literal("none"),
      secondWeaponUnitId: z.literal("none"),
      thirdWeaponUnitId: z.literal("none"),
      fourthWeaponUnitId: z.literal("none"),
      accepted: z.literal(false),
      ...noRejectedGainSchema,
    }),
    z.object({
      lastResult: z.literal("fighterLevelFourAccepted"),
      classUnitId: z.literal(FIGHTER_CLASS_UNIT_ID),
      featureUnitId: z.literal(FIGHTER_WEAPON_MASTERY_UNIT_ID),
      currentClassLevel: z.literal(3),
      nextClassLevel: z.literal(4),
      currentChoiceCount: z.literal(3),
      nextChoiceCount: z.literal(4),
      requestedWeaponCount: z.literal(4),
      selectedWeaponCount: z.literal(4),
      gainCount: z.literal(1),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_spear"),
      thirdWeaponUnitId: z.literal("weapon_flail"),
      fourthWeaponUnitId: z.literal("weapon_shortsword"),
      accepted: z.literal(true),
      ...noRejectedGainSchema,
    }),
    z.object({
      lastResult: z.literal("barbarianLevelFourAccepted"),
      classUnitId: z.literal(BARBARIAN_CLASS_UNIT_ID),
      featureUnitId: z.literal(BARBARIAN_WEAPON_MASTERY_UNIT_ID),
      currentClassLevel: z.literal(3),
      nextClassLevel: z.literal(4),
      currentChoiceCount: z.literal(2),
      nextChoiceCount: z.literal(3),
      requestedWeaponCount: z.literal(3),
      selectedWeaponCount: z.literal(3),
      gainCount: z.literal(1),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_dagger"),
      thirdWeaponUnitId: z.literal("weapon_spear"),
      fourthWeaponUnitId: z.literal("none"),
      accepted: z.literal(true),
      ...noRejectedGainSchema,
    }),
    z.object({
      lastResult: z.literal("fighterOverCountRejected"),
      classUnitId: z.literal(FIGHTER_CLASS_UNIT_ID),
      featureUnitId: z.literal(FIGHTER_WEAPON_MASTERY_UNIT_ID),
      currentClassLevel: z.literal(3),
      nextClassLevel: z.literal(4),
      currentChoiceCount: z.literal(3),
      nextChoiceCount: z.literal(4),
      requestedWeaponCount: z.literal(5),
      selectedWeaponCount: z.literal(3),
      gainCount: z.literal(0),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_spear"),
      thirdWeaponUnitId: z.literal("weapon_flail"),
      fourthWeaponUnitId: z.literal("none"),
      accepted: z.literal(false),
      overCountRejected: z.literal(true),
      duplicateRejected: z.literal(false),
      rejectedWithoutStateChange: z.literal(true),
    }),
    z.object({
      lastResult: z.literal("fighterDuplicateRejected"),
      classUnitId: z.literal(FIGHTER_CLASS_UNIT_ID),
      featureUnitId: z.literal(FIGHTER_WEAPON_MASTERY_UNIT_ID),
      currentClassLevel: z.literal(3),
      nextClassLevel: z.literal(4),
      currentChoiceCount: z.literal(3),
      nextChoiceCount: z.literal(4),
      requestedWeaponCount: z.literal(4),
      selectedWeaponCount: z.literal(3),
      gainCount: z.literal(0),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_spear"),
      thirdWeaponUnitId: z.literal("weapon_flail"),
      fourthWeaponUnitId: z.literal("none"),
      accepted: z.literal(false),
      overCountRejected: z.literal(false),
      duplicateRejected: z.literal(true),
      rejectedWithoutStateChange: z.literal(true),
    }),
  ],
);
const quintStateSchema = z.object({
  qLastResult: z.enum(WEAPON_MASTERY_LEVEL_GAIN_RESULTS),
  qClassUnitId: z.union([
    z.literal("none"),
    z.literal(FIGHTER_CLASS_UNIT_ID),
    z.literal(BARBARIAN_CLASS_UNIT_ID),
  ]),
  qFeatureUnitId: z.union([
    z.literal("none"),
    z.literal(FIGHTER_WEAPON_MASTERY_UNIT_ID),
    z.literal(BARBARIAN_WEAPON_MASTERY_UNIT_ID),
  ]),
  qCurrentClassLevel: z.bigint(),
  qNextClassLevel: z.bigint(),
  qCurrentChoiceCount: z.bigint(),
  qNextChoiceCount: z.bigint(),
  qRequestedWeaponCount: z.bigint(),
  qSelectedWeaponCount: z.bigint(),
  qGainCount: z.bigint(),
  qFirstWeaponUnitId: z.union([
    z.literal("none"),
    z.literal("weapon_longsword"),
  ]),
  qSecondWeaponUnitId: z.union([
    z.literal("none"),
    z.literal("weapon_spear"),
    z.literal("weapon_dagger"),
  ]),
  qThirdWeaponUnitId: z.union([
    z.literal("none"),
    z.literal("weapon_flail"),
    z.literal("weapon_spear"),
  ]),
  qFourthWeaponUnitId: z.union([
    z.literal("none"),
    z.literal("weapon_shortsword"),
  ]),
  qAccepted: z.boolean(),
  qOverCountRejected: z.boolean(),
  qDuplicateRejected: z.boolean(),
  qRejectedWithoutStateChange: z.boolean(),
});

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation Weapon Mastery level gain Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const weaponMasteryLevelGainReplays = [
  {
    obligationId: "CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT",
    actions: [
      "doAcceptFighterLevelFourWeaponMasteryGain",
      "doAcceptBarbarianLevelFourWeaponMasteryGain",
      "doRejectFighterOverCountWeaponMasteryGain",
      "doRejectFighterDuplicateWeaponMasteryGain",
    ],
    sequences: [
      {
        name: "fighter-level-four-adds-one-table-choice",
        actions: ["doAcceptFighterLevelFourWeaponMasteryGain"],
        expected: fighterLevelFourAcceptedProjection(),
      },
      {
        name: "barbarian-level-four-adds-one-table-choice",
        actions: ["doAcceptBarbarianLevelFourWeaponMasteryGain"],
        expected: barbarianLevelFourAcceptedProjection(),
      },
      {
        name: "fighter-level-four-rejects-over-count-without-state-change",
        actions: ["doRejectFighterOverCountWeaponMasteryGain"],
        expected: fighterOverCountRejectedProjection(),
      },
      {
        name: "fighter-level-four-rejects-duplicates-without-state-change",
        actions: ["doRejectFighterDuplicateWeaponMasteryGain"],
        expected: fighterDuplicateRejectedProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<WeaponMasteryLevelGainReplay>;
const advertisedReplayActions = weaponMasteryLevelGainReplays.flatMap(
  (replay) => replay.actions,
);

describe("Character Creation Weapon Mastery level gain MBT", () => {
  it("replays Weapon Mastery level-gain scenarios deterministically", async () => {
    for (const replay of weaponMasteryLevelGainReplays) {
      const replayedActions = new Set<WeaponMasteryLevelGainDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createWeaponMasteryLevelGainDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation Weapon Mastery level gain driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation Weapon Mastery level gain driver must expose getState.",
          );
        }
        expect(runtime, `${replay.obligationId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation Weapon Mastery level gain parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-weapon-mastery-level-gain.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWeaponMasteryLevelGainDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: weaponMasteryLevelGainStateCheck,
    });
  }, 120_000);

  it("replays every advertised Character Creation Weapon Mastery level gain branch", async () => {
    for (const actionName of advertisedReplayActions) {
      await run({
        spec: path.resolve(
          import.meta.dirname,
          "../character-creation-weapon-mastery-level-gain.mbt.qnt",
        ),
        init: "init",
        step: qntStepByDriverAction[actionName],
        driver: createWeaponMasteryLevelGainDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: 1,
        stateCheck: weaponMasteryLevelGainStateCheck,
      });
    }
  }, 120_000);
});

function createWeaponMasteryLevelGainDriver() {
  return defineDriver(weaponMasteryLevelGainDriverSchema, () => {
    let projection: WeaponMasteryLevelGainProjection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doAcceptFighterLevelFourWeaponMasteryGain: () => {
        projection = fighterLevelFourAcceptedProjection();
      },
      doAcceptBarbarianLevelFourWeaponMasteryGain: () => {
        projection = barbarianLevelFourAcceptedProjection();
      },
      doRejectFighterOverCountWeaponMasteryGain: () => {
        projection = fighterOverCountRejectedProjection();
      },
      doRejectFighterDuplicateWeaponMasteryGain: () => {
        projection = fighterDuplicateRejectedProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): WeaponMasteryLevelGainProjection {
  return weaponMasteryLevelGainProjectionSchema.parse({
    lastResult: "init",
    classUnitId: "none",
    featureUnitId: "none",
    currentClassLevel: 0,
    nextClassLevel: 0,
    currentChoiceCount: 0,
    nextChoiceCount: 0,
    requestedWeaponCount: 0,
    selectedWeaponCount: 0,
    gainCount: 0,
    firstWeaponUnitId: "none",
    secondWeaponUnitId: "none",
    thirdWeaponUnitId: "none",
    fourthWeaponUnitId: "none",
    accepted: false,
    overCountRejected: false,
    duplicateRejected: false,
    rejectedWithoutStateChange: false,
  });
}

function fighterLevelFourAcceptedProjection(): WeaponMasteryLevelGainProjection {
  const build = fighterLevelThreeBuild();
  const advanced = expectRight(
    advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: weaponMasteryGain({
        classUnitId: FIGHTER_CLASS_UNIT_ID,
        featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
        selectedWeaponUnitIds: FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS,
      }),
    }),
  );

  return projectionFromBuild({
    lastResult: "fighterLevelFourAccepted",
    build: advanced,
    classUnitId: FIGHTER_CLASS_UNIT_ID,
    featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
    currentClassLevel: 3,
    nextClassLevel: 4,
    currentChoiceCount: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS.length,
    nextChoiceCount: FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS.length,
    requestedWeaponCount: FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS.length,
    previousWeaponUnitIds: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS,
    accepted: true,
    overCountRejected: false,
    duplicateRejected: false,
    rejectedWithoutStateChange: false,
  });
}

function barbarianLevelFourAcceptedProjection(): WeaponMasteryLevelGainProjection {
  const build = barbarianLevelThreeBuild();
  const advanced = expectRight(
    advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: weaponMasteryGain({
        classUnitId: BARBARIAN_CLASS_UNIT_ID,
        featureUnitId: BARBARIAN_WEAPON_MASTERY_UNIT_ID,
        selectedWeaponUnitIds: BARBARIAN_LEVEL_FOUR_WEAPON_UNIT_IDS,
      }),
    }),
  );

  return projectionFromBuild({
    lastResult: "barbarianLevelFourAccepted",
    build: advanced,
    classUnitId: BARBARIAN_CLASS_UNIT_ID,
    featureUnitId: BARBARIAN_WEAPON_MASTERY_UNIT_ID,
    currentClassLevel: 3,
    nextClassLevel: 4,
    currentChoiceCount: BARBARIAN_LEVEL_THREE_WEAPON_UNIT_IDS.length,
    nextChoiceCount: BARBARIAN_LEVEL_FOUR_WEAPON_UNIT_IDS.length,
    requestedWeaponCount: BARBARIAN_LEVEL_FOUR_WEAPON_UNIT_IDS.length,
    previousWeaponUnitIds: BARBARIAN_LEVEL_THREE_WEAPON_UNIT_IDS,
    accepted: true,
    overCountRejected: false,
    duplicateRejected: false,
    rejectedWithoutStateChange: false,
  });
}

function fighterOverCountRejectedProjection(): WeaponMasteryLevelGainProjection {
  const build = fighterLevelThreeBuild();
  const result = advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: weaponMasteryGain({
      classUnitId: FIGHTER_CLASS_UNIT_ID,
      featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
      selectedWeaponUnitIds: FIGHTER_OVER_COUNT_WEAPON_UNIT_IDS,
    }),
  });
  expectLeftCode(result, "invalidWeaponMasterySelectionCount");

  return projectionFromBuild({
    lastResult: "fighterOverCountRejected",
    build,
    classUnitId: FIGHTER_CLASS_UNIT_ID,
    featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
    currentClassLevel: 3,
    nextClassLevel: 4,
    currentChoiceCount: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS.length,
    nextChoiceCount: FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS.length,
    requestedWeaponCount: FIGHTER_OVER_COUNT_WEAPON_UNIT_IDS.length,
    previousWeaponUnitIds: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS,
    accepted: false,
    overCountRejected: true,
    duplicateRejected: false,
    rejectedWithoutStateChange: true,
  });
}

function fighterDuplicateRejectedProjection(): WeaponMasteryLevelGainProjection {
  const build = fighterLevelThreeBuild();
  const result = advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: weaponMasteryGain({
      classUnitId: FIGHTER_CLASS_UNIT_ID,
      featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
      selectedWeaponUnitIds: FIGHTER_DUPLICATE_WEAPON_UNIT_IDS,
    }),
  });
  expectLeftCode(result, "duplicateWeaponMasterySelection");

  return projectionFromBuild({
    lastResult: "fighterDuplicateRejected",
    build,
    classUnitId: FIGHTER_CLASS_UNIT_ID,
    featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
    currentClassLevel: 3,
    nextClassLevel: 4,
    currentChoiceCount: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS.length,
    nextChoiceCount: FIGHTER_LEVEL_FOUR_WEAPON_UNIT_IDS.length,
    requestedWeaponCount: FIGHTER_DUPLICATE_WEAPON_UNIT_IDS.length,
    previousWeaponUnitIds: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS,
    accepted: false,
    overCountRejected: false,
    duplicateRejected: true,
    rejectedWithoutStateChange: true,
  });
}

function projectionFromBuild(input: {
  readonly lastResult: WeaponMasteryLevelGainResult;
  readonly build: CharacterBuild;
  readonly classUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
  readonly currentClassLevel: number;
  readonly nextClassLevel: number;
  readonly currentChoiceCount: number;
  readonly nextChoiceCount: number;
  readonly requestedWeaponCount: number;
  readonly previousWeaponUnitIds: readonly UnitRecord["id"][];
  readonly accepted: boolean;
  readonly overCountRejected: boolean;
  readonly duplicateRejected: boolean;
  readonly rejectedWithoutStateChange: boolean;
}): WeaponMasteryLevelGainProjection {
  const selectedWeaponUnitIds = selectedBuildClassChoiceUnitIds(
    input.build,
    input.featureUnitId,
  );
  const gainCount = selectedWeaponUnitIds.filter(
    (unitId) => !input.previousWeaponUnitIds.includes(unitId),
  ).length;

  return weaponMasteryLevelGainProjectionSchema.parse({
    lastResult: input.lastResult,
    classUnitId: input.classUnitId,
    featureUnitId: input.featureUnitId,
    currentClassLevel: input.currentClassLevel,
    nextClassLevel: input.nextClassLevel,
    currentChoiceCount: input.currentChoiceCount,
    nextChoiceCount: input.nextChoiceCount,
    requestedWeaponCount: input.requestedWeaponCount,
    selectedWeaponCount: selectedWeaponUnitIds.length,
    gainCount,
    firstWeaponUnitId: selectedWeaponUnitIds[0] ?? "none",
    secondWeaponUnitId: selectedWeaponUnitIds[1] ?? "none",
    thirdWeaponUnitId: selectedWeaponUnitIds[2] ?? "none",
    fourthWeaponUnitId: selectedWeaponUnitIds[3] ?? "none",
    accepted: input.accepted,
    overCountRejected: input.overCountRejected,
    duplicateRejected: input.duplicateRejected,
    rejectedWithoutStateChange: input.rejectedWithoutStateChange,
  });
}

function fighterLevelThreeBuild(): CharacterBuild {
  return finalizedBuild({
    draftId: "weapon-mastery-level-gain:fighter-3",
    classUnitId: FIGHTER_CLASS_UNIT_ID,
    classLevel: 3,
    featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
    selectedWeaponUnitIds: FIGHTER_LEVEL_THREE_WEAPON_UNIT_IDS,
  });
}

function barbarianLevelThreeBuild(): CharacterBuild {
  return finalizedBuild({
    draftId: "weapon-mastery-level-gain:barbarian-3",
    classUnitId: BARBARIAN_CLASS_UNIT_ID,
    classLevel: 3,
    featureUnitId: BARBARIAN_WEAPON_MASTERY_UNIT_ID,
    selectedWeaponUnitIds: BARBARIAN_LEVEL_THREE_WEAPON_UNIT_IDS,
  });
}

function finalizedBuild(input: {
  readonly draftId: string;
  readonly classUnitId: UnitRecord["id"];
  readonly classLevel: number;
  readonly featureUnitId: UnitRecord["id"];
  readonly selectedWeaponUnitIds: readonly UnitRecord["id"][];
}): CharacterBuild {
  const finalized = finalizeCharacterDraft({
    draft: completeSupportedProgressionDraft({
      draftId: input.draftId,
      progression: testProgression(input.classUnitId, input.classLevel),
      preferredOptionIdsBySource: {
        [choiceSourceKey(
          input.featureUnitId,
          WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
        )]: input.selectedWeaponUnitIds.map(creationChoiceOptionId),
      },
    }),
    unitLibrary,
  });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected Weapon Mastery level gain build fixture to finalize, received ${JSON.stringify(finalized)}.`,
    );
  }
  const selectedWeaponUnitIds = selectedBuildClassChoiceUnitIds(
    finalized.build,
    input.featureUnitId,
  );
  if (!sameUnitList(selectedWeaponUnitIds, input.selectedWeaponUnitIds)) {
    throw new Error(
      `Expected ${input.featureUnitId} selected weapon refs ${input.selectedWeaponUnitIds.join(",")}, received ${selectedWeaponUnitIds.join(",")}.`,
    );
  }

  return finalized.build;
}

function weaponMasteryGain(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
  readonly selectedWeaponUnitIds: readonly UnitRecord["id"][];
}) {
  return expectRight(
    weaponMasteryLevelGain({
      unitLibrary,
      classUnitId: testClassUnitId(input.classUnitId),
      hitPointRule: { tag: "fixedHigherLevelGain" },
      featureUnitId: input.featureUnitId,
      selectedWeaponUnitIds: input.selectedWeaponUnitIds,
    }),
  );
}

function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOptionIdsBySource;
}): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftId),
  });

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
            progression: input.progression,
            preferredOptionIdsBySource: input.preferredOptionIdsBySource,
          }),
        ),
      }),
    ).draft;
  }

  throw new Error(
    `Weapon Mastery level gain fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

function supportProfileFillForHole(input: {
  readonly hole: CreationHole;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOptionIdsBySource;
}): CreationFill {
  const hole = input.hole;
  if (hole.kind === "abilityScores") {
    return abilityScoreFill(hole);
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for Weapon Mastery level gain hole ${hole.holeId}.`,
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
      `Not enough support-profile options for Weapon Mastery level gain hole ${hole.holeId}.`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: selectedOptionIds,
  };
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
    return [creationChoiceOptionId(PHASE1_BACKGROUND_SOLDIER_UNIT_ID)];
  }
  if (source.tag === "draft" && source.path === "draft.species") {
    return [creationChoiceOptionId(PHASE1_SPECIES_ORC_UNIT_ID)];
  }
  if (source.tag === "draft" && source.path === "draft.languages") {
    return SUPPORTED_LANGUAGE_OPTION_IDS;
  }
  if (source.tag === "draft" && source.path === "draft.alignment") {
    return [PHASE1_ALIGNMENT_OPTION_ID];
  }
  if (source.tag !== "unitChoice") {
    return undefined;
  }

  return (
    input.preferredOptionIdsBySource[
      choiceSourceKey(source.unitId, source.choiceKey)
    ] ?? manifestFixtureOptionIds(source)
  );
}

function manifestFixtureOptionIds(source: {
  readonly unitId: UnitRecord["id"];
  readonly choiceKey: UnitChoiceKey;
}): readonly CreationChoiceOptionId[] | undefined {
  if (
    source.unitId === "barbarian_primal_knowledge" &&
    source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY
  ) {
    return [creationChoiceOptionId("nature")];
  }

  return soldierBackgroundFixtureOptionIds(source);
}

function abilityScoreFill(hole: AbilityScoreCreationHole): CreationFill {
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

function testProgression(
  classUnitId: UnitRecord["id"],
  classLevel: number,
): CharacterProgression {
  const parsedClassUnitId = testClassUnitId(classUnitId);
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid Weapon Mastery level gain progression: ${JSON.stringify(result.left)}`,
    );
  }

  return result.right;
}

function selectedBuildClassChoiceUnitIds(
  build: CharacterBuild,
  selectedFromUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === selectedFromUnitId
      ? [feature.unitId]
      : [],
  );
}

function normalizeQuintState(raw: unknown): WeaponMasteryLevelGainProjection {
  const parsed = quintStateSchema.parse(raw);
  return weaponMasteryLevelGainProjectionSchema.parse({
    lastResult: parsed.qLastResult,
    classUnitId: parsed.qClassUnitId,
    featureUnitId: parsed.qFeatureUnitId,
    currentClassLevel: Number(parsed.qCurrentClassLevel),
    nextClassLevel: Number(parsed.qNextClassLevel),
    currentChoiceCount: Number(parsed.qCurrentChoiceCount),
    nextChoiceCount: Number(parsed.qNextChoiceCount),
    requestedWeaponCount: Number(parsed.qRequestedWeaponCount),
    selectedWeaponCount: Number(parsed.qSelectedWeaponCount),
    gainCount: Number(parsed.qGainCount),
    firstWeaponUnitId: parsed.qFirstWeaponUnitId,
    secondWeaponUnitId: parsed.qSecondWeaponUnitId,
    thirdWeaponUnitId: parsed.qThirdWeaponUnitId,
    fourthWeaponUnitId: parsed.qFourthWeaponUnitId,
    accepted: parsed.qAccepted,
    overCountRejected: parsed.qOverCountRejected,
    duplicateRejected: parsed.qDuplicateRejected,
    rejectedWithoutStateChange: parsed.qRejectedWithoutStateChange,
  });
}

function compareProjection(
  spec: WeaponMasteryLevelGainProjection,
  impl: WeaponMasteryLevelGainProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}.`,
    );
  }
  expect(Either.isRight(result)).toBe(true);

  return result.right;
}

function expectLeftCode<E extends { readonly code: string }>(
  result: Either.Either<unknown, E>,
  code: E["code"],
): E {
  if (Either.isRight(result)) {
    throw new Error("Expected Either.left, received Either.right.");
  }
  expect(result.left.code).toBe(code);

  return result.left;
}

function testClassUnitId(classUnitId: UnitRecord["id"]) {
  return expectRight(classUnitIdFromUnitId({ unitLibrary, classUnitId }));
}

function choiceSourceKey(unitId: string, choiceKey: UnitChoiceKey): string {
  return `${unitId}/${choiceKey}`;
}

function acceptedBatch(
  result: CreationBatchFillResult,
): Extract<CreationBatchFillResult, { readonly tag: "accepted" }> {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected Weapon Mastery level gain fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
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
      "Weapon Mastery level gain Standard Array fixture must parse.",
    );
  }

  return parsed.right;
}

function sameUnitList(
  left: readonly UnitRecord["id"][],
  right: readonly UnitRecord["id"][],
): boolean {
  return (
    left.length === right.length &&
    left.every((unitId, index) => unitId === right[index])
  );
}

const weaponMasteryLevelGainStateCheck = stateCheck(
  normalizeQuintState,
  compareProjection,
);
