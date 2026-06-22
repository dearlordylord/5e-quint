// KERNEL-COVERAGE: parity-witness SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-sheet.weapon-mastery-class-level-reselection
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";

import {
  Either,
  Hp,
  characterSheetId,
  completeLongRest,
  createFreshCharacterSheet,
  requireRight,
  selectedClassChoiceUnitIds,
  unitLibrary,
  weaponMasteryBuild,
  type CharacterSheet,
} from "./test-support.ts";

const WEAPON_MASTERY_CLASS_LEVEL_RESELECTION_RESULTS = [
  "init",
  "fighterLevelFourOneChangeAccepted",
  "barbarianLevelFourOneChangeAccepted",
  "fighterLevelFourUnchangedPreserved",
  "fighterLevelFourTooManyChangesRejected",
] as const;
const FIGHTER_CLASS_UNIT_ID = "class_fighter" as const;
const BARBARIAN_CLASS_UNIT_ID = "class_barbarian" as const;
const FIGHTER_WEAPON_MASTERY_UNIT_ID = "fighter_weapon_mastery" as const;
const BARBARIAN_WEAPON_MASTERY_UNIT_ID = "barbarian_weapon_mastery" as const;
const FIGHTER_LEVEL_FOUR_CURRENT_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_dagger",
  "weapon_spear",
  "weapon_shortbow",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const FIGHTER_LEVEL_FOUR_ONE_CHANGE_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_dagger",
  "weapon_spear",
  "weapon_flail",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const FIGHTER_LEVEL_FOUR_TOO_MANY_CHANGES_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_dagger",
  "weapon_shortsword",
  "weapon_flail",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const BARBARIAN_LEVEL_FOUR_CURRENT_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_dagger",
  "weapon_spear",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const BARBARIAN_LEVEL_FOUR_ONE_CHANGE_WEAPON_UNIT_IDS = [
  "weapon_longsword",
  "weapon_dagger",
  "weapon_flail",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const NO_REJECTED_FLAGS = {
  tooManyChangesRejected: false,
  rejectedWithoutStateChange: false,
} as const;

type WeaponMasteryClassLevelReselectionResult =
  (typeof WEAPON_MASTERY_CLASS_LEVEL_RESELECTION_RESULTS)[number];
type WeaponMasteryClassUnitId =
  | typeof FIGHTER_CLASS_UNIT_ID
  | typeof BARBARIAN_CLASS_UNIT_ID;
type WeaponMasteryFeatureUnitId =
  | typeof FIGHTER_WEAPON_MASTERY_UNIT_ID
  | typeof BARBARIAN_WEAPON_MASTERY_UNIT_ID;
type WeaponMasterySelectedWeaponUnitIds = readonly [
  UnitRecord["id"],
  ...UnitRecord["id"][],
];
type WeaponMasteryClassLevelReselectionDriverAction = Exclude<
  keyof typeof weaponMasteryClassLevelReselectionDriverSchema,
  "init" | "step"
>;
type WeaponMasteryClassLevelReselectionProfile = {
  readonly classUnitId: WeaponMasteryClassUnitId;
  readonly featureUnitId: WeaponMasteryFeatureUnitId;
  readonly classLevel: 4;
  readonly choiceCount: 3 | 4;
  readonly longRestChangeCount: 1;
  readonly currentWeaponUnitIds: WeaponMasterySelectedWeaponUnitIds;
  readonly requestedWeaponUnitIds: WeaponMasterySelectedWeaponUnitIds;
};
type WeaponMasteryClassLevelReselectionProjection = {
  readonly outcome: WeaponMasteryClassLevelReselectionResult;
  readonly classUnitId: "none" | WeaponMasteryClassUnitId;
  readonly featureUnitId: "none" | WeaponMasteryFeatureUnitId;
  readonly classLevel: number;
  readonly choiceCount: number;
  readonly longRestChangeCount: number;
  readonly requestedWeaponCount: number;
  readonly selectedWeaponCount: number;
  readonly requestedChangeCount: number;
  readonly appliedChangeCount: number;
  readonly firstWeaponUnitId: "none" | UnitRecord["id"];
  readonly secondWeaponUnitId: "none" | UnitRecord["id"];
  readonly thirdWeaponUnitId: "none" | UnitRecord["id"];
  readonly fourthWeaponUnitId: "none" | UnitRecord["id"];
  readonly accepted: boolean;
  readonly unchangedPreserved: boolean;
  readonly tooManyChangesRejected: boolean;
  readonly rejectedWithoutStateChange: boolean;
};
type WeaponMasteryClassLevelReselectionReplaySequence = {
  readonly name: string;
  readonly actions: readonly WeaponMasteryClassLevelReselectionDriverAction[];
  readonly expected: WeaponMasteryClassLevelReselectionProjection;
};
type WeaponMasteryClassLevelReselectionReplay = {
  readonly obligationId: "SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION";
  readonly actions: readonly WeaponMasteryClassLevelReselectionDriverAction[];
  readonly sequences: readonly WeaponMasteryClassLevelReselectionReplaySequence[];
};

const weaponMasteryClassLevelReselectionDriverSchema = {
  init: {},
  doAcceptFighterLevelFourOneChangeWeaponMasteryReselection: {},
  doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection: {},
  doPreserveFighterLevelFourUnchangedWeaponMasteryReselection: {},
  doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection: {},
  step: {},
} as const;
const qntStepByDriverAction = {
  doAcceptFighterLevelFourOneChangeWeaponMasteryReselection:
    "stepAcceptFighterLevelFourOneChangeWeaponMasteryReselection",
  doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection:
    "stepAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection",
  doPreserveFighterLevelFourUnchangedWeaponMasteryReselection:
    "stepPreserveFighterLevelFourUnchangedWeaponMasteryReselection",
  doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection:
    "stepRejectFighterLevelFourTooManyChangesWeaponMasteryReselection",
} as const satisfies Record<
  WeaponMasteryClassLevelReselectionDriverAction,
  string
>;

const FIGHTER_ONE_CHANGE_PROFILE = {
  classUnitId: FIGHTER_CLASS_UNIT_ID,
  featureUnitId: FIGHTER_WEAPON_MASTERY_UNIT_ID,
  classLevel: 4,
  choiceCount: 4,
  longRestChangeCount: 1,
  currentWeaponUnitIds: FIGHTER_LEVEL_FOUR_CURRENT_WEAPON_UNIT_IDS,
  requestedWeaponUnitIds: FIGHTER_LEVEL_FOUR_ONE_CHANGE_WEAPON_UNIT_IDS,
} as const satisfies WeaponMasteryClassLevelReselectionProfile;
const FIGHTER_UNCHANGED_PROFILE = {
  ...FIGHTER_ONE_CHANGE_PROFILE,
  requestedWeaponUnitIds: FIGHTER_LEVEL_FOUR_CURRENT_WEAPON_UNIT_IDS,
} as const satisfies WeaponMasteryClassLevelReselectionProfile;
const FIGHTER_TOO_MANY_CHANGES_PROFILE = {
  ...FIGHTER_ONE_CHANGE_PROFILE,
  requestedWeaponUnitIds: FIGHTER_LEVEL_FOUR_TOO_MANY_CHANGES_WEAPON_UNIT_IDS,
} as const satisfies WeaponMasteryClassLevelReselectionProfile;
const BARBARIAN_ONE_CHANGE_PROFILE = {
  classUnitId: BARBARIAN_CLASS_UNIT_ID,
  featureUnitId: BARBARIAN_WEAPON_MASTERY_UNIT_ID,
  classLevel: 4,
  choiceCount: 3,
  longRestChangeCount: 1,
  currentWeaponUnitIds: BARBARIAN_LEVEL_FOUR_CURRENT_WEAPON_UNIT_IDS,
  requestedWeaponUnitIds: BARBARIAN_LEVEL_FOUR_ONE_CHANGE_WEAPON_UNIT_IDS,
} as const satisfies WeaponMasteryClassLevelReselectionProfile;

const weaponMasteryClassLevelReselectionReplays = [
  {
    obligationId: "SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION",
    actions: [
      "doAcceptFighterLevelFourOneChangeWeaponMasteryReselection",
      "doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection",
      "doPreserveFighterLevelFourUnchangedWeaponMasteryReselection",
      "doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection",
    ],
    sequences: [
      {
        name: "fighter-level-four-accepts-one-long-rest-change",
        actions: ["doAcceptFighterLevelFourOneChangeWeaponMasteryReselection"],
        expected: acceptedProjection({
          outcome: "fighterLevelFourOneChangeAccepted",
          profile: FIGHTER_ONE_CHANGE_PROFILE,
          unchangedPreserved: false,
        }),
      },
      {
        name: "barbarian-level-four-accepts-one-long-rest-change",
        actions: [
          "doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection",
        ],
        expected: acceptedProjection({
          outcome: "barbarianLevelFourOneChangeAccepted",
          profile: BARBARIAN_ONE_CHANGE_PROFILE,
          unchangedPreserved: false,
        }),
      },
      {
        name: "fighter-level-four-preserves-unchanged-selection",
        actions: [
          "doPreserveFighterLevelFourUnchangedWeaponMasteryReselection",
        ],
        expected: acceptedProjection({
          outcome: "fighterLevelFourUnchangedPreserved",
          profile: FIGHTER_UNCHANGED_PROFILE,
          unchangedPreserved: true,
        }),
      },
      {
        name: "fighter-level-four-rejects-over-limit-without-state-change",
        actions: [
          "doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection",
        ],
        expected: rejectedTooManyChangesProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<WeaponMasteryClassLevelReselectionReplay>;
const advertisedReplayActions =
  weaponMasteryClassLevelReselectionReplays.flatMap((replay) => replay.actions);

describe("Character Sheet Weapon Mastery class-level reselection MBT", () => {
  it("replays Character Sheet Weapon Mastery class-level reselection scenarios deterministically", async () => {
    for (const replay of weaponMasteryClassLevelReselectionReplays) {
      const replayedActions =
        new Set<WeaponMasteryClassLevelReselectionDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createWeaponMasteryClassLevelReselectionDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet Weapon Mastery class-level reselection driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet Weapon Mastery class-level reselection driver must expose getState.",
          );
        }
        expect(runtime, `${replay.obligationId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet Weapon Mastery class-level reselection parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-weapon-mastery-class-level-reselection.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWeaponMasteryClassLevelReselectionDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: weaponMasteryClassLevelReselectionStateCheck,
    });
  }, 120_000);

  it("replays every advertised Character Sheet Weapon Mastery class-level reselection branch", async () => {
    for (const actionName of advertisedReplayActions) {
      await run({
        spec: path.resolve(
          import.meta.dirname,
          "../character-sheet-weapon-mastery-class-level-reselection.mbt.qnt",
        ),
        init: "init",
        step: qntStepByDriverAction[actionName],
        driver: createWeaponMasteryClassLevelReselectionDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: 1,
        stateCheck: weaponMasteryClassLevelReselectionStateCheck,
      });
    }
  }, 120_000);
});

function createWeaponMasteryClassLevelReselectionDriver() {
  return defineDriver(weaponMasteryClassLevelReselectionDriverSchema, () => {
    let projection: WeaponMasteryClassLevelReselectionProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doAcceptFighterLevelFourOneChangeWeaponMasteryReselection: () => {
        projection = acceptedProjection({
          outcome: "fighterLevelFourOneChangeAccepted",
          profile: FIGHTER_ONE_CHANGE_PROFILE,
          unchangedPreserved: false,
        });
      },
      doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection: () => {
        projection = acceptedProjection({
          outcome: "barbarianLevelFourOneChangeAccepted",
          profile: BARBARIAN_ONE_CHANGE_PROFILE,
          unchangedPreserved: false,
        });
      },
      doPreserveFighterLevelFourUnchangedWeaponMasteryReselection: () => {
        projection = acceptedProjection({
          outcome: "fighterLevelFourUnchangedPreserved",
          profile: FIGHTER_UNCHANGED_PROFILE,
          unchangedPreserved: true,
        });
      },
      doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection: () => {
        projection = rejectedTooManyChangesProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function acceptedProjection(input: {
  readonly outcome: Exclude<
    WeaponMasteryClassLevelReselectionResult,
    "init" | "fighterLevelFourTooManyChangesRejected"
  >;
  readonly profile: WeaponMasteryClassLevelReselectionProfile;
  readonly unchangedPreserved: boolean;
}): WeaponMasteryClassLevelReselectionProjection {
  const sheet = weaponMasterySheet(input.profile);
  const rested = requireRight(
    completeLongRest({
      sheet,
      unitLibrary,
      weaponMasteryReselections: [
        {
          featureUnitId: input.profile.featureUnitId,
          selectedWeaponUnitIds: input.profile.requestedWeaponUnitIds,
        },
      ],
    }),
  );
  return projectionFromSelectedWeapons({
    ...input,
    selectedWeaponUnitIds: selectedClassChoiceUnitIds(
      rested.build,
      input.profile.featureUnitId,
    ),
    accepted: true,
    tooManyChangesRejected: false,
    rejectedWithoutStateChange: false,
  });
}

function rejectedTooManyChangesProjection(): WeaponMasteryClassLevelReselectionProjection {
  const profile = FIGHTER_TOO_MANY_CHANGES_PROFILE;
  const sheet = weaponMasterySheet(profile);
  const result = completeLongRest({
    sheet,
    unitLibrary,
    weaponMasteryReselections: [
      {
        featureUnitId: profile.featureUnitId,
        selectedWeaponUnitIds: profile.requestedWeaponUnitIds,
      },
    ],
  });
  expectLeftMessage(
    result,
    "Weapon Mastery Long Rest reselection changes too many weapon choices.",
  );
  return projectionFromSelectedWeapons({
    outcome: "fighterLevelFourTooManyChangesRejected",
    profile,
    selectedWeaponUnitIds: selectedClassChoiceUnitIds(
      sheet.build,
      profile.featureUnitId,
    ),
    accepted: false,
    unchangedPreserved: false,
    tooManyChangesRejected: true,
    rejectedWithoutStateChange: true,
  });
}

function projectionFromSelectedWeapons(input: {
  readonly outcome: WeaponMasteryClassLevelReselectionResult;
  readonly profile: WeaponMasteryClassLevelReselectionProfile;
  readonly selectedWeaponUnitIds: readonly UnitRecord["id"][];
  readonly accepted: boolean;
  readonly unchangedPreserved: boolean;
  readonly tooManyChangesRejected: boolean;
  readonly rejectedWithoutStateChange: boolean;
}): WeaponMasteryClassLevelReselectionProjection {
  expectSelectedWeaponsMatchChoiceCount(input.selectedWeaponUnitIds, input);
  return {
    outcome: input.outcome,
    classUnitId: input.profile.classUnitId,
    featureUnitId: input.profile.featureUnitId,
    classLevel: input.profile.classLevel,
    choiceCount: input.profile.choiceCount,
    longRestChangeCount: input.profile.longRestChangeCount,
    requestedWeaponCount: input.profile.requestedWeaponUnitIds.length,
    selectedWeaponCount: input.selectedWeaponUnitIds.length,
    requestedChangeCount: changedChoiceCount(
      input.profile.currentWeaponUnitIds,
      input.profile.requestedWeaponUnitIds,
    ),
    appliedChangeCount: changedChoiceCount(
      input.profile.currentWeaponUnitIds,
      input.selectedWeaponUnitIds,
    ),
    firstWeaponUnitId: input.selectedWeaponUnitIds[0] ?? "none",
    secondWeaponUnitId: input.selectedWeaponUnitIds[1] ?? "none",
    thirdWeaponUnitId: input.selectedWeaponUnitIds[2] ?? "none",
    fourthWeaponUnitId: input.selectedWeaponUnitIds[3] ?? "none",
    accepted: input.accepted,
    unchangedPreserved: input.unchangedPreserved,
    tooManyChangesRejected: input.tooManyChangesRejected,
    rejectedWithoutStateChange: input.rejectedWithoutStateChange,
  };
}

function weaponMasterySheet(
  profile: WeaponMasteryClassLevelReselectionProfile,
): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(
        `character:${profile.featureUnitId}:class-level-reselection`,
      ),
      build: weaponMasteryBuild({
        startingClass: profile.classUnitId,
        advancements: [
          profile.classUnitId,
          profile.classUnitId,
          profile.classUnitId,
        ],
        featureUnitId: profile.featureUnitId,
        selectedWeaponUnitIds: profile.currentWeaponUnitIds,
      }),
      currentHp: Hp(8),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

function changedChoiceCount(
  currentWeaponUnitIds: readonly UnitRecord["id"][],
  selectedWeaponUnitIds: readonly UnitRecord["id"][],
): number {
  const currentWeaponUnitIdSet = new Set(currentWeaponUnitIds);
  return selectedWeaponUnitIds.filter(
    (unitId) => !currentWeaponUnitIdSet.has(unitId),
  ).length;
}

function expectSelectedWeaponsMatchChoiceCount(
  selectedWeaponUnitIds: readonly UnitRecord["id"][],
  input: {
    readonly profile: WeaponMasteryClassLevelReselectionProfile;
    readonly outcome: WeaponMasteryClassLevelReselectionResult;
  },
): void {
  if (selectedWeaponUnitIds.length !== input.profile.choiceCount) {
    throw new Error(
      `${input.outcome} expected ${input.profile.choiceCount} selected Weapon Mastery choices, received ${selectedWeaponUnitIds.length}.`,
    );
  }
}

function expectLeftMessage<T, E extends { readonly message?: string }>(
  result: Either.Either<T, E>,
  expectedMessage: string,
): void {
  if (Either.isRight(result)) {
    throw new Error("Expected Weapon Mastery Long Rest reselection rejection.");
  }
  if (result.left.message !== expectedMessage) {
    throw new Error(
      `Expected Weapon Mastery Long Rest reselection rejection ${expectedMessage}, received ${String(result.left.message)}.`,
    );
  }
}

function initialProjection(): WeaponMasteryClassLevelReselectionProjection {
  return {
    outcome: "init",
    classUnitId: "none",
    featureUnitId: "none",
    classLevel: 0,
    choiceCount: 0,
    longRestChangeCount: 0,
    requestedWeaponCount: 0,
    selectedWeaponCount: 0,
    requestedChangeCount: 0,
    appliedChangeCount: 0,
    firstWeaponUnitId: "none",
    secondWeaponUnitId: "none",
    thirdWeaponUnitId: "none",
    fourthWeaponUnitId: "none",
    accepted: false,
    unchangedPreserved: false,
    ...NO_REJECTED_FLAGS,
  };
}

function normalizeWeaponMasteryClassLevelReselectionQuintState(
  raw: unknown,
): WeaponMasteryClassLevelReselectionProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  const outcome = outcomeField(state["outcome"]);
  const projection = projectionForOutcome(outcome);
  assertStringField(state, "classUnitId", projection.classUnitId);
  assertStringField(state, "featureUnitId", projection.featureUnitId);
  assertNumberField(state, "classLevel", projection.classLevel);
  assertNumberField(state, "choiceCount", projection.choiceCount);
  assertNumberField(
    state,
    "longRestChangeCount",
    projection.longRestChangeCount,
  );
  assertNumberField(
    state,
    "requestedWeaponCount",
    projection.requestedWeaponCount,
  );
  assertNumberField(
    state,
    "selectedWeaponCount",
    projection.selectedWeaponCount,
  );
  assertNumberField(
    state,
    "requestedChangeCount",
    projection.requestedChangeCount,
  );
  assertNumberField(state, "appliedChangeCount", projection.appliedChangeCount);
  assertStringField(state, "firstWeaponUnitId", projection.firstWeaponUnitId);
  assertStringField(state, "secondWeaponUnitId", projection.secondWeaponUnitId);
  assertStringField(state, "thirdWeaponUnitId", projection.thirdWeaponUnitId);
  assertStringField(state, "fourthWeaponUnitId", projection.fourthWeaponUnitId);
  assertBooleanField(state, "accepted", projection.accepted);
  assertBooleanField(
    state,
    "unchangedPreserved",
    projection.unchangedPreserved,
  );
  assertBooleanField(
    state,
    "tooManyChangesRejected",
    projection.tooManyChangesRejected,
  );
  assertBooleanField(
    state,
    "rejectedWithoutStateChange",
    projection.rejectedWithoutStateChange,
  );
  return projection;
}

function projectionForOutcome(
  outcome: WeaponMasteryClassLevelReselectionResult,
): WeaponMasteryClassLevelReselectionProjection {
  if (outcome === "init") return initialProjection();
  if (outcome === "fighterLevelFourOneChangeAccepted") {
    return acceptedProjection({
      outcome,
      profile: FIGHTER_ONE_CHANGE_PROFILE,
      unchangedPreserved: false,
    });
  }
  if (outcome === "barbarianLevelFourOneChangeAccepted") {
    return acceptedProjection({
      outcome,
      profile: BARBARIAN_ONE_CHANGE_PROFILE,
      unchangedPreserved: false,
    });
  }
  if (outcome === "fighterLevelFourUnchangedPreserved") {
    return acceptedProjection({
      outcome,
      profile: FIGHTER_UNCHANGED_PROFILE,
      unchangedPreserved: true,
    });
  }
  if (outcome === "fighterLevelFourTooManyChangesRejected") {
    return rejectedTooManyChangesProjection();
  }
  return assertNever(outcome);
}

const qntOutcomeByVariant = {
  CharacterSheetWeaponMasteryClassLevelReselectionInit: "init",
  CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourOneChangeAccepted:
    "fighterLevelFourOneChangeAccepted",
  CharacterSheetWeaponMasteryClassLevelReselectionBarbarianLevelFourOneChangeAccepted:
    "barbarianLevelFourOneChangeAccepted",
  CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourUnchangedPreserved:
    "fighterLevelFourUnchangedPreserved",
  CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourTooManyChangesRejected:
    "fighterLevelFourTooManyChangesRejected",
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

function assertNever(value: never): never {
  throw new Error(
    `Unhandled Weapon Mastery class-level reselection result ${value}.`,
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
  spec: WeaponMasteryClassLevelReselectionProjection,
  impl: WeaponMasteryClassLevelReselectionProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const weaponMasteryClassLevelReselectionStateCheck = stateCheck(
  normalizeWeaponMasteryClassLevelReselectionQuintState,
  compareProjection,
);
