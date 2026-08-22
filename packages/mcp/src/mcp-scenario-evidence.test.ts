import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { decodeCapabilityMatrix } from "../test-support/capability-matrix.ts";
import {
  CharacterSessionQueryKindsSchema,
  CHARACTER_SESSION_QUERY_KIND_VALUES,
} from "./character-session-query-tool-input.ts";
import { sourceDefinesVitestScenario } from "../test-support/mcp-scenario-executable.ts";

type McpRequiredFlow = {
  readonly flowId: string;
  readonly scopeIds: readonly string[];
  readonly followUpTaskIdsByScope: Readonly<Record<string, string>>;
  readonly description: string;
};

type McpScenarioEvidenceRow = {
  readonly kind: string;
  readonly flowId: string;
  readonly scopeIds: readonly string[];
  readonly scenarioId: string;
  readonly ownerPath: string;
  readonly testPath: string;
  readonly taskId: string;
  readonly summary: string;
  readonly queryKinds?: readonly string[];
};

type McpScenarioEvidenceManifest = {
  readonly schema: string;
  readonly ownerPackage: string;
  readonly check: {
    readonly packageName: string;
    readonly script: string;
  };
  readonly requiredFlows: readonly McpRequiredFlow[];
  readonly evidence: readonly McpScenarioEvidenceRow[];
};

type UltraGoldenGateModule = {
  readonly validateMcpScenarioEvidence: (
    manifest: McpScenarioEvidenceManifest,
    context: { readonly root: string },
  ) => readonly string[];
};

const repoRoot = resolve(import.meta.dirname, "../../..");
const manifestPath = resolve(
  repoRoot,
  "plans/unit-profile-coverage/mcp-scenario-evidence.json",
);
const capabilityMatrixPath = resolve(
  repoRoot,
  "plugins/srd-play/evals/capability-matrix.json",
);
const packageJsonPath = resolve(repoRoot, "packages/mcp/package.json");
const taskIdPattern =
  /^(?:C\d+|L13UG-A\d+|L14G-\d+|L5UG|L6UG|L18GATE|L19GATE|L110F-\d+)-[A-Z0-9-]+$/;
const require = createRequire(import.meta.url);
// This local CJS checker has no TypeScript declaration; type it at the import
// boundary so this test exercises the same manifest validator used by the
// ultra-golden evidence gate. The validator checks repo-relative owner/test
// paths, keeping admitted evidence local to this worktree.
const ultraGoldenGateModule: UltraGoldenGateModule = require("../../../scripts/ultra-golden-gate.cjs");
const { validateMcpScenarioEvidence } = ultraGoldenGateModule;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("MCP scenario evidence manifest", () => {
  test("uses the production query-kind owner for exact evidence obligations", () => {
    const decode = (value: unknown) =>
      Schema.decodeUnknownEither(CharacterSessionQueryKindsSchema)(value);
    expect(decode([...CHARACTER_SESSION_QUERY_KIND_VALUES])).toEqual(
      expect.objectContaining({ _tag: "Right" }),
    );
    expect(
      decode([
        ...CHARACTER_SESSION_QUERY_KIND_VALUES.slice(0, -1),
        "unknownQueryKind",
      ]),
    ).toEqual(expect.objectContaining({ _tag: "Left" }));
    expect(
      decode([
        ...CHARACTER_SESSION_QUERY_KIND_VALUES.slice(0, -1),
        CHARACTER_SESSION_QUERY_KIND_VALUES[0],
      ]),
    ).toEqual(expect.objectContaining({ _tag: "Left" }));
    expect(
      decode([
        CHARACTER_SESSION_QUERY_KIND_VALUES[1],
        CHARACTER_SESSION_QUERY_KIND_VALUES[0],
        ...CHARACTER_SESSION_QUERY_KIND_VALUES.slice(2),
      ]),
    ).toEqual(expect.objectContaining({ _tag: "Left" }));
  });

  test("validates matrix-backed executable MCP scenarios", () => {
    const manifest = readJson<McpScenarioEvidenceManifest>(manifestPath);
    const capabilityMatrix = decodeCapabilityMatrix(capabilityMatrixPath);
    const packageJson = readJson<{ readonly scripts: Record<string, string> }>(
      packageJsonPath,
    );
    const requiredFlowIds = new Set(
      manifest.requiredFlows.map((flow) => flow.flowId),
    );
    const executableEvidenceKeys = new Set(
      capabilityMatrix.rows.flatMap((row) =>
        row.mcpEvidence.status === "observed"
          ? row.mcpEvidence.refs.map(
              (ref) =>
                `${ref.scenarioId}\u0000${ref.flowId}\u0000${ref.taskId}`,
            )
          : [],
      ),
    );
    const derivedQueryEvidenceKeys = new Set(
      capabilityMatrix.rows
        .filter((row) => row.id === "character-sheet-derived-queries")
        .flatMap((row) =>
          row.mcpEvidence.status === "observed"
            ? row.mcpEvidence.refs.map(
                (ref) =>
                  `${ref.scenarioId}\u0000${ref.flowId}\u0000${ref.taskId}`,
              )
            : [],
        ),
    );

    expect(validateMcpScenarioEvidence(manifest, { root: repoRoot })).toEqual(
      [],
    );
    expect(manifest.schema).toBe("dnd.mcp-scenario-evidence.v1");
    expect(manifest.ownerPackage).toBe("@dnd/mcp");
    expect(manifest.check).toEqual({
      packageName: "@dnd/mcp",
      script: "test:mcp-scenario-evidence",
    });
    expect(packageJson.scripts[manifest.check.script]).toBeTypeOf("string");
    expect(manifest.requiredFlows.length).toBeGreaterThan(0);

    for (const flow of manifest.requiredFlows) {
      expect(flow.flowId).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
      expect(flow.scopeIds.length).toBeGreaterThan(0);
      expect(Object.keys(flow.followUpTaskIdsByScope).sort()).toEqual(
        [...flow.scopeIds].sort(),
      );
      for (const scopeId of flow.scopeIds) {
        expect(flow.followUpTaskIdsByScope[scopeId]).toMatch(taskIdPattern);
      }
      expect(flow.description.trim()).not.toBe("");
    }

    for (const row of manifest.evidence) {
      expect(row.kind).toBe("mcp-scenario");
      expect(requiredFlowIds.has(row.flowId)).toBe(true);
      expect(row.scopeIds.length).toBeGreaterThan(0);
      const evidenceKey = `${row.scenarioId}\u0000${row.flowId}\u0000${row.taskId}`;
      const matrixRow = capabilityMatrix.rows.find(
        (candidate) =>
          candidate.mcpEvidence.status === "observed" &&
          candidate.mcpEvidence.refs.some(
            (ref) =>
              `${ref.scenarioId}\u0000${ref.flowId}\u0000${ref.taskId}` ===
              evidenceKey,
          ),
      );
      if (row.queryKinds !== undefined) {
        expect(derivedQueryEvidenceKeys.has(evidenceKey)).toBe(true);
      }
      if (derivedQueryEvidenceKeys.has(evidenceKey)) {
        expect(row.queryKinds).toEqual([
          ...CHARACTER_SESSION_QUERY_KIND_VALUES,
        ]);
      }
      if (matrixRow?.requiredQueryKinds !== undefined) {
        expect(row.queryKinds).toEqual(matrixRow.requiredQueryKinds);
      }
      if (executableEvidenceKeys.has(evidenceKey)) {
        const testSource = readFileSync(
          resolve(repoRoot, row.testPath),
          "utf8",
        );
        expect(
          sourceDefinesVitestScenario(testSource, row.scenarioId),
          `${row.scenarioId} must identify an executable non-skipped Vitest case in ${row.testPath}`,
        ).toBe(true);
      }
      expect(existsSync(resolve(repoRoot, row.ownerPath))).toBe(true);
      expect(existsSync(resolve(repoRoot, row.testPath))).toBe(true);
      expect(row.taskId).toMatch(taskIdPattern);
      expect(row.summary.trim()).not.toBe("");
    }
    const derivedQueryRow = capabilityMatrix.rows.find(
      (row) => row.id === "character-sheet-derived-queries",
    );
    expect(derivedQueryRow?.requiredQueryKinds).toEqual([
      ...CHARACTER_SESSION_QUERY_KIND_VALUES,
    ]);
  });

  test("couples ids to non-skipped test declarations, not comments or skipped cases", () => {
    expect(
      sourceDefinesVitestScenario(
        'test("real-scenario", () => {});',
        "real-scenario",
      ),
    ).toBe(true);
    expect(
      sourceDefinesVitestScenario(
        '// test("comment-scenario", () => {});',
        "comment-scenario",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'test.skip("skipped-scenario", () => {});',
        "skipped-scenario",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'describe.skip("skipped-suite", () => { test("nested-skipped", () => {}); });',
        "nested-skipped",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'suite.skip("skipped-suite", () => { it("nested-skipped-it", () => {}); });',
        "nested-skipped-it",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'describe.skipIf(true)("skipped-suite", () => { test("nested-skipped-if", () => {}); });',
        "nested-skipped-if",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'suite.runIf(false)("skipped-suite", () => { it("nested-run-if", () => {}); });',
        "nested-run-if",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'describe.skipIf(false)("live-suite", () => { test("nested-live-if", () => {}); });',
        "nested-live-if",
      ),
    ).toBe(true);
    expect(
      sourceDefinesVitestScenario(
        'suite.runIf(true)("live-suite", () => { it("nested-live-run-if", () => {}); });',
        "nested-live-run-if",
      ),
    ).toBe(true);
    expect(
      sourceDefinesVitestScenario(
        'describe.skipIf(flag)("conditional-suite", () => { test("unknown-condition", () => {}); });',
        "unknown-condition",
      ),
    ).toBe(false);
    expect(
      sourceDefinesVitestScenario(
        'describe("live-suite", () => { test("nested-live", () => {}); });',
        "nested-live",
      ),
    ).toBe(true);
    expect(
      sourceDefinesVitestScenario(
        'test("other-scenario", () => {});',
        "missing-scenario",
      ),
    ).toBe(false);
  });
});
