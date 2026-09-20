import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result, Schema } from "effect";
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
import {
  evaluationInventory,
  forwardTestResultsJson,
  normalizeResult,
  selectedSubmissionReviewCases,
  sha256,
  skillSource,
  validateLocalSkillEvaluationBinding,
} from "./submission-candidate-static.ts";
import { decodeSubmissionReviewPolicy } from "./submission-gate-policy.ts";
import { inspectSubmissionResult } from "./submission-result-inspector.ts";
import { submissionResultReviewScope } from "./submission-surface-scanner.ts";

export {
  canonicalJson,
  selectedSubmissionReviewCaseIdentities,
  sha256,
  validateLocalSkillEvaluationBinding,
  validateSubmissionReviewCaseSelection,
} from "./submission-candidate-static.ts";
export type { SubmissionReviewCaseIdentity } from "./submission-candidate-static.ts";

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

function validateLocalSkillEvaluation(): void {
  validateLocalSkillEvaluationBinding({
    evidence: forwardTestResultsJson,
    skillActivationInventory: evaluationInventory.skillActivation,
    skillSource,
  });
}
