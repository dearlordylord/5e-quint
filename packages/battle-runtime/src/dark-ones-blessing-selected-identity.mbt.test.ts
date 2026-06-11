// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.enemy-zero-hit-point-temporary-hit-points
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-02 warlock_dark_ones_blessing
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-02 warlock_dark_ones_blessing doSelfKill doNearbyOtherKill doSameSideOtherKill doRejectOutOfRangeOtherKill doRejectNonEnemyKill doMinimumTemporaryHitPoints doTemporaryHitPointReplacement
import { Hp, movementFeet } from "@dnd/shared/types";

import {
  applyBattleHitPointDamage,
  battleId,
  characterSeed,
  combatantId,
  partySide,
  startBattleRight,
  statBlockCreatureInit,
  testCharacterD20Statistics,
  type BattleState,
  type CombatantId,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import type { BattleTargetSpatialFact } from "./battle-reducer.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit } from "./unit-feature-support.ts";

type DarkOnesBlessingSupportProfile = Exclude<
  ReturnType<typeof battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit>,
  null | "unsupported"
>;

type DarkOnesBlessingLastResult =
  | "init"
  | "selfKill"
  | "nearbyOtherKill"
  | "sameSideOtherKill"
  | "outOfRangeRejected"
  | "nonEnemyRejected"
  | "minimumTemporaryHitPoints"
  | "temporaryHitPointReplacement";

const DARK_ONES_BLESSING_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  SelfKill: "selfKill",
  NearbyOtherKill: "nearbyOtherKill",
  SameSideOtherKill: "sameSideOtherKill",
  OutOfRangeRejected: "outOfRangeRejected",
  NonEnemyRejected: "nonEnemyRejected",
  MinimumTemporaryHitPoints: "minimumTemporaryHitPoints",
  TemporaryHitPointReplacement: "temporaryHitPointReplacement",
} as const;

type DarkOnesBlessingProjection = {
  readonly warlockTempHp: number;
  readonly targetHp: number;
  readonly lastResult: DarkOnesBlessingLastResult;
};

const warlockId = combatantId("dark-ones-blessing-selected-warlock");
const allyId = combatantId("dark-ones-blessing-selected-ally");
const enemyId = combatantId("dark-ones-blessing-selected-enemy");
const otherEnemyId = combatantId("dark-ones-blessing-selected-other-enemy");
const unitId = "warlock_dark_ones_blessing";
const unit = unitLibrary.requireUnit(unitId);
const supportProfile = requireDarkOnesBlessingSupportProfile();

defineSelectedIdentityWitness({
  describeLabel: "Dark One's Blessing selected identity MBT",
  taskId: "L3PUTB-02",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-dark-ones-blessing.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: DARK_ONES_BLESSING_SCENARIO_OUTCOME_BY_TAG },
  projectionSchema: {
    warlockTempHp: "int",
    targetHp: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId,
      procedures: [
        {
          actionName: "doSelfKill",
          projectionAfter: expectedProjection({
            warlockTempHp: 6,
            targetHp: 0,
            lastResult: "selfKill",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: warlockId,
                targetId: enemyId,
                warlockCha: 16,
                warlockLevel: 3,
              }),
              enemyId,
              "selfKill",
            ),
        },
        {
          actionName: "doNearbyOtherKill",
          projectionAfter: expectedProjection({
            warlockTempHp: 6,
            targetHp: 0,
            lastResult: "nearbyOtherKill",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: allyId,
                targetId: enemyId,
                warlockCha: 16,
                warlockLevel: 3,
                spatialFacts: [darkOnesBlessingRangeFact(allyId, enemyId)],
              }),
              enemyId,
              "nearbyOtherKill",
            ),
        },
        {
          actionName: "doSameSideOtherKill",
          projectionAfter: expectedProjection({
            warlockTempHp: 6,
            targetHp: 0,
            lastResult: "sameSideOtherKill",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: otherEnemyId,
                targetId: enemyId,
                warlockCha: 16,
                warlockLevel: 3,
                spatialFacts: [
                  darkOnesBlessingRangeFact(otherEnemyId, enemyId),
                ],
              }),
              enemyId,
              "sameSideOtherKill",
            ),
        },
        {
          actionName: "doRejectOutOfRangeOtherKill",
          projectionAfter: expectedProjection({
            warlockTempHp: 0,
            targetHp: 0,
            lastResult: "outOfRangeRejected",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: allyId,
                targetId: enemyId,
                warlockCha: 16,
                warlockLevel: 3,
              }),
              enemyId,
              "outOfRangeRejected",
            ),
        },
        {
          actionName: "doRejectNonEnemyKill",
          projectionAfter: expectedProjection({
            warlockTempHp: 0,
            targetHp: 0,
            lastResult: "nonEnemyRejected",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: allyId,
                targetId: otherEnemyId,
                targetSide: partySide,
                warlockCha: 16,
                warlockLevel: 3,
                spatialFacts: [darkOnesBlessingRangeFact(allyId, otherEnemyId)],
              }),
              otherEnemyId,
              "nonEnemyRejected",
            ),
        },
        {
          actionName: "doMinimumTemporaryHitPoints",
          projectionAfter: expectedProjection({
            warlockTempHp: 1,
            targetHp: 0,
            lastResult: "minimumTemporaryHitPoints",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: warlockId,
                targetId: enemyId,
                warlockCha: 1,
                warlockLevel: 3,
              }),
              enemyId,
              "minimumTemporaryHitPoints",
            ),
        },
        {
          actionName: "doTemporaryHitPointReplacement",
          projectionAfter: expectedProjection({
            warlockTempHp: 8,
            targetHp: 0,
            lastResult: "temporaryHitPointReplacement",
          }),
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: warlockId,
                targetId: enemyId,
                warlockCha: 16,
                warlockLevel: 3,
                warlockTempHp: 8,
              }),
              enemyId,
              "temporaryHitPointReplacement",
            ),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<DarkOnesBlessingProjection> = {},
): DarkOnesBlessingProjection {
  return {
    warlockTempHp: 0,
    targetHp: 5,
    lastResult: "init",
    ...overrides,
  };
}

function projectBattleState(
  state: BattleState,
  targetId: CombatantId,
  lastResult: DarkOnesBlessingLastResult,
): DarkOnesBlessingProjection {
  return {
    warlockTempHp: Number(state.combatants.get(warlockId)?.tempHp ?? Hp(0)),
    targetHp: Number(state.combatants.get(targetId)?.hp ?? Hp(0)),
    lastResult,
  };
}

function damageEnemyToZero(input: {
  readonly damageSourceId: CombatantId;
  readonly targetId: CombatantId;
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
  readonly targetSide?: typeof partySide;
  readonly spatialFacts?: readonly BattleTargetSpatialFact[];
}): BattleState {
  const state = darkOnesBlessingBattle(input);
  const target = state.combatants.get(input.targetId);
  if (target === undefined) {
    throw new Error("Dark One's Blessing selected identity target must exist.");
  }
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount: 5,
    deathFailuresAtZeroHp: 1,
    damageSourceId: input.damageSourceId,
    spatialFacts: input.spatialFacts ?? [],
  });
}

function darkOnesBlessingBattle(input: {
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
  readonly targetSide?: typeof partySide;
}): BattleState {
  return startBattleRight({
    battleId: battleId("dark-ones-blessing-selected-battle"),
    combatants: [
      characterSeed({
        combatantId: warlockId,
        displayName: "Warlock",
        initiative: 20,
        classLevels: [{ className: "warlock", level: input.warlockLevel }],
        characterUnitRefs: [
          {
            unitId,
            supportProfiles: [supportProfile],
          },
        ],
        unitFeatures: [{ unit }],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ cha: input.warlockCha }),
        tempHp: input.warlockTempHp ?? 0,
      }),
      characterSeed({
        combatantId: allyId,
        displayName: "Ally",
        initiative: 15,
        side: partySide,
      }),
      statBlockCreatureInit({
        combatantId: enemyId,
        initiative: 10,
        currentHp: 5,
      }),
      statBlockCreatureInit({
        combatantId: otherEnemyId,
        initiative: 5,
        currentHp: 5,
      }),
    ].map((combatant) =>
      combatant.combatantId === otherEnemyId && input.targetSide !== undefined
        ? { ...combatant, side: input.targetSide }
        : combatant,
    ),
  });
}

function darkOnesBlessingRangeFact(
  damageSourceId: CombatantId,
  targetId: CombatantId,
): BattleTargetSpatialFact {
  return {
    kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
    beneficiaryId: warlockId,
    damageSourceId,
    targetId,
    unitId,
    rangeFeet: movementFeet(10),
  };
}

function requireDarkOnesBlessingSupportProfile(): DarkOnesBlessingSupportProfile {
  const profile = battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(unit);
  if (profile === null || profile === "unsupported") {
    throw new Error("Dark One's Blessing support profile is required.");
  }
  return profile;
}
