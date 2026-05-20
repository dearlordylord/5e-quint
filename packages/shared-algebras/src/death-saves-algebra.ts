// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

export type DeathSaveCount = 0 | 1 | 2 | 3;

export type DeathSaves = {
  readonly successes: DeathSaveCount;
  readonly failures: DeathSaveCount;
};

export type DeathSaveRuntimeState = {
  readonly deathSaves: DeathSaves;
  readonly stable: boolean;
  readonly dead: boolean;
  readonly hpRegained: boolean;
};

export const DEATH_SAVES_RESET: DeathSaves = Object.freeze({
  successes: 0,
  failures: 0,
});

export function resetDeathSaveRuntimeState(): DeathSaveRuntimeState {
  return {
    deathSaves: resetDeathSaves(),
    stable: false,
    dead: false,
    hpRegained: false,
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

export function addDeathFailures(
  state: DeathSaveRuntimeState,
  count: number,
): DeathSaveRuntimeState {
  if (state.dead || state.hpRegained) return state;
  const failures = deathSaveCount(state.deathSaves.failures + count);
  return {
    ...state,
    stable: false,
    deathSaves: {
      successes: state.deathSaves.successes,
      failures,
    },
    dead: failures >= 3,
  };
}

export function resolveDeathSavingThrow(
  state: DeathSaveRuntimeState,
  d20Roll: number,
): DeathSaveRuntimeState {
  if (state.dead || state.stable || state.hpRegained) return state;
  if (d20Roll <= 0) return state;

  if (d20Roll === 20) {
    return {
      deathSaves: resetDeathSaves(),
      stable: false,
      dead: false,
      hpRegained: true,
    };
  }

  if (d20Roll === 1) {
    return addDeathFailures(state, 2);
  }

  if (d20Roll >= 10) {
    const successes = deathSaveCount(state.deathSaves.successes + 1);
    if (successes >= 3) {
      return {
        ...state,
        deathSaves: resetDeathSaves(),
        stable: true,
      };
    }

    return {
      ...state,
      deathSaves: {
        successes,
        failures: state.deathSaves.failures,
      },
    };
  }

  return addDeathFailures(state, 1);
}

export function validDeathSaveRuntimeState(
  state: DeathSaveRuntimeState,
): boolean {
  return (
    state.deathSaves.successes >= 0 &&
    state.deathSaves.successes <= 3 &&
    state.deathSaves.failures >= 0 &&
    state.deathSaves.failures <= 3 &&
    !(state.dead && state.stable) &&
    !(state.dead && state.hpRegained) &&
    !(state.stable && state.hpRegained) &&
    (!state.dead || state.deathSaves.failures === 3) &&
    (!state.stable ||
      (state.deathSaves.successes === 0 && state.deathSaves.failures === 0)) &&
    (!state.hpRegained ||
      (state.deathSaves.successes === 0 && state.deathSaves.failures === 0))
  );
}
