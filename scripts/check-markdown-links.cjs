#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const externalDestination = /^(?:[a-z][a-z0-9+.-]*:|#)/i;
const inlineLink = /!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^)]*)?\)/g;
const referenceLink = /^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/;

function normalizedDestination(rawDestination) {
  const unwrapped = rawDestination.startsWith("<")
    ? rawDestination.slice(1, -1)
    : rawDestination;
  const withoutFragment = unwrapped.split("#", 1)[0].split("?", 1)[0];
  if (withoutFragment.length === 0) return "";
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function destinationIssue(
  root,
  sourcePath,
  rawDestination,
  exists = fs.existsSync,
) {
  const unwrapped = rawDestination.startsWith("<")
    ? rawDestination.slice(1, -1)
    : rawDestination;
  if (externalDestination.test(unwrapped)) return undefined;
  const destination = normalizedDestination(rawDestination);
  if (destination.length === 0) return undefined;
  if (path.isAbsolute(destination)) {
    return `workspace-absolute link is not portable: ${rawDestination}`;
  }
  const resolved = path.resolve(root, path.dirname(sourcePath), destination);
  return exists(resolved)
    ? undefined
    : `local link target does not exist: ${rawDestination}`;
}

function destinationsOnLine(line) {
  const destinations = [];
  for (const match of line.matchAll(inlineLink)) destinations.push(match[1]);
  const reference = line.match(referenceLink);
  if (reference !== null) destinations.push(reference[1]);
  return destinations;
}

function checkMarkdown(root, sourcePath, text) {
  const issues = [];
  let fenced = false;
  for (const [index, line] of text.split("\n").entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const destination of destinationsOnLine(line)) {
      const issue = destinationIssue(root, sourcePath, destination);
      if (issue !== undefined)
        issues.push(`${sourcePath}:${index + 1}: ${issue}`);
    }
  }
  return issues;
}

function selfTest() {
  const existing = new Set(["/repo/docs/owner.md"]);
  const exists = (candidate) => existing.has(candidate);
  assert.equal(
    destinationIssue("/repo", "README.md", "https://example.com", exists),
    undefined,
  );
  assert.equal(
    destinationIssue("/repo", "README.md", "<https://example.com>", exists),
    undefined,
  );
  assert.equal(
    destinationIssue("/repo", "README.md", "#section", exists),
    undefined,
  );
  assert.equal(
    destinationIssue("/repo", "README.md", "docs/owner.md#scope", exists),
    undefined,
  );
  assert.match(
    destinationIssue(
      "/repo",
      "README.md",
      "/workspace/repo/docs/owner.md",
      exists,
    ),
    /not portable/,
  );
  assert.match(
    destinationIssue("/repo", "README.md", "docs/missing.md", exists),
    /does not exist/,
  );
  assert.deepEqual(
    destinationsOnLine(
      "See [owner](docs/owner.md) and [web](https://example.com).",
    ),
    ["docs/owner.md", "https://example.com"],
  );
  assert.deepEqual(destinationsOnLine("[owner]: docs/owner.md"), [
    "docs/owner.md",
  ]);
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    process.stdout.write("Markdown link checker self-test passed.\n");
    return;
  }

  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const files = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter((sourcePath) => !sourcePath.startsWith(".references/"))
    .filter((sourcePath) => fs.existsSync(path.join(root, sourcePath)));
  const issues = files.flatMap((sourcePath) =>
    checkMarkdown(
      root,
      sourcePath,
      fs.readFileSync(path.join(root, sourcePath), "utf8"),
    ),
  );
  if (issues.length > 0) {
    process.stderr.write(`${issues.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Markdown links valid across ${files.length} tracked files.\n`,
  );
}

main();
