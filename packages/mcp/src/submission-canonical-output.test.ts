import { expect, test } from "vitest";
import { chatGptExecutionToolDefinitions } from "./chatgpt/tool-surface.ts";
import {
  buildReviewToolDefinitions,
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
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";
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
  const reviewed = buildReviewToolDefinitions(
    operations,
    "hosted",
    "chatgpt",
  ).filter((definition) => names.has(definition.name));
  const advertised = buildAdvertisedToolDefinitions(
    operations,
    "hosted",
    "chatgpt",
  );
  expect(
    advertised.every((definition) => definition.outputSchema === undefined),
  ).toBe(true);
  expect(
    reviewed.every((definition) => definition.outputSchema !== undefined),
  ).toBe(true);
  const regularAdvertised = buildAdvertisedToolDefinitions(
    operations,
    "hosted",
    "regular",
  );
  const regularReviewed = buildReviewToolDefinitions(
    operations,
    "hosted",
    "regular",
  );
  expect(
    regularAdvertised.every(
      (definition) => definition.outputSchema === undefined,
    ),
  ).toBe(true);
  expect(
    regularReviewed.every(
      (definition) => definition.outputSchema !== undefined,
    ),
  ).toBe(true);
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
  const provideDefinitions = chatGptExecutionToolDefinitions.filter(
    (definition) => definition.name === "provide_battle_input",
  );
  const fill = {
    kind: "attackRoll",
    holeId: "battle:attack:roll",
    value: { total: 15, d20TestRoll: { tag: "single", naturalD20: 10 } },
  };
  const playSessionId = "play-session:00000000-0000-4000-8000-000000000901";
  const incomplete = {
    playSessionId,
    fill: { kind: fill.kind, holeId: fill.holeId },
  };
  for (const provide of [
    buildCanonicalToolDefinitions(provideDefinitions, "hosted", "chatgpt"),
    buildReviewToolDefinitions(provideDefinitions, "hosted", "chatgpt"),
  ].map((definitions) =>
    definitions.find(
      (definition) => definition.name === "provide_battle_input",
    ),
  )) {
    if (provide === undefined)
      throw new Error("Expected full reviewed Battle input");
    expect(provide.inputSchema.required).toEqual(
      expect.arrayContaining(["playSessionId", "fill"]),
    );
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(provide.inputSchema, "full reviewed Battle input"),
    );
    expect(validate({ playSessionId, fill }).valid).toBe(true);
    expect(validate({ fill }).valid).toBe(false);
    expect(validate(incomplete).valid).toBe(false);
  }
  const publicProvide = buildAdvertisedToolDefinitions(
    provideDefinitions,
    "hosted",
    "chatgpt",
  ).find((definition) => definition.name === "provide_battle_input");
  if (publicProvide === undefined)
    throw new Error("Expected requested Battle input envelope");
  const validatePublic = createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(
      publicProvide.inputSchema,
      "requested Battle input envelope",
    ),
  );
  expect(validatePublic(incomplete).valid).toBe(true);
  expect(validatePublic({ fill }).valid).toBe(false);
  const openNodes = new Map<string, ObservedOpenNode>();
  for (const definition of reviewed) {
    if (definition.outputSchema === undefined)
      throw new Error("Expected reviewed protocol output");
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
    scanPublicToolSurface(reviewed, policy, definitions).filter(
      (issue) =>
        issue.code === "OPEN_SCHEMA_NODE" &&
        relevant.has(`${issue.tool}\0${issue.path}`),
    );
  expect(ownershipIssues(canonical)).toEqual([]);
  expect(ownershipIssues(codecs)).not.toEqual([]);
});
