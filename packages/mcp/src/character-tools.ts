import {
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import { Either, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import { applyCharacterSessionOperation } from "./character-session-operation-tool.ts";
import {
  characterListRows,
  characterSessionDetail,
  characterSessionDetailOutput,
} from "./character-session-rows.ts";
import {
  queryCharacterSession,
  type CharacterSessionQueryIssue,
  type CharacterSessionQueryProjection,
} from "./character-session-query.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import {
  characterSheetConstructionIssuesSummary,
  createFreshCharacterSheet,
} from "@dnd/character-sheet-runtime";
import {
  CHARACTER_TOOL_NAMES,
  characterToolNames,
  createCharacterDraftInputSchema,
  draftIdInputSchema,
  emptyInputSchema,
  characterSessionIdInputSchema,
  finalizeCharacterInputSchema,
  fillCreationHolesInputSchema,
  applyCharacterSessionOperationInputSchema,
  type CharacterToolCall,
  type CharacterToolName,
} from "./character-tool-input.ts";
import { queryCharacterSessionInputSchema } from "./character-session-query-tool-input.ts";
import {
  CharacterSessionOperationOutputSchema,
  CharacterSessionDetailOutputSchema,
  CharacterSessionQueryOutputSchema,
  type CharacterSessionQueryOutput,
  CreationDraftOutputSchema,
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
  ListCharactersOutputSchema,
} from "./character-tool-output.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

type CharacterSessionRitualAccess = Extract<
  CharacterSessionQueryProjection,
  { readonly kind: "spellbookRitualAccess" }
>["projection"];
type CharacterSessionRitualAccessOutput = Extract<
  CharacterSessionQueryOutput["query"],
  { readonly kind: "spellbookRitualAccess" }
>["projection"];

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
      "Apply a supported durable character-session operation. Class-level advancement and Druid known-form replacement delegate existing level-gain and Wild Shape support facts to the runtime; companion creation, atomic Short/Long Rest completion, composed Long Rest interruption/resumption with strictly increasing cumulativeRestedTicks boundaries, and calendar-time Stable recovery delegate validation and state transitions to the Character Sheet runtime; MCP retains no rest intermediate state.",
    inputSchema: applyCharacterSessionOperationInputSchema,
    outputSchema: mcpOutputJsonSchema(CharacterSessionOperationOutputSchema),
  },
  {
    name: characterToolNames.listCharacters,
    description:
      "List durable character-session display rows. Rows include build-derived HP, Hit Dice, Spell Slot, Pact Slot, and resource capacities plus mutable sheet state.",
    inputSchema: emptyInputSchema,
    outputSchema: mcpOutputJsonSchema(ListCharactersOutputSchema),
  },
  {
    name: characterToolNames.inspectCharacterSession,
    description:
      "Inspect one selected Character Session as its canonical stored session plus core build-derived Hit Point, Hit Dice, Spell Slot, Pact Slot, and resource facts.",
    inputSchema: characterSessionIdInputSchema,
    outputSchema: mcpOutputJsonSchema(CharacterSessionDetailOutputSchema),
  },
  {
    name: characterToolNames.queryCharacterSession,
    description:
      "Query one available Character Session through the existing Character Sheet ability, movement, defense, Spell Access, form, ritual, and Weapon Mastery projections.",
    inputSchema: queryCharacterSessionInputSchema,
    outputSchema: mcpOutputJsonSchema(CharacterSessionQueryOutputSchema),
  },
] as const;

export type CharacterToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isCharacterToolName(name: string): name is CharacterToolName {
  return CHARACTER_TOOL_NAMES.some((toolName) => toolName === name);
}

export function handleCharacterToolCall(
  root: McpPlaySessionRoot,
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
      if (
        root.sessionStore.characters.has(characterIdFromDraftId(draft.draftId))
      ) {
        return duplicateDraftIdContent(draft.draftId, "finalizedSession");
      }
      root.sessionStore.drafts.set(draft.draftId, draft);
      publishAdminProjectionBestEffort(root);
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
        supportProfile: root.characterCreationSupportProfile,
        expectedRevision: input.expectedRevision,
        fills: input.fills,
      });

      if (result.tag === "accepted") {
        root.sessionStore.drafts.set(result.draft.draftId, result.draft);
        publishAdminProjectionBestEffort(root);
      }

      return schemaJsonContent(FillCreationHolesOutputSchema, {
        result,
        storedDraft: result.tag === "accepted" ? result.draft : draft,
        session: mcpSessionSummary(root.sessionStore.snapshot()),
      });
    }),
    Match.when({ name: characterToolNames.finalizeCharacter }, (matched) => {
      const draftId = matched.args.draftId;
      const draft = root.sessionStore.drafts.get(draftId);
      if (draft == null) return unknownDraftContent(draftId);

      const finalization = finalizeCharacterDraft({
        draft,
        unitLibrary: root.unitLibrary,
        supportProfile: root.characterCreationSupportProfile,
      });
      const finalizedCharacterId = characterIdFromDraftId(draftId);
      if (finalization.tag === "ready") {
        const session = createFreshCharacterSheet({
          characterId: finalizedCharacterId,
          build: finalization.build,
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
            message: characterSheetConstructionIssuesSummary(session.left),
          });
        }
        root.sessionStore.characters.set(session.right);
        root.sessionStore.drafts.delete(draftId);
        publishAdminProjectionBestEffort(root);
      }

      return schemaJsonContent(FinalizeCharacterOutputSchema, {
        draftId,
        finalization,
        build: finalization.tag === "ready" ? finalization.build : null,
        session: mcpSessionSummary(root.sessionStore.snapshot()),
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
        session: mcpSessionSummary(root.sessionStore.snapshot()),
      });
    }),
    Match.when(
      { name: characterToolNames.inspectCharacterSession },
      (matched) => {
        const detail = characterSessionDetail(root, matched.args.characterId);
        if (Either.isLeft(detail)) {
          return Match.value(detail.left).pipe(
            Match.when({ tag: "unknownCharacterSession" }, () =>
              errorContent(
                `Unknown character session: ${matched.args.characterId}`,
                {
                  code: "UNKNOWN_CHARACTER_SESSION",
                  characterId: matched.args.characterId,
                },
              ),
            ),
            Match.when({ tag: "characterSessionDetailInvalid" }, (issue) =>
              errorContent("Character Session detail projection failed.", {
                code: "CHARACTER_SESSION_DETAIL_INVALID",
                characterId: matched.args.characterId,
                message: issue.message,
              }),
            ),
            Match.exhaustive,
          );
        }
        return schemaJsonContent(CharacterSessionDetailOutputSchema, {
          detail: characterSessionDetailOutput(detail.right),
          session: mcpSessionSummary(root.sessionStore.snapshot()),
        });
      },
    ),
    Match.when(
      { name: characterToolNames.queryCharacterSession },
      (matched) => {
        const query = queryCharacterSession(root, {
          characterId: matched.args.characterId,
          query: matched.args.query,
        });
        if (Either.isLeft(query)) {
          return characterSessionQueryIssueContent(query.left);
        }
        return schemaJsonContent(CharacterSessionQueryOutputSchema, {
          characterId: matched.args.characterId,
          query: characterSessionQueryProjectionForOutput(query.right),
          session: mcpSessionSummary(root.sessionStore.snapshot()),
        });
      },
    ),
    Match.exhaustive,
  );
}

function characterSessionQueryIssueContent(issue: CharacterSessionQueryIssue) {
  return Match.value(issue).pipe(
    Match.when({ tag: "unknownCharacterSession" }, ({ characterId }) =>
      errorContent(`Unknown character session: ${characterId}`, {
        code: "UNKNOWN_CHARACTER_SESSION",
        characterId,
      }),
    ),
    Match.when(
      { tag: "inBattleCharacterSession" },
      ({ characterId, battleId }) =>
        errorContent("Character Session query requires an available session.", {
          code: "CHARACTER_SESSION_QUERY_IN_BATTLE",
          characterId,
          battleId,
        }),
    ),
    Match.when(
      { tag: "queryRejected" },
      ({ characterId, queryKind, issue: queryIssue }) =>
        errorContent("Character Session query was rejected.", {
          code: "CHARACTER_SESSION_QUERY_REJECTED",
          characterId,
          queryKind,
          message: queryIssue.message,
        }),
    ),
    Match.exhaustive,
  );
}

function characterSessionQueryProjectionForOutput(
  query: CharacterSessionQueryProjection,
): CharacterSessionQueryOutput["query"] {
  return Match.value(query).pipe(
    Match.when({ kind: "abilityCheckAbility" }, (value) => value),
    Match.when({ kind: "abilityCheckProficiencyBonus" }, (value) => value),
    Match.when({ kind: "jumpDistanceAbility" }, (value) => value),
    Match.when({ kind: "linkedSpeedGrants" }, (value) => value),
    Match.when({ kind: "armorClass" }, ({ kind, projection }) => ({
      kind,
      projection: {
        ...projection,
        state: {
          ...projection.state,
          armorTraining: Array.from(projection.state.armorTraining),
        },
      },
    })),
    Match.when({ kind: "spellAccess" }, (value) => value),
    Match.when({ kind: "knownForms" }, (value) => value),
    Match.when({ kind: "weaponMasterySelections" }, (value) => value),
    Match.when({ kind: "spellbookRitualAccesses" }, ({ kind, projection }) => ({
      kind,
      projection: projection.map(characterSessionRitualAccessForOutput),
    })),
    Match.when({ kind: "spellbookRitualAccess" }, ({ kind, projection }) => ({
      kind,
      projection: characterSessionRitualAccessForOutput(projection),
    })),
    Match.when({ kind: "spellInvocation" }, (value) => value),
    Match.exhaustive,
  );
}

function characterSessionRitualAccessForOutput(
  access: CharacterSessionRitualAccess,
): CharacterSessionRitualAccessOutput {
  return {
    tag: access.tag,
    spell: {
      id: access.spell.id,
      mechanics: { level: access.spell.mechanics.level },
    },
    spellcastingSourceUnitId: access.spellcastingSourceUnitId,
    featureUnitId: access.featureUnitId,
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

function creationDraftPayload(root: McpPlaySessionRoot, draft: CharacterDraft) {
  return {
    draft,
    holes: discoverCreationHoles({
      draft,
      unitLibrary: root.unitLibrary,
      supportProfile: root.characterCreationSupportProfile,
    }),
    finalization: finalizeCharacterDraft({
      draft,
      unitLibrary: root.unitLibrary,
      supportProfile: root.characterCreationSupportProfile,
    }),
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  };
}
