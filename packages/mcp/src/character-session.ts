import { Match } from "effect";

import {
  assessCharacterDraft,
  applyCharacterDraftUpdate,
  advanceCharacterSheet,
  buildOpenChoicePatch,
  finalizeCharacterDraft,
  listCharacterFeaturePickers,
  previewCharacterSheetAdvancement,
  previewCharacterDraftUpdate,
  type CharacterDraft,
  type CharacterSheet,
} from "@dnd/core/character-domain.ts";
import {
  characterSheetBattleProjection,
  characterSheetCreatureProjection,
} from "@dnd/core/character-sheet-derived.ts";

import {
  advanceCharacterSheetInputSchema,
  buildOpenChoicePatchInputSchema,
  characterDraftPatchInputSchema,
  createCharacterDraftInputSchema,
  decodeBuildOpenChoicePatchArgs,
  decodeCanonicalCharacterDraft,
  decodeDraftPatch,
  decodeEmptyArgs,
  decodeLevelUpTransition,
  emptyObjectInputSchema,
  encodeStableJson,
  enrichAssessment,
  enrichOpenChoices,
  isCharacterToolError,
  readArgsRecord,
  rejectUnexpectedTopLevelFields,
  serializePickerPayload,
  type CharacterToolError,
} from "./character-session-helpers.ts";
import { errorContent, jsonContent } from "./server-shared.ts";

export const characterToolDefinitions = [
  {
    name: "get_character_state",
    description:
      "Returns the stored server-side character record as canonical core-owned draft or sheet state.",
    inputSchema: emptyObjectInputSchema,
  },
  {
    name: "create_character_draft",
    description:
      "Create or replace the stored server-side character record with a canonical CharacterDraft. Omit draft to start from an empty draft.",
    inputSchema: createCharacterDraftInputSchema,
  },
  {
    name: "preview_character_draft_update",
    description:
      "Preview a partial CharacterDraft update against the stored draft without mutating stored state.",
    inputSchema: characterDraftPatchInputSchema,
  },
  {
    name: "apply_character_draft_update",
    description:
      "Apply a partial CharacterDraft update to the stored draft after preview acceptance. Preview and apply remain separate operations.",
    inputSchema: characterDraftPatchInputSchema,
  },
  {
    name: "assess_character_draft",
    description:
      "Assess the stored draft through core-owned semantics, separating open required choices from illegal issues.",
    inputSchema: emptyObjectInputSchema,
  },
  {
    name: "list_character_feature_pickers",
    description:
      "List every open feature picker active for the stored draft. Each picker reports legal options, pick count, the draft write path, and the caller's current pick(s). Use the featureRef with build_open_choice_patch to construct a draft patch.",
    inputSchema: emptyObjectInputSchema,
  },
  {
    name: "build_open_choice_patch",
    description:
      "Build a canonical CharacterDraft patch from a picker selection. Resolves the picker by featureRef against the stored draft and applies any core-owned lifting (e.g. origin-feat tagged variants). The returned patch must then be applied via apply_character_draft_update.",
    inputSchema: buildOpenChoicePatchInputSchema,
  },
  {
    name: "finalize_character_draft",
    description:
      "Finalize the stored draft into a canonical CharacterSheet through core-owned semantics. Successful finalization replaces stored draft state with stored sheet state.",
    inputSchema: emptyObjectInputSchema,
  },
  {
    name: "preview_character_sheet_advancement",
    description:
      "Preview a stored finalized sheet advancement without mutating stored state, separating open required level-up choices from illegal issues before commit.",
    inputSchema: advanceCharacterSheetInputSchema,
  },
  {
    name: "advance_character_sheet",
    description:
      "Advance the stored finalized sheet by one core-owned CharacterLevelUpTransition after preview acceptance.",
    inputSchema: advanceCharacterSheetInputSchema,
  },
  {
    name: "project_character_sheet",
    description:
      "Return creature-facing and battle-facing projections for the stored finalized sheet through core-owned projection helpers.",
    inputSchema: emptyObjectInputSchema,
  },
] as const;

export const CHARACTER_TOOL_NAMES = characterToolDefinitions.map(
  (tool) => tool.name,
) as ReadonlyArray<(typeof characterToolDefinitions)[number]["name"]>;
export type CharacterToolName = (typeof CHARACTER_TOOL_NAMES)[number];

type StoredCharacterState =
  | { readonly kind: "empty" }
  | { readonly kind: "draft"; readonly draft: CharacterDraft }
  | { readonly kind: "sheet"; readonly sheet: CharacterSheet };

export interface CharacterSessionSnapshot {
  readonly storedCharacterState: StoredCharacterState["kind"];
}

type CharacterToolResult = ReturnType<typeof jsonContent> | CharacterToolError;

function isCharacterToolName(name: string): name is CharacterToolName {
  return CHARACTER_TOOL_NAMES.includes(name as CharacterToolName);
}

function encodeStoredCharacterState(state: StoredCharacterState) {
  return Match.value(state).pipe(
    Match.when({ kind: "empty" }, () => ({ kind: "empty" as const })),
    Match.when({ kind: "draft" }, ({ draft }) => ({
      kind: "draft" as const,
      draft,
    })),
    Match.when({ kind: "sheet" }, ({ sheet }) => ({
      kind: "sheet" as const,
      sheet,
    })),
    Match.exhaustive,
  );
}

function missingStoredCharacterContent(toolName: CharacterToolName) {
  return errorContent(
    `Cannot call ${toolName} without stored character state.`,
    {
      code: "MISSING_STORED_CHARACTER",
    },
  );
}

function storedCharacterKindMismatchContent(
  toolName: CharacterToolName,
  expected: "draft" | "sheet",
  actual: StoredCharacterState["kind"],
) {
  return errorContent(
    `${toolName} requires stored ${expected} state; current stored state is ${actual}.`,
    {
      code: "CHARACTER_STATE_KIND_MISMATCH",
      expected,
      actual,
    },
  );
}

export interface CharacterSession {
  getSnapshot(): CharacterSessionSnapshot;
  getStoredSheet(): CharacterSheet | null;
  handleToolCall(name: string, args: unknown): CharacterToolResult;
  isCharacterToolName(name: string): name is CharacterToolName;
}

export function createCharacterSession(): CharacterSession {
  let storedCharacter: StoredCharacterState = { kind: "empty" };

  function requireStoredDraft(toolName: CharacterToolName) {
    return Match.value(storedCharacter).pipe(
      Match.when({ kind: "draft" }, ({ draft }) => draft),
      Match.when({ kind: "empty" }, () =>
        missingStoredCharacterContent(toolName),
      ),
      Match.when({ kind: "sheet" }, ({ kind }) =>
        storedCharacterKindMismatchContent(toolName, "draft", kind),
      ),
      Match.exhaustive,
    );
  }

  function requireStoredSheet(toolName: CharacterToolName) {
    return Match.value(storedCharacter).pipe(
      Match.when({ kind: "sheet" }, ({ sheet }) => sheet),
      Match.when({ kind: "empty" }, () =>
        missingStoredCharacterContent(toolName),
      ),
      Match.when({ kind: "draft" }, ({ kind }) =>
        storedCharacterKindMismatchContent(toolName, "sheet", kind),
      ),
      Match.exhaustive,
    );
  }

  return {
    getSnapshot() {
      return { storedCharacterState: storedCharacter.kind };
    },

    getStoredSheet() {
      return storedCharacter.kind === "sheet" ? storedCharacter.sheet : null;
    },

    isCharacterToolName,

    handleToolCall(name: string, args: unknown): CharacterToolResult {
      if (!isCharacterToolName(name)) {
        return errorContent(`Unknown character tool: ${name}`);
      }

      if (name === "get_character_state") {
        const decodedArgs = decodeEmptyArgs(args, name);
        if (isCharacterToolError(decodedArgs)) return decodedArgs;
        return jsonContent(encodeStoredCharacterState(storedCharacter));
      }

      if (name === "create_character_draft") {
        const decodedArgs = readArgsRecord(args, name);
        if (isCharacterToolError(decodedArgs)) return decodedArgs;
        const topLevelError = rejectUnexpectedTopLevelFields(
          decodedArgs,
          name,
          ["draft"],
        );
        if (topLevelError != null) return topLevelError;

        const draftField = decodedArgs.draft;
        if (draftField === undefined) {
          storedCharacter = { kind: "draft", draft: {} };
        } else {
          const decodedDraft = decodeCanonicalCharacterDraft(
            draftField,
            name,
            "draft",
          );
          if (isCharacterToolError(decodedDraft)) return decodedDraft;
          storedCharacter = {
            kind: "draft",
            draft: decodedDraft,
          };
        }

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
        });
      }

      if (name === "preview_character_draft_update") {
        const draft = requireStoredDraft(name);
        if (isCharacterToolError(draft)) return draft;

        const patch = decodeDraftPatch(args, name);
        if (isCharacterToolError(patch)) return patch;

        const preview = previewCharacterDraftUpdate(draft, patch);
        const candidateDraft = preview.candidateDraft;
        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          preview: {
            ...preview,
            candidateAssessment: enrichAssessment(
              candidateDraft,
              preview.candidateAssessment,
            ),
            newlyOpenedChoices: enrichOpenChoices(
              candidateDraft,
              preview.newlyOpenedChoices,
            ),
          },
        });
      }

      if (name === "apply_character_draft_update") {
        const draft = requireStoredDraft(name);
        if (isCharacterToolError(draft)) return draft;

        const patch = decodeDraftPatch(args, name);
        if (isCharacterToolError(patch)) return patch;

        storedCharacter = {
          kind: "draft",
          draft: applyCharacterDraftUpdate(draft, patch),
        };

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
        });
      }

      if (name === "assess_character_draft") {
        const decodedArgs = decodeEmptyArgs(args, name);
        if (isCharacterToolError(decodedArgs)) return decodedArgs;
        const draft = requireStoredDraft(name);
        if (isCharacterToolError(draft)) return draft;

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          assessment: enrichAssessment(draft, assessCharacterDraft(draft)),
        });
      }

      if (name === "list_character_feature_pickers") {
        const decodedArgs = decodeEmptyArgs(args, name);
        if (isCharacterToolError(decodedArgs)) return decodedArgs;
        const draft = requireStoredDraft(name);
        if (isCharacterToolError(draft)) return draft;

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          pickers: listCharacterFeaturePickers(draft).map(
            serializePickerPayload,
          ),
        });
      }

      if (name === "build_open_choice_patch") {
        const draft = requireStoredDraft(name);
        if (isCharacterToolError(draft)) return draft;

        const decoded = decodeBuildOpenChoicePatchArgs(args);
        if (isCharacterToolError(decoded)) return decoded;

        const pickers = listCharacterFeaturePickers(draft);
        const payload = pickers.find(
          (entry) => entry.featureRef === decoded.featureRef,
        );
        if (payload == null) {
          return errorContent(`Unknown featureRef: ${decoded.featureRef}`, {
            code: "UNKNOWN_FEATURE_REF",
            featureRef: decoded.featureRef,
            availableFeatureRefs: pickers.map((entry) => entry.featureRef),
          });
        }

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          patch: buildOpenChoicePatch(draft, payload, decoded.value),
        });
      }

      if (name === "finalize_character_draft") {
        const decodedArgs = decodeEmptyArgs(args, name);
        if (isCharacterToolError(decodedArgs)) return decodedArgs;
        const draft = requireStoredDraft(name);
        if (isCharacterToolError(draft)) return draft;

        const result = finalizeCharacterDraft(draft);
        if (result.ok) {
          storedCharacter = { kind: "sheet", sheet: result.sheet };
        }

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          result,
        });
      }

      if (name === "preview_character_sheet_advancement") {
        const sheet = requireStoredSheet(name);
        if (isCharacterToolError(sheet)) return sheet;

        const transition = decodeLevelUpTransition(args, name);
        if (isCharacterToolError(transition)) return transition;

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          preview: previewCharacterSheetAdvancement(sheet, transition),
        });
      }

      if (name === "advance_character_sheet") {
        const sheet = requireStoredSheet(name);
        if (isCharacterToolError(sheet)) return sheet;

        const transition = decodeLevelUpTransition(args, name);
        if (isCharacterToolError(transition)) return transition;

        const result = advanceCharacterSheet(sheet, transition);
        if (result.ok) {
          storedCharacter = { kind: "sheet", sheet: result.sheet };
        }

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          result,
        });
      }

      const decodedArgs = decodeEmptyArgs(args, name);
      if (isCharacterToolError(decodedArgs)) return decodedArgs;

      const sheet = requireStoredSheet(name);
      if (isCharacterToolError(sheet)) return sheet;

      return jsonContent({
        storedCharacter: encodeStoredCharacterState(storedCharacter),
        projections: {
          creature: encodeStableJson(characterSheetCreatureProjection(sheet)),
          battle: encodeStableJson(characterSheetBattleProjection(sheet)),
        },
      });
    },
  };
}
