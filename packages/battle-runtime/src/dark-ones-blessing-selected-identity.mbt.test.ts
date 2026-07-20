// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.enemy-zero-hit-point-temporary-hit-points
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3PUTB-02 warlock_dark_ones_blessing
// UNIT-IDENTITY-REPLAY: L3PUTB-02 warlock_dark_ones_blessing doSelfKill doNearbyOtherKill doRejectOutOfRangeOtherKill doRejectNonEnemyKill doMinimumTemporaryHitPoints doTemporaryHitPointReplacement
import { classLevel, Hp, movementFeet } from "@dnd/shared/types";

import {
  characterBattleFeatureInitForTest,
  applyBattleHitPointDamage,
  battleId,
  characterSeed,
  combatantId,
  startBattleRight,
  statBlockCreatureInit,
  testCharacterD20Statistics,
  type BattleState,
  type CombatantId,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import type {
  BattleDamageRelationshipDecision,
  BattleTargetSpatialFact,
} from "./battle-reducer.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { enemyZeroHitPointTemporaryHitPointsProcedures } from "./battle-reducer/enemy-zero-hit-point-temporary-hit-points.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state.ts";
import { battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit } from "./unit-feature-support.ts";

type DarkOnesBlessingSupportProfile = Exclude<
  ReturnType<typeof battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit>,
  null | "unsupported"
>;

type DarkOnesBlessingLastResult =
  | "init"
  | "selfKill"
  | "nearbyOtherKill"
  | "outOfRangeRejected"
  | "nonEnemyRejected"
  | "minimumTemporaryHitPoints"
  | "temporaryHitPointReplacement";

const DARK_ONES_BLESSING_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  SelfKill: "selfKill",
  NearbyOtherKill: "nearbyOtherKill",
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

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Dark One's Blessing selected identity replay",
  taskId: "L3PUTB-02",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-dark-ones-blessing.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: DARK_ONES_BLESSING_SCENARIO_OUTCOME_BY_TAG,
  },
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
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: allyId,
                targetId: enemyId,
                warlockCha: 16,
                warlockLevel: 3,
                spatialRelationships: [
                  { damageSourceId: allyId, targetId: enemyId },
                ],
              }),
              enemyId,
              "nearbyOtherKill",
            ),
        },
        {
          actionName: "doRejectOutOfRangeOtherKill",
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
          discover: () =>
            projectBattleState(
              damageEnemyToZero({
                damageSourceId: allyId,
                targetId: otherEnemyId,
                targetIsEnemy: false,
                warlockCha: 16,
                warlockLevel: 3,
                spatialRelationships: [
                  { damageSourceId: allyId, targetId: otherEnemyId },
                ],
              }),
              otherEnemyId,
              "nonEnemyRejected",
            ),
        },
        {
          actionName: "doMinimumTemporaryHitPoints",
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
  readonly targetIsEnemy?: boolean;
  readonly spatialRelationships?: readonly {
    readonly damageSourceId: CombatantId;
    readonly targetId: CombatantId;
  }[];
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
    spatialFacts: (input.spatialRelationships ?? []).map((relationship) =>
      darkOnesBlessingRangeFact(
        state,
        relationship.damageSourceId,
        relationship.targetId,
      ),
    ),
    ...(input.targetIsEnemy === false
      ? {}
      : {
          relationshipDecisions: [
            darkOnesBlessingEnemyDecision(state, input.targetId),
          ],
        }),
  });
}

function darkOnesBlessingBattle(input: {
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
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
            unit,
            supportProfiles: [supportProfile],
          },
        ],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "warlock", level: classLevel(input.warlockLevel) },
          ]),
        ],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ cha: input.warlockCha }),
        tempHp: input.warlockTempHp ?? 0,
      }),
      characterSeed({
        combatantId: allyId,
        displayName: "Ally",
        initiative: 15,
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
    ],
  });
}

function darkOnesBlessingRangeFact(
  state: BattleState,
  damageSourceId: CombatantId,
  targetId: CombatantId,
): BattleTargetSpatialFact {
  const sourceProcedureRef = darkOnesBlessingProcedureRef(state);
  return {
    kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
    beneficiaryId: warlockId,
    damageSourceId,
    targetId,
    sourceProcedureRef,
    rangeFeet: movementFeet(10),
  };
}

function darkOnesBlessingEnemyDecision(
  state: BattleState,
  targetId: CombatantId,
): BattleDamageRelationshipDecision {
  return {
    kind: "enemyZeroHitPointTemporaryHitPoints",
    beneficiaryId: warlockId,
    targetId,
    procedureRef: darkOnesBlessingProcedureRef(state),
    targetIsEnemy: true,
  };
}

function darkOnesBlessingProcedureRef(state: BattleState) {
  const beneficiary = state.combatants.get(warlockId);
  if (!isCharacterBattleCreatureState(beneficiary)) {
    throw new Error("Dark One's Blessing beneficiary must be a character.");
  }
  const procedure =
    enemyZeroHitPointTemporaryHitPointsProcedures(beneficiary)[0];
  if (procedure === undefined) {
    throw new Error("Dark One's Blessing execution binding must exist.");
  }
  return procedure.procedureRef;
}

function requireDarkOnesBlessingSupportProfile(): DarkOnesBlessingSupportProfile {
  const profile = battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(unit);
  if (profile === null || profile === "unsupported") {
    throw new Error("Dark One's Blessing support profile is required.");
  }
  return profile;
}
