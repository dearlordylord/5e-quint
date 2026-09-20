// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

import { Match } from "effect";

import {
  deathSaveCount,
  type DeathSaveCount,
  type D20Roll,
  type DeathSavingThrowCount,
} from "@dnd/shared/types";

export type {
  DeathSaveCount,
  D20Roll,
  DeathSavingThrowCount,
} from "@dnd/shared/types";

export type DeathSaves = {
  readonly successes: DeathSaveCount;
  readonly failures: DeathSaveCount;
};

type DeathSavingThrowSaves = {
  readonly successes: DeathSavingThrowCount;
  readonly failures: DeathSavingThrowCount;
};

export type DeathSaveRuntimeState =
  | {
      readonly tag: "dying";
      readonly deathSaves: DeathSavingThrowSaves;
    }
  | {
      readonly tag: "stable";
    }
  | {
      readonly tag: "dead";
    };

export type DeathSavingThrowOutcome =
  | { readonly tag: "noHitPointRecovery" }
  | { readonly tag: "regainedHitPoint" };

export type DeathSavingThrowResult = {
  readonly state: DeathSaveRuntimeState;
  readonly outcome: DeathSavingThrowOutcome;
};

const NO_HIT_POINT_RECOVERY: DeathSavingThrowOutcome = {
  tag: "noHitPointRecovery",
};

const REGAINED_HIT_POINT: DeathSavingThrowOutcome = {
  tag: "regainedHitPoint",
};

const ZERO_DEATH_SAVE_COUNT = deathSaveCount(0);
const ONE_DEATH_SAVE_COUNT = deathSaveCount(1);
const TWO_DEATH_SAVE_COUNT = deathSaveCount(2);
const THREE_DEATH_SAVE_COUNT = deathSaveCount(3);

function isDeathSavingThrowCount(
  value: DeathSaveCount,
): value is DeathSavingThrowCount {
  return value !== THREE_DEATH_SAVE_COUNT;
}

function dyingDeathSaveState(
  successes: DeathSavingThrowCount,
  failures: DeathSavingThrowCount,
): DeathSaveRuntimeState {
  return {
    tag: "dying",
    deathSaves: { successes, failures },
  };
}

function stableDeathSaveState(): DeathSaveRuntimeState {
  return { tag: "stable" };
}

function deadDeathSaveState(): DeathSaveRuntimeState {
  return { tag: "dead" };
}

export const DEATH_SAVES_RESET: DeathSaves = Object.freeze({
  successes: ZERO_DEATH_SAVE_COUNT,
  failures: ZERO_DEATH_SAVE_COUNT,
});

export function resetDeathSaveRuntimeState(): DeathSaveRuntimeState {
  return {
    tag: "dying",
    deathSaves: {
      successes: ZERO_DEATH_SAVE_COUNT,
      failures: ZERO_DEATH_SAVE_COUNT,
    },
  };
}

export function resetDeathSaves(): DeathSaves {
  return {
    successes: ZERO_DEATH_SAVE_COUNT,
    failures: ZERO_DEATH_SAVE_COUNT,
  };
}

export function deathSaveStateIsStable(state: DeathSaveRuntimeState): boolean {
  return Match.value(state).pipe(
    Match.when({ tag: "dying" }, () => false),
    Match.when({ tag: "stable" }, () => true),
    Match.when({ tag: "dead" }, () => false),
    Match.exhaustive,
  );
}

export function deathSaveStateIsDead(state: DeathSaveRuntimeState): boolean {
  return Match.value(state).pipe(
    Match.when({ tag: "dying" }, () => false),
    Match.when({ tag: "stable" }, () => false),
    Match.when({ tag: "dead" }, () => true),
    Match.exhaustive,
  );
}

export function deathSaveStateSuccesses(
  state: DeathSaveRuntimeState,
): DeathSavingThrowCount {
  return Match.value(state).pipe(
    Match.when({ tag: "dying" }, ({ deathSaves }) => deathSaves.successes),
    Match.when(
      { tag: "stable" },
      (): DeathSavingThrowCount => ZERO_DEATH_SAVE_COUNT,
    ),
    Match.when(
      { tag: "dead" },
      (): DeathSavingThrowCount => ZERO_DEATH_SAVE_COUNT,
    ),
    Match.exhaustive,
  );
}

export function deathSaveStateFailures(
  state: DeathSaveRuntimeState,
): DeathSaveCount {
  return Match.value(state).pipe(
    Match.when({ tag: "dying" }, ({ deathSaves }) => deathSaves.failures),
    Match.when({ tag: "stable" }, (): DeathSaveCount => ZERO_DEATH_SAVE_COUNT),
    Match.when({ tag: "dead" }, (): DeathSaveCount => THREE_DEATH_SAVE_COUNT),
    Match.exhaustive,
  );
}

export function deathSavingThrowRegainedHitPoint(
  outcome: DeathSavingThrowOutcome,
): boolean {
  return Match.value(outcome).pipe(
    Match.when({ tag: "noHitPointRecovery" }, () => false),
    Match.when({ tag: "regainedHitPoint" }, () => true),
    Match.exhaustive,
  );
}

export function addDeathFailures(
  state: DeathSaveRuntimeState,
  count: DeathSaveCount,
): DeathSaveRuntimeState {
  return Match.value(state).pipe(
    Match.when({ tag: "dead" }, () => state),
    Match.when({ tag: "stable" }, () => {
      if (!isDeathSavingThrowCount(count)) {
        return deadDeathSaveState();
      }
      return dyingDeathSaveState(ZERO_DEATH_SAVE_COUNT, count);
    }),
    Match.when({ tag: "dying" }, ({ deathSaves }) => {
      const failures = deathSaveCount(deathSaves.failures + count);
      if (!isDeathSavingThrowCount(failures)) {
        return deadDeathSaveState();
      }
      return dyingDeathSaveState(deathSaves.successes, failures);
    }),
    Match.exhaustive,
  );
}

function unchangedDeathSavingThrowResult(
  state: DeathSaveRuntimeState,
): DeathSavingThrowResult {
  return {
    state,
    outcome: NO_HIT_POINT_RECOVERY,
  };
}

export function resolveDeathSavingThrow(
  state: DeathSaveRuntimeState,
  d20Roll: D20Roll,
): DeathSavingThrowResult {
  return Match.value(state).pipe(
    Match.when({ tag: "dead" }, () => unchangedDeathSavingThrowResult(state)),
    Match.when({ tag: "stable" }, () => unchangedDeathSavingThrowResult(state)),
    Match.when({ tag: "dying" }, ({ deathSaves }) => {
      if (d20Roll === 20) {
        return {
          state: resetDeathSaveRuntimeState(),
          outcome: REGAINED_HIT_POINT,
        };
      }

      if (d20Roll === 1) {
        return {
          state: addDeathFailures(state, TWO_DEATH_SAVE_COUNT),
          outcome: NO_HIT_POINT_RECOVERY,
        };
      }

      if (d20Roll >= 10) {
        const successes = deathSaveCount(
          deathSaves.successes + ONE_DEATH_SAVE_COUNT,
        );
        if (!isDeathSavingThrowCount(successes)) {
          return {
            state: stableDeathSaveState(),
            outcome: NO_HIT_POINT_RECOVERY,
          };
        }
        return {
          state: dyingDeathSaveState(successes, deathSaves.failures),
          outcome: NO_HIT_POINT_RECOVERY,
        };
      }

      return {
        state: addDeathFailures(state, ONE_DEATH_SAVE_COUNT),
        outcome: NO_HIT_POINT_RECOVERY,
      };
    }),
    Match.exhaustive,
  );
}
