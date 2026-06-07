import { characterId, type CharacterId } from "@dnd/battle-runtime";
import {
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  characterBuildHitPoints,
  type CharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import {
  createRetainedFamiliarLikeCompanion,
  type CharacterSheetRetainedCompanionCreationSource,
} from "@dnd/character-battle-runtime";
import {
  characterSheetCompanion,
  characterSheetHitPointMaximum,
  characterSheetRetainedCompanionId,
} from "@dnd/character-sheet-runtime";
import { Hp, spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Match } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  availableCharacterSession,
  characterIdFromDraftId,
  characterBattleSpellSlots,
  characterSessionCurrentHp,
  type AvailableCharacterSession,
  type CharacterSession,
} from "./session-store.ts";
import {
  CHARACTER_TOOL_NAMES,
  characterToolNames,
  createCharacterDraftInputSchema,
  draftIdInputSchema,
  emptyInputSchema,
  finalizeCharacterInputSchema,
  fillCreationHolesInputSchema,
  applyCharacterSessionOperationInputSchema,
  type CharacterToolCall,
  type CharacterToolName,
} from "./character-tool-input.ts";
import {
  CharacterSessionOperationOutputSchema,
  CreationDraftOutputSchema,
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
  ListCharactersOutputSchema,
  type CharacterSessionRow,
} from "./character-tool-output.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
export const characterToolDefinitions = [
  {
    name: characterToolNames.createCharacterDraft,
    description:
      "Create and store a character draft, then return its current creation holes and finalization status.",
    inputSchema: createCharacterDraftInputSchema,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.discoverCreationHoles,
    description:
      "Return the current fillable creation holes, draft revision, and finalization status for a stored character draft.",
    inputSchema: draftIdInputSchema,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.fillCreationHoles,
    description:
      "Submit an atomic batch of creation fills for a stored draft. Accepted batches replace the stored draft; rejected batches leave it unchanged.",
    inputSchema: fillCreationHolesInputSchema,
    outputSchema: mcpOutputJsonSchema(FillCreationHolesOutputSchema),
  },
  {
    name: characterToolNames.finalizeCharacter,
    description:
      "Finalize a complete supported character draft. A ready finalization stores the resulting in-play record by characterId and removes the active draft. Druid Wild Shape drafts require selected known Beast Stat Block ids.",
    inputSchema: finalizeCharacterInputSchema,
    outputSchema: mcpOutputJsonSchema(FinalizeCharacterOutputSchema),
  },
  {
    name: characterToolNames.applyCharacterSessionOperation,
    description:
      "Apply a supported durable character-session operation. Retained one-at-a-time companion creation delegates source, form, and cost validation to runtime support facts; MCP does not own companion eligibility.",
    inputSchema: applyCharacterSessionOperationInputSchema,
    outputSchema: mcpOutputJsonSchema(CharacterSessionOperationOutputSchema),
  },
  {
    name: characterToolNames.listCharacters,
    description:
      "List durable character-session records. Monster Stat Blocks and live battle combatants are not character-list rows.",
    inputSchema: emptyInputSchema,
    outputSchema: mcpOutputJsonSchema(ListCharactersOutputSchema),
  },
] as const;

export type CharacterToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isCharacterToolName(name: string): name is CharacterToolName {
  return CHARACTER_TOOL_NAMES.some((toolName) => toolName === name);
}

export function handleCharacterToolCall(
  root: McpCompositionRoot,
  call: CharacterToolCall,
): CharacterToolResult {
  return Match.value(call).pipe(
    Match.when({ name: characterToolNames.createCharacterDraft }, (matched) => {
      const draft = createCharacterDraft({
        unitLibrary: root.unitLibrary,
        ...(matched.args.draftId == null
          ? {}
          : { draftId: matched.args.draftId }),
      });
      if (root.sessionStore.drafts.has(draft.draftId)) {
        return duplicateDraftIdContent(draft.draftId, "activeDraft");
      }
      if (draftCharacterIdAlreadyReserved(root, draft.draftId)) {
        return duplicateDraftIdContent(draft.draftId, "activeDraft");
      }
      if (
        root.sessionStore.characters.has(characterIdFromDraftId(draft.draftId))
      ) {
        return duplicateDraftIdContent(draft.draftId, "finalizedSession");
      }
      root.sessionStore.drafts.set(draft.draftId, draft);
      return schemaJsonContent(
        CreationDraftOutputSchema,
        creationDraftPayload(root, draft),
      );
    }),
    Match.when(
      { name: characterToolNames.discoverCreationHoles },
      (matched) => {
        const draft = root.sessionStore.drafts.get(matched.args.draftId);
        if (draft == null) return unknownDraftContent(matched.args.draftId);
        return schemaJsonContent(
          CreationDraftOutputSchema,
          creationDraftPayload(root, draft),
        );
      },
    ),
    Match.when({ name: characterToolNames.fillCreationHoles }, (matched) => {
      const input = matched.args;
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
        storedDraft:
          root.sessionStore.drafts.get(input.draftId) ?? result.draft,
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.when({ name: characterToolNames.finalizeCharacter }, (matched) => {
      const draftId = matched.args.draftId;
      const draft = root.sessionStore.drafts.get(draftId);
      if (draft == null) return unknownDraftContent(draftId);

      const finalization = finalizeCharacterDraft({
        draft,
        unitLibrary: root.unitLibrary,
      });
      const finalizedCharacterId = characterIdFromDraftId(draftId);
      if (finalization.tag === "ready") {
        const hitPoints = characterBuildHitPoints(
          finalization.build,
          root.unitLibrary,
        );
        if (Either.isLeft(hitPoints)) {
          return errorContent("Character finalization session failed.", {
            code: "CHARACTER_SESSION_INVALID",
            message: hitPoints.left.map((issue) => issue.message).join("; "),
          });
        }
        const session = availableCharacterSession({
          characterId: finalizedCharacterId,
          build: finalization.build,
          maximumHp: Hp(hitPoints.right.maximum),
          currentHp: Hp(hitPoints.right.maximum),
          tempHp: Hp(0),
          hitPointMaximumReduction: Hp(0),
          conditions: [],
          unitLibrary: root.unitLibrary,
          ...(matched.args.druidWildShapeKnownFormStatBlockIds === undefined
            ? {}
            : {
                druidWildShapeKnownFormStatBlockIds:
                  matched.args.druidWildShapeKnownFormStatBlockIds,
              }),
        });
        if (Either.isLeft(session)) {
          return errorContent("Character finalization session failed.", {
            code: "CHARACTER_SESSION_INVALID",
            message: session.left.message,
          });
        }
        root.sessionStore.characters.set(session.right);
        root.sessionStore.drafts.delete(draftId);
      }

      return schemaJsonContent(FinalizeCharacterOutputSchema, {
        draftId,
        finalization,
        build: finalization.tag === "ready" ? finalization.build : null,
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.when(
      { name: characterToolNames.applyCharacterSessionOperation },
      (matched) => applyCharacterSessionOperation(root, matched.args),
    ),
    Match.when({ name: characterToolNames.listCharacters }, () => {
      const rows = characterListRows(root);
      if (Either.isLeft(rows)) {
        return errorContent("Character list projection failed.", {
          code: "CHARACTER_LIST_INVALID",
          message: rows.left,
        });
      }
      return schemaJsonContent(ListCharactersOutputSchema, {
        characters: rows.right,
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.exhaustive,
  );
}

function applyCharacterSessionOperation(
  root: McpCompositionRoot,
  input: Extract<
    CharacterToolCall,
    { readonly name: typeof characterToolNames.applyCharacterSessionOperation }
  >["args"],
): CharacterToolResult {
  const id = characterId(input.characterId);
  const session = root.sessionStore.characters.get(id);
  if (session === undefined) {
    return errorContent(`Unknown character session: ${input.characterId}`, {
      code: "UNKNOWN_CHARACTER_SESSION",
      characterId: input.characterId,
    });
  }
  if (session.tag === "inBattle") {
    return errorContent(
      "Character session operation requires an available character.",
      {
        code: "CHARACTER_SESSION_IN_BATTLE",
        characterId: input.characterId,
      },
    );
  }

  return Match.value(input.operation).pipe(
    Match.when({ kind: "retainOneAtATimeCompanion" }, (operation) =>
      applyRetainOneAtATimeCompanionOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.exhaustive,
  );
}

function applyRetainOneAtATimeCompanionOperation(
  root: McpCompositionRoot,
  input: {
    readonly characterId: string;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      Extract<
        CharacterToolCall,
        {
          readonly name: typeof characterToolNames.applyCharacterSessionOperation;
        }
      >["args"]["operation"],
      { readonly kind: "retainOneAtATimeCompanion" }
    >;
  },
): CharacterToolResult {
  const updated = createRetainedFamiliarLikeCompanion({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    statBlockCatalog: root.statBlockCatalog,
    companionId: characterSheetRetainedCompanionId(input.operation.companionId),
    source: retainedCompanionSourceFromTool(input.operation.source),
    selectedForm: input.operation.selectedForm,
    ...(input.operation.creatureTypeOverrideChoiceId === undefined
      ? {}
      : {
          creatureTypeOverrideChoiceId:
            input.operation.creatureTypeOverrideChoiceId,
        }),
    ...(input.operation.currentHp === undefined
      ? {}
      : { currentHp: Hp(input.operation.currentHp) }),
    ...(input.operation.tempHp === undefined
      ? {}
      : { tempHp: Hp(input.operation.tempHp) }),
  });
  if (Either.isLeft(updated)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: updated.left.message,
    });
  }
  root.sessionStore.characters.set(updated.right);
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: updated.right,
    session: root.sessionStore.snapshot(),
  });
}

function retainedCompanionSourceFromTool(
  source: Extract<
    Extract<
      CharacterToolCall,
      {
        readonly name: typeof characterToolNames.applyCharacterSessionOperation;
      }
    >["args"]["operation"],
    { readonly kind: "retainOneAtATimeCompanion" }
  >["source"],
): CharacterSheetRetainedCompanionCreationSource {
  if (source.tag === "spellSlotSpellCast") {
    return {
      tag: "spellSlotSpellCast",
      spellId: source.spellId,
      spellLevel: spellSlotLevel(source.spellLevel),
    };
  }
  if (source.tag === "ritualSpell") {
    return { tag: "ritualSpell", spellId: source.spellId };
  }
  if (source.tag === "invocationSpellAccess") {
    return { tag: "invocationSpellAccess", spellId: source.spellId };
  }
  return {
    tag: "classFeatureSpellCast",
    featureUnitId: source.featureUnitId,
    spend:
      source.spend.tag === "spellSlot"
        ? {
            tag: "spellSlot",
            spellLevel: spellSlotLevel(source.spend.spellLevel),
          }
        : source.spend,
  };
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

function draftCharacterIdAlreadyReserved(
  root: McpCompositionRoot,
  draftId: CharacterDraftId,
): boolean {
  const candidateCharacterId = characterIdFromDraftId(draftId);
  return Array.from(root.sessionStore.drafts.keys()).some(
    (activeDraftId) =>
      characterIdFromDraftId(activeDraftId) === candidateCharacterId,
  );
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

function characterListRows(
  root: McpCompositionRoot,
): Either.Either<readonly CharacterSessionRow[], string> {
  const rows: CharacterSessionRow[] = [];
  for (const [characterId, session] of root.sessionStore.characters.entries()) {
    const row = characterListRow(root.unitLibrary, characterId, session);
    if (Either.isLeft(row)) return Either.left(row.left);
    rows.push(row.right);
  }
  return Either.right(rows);
}

function characterListRow(
  unitLibrary: UnitCatalog,
  characterId: CharacterId,
  session: CharacterSession,
): Either.Either<CharacterSessionRow, string> {
  if (session.tag === "available") {
    const spellSlots = characterBattleSpellSlots(session);
    return Either.right({
      characterId,
      status: session.tag,
      displayName: characterBuildDisplayName(unitLibrary, session.build),
      build: session.build,
      hitPoints: {
        current: characterSessionCurrentHp(session),
        maximum: characterSheetHitPointMaximum(session),
        state: session.hitPoints,
      },
      ...(spellSlots === undefined ? {} : { spellSlots }),
      companion: characterSheetCompanion(session),
    });
  }

  return Either.right({
    characterId,
    status: session.tag,
    displayName: null,
    build: session.sheet.build,
    battleId: session.battleId,
    companion: characterSheetCompanion(session.sheet),
    companionAdmission: session.companionAdmission,
  });
}
