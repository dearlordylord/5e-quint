// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression

import type {
  BattleActiveEffect,
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleLightEmitter,
  BattleOngoingSpellEffectRef,
  BattleState,
  BattleTrackedOngoingSpellLightEmitter,
} from "../battle-reducer.ts";
import type { BattleAreaId, CombatantId } from "../identity.ts";

type TrackedOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" | "spiritualWeapon" }
>;
type TrackedAntimagicFieldOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" | "spiritualWeapon" }
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
    sourceEffectId:
      effect.kind === "spellObjectContactDamage"
        ? effect.effectId
        : effect.sourceEffectId,
  };
}

export function ongoingSpellEffectRefEquals(
  left: BattleOngoingSpellEffectRef,
  right: BattleOngoingSpellEffectRef,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (
    left.kind === "antimagicFieldAura" &&
    right.kind === "antimagicFieldAura"
  ) {
    return (
      left.areaId === right.areaId &&
      left.sourceCombatantId === right.sourceCombatantId
    );
  }
  if (
    left.kind === "antimagicFieldAura" ||
    right.kind === "antimagicFieldAura"
  ) {
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
  if (ref.kind === "spellLightEmitter") {
    return `light:${ref.sourceEffectId}`;
  }
  if (ref.kind === "spellActiveEffect") {
    return `active:${ref.activeEffectKind}:${ref.sourceEffectId}`;
  }
  return `antimagic-aura:${ref.sourceCombatantId}:${ref.areaId}`;
}

export function ongoingSpellEffectRefForAntimagicFieldAura(input: {
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
}): BattleOngoingSpellEffectRef {
  return {
    kind: "antimagicFieldAura",
    areaId: input.areaId,
    sourceCombatantId: input.sourceCombatantId,
  };
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
