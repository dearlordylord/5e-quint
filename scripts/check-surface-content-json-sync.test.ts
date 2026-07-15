import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  runPublicationCheck,
  type PublicationIssue,
} from "./check-surface-content-json-sync.ts";

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
});
