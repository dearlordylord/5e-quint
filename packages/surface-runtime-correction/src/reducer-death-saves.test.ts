import { describe, expect, it } from "vitest";

import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
  validDeathSaveRuntimeState,
  type DeathSaveRuntimeState,
} from "#/reducer-death-saves.ts";

function state(
  overrides: Partial<DeathSaveRuntimeState> = {},
): DeathSaveRuntimeState {
  return {
    ...resetDeathSaveRuntimeState(),
    ...overrides,
  };
}

describe("reducer death saves", () => {
  it("adds one failure on a failed death save", () => {
    const result = resolveDeathSavingThrow(state(), 5);

    expect(result).toEqual(
      state({ deathSaves: { successes: 0, failures: 1 } }),
    );
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("adds two failures on a natural 1", () => {
    const result = resolveDeathSavingThrow(state(), 1);

    expect(result).toEqual(
      state({ deathSaves: { successes: 0, failures: 2 } }),
    );
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("marks dead at three failures", () => {
    const result = resolveDeathSavingThrow(
      state({ deathSaves: { successes: 0, failures: 2 } }),
      2,
    );

    expect(result.dead).toBe(true);
    expect(result.deathSaves.failures).toBe(3);
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("adds one success on a successful death save", () => {
    const result = resolveDeathSavingThrow(state(), 10);

    expect(result).toEqual(
      state({ deathSaves: { successes: 1, failures: 0 } }),
    );
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("stabilizes and resets death saves at three successes", () => {
    const result = resolveDeathSavingThrow(
      state({ deathSaves: { successes: 2, failures: 1 } }),
      12,
    );

    expect(result).toEqual(
      state({
        deathSaves: { successes: 0, failures: 0 },
        stable: true,
      }),
    );
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("regains one hp marker and resets death saves on a natural 20", () => {
    const result = resolveDeathSavingThrow(
      state({ deathSaves: { successes: 1, failures: 2 } }),
      20,
    );

    expect(result).toEqual(
      state({
        deathSaves: { successes: 0, failures: 0 },
        hpRegained: true,
      }),
    );
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("adds damage failures outside the roll path", () => {
    const result = addDeathFailures(
      state({ deathSaves: { successes: 1, failures: 1 } }),
      2,
    );

    expect(result.dead).toBe(true);
    expect(result.deathSaves).toEqual({ successes: 1, failures: 3 });
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("damage makes a stable zero-HP creature unstable again", () => {
    const result = addDeathFailures(state({ stable: true }), 1);

    expect(result.stable).toBe(false);
    expect(result.dead).toBe(false);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 1 });
    expect(validDeathSaveRuntimeState(result)).toBe(true);
  });

  it("roll-terminal states are absorbing", () => {
    const dead = state({
      deathSaves: { successes: 0, failures: 3 },
      dead: true,
    });
    const stable = state({ stable: true });
    const regained = state({ hpRegained: true });

    expect(resolveDeathSavingThrow(dead, 20)).toEqual(dead);
    expect(resolveDeathSavingThrow(stable, 1)).toEqual(stable);
    expect(addDeathFailures(regained, 2)).toEqual(regained);
  });
});
