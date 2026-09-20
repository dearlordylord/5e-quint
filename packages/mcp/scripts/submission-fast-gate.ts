import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Result, Schema } from "effect";

import reviewPolicyJson from "../../../plugins/dnd-srd-oracle/publication/review-policy.json" with { type: "json" };
import {
  buildAdvertisedToolDefinitions,
  buildCanonicalCodecToolDefinitions,
} from "../src/protocol-server.ts";
import { publicPublisherSiteResponse } from "../src/public-publisher-site.ts";
import { PublicMcpPublisherNameSchema } from "../src/public-service-operations.ts";
import {
  decodeSubmissionReviewPolicy,
  validateSubmissionReviewPolicy,
} from "../src/submission-gate-policy.ts";
import { scanPublicToolSurface } from "../src/submission-surface-scanner.ts";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const decodedPolicy = decodeSubmissionReviewPolicy(reviewPolicyJson);
if (Result.isFailure(decodedPolicy)) {
  process.stderr.write(
    `Invalid submission review policy: ${decodedPolicy.failure}\n`,
  );
  process.exitCode = 1;
} else {
  const publisher = Schema.decodeUnknownSync(PublicMcpPublisherNameSchema)(
    "Submission gate",
  );
  const privacyResponse = publicPublisherSiteResponse(
    "/privacy",
    "GET",
    publisher,
  );
  if (privacyResponse === undefined) {
    process.stderr.write("The privacy page is unavailable.\n");
    process.exitCode = 1;
  } else {
    const policyIssues = validateSubmissionReviewPolicy({
      policy: decodedPolicy.success,
      repositoryRoot,
      privacyHtml: await privacyResponse.text(),
    });
    const definitions = buildAdvertisedToolDefinitions(undefined, "hosted");
    const canonicalDefinitions = buildCanonicalCodecToolDefinitions(
      undefined,
      "hosted",
    );
    const surfaceIssues = scanPublicToolSurface(
      definitions,
      decodedPolicy.success,
      canonicalDefinitions,
    );
    const issues = [...policyIssues, ...surfaceIssues];
    if (issues.length > 0) {
      process.stderr.write(
        `${JSON.stringify({ tag: "submissionGateFailed", issues }, null, 2)}\n`,
      );
      process.exitCode = 1;
    } else {
      process.stdout.write(
        `${JSON.stringify({ tag: "submissionFastGatePassed", toolCount: definitions.length, disclosureCount: decodedPolicy.success.dataHandlingDisclosures.length }, null, 2)}\n`,
      );
    }
  }
}
