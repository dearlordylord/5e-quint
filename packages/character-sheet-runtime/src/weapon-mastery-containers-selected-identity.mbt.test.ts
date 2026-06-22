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
  type WeaponMasteryChoiceProfile,
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
  "oneChangeAccepted",
  "tooManyChangesRejected",
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
    "init" | "oneChangeAccepted" | "tooManyChangesRejected"
  >;
  readonly reselectedResult: Exclude<
    WeaponMasteryContainerSelectedIdentityResult,
    "init" | "oneChangeAccepted" | "tooManyChangesRejected"
  >;
  readonly selectedWeaponUnitIds: WeaponMasteryWeaponPair;
  readonly reselectedWeaponUnitIds: WeaponMasteryWeaponPair;
};
type WeaponMasteryContainerSelectedIdentityProjection =
  | {
      readonly outcome: "init";
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
      readonly outcome: Exclude<
        WeaponMasteryContainerSelectedIdentityResult,
        "init" | "oneChangeAccepted" | "tooManyChangesRejected"
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
    }
  | {
      readonly outcome: "oneChangeAccepted";
      readonly featureUnitId: "semantic_core";
      readonly classUnitId: "semantic_core";
      readonly firstWeaponUnitId: "current_first";
      readonly secondWeaponUnitId: "requested_second";
      readonly choiceCount: 2;
      readonly longRestChangeCount: 1;
      readonly selectedWeaponCount: 2;
      readonly changedChoiceCount: 1;
      readonly firstWeaponEligible: true;
      readonly secondWeaponEligible: true;
      readonly featureUnitRefPresent: true;
      readonly accepted: true;
    }
  | {
      readonly outcome: "tooManyChangesRejected";
      readonly featureUnitId: "semantic_core";
      readonly classUnitId: "semantic_core";
      readonly firstWeaponUnitId: "requested_first";
      readonly secondWeaponUnitId: "requested_second";
      readonly choiceCount: 2;
      readonly longRestChangeCount: 1;
      readonly selectedWeaponCount: 2;
      readonly changedChoiceCount: 2;
      readonly firstWeaponEligible: true;
      readonly secondWeaponEligible: true;
      readonly featureUnitRefPresent: true;
      readonly accepted: false;
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
  doAcceptOneChangeWeaponMasteryReselection: {},
  doRejectTooManyChangesWeaponMasteryReselection: {},
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
  doAcceptOneChangeWeaponMasteryReselection:
    "stepAcceptOneChangeWeaponMasteryReselection",
  doRejectTooManyChangesWeaponMasteryReselection:
    "stepRejectTooManyChangesWeaponMasteryReselection",
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
const WEAPON_MASTERY_CONTAINER_PROFILES = [
  PALADIN_WEAPON_MASTERY_PROFILE,
  RANGER_WEAPON_MASTERY_PROFILE,
  ROGUE_WEAPON_MASTERY_PROFILE,
] as const satisfies ReadonlyArray<WeaponMasteryContainerProfile>;

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
const semanticCoreReplayActions = [
  "doAcceptOneChangeWeaponMasteryReselection",
  "doRejectTooManyChangesWeaponMasteryReselection",
] as const satisfies ReadonlyArray<WeaponMasteryContainerSelectedIdentityDriverAction>;

describe("Character Sheet Weapon Mastery container selected identity MBT", () => {
  it("audits Surface-derived eligibility and selected-ref sheet storage", () => {
    for (const profile of WEAPON_MASTERY_CONTAINER_PROFILES) {
      const sheet = weaponMasterySheet({
        classUnitId: profile.classUnitId,
        featureUnitId: profile.featureUnitId,
        selectedWeaponUnitIds: profile.selectedWeaponUnitIds,
      });
      const surfaceProfile = requireWeaponMasteryChoiceProfile(
        profile.featureUnitId,
      );

      expect(surfaceProfile.feature.id).toBe(profile.featureUnitId);
      expect(surfaceProfile.classRecord.id).toBe(profile.classUnitId);
      expect(surfaceProfile.choiceCount).toBe(2);
      expect(surfaceProfile.longRestChangeCount).toBe(2);
      expectProfileEligibleWeaponRefs(
        surfaceProfile,
        profile.selectedWeaponUnitIds,
      );
      expectNoSheetLocalWeaponMasteryState(sheet);
      expectSelectedWeaponPair(
        selectedClassChoiceUnitIds(sheet.build, profile.featureUnitId),
        profile.selectedWeaponUnitIds,
      );

      const rested = requireRight(
        completeLongRest({
          sheet,
          unitLibrary,
          weaponMasteryReselections: [
            {
              featureUnitId: profile.featureUnitId,
              selectedWeaponUnitIds: profile.reselectedWeaponUnitIds,
            },
          ],
        }),
      );

      expectProfileEligibleWeaponRefs(
        surfaceProfile,
        profile.reselectedWeaponUnitIds,
      );
      expectNoSheetLocalWeaponMasteryState(rested);
      expectSelectedWeaponPair(
        selectedClassChoiceUnitIds(rested.build, profile.featureUnitId),
        profile.reselectedWeaponUnitIds,
      );
    }
  });

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

  it("replays Character Sheet Weapon Mastery semantic core branches", async () => {
    for (const actionName of semanticCoreReplayActions) {
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
        doAcceptOneChangeWeaponMasteryReselection: () => {
          projection = oneChangeAcceptedProjection();
        },
        doRejectTooManyChangesWeaponMasteryReselection: () => {
          projection = tooManyChangesRejectedProjection();
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
    outcome: profile.selectedResult,
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
    outcome: profile.reselectedResult,
    sheet: rested,
    profile,
    selectedWeaponUnitIds: profile.reselectedWeaponUnitIds,
    changedChoiceCount: 2,
  });
}

function weaponMasteryProjection(input: {
  readonly outcome: Exclude<
    WeaponMasteryContainerSelectedIdentityResult,
    "init" | "oneChangeAccepted" | "tooManyChangesRejected"
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
    outcome: input.outcome,
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

function oneChangeAcceptedProjection(): WeaponMasteryContainerSelectedIdentityProjection {
  return {
    outcome: "oneChangeAccepted",
    featureUnitId: "semantic_core",
    classUnitId: "semantic_core",
    firstWeaponUnitId: "current_first",
    secondWeaponUnitId: "requested_second",
    choiceCount: 2,
    longRestChangeCount: 1,
    selectedWeaponCount: 2,
    changedChoiceCount: 1,
    firstWeaponEligible: true,
    secondWeaponEligible: true,
    featureUnitRefPresent: true,
    accepted: true,
  };
}

function tooManyChangesRejectedProjection(): WeaponMasteryContainerSelectedIdentityProjection {
  return {
    outcome: "tooManyChangesRejected",
    featureUnitId: "semantic_core",
    classUnitId: "semantic_core",
    firstWeaponUnitId: "requested_first",
    secondWeaponUnitId: "requested_second",
    choiceCount: 2,
    longRestChangeCount: 1,
    selectedWeaponCount: 2,
    changedChoiceCount: 2,
    firstWeaponEligible: true,
    secondWeaponEligible: true,
    featureUnitRefPresent: true,
    accepted: false,
  };
}

function eligibleWeaponMasteryWeaponUnitIds(
  featureUnitId: WeaponMasteryContainerFeatureUnitId,
): ReadonlySet<UnitRecord["id"]> {
  const profile = requireWeaponMasteryChoiceProfile(featureUnitId);
  if (profile.choiceCount !== 2 || profile.longRestChangeCount !== 2) {
    throw new Error(
      `Expected ${featureUnitId} to choose and reselect two weapons.`,
    );
  }
  return new Set(profile.eligibleWeapons.map((weapon) => weapon.id));
}

function requireWeaponMasteryChoiceProfile(
  featureUnitId: WeaponMasteryContainerFeatureUnitId,
): WeaponMasteryChoiceProfile {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId,
    unitLibrary,
  });
  if (profile === undefined) {
    throw new Error(
      `Expected ${featureUnitId} to be a Weapon Mastery choice feature.`,
    );
  }
  return profile;
}

function expectProfileEligibleWeaponRefs(
  profile: WeaponMasteryChoiceProfile,
  selectedWeaponUnitIds: WeaponMasteryWeaponPair,
): void {
  const eligibleWeaponUnitIds = new Set(
    profile.eligibleWeapons.map((weapon) => weapon.id),
  );
  for (const unitId of selectedWeaponUnitIds) {
    expect(
      eligibleWeaponUnitIds.has(unitId),
      `${unitId} must be admitted by the installed Surface Weapon Mastery profile ${profile.feature.id}.`,
    ).toBe(true);
  }
}

function expectNoSheetLocalWeaponMasteryState(sheet: CharacterSheet): void {
  expect(
    Object.keys(sheet).filter((key) => key.toLowerCase().includes("mastery")),
  ).toEqual([]);
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
    outcome: "init",
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

const qntOutcomeByVariant = {
  CharacterSheetWeaponMasteryContainersSelectedIdentityInit: "init",
  CharacterSheetWeaponMasteryContainersSelectedIdentityPaladinSelected:
    "paladinSelected",
  CharacterSheetWeaponMasteryContainersSelectedIdentityPaladinReselected:
    "paladinReselected",
  CharacterSheetWeaponMasteryContainersSelectedIdentityRangerSelected:
    "rangerSelected",
  CharacterSheetWeaponMasteryContainersSelectedIdentityRangerReselected:
    "rangerReselected",
  CharacterSheetWeaponMasteryContainersSelectedIdentityRogueSelected:
    "rogueSelected",
  CharacterSheetWeaponMasteryContainersSelectedIdentityRogueReselected:
    "rogueReselected",
  CharacterSheetWeaponMasteryContainersSelectedIdentityOneChangeAccepted:
    "oneChangeAccepted",
  CharacterSheetWeaponMasteryContainersSelectedIdentityTooManyChangesRejected:
    "tooManyChangesRejected",
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

function normalizeWeaponMasteryContainerSelectedIdentityQuintState(
  raw: unknown,
): WeaponMasteryContainerSelectedIdentityProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  const outcome = outcomeField(state["outcome"]);
  const projection = projectionForOutcome(outcome);
  assertStringField(state, "featureUnitId", projection.featureUnitId);
  assertStringField(state, "classUnitId", projection.classUnitId);
  assertStringField(state, "firstWeaponUnitId", projection.firstWeaponUnitId);
  assertStringField(state, "secondWeaponUnitId", projection.secondWeaponUnitId);
  assertNumberField(state, "choiceCount", projection.choiceCount);
  assertNumberField(
    state,
    "longRestChangeCount",
    projection.longRestChangeCount,
  );
  assertNumberField(
    state,
    "selectedWeaponCount",
    projection.selectedWeaponCount,
  );
  assertNumberField(state, "changedChoiceCount", projection.changedChoiceCount);
  assertBooleanField(
    state,
    "firstWeaponEligible",
    projection.firstWeaponEligible,
  );
  assertBooleanField(
    state,
    "secondWeaponEligible",
    projection.secondWeaponEligible,
  );
  assertBooleanField(
    state,
    "featureUnitRefPresent",
    projection.featureUnitRefPresent,
  );
  assertBooleanField(state, "accepted", projection.accepted);
  return projection;
}

function projectionForOutcome(
  outcome: WeaponMasteryContainerSelectedIdentityResult,
): WeaponMasteryContainerSelectedIdentityProjection {
  if (outcome === "init") return initialProjection();
  if (outcome === "paladinSelected")
    return selectedWeaponMasteryProjection(PALADIN_WEAPON_MASTERY_PROFILE);
  if (outcome === "paladinReselected")
    return reselectedWeaponMasteryProjection(PALADIN_WEAPON_MASTERY_PROFILE);
  if (outcome === "rangerSelected")
    return selectedWeaponMasteryProjection(RANGER_WEAPON_MASTERY_PROFILE);
  if (outcome === "rangerReselected")
    return reselectedWeaponMasteryProjection(RANGER_WEAPON_MASTERY_PROFILE);
  if (outcome === "rogueSelected")
    return selectedWeaponMasteryProjection(ROGUE_WEAPON_MASTERY_PROFILE);
  if (outcome === "rogueReselected")
    return reselectedWeaponMasteryProjection(ROGUE_WEAPON_MASTERY_PROFILE);
  if (outcome === "oneChangeAccepted") return oneChangeAcceptedProjection();
  if (outcome === "tooManyChangesRejected")
    return tooManyChangesRejectedProjection();
  return assertNever(outcome);
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
