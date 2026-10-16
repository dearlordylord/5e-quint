export const CHATGPT_MAGIC_TOOLS = {
  adjust_spell_altitude: {
    family: "spells",
    description:
      "Use when a creature changes height through an existing spell effect that permits vertical movement. Start the altitude change currently offered by the battle.",
  },
  allocate_ongoing_spell_damage: {
    family: "spells",
    description:
      "Use when an existing spell effect offers another application of damage. Start that application and request its allocation, target facts, or dice results as needed.",
  },
  apply_area_damage_and_healing: {
    family: "features",
    description:
      "Use when a combatant activates its available feature that damages or heals creatures in an area. Start that feature and request the affected targets and roll results.",
  },
  apply_feature_condition: {
    family: "features",
    description:
      "Use when a combatant activates an available feature that can impose a condition after a Saving Throw. Start the feature and request the target and save result.",
  },
  assume_beast_form: {
    family: "companions",
    description:
      "Use when a combatant transforms into an available known Beast form. Start the offered transformation and request its form and equipment choices.",
  },
  cast_spell: {
    family: "spells",
    description:
      "Cast a supported spell with the admitted action, Bonus Action, or Reaction timing; the bound procedure must be a fresh cast, not an existing-effect follow-up.",
  },
  cast_spell_through_companion: {
    family: "companions",
    description:
      "Use when a combatant casts an available touch spell through its existing companion. Start that companion-delivered casting and request the required target and roll facts.",
  },
  change_transformation: {
    family: "spells",
    description:
      "Use when a combatant changes an option of its already active transformation spell. Select one of the transformation modes currently offered by the battle.",
  },
  dismiss_companion: {
    family: "companions",
    description:
      "Use when a combatant permanently dismisses its existing summoned companion. Start the offered dismissal and update the battle roster.",
  },
  dismiss_weapon_imbuement: {
    family: "features",
    description:
      "Use when a combatant ends the magical enhancement currently applied to its held weapon. Start the offered dismissal of that enhancement.",
  },
  end_concentration: {
    family: "spells",
    description:
      "Use when a combatant voluntarily stops concentrating. End its Concentration and update game effects that depend on it.",
  },
  end_ongoing_spell: {
    family: "spells",
    description:
      "Use when a combatant voluntarily ends an existing spell effect that permits dismissal. Start the dismissal offered for that effect.",
  },
  gain_extra_action: {
    family: "features",
    description:
      "Use when a combatant activates an available feature that grants an extra action. Start that activation and apply its resource cost and action restrictions.",
  },
  grant_inspiration_die: {
    family: "features",
    description:
      "Use when a combatant grants an inspiration die through an available feature. Start the feature and request the eligible ally and any other required choices.",
  },
  heal_from_resource_pool: {
    family: "features",
    description:
      "Use when a combatant heals a creature using its available healing pool. Start that healing feature and request the target and amount required by the battle.",
  },
  heal_self: {
    family: "features",
    description:
      "Use when a combatant chooses its available self-healing Bonus Action. Start that action and request any healing dice results or follow-up movement choices.",
  },
  hurl_spell_light: {
    family: "spells",
    description:
      "Use when a combatant throws a light created by an already active spell. Start the offered throw and request its target and roll results.",
  },
  imbue_held_weapon: {
    family: "features",
    description:
      "Use when a combatant activates an available feature that magically enhances its held weapon. Start that weapon enhancement and request any required choices.",
  },
  move_and_attack_with_spell_proxy: {
    family: "spells",
    description:
      "Use when an existing spell manifestation can move and make a melee spell attack. Start its offered movement-and-attack action and request the target and roll results.",
  },
  move_spell_lights: {
    family: "spells",
    description:
      "Use when a combatant repositions lights created by an existing spell. Start the light-movement option currently offered by the battle.",
  },
  move_spell_zone: {
    family: "spells",
    description:
      "Use when a combatant repositions an existing movable spell area. Start its offered movement without choosing the separate ramming action.",
  },
  ram_with_spell_zone: {
    family: "spells",
    description:
      "Use when a combatant drives an existing movable spell area into a target. Start its offered ramming action and request the required target and save facts.",
  },
  re_evoke_spell_weapon: {
    family: "spells",
    description:
      "Use when a combatant brings back a spell weapon created by an effect that is still active. Start the reappearance option offered for that weapon.",
  },
  ready_spell: {
    family: "spells",
    description:
      "Use when a combatant casts and holds an available Action spell for a future trigger. Start the Ready spell option and request the trigger and casting choices.",
  },
  redirect_spell_area: {
    family: "spells",
    description:
      "Use when a combatant changes the direction of an existing spell area. Start the direction-change option currently offered for that area.",
  },
  release_readied_spell: {
    family: "spells",
    description:
      "Use when a combatant releases a spell it already cast and held for a trigger. Select the offered Reaction and request any remaining targeting or roll facts.",
  },
  release_spell_object: {
    family: "spells",
    description:
      "Use when a combatant lets go of an object held through an existing spell effect. Start the release option currently offered for that object.",
  },
  repeat_spell_contact_damage: {
    family: "spells",
    description:
      "Use when an existing spell on an object offers another application of contact damage. Start that repeat-damage option and request any required target and dice facts.",
  },
  replace_attack_with_area_damage: {
    family: "features",
    description:
      "Use when a combatant replaces an attack with an available area-damage feature. Start the replacement and request its targets, Saving Throws, and damage results.",
  },
  resolve_spell_save: {
    family: "spells",
    description:
      "Use when an existing spell effect requires a Saving Throw, including a save to escape its condition. Start the save currently offered for the affected creature and request the dice result.",
  },
  return_companion: {
    family: "companions",
    description:
      "Use when a combatant brings back its temporarily dismissed companion. Start the offered return and request its placement and Initiative details.",
  },
  revert_beast_form: {
    family: "companions",
    description:
      "Use when a combatant voluntarily ends its active Beast transformation. Start the return to its underlying form and update the saved battle.",
  },
  share_companion_senses: {
    family: "companions",
    description:
      "Use when a combatant perceives through the senses of its existing summoned companion. Start the senses-sharing option currently offered for that companion.",
  },
  steady_aim: {
    family: "features",
    description:
      "Use when a combatant chooses its available Steady Aim Bonus Action. Apply its aiming benefit and movement restriction in the saved battle.",
  },
  sustain_ongoing_feature: {
    family: "features",
    description:
      "Use when a combatant activates or extends an available ongoing feature. Start the offered activation or extension and apply its resource and Concentration requirements.",
  },
  temporarily_dismiss_companion: {
    family: "companions",
    description:
      "Use when a combatant sends its existing summoned companion away temporarily. Start that dismissal while keeping the companion available to return later.",
  },
  transfer_spell_mark: {
    family: "spells",
    description:
      "Use when a combatant moves an existing spell mark to another eligible creature. Start the transfer offered by the battle and request the new target.",
  },
  use_granted_area_damage_action: {
    family: "spells",
    description:
      "Use when an already active spell grants a repeatable area-damage action. Start that offered action and request the affected targets, saves, and damage results.",
  },
} as const;
