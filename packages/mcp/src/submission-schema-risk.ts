import { createHash } from "node:crypto";

import type { SubmissionReviewPolicy } from "./submission-gate-policy.ts";
import type { SubmissionSurfaceIssue } from "./submission-surface-scanner.ts";

export type SchemaDirection = "input" | "output";
export type ObservedRisk = {
  readonly tool: string;
  readonly direction: SchemaDirection;
  readonly path: string;
  readonly schemaOwner: string;
  readonly schemaDigest: string;
  readonly classification:
    | "workflowCorrelationIdentifier"
    | "authoredContentIdentifier"
    | "userVisibleTimestamp"
    | "modelFacingDiagnostic"
    | "personalData"
    | "unconstrainedText";
};
export type ObservedOpenNode = {
  readonly tool: string;
  readonly direction: SchemaDirection;
  readonly path: string;
  readonly schemaOwner: string;
};

type WalkSchemaInput = {
  readonly tool: string;
  readonly direction: SchemaDirection;
  readonly value: unknown;
  readonly path: string;
  readonly risks: Map<string, ObservedRisk>;
  readonly issues: SubmissionSurfaceIssue[];
  readonly openNodes: Map<string, ObservedOpenNode>;
  readonly policy: SubmissionReviewPolicy;
  readonly detectRisks: boolean;
  readonly detectOpenNodes: boolean;
};

const AUTHORIZATION_SECRET =
  /(?:password|secret|token|api[-_]?key|access[-_]?grant|authorization|bearer)$/iu;
const PERSONAL_DATA =
  /(?:email|payment|creditCard|governmentId|passport|health|medical)/iu;
const DIAGNOSTIC =
  /(?:^error$|^message$|diagnostic|traceId|spanId|internalError)/u;
const TIMESTAMP = /(?:timestamp|createdAt|updatedAt|expiresAt|lastActivityAt)/u;
const IDENTIFIER = /(?:^id$|Id$|Ids$|Ref$|Path$|Key$)/u;

export function walkSubmissionSchema(input: WalkSchemaInput): void {
  if (Array.isArray(input.value)) {
    walkSchemaArray(input, input.value);
    return;
  }
  if (!isJsonObject(input.value)) return;

  const properties = isJsonObject(input.value.properties)
    ? input.value.properties
    : undefined;
  inspectOpenNode(input, input.value, properties);
  if (properties !== undefined) {
    inspectProperties(input, input.value, properties);
  }
  walkSchemaCompositions(input, input.value);
}

function walkSchemaArray(input: WalkSchemaInput, value: readonly unknown[]) {
  value.forEach((entry, index) =>
    walkSubmissionSchema({
      ...input,
      value: entry,
      path: `${input.path}/${index}`,
    }),
  );
}

function walkSchemaCompositions(
  input: WalkSchemaInput,
  value: Readonly<Record<string, unknown>>,
): void {
  for (const keyword of ["anyOf", "oneOf", "allOf", "items"] as const) {
    if (value[keyword] !== undefined) {
      walkSubmissionSchema({
        ...input,
        value: value[keyword],
        path: `${input.path}/${keyword}`,
      });
    }
  }
  if (isJsonObject(value.$defs)) {
    for (const [definitionName, definition] of Object.entries(value.$defs)) {
      walkSubmissionSchema({
        ...input,
        value: definition,
        path: `${input.path}/$defs/${escapePointer(definitionName)}`,
      });
    }
  }
}

function inspectOpenNode(
  input: WalkSchemaInput,
  value: Readonly<Record<string, unknown>>,
  properties: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!input.detectOpenNodes || !isOpenObjectSchema(value, properties)) return;
  const owner = schemaOwnerAt(input.path);
  const openPath = input.path || "/";
  const openKey = `${input.tool}:${input.direction}:${openPath}`;
  const firstObservation = !input.openNodes.has(openKey);
  input.openNodes.set(openKey, {
    tool: input.tool,
    direction: input.direction,
    path: openPath,
    schemaOwner: owner,
  });
  if (
    firstObservation &&
    !input.policy.opaqueNodeDecisions.some(
      (decision) =>
        decision.directions.includes(input.direction) &&
        decision.schemaOwners.includes(owner),
    )
  ) {
    input.issues.push({
      code: "OPEN_SCHEMA_NODE",
      tool: input.tool,
      direction: input.direction,
      path: openPath,
      message:
        "An object schema is opaque or open and needs a canonical owner or representative-result review.",
    });
  }
}

function inspectProperties(
  input: WalkSchemaInput,
  containingSchema: Readonly<Record<string, unknown>>,
  properties: Readonly<Record<string, unknown>>,
): void {
  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    const propertyPath = `${input.path}/properties/${escapePointer(propertyName)}`;
    inspectPropertyRisk(
      input,
      containingSchema,
      propertyName,
      propertySchema,
      propertyPath,
    );
    walkSubmissionSchema({
      ...input,
      value: propertySchema,
      path: propertyPath,
    });
  }
}

function inspectPropertyRisk(
  input: WalkSchemaInput,
  containingSchema: Readonly<Record<string, unknown>>,
  propertyName: string,
  propertySchema: unknown,
  propertyPath: string,
): void {
  if (!input.detectRisks) return;
  if (isAuthorizationSecretProperty(propertyName, containingSchema)) {
    input.issues.push({
      code: "MODEL_VISIBLE_AUTHORIZATION_SECRET",
      tool: input.tool,
      direction: input.direction,
      path: propertyPath,
      message: "Authorization secrets are forbidden in model-visible schemas.",
    });
    return;
  }
  const classification = classifyRisk(propertyName, propertySchema);
  if (classification === undefined) return;
  const risk = {
    tool: input.tool,
    direction: input.direction,
    path: propertyPath,
    schemaOwner: propertyName,
    schemaDigest: stableDigest(propertySchema),
    classification,
  } as const;
  input.risks.set(riskKey(risk), risk);
}

function isOpenObjectSchema(
  value: Readonly<Record<string, unknown>>,
  properties: Readonly<Record<string, unknown>> | undefined,
): boolean {
  return (
    value.type === "object" &&
    properties === undefined &&
    value.$ref === undefined &&
    value.anyOf === undefined &&
    value.oneOf === undefined &&
    value.allOf === undefined
  );
}

function isAuthorizationSecretProperty(
  propertyName: string,
  containingSchema: Readonly<Record<string, unknown>>,
): boolean {
  if (!AUTHORIZATION_SECRET.test(propertyName)) return false;
  if (propertyName !== "password") return true;
  const properties = isJsonObject(containingSchema.properties)
    ? containingSchema.properties
    : undefined;
  const kind = properties?.kind;
  return !(
    isJsonObject(kind) &&
    Array.isArray(kind.enum) &&
    kind.enum.length === 1 &&
    kind.enum[0] === "lock_object"
  );
}

function classifyRisk(
  propertyName: string,
  schema: unknown,
): ObservedRisk["classification"] | undefined {
  for (const classifier of RISK_CLASSIFIERS) {
    const classification = classifier(propertyName, schema);
    if (classification !== undefined) return classification;
  }
  return undefined;
}

type RiskClassifier = (
  propertyName: string,
  schema: unknown,
) => ObservedRisk["classification"] | undefined;

const RISK_CLASSIFIERS: readonly RiskClassifier[] = [
  (name) => (PERSONAL_DATA.test(name) ? "personalData" : undefined),
  (name) => (DIAGNOSTIC.test(name) ? "modelFacingDiagnostic" : undefined),
  (name, schema) =>
    TIMESTAMP.test(name) ||
    (isJsonObject(schema) && schema.format === "date-time")
      ? "userVisibleTimestamp"
      : undefined,
  (name) => {
    if (!IDENTIFIER.test(name)) return undefined;
    return /(?:unit|feature|option|class|species|background|equipment|spell|trait)/iu.test(
      name,
    )
      ? "authoredContentIdentifier"
      : "workflowCorrelationIdentifier";
  },
  (_name, schema) =>
    isUnconstrainedText(schema) ? "unconstrainedText" : undefined,
];

function isUnconstrainedText(schema: unknown): boolean {
  return (
    isJsonObject(schema) &&
    schema.type === "string" &&
    schema.const === undefined &&
    schema.enum === undefined &&
    schema.pattern === undefined &&
    schema.maxLength === undefined
  );
}

function schemaOwnerAt(path: string): string {
  const propertyMatches = Array.from(path.matchAll(/\/properties\/([^/]+)/gu));
  const propertyName = propertyMatches.at(-1)?.[1];
  return propertyName === undefined ? "$root" : unescapePointer(propertyName);
}

function riskKey(input: {
  readonly tool: string;
  readonly direction: string;
  readonly path: string;
  readonly classification: string;
}): string {
  return `${input.tool}:${input.direction}:${input.path}:${input.classification}`;
}

export function observationDigest(
  observations: readonly (ObservedRisk | ObservedOpenNode)[],
): string {
  return stableDigest(
    observations
      .map((observation) => ({
        tool: observation.tool,
        direction: observation.direction,
        path: observation.path,
        schemaOwner: observation.schemaOwner,
        ...("classification" in observation
          ? {
              classification: observation.classification,
              schemaDigest: observation.schemaDigest,
            }
          : {}),
      }))
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      ),
  );
}

function stableDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isJsonObject(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function unescapePointer(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
