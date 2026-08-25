import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
} from "./play-session-access.ts";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const pluginRoot = join(repositoryRoot, "plugins/dnd-srd-oracle");
const generatedDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    generatedDirectories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

describe("public plugin publication package", () => {
  test("owns five positive and three negative portal review cases", async () => {
    const source = await readJson("publication/submission-source.json");
    const inventory = await readJson("evals/evaluation-inventory.json");
    if (
      !isRecord(source) ||
      !Array.isArray(source.submissionReviewCaseIds) ||
      !source.submissionReviewCaseIds.every((id) => typeof id === "string") ||
      !isRecord(inventory) ||
      !Array.isArray(inventory.submissionReview) ||
      !inventory.submissionReview.every(isRecord)
    ) {
      throw new Error("Publication source or evaluation inventory is invalid.");
    }
    const cases = new Map(
      inventory.submissionReview.map((entry) => [entry.id, entry]),
    );
    const selected = source.submissionReviewCaseIds.map((id) => cases.get(id));
    expect(new Set(source.submissionReviewCaseIds).size).toBe(
      source.submissionReviewCaseIds.length,
    );
    expect(new Set(inventory.submissionReview.map(({ id }) => id)).size).toBe(
      inventory.submissionReview.length,
    );
    expect(selected).not.toContain(undefined);
    expect(selected.filter((entry) => entry?.kind === "positive")).toHaveLength(
      5,
    );
    expect(selected.filter((entry) => entry?.kind === "negative")).toHaveLength(
      3,
    );
    for (const entry of selected) {
      expect(entry).toMatchObject({
        prompt: expect.any(String),
        fixture: expect.any(String),
        expectedBehavior: expect.any(String),
        expectedResultShape: expect.any(String),
      });
      if (entry?.kind === "negative") {
        if (typeof entry.rejectionRationale !== "string") {
          throw new Error("Negative review rationale must be a string.");
        }
        expect(entry.rejectionRationale.trim()).not.toBe("");
      }
    }
  });

  test("keeps portal retention disclosures equal to runtime tenure", async () => {
    const source = await readJson("publication/submission-source.json");
    if (!isRecord(source) || !isRecord(source.dataHandling)) {
      throw new Error("Publication data handling is invalid.");
    }
    expect(source.dataHandling).not.toHaveProperty("guestInactiveDays");
    expect(source.dataHandling).not.toHaveProperty(
      "guestPressureCleanupMinimumInactiveHours",
    );
    expect(source.dataHandling).not.toHaveProperty("savedInactiveDays");
  });

  test("prepares a production-connected package from a verified origin and identity", async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "dnd-srd-oracle-publication-"),
    );
    generatedDirectories.push(temporaryDirectory);
    const output = join(temporaryDirectory, "package");
    const release = await repositoryRelease();
    const deploymentAttestation = await writeDeploymentAttestation(
      temporaryDirectory,
      "oracle.publisher.dev",
      release,
    );
    const publicationAttestation =
      await writePublicationAttestation(temporaryDirectory);
    await execFileAsync(process.execPath, [
      join(pluginRoot, "publication/prepare-package.mjs"),
      "--deployment-attestation",
      deploymentAttestation,
      "--publication-attestation",
      publicationAttestation,
      "--registered-app-id",
      "plugin_asdk_app_publication_test",
      "--output",
      output,
    ]);

    const manifest = JSON.parse(
      await readFile(join(output, ".codex-plugin/plugin.json"), "utf8"),
    );
    expect(manifest.author.name).toBe("Verified Publisher");
    expect(manifest.mcpServers).toBeUndefined();
    expect(manifest.apps).toBe("./.app.json");
    expect(
      JSON.parse(await readFile(join(output, ".app.json"), "utf8")),
    ).toEqual({
      apps: {
        "dnd-srd-oracle": {
          id: "plugin_asdk_app_publication_test",
          category: "Lifestyle",
        },
      },
    });
    expect(manifest.interface).toMatchObject({
      developerName: "Verified Publisher",
      websiteURL: "https://oracle.publisher.dev/",
      privacyPolicyURL: "https://oracle.publisher.dev/privacy",
      termsOfServiceURL: "https://oracle.publisher.dev/terms",
    });
    expect(await readFile(join(output, "LICENSE"), "utf8")).toContain(
      "Apache License",
    );
    expect(await readFile(join(output, "NOTICE"), "utf8")).toContain(
      "5e Quint",
    );

    const submission = JSON.parse(
      await readFile(join(output, "portal-submission.json"), "utf8"),
    );
    expect(submission.deployment).toEqual({
      origin: "https://oracle.publisher.dev",
      release,
      verifiedAt: "2026-08-25T19:59:00Z",
    });
    expect(submission.listing.supportURL).toBe(
      "https://oracle.publisher.dev/support",
    );
    expect(submission.mcp.serverURL).toBe("https://oracle.publisher.dev/mcp");
    expect(submission.mcp.contentSecurityPolicy).toEqual({
      connectDomains: [],
      resourceDomains: [],
    });
    expect(submission.submissionReview).toHaveLength(8);
    expect(submission.publisherIdentity).toMatchObject({
      status: "verifiedInOpenAiPortal",
      name: "Verified Publisher",
    });
    expect(submission.reviewerAccess).toMatchObject({
      status: "provisionedInOpenAiPortal",
      mfaRequired: false,
    });
    expect(submission.domainVerification).toMatchObject({
      status: "verifiedInOpenAiPortal",
      origin: "https://oracle.publisher.dev",
    });
    expect(submission.dataHandling).toMatchObject({
      guestInactiveDays: GUEST_INACTIVITY_RETENTION_MS / DAY_MS,
      guestPressureCleanupMinimumInactiveHours:
        GUEST_PRESSURE_PROTECTION_MS / HOUR_MS,
      savedInactiveDays: SAVED_INACTIVITY_RETENTION_MS / DAY_MS,
    });
  }, 30_000);

  test("rejects a placeholder publication domain", async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "dnd-srd-oracle-publication-"),
    );
    generatedDirectories.push(temporaryDirectory);
    const output = join(temporaryDirectory, "package");
    const release = await repositoryRelease();
    const deploymentAttestation = await writeDeploymentAttestation(
      temporaryDirectory,
      "oracle.example.test",
      release,
    );
    const publicationAttestation =
      await writePublicationAttestation(temporaryDirectory);
    await expect(
      execFileAsync(process.execPath, [
        join(pluginRoot, "publication/prepare-package.mjs"),
        "--deployment-attestation",
        deploymentAttestation,
        "--publication-attestation",
        publicationAttestation,
        "--registered-app-id",
        "plugin_asdk_app_publication_test",
        "--output",
        output,
      ]),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        "deployment.origin must use a public non-placeholder hostname",
      ),
    });
  });
});

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

async function writeDeploymentAttestation(
  directory: string,
  domain: string,
  release: string,
): Promise<string> {
  const path = join(directory, "deployment-attestation.json");
  await writeFile(
    path,
    `${JSON.stringify(
      {
        status: "verifiedLiveProduction",
        environment: "production",
        origin: `https://${domain}`,
        publisherName: "Verified Publisher",
        release,
        domainChallenge: "servedExact",
        oauthDiscovery: "verified",
        publicSmoke: "passed",
        verifiedAt: "2026-08-25T19:59:00Z",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return path;
}

async function repositoryRelease(): Promise<string> {
  const { stdout } = await execFileAsync("git", [
    "-C",
    repositoryRoot,
    "rev-parse",
    "HEAD",
  ]);
  return stdout.trim();
}

async function writePublicationAttestation(directory: string): Promise<string> {
  const path = join(directory, "publication-attestation.json");
  await writeFile(
    path,
    `${JSON.stringify(
      {
        publisherIdentity: {
          status: "verifiedInOpenAiPortal",
          name: "Verified Publisher",
          verifiedAt: "2026-08-25T20:00:00Z",
          attestedBy: "synthetic-test-operator",
        },
        reviewerAccess: {
          status: "provisionedInOpenAiPortal",
          mfaRequired: false,
          attestedAt: "2026-08-25T20:01:00Z",
          attestedBy: "synthetic-test-operator",
        },
        domainVerification: {
          status: "verifiedInOpenAiPortal",
          origin: "https://oracle.publisher.dev",
          verifiedAt: "2026-08-25T20:02:00Z",
          attestedBy: "synthetic-test-operator",
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return path;
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(join(pluginRoot, relativePath), "utf8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
