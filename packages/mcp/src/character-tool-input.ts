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
import { JSONSchema, Schema } from "effect";

import { errorContent } from "./tool-content.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
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

type ToolError = ReturnType<typeof errorContent>;

export function decodeCreateCharacterDraftArgs(
  args: unknown,
  toolName: string,
): { readonly draftId?: CharacterDraftId } | ToolError {
  const record = decodeToolArgs(CreateCharacterDraftArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  if (record.draftId === undefined) return {};
  return { draftId: characterDraftId(record.draftId) };
}

export function decodeDraftIdArg(
  args: unknown,
  toolName: string,
): CharacterDraftId | ToolError {
  const record = decodeToolArgs(DraftIdArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  return characterDraftId(record.draftId);
}

export function decodeFillCreationHolesArgs(
  args: unknown,
  toolName: string,
):
  | {
      readonly draftId: CharacterDraftId;
      readonly expectedRevision: DraftRevision;
      readonly fills: readonly CreationFill[];
    }
  | ToolError {
  const record = decodeToolArgs(FillCreationHolesArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  const fills: CreationFill[] = [];
  for (const [index, fill] of record.fills.entries()) {
    const decoded = decodeCreationFill(fill, toolName, index);
    if (isToolError(decoded)) return decoded;
    fills.push(decoded);
  }

  return {
    draftId: characterDraftId(record.draftId),
    expectedRevision: draftRevision(record.expectedRevision),
    fills,
  };
}

export function isToolError(value: unknown): value is ToolError {
  return isRecord(value) && value.isError === true;
}

export function decodeEmptyArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const decoded = decodeToolArgs(EmptyArgsSchema, args, toolName);
  return isToolError(decoded) ? decoded : {};
}

function decodeCreationFill(
  value: CreationFillArgs,
  toolName: string,
  index: number,
): CreationFill | ToolError {
  if (value.kind === "choice") {
    return decodeChoiceFill(value, value.holeId, toolName, index);
  }
  if (value.kind === "abilityScores") {
    return decodeAbilityScoreFill(value, value.holeId, toolName, index);
  }

  return invalidFieldContent(toolName, `fills[${index}].kind`, "fill kind");
}

function decodeChoiceFill(
  value: Extract<CreationFillArgs, { readonly kind: "choice" }>,
  holeIdText: string,
  toolName: string,
  index: number,
): CreationFill | ToolError {
  const holeId = decodeCreationHoleId(holeIdText, toolName, index);
  if (isToolError(holeId)) return holeId;
  return {
    kind: "choice",
    holeId,
    optionIds: value.optionIds.map(creationChoiceOptionId),
  };
}

function decodeAbilityScoreFill(
  value: Extract<CreationFillArgs, { readonly kind: "abilityScores" }>,
  holeIdText: string,
  toolName: string,
  index: number,
): CreationFill | ToolError {
  const holeId = decodeCreationHoleId(holeIdText, toolName, index);
  if (isToolError(holeId)) return holeId;
  return {
    kind: "abilityScores",
    holeId,
    method: value.method,
    value: value.value,
  };
}

function decodeCreationHoleId(
  holeIdText: string,
  toolName: string,
  index: number,
): CreationFill["holeId"] | ToolError {
  const holeId = parseCreationHoleId(holeIdText);
  if (holeId == null) {
    return invalidFieldContent(
      toolName,
      `fills[${index}].holeId`,
      "creation hole id",
    );
  }
  return holeId;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
