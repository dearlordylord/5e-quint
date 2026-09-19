// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

import { Match } from "effect";

export type DeathSaveCount = 0 | 1 | 2 | 3;
export type DeathSavingThrowCount = Exclude<DeathSaveCount, 3>;

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
  successes: 0,
  failures: 0,
});

export function resetDeathSaveRuntimeState(): DeathSaveRuntimeState {
  return {
    tag: "dying",
    deathSaves: { successes: 0, failures: 0 },
  };
}

function deathSaveCount(value: number): DeathSaveCount {
  return Math.max(0, Math.min(3, Math.floor(value))) as DeathSaveCount;
}

export function resetDeathSaves(): DeathSaves {
  return {
    successes: 0,
    failures: 0,
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
    Match.when({ tag: "stable" }, () => 0 as DeathSavingThrowCount),
    Match.when({ tag: "dead" }, () => 0 as DeathSavingThrowCount),
    Match.exhaustive,
  );
}

export function deathSaveStateFailures(
  state: DeathSaveRuntimeState,
): DeathSaveCount {
  return Match.value(state).pipe(
    Match.when({ tag: "dying" }, ({ deathSaves }) => deathSaves.failures),
    Match.when({ tag: "stable" }, () => 0 as DeathSaveCount),
    Match.when({ tag: "dead" }, () => 3 as DeathSaveCount),
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
  count: number,
): DeathSaveRuntimeState {
  return Match.value(state).pipe(
    Match.when({ tag: "dead" }, () => state),
    Match.when({ tag: "stable" }, () => {
      const failures = deathSaveCount(count);
      return failures >= 3
        ? deadDeathSaveState()
        : dyingDeathSaveState(0, failures as DeathSavingThrowCount);
    }),
    Match.when({ tag: "dying" }, ({ deathSaves }) => {
      const failures = deathSaveCount(deathSaves.failures + count);
      return failures >= 3
        ? deadDeathSaveState()
        : dyingDeathSaveState(
            deathSaves.successes,
            failures as DeathSavingThrowCount,
          );
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
  d20Roll: number,
): DeathSavingThrowResult {
  return Match.value(state).pipe(
    Match.when({ tag: "dead" }, () => unchangedDeathSavingThrowResult(state)),
    Match.when({ tag: "stable" }, () => unchangedDeathSavingThrowResult(state)),
    Match.when({ tag: "dying" }, ({ deathSaves }) => {
      if (d20Roll <= 0) return unchangedDeathSavingThrowResult(state);

      if (d20Roll === 20) {
        return {
          state: resetDeathSaveRuntimeState(),
          outcome: REGAINED_HIT_POINT,
        };
      }

      if (d20Roll === 1) {
        return {
          state: addDeathFailures(state, 2),
          outcome: NO_HIT_POINT_RECOVERY,
        };
      }

      if (d20Roll >= 10) {
        const successes = deathSaveCount(deathSaves.successes + 1);
        return successes >= 3
          ? {
              state: stableDeathSaveState(),
              outcome: NO_HIT_POINT_RECOVERY,
            }
          : {
              state: dyingDeathSaveState(
                successes as DeathSavingThrowCount,
                deathSaves.failures,
              ),
              outcome: NO_HIT_POINT_RECOVERY,
            };
      }

      return {
        state: addDeathFailures(state, 1),
        outcome: NO_HIT_POINT_RECOVERY,
      };
    }),
    Match.exhaustive,
  );
}

export function validDeathSaveRuntimeState(
  state: DeathSaveRuntimeState,
): boolean {
  return Match.value(state).pipe(
    Match.when(
      { tag: "dying" },
      ({ deathSaves }) =>
        deathSaves.successes >= 0 &&
        deathSaves.successes < 3 &&
        deathSaves.failures >= 0 &&
        deathSaves.failures < 3,
    ),
    Match.when({ tag: "stable" }, () => true),
    Match.when({ tag: "dead" }, () => true),
    Match.exhaustive,
  );
}
