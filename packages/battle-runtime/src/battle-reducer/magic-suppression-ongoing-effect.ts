// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-emanation

import type {
  BattleActiveEffect,
  BattleMagicSuppressionOngoingSpellEffectRef,
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
  { readonly kind: "spellObjectContactDamage" | "spatialMeleeSpellAttackProxy" }
>;
type TrackedMagicSuppressionOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" | "spatialMeleeSpellAttackProxy" }
>;

export function ongoingSpellEffectRefForEmitter(
  emitter: BattleTrackedOngoingSpellLightEmitter,
): BattleOngoingSpellEffectRef {
  return {
    kind: "spellLightEmitter",
    effectRef: emitter.effectRef,
  };
}

export function magicSuppressionOngoingSpellEffectRefForEmitter(
  emitter: BattleTrackedOngoingSpellLightEmitter,
): BattleMagicSuppressionOngoingSpellEffectRef {
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

export function magicSuppressionOngoingSpellEffectRefForActiveEffect(
  effect: TrackedMagicSuppressionOngoingSpellActiveEffect,
): BattleMagicSuppressionOngoingSpellEffectRef {
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
      { kind: "magicSuppressionEmanation" },
      (effect) =>
        right.kind === "magicSuppressionEmanation" &&
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
      { kind: "magicSuppressionEmanation" },
      (effect) => `antimagic-aura:${effect.effectRef}`,
    ),
    Match.exhaustive,
  );
}

export function ongoingSpellEffectRefForMagicSuppressionEmanation(input: {
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "magicSuppressionEmanation" }
  >["effectRef"];
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
}): BattleOngoingSpellEffectRef {
  return {
    kind: "magicSuppressionEmanation",
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

export function magicSuppressionOngoingSpellEffectKeys(
  state: BattleState,
): ReadonlySet<string> {
  return new Set(
    [...state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.flatMap((effect) =>
        effect.kind === "magicSuppressionEmanation"
          ? effect.suppressedOngoingSpellEffects.map(ongoingSpellEffectRefKey)
          : [],
      ),
    ),
  );
}

export function ongoingSpellEffectSuppressedByMagicSuppressionEmanation(
  state: BattleState,
  effect: BattleMagicSuppressionOngoingSpellEffectRef,
): boolean {
  return magicSuppressionOngoingSpellEffectKeys(state).has(
    ongoingSpellEffectRefKey(effect),
  );
}
