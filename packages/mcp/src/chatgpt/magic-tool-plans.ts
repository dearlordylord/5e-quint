export const CHATGPT_MAGIC_TOOLS = {
  adjust_spell_altitude: {
    family: "spells",
    description:
      "Change altitude under an admitted retained suspension effect.",
  },
  allocate_ongoing_spell_damage: {
    family: "spells",
    description:
      "Allocate a new damage application from an admitted existing repeating spell effect.",
  },
  apply_area_damage_and_healing: {
    family: "features",
    description:
      "Use the admitted magical area effect with its declared target-dependent damage and healing.",
  },
  apply_feature_condition: {
    family: "features",
    description:
      "Use the admitted magical feature action to impose its declared save-gated condition.",
  },
  assume_beast_form: {
    family: "companions",
    description:
      "Assume an admitted known Beast form and resolve the declared equipment disposition.",
  },
  cast_spell: {
    family: "spells",
    description:
      "Cast a supported spell with the admitted action, Bonus Action, or Reaction timing; the bound procedure must be a fresh cast, not an existing-effect follow-up.",
  },
  cast_spell_through_companion: {
    family: "companions",
    description:
      "Cast a supported touch spell through the admitted retained companion connection.",
  },
  change_transformation: {
    family: "spells",
    description:
      "Replace the mode of an already active self-transformation, selecting only declared supported modes.",
  },
  dismiss_companion: {
    family: "companions",
    description: "Permanently dismiss an admitted retained companion.",
  },
  dismiss_weapon_imbuement: {
    family: "features",
    description: "Dismiss the actor existing held-weapon imbuement.",
  },
  end_concentration: {
    family: "spells",
    description: "End the actor concentration and its dependent effects.",
  },
  end_ongoing_spell: {
    family: "spells",
    description: "Voluntarily end a supported retained spell effect.",
  },
  gain_extra_action: {
    family: "features",
    description:
      "Spend an admitted resource to grant the declared additional action.",
  },
  grant_inspiration_die: {
    family: "features",
    description: "Grant an admitted inspiration die to an eligible ally.",
  },
  heal_from_resource_pool: {
    family: "features",
    description: "Use the admitted magical healing-pool action.",
  },
  heal_self: {
    family: "features",
    description:
      "Use the admitted self-healing Bonus Action, including any bound healing/movement continuation.",
  },
  hurl_spell_light: {
    family: "spells",
    description:
      "Hurl an existing held spell light using its declared procedure.",
  },
  imbue_held_weapon: {
    family: "features",
    description: "Activate the admitted held-weapon imbuement.",
  },
  move_and_attack_with_spell_proxy: {
    family: "spells",
    description:
      "Reposition and attack with an already active spatial melee spell proxy.",
  },
  move_spell_lights: {
    family: "spells",
    description: "Reposition an existing movable light manifestation.",
  },
  move_spell_zone: {
    family: "spells",
    description: "Reposition an existing movable spell zone without a ram.",
  },
  ram_with_spell_zone: {
    family: "spells",
    description: "Ram a target using an existing movable spell zone.",
  },
  re_evoke_spell_weapon: {
    family: "spells",
    description: "Re-evoke an admitted previously created spell weapon.",
  },
  ready_spell: {
    family: "spells",
    description:
      "Cast and hold a supported action-time spell in readiness for a described trigger.",
  },
  redirect_spell_area: {
    family: "spells",
    description: "Change the direction of a retained directional spell area.",
  },
  release_readied_spell: {
    family: "spells",
    description:
      "Release an already cast, held readied spell in its admitted Reaction window.",
  },
  release_spell_object: {
    family: "spells",
    description: "Release the actor held spell-created object.",
  },
  repeat_spell_contact_damage: {
    family: "spells",
    description: "Repeat an admitted existing object-contact damage effect.",
  },
  replace_attack_with_area_damage: {
    family: "features",
    description:
      "Spend the admitted resource to replace an Attack with its declared area saving-throw damage.",
  },
  resolve_spell_save: {
    family: "spells",
    description:
      "Resolve an admitted ongoing spell saving throw or escape save, with the affected occurrence and request fixed before invocation.",
  },
  return_companion: {
    family: "companions",
    description:
      "Return a temporarily dismissed companion with its placement and initiative inputs.",
  },
  revert_beast_form: {
    family: "companions",
    description: "Dismiss the active Beast form.",
  },
  share_companion_senses: {
    family: "companions",
    description:
      "Use the admitted senses-sharing procedure of a retained companion.",
  },
  steady_aim: {
    family: "features",
    description:
      "Use the admitted steady-aim Bonus Action and its movement restriction.",
  },
  sustain_ongoing_feature: {
    family: "features",
    description:
      "Activate or extend the same admitted ongoing feature occurrence; resource and concentration effects are engine-derived.",
  },
  temporarily_dismiss_companion: {
    family: "companions",
    description: "Temporarily dismiss an admitted retained companion.",
  },
  transfer_spell_mark: {
    family: "spells",
    description:
      "Transfer an already active damage-rider mark to an admitted target.",
  },
  use_granted_area_damage_action: {
    family: "spells",
    description:
      "Use an action granted by an already active area-damage spell.",
  },
} as const;
