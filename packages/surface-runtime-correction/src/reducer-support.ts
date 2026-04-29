import { Either, Match, Option } from "effect";
import { isArrayOfOne } from "@dnd/shared/types";
import type {
  ActivationPhase,
  Attachment,
  DiceAmount,
  DiceExpr,
  DamageTypeRef,
  EffectAtom,
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";

type DamageEffect = Extract<EffectAtom, { readonly kind: "damage" }>;
type NoneEffect = Extract<EffectAtom, { readonly kind: "none" }>;
type TargetAttachment = Extract<Attachment, { readonly kind: "target" }>;
type TargetHoleAttachment = Extract<Attachment, { readonly kind: "hole" }> & {
  readonly value: TargetAttachment;
};
type AreaAttachment = Extract<Attachment, { readonly kind: "area" }>;
type AreaHoleAttachment = Extract<Attachment, { readonly kind: "hole" }> & {
  readonly value: AreaAttachment;
};

export type CurrentSliceSupportedDamageAmount =
  | (Extract<DiceAmount, { readonly kind: "fixed" }> & {
      readonly expr: DiceExpr;
    })
  | (Extract<DiceAmount, { readonly kind: "linear_per_level" }> & {
      readonly axis: "slot";
      readonly base: DiceExpr;
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
> & {
  readonly attachment: AreaAttachment | AreaHoleAttachment;
  readonly onFail: CurrentSliceSupportedDamageEffect;
  readonly onSuccess: { readonly kind: "half_damage" };
  readonly repeatSave?: undefined;
  readonly autoSuccessIfCasterSlotGte?: undefined;
  readonly saveAppliesIf?: undefined;
};

type CurrentSliceSupportedGrantExtraActionEffect = Extract<
  EffectAtom,
  { readonly kind: "grant_extra_action" }
> & {
  readonly restriction: {
    readonly kind: "exclude";
    readonly actions: readonly ["magic"];
  };
};

type CurrentSliceSupportedDirectEffect =
  | Extract<EffectAtom, { readonly kind: "heal_hp" }>
  | CurrentSliceSupportedGrantExtraActionEffect;

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

type CurrentSliceSupportedGrantExtraActionUnit =
  CurrentSliceSupportedActivationUnit & {
    readonly kind: "class_feature";
    readonly acquiredAtLevel: 2;
    readonly mechanics: CurrentSliceSupportedActivationUnit["mechanics"] & {
      readonly activationCost: { readonly kind: "free" };
      readonly resource: {
        readonly kind: "use_count";
        readonly cap: { readonly kind: "fixed"; readonly uses: 1 };
      };
      readonly resetCadence: { readonly kind: "short_or_long_rest" };
      readonly usageLimit: { readonly kind: "once_per_turn" };
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

export function currentSliceSupportsDamageDiceExpr(expr: DiceExpr): boolean {
  return (
    expr.abilityModifier === undefined &&
    expr.spellcastingMod === undefined &&
    (expr.flat === undefined || expr.flat >= 0)
  );
}

function isFixedDamageTypeRef(damageType: DamageTypeRef): boolean {
  return typeof damageType === "string";
}

export function currentSliceDamageBaseExpr(
  amount: DiceAmount,
  baseSpellLevel: number | null,
): Either.Either<DiceExpr, UnsupportedUnitError> {
  return Match.value(amount).pipe(
    Match.when({ kind: "fixed" }, (fixed) =>
      currentSliceSupportsDamageDiceExpr(fixed.expr)
        ? Either.right(fixed.expr)
        : Either.left(
            new UnsupportedUnitError("unsupported damage dice expression"),
          ),
    ),
    Match.when({ kind: "linear_per_level" }, (linear) => {
      if (
        baseSpellLevel === null ||
        linear.axis !== "slot" ||
        linear.startingAtLevel !== baseSpellLevel
      ) {
        return Either.left(
          new UnsupportedUnitError(
            "unsupported damage amount scaling for current slice",
          ),
        );
      }

      return currentSliceSupportsDamageDiceExpr(linear.base)
        ? Either.right(linear.base)
        : Either.left(
            new UnsupportedUnitError("unsupported damage dice expression"),
          );
    }),
    Match.when({ kind: "threshold_tiers" }, (threshold) => {
      if (threshold.axis !== "character") {
        return Either.left(
          new UnsupportedUnitError(
            "unsupported damage threshold axis for current slice",
          ),
        );
      }

      return currentSliceSupportsDamageDiceExpr(threshold.base)
        ? Either.right(threshold.base)
        : Either.left(
            new UnsupportedUnitError("unsupported damage dice expression"),
          );
    }),
    Match.when({ kind: "resource_spent" }, () =>
      Either.left(
        new UnsupportedUnitError("unsupported resource-spent damage amount"),
      ),
    ),
    Match.when({ kind: "resource_spent_linear" }, () =>
      Either.left(
        new UnsupportedUnitError("unsupported resource-spent damage amount"),
      ),
    ),
    Match.when({ kind: "linked" }, () =>
      Either.left(new UnsupportedUnitError("unsupported linked damage amount")),
    ),
    Match.exhaustive,
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

function supportedDamageAmount(
  amount: DiceAmount,
  baseSpellLevel: number | null,
): boolean {
  return Either.isRight(currentSliceDamageBaseExpr(amount, baseSpellLevel));
}

function supportedGrantExtraActionEffect(
  effect: Extract<EffectAtom, { readonly kind: "grant_extra_action" }>,
): effect is CurrentSliceSupportedGrantExtraActionEffect {
  return (
    effect.restriction.kind === "exclude" &&
    isArrayOfOne(effect.restriction.actions) &&
    effect.restriction.actions[0] === "magic"
  );
}

function supportedDirectEffect(
  effect: EffectAtom,
): effect is CurrentSliceSupportedDirectEffect {
  if (effect.kind === "grant_extra_action") {
    return supportedGrantExtraActionEffect(effect);
  }

  if (effect.kind === "heal_hp") {
    return supportedHealingAmount(effect.amount);
  }

  return false;
}

function currentSliceSupportsGrantExtraActionResourceSemantics(
  unit: UnitRecord,
): unit is CurrentSliceSupportedGrantExtraActionUnit {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    return false;
  }

  const cap = unit.mechanics.resource.cap;
  return (
    unit.acquiredAtLevel === 2 &&
    unit.mechanics.activationCost.kind === "free" &&
    unit.mechanics.resource.kind === "use_count" &&
    cap.kind === "fixed" &&
    cap.uses === 1 &&
    unit.mechanics.resetCadence.kind === "short_or_long_rest" &&
    unit.mechanics.usageLimit?.kind === "once_per_turn"
  );
}

function supportedAttackRollPhase(
  phase: Extract<ActivationPhase, { readonly kind: "attack_roll" }>,
  baseSpellLevel: number | null,
): phase is CurrentSliceSupportedAttackRollPhase {
  return (
    phase.continue === undefined &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    isArrayOfOne(phase.onHit) &&
    phase.onHit[0].kind === "damage" &&
    supportedDamageAmount(phase.onHit[0].amount, baseSpellLevel) &&
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
  const baseSpellLevel = unit.kind === "spell" ? unit.mechanics.level : null;

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

    if (!supportedDamageAmount(phase.onHit[0].amount, baseSpellLevel)) {
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

    if (
      directEffect.kind === "grant_extra_action" &&
      !currentSliceSupportsGrantExtraActionResourceSemantics(unit)
    ) {
      return Either.left(
        new UnsupportedUnitError(
          `Unsupported extra-action resource semantics for reducer unit ${unit.id}`,
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
    const saveGateAttachment =
      phase.attachment.kind === "hole"
        ? phase.attachment.value
        : phase.attachment;

    if (saveGateAttachment.kind !== "area") {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only area save-gate attachment for unit ${unit.id}`,
        ),
      );
    }

    if (
      phase.repeatSave !== undefined ||
      phase.autoSuccessIfCasterSlotGte !== undefined ||
      phase.saveAppliesIf !== undefined
    ) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently does not support save-gate riders for unit ${unit.id}`,
        ),
      );
    }

    if (phase.onFail.kind !== "damage") {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only damage on save failure for unit ${unit.id}`,
        ),
      );
    }

    if (!isFixedDamageTypeRef(phase.onFail.damageType)) {
      return Either.left(
        new UnsupportedUnitError(
          `Reducer currently supports only fixed save-gate damage type for unit ${unit.id}`,
        ),
      );
    }

    if (!supportedDamageAmount(phase.onFail.amount, baseSpellLevel)) {
      return Either.left(
        new UnsupportedUnitError(
          `Unsupported save-gate damage amount for reducer unit ${unit.id}`,
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

  if (
    phase.kind === "attack_roll" &&
    !supportedAttackRollPhase(phase, baseSpellLevel)
  ) {
    return Either.left(
      new UnsupportedUnitError(
        `Unsupported attack-roll phase for reducer unit ${unit.id}`,
      ),
    );
  }

  // This is the package's parse/narrowing boundary for unit-backed resolution.
  // The checks above prove the intersection facts that Surface's generated
  // schema type cannot express incrementally: supported unit kind, activation
  // mechanics, exactly one supported phase, attack-roll/save-gate damage
  // shape, and for direct phases exactly one supported direct effect.
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
