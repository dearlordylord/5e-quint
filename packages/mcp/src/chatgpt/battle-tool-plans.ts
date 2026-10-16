export const CHATGPT_BATTLE_TOOLS = {
  add_combatant: {
    family: "battleLifecycle",
    description:
      "Add a finalized character or SRD Stat Block to an active Battle using supplied Initiative and combatant details.",
  },
  apply_initiative_swap: {
    family: "battleLifecycle",
    description:
      "During initial Initiative setup, swap an eligible source combatant’s Initiative with a selected willing ally using the supplied ally witness.",
  },
  attack: {
    family: "battleActions",
    description:
      "Make an admitted attack, including off-hand, companion, unarmed, opportunity, retaliation, readied, and retained spell-weapon attacks; the timing and resources remain engine-owned.",
  },
  begin_flurry: {
    family: "battleActions",
    description:
      "Use when the active combatant chooses its available Flurry of Blows option. Start the extra unarmed-strike sequence; make each offered strike separately with attack.",
  },
  compelled_drop: {
    family: "battleActions",
    description:
      "Use when a combatant must drop what it is holding because of an active game effect. Apply that combatant's available compelled-drop action.",
  },
  compelled_grovel: {
    family: "battleActions",
    description:
      "Use when an active game effect requires a combatant to fall Prone and end its turn. Start the offered compelled-grovel action.",
  },
  dash: {
    family: "battleActions",
    description:
      "Take Dash at the admitted action cost, including granted Bonus Action costs and their derived riders.",
  },
  decline_reaction: {
    family: "reactions",
    description:
      "Use when the player declines the Reaction currently offered to a combatant. Continue the interrupted game action without spending that Reaction.",
  },
  discover_battle_acts: {
    family: "battleReads",
    description:
      "Read available acts, including the ChatGPT tool for each executable selection.",
  },
  disengage: {
    family: "battleActions",
    description: "Take Disengage at the admitted action cost.",
  },
  disperse_spell_area: {
    family: "events",
    description:
      "Use when the table reports an environmental event that ends an existing spell area. Record the offered event and update the affected game effect.",
  },
  dodge: {
    family: "battleActions",
    description: "Take Dodge at the admitted action cost.",
  },
  end_battle: {
    family: "battleLifecycle",
    description:
      "Retain the existing end_battle operation and its current input contract.",
  },
  end_turn: {
    family: "battleActions",
    description:
      "Use when the player ends the active combatant's turn. Advance turn-end effects and request any required rolls or Reaction decisions before moving to the next turn.",
  },
  escape_grapple: {
    family: "battleActions",
    description: "Attempt to escape an existing grapple.",
  },
  escape_spell_restraint: {
    family: "battleActions",
    description: "Attempt to escape an existing spell restraint.",
  },
  finalize_initial_initiative_setup: {
    family: "battleLifecycle",
    description:
      "Finalize initial Initiative setup after the chosen Initiative swaps and return the active Battle’s first checkpoint.",
  },
  focus_dash_and_disengage: {
    family: "battleActions",
    description:
      "Use when a combatant chooses its available focus-powered Dash and Disengage option. Start that combined movement action and apply its resource cost.",
  },
  focus_disengage_and_dodge: {
    family: "battleActions",
    description:
      "Use when a combatant chooses its available focus-powered Disengage and Dodge option. Start that combined defensive action and apply its resource cost.",
  },
  grapple: {
    family: "battleActions",
    description: "Attempt to grapple a creature.",
  },
  help_attack: {
    family: "battleActions",
    description: "Assist a specified ally attack against a specified enemy.",
  },
  hide: {
    family: "battleActions",
    description:
      "Attempt to hide with the admitted circumstances and action cost.",
  },
  move: {
    family: "battleActions",
    description:
      "Move a creature, including readied movement, compulsory approach/flee, and a granted movement-cost replacement; each lane validates its own permissions.",
  },
  multiattack: {
    family: "battleActions",
    description:
      "Use when an installed monster chooses its available Multiattack action. Start the configured attack sequence and request the targets and rolls needed to complete it.",
  },
  read_battle_state: {
    family: "battleReads",
    description:
      "Retain the existing read_battle_state operation and its current input contract.",
  },
  ready_action: {
    family: "battleActions",
    description:
      "Use when a combatant prepares an available action or movement for a future trigger. Record the chosen response and trigger, then wait for that trigger before releasing the response.",
  },
  reduce_ability_check: {
    family: "reactions",
    description:
      "Use an admitted Reaction procedure to reduce the interrupted ability check.",
  },
  reduce_attack_damage: {
    family: "reactions",
    description:
      "Use an admitted Reaction procedure to reduce attack damage at its reduction stage.",
  },
  reduce_attack_roll: {
    family: "reactions",
    description:
      "Use an admitted Reaction procedure to reduce the interrupted attack roll.",
  },
  reduce_damage_roll: {
    family: "reactions",
    description:
      "Use an admitted Reaction procedure to reduce the interrupted damage roll.",
  },
  reduce_fall_damage: {
    family: "reactions",
    description:
      "Use an admitted Reaction procedure to reduce the reported falling damage.",
  },
  release_grapple: {
    family: "battleActions",
    description:
      "Use when a combatant voluntarily releases a creature it is grappling. Update the selected grapple in the saved battle.",
  },
  remove_combatant: {
    family: "battleLifecycle",
    description:
      "Remove a selected combatant from an active Battle and return the updated roster, including any linked combatants removed with it.",
  },
  report_area_departure: {
    family: "events",
    description:
      "Use when the table reports that a creature left an existing spell area. Record the departure and process the exit effects offered by the game engine.",
  },
  report_area_removal: {
    family: "events",
    description:
      "Use when the table reports that an existing spell area was removed. Update any condition or escape effect tied to that area.",
  },
  report_condition_attempt: {
    family: "events",
    description:
      "Use when an effect tries to impose a condition on a creature with an active protective effect. Record the offered attempt so the engine can check that protection.",
  },
  report_creature_fall: {
    family: "events",
    description:
      "Use when the table reports that a creature starts falling. Record the fall and offer eligible Reactions. Supply reactionSpellTargetFacts from the table, using [] when no qualifying targets exist.",
  },
  report_linked_defense_separation: {
    family: "events",
    description:
      "Use when the table reports that linked creatures have separated enough to end their shared defensive effect. Record the offered separation event.",
  },
  report_possession_attempt: {
    family: "events",
    description:
      "Use when an effect tries to possess a creature with active protection against possession. Record the offered attempt so the engine can check that protection.",
  },
  report_ready_trigger: {
    family: "events",
    description:
      "Use when the table confirms that a prepared action's trigger occurred. Record the trigger and offer the eligible readied response.",
  },
  search: {
    family: "battleActions",
    description: "Take the supported Search action.",
  },
  select_stat_block: {
    family: "battleLifecycle",
    description:
      "Retain the existing select_stat_block operation and its current input contract.",
  },
  shake_awake: {
    family: "battleActions",
    description:
      "Awaken a creature from a supported sleep effect, with the effect-specific admission checked.",
  },
  shove: {
    family: "battleActions",
    description: "Attempt to shove a creature.",
  },
  stand_up: {
    family: "battleActions",
    description:
      "Use when the active combatant chooses to stand from Prone. Apply the movement cost and update its condition in the saved battle.",
  },
  start_battle: {
    family: "battleLifecycle",
    description:
      "Retain the existing start_battle operation and its current input contract.",
  },
} as const;
