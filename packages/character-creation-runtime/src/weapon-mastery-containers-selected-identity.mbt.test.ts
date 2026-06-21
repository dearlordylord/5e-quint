// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-WEAPON-MASTERY-CONTAINERS fighter_weapon_mastery barbarian_weapon_mastery paladin_weapon_mastery ranger_weapon_mastery rogue_weapon_mastery
// KERNEL-COVERAGE: parity-witness CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS fighter_weapon_mastery doFinalizeFighterWeaponMastery
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS barbarian_weapon_mastery doFinalizeBarbarianWeaponMastery
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS paladin_weapon_mastery doFinalizePaladinWeaponMastery
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS ranger_weapon_mastery doFinalizeRangerWeaponMastery
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS rogue_weapon_mastery doFinalizeRogueWeaponMastery
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

import {
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  abilityScoreAssignment,
  characterBuildFeatureUnitIds,
  characterBuildUnitRefs,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitId,
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
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

const TASK_ID = "L1D2-WEAPON-MASTERY-CONTAINERS";
const WEAPON_MASTERY_CONTAINER_RESULTS = [
  "init",
  "fighterFinalized",
  "barbarianFinalized",
  "paladinFinalized",
  "rangerFinalized",
  "rogueFinalized",
] as const;
const WEAPON_MASTERY_CONTAINER_FEATURE_UNIT_IDS = [
  "fighter_weapon_mastery",
  "barbarian_weapon_mastery",
  "paladin_weapon_mastery",
  "ranger_weapon_mastery",
  "rogue_weapon_mastery",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const WEAPON_MASTERY_CONTAINER_CLASS_UNIT_IDS = [
  "class_fighter",
  "class_barbarian",
  "class_paladin",
  "class_ranger",
  "class_rogue",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

type WeaponMasteryContainerResult =
  (typeof WEAPON_MASTERY_CONTAINER_RESULTS)[number];
type WeaponMasteryContainerFeatureUnitId =
  (typeof WEAPON_MASTERY_CONTAINER_FEATURE_UNIT_IDS)[number];
type WeaponMasteryContainerClassUnitId =
  (typeof WEAPON_MASTERY_CONTAINER_CLASS_UNIT_IDS)[number];
type WeaponMasteryWeaponSelection =
  | readonly [UnitRecord["id"], UnitRecord["id"]]
  | readonly [UnitRecord["id"], UnitRecord["id"], UnitRecord["id"]];
type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;
type AbilityScoreCreationHole = Extract<
  CreationHole,
  { readonly kind: "abilityScores" }
>;
type WeaponMasteryContainerProfile = {
  readonly classUnitId: WeaponMasteryContainerClassUnitId;
  readonly featureUnitId: WeaponMasteryContainerFeatureUnitId;
  readonly result: Exclude<WeaponMasteryContainerResult, "init">;
  readonly selectedWeaponUnitIds: WeaponMasteryWeaponSelection;
};
type WeaponMasteryContainerFacts = {
  readonly selectedMasteryChoiceCount: number;
  readonly buildMasteryFeatureCount: number;
  readonly openHoleCount: number;
  readonly featureUnitRefPresent: boolean;
  readonly firstWeaponUnitRefPresent: boolean;
  readonly secondWeaponUnitRefPresent: boolean;
  readonly thirdWeaponUnitRefPresent: boolean;
  readonly totalLevel: number;
};
type PreferredOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;
type WeaponMasteryContainerSelectedIdentityDriverAction = Exclude<
  keyof typeof weaponMasteryContainerSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly WeaponMasteryContainerSelectedIdentityDriverAction[];
  readonly expected: WeaponMasteryContainerSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: typeof TASK_ID;
  readonly unitId: WeaponMasteryContainerFeatureUnitId;
  readonly actions: readonly WeaponMasteryContainerSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const weaponMasteryContainerSelectedIdentityDriverSchema = {
  init: {},
  doFinalizeFighterWeaponMastery: {},
  doFinalizeBarbarianWeaponMastery: {},
  doFinalizePaladinWeaponMastery: {},
  doFinalizeRangerWeaponMastery: {},
  doFinalizeRogueWeaponMastery: {},
  step: {},
} as const;
const featureUnitIdByDriverAction = {
  doFinalizeFighterWeaponMastery: "fighter_weapon_mastery",
  doFinalizeBarbarianWeaponMastery: "barbarian_weapon_mastery",
  doFinalizePaladinWeaponMastery: "paladin_weapon_mastery",
  doFinalizeRangerWeaponMastery: "ranger_weapon_mastery",
  doFinalizeRogueWeaponMastery: "rogue_weapon_mastery",
} as const satisfies Record<
  WeaponMasteryContainerSelectedIdentityDriverAction,
  WeaponMasteryContainerFeatureUnitId
>;
const qntStepByDriverAction = {
  doFinalizeFighterWeaponMastery: "stepFighterWeaponMastery",
  doFinalizeBarbarianWeaponMastery: "stepBarbarianWeaponMastery",
  doFinalizePaladinWeaponMastery: "stepPaladinWeaponMastery",
  doFinalizeRangerWeaponMastery: "stepRangerWeaponMastery",
  doFinalizeRogueWeaponMastery: "stepRogueWeaponMastery",
} as const satisfies Record<
  WeaponMasteryContainerSelectedIdentityDriverAction,
  string
>;

const refPresenceSchema = {
  featureUnitRefPresent: z.literal(true),
  firstWeaponUnitRefPresent: z.literal(true),
  secondWeaponUnitRefPresent: z.literal(true),
  thirdWeaponUnitRefPresent: z.literal(false),
} as const;
const threeWeaponRefPresenceSchema = {
  featureUnitRefPresent: z.literal(true),
  firstWeaponUnitRefPresent: z.literal(true),
  secondWeaponUnitRefPresent: z.literal(true),
  thirdWeaponUnitRefPresent: z.literal(true),
} as const;
const weaponMasteryContainerSelectedIdentityProjectionSchema =
  z.discriminatedUnion("outcome", [
    z.object({
      outcome: z.literal("init"),
      featureUnitId: z.literal("none"),
      classUnitId: z.literal("none"),
      firstWeaponUnitId: z.literal("none"),
      secondWeaponUnitId: z.literal("none"),
      thirdWeaponUnitId: z.literal("none"),
      selectedMasteryChoiceCount: z.literal(0),
      buildMasteryFeatureCount: z.literal(0),
      openHoleCount: z.literal(0),
      featureUnitRefPresent: z.literal(false),
      firstWeaponUnitRefPresent: z.literal(false),
      secondWeaponUnitRefPresent: z.literal(false),
      thirdWeaponUnitRefPresent: z.literal(false),
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("fighterFinalized"),
      featureUnitId: z.literal("fighter_weapon_mastery"),
      classUnitId: z.literal("class_fighter"),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_spear"),
      thirdWeaponUnitId: z.literal("weapon_flail"),
      selectedMasteryChoiceCount: z.literal(3),
      buildMasteryFeatureCount: z.literal(3),
      openHoleCount: z.literal(0),
      ...threeWeaponRefPresenceSchema,
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("barbarianFinalized"),
      featureUnitId: z.literal("barbarian_weapon_mastery"),
      classUnitId: z.literal("class_barbarian"),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_dagger"),
      thirdWeaponUnitId: z.literal("none"),
      selectedMasteryChoiceCount: z.literal(2),
      buildMasteryFeatureCount: z.literal(2),
      openHoleCount: z.literal(0),
      ...refPresenceSchema,
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("paladinFinalized"),
      featureUnitId: z.literal("paladin_weapon_mastery"),
      classUnitId: z.literal("class_paladin"),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_dagger"),
      thirdWeaponUnitId: z.literal("none"),
      selectedMasteryChoiceCount: z.literal(2),
      buildMasteryFeatureCount: z.literal(2),
      openHoleCount: z.literal(0),
      ...refPresenceSchema,
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("rangerFinalized"),
      featureUnitId: z.literal("ranger_weapon_mastery"),
      classUnitId: z.literal("class_ranger"),
      firstWeaponUnitId: z.literal("weapon_longsword"),
      secondWeaponUnitId: z.literal("weapon_dagger"),
      thirdWeaponUnitId: z.literal("none"),
      selectedMasteryChoiceCount: z.literal(2),
      buildMasteryFeatureCount: z.literal(2),
      openHoleCount: z.literal(0),
      ...refPresenceSchema,
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("rogueFinalized"),
      featureUnitId: z.literal("rogue_weapon_mastery"),
      classUnitId: z.literal("class_rogue"),
      firstWeaponUnitId: z.literal("weapon_dagger"),
      secondWeaponUnitId: z.literal("weapon_shortsword"),
      thirdWeaponUnitId: z.literal("none"),
      selectedMasteryChoiceCount: z.literal(2),
      buildMasteryFeatureCount: z.literal(2),
      openHoleCount: z.literal(0),
      ...refPresenceSchema,
      totalLevel: z.literal(1),
    }),
  ]);
type WeaponMasteryContainerSelectedIdentityProjection = z.infer<
  typeof weaponMasteryContainerSelectedIdentityProjectionSchema
>;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation Weapon Mastery container selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const weaponMasteryContainerProfiles = [
  {
    classUnitId: "class_fighter",
    featureUnitId: "fighter_weapon_mastery",
    result: "fighterFinalized",
    selectedWeaponUnitIds: ["weapon_longsword", "weapon_spear", "weapon_flail"],
  },
  {
    classUnitId: "class_barbarian",
    featureUnitId: "barbarian_weapon_mastery",
    result: "barbarianFinalized",
    selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
  },
  {
    classUnitId: "class_paladin",
    featureUnitId: "paladin_weapon_mastery",
    result: "paladinFinalized",
    selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
  },
  {
    classUnitId: "class_ranger",
    featureUnitId: "ranger_weapon_mastery",
    result: "rangerFinalized",
    selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
  },
  {
    classUnitId: "class_rogue",
    featureUnitId: "rogue_weapon_mastery",
    result: "rogueFinalized",
    selectedWeaponUnitIds: ["weapon_dagger", "weapon_shortsword"],
  },
] as const satisfies ReadonlyArray<WeaponMasteryContainerProfile>;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "fighter_weapon_mastery",
    actions: ["doFinalizeFighterWeaponMastery"],
    sequences: [
      {
        name: "fighter-finalizes-three-selected-weapon-mastery-refs",
        actions: ["doFinalizeFighterWeaponMastery"],
        expected: projectionForProfile(
          weaponMasteryProfile("fighter_weapon_mastery"),
        ),
      },
    ],
  },
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "barbarian_weapon_mastery",
    actions: ["doFinalizeBarbarianWeaponMastery"],
    sequences: [
      {
        name: "barbarian-finalizes-two-selected-melee-weapon-mastery-refs",
        actions: ["doFinalizeBarbarianWeaponMastery"],
        expected: projectionForProfile(
          weaponMasteryProfile("barbarian_weapon_mastery"),
        ),
      },
    ],
  },
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "paladin_weapon_mastery",
    actions: ["doFinalizePaladinWeaponMastery"],
    sequences: [
      {
        name: "paladin-finalizes-two-selected-weapon-mastery-refs",
        actions: ["doFinalizePaladinWeaponMastery"],
        expected: projectionForProfile(
          weaponMasteryProfile("paladin_weapon_mastery"),
        ),
      },
    ],
  },
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "ranger_weapon_mastery",
    actions: ["doFinalizeRangerWeaponMastery"],
    sequences: [
      {
        name: "ranger-finalizes-two-selected-weapon-mastery-refs",
        actions: ["doFinalizeRangerWeaponMastery"],
        expected: projectionForProfile(
          weaponMasteryProfile("ranger_weapon_mastery"),
        ),
      },
    ],
  },
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "rogue_weapon_mastery",
    actions: ["doFinalizeRogueWeaponMastery"],
    sequences: [
      {
        name: "rogue-finalizes-two-selected-weapon-mastery-refs",
        actions: ["doFinalizeRogueWeaponMastery"],
        expected: projectionForProfile(
          weaponMasteryProfile("rogue_weapon_mastery"),
        ),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;
const advertisedReplayActions = selectedUnitIdentityReplays.flatMap(
  (replay) => replay.actions,
);

const quintStateSchema = z.object({
  outcome: z.unknown().transform(outcomeField),
  featureUnitId: z.union([
    z.literal("none"),
    z.literal("fighter_weapon_mastery"),
    z.literal("barbarian_weapon_mastery"),
    z.literal("paladin_weapon_mastery"),
    z.literal("ranger_weapon_mastery"),
    z.literal("rogue_weapon_mastery"),
  ]),
  classUnitId: z.union([
    z.literal("none"),
    z.literal("class_fighter"),
    z.literal("class_barbarian"),
    z.literal("class_paladin"),
    z.literal("class_ranger"),
    z.literal("class_rogue"),
  ]),
  firstWeaponUnitId: z.union([
    z.literal("none"),
    z.literal("weapon_longsword"),
    z.literal("weapon_dagger"),
  ]),
  secondWeaponUnitId: z.union([
    z.literal("none"),
    z.literal("weapon_dagger"),
    z.literal("weapon_spear"),
    z.literal("weapon_shortsword"),
  ]),
  thirdWeaponUnitId: z.union([z.literal("none"), z.literal("weapon_flail")]),
  selectedMasteryChoiceCount: z.bigint(),
  buildMasteryFeatureCount: z.bigint(),
  openHoleCount: z.bigint(),
  featureUnitRefPresent: z.boolean(),
  firstWeaponUnitRefPresent: z.boolean(),
  secondWeaponUnitRefPresent: z.boolean(),
  thirdWeaponUnitRefPresent: z.boolean(),
  totalLevel: z.bigint(),
});

const qntOutcomeByVariant = {
  CharacterCreationWeaponMasteryContainersSelectedIdentityInit: "init",
  CharacterCreationWeaponMasteryContainersSelectedIdentityFighterFinalized:
    "fighterFinalized",
  CharacterCreationWeaponMasteryContainersSelectedIdentityBarbarianFinalized:
    "barbarianFinalized",
  CharacterCreationWeaponMasteryContainersSelectedIdentityPaladinFinalized:
    "paladinFinalized",
  CharacterCreationWeaponMasteryContainersSelectedIdentityRangerFinalized:
    "rangerFinalized",
  CharacterCreationWeaponMasteryContainersSelectedIdentityRogueFinalized:
    "rogueFinalized",
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

describe("Character Creation Weapon Mastery containers selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<WeaponMasteryContainerSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createWeaponMasteryContainerSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation Weapon Mastery container selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation Weapon Mastery container selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation Weapon Mastery container selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-weapon-mastery-containers-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWeaponMasteryContainerSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: weaponMasteryContainerSelectedIdentityStateCheck,
    });
  }, 120_000);

  it("replays every advertised Character Creation Weapon Mastery container branch", async () => {
    for (const actionName of advertisedReplayActions) {
      await run({
        spec: path.resolve(
          import.meta.dirname,
          "../character-creation-weapon-mastery-containers-selected-identity.mbt.qnt",
        ),
        init: "init",
        step: qntStepByDriverAction[actionName],
        driver: createWeaponMasteryContainerSelectedIdentityDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: 1,
        stateCheck: weaponMasteryContainerSelectedIdentityStateCheck,
      });
    }
  }, 120_000);
});

function createWeaponMasteryContainerSelectedIdentityDriver() {
  return defineDriver(
    weaponMasteryContainerSelectedIdentityDriverSchema,
    () => {
      let projection: WeaponMasteryContainerSelectedIdentityProjection =
        initialProjection();

      function reset(): void {
        projection = initialProjection();
      }

      return {
        init: reset,
        doFinalizeFighterWeaponMastery: () => {
          projection = projectionForDriverAction(
            "doFinalizeFighterWeaponMastery",
          );
        },
        doFinalizeBarbarianWeaponMastery: () => {
          projection = projectionForDriverAction(
            "doFinalizeBarbarianWeaponMastery",
          );
        },
        doFinalizePaladinWeaponMastery: () => {
          projection = projectionForDriverAction(
            "doFinalizePaladinWeaponMastery",
          );
        },
        doFinalizeRangerWeaponMastery: () => {
          projection = projectionForDriverAction(
            "doFinalizeRangerWeaponMastery",
          );
        },
        doFinalizeRogueWeaponMastery: () => {
          projection = projectionForDriverAction(
            "doFinalizeRogueWeaponMastery",
          );
        },
        step: () => {},
        getState: () => projection,
      };
    },
  );
}

function projectionForDriverAction(
  actionName: WeaponMasteryContainerSelectedIdentityDriverAction,
): WeaponMasteryContainerSelectedIdentityProjection {
  return projectionForProfile(
    weaponMasteryProfile(featureUnitIdByDriverAction[actionName]),
  );
}

function initialProjection(): Extract<
  WeaponMasteryContainerSelectedIdentityProjection,
  { readonly outcome: "init" }
> {
  return {
    outcome: "init",
    featureUnitId: "none",
    classUnitId: "none",
    firstWeaponUnitId: "none",
    secondWeaponUnitId: "none",
    thirdWeaponUnitId: "none",
    selectedMasteryChoiceCount: 0,
    buildMasteryFeatureCount: 0,
    openHoleCount: 0,
    featureUnitRefPresent: false,
    firstWeaponUnitRefPresent: false,
    secondWeaponUnitRefPresent: false,
    thirdWeaponUnitRefPresent: false,
    totalLevel: 1,
  };
}

function projectionForProfile(
  profile: WeaponMasteryContainerProfile,
): WeaponMasteryContainerSelectedIdentityProjection {
  const draft = completeSupportedWeaponMasteryDraft(profile);
  const finalized = finalizeCharacterDraft({ draft, unitLibrary });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected ${profile.featureUnitId} selected identity draft to finalize, received ${finalized.tag}.`,
    );
  }

  const facts = weaponMasteryContainerFacts({
    draft,
    build: finalized.build,
    profile,
  });
  return weaponMasteryContainerSelectedIdentityProjectionSchema.parse({
    outcome: profile.result,
    featureUnitId: profile.featureUnitId,
    classUnitId: profile.classUnitId,
    firstWeaponUnitId: profile.selectedWeaponUnitIds[0],
    secondWeaponUnitId: profile.selectedWeaponUnitIds[1],
    thirdWeaponUnitId: profile.selectedWeaponUnitIds[2] ?? "none",
    selectedMasteryChoiceCount: facts.selectedMasteryChoiceCount,
    buildMasteryFeatureCount: facts.buildMasteryFeatureCount,
    openHoleCount: facts.openHoleCount,
    featureUnitRefPresent: facts.featureUnitRefPresent,
    firstWeaponUnitRefPresent: facts.firstWeaponUnitRefPresent,
    secondWeaponUnitRefPresent: facts.secondWeaponUnitRefPresent,
    thirdWeaponUnitRefPresent: facts.thirdWeaponUnitRefPresent,
    totalLevel: facts.totalLevel,
  });
}

function completeSupportedWeaponMasteryDraft(
  profile: WeaponMasteryContainerProfile,
): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(
      `weapon-mastery-container-selected-identity:${profile.featureUnitId}`,
    ),
  });
  const progression = levelOneProgression(profile.classUnitId);
  const preferredOptionIdsBySource =
    preferredWeaponMasteryOptionIdsBySource(profile);

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
    `${profile.featureUnitId} selected identity fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

function levelOneProgression(
  classId: WeaponMasteryContainerClassUnitId,
): CharacterProgression {
  return {
    startingClass: classUnitId(classId),
    advancements: [],
  };
}

function preferredWeaponMasteryOptionIdsBySource(
  profile: WeaponMasteryContainerProfile,
): PreferredOptionIdsBySource {
  return {
    [choiceSourceKey(profile.featureUnitId, WEAPON_MASTERY_OPTIONS_CHOICE_KEY)]:
      profile.selectedWeaponUnitIds.map(creationChoiceOptionId),
  };
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
      `No support-profile options for Weapon Mastery container selected identity hole ${hole.holeId}.`,
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
      `Not enough support-profile options for Weapon Mastery container selected identity hole ${hole.holeId}.`,
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
    ] ?? soldierBackgroundFixtureOptionIds(source)
  );
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

function weaponMasteryContainerFacts(input: {
  readonly draft: CharacterDraft;
  readonly build: CharacterBuild;
  readonly profile: WeaponMasteryContainerProfile;
}): WeaponMasteryContainerFacts {
  const selectedMasteryWeapons = selectedChoiceOptionIds(
    input.draft,
    input.profile.featureUnitId,
    WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  );
  const expectedMasteryWeapons = input.profile.selectedWeaponUnitIds.map(
    creationChoiceOptionId,
  );
  if (!sameOptionList(selectedMasteryWeapons, expectedMasteryWeapons)) {
    throw new Error(
      `Expected ${input.profile.featureUnitId} selections ${expectedMasteryWeapons.join(",")}, received ${selectedMasteryWeapons.join(",")}.`,
    );
  }

  const selectedBuildFeatures = selectedBuildClassChoiceUnitIds(
    input.build,
    input.profile.featureUnitId,
  );
  if (
    !sameUnitList(selectedBuildFeatures, input.profile.selectedWeaponUnitIds)
  ) {
    throw new Error(
      `Expected ${input.profile.featureUnitId} CharacterBuild selected refs ${input.profile.selectedWeaponUnitIds.join(",")}, received ${selectedBuildFeatures.join(",")}.`,
    );
  }

  const unitRefIds = characterBuildUnitRefs(input.build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  const featureUnitIds = characterBuildFeatureUnitIds(input.build, unitLibrary);
  return {
    selectedMasteryChoiceCount: selectedMasteryWeapons.length,
    buildMasteryFeatureCount: selectedBuildFeatures.length,
    openHoleCount: discoverCreationHoles({
      draft: input.draft,
      unitLibrary,
    }).length,
    featureUnitRefPresent: featureUnitIds.includes(input.profile.featureUnitId),
    firstWeaponUnitRefPresent: unitRefIds.includes(
      input.profile.selectedWeaponUnitIds[0],
    ),
    secondWeaponUnitRefPresent: unitRefIds.includes(
      input.profile.selectedWeaponUnitIds[1],
    ),
    thirdWeaponUnitRefPresent:
      input.profile.selectedWeaponUnitIds[2] === undefined
        ? false
        : unitRefIds.includes(input.profile.selectedWeaponUnitIds[2]),
    totalLevel: computeTotalLevel(input.build.progression),
  };
}

function selectedChoiceOptionIds(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): readonly CreationChoiceOptionId[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.map((option) => option.optionId)
      : [],
  );
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

function weaponMasteryProfile(
  featureUnitId: WeaponMasteryContainerFeatureUnitId,
): WeaponMasteryContainerProfile {
  const profile = weaponMasteryContainerProfiles.find(
    (candidate) => candidate.featureUnitId === featureUnitId,
  );
  if (profile === undefined) {
    throw new Error(
      `Unknown Weapon Mastery container selected identity Unit ${featureUnitId}.`,
    );
  }

  return profile;
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
      `Expected Weapon Mastery container selected identity fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
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
      "Weapon Mastery container selected identity Standard Array fixture must parse.",
    );
  }

  return parsed.right;
}

function sameOptionList(
  left: readonly CreationChoiceOptionId[],
  right: readonly CreationChoiceOptionId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((optionId, index) => optionId === right[index])
  );
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
): WeaponMasteryContainerSelectedIdentityProjection {
  const parsed = quintStateSchema.parse(qStateValue(raw));
  return weaponMasteryContainerSelectedIdentityProjectionSchema.parse({
    outcome: parsed.outcome,
    featureUnitId: parsed.featureUnitId,
    classUnitId: parsed.classUnitId,
    firstWeaponUnitId: parsed.firstWeaponUnitId,
    secondWeaponUnitId: parsed.secondWeaponUnitId,
    thirdWeaponUnitId: parsed.thirdWeaponUnitId,
    selectedMasteryChoiceCount: Number(parsed.selectedMasteryChoiceCount),
    buildMasteryFeatureCount: Number(parsed.buildMasteryFeatureCount),
    openHoleCount: Number(parsed.openHoleCount),
    featureUnitRefPresent: parsed.featureUnitRefPresent,
    firstWeaponUnitRefPresent: parsed.firstWeaponUnitRefPresent,
    secondWeaponUnitRefPresent: parsed.secondWeaponUnitRefPresent,
    thirdWeaponUnitRefPresent: parsed.thirdWeaponUnitRefPresent,
    totalLevel: Number(parsed.totalLevel),
  });
}

function compareProjection(
  spec: WeaponMasteryContainerSelectedIdentityProjection,
  impl: WeaponMasteryContainerSelectedIdentityProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const weaponMasteryContainerSelectedIdentityStateCheck = stateCheck(
  normalizeQuintState,
  compareProjection,
);
