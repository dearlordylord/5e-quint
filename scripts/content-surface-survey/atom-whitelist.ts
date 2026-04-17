// v4 atom + relation whitelist, plus prototype Stage 1/2 extensions.
//
// Source of truth for the authoritative taxonomy:
//   .references/xphb-srd-pairing/TAXONOMY_atoms_graph.md (v4)
//   .references/xphb-srd-pairing/TAXONOMY_graph_representation.md (v1)
//
// Prototype-side extensions are documented in the prototype surface
// types.ts and the stage 1/2 widenings discussed in this project.

export const V4_SOURCE_ATOMS = [
  "spell_root",
  "feat_root",
  "class_feature_root",
  "subclass_feature_root",
  "species_trait_root",
  "background_trait_root",
  "item_property_root",
  "mastery_root",
  "magic_item_root",
] as const;

export const V4_PROCEDURE_ATOMS = [
  "activate",
  "respond",
  "prepare",
  "prompt",
  "commit",
  "choose",
  "grant",
  "replace",
  "store",
  "release",
  "suppress",
  "restore",
  "attune",
  "refund",
] as const;

export const V4_ATTACHMENT_ATOMS = [
  "self",
  "target",
  "area",
  "object",
  "location",
  "weapon",
  "item",
  "companion",
  "stored_spell",
  "attack_proxy",
  "mark",
] as const;

export const V4_WINDOW_ATOMS = [
  "action_window",
  "bonus_action_window",
  "reaction_window",
  "spell_cast_window",
  "turn_start_window",
  "turn_end_window",
  "on_hit_window",
  "on_miss_window",
  "post_roll_window",
  "initiative_window",
  "post_action_window",
  "duration_window",
  "rest_window",
] as const;

export const V4_RESOLUTION_ATOMS = [
  "attack_roll",
  "melee_spell_attack",
  "save_gate",
  "repeat_save",
  "ability_check",
  "interrupt_resolution",
  "condition_progression",
] as const;

export const V4_LIFECYCLE_ATOMS = [
  "concentrate",
  "persist",
  "expire",
  "dismiss",
  "complete",
  "break",
  "self_break",
  "return_on_end",
  "replace_on_recast",
] as const;

export const V4_RESOURCE_ATOMS = [
  "spell_slot",
  "charge",
  "use_count",
  "attunement_slot",
] as const;

export const V4_SCALING_ATOMS = [
  "scale_target_count",
  "scale_numeric_bonus",
  "scale_die_count",
  "scale_die_size",
  "scale_attack_count",
] as const;

export const V4_EFFECT_ATOMS = [
  "damage",
  "heal",
  "modify_max_hp",
  "modify_ac",
  "modify_roll_numeric",
  "modify_roll_advantage",
  "modify_roll_reroll",
  "modify_roll_substitute",
  "modify_speed",
  "modify_range",
  "grant_hover",
  "grant_sense",
  "grant_proficiency",
  "grant_spell_access",
  "grant_resistance",
  "bypass_resistance",
  "grant_extra_action",
  "restrict_action_set",
  "apply_condition",
  "remove_condition",
  "move",
  "force_move",
  "transport_exile",
  "block_targeting",
  "block_travel",
  "negate_named_effect",
  "deny_opportunity_attack",
  "create_companion",
  "command_companion",
  "telepathic_link",
  "deliver_touch_spell",
  "create_object",
  "create_attack_proxy",
  "mark_target",
  "transfer_mark",
  "alter_item_kind",
  "fall_on_end",
] as const;

export const V4_RELATIONS = [
  "roots",
  "opens_window",
  "requires",
  "attaches_to",
  "stores",
  "releases",
  "grants",
  "consumes",
  "refunds",
  "suppresses",
  "replaces",
  "modifies",
  "persists_until",
  "branches_on_completion",
  "branches_on_save",
  "prepares",
  "prompts",
  "commits",
  "transfers_to",
  "returns_to",
] as const;

// Prototype-side extensions beyond strict v4. These are atoms this project
// has added in Stage 1/2 widenings with documented SRD pressure cases and
// UBIQUITOUS_LANGUAGE backing, but which are NOT yet in the research repo's
// TAXONOMY_atoms_graph.md. Survey treats them as valid (not widenings)
// since they're already in the prototype surface.

export const STAGE_1_2_EXTENSIONS = [
  // Quota-shape resource atoms (UBIQUITOUS_LANGUAGE §Resource Consumption
  // line 38; Stage 1 of the prototype red/green loop).
  "action_quota",
  "bonus_action_quota",
  "reaction_quota",
  // Lock-shape resource atom (UBIQUITOUS_LANGUAGE §Resource Consumption
  // line 39; Stage 1 concentration follow-up).
  "concentration_lock",
] as const;

// Stage 3 extensions: atoms the prototype surface already emits via the
// tracer but which are not yet in the v4 research graph. Added to the
// whitelist because the types.ts surface defines them as first-class
// variants (e.g. `half_damage` sentinel, `charge_pool` resource,
// `set_ability_score` effect) — flagging them as "unknown" would surface
// a phantom atom_widening verdict on units that encode cleanly.
export const STAGE_3_EXTENSIONS = [
  // Resource atoms beyond v4's {spell_slot, charge, use_count, attunement_slot}.
  "attack_slot", // Activation: consumes one of the attacker's attacks (Breath Weapon, Extra Attack).
  "charge_pool", // Magic-item charge aggregate (Wand of Magic Missiles, Ring of the Ram).
  // Procedure atom for direct phases (no D20 test) — tracer emits this
  // instead of resolution atoms when ActivationPhase.kind === "direct".
  "direct_apply",
  // Effect atoms: save-gate half-damage sentinel + ability-score setter.
  "half_damage", // Fireball-family "half on success" outcome.
  "set_ability_score", // Amulet of Health "Con becomes 19".
  // Lifecycle atom for magic-item destruction (Wand of Magic Missiles
  // last-charge d20 destruction, single-use wand expiration).
  "item_destruction",
  // Resolution-category predicate atoms emitted by the tracer's
  // EquipmentPredicate dispatch (Defense feat gates modify_ac on armor,
  // fighting-style feats gate bonuses on weapon category).
  "wearing_armor",
  "wielding_weapon",
  // Effect atoms for movement/senses/detection/crit-range modification —
  // first-class surface primitives beyond v4's modify_speed / grant_sense.
  "teleport", // Misty Step, Dimension Door (short-range positional).
  "grant_speed", // Fly (fly speed), Spider Climb (climb speed).
  "detect", // Detect Magic, Detect Evil and Good (radius + property).
  "modify_crit_range", // Improved Critical (crit on 19-20).
  "set_speed", // Hypnotic Pattern ("Speed of 0"). Distinct from modify_speed.
  "composite", // Bundle multiple effects in a single slot (Hypnotic Pattern).
  // Effect atoms that are first-class EffectAtom variants in types.ts
  // but whose atomKind strings the tracer emits aren't in the V4
  // effect-atom list above. Listed here so units exercising them don't
  // trip a false atom_widening verdict.
  "grant_temp_hp", // false_life, Aid alternative, Inspiring Leader.
  "grant_condition_immunity", // Mind Blank, Heroism (frightened), Freedom of Movement, Protection from Poison.
  "grant_feat", // ASI "take a feat instead", Fighter bonus feats.
  "grant_damage_immunity", // §A16 — Mind Blank (Psychic), future Holy Aura.
  "block_max_hp_reduction", // §A16 — Aura of Life "HP maxes can't be reduced".
  "set_speed_ratio", // Spirit Guardians / Slow — halve speed inside area / on target.
  "negate_triggering_spell", // §C1 Counterspell — negate whatever spell fired the reaction.
  "end_ongoing_spells", // §C3 Dispel Magic — end ongoing spells on target up to a level bound.
  "maximize_healing_received", // Beacon of Hope — take max on healing dice.
  "transform_target", // §C4d Polymorph family — swap target stat block for a catalog-ref form.
  "natural_weapons", // §C4e Alter Self — replace default Unarmed Strike profile.
  "water_breathing", // §C4e Alter Self — breathe underwater while the mode persists.
] as const;

// Stage 3 relation extensions: tracer-emitted relations beyond v4.
export const STAGE_3_RELATIONS = [
  "repeats_as", // repeat_save cadence edge.
  "lifecycle", // magic-item destruction edge from root → item_destruction.
] as const;

export const ALL_KNOWN_ATOMS: ReadonlyArray<string> = [
  ...V4_SOURCE_ATOMS,
  ...V4_PROCEDURE_ATOMS,
  ...V4_ATTACHMENT_ATOMS,
  ...V4_WINDOW_ATOMS,
  ...V4_RESOLUTION_ATOMS,
  ...V4_LIFECYCLE_ATOMS,
  ...V4_RESOURCE_ATOMS,
  ...V4_SCALING_ATOMS,
  ...V4_EFFECT_ATOMS,
  ...STAGE_1_2_EXTENSIONS,
  ...STAGE_3_EXTENSIONS,
];

export const ALL_KNOWN_RELATIONS: ReadonlyArray<string> = [
  ...V4_RELATIONS,
  ...STAGE_3_RELATIONS,
];

export function isKnownAtom(kind: string): boolean {
  return ALL_KNOWN_ATOMS.includes(kind);
}

export function isKnownRelation(kind: string): boolean {
  return ALL_KNOWN_RELATIONS.includes(kind);
}
