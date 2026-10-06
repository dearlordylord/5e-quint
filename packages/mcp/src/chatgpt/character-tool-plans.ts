export const CHATGPT_CHARACTER_TOOLS = {
  advance_class_level: {
    family: "characterMutations",
    description:
      "Advance one class level using the admitted level-gain choices for an available Character Session.",
  },
  apply_lay_on_hands: {
    family: "characterMutations",
    description:
      "Spend the source character’s admitted healing pool to restore a selected character’s HP and optionally remove Poisoned outside Battle.",
  },
  apply_spell_rest_benefit: {
    family: "characterMutations",
    description:
      "Apply an admitted recovery spell’s rest benefit to its eligible recipients, including supplied healing rolls and recovery choices.",
  },
  complete_long_rest: {
    family: "characterMutations",
    description:
      "Complete a Long Rest with table-supplied timing and the character’s admitted recovery and replacement choices.",
  },
  complete_short_rest: {
    family: "characterMutations",
    description:
      "Complete a Short Rest with supplied elapsed time, Hit Die rolls, and admitted recovery choices.",
  },
  convert_font_of_magic_sorcery_points_to_spell_slot: {
    family: "characterMutations",
    description:
      "Spend admitted Sorcery Points to create a spell slot of the selected level outside Battle.",
  },
  convert_font_of_magic_spell_slot_to_sorcery_points: {
    family: "characterMutations",
    description:
      "Spend an available spell slot from the selected source to recover admitted Sorcery Points outside Battle.",
  },
  interrupt_long_rest: {
    family: "characterMutations",
    description:
      "Apply the ordered interruption segments and final completion of a Long Rest together, with supplied cumulative timing and recovery choices.",
  },
  interrupt_short_rest: {
    family: "characterMutations",
    description:
      "Apply a table-reported interruption to a Short Rest for an available Character Session.",
  },
  pass_calendar_time: {
    family: "characterMutations",
    description:
      "Advance table-supplied calendar time and resolve the resulting admitted recovery inputs for an available Character Session.",
  },
  query_ability_check_ability: {
    family: "characterQueries",
    description:
      "Read the ability used for a selected skill check under the character’s admitted active features; does not roll the check.",
  },
  query_ability_check_proficiency_bonus: {
    family: "characterQueries",
    description:
      "Read the character’s applicable proficiency contribution for a skill check and the supplied other-proficiency witness.",
  },
  query_armor_class: {
    family: "characterQueries",
    description:
      "Read Armor Class for the selected admitted base and the character’s retained equipment and features.",
  },
  query_jump_distance_ability: {
    family: "characterQueries",
    description:
      "Read the ability used to determine the character’s jump distance under admitted features.",
  },
  query_known_forms: {
    family: "characterQueries",
    description:
      "Read the character’s retained, admitted Beast-form selections.",
  },
  query_linked_speed_grants: {
    family: "characterQueries",
    description:
      "Read movement-speed grants derived from the character’s admitted features.",
  },
  query_spell_access: {
    family: "characterQueries",
    description:
      "Read the character’s admitted spell-access routes and available resources; does not cast or spend them.",
  },
  query_spell_invocation: {
    family: "characterQueries",
    description:
      "Read admission of the selected spell’s ritual invocation for an available Character Session; does not cast it.",
  },
  query_spellbook_ritual_access: {
    family: "characterQueries",
    description:
      "Read ritual access for one selected spell in the character’s retained spellbook.",
  },
  query_spellbook_ritual_accesses: {
    family: "characterQueries",
    description:
      "Read all ritual-access projections for the character’s retained spellbook.",
  },
  query_weapon_mastery_selections: {
    family: "characterQueries",
    description:
      "Read the retained weapon selections for one admitted weapon-mastery feature.",
  },
  replace_druid_wild_shape_known_form: {
    family: "characterMutations",
    description:
      "Replace one retained known Beast form with an admitted form for an available Character Session.",
  },
  retain_one_at_a_time_companion: {
    family: "characterMutations",
    description:
      "Retain an admitted companion’s selected form and casting source outside Battle, replacing the source’s previous retained companion.",
  },
  set_equipment_loadout: {
    family: "characterMutations",
    description:
      "Apply the selected armor, shield, and weapon loadout changes to an available Character Session.",
  },
  spend_spell_access_free_cast: {
    family: "characterMutations",
    description:
      "Spend one admitted free-cast use for the selected spell-access route outside Battle.",
  },
  use_monk_uncanny_metabolism_when_rolling_initiative: {
    family: "characterMutations",
    description:
      "Apply the admitted recovery feature when Initiative is rolled, using the supplied Martial Arts roll.",
  },
} as const;
