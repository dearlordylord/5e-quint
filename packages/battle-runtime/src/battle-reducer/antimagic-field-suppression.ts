// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression

import type {
  BattleActiveEffect,
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleLightEmitterMechanicalFacts,
  BattleOngoingSpellEffectRef,
  BattleState,
  BattleTrackedOngoingSpellLightEmitter,
  BattleTrackedOngoingSpellLightEmitterMechanicalFacts,
} from "../battle-state-execution.ts";
import type { BattleAreaId, CombatantId } from "../identity.ts";
import { Match } from "effect";

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
    effectRef: emitter.effectRef,
  };
}

export function antimagicFieldOngoingSpellEffectRefForEmitter(
  emitter: BattleTrackedOngoingSpellLightEmitter,
): BattleAntimagicFieldOngoingSpellEffectRef {
  return {
    kind: "spellLightEmitter",
    effectRef: emitter.effectRef,
  };
}

export function ongoingSpellEffectRefForActiveEffect(
  effect: TrackedOngoingSpellActiveEffect,
): BattleOngoingSpellEffectRef {
  return {
    kind: "spellActiveEffect",
    activeEffectKind: effect.kind,
    effectRef: effect.effectRef,
  };
}

export function antimagicFieldOngoingSpellEffectRefForActiveEffect(
  effect: TrackedAntimagicFieldOngoingSpellActiveEffect,
): BattleAntimagicFieldOngoingSpellEffectRef {
  return {
    kind: "spellActiveEffect",
    activeEffectKind: effect.kind,
    effectRef: effect.effectRef,
  };
}

export function ongoingSpellEffectRefEquals(
  left: BattleOngoingSpellEffectRef,
  right: BattleOngoingSpellEffectRef,
): boolean {
  return Match.value(left).pipe(
    Match.when(
      { kind: "spellLightEmitter" },
      (effect) =>
        right.kind === "spellLightEmitter" &&
        effect.effectRef === right.effectRef,
    ),
    Match.when(
      { kind: "spellActiveEffect" },
      (effect) =>
        right.kind === "spellActiveEffect" &&
        effect.effectRef === right.effectRef &&
        effect.activeEffectKind === right.activeEffectKind,
    ),
    Match.when(
      { kind: "antimagicFieldAura" },
      (effect) =>
        right.kind === "antimagicFieldAura" &&
        effect.effectRef === right.effectRef &&
        effect.areaId === right.areaId &&
        effect.sourceCombatantId === right.sourceCombatantId,
    ),
    Match.exhaustive,
  );
}

export function ongoingSpellEffectRefKey(
  ref: BattleOngoingSpellEffectRef,
): string {
  return Match.value(ref).pipe(
    Match.when(
      { kind: "spellLightEmitter" },
      (effect) => `light:${effect.effectRef}`,
    ),
    Match.when(
      { kind: "spellActiveEffect" },
      (effect) => `active:${effect.activeEffectKind}:${effect.effectRef}`,
    ),
    Match.when(
      { kind: "antimagicFieldAura" },
      (effect) => `antimagic-aura:${effect.effectRef}`,
    ),
    Match.exhaustive,
  );
}

export function ongoingSpellEffectRefForAntimagicFieldAura(input: {
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "antimagicFieldOngoingSpellSuppression" }
  >["effectRef"];
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
}): BattleOngoingSpellEffectRef {
  return {
    kind: "antimagicFieldAura",
    effectRef: input.effectRef,
    areaId: input.areaId,
    sourceCombatantId: input.sourceCombatantId,
  };
}

export function isTrackedOngoingSpellLightEmitter<
  Emitter extends BattleLightEmitterMechanicalFacts,
>(
  emitter: Emitter,
): emitter is Emitter & BattleTrackedOngoingSpellLightEmitterMechanicalFacts {
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
