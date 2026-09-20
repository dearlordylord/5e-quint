import type { ProtocolToolDefinition } from "./tool-definition-contract.ts";
import type { SubmissionReviewPolicy } from "./submission-gate-policy.ts";
import {
  observationDigest,
  type ObservedOpenNode,
  type ObservedRisk,
  walkSubmissionSchema,
} from "./submission-schema-risk.ts";

export type SubmissionSurfaceIssue = {
  readonly code:
    | "MODEL_VISIBLE_AUTHORIZATION_SECRET"
    | "UNREVIEWED_HIGH_RISK_FIELD"
    | "STALE_HIGH_RISK_DECISION"
    | "OPEN_SCHEMA_NODE"
    | "INVALID_TOOL_METADATA";
  readonly tool: string;
  readonly direction: "input" | "output" | "metadata";
  readonly path: string;
  readonly message: string;
};

export type SubmissionResultReviewScope = {
  readonly approvals: ReadonlySet<string>;
  readonly outputSchemas: ReadonlyMap<
    string,
    Readonly<Record<string, unknown>>
  >;
};

const canonicalResolvedOwnerPathsCache = new WeakMap<
  object,
  ReadonlySet<string>
>();

export function scanPublicToolSurface(
  definitions: readonly ProtocolToolDefinition[],
  policy: SubmissionReviewPolicy,
  canonicalDefinitions: readonly ProtocolToolDefinition[] = definitions,
): readonly SubmissionSurfaceIssue[] {
  const issues: SubmissionSurfaceIssue[] = [];
  const risks = new Map<string, ObservedRisk>();
  const openNodes = new Map<string, ObservedOpenNode>();
  issues.push(...metadataIssues(definitions));
  observeDefinitions(
    canonicalDefinitions,
    false,
    policy,
    risks,
    openNodes,
    issues,
  );
  observeDefinitions(definitions, true, policy, risks, openNodes, issues);
  issues.push(
    ...canonicalOpenNodeIssues(openNodes, policy, canonicalDefinitions),
  );
  issues.push(...unreviewedRiskIssues(risks, policy));
  issues.push(...riskDecisionIssues(risks, policy));
  issues.push(...opaqueDecisionIssues(openNodes, policy));
  return issues;
}

function observeDefinitions(
  definitions: readonly ProtocolToolDefinition[],
  detectOpenNodes: boolean,
  policy: SubmissionReviewPolicy,
  risks: Map<string, ObservedRisk>,
  openNodes: Map<string, ObservedOpenNode>,
  issues: SubmissionSurfaceIssue[],
): void {
  for (const definition of definitions) {
    for (const [direction, schema] of [
      ["input", definition.inputSchema],
      ["output", definition.outputSchema],
    ] as const) {
      if (schema === undefined) continue;
      walkSubmissionSchema({
        tool: definition.name,
        direction,
        value: schema,
        path: "",
        risks,
        issues,
        openNodes,
        policy,
        detectRisks: true,
        detectOpenNodes,
      });
    }
  }
}

function metadataIssues(
  definitions: readonly ProtocolToolDefinition[],
): readonly SubmissionSurfaceIssue[] {
  const issues: SubmissionSurfaceIssue[] = [];
  const names = new Set<string>();
  const titles = new Set<string>();
  for (const definition of definitions) {
    if (names.has(definition.name))
      issues.push(metadataIssue(definition.name, "Duplicate tool name."));
    if (titles.has(definition.title))
      issues.push(metadataIssue(definition.name, "Duplicate tool title."));
    names.add(definition.name);
    titles.add(definition.title);
    issues.push(...definitionMetadataIssues(definition));
  }
  return issues;
}

function definitionMetadataIssues(
  definition: ProtocolToolDefinition,
): readonly SubmissionSurfaceIssue[] {
  const issues: SubmissionSurfaceIssue[] = [];
  if (definition.title.trim() === "" || definition.description.trim() === "")
    issues.push(
      metadataIssue(
        definition.name,
        "Tool title and description are required.",
      ),
    );
  if (
    /(?:codec|registry|discriminated union|implementation detail)/iu.test(
      definition.description,
    )
  )
    issues.push(
      metadataIssue(
        definition.name,
        "Tool descriptions must not expose unexplained implementation vocabulary.",
      ),
    );
  return issues;
}

function canonicalOpenNodeIssues(
  openNodes: ReadonlyMap<string, ObservedOpenNode>,
  policy: SubmissionReviewPolicy,
  definitions: readonly ProtocolToolDefinition[],
): readonly SubmissionSurfaceIssue[] {
  return Array.from(openNodes.values()).flatMap((node) => {
    const decision = policy.opaqueNodeDecisions.find(
      (candidate) =>
        candidate.directions.includes(node.direction) &&
        candidate.schemaOwners.includes(node.schemaOwner),
    );
    return decision?.evidence === "canonicalCodec" &&
      !canonicalNodeResolves(node, definitions)
      ? [
          {
            code: "OPEN_SCHEMA_NODE" as const,
            tool: node.tool,
            direction: node.direction,
            path: node.path,
            message:
              "The opaque advertised node has no corresponding canonical schema owner.",
          },
        ]
      : [];
  });
}

function unreviewedRiskIssues(
  risks: ReadonlyMap<string, ObservedRisk>,
  policy: SubmissionReviewPolicy,
): readonly SubmissionSurfaceIssue[] {
  return Array.from(risks.values()).flatMap((risk) =>
    policy.highRiskSurfaceDecisions.some(
      (decision) =>
        decision.directions.includes(risk.direction) &&
        decision.schemaOwners.includes(risk.schemaOwner) &&
        decision.classification === risk.classification,
    )
      ? []
      : [
          {
            code: "UNREVIEWED_HIGH_RISK_FIELD" as const,
            ...risk,
            message: `The ${risk.classification} field has no matching review decision.`,
          },
        ],
  );
}

function riskDecisionIssues(
  risks: ReadonlyMap<string, ObservedRisk>,
  policy: SubmissionReviewPolicy,
): readonly SubmissionSurfaceIssue[] {
  return policy.highRiskSurfaceDecisions.flatMap((decision) => {
    const observations = Array.from(risks.values()).filter(
      (risk) =>
        decision.directions.includes(risk.direction) &&
        decision.schemaOwners.includes(risk.schemaOwner) &&
        risk.classification === decision.classification,
    );
    const missing = decision.schemaOwners
      .filter(
        (owner) => !observations.some((risk) => risk.schemaOwner === owner),
      )
      .map((owner) => ({
        code: "STALE_HIGH_RISK_DECISION" as const,
        tool: "shared-schema",
        direction: decision.directions[0] ?? "input",
        path: `/schemaOwners/${escapePointer(owner)}`,
        message:
          "The review decision no longer matches an observed high-risk field.",
      }));
    const digest = observationDigest(observations);
    return observations.length > 0 && digest !== decision.scopeDigest
      ? [
          ...missing,
          {
            code: "STALE_HIGH_RISK_DECISION" as const,
            tool: "review-policy",
            direction: decision.directions[0] ?? "input",
            path: `/scopeDigest/${decision.classification}`,
            message: `The exact tool/path scope of this high-risk decision changed after review. Expected ${digest}.`,
          },
        ]
      : missing;
  });
}

function opaqueDecisionIssues(
  openNodes: ReadonlyMap<string, ObservedOpenNode>,
  policy: SubmissionReviewPolicy,
): readonly SubmissionSurfaceIssue[] {
  return policy.opaqueNodeDecisions.flatMap((decision) => {
    const observations = Array.from(openNodes.values()).filter(
      (node) =>
        decision.directions.includes(node.direction) &&
        decision.schemaOwners.includes(node.schemaOwner),
    );
    const missing = decision.schemaOwners
      .filter(
        (owner) => !observations.some((node) => node.schemaOwner === owner),
      )
      .map((owner) => ({
        code: "STALE_HIGH_RISK_DECISION" as const,
        tool: "shared-schema",
        direction: decision.directions[0] ?? "input",
        path: `/schemaOwners/${owner}/openObject`,
        message:
          "The opaque-node decision no longer matches an observed open node.",
      }));
    const digest = observationDigest(observations);
    return observations.length > 0 && digest !== decision.scopeDigest
      ? [
          ...missing,
          {
            code: "STALE_HIGH_RISK_DECISION" as const,
            tool: "review-policy",
            direction: decision.directions[0] ?? "input",
            path: "/opaqueNodeDecisions/scopeDigest",
            message: `The exact tool/path scope of this opaque-node decision changed after review. Expected ${digest}.`,
          },
        ]
      : missing;
  });
}

export function submissionResultReviewScope(
  canonicalDefinitions: readonly ProtocolToolDefinition[],
  policy: SubmissionReviewPolicy,
  reviewDefinitions: readonly ProtocolToolDefinition[] = canonicalDefinitions,
): SubmissionResultReviewScope {
  const risks = new Map<string, ObservedRisk>();
  const issues: SubmissionSurfaceIssue[] = [];
  const openNodes = new Map<string, ObservedOpenNode>();
  for (const definition of reviewDefinitions) {
    for (const [direction, schema] of [
      ["input", definition.inputSchema],
      ["output", definition.outputSchema],
    ] as const) {
      if (schema === undefined) continue;
      walkSubmissionSchema({
        tool: definition.name,
        direction,
        value: schema,
        path: "",
        risks,
        issues,
        openNodes,
        policy,
        detectRisks: true,
        detectOpenNodes: false,
      });
    }
  }
  return {
    approvals: new Set(
      Array.from(risks.values()).flatMap((risk) =>
        risk.direction === "output" &&
        policy.highRiskSurfaceDecisions.some(
          (decision) =>
            decision.directions.includes("output") &&
            decision.schemaOwners.includes(risk.schemaOwner) &&
            decision.classification === risk.classification,
        )
          ? [
              resultReviewScopeKey(
                risk.tool,
                risk.schemaOwner,
                risk.classification,
              ),
            ]
          : [],
      ),
    ),
    outputSchemas: new Map(
      canonicalDefinitions.flatMap((definition) =>
        definition.outputSchema === undefined
          ? []
          : [[definition.name, definition.outputSchema] as const],
      ),
    ),
  };
}

export function resultReviewScopeKey(
  tool: string,
  schemaOwner: string,
  classification: ObservedRisk["classification"],
): string {
  return `${tool}\u0000${schemaOwner}\u0000${classification}`;
}

function canonicalNodeResolves(
  node: ObservedOpenNode,
  definitions: readonly ProtocolToolDefinition[],
): boolean {
  const definition = definitions.find(
    (candidate) => candidate.name === node.tool,
  );
  if (definition === undefined) return false;
  const schema =
    node.direction === "input"
      ? definition.inputSchema
      : definition.outputSchema;
  if (schema === undefined) return false;
  return canonicalResolvedOwnerPaths(schema).has(schemaOwnerPathAt(node.path));
}

function canonicalResolvedOwnerPaths(
  schema: Readonly<Record<string, unknown>>,
): ReadonlySet<string> {
  const cached = canonicalResolvedOwnerPathsCache.get(schema);
  if (cached !== undefined) return cached;
  const paths = new Set<string>();
  collectResolvedOwnerPaths(schema, "", paths);
  canonicalResolvedOwnerPathsCache.set(schema, paths);
  return paths;
}

function collectResolvedOwnerPaths(
  value: unknown,
  path: string,
  paths: Set<string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectResolvedOwnerPaths(entry, `${path}/${index}`, paths),
    );
    return;
  }
  if (!isJsonObject(value)) return;
  if (isResolvedCanonicalOwner(value)) paths.add(schemaOwnerPathAt(path));
  for (const [key, entry] of Object.entries(value)) {
    collectResolvedOwnerPaths(entry, `${path}/${escapePointer(key)}`, paths);
  }
}

function schemaOwnerPathAt(path: string): string {
  return Array.from(path.matchAll(/\/properties\/([^/]+)/gu))
    .map((match) => unescapePointer(match[1] ?? ""))
    .slice(-2)
    .join("/");
}

function metadataIssue(tool: string, message: string): SubmissionSurfaceIssue {
  return {
    code: "INVALID_TOOL_METADATA",
    tool,
    direction: "metadata",
    path: "/",
    message,
  };
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

function isResolvedCanonicalOwner(value: unknown): boolean {
  return (
    isJsonObject(value) &&
    !(
      value.type === "object" &&
      !isJsonObject(value.properties) &&
      value.$ref === undefined &&
      value.anyOf === undefined &&
      value.oneOf === undefined &&
      value.allOf === undefined
    )
  );
}
