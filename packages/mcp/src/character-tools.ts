import {
  createCharacterDraft,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import {
  characterSheetConstructionIssuesSummary,
  createFreshCharacterSheet,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import { Result, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import { applyCharacterSessionOperation } from "./character-session-operation-tool.ts";
import {
  creationDraftPayload,
  duplicateDraftIdContent,
  invalidCreationSupportProfileContent,
} from "./character-creation-tool-output.ts";
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
import { characterSessionArmorClassProjectionForOutput } from "./character-session-query-output.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import {
  CHARACTER_TOOL_NAMES,
  characterToolNames,
  type CharacterToolCall,
  type CharacterToolName,
} from "./character-tool-input.ts";
import {
  CharacterSessionDetailOutputSchema,
  CharacterSessionQueryOutputSchema,
  type CharacterSessionQueryOutput,
  CreationDraftOutputSchema,
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
  ListCharactersOutputSchema,
} from "./character-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import {
  discoverModelFacingCreationState,
  projectModelFacingCreationFillResult,
  projectModelFacingFinalization,
} from "./model-facing-creation-holes.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
export { characterToolDefinitions } from "./character-tool-definitions.ts";

type CharacterSessionRitualAccess = Extract<
  CharacterSessionQueryProjection,
  { readonly kind: "spellbookRitualAccess" }
>["projection"];
type CharacterSessionRitualAccessOutput = Extract<
  CharacterSessionQueryOutput["query"],
  { readonly kind: "spellbookRitualAccess" }
>["projection"];

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
      const projection = discoverModelFacingCreationState({
        draft,
        unitLibrary: root.unitLibrary,
        supportProfile: root.characterCreationSupportProfile,
      });
      if (projection.tag === "invalidSupportProfile") {
        return invalidCreationSupportProfileContent(projection.issues);
      }
      root.sessionStore.drafts.set(draft.draftId, draft);
      publishAdminProjectionBestEffort(root);
      return schemaJsonContent(
        CreationDraftOutputSchema,
        creationDraftPayload(root, draft, projection.value),
      );
    }),
    Match.when(
      { name: characterToolNames.discoverCreationHoles },
      (matched) => {
        const draft = root.sessionStore.drafts.get(matched.args.draftId);
        if (draft == null) return unknownDraftContent(matched.args.draftId);
        const projection = discoverModelFacingCreationState({
          draft,
          unitLibrary: root.unitLibrary,
          supportProfile: root.characterCreationSupportProfile,
        });
        if (projection.tag === "invalidSupportProfile") {
          return invalidCreationSupportProfileContent(projection.issues);
        }
        return schemaJsonContent(
          CreationDraftOutputSchema,
          creationDraftPayload(root, draft, projection.value),
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
      const projection = projectModelFacingCreationFillResult(
        result,
        root.characterCreationSupportProfile,
      );
      if (projection.tag === "invalidSupportProfile") {
        return invalidCreationSupportProfileContent(projection.issues);
      }

      if (result.tag === "accepted") {
        root.sessionStore.drafts.set(result.draft.draftId, result.draft);
        publishAdminProjectionBestEffort(root);
      }

      return schemaJsonContent(FillCreationHolesOutputSchema, {
        result: projection.value,
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
      const projection = projectModelFacingFinalization(
        finalization,
        root.characterCreationSupportProfile,
      );
      if (projection.tag === "invalidSupportProfile") {
        return invalidCreationSupportProfileContent(projection.issues);
      }
      const finalizedCharacterId = characterIdFromDraftId(draftId);
      if (finalization.tag === "ready") {
        const session = createFreshCharacterSheet({
          characterId: finalizedCharacterId,
          build: finalization.build,
          tempHp: Hp(0),
          hitPointMaximumReduction: Hp(0),
          conditions: [],
          unitLibrary: root.unitLibrary,
          statBlockCatalog: root.statBlockCatalog,
          ...(matched.args.druidWildShapeKnownFormStatBlockIds === undefined
            ? {}
            : {
                druidWildShapeKnownFormStatBlockIds:
                  matched.args.druidWildShapeKnownFormStatBlockIds,
              }),
        });
        if (Result.isFailure(session)) {
          return errorContent("Character finalization session failed.", {
            code: "CHARACTER_SESSION_INVALID",
            message: characterSheetConstructionIssuesSummary(session.failure),
          });
        }
        root.sessionStore.characters.set(session.success);
        root.sessionStore.drafts.delete(draftId);
        publishAdminProjectionBestEffort(root);
      }

      return schemaJsonContent(FinalizeCharacterOutputSchema, {
        draftId,
        finalization: projection.value,
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
      if (Result.isFailure(rows)) {
        return errorContent("Character list projection failed.", {
          code: "CHARACTER_LIST_INVALID",
          message: rows.failure,
        });
      }
      return schemaJsonContent(ListCharactersOutputSchema, {
        characters: rows.success,
        session: mcpSessionSummary(root.sessionStore.snapshot()),
      });
    }),
    Match.when(
      { name: characterToolNames.inspectCharacterSession },
      (matched) => {
        const detail = characterSessionDetail(root, matched.args.characterId);
        if (Result.isFailure(detail)) {
          return Match.value(detail.failure).pipe(
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
          detail: characterSessionDetailOutput(detail.success),
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
        if (Result.isFailure(query)) {
          return characterSessionQueryIssueContent(query.failure);
        }
        return schemaJsonContent(CharacterSessionQueryOutputSchema, {
          characterId: matched.args.characterId,
          query: characterSessionQueryProjectionForOutput(query.success),
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
      projection: characterSessionArmorClassProjectionForOutput(projection),
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
