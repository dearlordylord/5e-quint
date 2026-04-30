import {
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";

import type { GreenMcpCompositionRoot } from "./composition-root.ts";
import {
  createCharacterDraftInputSchema,
  decodeCreateCharacterDraftArgs,
  decodeDraftIdArg,
  decodeFillCreationHolesArgs,
  draftIdInputSchema,
  fillCreationHolesInputSchema,
  isGreenToolError,
} from "./character-tool-input.ts";
import { errorContent, jsonContent } from "../tool-content.ts";

export const greenCharacterToolDefinitions = [
  {
    name: "create_character_draft",
    description:
      "Create and store a Surface-runtime character draft, then return its current creation holes and finalization status.",
    inputSchema: createCharacterDraftInputSchema,
  },
  {
    name: "discover_creation_holes",
    description:
      "Return the current fillable creation holes, draft revision, and finalization status for a stored Surface-runtime character draft.",
    inputSchema: draftIdInputSchema,
  },
  {
    name: "fill_creation_holes",
    description:
      "Submit an atomic batch of creation fills for a stored draft. Accepted batches replace the stored draft; rejected batches leave it unchanged.",
    inputSchema: fillCreationHolesInputSchema,
  },
  {
    name: "finalize_character",
    description:
      "Finalize a complete supported minimal Fighter draft. A ready finalization stores the resulting sheet by source draft id and removes the active draft.",
    inputSchema: draftIdInputSchema,
  },
] as const;

const GREEN_CHARACTER_TOOL_NAMES = greenCharacterToolDefinitions.map(
  (tool) => tool.name,
) satisfies ReadonlyArray<
  (typeof greenCharacterToolDefinitions)[number]["name"]
>;
type GreenCharacterToolName = (typeof GREEN_CHARACTER_TOOL_NAMES)[number];

export type GreenCharacterToolResult =
  | ReturnType<typeof jsonContent>
  | ReturnType<typeof errorContent>;

export function isGreenCharacterToolName(
  name: string,
): name is GreenCharacterToolName {
  return greenCharacterToolDefinitions.some((tool) => tool.name === name);
}

export function handleGreenCharacterToolCall(
  root: GreenMcpCompositionRoot,
  name: string,
  args: unknown,
): GreenCharacterToolResult {
  if (!isGreenCharacterToolName(name)) {
    return errorContent(`Unknown Surface-runtime character tool: ${name}`);
  }

  if (name === "create_character_draft") {
    const decoded = decodeCreateCharacterDraftArgs(args, name);
    if (isGreenToolError(decoded)) return decoded;
    const draft = createCharacterDraft({
      unitLibrary: root.unitLibrary,
      ...(decoded.draftId == null ? {} : { draftId: decoded.draftId }),
    });
    if (root.sessionStore.drafts.has(draft.draftId)) {
      return duplicateDraftIdContent(draft.draftId, "activeDraft");
    }
    if (root.sessionStore.sheets.has(draft.draftId)) {
      return duplicateDraftIdContent(draft.draftId, "finalizedSheet");
    }
    root.sessionStore.drafts.set(draft.draftId, draft);
    return jsonContent(creationDraftPayload(root, draft));
  }

  if (name === "fill_creation_holes") {
    const decoded = decodeFillCreationHolesArgs(args, name);
    if (isGreenToolError(decoded)) return decoded;
    const draft = root.sessionStore.drafts.get(decoded.draftId);
    if (draft == null) {
      return unknownDraftContent(decoded.draftId);
    }
    const result = fillCreationHoles({
      draft,
      unitLibrary: root.unitLibrary,
      expectedRevision: decoded.expectedRevision,
      fills: decoded.fills,
    });

    if (result.tag === "accepted") {
      root.sessionStore.drafts.set(result.draft.draftId, result.draft);
    }

    return jsonContent({
      result,
      storedDraft: root.sessionStore.drafts.get(decoded.draftId),
      session: root.sessionStore.snapshot(),
    });
  }

  const draftId = decodeDraftIdArg(args, name);
  if (isGreenToolError(draftId)) return draftId;

  const draft = root.sessionStore.drafts.get(draftId);
  if (draft == null) {
    return unknownDraftContent(draftId);
  }

  if (name === "discover_creation_holes") {
    return jsonContent(creationDraftPayload(root, draft));
  }

  if (name === "finalize_character") {
    const finalization = finalizeCharacterDraft({
      draft,
      unitLibrary: root.unitLibrary,
    });
    if (finalization.tag === "ready") {
      root.sessionStore.sheets.set(draftId, finalization.build);
      root.sessionStore.drafts.delete(draftId);
    }

    return jsonContent({
      draftId,
      finalization,
      sheet:
        finalization.tag === "ready"
          ? root.sessionStore.sheets.get(draftId)
          : null,
      session: root.sessionStore.snapshot(),
    });
  }

  return errorContent(`Unknown Surface-runtime character tool: ${name}`);
}

function unknownDraftContent(draftId: CharacterDraftId) {
  return errorContent(`Unknown character draft: ${draftId}`, {
    code: "UNKNOWN_CHARACTER_DRAFT",
    draftId,
  });
}

function duplicateDraftIdContent(
  draftId: CharacterDraftId,
  existingOwner: "activeDraft" | "finalizedSheet",
) {
  return errorContent(`Character draft id already exists: ${draftId}`, {
    code: "DUPLICATE_CHARACTER_DRAFT_ID",
    draftId,
    existingOwner,
  });
}

function creationDraftPayload(
  root: GreenMcpCompositionRoot,
  draft: CharacterDraft,
) {
  return {
    draft,
    holes: discoverCreationHoles({
      draft,
      unitLibrary: root.unitLibrary,
    }),
    finalization: finalizeCharacterDraft({
      draft,
      unitLibrary: root.unitLibrary,
    }),
    session: root.sessionStore.snapshot(),
  };
}
