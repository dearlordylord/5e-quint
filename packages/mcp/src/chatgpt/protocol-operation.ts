import { Match } from "effect";
import {
  PLAY_SESSION_OPERATION_NAMES,
  type PlaySessionOperationName,
} from "../play-session-tool-names.ts";
import {
  CHATGPT_TOOL_PLAN,
  type ChatGptToolName,
  type ChatGptToolFamily,
} from "./tool-catalog.ts";

type NamesOutsideFamilies<Families extends string> = {
  [Name in ChatGptToolName]: (typeof CHATGPT_TOOL_PLAN)[Name]["family"] extends Families
    ? never
    : Name;
}[ChatGptToolName];
export type ChatGptStatefulToolName = NamesOutsideFamilies<
  "sessions" | "catalog"
>;
const BATTLE_OPERATION_TOOL_FAMILIES = [
  "battleActions",
  "spells",
  "features",
  "events",
  "reactions",
  "companions",
] as const satisfies readonly ChatGptToolFamily[];
export type ChatGptBattleOperationToolName = Exclude<
  ChatGptToolName,
  NamesOutsideFamilies<(typeof BATTLE_OPERATION_TOOL_FAMILIES)[number]>
>;
export function isChatGptBattleOperationToolName(
  name: ChatGptToolName,
): name is ChatGptBattleOperationToolName {
  return BATTLE_OPERATION_TOOL_FAMILIES.some(
    (family) => family === CHATGPT_TOOL_PLAN[name].family,
  );
}
export function isChatGptInterruptResolutionToolName(
  name: ChatGptToolName,
): name is Exclude<ChatGptBattleOperationToolName, "decline_reaction"> {
  return name !== "decline_reaction" && isChatGptBattleOperationToolName(name);
}
export type ChatGptStateOperationName = Exclude<
  ChatGptStatefulToolName,
  "roll_dice"
>;
export type PlaySessionExecutionOperationName =
  | PlaySessionOperationName
  | ChatGptStatefulToolName;

export function isChatGptStatefulToolName(
  name: string,
): name is ChatGptStatefulToolName {
  if (!isChatGptToolName(name)) return false;
  const family = CHATGPT_TOOL_PLAN[name].family;
  return family !== "sessions" && family !== "catalog";
}
export function isChatGptToolName(name: string): name is ChatGptToolName {
  return Object.hasOwn(CHATGPT_TOOL_PLAN, name);
}
export const CHATGPT_TOOL_NAMES =
  Object.keys(CHATGPT_TOOL_PLAN).filter(isChatGptToolName);
export const CHATGPT_STATE_OPERATION_NAMES = Object.keys(
  CHATGPT_TOOL_PLAN,
).filter(
  (name): name is ChatGptStateOperationName =>
    isChatGptStatefulToolName(name) && name !== "roll_dice",
);
function isRegularOperationName(
  name: PlaySessionExecutionOperationName,
): name is PlaySessionOperationName {
  return PLAY_SESSION_OPERATION_NAMES.some((operation) => operation === name);
}

/** The output grammar owner; the exposed tool and retained command keep their own names. */
export function playSessionProjectionOperationName(
  name: PlaySessionExecutionOperationName,
): PlaySessionOperationName {
  if (isRegularOperationName(name)) return name;
  return Match.value(CHATGPT_TOOL_PLAN[name].family).pipe(
    Match.when(
      "characterMutations",
      () => "apply_character_session_operation" as const,
    ),
    Match.when("characterQueries", () => "query_character_session" as const),
    Match.when("battleLifecycle", () => "battle_lifecycle" as const),
    Match.when("battleFacts", () => "fill_battle_hole" as const),
    Match.when("battleActions", () => "resolve_battle_act" as const),
    Match.when("spells", () => "resolve_battle_act" as const),
    Match.when("features", () => "resolve_battle_act" as const),
    Match.when("events", () => "resolve_battle_act" as const),
    Match.when("reactions", () => "resolve_battle_act" as const),
    Match.when("companions", () => "resolve_battle_act" as const),
    Match.exhaustive,
  );
}
