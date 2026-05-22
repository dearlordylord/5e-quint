// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression

import type {
  BattleActiveEffect,
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleLightEmitter,
  BattleOngoingSpellEffectRef,
  BattleState,
  BattleTrackedOngoingSpellLightEmitter,
} from "../battle-reducer.ts";

type TrackedOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" | "spiritualWeapon" }
>;
type TrackedAntimagicFieldOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" }
>;

export function ongoingSpellEffectRefForEmitter(
  emitter: BattleTrackedOngoingSpellLightEmitter,
): BattleOngoingSpellEffectRef {
  return {
    kind: "spellLightEmitter",
    sourceEffectId: emitter.sourceEffectId,
  };
}

export function antimagicFieldOngoingSpellEffectRefForEmitter(
  emitter: BattleTrackedOngoingSpellLightEmitter,
): BattleAntimagicFieldOngoingSpellEffectRef {
  return {
    kind: "spellLightEmitter",
    sourceEffectId: emitter.sourceEffectId,
  };
}

export function ongoingSpellEffectRefForActiveEffect(
  effect: TrackedOngoingSpellActiveEffect,
): BattleOngoingSpellEffectRef {
  return {
    kind: "spellActiveEffect",
    activeEffectKind: effect.kind,
    sourceEffectId:
      effect.kind === "spellObjectContactDamage"
        ? effect.effectId
        : effect.sourceEffectId,
  };
}

export function antimagicFieldOngoingSpellEffectRefForActiveEffect(
  effect: TrackedAntimagicFieldOngoingSpellActiveEffect,
): BattleAntimagicFieldOngoingSpellEffectRef {
  return {
    kind: "spellActiveEffect",
    activeEffectKind: effect.kind,
    sourceEffectId: effect.effectId,
  };
}

export function ongoingSpellEffectRefEquals(
  left: BattleOngoingSpellEffectRef,
  right: BattleOngoingSpellEffectRef,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  return (
    left.sourceEffectId === right.sourceEffectId &&
    (left.kind !== "spellActiveEffect" ||
      right.kind !== "spellActiveEffect" ||
      left.activeEffectKind === right.activeEffectKind)
  );
}

export function ongoingSpellEffectRefKey(
  ref: BattleOngoingSpellEffectRef,
): string {
  return ref.kind === "spellLightEmitter"
    ? `light:${ref.sourceEffectId}`
    : `active:${ref.activeEffectKind}:${ref.sourceEffectId}`;
}

export function isTrackedOngoingSpellLightEmitter(
  emitter: BattleLightEmitter,
): emitter is BattleTrackedOngoingSpellLightEmitter {
  return (
    emitter.kind === "spellLightEmitter" &&
    "sourceEffectId" in emitter &&
    "sourceSpellLevel" in emitter
  );
}

export function antimagicFieldSuppressedOngoingSpellEffectKeys(
  state: BattleState,
): ReadonlySet<string> {
  return new Set(
    [...state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.flatMap((effect) =>
        effect.kind === "antimagicFieldOngoingSpellSuppression"
          ? effect.suppressedOngoingSpellEffects.map(ongoingSpellEffectRefKey)
          : [],
      ),
    ),
  );
}

export function ongoingSpellEffectSuppressedByAntimagicField(
  state: BattleState,
  effect: BattleAntimagicFieldOngoingSpellEffectRef,
): boolean {
  return antimagicFieldSuppressedOngoingSpellEffectKeys(state).has(
    ongoingSpellEffectRefKey(effect),
  );
}
