// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.ongoing-feature-activation-movement-rider
// SRD 5.2.1 classes.md:302-305.
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match, Result } from "effect";
import type { BattleResourcePoolExecutionRef } from "../identity.ts";
import type {
  BattleFill,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleState,
  CharacterBattleCreatureState,
  UnitFeatureBattleResolutionInput,
} from "../battle-state-execution.ts";
import {
  halfCurrentSpeedMovementBudget,
  opportunityAttackThreatsForMovement,
} from "./movement-speed.ts";
import {
  parseBattleMovement,
  resolveMoveAfterMovement,
} from "./movement-procedures.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

const DECISION_PROTOCOL = "battle:ongoing-feature-activation:movement-decision";
const MOVEMENT_PROTOCOL = "battle:ongoing-feature-activation:movement";
const DECISION_HOLE_ID = holeId(DECISION_PROTOCOL);
const MOVEMENT_HOLE_ID = holeId(MOVEMENT_PROTOCOL);
type ActivationMovementInput = {
  readonly input: UnitFeatureBattleResolutionInput;
  readonly activatedState: BattleState;
  readonly actor: CharacterBattleCreatureState;
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  readonly entering: boolean;
};
type MovementFill = Extract<BattleFill, { readonly kind: "movement" }>;
type ActivationMovementSelection =
  | { readonly kind: "pendingChoice" }
  | { readonly kind: "declined" }
  | {
      readonly kind: "move";
      readonly movement: MovementFill | undefined;
      readonly effectFills: readonly BattleFill[];
    };

function invalidActivationMovement(
  request: UnitFeatureBattleResolutionInput,
  message: string,
) {
  return invalidResult(request.state, "invalidFill", message);
}
function completedActivation(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return { tag: "resolved", state, snapshot: snapshotBattle(state) };
}
function isFillKind<K extends BattleFill["kind"]>(
  fill: BattleFill,
  kind: K,
): fill is Extract<BattleFill, { readonly kind: K }> {
  return fill.kind === kind;
}
function uniqueActivationFill<K extends BattleFill["kind"]>(
  fills: readonly BattleFill[],
  contract: { readonly holeId: BattleFill["holeId"]; readonly kind: K },
): Result.Result<
  Extract<BattleFill, { readonly kind: K }> | undefined,
  string
> {
  const matching = fills.filter((fill) => fill.holeId === contract.holeId);
  if (matching.length > 1)
    return Result.fail("Invalid activation movement fills.");
  const fill = matching[0];
  if (fill === undefined) return Result.succeed(undefined);
  return isFillKind(fill, contract.kind)
    ? Result.succeed(fill)
    : Result.fail("Invalid activation movement fills.");
}
function activationSelectionForDecision(input: {
  readonly anyFills: boolean;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly movement: MovementFill | undefined;
  readonly effectFills: readonly BattleFill[];
}): Result.Result<ActivationMovementSelection, string> {
  if (input.decision === undefined)
    return input.anyFills
      ? Result.fail("Activation movement requires a decision first.")
      : Result.succeed({ kind: "pendingChoice" });
  if (input.decision.value === "decline")
    return input.movement === undefined && input.effectFills.length === 0
      ? Result.succeed({ kind: "declined" })
      : Result.fail(
          "Declined activation movement cannot include movement fills.",
        );
  if (input.decision.value !== "use")
    return Result.fail("Invalid activation movement fills.");
  return Result.succeed({
    kind: "move",
    movement: input.movement,
    effectFills: input.effectFills,
  });
}
function activationMovementSelection(
  fills: readonly BattleFill[],
): Result.Result<ActivationMovementSelection, string> {
  const decision = uniqueActivationFill(fills, {
    holeId: DECISION_HOLE_ID,
    kind: "unitFeatureDecision",
  });
  if (Result.isFailure(decision)) return Result.fail(decision.failure);
  const movement = uniqueActivationFill(fills, {
    holeId: MOVEMENT_HOLE_ID,
    kind: "movement",
  });
  if (Result.isFailure(movement)) return Result.fail(movement.failure);
  return activationSelectionForDecision({
    anyFills: fills.length > 0,
    decision: decision.success,
    movement: movement.success,
    effectFills: fills.filter(
      (fill) =>
        fill.holeId !== DECISION_HOLE_ID && fill.holeId !== MOVEMENT_HOLE_ID,
    ),
  });
}
function activationMovementEligible(input: ActivationMovementInput): boolean {
  return (
    input.entering &&
    input.actor.origin.execution.procedureBindings.some(
      ({ procedure }) =>
        procedure.kind === "unitSupportProfile" &&
        typeof procedure.execution !== "string" &&
        procedure.execution.kind === "ongoingFeatureActivationMovementRider" &&
        procedure.execution.activatesWith.resourcePoolRef ===
          input.resourcePoolRef,
    )
  );
}
export function resolveOngoingFeatureActivationMovement(
  input: ActivationMovementInput,
): BattleResolutionResult {
  const request = input.input;
  if (!activationMovementEligible(input))
    return request.fills.length === 0
      ? completedActivation(input.activatedState)
      : invalidActivationMovement(
          request,
          "Movement requires entering an admitted ongoing feature.",
        );
  const selection = activationMovementSelection(request.fills);
  if (Result.isFailure(selection))
    return invalidActivationMovement(request, selection.failure);
  return Match.value(selection.success).pipe(
    Match.discriminatorsExhaustive("kind")({
      pendingChoice: () =>
        needsHolesResult(request.state, request.subject, [
          {
            kind: "unitFeatureDecision",
            holeId: DECISION_HOLE_ID,
            holeInstanceKey: holeInstanceKey(DECISION_PROTOCOL),
            label: "Move when entering ongoing feature",
            choices: ["use", "decline"],
          },
        ]),
      declined: () => completedActivation(input.activatedState),
      move: (value) => resolveChosenActivationMovement(input, value),
    }),
  );
}
function resolveChosenActivationMovement(
  input: ActivationMovementInput,
  selection: Extract<ActivationMovementSelection, { readonly kind: "move" }>,
): BattleResolutionResult {
  const request = input.input;
  const budget = halfCurrentSpeedMovementBudget(
    input.activatedState,
    request.subject.actorId,
  );
  if (Number(budget.movementBudgetFeet) <= 0)
    return invalidActivationMovement(
      request,
      "Current Speed grants no activation movement.",
    );
  if (selection.movement === undefined)
    return selection.effectFills.length === 0
      ? needsHolesResult(request.state, request.subject, [
          {
            kind: "movement",
            holeId: MOVEMENT_HOLE_ID,
            holeInstanceKey: holeInstanceKey(MOVEMENT_PROTOCOL),
            label: "Ongoing feature activation movement",
            actorId: request.subject.actorId,
            movementBudgetFeet: budget.movementBudgetFeet,
            speedKinds: budget.speedKinds,
          },
        ])
      : invalidActivationMovement(
          request,
          "Activation movement effect fills require movement.",
        );
  const movement = selection.movement;
  const speed = budget.speedKinds.find(
    (kind) => kind.kind === movement.value.speedKind,
  );
  if (speed === undefined)
    return invalidActivationMovement(
      request,
      "Movement speed kind is not represented by this combatant.",
    );
  const parsed = parseBattleMovement(
    input.activatedState,
    request.subject.actorId,
    movement,
    {
      kind: "budgetedMovement",
      movementBudgetFeet: speed.movementBudgetFeet,
      spendsTurnMovement: false,
    },
  );
  if (parsed.tag === "invalid")
    return invalidActivationMovement(request, parsed.message);
  return resolveActivationMovementEffects(
    input,
    parsed.movement,
    selection.effectFills,
  );
}
function resolveActivationMovementEffects(
  input: ActivationMovementInput,
  movement: BattleResolvedMovement,
  effectFills: readonly BattleFill[],
): BattleResolutionResult {
  const request = input.input;
  const threats = opportunityAttackThreatsForMovement(
    input.activatedState,
    movement,
  );
  if (threats.length > 0) {
    if (effectFills.length > 0)
      return invalidActivationMovement(
        request,
        "Movement effects are resolved after Opportunity Attacks.",
      );
    const interrupt = maybeOpenInterruptWindow(
      input.activatedState,
      {
        trigger: "opportunityAttack",
        moverId: request.subject.actorId,
        threats,
        continuation: { kind: "movement", subject: request.subject, movement },
      },
      undefined,
    );
    if (interrupt !== null) return interrupt;
  }
  const result = resolveMoveAfterMovement({
    state: input.activatedState,
    subject: request.subject,
    movement,
    remainingFills: effectFills,
  });
  return result.tag === "needsHoles"
    ? {
        ...result,
        state: request.state,
        snapshot: snapshotBattle(request.state),
      }
    : result.tag === "invalid"
      ? invalidActivationMovement(request, result.message)
      : result;
}
