#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".turbo",
  ".worktrees",
  "dist",
  "node_modules",
]);

const EXPLICIT_QNT_ROOTS = new Map([
  [
    "packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt",
    "unreferenced MBT driver inventory debt; keep explicit until promoted to a TS replay test",
  ],
  [
    "packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt",
    "unreferenced route MBT driver inventory debt; keep explicit until promoted to a TS replay test",
  ],
]);

const runBlockPattern = /^[ \t]*run\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;
const importPattern = /^\s*import\s+[^\n]*?\s+from\s+"([^"]+)"/gm;
const qntPathInScriptPattern =
  /(?:^|\s)(?:"([^"]+\.qnt)"|'([^']+\.qnt)'|([^\s"'`]+\.qnt))/g;

function listPackageJsonFiles() {
  return fs
    .readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PACKAGES_ROOT, entry.name, "package.json"))
    .filter((filePath) => fs.existsSync(filePath))
    .sort();
}

function readPackage(packageJsonPath) {
  const json = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return {
    name: json.name,
    root: path.dirname(packageJsonPath),
    scripts: json.scripts ?? {},
  };
}

function listFiles(directory, predicate) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (SKIPPED_DIRECTORIES.has(entry.name)) return [];
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(absolutePath, predicate);
    return entry.isFile() && predicate(absolutePath) ? [absolutePath] : [];
  });
}

function toRepoPath(absolutePath) {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
}

function packageForAbsolutePath(packages, absolutePath) {
  return packages.find((pkg) => {
    const relativePath = path.relative(pkg.root, absolutePath);
    return (
      relativePath !== "" &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath)
    );
  });
}

function readQntFiles() {
  return new Map(
    listFiles(PACKAGES_ROOT, (filePath) => filePath.endsWith(".qnt"))
      .map(toRepoPath)
      .sort((left, right) => left.localeCompare(right))
      .map((repoPath) => [
        repoPath,
        fs.readFileSync(path.join(REPO_ROOT, repoPath), "utf8"),
      ]),
  );
}

function runNames(source) {
  const names = [];
  for (const match of source.matchAll(runBlockPattern)) names.push(match[1]);
  return names;
}

function hasSupportedRunBlockProof(repoPath, source) {
  const names = runNames(source);
  if (names.length === 0) return false;
  if (repoPath.startsWith("packages/shared-algebras/proofs/")) return true;
  if (isPackageRootQnt(repoPath, "battle-runtime")) {
    return names.some((name) => name.startsWith("test_"));
  }
  if (isPackageRootQnt(repoPath, "character-creation-runtime")) {
    return names.some((name) => name.startsWith("test_"));
  }
  return false;
}

function isPackageRootQnt(repoPath, packageName) {
  const prefix = `packages/${packageName}/`;
  if (!repoPath.startsWith(prefix)) return false;
  return !repoPath.slice(prefix.length).includes("/");
}

function isSharedInductiveProof(repoPath) {
  return (
    repoPath.startsWith("packages/shared-algebras/proofs/") &&
    repoPath.endsWith("-inductive.qnt")
  );
}

function resolveImport(importerRepoPath, importPath, qntPaths) {
  if (!importPath.startsWith(".")) return { tag: "external" };

  let resolved = path
    .normalize(path.join(path.dirname(importerRepoPath), importPath))
    .split(path.sep)
    .join("/");
  if (!resolved.endsWith(".qnt")) resolved = `${resolved}.qnt`;

  if (!qntPaths.has(resolved)) {
    return { tag: "missing", path: resolved };
  }

  return { tag: "resolved", path: resolved };
}

function importsFor(repoPath, source, qntPaths) {
  const resolvedImports = [];
  const missingImports = [];

  for (const match of source.matchAll(importPattern)) {
    const resolved = resolveImport(repoPath, match[1], qntPaths);
    if (resolved.tag === "resolved") resolvedImports.push(resolved.path);
    if (resolved.tag === "missing") missingImports.push(resolved.path);
  }

  return { resolvedImports, missingImports };
}

function qntPathsReferencedByPackageScripts(packages, qntPaths) {
  const referenced = new Map();

  for (const pkg of packages) {
    for (const [scriptName, command] of Object.entries(pkg.scripts)) {
      for (const match of command.matchAll(qntPathInScriptPattern)) {
        const rawPath = match[1] ?? match[2] ?? match[3];
        const absolutePath = path.isAbsolute(rawPath)
          ? rawPath
          : path.join(pkg.root, rawPath);
        const repoPath = toRepoPath(absolutePath);
        if (!qntPaths.has(repoPath)) continue;
        if (!referenced.has(repoPath)) referenced.set(repoPath, []);
        referenced.get(repoPath).push(`${pkg.name} ${scriptName}`);
      }
    }
  }

  return referenced;
}

function qntPathsReferencedBySourceFiles(packages, qntPaths) {
  const referenced = new Map();
  const sourceFiles = listFiles(PACKAGES_ROOT, (filePath) =>
    /\.(?:cjs|mjs|tsx?|jsx?)$/.test(filePath),
  );

  for (const absolutePath of sourceFiles) {
    const source = fs.readFileSync(absolutePath, "utf8");
    for (const match of source.matchAll(qntPathInScriptPattern)) {
      const rawPath = match[1] ?? match[2] ?? match[3];
      for (const repoPath of resolveQntReference(
        packages,
        qntPaths,
        absolutePath,
        rawPath,
      )) {
        if (!referenced.has(repoPath)) referenced.set(repoPath, []);
        referenced.get(repoPath).push(toRepoPath(absolutePath));
      }
    }
  }

  return referenced;
}

function resolveQntReference(packages, qntPaths, sourceAbsolutePath, rawPath) {
  const candidates = [];
  if (path.isAbsolute(rawPath)) {
    candidates.push(toRepoPath(rawPath));
  } else if (rawPath.startsWith(".")) {
    candidates.push(
      toRepoPath(path.join(path.dirname(sourceAbsolutePath), rawPath)),
    );
  } else if (rawPath.startsWith("packages/")) {
    candidates.push(rawPath);
  } else {
    const pkg = packageForAbsolutePath(packages, sourceAbsolutePath);
    if (pkg != null) {
      candidates.push(toRepoPath(path.join(pkg.root, rawPath)));
      for (const qntPath of qntPaths) {
        if (
          qntPath.startsWith(toRepoPath(pkg.root) + "/") &&
          path.basename(qntPath) === rawPath
        ) {
          candidates.push(qntPath);
        }
      }
    }
  }

  return [...new Set(candidates)].filter((repoPath) => qntPaths.has(repoPath));
}

function mergeReferences(...referenceMaps) {
  const merged = new Map();
  for (const references of referenceMaps) {
    for (const [repoPath, owners] of references) {
      if (!merged.has(repoPath)) merged.set(repoPath, []);
      merged.get(repoPath).push(...owners);
    }
  }
  return merged;
}

function qntRole(repoPath, source, qntReferences) {
  if (repoPath.endsWith(".mbt.qnt") && qntReferences.has(repoPath)) {
    return "referenced-mbt-driver";
  }
  if (isSharedInductiveProof(repoPath)) return "shared-inductive-proof";
  if (hasSupportedRunBlockProof(repoPath, source)) return "run-block-proof";
  if (qntReferences.has(repoPath)) return "package-or-source-referenced-qnt";
  if (EXPLICIT_QNT_ROOTS.has(repoPath)) return "explicit-qnt-root";
  return null;
}

function reachableFrom(roots, importsByPath) {
  const reachable = new Set(roots);
  const stack = [...roots];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const imported of importsByPath.get(current) ?? []) {
      if (reachable.has(imported)) continue;
      reachable.add(imported);
      stack.push(imported);
    }
  }

  return reachable;
}

function groupByRole(classifications) {
  const counts = new Map();
  for (const role of classifications.values()) {
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

const packages = listPackageJsonFiles().map(readPackage);
const qntSources = readQntFiles();
const qntPaths = new Set(qntSources.keys());
const scriptReferences = qntPathsReferencedByPackageScripts(packages, qntPaths);
const sourceReferences = qntPathsReferencedBySourceFiles(packages, qntPaths);
const qntReferences = mergeReferences(scriptReferences, sourceReferences);

const staleExplicitEntries = [...EXPLICIT_QNT_ROOTS.keys()].filter(
  (repoPath) => !qntPaths.has(repoPath),
);

const missingImportsByPath = new Map();
const importsByPath = new Map();
for (const [repoPath, source] of qntSources) {
  const { resolvedImports, missingImports } = importsFor(
    repoPath,
    source,
    qntPaths,
  );
  importsByPath.set(repoPath, resolvedImports);
  if (missingImports.length > 0)
    missingImportsByPath.set(repoPath, missingImports);
}

const rootClassifications = new Map();
for (const [repoPath, source] of qntSources) {
  const role = qntRole(repoPath, source, qntReferences);
  if (role != null) rootClassifications.set(repoPath, role);
}

const executableRoots = [...rootClassifications.keys()];
const reachable = reachableFrom(executableRoots, importsByPath);

const unsupportedRunBlockFiles = [...qntSources.entries()]
  .filter(([repoPath, source]) => {
    if (runNames(source).length === 0) return false;
    return (
      !hasSupportedRunBlockProof(repoPath, source) &&
      !rootClassifications.has(repoPath)
    );
  })
  .map(([repoPath]) => repoPath);

const orphanFiles = [...qntSources.keys()].filter(
  (repoPath) => !reachable.has(repoPath),
);

const findings = [];
if (staleExplicitEntries.length > 0) {
  findings.push({
    title: "Explicit QNT classifications reference missing files",
    paths: staleExplicitEntries,
  });
}

if (missingImportsByPath.size > 0) {
  findings.push({
    title: "QNT files import missing relative modules",
    paths: [...missingImportsByPath.entries()].flatMap(([repoPath, missing]) =>
      missing.map((missingPath) => `${repoPath} -> ${missingPath}`),
    ),
  });
}

if (unsupportedRunBlockFiles.length > 0) {
  findings.push({
    title:
      "QNT files contain run blocks outside a discovered proof lane or package script",
    paths: unsupportedRunBlockFiles.sort((left, right) =>
      left.localeCompare(right),
    ),
  });
}

if (orphanFiles.length > 0) {
  findings.push({
    title:
      "QNT files are not executable roots and are not imported by any executable QNT root",
    paths: orphanFiles.sort((left, right) => left.localeCompare(right)),
  });
}

if (findings.length > 0) {
  console.error(
    "QNT inventory check failed. Every packages/**/*.qnt file must be an " +
      "executable root or imported by one. Executable roots are MBT drivers, " +
      "discovered run-block proof files, shared inductive proofs, QNT files " +
      "referenced by package/source files, or explicit QNT root classifications.",
  );
  for (const finding of findings) {
    console.error(`\n${finding.title}:`);
    for (const repoPath of finding.paths) console.error(`  - ${repoPath}`);
  }
  process.exit(1);
}

console.log("QNT inventory check passed.");
console.log(`- ${qntSources.size} QNT files`);
console.log(`- ${reachable.size} files reachable from executable QNT roots`);
for (const [role, count] of groupByRole(rootClassifications)) {
  console.log(`- ${count} ${role}`);
}
