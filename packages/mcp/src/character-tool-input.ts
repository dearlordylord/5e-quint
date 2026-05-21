// KERNEL-COVERAGE: boundary-owner CREATION.PROTOCOL.MALFORMED_FILL_REJECTION
import {
  SUPPORTED_ABILITY_SCORE_METHODS,
  abilityScoreAssignment,
  characterDraftId,
  creationChoiceOptionId,
  draftRevision,
  parseCreationHoleId,
  type CharacterDraftId,
  type CreationFill,
  type DraftRevision,
} from "@dnd/character-creation-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import { Either, Match, Schema } from "effect";

import { errorContent } from "./tool-content.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolError,
  type ToolInputResult,
} from "./schema-codec.ts";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
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

const ChoiceCreationFillArgsSchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  holeId: Schema.String.annotations({
    description:
      "Creation hole id from holes[].holeId. For draft.progression.initial, this is the one progression-profile hole; there is no separate level-1 class-entry hole.",
  }),
  optionIds: Schema.Array(Schema.String).annotations({
    description:
      "Choice option ids from the matching holes[].options[].optionId. A progression option id names the whole Character Progression profile: starting class plus any post-start advancement entries. Respect the hole cardinality returned by discovery.",
  }),
});

const AbilityScoreAssignmentArgsSchema = Schema.Struct({
  str: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(30),
  ),
  dex: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(30),
  ),
  con: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(30),
  ),
  int: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(30),
  ),
  wis: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(30),
  ),
  cha: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(30),
  ),
});

const AbilityScoreCreationFillArgsSchema = Schema.Struct({
  kind: Schema.Literal("abilityScores"),
  holeId: Schema.String.annotations({
    description: "Ability-score creation hole id from holes[].holeId.",
  }),
  method: Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS),
  value: AbilityScoreAssignmentArgsSchema,
});

const CreationFillArgsSchema = Schema.Union(
  ChoiceCreationFillArgsSchema,
  AbilityScoreCreationFillArgsSchema,
);

const FillCreationHolesArgsSchema = Schema.Struct({
  draftId: Schema.String.annotations({
    description: "Character Draft id returned by create_character_draft.",
  }),
  expectedRevision: NonNegativeIntegerSchema.annotations({
    description:
      "Current draft revision from draft.revision or storedDraft.revision.",
  }),
  fills: Schema.Array(CreationFillArgsSchema).annotations({
    description:
      "Atomic batch of current creation-hole fills. Copy holeId and optionIds from discover_creation_holes or the prior tool response.",
  }),
});

type FillCreationHolesArgs = Schema.Schema.Type<
  typeof FillCreationHolesArgsSchema
>;
type CreationFillArgs = FillCreationHolesArgs["fills"][number];

export const characterToolNames = {
  createCharacterDraft: "create_character_draft",
  discoverCreationHoles: "discover_creation_holes",
  fillCreationHoles: "fill_creation_holes",
  finalizeCharacter: "finalize_character",
  listCharacters: "list_characters",
} as const;
export const CHARACTER_TOOL_NAMES = [
  characterToolNames.createCharacterDraft,
  characterToolNames.discoverCreationHoles,
  characterToolNames.fillCreationHoles,
  characterToolNames.finalizeCharacter,
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
type FillCreationHolesToolInput = {
  readonly draftId: CharacterDraftId;
  readonly expectedRevision: DraftRevision;
  readonly fills: readonly CreationFill[];
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
      Either.map(decodeFillCreationHolesArgs(input.args), (args) => ({
        name: characterToolNames.fillCreationHoles,
        args,
      })),
    ),
    Match.when(characterToolNames.finalizeCharacter, () =>
      Either.map(decodeFinalizeCharacterArgs(input.args), (args) => ({
        name: characterToolNames.finalizeCharacter,
        args,
      })),
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

function decodeFillCreationHolesArgs(
  args: unknown,
): ToolInputResult<FillCreationHolesToolInput> {
  const record = decodeToolArgs(
    FillCreationHolesArgsSchema,
    args,
    characterToolNames.fillCreationHoles,
  );
  if (Either.isLeft(record)) return Either.left(record.left);
  const fills = traverseValidation(record.right.fills, decodeCreationFill);
  if (Either.isLeft(fills)) {
    return Either.left(invalidFillsContent(fills.left));
  }

  return Either.right({
    draftId: characterDraftId(record.right.draftId),
    expectedRevision: draftRevision(record.right.expectedRevision),
    fills: fills.right,
  });
}

function decodeEmptyArgs(args: unknown): ToolInputResult<EmptyToolInput> {
  const decoded = decodeToolArgs(
    EmptyArgsSchema,
    args,
    characterToolNames.listCharacters,
  );
  return Either.map(decoded, () => ({}));
}

function decodeCreationFill(
  value: CreationFillArgs,
  index: number,
): ToolInputResult<CreationFill> {
  if (value.kind === "choice") {
    return decodeChoiceFill(value, value.holeId, index);
  }
  if (value.kind === "abilityScores") {
    return decodeAbilityScoreFill(value, value.holeId, index);
  }

  return Either.left(invalidFieldContent(`fills[${index}].kind`, "fill kind"));
}

function decodeChoiceFill(
  value: Extract<CreationFillArgs, { readonly kind: "choice" }>,
  holeIdText: string,
  index: number,
): ToolInputResult<CreationFill> {
  const holeId = decodeCreationHoleId(holeIdText, index);
  return Either.map(holeId, (decodedHoleId) => ({
    kind: "choice",
    holeId: decodedHoleId,
    optionIds: value.optionIds.map(creationChoiceOptionId),
  }));
}

function decodeAbilityScoreFill(
  value: Extract<CreationFillArgs, { readonly kind: "abilityScores" }>,
  holeIdText: string,
  index: number,
): ToolInputResult<CreationFill> {
  const holeId = decodeCreationHoleId(holeIdText, index);
  const scores = abilityScoreAssignment(value.value);
  if (Either.isLeft(scores)) {
    return Either.left(
      invalidFieldContent(`fills[${index}].value`, "ability score assignment"),
    );
  }

  return Either.map(holeId, (decodedHoleId) => ({
    kind: "abilityScores",
    holeId: decodedHoleId,
    method: value.method,
    value: scores.right,
  }));
}

function decodeCreationHoleId(
  holeIdText: string,
  index: number,
): ToolInputResult<CreationFill["holeId"]> {
  const holeId = parseCreationHoleId(holeIdText);
  if (holeId == null) {
    return Either.left(
      invalidFieldContent(`fills[${index}].holeId`, "creation hole id"),
    );
  }
  return Either.right(holeId);
}

function invalidFieldContent(field: string, expected: string) {
  return errorContent(`Invalid ${characterToolNames.fillCreationHoles} input`, {
    code: "INVALID_FIELD",
    field,
    expected,
  });
}

function invalidFillsContent(issues: readonly ToolError[]) {
  return errorContent(`Invalid ${characterToolNames.fillCreationHoles} input`, {
    code: "INVALID_FILLS",
    issues: issues.map(toolErrorPayload),
  });
}

function toolErrorPayload(error: ToolError): unknown {
  const text = error.content[0]?.text;
  if (text === undefined) return error;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
