// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard spell.invocation-jump-movement-replacement unit-feature.acrobatic-movement unit-feature.creature-space-movement-permission
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE

import { optionalProperty } from "../optional-property.ts";
import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import {
  canSpendMovement,
  markMovementSpentForMovementActionBonusActionExclusion,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  isIncapacitated,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { ordinaryMovementCost } from "@dnd/shared-algebras/movement-cost-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { MovementFeet, movementFeet } from "@dnd/shared/types";
import { Match } from "effect";
import { attackExecutionSelectionKey } from "../battle-action-options.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleAcrobaticMovementFact,
  BattleActiveEffect,
  BattleAreaDifficultTerrainMovementFact,
  BattleAreaDifficultTerrainSource,
  BattleBrutalStrikeForcefulBlowMovementFact,
  BattleCommandApproachMovementFact,
  BattleCommandFleeMovementFact,
  BattleCreatureSpaceTraversalMovementFact,
  BattleCreatureState,
  BattleFill,
  BattleGrappleDragMovementFact,
  BattleGustOfWindLineMovementFact,
  BattleJumpMovementReplacementFact,
  BattleMovementFillValue,
  BattleOpportunityAttackThreat,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleSpikeGrowthMovementDamageRollHole,
  BattleState,
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
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { rolledDiceFillForHole } from "./fill-hole-protocol.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { maxJumpMovementReplacementDistanceFeet } from "./jump-movement-replacement.ts";
import { validateLevitatedMovementFact } from "./levitate-creature.ts";
import { movementHole } from "./movement-holes.ts";
import {
  battleMovementBudgetForActor,
  combatantCanMoveWithBudget,
  creatureSizeIsLargerThanSelf,
  grappleTargetExemptFromDragCost,
  interruptAttackExecutionSelectionMatchesOption,
  opportunityAttackThreatsForMovement,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { standFromProneCostFeet } from "./stand-from-prone-policy.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import type { GustOfWindLineEffect } from "./persistent-spatial-spell-discovery.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyPreparedSlotSpellDamage } from "./spells-damage-fills.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";

const MOVEMENT_PROCEDURE_COMMANDS = [
  "move",
  "jumpMovementReplacement",
  "standFromProne",
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
    Match.when({ command: "jumpMovementReplacement" }, (subject) =>
      resolveJumpMovementReplacementCommand({ ...input, subject }),
    ),
    Match.when({ command: "standFromProne" }, (subject) =>
      resolveStandFromProneCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

function resolveMoveCommand(
  input: AdmittedBattleResolutionInput & {
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires a Movement fill first.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop */
  const fill = input.fills[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */
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

type JumpMovementReplacementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "jumpMovementReplacement" }
>;

function resolveJumpMovementReplacementCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "jumpMovementReplacement";
      }
    >
  >,
): BattleResolutionResult {
  const effect = jumpMovementReplacementEffectForSubject(
    input.state,
    input.subject,
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Jump movement replacement is not available.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement requires a Movement fill first.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((candidate) => candidate.kind === "movement").length !==
    1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement requires exactly one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const fill = input.fills[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Jump movement replacement hole.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
    { kind: "jumpMovementReplacement", effect },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */

  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const consumedState = markJumpMovementReplacementUsed(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop */
  const consumedState = markJumpMovementReplacementUsed(
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

function jumpMovementReplacementEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >,
): JumpMovementReplacementEffect | null {
  const actor = state.combatants.get(subject.actorId);
  /* v8 ignore start -- Discovery creates the replacement subject from this actor's active effect. */
  if (actor === undefined) {
    return null;
  }
  /* v8 ignore stop */
  return (
    actor.activeEffects.find(
      (effect): effect is JumpMovementReplacementEffect =>
        effect.kind === "jumpMovementReplacement" &&
        spellActiveEffectExecutionRef(effect) === subject.effectRef &&
        !effect.usedThisTurn,
    ) ?? null
  );
}

function markJumpMovementReplacementUsed(
  state: BattleState,
  actorId: CombatantId,
  consumedEffect: JumpMovementReplacementEffect,
): BattleState {
  const actor = state.combatants.get(actorId);
  /* v8 ignore start -- The subject is admitted from the same combatant map that supplied the consumed Jump effect. */
  if (actor === undefined) {
    return state;
  }
  /* v8 ignore stop */
  const activeEffects = actor.activeEffects.map((effect) =>
    effect.kind === "jumpMovementReplacement" &&
    effect.sourceCombatantId === consumedEffect.sourceCombatantId &&
    effect.sourceProcedureRef === consumedEffect.sourceProcedureRef
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stand from Prone accepts no fills.",
    );
  }
  /* v8 ignore stop */
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

type BattleMovementParseMode =
  | { readonly kind: "turnMovement" }
  | {
      readonly kind: "budgetedMovement";
      readonly movementBudgetFeet: MovementFeet;
      readonly spendsTurnMovement: boolean;
    }
  | {
      readonly kind: "jumpMovementReplacement";
      readonly effect: JumpMovementReplacementEffect;
    }
  | { readonly kind: "commandApproach" }
  | { readonly kind: "commandFlee" }
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    mover === undefined ||
    !representedMovementSpeedKinds(mover).includes(fill.value.speedKind)
  ) {
    return {
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!combatantCanMoveWithBudget(state, moverId, movementBudgetFeet)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fill.value.movementCostFeet <= 0 ||
    !Number.isInteger(fill.value.movementCostFeet)
  ) {
    return {
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  const movementCostFactValidation = validateMovementCostFacts(
    state,
    moverId,
    fill.value,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementCostFactValidation !== null) {
    return {
      tag: "invalid",
      message: movementCostFactValidation,
    };
  }
  /* v8 ignore stop */
  const acrobaticMovementValidation = validateAcrobaticMovementFact(
    state,
    mover,
    fill.value.acrobaticMovement,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (acrobaticMovementValidation !== null) {
    return {
      tag: "invalid",
      message: acrobaticMovementValidation,
    };
  }
  /* v8 ignore stop */
  const creatureSpaceTraversalValidation =
    validateCreatureSpaceTraversalMovementFact(
      state,
      mover,
      fill.value.creatureSpaceTraversal,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (creatureSpaceTraversalValidation !== null) {
    return {
      tag: "invalid",
      message: creatureSpaceTraversalValidation,
    };
  }
  /* v8 ignore stop */
  const areaExtraCostFeet = areaMovementExtraCostFeet(state, fill.value);
  const jumpMovementValidation = validateJumpMovementReplacementFact(
    state,
    moverId,
    fill.value.jumpMovementReplacement,
    mode.kind === "jumpMovementReplacement" ? mode.effect : undefined,
    fill.value.movementCostFeet,
    areaExtraCostFeet,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (jumpMovementValidation !== null) {
    return {
      tag: "invalid",
      message: jumpMovementValidation,
    };
  }
  /* v8 ignore stop */
  const levitatedMovementValidation = validateLevitatedMovementFact({
    combatant: mover,
    fact: fill.value.levitatedMovement,
    speedKind: fill.value.speedKind,
    movementCostFeet: fill.value.movementCostFeet,
    areaExtraCostFeet,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (levitatedMovementValidation !== null) {
    return {
      tag: "invalid",
      message: levitatedMovementValidation,
    };
  }
  /* v8 ignore stop */
  const commandApproachValidation = validateCommandApproachMovementFact(
    fill.value.commandApproach,
    mode.kind === "commandApproach",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (commandApproachValidation !== null) {
    return {
      tag: "invalid",
      message: commandApproachValidation,
    };
  }
  /* v8 ignore stop */
  const commandFleeValidation = validateCommandFleeMovementFact(
    fill.value.commandFlee,
    mode.kind === "commandFlee",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (commandFleeValidation !== null) {
    return {
      tag: "invalid",
      message: commandFleeValidation,
    };
  }
  /* v8 ignore stop */
  const brutalStrikeForcefulBlowValidation =
    validateBrutalStrikeForcefulBlowMovementFact(
      fill.value.brutalStrikeForcefulBlow,
      mode.kind === "brutalStrikeForcefulBlow" ? mode.targetId : undefined,
    );
  /* v8 ignore start -- Malformed Brutal Strike fill: the table-owned straight-toward-target fact must match the selected attack target. */
  if (brutalStrikeForcefulBlowValidation !== null) {
    return {
      tag: "invalid",
      message: brutalStrikeForcefulBlowValidation,
    };
  }
  /* v8 ignore stop */
  const movementCost = ordinaryMovementCost(
    movementFeet(fill.value.movementCostFeet),
    fill.value.speedKind,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Number(movementCost.costFeet) > Number(movementBudgetFeet)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  /* v8 ignore stop */
  const seen = new Set<string>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threat of fill.value.provokedOpportunityAttacks) {
    const reactorId = threat.reactorId;
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (reactorId === moverId) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat cannot name the mover as reactor.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!state.combatants.has(reactorId)) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown combatant.",
      };
    }
    /* v8 ignore stop */
    const attack = attackActionOptionsForActor(state, reactorId).find(
      (option) =>
        interruptAttackExecutionSelectionMatchesOption(threat, option),
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attack === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown attack option.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attackTargetConstraint(attack).kind !== "meleeReach") {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat must name a melee attack option.",
      };
    }
    /* v8 ignore stop */
    const threatKey = opportunityAttackThreatIdentityKey(reactorId, threat);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seen.has(threatKey)) {
      return {
        tag: "invalid",
        message: "Movement Opportunity Attack threat repeats an attack option.",
      };
    }
    /* v8 ignore stop */
    seen.add(threatKey);
    provokedOpportunityAttacks.push(threat);
  }
  return {
    tag: "ok",
    movement: {
      moverId,
      speedKind: fill.value.speedKind,
      movementCostFeet: movementCost.costFeet,
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
      ...optionalProperty("grappleDrag", fill.value.grappleDrag),
      ...optionalProperty(
        "creatureSpaceTraversal",
        fill.value.creatureSpaceTraversal,
      ),
      ...optionalProperty(
        "jumpMovementReplacement",
        fill.value.jumpMovementReplacement,
      ),
      ...optionalProperty("levitatedMovement", fill.value.levitatedMovement),
    },
  };
}

function opportunityAttackThreatIdentityKey(
  reactorId: CombatantId,
  selection: BattleInterruptAttackExecutionSelection,
): string {
  return JSON.stringify([reactorId, attackExecutionSelectionKey(selection)]);
}

type SpikeGrowthHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spikeGrowthHazard" }
>;

type SpikeGrowthMovementDamageRequest = {
  readonly effect: SpikeGrowthHazardEffect;
  readonly distanceFeet: MovementFeet;
  readonly damage: SpikeGrowthHazardEffect["damage"];
};

function spikeGrowthHazardEffectFor(
  state: BattleState,
  source: Extract<
    BattleAreaDifficultTerrainSource,
    { readonly kind: "spikeGrowthHazard" }
  >,
): SpikeGrowthHazardEffect | undefined {
  const combatant = state.combatants.get(source.sourceCombatantId);
  return combatant?.activeEffects.find(
    (effect): effect is SpikeGrowthHazardEffect =>
      effect.kind === "spikeGrowthHazard" &&
      effect.sourceCombatantId === source.sourceCombatantId &&
      effect.sourceProcedureRef === source.sourceProcedureRef &&
      effect.areaId === source.areaId,
  );
}

function scaledSpikeGrowthDamage(
  effect: SpikeGrowthHazardEffect,
  distanceFeet: MovementFeet,
): SpikeGrowthHazardEffect["damage"] | null {
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

function spikeGrowthMovementDamageRequests(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly SpikeGrowthMovementDamageRequest[] {
  const areaDifficultTerrain = movement.areaDifficultTerrain;
  if (areaDifficultTerrain === undefined) {
    return [];
  }
  return areaDifficultTerrain.sources.flatMap((source) => {
    if (source.kind !== "spikeGrowthHazard") {
      return [];
    }
    const effect = spikeGrowthHazardEffectFor(state, source);
    if (effect === undefined) {
      return [];
    }
    const damage = scaledSpikeGrowthDamage(effect, source.damageDistanceFeet);
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

function spikeGrowthMovementDamageRollHole(
  targetId: CombatantId,
  request: SpikeGrowthMovementDamageRequest,
): BattleSpikeGrowthMovementDamageRollHole {
  const key = `battle:spike-growth-movement-damage:${targetId}:${request.effect.sourceCombatantId}:${request.effect.sourceProcedureRef}:${request.effect.areaId}:${request.distanceFeet}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Movement damage",
    spikeGrowthMovement: {
      targetId,
      sourceProcedureRef: request.effect.sourceProcedureRef,
      sourceCombatantId: request.effect.sourceCombatantId,
      areaId: request.effect.areaId,
      distanceFeet: request.distanceFeet,
      damage: request.damage,
    },
    critical: false,
  };
}

function validateSpikeGrowthMovementDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleSpikeGrowthMovementDamageRollHole,
): string | null {
  /* v8 ignore start -- The selected Movement damage hole is the only hole admitted for this fill. */
  if (fill.holeId !== hole.holeId) {
    return "Spike Growth movement damage must use the selected damage hole.";
  }
  /* v8 ignore stop */
  return validateRolledDiceFillForDiceExpr(
    fill,
    hole.spikeGrowthMovement.damage.expr,
  );
}

function spikeGrowthMovementDamageAmount(
  state: BattleState,
  target: BattleCreatureState,
  request: SpikeGrowthMovementDamageRequest,
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
  const requests = spikeGrowthMovementDamageRequests(
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
    /* v8 ignore start -- Internal resolved-movement invariant: callers admit movement while its mover exists, applyBattleMovement preserves combatant keys, and Spike Growth damage never removes a combatant. This fallback only protects a direct malformed continuation call. */
    if (target === undefined) {
      return {
        tag: "resolved",
        state: nextState,
        remainingFills: input.extraFills.filter(
          (fill) => !consumedFills.has(fill),
        ),
      };
    }
    /* v8 ignore stop */
    const damageHole = spikeGrowthMovementDamageRollHole(
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
    const damageValidation = validateSpikeGrowthMovementDamageRoll(
      damageFill,
      damageHole,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop */

    const damageAmount = spikeGrowthMovementDamageAmount(
      input.state,
      target,
      request,
      damageFill,
    );
    const concentrationHole = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const concentrationFill =
      concentrationHole === null
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationSavingThrowFills.filter(
              (fill) =>
                fill.holeId === concentrationHole.holeId &&
                !consumedFills.has(fill),
            ),
            concentrationHole,
          );
    if (concentrationHole !== null && concentrationFill === undefined) {
      return needsHolesResult(input.state, input.subject, [concentrationHole]);
    }
    if (concentrationFill !== undefined) {
      consumedFills.add(concentrationFill);
    }

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
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    /* v8 ignore stop */
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
        wardingBondDamageShareConcentrationSavingThrows: [],
        hideousLaughterDamageRepeatSaves: [],
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
  /* v8 ignore start -- Malformed resolution input: a duplicate fill for a consumed Spike Growth hole is still owned by this procedure, even though fill kinds are shared with other procedures. */
  if (remainingFills.some((fill) => consumedHoleIds.has(fill.holeId))) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move received a fill that does not match a pending Spike Growth movement damage hole.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop */
  return {
    tag: "resolved",
    state: movementEffects.state,
    snapshot: snapshotBattle(movementEffects.state),
    movements: [input.movement],
  };
}

const byAreaDifficultTerrainSourceKind = Match.discriminator("kind");

function activeAreaDifficultTerrainSourceMatches(
  state: BattleState,
  source: BattleAreaDifficultTerrainSource,
): boolean {
  const sourceCombatant = state.combatants.get(source.sourceCombatantId);
  return Match.value(source).pipe(
    byAreaDifficultTerrainSourceKind(
      "greaseGroundHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "greaseGroundHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "webAreaHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "webRestraintHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "sleetStormHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "sleetStormAreaHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "insectPlagueHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "insectPlagueAreaHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "spikeGrowthHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "spikeGrowthHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    Match.exhaustive,
  );
}

function areaDifficultTerrainSourceKey(
  source: BattleAreaDifficultTerrainSource,
): string {
  return `${source.kind}\u0000${source.sourceCombatantId}\u0000${source.sourceProcedureRef}\u0000${source.areaId}`;
}

function validateAreaDifficultTerrainMovementFact(
  state: BattleState,
  fact: BattleAreaDifficultTerrainMovementFact | undefined,
): AreaMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fact.kind !== "areaDifficultTerrain") {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain movement fact has the wrong kind.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fact.sources.length === 0) {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain movement fact requires a source.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message:
        "Area Difficult Terrain total distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.difficultTerrainDistanceFeet) ||
    fact.difficultTerrainDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    Number(fact.difficultTerrainDistanceFeet) > Number(fact.totalDistanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Area Difficult Terrain distance cannot exceed total Movement distance.",
    };
  }
  /* v8 ignore stop */
  const sourceKeys = new Set<string>();
  let spikeGrowthDamageDistanceFeet = 0;
  for (const source of fact.sources) {
    const key = areaDifficultTerrainSourceKey(source);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sourceKeys.has(key)) {
      return {
        tag: "invalid",
        message: "Area Difficult Terrain movement fact repeats a source.",
      };
    }
    /* v8 ignore stop */
    sourceKeys.add(key);
    if (source.kind === "spikeGrowthHazard") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        !Number.isInteger(source.damageDistanceFeet) ||
        source.damageDistanceFeet <= 0
      ) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance must be a positive integer.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (Number(source.damageDistanceFeet) > Number(fact.totalDistanceFeet)) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance cannot exceed total Movement distance.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        Number(source.damageDistanceFeet) >
        Number(fact.difficultTerrainDistanceFeet)
      ) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance cannot exceed Difficult Terrain distance.",
        };
      }
      /* v8 ignore stop */
      spikeGrowthDamageDistanceFeet += Number(source.damageDistanceFeet);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!activeAreaDifficultTerrainSourceMatches(state, source)) {
      return {
        tag: "invalid",
        message:
          "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.",
      };
    }
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    spikeGrowthDamageDistanceFeet > Number(fact.difficultTerrainDistanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Spike Growth movement damage distances cannot exceed Difficult Terrain distance.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    totalDistanceFeet: fact.totalDistanceFeet,
    extraCostFeet: fact.difficultTerrainDistanceFeet,
  };
}

function validateGustOfWindLineMovementFact(
  state: BattleState,
  fact: BattleGustOfWindLineMovementFact | undefined,
): AreaMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fact.kind !== "gustOfWindLineMovement") {
    return {
      tag: "invalid",
      message: "Gust of Wind Line movement fact has the wrong kind.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Gust of Wind Line total distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.closerDistanceFeet) ||
    fact.closerDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Gust of Wind Line closer distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Number(fact.closerDistanceFeet) > Number(fact.totalDistanceFeet)) {
    return {
      tag: "invalid",
      message:
        "Gust of Wind Line closer distance cannot exceed total Movement distance.",
    };
  }
  /* v8 ignore stop */
  const source = state.combatants.get(fact.sourceCombatantId);
  const effect = source?.activeEffects.find(
    (candidate): candidate is GustOfWindLineEffect =>
      candidate.kind === "gustOfWindLine" &&
      candidate.sourceCombatantId === fact.sourceCombatantId &&
      candidate.sourceProcedureRef === fact.sourceProcedureRef &&
      candidate.areaId === fact.areaId &&
      candidate.directionId === fact.directionId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (effect === undefined) {
    return {
      tag: "invalid",
      message:
        "Gust of Wind Line movement fact does not match an active Gust of Wind Line.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    totalDistanceFeet: fact.totalDistanceFeet,
    extraCostFeet: movementFeet(
      Number(fact.closerDistanceFeet) * (effect.movementCost.multiplier - 1),
    ),
  };
}

type AreaMovementCostFactResult =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "ok";
      readonly totalDistanceFeet: MovementFeet;
      readonly extraCostFeet: MovementFeet;
    };

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
  /* v8 ignore start -- Defensive internal guard: movement dispatch admits only the current actor before the typed movement fill reaches this parser. */
  if (currentActorId(state) !== mover.combatantId) {
    return ACROBATIC_MOVEMENT_TURN_MESSAGE;
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Defensive boundary for direct parser callers that bypass BattleFillSchema. */
  if (!Array.isArray(fact.occupiedSpaces) || fact.occupiedSpaces.length === 0) {
    return CREATURE_SPACE_TRAVERSAL_MISSING_PERMISSION_MESSAGE;
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed traversal witness: the table adapter lists other creatures whose spaces the mover crosses, never the mover itself. */
  if (occupantId === mover.combatantId) {
    return CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE;
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed traversal witness: the table adapter emits each occupied creature once, so this rejects only a caller-mutated duplicate. */
  if (seenOccupants.has(occupantId)) {
    return CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE;
  }
  /* v8 ignore stop */
  const occupant = state.combatants.get(occupantId);
  /* v8 ignore start -- Malformed traversal witness: occupied-space selection is drawn from this battle, so this rejects only a caller-mutated foreign identity. */
  if (occupant === undefined) {
    return CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE;
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed creature-space traversal fill: ordinary movers may cross only Incapacitated occupants; the exceptional profile separately admits larger creatures. */
  if (!largerCreatureSpacePermission) {
    return CREATURE_SPACE_TRAVERSAL_MISSING_PERMISSION_MESSAGE;
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed traversal witness: the admitted exceptional table fact includes only creature spaces larger than the mover. */
  if (
    !creatureSizeIsLargerThanSelf(
      combatantEffectiveSize(mover),
      combatantEffectiveSize(occupant),
    )
  ) {
    return CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE;
  }
  /* v8 ignore stop */
  return null;
}

function creatureSpaceTraversalDestinationIssue(
  fact: BattleCreatureSpaceTraversalMovementFact,
): string | null {
  /* v8 ignore start -- Malformed traversal destination: the table adapter cannot select a position already named as occupied while labeling it unoccupied. */
  if (
    fact.destination.kind === "unoccupiedSpace" &&
    fact.occupiedSpaces.some(
      (occupiedSpace) =>
        occupiedSpace.positionId === fact.destination.positionId,
    )
  ) {
    return CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE;
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed traversal destination: creature-space traversal may pass through occupied spaces but the table adapter must select an unoccupied destination. */
  if (fact.destination.kind === "occupiedCreatureSpace") {
    return CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE;
  }
  /* v8 ignore stop */
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

function validateMovementCostFacts(
  state: BattleState,
  moverId: CombatantId,
  value: BattleMovementFillValue,
): string | null {
  const difficultTerrain = validateAreaDifficultTerrainMovementFact(
    state,
    value.areaDifficultTerrain,
  );
  /* v8 ignore start -- Malformed movement-cost fill: the area table adapter constructs the typed Difficult Terrain fact, so this only propagates a caller-mutated contradiction. */
  if (difficultTerrain.tag === "invalid") {
    return difficultTerrain.message;
  }
  /* v8 ignore stop */
  const gust = validateGustOfWindLineMovementFact(
    state,
    value.gustOfWindLineMovement,
  );
  /* v8 ignore start -- Malformed movement-cost fill: the Gust of Wind table adapter constructs the typed Line fact, so this only propagates a caller-mutated contradiction. */
  if (gust.tag === "invalid") {
    return gust.message;
  }
  /* v8 ignore stop */
  const grappleDrag = validateGrappleDragMovementFact(
    state,
    moverId,
    value.grappleDrag,
  );
  /* v8 ignore start -- Malformed movement-cost fill: the Grapple table adapter constructs the typed drag fact, so this only propagates a caller-mutated contradiction. */
  if (grappleDrag.tag === "invalid") {
    return grappleDrag.message;
  }
  /* v8 ignore stop */
  const areaCosts = [difficultTerrain, gust].filter(
    (
      result,
    ): result is Extract<AreaMovementCostFactResult, { readonly tag: "ok" }> =>
      result.tag === "ok",
  );
  if (areaCosts.length === 0) {
    if (grappleDrag.tag !== "ok") {
      return null;
    }
  }
  /* v8 ignore start -- Contradictory movement fill: the table adapter cannot combine Grapple drag with a spell-owned Jump replacement. */
  if (grappleDrag.tag === "ok" && value.jumpMovementReplacement !== undefined) {
    return "Grapple drag movement facts cannot be combined with Jump movement replacement.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Contradictory movement fill: the table adapter cannot combine Grapple drag with a Levitate altitude change. */
  if (
    grappleDrag.tag === "ok" &&
    value.levitatedMovement?.altitudeChange !== undefined
  ) {
    return "Grapple drag movement facts cannot be combined with Levitate altitude-change movement.";
  }
  /* v8 ignore stop */
  const firstAreaCost = areaCosts[0];
  const allCosts =
    grappleDrag.tag === "ok" ? [...areaCosts, grappleDrag] : areaCosts;
  const firstCost = allCosts[0];
  /* v8 ignore start -- The preceding area/Grapple admission guards prove that a non-empty cost list reaches this point. */
  if (firstCost === undefined) {
    return null;
  }
  /* v8 ignore stop */
  const remainingAreaCosts = areaCosts.slice(1);
  /* v8 ignore start -- Contradictory area witnesses: table-derived Difficult Terrain and Gust facts share one movement path and therefore one total distance. */
  if (
    firstAreaCost !== undefined &&
    remainingAreaCosts.some(
      (areaCost) =>
        Number(areaCost.totalDistanceFeet) !==
        Number(firstAreaCost.totalDistanceFeet),
    )
  ) {
    return "Area movement-cost facts must agree on total Movement distance.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Contradictory movement witnesses: all table-derived area and Grapple facts share one movement path and therefore one total distance. */
  if (
    allCosts
      .slice(1)
      .some(
        (cost) =>
          Number(cost.totalDistanceFeet) !==
          Number(firstCost.totalDistanceFeet),
      )
  ) {
    return "Movement-cost facts must agree on total Movement distance.";
  }
  /* v8 ignore stop */
  if (
    value.jumpMovementReplacement !== undefined ||
    value.levitatedMovement?.altitudeChange !== undefined
  ) {
    return null;
  }
  const expectedCostFeet = movementFeet(
    Number(firstCost.totalDistanceFeet) +
      allCosts.reduce((total, cost) => total + Number(cost.extraCostFeet), 0),
  );
  if (Number(value.movementCostFeet) === Number(expectedCostFeet)) {
    return null;
  }
  /* v8 ignore start -- Malformed combined-cost projection: the table adapter computes total distance plus every non-exempt area and Grapple increment before submitting the movement fill. */
  if (grappleDrag.tag === "ok" && areaCosts.length > 0) {
    return "Combined movement-cost facts must spend total distance plus all area and non-exempt grapple drag extra movement costs.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed Grapple-cost projection: the table adapter computes one extra foot per non-exempt dragged foot. */
  if (grappleDrag.tag === "ok") {
    return "Grapple drag movement must spend total distance plus 1 extra foot for every foot a non-exempt Grappled target is dragged.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed combined-area projection: the table adapter sums Difficult Terrain and Gust of Wind increments over their shared path. */
  if (difficultTerrain.tag === "ok" && gust.tag === "ok") {
    return "Combined area Difficult Terrain and Gust of Wind movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain and 1 extra foot for every foot moved closer to the caster through the Line.";
  }
  /* v8 ignore stop */
  /* v8 ignore next -- Malformed single-area projection: after the typed area facts above, this tail only reports which caller-supplied movement-cost total was inconsistent. */
  return difficultTerrain.tag === "ok"
    ? "Area Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain."
    : "Gust of Wind Line movement must spend total distance plus 1 extra foot for every foot moved closer to the caster through the Line.";
}

type GrappleDragMovementCostFactResult =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "ok";
      readonly totalDistanceFeet: MovementFeet;
      readonly extraCostFeet: MovementFeet;
    };

function validateGrappleDragMovementFact(
  state: BattleState,
  moverId: CombatantId,
  fact: BattleGrappleDragMovementFact | undefined,
): GrappleDragMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Grapple drag total distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  const seenTargets = new Set<CombatantId>();
  let extraCostFeet = 0;
  for (const target of fact.targets) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!Number.isInteger(target.distanceFeet) || target.distanceFeet <= 0) {
      return {
        tag: "invalid",
        message: "Grapple drag target distance must be a positive integer.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (Number(target.distanceFeet) > Number(fact.totalDistanceFeet)) {
      return {
        tag: "invalid",
        message:
          "Grapple drag target distance cannot exceed total Movement distance.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seenTargets.has(target.targetId)) {
      return {
        tag: "invalid",
        message: "Grapple drag movement fact repeats a target.",
      };
    }
    /* v8 ignore stop */
    seenTargets.add(target.targetId);
    const link = state.grapples.find(
      (candidate) =>
        candidate.grapplerId === moverId &&
        candidate.targetId === target.targetId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (link === undefined) {
      return {
        tag: "invalid",
        message:
          "Grapple drag movement fact must reference a creature Grappled by the mover.",
      };
    }
    /* v8 ignore stop */
    const grappler = state.combatants.get(link.grapplerId);
    const draggedTarget = state.combatants.get(link.targetId);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (grappler === undefined || draggedTarget === undefined) {
      return {
        tag: "invalid",
        message: "Grapple drag movement fact references a stale Grapple link.",
      };
    }
    /* v8 ignore stop */
    if (!grappleTargetExemptFromDragCost(grappler, draggedTarget)) {
      extraCostFeet += Number(target.distanceFeet);
    }
  }
  return {
    tag: "ok",
    totalDistanceFeet: fact.totalDistanceFeet,
    extraCostFeet: movementFeet(extraCostFeet),
  };
}

function areaMovementExtraCostFeet(
  state: BattleState,
  value: BattleMovementFillValue,
): MovementFeet {
  const difficultTerrain = validateAreaDifficultTerrainMovementFact(
    state,
    value.areaDifficultTerrain,
  );
  const gust = validateGustOfWindLineMovementFact(
    state,
    value.gustOfWindLineMovement,
  );
  return movementFeet(
    [difficultTerrain, gust].reduce(
      (total, result) =>
        result.tag === "ok" ? total + Number(result.extraCostFeet) : total,
      0,
    ),
  );
}

function validateJumpMovementReplacementFact(
  state: BattleState,
  moverId: CombatantId,
  fact: BattleJumpMovementReplacementFact | undefined,
  effect: JumpMovementReplacementEffect | undefined,
  movementCostFeet: MovementFeet,
  areaExtraCostFeet: MovementFeet,
): string | null {
  if (effect === undefined) {
    /* v8 ignore start -- Malformed movement fill: discovery does not request Jump facts for ordinary movement, so this rejects only caller-supplied cross-procedure data. */
    return fact === undefined
      ? null
      : "Jump movement replacement facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed Jump fill: discovery requests distance and landing facts whenever the active spell replacement is selected. */
  if (fact === undefined) {
    return "Jump movement replacement requires caller-supplied jump distance and landing facts.";
  }
  /* v8 ignore stop */
  const expectedMovementCostFeet = movementFeet(
    Number(effect.movementCostFeet) + Number(areaExtraCostFeet),
  );
  /* v8 ignore start -- Malformed Jump cost projection: the table adapter sums the spell-owned movement cost and any area surcharge. */
  if (movementCostFeet !== expectedMovementCostFeet) {
    return "Jump movement replacement must spend the spell's Movement cost plus any area movement costs.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed Jump distance: the table adapter supplies a positive whole-foot landing distance. */
  if (!Number.isInteger(fact.distanceFeet) || fact.distanceFeet <= 0) {
    return "Jump movement replacement distance must be a positive integer.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed Jump distance: the table adapter constrains the selected landing to the active spell's computed maximum. */
  if (
    Number(fact.distanceFeet) >
    Number(maxJumpMovementReplacementDistanceFeet(state, moverId, effect))
  ) {
    return "Jump movement replacement distance exceeds the active maximum.";
  }
  /* v8 ignore stop */
  return null;
}

function validateCommandApproachMovementFact(
  fact: BattleCommandApproachMovementFact | undefined,
  required: boolean,
): string | null {
  if (!required) {
    /* v8 ignore start -- Malformed Command fill: discovery does not request Approach route facts for ordinary movement. */
    return fact === undefined
      ? null
      : "Command Approach route facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed Command fill: discovery requests the table-owned Approach route whenever that command movement is pending. */
  if (fact === undefined) {
    return "Command Approach requires caller-supplied route facts.";
  }
  /* v8 ignore stop */
  return null;
}

function validateCommandFleeMovementFact(
  fact: BattleCommandFleeMovementFact | undefined,
  required: boolean,
): string | null {
  if (!required) {
    /* v8 ignore start -- Malformed Command fill: discovery does not request Flee route facts for ordinary movement. */
    return fact === undefined
      ? null
      : "Command Flee route facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed Command fill: discovery requests the table-owned Flee route whenever that command movement is pending. */
  if (fact === undefined) {
    return "Command Flee requires caller-supplied route facts.";
  }
  /* v8 ignore stop */
  return null;
}

function validateBrutalStrikeForcefulBlowMovementFact(
  fact: BattleBrutalStrikeForcefulBlowMovementFact | undefined,
  requiredTargetId: CombatantId | undefined,
): string | null {
  if (requiredTargetId === undefined) {
    /* v8 ignore start -- Malformed Brutal Strike fill: discovery requests this spatial fact only for Forceful Blow follow-up movement. */
    return fact === undefined
      ? null
      : "Brutal Strike Forceful Blow spatial facts cannot be supplied for ordinary Movement.";
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed Brutal Strike fill: the table adapter must attest that the path runs straight toward the pushed target. */
  if (fact === undefined) {
    return "Brutal Strike Forceful Blow requires caller-supplied straight-toward-target facts.";
  }
  if (fact.targetId !== requiredTargetId) {
    return "Brutal Strike Forceful Blow movement must be straight toward the attack target.";
  }
  /* v8 ignore stop */
  return null;
}
