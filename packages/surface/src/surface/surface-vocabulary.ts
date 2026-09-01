import type { ReadonlyNonEmptyArray, SpellSchool } from "@dnd/shared/types";

export const SURFACE_WEAPON_FILTER_SOURCE_ITEM = "source_item" as const;
export const SURFACE_WEAPON_FILTER_WEAPON_CATEGORY = "weapon_category" as const;
export const SURFACE_WEAPON_FILTER_WEAPON_PROPERTY = "weapon_property" as const;
export const SURFACE_WEAPON_FILTER_SPECIFIC_ITEM = "specific_item" as const;

export const SURFACE_WEAPON_FILTER_CATEGORIES = ["melee", "ranged"] as const;
export const SURFACE_WEAPON_PROPERTY_AMMUNITION = "ammunition" as const;
export const SURFACE_WEAPON_PROPERTY_FINESSE = "finesse" as const;
export const SURFACE_WEAPON_PROPERTY_HEAVY = "heavy" as const;
export const SURFACE_WEAPON_PROPERTY_LIGHT = "light" as const;
export const SURFACE_WEAPON_PROPERTY_LOADING = "loading" as const;
export const SURFACE_WEAPON_PROPERTY_REACH = "reach" as const;
export const SURFACE_WEAPON_PROPERTY_THROWN = "thrown" as const;
export const SURFACE_WEAPON_PROPERTY_TWO_HANDED = "two_handed" as const;
export const SURFACE_WEAPON_PROPERTY_VERSATILE = "versatile" as const;
export const SURFACE_WEAPON_PROPERTIES = [
  SURFACE_WEAPON_PROPERTY_AMMUNITION,
  SURFACE_WEAPON_PROPERTY_FINESSE,
  SURFACE_WEAPON_PROPERTY_HEAVY,
  SURFACE_WEAPON_PROPERTY_LIGHT,
  SURFACE_WEAPON_PROPERTY_LOADING,
  SURFACE_WEAPON_PROPERTY_REACH,
  SURFACE_WEAPON_PROPERTY_THROWN,
  SURFACE_WEAPON_PROPERTY_TWO_HANDED,
  SURFACE_WEAPON_PROPERTY_VERSATILE,
] as const;

export type SurfaceWeaponFilter<ItemReference = string> =
  | { readonly kind: typeof SURFACE_WEAPON_FILTER_SOURCE_ITEM }
  | {
      readonly kind: typeof SURFACE_WEAPON_FILTER_WEAPON_CATEGORY;
      readonly category: (typeof SURFACE_WEAPON_FILTER_CATEGORIES)[number];
    }
  | {
      readonly kind: typeof SURFACE_WEAPON_FILTER_WEAPON_PROPERTY;
      readonly property: (typeof SURFACE_WEAPON_PROPERTIES)[number];
    }
  | {
      readonly kind: typeof SURFACE_WEAPON_FILTER_SPECIFIC_ITEM;
      readonly itemId: ItemReference;
    };

export const SURFACE_SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type SurfaceSpellLevel = (typeof SURFACE_SPELL_LEVELS)[number];

export type SurfaceSpellSchool = SpellSchool;

export const SURFACE_REACTION_SPELL_COMPONENTS = ["V", "S", "M"] as const;
export const SURFACE_REACTION_SPELL_SAVE_OUTCOMES = [
  "success",
  "failure",
] as const;

export const SURFACE_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL =
  "hit_by_attack_roll" as const;
export const SURFACE_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE =
  "takes_damage_from_creature" as const;
export const SURFACE_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS =
  "self_or_visible_creature_falls" as const;
export const SURFACE_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL =
  "targeted_by_named_spell" as const;
export const SURFACE_REACTION_TRIGGER_CREATURE_CASTS_SPELL =
  "creature_casts_spell" as const;
export const SURFACE_REACTION_TRIGGER_SPELL_SAVE_OUTCOME =
  "spell_save_outcome" as const;
export const SURFACE_REACTION_TRIGGER_ANY_OF = "any_of" as const;
export const SURFACE_REACTION_FALL_RANGE_FEET = 60 as const;

export const SURFACE_REACTION_TRIGGER_KINDS = [
  SURFACE_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL,
  SURFACE_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE,
  SURFACE_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS,
  SURFACE_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL,
  SURFACE_REACTION_TRIGGER_CREATURE_CASTS_SPELL,
  SURFACE_REACTION_TRIGGER_SPELL_SAVE_OUTCOME,
  SURFACE_REACTION_TRIGGER_ANY_OF,
] as const;

export type SurfaceReactionTriggerKind =
  (typeof SURFACE_REACTION_TRIGGER_KINDS)[number];

export type SurfaceReactionTriggerMember<SpellReference> =
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL;
      readonly weaponFilter?: SurfaceWeaponFilter;
    }
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE;
      readonly requiresVisibleCreature?: true;
      readonly rangeFeet?: number;
    }
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS;
      readonly rangeFeet: typeof SURFACE_REACTION_FALL_RANGE_FEET;
    }
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL;
      readonly spellId: SpellReference;
    }
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_CREATURE_CASTS_SPELL;
      readonly components: ReadonlyNonEmptyArray<
        (typeof SURFACE_REACTION_SPELL_COMPONENTS)[number]
      >;
      readonly spellLevelAtMost?: SurfaceSpellLevel;
      readonly requiresVisibleCaster?: true;
    }
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_SPELL_SAVE_OUTCOME;
      readonly outcome: (typeof SURFACE_REACTION_SPELL_SAVE_OUTCOMES)[number];
      readonly spellLevelAtMost?: SurfaceSpellLevel;
      readonly spellSchool?: SurfaceSpellSchool;
      readonly spellTargetsOnlySelf?: true;
      readonly spellHasNoAreaOfEffect?: true;
    };

export type SurfaceReactionTrigger<SpellReference> =
  | SurfaceReactionTriggerMember<SpellReference>
  | {
      readonly kind: typeof SURFACE_REACTION_TRIGGER_ANY_OF;
      readonly triggers: ReadonlyNonEmptyArray<
        SurfaceReactionTrigger<SpellReference>
      >;
    };
