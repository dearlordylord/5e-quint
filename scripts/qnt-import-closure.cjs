const fs = require("node:fs");
const path = require("node:path");

const IMPORT_RE = /from "((?:\.\/|\.\.\/)[A-Za-z0-9/\-]+)"/g;
const RUN_RE = /^\s*run\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;

function toRepoPath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function repoPathToFile(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function listQntFiles(directory, options = {}) {
  if (!fs.existsSync(directory)) return [];
  const recursive = options.recursive ?? true;
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".worktrees") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && recursive) files.push(...listQntFiles(full, options));
    if (entry.isFile() && entry.name.endsWith(".qnt")) files.push(full);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function dependenciesOf(file) {
  if (!fs.existsSync(file)) return [];
  const source = fs.readFileSync(file, "utf8");
  return Array.from(source.matchAll(IMPORT_RE), (match) =>
    path.resolve(path.dirname(file), match[1] + ".qnt"),
  );
}

function importClosure(rootFile) {
  const seen = new Set();
  const stack = [rootFile];
  while (stack.length > 0) {
    const file = stack.pop();
    if (file === undefined || seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    stack.push(...dependenciesOf(file));
  }
  return seen;
}

function physicalLineCount(file) {
  const source = fs.readFileSync(file, "utf8");
  if (source.length === 0) return 0;
  const splitLines = source.split(/\r?\n/).length;
  return source.endsWith("\n") ? splitLines - 1 : splitLines;
}

function closureLineCount(files) {
  let count = 0;
  for (const file of files) count += physicalLineCount(file);
  return count;
}

function runNames(source, prefix) {
  return Array.from(source.matchAll(RUN_RE), (match) => match[1]).filter(
    (name) => prefix === undefined || name.startsWith(prefix),
  );
}

function discoverRunBlockRoots(directory, options = {}) {
  return listQntFiles(directory, { recursive: options.recursive ?? false }).filter(
    (file) => runNames(fs.readFileSync(file, "utf8"), options.prefix).length > 0,
  );
}

function pureVocabularyLeafIssues(root, relativePath, rationale) {
  const file = repoPathToFile(root, relativePath);
  const issues = [];
  if (!rationale || rationale.trim().length === 0) {
    issues.push(`${relativePath}: pure vocabulary leaf entry must include a rationale.`);
  }
  if (!fs.existsSync(file)) {
    issues.push(`${relativePath}: configured pure vocabulary leaf does not exist.`);
    return issues;
  }
  if (dependenciesOf(file).length > 0) {
    issues.push(`${relativePath}: pure vocabulary leaf must not import other modules.`);
  }
  const source = fs.readFileSync(file, "utf8");
  for (const [label, pattern] of [
    ["var", /^\s*var\b/m],
    ["action", /^\s*action\b/m],
    ["run", /^\s*run\b/m],
  ]) {
    if (pattern.test(source)) {
      issues.push(`${relativePath}: pure vocabulary leaf must not contain ${label} declarations.`);
    }
  }
  return issues;
}

module.exports = {
  closureLineCount,
  dependenciesOf,
  discoverRunBlockRoots,
  importClosure,
  listQntFiles,
  physicalLineCount,
  pureVocabularyLeafIssues,
  repoPathToFile,
  runNames,
  toRepoPath,
};
