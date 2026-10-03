// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.bonus-action-healing-movement-rider
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay FACTORY-549 fighter_tactical_shift
// UNIT-IDENTITY-REPLAY: FACTORY-549 fighter_tactical_shift doResolveTacticalShift
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spikeGrowthAreaFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
  spikeGrowthAreaId,
  spikeGrowthUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import type { BonusActionHealingMovementOrder } from "./battle-state-execution.ts";
import {
  supportedBattleUnitRef,
  unitLibrary,
  startBattleSessionRight,
  battleId,
  characterSeed,
  resource,
  statBlockCreatureInit,
  discoverBattleActs,
  damageRollFill,
  findHole,
  requireHole,
  resolveBattleSubject,
  unitFeatureDecisionFill,
  movementFill,
  requireResolved,
  fighterId,
  endTurn,
  damageRollFillWithGroups,
  movementFeet,
} from "./battle-runtime.test-support.ts";
import { requireResultHole } from "./unit-profile-admission-creature-fixture.test-support.ts";

function secondWindUsesRemaining(
  session: ReturnType<typeof startBattleSessionRight>,
  actorId = fighterId,
): number {
  const ownership = session.context.characters
    .get(actorId)
    ?.resourceOwnership.find(
      (candidate) => candidate.unit.id === "fighter_second_wind",
    );
  if (ownership === undefined)
    throw new Error("Expected Second Wind ownership.");
  const actor = session.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character")
    throw new Error("Expected Fighter character.");
  const pool = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === ownership.resourcePoolRef,
  );
  if (pool === undefined) throw new Error("Expected Second Wind pool.");
  return Number(pool.usesRemaining);
}

function resolveTacticalShiftThroughHazard(
  orderValue: BonusActionHealingMovementOrder,
) {
  const tacticalShift = supportedBattleUnitRef(
    unitLibrary.requireUnit("fighter_tactical_shift"),
  );
  const session = spellBattle({
    preparedSpells: [spellRecord(spikeGrowthUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetClassLevels: [{ className: "fighter", level: 5 }],
    targetResources: [resource()],
    targetUnitRefs: [
      supportedBattleUnitRef(unitLibrary.requireUnit("fighter_second_wind")),
      tacticalShift,
    ],
    targetHp: 4,
    targetMaxHp: 30,
  });
  const castAct = spellAct({
    session,
    spellId: spikeGrowthUnitId,
    slotLevel: 2,
  });
  const cast = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        spikeGrowthAreaFill(findHole(castAct.initialHoles, "spellAreaChoice")),
      ],
    }),
  );
  const targetTurn = requireResolved(
    endTurn({ state: cast.state, actorId: spellCasterId }),
  );
  const state = targetTurn.state;
  const act = discoverBattleActs(
    battleRuntimeSessionForTest({ ...session, state }),
  ).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      battleActUnitPresentation(candidate)?.unitId === "fighter_second_wind",
  );
  if (act === undefined) throw new Error("Expected Second Wind act.");
  const healingRoll = damageRollFill(
    findHole(act.initialHoles, "rolledDice"),
    3,
  );
  const decision = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [healingRoll],
    }),
    "unitFeatureDecision",
  );
  const use = unitFeatureDecisionFill(decision, "use");
  const orderHole = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [healingRoll, use],
    }),
    "unitFeatureDecision",
  );
  const order = unitFeatureDecisionFill(orderHole, orderValue);
  const movementHole = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [healingRoll, use, order],
    }),
    "movement",
  );
  const hazard = state.combatants
    .get(spellCasterId)
    ?.activeEffects.find(
      (effect) => effect.kind === "areaMovementDistanceDamage",
    );
  if (hazard?.kind !== "areaMovementDistanceDamage") {
    throw new Error("Expected movement-damage hazard.");
  }
  const movement = movementFill(movementHole, {
    movementCostFeet: 15,
    provokedOpportunityAttacks: [],
    areaDifficultTerrain: {
      kind: "areaDifficultTerrain",
      sources: [
        {
          kind: "areaMovementDistanceDamage",
          effectRef: hazard.effectRef,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: hazard.sourceProcedureRef,
          areaId: spikeGrowthAreaId,
          damageDistanceFeet: movementFeet(5),
        },
      ],
      totalDistanceFeet: movementFeet(10),
      difficultTerrainDistanceFeet: movementFeet(5),
    },
  });
  const fills = [healingRoll, use, order, movement];
  const damageHole = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills,
    }),
    "rolledDice",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [...fills, damageRollFillWithGroups(damageHole, [[3, 3]])],
    }),
  );
  const resolvedMovement = resolved.movements?.[0];
  if (resolvedMovement === undefined) {
    throw new Error("Expected resolved Tactical Shift movement.");
  }
  return {
    hp: Number(resolved.state.combatants.get(spellTargetId)?.hp),
    riderMovementCostFeet: Number(resolvedMovement.movementCostFeet),
    riderTravelDistanceFeet: Number(
      resolvedMovement.areaDifficultTerrain?.totalDistanceFeet ??
        resolvedMovement.movementCostFeet,
    ),
    movementBudgetFeet: Number(movementHole.movementBudgetFeet),
    movementSpentFeet: Number(
      resolved.state.combatants.get(spellTargetId)?.movementSpentFeet,
    ),
    opportunityAttackCount: movement.value.provokedOpportunityAttacks.length,
    bonusActionAvailable: resolved.snapshot.turn.bonusActionQuotaAvailable,
    secondWindUsesRemaining: secondWindUsesRemaining(
      battleRuntimeSessionForTest({ ...session, state: resolved.state }),
      spellTargetId,
    ),
  };
}

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Tactical Shift selected identity replay",
  taskId: "FACTORY-549",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-tactical-shift-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  projectionSchema: {
    hp: "int",
    riderMovementCostFeet: "int",
    riderTravelDistanceFeet: "int",
    movementBudgetFeet: "int",
    movementSpentFeet: "int",
    opportunityAttackCount: "int",
    bonusActionAvailable: "bool",
    secondWindUsesRemaining: "int",
  },
  initialProjection: {
    hp: 4,
    riderMovementCostFeet: 0,
    riderTravelDistanceFeet: 0,
    movementBudgetFeet: 0,
    movementSpentFeet: 0,
    opportunityAttackCount: 0,
    bonusActionAvailable: true,
    secondWindUsesRemaining: 3,
  },
  units: [
    {
      unitId: "fighter_tactical_shift",
      procedures: [
        {
          actionName: "doResolveTacticalShift",
          discover: () => {
            const tacticalShift = supportedBattleUnitRef(
              unitLibrary.requireUnit("fighter_tactical_shift"),
            );
            const session = startBattleSessionRight({
              battleId: battleId("battle-tactical-shift-replay"),
              combatants: [
                characterSeed({
                  initiative: 20,
                  classLevel: 5,
                  currentHp: 4,
                  maxHp: 30,
                  resources: [resource()],
                  characterUnitRefs: [tacticalShift],
                }),
                statBlockCreatureInit({ initiative: 10 }),
              ],
            });
            const act = discoverBattleActs(session).find(
              (candidate) =>
                candidate.subject.tag === "unitFeature" &&
                battleActUnitPresentation(candidate)?.unitId ===
                  "fighter_second_wind",
            );
            if (act === undefined) throw new Error("Expected Second Wind act.");
            const healingRoll = damageRollFill(
              findHole(act.initialHoles, "rolledDice"),
              3,
            );
            const decision = requireHole(
              resolveBattleSubject({
                state: session.state,
                subject: act.subject,
                fills: [healingRoll],
              }),
              "unitFeatureDecision",
            );
            const use = unitFeatureDecisionFill(decision, "use");
            const orderHole = requireHole(
              resolveBattleSubject({
                state: session.state,
                subject: act.subject,
                fills: [healingRoll, use],
              }),
              "unitFeatureDecision",
            );
            const order = unitFeatureDecisionFill(orderHole, "healFirst");
            const movement = requireHole(
              resolveBattleSubject({
                state: session.state,
                subject: act.subject,
                fills: [healingRoll, use, order],
              }),
              "movement",
            );
            const requestedMovement = movementFill(movement, {
              movementCostFeet: 10,
              provokedOpportunityAttacks: [],
            });
            const resolved = requireResolved(
              resolveBattleSubject({
                state: session.state,
                subject: act.subject,
                fills: [healingRoll, use, order, requestedMovement],
              }),
            );
            const resolvedMovement = resolved.movements?.[0];
            if (resolvedMovement === undefined) {
              throw new Error("Expected resolved Tactical Shift movement.");
            }
            return {
              hp: Number(resolved.state.combatants.get(fighterId)?.hp),
              riderMovementCostFeet: Number(resolvedMovement.movementCostFeet),
              riderTravelDistanceFeet: Number(
                resolvedMovement.areaDifficultTerrain?.totalDistanceFeet ??
                  resolvedMovement.movementCostFeet,
              ),
              movementBudgetFeet: Number(movement.movementBudgetFeet),
              movementSpentFeet: Number(
                resolved.state.combatants.get(fighterId)?.movementSpentFeet,
              ),
              opportunityAttackCount:
                requestedMovement.value.provokedOpportunityAttacks.length,
              bonusActionAvailable:
                resolved.snapshot.turn.bonusActionQuotaAvailable,
              secondWindUsesRemaining: secondWindUsesRemaining(
                battleRuntimeSessionForTest({
                  ...session,
                  state: resolved.state,
                }),
              ),
            };
          },
        },
        {
          actionName: "doResolveTacticalShiftHealFirstHazard",
          discover: () => resolveTacticalShiftThroughHazard("healFirst"),
        },
        {
          actionName: "doResolveTacticalShiftMoveFirstHazard",
          discover: () => resolveTacticalShiftThroughHazard("moveFirst"),
        },
      ],
    },
  ],
});
