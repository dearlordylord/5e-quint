import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
} from "./play-session-access.ts";

const execFileAsync = promisify(execFile);
const sourceRepositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const repositoryRoot = await mkdtemp(join(tmpdir(), "dnd-publication-source-"));
const pluginRoot = join(repositoryRoot, "plugins/dnd-srd-oracle");
const generatedDirectories: string[] = [];

beforeAll(async () => {
  for (const path of [
    "plugins/dnd-srd-oracle",
    "packages/mcp/src/oauth-scopes.ts",
    "packages/mcp/src/public-play-session-policy.json",
    "LICENSE",
    "NOTICE",
  ]) {
    await mkdir(dirname(join(repositoryRoot, path)), { recursive: true });
    await cp(join(sourceRepositoryRoot, path), join(repositoryRoot, path), {
      recursive: true,
    });
  }
  await execFileAsync("git", ["init", repositoryRoot]);
  await execFileAsync("git", ["-C", repositoryRoot, "add", "."]);
  await execFileAsync("git", [
    "-C",
    repositoryRoot,
    "-c",
    "user.name=Publication fixture",
    "-c",
    "user.email=fixture@example.test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Publication fixture",
  ]);
});

afterAll(() => rm(repositoryRoot, { recursive: true, force: true }));

afterEach(async () => {
  await Promise.all(
    generatedDirectories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

describe("public plugin publication package", () => {
  test.each([
    "play-sessions",
    "openid play-sessions",
    "openid email play-sessions admin",
    "openid email play-sessions offline_access",
  ])("rejects portal scopes %s before packaging", async (oauthScopes) => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-scope-rejection-"));
    generatedDirectories.push(directory);
    const deployment = await writeDeploymentAttestation(
      directory,
      "oracle.publisher.dev",
      await repositoryRelease(),
    );
    const publication = await writePublicationAttestation(
      directory,
      oauthScopes,
    );
    await expect(
      execFileAsync(process.execPath, [
        join(pluginRoot, "publication/prepare-package.mjs"),
        "--deployment-attestation",
        deployment,
        "--publication-attestation",
        publication,
        "--output",
        join(directory, "package"),
      ]),
    ).rejects.toThrow("reviewerAccess.oauthScopes");
  });

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

  test("prepares a production-connected package with the exact reviewer scopes", async () => {
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
    const publicationAttestation = await writePublicationAttestation(
      temporaryDirectory,
      "openid email play-sessions",
    );
    const prepared = await execFileAsync(process.execPath, [
      join(pluginRoot, "publication/prepare-package.mjs"),
      "--deployment-attestation",
      deploymentAttestation,
      "--publication-attestation",
      publicationAttestation,
      "--output",
      output,
    ]);
    const preparationResult = JSON.parse(prepared.stdout);
    expect(preparationResult).toEqual({
      outputDirectory: output,
      packageDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    const observedDigest = await execFileAsync(process.execPath, [
      join(pluginRoot, "publication/package-digest.mjs"),
      output,
    ]);
    expect(observedDigest.stdout.trim()).toBe(preparationResult.packageDigest);

    const manifest = JSON.parse(
      await readFile(join(output, ".codex-plugin/plugin.json"), "utf8"),
    );
    expect(manifest.author.name).toBe("Verified Publisher");
    expect(manifest.mcpServers).toBeUndefined();
    expect(manifest.apps).toBeUndefined();
    await expect(readFile(join(output, ".app.json"), "utf8")).rejects.toThrow(
      "ENOENT",
    );
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
    expect(submission).not.toHaveProperty("registeredAppId");
    expect(submission.deployment).toEqual({
      origin: "https://oracle.publisher.dev",
      release,
      candidateFingerprint: "f".repeat(64),
      verifiedAt: "2026-08-25T19:59:00Z",
    });
    expect(submission.listing.supportURL).toBe(
      "https://oracle.publisher.dev/support",
    );
    expect(submission.mcp.serverURL).toBe("https://oracle.publisher.dev/mcp");
    expect(submission.mcp.oauthScopes).toBe("openid email play-sessions");
    expect(submission.mcp.contentSecurityPolicy).toEqual({
      connectDomains: [],
      resourceDomains: [],
    });
    expect(submission.starterPrompts).toEqual([
      "Show me the SRD character options I can use.",
      "Help me create an SRD character in a saved Play Session.",
      "Start a rules-backed battle with my character.",
    ]);
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
    expect(submission).not.toHaveProperty("submissionGate");
    expect(submission.submissionPreparation).toHaveProperty(
      "requirementsReview",
    );
    expect(submission.dataHandling).toMatchObject({
      guestInactiveDays: GUEST_INACTIVITY_RETENTION_MS / DAY_MS,
      guestPressureCleanupMinimumInactiveHours:
        GUEST_PRESSURE_PROTECTION_MS / HOUR_MS,
      savedInactiveDays: SAVED_INACTIVITY_RETENTION_MS / DAY_MS,
    });
    await writeFile(
      join(output, "README.md"),
      "package bytes changed\n",
      "utf8",
    );
    const changedDigest = await execFileAsync(process.execPath, [
      join(pluginRoot, "publication/package-digest.mjs"),
      output,
    ]);
    expect(changedDigest.stdout.trim()).not.toBe(
      preparationResult.packageDigest,
    );
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
        candidateFingerprint: "f".repeat(64),
        domainChallenge: "servedExact",
        oauthDiscovery: "verified",
        publicSmoke: "passed",
        authorizationSmoke: "passed",
        ingressProxy: "nginx",
        operatorDataHandling: {
          hostingRecipients: ["synthetic hosting operator"],
          stderrRetention: "30 days",
          ingressAccessLogRetention: "14 days",
          budgetMonitoring: "enabled",
          alertRecipient: "synthetic operations address",
        },
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

async function writePublicationAttestation(
  directory: string,
  oauthScopes = "openid email play-sessions",
): Promise<string> {
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
          oauthScopes,
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
        submissionEvidence: {
          requirementsReview: {
            officialUrls: [
              "https://developers.openai.com/plugins/deploy/app-review",
              "https://developers.openai.com/plugins/deploy/submission",
            ],
            reviewedAt: new Date(Date.now() - 60_000).toISOString(),
            reviewedBy: "synthetic-test-operator",
            changes: [],
          },
          operatorDataHandling: {
            hostingRecipients: ["synthetic hosting operator"],
            stderrRetention: "30 days",
            ingressAccessLogRetention: "14 days",
            budgetMonitoring: "enabled",
            alertRecipient: "synthetic operations address",
            attestedAt: "2026-08-25T20:03:00Z",
            attestedBy: "synthetic-test-operator",
          },
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
