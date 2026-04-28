import { Match } from "effect";

import type {
  ActivationPhase,
  Attachment,
  DamageTypeRef,
  EffectAtom,
} from "@dnd/prototype-content-surface/surface/types";

import {
  type FillableDamageTypeRef,
  type HoleInstanceKey,
  type HoleLocalKey,
  type HoleStepKey,
  holeId,
  holeInstanceKey,
  holeLocalKey,
  type RuntimeHole,
  type RuntimeHoleSet,
} from "#/reducer-types.ts";

type DamageEffectAtom = Extract<EffectAtom, { readonly kind: "damage" }>;
type HealHpEffectAtom = Extract<EffectAtom, { readonly kind: "heal_hp" }>;

function makeHoleInstanceKey(
  stepKey: HoleStepKey,
  localKey: HoleLocalKey,
): HoleInstanceKey {
  return holeInstanceKey(`${stepKey}:${localKey}`);
}

function isHoleAttachment(
  attachment: Attachment,
): attachment is Extract<Attachment, { readonly kind: "hole" }> {
  return attachment.kind === "hole";
}

function isFillableDamageTypeRef(
  damageTypeRef: DamageTypeRef,
): damageTypeRef is FillableDamageTypeRef {
  return !(
    typeof damageTypeRef === "object" &&
    "kind" in damageTypeRef &&
    (damageTypeRef.kind === "hole" || damageTypeRef.kind === "same_choice_as")
  );
}

function isHoleDamageTypeRef(
  damageTypeRef: DamageTypeRef,
): damageTypeRef is Extract<DamageTypeRef, { readonly kind: "hole" }> {
  return (
    typeof damageTypeRef === "object" &&
    "kind" in damageTypeRef &&
    damageTypeRef.kind === "hole"
  );
}

function isDamageEffect(effect: EffectAtom): effect is DamageEffectAtom {
  return effect.kind === "damage";
}

function isHealHpEffect(effect: EffectAtom): effect is HealHpEffectAtom {
  return effect.kind === "heal_hp";
}

function attackRollHole(stepKey: HoleStepKey): RuntimeHole {
  return {
    holeInstanceKey: makeHoleInstanceKey(
      stepKey,
      holeLocalKey("runtime:attackRoll"),
    ),
    holeId: holeId(`${stepKey}_attack_roll`),
    kind: "attackRoll",
  };
}

function damageRollHole(stepKey: HoleStepKey, effectIndex: number): RuntimeHole {
  return {
    holeInstanceKey: makeHoleInstanceKey(
      stepKey,
      holeLocalKey(`runtime:damageRoll:${effectIndex}`),
    ),
    holeId: holeId(`${stepKey}_damage_roll_${effectIndex}`),
    kind: "rolledDice",
    label: "damage roll",
  };
}

function healingRollHole(
  stepKey: HoleStepKey,
  effectIndex: number,
): RuntimeHole {
  return {
    holeInstanceKey: makeHoleInstanceKey(
      stepKey,
      holeLocalKey(`runtime:healingRoll:${effectIndex}`),
    ),
    holeId: holeId(`${stepKey}_healing_roll_${effectIndex}`),
    kind: "rolledDice",
    label: "healing roll",
  };
}

function targetChoiceHole(
  stepKey: HoleStepKey,
  attachment: Extract<Attachment, { readonly kind: "hole" }>,
): RuntimeHole {
  return {
    holeInstanceKey: makeHoleInstanceKey(
      stepKey,
      holeLocalKey(`surface:${attachment.holeId}`),
    ),
    holeId: holeId(attachment.holeId),
    kind: "targetChoice",
    ...(attachment.label === undefined ? {} : { label: attachment.label }),
  };
}

function attachmentHoles(
  stepKey: HoleStepKey,
  attachment: Attachment,
): RuntimeHoleSet {
  if (!isHoleAttachment(attachment)) {
    return [];
  }

  if (attachment.value.kind === "target") {
    return [targetChoiceHole(stepKey, attachment)];
  }

  // Non-target attachment holes, including fireball_point, still use the
  // temporary surfaceAttachment protocol. This currently echoes the authored
  // area schema back to the caller; it does NOT yet represent the eventual
  // runtime answer shape such as chosen affected creatures or another
  // table-owned area resolution result.
  const baseHole = {
    holeInstanceKey: makeHoleInstanceKey(
      stepKey,
      holeLocalKey(`surface:${attachment.holeId}`),
    ),
    holeId: holeId(attachment.holeId),
    kind: "surfaceAttachment" as const,
    attachment: attachment.value,
  };
  return [
    attachment.label === undefined
      ? baseHole
      : { ...baseHole, label: attachment.label },
  ];
}

function damageTypeHoles(
  stepKey: HoleStepKey,
  damageTypeRef: DamageTypeRef,
): RuntimeHoleSet {
  if (!isHoleDamageTypeRef(damageTypeRef)) {
    return [];
  }
  if (!isFillableDamageTypeRef(damageTypeRef.value)) {
    throw new Error("runtime-holes: non-fillable damage-type hole payload");
  }

  const baseHole = {
    holeInstanceKey: makeHoleInstanceKey(
      stepKey,
      holeLocalKey(`surface:${damageTypeRef.holeId}`),
    ),
    holeId: holeId(damageTypeRef.holeId),
    kind: "surfaceDamageTypeRef" as const,
    damageTypeRef: damageTypeRef.value,
  };
  return [
    damageTypeRef.label === undefined
      ? baseHole
      : { ...baseHole, label: damageTypeRef.label },
  ];
}

function phaseDamageTypeHolesFromEffect(
  stepKey: HoleStepKey,
  effect: DamageEffectAtom,
): RuntimeHoleSet {
  return damageTypeHoles(stepKey, effect.damageType);
}

function phaseDamageTypeHolesFromEffects(
  stepKey: HoleStepKey,
  effects: ReadonlyArray<EffectAtom>,
): RuntimeHoleSet {
  return effects
    .filter(isDamageEffect)
    .flatMap((effect) => phaseDamageTypeHolesFromEffect(stepKey, effect));
}

function phaseHealingRollHolesFromEffects(
  stepKey: HoleStepKey,
  effects: ReadonlyArray<EffectAtom>,
): RuntimeHoleSet {
  return effects.flatMap((effect, index) =>
    isHealHpEffect(effect) ? [healingRollHole(stepKey, index)] : [],
  );
}

function assertNoGatedDamageTypeHoles(
  effects: ReadonlyArray<EffectAtom>,
  context: string,
): void {
  const hasUnsupported = effects
    .filter(isDamageEffect)
    .some((effect) => isHoleDamageTypeRef(effect.damageType));

  if (hasUnsupported) {
    throw new Error(
      `runtime-holes: unsupported gated damage-type hole in ${context}`,
    );
  }
}

function assertUniqueHoleInstanceKeys(holes: RuntimeHoleSet): RuntimeHoleSet {
  const seen = new Set<string>();

  for (const hole of holes) {
    const key = hole.holeInstanceKey as string;
    if (seen.has(key)) {
      throw new Error(`runtime-holes: duplicate hole instance key: ${key}`);
    }
    seen.add(key);
  }

  return holes;
}

// Projects the current hole payload authored on a specific phase.
// It does not decide whether this phase is currently legal to ask about.
export function projectPhaseHoles(
  phase: ActivationPhase,
  stepKey: HoleStepKey,
): RuntimeHoleSet {
  const holes = Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, (attackRollPhase) => [
      ...attachmentHoles(stepKey, attackRollPhase.attachment),
      attackRollHole(stepKey),
      // Attack-roll damage-type choices are decided before the roll even though
      // Surface nests them under on-hit effects.
      ...phaseDamageTypeHolesFromEffects(stepKey, attackRollPhase.onHit),
    ]),
    Match.when({ kind: "save_gate" }, (saveGatePhase) => [
      ...attachmentHoles(stepKey, saveGatePhase.attachment),
      ...(assertNoGatedDamageTypeHoles(
        [
          saveGatePhase.onFail,
          ...(saveGatePhase.onSuccess.kind === "half_damage"
            ? []
            : [saveGatePhase.onSuccess]),
        ],
        "save_gate",
      ),
      []),
    ]),
    Match.when({ kind: "direct" }, (directPhase) => [
      ...attachmentHoles(stepKey, directPhase.attachment),
      ...(directPhase.effects
        ? [
            ...phaseDamageTypeHolesFromEffects(stepKey, directPhase.effects),
            ...phaseHealingRollHolesFromEffects(stepKey, directPhase.effects),
          ]
        : []),
    ]),
    Match.when({ kind: "ability_check_gate" }, (abilityCheckGatePhase) => [
      ...attachmentHoles(stepKey, abilityCheckGatePhase.attachment),
      ...(assertNoGatedDamageTypeHoles(
        [
          abilityCheckGatePhase.onPass,
          ...(abilityCheckGatePhase.onFail
            ? [abilityCheckGatePhase.onFail]
            : []),
        ],
        "ability_check_gate",
      ),
      []),
    ]),
    Match.when({ kind: "random_table" }, () => []),
    Match.exhaustive,
  );

  return assertUniqueHoleInstanceKeys(holes);
}

export function projectAttackRollDamageHoles(
  phase: Extract<ActivationPhase, { readonly kind: "attack_roll" }>,
  stepKey: HoleStepKey,
): RuntimeHoleSet {
  return phase.onHit.flatMap((effect, index) =>
    effect.kind === "damage" ? [damageRollHole(stepKey, index)] : [],
  );
}
