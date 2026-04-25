import { Either, Match } from "effect";
import { nextInitiative } from "@dnd/shared/initiative-algebra";
import type { CreatureId } from "@dnd/shared/types";

import { resolveCoreAttackHoles } from "#/reducer-core-attack.ts";
import {
  requireNoMissingHoles,
  requireValidHoleInputs,
} from "#/reducer-hole-refilling.ts";
import { interpretSubject } from "#/reducer-interpretation.ts";
import type { State } from "#/reducer-state.ts";
import type {
  FilledHoleValue,
  ResolutionInvalid,
  ResolutionRequest,
  ResolutionResult,
  RuntimeHole,
} from "#/reducer-types.ts";
import type { ActivationPhase } from "@dnd/prototype-content-surface/surface/types";

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

function resolveCoreEndTurn(state: State): ResolutionResult {
  const initiative = nextInitiative(state.initiative);

  return {
    tag: "resolved",
    state: {
      ...state,
      initiative,
      currentActionsAvailable: 1,
      currentHasBonusAction: true,
      currentHasFreeAction: true,
    },
  };
}

function currentAttackRollHole(
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<
  Extract<RuntimeHole, { readonly kind: "attackRoll" }>,
  ResolutionInvalid
> {
  const attackRollHoles = holes.filter(
    (hole): hole is Extract<RuntimeHole, { readonly kind: "attackRoll" }> =>
      hole.kind === "attackRoll",
  );

  if (attackRollHoles.length !== 1) {
    return Either.left(
      invalid(
        `expected exactly one attack-roll hole in current phase, got ${attackRollHoles.length}`,
      ),
    );
  }

  const [attackRollHole] = attackRollHoles;
  return Either.right(attackRollHole);
}

function requireAttackRollFill(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<number, ResolutionInvalid> {
  return Either.gen(function* () {
    const attackRollHole = yield* currentAttackRollHole(holes);
    const value = yield* Either.fromNullable(
      filledHoleValues.find(
        (candidate) => candidate.holeId === attackRollHole.holeId,
      ),
      () => invalid("missing filled attack roll for current phase"),
    );

    if (value.kind !== "attackRoll") {
      return yield* Either.left(
        invalid(
          `filled value kind ${value.kind} does not match hole ${attackRollHole.holeId}`,
        ),
      );
    }

    return value.value;
  });
}

function currentTargetChoiceHole(
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<
  Extract<RuntimeHole, { readonly kind: "targetChoice" }>,
  ResolutionInvalid
> {
  const targetChoiceHoles = holes.filter(
    (hole): hole is Extract<RuntimeHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );

  if (targetChoiceHoles.length !== 1) {
    return Either.left(
      invalid(
        `expected exactly one target-choice hole in current phase, got ${targetChoiceHoles.length}`,
      ),
    );
  }

  const [targetChoiceHole] = targetChoiceHoles;
  return Either.right(targetChoiceHole);
}

function requireTargetChoiceFill(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<CreatureId, ResolutionInvalid> {
  return Either.gen(function* () {
    const targetChoiceHole = yield* currentTargetChoiceHole(holes);
    const value = yield* Either.fromNullable(
      filledHoleValues.find(
        (candidate) => candidate.holeId === targetChoiceHole.holeId,
      ),
      () => invalid("missing filled target choice for current phase"),
    );

    if (value.kind !== "targetChoice") {
      return yield* Either.left(
        invalid(
          `filled value kind ${value.kind} does not match hole ${targetChoiceHole.holeId}`,
        ),
      );
    }

    return value.value;
  });
}

function requireValidCreatureTarget(
  state: State,
  actorId: CreatureId,
  targetId: CreatureId,
): Either.Either<CreatureId, ResolutionInvalid> {
  if (targetId === actorId) {
    return Either.left(invalid("invalid attack target"));
  }

  if (!state.combatants.has(targetId)) {
    return Either.left(invalid("invalid attack target"));
  }

  return Either.right(targetId);
}

function resolveFilledActivationPhase(
  state: State,
  actorId: CreatureId,
  phase: ActivationPhase,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  currentHoles: ReadonlyArray<RuntimeHole>,
): ResolutionResult {
  return Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, (attackRollPhase) =>
      Either.gen(function* () {
        if (attackRollPhase.attachment.kind !== "hole") {
          return yield* Either.left(
            invalid("current slice expects hole-backed attack-roll attachment"),
          );
        }

        if (attackRollPhase.attachment.value.kind !== "target") {
          return yield* Either.left(
            invalid(
              "current slice expects target attachment for attack-roll units",
            ),
          );
        }

        const targetId = yield* requireTargetChoiceFill(
          filledHoleValues,
          currentHoles,
        );
        yield* requireValidCreatureTarget(state, actorId, targetId);
        yield* requireAttackRollFill(filledHoleValues, currentHoles);

        return invalid(
          "attack-roll unit damage application is not implemented yet",
        );
      }).pipe(Either.merge),
    ),
    Match.when({ kind: "save_gate" }, () =>
      invalid("save-gate unit outcome application is not implemented yet"),
    ),
    Match.when({ kind: "direct" }, () =>
      invalid("direct unit effect application is not implemented yet"),
    ),
    Match.when({ kind: "ability_check_gate" }, () =>
      invalid("ability-check unit execution is not supported by current slice"),
    ),
    Match.when({ kind: "random_table" }, () =>
      invalid("random-table unit execution is not supported by current slice"),
    ),
    Match.exhaustive,
  );
}

export function resolveSubjectHoles(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  return Either.match(interpretSubject(state, request.subject), {
    onLeft: (invalidResult) => invalidResult,
    onRight: (interpreted) =>
      Match.value(interpreted).pipe(
        Match.when({ tag: "coreAttack" }, () =>
          resolveCoreAttackHoles(state, request.filledHoleValues),
        ),
        Match.when({ tag: "coreEndTurn" }, () => resolveCoreEndTurn(state)),
        Match.when({ tag: "unit" }, (act) => {
          const holes = requireValidHoleInputs(
            request.filledHoleValues,
            act.initialHoles,
          );
          if (Either.isLeft(holes)) {
            return holes.left;
          }

          const filledHoles = requireNoMissingHoles(
            request.filledHoleValues,
            holes.right,
          );
          if (Either.isLeft(filledHoles)) {
            return filledHoles.left;
          }
          return resolveFilledActivationPhase(
            state,
            act.subject.actorId,
            act.phase,
            request.filledHoleValues,
            holes.right,
          );
        }),
        Match.exhaustive,
      ),
  });
}
