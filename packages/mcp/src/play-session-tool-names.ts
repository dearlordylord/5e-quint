import { BATTLE_TOOL_NAMES } from "./battle-tool-input.ts";
import { CHARACTER_TOOL_NAMES } from "./character-tool-input.ts";
import { CONTENT_TOOL_NAMES } from "./content-tools.ts";
import { DICE_TOOL_NAMES } from "./dice-tool-input.ts";

export const playSessionToolNames = {
  create: "create_play_session",
  read: "read_play_session",
  save: "save_play_session",
  listSaved: "list_saved_play_sessions",
  deleteSaved: "delete_saved_play_session",
} as const;

export const PLAY_SESSION_TOOL_NAMES = [
  playSessionToolNames.create,
  playSessionToolNames.read,
  playSessionToolNames.save,
  playSessionToolNames.listSaved,
  playSessionToolNames.deleteSaved,
] as const;

export type PlaySessionToolName = (typeof PLAY_SESSION_TOOL_NAMES)[number];
export const SAVED_PLAY_SESSION_TOOL_NAMES = [
  playSessionToolNames.save,
  playSessionToolNames.listSaved,
  playSessionToolNames.deleteSaved,
] as const satisfies ReadonlyArray<PlaySessionToolName>;
export const PLAY_SESSION_OPERATION_NAMES = [
  ...PLAY_SESSION_TOOL_NAMES,
  ...CHARACTER_TOOL_NAMES,
  ...BATTLE_TOOL_NAMES,
  ...DICE_TOOL_NAMES,
] as const;
export type PlaySessionOperationName =
  (typeof PLAY_SESSION_OPERATION_NAMES)[number];
export const PLAY_SESSION_NEXT_OPERATION_NAMES = [
  ...PLAY_SESSION_OPERATION_NAMES,
  ...CONTENT_TOOL_NAMES,
] as const;
export type PlaySessionNextOperationName =
  (typeof PLAY_SESSION_NEXT_OPERATION_NAMES)[number];
