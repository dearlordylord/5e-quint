import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { mcpAcceptanceScenarioIds } from "../test-support/mcp-acceptance-scenarios.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
const evalRoot = resolve(repoRoot, "plugins/srd-play/evals");

const CapabilityRowSchema = Schema.Struct({
  id: Schema.String,
  issue: Schema.Number,
  mcpSurface: Schema.NonEmptyArray(Schema.String),
  modelVisibleProjection: Schema.NonEmptyArray(Schema.String),
  headlessEvidence: Schema.Literal("complete-newcomer-journey"),
  externalBehaviorEvidence: Schema.Struct({
    status: Schema.Literal("unavailable"),
    caseIds: Schema.NonEmptyArray(Schema.String),
  }),
  boundary: Schema.String,
});
const CapabilityMatrixSchema = Schema.Struct({
  schema: Schema.Literal("dnd.srd-play.capability-matrix.v1"),
  status: Schema.Literal("frozen"),
  owner: Schema.Literal("plugins/srd-play/evals"),
  headlessJourney: Schema.Struct({
    scenarioId: Schema.Literal("complete-newcomer-journey"),
    testPath: Schema.Literal(
      "packages/mcp/src/plugin-newcomer-journey.test.ts",
    ),
    supportPath: Schema.Literal(
      "packages/mcp/test-support/mcp-acceptance-scenarios.ts",
    ),
  }),
  externalEvidence: Schema.Struct({
    artifactPath: Schema.Literal(
      "plugins/srd-play/evals/installed-chatgpt-evidence.json",
    ),
    status: Schema.Literal("unavailable"),
    reason: Schema.String,
  }),
  rows: Schema.NonEmptyArray(CapabilityRowSchema),
});
type CapabilityMatrix = typeof CapabilityMatrixSchema.Type;

const InstalledEvidenceSchema = Schema.Struct({
  schema: Schema.Literal("dnd.srd-play.installed-chatgpt-evidence.v1"),
  status: Schema.Literal("unavailable"),
  recordedAt: Schema.String,
  scope: Schema.String,
  environment: Schema.Struct({
    developerMode: Schema.Literal("not-observed"),
    mcpConnection: Schema.Literal("not-observed"),
    installedPlugin: Schema.Literal("not-observed"),
    skillActivation: Schema.Literal("not-observed"),
    completeJourney: Schema.Literal("not-observed"),
  }),
  reason: Schema.String,
  promptOwner: Schema.Literal(
    "plugins/srd-play/evals/evaluation-inventory.json",
  ),
  capabilityMatrix: Schema.Literal(
    "plugins/srd-play/evals/capability-matrix.json",
  ),
  officialGuidance: Schema.Literal(
    "https://developers.openai.com/plugins/deploy/connect-chatgpt",
  ),
  operatorProtocol: Schema.NonEmptyArray(
    Schema.Struct({
      step: Schema.String,
      evidenceKind: Schema.String,
      instructions: Schema.String,
      requiredCases: Schema.NonEmptyArray(Schema.String),
    }),
  ),
  observations: Schema.Array(Schema.Unknown),
});
type InstalledEvidence = typeof InstalledEvidenceSchema.Type;

describe("SRD Play evaluation artifacts", () => {
  test("keeps one frozen capability matrix for every parent leaf", () => {
    const matrix: CapabilityMatrix = decodeJson(
      CapabilityMatrixSchema,
      "capability-matrix.json",
    );
    const issueNumbers = matrix.rows.map((row) => row.issue);
    expect(issueNumbers).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 316),
    );
    expect(new Set(matrix.rows.map((row) => row.id)).size).toBe(
      matrix.rows.length,
    );
    expect(existsSync(resolve(repoRoot, matrix.headlessJourney.testPath))).toBe(
      true,
    );
    expect(mcpAcceptanceScenarioIds()).toContain(
      matrix.headlessJourney.scenarioId,
    );
    expect(
      existsSync(resolve(repoRoot, matrix.headlessJourney.supportPath)),
    ).toBe(true);
    expect(
      existsSync(resolve(repoRoot, matrix.externalEvidence.artifactPath)),
    ).toBe(true);
    for (const row of matrix.rows) {
      expect(row.boundary.trim(), row.id).not.toBe("");
      expect(row.mcpSurface.length, row.id).toBeGreaterThan(0);
      expect(row.modelVisibleProjection.length, row.id).toBeGreaterThan(0);
      expect(row.externalBehaviorEvidence.status, row.id).toBe("unavailable");
    }
  });

  test("keeps installed ChatGPT evidence separately statused and non-fabricated", () => {
    const evidence: InstalledEvidence = decodeJson(
      InstalledEvidenceSchema,
      "installed-chatgpt-evidence.json",
    );
    expect(evidence.status).toBe("unavailable");
    expect(evidence.observations).toEqual([]);
    expect(evidence.operatorProtocol.map(({ step }) => step)).toEqual([
      "mcp-connection",
      "complete-plugin",
      "newcomer-journey",
    ]);
  });

  test("maps every frozen surface to an advertised MCP tool", async () => {
    const matrix: CapabilityMatrix = decodeJson(
      CapabilityMatrixSchema,
      "capability-matrix.json",
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "srd-play-capability-matrix-check",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const advertised = new Set(
        (await client.listTools()).tools.map(({ name }) => name),
      );
      for (const row of matrix.rows) {
        for (const toolName of row.mcpSurface) {
          expect(advertised.has(toolName), `${row.id}: ${toolName}`).toBe(true);
        }
      }
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});

function decodeJson<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  name: string,
) {
  return Schema.decodeUnknownSync(schema)(
    JSON.parse(readFileSync(resolve(evalRoot, name), "utf8")),
  );
}
