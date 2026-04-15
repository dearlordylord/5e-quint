import { Match, Schema } from "effect";

import {
  assessCharacterDraft,
  applyCharacterDraftUpdate,
  advanceCharacterSheet,
  CharacterDraftSchema,
  CharacterLevelUpTransitionSchema,
  finalizeCharacterDraft,
  previewCharacterDraftUpdate,
  strictCharacterParseOptions,
  type CharacterDraft,
  type CharacterLevelUpTransition,
  type CharacterSheet,
} from "@dnd/core/character-domain.ts";
import {
  characterSheetBattleProjection,
  characterSheetCreatureProjection,
} from "@dnd/core/character-sheet-derived.ts";

import {
  encodeStableJson,
  invalidCharacterInputContent,
  readArgsRecord,
  rejectUnexpectedTopLevelFields,
} from "./character-session-helpers.ts";
import { errorContent, jsonContent } from "./server-shared.ts";

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

const emptyObjectInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

const createCharacterDraftInputSchema = {
  type: "object",
  properties: {
    draft: {
      type: "object",
      description:
        "Optional canonical @dnd/core CharacterDraft payload to seed stored draft state. Omit to create an empty draft.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

const characterDraftPatchInputSchema = {
  type: "object",
  required: ["patch"],
  properties: {
    patch: {
      type: "object",
      description:
        "Partial canonical @dnd/core CharacterDraft patch applied over the stored draft state.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

const advanceCharacterSheetInputSchema = {
  type: "object",
  required: ["transition"],
  properties: {
    transition: {
      type: "object",
      description:
        "Canonical core-owned CharacterLevelUpTransition payload applied to the stored finalized sheet.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

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
    name: "finalize_character_draft",
    description:
      "Finalize the stored draft into a canonical CharacterSheet through core-owned semantics. Successful finalization replaces stored draft state with stored sheet state.",
    inputSchema: emptyObjectInputSchema,
  },
  {
    name: "advance_character_sheet",
    description:
      "Advance the stored finalized sheet by one core-owned CharacterLevelUpTransition.",
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

type CharacterToolError = ReturnType<typeof errorContent>;
type CharacterToolResult = ReturnType<typeof jsonContent> | CharacterToolError;

function isCharacterToolName(name: string): name is CharacterToolName {
  return CHARACTER_TOOL_NAMES.includes(name as CharacterToolName);
}

function isCharacterToolError(value: unknown): value is CharacterToolError {
  return (
    typeof value === "object" &&
    value !== null &&
    "isError" in value &&
    value.isError === true &&
    "content" in value
  );
}

function decodeCanonicalCharacterDraft(
  value: unknown,
  toolName: CharacterToolName,
  fieldName: string,
): CharacterDraft | CharacterToolError {
  const decoded = Schema.decodeUnknownEither(
    CharacterDraftSchema,
    strictCharacterParseOptions,
  )(value);
  if (decoded._tag === "Left") {
    return invalidCharacterInputContent(toolName, fieldName, decoded.left);
  }
  return decoded.right;
}

function decodeDraftPatch(
  args: unknown,
  toolName: "preview_character_draft_update" | "apply_character_draft_update",
): Partial<CharacterDraft> | CharacterToolError {
  const decodedArgs = readArgsRecord(args, toolName);
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(decodedArgs, toolName, [
    "patch",
  ]);
  if (topLevelError != null) return topLevelError;
  return decodeCanonicalCharacterDraft(decodedArgs.patch, toolName, "patch");
}

function decodeLevelUpTransition(
  args: unknown,
): CharacterLevelUpTransition | CharacterToolError {
  const decodedArgs = readArgsRecord(args, "advance_character_sheet");
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(
    decodedArgs,
    "advance_character_sheet",
    ["transition"],
  );
  if (topLevelError != null) return topLevelError;
  const decoded = Schema.decodeUnknownEither(
    CharacterLevelUpTransitionSchema,
    strictCharacterParseOptions,
  )(decodedArgs.transition);
  if (decoded._tag === "Left") {
    return invalidCharacterInputContent(
      "advance_character_sheet",
      "transition",
      decoded.left,
    );
  }
  return decoded.right;
}

function decodeEmptyArgs(
  args: unknown,
  toolName:
    | "get_character_state"
    | "assess_character_draft"
    | "finalize_character_draft"
    | "project_character_sheet",
): Record<string, never> | CharacterToolError {
  const decodedArgs = readArgsRecord(args, toolName);
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(decodedArgs, toolName, []);
  if (topLevelError != null) return topLevelError;
  return decodedArgs as Record<string, never>;
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

        return jsonContent({
          storedCharacter: encodeStoredCharacterState(storedCharacter),
          preview: previewCharacterDraftUpdate(draft, patch),
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
          assessment: assessCharacterDraft(draft),
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

      if (name === "advance_character_sheet") {
        const sheet = requireStoredSheet(name);
        if (isCharacterToolError(sheet)) return sheet;

        const transition = decodeLevelUpTransition(args);
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
