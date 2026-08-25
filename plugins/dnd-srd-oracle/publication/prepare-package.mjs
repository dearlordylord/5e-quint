#!/usr/bin/env node
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const publicationDirectory = dirname(fileURLToPath(import.meta.url));
const pluginDirectory = resolve(publicationDirectory, "..");
const repositoryDirectory = resolve(pluginDirectory, "../..");
const execFileAsync = promisify(execFile);
const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

const options = parseOptions(process.argv.slice(2));
const environmentFile = resolve(
  requiredValue(options.environmentFile, "--environment-file"),
);
await verifyProductionConfiguration(environmentFile);
const deployment = await readEnvironmentFile(environmentFile);
if (
  deployment.DND_MCP_ENVIRONMENT !== "production" ||
  deployment.DND_MCP_PUBLICATION_MODE !== "enabled"
) {
  throw new Error(
    "--environment-file must select production with publication mode enabled",
  );
}
const origin = productionOrigin(deployment.DND_MCP_DOMAIN);
const publisher = configuredPublisher(deployment.DND_MCP_PUBLISHER_NAME);
const publicationAttestation = decodePublicationAttestation(
  await readJson(
    resolve(
      requiredValue(
        options.publicationAttestation,
        "--publication-attestation",
      ),
    ),
  ),
);
if (publicationAttestation.publisherIdentity.name !== publisher) {
  throw new Error(
    "Attested publisher identity must exactly match DND_MCP_PUBLISHER_NAME",
  );
}
const registeredAppId = registeredApplicationId(options.registeredAppId);
const outputDirectory = resolve(requiredValue(options.output, "--output"));
await requireEmptyOutput(outputDirectory);

const source = decodeSubmissionSource(
  await readJson(join(publicationDirectory, "submission-source.json")),
);
const inventory = decodeEvaluationInventory(
  await readJson(join(pluginDirectory, "evals/evaluation-inventory.json")),
);
const manifest = decodePluginManifest(
  await readJson(join(pluginDirectory, ".codex-plugin/plugin.json")),
);
const retentionPolicy = decodeRetentionPolicy(
  await readJson(
    join(
      repositoryDirectory,
      "packages/mcp/src/public-play-session-policy.json",
    ),
  ),
);
const reviewCases = new Map(
  inventory.submissionReview.map((entry) => [entry.id, entry]),
);
const selectedCases = source.submissionReviewCaseIds.map((id) => {
  const entry = reviewCases.get(id);
  if (entry === undefined)
    throw new Error(`Missing submission review case: ${id}`);
  return entry;
});

await mkdir(outputDirectory, { recursive: true });
for (const relativePath of [".codex-plugin", "assets", "skills"]) {
  await cp(
    join(pluginDirectory, relativePath),
    join(outputDirectory, relativePath),
    {
      recursive: true,
    },
  );
}
await cp(
  join(publicationDirectory, "PACKAGE-README.md"),
  join(outputDirectory, "README.md"),
);
for (const legalFile of ["LICENSE", "NOTICE"]) {
  await cp(
    join(repositoryDirectory, legalFile),
    join(outputDirectory, legalFile),
  );
}

const endpoints = Object.fromEntries(
  Object.entries({
    mcp: source.mcp.path,
    website: source.listing.websitePath,
    support: source.listing.supportPath,
    privacy: source.listing.privacyPath,
    terms: source.listing.termsPath,
  }).map(([name, path]) => [name, sameOriginEndpoint(path, origin)]),
);
const preparedManifest = {
  ...manifest,
  author: { ...manifest.author, name: publisher, url: endpoints.website },
  homepage: endpoints.website,
  apps: "./.app.json",
  interface: {
    ...manifest.interface,
    developerName: publisher,
    websiteURL: endpoints.website,
    privacyPolicyURL: endpoints.privacy,
    termsOfServiceURL: endpoints.terms,
  },
};
await writeJson(join(outputDirectory, ".app.json"), {
  apps: {
    "dnd-srd-oracle": {
      id: registeredAppId,
      category: source.listing.category,
    },
  },
});
await writeJson(
  join(outputDirectory, ".codex-plugin/plugin.json"),
  preparedManifest,
);
await writeJson(join(outputDirectory, "portal-submission.json"), {
  publisherIdentity: publicationAttestation.publisherIdentity,
  reviewerAccess: publicationAttestation.reviewerAccess,
  registeredAppId,
  listing: {
    ...source.listing,
    websiteURL: endpoints.website,
    supportURL: endpoints.support,
    privacyPolicyURL: endpoints.privacy,
    termsOfServiceURL: endpoints.terms,
  },
  mcp: { ...source.mcp, serverURL: endpoints.mcp },
  dataHandling: {
    ...source.dataHandling,
    guestInactiveDays: retentionPolicy.guestInactivityRetentionMs / DAY_MS,
    guestPressureCleanupMinimumInactiveHours:
      retentionPolicy.guestPressureProtectionMs / HOUR_MS,
    savedInactiveDays: retentionPolicy.savedInactivityRetentionMs / DAY_MS,
  },
  availability: source.availability,
  starterPrompts: preparedManifest.interface.defaultPrompt,
  submissionReview: selectedCases,
  releaseNotes: source.releaseNotes,
  contentBoundary: source.contentBoundary,
});

process.stdout.write(`${outputDirectory}\n`);

function parseOptions(args) {
  const parsed = {};
  const optionKeyByName = {
    "--environment-file": "environmentFile",
    "--publication-attestation": "publicationAttestation",
    "--registered-app-id": "registeredAppId",
    "--output": "output",
  };
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!(name in optionKeyByName) || value === undefined) {
      throw new Error(
        "usage: prepare-package.mjs --environment-file FILE --publication-attestation FILE --registered-app-id ID --output DIRECTORY",
      );
    }
    parsed[optionKeyByName[name]] = value;
  }
  return parsed;
}

async function verifyProductionConfiguration(environmentFile) {
  try {
    await execFileAsync(
      join(repositoryDirectory, "operations/public-mcp/verify-config.sh"),
      [environmentFile],
    );
  } catch (error) {
    const detail =
      typeof error?.stderr === "string" && error.stderr.trim() !== ""
        ? error.stderr.trim()
        : "configuration verifier did not complete successfully";
    throw new Error(`Production configuration verification failed: ${detail}`);
  }
}

function decodePublicationAttestation(value) {
  const attestation = exactRecord(value, "publication attestation", [
    "publisherIdentity",
    "reviewerAccess",
  ]);
  const publisherIdentity = exactRecord(
    attestation.publisherIdentity,
    "publisherIdentity",
    ["status", "name", "verifiedAt", "attestedBy"],
  );
  const reviewerAccess = exactRecord(
    attestation.reviewerAccess,
    "reviewerAccess",
    ["status", "mfaRequired", "attestedAt", "attestedBy"],
  );
  return {
    publisherIdentity: {
      status: literal(
        publisherIdentity.status,
        "verifiedInOpenAiPortal",
        "publisherIdentity.status",
      ),
      name: nonEmptyString(publisherIdentity.name, "publisherIdentity.name"),
      verifiedAt: isoTimestamp(
        publisherIdentity.verifiedAt,
        "publisherIdentity.verifiedAt",
      ),
      attestedBy: nonEmptyString(
        publisherIdentity.attestedBy,
        "publisherIdentity.attestedBy",
      ),
    },
    reviewerAccess: {
      status: literal(
        reviewerAccess.status,
        "provisionedInOpenAiPortal",
        "reviewerAccess.status",
      ),
      mfaRequired: literal(
        reviewerAccess.mfaRequired,
        false,
        "reviewerAccess.mfaRequired",
      ),
      attestedAt: isoTimestamp(
        reviewerAccess.attestedAt,
        "reviewerAccess.attestedAt",
      ),
      attestedBy: nonEmptyString(
        reviewerAccess.attestedBy,
        "reviewerAccess.attestedBy",
      ),
    },
  };
}

function decodeSubmissionSource(value) {
  const source = exactRecord(value, "submission source", [
    "listing",
    "mcp",
    "dataHandling",
    "availability",
    "submissionReviewCaseIds",
    "releaseNotes",
    "contentBoundary",
  ]);
  const listing = exactStringRecord(source.listing, "listing", [
    "name",
    "shortDescription",
    "longDescription",
    "category",
    "supportPath",
    "privacyPath",
    "termsPath",
    "websitePath",
  ]);
  const mcp = exactRecord(source.mcp, "mcp", [
    "connectionType",
    "path",
    "authentication",
    "authenticationRationale",
    "contentSecurityPolicy",
  ]);
  const contentSecurityPolicy = exactRecord(
    mcp.contentSecurityPolicy,
    "mcp.contentSecurityPolicy",
    ["connectDomains", "resourceDomains"],
  );
  const dataHandling = exactStringRecord(source.dataHandling, "dataHandling", [
    "contract",
    "savedDeletion",
    "sharing",
    "telemetry",
  ]);
  const availability = exactStringRecord(source.availability, "availability", [
    "proposal",
    "rationale",
  ]);
  return {
    listing,
    mcp: {
      connectionType: literal(
        mcp.connectionType,
        "universal",
        "mcp.connectionType",
      ),
      path: nonEmptyString(mcp.path, "mcp.path"),
      authentication: literal(
        mcp.authentication,
        "optionalOAuth",
        "mcp.authentication",
      ),
      authenticationRationale: nonEmptyString(
        mcp.authenticationRationale,
        "mcp.authenticationRationale",
      ),
      contentSecurityPolicy: {
        connectDomains: stringArray(
          contentSecurityPolicy.connectDomains,
          "mcp.contentSecurityPolicy.connectDomains",
        ),
        resourceDomains: stringArray(
          contentSecurityPolicy.resourceDomains,
          "mcp.contentSecurityPolicy.resourceDomains",
        ),
      },
    },
    dataHandling,
    availability,
    submissionReviewCaseIds: distinctStringArray(
      source.submissionReviewCaseIds,
      "submissionReviewCaseIds",
    ),
    releaseNotes: nonEmptyString(source.releaseNotes, "releaseNotes"),
    contentBoundary: nonEmptyString(source.contentBoundary, "contentBoundary"),
  };
}

function decodeEvaluationInventory(value) {
  const inventory = recordValue(value, "evaluation inventory");
  return {
    submissionReview: decodeSubmissionReviewCases(inventory.submissionReview),
  };
}

function decodeSubmissionReviewCases(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("submissionReview must be a non-empty array");
  const decodedCases = value.map((rawCase, index) => {
    const label = `submissionReview[${index}]`;
    const record = recordValue(rawCase, label);
    const common = [
      "id",
      "kind",
      "prompt",
      "fixture",
      "expectedBehavior",
      "expectedResultShape",
    ];
    if (record.kind !== "positive" && record.kind !== "negative")
      throw new Error(`${label}.kind must be positive or negative`);
    const decoded = exactStringRecord(
      record,
      label,
      record.kind === "negative" ? [...common, "rejectionRationale"] : common,
    );
    return decoded;
  });
  requireDistinctValues(
    decodedCases.map(({ id }) => id),
    "submissionReview ids",
  );
  return decodedCases;
}

function decodePluginManifest(value) {
  const manifest = exactRecord(value, "plugin manifest", [
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "skills",
    "interface",
  ]);
  const author = exactStringRecord(manifest.author, "manifest.author", [
    "name",
    "url",
  ]);
  const interfaceValue = exactRecord(manifest.interface, "manifest.interface", [
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
    "category",
    "capabilities",
    "defaultPrompt",
    "brandColor",
    "composerIcon",
    "logo",
    "logoDark",
  ]);
  const interfaceStrings = exactStringRecord(
    Object.fromEntries(
      Object.entries(interfaceValue).filter(
        ([name]) => name !== "capabilities" && name !== "defaultPrompt",
      ),
    ),
    "manifest.interface string fields",
    [
      "displayName",
      "shortDescription",
      "longDescription",
      "developerName",
      "category",
      "brandColor",
      "composerIcon",
      "logo",
      "logoDark",
    ],
  );
  return {
    ...exactStringRecord(
      Object.fromEntries(
        Object.entries(manifest).filter(
          ([name]) => !["author", "keywords", "interface"].includes(name),
        ),
      ),
      "manifest string fields",
      [
        "name",
        "version",
        "description",
        "homepage",
        "repository",
        "license",
        "skills",
      ],
    ),
    author,
    keywords: stringArray(manifest.keywords, "manifest.keywords"),
    interface: {
      ...interfaceStrings,
      capabilities: stringArray(
        interfaceValue.capabilities,
        "manifest.interface.capabilities",
      ),
      defaultPrompt: stringArray(
        interfaceValue.defaultPrompt,
        "manifest.interface.defaultPrompt",
      ),
    },
  };
}

function decodeRetentionPolicy(value) {
  const policy = exactRecord(value, "public Play Session policy", [
    "guestInactivityRetentionMs",
    "guestPressureProtectionMs",
    "savedInactivityRetentionMs",
  ]);
  for (const [name, duration] of Object.entries(policy)) {
    if (!Number.isSafeInteger(duration) || duration <= 0)
      throw new Error(`${name} must be a positive integer duration`);
  }
  if (
    policy.guestInactivityRetentionMs % DAY_MS !== 0 ||
    policy.guestPressureProtectionMs % HOUR_MS !== 0 ||
    policy.savedInactivityRetentionMs % DAY_MS !== 0
  ) {
    throw new Error(
      "Public Play Session policy must project to whole disclosure units",
    );
  }
  return policy;
}

function exactStringRecord(value, label, keys) {
  const record = exactRecord(value, label, keys);
  return Object.fromEntries(
    keys.map((name) => [
      name,
      nonEmptyString(record[name], `${label}.${name}`),
    ]),
  );
}

function exactRecord(value, label, keys) {
  const record = recordValue(value, label);
  const actualKeys = Object.keys(record);
  const unexpected = actualKeys.filter((name) => !keys.includes(name));
  const missing = keys.filter((name) => !(name in record));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(
      `${label} has invalid keys (missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"})`,
    );
  }
  return record;
}

function recordValue(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${label} must be a non-empty trimmed string`);
  if (value !== value.trim())
    throw new Error(`${label} must not have surrounding whitespace`);
  return value;
}

function stringArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) =>
    nonEmptyString(entry, `${label}[${index}]`),
  );
}

function distinctStringArray(value, label) {
  return requireDistinctValues(stringArray(value, label), label);
}

function requireDistinctValues(values, label) {
  if (new Set(values).size !== values.length)
    throw new Error(`${label} must contain distinct values`);
  return values;
}

function literal(value, expected, label) {
  if (value !== expected) throw new Error(`${label} must equal ${expected}`);
  return value;
}

function isoTimestamp(value, label) {
  const timestamp = nonEmptyString(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(timestamp) ||
    Number.isNaN(Date.parse(timestamp))
  )
    throw new Error(`${label} must be an ISO 8601 UTC timestamp`);
  return timestamp;
}

function productionOrigin(domain) {
  const hostname = requiredValue(domain, "DND_MCP_DOMAIN").toLowerCase();
  const url = new URL(`https://${hostname}`);
  if (
    url.hostname !== hostname ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("DND_MCP_DOMAIN must contain only one HTTPS hostname");
  }
  const reservedSuffixes = [
    ".test",
    ".invalid",
    ".example",
    ".localhost",
    ".local",
    ".internal",
  ];
  const documentationDomains = ["example.com", "example.net", "example.org"];
  if (
    isIP(hostname) !== 0 ||
    hostname === "localhost" ||
    reservedSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    documentationDomains.some(
      (domainName) =>
        hostname === domainName || hostname.endsWith(`.${domainName}`),
    )
  ) {
    throw new Error("DND_MCP_DOMAIN must be a public non-placeholder hostname");
  }
  return url;
}

function sameOriginEndpoint(path, origin) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    throw new Error(`Publication endpoint must be a same-origin path: ${path}`);
  }
  const endpoint = new URL(path, origin);
  if (
    endpoint.origin !== origin.origin ||
    endpoint.search !== "" ||
    endpoint.hash !== "" ||
    endpoint.pathname !== path
  ) {
    throw new Error(
      `Publication endpoint escaped its verified origin: ${path}`,
    );
  }
  return endpoint.toString();
}

function configuredPublisher(value) {
  const publisher = requiredValue(value, "DND_MCP_PUBLISHER_NAME");
  if (
    publisher === "5e Quint developers" ||
    publisher.startsWith("replace-with-") ||
    publisher.includes("<") ||
    publisher.includes(">")
  ) {
    throw new Error(
      "DND_MCP_PUBLISHER_NAME must be the exact configured publisher identity",
    );
  }
  return publisher;
}

function registeredApplicationId(value) {
  const id = requiredValue(value, "--registered-app-id");
  if (!/^plugin_asdk_app_[A-Za-z0-9_-]+$/u.test(id)) {
    throw new Error(
      "--registered-app-id must be the plugin_asdk_app identifier returned by MCP registration",
    );
  }
  return id;
}

function requiredValue(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

async function requireEmptyOutput(path) {
  try {
    const entries = await readdir(path);
    if (entries.length > 0)
      throw new Error(`Refusing non-empty output directory: ${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (
    path === "/" ||
    path === pluginDirectory ||
    path.startsWith(`${pluginDirectory}/`)
  ) {
    throw new Error(
      "--output must not replace the filesystem or source package",
    );
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readEnvironmentFile(path) {
  const values = {};
  for (const [index, rawLine] of (await readFile(path, "utf8"))
    .split(/\r?\n/u)
    .entries()) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      throw new Error(`Invalid environment assignment at ${path}:${index + 1}`);
    }
    const name = line.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(name) || name in values) {
      throw new Error(
        `Invalid or duplicate environment name at ${path}:${index + 1}`,
      );
    }
    values[name] = unquoteEnvironmentValue(line.slice(separator + 1).trim());
  }
  return values;
}

function unquoteEnvironmentValue(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
