// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard spell.invocation-jump-movement-replacement unit-feature.acrobatic-movement unit-feature.creature-space-movement-permission
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE

import { optionalProperty } from "../optional-property.ts";
import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import {
  canSpendMovement,
  markMovementSpentForMovementActionBonusActionExclusion,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  applyCondition,
  isIncapacitated,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { MovementFeet, movementFeet } from "@dnd/shared/types";
import { Match } from "effect";
import {
  attackExecutionSelectionForOption,
  attackExecutionSelectionKey,
  type BoundSupportedAttackActionOption,
} from "../battle-action-options.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleAcrobaticMovementFact,
  BattleAreaDifficultTerrainSource,
  BattleBrutalStrikeForcefulBlowMovementFact,
  BattleCompelledApproachMovementFact,
  BattleCompelledFleeMovementFact,
  BattleCreatureSpaceTraversalMovementFact,
  BattleCreatureState,
  BattleFill,
  BattleFixedCostMovementReplacementFact,
  BattleMovementFillValue,
  BattleOpportunityAttackThreat,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleAreaMovementDistanceDamageRollHole,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import {
  type BattleInterruptAttackExecutionSelection,
  type BattleRuntimeCommand,
  type BattleSubject,
} from "../battle-subjects.ts";
import type { UnitSupportProcedureExecution } from "../character-execution-queries.ts";
import { CombatantId } from "../identity.ts";
import {
  attackActionOptionsForActor,
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { applyBattleMovement } from "./battle-movement.ts";
import { MOVEMENT_HOLE_ID } from "./battle-runtime-protocol.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state-execution.ts";
import {
  combatantWearingArmor,
  combatantWieldingShield,
  currentActorId,
  zeroHpLifecycleIsTerminal,
} from "./creature-state-leaves.ts";
import {
  concentrationSavingThrowHole,
  resolveSaveGatedConditionDamageRepeatSave,
} from "./damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { rolledDiceFillForHole } from "./fill-hole-protocol.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { validateControlledVerticalSuspensionMovementFact } from "./controlled-vertical-suspension.ts";
import {
  boundAreaMovementDistanceDamageEffect,
  type BoundAreaMovementDistanceDamageEffect,
} from "./persistent-spell-area-binding.ts";
import { maxFixedCostMovementReplacementDistanceFeet } from "./fixed-cost-movement-replacement.ts";
import {
  boundFixedCostMovementReplacementEffect,
  type BoundFixedCostMovementReplacementEffect,
} from "./spell-modifier-binding.ts";
import { movementHole } from "./movement-holes.ts";
import {
  battleMovementPathCostFeet,
  battleMovementPathDragsGrappledCreature,
  plainStepMovementActivity,
  priceBattleMovementPath,
  type BattleMovementPathCost,
} from "./movement-path.ts";
import {
  battleMovementBudgetForActor,
  combatantCanMoveWithBudget,
  creatureSizeIsLargerThanSelf,
  interruptAttackExecutionSelectionMatchesOption,
  opportunityAttackThreatsForMovement,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { dropProneAvailable } from "./drop-prone-policy.ts";
import { standFromProneCostFeet } from "./stand-from-prone-policy.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyPreparedSlotSpellDamage } from "./spells-damage-fills.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { saveGatedConditionDamageOccurrenceKeyForHoleTarget } from "./staged-condition-repeat-save.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";
import { attackTargetIsLegal } from "./attack-spatial.ts";

const MOVEMENT_PROCEDURE_COMMANDS = [
  "move",
  "fixedCostMovementReplacement",
  "standFromProne",
  "dropProne",
] as const satisfies ReadonlyArray<BattleRuntimeCommand>;

type MovementProcedureSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: (typeof MOVEMENT_PROCEDURE_COMMANDS)[number];
  }
>;

export function isMovementProcedureSubject(
  subject: BattleSubject,
): subject is MovementProcedureSubject {
  return (
    subject.tag === "runtimeCommand" &&
    MOVEMENT_PROCEDURE_COMMANDS.some((command) => command === subject.command)
  );
}

export function resolveMovementProcedure(
  input: Extract<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "general" }
  > & {
    readonly subject: MovementProcedureSubject;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  return Match.value(input.subject).pipe(
    Match.when({ command: "move" }, (subject) =>
      resolveMoveCommand({ ...input, subject }),
    ),
    Match.when({ command: "fixedCostMovementReplacement" }, (subject) =>
      resolveFixedCostMovementReplacementCommand({ ...input, subject }),
    ),
    Match.when({ command: "standFromProne" }, (subject) =>
      resolveStandFromProneCommand({ ...input, subject }),
    ),
    Match.when({ command: "dropProne" }, (subject) =>
      resolveDropProneCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

function resolveMoveCommand(
  input: Extract<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "general" }
  > & {
    readonly subject: Extract<
      MovementProcedureSubject,
      { readonly command: "move" }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  if (!canSpendMovement(input.state.currentTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movement is no longer available for the current actor.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires a Movement fill first.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((candidate) => candidate.kind === "movement").length !==
    1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires exactly one Movement fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const fill = input.fills[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop -- @preserve */
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  const reactionWindow = movementOpportunityReactionWindow(
    input,
    movement.movement,
    threats,
  );
  if (reactionWindow !== null) return reactionWindow;
  return resolveMoveAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    remainingFills: input.fills.slice(1),
  });
}

function movementOpportunityReactionWindow(
  input: AdmittedBattleResolutionInput & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
  movement: BattleResolvedMovement,
  threats: readonly BattleOpportunityAttackThreat[],
): BattleResolutionResult | null {
  if (
    threats.length === 0 ||
    input.handledInterruptTrigger === "opportunityAttack"
  ) {
    return null;
  }
  return maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "opportunityAttack",
      moverId: input.subject.actorId,
      threats,
      continuation: {
        kind: "movement",
        subject: input.subject,
        movement,
      },
    },
    undefined,
  );
}

type FixedCostMovementReplacementEffect =
  BoundFixedCostMovementReplacementEffect;

function resolveFixedCostMovementReplacementCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "fixedCostMovementReplacement";
      }
    >
  >,
): BattleResolutionResult {
  const effect = fixedCostMovementReplacementEffectForSubject(
    input.state,
    input.subject,
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "distance-multiplier effect movement replacement is not available.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "distance-multiplier effect movement replacement requires a Movement fill first.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((candidate) => candidate.kind === "movement").length !==
    1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "distance-multiplier effect movement replacement requires exactly one Movement fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const fill = input.fills[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested distance-multiplier effect movement replacement hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
    { kind: "fixedCostMovementReplacement", effect },
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop -- @preserve */

  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const consumedState = markFixedCostMovementReplacementUsed(
      input.state,
      input.subject.actorId,
      effect,
    );
    const reactionWindow = maybeOpenInterruptWindow(
      consumedState,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    extraFills: input.fills.slice(1),
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "distance-multiplier effect movement replacement only accepts Movement, area movement-distance damage damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const consumedState = markFixedCostMovementReplacementUsed(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  return {
    tag: "resolved",
    state: consumedState,
    snapshot: snapshotBattle(consumedState),
  };
}

function fixedCostMovementReplacementEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "fixedCostMovementReplacement";
    }
  >,
): FixedCostMovementReplacementEffect | null {
  const actor = state.combatants.get(subject.actorId);
  /* v8 ignore start -- @preserve -- Discovery creates the replacement subject from this actor's active effect. */
  if (actor === undefined) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const effect = actor.activeEffects.find(
    (candidate) =>
      candidate.kind === "fixedCostMovementReplacement" &&
      spellActiveEffectExecutionRef(candidate) === subject.effectRef &&
      !candidate.usedThisTurn,
  );
  return effect?.kind === "fixedCostMovementReplacement"
    ? (boundFixedCostMovementReplacementEffect(state, effect) ?? null)
    : null;
}

function markFixedCostMovementReplacementUsed(
  state: BattleState,
  actorId: CombatantId,
  consumedEffect: FixedCostMovementReplacementEffect,
): BattleState {
  const actor = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- The subject is admitted from the same combatant map that supplied the consumed Jump effect. */
  if (actor === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const activeEffects = actor.activeEffects.map((effect) =>
    effect.kind === "fixedCostMovementReplacement" &&
    spellActiveEffectExecutionRef(effect) ===
      spellActiveEffectExecutionRef(consumedEffect)
      ? { ...effect, usedThisTurn: true }
      : effect,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeEffects,
    }),
  };
}

function resolveStandFromProneCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stand from Prone accepts no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.state.combatants.get(input.subject.actorId);
  const cost = standFromProneCostFeet(input.state, input.subject.actorId);
  if (
    actor === undefined ||
    cost === null ||
    !canSpendMovement(input.state.currentTurnResources)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stand from Prone is no longer available.",
    );
  }
  const nextActor = {
    ...battleCreatureStateWithKnockOutPreservedConditions(
      actor,
      removeCondition(actor.conditions, "prone"),
    ),
    movementSpentFeet: movementFeet(Number(actor.movementSpentFeet) + cost),
  };
  const nextState = {
    ...input.state,
    currentTurnResources:
      markMovementSpentForMovementActionBonusActionExclusion(
        input.state.currentTurnResources,
      ),
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveDropProneCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Drop Prone accepts no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined || !dropProneAvailable(input.state, actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Drop Prone is no longer available.",
    );
  }
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      battleCreatureStateWithKnockOutPreservedConditions(
        actor,
        applyCondition(actor.conditions, "prone"),
      ),
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

type BattleMovementParseMode =
  | { readonly kind: "turnMovement" }
  | {
      readonly kind: "budgetedMovement";
      readonly movementBudgetFeet: MovementFeet;
      readonly spendsTurnMovement: boolean;
    }
  | {
      readonly kind: "fixedCostMovementReplacement";
      readonly effect: FixedCostMovementReplacementEffect;
    }
  | { readonly kind: "compelledApproach" }
  | { readonly kind: "compelledFlee" }
  | {
      readonly kind: "brutalStrikeForcefulBlow";
      readonly targetId: CombatantId;
      readonly movementBudgetFeet: MovementFeet;
    };

export function parseBattleMovement(
  state: BattleState,
  moverId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  mode: BattleMovementParseMode = { kind: "turnMovement" },
):
  | { readonly tag: "ok"; readonly movement: BattleResolvedMovement }
  | { readonly tag: "invalid"; readonly message: string } {
  const movementBudgetFeet =
    mode.kind === "budgetedMovement" || mode.kind === "brutalStrikeForcefulBlow"
      ? mode.movementBudgetFeet
      : battleMovementBudgetForActor(state, moverId, fill.value.speedKind)
          .remainingFeet;
  const mover = state.combatants.get(moverId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    mover === undefined ||
    !representedMovementSpeedKinds(mover).includes(fill.value.speedKind)
  ) {
    return {
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!combatantCanMoveWithBudget(state, moverId, movementBudgetFeet)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  /* v8 ignore stop -- @preserve */
  const pathCost = priceBattleMovementPath(state, mover, fill.value);
  if (pathCost.tag === "invalid") {
    return { tag: "invalid", message: pathCost.message };
  }
  const dragIssue = grappleDragMovementCombinationIssue(fill.value);
  /* v8 ignore start -- @preserve -- Contradictory movement fill: the table adapter cannot combine Grapple drag with a spell-owned Jump replacement or a ControlledVerticalSuspension altitude change. */
  if (dragIssue !== null) {
    return { tag: "invalid", message: dragIssue };
  }
  /* v8 ignore stop -- @preserve */
  const acrobaticMovementValidation = validateAcrobaticMovementFact(
    state,
    mover,
    fill.value.acrobaticMovement,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (acrobaticMovementValidation !== null) {
    return {
      tag: "invalid",
      message: acrobaticMovementValidation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const creatureSpaceTraversalValidation =
    validateCreatureSpaceTraversalMovementFact(
      state,
      mover,
      fill.value.creatureSpaceTraversal,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (creatureSpaceTraversalValidation !== null) {
    return {
      tag: "invalid",
      message: creatureSpaceTraversalValidation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const fixedCostMovementReplacement = validateFixedCostMovementReplacementFact(
    state,
    moverId,
    fill.value.fixedCostMovementReplacement,
    mode,
    pathCost,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fixedCostMovementReplacement.tag === "invalid") {
    return {
      tag: "invalid",
      message: fixedCostMovementReplacement.message,
    };
  }
  /* v8 ignore stop -- @preserve */
  const controlledVerticalSuspensionMovementValidation =
    validateControlledVerticalSuspensionMovementFact({
      state,
      combatant: mover,
      fact: fill.value.controlledVerticalSuspensionMovement,
      path: fill.value.path,
      pathCost,
    });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (controlledVerticalSuspensionMovementValidation !== null) {
    return {
      tag: "invalid",
      message: controlledVerticalSuspensionMovementValidation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const compelledApproachValidation = validateCompelledApproachMovementFact(
    fill.value.compelledApproach,
    mode.kind === "compelledApproach",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (compelledApproachValidation !== null) {
    return {
      tag: "invalid",
      message: compelledApproachValidation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const compelledFleeValidation = validateCompelledFleeMovementFact(
    fill.value.compelledFlee,
    mode.kind === "compelledFlee",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (compelledFleeValidation !== null) {
    return {
      tag: "invalid",
      message: compelledFleeValidation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const brutalStrikeForcefulBlowValidation =
    validateBrutalStrikeForcefulBlowMovementFact(
      fill.value.brutalStrikeForcefulBlow,
      mode,
    );
  /* v8 ignore start -- @preserve -- Malformed Brutal Strike fill: the table-owned straight-toward-target fact must match the selected attack target. */
  if (brutalStrikeForcefulBlowValidation !== null) {
    return {
      tag: "invalid",
      message: brutalStrikeForcefulBlowValidation,
    };
  }
  /* v8 ignore stop -- @preserve */
  const movementCostFeet = fixedCostMovementReplacement.costFeet;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Number(movementCostFeet) > Number(movementBudgetFeet)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const seen = new Set<string>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threat of fill.value.provokedOpportunityAttacks) {
    const reactorId = threat.reactorId;
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (reactorId === moverId) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat cannot name the mover as reactor.",
      };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!state.combatants.has(reactorId)) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown combatant.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const attack = attackActionOptionsForActor(state, reactorId).find(
      (option) =>
        interruptAttackExecutionSelectionMatchesOption(threat, option),
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attack === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown attack option.",
      };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    const attackIssue = opportunityAttackThreatAttackIssue(
      state,
      moverId,
      reactorId,
      threat,
      attack,
    );
    if (attackIssue !== null) {
      return {
        tag: "invalid",
        message: attackIssue,
      };
    }
    /* v8 ignore stop -- @preserve */
    const threatKey = opportunityAttackThreatIdentityKey(reactorId, threat);
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seen.has(threatKey)) {
      return {
        tag: "invalid",
        message: "Movement Opportunity Attack threat repeats an attack option.",
      };
    }
    /* v8 ignore stop -- @preserve */
    seen.add(threatKey);
    provokedOpportunityAttacks.push(threat);
  }
  return {
    tag: "ok",
    movement: {
      moverId,
      speedKind: fill.value.speedKind,
      movementCostFeet,
      provokedOpportunityAttacks,
      spendsTurnMovement:
        mode.kind === "budgetedMovement"
          ? mode.spendsTurnMovement
          : mode.kind === "brutalStrikeForcefulBlow"
            ? false
            : true,
      ...optionalProperty("acrobaticMovement", fill.value.acrobaticMovement),
      ...optionalProperty(
        "areaDifficultTerrain",
        fill.value.areaDifficultTerrain,
      ),
      ...optionalProperty(
        "creatureSpaceTraversal",
        fill.value.creatureSpaceTraversal,
      ),
      ...optionalProperty(
        "fixedCostMovementReplacement",
        fill.value.fixedCostMovementReplacement,
      ),
      ...optionalProperty(
        "controlledVerticalSuspensionMovement",
        fill.value.controlledVerticalSuspensionMovement,
      ),
    },
  };
}

function opportunityAttackThreatAttackIssue(
  state: BattleState,
  moverId: CombatantId,
  reactorId: CombatantId,
  threat: BattleOpportunityAttackThreat,
  attack: BoundSupportedAttackActionOption,
): string | null {
  if (attackTargetConstraint(attack).kind !== "meleeReach") {
    return "Movement Opportunity Attack threat must name a melee attack option.";
  }
  const distanceFact: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "attackTargetDistance" }
  > = {
    kind: "attackTargetDistance",
    actorId: reactorId,
    targetId: moverId,
    ...attackExecutionSelectionForOption(attack),
    distanceFeet: threat.distanceFeet,
  };
  return attackTargetIsLegal(state, reactorId, moverId, attack, [distanceFact])
    ? null
    : "Movement Opportunity Attack threat distance is outside the selected attack's reach.";
}

function opportunityAttackThreatIdentityKey(
  reactorId: CombatantId,
  selection: BattleInterruptAttackExecutionSelection,
): string {
  return JSON.stringify([reactorId, attackExecutionSelectionKey(selection)]);
}

type AreaMovementDistanceDamageEffect = BoundAreaMovementDistanceDamageEffect;

type AreaMovementDistanceDamageRequest = {
  readonly effect: AreaMovementDistanceDamageEffect;
  readonly distanceFeet: MovementFeet;
  readonly damage: AreaMovementDistanceDamageEffect["damage"];
};

function areaMovementDistanceDamageEffectFor(
  state: BattleState,
  source: Extract<
    BattleAreaDifficultTerrainSource,
    { readonly kind: "areaMovementDistanceDamage" }
  >,
): AreaMovementDistanceDamageEffect | undefined {
  const combatant = state.combatants.get(source.sourceCombatantId);
  const effect = combatant?.activeEffects.find(
    (candidate) => candidate.effectRef === source.effectRef,
  );
  return effect?.kind === "areaMovementDistanceDamage" &&
    effect.sourceCombatantId === source.sourceCombatantId &&
    effect.sourceProcedureRef === source.sourceProcedureRef &&
    effect.areaId === source.areaId
    ? boundAreaMovementDistanceDamageEffect(state, effect)
    : undefined;
}

function scaledAreaMovementDistanceDamageDamage(
  effect: AreaMovementDistanceDamageEffect,
  distanceFeet: MovementFeet,
): AreaMovementDistanceDamageEffect["damage"] | null {
  const increments = Math.floor(
    Number(distanceFeet) / Number(effect.damagePerFeet),
  );
  if (increments <= 0) {
    return null;
  }
  return {
    expr: {
      dice: effect.damage.expr.dice * increments,
      dieSize: effect.damage.expr.dieSize,
      ...(effect.damage.expr.flat === undefined
        ? {}
        : { flat: effect.damage.expr.flat * increments }),
    },
    damageType: effect.damage.damageType,
  };
}

function areaMovementDistanceDamageRequests(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly AreaMovementDistanceDamageRequest[] {
  const areaDifficultTerrain = movement.areaDifficultTerrain;
  if (areaDifficultTerrain === undefined) {
    return [];
  }
  return areaDifficultTerrain.sources.flatMap((source) => {
    if (source.kind !== "areaMovementDistanceDamage") {
      return [];
    }
    const effect = areaMovementDistanceDamageEffectFor(state, source);
    if (effect === undefined) {
      return [];
    }
    const damage = scaledAreaMovementDistanceDamageDamage(
      effect,
      source.damageDistanceFeet,
    );
    return damage === null
      ? []
      : [
          {
            effect,
            distanceFeet: source.damageDistanceFeet,
            damage,
          },
        ];
  });
}

function areaMovementDistanceDamageRollHole(
  targetId: CombatantId,
  request: AreaMovementDistanceDamageRequest,
): BattleAreaMovementDistanceDamageRollHole {
  const key = `battle:area-movement-distance-damage-movement-damage:${targetId}:${request.effect.effectRef}:${request.distanceFeet}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Movement damage",
    areaMovementDistanceDamage: {
      targetId,
      effectRef: request.effect.effectRef,
      sourceProcedureRef: request.effect.sourceProcedureRef,
      sourceCombatantId: request.effect.sourceCombatantId,
      areaId: request.effect.areaId,
      distanceFeet: request.distanceFeet,
      damage: request.damage,
    },
    critical: false,
  };
}

function validateAreaMovementDistanceDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleAreaMovementDistanceDamageRollHole,
): string | null {
  /* v8 ignore start -- @preserve -- The selected Movement damage hole is the only hole admitted for this fill. */
  if (fill.holeId !== hole.holeId) {
    return "area movement-distance damage movement damage must use the selected damage hole.";
  }
  /* v8 ignore stop -- @preserve */
  return validateRolledDiceFillForDiceExpr(
    fill,
    hole.areaMovementDistanceDamage.damage.expr,
  );
}

function areaMovementDistanceDamageAmount(
  state: BattleState,
  target: BattleCreatureState,
  request: AreaMovementDistanceDamageRequest,
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  return damageAmountAfterTargetAdjustments(
    state,
    target,
    rolledDiceTotal(fill.value) + (request.damage.expr.flat ?? 0),
    request.damage.damageType,
  );
}

type MovementEffectsAfterMovementResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly remainingFills: readonly BattleFill[];
    }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" | "needsHoles" }>;

type MovementDamageConcentrationResolution =
  | {
      readonly tag: "resolved";
      readonly fill:
        | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
        | undefined;
    }
  | {
      readonly tag: "needsHole";
      readonly hole: NonNullable<
        ReturnType<typeof concentrationSavingThrowHole>
      >;
    };

function resolveMovementDamageConcentration(
  target: BattleCreatureState,
  damageAmount: number,
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  consumedFills: Set<BattleFill>,
): MovementDamageConcentrationResolution {
  const hole = concentrationSavingThrowHole(target, damageAmount);
  if (hole === null) return { tag: "resolved", fill: undefined };
  const fill = concentrationSavingThrowFillFor(
    fills.filter(
      (candidate) =>
        candidate.holeId === hole.holeId && !consumedFills.has(candidate),
    ),
    hole,
  );
  if (fill === undefined) return { tag: "needsHole", hole };
  consumedFills.add(fill);
  return { tag: "resolved", fill };
}

export function resolveMovementEffectsAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly movement: BattleResolvedMovement;
  readonly extraFills: readonly BattleFill[];
}): MovementEffectsAfterMovementResult {
  const rolledDiceFills = input.extraFills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice",
  );
  const concentrationSavingThrowFills = input.extraFills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const damageDispositionFills = input.extraFills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "attackDamageDisposition" }
    > => fill.kind === "attackDamageDisposition",
  );
  const consumedFills = new Set<BattleFill>();

  const movedState = applyBattleMovement(input.state, input.movement);
  const requests = areaMovementDistanceDamageRequests(
    movedState,
    input.movement,
  );
  if (requests.length === 0) {
    return {
      tag: "resolved",
      state: movedState,
      remainingFills: input.extraFills,
    };
  }

  let nextState = movedState;
  for (const request of requests) {
    const target = nextState.combatants.get(input.movement.moverId);
    /* v8 ignore start -- @preserve -- Internal resolved-movement invariant: callers admit movement while its mover exists, applyBattleMovement preserves combatant keys, and area movement-distance damage damage never removes a combatant. This fallback only protects a direct malformed continuation call. */
    if (target === undefined) {
      return {
        tag: "resolved",
        state: nextState,
        remainingFills: input.extraFills.filter(
          (fill) => !consumedFills.has(fill),
        ),
      };
    }
    /* v8 ignore stop -- @preserve */
    const damageHole = areaMovementDistanceDamageRollHole(
      input.movement.moverId,
      request,
    );
    const unconsumedRolledDiceFills = rolledDiceFills.filter(
      (fill) => !consumedFills.has(fill),
    );
    const damageFill = rolledDiceFillForHole(
      unconsumedRolledDiceFills,
      damageHole,
    );
    if (damageFill === undefined) {
      return needsHolesResult(input.state, input.subject, [damageHole]);
    }
    consumedFills.add(damageFill);
    const damageValidation = validateAreaMovementDistanceDamageRoll(
      damageFill,
      damageHole,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop -- @preserve */

    const damageAmount = areaMovementDistanceDamageAmount(
      input.state,
      target,
      request,
      damageFill,
    );
    const damageRepeatSave = resolveSaveGatedConditionDamageRepeatSave({
      state: nextState,
      target,
      damageAmount,
      fills: input.extraFills.filter(
        (
          fill,
        ): fill is Extract<
          BattleFill,
          { readonly kind: "savingThrowOutcome" }
        > => fill.kind === "savingThrowOutcome" && !consumedFills.has(fill),
      ),
      damageOccurrenceKey: saveGatedConditionDamageOccurrenceKeyForHoleTarget({
        holeId: damageHole.holeId,
        targetId: target.combatantId,
      }),
    });
    if (damageRepeatSave.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        damageRepeatSave.message,
      );
    }
    if (damageRepeatSave.tag === "needsHoles") {
      return needsHolesResult(
        input.state,
        input.subject,
        damageRepeatSave.missingHoles,
      );
    }
    for (const fill of damageRepeatSave.context.fills) {
      consumedFills.add(fill);
    }
    const concentrationResolution = resolveMovementDamageConcentration(
      target,
      damageAmount,
      concentrationSavingThrowFills,
      consumedFills,
    );
    if (concentrationResolution.tag === "needsHole") {
      return needsHolesResult(input.state, input.subject, [
        concentrationResolution.hole,
      ]);
    }
    const concentrationFill = concentrationResolution.fill;

    const damageDispositionHole = zeroHitPointReplacementDispositionHole({
      damageSourceId: request.effect.sourceCombatantId,
      target,
      damageAmount,
    });
    const damageDispositionHoles =
      damageDispositionHole === null ? [] : [damageDispositionHole];
    const damageDispositionValidation = damageDispositionFillsValidation({
      holes: damageDispositionHoles,
      fills: damageDispositionFills.filter(
        (fill) =>
          !consumedFills.has(fill) &&
          damageDispositionHoles.some((hole) => hole.holeId === fill.holeId),
      ),
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    /* v8 ignore stop -- @preserve */
    const missingDispositionHole = damageDispositionHoles.find(
      (hole) =>
        damageDispositionFillFor(
          damageDispositionFills.filter((fill) => !consumedFills.has(fill)),
          hole,
        ) === undefined,
    );
    if (missingDispositionHole !== undefined) {
      return needsHolesResult(input.state, input.subject, [
        missingDispositionHole,
      ]);
    }
    for (const hole of damageDispositionHoles) {
      const dispositionFill = damageDispositionFillFor(
        damageDispositionFills.filter((fill) => !consumedFills.has(fill)),
        hole,
      );
      if (dispositionFill !== undefined) {
        consumedFills.add(dispositionFill);
      }
    }

    nextState = applyPreparedSlotSpellDamage(
      nextState,
      input.movement.moverId,
      damageAmount,
      {
        damageSourceId: request.effect.sourceCombatantId,
        concentrationSavingThrow: concentrationFill,
        damageDisposition: damageDispositionForTarget(
          damageDispositionHoles,
          damageDispositionFills,
          input.movement.moverId,
        ),
        linkedDefenseResistanceDamageShareConcentrationSavingThrows: [],
        saveGatedConditionDamageRepeatSave: damageRepeatSave.context,
        spatialFacts: [],
      },
    );
  }
  const remainingFills = input.extraFills.filter(
    (fill) => !consumedFills.has(fill),
  );
  const consumedHoleIds = new Set(
    [...consumedFills].map((fill) => fill.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: a duplicate fill for a consumed area movement-distance damage hole is still owned by this procedure, even though fill kinds are shared with other procedures. */
  if (remainingFills.some((fill) => consumedHoleIds.has(fill.holeId))) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move received a fill that does not match a pending area movement-distance damage movement damage hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    state: nextState,
    remainingFills,
  };
}

export function resolveMoveAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly movement: BattleResolvedMovement;
  readonly remainingFills: readonly BattleFill[];
}): BattleResolutionResult {
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.remainingFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move only accepts Movement, area movement-distance damage damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    state: movementEffects.state,
    snapshot: snapshotBattle(movementEffects.state),
    movements: [input.movement],
  };
}

const ACROBATIC_MOVEMENT_REPEATED_PATH_MESSAGE =
  "Acrobatic Movement path witness repeats a traversal path.";

const ACROBATIC_MOVEMENT_MISSING_PROFILE_MESSAGE =
  "Acrobatic Movement requires a selected Acrobatic Movement support profile.";

const ACROBATIC_MOVEMENT_EQUIPMENT_MESSAGE =
  "Acrobatic Movement requires the mover to be unarmored and not wielding a Shield.";

const ACROBATIC_MOVEMENT_TURN_MESSAGE =
  "Acrobatic Movement can be used only on the mover's turn.";

function validateAcrobaticMovementFact(
  state: BattleState,
  mover: BattleCreatureState,
  fact: BattleAcrobaticMovementFact | undefined,
): string | null {
  if (fact === undefined) {
    return null;
  }
  const profile = acrobaticMovementProfileForCombatant(mover);
  if (profile === null) {
    return ACROBATIC_MOVEMENT_MISSING_PROFILE_MESSAGE;
  }
  /* v8 ignore start -- @preserve -- Defensive internal guard: movement dispatch admits only the current actor before the typed movement fill reaches this parser. */
  if (currentActorId(state) !== mover.combatantId) {
    return ACROBATIC_MOVEMENT_TURN_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  if (
    combatantWearingArmor(state, mover) ||
    combatantWieldingShield(state, mover)
  ) {
    return ACROBATIC_MOVEMENT_EQUIPMENT_MESSAGE;
  }
  const seenPaths = new Set<string>();
  for (const path of fact.paths) {
    if (seenPaths.has(path)) {
      return ACROBATIC_MOVEMENT_REPEATED_PATH_MESSAGE;
    }
    seenPaths.add(path);
  }
  return null;
}

function acrobaticMovementProfileForCombatant(
  combatant: BattleCreatureState,
): Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "acrobaticMovement" }
> | null {
  if (combatant.origin.kind !== "character") {
    return null;
  }
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === "acrobaticMovement"
    ) {
      return procedure.execution;
    }
  }
  return null;
}

const CREATURE_SPACE_TRAVERSAL_MISSING_PERMISSION_MESSAGE =
  "Creature-space traversal requires an Incapacitated occupant or a selected occupied-creature-space movement permission profile.";

const CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE =
  "Creature-space traversal cannot name the mover as the occupied creature.";

const CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE =
  "Creature-space traversal movement fact repeats an occupied creature.";

const CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE =
  "Creature-space traversal references an unknown occupied creature.";

const CREATURE_SPACE_TRAVERSAL_TERMINAL_OCCUPANT_MESSAGE =
  "Creature-space traversal cannot classify a terminal zero-Hit-Point combatant as an occupied creature.";

const CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE =
  "Creature-space traversal requires each occupied creature to be larger than the mover.";

const CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE =
  "Creature-space traversal cannot end in an occupied creature space.";

const CREATURE_SPACE_TRAVERSAL_VALIDATION_MESSAGES = new Set<string>([
  CREATURE_SPACE_TRAVERSAL_MISSING_PERMISSION_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_TERMINAL_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE,
]);

export function isCreatureSpaceTraversalMovementFactValidationMessage(
  message: string,
): boolean {
  return CREATURE_SPACE_TRAVERSAL_VALIDATION_MESSAGES.has(message);
}

function validateCreatureSpaceTraversalMovementFact(
  state: BattleState,
  mover: BattleCreatureState,
  fact: BattleCreatureSpaceTraversalMovementFact | undefined,
): string | null {
  if (fact === undefined) {
    return null;
  }
  const largerCreatureSpacePermission =
    creatureSpaceMovementPermissionProfileForCombatant(mover) !== null;
  /* v8 ignore start -- @preserve -- Defensive boundary for direct parser callers that bypass BattleFillSchema. */
  if (!Array.isArray(fact.occupiedSpaces) || fact.occupiedSpaces.length === 0) {
    return CREATURE_SPACE_TRAVERSAL_MISSING_PERMISSION_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  const seenOccupants = new Set<CombatantId>();
  for (const occupiedSpace of fact.occupiedSpaces) {
    const occupantIssue = creatureSpaceTraversalOccupantIssue(
      state,
      mover,
      occupiedSpace.occupantId,
      seenOccupants,
      largerCreatureSpacePermission,
    );
    if (occupantIssue !== null) return occupantIssue;
    seenOccupants.add(occupiedSpace.occupantId);
  }
  return creatureSpaceTraversalDestinationIssue(fact);
}

function creatureSpaceTraversalOccupantIssue(
  state: BattleState,
  mover: BattleCreatureState,
  occupantId: CombatantId,
  seenOccupants: ReadonlySet<CombatantId>,
  largerCreatureSpacePermission: boolean,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed traversal witness: the table adapter lists other creatures whose spaces the mover crosses, never the mover itself. */
  if (occupantId === mover.combatantId) {
    return CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed traversal witness: the table adapter emits each occupied creature once, so this rejects only a caller-mutated duplicate. */
  if (seenOccupants.has(occupantId)) {
    return CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  const occupant = state.combatants.get(occupantId);
  /* v8 ignore start -- @preserve -- Malformed traversal witness: occupied-space selection is drawn from this battle, so this rejects only a caller-mutated foreign identity. */
  if (occupant === undefined) {
    return CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  if (zeroHpLifecycleIsTerminal(occupant)) {
    return CREATURE_SPACE_TRAVERSAL_TERMINAL_OCCUPANT_MESSAGE;
  }
  return creatureSpaceTraversalPermissionIssue(
    mover,
    occupant,
    largerCreatureSpacePermission,
  );
}

function creatureSpaceTraversalPermissionIssue(
  mover: BattleCreatureState,
  occupant: BattleCreatureState,
  largerCreatureSpacePermission: boolean,
): string | null {
  if (isIncapacitated(occupant.conditions)) return null;
  /* v8 ignore start -- @preserve -- Malformed creature-space traversal fill: ordinary movers may cross only Incapacitated occupants; the exceptional profile separately admits larger creatures. */
  if (!largerCreatureSpacePermission) {
    return CREATURE_SPACE_TRAVERSAL_MISSING_PERMISSION_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed traversal witness: the admitted exceptional table fact includes only creature spaces larger than the mover. */
  if (
    !creatureSizeIsLargerThanSelf(
      combatantEffectiveSize(mover),
      combatantEffectiveSize(occupant),
    )
  ) {
    return CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function creatureSpaceTraversalDestinationIssue(
  fact: BattleCreatureSpaceTraversalMovementFact,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed traversal destination: the table adapter cannot select a position already named as occupied while labeling it unoccupied. */
  if (
    fact.destination.kind === "unoccupiedSpace" &&
    fact.occupiedSpaces.some(
      (occupiedSpace) =>
        occupiedSpace.positionId === fact.destination.positionId,
    )
  ) {
    return CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed traversal destination: creature-space traversal may pass through occupied spaces but the table adapter must select an unoccupied destination. */
  if (fact.destination.kind === "occupiedCreatureSpace") {
    return CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE;
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function creatureSpaceMovementPermissionProfileForCombatant(
  combatant: BattleCreatureState,
): Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "creatureSpaceMovementPermission" }
> | null {
  if (combatant.origin.kind !== "character") {
    return null;
  }
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === "creatureSpaceMovementPermission"
    ) {
      return procedure.execution;
    }
  }
  return null;
}

const PRONE_FIXED_COST_MOVEMENT_REPLACEMENT_MESSAGE =
  "A Prone creature can only crawl or right itself, so it can't use a distance-multiplier effect movement replacement.";

type FixedCostMovementReplacementCostResult =
  | { readonly tag: "ok"; readonly costFeet: MovementFeet }
  | { readonly tag: "invalid"; readonly message: string };

/**
 * The move's cost. An ordinary move spends its priced path. A
 * distance-multiplier effect's jump spends the spell's fixed Movement cost
 * instead: SRD 5.2.1 Jump lets the target "jump up to 30 feet by spending 10
 * feet of movement", so the path's crawling, climbing, swimming and table
 * Difficult Terrain extras don't apply; landing in Difficult Terrain is the
 * landing's Acrobatics check. Cited spell areas still add their surcharges.
 * A Prone creature can't jump: its only movement options are to crawl or to
 * right itself (Rules Glossary "Prone").
 */
function validateFixedCostMovementReplacementFact(
  state: BattleState,
  moverId: CombatantId,
  fact: BattleFixedCostMovementReplacementFact | undefined,
  mode: BattleMovementParseMode,
  pathCost: BattleMovementPathCost,
): FixedCostMovementReplacementCostResult {
  if (mode.kind !== "fixedCostMovementReplacement") {
    /* v8 ignore start -- @preserve -- Malformed movement fill: discovery does not request Jump facts for ordinary movement, so this rejects only caller-supplied cross-procedure data. */
    return fact === undefined
      ? { tag: "ok", costFeet: battleMovementPathCostFeet(pathCost) }
      : {
          tag: "invalid",
          message:
            "distance-multiplier effect movement replacement facts cannot be supplied for ordinary Movement.",
        };
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed Jump fill: discovery requests landing facts whenever the active spell replacement is selected. */
  if (fact === undefined) {
    return {
      tag: "invalid",
      message:
        "distance-multiplier effect movement replacement requires caller-supplied landing facts.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const mover = state.combatants.get(moverId);
  if (mover !== undefined && plainStepMovementActivity(mover) === "crawling") {
    return {
      tag: "invalid",
      message: PRONE_FIXED_COST_MOVEMENT_REPLACEMENT_MESSAGE,
    };
  }
  const effect = mode.effect;
  /* v8 ignore start -- @preserve -- Malformed Jump distance: the table adapter constrains the selected landing to the active spell's computed maximum. */
  if (
    Number(pathCost.distanceFeet) >
    Number(maxFixedCostMovementReplacementDistanceFeet(state, moverId, effect))
  ) {
    return {
      tag: "invalid",
      message:
        "distance-multiplier effect movement replacement distance exceeds the active maximum.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    costFeet: movementFeet(
      Number(effect.movementCostFeet) + Number(pathCost.spellAreaExtraCostFeet),
    ),
  };
}

function grappleDragMovementCombinationIssue(
  value: BattleMovementFillValue,
): string | null {
  if (!battleMovementPathDragsGrappledCreature(value)) {
    return null;
  }
  if (value.fixedCostMovementReplacement !== undefined) {
    return "Grapple drag movement cannot be combined with distance-multiplier effect movement replacement.";
  }
  if (
    value.controlledVerticalSuspensionMovement?.altitudeChange !== undefined
  ) {
    return "Grapple drag movement cannot be combined with ControlledVerticalSuspension altitude-change movement.";
  }
  return null;
}

function validateCompelledApproachMovementFact(
  fact: BattleCompelledApproachMovementFact | undefined,
  required: boolean,
): string | null {
  if (!required) {
    /* v8 ignore start -- @preserve -- Malformed Command fill: discovery does not request Approach route facts for ordinary movement. */
    return fact === undefined
      ? null
      : "Compelled approach route facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed Command fill: discovery requests the table-owned Approach route whenever that command movement is pending. */
  if (fact === undefined) {
    return "Compelled approach requires caller-supplied route facts.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function validateCompelledFleeMovementFact(
  fact: BattleCompelledFleeMovementFact | undefined,
  required: boolean,
): string | null {
  if (!required) {
    /* v8 ignore start -- @preserve -- Malformed Command fill: discovery does not request Flee route facts for ordinary movement. */
    return fact === undefined
      ? null
      : "Compelled flee route facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed Command fill: discovery requests the table-owned Flee route whenever that command movement is pending. */
  if (fact === undefined) {
    return "Compelled flee requires caller-supplied route facts.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function validateBrutalStrikeForcefulBlowMovementFact(
  fact: BattleBrutalStrikeForcefulBlowMovementFact | undefined,
  mode: BattleMovementParseMode,
): string | null {
  if (mode.kind !== "brutalStrikeForcefulBlow") {
    /* v8 ignore start -- @preserve -- Malformed Brutal Strike fill: discovery requests this spatial fact only for Forceful Blow follow-up movement. */
    return fact === undefined
      ? null
      : "Brutal Strike Forceful Blow spatial facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed Brutal Strike fill: the table adapter must attest that the path runs straight toward the pushed target. */
  if (fact === undefined) {
    return "Brutal Strike Forceful Blow requires caller-supplied straight-toward-target facts.";
  }
  if (fact.targetId !== mode.targetId) {
    return "Brutal Strike Forceful Blow movement must be straight toward the attack target.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}
