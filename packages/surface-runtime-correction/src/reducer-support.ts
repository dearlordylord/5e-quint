import { Either } from "effect";
import type {
  ActivationPhase,
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";

export type CurrentSliceSupportedActivationUnit = UnitRecord & {
  // to be deleted when we introduce more units. this type is not useful as a helper later
  readonly mechanics: {
    readonly family: "activation";
    readonly phases: readonly [ActivationPhase];
  };
};

export class UnsupportedUnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedUnitError";
  }
}

export function checkSupportedUnit(
  unit: UnitRecord,
): Either.Either<UnitRecord, UnsupportedUnitError> {
  if (unit.kind !== "spell" && unit.kind !== "class_feature") {
    return Either.left(
      new UnsupportedUnitError(
        `Unsupported unit kind for reducer: ${unit.kind}`,
      ),
    );
  }

  if (unit.mechanics.family !== "activation") {
    return Either.left(
      new UnsupportedUnitError(
        `Unsupported mechanics family for reducer unit ${unit.id}: ${unit.mechanics.family}`,
      ),
    );
  }

  if (unit.mechanics.phases.length !== 1) {
    return Either.left(
      new UnsupportedUnitError(
        `Reducer currently supports exactly one phase for unit ${unit.id}`,
      ),
    );
  }

  const [phase] = unit.mechanics.phases;
  if (
    phase.kind !== "attack_roll" &&
    phase.kind !== "save_gate" &&
    phase.kind !== "direct"
  ) {
    return Either.left(
      new UnsupportedUnitError(
        `Unsupported phase kind for reducer unit ${unit.id}: ${phase.kind}`,
      ),
    );
  }

  if (phase.kind === "attack_roll" && phase.continue !== undefined) {
    return Either.left(
      new UnsupportedUnitError(
        `Reducer currently does not support continuation for unit ${unit.id}`,
      ),
    );
  }

  const attachment =
    phase.attachment.kind === "hole"
      ? phase.attachment.value
      : phase.attachment;
  if (
    attachment.kind !== "self" &&
    attachment.kind !== "target" &&
    attachment.kind !== "area"
  ) {
    return Either.left(
      new UnsupportedUnitError(
        `Unsupported attachment kind for reducer unit ${unit.id}: ${attachment.kind}`,
      ),
    );
  }

  if (phase.kind === "attack_roll") {
    if (phase.onHit.length !== 1 || phase.onMiss.length !== 1) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports one on-hit atom and one on-miss atom for unit ${unit.id}`,
        ),
      );
    }

    if (phase.onHit[0].kind !== "damage") {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only damage on attack-roll hit for unit ${unit.id}`,
        ),
      );
    }

    if (phase.onMiss[0].kind !== "none") {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only none on attack-roll miss for unit ${unit.id}`,
        ),
      );
    }
  }

  if (phase.kind === "direct") {
    const directEffects = phase.effects;
    if (directEffects === undefined || directEffects.length !== 1) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports exactly one direct effect for unit ${unit.id}`,
        ),
      );
    }

    const [directEffect] = directEffects;
    if (
      directEffect.kind !== "heal_hp" &&
      directEffect.kind !== "grant_extra_action"
    ) {
      return Either.left(
        new UnsupportedUnitError(
          `Unsupported direct effect for reducer unit ${unit.id}: ${directEffect.kind}`,
        ),
      );
    }
  }

  if (phase.kind === "save_gate") {
    if (phase.onFail.kind !== "damage") {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only damage on save failure for unit ${unit.id}`,
        ),
      );
    }

    if (phase.onSuccess.kind !== "half_damage") {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only half_damage on save success for unit ${unit.id}`,
        ),
      );
    }
  }

  return Either.right(unit);
}

export function assertSupportedUnit(unit: UnitRecord): UnitRecord {
  const result = checkSupportedUnit(unit);
  if (Either.isLeft(result)) {
    throw result.left;
  }

  return result.right;
}

export function getCurrentSliceSupportedActivationUnit(
  unit: UnitRecord,
): CurrentSliceSupportedActivationUnit | null {
  const result = checkSupportedUnit(unit);
  if (Either.isLeft(result)) {
    return null;
  }

  return result.right as CurrentSliceSupportedActivationUnit;
}
