// Readied spell and movement release handling extracted from turn-end-movement.ts.

import type { BattleReactionTrigger } from "../battle-reaction-triggers.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import { movementFeet } from "@dnd/shared/types";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  spellDamageTypeChoiceHole,
  spellSavingThrowOutcomeHole,
  spellTargetAllocationHole,
  spellTargetHole,
  supportedSpellInvocationRef,
} from "./spells-holes-fills.ts";
import { resolveSpellRelease } from "./spells-resolve.ts";
import {
  combatantCanMoveWithBudget,
  battleMovementBudgetForActor,
  movementHoleHasRemainingBudget,
  opportunityAttackThreatsForMovement,
} from "./movement-speed.ts";
import {
  parseBattleMovement,
  readiedMovementHole,
  readiedMovementBudgetForActor,
} from "./turn-end-movement.ts";
import { normalizeBattleGrapples } from "./creature-state-leaves.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import {
  currentReactionFrame,
  maybeOpenReactionWindow,
  snapshotBattle,
} from "./dispatcher.ts";
import type { CombatantId } from "../identity.ts";
import type {
  BattleHole,
  BattleReadiedSpell,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleState,
} from "../battle-reducer.ts";
import { MOVEMENT_HOLE_ID } from "../battle-reducer.ts";

export function applyBattleMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): BattleState {
  const mover = state.combatants.get(movement.moverId);
  if (
    mover === undefined ||
    !combatantCanMoveWithBudget(
      state,
      movement.moverId,
      movement.spendsTurnMovement
        ? battleMovementBudgetForActor(
            state,
            movement.moverId,
            movement.speedKind,
          ).remainingFeet
        : readiedMovementBudgetForActor(
            state,
            movement.moverId,
            movement.speedKind,
          ),
    )
  ) {
    return state;
  }
  const nextMover = movement.spendsTurnMovement
    ? {
        ...mover,
        movementSpentFeet: movementFeet(
          Number(mover.movementSpentFeet) + Number(movement.movementCostFeet),
        ),
      }
    : mover;
  const combatants = new Map(state.combatants).set(movement.moverId, nextMover);
  return normalizeBattleGrapples({
    ...state,
    combatants,
  });
}

export function readiedSpellInitialHoles(
  state: BattleState,
  casterId: CombatantId,
  readied: BattleReadiedSpell,
): readonly BattleHole[] {
  if (readied.invocation.procedure === "saveGatedDamage") {
    return readied.invocation.targeting.kind === "singleCombatant"
      ? [spellTargetHole(state, casterId, readied.invocation)]
      : [spellSavingThrowOutcomeHole(state, casterId, readied.invocation)];
  }
  if (readied.invocation.procedure === "repeatedDamageAllocation") {
    return [spellTargetAllocationHole(state, casterId, readied.invocation)];
  }
  if (readied.invocation.procedure === "chainedSpellAttackDamage") {
    return [spellDamageTypeChoiceHole(readied.invocation)];
  }
  return [spellTargetHole(state, casterId, readied.invocation)];
}

export function readiedMovementInitialHoles(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleHole[] {
  const hole = readiedMovementHole(state, actorId);
  return movementHoleHasRemainingBudget(hole) ? [hole] : [];
}

export function resolveReleaseReadiedSpellCommand(
  input: BattleResolutionInput,
  options: {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  if (input.subject.tag !== "runtimeCommand") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Release Readied Spell requires a runtime command subject.",
    );
  }
  const subject = input.subject;
  if (subject.command !== "releaseReadiedSpell") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Release Readied Spell requires a release command subject.",
    );
  }
  const casterId = subject.readiedSpellCasterId;
  const readied = input.state.readiedSpells.get(casterId);
  if (readied === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No readied spell is currently being held.",
    );
  }

  const releaseSubject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" }
  > = {
    tag: "actionSpell",
    actorId: casterId,
    invocation: supportedSpellInvocationRef(readied.invocation),
    mode: { tag: "cast" },
  };
  const released = resolveSpellRelease(
    {
      state: input.state,
      subject: releaseSubject,
      fills: input.fills,
      suppressedReactionTrigger: options.suppressedReactionTrigger,
      reactionContinuationSubject: input.subject,
    },
    readied.invocation,
  );
  if (released.tag === "needsHoles") {
    return { ...released, subject: input.subject };
  }
  if (released.tag !== "resolved") {
    return released;
  }
  const readiedSpells = new Map(released.state.readiedSpells);
  readiedSpells.delete(casterId);
  const withoutReadied = breakBattleConcentration(
    { ...released.state, readiedSpells },
    casterId,
  );
  return {
    tag: "resolved",
    state: withoutReadied,
    snapshot: snapshotBattle(withoutReadied),
  };
}

export function resolveReleaseReadiedMovementCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "releaseReadiedMovement";
      }
    >
  >,
): BattleResolutionResult {
  const readiedMovementActorId = input.subject.readiedMovementActorId;
  const activeReaction = currentReactionFrame(input.state)?.activeReaction;
  if (
    activeReaction === undefined ||
    activeReaction.reactorId !== readiedMovementActorId ||
    !sameBattleSubject(activeReaction.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Readied Movement release requires an active Reaction window.",
    );
  }
  const readied = input.state.readiedMovements.get(readiedMovementActorId);
  if (readied === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No readied movement is currently being held.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      readiedMovementHole(input.state, readiedMovementActorId),
    ]);
  }
  if (input.fills.length > 1 || input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Readied Movement requires exactly one Movement fill.",
    );
  }
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied Movement fill does not match the requested hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    readiedMovementActorId,
    fill,
    {
      movementBudgetFeet: readiedMovementBudgetForActor(
        input.state,
        readiedMovementActorId,
        fill.value.speedKind,
      ),
      spendsTurnMovement: true,
    },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const readiedMovements = new Map(input.state.readiedMovements);
  readiedMovements.delete(readiedMovementActorId);
  const stateWithoutReadied = { ...input.state, readiedMovements };
  const threats = opportunityAttackThreatsForMovement(
    stateWithoutReadied,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      stateWithoutReadied,
      {
        trigger: "opportunityAttack",
        moverId: readiedMovementActorId,
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
  const nextState = applyBattleMovement(stateWithoutReadied, movement.movement);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
