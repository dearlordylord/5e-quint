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
const require = createRequire(import.meta.url);
// These publication integration checks include full-RAW-corpus and byte-exact
// work; runtime varies with normal parallel workspace resource contention, so
// give all three one shared timeout with adequate headroom.
const SURFACE_PUBLICATION_INTEGRATION_TIMEOUT_MS = 90_000;

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
    SURFACE_PUBLICATION_INTEGRATION_TIMEOUT_MS,
  );

  it("requires the compiler version that owns byte-exact publication", () => {
    expect(
      checkDhallJsonCompilerVersion(`${dhallJsonToolchain.dhallJsonVersion}\n`),
    ).toBeUndefined();
    expect(checkDhallJsonCompilerVersion("1.7.11\n")).toContain(
      `dhall-to-json ${dhallJsonToolchain.dhallJsonVersion} is required`,
    );
  });

  it(
    "accumulates missing, orphaned, drift, compile, and decode issues",
    () => {
      const contentDir = mkdtempSync(
        join(tmpdir(), "surface-publication-test-"),
      );

      try {
        for (const source of [
          "missing.dhall",
          "drift.dhall",
          "compile.dhall",
          "decode.dhall",
        ]) {
          writeFileSync(join(contentDir, source), "fixture");
        }
        writeFileSync(
          join(contentDir, "drift.json"),
          JSON.stringify(JSON.parse(validRecord)),
        );
        writeFileSync(join(contentDir, "decode.json"), "{}");
        writeFileSync(join(contentDir, "orphan.json"), "{}");

        const result = runPublicationCheck({
          repoRoot: contentDir,
          contentDir,
          compile: (sourcePath, outputPath) => {
            if (sourcePath.endsWith("compile.dhall")) {
              return "synthetic compile failure";
            }
            writeFileSync(
              outputPath,
              sourcePath.endsWith("decode.dhall") ? "{}" : validRecord,
            );
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
      } finally {
        rmSync(contentDir, { force: true, recursive: true });
      }
    },
    SURFACE_PUBLICATION_INTEGRATION_TIMEOUT_MS,
  );

  it(
    "detects drift in committed language-neutral artifacts",
    () => {
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
    },
    SURFACE_PUBLICATION_INTEGRATION_TIMEOUT_MS,
  );

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
});
