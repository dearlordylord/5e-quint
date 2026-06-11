// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES fighter_remarkable_athlete
// UNIT-IDENTITY-MBT-REPLAY: L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES fighter_remarkable_athlete doProjectRemarkableAthleteRollModes
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT fighter_remarkable_athlete
// UNIT-IDENTITY-MBT-REPLAY: L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT fighter_remarkable_athlete doProjectRemarkableAthleteRollModes doProjectRemarkableAthleteCriticalMovement
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.remarkable-athlete
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import type { BattleHole } from "./index.ts";
import {
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  Either,
  fighterRemarkableAthleteUnitId,
  attackRollFill,
  attackTargetFill,
  movementFill,
  oppositionSide,
  partySide,
  requireHole,
  requiredInitiativeRollModeForCombatant,
  resolveBattleSubject,
  startBattle,
  type BattleState,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";

type RollMode = "normal" | "advantage" | "disadvantage";

type RemarkableAthleteProjection = {
  readonly initiativeRollMode: RollMode;
  readonly strengthAthleticsRollMode: RollMode;
  readonly strengthAcrobaticsRollMode: RollMode;
  readonly plainStrengthRollMode: RollMode;
  readonly dexterityAthleticsRollMode: RollMode;
  readonly unselectedStrengthAthleticsRollMode: RollMode;
  readonly criticalMovementOffered: boolean;
  readonly criticalMovementBudgetFeet: number;
  readonly criticalMovementProvokesOpportunityAttacks: boolean;
  readonly criticalMovementAccepted: boolean;
  readonly lastResult: "init" | "projected" | "criticalMovement";
};

const remarkableAthleteActorId = combatantId("remarkable-athlete-mbt-actor");
const unselectedActorId = combatantId("remarkable-athlete-mbt-unselected");
const targetId = combatantId("remarkable-athlete-mbt-target");

defineSelectedIdentityWitness({
  describeLabel: "Remarkable Athlete selected identity MBT",
  taskId: "L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-remarkable-athlete-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      Projected: "projected",
      CriticalMovement: "criticalMovement",
    },
  },
  projectionSchema: {
    initiativeRollMode: "str",
    strengthAthleticsRollMode: "str",
    strengthAcrobaticsRollMode: "str",
    plainStrengthRollMode: "str",
    dexterityAthleticsRollMode: "str",
    unselectedStrengthAthleticsRollMode: "str",
    criticalMovementOffered: "bool",
    criticalMovementBudgetFeet: "int",
    criticalMovementProvokesOpportunityAttacks: "bool",
    criticalMovementAccepted: "bool",
    lastResult: "variant",
  },
  initialProjection: {
    initiativeRollMode: "normal",
    strengthAthleticsRollMode: "normal",
    strengthAcrobaticsRollMode: "normal",
    plainStrengthRollMode: "normal",
    dexterityAthleticsRollMode: "normal",
    unselectedStrengthAthleticsRollMode: "normal",
    criticalMovementOffered: false,
    criticalMovementBudgetFeet: 0,
    criticalMovementProvokesOpportunityAttacks: false,
    criticalMovementAccepted: false,
    lastResult: "init",
  },
  units: [
    {
      unitId: fighterRemarkableAthleteUnitId,
      procedures: [
        {
          actionName: "doProjectRemarkableAthleteRollModes",
          projectionAfter: {
            initiativeRollMode: "advantage",
            strengthAthleticsRollMode: "advantage",
            strengthAcrobaticsRollMode: "normal",
            plainStrengthRollMode: "normal",
            dexterityAthleticsRollMode: "normal",
            unselectedStrengthAthleticsRollMode: "normal",
            criticalMovementOffered: false,
            criticalMovementBudgetFeet: 0,
            criticalMovementProvokesOpportunityAttacks: false,
            criticalMovementAccepted: false,
            lastResult: "projected",
          },
          discover: () =>
            projectRemarkableAthleteRollModes(
              remarkableAthleteBattle(),
              "projected",
            ),
        },
        {
          actionName: "doProjectRemarkableAthleteCriticalMovement",
          projectionAfter: {
            initiativeRollMode: "normal",
            strengthAthleticsRollMode: "normal",
            strengthAcrobaticsRollMode: "normal",
            plainStrengthRollMode: "normal",
            dexterityAthleticsRollMode: "normal",
            unselectedStrengthAthleticsRollMode: "normal",
            criticalMovementOffered: true,
            criticalMovementBudgetFeet: 15,
            criticalMovementProvokesOpportunityAttacks: false,
            criticalMovementAccepted: true,
            lastResult: "criticalMovement",
          },
          discover: () =>
            projectRemarkableAthleteCriticalMovement(remarkableAthleteBattle()),
        },
      ],
    },
  ],
});

function remarkableAthleteBattle(): BattleState {
  const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const state = startBattle({
    battleId: battleId("remarkable-athlete-selected-identity"),
    combatants: [
      characterCreature({
        combatantId: remarkableAthleteActorId,
        displayName: "Remarkable Athlete MBT Actor",
        initiative: 18,
        side: partySide,
        characterUnitRefs: [unitRef.right],
        classLevels: [{ className: "fighter", level: 3 }],
        unitFeatures: [{ unit }],
      }),
      characterCreature({
        combatantId: unselectedActorId,
        displayName: "Remarkable Athlete MBT Unselected Actor",
        initiative: 14,
        side: partySide,
        classLevels: [{ className: "fighter", level: 3 }],
        unitFeatures: [{ unit }],
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Remarkable Athlete MBT Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(state)) {
    throw new Error(state.left.message);
  }
  return state.right;
}

function projectRemarkableAthleteRollModes(
  state: BattleState,
  lastResult: RemarkableAthleteProjection["lastResult"],
): RemarkableAthleteProjection {
  return {
    initiativeRollMode:
      requiredInitiativeRollModeForCombatant(state, remarkableAthleteActorId) ??
      "normal",
    strengthAthleticsRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "str", {
        skill: "athletics",
      }) ?? "normal",
    strengthAcrobaticsRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "str", {
        skill: "acrobatics",
      }) ?? "normal",
    plainStrengthRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "str") ??
      "normal",
    dexterityAthleticsRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "dex", {
        skill: "athletics",
      }) ?? "normal",
    unselectedStrengthAthleticsRollMode:
      requiredAbilityCheckRollMode(state, unselectedActorId, "str", {
        skill: "athletics",
      }) ?? "normal",
    criticalMovementOffered: false,
    criticalMovementBudgetFeet: 0,
    criticalMovementProvokesOpportunityAttacks: false,
    criticalMovementAccepted: false,
    lastResult,
  };
}

function projectRemarkableAthleteCriticalMovement(
  state: BattleState,
): RemarkableAthleteProjection {
  const subject = {
    tag: "action",
    actorId: remarkableAthleteActorId,
    action: "attack",
    attackName: "Unarmed Strike",
  } as const;
  const target = requireHole(
    requireNeedsHoles(resolveBattleSubject({ state, subject, fills: [] })),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    remarkableAthleteActorId,
    targetId,
  );
  const attackRoll = requireHole(
    requireNeedsHoles(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
    ),
    "attackRoll",
  );
  const criticalAttackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 20,
  });
  const decision = requireHole(
    requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, criticalAttackFill],
      }),
    ),
    "unitFeatureDecision",
  );
  const movement = requireHole(
    requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill,
          criticalAttackFill,
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
    ),
    "movement",
  );
  const accepted = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill,
      criticalAttackFill,
      unitFeatureDecisionFill(decision, "use"),
      movementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (accepted.tag === "invalid") {
    throw new Error(accepted.message);
  }
  return {
    initiativeRollMode: "normal",
    strengthAthleticsRollMode: "normal",
    strengthAcrobaticsRollMode: "normal",
    plainStrengthRollMode: "normal",
    dexterityAthleticsRollMode: "normal",
    unselectedStrengthAthleticsRollMode: "normal",
    criticalMovementOffered: true,
    criticalMovementBudgetFeet: Number(movement.movementBudgetFeet),
    criticalMovementProvokesOpportunityAttacks: false,
    criticalMovementAccepted: true,
    lastResult: "criticalMovement",
  };
}

function requireNeedsHoles(
  result: ReturnType<typeof resolveBattleSubject>,
): readonly BattleHole[] {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles, got ${result.tag}.`);
  }
  return result.holes;
}

function unitFeatureDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "unitFeatureDecision" }>,
  value: "use" | "decline",
) {
  return {
    kind: "unitFeatureDecision" as const,
    holeId: hole.holeId,
    value,
  };
}
