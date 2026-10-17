export const CHATGPT_CONTEXT_TOOLS = {
  provide_battle_input: {
    family: "battleFacts",
    description:
      "Use when the battle is waiting for a player choice, target fact, or dice result after an action has started. Copy the requested holeId and submit one matching fill. Return the updated battle or its next input request. Choose offered Reactions through their named tools.",
  },
  create_character_draft: {
    family: "creation",
    description:
      "Retain the existing create_character_draft operation and its current input contract.",
  },
  create_play_session: {
    family: "sessions",
    description:
      "Retain the existing create_play_session operation and its current input contract.",
  },
  delete_saved_play_session: {
    family: "sessions",
    description:
      "Retain the existing delete_saved_play_session operation and its current input contract.",
  },
  describe_mcp_workflow: {
    family: "catalog",
    description:
      "Retain the existing describe_mcp_workflow operation and its current input contract.",
  },
  get_character_creation_choices: {
    family: "creation",
    description:
      "Retain the existing get_character_creation_choices operation and its current input contract.",
  },
  apply_character_creation_choices: {
    family: "creation",
    description:
      "Retain the existing apply_character_creation_choices operation and its current input contract.",
  },
  finalize_character: {
    family: "creation",
    description:
      "Retain the existing finalize_character operation and its current input contract.",
  },
  inspect_catalog_unit: {
    family: "catalog",
    description:
      "Retain the existing inspect_catalog_unit operation and its current input contract.",
  },
  inspect_character_session: {
    family: "characterReads",
    description:
      "Retain the existing inspect_character_session operation and its current input contract.",
  },
  list_catalog_units: {
    family: "catalog",
    description:
      "Retain the existing list_catalog_units operation and its current input contract.",
  },
  list_characters: {
    family: "characterReads",
    description:
      "Retain the existing list_characters operation and its current input contract.",
  },
  list_saved_play_sessions: {
    family: "sessions",
    description:
      "Retain the existing list_saved_play_sessions operation and its current input contract.",
  },
  list_stat_blocks: {
    family: "catalog",
    description:
      "Retain the existing list_stat_blocks operation and its current input contract.",
  },
  read_play_session: {
    family: "sessions",
    description:
      "Retain the existing read_play_session operation and its current input contract.",
  },
  roll_dice: {
    family: "dice",
    description:
      "Retain the existing roll_dice operation and its current input contract.",
  },
} as const;
