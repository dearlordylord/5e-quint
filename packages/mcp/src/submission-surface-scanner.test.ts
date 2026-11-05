import { describe, expect, test } from "vitest";

import type { McpObjectInputSchema } from "./schema-codec.ts";
import type { SubmissionReviewPolicy } from "./submission-gate-policy.ts";
import { scanPublicToolSurface } from "./submission-surface-scanner.ts";
import type { ProtocolToolDefinition } from "./tool-definition-contract.ts";

const emptyPolicy: SubmissionReviewPolicy = {
  version: 1,
  highRiskSurfaceDecisions: [],
  opaqueNodeDecisions: [],
  dataHandlingDisclosures: [],
};

describe("submission surface scanner", () => {
  test.each(["guestAccessGrant", "authorizationToken"])(
    "rejects model-visible authorization secret %s without a waiver path",
    (propertyName) => {
      const issues = scanPublicToolSurface(
        [toolWithInputProperty(propertyName, { type: "string" })],
        emptyPolicy,
      );
      expect(issues).toContainEqual(
        expect.objectContaining({ code: "MODEL_VISIBLE_AUTHORIZATION_SECRET" }),
      );
    },
  );

  test("rejects the former caller request identifier until narrowly reviewed", () => {
    const issues = scanPublicToolSurface(
      [toolWithInputProperty("requestId", { type: "string", format: "uuid" })],
      emptyPolicy,
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "UNREVIEWED_HIGH_RISK_FIELD",
        path: "/properties/requestId",
      }),
    );
  });

  test("does not require a policy row for a low-risk fictional mechanic", () => {
    expect(
      scanPublicToolSurface(
        [toolWithInputProperty("armorClass", { type: "integer", minimum: 0 })],
        emptyPolicy,
      ),
    ).toEqual([]);
  });

  test("rejects open object nodes unless their evidence is explicit", () => {
    const definition = toolWithInputProperty("choice", { type: "object" });
    expect(scanPublicToolSurface([definition], emptyPolicy)).toContainEqual(
      expect.objectContaining({ code: "OPEN_SCHEMA_NODE" }),
    );
    const reviewedPolicy: SubmissionReviewPolicy = {
      ...emptyPolicy,
      opaqueNodeDecisions: [
        {
          schemaOwners: ["choice"],
          directions: ["input"],
          evidence: "canonicalCodec",
          owner: "Synthetic choice codec",
          scopeDigest:
            "ff2ed428e9334b3939aca355e94a51d95ded6070fd4b855cf6a5c8f91bba2a41",
        },
      ],
    };
    const canonicalDefinition = toolWithInputProperty("choice", {
      type: "object",
      properties: { selected: { type: "string", enum: ["synthetic"] } },
      required: ["selected"],
      additionalProperties: false,
    });
    expect(
      scanPublicToolSurface([definition], reviewedPolicy, [
        canonicalDefinition,
      ]),
    ).toEqual([]);
    expect(
      scanPublicToolSurface([definition], reviewedPolicy, [definition]),
    ).toContainEqual(expect.objectContaining({ code: "OPEN_SCHEMA_NODE" }));
    const schemaShapedData = {
      type: "object",
      properties: { selected: { type: "string", enum: ["synthetic"] } },
    };
    for (const literalAnnotation of [
      { const: schemaShapedData },
      { examples: [schemaShapedData] },
    ]) {
      const canonicalWithLiteralData = toolWithInputProperty("choice", {
        type: "object",
        ...literalAnnotation,
      });
      expect(
        scanPublicToolSurface([definition], reviewedPolicy, [
          canonicalWithLiteralData,
        ]),
      ).toContainEqual(
        expect.objectContaining({
          code: "OPEN_SCHEMA_NODE",
          message:
            "The opaque advertised node has no corresponding canonical schema owner.",
        }),
      );
    }
  });

  test("rejects authorization secrets nested behind a referenced definition", () => {
    const base = toolWithInputProperty("result", {
      $ref: "#/$defs/Leak",
    });
    const definition = {
      ...base,
      inputSchema: {
        ...base.inputSchema,
        $defs: {
          Leak: {
            type: "object",
            properties: { guestAccessGrant: { type: "string" } },
          },
        },
      },
    };

    expect(scanPublicToolSurface([definition], emptyPolicy)).toContainEqual(
      expect.objectContaining({
        code: "MODEL_VISIBLE_AUTHORIZATION_SECRET",
        path: "/$defs/Leak/properties/guestAccessGrant",
      }),
    );
  });

  test("retains rooted field ownership when the advertised model merges object variants", () => {
    const advertised = toolWithInputProperty("request", {
      type: "object",
      properties: { occurrence: { type: "object" } },
    });
    const branch = (occurrence: Readonly<Record<string, unknown>>) => ({
      type: "object",
      properties: { occurrence },
    });
    const canonical = (second: Readonly<Record<string, unknown>>) =>
      toolWithInputProperty("request", {
        anyOf: [
          branch(closedOccurrence),
          branch(second),
          {
            type: "object",
            properties: { unrelated: { type: "integer" } },
            additionalProperties: false,
          },
        ],
      });
    expect(ownershipIssues(advertised, canonical(closedOccurrence))).toEqual(
      [],
    );
    expect(
      ownershipIssues(advertised, canonical({ type: "object" })),
    ).not.toEqual([]);
    expect(
      ownershipIssues(
        advertised,
        toolWithInputProperty("request", { not: branch(closedOccurrence) }),
      ),
    ).not.toEqual([]);
    expect(
      ownershipIssues(
        advertised,
        toolWithInputProperty("request", {
          anyOf: [branch(closedOccurrence), {}],
        }),
      ),
    ).not.toEqual([]);
  });

  test("requires closed object keys in every canonical alternative", () => {
    const advertised = toolWithInputProperty("request", {
      type: "object",
      properties: { occurrence: { type: "object" } },
    });
    for (const extra of [
      {},
      { additionalProperties: true },
      { additionalProperties: {} },
    ]) {
      const open = {
        type: "object",
        properties: { amount: { type: "integer" } },
        ...extra,
      };
      expect(
        ownershipIssues(
          advertised,
          toolWithInputProperty("request", {
            type: "object",
            properties: { occurrence: open },
          }),
        ),
      ).not.toEqual([]);
      expect(
        ownershipIssues(
          advertised,
          toolWithInputProperty("request", {
            type: "object",
            properties: { occurrence: { anyOf: [closedOccurrence, open] } },
          }),
        ),
      ).not.toEqual([]);
    }
    for (const occurrence of [
      { type: "object", additionalProperties: false },
      {
        allOf: [
          closedOccurrence,
          { type: "object", properties: { amount: { minimum: 0 } } },
        ],
      },
    ]) {
      expect(
        ownershipIssues(
          advertised,
          toolWithInputProperty("request", {
            type: "object",
            properties: { occurrence },
          }),
        ),
      ).toEqual([]);
    }
  });

  test("does not use a different outer type or unknown schema as closed object proof", () => {
    const advertised = toolWithInputProperty("request", {
      type: "object",
      properties: { occurrence: { type: "object" } },
    });
    for (const occurrence of [
      { type: "integer" },
      { const: "synthetic-scalar", additionalProperties: false },
      { enum: ["synthetic-scalar"], additionalProperties: false },
      {},
      { anyOf: [closedOccurrence, {}] },
    ]) {
      expect(
        ownershipIssues(
          advertised,
          toolWithInputProperty("request", {
            type: "object",
            properties: { occurrence },
          }),
        ),
      ).not.toEqual([]);
    }
  });

  test("requires routed output proof at the same root and direction", () => {
    const output = (
      occurrence: Readonly<Record<string, unknown>>,
    ): McpObjectInputSchema => ({
      type: "object",
      properties: {
        operation: {
          type: "object",
          properties: {
            result: { type: "object", properties: { occurrence } },
          },
        },
      },
    });
    const advertised = {
      ...ownershipTool({ type: "object", properties: {} }),
      outputSchema: output({ type: "object" }),
    };
    const policy: SubmissionReviewPolicy = {
      ...emptyPolicy,
      opaqueNodeDecisions: [
        {
          schemaOwners: ["occurrence"],
          directions: ["output"],
          evidence: "canonicalCodec",
          owner: "Synthetic routed codec",
          scopeDigest: "0".repeat(64),
        },
      ],
    };
    const issues = (canonical: ProtocolToolDefinition) =>
      scanPublicToolSurface([advertised], policy, [canonical]).filter(
        (issue) => issue.code === "OPEN_SCHEMA_NODE",
      );
    expect(
      issues({ ...advertised, outputSchema: output(closedOccurrence) }),
    ).toEqual([]);
    expect(
      issues({
        ...advertised,
        outputSchema: {
          type: "object",
          properties: { occurrence: closedOccurrence },
        },
      }),
    ).not.toEqual([]);
    expect(
      issues({ ...advertised, inputSchema: output(closedOccurrence) }),
    ).not.toEqual([]);
    expect(
      issues({
        ...advertised,
        name: "another_tool",
        outputSchema: output(closedOccurrence),
      }),
    ).not.toEqual([]);
  });

  test("resolves a hoisted advertised owner at its rooted callsite", () => {
    const advertised = ownershipTool({
      type: "object",
      properties: { request: { $ref: "#/$defs/Request" } },
      $defs: {
        Request: {
          type: "object",
          properties: { occurrence: { type: "object" } },
        },
      },
    });
    const canonical = ownershipTool({
      type: "object",
      properties: {
        request: {
          type: "object",
          properties: { occurrence: closedOccurrence },
        },
      },
    });
    expect(ownershipIssues(advertised, canonical)).toEqual([]);
  });

  test.each([false, true])(
    "rejects unrelated or unreachable same-suffix proof (unreachable=%s)",
    (unreachable) => {
      const advertised = ownershipTool({
        type: "object",
        properties: {
          approved: {
            type: "object",
            properties: {
              request: {
                type: "object",
                properties: { occurrence: { type: "object" } },
              },
            },
          },
        },
      });
      const unrelated = {
        type: "object",
        properties: {
          request: {
            type: "object",
            properties: { occurrence: closedOccurrence },
          },
        },
      };
      const canonical = ownershipTool(
        unreachable
          ? { ...advertised.inputSchema, $defs: { Unused: unrelated } }
          : { type: "object", properties: { unrelated } },
      );
      expect(ownershipIssues(advertised, canonical)).not.toEqual([]);
    },
  );

  test("requires every rooted use of a shared alias to have canonical proof", () => {
    const advertised = ownershipTool({
      type: "object",
      properties: {
        first: { $ref: "#/$defs/Alias" },
        second: { $ref: "#/$defs/Alias" },
      },
      $defs: {
        Alias: { $ref: "#/$defs/Request" },
        Request: {
          type: "object",
          properties: { occurrence: { type: "object" } },
        },
      },
    });
    const branch = {
      type: "object",
      properties: { occurrence: closedOccurrence },
    };
    expect(
      ownershipIssues(
        advertised,
        ownershipTool({
          type: "object",
          properties: { first: branch, second: branch },
        }),
      ),
    ).toEqual([]);
    expect(
      ownershipIssues(
        advertised,
        ownershipTool({
          type: "object",
          properties: {
            first: branch,
            second: {
              type: "object",
              properties: { occurrence: { type: "object" } },
            },
          },
        }),
      ),
    ).not.toEqual([]);
  });

  test("terminates rooted recursion in both documents without dropping the owner", () => {
    const recursive = (occurrence: Readonly<Record<string, unknown>>) =>
      ownershipTool({
        type: "object",
        properties: { occurrence, nested: { $ref: "#" } },
        additionalProperties: false,
      });
    expect(
      ownershipIssues(
        recursive({ type: "object" }),
        recursive(closedOccurrence),
      ),
    ).toEqual([]);
  });

  test("does not turn a broken or reference-only cyclic canonical alias into proof", () => {
    const advertised = toolWithInputProperty("request", {
      type: "object",
      properties: { occurrence: { type: "object" } },
    });
    for (const reference of [
      "#/$defs/Missing",
      "#/$defs/Cycle",
      "https://schema.invalid/unknown",
    ]) {
      const canonical = ownershipTool({
        type: "object",
        properties: { request: { $ref: reference } },
        $defs: { Cycle: { $ref: "#/$defs/Cycle" } },
      });
      expect(ownershipIssues(advertised, canonical)).not.toEqual([]);
    }
  });

  test("retains canonical ownership through recursive local references", () => {
    const advertised = toolWithInputProperty("request", {
      type: "object",
      properties: { occurrence: { type: "object" } },
    });
    const policy: SubmissionReviewPolicy = {
      ...emptyPolicy,
      opaqueNodeDecisions: [
        {
          schemaOwners: ["occurrence"],
          directions: ["input"],
          evidence: "canonicalCodec",
          owner: "Synthetic occurrence codec",
          scopeDigest: "0".repeat(64),
        },
      ],
    };
    const canonical: ProtocolToolDefinition = {
      ...advertised,
      inputSchema: {
        type: "object",
        properties: { request: { $ref: "#/$defs/Request" } },
        $defs: {
          Request: {
            type: "object",
            properties: {
              occurrence: { $ref: "#/$defs/Occurrence" },
              nested: { $ref: "#/$defs/Request" },
            },
          },
          Occurrence: {
            type: "object",
            properties: { amount: { type: "integer" } },
            additionalProperties: false,
          },
        },
      },
    };
    expect(
      scanPublicToolSurface([advertised], policy, [canonical]).filter(
        (issue) => issue.code === "OPEN_SCHEMA_NODE",
      ),
    ).toEqual([]);
    expect(
      scanPublicToolSurface([advertised], policy, [
        toolWithInputProperty("unrelated", {
          type: "object",
          properties: { occurrence: { type: "integer" } },
        }),
      ]),
    ).toContainEqual(
      expect.objectContaining({
        code: "OPEN_SCHEMA_NODE",
        path: "/properties/request/properties/occurrence",
      }),
    );
  });

  test("rejects authorization secrets present only in the complete canonical schema", () => {
    const advertised = toolWithInputProperty("result", { type: "object" });
    const canonical = {
      ...advertised,
      inputSchema: {
        ...advertised.inputSchema,
        $defs: {
          HiddenBranch: {
            type: "object",
            properties: { clientSecret: { type: "string" } },
          },
        },
      },
    };
    expect(
      scanPublicToolSurface([advertised], emptyPolicy, [canonical]),
    ).toContainEqual(
      expect.objectContaining({
        code: "MODEL_VISIBLE_AUTHORIZATION_SECRET",
        path: "/$defs/HiddenBranch/properties/clientSecret",
      }),
    );
  });

  test("requires review for non-secret risk present only in the complete canonical schema", () => {
    const advertised = toolWithInputProperty("result", { type: "object" });
    const canonical = {
      ...advertised,
      inputSchema: {
        ...advertised.inputSchema,
        $defs: {
          HiddenBranch: {
            type: "object",
            properties: { accountId: { type: "string" } },
          },
        },
      },
    };
    expect(
      scanPublicToolSurface([advertised], emptyPolicy, [canonical]),
    ).toContainEqual(
      expect.objectContaining({
        code: "UNREVIEWED_HIGH_RISK_FIELD",
        path: "/$defs/HiddenBranch/properties/accountId",
        classification: "workflowCorrelationIdentifier",
      }),
    );
  });

  test.each([
    { type: "string", enum: ["lock_object"] },
    { const: "lock_object" },
  ])(
    "does not confuse a fictional lock phrase with an authorization password (%j)",
    (kind) => {
      const issues = scanPublicToolSurface(
        [
          toolWithInputProperty("effect", {
            type: "object",
            properties: {
              kind,
              password: { type: "string" },
            },
          }),
        ],
        emptyPolicy,
      );
      expect(issues).not.toContainEqual(
        expect.objectContaining({ code: "MODEL_VISIBLE_AUTHORIZATION_SECRET" }),
      );
    },
  );

  test.each([
    {
      schema: {
        type: "array",
        prefixItems: [
          { type: "object", properties: { accessToken: { type: "string" } } },
        ],
      },
      path: "/prefixItems/0/properties/accessToken",
    },
    {
      schema: {
        type: "array",
        items: [
          { type: "object", properties: { accessToken: { type: "string" } } },
        ],
      },
      path: "/items/0/properties/accessToken",
    },
    {
      schema: {
        then: {
          type: "object",
          properties: { accessToken: { type: "string" } },
        },
      },
      path: "/then/properties/accessToken",
    },
    {
      schema: {
        dependentSchemas: {
          "synthetic/flag": {
            type: "object",
            properties: { accessToken: { type: "string" } },
          },
        },
      },
      path: "/dependentSchemas/synthetic~1flag/properties/accessToken",
    },
    {
      schema: {
        additionalProperties: {
          type: "object",
          properties: { accessToken: { type: "string" } },
        },
      },
      path: "/additionalProperties/properties/accessToken",
    },
  ])("rejects a secret inside schema position $path", ({ schema, path }) => {
    expect(
      scanPublicToolSurface(
        [toolWithInputProperty("payload", schema)],
        emptyPolicy,
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: "MODEL_VISIBLE_AUTHORIZATION_SECRET",
        path: `/properties/payload${path}`,
      }),
    );
  });

  test("does not traverse literal instance data as a schema", () => {
    const schemaShapedData = {
      type: "object",
      properties: { accessToken: { type: "string" } },
    };
    expect(
      scanPublicToolSurface(
        [
          toolWithInputProperty("payload", {
            const: schemaShapedData,
            examples: [schemaShapedData],
          }),
        ],
        emptyPolicy,
      ),
    ).toEqual([]);
  });

  test("invalidates a decision when a same-named field appears on another tool", () => {
    const original = toolWithInputProperty("requestId", {
      type: "string",
      format: "uuid",
    });
    const unresolvedPolicy: SubmissionReviewPolicy = {
      ...emptyPolicy,
      highRiskSurfaceDecisions: [
        {
          schemaOwners: ["requestId"],
          directions: ["input"],
          classification: "workflowCorrelationIdentifier",
          userGoal: "Correlate a synthetic workflow request.",
          recipients: ["synthetic test recipient"],
          retentionOwner: "synthetic test owner",
          privacyAnchor: "synthetic-test",
          scopeDigest: "0".repeat(64),
        },
      ],
    };
    const scopeIssue = scanPublicToolSurface([original], unresolvedPolicy).find(
      (issue) => issue.path === "/scopeDigest/workflowCorrelationIdentifier",
    );
    const reviewedDigest = scopeIssue?.message.match(/[0-9a-f]{64}/u)?.[0];
    if (reviewedDigest === undefined) throw new Error("Missing scope digest.");
    const reviewedPolicy = {
      ...unresolvedPolicy,
      highRiskSurfaceDecisions: [
        {
          ...unresolvedPolicy.highRiskSurfaceDecisions[0]!,
          scopeDigest: reviewedDigest,
        },
      ],
    };
    expect(scanPublicToolSurface([original], reviewedPolicy)).toEqual([]);

    const second = {
      ...original,
      name: "second_test_tool",
      title: "Second test tool",
    };
    expect(
      scanPublicToolSurface([original, second], reviewedPolicy),
    ).toContainEqual(
      expect.objectContaining({
        code: "STALE_HIGH_RISK_DECISION",
        path: "/scopeDigest/workflowCorrelationIdentifier",
      }),
    );
  });
});

function toolWithInputProperty(
  propertyName: string,
  schema: Readonly<Record<string, unknown>>,
): ProtocolToolDefinition {
  return {
    name: "test_tool",
    title: "Test tool",
    description: "Exercise a synthetic scanner fixture.",
    inputSchema: {
      type: "object",
      properties: { [propertyName]: schema },
      required: [propertyName],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  };
}

const closedOccurrence = {
  type: "object",
  properties: { amount: { type: "integer" } },
  required: ["amount"],
  additionalProperties: false,
};
function ownershipTool(
  inputSchema: Readonly<Record<string, unknown>>,
): ProtocolToolDefinition {
  return {
    ...toolWithInputProperty("request", {}),
    inputSchema: { ...inputSchema, type: "object" },
  };
}
function ownershipIssues(
  advertised: ProtocolToolDefinition,
  canonical: ProtocolToolDefinition,
) {
  return scanPublicToolSurface(
    [advertised],
    {
      ...emptyPolicy,
      opaqueNodeDecisions: [
        {
          schemaOwners: ["occurrence"],
          directions: ["input"],
          evidence: "canonicalCodec",
          owner: "Synthetic closed occurrence",
          scopeDigest: "0".repeat(64),
        },
      ],
    },
    [canonical],
  ).filter((issue) => issue.code === "OPEN_SCHEMA_NODE");
}
