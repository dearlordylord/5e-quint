const assert = require("node:assert/strict");
const {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} = require("node:fs");
const {
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep,
} = require("node:path");

const {
  CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS,
  CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS,
  CODING_AGENT_EXECUTABLES,
  DETERMINISTIC_BLOCKED_EXECUTABLES,
  DETERMINISTIC_NETWORK_GLOBALS,
  DETERMINISTIC_NETWORK_MODULES,
  DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_ENTRYPOINTS,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
  MODEL_BACKED_SOURCE_FILES,
  NETWORK_CLI_EXECUTABLES,
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
  RAW_SWARM_TESTS_OUTSIDE_QUALITY,
  SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS,
  isSupportedVitestTestFilename,
} = require("./lane-classification.cjs");

const root = resolve(__dirname, "../..");
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() && entry.name !== "node_modules"
      ? filesBelow(path)
      : entry.isDirectory()
        ? []
        : [path];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const codingAgentAlternation =
  CODING_AGENT_EXECUTABLES.map(escapeRegExp).join("|");
const networkCliAlternation =
  NETWORK_CLI_EXECUTABLES.map(escapeRegExp).join("|");
const blockedExecutableAlternation =
  DETERMINISTIC_BLOCKED_EXECUTABLES.map(escapeRegExp).join("|");
const childProcessCallAlternation =
  "(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)";
const networkModuleAlternation =
  DETERMINISTIC_NETWORK_MODULES.map(escapeRegExp).join("|");
const networkApiAlternation = [
  ...new Set(
    DETERMINISTIC_NETWORK_MODULES.map(
      (moduleName) => moduleName.replace(/^node:/u, "").split("/")[0],
    ),
  ),
]
  .map(escapeRegExp)
  .join("|");
const browserGlobalAlternation = DETERMINISTIC_NETWORK_GLOBALS.filter(
  (name) => name !== "fetch",
)
  .map(escapeRegExp)
  .join("|");

const forbiddenCapabilityPatterns = Object.freeze([
  {
    kind: "network-module",
    pattern: new RegExp(
      String.raw`(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["'\`](${networkModuleAlternation})["'\`]`,
      "g",
    ),
  },
  {
    kind: "network-api",
    pattern: new RegExp(
      String.raw`\b(?:${networkApiAlternation})\s*\.\s*(?:request|get|fetch|createConnection|connect|lookup|resolve|createServer|createSocket)\s*\(`,
      "g",
    ),
  },
  {
    kind: "global-fetch",
    pattern: /(?:\bglobalThis\s*\.\s*fetch|\bfetch)\s*\(/g,
  },
  {
    kind: "browser-network-global",
    pattern: new RegExp(
      String.raw`\b(?:new\s+)?(?:${browserGlobalAlternation})\s*(?:\(|\[)|\b(?:globalThis|window)\s*(?:\.\s*(?:${browserGlobalAlternation})|\[\s*["'\`](?:${browserGlobalAlternation})["'\`]\s*\])`,
      "g",
    ),
  },
  {
    kind: "coding-agent-executable",
    pattern: new RegExp(
      `\\b${childProcessCallAlternation}\\s*\\(\\s*["'\`]([^"'\`\\n]*?(?:${codingAgentAlternation})(?:[/\\\\]|["'\`]|\\s))`,
      "gi",
    ),
  },
  {
    kind: "coding-agent-shell-command",
    pattern: new RegExp(
      `\\b(?:exec|execSync)\\s*\\(\\s*["'\`][^"'\`\\n]*\\b(?:${codingAgentAlternation})\\b`,
      "gi",
    ),
  },
  {
    kind: "blocked-custom-executable",
    pattern: new RegExp(
      `\\bfork\\s*\\([\\s\\S]{0,320}\\bexecPath\\s*:\\s*["'\`]([^"'\`\\n]*?(?:${blockedExecutableAlternation})[^"'\`\\n]*)["'\`]`,
      "gi",
    ),
  },
  {
    kind: "coding-agent-indirection",
    pattern: new RegExp(
      String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["'\`][^"'\`\n]*?(?:${codingAgentAlternation})(?=[/\\\s"'\`])[^"'\`\n]*["'\`]\s*;?[\s\S]{0,320}?\b${childProcessCallAlternation}\s*\(\s*\1\b`,
      "gi",
    ),
  },
  {
    kind: "network-cli-executable",
    pattern: new RegExp(
      `\\b${childProcessCallAlternation}\\s*\\(\\s*["'\`]([^"'\`\\n]*?(?:${networkCliAlternation})(?:[/\\\\]|["'\`]|\\s))`,
      "gi",
    ),
  },
  {
    kind: "network-cli-shell-command",
    pattern: new RegExp(
      `\\b${childProcessCallAlternation}\\s*\\([^\\n]{0,320}\\b(?:${networkCliAlternation})\\b`,
      "gi",
    ),
  },
  {
    kind: "blocked-executable-shell-option",
    pattern: new RegExp(
      `\\b(?:spawn|spawnSync|execFile|execFileSync)\\s*\\([\\s\\S]{0,320}\\bshell\\s*:\\s*["'\`]([^"'\`\\n]*?(?:${blockedExecutableAlternation})[^"'\`\\n]*)["'\`]`,
      "gi",
    ),
  },
]);

function deterministicCapabilityViolations(source) {
  const violations = forbiddenCapabilityPatterns.flatMap(
    ({ kind, pattern }) => {
      pattern.lastIndex = 0;
      return [...source.matchAll(pattern)].map((match) => ({
        kind,
        match: match[0].slice(0, 120),
      }));
    },
  );
  return violations.filter(
    (violation, index) =>
      violations.findIndex(
        (candidate) =>
          candidate.kind === violation.kind &&
          candidate.match === violation.match,
      ) === index,
  );
}

const importPatterns = Object.freeze([
  /\bimport\s+(?:type\s+)?(?:[^'"\n;]+?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:[^'"\n;]+?\s+from\s+)?["']([^"']+)["']/g,
  /\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/g,
]);

function importSpecifiers(source) {
  return importPatterns.flatMap((pattern) => {
    pattern.lastIndex = 0;
    return [...source.matchAll(pattern)].map((match) => match[1]);
  });
}

function stripViteImportPostfix(specifier) {
  const packageImportPrefixLength = specifier.startsWith("#") ? 1 : 0;
  const postfixIndex = specifier
    .slice(packageImportPrefixLength)
    .search(/[?#]/u);
  return postfixIndex < 0
    ? specifier
    : specifier.slice(0, packageImportPrefixLength + postfixIndex);
}

const sourceResolutionSuffixes = Object.freeze([
  "",
  ...SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS,
]);

/*
 * Vite 7's default client package-entry order. The checker deliberately keeps
 * every repository-owned candidate from this order: a static capability check
 * must remain conservative when package conditions differ between runtime
 * modes. `main` is the final fallback in Vite's resolver.
 */
const VITE7_CLIENT_PACKAGE_ENTRY_FIELDS = Object.freeze([
  "browser",
  "module",
  "jsnext:main",
  "jsnext",
  "main",
]);

function sourceCandidateObservation(path) {
  try {
    const stats = statSync(path);
    if (stats.isFile()) return { kind: "file" };
    if (stats.isDirectory()) return { kind: "directory" };
    return {
      kind: "failure",
      message: `Could not inspect deterministic source candidate ${path} (not a regular file or directory)`,
    };
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return { kind: "absent" };
    }
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? String(error.code)
        : "unknown";
    throw new Error(
      `Could not inspect deterministic source candidate ${path} (${code}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function canonicalPathForOwnership(path) {
  let candidate = resolve(path);
  const missingSegments = [];
  while (true) {
    try {
      return missingSegments.reduce(
        (canonicalPath, segment) => join(canonicalPath, segment),
        realpathSync(candidate),
      );
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        const parent = dirname(candidate);
        if (parent === candidate) return resolve(path);
        missingSegments.unshift(basename(candidate));
        candidate = parent;
        continue;
      }
      const code =
        error !== null && typeof error === "object" && "code" in error
          ? String(error.code)
          : "unknown";
      throw new Error(
        `Could not inspect deterministic source candidate ${path} (${code}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function lexicallyRepositoryOwnedPath(path) {
  const relativePath = relative(root, resolve(path));
  return (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !relativePath.split(sep).includes("node_modules")
  );
}

function sourceCandidateOwnership(path) {
  if (repositoryOwnedPath(path)) return true;
  if (lexicallyRepositoryOwnedPath(path)) {
    throw new Error(
      `Deterministic source candidate ${path} resolves outside the repository or into node_modules`,
    );
  }
  return false;
}

function supportedSourceExtension(path) {
  return SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS.find((extension) =>
    path.endsWith(extension),
  );
}

/*
 * Vite 7 source-replacement contract. The installed runtime's
 * `knownTsOutputRE` and `tryCleanFsResolve` in
 * node_modules/vite/dist/node/chunks/config.js are the authority for this
 * finite mapping. Keep it separate from the broader source inventory: a
 * supported source suffix is not, by itself, a runtime replacement.
 */
const VITE7_SOURCE_REPLACEMENT_EXTENSIONS = Object.freeze({
  ".js": Object.freeze([".ts", ".tsx"]),
  ".jsx": Object.freeze([".tsx"]),
  ".mjs": Object.freeze([".mts"]),
  ".cjs": Object.freeze([".cts"]),
});

function sourceResolutionCandidates(candidate) {
  return sourceResolutionSuffixes.flatMap((extension) => [
    `${candidate}${extension}`,
    join(candidate, `index${extension}`),
  ]);
}

function sourceReplacementFileCandidates(candidate) {
  const extension = supportedSourceExtension(candidate);
  const replacementExtensions =
    extension === undefined
      ? undefined
      : VITE7_SOURCE_REPLACEMENT_EXTENSIONS[extension];
  if (replacementExtensions === undefined) return [];
  const stem = candidate.slice(0, -extension.length);
  return replacementExtensions.map((replacement) => `${stem}${replacement}`);
}

function sourceCandidateGroupsForObservation(candidate, observation) {
  return {
    ordinaryCandidates: sourceResolutionCandidates(candidate),
    replacementFileCandidates:
      observation.kind === "absent" || observation.kind === "directory"
        ? sourceReplacementFileCandidates(candidate)
        : [],
  };
}

function sourcePathsFromResolutionCandidates(candidates, visited) {
  return [
    ...new Set(
      candidates.flatMap((path) => {
        if (!sourceCandidateOwnership(path)) return [];
        const candidateKey = canonicalPathForOwnership(path);
        if (visited.has(candidateKey)) return [];
        visited.add(candidateKey);
        const observation = sourceCandidateObservation(candidateKey);
        if (observation.kind === "failure") {
          throw new Error(observation.message);
        }
        if (observation.kind === "file") return [candidateKey];
        if (observation.kind === "directory") {
          return sourcePathsFromDirectoryCandidate(candidateKey, visited);
        }
        return [];
      }),
    ),
  ];
}

function sourcePathsFromExactFileCandidates(candidates, visited) {
  return [
    ...new Set(
      candidates.flatMap((path) => {
        if (!sourceCandidateOwnership(path)) return [];
        const candidateKey = canonicalPathForOwnership(path);
        if (visited.has(candidateKey)) return [];
        visited.add(candidateKey);
        const observation = sourceCandidateObservation(candidateKey);
        if (observation.kind === "failure") {
          throw new Error(observation.message);
        }
        return observation.kind === "file" ? [candidateKey] : [];
      }),
    ),
  ];
}

function sourcePathsFromCandidateGroups(candidateGroups, visited) {
  return [
    ...new Set([
      ...sourcePathsFromResolutionCandidates(
        candidateGroups.ordinaryCandidates,
        visited,
      ),
      ...sourcePathsFromExactFileCandidates(
        candidateGroups.replacementFileCandidates,
        visited,
      ),
    ]),
  ];
}

function readPackageManifest(path) {
  const observation = sourceCandidateObservation(path);
  if (observation.kind === "absent") return undefined;
  if (observation.kind === "failure") throw new Error(observation.message);
  try {
    const source = readFileSync(path, "utf8").replace(/^\uFEFF/u, "");
    const manifest = JSON.parse(source);
    if (
      manifest === null ||
      typeof manifest !== "object" ||
      Array.isArray(manifest)
    ) {
      throw new Error("package manifest must be a JSON object");
    }
    return manifest;
  } catch (error) {
    throw new Error(
      `Could not read deterministic package manifest ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validPackageRelativeTarget(target) {
  return (
    typeof target === "string" &&
    target.startsWith("./") &&
    !target.includes("\\") &&
    !target.split("/").includes("..")
  );
}

function assertPackageImportsValue(value, packageManifestPath) {
  if (typeof value === "string" || value === null) return;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      assertPackageImportsValue(candidate, packageManifestPath);
    }
    return;
  }
  if (typeof value === "object") {
    for (const candidate of Object.values(value)) {
      assertPackageImportsValue(candidate, packageManifestPath);
    }
    return;
  }
  throw new Error(
    `Could not resolve deterministic package imports in ${packageManifestPath}: invalid target value`,
  );
}

function targetsFromPackageMap(mapValue, requestedKey, subpathPrefix) {
  if (typeof mapValue === "string") return [mapValue];
  if (Array.isArray(mapValue)) {
    return [
      ...new Set(
        mapValue.flatMap((candidate) =>
          targetsFromPackageMap(candidate, requestedKey, subpathPrefix),
        ),
      ),
    ];
  }
  if (mapValue === null || typeof mapValue !== "object") {
    return [];
  }

  const entries = Object.entries(mapValue);
  const targets = [];
  if (Object.hasOwn(mapValue, requestedKey)) {
    targets.push(
      ...targetsFromPackageMap(
        mapValue[requestedKey],
        requestedKey,
        subpathPrefix,
      ),
    );
  } else {
    const hasSubpathEntries = entries.some(([key]) =>
      key.startsWith(subpathPrefix),
    );
    if (!hasSubpathEntries) {
      for (const value of Object.values(mapValue)) {
        targets.push(
          ...targetsFromPackageMap(value, requestedKey, subpathPrefix),
        );
      }
    }
  }
  for (const [key, value] of entries) {
    if (key.endsWith("/*") && requestedKey.startsWith(key.slice(0, -1))) {
      const suffix = requestedKey.slice(key.length - 1);
      targets.push(
        ...targetsFromPackageMap(value, requestedKey, subpathPrefix).map(
          (target) => target.replaceAll("*", suffix),
        ),
      );
    }
  }
  return [...new Set(targets)];
}

function targetsFromPackageExports(exportsValue, subpath) {
  return targetsFromPackageMap(exportsValue, subpath, ".");
}

function targetsFromPackageBrowser(browserField) {
  if (typeof browserField === "string") return [browserField];
  if (
    browserField === null ||
    typeof browserField !== "object" ||
    Array.isArray(browserField)
  ) {
    return [];
  }
  return Object.entries(browserField).flatMap(([key, value]) => [
    ...(validPackageRelativeTarget(key) ? [key] : []),
    ...(typeof value === "string" ? [value] : []),
  ]);
}

function targetsFromPackageManifest(manifest) {
  const targets = [];
  if (Object.hasOwn(manifest, "exports")) {
    targets.push(
      ...targetsFromPackageExports(manifest.exports, ".").filter(
        validPackageRelativeTarget,
      ),
    );
  }
  for (const field of VITE7_CLIENT_PACKAGE_ENTRY_FIELDS) {
    if (field === "browser") {
      targets.push(...targetsFromPackageBrowser(manifest.browser));
    } else if (typeof manifest[field] === "string" && manifest[field] !== "") {
      targets.push(manifest[field]);
    }
  }
  return [...new Set(targets)];
}

function sourcePathsFromPackageManifest(
  packageDirectory,
  manifest,
  subpath,
  visited,
) {
  const targets =
    subpath === "."
      ? targetsFromPackageManifest(manifest)
      : Object.hasOwn(manifest, "exports")
        ? targetsFromPackageExports(manifest.exports, subpath).filter(
            validPackageRelativeTarget,
          )
        : [subpath].filter(validPackageRelativeTarget);
  const sourcePaths = targets.flatMap((target) =>
    sourcePathsForPackageEntryTarget(packageDirectory, target, visited),
  );
  if (subpath !== ".") return [...new Set(sourcePaths)];
  return [
    ...new Set([
      ...sourcePaths,
      ...sourcePathsFromCandidateGroups(
        sourceCandidateGroupsForObservation(packageDirectory, {
          kind: "directory",
        }),
        visited,
      ),
    ]),
  ];
}

function sourcePathsFromPackageDirectory(directory, visited) {
  const manifestPath = join(directory, "package.json");
  const manifest = readPackageManifest(manifestPath);
  if (manifest === undefined) return { kind: "not-a-package" };
  const canonicalManifestPath = canonicalPathForOwnership(manifestPath);
  const packageDirectory = dirname(canonicalManifestPath);
  return {
    kind: "resolved",
    paths: sourcePathsFromPackageManifest(
      packageDirectory,
      manifest,
      ".",
      visited,
    ),
  };
}

function sourcePathsForPackageEntryTarget(packageDirectory, target, visited) {
  if (typeof target !== "string") return [];
  const candidate = resolve(packageDirectory, target);
  if (!sourceCandidateOwnership(candidate)) {
    throw new Error(
      `Deterministic package entry ${target} from ${packageDirectory} escapes the repository or enters node_modules`,
    );
  }
  return sourcePathsForCandidate(candidate, visited);
}

function nearestPackageManifest(sourcePath) {
  let directory = dirname(canonicalPathForOwnership(sourcePath));
  while (lexicallyRepositoryOwnedPath(directory)) {
    const manifestPath = join(directory, "package.json");
    const manifest = readPackageManifest(manifestPath);
    if (manifest !== undefined) {
      const canonicalManifestPath = canonicalPathForOwnership(manifestPath);
      return {
        manifest,
        packageDirectory: dirname(canonicalManifestPath),
        manifestPath: canonicalManifestPath,
      };
    }
    if (directory === root) break;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return undefined;
}

function sourcePathsFromPackageImports(sourcePath, specifier, visited) {
  if (!specifier.startsWith("#")) return [];
  const packageData = nearestPackageManifest(sourcePath);
  if (
    packageData === undefined ||
    !Object.hasOwn(packageData.manifest, "imports")
  ) {
    return [];
  }
  const importsValue = packageData.manifest.imports;
  if (
    importsValue === null ||
    typeof importsValue !== "object" ||
    Array.isArray(importsValue)
  ) {
    throw new Error(
      `Could not resolve deterministic package imports in ${packageData.manifestPath}: imports must be an object`,
    );
  }
  assertPackageImportsValue(importsValue, packageData.manifestPath);
  const targets = targetsFromPackageMap(importsValue, specifier, "#").filter(
    validPackageRelativeTarget,
  );
  return [
    ...new Set(
      targets.flatMap((target) =>
        sourcePathsForPackageEntryTarget(
          packageData.packageDirectory,
          target,
          visited,
        ),
      ),
    ),
  ];
}

function sourcePathsFromDirectoryCandidate(directory, visited) {
  const observation = { kind: "directory" };
  const packageResolution = sourcePathsFromPackageDirectory(directory, visited);
  if (packageResolution.kind === "resolved") return packageResolution.paths;
  return sourcePathsFromCandidateGroups(
    sourceCandidateGroupsForObservation(directory, observation),
    visited,
  );
}

function sourcePathsForCandidate(candidate, visited = new Set()) {
  if (!sourceCandidateOwnership(candidate)) return [];
  const candidateKey = canonicalPathForOwnership(candidate);
  if (visited.has(candidateKey)) return [];
  visited.add(candidateKey);
  const observation = sourceCandidateObservation(candidateKey);
  if (observation.kind === "failure") throw new Error(observation.message);
  if (observation.kind === "file") return [candidateKey];
  if (observation.kind === "absent") {
    return sourcePathsFromCandidateGroups(
      sourceCandidateGroupsForObservation(candidateKey, observation),
      visited,
    );
  }
  return sourcePathsFromDirectoryCandidate(candidateKey, visited);
}

function resolveInternalImportPaths(sourcePath, specifier, visited) {
  const candidate = resolve(dirname(sourcePath), specifier);
  if (!sourceCandidateOwnership(candidate)) {
    throw new Error(
      `Deterministic relative import ${specifier} from ${sourcePath} escapes the repository or enters node_modules`,
    );
  }
  return sourcePathsForCandidate(candidate, visited);
}

function repositoryOwnedPath(path) {
  return (
    lexicallyRepositoryOwnedPath(path) &&
    lexicallyRepositoryOwnedPath(canonicalPathForOwnership(path))
  );
}

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function sourcePathsForTarget(target, visited = new Set()) {
  if (typeof target !== "string") return [];
  const candidate = resolve(target);
  if (!sourceCandidateOwnership(candidate)) {
    throw new Error(
      `Deterministic package or alias target ${target} escapes the repository or enters node_modules`,
    );
  }
  return sourcePathsForCandidate(candidate, visited);
}

function workspacePackageRecords() {
  const packagesDirectory = join(root, "packages");
  if (!existsSync(packagesDirectory)) return new Map();
  const records = new Map();
  for (const packageJsonPath of filesBelow(packagesDirectory).filter(
    (path) => basename(path) === "package.json",
  )) {
    const canonicalManifestPath = canonicalPathForOwnership(packageJsonPath);
    if (!lexicallyRepositoryOwnedPath(canonicalManifestPath)) {
      throw new Error(
        `Workspace package manifest ${packageJsonPath} resolves outside the repository or into node_modules`,
      );
    }
    const packageJson = readPackageManifest(packageJsonPath);
    if (
      packageJson === undefined ||
      typeof packageJson.name !== "string" ||
      !packageJson.name.startsWith("@dnd/")
    ) {
      continue;
    }
    records.set(packageJson.name, {
      root: dirname(canonicalManifestPath),
      manifest: packageJson,
    });
  }
  return records;
}

const workspacePackages = workspacePackageRecords();

function workspacePackageImportPaths(specifier, visited) {
  const sourcePaths = [];
  for (const [packageName, record] of workspacePackages) {
    if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) {
      continue;
    }
    const suffix = specifier.slice(packageName.length);
    const subpath = suffix.length === 0 ? "." : `.${suffix}`;
    sourcePaths.push(
      ...sourcePathsFromPackageManifest(
        record.root,
        record.manifest,
        subpath,
        visited,
      ),
    );
  }
  return [...new Set(sourcePaths)];
}

function workspaceTsconfigPathMaps() {
  const configPaths = [
    resolve(root, "scripts/raw-swarm/sdk-player/tsconfig.json"),
    ...filesBelow(join(root, "packages")).filter(
      (path) => basename(path) === "tsconfig.json",
    ),
  ];
  return configPaths.flatMap((configPath) => {
    const config = readJsonFile(configPath);
    const paths = config?.compilerOptions?.paths;
    if (paths === null || typeof paths !== "object") return [];
    return [
      {
        directory: dirname(configPath),
        paths,
      },
    ];
  });
}

const workspaceTsconfigMaps = workspaceTsconfigPathMaps();

function pathIsInside(path, directory) {
  const relativePath = relative(directory, path);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !relativePath.startsWith(sep))
  );
}

function workspaceTsconfigImportPaths(sourcePath, specifier, visited) {
  const config = workspaceTsconfigMaps
    .filter(({ directory }) => pathIsInside(sourcePath, directory))
    .sort((left, right) => right.directory.length - left.directory.length)[0];
  if (config === undefined) return [];
  const sourcePaths = [];
  for (const [alias, targets] of Object.entries(config.paths)) {
    const aliasPrefix = alias.endsWith("/*") ? alias.slice(0, -1) : alias;
    const matches = alias.endsWith("/*")
      ? specifier.startsWith(aliasPrefix)
      : specifier === alias;
    if (!matches || !Array.isArray(targets)) continue;
    const suffix = alias.endsWith("/*")
      ? specifier.slice(aliasPrefix.length)
      : "";
    for (const target of targets) {
      if (typeof target !== "string") continue;
      const targetPath = target.replaceAll("*", suffix);
      const targetSourcePaths = sourcePathsForTarget(
        resolve(config.directory, targetPath),
        visited,
      );
      sourcePaths.push(...targetSourcePaths);
    }
  }
  return [...new Set(sourcePaths)];
}

function workspaceImportPaths(sourcePath, specifier, visited) {
  const packageImportPaths = sourcePathsFromPackageImports(
    sourcePath,
    specifier,
    visited,
  );
  if (packageImportPaths.length > 0) return packageImportPaths;
  const tsconfigPaths = workspaceTsconfigImportPaths(
    sourcePath,
    specifier,
    visited,
  );
  return tsconfigPaths.length > 0
    ? tsconfigPaths
    : workspacePackageImportPaths(specifier, visited);
}

const SCENARIO_RUNTIME_SOURCE_PATHS = Object.freeze([
  "scripts/raw-swarm/sdk-player/scenario-setup-runtime.ts",
  "scripts/raw-swarm/sdk-player/scenario-character-runtime.ts",
]);
const TRACKED_SCENARIO_SOURCE_ROOTS = Object.freeze([
  "scripts/raw-swarm/sdk-player/scenarios",
  "scripts/raw-swarm/sdk-player/test-fixtures",
]);
function sourcePathsFromConsumerDistributionRuntimeEntries(sourcePath) {
  if (
    !Object.values(CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS)
      .map((entryPath) => resolve(root, entryPath))
      .includes(sourcePath)
  ) {
    return [];
  }
  return [
    ...Object.values(CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS),
    ...Object.values(CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS),
  ].map((relativePath) =>
    repositoryOwnedSourceFile(relativePath, "Consumer distribution entry"),
  );
}

function assertConsumerDistributionGeneratedSubmissionBoundary() {
  // Generated attempt.ts files are not repository-owned static sources. The
  // generated supervisor is executed under the deterministic guard instead;
  // this assertion keeps that runtime boundary explicit and fail-closed.
  const supervisorSource = readFileSync(
    join(root, CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS.supervisor),
    "utf8",
  );
  const capabilityGuardSource = readFileSync(
    join(root, "scripts/raw-swarm/deterministic-capability-guard.cjs"),
    "utf8",
  );
  assert.match(
    supervisorSource,
    /pathToFileURL\(submissionPath\)/u,
    "The generated supervisor must keep its runtime-supplied submission boundary explicit.",
  );
  assert.match(
    capabilityGuardSource,
    /function deterministicEnvironment[\s\S]{0,400}NODE_OPTIONS:\s*DETERMINISTIC_NODE_OPTIONS/u,
    "Generated supervisor submissions must inherit the deterministic capability guard.",
  );
  assert.match(
    capabilityGuardSource,
    /function deterministicChildValues[\s\S]{0,400}deterministicEnvironment/u,
    "Generated supervisor submissions must inherit the deterministic capability guard.",
  );
}

function trackedScenarioModulePaths() {
  return TRACKED_SCENARIO_SOURCE_ROOTS.flatMap((relativeDirectory) => {
    const directory = resolve(root, relativeDirectory);
    if (!existsSync(directory)) {
      throw new Error(
        `Could not inspect deterministic scenario source inventory ${directory}`,
      );
    }
    return filesBelow(directory).filter(
      (path) => path.endsWith(".setup.ts") || path.endsWith(".characters.ts"),
    );
  });
}

function sourcePathsFromScenarioRuntimeModules(sourcePath) {
  const relativeSourcePath = relative(root, sourcePath);
  if (!SCENARIO_RUNTIME_SOURCE_PATHS.includes(relativeSourcePath)) return [];
  return trackedScenarioModulePaths().flatMap((path) =>
    sourcePathsForCandidate(path, new Set()),
  );
}

function sourcePathsForQualityTest(testPath) {
  const pending = [resolve(root, testPath)];
  const visited = new Set();
  const paths = [];
  while (pending.length > 0) {
    const sourcePath = pending.pop();
    if (sourcePath === undefined || visited.has(sourcePath)) continue;
    visited.add(sourcePath);
    paths.push(sourcePath);
    const relativePath = relative(root, sourcePath);
    // Model-backed modules are an explicit boundary. Their process and
    // network capabilities are checked by model-entrypoint guards, while the
    // deterministic test still owns lifecycle/evidence assertions around it.
    if (
      MODEL_BACKED_SOURCE_FILES.includes(relativePath) ||
      DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES.includes(relativePath)
    ) {
      continue;
    }
    pending.push(...sourcePathsFromScenarioRuntimeModules(sourcePath));
    pending.push(
      ...sourcePathsFromConsumerDistributionRuntimeEntries(sourcePath),
    );
    const source = readFileSync(sourcePath, "utf8");
    for (const rawSpecifier of importSpecifiers(source)) {
      const specifier = stripViteImportPostfix(rawSpecifier);
      const importedPaths = specifier.startsWith(".")
        ? resolveInternalImportPaths(sourcePath, specifier, new Set())
        : workspaceImportPaths(sourcePath, specifier, new Set());
      pending.push(...importedPaths);
    }
  }
  return paths;
}

function repositoryOwnedSourceFile(pathArgument, sourceKind) {
  const sourcePath = resolve(root, pathArgument);
  if (!sourceCandidateOwnership(sourcePath)) {
    throw new Error(
      `${sourceKind} path ${pathArgument} is outside the repository or enters node_modules`,
    );
  }
  const canonicalSourcePath = canonicalPathForOwnership(sourcePath);
  const observation = sourceCandidateObservation(canonicalSourcePath);
  if (observation.kind === "failure") throw new Error(observation.message);
  if (observation.kind !== "file") {
    throw new Error(
      `${sourceKind} does not exist as a regular file: ${pathArgument}`,
    );
  }
  return canonicalSourcePath;
}

function standaloneSourceFile(pathArgument) {
  const sourcePath = resolve(root, pathArgument);
  const canonicalSourcePath = canonicalPathForOwnership(sourcePath);
  const observation = sourceCandidateObservation(canonicalSourcePath);
  if (observation.kind === "failure") throw new Error(observation.message);
  if (observation.kind !== "file") {
    throw new Error(`Source does not exist as a regular file: ${pathArgument}`);
  }
  return canonicalSourcePath;
}

function assertSourceCapabilities(sourcePath) {
  const source = readFileSync(sourcePath, "utf8");
  const violations = deterministicCapabilityViolations(source);
  assert.equal(
    violations.length,
    0,
    `Deterministic Raw Swarm source ${relative(root, sourcePath)} contains forbidden capabilities: ${JSON.stringify(violations)}`,
  );
}

function runSourceCheck(sourcePathArgument) {
  const sourcePath = standaloneSourceFile(sourcePathArgument);
  assertSourceCapabilities(sourcePath);
  process.stdout.write(`Deterministic source passed: ${sourcePathArgument}\n`);
}

function runTestSourceCheck(testPathArgument) {
  const testPath = repositoryOwnedSourceFile(testPathArgument, "Test");
  for (const sourcePath of sourcePathsForQualityTest(testPath)) {
    const relativeSourcePath = relative(root, sourcePath);
    if (
      MODEL_BACKED_SOURCE_FILES.includes(relativeSourcePath) ||
      DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES.includes(relativeSourcePath)
    ) {
      continue;
    }
    assertSourceCapabilities(sourcePath);
  }
  process.stdout.write(
    `Deterministic source tree passed: ${testPathArgument}\n`,
  );
}

function runTestSourceListing(testPathArgument) {
  const testPath = repositoryOwnedSourceFile(testPathArgument, "Test");
  for (const sourcePath of sourcePathsForQualityTest(testPath)) {
    process.stdout.write(`${relative(root, sourcePath)}\n`);
  }
}

function runLaneHygiene() {
  const discoveredTests = filesBelow(join(root, "scripts/raw-swarm"))
    .filter((path) => isSupportedVitestTestFilename(path))
    .map((path) => relative(root, path))
    .sort();

  assert.deepEqual(
    [
      ...QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
      ...Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY),
    ].sort(),
    discoveredTests,
    "Every Raw Swarm test must be classified as quality-owned or an explicitly retained prototype exclusion. Live model work belongs behind a public model command, not in a test file.",
  );
  assert.deepEqual(
    Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY).sort(),
    [
      "scripts/raw-swarm/battle-slice-tools.test.ts",
      "scripts/raw-swarm/transcript.property.test.ts",
    ],
    "Only the two established Raw Swarm prototype tests may remain outside quality.",
  );
  assert.equal(
    QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.some((testPath) =>
      Object.hasOwn(RAW_SWARM_TESTS_OUTSIDE_QUALITY, testPath),
    ),
    false,
    "A Raw Swarm test cannot be both quality-owned and excluded from quality.",
  );
  for (const testPath of discoveredTests) {
    const ownedTestPath = repositoryOwnedSourceFile(
      testPath,
      "Discovered test",
    );
    for (const sourcePath of sourcePathsForQualityTest(ownedTestPath)) {
      const relativeSourcePath = relative(root, sourcePath);
      if (
        MODEL_BACKED_SOURCE_FILES.includes(relativeSourcePath) ||
        DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES.includes(relativeSourcePath)
      ) {
        continue;
      }
      assertSourceCapabilities(sourcePath);
    }
  }

  assert.deepEqual(
    [...new Set(MODEL_BACKED_SOURCE_FILES)].sort(),
    MODEL_BACKED_SOURCE_FILES,
    "Model-backed source classification must be deterministic and duplicate-free.",
  );
  for (const sourcePath of MODEL_BACKED_SOURCE_FILES) {
    assert.equal(
      existsSync(join(root, sourcePath)),
      true,
      `Model-backed source classification points to a missing file: ${sourcePath}`,
    );
  }
  for (const sourcePath of DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES) {
    assert.equal(
      existsSync(join(root, sourcePath)),
      true,
      `Deterministic transitive-scan boundary points to a missing file: ${sourcePath}`,
    );
  }
  assertConsumerDistributionGeneratedSubmissionBoundary();

  const scripts = packageJson.scripts;
  assert.equal(
    scripts["check:raw-swarm-deterministic:body"],
    "env -u NODE_OPTIONS RAW_SWARM_EXECUTION_LANE=deterministic node --require=scripts/raw-swarm/deterministic-capability-guard.cjs scripts/raw-swarm/run-deterministic-check.cjs",
  );
  assert.match(
    scripts["check:raw-swarm-deterministic"],
    /with-broad-workspace-lock\.sh pnpm run check:raw-swarm-deterministic:body$/,
  );
  assert.equal(
    scripts["raw-swarm:model:trial"],
    ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/raw-swarm/with-model-lane-lock.sh trial node scripts/raw-swarm/run-model-backed.mjs trial",
  );
  assert.equal(
    scripts["raw-swarm:model:campaign"],
    ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/raw-swarm/with-model-lane-lock.sh campaign node scripts/raw-swarm/run-model-backed.mjs campaign",
  );

  const qualityBody = scripts["quality:body"];
  assert.match(qualityBody, /pnpm check:raw-swarm-lane-hygiene/);
  assert.match(qualityBody, /pnpm check:raw-swarm-deterministic:body/);
  assert.doesNotMatch(
    qualityBody,
    /raw-swarm:model|check:raw-swarm-sdk-player/,
  );
  for (const entrypoint of MODEL_BACKED_ENTRYPOINTS) {
    assert.doesNotMatch(
      qualityBody,
      new RegExp(entrypoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `Quality must not invoke model-backed entrypoint ${entrypoint}.`,
    );
  }
  assert.equal(
    new Set(MODEL_BACKED_ENTRYPOINTS).size,
    MODEL_BACKED_ENTRYPOINTS.length,
  );
  assert.equal(Object.keys(MODEL_BACKED_OPERATIONS).length, 8);
  assert.deepEqual(MODEL_BACKED_PROFILE_BUDGET_SECONDS, {
    campaign: 28_800,
    trial: 7_200,
  });
  for (const path of MODEL_BACKED_ENTRYPOINTS) {
    assert.equal(
      QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.includes(path),
      false,
      `Model entry point ${path} entered the deterministic inventory.`,
    );
    const source = readFileSync(join(root, path), "utf8");
    assert.match(
      source,
      /assertModelEntryPointGuard\(\)|DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD/,
      `Model entry point ${path} must enforce the public model-entrypoint guard.`,
    );
  }

  const deterministicRunner = readFileSync(
    join(root, "scripts/raw-swarm/run-deterministic-check.cjs"),
    "utf8",
  );
  assert.match(deterministicRunner, /deterministic-bin/);
  assert.match(
    deterministicRunner,
    /RAW_SWARM_EXECUTION_LANE: "deterministic"/,
  );
  assert.match(deterministicRunner, /deterministic-capability-guard\.cjs/);
  assert.match(deterministicRunner, /process-supervisor\.c/);
  assert.match(deterministicRunner, /deterministic-toolchain\.cjs/);
  assert.match(deterministicRunner, /deterministic-runner\.cjs/);
  assert.match(deterministicRunner, /NODE_OPTIONS: deterministicNodeOptions/);
  assert.doesNotMatch(
    deterministicRunner,
    /process\.env\.NODE_OPTIONS/,
    "Deterministic phases must not inherit arbitrary NODE_OPTIONS values.",
  );
  assert.equal(
    existsSync(
      join(root, "scripts/raw-swarm/deterministic-capability-guard.cjs"),
    ),
    true,
    "Deterministic lane is missing its Node capability guard.",
  );
  assert.equal(
    existsSync(join(root, "scripts/raw-swarm/process-supervisor.c")),
    true,
    "Deterministic lane is missing its native process supervisor source.",
  );
  const deterministicToolchain = readFileSync(
    join(root, "scripts/raw-swarm/deterministic-toolchain.cjs"),
    "utf8",
  );
  assert.match(
    deterministicToolchain,
    /TRUSTED_C_COMPILER_PATH = "\/usr\/bin\/cc"/,
  );
  assert.match(deterministicToolchain, /PATH: "\/usr\/bin:\/bin"/);
  assert.doesNotMatch(
    deterministicToolchain,
    /process\.env/,
    "Deterministic boundary compilation must not inherit compiler environment variables.",
  );
  assert.doesNotMatch(
    deterministicToolchain,
    /spawnSync\(\s*["'`]cc["'`]/,
    "Deterministic boundary compilation must not resolve cc through PATH.",
  );
  const deterministicProcessRunner = readFileSync(
    join(root, "scripts/raw-swarm/deterministic-runner.cjs"),
    "utf8",
  );
  assert.match(deterministicProcessRunner, /stdio: "inherit"/);
  assert.match(
    deterministicProcessRunner,
    /--owner-pid[\s\S]*String\(process\.pid\)/,
    "The native helper must receive the exact JavaScript owner PID.",
  );
  assert.match(
    deterministicProcessRunner,
    /HANDLED_SIGNAL_EXIT_STATUSES[\s\S]*includes\(result\.status\)/,
    "The runner must accept any native handled-signal completion status.",
  );
  assert.doesNotMatch(
    deterministicProcessRunner,
    /\/proc|readdirSync|readFileSync|capture/i,
    "Native supervision owns process lifecycle and inherited output; the JavaScript wrapper must not rediscover or capture it.",
  );
  assert.doesNotMatch(
    deterministicProcessRunner,
    /spawnSync/,
    "Deterministic child lifecycle must use asynchronous native supervision.",
  );
  const sharedProcessSupervision = readFileSync(
    join(root, "scripts/process-supervision.sh"),
    "utf8",
  );
  assert.match(
    sharedProcessSupervision,
    /--supervise-only/,
    "Resource and model wrappers must use the shared native supervisor.",
  );
  assert.doesNotMatch(
    sharedProcessSupervision,
    /DND_PROCESS_SUPERVISION_MARKER|\/proc\/\[0-9\]\*\/environ/,
    "Process ownership must not rely on an inherited environment marker.",
  );
  assert.doesNotMatch(
    sharedProcessSupervision,
    /supervision_signal_helper KILL|kill -["']?KILL/,
    "The shell must not kill the native supervisor while its descendants may survive.",
  );
  const blockerDirectory = join(root, "scripts/raw-swarm/deterministic-bin");
  const commonBlockerPath = join(blockerDirectory, "forbidden-command");
  assert.equal(
    existsSync(commonBlockerPath),
    true,
    "Deterministic lane is missing its shared executable guard.",
  );
  assert.match(
    readFileSync(commonBlockerPath, "utf8"),
    /forbidden in the deterministic Raw Swarm lane/i,
  );
  for (const executable of DETERMINISTIC_BLOCKED_EXECUTABLES) {
    const blockerPath = join(blockerDirectory, executable);
    assert.equal(
      existsSync(blockerPath),
      true,
      `Deterministic lane is missing the ${executable} executable guard.`,
    );
    assert.match(readFileSync(blockerPath, "utf8"), /forbidden-command/);
  }
  assert.match(
    readFileSync(join(root, "scripts/raw-swarm/run-model-backed.mjs"), "utf8"),
    /MODEL_BACKED_PROFILE_BUDGET_SECONDS\[profile\]/,
  );
  assert.match(
    readFileSync(join(root, "scripts/raw-swarm/run-model-backed.mjs"), "utf8"),
    /DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD/,
  );

  process.stdout.write(
    `Raw Swarm lane hygiene passed: ${QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.length} quality-owned deterministic tests, ${Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY).length} closed prototype exclusions, and ${Object.keys(MODEL_BACKED_OPERATIONS).length} explicit model-backed operations.\n`,
  );
}

if (require.main === module) {
  if (process.argv[2] === "--source") {
    runSourceCheck(process.argv[3]);
  } else if (process.argv[2] === "--test") {
    runTestSourceCheck(process.argv[3]);
  } else if (process.argv[2] === "--list-test-sources") {
    runTestSourceListing(process.argv[3]);
  } else {
    runLaneHygiene();
  }
}
