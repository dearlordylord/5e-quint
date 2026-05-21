// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-WEAPON-MASTERY-CONTAINERS paladin_weapon_mastery ranger_weapon_mastery rogue_weapon_mastery
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS paladin_weapon_mastery doSelectPaladinWeaponMastery doReselectPaladinWeaponMasteryOnLongRest
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS ranger_weapon_mastery doSelectRangerWeaponMastery doReselectRangerWeaponMasteryOnLongRest
// UNIT-IDENTITY-MBT-REPLAY: L1D2-WEAPON-MASTERY-CONTAINERS rogue_weapon_mastery doSelectRogueWeaponMastery doReselectRogueWeaponMasteryOnLongRest
// KERNEL-COVERAGE: parity-witness SHEET.WEAPON_MASTERY.RESELECTION
import * as path from "node:path";

import {
  abilityScoreAssignment,
  characterBuildFeatureUnitIds,
  classUnitId,
  weaponMasteryChoiceProfileForFeature,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  characterSheetId,
  completeLongRest as completeLongRestCore,
  createFreshCharacterSheet,
  finishLongRest,
  startLongRest,
  type CharacterSheet,
  type CharacterSheetLongRestInput,
  type CharacterSheetWeaponMasteryReselection,
} from "./index.ts";

const TASK_ID = "L1D2-WEAPON-MASTERY-CONTAINERS";

const WEAPON_MASTERY_CONTAINER_SELECTED_IDENTITY_RESULTS = [
  "init",
  "paladinSelected",
  "paladinReselected",
  "rangerSelected",
  "rangerReselected",
  "rogueSelected",
  "rogueReselected",
] as const;
const WEAPON_MASTERY_CONTAINER_FEATURE_UNIT_IDS = [
  "paladin_weapon_mastery",
  "ranger_weapon_mastery",
  "rogue_weapon_mastery",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const WEAPON_MASTERY_CONTAINER_CLASS_UNIT_IDS = [
  "class_paladin",
  "class_ranger",
  "class_rogue",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

type WeaponMasteryContainerSelectedIdentityResult =
  (typeof WEAPON_MASTERY_CONTAINER_SELECTED_IDENTITY_RESULTS)[number];
type WeaponMasteryContainerFeatureUnitId =
  (typeof WEAPON_MASTERY_CONTAINER_FEATURE_UNIT_IDS)[number];
type WeaponMasteryContainerClassUnitId =
  (typeof WEAPON_MASTERY_CONTAINER_CLASS_UNIT_IDS)[number];
type WeaponMasteryWeaponPair = readonly [UnitRecord["id"], UnitRecord["id"]];
type WeaponMasteryContainerProfile = {
  readonly classUnitId: WeaponMasteryContainerClassUnitId;
  readonly featureUnitId: WeaponMasteryContainerFeatureUnitId;
  readonly selectedResult: Exclude<
    WeaponMasteryContainerSelectedIdentityResult,
    "init"
  >;
  readonly reselectedResult: Exclude<
    WeaponMasteryContainerSelectedIdentityResult,
    "init"
  >;
  readonly selectedWeaponUnitIds: WeaponMasteryWeaponPair;
  readonly reselectedWeaponUnitIds: WeaponMasteryWeaponPair;
};
type WeaponMasteryContainerSelectedIdentityProjection =
  | {
      readonly lastResult: "init";
      readonly featureUnitId: "none";
      readonly classUnitId: "none";
      readonly firstWeaponUnitId: "none";
      readonly secondWeaponUnitId: "none";
      readonly choiceCount: 0;
      readonly longRestChangeCount: 0;
      readonly selectedWeaponCount: 0;
      readonly changedChoiceCount: 0;
      readonly firstWeaponEligible: false;
      readonly secondWeaponEligible: false;
      readonly featureUnitRefPresent: false;
      readonly accepted: false;
    }
  | {
      readonly lastResult: Exclude<
        WeaponMasteryContainerSelectedIdentityResult,
        "init"
      >;
      readonly featureUnitId: WeaponMasteryContainerFeatureUnitId;
      readonly classUnitId: WeaponMasteryContainerClassUnitId;
      readonly firstWeaponUnitId: UnitRecord["id"];
      readonly secondWeaponUnitId: UnitRecord["id"];
      readonly choiceCount: 2;
      readonly longRestChangeCount: 2;
      readonly selectedWeaponCount: 2;
      readonly changedChoiceCount: 0 | 2;
      readonly firstWeaponEligible: true;
      readonly secondWeaponEligible: true;
      readonly featureUnitRefPresent: true;
      readonly accepted: true;
    };
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
  doSelectPaladinWeaponMastery: {},
  doReselectPaladinWeaponMasteryOnLongRest: {},
  doSelectRangerWeaponMastery: {},
  doReselectRangerWeaponMasteryOnLongRest: {},
  doSelectRogueWeaponMastery: {},
  doReselectRogueWeaponMasteryOnLongRest: {},
  step: {},
} as const;
const qntStepByDriverAction = {
  doSelectPaladinWeaponMastery: "stepSelectPaladinWeaponMastery",
  doReselectPaladinWeaponMasteryOnLongRest:
    "stepReselectPaladinWeaponMasteryOnLongRest",
  doSelectRangerWeaponMastery: "stepSelectRangerWeaponMastery",
  doReselectRangerWeaponMasteryOnLongRest:
    "stepReselectRangerWeaponMasteryOnLongRest",
  doSelectRogueWeaponMastery: "stepSelectRogueWeaponMastery",
  doReselectRogueWeaponMasteryOnLongRest:
    "stepReselectRogueWeaponMasteryOnLongRest",
} as const satisfies Record<
  WeaponMasteryContainerSelectedIdentityDriverAction,
  string
>;

const PALADIN_WEAPON_MASTERY_PROFILE = {
  classUnitId: "class_paladin",
  featureUnitId: "paladin_weapon_mastery",
  selectedResult: "paladinSelected",
  reselectedResult: "paladinReselected",
  selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
  reselectedWeaponUnitIds: ["weapon_spear", "weapon_flail"],
} as const satisfies WeaponMasteryContainerProfile;
const RANGER_WEAPON_MASTERY_PROFILE = {
  classUnitId: "class_ranger",
  featureUnitId: "ranger_weapon_mastery",
  selectedResult: "rangerSelected",
  reselectedResult: "rangerReselected",
  selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
  reselectedWeaponUnitIds: ["weapon_spear", "weapon_flail"],
} as const satisfies WeaponMasteryContainerProfile;
const ROGUE_WEAPON_MASTERY_PROFILE = {
  classUnitId: "class_rogue",
  featureUnitId: "rogue_weapon_mastery",
  selectedResult: "rogueSelected",
  reselectedResult: "rogueReselected",
  selectedWeaponUnitIds: ["weapon_dagger", "weapon_shortbow"],
  reselectedWeaponUnitIds: ["weapon_spear", "weapon_shortsword"],
} as const satisfies WeaponMasteryContainerProfile;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet Weapon Mastery container selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

function completeLongRest(
  input: Omit<CharacterSheetLongRestInput, "completion"> & {
    readonly sheet: CharacterSheet;
  },
) {
  const { sheet, ...benefits } = input;
  const rest = requireRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  const completion = requireRight(
    finishLongRest({ rest, restedTicks: rest.requiredRestTicks }),
  );
  return completeLongRestCore({ ...benefits, completion });
}

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "paladin_weapon_mastery",
    actions: [
      "doSelectPaladinWeaponMastery",
      "doReselectPaladinWeaponMasteryOnLongRest",
    ],
    sequences: [
      {
        name: "paladin-projects-two-selected-proficient-weapon-mastery-choices",
        actions: ["doSelectPaladinWeaponMastery"],
        expected: selectedWeaponMasteryProjection(
          PALADIN_WEAPON_MASTERY_PROFILE,
        ),
      },
      {
        name: "paladin-long-rest-reselects-two-weapon-mastery-choices",
        actions: ["doReselectPaladinWeaponMasteryOnLongRest"],
        expected: reselectedWeaponMasteryProjection(
          PALADIN_WEAPON_MASTERY_PROFILE,
        ),
      },
    ],
  },
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "ranger_weapon_mastery",
    actions: [
      "doSelectRangerWeaponMastery",
      "doReselectRangerWeaponMasteryOnLongRest",
    ],
    sequences: [
      {
        name: "ranger-projects-two-selected-proficient-weapon-mastery-choices",
        actions: ["doSelectRangerWeaponMastery"],
        expected: selectedWeaponMasteryProjection(
          RANGER_WEAPON_MASTERY_PROFILE,
        ),
      },
      {
        name: "ranger-long-rest-reselects-two-weapon-mastery-choices",
        actions: ["doReselectRangerWeaponMasteryOnLongRest"],
        expected: reselectedWeaponMasteryProjection(
          RANGER_WEAPON_MASTERY_PROFILE,
        ),
      },
    ],
  },
  {
    taskId: "L1D2-WEAPON-MASTERY-CONTAINERS",
    unitId: "rogue_weapon_mastery",
    actions: [
      "doSelectRogueWeaponMastery",
      "doReselectRogueWeaponMasteryOnLongRest",
    ],
    sequences: [
      {
        name: "rogue-projects-two-selected-proficient-weapon-mastery-choices",
        actions: ["doSelectRogueWeaponMastery"],
        expected: selectedWeaponMasteryProjection(ROGUE_WEAPON_MASTERY_PROFILE),
      },
      {
        name: "rogue-long-rest-reselects-two-weapon-mastery-choices",
        actions: ["doReselectRogueWeaponMasteryOnLongRest"],
        expected: reselectedWeaponMasteryProjection(
          ROGUE_WEAPON_MASTERY_PROFILE,
        ),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;
const advertisedReplayActions = selectedUnitIdentityReplays.flatMap(
  (replay) => replay.actions,
);

describe("Character Sheet Weapon Mastery container selected identity MBT", () => {
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
              `Missing Character Sheet Weapon Mastery container selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet Weapon Mastery container selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet Weapon Mastery container selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt",
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

  it("replays every advertised Character Sheet Weapon Mastery container branch", async () => {
    for (const actionName of advertisedReplayActions) {
      await run({
        spec: path.resolve(
          import.meta.dirname,
          "../character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt",
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
        doSelectPaladinWeaponMastery: () => {
          projection = selectedWeaponMasteryProjection(
            PALADIN_WEAPON_MASTERY_PROFILE,
          );
        },
        doReselectPaladinWeaponMasteryOnLongRest: () => {
          projection = reselectedWeaponMasteryProjection(
            PALADIN_WEAPON_MASTERY_PROFILE,
          );
        },
        doSelectRangerWeaponMastery: () => {
          projection = selectedWeaponMasteryProjection(
            RANGER_WEAPON_MASTERY_PROFILE,
          );
        },
        doReselectRangerWeaponMasteryOnLongRest: () => {
          projection = reselectedWeaponMasteryProjection(
            RANGER_WEAPON_MASTERY_PROFILE,
          );
        },
        doSelectRogueWeaponMastery: () => {
          projection = selectedWeaponMasteryProjection(
            ROGUE_WEAPON_MASTERY_PROFILE,
          );
        },
        doReselectRogueWeaponMasteryOnLongRest: () => {
          projection = reselectedWeaponMasteryProjection(
            ROGUE_WEAPON_MASTERY_PROFILE,
          );
        },
        step: () => {},
        getState: () => projection,
      };
    },
  );
}

function selectedWeaponMasteryProjection(
  profile: WeaponMasteryContainerProfile,
): WeaponMasteryContainerSelectedIdentityProjection {
  const sheet = weaponMasterySheet({
    classUnitId: profile.classUnitId,
    featureUnitId: profile.featureUnitId,
    selectedWeaponUnitIds: profile.selectedWeaponUnitIds,
  });
  return weaponMasteryProjection({
    lastResult: profile.selectedResult,
    sheet,
    profile,
    selectedWeaponUnitIds: profile.selectedWeaponUnitIds,
    changedChoiceCount: 0,
  });
}

function reselectedWeaponMasteryProjection(
  profile: WeaponMasteryContainerProfile,
): WeaponMasteryContainerSelectedIdentityProjection {
  const sheet = weaponMasterySheet({
    classUnitId: profile.classUnitId,
    featureUnitId: profile.featureUnitId,
    selectedWeaponUnitIds: profile.selectedWeaponUnitIds,
  });
  const reselection = {
    featureUnitId: profile.featureUnitId,
    selectedWeaponUnitIds: profile.reselectedWeaponUnitIds,
  } satisfies CharacterSheetWeaponMasteryReselection;
  const rested = requireRight(
    completeLongRest({
      sheet,
      unitLibrary,
      weaponMasteryReselections: [reselection],
    }),
  );
  return weaponMasteryProjection({
    lastResult: profile.reselectedResult,
    sheet: rested,
    profile,
    selectedWeaponUnitIds: profile.reselectedWeaponUnitIds,
    changedChoiceCount: 2,
  });
}

function weaponMasteryProjection(input: {
  readonly lastResult: Exclude<
    WeaponMasteryContainerSelectedIdentityResult,
    "init"
  >;
  readonly sheet: CharacterSheet;
  readonly profile: WeaponMasteryContainerProfile;
  readonly selectedWeaponUnitIds: WeaponMasteryWeaponPair;
  readonly changedChoiceCount: 0 | 2;
}): WeaponMasteryContainerSelectedIdentityProjection {
  const eligibleWeaponUnitIds = eligibleWeaponMasteryWeaponUnitIds(
    input.profile.featureUnitId,
  );
  const selectedWeaponUnitIds = selectedClassChoiceUnitIds(
    input.sheet.build,
    input.profile.featureUnitId,
  );
  expectSelectedWeaponPair(selectedWeaponUnitIds, input.selectedWeaponUnitIds);

  const [firstWeaponUnitId, secondWeaponUnitId] = input.selectedWeaponUnitIds;
  return {
    lastResult: input.lastResult,
    featureUnitId: input.profile.featureUnitId,
    classUnitId: input.profile.classUnitId,
    firstWeaponUnitId,
    secondWeaponUnitId,
    choiceCount: 2,
    longRestChangeCount: 2,
    selectedWeaponCount: 2,
    changedChoiceCount: input.changedChoiceCount,
    firstWeaponEligible: expectSelectedWeaponEligible(
      eligibleWeaponUnitIds,
      firstWeaponUnitId,
    ),
    secondWeaponEligible: expectSelectedWeaponEligible(
      eligibleWeaponUnitIds,
      secondWeaponUnitId,
    ),
    featureUnitRefPresent: expectFeatureUnitRefPresent(
      input.sheet.build,
      input.profile.featureUnitId,
    ),
    accepted: true,
  };
}

function eligibleWeaponMasteryWeaponUnitIds(
  featureUnitId: WeaponMasteryContainerFeatureUnitId,
): ReadonlySet<UnitRecord["id"]> {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId,
    unitLibrary,
  });
  if (profile === undefined) {
    throw new Error(
      `Expected ${featureUnitId} to be a Weapon Mastery choice feature.`,
    );
  }
  if (profile.choiceCount !== 2 || profile.longRestChangeCount !== 2) {
    throw new Error(
      `Expected ${featureUnitId} to choose and reselect two weapons.`,
    );
  }
  return new Set(profile.eligibleWeapons.map((weapon) => weapon.id));
}

function weaponMasterySheet(input: {
  readonly classUnitId: WeaponMasteryContainerClassUnitId;
  readonly featureUnitId: WeaponMasteryContainerFeatureUnitId;
  readonly selectedWeaponUnitIds: WeaponMasteryWeaponPair;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(
        `character:${input.featureUnitId}:selected-identity`,
      ),
      build: weaponMasteryBuild(input),
      maximumHp: Hp(12),
      currentHp: Hp(6),
      tempHp: Hp(2),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}

function weaponMasteryBuild(input: {
  readonly classUnitId: WeaponMasteryContainerClassUnitId;
  readonly featureUnitId: WeaponMasteryContainerFeatureUnitId;
  readonly selectedWeaponUnitIds: WeaponMasteryWeaponPair;
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.classUnitId),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: input.selectedWeaponUnitIds.map((unitId) => ({
      kind: "selectedClassChoice" as const,
      selectedFromUnitId: input.featureUnitId,
      unitId,
    })),
    equipment: { owned: [], loadout: {} },
  };
}

function selectedClassChoiceUnitIds(
  build: CharacterBuild,
  featureUnitId: WeaponMasteryContainerFeatureUnitId,
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.unitId]
      : [],
  );
}

function expectSelectedWeaponPair(
  actual: readonly UnitRecord["id"][],
  expected: WeaponMasteryWeaponPair,
): void {
  if (actual.length !== expected.length) {
    throw new Error(
      `Expected ${expected.length} selected Weapon Mastery choices, received ${actual.length}.`,
    );
  }
  for (const [index, unitId] of expected.entries()) {
    if (actual[index] !== unitId) {
      throw new Error(
        `Expected selected Weapon Mastery choice ${index} to equal ${unitId}, received ${actual[index]}.`,
      );
    }
  }
}

function expectSelectedWeaponEligible(
  eligibleWeaponUnitIds: ReadonlySet<UnitRecord["id"]>,
  selectedWeaponUnitId: UnitRecord["id"],
): true {
  if (!eligibleWeaponUnitIds.has(selectedWeaponUnitId)) {
    throw new Error(
      `Expected ${selectedWeaponUnitId} to be eligible for Weapon Mastery.`,
    );
  }
  return true;
}

function expectFeatureUnitRefPresent(
  build: CharacterBuild,
  featureUnitId: WeaponMasteryContainerFeatureUnitId,
): true {
  if (
    !characterBuildFeatureUnitIds(build, unitLibrary).includes(featureUnitId)
  ) {
    throw new Error(`Expected Character Build to own ${featureUnitId}.`);
  }
  return true;
}

function initialProjection(): WeaponMasteryContainerSelectedIdentityProjection {
  return {
    lastResult: "init",
    featureUnitId: "none",
    classUnitId: "none",
    firstWeaponUnitId: "none",
    secondWeaponUnitId: "none",
    choiceCount: 0,
    longRestChangeCount: 0,
    selectedWeaponCount: 0,
    changedChoiceCount: 0,
    firstWeaponEligible: false,
    secondWeaponEligible: false,
    featureUnitRefPresent: false,
    accepted: false,
  };
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

function normalizeWeaponMasteryContainerSelectedIdentityQuintState(
  raw: unknown,
): WeaponMasteryContainerSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  const lastResult = mbtLastResult(state["qLastResult"]);
  const projection = projectionForLastResult(lastResult);
  assertStringField(state, "qFeatureUnitId", projection.featureUnitId);
  assertStringField(state, "qClassUnitId", projection.classUnitId);
  assertStringField(state, "qFirstWeaponUnitId", projection.firstWeaponUnitId);
  assertStringField(
    state,
    "qSecondWeaponUnitId",
    projection.secondWeaponUnitId,
  );
  assertNumberField(state, "qChoiceCount", projection.choiceCount);
  assertNumberField(
    state,
    "qLongRestChangeCount",
    projection.longRestChangeCount,
  );
  assertNumberField(
    state,
    "qSelectedWeaponCount",
    projection.selectedWeaponCount,
  );
  assertNumberField(
    state,
    "qChangedChoiceCount",
    projection.changedChoiceCount,
  );
  assertBooleanField(
    state,
    "qFirstWeaponEligible",
    projection.firstWeaponEligible,
  );
  assertBooleanField(
    state,
    "qSecondWeaponEligible",
    projection.secondWeaponEligible,
  );
  assertBooleanField(
    state,
    "qFeatureUnitRefPresent",
    projection.featureUnitRefPresent,
  );
  assertBooleanField(state, "qAccepted", projection.accepted);
  return projection;
}

function projectionForLastResult(
  lastResult: WeaponMasteryContainerSelectedIdentityResult,
): WeaponMasteryContainerSelectedIdentityProjection {
  if (lastResult === "init") return initialProjection();
  if (lastResult === "paladinSelected")
    return selectedWeaponMasteryProjection(PALADIN_WEAPON_MASTERY_PROFILE);
  if (lastResult === "paladinReselected")
    return reselectedWeaponMasteryProjection(PALADIN_WEAPON_MASTERY_PROFILE);
  if (lastResult === "rangerSelected")
    return selectedWeaponMasteryProjection(RANGER_WEAPON_MASTERY_PROFILE);
  if (lastResult === "rangerReselected")
    return reselectedWeaponMasteryProjection(RANGER_WEAPON_MASTERY_PROFILE);
  if (lastResult === "rogueSelected")
    return selectedWeaponMasteryProjection(ROGUE_WEAPON_MASTERY_PROFILE);
  if (lastResult === "rogueReselected")
    return reselectedWeaponMasteryProjection(ROGUE_WEAPON_MASTERY_PROFILE);
  return assertNever(lastResult);
}

function assertNever(value: never): never {
  throw new Error(
    `Unhandled Weapon Mastery selected identity result ${value}.`,
  );
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function stringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const value = state[field];
  if (typeof value === "string") return value;
  throw new Error(`Expected Quint string field ${field}.`);
}

function assertStringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: string,
): void {
  const value = stringField(state, field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint string field ${field} to equal ${expected}, got ${value}.`,
    );
  }
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function assertBooleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: boolean,
): void {
  const value = booleanField(state, field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint boolean field ${field} to equal ${String(expected)}, got ${String(value)}.`,
    );
  }
}

function assertNumberField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: number,
): void {
  const value = numberFromQuintInt(state[field], field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint integer field ${field} to equal ${expected}, got ${value}.`,
    );
  }
}

function mbtLastResult(
  raw: unknown,
): WeaponMasteryContainerSelectedIdentityResult {
  if (typeof raw === "string" && isWeaponMasteryContainerResult(raw)) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

function isWeaponMasteryContainerResult(
  raw: string,
): raw is WeaponMasteryContainerSelectedIdentityResult {
  return WEAPON_MASTERY_CONTAINER_SELECTED_IDENTITY_RESULTS.some(
    (result) => result === raw,
  );
}

function compareProjection(
  spec: WeaponMasteryContainerSelectedIdentityProjection,
  impl: WeaponMasteryContainerSelectedIdentityProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const weaponMasteryContainerSelectedIdentityStateCheck = stateCheck(
  normalizeWeaponMasteryContainerSelectedIdentityQuintState,
  compareProjection,
);
