// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.magic-action-healing-pool
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-04 cleric_preserve_life
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-04 cleric_preserve_life doDistributeHealing doSelfHealing doRejectNonBloodied doRejectOverPool doRejectOverCap doRejectMissingRange doRejectMissingResource doRejectMissingMagicAction
import * as path from "node:path";

import { Hp, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";

import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHitPointHealingPoolDistributionHole,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  battleId,
  battleMagicActionHealingPoolSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission-test-support.ts";

type PreserveLifeLastResult =
  | "init"
  | "distributed"
  | "self"
  | "rejectNonBloodied"
  | "rejectOverPool"
  | "rejectOverCap"
  | "rejectMissingRange"
  | "rejectMissingResource"
  | "rejectMissingMagicAction";
type PreserveLifeProjection = {
  readonly casterHp: number;
  readonly targetHp: number;
  readonly secondTargetHp: number;
  readonly channelDivinityUsesRemaining: number;
  readonly actionResourcesRemaining: number;
  readonly lastResult: PreserveLifeLastResult;
};

const preserveLifeUnit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  clericChannelDivinityUnitId,
);
const preserveLifeUnitRef = requirePreserveLifeUnitRef();
const secondTargetId = combatantId("preserve-life-selected-second-target");

defineSelectedIdentityWitness({
  describeLabel: "Preserve Life selected identity MBT",
  taskId: "L3PUTB-04",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-preserve-life.mbt.qnt",
  ),
  projectionSchema: {
    casterHp: "int",
    targetHp: "int",
    secondTargetHp: "int",
    channelDivinityUsesRemaining: "int",
    actionResourcesRemaining: "int",
    lastResult: "str",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: clericPreserveLifeUnitId,
      procedures: [
        {
          actionName: "doDistributeHealing",
          projectionAfter: expectedProjection({
            targetHp: 10,
            secondTargetHp: 10,
            channelDivinityUsesRemaining: 1,
            actionResourcesRemaining: 0,
            lastResult: "distributed",
          }),
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolvePreserveLife(preserveLifeBattle(), [
                  { targetId: spellTargetId, hitPoints: 8 },
                  { targetId: secondTargetId, hitPoints: 7 },
                ]),
              ),
              "distributed",
            ),
        },
        {
          actionName: "doSelfHealing",
          projectionAfter: expectedProjection({
            casterHp: 10,
            targetHp: 12,
            channelDivinityUsesRemaining: 1,
            actionResourcesRemaining: 0,
            lastResult: "self",
          }),
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolvePreserveLife(
                  preserveLifeBattle({ casterHp: 4, targetHp: 12 }),
                  [{ targetId: spellCasterId, hitPoints: 6 }],
                ),
              ),
              "self",
            ),
        },
        {
          actionName: "doRejectNonBloodied",
          projectionAfter: expectedProjection({
            targetHp: 11,
            lastResult: "rejectNonBloodied",
          }),
          discover: () => {
            const state = preserveLifeBattle({ targetHp: 11 });
            recordInvalidResult(
              resolvePreserveLife(state, [
                { targetId: spellTargetId, hitPoints: 1 },
              ]),
            );
            return projectBattleState(state, "rejectNonBloodied");
          },
        },
        {
          actionName: "doRejectOverPool",
          projectionAfter: expectedProjection({
            targetHp: 0,
            secondTargetHp: 0,
            lastResult: "rejectOverPool",
          }),
          discover: () => {
            const state = preserveLifeBattle({
              targetHp: 0,
              secondTargetHp: 0,
            });
            recordInvalidResult(
              resolvePreserveLife(state, [
                { targetId: spellTargetId, hitPoints: 8 },
                { targetId: secondTargetId, hitPoints: 8 },
              ]),
            );
            return projectBattleState(state, "rejectOverPool");
          },
        },
        {
          actionName: "doRejectOverCap",
          projectionAfter: expectedProjection({
            lastResult: "rejectOverCap",
          }),
          discover: () => {
            const state = preserveLifeBattle();
            recordInvalidResult(
              resolvePreserveLife(state, [
                { targetId: spellTargetId, hitPoints: 9 },
              ]),
            );
            return projectBattleState(state, "rejectOverCap");
          },
        },
        {
          actionName: "doRejectMissingRange",
          projectionAfter: expectedProjection({
            lastResult: "rejectMissingRange",
          }),
          discover: () => {
            const state = preserveLifeBattle();
            const act = preserveLifeAct(state);
            const hole = requireHole(
              act.initialHoles,
              "hitPointHealingDistribution",
            );
            recordInvalidResult(
              resolveBattleSubject({
                state,
                subject: act.subject,
                fills: [
                  {
                    ...preserveLifeDistributionFill(hole, [
                      { targetId: spellTargetId, hitPoints: 8 },
                    ]),
                    spatialFacts: [],
                  },
                ],
              }),
            );
            return projectBattleState(state, "rejectMissingRange");
          },
        },
        {
          actionName: "doRejectMissingResource",
          projectionAfter: expectedProjection({
            channelDivinityUsesRemaining: 0,
            lastResult: "rejectMissingResource",
          }),
          discover: () => {
            const state = preserveLifeBattle({
              channelDivinityUsesRemaining: 0,
            });
            recordInvalidResult(
              resolveBattleSubject({
                state,
                subject: preserveLifeSubject(),
                fills: [],
              }),
            );
            return projectBattleState(state, "rejectMissingResource");
          },
        },
        {
          actionName: "doRejectMissingMagicAction",
          projectionAfter: expectedProjection({
            actionResourcesRemaining: 0,
            lastResult: "rejectMissingMagicAction",
          }),
          discover: () => {
            const base = preserveLifeBattle();
            const act = preserveLifeAct(base);
            const hole = requireHole(
              act.initialHoles,
              "hitPointHealingDistribution",
            );
            const state = {
              ...base,
              currentTurnResources: {
                ...base.currentTurnResources,
                actionResources: [],
              },
            };
            recordInvalidResult(
              resolveBattleSubject({
                state,
                subject: preserveLifeSubject(),
                fills: [
                  preserveLifeDistributionFill(hole, [
                    { targetId: spellTargetId, hitPoints: 8 },
                  ]),
                ],
              }),
            );
            return projectBattleState(state, "rejectMissingMagicAction");
          },
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<PreserveLifeProjection> = {},
): PreserveLifeProjection {
  return {
    casterHp: 20,
    targetHp: 2,
    secondTargetHp: 3,
    channelDivinityUsesRemaining: 2,
    actionResourcesRemaining: 1,
    lastResult: "init",
    ...overrides,
  };
}

function projectBattleState(
  state: BattleState,
  lastResult: PreserveLifeLastResult,
): PreserveLifeProjection {
  return {
    casterHp: currentHp(state, spellCasterId),
    targetHp: currentHp(state, spellTargetId),
    secondTargetHp: currentHp(state, secondTargetId),
    channelDivinityUsesRemaining: channelDivinityUsesRemaining(state),
    actionResourcesRemaining: state.currentTurnResources.actionResources.length,
    lastResult,
  };
}

function preserveLifeBattle(
  input: {
    readonly casterHp?: number;
    readonly targetHp?: number;
    readonly secondTargetHp?: number;
    readonly channelDivinityUsesRemaining?: number;
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("preserve-life-selected-identity"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Life Cleric",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "cleric", level: classLevel(3) }],
        currentHp: input.casterHp ?? 20,
        maxHp: 20,
        characterUnitRefs: [preserveLifeUnitRef],
        unitFeatures: [{ unit: preserveLifeUnit }],
        resources: [
          {
            unit: channelDivinityUnit,
            usesRemaining: input.channelDivinityUsesRemaining ?? 2,
          },
        ],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: input.targetHp ?? 2,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: secondTargetId,
        displayName: "Second Target",
        initiative: 9,
        side: oppositionSide,
        currentHp: input.secondTargetHp ?? 3,
        maxHp: 20,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function preserveLifeAct(state: BattleState): AvailableBattleAct {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.unitId === clericPreserveLifeUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Preserve Life act.");
  }
  return act;
}

function preserveLifeSubject() {
  return {
    tag: "unitFeature" as const,
    actorId: spellCasterId,
    unitId: clericPreserveLifeUnitId,
  };
}

function resolvePreserveLife(
  state: BattleState,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): BattleResolutionResult {
  const act = preserveLifeAct(state);
  const hole = requireHole(act.initialHoles, "hitPointHealingDistribution");
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [preserveLifeDistributionFill(hole, allocations)],
  });
}

function preserveLifeDistributionFill(
  hole: BattleHitPointHealingPoolDistributionHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): Extract<BattleFill, { readonly kind: "hitPointHealingDistribution" }> {
  return {
    kind: "hitPointHealingDistribution",
    holeId: hole.holeId,
    value: {
      allocations: allocations.map((allocation) => ({
        targetId: allocation.targetId,
        hitPoints: Hp(allocation.hitPoints),
      })),
    },
    spatialFacts: allocations
      .filter((allocation) => allocation.targetId !== spellCasterId)
      .map((allocation) => ({
        kind: "magicActionHealingPoolTargetWithinRange" as const,
        actorId: spellCasterId,
        targetId: allocation.targetId,
        unitId: clericPreserveLifeUnitId,
        rangeFeet: movementFeet(30),
      })),
  };
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Preserve Life to resolve: ${result.tag}`);
  }
  return result.state;
}

function recordInvalidResult(result: BattleResolutionResult): void {
  if (result.tag !== "invalid") {
    throw new Error(`Expected Preserve Life to reject: ${result.tag}`);
  }
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function channelDivinityUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Cleric actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === clericChannelDivinityUnitId,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Cleric Channel Divinity use-count resource.");
  }
  return Number(resource.usesRemaining);
}

function requirePreserveLifeUnitRef() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: clericPreserveLifeUnitId },
    unit: preserveLifeUnit,
    classLevels: [{ className: "cleric", level: classLevel(3) }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const support = battleMagicActionHealingPoolSupportForUnit(preserveLifeUnit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Preserve Life healing-pool support.");
  }
  if (
    !unitRef.right.supportProfiles.some(
      (profile) =>
        typeof profile !== "string" &&
        profile.kind === support.kind &&
        profile.healingPool.rangeFeet === support.healingPool.rangeFeet,
    )
  ) {
    throw new Error("Expected Preserve Life Unit ref support profile.");
  }
  return unitRef.right;
}
