import {
  SUPPORTED_ABILITY_SCORE_METHODS,
  characterDraftId,
  creationChoiceOptionId,
  draftRevision,
  parseCreationHoleId,
  type CharacterDraftId,
  type CreationFill,
  type DraftRevision,
} from "@dnd/character-creation-runtime";
import { Either, JSONSchema, Schema } from "effect";

import { errorContent } from "./tool-content.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
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
    description: "Creation hole id from holes[].holeId.",
  }),
  optionIds: Schema.Array(Schema.String).annotations({
    description:
      "Choice option ids from the matching holes[].options[].optionId. Respect the hole cardinality returned by discovery.",
  }),
});

const AbilityScoreAssignmentArgsSchema = Schema.Struct({
  str: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  dex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  con: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  int: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  wis: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  cha: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
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

export const draftIdInputSchema = JSONSchema.make(
  DraftIdArgsSchema,
) as unknown as McpObjectInputSchema;
export const createCharacterDraftInputSchema = JSONSchema.make(
  CreateCharacterDraftArgsSchema,
) as unknown as McpObjectInputSchema;
export const fillCreationHolesInputSchema = JSONSchema.make(
  FillCreationHolesArgsSchema,
) as unknown as McpObjectInputSchema;
export const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);

export function decodeCreateCharacterDraftArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<{ readonly draftId?: CharacterDraftId }> {
  const record = decodeToolArgs(CreateCharacterDraftArgsSchema, args, toolName);
  return Either.map(record, (value) =>
    value.draftId === undefined
      ? {}
      : { draftId: characterDraftId(value.draftId) },
  );
}

export function decodeDraftIdArg(
  args: unknown,
  toolName: string,
): ToolInputResult<CharacterDraftId> {
  const record = decodeToolArgs(DraftIdArgsSchema, args, toolName);
  return Either.map(record, (value) => characterDraftId(value.draftId));
}

export function decodeFillCreationHolesArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<{
  readonly draftId: CharacterDraftId;
  readonly expectedRevision: DraftRevision;
  readonly fills: readonly CreationFill[];
}> {
  const record = decodeToolArgs(FillCreationHolesArgsSchema, args, toolName);
  if (Either.isLeft(record)) return Either.left(record.left);
  const fills: CreationFill[] = [];
  for (const [index, fill] of record.right.fills.entries()) {
    const decoded = decodeCreationFill(fill, toolName, index);
    if (Either.isLeft(decoded)) return Either.left(decoded.left);
    fills.push(decoded.right);
  }

  return Either.right({
    draftId: characterDraftId(record.right.draftId),
    expectedRevision: draftRevision(record.right.expectedRevision),
    fills,
  });
}

export function decodeEmptyArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<Record<string, never>> {
  const decoded = decodeToolArgs(EmptyArgsSchema, args, toolName);
  return Either.map(decoded, () => ({}));
}

function decodeCreationFill(
  value: CreationFillArgs,
  toolName: string,
  index: number,
): ToolInputResult<CreationFill> {
  if (value.kind === "choice") {
    return decodeChoiceFill(value, value.holeId, toolName, index);
  }
  if (value.kind === "abilityScores") {
    return decodeAbilityScoreFill(value, value.holeId, toolName, index);
  }

  return Either.left(
    invalidFieldContent(toolName, `fills[${index}].kind`, "fill kind"),
  );
}

function decodeChoiceFill(
  value: Extract<CreationFillArgs, { readonly kind: "choice" }>,
  holeIdText: string,
  toolName: string,
  index: number,
): ToolInputResult<CreationFill> {
  const holeId = decodeCreationHoleId(holeIdText, toolName, index);
  return Either.map(holeId, (decodedHoleId) => ({
    kind: "choice",
    holeId: decodedHoleId,
    optionIds: value.optionIds.map(creationChoiceOptionId),
  }));
}

function decodeAbilityScoreFill(
  value: Extract<CreationFillArgs, { readonly kind: "abilityScores" }>,
  holeIdText: string,
  toolName: string,
  index: number,
): ToolInputResult<CreationFill> {
  const holeId = decodeCreationHoleId(holeIdText, toolName, index);
  return Either.map(holeId, (decodedHoleId) => ({
    kind: "abilityScores",
    holeId: decodedHoleId,
    method: value.method,
    value: value.value,
  }));
}

function decodeCreationHoleId(
  holeIdText: string,
  toolName: string,
  index: number,
): ToolInputResult<CreationFill["holeId"]> {
  const holeId = parseCreationHoleId(holeIdText);
  if (holeId == null) {
    return Either.left(
      invalidFieldContent(
        toolName,
        `fills[${index}].holeId`,
        "creation hole id",
      ),
    );
  }
  return Either.right(holeId);
}

function invalidFieldContent(
  toolName: string,
  field: string,
  expected: string,
) {
  return errorContent(`Invalid ${toolName} input`, {
    code: "INVALID_FIELD",
    field,
    expected,
  });
}
