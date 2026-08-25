import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  checkDhallJsonCompilerVersion,
  runPublicationCheck,
  runSurfacePublicationCheck,
  type PublicationIssue,
} from "./check-surface-content-json-sync.ts";
import dhallJsonToolchain from "../packages/surface/dhall-json-toolchain.json" with { type: "json" };
import {
  SRD_SURFACE_PUBLICATION_FILE_NAMES,
  SURFACE_PUBLICATION_MEMBERS,
} from "../packages/surface/src/surface/publication-artifacts.ts";
import { buildSrdSurfacePublication } from "./srd-surface-publication-artifacts.ts";

const validRecord = readFileSync(
  join(process.cwd(), "packages/surface/content/bless.json"),
  "utf8",
);
const validStatBlockRecord = readFileSync(
  join(
    process.cwd(),
    "packages/surface/content/stat_block_goblin_warrior.json",
  ),
  "utf8",
);
const require = createRequire(import.meta.url);
// This integration check deliberately builds the real local RAW index through
// CJS; its measured cold path is just over Vitest's 5 s default.
const REAL_LOCATOR_DIAGNOSTIC_TIMEOUT_MS = 10_000;

describe("Surface content publication checker", () => {
  it("returns unreadable RAW input as a typed publication issue", () => {
    const result = buildSrdSurfacePublication({
      excerptSource: {
        buildReferenceIndex: () => {
          throw new Error("synthetic unreadable RAW");
        },
        rulesExcerptForSection: () => {
          throw new Error("must not resolve without an index");
        },
      },
    });

    expect(result).toEqual({
      tag: "invalid",
      issues: [
        {
          kind: "source-index-unreadable",
          message: "synthetic unreadable RAW",
        },
      ],
    });
  });

  it.each([
    {
      name: "unknown resolution status",
      result: {
        tag: "invalid-locator",
        resolutions: [{ part: "synthetic", status: "typo" }],
      },
    },
    {
      name: "empty part with a nonempty-part status",
      result: {
        tag: "invalid-locator",
        resolutions: [{ part: "", status: "ok-heading" }],
      },
    },
    {
      name: "nonempty part with the empty-part status",
      result: {
        tag: "invalid-locator",
        resolutions: [{ part: "synthetic", status: "empty-section-part" }],
      },
    },
    {
      name: "empty successful excerpt",
      result: { tag: "ok", rulesExcerpt: "" },
    },
    {
      name: "excess response property",
      result: {
        tag: "ok",
        rulesExcerpt: "Synthetic exact excerpt",
        excess: true,
      },
    },
  ])("rejects $name at the excerpt boundary", ({ result }) => {
    const publication = buildSrdSurfacePublication({
      excerptSource: {
        buildReferenceIndex: () => ({ synthetic: true }),
        rulesExcerptForSection: () => result,
      },
    });

    expect(publication.tag).toBe("invalid");
    if (publication.tag === "invalid") {
      expect(publication.issues).not.toHaveLength(0);
      expect(
        publication.issues.every(
          (issue) => issue.kind === "excerpt-result-invalid",
        ),
      ).toBe(true);
    }
  });

  it(
    "preserves real locator diagnostics across the CJS boundary",
    () => {
      const candidate: unknown = require("./srd521-surface-authored-corpus-audit.cjs");
      expect(typeof candidate).toBe("object");
      expect(candidate).not.toBeNull();
      if (typeof candidate !== "object" || candidate === null) return;
      const buildReferenceIndex = Reflect.get(candidate, "buildReferenceIndex");
      const rulesExcerptForSection = Reflect.get(
        candidate,
        "rulesExcerptForSection",
      );
      expect(typeof buildReferenceIndex).toBe("function");
      expect(typeof rulesExcerptForSection).toBe("function");
      if (
        typeof buildReferenceIndex !== "function" ||
        typeof rulesExcerptForSection !== "function"
      ) {
        return;
      }
      const index: unknown = buildReferenceIndex();
      const actualAliasResult: unknown = rulesExcerptForSection(
        "MagicItems#Cloak of Protection",
        index,
      );

      const publication = buildSrdSurfacePublication({
        excerptSource: {
          buildReferenceIndex: () => index,
          rulesExcerptForSection: () => actualAliasResult,
        },
      });

      expect(publication.tag).toBe("invalid");
      if (publication.tag === "invalid") {
        expect(publication.issues[0]).toMatchObject({
          kind: "record-excerpt-invalid",
          reason: "invalid-locator",
          resolutions: [
            {
              part: "MagicItems#Cloak of Protection",
              status: "ok-heading-alias",
            },
          ],
        });
      }
    },
    REAL_LOCATOR_DIAGNOSTIC_TIMEOUT_MS,
  );

  it("requires the compiler version that owns byte-exact publication", () => {
    expect(
      checkDhallJsonCompilerVersion(`${dhallJsonToolchain.dhallJsonVersion}\n`),
    ).toBeUndefined();
    expect(checkDhallJsonCompilerVersion("1.7.11\n")).toContain(
      `dhall-to-json ${dhallJsonToolchain.dhallJsonVersion} is required`,
    );
  });

  it("accumulates missing, orphaned, drift, compile, and decode issues", () => {
    const contentDir = mkdtempSync(join(tmpdir(), "surface-publication-test-"));

    try {
      for (const source of [
        "missing.dhall",
        "drift.dhall",
        "compile.dhall",
        "decode.dhall",
        "generated-decode.dhall",
        "committed-decode.dhall",
        "generated-read.dhall",
        "committed-read.dhall",
      ]) {
        writeFileSync(
          join(contentDir, source),
          source.includes("decode") || source.includes("read")
            ? 'in { kind = "statBlock" }'
            : "fixture",
        );
      }
      writeFileSync(
        join(contentDir, "drift.json"),
        JSON.stringify(JSON.parse(validRecord)),
      );
      writeFileSync(join(contentDir, "decode.json"), "{}");
      writeFileSync(
        join(contentDir, "generated-decode.json"),
        validStatBlockRecord,
      );
      writeFileSync(join(contentDir, "committed-decode.json"), "{}");
      writeFileSync(
        join(contentDir, "generated-read.json"),
        validStatBlockRecord,
      );
      writeFileSync(
        join(contentDir, "committed-read.json"),
        validStatBlockRecord,
      );
      writeFileSync(join(contentDir, "orphan.json"), "{}");

      const result = runPublicationCheck({
        repoRoot: contentDir,
        contentDir,
        compile: (sourcePath, outputPath) => {
          if (sourcePath.endsWith("compile.dhall")) {
            return "synthetic compile failure";
          }
          if (sourcePath.endsWith("generated-decode.dhall")) {
            writeFileSync(outputPath, "{}");
          } else if (sourcePath.endsWith("generated-read.dhall")) {
            writeFileSync(outputPath, validStatBlockRecord);
            rmSync(outputPath, { force: true });
          } else {
            const compiledRecord =
              sourcePath.endsWith("decode.dhall") &&
              !sourcePath.endsWith("committed-decode.dhall")
                ? "{}"
                : sourcePath.endsWith("committed-decode.dhall") ||
                    sourcePath.endsWith("committed-read.dhall")
                  ? validStatBlockRecord
                  : validRecord;
            writeFileSync(outputPath, compiledRecord);
          }
          if (sourcePath.endsWith("committed-read.dhall")) {
            rmSync(join(contentDir, "committed-read.json"), { force: true });
          }
          return undefined;
        },
      });

      const kinds = new Set(result.issues.map((issue) => issue.kind));
      expect(kinds).toEqual(
        new Set<PublicationIssue["kind"]>([
          "missing-json",
          "orphaned-json",
          "out-of-sync-json",
          "compile-failed",
          "decode-failed",
        ]),
      );
      expect(
        result.issues
          .filter((issue) => issue.kind === "decode-failed")
          .every((issue) => issue.message.length < 5000),
      ).toBe(true);
      expect(result.generatedPeerObservations).toEqual(
        expect.arrayContaining([
          {
            tag: "missing",
            recordKind: "unknown",
            sourcePath: "missing.dhall",
            peerPath: "missing.json",
          },
          {
            tag: "out-of-sync",
            recordKind: "other",
            sourcePath: "drift.dhall",
            peerPath: "drift.json",
          },
          {
            tag: "source-failed",
            reason: "compile",
            recordKind: "unknown",
            sourcePath: "compile.dhall",
            peerPath: "compile.json",
            message: "Dhall compilation failed: synthetic compile failure",
          },
          { tag: "orphaned", recordKind: "unknown", peerPath: "orphan.json" },
        ]),
      );
      expect(result.generatedPeerObservations).toEqual(
        expect.arrayContaining([
          {
            tag: "generated-peer-failed",
            reason: "decode",
            recordKind: "statBlock",
            sourcePath: "generated-decode.dhall",
            peerPath: "generated-decode.json",
            message: expect.any(String),
          },
          {
            tag: "committed-peer-failed",
            reason: "decode",
            recordKind: "statBlock",
            sourcePath: "committed-decode.dhall",
            peerPath: "committed-decode.json",
            message: expect.any(String),
          },
          {
            tag: "generated-peer-failed",
            reason: "read",
            recordKind: "statBlock",
            sourcePath: "generated-read.dhall",
            peerPath: "generated-read.json",
            message: expect.any(String),
          },
          {
            tag: "committed-peer-failed",
            reason: "read",
            recordKind: "statBlock",
            sourcePath: "committed-read.dhall",
            peerPath: "committed-read.json",
            message: expect.any(String),
          },
        ]),
      );
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
    }
  }, 30_000);

  it("detects drift in committed language-neutral artifacts", () => {
    const contentDir = mkdtempSync(join(tmpdir(), "surface-artifact-test-"));
    const publicationDir = join(contentDir, "publication");
    const publication = buildSrdSurfacePublication();
    expect(publication.tag).toBe("ok");
    if (publication.tag !== "ok") {
      throw new Error("Production Surface publication did not build");
    }

    try {
      mkdirSync(publicationDir, { recursive: true });
      for (const member of SURFACE_PUBLICATION_MEMBERS) {
        const fileName = SRD_SURFACE_PUBLICATION_FILE_NAMES[member];
        writeFileSync(
          join(publicationDir, fileName),
          publication.bytes[member],
        );
      }
      writeFileSync(
        join(publicationDir, SRD_SURFACE_PUBLICATION_FILE_NAMES.schema),
        `${readFileSync(join(publicationDir, SRD_SURFACE_PUBLICATION_FILE_NAMES.schema), "utf8")}\n`,
      );

      const result = runPublicationCheck({
        repoRoot: contentDir,
        contentDir,
        publicationDir,
        compile: () => undefined,
      });

      expect(result.issues).toEqual([
        {
          kind: "out-of-sync-publication-artifact",
          file: `publication/${SRD_SURFACE_PUBLICATION_FILE_NAMES.schema}`,
        },
      ]);
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
    }
  });

  it("accumulates generation and independently observable artifact issues", () => {
    const contentDir = mkdtempSync(join(tmpdir(), "surface-artifact-test-"));
    const publicationDir = join(contentDir, "missing-publication");

    try {
      const result = runPublicationCheck({
        repoRoot: contentDir,
        contentDir,
        publicationDir,
        publicationExcerptSource: {
          buildReferenceIndex: () => {
            throw new Error("synthetic unreadable RAW");
          },
          rulesExcerptForSection: () => {
            throw new Error("must not resolve without an index");
          },
        },
        compile: () => undefined,
      });

      expect(result.issues.map((issue) => issue.kind)).toEqual([
        "publication-generation-failed",
        "missing-publication-artifact",
        "missing-publication-artifact",
      ]);
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
    }
  });

  it("returns incomplete Stat Block parity separately from content-sync acceptance", () => {
    const contentDir = mkdtempSync(
      join(tmpdir(), "surface-parity-report-test-"),
    );

    try {
      const result = runSurfacePublicationCheck({
        repoRoot: process.cwd(),
        contentDir,
        compile: () => undefined,
      });

      expect(result.issues).toEqual([]);
      expect(result.statBlockParity.sourceCoverage.tag).toBe("complete");
      expect(result.statBlockParity.discovery.identities).toHaveLength(330);
      expect(
        result.statBlockParity.issues.filter(
          (issue) => issue.kind === "missing",
        ),
      ).toHaveLength(309);
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
    }
  });

  it("projects stat-block peers by decoded/source kind rather than filename", () => {
    const contentDir = mkdtempSync(
      join(tmpdir(), "surface-stat-block-peer-projection-test-"),
    );

    try {
      writeFileSync(
        join(contentDir, "creature.dhall"),
        `let nested = { kind = "fixed" }\nin { kind = "statBlock" }`,
      );
      writeFileSync(
        join(contentDir, "sphinx.dhall"),
        readFileSync(
          join(
            process.cwd(),
            "packages/surface/content/stat_block_sphinx_of_wonder.dhall",
          ),
          "utf8",
        ),
      );
      const result = runSurfacePublicationCheck({
        repoRoot: contentDir,
        contentDir,
        compile: (_sourcePath, outputPath) => {
          writeFileSync(outputPath, validStatBlockRecord);
          return undefined;
        },
      });

      expect(result.generatedPeerObservations).toContainEqual({
        tag: "missing",
        recordKind: "statBlock",
        sourcePath: "creature.dhall",
        peerPath: "creature.json",
      });
      expect(result.generatedPeerObservations).toContainEqual({
        tag: "missing",
        recordKind: "statBlock",
        sourcePath: "sphinx.dhall",
        peerPath: "sphinx.json",
      });
      expect(result.statBlockParity.issues).toContainEqual({
        kind: "generated-peer",
        evidence: {
          tag: "missing",
          recordKind: "statBlock",
          sourcePath: "creature.dhall",
          peerPath: "creature.json",
        },
      });
      expect(result.statBlockParity.issues).toContainEqual({
        kind: "generated-peer",
        evidence: {
          tag: "missing",
          recordKind: "statBlock",
          sourcePath: "sphinx.dhall",
          peerPath: "sphinx.json",
        },
      });
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
    }
  });
});
