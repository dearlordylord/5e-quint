import { expect, test } from "vitest";
import { chatGptExecutionToolDefinitions } from "./chatgpt/tool-surface.ts";
import {
  buildAdvertisedToolDefinitions,
  buildCanonicalToolDefinitions,
  buildCanonicalCodecToolDefinitions,
} from "./protocol-server.ts";
import {
  walkSubmissionSchema,
  type ObservedOpenNode,
  type ObservedRisk,
} from "./submission-schema-risk.ts";
import { scanPublicToolSurface } from "./submission-surface-scanner.ts";
import type { SubmissionReviewPolicy } from "./submission-gate-policy.ts";

const policy: SubmissionReviewPolicy = {
  version: 1,
  highRiskSurfaceDecisions: [],
  dataHandlingDisclosures: [],
  opaqueNodeDecisions: [
    {
      schemaOwners: ["occurrence", "allocatedDamageDice"],
      directions: ["output"],
      evidence: "canonicalCodec",
      owner: "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
      scopeDigest: "0".repeat(64),
    },
  ],
};

test("roots the full execution codecs in protocol outputs before model projection", () => {
  const names = new Set(["read_play_session", "roll_dice", "start_battle"]);
  const operations = chatGptExecutionToolDefinitions.filter((definition) =>
    names.has(definition.name),
  );
  const advertised = buildAdvertisedToolDefinitions(
    operations,
    "hosted",
    "chatgpt",
  ).filter((definition) => names.has(definition.name));
  const canonical = buildCanonicalToolDefinitions(
    operations,
    "hosted",
    "chatgpt",
  ).filter((definition) => names.has(definition.name));
  const codecs = buildCanonicalCodecToolDefinitions(
    operations,
    "hosted",
    "chatgpt",
  ).filter((definition) => names.has(definition.name));
  const openNodes = new Map<string, ObservedOpenNode>();
  for (const definition of advertised) {
    if (definition.outputSchema === undefined)
      throw new Error("Expected advertised protocol output");
    walkSubmissionSchema({
      tool: definition.name,
      direction: "output",
      value: definition.outputSchema,
      path: "",
      risks: new Map<string, ObservedRisk>(),
      openNodes,
      issues: [],
      policy,
      detectRisks: false,
      detectOpenNodes: true,
    });
  }
  const requests = [...openNodes.values()].filter(
    (node) =>
      node.schemaOwner === "occurrence" ||
      node.schemaOwner === "allocatedDamageDice",
  );
  expect(requests.some((node) => node.schemaOwner === "occurrence")).toBe(true);
  expect(
    requests.some((node) => node.schemaOwner === "allocatedDamageDice"),
  ).toBe(true);
  const relevant = new Set(
    requests.map((node) => `${node.tool}\0${node.path}`),
  );
  const ownershipIssues = (definitions: typeof canonical) =>
    scanPublicToolSurface(advertised, policy, definitions).filter(
      (issue) =>
        issue.code === "OPEN_SCHEMA_NODE" &&
        relevant.has(`${issue.tool}\0${issue.path}`),
    );
  expect(ownershipIssues(canonical)).toEqual([]);
  expect(ownershipIssues(codecs)).not.toEqual([]);
});
