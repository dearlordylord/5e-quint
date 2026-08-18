import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { writePublicSdkTypeHelpArtifact } from "./public-sdk-type-help-artifact.ts";
import {
  PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES,
  PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES,
  publicSdkTypeHelp,
} from "./public-sdk-type-help.ts";

const temporaryDirectories: string[] = [];

function fixture(): {
  readonly root: string;
  readonly declarations: string;
  readonly config: string;
  readonly output: string;
} {
  const root = mkdtempSync(join(tmpdir(), "raw-swarm-type-help-"));
  temporaryDirectories.push(root);
  const declarations = join(root, "declarations");
  const battleRuntime = join(declarations, "packages/battle-runtime/src");
  mkdirSync(battleRuntime, { recursive: true });
  writeFileSync(
    join(battleRuntime, "index.d.ts"),
    `export type ChoiceId = "one" | "two";
export type Outcome = {
  readonly targetId: string;
  readonly succeeded: boolean;
  readonly choiceId: ChoiceId;
};
export type Wrapper<T> = { readonly value: T };
export type SaveValue = {
  readonly outcomes: readonly Wrapper<Outcome>[];
};
export type OptionalDetail = {
  readonly next: OptionalDetailTwo;
};
export type OptionalDetailTwo = { readonly next: OptionalDetailThree };
export type OptionalDetailThree = { readonly next: OptionalDetailFour };
export type OptionalDetailFour = { readonly next: OptionalDetailFive };
export type OptionalDetailFive = { readonly next: OptionalDetailSix };
export type OptionalDetailSix = { readonly next: OptionalDetailSeven };
export type OptionalDetailSeven = { readonly next: OptionalDetailEight };
export type OptionalDetailEight = { readonly tableOwned: string };
export type BattleFill =
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: string;
      readonly value: SaveValue;
      readonly optionalDetail?: OptionalDetail;
      readonly optionalExtract?: Extract<ChoiceId, "one">;
    }
  | {
      readonly kind: "damageTypeChoice";
      readonly holeId: string;
      readonly value: "fire" | "cold";
    };
`,
  );
  const config = join(root, "tsconfig.json");
  writeFileSync(
    config,
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
      },
      include: [],
    })}\n`,
  );
  return {
    root,
    declarations,
    config,
    output: join(root, "FILL_TYPES.json"),
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("public SDK type help", () => {
  test("derives bounded fill declarations from the public declaration graph", () => {
    const paths = fixture();
    const artifact = writePublicSdkTypeHelpArtifact({
      destination: paths.output,
      declarationsDirectory: paths.declarations,
      configPath: paths.config,
    });

    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.declarationGraphSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(artifact.entriesSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(artifact.entries.map(({ fillKind }) => fillKind)).toEqual([
      "damageTypeChoice",
      "savingThrowOutcome",
    ]);
    const save = publicSdkTypeHelp(
      artifact,
      "savingThrowOutcome",
      artifact.declarationGraphSha256,
    );
    expect(save).toMatchObject({ tag: "found" });
    if (save.tag !== "found") return;
    expect(save.declaration).toContain('readonly kind: "savingThrowOutcome"');
    expect(save.declaration).toContain("type SaveValue =");
    expect(save.declaration).toContain("type Outcome =");
    expect(save.declaration).toContain('type ChoiceId = "one" | "two"');
    expect(save.declaration).toContain("type Wrapper<T> =");
    expect(save.declaration).not.toContain("type Extract =");
    expect(save.declaration).toContain(
      "readonly optionalDetail?: OptionalDetail",
    );
    expect(save.declaration).toContain("type OptionalDetail =");
    expect(save.declaration).toContain("type OptionalDetailEight =");
    expect(Buffer.byteLength(save.declaration)).toBeLessThanOrEqual(
      PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES,
    );
    expect(
      artifact.entries.reduce((total, entry) => total + entry.byteLength, 0),
    ).toBeLessThanOrEqual(PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES);
    expect(JSON.parse(readFileSync(paths.output, "utf8"))).toEqual(artifact);
  });

  test("rejects unknown kinds and contradictory artifacts", () => {
    const paths = fixture();
    const artifact = writePublicSdkTypeHelpArtifact({
      destination: paths.output,
      declarationsDirectory: paths.declarations,
      configPath: paths.config,
    });

    expect(
      publicSdkTypeHelp(
        artifact,
        "rolledDice",
        artifact.declarationGraphSha256,
      ),
    ).toEqual({
      tag: "unknownFillKind",
      message: "Unknown BattleFill kind: rolledDice.",
    });
    expect(
      publicSdkTypeHelp(artifact, "savingThrowOutcome", "0".repeat(64)),
    ).toEqual({
      tag: "invalidArtifact",
      message: "Public SDK type-help declaration graph hash does not match.",
    });
    expect(
      publicSdkTypeHelp(
        { ...artifact, declarationGraphSha256: "not-a-hash" },
        "savingThrowOutcome",
        artifact.declarationGraphSha256,
      ),
    ).toEqual({
      tag: "invalidArtifact",
      message: "Public SDK type-help artifact has an invalid envelope.",
    });
    expect(
      publicSdkTypeHelp(
        {
          ...artifact,
          entries: artifact.entries.map((entry, index) => {
            if (index !== 0) return entry;
            const replacement = entry.declaration.startsWith("t") ? "u" : "t";
            return {
              ...entry,
              declaration: `${replacement}${entry.declaration.slice(1)}`,
            };
          }),
        },
        "savingThrowOutcome",
        artifact.declarationGraphSha256,
      ),
    ).toEqual({
      tag: "invalidArtifact",
      message: "Public SDK type-help entries hash does not match.",
    });
    expect(
      publicSdkTypeHelp(
        { ...artifact, entries: [...artifact.entries, artifact.entries[0]] },
        "savingThrowOutcome",
        artifact.declarationGraphSha256,
      ),
    ).toEqual({
      tag: "invalidArtifact",
      message: "Public SDK type-help artifact repeats damageTypeChoice.",
    });
  });
});
