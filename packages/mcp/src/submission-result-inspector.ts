import type {
  JsonSchemaType,
  JsonSchemaValidator,
} from "@modelcontextprotocol/sdk/validation";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { Result, Schema } from "effect";

import type { SubmissionReviewPolicy } from "./submission-gate-policy.ts";
import {
  resultReviewScopeKey,
  type SubmissionResultReviewScope,
} from "./submission-surface-scanner.ts";
import {
  canonicalJson,
  decodeJsonText,
  decodeSubmissionResult,
  escapePointer,
  issue,
  matchesJsonObjectSchema,
} from "./submission-result-support.ts";

const resultValidators = new WeakMap<object, JsonSchemaValidator<unknown>>();

export type SubmissionResultIssue = {
  readonly code:
    | "RESULT_AUTHORIZATION_SECRET"
    | "RESULT_UNREVIEWED_IDENTIFIER"
    | "RESULT_UNREVIEWED_TIMESTAMP"
    | "RESULT_PERSONAL_DATA"
    | "RESULT_DIAGNOSTIC"
    | "RESULT_SCHEMA_MISMATCH";
  readonly tool: string;
  readonly path: string;
  readonly message: string;
};

const AUTHORIZATION_FIELD =
  /(?:password|secret|token|api[-_]?key|access[-_]?grant|authorization|bearer)/iu;
const AUTHORIZATION_VALUE =
  /(?:guest-access:|bearer\s+(?!resource_metadata=)[a-z0-9._~-]{8,})/iu;
const EMAIL_VALUE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const ISO_TIMESTAMP = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/u;
const UUID_VALUE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu;
const DIAGNOSTIC_FIELD =
  /(?:^error$|^message$|diagnostic|traceId|spanId|internalError)/u;
const OPAQUE_CREDENTIAL_VALUE =
  /(?:\bsk-[A-Za-z0-9_-]{16,}\b|\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b|-----BEGIN [A-Z ]+PRIVATE KEY-----)/u;
const INTERNAL_DIAGNOSTIC_VALUE =
  /(?:\bstack trace\b|\binternal error\b|\bat [A-Za-z_$][\w$]* \([^\n]+:\d+:\d+\))/iu;

export function inspectSubmissionResult(input: {
  readonly tool: string;
  readonly result: unknown;
  readonly policy: SubmissionReviewPolicy;
  readonly reviewScope: SubmissionResultReviewScope;
}): readonly SubmissionResultIssue[] {
  const issues: SubmissionResultIssue[] = [];
  const decodedResult = decodeSubmissionResult(input.result);
  if (Result.isFailure(decodedResult)) {
    return [
      {
        code: "RESULT_SCHEMA_MISMATCH",
        tool: input.tool,
        path: "/",
        message: decodedResult.failure.message,
      },
    ];
  }
  const result = decodedResult.success;
  const errorResult = result.isError === true;
  let schemaConformant = false;
  const schema = input.reviewScope.outputSchemas.get(input.tool);
  if (schema !== undefined && "structuredContent" in result) {
    const validator =
      resultValidators.get(schema) ??
      new AjvJsonSchemaValidator().getValidator(schema as JsonSchemaType);
    resultValidators.set(schema, validator);
    const validation = validator(result.structuredContent);
    if (!validation.valid) {
      issues.push({
        code: "RESULT_SCHEMA_MISMATCH",
        tool: input.tool,
        path: "/structuredContent",
        message: validation.errorMessage,
      });
    } else {
      schemaConformant = true;
    }
  }
  if ("structuredContent" in result) {
    inspectStructuredTextParity(
      input.tool,
      result,
      result.structuredContent,
      issues,
    );
  }
  inspectValue(
    result,
    "",
    undefined,
    input.tool,
    input.policy,
    input.reviewScope,
    errorResult,
    schemaConformant,
    issues,
  );
  return issues;
}

function inspectValue(
  value: Schema.Json,
  path: string,
  propertyName: string | undefined,
  tool: string,
  policy: SubmissionReviewPolicy,
  reviewScope: SubmissionResultReviewScope,
  errorResult: boolean,
  schemaConformant: boolean,
  issues: SubmissionResultIssue[],
): void {
  if (Array.isArray(value)) {
    inspectArray(
      value,
      path,
      propertyName,
      tool,
      policy,
      reviewScope,
      errorResult,
      schemaConformant,
      issues,
    );
    return;
  }
  if (matchesJsonObjectSchema(value)) {
    inspectObject(
      value,
      path,
      tool,
      policy,
      reviewScope,
      errorResult,
      schemaConformant,
      issues,
    );
    return;
  }
  if (typeof value !== "string") return;

  inspectStringValue({
    value,
    path,
    propertyName,
    tool,
    policy,
    reviewScope,
    errorResult,
    schemaConformant,
    issues,
  });
}

function inspectArray(
  value: Schema.JsonArray,
  path: string,
  propertyName: string | undefined,
  tool: string,
  policy: SubmissionReviewPolicy,
  reviewScope: SubmissionResultReviewScope,
  errorResult: boolean,
  schemaConformant: boolean,
  issues: SubmissionResultIssue[],
): void {
  value.forEach((entry, index) =>
    inspectValue(
      entry,
      `${path}/${index}`,
      propertyName,
      tool,
      policy,
      reviewScope,
      errorResult,
      schemaConformant,
      issues,
    ),
  );
}

function inspectObject(
  value: Schema.JsonObject,
  path: string,
  tool: string,
  policy: SubmissionReviewPolicy,
  reviewScope: SubmissionResultReviewScope,
  errorResult: boolean,
  schemaConformant: boolean,
  issues: SubmissionResultIssue[],
): void {
  for (const [name, entry] of Object.entries(value)) {
    const entryPath = `${path}/${escapePointer(name)}`;
    inspectPropertyName(
      name,
      entryPath,
      tool,
      policy,
      reviewScope,
      errorResult,
      schemaConformant,
      issues,
    );
    inspectValue(
      entry,
      entryPath,
      name,
      tool,
      policy,
      reviewScope,
      errorResult,
      schemaConformant,
      issues,
    );
  }
}

function inspectPropertyName(
  name: string,
  path: string,
  tool: string,
  policy: SubmissionReviewPolicy,
  reviewScope: SubmissionResultReviewScope,
  errorResult: boolean,
  schemaConformant: boolean,
  issues: SubmissionResultIssue[],
): void {
  if (AUTHORIZATION_FIELD.test(name)) {
    issues.push(issue("RESULT_AUTHORIZATION_SECRET", tool, path));
    return;
  }
  if (
    DIAGNOSTIC_FIELD.test(name) &&
    !isPublicErrorDiagnostic(errorResult, path) &&
    !reviewed(
      policy,
      reviewScope,
      tool,
      name,
      "modelFacingDiagnostic",
      schemaConformant,
    )
  ) {
    issues.push(issue("RESULT_DIAGNOSTIC", tool, path));
  }
}

type StringInspectionInput = {
  readonly value: string;
  readonly path: string;
  readonly propertyName: string | undefined;
  readonly tool: string;
  readonly policy: SubmissionReviewPolicy;
  readonly reviewScope: SubmissionResultReviewScope;
  readonly errorResult: boolean;
  readonly schemaConformant: boolean;
  readonly issues: SubmissionResultIssue[];
};

function inspectStringValue(input: StringInspectionInput): void {
  if (inspectParsedText(input)) return;
  inspectCredentialValue(input);
  inspectDiagnosticValue(input);
  inspectPersonalDataValue(input);
  inspectTimestampValue(input);
  inspectIdentifierValue(input);
}

function inspectParsedText(input: StringInspectionInput): boolean {
  if (input.propertyName !== "text") return false;
  const parsed = decodeJsonText(input.value);
  if (Result.isFailure(parsed)) return false;
  inspectValue(
    parsed.success,
    `${input.path}/json`,
    undefined,
    input.tool,
    input.policy,
    input.reviewScope,
    input.errorResult,
    input.schemaConformant,
    input.issues,
  );
  return true;
}

function inspectCredentialValue(input: StringInspectionInput): void {
  if (
    AUTHORIZATION_VALUE.test(input.value) ||
    OPAQUE_CREDENTIAL_VALUE.test(input.value)
  ) {
    input.issues.push(
      issue("RESULT_AUTHORIZATION_SECRET", input.tool, input.path),
    );
  }
}

function inspectDiagnosticValue(input: StringInspectionInput): void {
  if (INTERNAL_DIAGNOSTIC_VALUE.test(input.value)) {
    input.issues.push(issue("RESULT_DIAGNOSTIC", input.tool, input.path));
  }
}

function inspectPersonalDataValue(input: StringInspectionInput): void {
  if (
    EMAIL_VALUE.test(input.value) &&
    !reviewed(
      input.policy,
      input.reviewScope,
      input.tool,
      input.propertyName,
      "personalData",
      input.schemaConformant,
    )
  ) {
    input.issues.push(issue("RESULT_PERSONAL_DATA", input.tool, input.path));
  }
}

function inspectTimestampValue(input: StringInspectionInput): void {
  if (
    ISO_TIMESTAMP.test(input.value) &&
    !reviewed(
      input.policy,
      input.reviewScope,
      input.tool,
      input.propertyName,
      "userVisibleTimestamp",
      input.schemaConformant,
    )
  ) {
    input.issues.push(
      issue("RESULT_UNREVIEWED_TIMESTAMP", input.tool, input.path),
    );
  }
}

function inspectIdentifierValue(input: StringInspectionInput): void {
  if (
    UUID_VALUE.test(input.value) &&
    !reviewed(
      input.policy,
      input.reviewScope,
      input.tool,
      input.propertyName,
      "workflowCorrelationIdentifier",
      input.schemaConformant,
    ) &&
    !reviewed(
      input.policy,
      input.reviewScope,
      input.tool,
      input.propertyName,
      "authoredContentIdentifier",
      input.schemaConformant,
    )
  ) {
    input.issues.push(
      issue("RESULT_UNREVIEWED_IDENTIFIER", input.tool, input.path),
    );
  }
}

function isPublicErrorDiagnostic(errorResult: boolean, path: string): boolean {
  if (!errorResult) return false;
  return (
    /^\/content\/\d+\/text\/json\/error$/u.test(path) ||
    /^(?:\/content\/\d+\/text\/json|\/structuredContent)\/operation\/result\/details\/message$/u.test(
      path,
    )
  );
}

function reviewed(
  policy: SubmissionReviewPolicy,
  reviewScope: SubmissionResultReviewScope,
  tool: string,
  propertyName: string | undefined,
  classification: SubmissionReviewPolicy["highRiskSurfaceDecisions"][number]["classification"],
  schemaConformant: boolean,
): boolean {
  return (
    schemaConformant &&
    propertyName !== undefined &&
    reviewScope.approvals.has(
      resultReviewScopeKey(tool, propertyName, classification),
    ) &&
    policy.highRiskSurfaceDecisions.some(
      (decision) =>
        decision.directions.includes("output") &&
        decision.classification === classification &&
        decision.schemaOwners.includes(propertyName),
    )
  );
}

function inspectStructuredTextParity(
  tool: string,
  result: Schema.JsonObject,
  structuredContent: Schema.Json,
  issues: SubmissionResultIssue[],
): void {
  if (!Array.isArray(result.content)) return;
  for (const [index, content] of result.content.entries()) {
    const text = jsonTextContent(content);
    if (text === undefined) continue;
    const parsed = decodeJsonText(text);
    if (
      Result.isSuccess(parsed) &&
      canonicalJson(parsed.success) !== canonicalJson(structuredContent)
    ) {
      issues.push({
        code: "RESULT_SCHEMA_MISMATCH",
        tool,
        path: `/content/${index}/text/json`,
        message:
          "Parsed JSON text must exactly match the schema-validated structured content.",
      });
    }
  }
}

function jsonTextContent(content: Schema.Json): string | undefined {
  if (!matchesJsonObjectSchema(content)) return undefined;
  return typeof content.text === "string" ? content.text : undefined;
}
