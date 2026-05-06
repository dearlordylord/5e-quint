import {
  KNOCKED_OUT_UNCONSCIOUS,
  type BattlePositiveHpUnconscious,
} from "@dnd/battle-runtime";
import type { CharacterZeroHpLifecycleInit } from "@dnd/battle-runtime";
import { Hp, type Condition, type Hp as HpType } from "@dnd/shared/types";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import { Either } from "effect";

export type CharacterSessionPositiveHpUnconscious = {
  readonly tag: "knockedOut";
};
export const CHARACTER_SESSION_KNOCKED_OUT_UNCONSCIOUS = {
  tag: "knockedOut",
} as const satisfies CharacterSessionPositiveHpUnconscious;
type CharacterSessionPendingDeathSaveCount = Exclude<DeathSaveCount, 3>;
type CharacterSessionPendingDeathSaves = {
  readonly successes: CharacterSessionPendingDeathSaveCount;
  readonly failures: CharacterSessionPendingDeathSaveCount;
};
type CharacterSessionDeadDeathSaves = {
  readonly successes: CharacterSessionPendingDeathSaveCount;
  readonly failures: 3;
};
type CharacterSessionStableZeroHpLifecycle = {
  readonly tag: "stable";
  readonly recovery: { readonly kind: "regains1HpAfter1d4Hours" };
};
export type CharacterSessionZeroHpLifecycle =
  | {
      readonly tag: "unstable";
      readonly deathSaves: CharacterSessionPendingDeathSaves;
    }
  | CharacterSessionStableZeroHpLifecycle
  | {
      readonly tag: "dead";
      readonly deathSaves: CharacterSessionDeadDeathSaves;
    };
export type CharacterSessionZeroHpLifecycleInput =
  | { readonly tag: "unstable"; readonly deathSaves: DeathSaves }
  | CharacterSessionStableZeroHpLifecycle
  | { readonly tag: "dead"; readonly deathSaves: DeathSaves };
export type CharacterSessionHitPoints =
  | { readonly tag: "positive"; readonly currentHp: HpType }
  | { readonly tag: "knockedOut" }
  | {
      readonly tag: "zero";
      readonly lifecycle: CharacterSessionZeroHpLifecycle;
    };
export type CharacterSessionHitPointsInput = {
  readonly currentHp: HpType;
  readonly positiveHpUnconscious?: CharacterSessionPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSessionZeroHpLifecycleInput;
};
export type CharacterSessionIssue = {
  readonly tag: "characterSessionIssue";
  readonly message: string;
};

export function characterSessionIssue(
  message: string,
): Either.Either<never, CharacterSessionIssue> {
  return Either.left({ tag: "characterSessionIssue", message });
}

export function characterSessionHitPoints(
  input: CharacterSessionHitPointsInput,
): Either.Either<CharacterSessionHitPoints, CharacterSessionIssue> {
  if (Number(input.currentHp) > 0) {
    if (input.zeroHpLifecycle !== undefined) {
      return characterSessionIssue(
        "Positive-HP character session cannot carry zero-HP state.",
      );
    }
    if (
      input.positiveHpUnconscious !== undefined &&
      Number(input.currentHp) !== 1
    ) {
      return characterSessionIssue(
        "Knocked Out character session must have exactly 1 current HP.",
      );
    }
    return Either.right(
      input.positiveHpUnconscious === undefined
        ? { tag: "positive", currentHp: input.currentHp }
        : { tag: "knockedOut" },
    );
  }
  if (input.positiveHpUnconscious !== undefined) {
    return characterSessionIssue(
      "Zero-HP character session cannot carry Knock Out Unconscious state.",
    );
  }
  const lifecycle = canonicalZeroHpLifecycle(
    input.zeroHpLifecycle ?? {
      tag: "unstable",
      deathSaves: { successes: 0, failures: 0 },
    },
  );
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({ tag: "zero", lifecycle: lifecycle.right });
}

export function characterSessionHitPointsCurrentHp(
  hitPoints: CharacterSessionHitPoints,
): HpType {
  if (hitPoints.tag === "positive") return hitPoints.currentHp;
  return hitPoints.tag === "knockedOut" ? Hp(1) : Hp(0);
}

export function characterSessionHitPointsInitialConditions(
  hitPoints: CharacterSessionHitPoints,
): readonly Condition[] {
  return hitPoints.tag === "knockedOut" ? ["unconscious"] : [];
}

export function characterSessionHitPointsPositiveHpUnconscious(
  hitPoints: CharacterSessionHitPoints,
): BattlePositiveHpUnconscious | undefined {
  return hitPoints.tag === "knockedOut" ? KNOCKED_OUT_UNCONSCIOUS : undefined;
}

export function characterSessionPositiveHpUnconsciousFromBattle(
  value: BattlePositiveHpUnconscious,
): CharacterSessionPositiveHpUnconscious {
  switch (value.tag) {
    case "knockedOut":
      return CHARACTER_SESSION_KNOCKED_OUT_UNCONSCIOUS;
  }
}

export function characterSessionHitPointsZeroHpLifecycle(
  hitPoints: CharacterSessionHitPoints,
): CharacterZeroHpLifecycleInit | undefined {
  if (hitPoints.tag === "positive" || hitPoints.tag === "knockedOut") {
    return undefined;
  }
  const lifecycle = hitPoints.lifecycle;
  if (lifecycle.tag === "stable") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: { successes: 0, failures: 0 },
        stable: true,
        dead: false,
        hpRegained: false,
      },
    };
  }
  if (lifecycle.tag === "dead") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: lifecycle.deathSaves,
        stable: false,
        dead: true,
        hpRegained: false,
      },
    };
  }
  return {
    policy: "usesDeathSavingThrows",
    deathSaves: {
      deathSaves: lifecycle.deathSaves,
      stable: false,
      dead: false,
      hpRegained: false,
    },
  };
}

function canonicalZeroHpLifecycle(
  lifecycle: CharacterSessionZeroHpLifecycleInput,
): Either.Either<CharacterSessionZeroHpLifecycle, CharacterSessionIssue> {
  if (lifecycle.tag === "stable") return Either.right(lifecycle);
  if (lifecycle.tag === "dead") {
    const { successes, failures } = lifecycle.deathSaves;
    if (successes === 3 || failures !== 3) {
      return characterSessionIssue(
        "Dead character session requires exactly three death save failures.",
      );
    }
    return Either.right({ tag: "dead", deathSaves: { successes, failures } });
  }
  const { successes, failures } = lifecycle.deathSaves;
  if (successes === 3 || failures === 3) {
    return characterSessionIssue(
      "Unstable character session cannot carry terminal death save counts.",
    );
  }
  return Either.right({ tag: "unstable", deathSaves: { successes, failures } });
}
