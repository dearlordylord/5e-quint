import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  admitAuthoredSource,
  readAuthoredSource,
  withAuthoredSourceSnapshot,
  type AuthoredSourceAdmissionResult,
  type AuthoredSourceRole,
} from "./authored-source-admission.ts";

function admitSource<Role extends AuthoredSourceRole>(input: {
  readonly role: Role;
  readonly source: string;
}): AuthoredSourceAdmissionResult<Role> {
  return admitAuthoredSource({
    ...input,
    sourcePath: `${input.role}.ts`,
  });
}

const ROLES = [
  {
    role: "player",
    sdkSpecifier: "@dnd/player-sdk",
    declaration: "PlayerContinuation",
  },
  {
    role: "scenarioCharacter",
    sdkSpecifier: "@dnd/scenario-character-sdk",
    declaration: "ScenarioCharacters",
  },
  {
    role: "scenarioSetup",
    sdkSpecifier: "@dnd/scenario-setup-sdk",
    declaration: "ScenarioSetup",
  },
] as const satisfies readonly {
  readonly role: AuthoredSourceRole;
  readonly sdkSpecifier: string;
  readonly declaration: string;
}[];

const FORBIDDEN_MODULE_EDGES = [
  {
    edge: "valueImport",
    source: (sdkSpecifier: string) =>
      `import { operation } from ${JSON.stringify(sdkSpecifier)};`,
  },
  {
    edge: "sideEffectImport",
    source: (sdkSpecifier: string) => `import ${JSON.stringify(sdkSpecifier)};`,
  },
  {
    edge: "exportFrom",
    source: (sdkSpecifier: string) =>
      `export type { PublicType } from ${JSON.stringify(sdkSpecifier)};`,
  },
  {
    edge: "importEquals",
    source: (sdkSpecifier: string) =>
      `import sdk = require(${JSON.stringify(sdkSpecifier)});`,
  },
  {
    edge: "importType",
    source: (sdkSpecifier: string) =>
      `type Imported = import(${JSON.stringify(sdkSpecifier)}).PublicType;`,
  },
  {
    edge: "importType",
    source: (sdkSpecifier: string) =>
      `type Imported = typeof import(${JSON.stringify(sdkSpecifier)});`,
  },
  {
    edge: "importType",
    source: (sdkSpecifier: string) =>
      `/** @import { PublicType } from ${JSON.stringify(sdkSpecifier)} */\nconst value = {};`,
  },
  {
    edge: "dynamicImport",
    source: (sdkSpecifier: string) =>
      `void import(${JSON.stringify(sdkSpecifier)});`,
  },
  {
    edge: "dynamicImport",
    source: () => "void import(moduleName);",
  },
  {
    edge: "requireCall",
    source: (sdkSpecifier: string) =>
      `void require(${JSON.stringify(sdkSpecifier)});`,
  },
  {
    edge: "requireCall",
    source: () => "void require(moduleName);",
  },
] as const;

describe("authored source module-edge admission", () => {
  test.each(ROLES)(
    "$role admits only its exact static type-only SDK import and allows import.meta",
    ({ role, sdkSpecifier, declaration }) => {
      expect(
        admitSource({
          role,
          source: `import type { ${declaration} } from ${JSON.stringify(sdkSpecifier)};\nvoid import.meta.url;`,
        }),
      ).toMatchObject({ tag: "admitted", role });
    },
  );

  test.each(ROLES)(
    "$role rejects every ImportKeyword meta-property except import.meta",
    ({ role }) => {
      for (const metaProperty of ["defer", "source", "future"] as const) {
        expect(
          admitSource({
            role,
            source: `void import.${metaProperty}(moduleName);`,
          }),
        ).toMatchObject({
          tag: "rejected",
          issues: [{ tag: "forbiddenModuleEdge", edge: "dynamicImport" }],
        });
      }
    },
  );

  test.each(
    ROLES.flatMap(({ role, sdkSpecifier }) =>
      FORBIDDEN_MODULE_EDGES.map(({ edge, source }) => ({
        role,
        edge,
        source: source(sdkSpecifier),
      })),
    ),
  )("$role rejects $edge", ({ role, edge, source }) => {
    expect(admitSource({ role, source })).toMatchObject({
      tag: "rejected",
      issues: [{ tag: "forbiddenModuleEdge", edge }],
    });
  });

  test.each(ROLES)(
    "$role rejects another role's SDK and every other module specifier",
    ({ role, sdkSpecifier }) => {
      const wrongRoleSpecifier = ROLES.find(
        (candidate) => candidate.sdkSpecifier !== sdkSpecifier,
      )?.sdkSpecifier;
      expect(wrongRoleSpecifier).toBeDefined();
      for (const actualSpecifier of [
        wrongRoleSpecifier,
        "./neighbor.ts",
        "node:fs",
        "some-package",
      ]) {
        expect(
          admitSource({
            role,
            source: `import type { PublicType } from ${JSON.stringify(actualSpecifier)};`,
          }),
        ).toMatchObject({
          tag: "rejected",
          issues: [
            {
              tag: "unavailableModuleSpecifier",
              expectedSpecifier: sdkSpecifier,
              actualSpecifier,
            },
          ],
        });
      }
    },
  );

  test.each(ROLES)("$role rejects malformed source", ({ role }) => {
    expect(
      admitSource({ role, source: "export const broken = ;" }),
    ).toMatchObject({
      tag: "rejected",
      issues: [{ tag: "malformedSource" }],
    });
  });

  test.each(ROLES)(
    "$role rejects triple-slash path, types, and lib references",
    ({ role }) => {
      const result = admitSource({
        role,
        source: [
          '/// <reference path="./neighbor.ts" />',
          '/// <reference types="node" />',
          '/// <reference lib="es2022" />',
          "export {};",
        ].join("\n"),
      });
      expect(result).toMatchObject({
        tag: "rejected",
        issues: [
          { tag: "tripleSlashReference", reference: "path" },
          { tag: "tripleSlashReference", reference: "types" },
          { tag: "tripleSlashReference", reference: "lib" },
        ],
      });
    },
  );

  test.each(ROLES)(
    "$role rejects JSDoc import types",
    ({ role, sdkSpecifier }) => {
      expect(
        admitSource({
          role,
          source: `/** @type {import(${JSON.stringify(sdkSpecifier)}).PublicType} */\nconst value = {};`,
        }),
      ).toMatchObject({
        tag: "rejected",
        issues: [{ tag: "forbiddenModuleEdge", edge: "importType" }],
      });
    },
  );

  test("returns unreadable source as a typed issue", () => {
    expect(
      readAuthoredSource({
        role: "player",
        sourcePath: resolve(tmpdir(), "missing-authored-source.ts"),
      }),
    ).toMatchObject({
      tag: "rejected",
      issues: [{ tag: "unreadableSource" }],
    });
  });

  test("reads and returns the exact admitted direct source", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "dnd-authored-source-"));
    const sourcePath = resolve(directory, "attempt.ts");
    const source =
      'import type { PlayerContinuation } from "@dnd/player-sdk";\nexport {};\n';
    writeFileSync(sourcePath, source);
    try {
      expect(readAuthoredSource({ role: "player", sourcePath })).toMatchObject({
        tag: "admitted",
        role: "player",
        sourcePath,
        source,
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("materializes the admitted bytes independently of later source-path changes", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "dnd-authored-snapshot-"));
    const sourcePath = resolve(directory, "attempt.ts");
    const source =
      'import type { PlayerContinuation } from "@dnd/player-sdk";\nexport {};\n';
    writeFileSync(sourcePath, source);
    try {
      const admitted = readAuthoredSource({ role: "player", sourcePath });
      expect(admitted.tag).toBe("admitted");
      if (admitted.tag !== "admitted") return;
      writeFileSync(sourcePath, "REPLACED\n");
      let observed: { source: string; materializedSource: string } | undefined;
      withAuthoredSourceSnapshot(admitted, (snapshot) => {
        observed = {
          source: snapshot.source,
          materializedSource: readFileSync(snapshot.sourcePath, "utf8"),
        };
      });
      expect(observed).toEqual({
        source,
        materializedSource: source,
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
