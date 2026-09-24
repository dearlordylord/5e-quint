// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.bonus-action-healing-movement-rider
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay FACTORY-549 fighter_tactical_shift
// UNIT-IDENTITY-REPLAY: FACTORY-549 fighter_tactical_shift doResolveTacticalShift
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
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
} from "./battle-runtime.test-support.ts";

function secondWindUsesRemaining(
  session: ReturnType<typeof startBattleSessionRight>,
): number {
  const ownership = session.context.characters
    .get(fighterId)
    ?.resourceOwnership.find(
      (candidate) => candidate.unit.id === "fighter_second_wind",
    );
  if (ownership === undefined)
    throw new Error("Expected Second Wind ownership.");
  const actor = session.state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character")
    throw new Error("Expected Fighter character.");
  const pool = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === ownership.resourcePoolRef,
  );
  if (pool === undefined) throw new Error("Expected Second Wind pool.");
  return Number(pool.usesRemaining);
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
    riderMovementFeet: "int",
    movementBudgetFeet: "int",
    movementSpentFeet: "int",
    opportunityAttackCount: "int",
    bonusActionAvailable: "bool",
    secondWindUsesRemaining: "int",
  },
  initialProjection: {
    hp: 4,
    riderMovementFeet: 0,
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
            const movement = requireHole(
              resolveBattleSubject({
                state: session.state,
                subject: act.subject,
                fills: [healingRoll, use],
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
                fills: [healingRoll, use, requestedMovement],
              }),
            );
            return {
              hp: Number(resolved.state.combatants.get(fighterId)?.hp),
              riderMovementFeet: Number(
                requestedMovement.value.movementCostFeet,
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
      ],
    },
  ],
});
