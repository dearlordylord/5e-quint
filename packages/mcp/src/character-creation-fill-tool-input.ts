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
import { Result, Schema } from "effect";

import { errorContent, jsonContentPayload } from "./tool-content.ts";
import {
  decodeToolArgs,
  type ToolError,
  type ToolInputResult,
} from "./schema-codec.ts";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
);
const ChoiceCreationFillArgsSchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  holeId: Schema.String.pipe(
    Schema.annotate({
      description:
        "Creation hole id from holes[].holeId. For draft.progression.initial, this is the one progression-profile hole; there is no separate level-1 class-entry hole.",
    }),
  ),
  optionIds: Schema.Array(Schema.String).pipe(
    Schema.annotate({
      description:
        "Choice option ids from the matching holes[].options[].optionId. A progression option id names the whole Character Progression profile: starting class plus any post-start advancement entries. Respect the hole cardinality returned by discovery.",
    }),
  ),
});

const AbilityScoreAssignmentArgsSchema = Schema.Struct({
  str: Schema.Number.pipe(
    Schema.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(30),
    ),
  ),
  dex: Schema.Number.pipe(
    Schema.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(30),
    ),
  ),
  con: Schema.Number.pipe(
    Schema.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(30),
    ),
  ),
  int: Schema.Number.pipe(
    Schema.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(30),
    ),
  ),
  wis: Schema.Number.pipe(
    Schema.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(30),
    ),
  ),
  cha: Schema.Number.pipe(
    Schema.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(1),
      Schema.isLessThanOrEqualTo(30),
    ),
  ),
});

const AbilityScoreCreationFillArgsSchema = Schema.Struct({
  kind: Schema.Literal("abilityScores"),
  holeId: Schema.String.pipe(
    Schema.annotate({
      description: "Ability-score creation hole id from holes[].holeId.",
    }),
  ),
  method: Schema.Literals(SUPPORTED_ABILITY_SCORE_METHODS),
  value: AbilityScoreAssignmentArgsSchema,
});

const CreationFillArgsSchema = Schema.Union([
  ChoiceCreationFillArgsSchema,
  AbilityScoreCreationFillArgsSchema,
]);

export const FillCreationHolesArgsSchema = Schema.Struct({
  draftId: Schema.String.pipe(
    Schema.annotate({
      description: "Character Draft id returned by create_character_draft.",
    }),
  ),
  expectedRevision: NonNegativeIntegerSchema.pipe(
    Schema.annotate({
      description:
        "Current draft revision from draft.revision or storedDraft.revision.",
    }),
  ),
  fills: Schema.Array(CreationFillArgsSchema).pipe(
    Schema.annotate({
      description:
        "Atomic batch of current creation-hole fills. Copy holeId and optionIds from discover_creation_holes or the prior tool response.",
    }),
  ),
});

type FillCreationHolesArgs = Schema.Schema.Type<
  typeof FillCreationHolesArgsSchema
>;
type CreationFillArgs = FillCreationHolesArgs["fills"][number];

export type FillCreationHolesToolInput = {
  readonly draftId: CharacterDraftId;
  readonly expectedRevision: DraftRevision;
  readonly fills: readonly CreationFill[];
};

export function decodeFillCreationHolesArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<FillCreationHolesToolInput> {
  const record = decodeToolArgs(FillCreationHolesArgsSchema, args, toolName);
  if (Result.isFailure(record)) return Result.fail(record.failure);
  const fills = traverseValidation(record.success.fills, (value, index) =>
    decodeCreationFill(value, index, toolName),
  );
  if (Result.isFailure(fills)) {
    return Result.fail(invalidFillsContent(toolName, fills.failure));
  }

  return Result.succeed({
    draftId: characterDraftId(record.success.draftId),
    expectedRevision: draftRevision(record.success.expectedRevision),
    fills: fills.success,
  });
}

function decodeCreationFill(
  value: CreationFillArgs,
  index: number,
  toolName: string,
): ToolInputResult<CreationFill> {
  if (value.kind === "choice") {
    return decodeChoiceFill(value, value.holeId, index, toolName);
  }
  return decodeAbilityScoreFill(value, value.holeId, index, toolName);
}

function decodeChoiceFill(
  value: Extract<CreationFillArgs, { readonly kind: "choice" }>,
  holeIdText: string,
  index: number,
  toolName: string,
): ToolInputResult<CreationFill> {
  const holeId = decodeCreationHoleId(holeIdText, index, toolName);
  return Result.map(holeId, (decodedHoleId) => ({
    kind: "choice",
    holeId: decodedHoleId,
    optionIds: value.optionIds.map(creationChoiceOptionId),
  }));
}

function decodeAbilityScoreFill(
  value: Extract<CreationFillArgs, { readonly kind: "abilityScores" }>,
  holeIdText: string,
  index: number,
  toolName: string,
): ToolInputResult<CreationFill> {
  const holeId = decodeCreationHoleId(holeIdText, index, toolName);
  const scores = Result.mapError(abilityScoreAssignment(value.value), () =>
    invalidFieldContent(
      toolName,
      `fills[${index}].value`,
      "ability score assignment",
    ),
  );
  return Result.map(
    Result.all({ holeId, scores }),
    ({ holeId: decodedHoleId, scores: decodedScores }) => ({
      kind: "abilityScores",
      holeId: decodedHoleId,
      method: value.method,
      value: decodedScores,
    }),
  );
}

function decodeCreationHoleId(
  holeIdText: string,
  index: number,
  toolName: string,
): ToolInputResult<CreationFill["holeId"]> {
  const holeId = parseCreationHoleId(holeIdText);
  if (holeId == null) {
    return Result.fail(
      invalidFieldContent(
        toolName,
        `fills[${index}].holeId`,
        "creation hole id",
      ),
    );
  }
  return Result.succeed(holeId);
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

function invalidFillsContent(toolName: string, issues: readonly ToolError[]) {
  return errorContent(`Invalid ${toolName} input`, {
    code: "INVALID_FILLS",
    issues: issues.map(jsonContentPayload),
  });
}
