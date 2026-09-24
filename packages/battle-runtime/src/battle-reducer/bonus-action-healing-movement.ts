// SRD 5.2.1 classes.md:4794-4802,4830-4832.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bonus-action-healing-movement-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleResourcePoolExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  BattleFill,
  BattleMovementHole,
  BattleResolutionResult,
  BattleState,
  BattleUnitFeatureDecisionHole,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { halfCurrentSpeedMovementBudget } from "./movement-speed.ts";
import { parseBattleMovement } from "./movement-procedures.ts";
import { applyBattleMovement } from "./battle-movement.ts";
import { invalidResult } from "./result-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";

const DECISION_PROTOCOL = "battle:bonus-action-healing:movement-decision";
const MOVEMENT_PROTOCOL = "battle:bonus-action-healing:movement";
const DECISION_HOLE_ID = holeId(DECISION_PROTOCOL);
const MOVEMENT_HOLE_ID = holeId(MOVEMENT_PROTOCOL);

function riderForResource(
  actor: CharacterBattleCreatureState,
  resourcePoolRef: BattleResourcePoolExecutionRef,
) {
  return actor.origin.execution.procedureBindings.find((binding) => {
    const procedure = binding.procedure;
    return (
      procedure.kind === "unitSupportProfile" &&
      typeof procedure.execution !== "string" &&
      procedure.execution.kind === "bonusActionHealingMovementRider" &&
      procedure.execution.activatesWith.resourcePoolRef === resourcePoolRef
    );
  })?.procedure;
}

type HealingMovementInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly actor: CharacterBattleCreatureState;
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  readonly fills: readonly BattleFill[];
};

type HealingMovementResult =
  | { readonly tag: "ok"; readonly state: BattleState }
  | {
      readonly tag: "result";
      readonly result: Exclude<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >;
    };

type DecisionFill = Extract<
  BattleFill,
  { readonly kind: "unitFeatureDecision" }
>;
type MovementFill = Extract<BattleFill, { readonly kind: "movement" }>;

function invalidHealingMovement(
  state: BattleState,
  message: string,
): HealingMovementResult {
  return {
    tag: "result",
    result: invalidResult(state, "invalidFill", message),
  };
}

function supportedHealingMovementPolicy(policy: {
  readonly optional: boolean;
  readonly maximum: string;
  readonly opportunityAttacks: string;
}): boolean {
  return (
    policy.optional &&
    policy.maximum === "halfCurrentSpeed" &&
    policy.opportunityAttacks === "doesNotProvoke"
  );
}

function validHealingMovementDecision(
  fill: BattleFill | undefined,
): fill is DecisionFill | undefined {
  return (
    fill === undefined ||
    (fill.kind === "unitFeatureDecision" &&
      (fill.value === "use" || fill.value === "decline"))
  );
}

export function resolveBonusActionHealingMovement(
  input: HealingMovementInput,
): HealingMovementResult {
  const choiceFills = input.fills.filter(
    (fill) => fill.holeId === DECISION_HOLE_ID,
  );
  const movementFills = input.fills.filter(
    (fill) => fill.holeId === MOVEMENT_HOLE_ID,
  );
  const rider = riderForResource(input.actor, input.resourcePoolRef);
  if (
    rider?.kind !== "unitSupportProfile" ||
    typeof rider.execution === "string" ||
    rider.execution.kind !== "bonusActionHealingMovementRider"
  ) {
    return choiceFills.length === 0 && movementFills.length === 0
      ? { tag: "ok", state: input.state }
      : invalidHealingMovement(
          input.state,
          "Healing movement requires an admitted activation rider.",
        );
  }
  if (!supportedHealingMovementPolicy(rider.execution.movement)) {
    return invalidHealingMovement(
      input.state,
      "Healing movement policy is unsupported.",
    );
  }
  return resolveHealingMovementFills(input, choiceFills, movementFills);
}

function resolveHealingMovementFills(
  input: HealingMovementInput,
  choiceFills: readonly BattleFill[],
  movementFills: readonly BattleFill[],
): HealingMovementResult {
  const decision = choiceFills[0];
  const movement = movementFills[0];
  if (choiceFills.length > 1 || movementFills.length > 1) {
    return invalidHealingMovement(
      input.state,
      "Invalid healing movement fill.",
    );
  }
  if (!validHealingMovementDecision(decision)) {
    return invalidHealingMovement(
      input.state,
      "Invalid healing movement fill.",
    );
  }
  if (movement !== undefined && movement.kind !== "movement") {
    return invalidHealingMovement(
      input.state,
      "Invalid healing movement fill.",
    );
  }
  return resolveHealingMovementDecision(input, decision, movement);
}

function resolveHealingMovementDecision(
  input: HealingMovementInput,
  decision: DecisionFill | undefined,
  movement: MovementFill | undefined,
): HealingMovementResult {
  if (decision === undefined) {
    return movement === undefined
      ? {
          tag: "result",
          result: needsHolesResult(input.state, input.subject, [
            decisionHole(),
          ]),
        }
      : invalidHealingMovement(
          input.state,
          "Healing movement requires a decision first.",
        );
  }
  if (decision.value === "decline") {
    return movement === undefined
      ? { tag: "ok", state: input.state }
      : invalidHealingMovement(
          input.state,
          "Declined healing movement cannot include a movement fill.",
        );
  }
  const budget = halfCurrentSpeedMovementBudget(
    input.state,
    input.actor.combatantId,
  );
  if (Number(budget.movementBudgetFeet) <= 0) {
    return invalidHealingMovement(
      input.state,
      "Current Speed grants no healing movement.",
    );
  }
  return movement === undefined
    ? {
        tag: "result",
        result: needsHolesResult(input.state, input.subject, [
          movementHole(input.actor.combatantId, budget),
        ]),
      }
    : resolveHealingMovementFill(input, movement, budget);
}

function resolveHealingMovementFill(
  input: HealingMovementInput,
  movement: MovementFill,
  budget: ReturnType<typeof halfCurrentSpeedMovementBudget>,
): HealingMovementResult {
  if (movement.value.provokedOpportunityAttacks.length > 0) {
    return invalidHealingMovement(
      input.state,
      "Healing movement does not provoke Opportunity Attacks.",
    );
  }
  const speed = budget.speedKinds.find(
    (kind) => kind.kind === movement.value.speedKind,
  );
  if (speed === undefined) {
    return invalidHealingMovement(
      input.state,
      "Movement speed kind is not represented by this combatant.",
    );
  }
  const parsed = parseBattleMovement(
    input.state,
    input.actor.combatantId,
    movement,
    {
      kind: "budgetedMovement",
      movementBudgetFeet: speed.movementBudgetFeet,
      spendsTurnMovement: false,
    },
  );
  return parsed.tag === "invalid"
    ? invalidHealingMovement(input.state, parsed.message)
    : { tag: "ok", state: applyBattleMovement(input.state, parsed.movement) };
}

function decisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: DECISION_HOLE_ID,
    holeInstanceKey: holeInstanceKey(DECISION_PROTOCOL),
    label: "Move after Bonus Action healing",
    choices: ["use", "decline"],
  };
}

function movementHole(
  actorId: CombatantId,
  budget: ReturnType<typeof halfCurrentSpeedMovementBudget>,
): BattleMovementHole {
  return {
    kind: "movement",
    holeId: MOVEMENT_HOLE_ID,
    holeInstanceKey: holeInstanceKey(MOVEMENT_PROTOCOL),
    label: "Bonus Action healing movement",
    actorId,
    movementBudgetFeet: budget.movementBudgetFeet,
    speedKinds: budget.speedKinds,
  };
}

export function isBonusActionHealingMovementFill(fill: BattleFill): boolean {
  return fill.holeId === DECISION_HOLE_ID || fill.holeId === MOVEMENT_HOLE_ID;
}
