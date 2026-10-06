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
      "Spend the admitted resource to grant the Flurry attack sequence; individual strikes use attack.",
  },
  compelled_drop: {
    family: "battleActions",
    description: "Fulfil an admitted compulsion to drop held objects.",
  },
  compelled_grovel: {
    family: "battleActions",
    description:
      "Fulfil an admitted compulsion to become Prone and end the turn as required.",
  },
  dash: {
    family: "battleActions",
    description:
      "Take Dash at the admitted action cost, including granted Bonus Action costs and their derived riders.",
  },
  decline_reaction: {
    family: "reactions",
    description:
      "Decline the current responder Reaction offer without executing a nested operation.",
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
      "Report the qualifying environmental dispersal of an existing supported spell area.",
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
      "End the active turn, including its declared turn-boundary continuations.",
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
      "Spend the admitted focus resource to Dash and Disengage together.",
  },
  focus_disengage_and_dodge: {
    family: "battleActions",
    description:
      "Spend the admitted focus resource to Disengage and Dodge together.",
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
    description: "Resolve an admitted stat-block Multiattack sequence.",
  },
  read_battle_state: {
    family: "battleReads",
    description:
      "Retain the existing read_battle_state operation and its current input contract.",
  },
  ready_action: {
    family: "battleActions",
    description:
      "Prepare an admitted action, attack, or movement response to a described trigger; preparation does not execute the selected response.",
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
    description: "Release a grapple held by the actor.",
  },
  remove_combatant: {
    family: "battleLifecycle",
    description:
      "Remove a selected combatant from an active Battle and return the updated roster, including any linked combatants removed with it.",
  },
  report_area_departure: {
    family: "events",
    description:
      "Report departure from an admitted retained spell area and apply its declared exit effects.",
  },
  report_area_removal: {
    family: "events",
    description:
      "Report removal of an admitted area and settle its affected escape binding.",
  },
  report_condition_attempt: {
    family: "events",
    description:
      "Report an incoming condition attempt against a creature protected by the retained effect.",
  },
  report_creature_fall: {
    family: "events",
    description:
      "Report a creature fall and open the admitted falling-creature Reaction window. Supply reactionSpellTargetFacts on the initial report, using [] when the table confirms no qualifying target facts.",
  },
  report_linked_defense_separation: {
    family: "events",
    description:
      "Report separation invalidating an admitted retained linked-defense effect.",
  },
  report_possession_attempt: {
    family: "events",
    description:
      "Report an incoming possession attempt against a creature protected by the retained effect.",
  },
  report_ready_trigger: {
    family: "events",
    description:
      "Report that a held readied response trigger occurred; release remains a separately typed operation.",
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
    description: "Spend the admitted movement to stand from Prone.",
  },
  start_battle: {
    family: "battleLifecycle",
    description:
      "Retain the existing start_battle operation and its current input contract.",
  },
} as const;
