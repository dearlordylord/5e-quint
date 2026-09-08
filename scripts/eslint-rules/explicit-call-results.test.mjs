import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import ts from "typescript";
import parser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import { Linter } from "eslint";
import plugin from "./explicit-call-results.mjs";

function lint(code) {
  const filename = resolve("scripts/eslint-rules/fixture.ts");
  const options = {
    strict: true,
    noEmit: true,
    noUnusedLocals: false,
    noUnusedParameters: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) =>
    file === filename
      ? ts.createSourceFile(file, code, options.target, true)
      : getSourceFile(file, ...args);
  const program = ts.createProgram([filename], options, host);
  const messages = new Linter().verify(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: { parser, parserOptions: { programs: [program] } },
        plugins: { dnd: plugin, "@typescript-eslint": tseslint.plugin },
        rules: {
          "dnd/explicit-call-results": "error",
          "@typescript-eslint/no-unused-vars": "error",
        },
      },
    ],
    { filename },
  );
  return { messages, diagnostics: ts.getPreEmitDiagnostics(program) };
}

for (const expression of [
  "value();",
  "log();",
  "void value();",
  "(value() as number);",
  "maybe?.();",
  "new Box();",
  "tag`sample`;",
  "true ? value() : value();",
  "true && value();",
  "(value(), value());",
  "export const result = void value();",
  "for (log(); false; log()) {}",
  "const result = (value(), 1); export { result };",
]) {
  test(`rejects discarded call: ${expression}`, () => {
    const { messages } = lint(
      `declare function value(): number; declare function log(): void; declare const maybe: (() => number) | undefined; declare class Box {} declare function tag(parts: TemplateStringsArray): string; ${expression}`,
    );
    assert.ok(
      messages.some(
        (message) =>
          message.ruleId === "dnd/explicit-call-results" &&
          message.messageId === "discarded",
      ),
    );
  });
}

test("accepts used results and explicit typed discards without weakening unused-variable checks", () => {
  const result = lint(
    `declare function log(): void; declare function value(): number; const _logged: void = log(); const _count: number = value(); export const answer = value(); export function read() { return value(); }`,
  );
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.diagnostics, []);
  const unused = lint(
    `declare function value(): number; const _ignored = value();`,
  );
  assert.ok(unused.messages.some((message) => message.messageId === "untyped"));
  assert.ok(
    unused.messages.some(
      (message) => message.ruleId === "@typescript-eslint/no-unused-vars",
    ),
  );
});

test("a changed return contract fails the explicit void binding", () => {
  assert.ok(
    lint(
      `declare function log(): number; const _logged: void = log();`,
    ).diagnostics.some((d) => d.code === 2322),
  );
});

test("preserves assertion and never-returning control flow", () => {
  const { messages, diagnostics } = lint(
    `declare function ensureString(value: unknown): asserts value is string; declare function fail(): never; export function read(value: unknown) { ensureString(value); return value.toUpperCase(); } export function stop() { fail(); }`,
  );
  assert.deepEqual(messages, []);
  assert.deepEqual(diagnostics, []);
});

test("rejects discarded awaited values and contextual void callback results", () => {
  const { messages } = lint(
    `declare function value(): Promise<number>; export async function run() { await value(); } const values: number[] = []; [1].forEach(n => values.push(n));`,
  );
  assert.equal(
    messages.filter((message) => message.ruleId === "dnd/explicit-call-results")
      .length,
    3,
  );
});

for (const callback of [
  "() => value()",
  "() => { return value(); }",
  "function () { return value(); }",
]) {
  test(`rejects callback return erasure: ${callback}`, () => {
    const { messages } = lint(
      `declare function value(): number; export const callback: () => void = ${callback};`,
    );
    assert.equal(
      messages.filter(
        (message) => message.ruleId === "dnd/explicit-call-results",
      ).length,
      1,
    );
  });
}
