import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  parseReviewInvocationPolicyArgs,
  reviewInvocationPolicy,
} from "./review-invocation-policy.ts";

function command(value: string) {
  return {
    type: "item.completed",
    item: {
      type: "command_execution",
      command: value,
      aggregated_output: "",
    },
  };
}

function completedRead(commandText: string, output: string) {
  return {
    type: "item.completed",
    item: {
      type: "command_execution",
      command: commandText,
      aggregated_output: output,
      exit_code: 0,
      status: "completed",
    },
  };
}

function bashRead(innerCommand: string): string {
  return `/bin/bash -lc ${JSON.stringify(innerCommand)}`;
}

describe("review invocation policy", () => {
  test("accepts a direct response", () => {
    expect(reviewInvocationPolicy([{ type: "turn.completed" }])).toEqual({
      tag: "valid",
    });
  });

  test("rejects commands and tools", () => {
    expect(
      reviewInvocationPolicy([command('/bin/bash -lc "rg -n attack ."')]),
    ).toEqual({
      tag: "invalid",
      message:
        "Reviewer invocation used a tool instead of the evidence packet.",
    });
    expect(
      reviewInvocationPolicy([
        {
          type: "item.started",
          item: { type: "command_execution", command: "rg evidence" },
        },
      ]),
    ).toMatchObject({ tag: "invalid" });
    expect(
      reviewInvocationPolicy([
        {
          type: "item.completed",
          item: { type: "mcp_tool_call", name: "unrelated" },
        },
      ]),
    ).toEqual({
      tag: "invalid",
      message:
        "Reviewer invocation used a tool instead of the evidence packet.",
    });
  });

  test("accepts strict reads while retaining the historical truncated-output contract", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-review-policy-"));
    const contextPath = resolve(root, "context.md");
    const context = "first line\nsecond line\nthird line\n";
    writeFileSync(contextPath, context);
    try {
      const result = reviewInvocationPolicy(
        [
          completedRead(
            `/bin/bash -lc 'wc -l ${contextPath}'`,
            "3 " + contextPath + "\n",
          ),
          completedRead(
            `/bin/bash -lc "sed -n '1,2p' ${contextPath}"`,
            "first line\nsecond line\n",
          ),
          completedRead(
            `/bin/bash -lc "sed -n '3,3p' ${contextPath}"`,
            "third line\n",
          ),
        ],
        {
          profile: "documentDeclarationSet",
          contextPath,
          contextByteLength: Buffer.byteLength(context),
          contextSha256: createHash("sha256").update(context).digest("hex"),
        },
      );
      expect(result).toEqual({ tag: "valid" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("accepts a document review that reads only a client-truncated context snippet", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-review-policy-"));
    const contextPath = resolve(root, "context.md");
    const context = "first line\nsecond line\nthird line\n";
    writeFileSync(contextPath, context);
    try {
      const result = reviewInvocationPolicy(
        [
          completedRead(
            `/bin/bash -lc "sed -n '1,2p' ${contextPath}"`,
            "first line\n[client truncated]",
          ),
        ],
        {
          profile: "documentDeclarationSet",
          contextPath,
          contextByteLength: Buffer.byteLength(context),
          contextSha256: createHash("sha256").update(context).digest("hex"),
        },
      );
      expect(result).toEqual({ tag: "valid" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects a document review command that reads another path", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-review-policy-"));
    const contextPath = resolve(root, "context.md");
    const packetPath = resolve(root, "packet.json");
    const context = "complete context\n";
    writeFileSync(contextPath, context);
    writeFileSync(packetPath, "packet\n");
    try {
      const result = reviewInvocationPolicy(
        [completedRead(`/bin/bash -lc 'cat ${packetPath}'`, "packet\n")],
        {
          profile: "documentDeclarationSet",
          contextPath,
          contextByteLength: Buffer.byteLength(context),
          contextSha256: createHash("sha256").update(context).digest("hex"),
        },
      );
      expect(result).toMatchObject({ tag: "invalid" });
      if (result.tag === "valid") return;
      expect(result.message).toContain("declared context authority");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("accepts adversarial literal path characters without widening authority", () => {
    const root = mkdtempSync(resolve(tmpdir(), "dnd-review-policy-"));
    const contextPath = resolve(root, "context;with apostrophe 'and spaces.md");
    const context = "historical context\n";
    writeFileSync(contextPath, context);
    try {
      const result = reviewInvocationPolicy(
        [
          completedRead(
            bashRead(`cat '${contextPath.replaceAll("'", "'\"'\"'")}'`),
            "historical context\n[client truncated]",
          ),
        ],
        {
          profile: "documentDeclarationSet",
          contextPath,
          contextByteLength: Buffer.byteLength(context),
          contextSha256: createHash("sha256").update(context).digest("hex"),
        },
      );
      expect(result).toEqual({ tag: "valid" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects unknown, duplicate, and ambiguous policy CLI options", () => {
    expect(
      Either.isLeft(
        parseReviewInvocationPolicyArgs(["events.jsonl", "--unknown", "value"]),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseReviewInvocationPolicyArgs([
          "events.jsonl",
          "--profile",
          "boundedCapabilityProjection",
          "--profile",
          "documentDeclarationSet",
        ]),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseReviewInvocationPolicyArgs([
          "events.jsonl",
          "--context-path",
          "/tmp/context.md",
        ]),
      ),
    ).toBe(true);
  });
});
