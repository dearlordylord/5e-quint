#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const EXPLICIT_TEST_SUPPORT_OWNERS = new Set([
  "packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts",
  "packages/battle-runtime/src/battle-runtime-test-support.ts",
]);

function isAllowedOwner(relativePath) {
  return (
    relativePath.endsWith(".test.ts") ||
    relativePath.endsWith(".test-support.ts") ||
    EXPLICIT_TEST_SUPPORT_OWNERS.has(relativePath)
  );
}

function isTestSupportSpecifier(specifier) {
  return (
    specifier === "@dnd/battle-runtime/test-support" ||
    specifier.endsWith("battle-runtime-session.test-support.ts")
  );
}

function importsTestSupport(relativePath, source) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      isTestSupportSpecifier(node.moduleSpecifier.text)
    ) {
      found = true;
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      isTestSupportSpecifier(node.arguments[0].text)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function violationFor(relativePath, source) {
  return importsTestSupport(relativePath, source) &&
    !isAllowedOwner(relativePath)
    ? `${relativePath}: Battle runtime test-support constructors may only be imported by tests and explicit test-support owners.`
    : null;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))
      ? [absolutePath]
      : [];
  });
}

function runSelfTest() {
  const packageImport =
    'import { battleRuntimeSessionForTest } from "@dnd/battle-runtime/test-support";';
  assert.equal(
    violationFor("packages/mcp/src/server.test.ts", packageImport),
    null,
  );
  assert.equal(
    violationFor(
      "packages/battle-runtime/src/battle-runtime-test-support.ts",
      'import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";',
    ),
    null,
  );
  assert.match(
    violationFor("packages/mcp/src/server.ts", packageImport) ?? "",
    /test-support constructors/,
  );
  assert.match(
    violationFor(
      "packages/app/src/entry.tsx",
      'const support = import("@dnd/battle-runtime/test-support");',
    ) ?? "",
    /test-support constructors/,
  );
}

runSelfTest();

const violations = sourceFiles(path.join(ROOT, "packages")).flatMap(
  (absolutePath) => {
    const relativePath = path
      .relative(ROOT, absolutePath)
      .replaceAll("\\", "/");
    const violation = violationFor(
      relativePath,
      fs.readFileSync(absolutePath, "utf8"),
    );
    return violation === null ? [] : [violation];
  },
);

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
}
