import {
  characterDraftId,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";

import { Result, type Schema } from "effect";
import type {
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
} from "./character-tool-output.ts";
import type { PlaySessionCommand } from "./play-session.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import {
  decodeDiceToolCall,
  diceToolNames,
  type DiceToolName,
} from "./dice-tool-input.ts";
import type { ChatGptStatefulToolName } from "./chatgpt/protocol-operation.ts";
import {
  characterToolNames,
  type CharacterToolName,
} from "./character-tool-input.ts";
import type { PlaySessionExecutionOperationName } from "./chatgpt/protocol-operation.ts";
import { jsonContentPayload } from "./tool-content.ts";

export const PLAY_SESSION_COMMAND_ADMISSION_VERSION = 3 as const;
export const PLAY_SESSION_COMMAND_ADMISSION_VERSIONS = [
  2,
  PLAY_SESSION_COMMAND_ADMISSION_VERSION,
] as const;
export type PlaySessionCommandAdmissionVersion =
  (typeof PLAY_SESSION_COMMAND_ADMISSION_VERSIONS)[number];

const CREATION_FILL_CHANGED_STATE = {
  accepted: true,
  rejected: false,
} satisfies Record<
  Schema.Schema.Type<typeof FillCreationHolesOutputSchema>["result"]["tag"],
  boolean
>;
const CREATION_FINALIZATION_CHANGED_STATE = {
  ready: true,
  incomplete: false,
  invalid: false,
} satisfies Record<
  Schema.Schema.Type<
    typeof FinalizeCharacterOutputSchema
  >["finalization"]["tag"],
  boolean
>;

export function creationCommandChangedState(
  name: PlaySessionExecutionOperationName,
  content: unknown,
): boolean {
  if (
    name !== characterToolNames.fillCreationHoles &&
    name !== characterToolNames.finalizeCharacter
  )
    return true;
  const outcomeTag = structuredCreationOutcomeTag(
    content,
    name === characterToolNames.fillCreationHoles ? "result" : "finalization",
  );
  const states =
    name === characterToolNames.fillCreationHoles
      ? CREATION_FILL_CHANGED_STATE
      : CREATION_FINALIZATION_CHANGED_STATE;
  const matched = Object.entries(states).find(([tag]) => tag === outcomeTag);
  if (matched !== undefined) return matched[1];
  throw new Error(
    "A successful creation command returned an unknown retention outcome.",
  );
}

function structuredCreationOutcomeTag(
  content: unknown,
  field: "result" | "finalization",
): string | undefined {
  if (!isToolContent(content) || !isJsonObject(content.structuredContent))
    return undefined;
  const outcome = content.structuredContent[field];
  return isJsonObject(outcome) && typeof outcome.tag === "string"
    ? outcome.tag
    : undefined;
}

function createdCharacterDraftId(operationContent: unknown): CharacterDraftId {
  if (!isToolContent(operationContent)) {
    throw new Error(
      "A successful Character Draft creation returned invalid tool content.",
    );
  }
  const payload =
    "structuredContent" in operationContent
      ? operationContent.structuredContent
      : jsonContentPayload(operationContent);
  const draft = isJsonObject(payload) ? payload.draft : undefined;
  if (!isJsonObject(draft) || typeof draft.draftId !== "string") {
    throw new Error(
      "A successful Character Draft creation omitted its retained draft identity.",
    );
  }
  return characterDraftId(draft.draftId);
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolContent(value: unknown): value is {
  readonly content: readonly [{ readonly text: string }];
  readonly structuredContent?: unknown;
  readonly isError?: boolean;
} {
  if (!isJsonObject(value) || !Array.isArray(value.content)) return false;
  const first = value.content[0];
  return isJsonObject(first) && typeof first.text === "string";
}

export function retainedPlaySessionCommand(
  input:
    | {
        readonly toolSurface?: never;
        readonly operationName:
          | CharacterToolName
          | BattleToolName
          | DiceToolName;
      }
    | {
        readonly toolSurface: "chatgpt";
        readonly operationName: ChatGptStatefulToolName;
      },
  args: Readonly<Record<string, unknown>>,
  operationContent: unknown,
): PlaySessionCommand {
  if (input.operationName === characterToolNames.createCharacterDraft) {
    const draftId = createdCharacterDraftId(operationContent);
    return { name: input.operationName, args: { ...args, draftId } };
  }
  if (input.operationName === diceToolNames.rollDice) {
    const decoded = decodeDiceToolCall({ name: input.operationName, args });
    if (Result.isFailure(decoded)) {
      throw new Error(
        "A retained successful dice operation no longer decodes as its command.",
      );
    }
    return { name: input.operationName, args: decoded.success.args };
  }
  return input.toolSurface === "chatgpt"
    ? { toolSurface: "chatgpt", name: input.operationName, args }
    : { name: input.operationName, args };
}
