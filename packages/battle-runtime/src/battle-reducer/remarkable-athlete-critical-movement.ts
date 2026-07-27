// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete

import { movementFeet, type MovementFeet } from "@dnd/shared/types";

import type {
  BattleMovementSpeedKind,
  BattleSubject,
} from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import type {
  BattleCreatureState,
  BattleFill,
  BattleMovementHole,
  BattleResolutionResult,
  BattleState,
  BattleUnitFeatureDecisionHole,
} from "../battle-state-execution.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
import {
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_INSTANCE,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import {
  effectiveMovementSpeed,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { applyBattleMovement } from "./readied-release.ts";
import { invalidResult } from "./result-helpers.ts";
import { parseBattleMovement } from "./turn-end-movement.ts";

export type RemarkableAthleteCriticalHitMovementFills = {
  readonly remarkableAthleteCriticalHitMovementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly remarkableAthleteCriticalHitMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
};

type RemarkableAthleteCriticalHitMovementExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "remarkableAthlete" }
>;

type RemarkableAthleteCriticalHitMovementBudget = {
  readonly movementBudgetFeet: MovementFeet;
  readonly speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: MovementFeet;
  }[];
};

export function resolveRemarkableAthleteCriticalHitMovement(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly attackerId: CombatantId;
  readonly scoredCriticalHit: boolean;
  readonly fills: RemarkableAthleteCriticalHitMovementFills;
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | {
      readonly tag: "result";
      readonly result: Exclude<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >;
    } {
  const profile = input.scoredCriticalHit
    ? remarkableAthleteCriticalHitMovementProfileForActor(
        input.state.combatants.get(input.attackerId),
      )
    : null;
  const movementBudget = profile
    ? remarkableAthleteCriticalHitMovementBudget(input.state, input.attackerId)
    : emptyRemarkableAthleteCriticalHitMovementBudget();
  if (profile === null || Number(movementBudget.movementBudgetFeet) <= 0) {
    if (
      input.fills.remarkableAthleteCriticalHitMovementDecision !== undefined ||
      input.fills.remarkableAthleteCriticalHitMovement !== undefined
    ) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Remarkable Athlete movement is only valid after an eligible Critical Hit.",
        ),
      };
    }
    return { tag: "ok", state: input.state };
  }

  const decisionHole = remarkableAthleteCriticalHitMovementDecisionHole();
  const decision = input.fills.remarkableAthleteCriticalHitMovementDecision;
  const movementFill = input.fills.remarkableAthleteCriticalHitMovement;
  if (decision === undefined) {
    if (movementFill !== undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Remarkable Athlete movement requires a use decision first.",
        ),
      };
    }
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [decisionHole]),
    };
  }
  if (decision.value === "decline") {
    if (movementFill !== undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Remarkable Athlete movement fill requires using the feature.",
        ),
      };
    }
    return { tag: "ok", state: input.state };
  }
  if (movementFill === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        remarkableAthleteCriticalHitMovementHole(
          input.attackerId,
          movementBudget,
        ),
      ]),
    };
  }
  const speedKindBudget = movementBudget.speedKinds.find(
    (candidate) => candidate.kind === movementFill.value.speedKind,
  );
  if (speedKindBudget === undefined) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Remarkable Athlete movement speed kind is not represented by this combatant.",
      ),
    };
  }
  if (movementFill.value.provokedOpportunityAttacks.length > 0) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Remarkable Athlete movement does not provoke Opportunity Attacks.",
      ),
    };
  }
  const movement = parseBattleMovement(
    input.state,
    input.attackerId,
    movementFill,
    {
      movementBudgetFeet: speedKindBudget.movementBudgetFeet,
      spendsTurnMovement: false,
    },
  );
  if (movement.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", movement.message),
    };
  }
  return {
    tag: "ok",
    state: applyBattleMovement(input.state, movement.movement),
  };
}

function remarkableAthleteCriticalHitMovementProfileForActor(
  actor: BattleCreatureState | undefined,
): RemarkableAthleteCriticalHitMovementExecution | null {
  if (!isCharacterBattleCreatureState(actor)) {
    return null;
  }
  for (const binding of actor.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "remarkableAthlete" &&
      procedure.execution.remarkableAthlete.criticalHitMovement.trigger ===
        "scoreCriticalHit" &&
      procedure.execution.remarkableAthlete.criticalHitMovement.timing ===
        "immediatelyAfterTrigger" &&
      procedure.execution.remarkableAthlete.criticalHitMovement.distance
        .kind === "halfSpeed" &&
      procedure.execution.remarkableAthlete.criticalHitMovement
        .opportunityAttacks === "doesNotProvoke"
    ) {
      return procedure.execution;
    }
  }
  return null;
}

function remarkableAthleteCriticalHitMovementBudget(
  state: BattleState,
  attackerId: CombatantId,
): RemarkableAthleteCriticalHitMovementBudget {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return emptyRemarkableAthleteCriticalHitMovementBudget();
  }
  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === attackerId,
  );
  const speedKinds = representedMovementSpeedKinds(attacker).map((kind) => ({
    kind,
    movementBudgetFeet: halfMovementSpeed(
      effectiveMovementSpeed(state, attacker, kind, isGrappled),
    ),
  }));
  return {
    movementBudgetFeet: maxMovementBudgetFeet(speedKinds),
    speedKinds,
  };
}

function emptyRemarkableAthleteCriticalHitMovementBudget(): RemarkableAthleteCriticalHitMovementBudget {
  return { movementBudgetFeet: movementFeet(0), speedKinds: [] };
}

function halfMovementSpeed(speedFeet: MovementFeet): MovementFeet {
  return movementFeet(Math.floor(Number(speedFeet) / 2));
}

function maxMovementBudgetFeet(
  speedKinds: RemarkableAthleteCriticalHitMovementBudget["speedKinds"],
): MovementFeet {
  return movementFeet(
    Math.max(
      0,
      ...speedKinds.map((speedKind) => Number(speedKind.movementBudgetFeet)),
    ),
  );
}

function remarkableAthleteCriticalHitMovementDecisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
    holeInstanceKey:
      REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_INSTANCE,
    label: "Use Remarkable Athlete movement",
    choices: ["use", "decline"],
  };
}

function remarkableAthleteCriticalHitMovementHole(
  actorId: CombatantId,
  movementBudget: RemarkableAthleteCriticalHitMovementBudget,
): BattleMovementHole {
  return {
    kind: "movement",
    holeId: REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
    holeInstanceKey: REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_INSTANCE,
    label: "Remarkable Athlete movement",
    actorId,
    movementBudgetFeet: movementBudget.movementBudgetFeet,
    speedKinds: movementBudget.speedKinds,
  };
}
