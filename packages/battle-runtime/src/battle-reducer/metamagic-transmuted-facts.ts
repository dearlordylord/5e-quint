import type { DamageType } from "@dnd/surface/surface/types";
import type { CharacterBattleMetamagicEffectKind } from "../character-battle-resources.ts";

export const TRANSMUTED_METAMAGIC_EFFECT_KIND =
  "damage_type_substitution" satisfies CharacterBattleMetamagicEffectKind;

export const TRANSMUTED_SPELL_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;

export type TransmutedSpellDamageType =
  (typeof TRANSMUTED_SPELL_DAMAGE_TYPES)[number];
