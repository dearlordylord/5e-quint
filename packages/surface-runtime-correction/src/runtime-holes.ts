import { Match } from "effect";

import type {
  ActivationPhase,
  Attachment,
  DamageTypeRef,
  EffectAtom,
} from "@dnd/prototype-content-surface/surface/types";

import {
  type FillableDamageTypeRef,
  type HoleId,
  type HoleInstanceKey,
  type RuntimeHole,
  type RuntimeHoleSet,
} from "#/reducer-types.ts";

function asHoleId(raw: string): HoleId {
  return raw as HoleId;
}

function makeHoleInstanceKey(
  stepKey: string,
  localKey: string,
): HoleInstanceKey {
  return `${stepKey}:${localKey}` as HoleInstanceKey;
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
    typeof damageTypeRef === "object"
    && damageTypeRef !== null
    && "kind" in damageTypeRef
    && (damageTypeRef.kind === "hole" || damageTypeRef.kind === "same_choice_as")
  );
}

function isHoleDamageTypeRef(
  damageTypeRef: DamageTypeRef,
): damageTypeRef is Extract<DamageTypeRef, { readonly kind: "hole" }> {
  return typeof damageTypeRef === "object" && damageTypeRef !== null && "kind" in damageTypeRef && damageTypeRef.kind === "hole";
}

function attackRollHole(stepKey: string): RuntimeHole {
  return {
    holeInstanceKey: makeHoleInstanceKey(stepKey, "runtime:attackRoll"),
    holeId: asHoleId(`${stepKey}_attack_roll`),
    kind: "attackRoll",
  };
}

function attachmentHoles(stepKey: string, attachment: Attachment): RuntimeHoleSet {
  if (!isHoleAttachment(attachment)) {
    return [];
  }

  const baseHole = {
    holeInstanceKey: makeHoleInstanceKey(stepKey, `surface:${attachment.holeId}`),
    holeId: asHoleId(attachment.holeId),
    kind: "surfaceAttachment" as const,
    attachment: attachment.value,
  };
  return [attachment.label === undefined ? baseHole : { ...baseHole, label: attachment.label }];
}

function damageTypeHoles(stepKey: string, damageTypeRef: DamageTypeRef): RuntimeHoleSet {
  if (!isHoleDamageTypeRef(damageTypeRef)) {
    return [];
  }
  if (!isFillableDamageTypeRef(damageTypeRef.value)) {
    throw new Error("runtime-holes: non-fillable damage-type hole payload");
  }

  const baseHole = {
    holeInstanceKey: makeHoleInstanceKey(stepKey, `surface:${damageTypeRef.holeId}`),
    holeId: asHoleId(damageTypeRef.holeId),
    kind: "surfaceDamageTypeRef" as const,
    damageTypeRef: damageTypeRef.value,
  };
  return [damageTypeRef.label === undefined ? baseHole : { ...baseHole, label: damageTypeRef.label }];
}

function phaseDamageTypeHolesFromEffect(
  stepKey: string,
  effect: EffectAtom,
): RuntimeHoleSet {
  if (effect.kind !== "damage") {
    return [];
  }

  return damageTypeHoles(stepKey, effect.damageType);
}

function phaseDamageTypeHolesFromEffects(
  stepKey: string,
  effects: ReadonlyArray<EffectAtom>,
): RuntimeHoleSet {
  return effects.flatMap((effect) => phaseDamageTypeHolesFromEffect(stepKey, effect));
}

function assertNoGatedDamageTypeHoles(
  effects: ReadonlyArray<EffectAtom>,
  context: string,
): void {
  const hasUnsupported = effects.some((effect) => {
    if (effect.kind !== "damage") {
      return false;
    }
    return isHoleDamageTypeRef(effect.damageType);
  });

  if (hasUnsupported) {
      throw new Error(`runtime-holes: unsupported gated damage-type hole in ${context}`);
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
  stepKey: string,
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
          ...(saveGatePhase.onSuccess.kind === "half_damage" ? [] : [saveGatePhase.onSuccess]),
        ],
        "save_gate",
      ), []),
    ]),
    Match.when({ kind: "direct" }, (directPhase) => [
      ...attachmentHoles(stepKey, directPhase.attachment),
      ...(directPhase.effects
        ? phaseDamageTypeHolesFromEffects(stepKey, directPhase.effects)
        : []),
    ]),
    Match.when({ kind: "ability_check_gate" }, (abilityCheckGatePhase) => [
      ...attachmentHoles(stepKey, abilityCheckGatePhase.attachment),
      ...(assertNoGatedDamageTypeHoles(
        [
          abilityCheckGatePhase.onPass,
          ...(abilityCheckGatePhase.onFail ? [abilityCheckGatePhase.onFail] : []),
        ],
        "ability_check_gate",
      ), []),
    ]),
    Match.when({ kind: "random_table" }, () => []),
    Match.exhaustive,
  );

  return assertUniqueHoleInstanceKeys(holes);
}
