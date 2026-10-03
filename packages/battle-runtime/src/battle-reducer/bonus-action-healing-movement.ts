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
  BattleResolvedMovement,
  BattleState,
  BattleUnitFeatureDecisionHole,
  CharacterBattleCreatureState,
  BonusActionHealingMovementOrder,
} from "../battle-state-execution.ts";
import { BONUS_ACTION_HEALING_MOVEMENT_ORDER_CHOICES } from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { halfCurrentSpeedMovementBudget } from "./movement-speed.ts";
import {
  parseBattleMovement,
  resolveMovementEffectsAfterMovement,
} from "./movement-procedures.ts";
import { invalidResult } from "./result-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import * as Match from "effect/Match";

const DECISION_PROTOCOL = "battle:bonus-action-healing:movement-decision";
const MOVEMENT_PROTOCOL = "battle:bonus-action-healing:movement";
const ORDER_PROTOCOL = "battle:bonus-action-healing:effect-order";
const DECISION_HOLE_ID = holeId(DECISION_PROTOCOL);
const MOVEMENT_HOLE_ID = holeId(MOVEMENT_PROTOCOL);
const ORDER_HOLE_ID = holeId(ORDER_PROTOCOL);

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
  readonly healedState: BattleState;
  readonly subject: BattleSubject;
  readonly actor: CharacterBattleCreatureState;
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  readonly fills: readonly BattleFill[];
};

type HealingMovementResult =
  | { readonly tag: "ok"; readonly state: BattleState }
  | {
      readonly tag: "moved";
      readonly state: BattleState;
      readonly movement: BattleResolvedMovement;
      readonly order: BonusActionHealingMovementOrder;
    }
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
type OrderFill = DecisionFill & {
  readonly value: BonusActionHealingMovementOrder;
};

function validHealingMovementOrderFill(
  fill: BattleFill | undefined,
): fill is OrderFill {
  return (
    fill?.kind === "unitFeatureDecision" &&
    (fill.value === "healFirst" || fill.value === "moveFirst")
  );
}

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
  if (new Set(input.fills).size !== input.fills.length) {
    return invalidHealingMovement(
      input.state,
      "Invalid healing movement fill.",
    );
  }
  const choiceFills = input.fills.filter(
    (fill) => fill.holeId === DECISION_HOLE_ID,
  );
  const movementFills = input.fills.filter(
    (fill) => fill.holeId === MOVEMENT_HOLE_ID,
  );
  const orderFills = input.fills.filter(
    (fill) => fill.holeId === ORDER_HOLE_ID,
  );
  const effectFills = input.fills.filter(
    (fill) =>
      fill.holeId !== DECISION_HOLE_ID &&
      fill.holeId !== MOVEMENT_HOLE_ID &&
      fill.holeId !== ORDER_HOLE_ID,
  );
  const rider = riderForResource(input.actor, input.resourcePoolRef);
  if (
    rider?.kind !== "unitSupportProfile" ||
    typeof rider.execution === "string" ||
    rider.execution.kind !== "bonusActionHealingMovementRider"
  ) {
    return input.fills.length === 0
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
  return resolveHealingMovementFills(
    input,
    choiceFills,
    orderFills,
    movementFills,
    effectFills,
  );
}

function resolveHealingMovementFills(
  input: HealingMovementInput,
  choiceFills: readonly BattleFill[],
  orderFills: readonly BattleFill[],
  movementFills: readonly BattleFill[],
  effectFills: readonly BattleFill[],
): HealingMovementResult {
  const decision = choiceFills[0];
  const movement = movementFills[0];
  if (
    healingMovementFillCountExceeded(choiceFills, orderFills, movementFills)
  ) {
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
  const orderFill = orderFills[0];
  if (orderFill !== undefined && !validHealingMovementOrderFill(orderFill)) {
    return invalidHealingMovement(
      input.state,
      "Invalid healing movement order fill.",
    );
  }
  return resolveHealingMovementDecision(
    input,
    decision,
    orderFill,
    movement,
    effectFills,
  );
}

function healingMovementFillCountExceeded(
  choiceFills: readonly BattleFill[],
  orderFills: readonly BattleFill[],
  movementFills: readonly BattleFill[],
): boolean {
  return (
    choiceFills.length > 1 || orderFills.length > 1 || movementFills.length > 1
  );
}

function resolveHealingMovementDecision(
  input: HealingMovementInput,
  decision: DecisionFill | undefined,
  orderFill: OrderFill | undefined,
  movement: MovementFill | undefined,
  effectFills: readonly BattleFill[],
): HealingMovementResult {
  if (effectFillsRequireMovement(effectFills, movement)) {
    return invalidHealingMovement(
      input.state,
      "Healing movement effect fills require movement.",
    );
  }
  if (decision === undefined) {
    return movement === undefined && orderFill === undefined
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
    return movement === undefined && orderFill === undefined
      ? { tag: "ok", state: input.state }
      : invalidHealingMovement(
          input.state,
          "Declined healing movement cannot include a movement fill.",
        );
  }
  return resolveHealingMovementUse(input, orderFill, movement, effectFills);
}

function effectFillsRequireMovement(
  effectFills: readonly BattleFill[],
  movement: MovementFill | undefined,
): boolean {
  return effectFills.length > 0 && movement === undefined;
}

function resolveHealingMovementUse(
  input: HealingMovementInput,
  orderFill: OrderFill | undefined,
  movement: MovementFill | undefined,
  effectFills: readonly BattleFill[],
): HealingMovementResult {
  if (orderFill === undefined) {
    return movement === undefined
      ? {
          tag: "result",
          result: needsHolesResult(input.state, input.subject, [orderHole()]),
        }
      : invalidHealingMovement(
          input.state,
          "Healing movement requires an effect order first.",
        );
  }
  const order = orderFill.value;
  const movementState = Match.value(order).pipe(
    Match.when("healFirst", () => input.healedState),
    Match.when("moveFirst", () => input.state),
    Match.exhaustive,
  );
  const budget = halfCurrentSpeedMovementBudget(
    movementState,
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
    : resolveHealingMovementFill(
        input,
        movementState,
        movement,
        budget,
        effectFills,
        order,
      );
}

function resolveHealingMovementFill(
  input: HealingMovementInput,
  movementState: BattleState,
  movement: MovementFill,
  budget: ReturnType<typeof halfCurrentSpeedMovementBudget>,
  effectFills: readonly BattleFill[],
  order: BonusActionHealingMovementOrder,
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
    movementState,
    input.actor.combatantId,
    movement,
    {
      kind: "budgetedMovement",
      movementBudgetFeet: speed.movementBudgetFeet,
      spendsTurnMovement: false,
    },
  );
  if (parsed.tag === "invalid") {
    return invalidHealingMovement(input.state, parsed.message);
  }
  const effects = resolveMovementEffectsAfterMovement({
    state: movementState,
    subject: input.subject,
    movement: parsed.movement,
    extraFills: effectFills,
  });
  if (effects.tag !== "resolved") {
    return {
      tag: "result",
      result:
        effects.tag === "needsHoles"
          ? {
              ...effects,
              state: input.state,
              snapshot: snapshotBattle(input.state),
            }
          : invalidResult(input.state, effects.reason, effects.message),
    };
  }
  return effects.remainingFills.length === 0
    ? { tag: "moved", state: effects.state, movement: parsed.movement, order }
    : invalidHealingMovement(
        input.state,
        "Healing movement received an unrelated effect fill.",
      );
}

function decisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: DECISION_HOLE_ID,
    holeInstanceKey: holeInstanceKey(DECISION_PROTOCOL),
    label: "Move with Bonus Action healing",
    choices: ["use", "decline"],
  };
}

function orderHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: ORDER_HOLE_ID,
    holeInstanceKey: holeInstanceKey(ORDER_PROTOCOL),
    label: "Choose healing and movement effect order",
    choices: BONUS_ACTION_HEALING_MOVEMENT_ORDER_CHOICES,
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
