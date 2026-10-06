export const CHATGPT_CONTEXT_TOOLS = {
  answer_battle_hole: {
    family: "battleFacts",
    description:
      "Submit one table fact for an ordinary hole of the current pending Battle transaction. The transaction owns the subject; this tool cannot select an Act or Reaction. Copy a current holeId and supply its typed fact. Select Reactions through their named operation tools.",
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
  discover_creation_holes: {
    family: "creation",
    description:
      "Retain the existing discover_creation_holes operation and its current input contract.",
  },
  fill_creation_holes: {
    family: "creation",
    description:
      "Retain the existing fill_creation_holes operation and its current input contract.",
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
