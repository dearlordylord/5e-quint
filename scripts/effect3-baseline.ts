import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  type Dirent,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

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
const RAW_SWARM_ARTIFACT_EXTENSIONS = new Set([
  ".json",
  ".jsonl",
  ".md",
  ".sqlite",
  ".txt",
]);

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
        .sort()
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

function artifactAuthority(path: string): ArtifactAuthority {
  const bytes = readFileSync(resolve(REPOSITORY_ROOT, path));
  return { path, byteLength: bytes.byteLength, sha256: sha256(bytes) };
}

function filesUnder(
  root: string,
  include: (path: string, entry: Dirent) => boolean,
): readonly string[] {
  const absoluteRoot = resolve(REPOSITORY_ROOT, root);
  const visit = (directory: string): readonly string[] =>
    readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .flatMap((entry) => {
        const absolutePath = join(directory, entry.name);
        const repositoryPath = relative(REPOSITORY_ROOT, absolutePath);
        if (entry.isDirectory()) return visit(absolutePath);
        return include(repositoryPath, entry) ? [repositoryPath] : [];
      });
  return visit(absoluteRoot);
}

function artifactManifest(
  root: string,
  include: (path: string, entry: Dirent) => boolean,
): readonly ArtifactAuthority[] {
  return filesUnder(root, include).map(artifactAuthority);
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
): unknown {
  return eitherSnapshot(decodeStoredPlaySessionRecord(row, playSessionId));
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
      policy:
        "No version-bearing MCP response field is captured. If a future capture adds one, it must name the exact path here before normalization.",
    },
    mcp: {
      registeredOrder: registeredDefinitions.map(({ name }) => name),
      registered: snapshotDefinitions(registeredDefinitions),
      advertisedOrder: advertisedDefinitions.map(({ name }) => name),
      advertised: snapshotDefinitions(advertisedDefinitions),
      modelFacingOutputSchemas: modelFacingSchemas,
    },
    surface: {
      publication: artifactManifest("packages/surface/publication", () => true),
      content: artifactManifest("packages/surface/content", () => true),
    },
    persistence: {
      formatVersion: 2,
      fixtures: capturePersistedSessionFixtures(),
    },
    reducers: captureReducerFixtures(),
    rawSwarm: {
      artifacts: artifactManifest("scripts/raw-swarm", (path) =>
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
  return resolve(REPOSITORY_ROOT, EFFECT3_BASELINE_PATH);
}

function capture(replaceReviewedBaseline: boolean): void {
  const path = baselinePath();
  if (existsSync(path) && !replaceReviewedBaseline) {
    throw new Error(
      `Refusing to replace ${EFFECT3_BASELINE_PATH}. Pass ${EFFECT3_BASELINE_REPLACEMENT_FLAG} only for an explicitly reviewed baseline replacement.`,
    );
  }
  const content = renderEffect3Baseline(captureEffect3Baseline());
  writeFileSync(path, content, "utf8");
  console.log(
    `Captured Effect 3 baseline: ${EFFECT3_BASELINE_PATH} (${sha256(content)})`,
  );
}

function verify(): void {
  const path = baselinePath();
  if (!existsSync(path)) {
    throw new Error(`Missing Effect 3 baseline: ${EFFECT3_BASELINE_PATH}`);
  }
  const expected = readFileSync(path, "utf8");
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
