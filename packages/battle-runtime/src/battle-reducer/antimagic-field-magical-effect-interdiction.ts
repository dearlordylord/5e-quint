// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-magical-effect-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
//
// SRD 5.2.1 Antimagic Field prevents spells, magic items, and other magical
// effects from targeting or otherwise affecting anything inside its aura. This
// boundary consumes the shared aura-membership witness owned by Antimagic Field
// suppression; table geometry remains outside this owner.

import type { BattleState } from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./antimagic-field-action-interdiction.ts";

const MAGICAL_EFFECT_SOURCE_KINDS = [
  "spell",
  "magicItem",
  "otherMagicalEffect",
] as const;

export type BattleMagicalEffectSourceKind =
  (typeof MAGICAL_EFFECT_SOURCE_KINDS)[number];

export type BattleMagicalEffectSource = {
  readonly kind: BattleMagicalEffectSourceKind;
};

export const SPELL_MAGICAL_EFFECT_SOURCE = {
  kind: "spell",
} as const satisfies BattleMagicalEffectSource;

export const MAGIC_ITEM_MAGICAL_EFFECT_SOURCE = {
  kind: "magicItem",
} as const satisfies BattleMagicalEffectSource;

export const OTHER_MAGICAL_EFFECT_SOURCE = {
  kind: "otherMagicalEffect",
} as const satisfies BattleMagicalEffectSource;

export const ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE =
  "Magical effects can't target or otherwise affect things inside an Antimagic Field aura.";

export function magicalEffectTargetsInterdictedByAntimagicField(input: {
  readonly state: BattleState;
  readonly source: BattleMagicalEffectSource;
  readonly targetIds: readonly CombatantId[];
}): boolean {
  return (
    magicalEffectSourceIsBlockedByAntimagicField(input.source) &&
    input.targetIds.some((targetId) =>
      combatantInsideActiveAntimagicFieldAura(input.state, targetId),
    )
  );
}

export function magicalEffectTargetsInterdictionMessage(input: {
  readonly state: BattleState;
  readonly source: BattleMagicalEffectSource;
  readonly targetIds: readonly CombatantId[];
}): string | null {
  return magicalEffectTargetsInterdictedByAntimagicField(input)
    ? ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE
    : null;
}

function magicalEffectSourceIsBlockedByAntimagicField(
  source: BattleMagicalEffectSource,
): boolean {
  return MAGICAL_EFFECT_SOURCE_KINDS.includes(source.kind);
}
