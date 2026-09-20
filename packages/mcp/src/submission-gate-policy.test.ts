import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Result } from "effect";
import { describe, expect, test } from "vitest";

import reviewPolicyJson from "../../../plugins/dnd-srd-oracle/publication/review-policy.json" with { type: "json" };
import {
  decodeSubmissionReviewPolicy,
  expectedDisclosureEvidence,
  validateSubmissionReviewPolicy,
} from "./submission-gate-policy.ts";
import { publicPublisherSiteResponse } from "./public-publisher-site.ts";
import { DEFAULT_PUBLIC_MCP_PUBLISHER_NAME } from "./public-service-operations.ts";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const privacyResponse = publicPublisherSiteResponse(
  "/privacy",
  "GET",
  DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
);
if (privacyResponse === undefined) throw new Error("Missing privacy page.");
const privacyHtml = await privacyResponse.text();

describe("submission review policy", () => {
  test("binds every disclosure to the reviewed implementation inventory", () => {
    const policy = decodePolicy(reviewPolicyJson);
    expect(
      validateSubmissionReviewPolicy({
        policy,
        repositoryRoot,
        privacyHtml,
      }),
    ).toEqual([]);
  });

  test.each(["playSessionStorage", "hostingAndIngressAccessLogs"] as const)(
    "invalidates stale %s implementation evidence",
    (category) => {
      const policy = decodePolicy(reviewPolicyJson);
      const changed = {
        ...policy,
        dataHandlingDisclosures: policy.dataHandlingDisclosures.map(
          (disclosure) =>
            disclosure.category !== category
              ? disclosure
              : {
                  ...disclosure,
                  implementationEvidence:
                    disclosure.implementationEvidence.tag ===
                    "canonicalInventory"
                      ? {
                          tag: "canonicalInventory" as const,
                          digest: "0".repeat(64),
                        }
                      : {
                          ...disclosure.implementationEvidence,
                          sourceDigest: "0".repeat(64),
                        },
                },
        ),
      };

      expect(
        validateSubmissionReviewPolicy({
          policy: changed,
          repositoryRoot,
          privacyHtml,
        }),
      ).toContainEqual(
        expect.objectContaining({
          code: "STALE_DISCLOSURE_EVIDENCE",
          location: category,
        }),
      );
    },
  );

  test("rejects disclosure anchors whose reviewed privacy facts are empty", () => {
    const policy = decodePolicy(reviewPolicyJson);
    const emptySections = policy.dataHandlingDisclosures
      .map(
        (disclosure) => `<section id="${disclosure.privacyAnchor}"></section>`,
      )
      .join("");
    const issues = validateSubmissionReviewPolicy({
      policy,
      repositoryRoot,
      privacyHtml: emptySections,
    });
    expect(
      issues.filter((issue) => issue.code === "MISSING_PRIVACY_DISCLOSURE"),
    ).toHaveLength(policy.dataHandlingDisclosures.length * 5);
  });

  test("binds rate-limit evidence to its retention-window authority", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "dnd-disclosure-"));
    try {
      for (const path of [
        "packages/mcp/src/play-session-repository.ts",
        "packages/mcp/src/sqlite-play-session-repository.ts",
        "packages/mcp/src/sqlite-play-session-actions.ts",
        "packages/mcp/src/play-session-access.ts",
      ]) {
        await mkdir(dirname(resolve(temporaryRoot, path)), { recursive: true });
        await cp(resolve(repositoryRoot, path), resolve(temporaryRoot, path), {
          recursive: true,
        });
      }
      const before = expectedDisclosureEvidence(
        "rateLimitAndCapacityState",
        "packages/mcp/src/play-session-repository.ts",
        temporaryRoot,
      );
      await writeFile(
        resolve(temporaryRoot, "packages/mcp/src/play-session-access.ts"),
        "export const RATE_LIMIT_WINDOW_MS = 120_000;\n",
      );
      const after = expectedDisclosureEvidence(
        "rateLimitAndCapacityState",
        "packages/mcp/src/play-session-repository.ts",
        temporaryRoot,
      );
      expect(after).not.toEqual(before);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});

function decodePolicy(value: unknown) {
  const decoded = decodeSubmissionReviewPolicy(value);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure);
  return decoded.success;
}
