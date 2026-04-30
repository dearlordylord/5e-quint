import {
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterBuild,
  type CharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";

import type { McpCompositionRoot } from "./composition-root.ts";
import type { CharacterSession } from "./session-store.ts";
import {
  createCharacterDraftInputSchema,
  decodeCreateCharacterDraftArgs,
  decodeDraftIdArg,
  decodeFillCreationHolesArgs,
  draftIdInputSchema,
  fillCreationHolesInputSchema,
  isToolError,
} from "./character-tool-input.ts";
import { errorContent, jsonContent } from "./tool-content.ts";

export const characterToolDefinitions = [
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
      "Finalize a complete supported minimal Fighter draft. A ready finalization stores the resulting character session by source draft id and removes the active draft.",
    inputSchema: draftIdInputSchema,
  },
  {
    name: "list_characters",
    description:
      "List durable character-session records. Monster Stat Blocks and live battle combatants are not character-list rows.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
] as const;

const CHARACTER_TOOL_NAMES = characterToolDefinitions.map(
  (tool) => tool.name,
) satisfies ReadonlyArray<(typeof characterToolDefinitions)[number]["name"]>;
type CharacterToolName = (typeof CHARACTER_TOOL_NAMES)[number];

export type CharacterToolResult =
  | ReturnType<typeof jsonContent>
  | ReturnType<typeof errorContent>;

export function isCharacterToolName(name: string): name is CharacterToolName {
  return characterToolDefinitions.some((tool) => tool.name === name);
}

export function handleCharacterToolCall(
  root: McpCompositionRoot,
  name: string,
  args: unknown,
): CharacterToolResult {
  if (!isCharacterToolName(name)) {
    return errorContent(`Unknown Surface-runtime character tool: ${name}`);
  }

  if (name === "create_character_draft") {
    const decoded = decodeCreateCharacterDraftArgs(args, name);
    if (isToolError(decoded)) return decoded;
    const draft = createCharacterDraft({
      unitLibrary: root.unitLibrary,
      ...(decoded.draftId == null ? {} : { draftId: decoded.draftId }),
    });
    if (root.sessionStore.drafts.has(draft.draftId)) {
      return duplicateDraftIdContent(draft.draftId, "activeDraft");
    }
    if (root.sessionStore.characters.has(draft.draftId)) {
      return duplicateDraftIdContent(draft.draftId, "finalizedSheet");
    }
    root.sessionStore.drafts.set(draft.draftId, draft);
    return jsonContent(creationDraftPayload(root, draft));
  }

  if (name === "fill_creation_holes") {
    const decoded = decodeFillCreationHolesArgs(args, name);
    if (isToolError(decoded)) return decoded;
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

  if (name === "list_characters") {
    const decoded = decodeEmptyArgs(args, name);
    if (isToolError(decoded)) return decoded;
    return jsonContent({
      characters: Array.from(root.sessionStore.characters.entries()).map(
        ([sourceDraftId, session]) =>
          characterListRow(root.unitLibrary, sourceDraftId, session),
      ),
      session: root.sessionStore.snapshot(),
    });
  }

  const draftId = decodeDraftIdArg(args, name);
  if (isToolError(draftId)) return draftId;

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
      root.sessionStore.characters.set(draftId, {
        tag: "available",
        build: finalization.build,
        currentHp: Hp(finalization.build.hitPoints.maximum),
      });
      root.sessionStore.drafts.delete(draftId);
    }

    return jsonContent({
      draftId,
      finalization,
      sheet:
        finalization.tag === "ready"
          ? root.sessionStore.characters.get(draftId)?.build
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

function creationDraftPayload(root: McpCompositionRoot, draft: CharacterDraft) {
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

function characterListRow(
  unitLibrary: UnitCatalog,
  sourceDraftId: CharacterDraftId,
  session: CharacterSession,
) {
  if (session.tag === "available") {
    return {
      sourceDraftId,
      status: session.tag,
      displayName: characterBuildDisplayName(unitLibrary, session.build),
      build: session.build,
      hitPoints: {
        current: session.currentHp,
        maximum: session.build.hitPoints.maximum,
      },
    };
  }

  return {
    sourceDraftId,
    status: session.tag,
    displayName: null,
    build: session.build,
    battleId: session.battleId,
    characterId: session.characterId,
  };
}

function characterBuildDisplayName(
  unitLibrary: UnitCatalog,
  build: CharacterBuild,
): string {
  const speciesName = unitLibrary.requireUnit(build.species).name;
  const backgroundName = unitLibrary.requireUnit(build.background).name;
  const className = build.advancement.entries
    .map((entry) => unitLibrary.requireUnit(entry.classUnitId).name)
    .join("/");

  return `${speciesName} ${backgroundName} ${className}`;
}

function decodeEmptyArgs(args: unknown, toolName: string) {
  if (
    typeof args !== "object" ||
    args === null ||
    Array.isArray(args) ||
    Object.keys(args).length > 0
  ) {
    return errorContent(`${toolName} expects empty object arguments.`, {
      code: "INVALID_ARGUMENTS",
      expected: "empty object",
    });
  }

  return {};
}
