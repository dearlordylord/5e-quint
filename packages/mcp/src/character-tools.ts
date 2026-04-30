import {
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Schema } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  availableCharacterSession,
  characterBattleSpellSlots,
  type CharacterSession,
} from "./session-store.ts";
import {
  createCharacterDraftInputSchema,
  decodeCreateCharacterDraftArgs,
  decodeDraftIdArg,
  decodeEmptyArgs,
  decodeFillCreationHolesArgs,
  draftIdInputSchema,
  emptyInputSchema,
  fillCreationHolesInputSchema,
} from "./character-tool-input.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

const CreationDraftOutputSchema = Schema.Struct({
  draft: Schema.Any,
  holes: Schema.Any,
  finalization: Schema.Any,
  session: Schema.Any,
});
const FillCreationHolesOutputSchema = Schema.Struct({
  result: Schema.Any,
  storedDraft: Schema.Any,
  session: Schema.Any,
});
const FinalizeCharacterOutputSchema = Schema.Struct({
  draftId: Schema.String,
  finalization: Schema.Any,
  sheet: Schema.Any,
  session: Schema.Any,
});
const ListCharactersOutputSchema = Schema.Struct({
  characters: Schema.Array(Schema.Any),
  session: Schema.Any,
});

export const characterToolDefinitions = [
  {
    name: "create_character_draft",
    description:
      "Create and store a Surface-runtime character draft, then return its current creation holes and finalization status.",
    inputSchema: createCharacterDraftInputSchema,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: "discover_creation_holes",
    description:
      "Return the current fillable creation holes, draft revision, and finalization status for a stored Surface-runtime character draft.",
    inputSchema: draftIdInputSchema,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: "fill_creation_holes",
    description:
      "Submit an atomic batch of creation fills for a stored draft. Accepted batches replace the stored draft; rejected batches leave it unchanged.",
    inputSchema: fillCreationHolesInputSchema,
    outputSchema: mcpOutputJsonSchema(FillCreationHolesOutputSchema),
  },
  {
    name: "finalize_character",
    description:
      "Finalize a complete supported character draft. A ready finalization stores the resulting character session by source draft id and removes the active draft.",
    inputSchema: draftIdInputSchema,
    outputSchema: mcpOutputJsonSchema(FinalizeCharacterOutputSchema),
  },
  {
    name: "list_characters",
    description:
      "List durable character-session records. Monster Stat Blocks and live battle combatants are not character-list rows.",
    inputSchema: emptyInputSchema,
    outputSchema: mcpOutputJsonSchema(ListCharactersOutputSchema),
  },
] as const;

const CHARACTER_TOOL_NAMES = characterToolDefinitions.map(
  (tool) => tool.name,
) satisfies ReadonlyArray<(typeof characterToolDefinitions)[number]["name"]>;
type CharacterToolName = (typeof CHARACTER_TOOL_NAMES)[number];

export type CharacterToolResult =
  | ReturnType<typeof schemaJsonContent>
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
    if (Either.isLeft(decoded)) return decoded.left;
    const draft = createCharacterDraft({
      unitLibrary: root.unitLibrary,
      ...(decoded.right.draftId == null
        ? {}
        : { draftId: decoded.right.draftId }),
    });
    if (root.sessionStore.drafts.has(draft.draftId)) {
      return duplicateDraftIdContent(draft.draftId, "activeDraft");
    }
    if (root.sessionStore.characters.has(draft.draftId)) {
      return duplicateDraftIdContent(draft.draftId, "finalizedSession");
    }
    root.sessionStore.drafts.set(draft.draftId, draft);
    return schemaJsonContent(
      CreationDraftOutputSchema,
      creationDraftPayload(root, draft),
    );
  }

  if (name === "fill_creation_holes") {
    const decoded = decodeFillCreationHolesArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    const input = decoded.right;
    const draft = root.sessionStore.drafts.get(input.draftId);
    if (draft == null) {
      return unknownDraftContent(input.draftId);
    }
    const result = fillCreationHoles({
      draft,
      unitLibrary: root.unitLibrary,
      expectedRevision: input.expectedRevision,
      fills: input.fills,
    });

    if (result.tag === "accepted") {
      root.sessionStore.drafts.set(result.draft.draftId, result.draft);
    }

    return schemaJsonContent(FillCreationHolesOutputSchema, {
      result,
      storedDraft: root.sessionStore.drafts.get(input.draftId),
      session: root.sessionStore.snapshot(),
    });
  }

  if (name === "list_characters") {
    const decoded = decodeEmptyArgs(args, name);
    if (Either.isLeft(decoded)) return decoded.left;
    return schemaJsonContent(ListCharactersOutputSchema, {
      characters: Array.from(root.sessionStore.characters.entries()).map(
        ([sourceDraftId, session]) =>
          characterListRow(root.unitLibrary, sourceDraftId, session),
      ),
      session: root.sessionStore.snapshot(),
    });
  }

  const decodedDraftId = decodeDraftIdArg(args, name);
  if (Either.isLeft(decodedDraftId)) return decodedDraftId.left;
  const draftId = decodedDraftId.right;

  const draft = root.sessionStore.drafts.get(draftId);
  if (draft == null) {
    return unknownDraftContent(draftId);
  }

  if (name === "discover_creation_holes") {
    return schemaJsonContent(
      CreationDraftOutputSchema,
      creationDraftPayload(root, draft),
    );
  }

  if (name === "finalize_character") {
    const finalization = finalizeCharacterDraft({
      draft,
      unitLibrary: root.unitLibrary,
    });
    if (finalization.tag === "ready") {
      root.sessionStore.characters.set(
        draftId,
        availableCharacterSession({
          build: finalization.build,
          currentHp: Hp(finalization.build.hitPoints.maximum),
        }),
      );
      root.sessionStore.drafts.delete(draftId);
    }

    return schemaJsonContent(FinalizeCharacterOutputSchema, {
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
  existingOwner: "activeDraft" | "finalizedSession",
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
      ...(characterBattleSpellSlots(session) === undefined
        ? {}
        : { spellSlots: characterBattleSpellSlots(session) }),
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
