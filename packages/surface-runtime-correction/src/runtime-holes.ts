import { Match } from "effect";

import type {
  ActivationPhase,
  Attachment,
  AttackKind,
  DamageTypeRef,
  EffectAtom,
} from "@dnd/prototype-content-surface/surface/types";

import {
  type FillableDamageTypeRef,
  type HoleId,
  type PromptInstanceKey,
  type RuntimeHole,
  type RuntimeHoleSet,
} from "#/reducer-resolution.ts";

function asHoleId(raw: string): HoleId {
  return raw as HoleId;
}

function makePromptInstanceKey(
  stepKey: string,
  localKey: string,
): PromptInstanceKey {
  return `${stepKey}:${localKey}` as PromptInstanceKey;
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

function attackRollHole(stepKey: string, attackKind: AttackKind): RuntimeHole {
  return {
    promptInstanceKey: makePromptInstanceKey(stepKey, "runtime:attackRoll"),
    kind: "attackRoll",
    attackKind,
  };
}

function attachmentHoles(stepKey: string, attachment: Attachment): RuntimeHoleSet {
  if (!isHoleAttachment(attachment)) {
    return [];
  }

  const baseHole = {
    promptInstanceKey: makePromptInstanceKey(stepKey, `surface:${attachment.holeId}`),
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
    promptInstanceKey: makePromptInstanceKey(stepKey, `surface:${damageTypeRef.holeId}`),
    holeId: asHoleId(damageTypeRef.holeId),
    kind: "surfaceDamageTypeRef" as const,
    damageTypeRef: damageTypeRef.value,
  };
  return [damageTypeRef.label === undefined ? baseHole : { ...baseHole, label: damageTypeRef.label }];
}

function phaseOwnedDamageTypeChoiceHolesFromEffect(
  stepKey: string,
  effect: EffectAtom,
): RuntimeHoleSet {
  if (effect.kind !== "damage") {
    return [];
  }

  return damageTypeHoles(stepKey, effect.damageType);
}

function phaseOwnedDamageTypeChoiceHolesFromEffects(
  stepKey: string,
  effects: ReadonlyArray<EffectAtom>,
): RuntimeHoleSet {
  return effects.flatMap((effect) => phaseOwnedDamageTypeChoiceHolesFromEffect(stepKey, effect));
}

function assertNoPhaseOwnedDamageTypePrompts(
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
    throw new Error(`runtime-holes: unsupported gated damage-type prompt in ${context}`);
  }
}

function assertUniquePromptInstanceKeys(prompts: RuntimeHoleSet): RuntimeHoleSet {
  const seen = new Set<string>();

  for (const prompt of prompts) {
    const key = prompt.promptInstanceKey as string;
    if (seen.has(key)) {
      throw new Error(`runtime-holes: duplicate prompt instance key: ${key}`);
    }
    seen.add(key);
  }

  return prompts;
}

// Projects the prompt payload authored on a specific phase.
// It does not decide whether this phase is currently legal to ask about.
export function projectPhasePrompts(
  phase: ActivationPhase,
  stepKey: string,
): RuntimeHoleSet {
  const prompts = Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, (attackRollPhase) => [
      ...attachmentHoles(stepKey, attackRollPhase.attachment),
      attackRollHole(stepKey, attackRollPhase.attackKind),
      // Attack-roll damage-type choices are decided before the roll even though
      // Surface nests them under on-hit effects.
      ...phaseOwnedDamageTypeChoiceHolesFromEffects(stepKey, attackRollPhase.onHit),
    ]),
    Match.when({ kind: "save_gate" }, (saveGatePhase) => [
      ...attachmentHoles(stepKey, saveGatePhase.attachment),
      ...(assertNoPhaseOwnedDamageTypePrompts(
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
        ? phaseOwnedDamageTypeChoiceHolesFromEffects(stepKey, directPhase.effects)
        : []),
    ]),
    Match.when({ kind: "ability_check_gate" }, (abilityCheckGatePhase) => [
      ...attachmentHoles(stepKey, abilityCheckGatePhase.attachment),
      ...(assertNoPhaseOwnedDamageTypePrompts(
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

  return assertUniquePromptInstanceKeys(prompts);
}
