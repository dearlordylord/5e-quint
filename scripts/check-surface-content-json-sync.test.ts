import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  runPublicationCheck,
  type PublicationIssue,
} from "./check-surface-content-json-sync.ts";
import {
  serializeSurfacePublicationArtifact,
  SRD_SURFACE_PUBLICATION_ARTIFACTS,
  SRD_SURFACE_PUBLICATION_FILE_NAMES,
  SURFACE_PUBLICATION_MEMBERS,
} from "../packages/surface/src/surface/publication-artifacts.ts";

const validRecord = readFileSync(
  join(process.cwd(), "packages/surface/content/bless.json"),
  "utf8",
);

describe("Surface content publication checker", () => {
  it("accumulates missing, orphaned, drift, compile, and decode issues", () => {
    const contentDir = mkdtempSync(join(tmpdir(), "surface-publication-test-"));

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
  }, 30_000);

  it("detects drift in committed language-neutral artifacts", () => {
    const contentDir = mkdtempSync(join(tmpdir(), "surface-artifact-test-"));
    const publicationDir = join(contentDir, "publication");

    try {
      mkdirSync(publicationDir, { recursive: true });
      for (const member of SURFACE_PUBLICATION_MEMBERS) {
        const fileName = SRD_SURFACE_PUBLICATION_FILE_NAMES[member];
        const value = SRD_SURFACE_PUBLICATION_ARTIFACTS[member];
        writeFileSync(
          join(publicationDir, fileName),
          serializeSurfacePublicationArtifact(value),
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
});
