// Readied spell and movement release handling extracted from turn-end-movement.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature

import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveSpellRelease } from "./spells-resolve-release.ts";
import { opportunityAttackThreatsForMovement } from "./movement-speed.ts";
import {
  parseBattleMovement,
  resolveMovementEffectsAfterMovement,
} from "./turn-end-movement.ts";
import {
  readiedMovementBudgetForActor,
  readiedMovementHole,
} from "./movement-holes.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import {
  currentInterruptCheckpoint,
  maybeOpenInterruptWindow,
} from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import type {
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { MOVEMENT_HOLE_ID } from "./battle-runtime-protocol.ts";
import { characterSpellProcedure } from "../character-execution-queries.ts";
import { isReadiedSpellInvocation } from "./spells-discovery.ts";

export function resolveReleaseReadiedSpellCommand(
  input: BattleResolutionInput,
  options: {
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
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
  if (readied === undefined || readied.procedureRef !== subject.procedureRef) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No matching readied spell is currently being held.",
    );
  }
  const caster = input.state.combatants.get(casterId);
  const invocation =
    caster?.origin.kind === "character"
      ? characterSpellProcedure(
          caster.origin.execution,
          readied.procedureRef,
          caster,
        )
      : undefined;
  if (invocation === undefined || !isReadiedSpellInvocation(invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The readied spell procedure is no longer available.",
    );
  }

  const releaseSubject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" }
  > = {
    tag: "actionSpell",
    actorId: casterId,
    procedureRef: readied.procedureRef,
    mode: { tag: "cast" },
  };
  const released = resolveSpellRelease(
    {
      state: input.state,
      subject: releaseSubject,
      fills: input.fills,
      handledInterruptTrigger: options.handledInterruptTrigger,
      reactionContinuationSubject: input.subject,
    },
    invocation,
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
  const activeInterrupt = currentInterruptCheckpoint(
    input.state,
  )?.activeInterrupt;
  if (
    activeInterrupt === undefined ||
    activeInterrupt.responderId !== readiedMovementActorId ||
    !sameBattleSubject(activeInterrupt.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Readied Movement release requires an active interrupt checkpoint.",
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Readied Movement requires a Movement fill first.",
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
      "Release Readied Movement requires exactly one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const fill = input.fills[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied Movement fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
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
    const readiedMovements = new Map(input.state.readiedMovements);
    readiedMovements.delete(readiedMovementActorId);
    const stateWithoutReadied = { ...input.state, readiedMovements };
    const reactionWindow = maybeOpenInterruptWindow(
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
      "Release Readied Movement only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop */
  const readiedMovements = new Map(movementEffects.state.readiedMovements);
  readiedMovements.delete(readiedMovementActorId);
  const stateWithoutReadied = { ...movementEffects.state, readiedMovements };
  return {
    tag: "resolved",
    state: stateWithoutReadied,
    snapshot: snapshotBattle(stateWithoutReadied),
  };
}
