import {
  characterDraftId,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";

import { jsonContentPayload } from "./tool-content.ts";

export function createdCharacterDraftId(
  operationContent: unknown,
): CharacterDraftId {
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
