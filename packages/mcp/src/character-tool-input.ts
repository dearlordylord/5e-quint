import {
  characterDraftId,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import { Either, Match, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";
import {
  ApplyCharacterSessionOperationArgsSchema,
  type ApplyCharacterSessionOperationToolInput,
} from "./character-session-operation-tool-input.ts";
import {
  FillCreationHolesArgsSchema,
  decodeFillCreationHolesArgs,
  type FillCreationHolesToolInput,
} from "./character-creation-fill-tool-input.ts";

const EmptyArgsSchema = Schema.Struct({});

const DraftIdArgsSchema = Schema.Struct({
  draftId: Schema.String.annotations({
    description: "Character Draft id returned by create_character_draft.",
  }),
});

const FinalizeCharacterArgsSchema = Schema.Struct({
  draftId: Schema.String.annotations({
    description: "Character Draft id returned by create_character_draft.",
  }),
  druidWildShapeKnownFormStatBlockIds: Schema.optionalWith(
    Schema.Array(Schema.String).annotations({
      description:
        "Selected Beast Stat Block ids for a Druid Wild Shape character. Required when the finalized draft has Wild Shape.",
    }),
    { exact: true },
  ),
});

const CreateCharacterDraftArgsSchema = Schema.Struct({
  draftId: Schema.optionalWith(
    Schema.String.annotations({
      description:
        "Optional caller-provided Character Draft id. Omit to let the runtime assign one.",
    }),
    { exact: true },
  ),
});

export const characterToolNames = {
  createCharacterDraft: "create_character_draft",
  discoverCreationHoles: "discover_creation_holes",
  fillCreationHoles: "fill_creation_holes",
  finalizeCharacter: "finalize_character",
  applyCharacterSessionOperation: "apply_character_session_operation",
  listCharacters: "list_characters",
} as const;
export const CHARACTER_TOOL_NAMES = [
  characterToolNames.createCharacterDraft,
  characterToolNames.discoverCreationHoles,
  characterToolNames.fillCreationHoles,
  characterToolNames.finalizeCharacter,
  characterToolNames.applyCharacterSessionOperation,
  characterToolNames.listCharacters,
] as const;
export type CharacterToolName = (typeof CHARACTER_TOOL_NAMES)[number];

type CreateCharacterDraftToolInput = {
  readonly draftId?: CharacterDraftId;
};
type DraftIdToolInput = {
  readonly draftId: CharacterDraftId;
};
type FinalizeCharacterToolInput = {
  readonly draftId: CharacterDraftId;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
};
type EmptyToolInput = Record<string, never>;
export type CharacterToolCall =
  | {
      readonly name: typeof characterToolNames.createCharacterDraft;
      readonly args: CreateCharacterDraftToolInput;
    }
  | {
      readonly name: typeof characterToolNames.discoverCreationHoles;
      readonly args: DraftIdToolInput;
    }
  | {
      readonly name: typeof characterToolNames.fillCreationHoles;
      readonly args: FillCreationHolesToolInput;
    }
  | {
      readonly name: typeof characterToolNames.finalizeCharacter;
      readonly args: FinalizeCharacterToolInput;
    }
  | {
      readonly name: typeof characterToolNames.applyCharacterSessionOperation;
      readonly args: ApplyCharacterSessionOperationToolInput;
    }
  | {
      readonly name: typeof characterToolNames.listCharacters;
      readonly args: EmptyToolInput;
    };

export const draftIdInputSchema = mcpObjectJsonSchema(DraftIdArgsSchema);
export const finalizeCharacterInputSchema = mcpObjectJsonSchema(
  FinalizeCharacterArgsSchema,
);
export const createCharacterDraftInputSchema = mcpObjectJsonSchema(
  CreateCharacterDraftArgsSchema,
);
export const fillCreationHolesInputSchema = mcpObjectJsonSchema(
  FillCreationHolesArgsSchema,
);
export const applyCharacterSessionOperationInputSchema = mcpObjectJsonSchema(
  ApplyCharacterSessionOperationArgsSchema,
);
export const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);

export function decodeCharacterToolCall(input: {
  readonly name: CharacterToolName;
  readonly args: unknown;
}): ToolInputResult<CharacterToolCall> {
  return Match.value(input.name).pipe(
    Match.when(characterToolNames.createCharacterDraft, () =>
      Either.map(decodeCreateCharacterDraftArgs(input.args), (args) => ({
        name: characterToolNames.createCharacterDraft,
        args,
      })),
    ),
    Match.when(characterToolNames.discoverCreationHoles, () =>
      Either.map(
        decodeDraftIdArg(input.args, characterToolNames.discoverCreationHoles),
        (draftId) => ({
          name: characterToolNames.discoverCreationHoles,
          args: { draftId },
        }),
      ),
    ),
    Match.when(characterToolNames.fillCreationHoles, () =>
      Either.map(
        decodeFillCreationHolesArgs(
          input.args,
          characterToolNames.fillCreationHoles,
        ),
        (args) => ({
          name: characterToolNames.fillCreationHoles,
          args,
        }),
      ),
    ),
    Match.when(characterToolNames.finalizeCharacter, () =>
      Either.map(decodeFinalizeCharacterArgs(input.args), (args) => ({
        name: characterToolNames.finalizeCharacter,
        args,
      })),
    ),
    Match.when(characterToolNames.applyCharacterSessionOperation, () =>
      Either.map(
        decodeApplyCharacterSessionOperationArgs(input.args),
        (args) => ({
          name: characterToolNames.applyCharacterSessionOperation,
          args,
        }),
      ),
    ),
    Match.when(characterToolNames.listCharacters, () =>
      Either.map(decodeEmptyArgs(input.args), (args) => ({
        name: characterToolNames.listCharacters,
        args,
      })),
    ),
    Match.exhaustive,
  );
}

function decodeApplyCharacterSessionOperationArgs(
  args: unknown,
): ToolInputResult<ApplyCharacterSessionOperationToolInput> {
  return decodeToolArgs(
    ApplyCharacterSessionOperationArgsSchema,
    args,
    characterToolNames.applyCharacterSessionOperation,
  );
}

function decodeCreateCharacterDraftArgs(
  args: unknown,
): ToolInputResult<CreateCharacterDraftToolInput> {
  const record = decodeToolArgs(
    CreateCharacterDraftArgsSchema,
    args,
    characterToolNames.createCharacterDraft,
  );
  return Either.map(record, (value) =>
    value.draftId === undefined
      ? {}
      : { draftId: characterDraftId(value.draftId) },
  );
}

type DraftIdToolName = typeof characterToolNames.discoverCreationHoles;

function decodeDraftIdArg(
  args: unknown,
  toolName: DraftIdToolName,
): ToolInputResult<CharacterDraftId> {
  const record = decodeToolArgs(DraftIdArgsSchema, args, toolName);
  return Either.map(record, (value) => characterDraftId(value.draftId));
}

function decodeFinalizeCharacterArgs(
  args: unknown,
): ToolInputResult<FinalizeCharacterToolInput> {
  const record = decodeToolArgs(
    FinalizeCharacterArgsSchema,
    args,
    characterToolNames.finalizeCharacter,
  );
  return Either.map(record, (value) => ({
    draftId: characterDraftId(value.draftId),
    ...(value.druidWildShapeKnownFormStatBlockIds === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            value.druidWildShapeKnownFormStatBlockIds,
        }),
  }));
}

function decodeEmptyArgs(args: unknown): ToolInputResult<EmptyToolInput> {
  const decoded = decodeToolArgs(
    EmptyArgsSchema,
    args,
    characterToolNames.listCharacters,
  );
  return Either.map(decoded, () => ({}));
}
