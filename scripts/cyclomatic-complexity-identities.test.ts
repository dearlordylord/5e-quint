import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { complexityIdentityResolver } from "./cyclomatic-complexity-identities.mjs";

const temporaryDirectories: string[] = [];

function sourceFixture(source: string) {
  const directory = mkdtempSync(join(tmpdir(), "dnd-complexity-identity-"));
  temporaryDirectories.push(directory);
  const filename = join(directory, "fixture.ts");
  writeFileSync(filename, source);
  return filename;
}

function diagnosticAt(source: string, marker: string) {
  const offset = source.indexOf(marker);
  if (offset < 0) throw new Error(`Missing diagnostic marker: ${marker}`);
  const prefix = source.slice(0, offset);
  const lines = prefix.split("\n");
  return { line: lines.length, column: lines.at(-1)!.length + 1 };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("cyclomatic complexity function identities", () => {
  test("a named function keeps its identity when surrounding lines move", () => {
    const compact = "export function resolveTurn() {\n  return true;\n}\n";
    const shifted =
      "// unrelated module documentation\n\nexport function resolveTurn() {\n  return true;\n}\n";

    const compactIdentity = complexityIdentityResolver()(
      sourceFixture(compact),
      diagnosticAt(compact, "return true"),
    );
    const shiftedIdentity = complexityIdentityResolver()(
      sourceFixture(shifted),
      diagnosticAt(shifted, "return true"),
    );

    expect(shiftedIdentity).toBe(compactIdentity);
    expect(compactIdentity).toBe("module/binding:resolveTurn");
  });

  test("anonymous callback identities include their operation and selector", () => {
    const source = `
export function classify(value: number) {
  return Match.value(value).pipe(
    Match.when(1, () => "first-marker"),
    Match.when(2, () => "second-marker"),
    Match.exhaustive,
  );
}
`;
    const resolveIdentity = complexityIdentityResolver();
    const filename = sourceFixture(source);

    const first = resolveIdentity(
      filename,
      diagnosticAt(source, '"first-marker"'),
    );
    const second = resolveIdentity(
      filename,
      diagnosticAt(source, '"second-marker"'),
    );

    expect(first).toContain(
      "module/binding:classify/call:Match.when:argument-1",
    );
    expect(first).not.toBe(second);
  });

  test("same-named methods retain distinct lexical class owners", () => {
    const source = `
class FirstResolver {
  resolve() { return "first-marker"; }
}
class SecondResolver {
  resolve() { return "second-marker"; }
}
`;
    const resolveIdentity = complexityIdentityResolver();
    const filename = sourceFixture(source);

    const first = resolveIdentity(
      filename,
      diagnosticAt(source, '"first-marker"'),
    );
    const second = resolveIdentity(
      filename,
      diagnosticAt(source, '"second-marker"'),
    );

    expect(first).toBe("module/owner:class:FirstResolver/binding:resolve");
    expect(second).toBe("module/owner:class:SecondResolver/binding:resolve");
    expect(first).not.toBe(second);
  });

  test("class expressions include their containing property paths", () => {
    const source = `
const resolvers = {
  first: class Worker { resolve() { return "first-marker"; } },
  second: class Worker { resolve() { return "second-marker"; } },
};
`;
    const resolveIdentity = complexityIdentityResolver();
    const filename = sourceFixture(source);

    const first = resolveIdentity(
      filename,
      diagnosticAt(source, '"first-marker"'),
    );
    const second = resolveIdentity(
      filename,
      diagnosticAt(source, '"second-marker"'),
    );

    expect(first).toContain("owner:property:first/owner:class:Worker");
    expect(second).toContain("owner:property:second/owner:class:Worker");
    expect(first).not.toBe(second);
  });

  test("named function expressions include their containing property paths", () => {
    const source = `
const resolvers = {
  first: function Worker() { return "first-marker"; },
  second: function Worker() { return "second-marker"; },
};
`;
    const resolveIdentity = complexityIdentityResolver();
    const filename = sourceFixture(source);

    const first = resolveIdentity(
      filename,
      diagnosticAt(source, '"first-marker"'),
    );
    const second = resolveIdentity(
      filename,
      diagnosticAt(source, '"second-marker"'),
    );

    expect(first).toContain("owner:property:first/binding:Worker");
    expect(second).toContain("owner:property:second/binding:Worker");
    expect(first).not.toBe(second);
  });
});
