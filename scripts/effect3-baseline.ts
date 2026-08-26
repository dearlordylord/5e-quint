import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  closeSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Either } from "effect";
import {
  abilityScoreAssignment,
  characterDraftId,
  createCharacterDraft,
  discoverCreationHoles,
} from "../packages/character-creation-runtime/src/index.ts";
import {
  characterSheetHitPoints,
  characterSheetHitPointsCurrentHp,
} from "../packages/character-sheet-runtime/src/index.ts";
import { Hp } from "../packages/shared/src/types.ts";
import {
  EMPTY_CONDITION_STATE,
  applyCondition,
  removeCondition,
} from "../packages/shared-algebras/src/conditions-algebra.ts";
import { buildAdvertisedToolDefinitions } from "../packages/mcp/src/protocol-server.ts";
import { playSessionToolDefinitions } from "../packages/mcp/src/play-session-tool-contract.ts";
import { decodeStoredPlaySessionRecord } from "../packages/mcp/src/play-session-repository.ts";
import { decodePlaySessionId } from "../packages/mcp/src/play-session.ts";
import type { ProtocolToolDefinition } from "../packages/mcp/src/tool-definition-contract.ts";
import {
  createMcpApplicationServices,
  toolDefinitions,
} from "../packages/mcp/src/server.ts";

export const EFFECT3_BASELINE_PATH =
  "docs/migrations/effect-4/effect3-behavioral-oracle.json";
export const EFFECT3_BASELINE_REPLACEMENT_FLAG = "--replace-reviewed-baseline";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_INDENT_SPACES = 2;
const SURFACE_PUBLICATION_ROOT = "packages/surface/publication";
const SURFACE_CONTENT_ROOT = "packages/surface/content";
const RAW_SWARM_ROOT = "scripts/raw-swarm";
const RAW_SWARM_ARTIFACT_EXTENSIONS = new Set([
  ".json",
  ".jsonl",
  ".md",
  ".sqlite",
  ".txt",
]);
const ARTIFACT_MANIFEST_POLICY = {
  source: "git-tracked-index",
  acceptedFileType: "regular-file",
  pathFormat: "POSIX",
  ordering: "Unicode-code-point",
  surfaceRoots: [SURFACE_PUBLICATION_ROOT, SURFACE_CONTENT_ROOT],
  rawSwarmRoot: RAW_SWARM_ROOT,
} as const;

export type BaselineJsonValue =
  | null
  | string
  | number
  | boolean
  | readonly BaselineJsonValue[]
  | { readonly [key: string]: BaselineJsonValue };

type ArtifactAuthority = {
  readonly path: string;
  readonly byteLength: number;
  readonly sha256: string;
};

type ToolDefinitionSnapshot = ProtocolToolDefinition;

function compareCodePointStrings(left: string, right: string): number {
  const leftCodePoints = Array.from(left, (character) =>
    character.codePointAt(0),
  );
  const rightCodePoints = Array.from(right, (character) =>
    character.codePointAt(0),
  );
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftCodePoint = leftCodePoints[index];
    const rightCodePoint = rightCodePoints[index];
    if (leftCodePoint === rightCodePoint) continue;
    return leftCodePoint! < rightCodePoint! ? -1 : 1;
  }
  return leftCodePoints.length - rightCodePoints.length;
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeObject(
  value: Record<string, unknown>,
  ancestors: WeakSet<object>,
): BaselineJsonValue {
  if (ancestors.has(value)) {
    throw new TypeError("Effect 3 baseline values must not contain cycles.");
  }
  ancestors.add(value);
  try {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol")) {
      throw new TypeError(
        "Effect 3 baseline objects must not contain symbol keys.",
      );
    }
    return Object.fromEntries(
      keys
        .filter((key): key is string => typeof key === "string")
        .sort(compareCodePointStrings)
        .map((key) => {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (
            descriptor === undefined ||
            !descriptor.enumerable ||
            !("value" in descriptor)
          ) {
            throw new TypeError(
              "Effect 3 baseline objects must contain only enumerable data properties.",
            );
          }
          return [
            key,
            normalizeJsonValue(descriptor.value, ancestors),
          ] as const;
        }),
    );
  } finally {
    ancestors.delete(value);
  }
}

export function normalizeJsonValue(
  value: unknown,
  ancestors = new WeakSet<object>(),
): BaselineJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        "Effect 3 baseline values must contain only finite numbers.",
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new TypeError("Effect 3 baseline values must not contain cycles.");
    }
    ancestors.add(value);
    try {
      return value.map((entry) => normalizeJsonValue(entry, ancestors));
    } finally {
      ancestors.delete(value);
    }
  }
  if (typeof value === "object" && isPlainRecord(value)) {
    return normalizeObject(value, ancestors);
  }
  throw new TypeError(
    `Effect 3 baseline value contains unsupported ${typeof value}.`,
  );
}

export function canonicalBaselineJson(value: unknown): string {
  return `${JSON.stringify(normalizeJsonValue(value), null, JSON_INDENT_SPACES)}\n`;
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryPathFor(path: string): string {
  if (
    path.length === 0 ||
    path.includes("\0") ||
    path.includes("\\") ||
    posix.isAbsolute(path) ||
    posix.normalize(path) !== path ||
    path.split("/").some((segment) => segment.length === 0)
  ) {
    throw new Error(`Artifact path is not canonical POSIX: ${path}`);
  }
  return path;
}

function absoluteRepositoryPath(path: string): string {
  const canonicalPath = repositoryPathFor(path);
  return resolve(REPOSITORY_ROOT, ...canonicalPath.split("/"));
}

function assertNoSymlinkInRepositoryPath(path: string): void {
  const canonicalPath = repositoryPathFor(path);
  let current = REPOSITORY_ROOT;
  for (const segment of canonicalPath.split("/")) {
    current = join(current, segment);
    const status = lstatSync(current);
    if (status.isSymbolicLink()) {
      throw new Error(`Artifact path contains a symlink: ${canonicalPath}`);
    }
  }
}

function readRegularRepositoryFile(path: string): Uint8Array {
  const canonicalPath = repositoryPathFor(path);
  assertNoSymlinkInRepositoryPath(canonicalPath);
  const descriptor = openSync(
    absoluteRepositoryPath(canonicalPath),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    return readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function artifactAuthority(path: string): ArtifactAuthority {
  const canonicalPath = repositoryPathFor(path);
  const status = lstatSync(absoluteRepositoryPath(canonicalPath));
  if (!status.isFile() || status.isSymbolicLink()) {
    throw new Error(
      `Artifact path is not a tracked regular file: ${canonicalPath}`,
    );
  }
  const bytes = readRegularRepositoryFile(canonicalPath);
  return {
    path: canonicalPath,
    byteLength: bytes.byteLength,
    sha256: sha256(bytes),
  };
}

type GitTrackedArtifact = {
  readonly mode: string;
  readonly path: string;
};

function gitTrackedArtifacts(root: string): readonly GitTrackedArtifact[] {
  const canonicalRoot = repositoryPathFor(root);
  const output = execFileSync(
    "git",
    ["ls-files", "--stage", "-z", "--", canonicalRoot],
    { cwd: REPOSITORY_ROOT },
  ).toString("utf8");
  return output
    .split("\0")
    .filter((record) => record.length > 0)
    .map((record) => {
      const separator = record.indexOf("\t");
      if (separator < 0) {
        throw new Error(`Git tracked artifact record is malformed: ${record}`);
      }
      const metadata = record.slice(0, separator).split(" ");
      const mode = metadata[0];
      const path = repositoryPathFor(record.slice(separator + 1));
      if (mode !== "100644" && mode !== "100755") {
        throw new Error(
          `Git tracked artifact is not a regular file: ${path} (${mode}).`,
        );
      }
      if (!path.startsWith(`${canonicalRoot}/`)) {
        throw new Error(
          `Git tracked artifact escapes ${canonicalRoot}: ${path}`,
        );
      }
      assertNoSymlinkInRepositoryPath(path);
      return { mode, path };
    })
    .sort((left, right) => compareCodePointStrings(left.path, right.path));
}

function artifactManifest(
  root: string,
  include: (path: string) => boolean,
): readonly ArtifactAuthority[] {
  return gitTrackedArtifacts(root)
    .map(({ path }) => path)
    .filter(include)
    .map(artifactAuthority);
}

function snapshotToolDefinition(
  definition: ToolDefinitionSnapshot,
): ToolDefinitionSnapshot {
  return {
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    ...(definition.outputSchema === undefined
      ? {}
      : { outputSchema: definition.outputSchema }),
    annotations: definition.annotations,
    ...(definition.securitySchemes === undefined
      ? {}
      : { securitySchemes: definition.securitySchemes }),
    ...(definition._meta === undefined ? {} : { _meta: definition._meta }),
  };
}

function snapshotDefinitions(
  definitions: readonly ToolDefinitionSnapshot[],
): Readonly<Record<string, ToolDefinitionSnapshot>> {
  const snapshot = Object.fromEntries(
    definitions.map((definition) => [
      definition.name,
      snapshotToolDefinition(definition),
    ]),
  );
  if (Object.keys(snapshot).length !== definitions.length) {
    throw new Error("MCP baseline requires unique tool definition names.");
  }
  return snapshot;
}

function eitherSnapshot(value: Either.Either<unknown, unknown>): unknown {
  return Either.isRight(value)
    ? { tag: "right", value: value.right }
    : { tag: "left", value: value.left };
}

function persistedSessionSnapshot(
  value: Either.Either<unknown, unknown>,
  stableFailureReason?: "malformedOperationsJson",
): unknown {
  if (Either.isRight(value) || stableFailureReason === undefined) {
    return eitherSnapshot(value);
  }
  return {
    tag: "left",
    value: {
      tag: "playSessionRepositoryIssue",
      reason: "invalidStoredRecord",
      message: stableFailureReason,
    },
  };
}

function requirePlaySessionId(value: string) {
  const decoded = decodePlaySessionId(value);
  if (Either.isLeft(decoded)) {
    throw new Error(
      `Effect 3 baseline fixture has an invalid Play Session id: ${decoded.left}`,
    );
  }
  return decoded.right;
}

function decodePersistedSessionFixture(
  row: Readonly<Record<string, unknown>>,
  playSessionId: ReturnType<typeof requirePlaySessionId>,
  stableFailureReason?: "malformedOperationsJson",
): unknown {
  return persistedSessionSnapshot(
    decodeStoredPlaySessionRecord(row, playSessionId),
    stableFailureReason,
  );
}

function capturePersistedSessionFixtures(): Readonly<Record<string, unknown>> {
  const playSessionId = requirePlaySessionId(
    "play-session:00000000-0000-4000-8000-000000000003",
  );
  const seed = "a".repeat(64);
  const digest = "b".repeat(64);
  const operations = JSON.stringify([
    {
      name: "roll_dice",
      args: { groups: [{ dice: 1, dieSize: 20 }] },
    },
  ]);
  const baseRow = {
    format_version: 2,
    random_seed: seed,
    revision: 1,
    operations_json: operations,
    last_activity_at_ms: 1_700_000_000_000,
  } as const;
  return {
    guest: decodePersistedSessionFixture(
      {
        ...baseRow,
        tenure_kind: "guest",
        guest_access_grant_digest: digest,
        principal_id: null,
      },
      playSessionId,
    ),
    saved: decodePersistedSessionFixture(
      {
        ...baseRow,
        tenure_kind: "saved",
        guest_access_grant_digest: null,
        principal_id: "baseline-player",
      },
      playSessionId,
    ),
    contradictoryTenure: decodePersistedSessionFixture(
      {
        ...baseRow,
        tenure_kind: "guest",
        guest_access_grant_digest: digest,
        principal_id: "baseline-player",
      },
      playSessionId,
    ),
    malformedOperations: decodePersistedSessionFixture(
      {
        ...baseRow,
        operations_json: "{not-json",
        tenure_kind: "guest",
        guest_access_grant_digest: digest,
        principal_id: null,
      },
      playSessionId,
      "malformedOperationsJson",
    ),
  };
}

function captureReducerFixtures(): Readonly<Record<string, unknown>> {
  const applicationServices = createMcpApplicationServices();
  const draft = createCharacterDraft({
    draftId: characterDraftId("cc:draft:effect3-baseline"),
  });
  const creationHoles = discoverCreationHoles({
    draft,
    unitLibrary: applicationServices.unitLibrary,
  });
  const unconscious = applyCondition(EMPTY_CONDITION_STATE, "unconscious");
  const restoredConditionState = removeCondition(unconscious, "unconscious");
  const sheetHitPoints = characterSheetHitPoints({
    currentHp: Hp(1),
    tempHp: Hp(2),
    positiveHpUnconscious: { tag: "knockedOut" },
  });

  return {
    abilityScoreAssignment: eitherSnapshot(
      abilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 12,
        wis: 10,
        cha: 8,
      }),
    ),
    abilityScoreAssignmentRejected: eitherSnapshot(
      abilityScoreAssignment({ str: 15 }),
    ),
    characterCreation: {
      draft,
      holeCount: creationHoles.length,
      holes: creationHoles.map((hole) => {
        if (hole.kind === "abilityScores") {
          return {
            kind: hole.kind,
            holeId: hole.holeId,
            methods: hole.methods,
          };
        }
        return {
          kind: hole.kind,
          holeId: hole.holeId,
          source: hole.source,
          cardinality: hole.cardinality,
          optionIds: hole.options.map((option) => option.optionId),
        };
      }),
    },
    conditionLifecycle: {
      appliedUnconscious: unconscious,
      removedUnconscious: restoredConditionState,
    },
    characterSheetHitPoints: eitherSnapshot(sheetHitPoints),
    characterSheetCurrentHp: Either.isRight(sheetHitPoints)
      ? characterSheetHitPointsCurrentHp(sheetHitPoints.right)
      : null,
  };
}

export function captureEffect3Baseline(): Readonly<Record<string, unknown>> {
  const registeredDefinitions: readonly ProtocolToolDefinition[] = [
    ...playSessionToolDefinitions,
    ...toolDefinitions,
  ];
  const advertisedDefinitions: readonly ProtocolToolDefinition[] =
    buildAdvertisedToolDefinitions(toolDefinitions);
  const modelFacingSchemas = Object.fromEntries(
    advertisedDefinitions.flatMap((definition) =>
      definition.outputSchema === undefined
        ? []
        : [[definition.name, definition.outputSchema] as const],
    ),
  );

  return {
    formatVersion: 1,
    normalization: {
      versionBearingPaths: [],
      persistedJsonFailureReason: "malformedOperationsJson",
      policy:
        "No version-bearing MCP response field is captured. Malformed persisted operations JSON uses a stable typed reason instead of parser prose. If a future capture adds a version-bearing field, it must name the exact path here before normalization.",
    },
    artifactManifestPolicy: ARTIFACT_MANIFEST_POLICY,
    mcp: {
      registeredOrder: registeredDefinitions.map(({ name }) => name),
      registered: snapshotDefinitions(registeredDefinitions),
      advertisedOrder: advertisedDefinitions.map(({ name }) => name),
      advertised: snapshotDefinitions(advertisedDefinitions),
      modelFacingOutputSchemas: modelFacingSchemas,
    },
    surface: {
      publication: artifactManifest(SURFACE_PUBLICATION_ROOT, () => true),
      content: artifactManifest(SURFACE_CONTENT_ROOT, () => true),
    },
    persistence: {
      formatVersion: 2,
      fixtures: capturePersistedSessionFixtures(),
    },
    reducers: captureReducerFixtures(),
    rawSwarm: {
      artifacts: artifactManifest(RAW_SWARM_ROOT, (path) =>
        RAW_SWARM_ARTIFACT_EXTENSIONS.has(extname(path)),
      ),
    },
  };
}

export function renderEffect3Baseline(
  baseline: Readonly<Record<string, unknown>>,
): string {
  return canonicalBaselineJson(baseline);
}

function baselinePath(): string {
  return absoluteRepositoryPath(EFFECT3_BASELINE_PATH);
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function certificateTarget(path: string): "missing" | "regular" {
  const canonicalPath = repositoryPathFor(path);
  assertNoSymlinkInRepositoryPath(posix.dirname(canonicalPath));
  try {
    const status = lstatSync(absoluteRepositoryPath(canonicalPath));
    if (status.isSymbolicLink()) {
      throw new Error(`Refusing to follow certificate symlink: ${path}`);
    }
    if (!status.isFile()) {
      throw new Error(`Certificate path is not a regular file: ${path}`);
    }
    return "regular";
  } catch (error) {
    if (isMissingPathError(error)) return "missing";
    throw error;
  }
}

function writeCertificateExclusively(path: string, content: string): void {
  const descriptor = openSync(
    path,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o644,
  );
  try {
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
  } catch (error) {
    closeSync(descriptor);
    rmSync(path, { force: true });
    throw error;
  }
  closeSync(descriptor);
}

function writeCertificateReplacement(path: string, content: string): void {
  const temporaryPath = `${path}.${randomUUID()}.next`;
  const descriptor = openSync(
    temporaryPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
  } catch (error) {
    closeSync(descriptor);
    rmSync(temporaryPath, { force: true });
    throw error;
  }
  try {
    renameSync(temporaryPath, path);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function capture(replaceReviewedBaseline: boolean): void {
  const relativePath = repositoryPathFor(EFFECT3_BASELINE_PATH);
  const path = baselinePath();
  const target = certificateTarget(relativePath);
  if (target === "regular" && !replaceReviewedBaseline) {
    throw new Error(
      `Refusing to replace ${EFFECT3_BASELINE_PATH}. Pass ${EFFECT3_BASELINE_REPLACEMENT_FLAG} only for an explicitly reviewed baseline replacement.`,
    );
  }
  const content = renderEffect3Baseline(captureEffect3Baseline());
  if (target === "missing") {
    writeCertificateExclusively(path, content);
  } else {
    writeCertificateReplacement(path, content);
  }
  console.log(
    `Captured Effect 3 baseline: ${EFFECT3_BASELINE_PATH} (${sha256(content)})`,
  );
}

function verify(): void {
  const relativePath = repositoryPathFor(EFFECT3_BASELINE_PATH);
  if (certificateTarget(relativePath) === "missing") {
    throw new Error(`Missing Effect 3 baseline: ${EFFECT3_BASELINE_PATH}`);
  }
  const expected = new TextDecoder().decode(
    readRegularRepositoryFile(relativePath),
  );
  JSON.parse(expected);
  const actual = renderEffect3Baseline(captureEffect3Baseline());
  if (actual !== expected) {
    throw new Error(
      `Effect 3 baseline differs from ${EFFECT3_BASELINE_PATH}. Review the migration delta before replacing it.`,
    );
  }
  console.log(
    `Verified Effect 3 baseline: ${EFFECT3_BASELINE_PATH} (${sha256(expected)})`,
  );
}

function main(): void {
  const command = process.argv[2];
  if (command === "capture") {
    capture(process.argv.includes(EFFECT3_BASELINE_REPLACEMENT_FLAG));
    return;
  }
  if (command === "verify") {
    verify();
    return;
  }
  throw new Error(
    `Usage: pnpm exec tsx scripts/effect3-baseline.ts capture|verify [${EFFECT3_BASELINE_REPLACEMENT_FLAG}]`,
  );
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main();
}
