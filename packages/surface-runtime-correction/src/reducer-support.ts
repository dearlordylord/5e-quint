import { Either, Option } from "effect";
import { isArrayOfOne } from "@dnd/shared/types";
import type {
  ActivationPhase,
  Attachment,
  DiceAmount,
  DiceExpr,
  EffectAtom,
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";

type DamageEffect = Extract<EffectAtom, { readonly kind: "damage" }>;
type NoneEffect = Extract<EffectAtom, { readonly kind: "none" }>;
type TargetAttachment = Extract<Attachment, { readonly kind: "target" }>;
type TargetHoleAttachment = Extract<Attachment, { readonly kind: "hole" }> & {
  readonly value: TargetAttachment;
};

export type CurrentSliceSupportedDamageAmount =
  | (Extract<DiceAmount, { readonly kind: "fixed" }> & {
      readonly expr: DiceExpr;
    })
  | (Extract<DiceAmount, { readonly kind: "threshold_tiers" }> & {
      readonly axis: "character";
      readonly base: DiceExpr;
    });

export type CurrentSliceSupportedDamageEffect = DamageEffect & {
  readonly amount: CurrentSliceSupportedDamageAmount;
};

type CurrentSliceSupportedAttackRollPhase = Extract<
  ActivationPhase,
  { readonly kind: "attack_roll" }
> & {
  readonly attachment: TargetHoleAttachment;
  readonly onHit: readonly [CurrentSliceSupportedDamageEffect];
  readonly onMiss: readonly [NoneEffect];
  readonly continue?: undefined;
};

type CurrentSliceSupportedSaveGatePhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;

type CurrentSliceSupportedDirectEffect = Extract<
  EffectAtom,
  { readonly kind: "heal_hp" | "grant_extra_action" }
>;

type CurrentSliceSupportedDirectPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
> & {
  readonly effects: readonly [CurrentSliceSupportedDirectEffect];
};

export type CurrentSliceSupportedActivationPhase =
  | CurrentSliceSupportedAttackRollPhase
  | CurrentSliceSupportedSaveGatePhase
  | CurrentSliceSupportedDirectPhase;

export type CurrentSliceSupportedActivationUnit = UnitRecord & {
  readonly kind: "spell" | "class_feature";
  readonly mechanics: {
    readonly family: "activation";
    readonly phases: readonly [CurrentSliceSupportedActivationPhase];
  };
};

export class UnsupportedUnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedUnitError";
  }
}

function supportedHealingDiceExpr(expr: DiceExpr): boolean {
  return expr.abilityModifier === undefined;
}

function supportedDamageDiceExpr(expr: DiceExpr): boolean {
  return (
    expr.abilityModifier === undefined &&
    expr.spellcastingMod === undefined &&
    (expr.flat === undefined || expr.flat >= 0)
  );
}

function supportedHealingAmount(amount: DiceAmount): boolean {
  if (amount.kind === "fixed") {
    return supportedHealingDiceExpr(amount.expr);
  }

  if (amount.kind === "linear_per_level") {
    return (
      amount.axis === "slot" &&
      amount.startingAtLevel === 1 &&
      supportedHealingDiceExpr(amount.base)
    );
  }

  return false;
}

function supportedDamageAmount(amount: DiceAmount): boolean {
  if (amount.kind === "fixed") {
    return supportedDamageDiceExpr(amount.expr);
  }

  if (amount.kind === "threshold_tiers") {
    return amount.axis === "character" && supportedDamageDiceExpr(amount.base);
  }

  return false;
}

function supportedDirectEffect(
  effect: EffectAtom,
): effect is CurrentSliceSupportedDirectEffect {
  if (effect.kind === "grant_extra_action") {
    return true;
  }

  if (effect.kind === "heal_hp") {
    return supportedHealingAmount(effect.amount);
  }

  return false;
}

function supportedAttackRollPhase(
  phase: Extract<ActivationPhase, { readonly kind: "attack_roll" }>,
): phase is CurrentSliceSupportedAttackRollPhase {
  return (
    phase.continue === undefined &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    isArrayOfOne(phase.onHit) &&
    phase.onHit[0].kind === "damage" &&
    supportedDamageAmount(phase.onHit[0].amount) &&
    isArrayOfOne(phase.onMiss) &&
    phase.onMiss[0].kind === "none"
  );
}

function directEffectMatchesAttachment(
  phase: Extract<ActivationPhase, { readonly kind: "direct" }>,
  effect: CurrentSliceSupportedDirectEffect,
): boolean {
  const attachment =
    phase.attachment.kind === "hole"
      ? phase.attachment.value
      : phase.attachment;

  if (effect.kind === "grant_extra_action") {
    return attachment.kind === "self";
  }

  if (effect.target === "self") {
    return attachment.kind === "self";
  }

  return phase.attachment.kind === "hole" && attachment.kind === "target";
}

export function checkSupportedUnit(
  unit: UnitRecord,
): Either.Either<CurrentSliceSupportedActivationUnit, UnsupportedUnitError> {
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

  if (!isArrayOfOne(unit.mechanics.phases)) {
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
    if (phase.continue !== undefined) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently does not support continuation for unit ${unit.id}`,
        ),
      );
    }

    if (
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target"
    ) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only target-hole attack-roll attachment for unit ${unit.id}`,
        ),
      );
    }

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

    if (!supportedDamageAmount(phase.onHit[0].amount)) {
      return Either.left(
        new UnsupportedUnitError(
          `Unsupported attack-roll damage amount for reducer unit ${unit.id}`,
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
    if (directEffects === undefined || !isArrayOfOne(directEffects)) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports exactly one direct effect for unit ${unit.id}`,
        ),
      );
    }

    const [directEffect] = directEffects;
    if (!supportedDirectEffect(directEffect)) {
      return Either.left(
        new UnsupportedUnitError(
          `Unsupported direct effect for reducer unit ${unit.id}: ${directEffect.kind}`,
        ),
      );
    }

    if (!directEffectMatchesAttachment(phase, directEffect)) {
      return Either.left(
        new UnsupportedUnitError(
          `Direct effect target does not match attachment for reducer unit ${unit.id}`,
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

  if (phase.kind === "attack_roll" && !supportedAttackRollPhase(phase)) {
    return Either.left(
      new UnsupportedUnitError(
        `Unsupported attack-roll phase for reducer unit ${unit.id}`,
      ),
    );
  }

  // This is the package's parse/narrowing boundary for unit-backed resolution.
  // The checks above prove the intersection facts that Surface's generated
  // schema type cannot express incrementally: supported unit kind, activation
  // mechanics, exactly one supported phase, attack-roll target/damage shape,
  // and for direct phases exactly one supported direct effect.
  return Either.right(unit as CurrentSliceSupportedActivationUnit);
}

export function assertSupportedUnit(
  unit: UnitRecord,
): CurrentSliceSupportedActivationUnit {
  const result = checkSupportedUnit(unit);
  if (Either.isLeft(result)) {
    throw result.left;
  }

  return result.right;
}

export function getCurrentSliceSupportedActivationUnit(
  unit: UnitRecord,
): Option.Option<CurrentSliceSupportedActivationUnit> {
  const result = checkSupportedUnit(unit);

  if (Either.isLeft(result)) {
    return Option.none();
  }

  return Option.some(result.right);
}
