import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result } from "effect";
import { submissionBattleRepresentativeResults } from "../test-support/cross-boundary-battle.ts";

import reviewPolicyJson from "../../../plugins/dnd-srd-oracle/publication/review-policy.json" with { type: "json" };
import { decodeDiceSeed } from "./dice-sampling-service.ts";
import { decodePlaySessionId } from "./play-session.ts";
import { decodePrincipalId } from "./play-session-access.ts";
import {
  buildAdvertisedToolDefinitions,
  buildCanonicalToolDefinitions,
  createDndMcpProtocolServer,
} from "./protocol-server.ts";
import { publicPublisherSiteResponse } from "./public-publisher-site.ts";
import {
  DEFAULT_PUBLIC_MCP_OPERATOR_DATA_HANDLING,
  type PublicMcpOperatorDataHandling,
} from "./public-operator-data-handling.ts";
import {
  PublicMcpPublisherNameSchema,
  type PublicMcpPublisherName,
} from "./public-service-operations.ts";
import { Schema } from "effect";
import { decodeSubmissionReviewPolicy } from "./submission-gate-policy.ts";
import { inspectSubmissionResult } from "./submission-result-inspector.ts";
import { submissionResultReviewScope } from "./submission-surface-scanner.ts";

const evaluationInventoryJson: unknown = JSON.parse(
  readFileSync(
    new URL(
      "../../../plugins/dnd-srd-oracle/evals/evaluation-inventory.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const forwardTestResultsJson: unknown = JSON.parse(
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
const evaluationInventory = decodeStaticJson(
  EvaluationInventorySchema,
  evaluationInventoryJson,
  "evaluation inventory",
);
const submissionSource = decodeStaticJson(
  SubmissionSourceSchema,
  submissionSourceJson,
  "submission source",
);
const matchesJsonObjectSchema = Schema.is(Schema.JsonObject);
const skillSource = {
  files: [
    "../../../plugins/dnd-srd-oracle/skills/dnd-srd-oracle/SKILL.md",
    "../../../plugins/dnd-srd-oracle/skills/dnd-srd-oracle/agents/openai.yaml",
  ].map((path) => ({
    path: path.replace("../../../plugins/dnd-srd-oracle/", ""),
    content: readFileSync(new URL(path, import.meta.url), "utf8"),
  })),
};

export type SubmissionCandidateEvidence = {
  readonly schema: "dnd.srd-oracle.submission-candidate.v2";
  readonly release: string;
  readonly publisherName: string;
  readonly fingerprint: string;
  readonly components: {
    readonly publicMcpContract: string;
    readonly privacy: string;
    readonly terms: string;
    readonly reviewPolicy: string;
    readonly behaviorResults: string;
    readonly skillSource: string;
    readonly localSkillEvaluation: string;
    readonly submissionCaseInventory: string;
  };
  readonly localSkillEvaluationStatus: "passed";
  readonly generatedAt: string;
};

export async function buildSubmissionCandidateEvidence(input: {
  readonly release: string;
  readonly publisherName: string;
  readonly generatedAt: string;
  readonly operatorDataHandling?: PublicMcpOperatorDataHandling;
}): Promise<SubmissionCandidateEvidence> {
  const observed = await observeLocalCandidate();
  const publisher = Schema.decodeUnknownSync(PublicMcpPublisherNameSchema)(
    input.publisherName,
  );
  const privacy = await requiredPage(
    "/privacy",
    publisher,
    input.operatorDataHandling ?? DEFAULT_PUBLIC_MCP_OPERATOR_DATA_HANDLING,
  );
  const terms = await requiredPage("/terms", publisher);
  const submissionCases = selectedSubmissionReviewCases();
  validateLocalSkillEvaluation();
  const components = {
    publicMcpContract: sha256(observed.contract),
    privacy: sha256(privacy),
    terms: sha256(terms),
    reviewPolicy: sha256(reviewPolicyJson),
    behaviorResults: sha256(observed.behaviorResults),
    skillSource: sha256(skillSource),
    localSkillEvaluation: sha256(forwardTestResultsJson),
    submissionCaseInventory: sha256(submissionCases),
  } as const;
  const localSkillEvaluationStatus = "passed" as const;
  return {
    schema: "dnd.srd-oracle.submission-candidate.v2",
    release: input.release,
    publisherName: publisher,
    fingerprint: sha256({
      release: input.release,
      publisherName: publisher,
      components,
      localSkillEvaluationStatus,
    }),
    components,
    localSkillEvaluationStatus,
    generatedAt: input.generatedAt,
  };
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

async function observeLocalCandidate(): Promise<{
  readonly contract: unknown;
  readonly behaviorResults: unknown;
}> {
  const playSessionId = decodePlaySessionId(
    "play-session:00000000-0000-4000-8000-000000000901",
  );
  const diceSeed = decodeDiceSeed([
    "00000001",
    "00000002",
    "00000003",
    "00000004",
  ]);
  const principalId = decodePrincipalId("submission-candidate-principal");
  if (
    Result.isFailure(playSessionId) ||
    Result.isFailure(diceSeed) ||
    Result.isFailure(principalId)
  ) {
    throw new Error("Submission candidate fixtures are invalid.");
  }
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const { server } = createDndMcpProtocolServer(undefined, undefined, {
    playSessionIdFactory: () => playSessionId.success,
    playSessionDiceSeedFactory: () => diceSeed.success,
    requestIdentity: {
      tag: "authenticated",
      principalId: principalId.success,
    },
  });
  const client = new Client({
    name: "submission-candidate-observer",
    version: "0.1.0",
  });
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const tools = await client.listTools();
    const catalog = await client.callTool({
      name: "list_catalog_units",
      arguments: {},
    });
    const statBlocks = await client.callTool({
      name: "list_stat_blocks",
      arguments: {},
    });
    const created = await client.callTool({
      name: "create_play_session",
      arguments: {},
    });
    const listed = await client.callTool({
      name: "list_saved_play_sessions",
      arguments: {},
    });
    const draftCreated = await client.callTool({
      name: "create_character_draft",
      arguments: { playSessionId: playSessionId.success },
    });
    const rolled = await client.callTool({
      name: "roll_dice",
      arguments: {
        playSessionId: playSessionId.success,
        groups: [{ dice: 2, dieSize: 6 }],
      },
    });
    const rejected = await client.callTool({
      name: "roll_dice",
      arguments: { playSessionId: playSessionId.success, groups: [] },
    });
    const resumed = await client.callTool({
      name: "read_play_session",
      arguments: { playSessionId: playSessionId.success },
    });
    const deleted = await client.callTool({
      name: "delete_saved_play_session",
      arguments: { playSessionId: playSessionId.success },
    });
    const authorizationRejected = await observeHostedAnonymousDenial();
    const battleResults = await submissionBattleRepresentativeResults();
    const policy = decodeSubmissionReviewPolicy(reviewPolicyJson);
    if (Result.isFailure(policy)) {
      throw new Error(`Invalid submission review policy: ${policy.failure}`);
    }
    const reviewScope = submissionResultReviewScope(
      buildCanonicalToolDefinitions(undefined, "hosted"),
      policy.success,
      buildAdvertisedToolDefinitions(undefined, "hosted"),
    );
    const resultIssues = [
      ["list_catalog_units", catalog],
      ["list_stat_blocks", statBlocks],
      ["create_play_session", created],
      ["list_saved_play_sessions", listed],
      ["create_character_draft", draftCreated],
      ["roll_dice", rolled],
      ["roll_dice", rejected],
      ["read_play_session", resumed],
      ["delete_saved_play_session", deleted],
      ["create_play_session", authorizationRejected],
      ...battleResults.map(({ tool, result }) => [tool, result]),
    ].flatMap(([tool, result]) =>
      inspectSubmissionResult({
        tool: tool as string,
        result,
        policy: policy.success,
        reviewScope,
      }),
    );
    if (resultIssues.length > 0) {
      throw new Error(
        `Representative submission results exposed high-risk data: ${JSON.stringify(resultIssues)}`,
      );
    }
    return {
      contract: {
        serverVersion: client.getServerVersion(),
        instructions: client.getInstructions(),
        tools: tools.tools,
      },
      behaviorResults: normalizeResult({
        catalog,
        statBlocks,
        created,
        listed,
        draftCreated,
        rolled,
        rejected,
        resumed,
        deleted,
        authorizationRejected,
        battleResults: battleResults.map(({ evidence }) => evidence),
      }),
    };
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}

async function observeHostedAnonymousDenial(): Promise<unknown> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const { server } = createDndMcpProtocolServer(undefined, undefined, {
    requestIdentity: {
      tag: "hostedAnonymous",
      authentication: {
        tag: "oauth",
        resourceMetadataUrl:
          "https://oracle.invalid/.well-known/oauth-protected-resource",
      },
    },
  });
  const client = new Client({
    name: "submission-anonymous-boundary-observer",
    version: "0.1.0",
  });
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return await client.callTool({
      name: "create_play_session",
      arguments: {},
    });
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}

async function requiredPage(
  path: "/privacy" | "/terms",
  publisher: PublicMcpPublisherName,
  operatorDataHandling: PublicMcpOperatorDataHandling = DEFAULT_PUBLIC_MCP_OPERATOR_DATA_HANDLING,
): Promise<string> {
  const response = publicPublisherSiteResponse(
    path,
    "GET",
    publisher,
    operatorDataHandling,
  );
  if (response === undefined)
    throw new Error(`Missing publisher page: ${path}`);
  return response.text();
}

export type SubmissionReviewCaseIdentity = {
  readonly id: string;
  readonly kind: "positive" | "negative";
};

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

function selectedSubmissionReviewCases(): readonly (typeof SubmissionReviewCaseSchema.Type)[] {
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

function validateLocalSkillEvaluation(): void {
  validateLocalSkillEvaluationBinding({
    evidence: forwardTestResultsJson,
    skillActivationInventory: evaluationInventory.skillActivation,
    skillSource,
  });
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

function normalizeResult(value: unknown): unknown {
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
