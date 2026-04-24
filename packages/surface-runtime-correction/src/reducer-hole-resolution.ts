import { Either, Match } from "effect";
import { nextInitiative } from "@dnd/shared/initiative-algebra";

import { resolveCoreAttackHoles } from "#/reducer-core-attack.ts";
import {
  requireNoMissingHoles,
  requireValidHoleInputs,
} from "#/reducer-hole-refilling.ts";
import { interpretSubject } from "#/reducer-interpretation.ts";
import type { State } from "#/reducer-state.ts";
import type {
  ResolutionInvalid,
  ResolutionRequest,
  ResolutionResult,
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

function resolveFilledActivationPhase(
  phase: ActivationPhase,
): ResolutionResult {
  return Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, () =>
      invalid("attack-roll unit damage application is not implemented yet"),
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
  const interpreted = interpretSubject(state, request.subject);
  if (Either.isLeft(interpreted)) {
    return interpreted.left;
  }

  return Match.value(interpreted.right).pipe(
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

      return resolveFilledActivationPhase(act.phase);
    }),
    Match.exhaustive,
  );
}
