import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { Result, Schema } from "effect";

const evaluationInventoryJson: unknown = JSON.parse(
  readFileSync(
    new URL(
      "../../../plugins/dnd-srd-oracle/evals/evaluation-inventory.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
export const forwardTestResultsJson: unknown = JSON.parse(
  readFileSync(
    new URL(
      "../../../plugins/dnd-srd-oracle/evals/forward-test-results.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const submissionSourceJson: unknown = JSON.parse(
  readFileSync(
    new URL(
      "../../../plugins/dnd-srd-oracle/publication/submission-source.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const SubmissionReviewCaseSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(["positive", "negative"]),
  prompt: Schema.String,
  fixture: Schema.String,
  rejectionRationale: Schema.optionalKey(Schema.String),
  expectedBehavior: Schema.String,
  expectedResultShape: Schema.String,
});
const SkillActivationCaseSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals([
    "direct",
    "indirect",
    "followUp",
    "negative",
    "boundary",
  ]),
  after: Schema.optionalKey(Schema.String),
  prompt: Schema.String,
  expectedActivation: Schema.Literals(["activate", "doNotActivate"]),
});
const EvaluationInventorySchema = Schema.Struct({
  submissionReview: Schema.Array(SubmissionReviewCaseSchema),
  skillActivation: Schema.Array(SkillActivationCaseSchema),
});
const SubmissionSourceSchema = Schema.Struct({
  submissionReviewCaseIds: Schema.Array(Schema.String),
});
const LocalSkillEvaluationSchema = Schema.Struct({
  kind: Schema.Literal("independentStaticForwardTest"),
  installedChatGptEvidence: Schema.Literal(false),
  status: Schema.Literal("passed"),
  skillSourceDigest: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u)),
  skillActivationInventoryDigest: Schema.String.check(
    Schema.isPattern(/^[0-9a-f]{64}$/u),
  ),
  cases: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      activation: Schema.Literals(["activate", "doNotActivate"]),
      outcome: Schema.Literal("metExpectation"),
      toolIntents: Schema.Array(Schema.String),
      result: Schema.String,
    }),
  ),
});

export const evaluationInventory = decodeStaticJson(
  EvaluationInventorySchema,
  evaluationInventoryJson,
  "evaluation inventory",
);
const submissionSource = decodeStaticJson(
  SubmissionSourceSchema,
  submissionSourceJson,
  "submission source",
);
export const skillSource = {
  files: [
    "../../../plugins/dnd-srd-oracle/skills/dnd-srd-oracle/SKILL.md",
    "../../../plugins/dnd-srd-oracle/skills/dnd-srd-oracle/agents/openai.yaml",
  ].map((path) => ({
    path: path.replace("../../../plugins/dnd-srd-oracle/", ""),
    content: readFileSync(new URL(path, import.meta.url), "utf8"),
  })),
};
const matchesJsonObjectSchema = Schema.is(Schema.JsonObject);

export type SubmissionReviewCaseIdentity = {
  readonly id: string;
  readonly kind: "positive" | "negative";
};

export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function selectedSubmissionReviewCaseIdentities(): readonly SubmissionReviewCaseIdentity[] {
  return selectedSubmissionReviewCases().map(({ id, kind }) => ({ id, kind }));
}

export function validateSubmissionReviewCaseSelection(input: {
  readonly inventory: unknown;
  readonly source: unknown;
}): readonly SubmissionReviewCaseIdentity[] {
  const inventory = decodeStaticJson(
    EvaluationInventorySchema,
    input.inventory,
    "evaluation inventory",
  );
  const source = decodeStaticJson(
    SubmissionSourceSchema,
    input.source,
    "submission source",
  );
  return selectSubmissionReviewCases(inventory, source).map(({ id, kind }) => ({
    id,
    kind,
  }));
}

export function selectedSubmissionReviewCases(): readonly (typeof SubmissionReviewCaseSchema.Type)[] {
  return selectSubmissionReviewCases(evaluationInventory, submissionSource);
}

function selectSubmissionReviewCases(
  inventory: typeof EvaluationInventorySchema.Type,
  source: typeof SubmissionSourceSchema.Type,
): readonly (typeof SubmissionReviewCaseSchema.Type)[] {
  const inventoryIds = inventory.submissionReview.map(({ id }) => id);
  if (new Set(inventoryIds).size !== inventoryIds.length) {
    throw new Error("Submission review inventory contains duplicate ids.");
  }
  const cases = new Map(
    inventory.submissionReview.map((entry) => [entry.id, entry]),
  );
  const selected = source.submissionReviewCaseIds.map((id) => cases.get(id));
  if (
    selected.some((entry) => entry === undefined) ||
    new Set(source.submissionReviewCaseIds).size !== selected.length
  ) {
    throw new Error("Submission review case selection is invalid.");
  }
  const present = selected.filter(
    (entry): entry is typeof SubmissionReviewCaseSchema.Type =>
      entry !== undefined,
  );
  const positiveCount = present.filter(
    ({ kind }) => kind === "positive",
  ).length;
  if (
    present.length !== 8 ||
    positiveCount !== 5 ||
    present.length - positiveCount !== 3
  ) {
    throw new Error(
      "Submission review selection must contain five positive and three negative cases.",
    );
  }
  return present;
}

export function validateLocalSkillEvaluationBinding(input: {
  readonly evidence: unknown;
  readonly skillActivationInventory: unknown;
  readonly skillSource: unknown;
}): void {
  const evidence = decodeStaticJson(
    LocalSkillEvaluationSchema,
    input.evidence,
    "local Skill evaluation",
  );
  const inventory = decodeStaticJson(
    Schema.Array(SkillActivationCaseSchema),
    input.skillActivationInventory,
    "Skill activation inventory",
  );
  const expected = new Map(
    inventory.map((entry) => [entry.id, entry.expectedActivation] as const),
  );
  const observed = new Map(
    evidence.cases.map((entry) => [entry.id, entry.activation] as const),
  );
  if (
    expected.size === 0 ||
    expected.size !== inventory.length ||
    observed.size !== evidence.cases.length ||
    expected.size !== observed.size ||
    Array.from(expected).some(
      ([caseId, activation]) => observed.get(caseId) !== activation,
    )
  ) {
    throw new Error("Local Skill evaluation does not cover the current cases.");
  }
  if (
    evidence.skillSourceDigest !== sha256(input.skillSource) ||
    evidence.skillActivationInventoryDigest !== sha256(inventory)
  ) {
    throw new Error(
      "Local Skill evaluation does not bind the current Skill and activation inventory.",
    );
  }
}

export function normalizeResult(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeResult);
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value)
  ) {
    return "<timestamp>";
  }
  if (!matchesJsonObjectSchema(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (key === "playSessionId") return [key, "<playSessionId>"];
      if (key === "draftId") return [key, "<draftId>"];
      if (key === "draftIds" && Array.isArray(entry)) {
        return [key, entry.map(() => "<draftId>")];
      }
      if (key === "text" && typeof entry === "string") {
        try {
          return [
            key,
            canonicalJson(normalizeResult(JSON.parse(entry) as unknown)),
          ];
        } catch {
          return [key, entry];
        }
      }
      return [key, normalizeResult(entry)];
    }),
  );
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!matchesJsonObjectSchema(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJson(entry)]),
  );
}

function decodeStaticJson<A, I>(
  schema: Schema.Codec<A, I, never>,
  value: unknown,
  name: string,
): A {
  const decoded = Schema.decodeUnknownResult(schema, {
    onExcessProperty: "ignore",
  })(value);
  if (Result.isFailure(decoded)) {
    throw new Error(`Invalid ${name}: ${decoded.failure.message}`);
  }
  return decoded.success;
}
