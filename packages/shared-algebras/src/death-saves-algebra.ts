// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE

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

/**
 * A Death Saving Throw's roll: the d20 that stands, and what was added to it
 * (a failed saving throw reroll's bonus, an added die), or 0.
 */
export type DeathSavingThrowRoll = {
  readonly naturalD20: D20Roll;
  readonly bonus: number;
};

/** The roll of a Death Saving Throw nothing added to. */
export function unmodifiedDeathSavingThrowRoll(
  naturalD20: D20Roll,
): DeathSavingThrowRoll {
  return { naturalD20, bonus: 0 };
}

const DEATH_SAVING_THROW_SUCCESS_TOTAL = 10;

/**
 * The roll after another source rerolls its d20 (the natural-1 reroll, Heroic
 * Inspiration): the new d20 replaces the old one and the bonus stays
 * (ASSUMPTIONS.md A69).
 */
export function deathSavingThrowRollAfterD20Reroll(
  roll: DeathSavingThrowRoll,
  replacementD20: D20Roll,
): DeathSavingThrowRoll {
  return { naturalD20: replacementD20, bonus: roll.bonus };
}

/**
 * The roll after a die is added to it (a Bardic Inspiration die): the number
 * rolled adds to what was added to the d20, and the d20 stays
 * (ASSUMPTIONS.md A69).
 */
export function deathSavingThrowRollWithAddedDie(
  roll: DeathSavingThrowRoll,
  dieRoll: number,
): DeathSavingThrowRoll {
  return { naturalD20: roll.naturalD20, bonus: roll.bonus + dieRoll };
}

/**
 * Whether the roll fails. The d20's face decides first: a 1 is two failures
 * and a 20 regains a Hit Point, whatever was added. On any other face the
 * total decides: 10 or higher succeeds (ASSUMPTIONS.md A69).
 */
export function deathSavingThrowRollFails(roll: DeathSavingThrowRoll): boolean {
  if (roll.naturalD20 === 20) return false;
  if (roll.naturalD20 === 1) return true;
  return roll.naturalD20 + roll.bonus < DEATH_SAVING_THROW_SUCCESS_TOTAL;
}

export function resolveDeathSavingThrow(
  state: DeathSaveRuntimeState,
  roll: DeathSavingThrowRoll,
): DeathSavingThrowResult {
  const d20Roll = roll.naturalD20;
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

      if (!deathSavingThrowRollFails(roll)) {
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
