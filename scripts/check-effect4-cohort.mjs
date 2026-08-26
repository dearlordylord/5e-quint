import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const repositoryManifestPath = resolve(repositoryRoot, "package.json");
const canonicalManifestPath = resolve(
  scriptDirectory,
  "../docs/research/effect4-cohort-probe/package.json",
);
const requiredSelectedPackages = [
  "effect",
  "@effect/platform-node",
  "@effect/vitest",
];
const requiredPublishedVersions = new Map([
  ["@firfi/quint-connect", "2.0.2-effect4.2"],
]);
// The native TypeScript alias is intentionally a second toolchain package;
// its version is outside the selected direct TypeScript cohort.
const allowedAdditionalLockVersions = new Map([
  ["typescript", new Set(["7.0.2"])],
]);
const removedDirectPackages = new Set([
  "@effect/cli",
  "@effect/platform",
  "@effect/printer",
  "@effect/printer-ansi",
  "@effect/typeclass",
]);
const knownLegacyTransitivePackages = new Set([
  "@effect/cluster",
  "@effect/experimental",
  "@effect/rpc",
  "@effect/sql",
  "@effect/workflow",
]);
const manifestDependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const lockfileDependencySections = new Set([
  ...manifestDependencySections,
  "peerDependenciesMeta",
]);
const lockfileResolvedDependencySections = new Set([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
]);
const lockfilePackageSections = new Set(["packages", "snapshots"]);
const requiredLockfileSections = ["importers", "packages", "snapshots"];
const allowedBareEffectContexts = new Set([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "transitivePeerDependencies",
]);

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const hasWorkspaceManifest = async (project) => {
  try {
    await readFile(resolve(project, "pnpm-workspace.yaml"), "utf8");
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

const readCatalogVersion = async (project, packageName) => {
  const workspaceManifest = await readFile(
    resolve(project, "pnpm-workspace.yaml"),
    "utf8",
  );
  const quotedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = workspaceManifest.match(
    new RegExp(
      `^\\s*(?:"${quotedName}"|'${quotedName}'|${quotedName}):\\s*(?:"([^"]+)"|'([^']+)'|([^\\s#]+))\\s*$`,
      "m",
    ),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
};

const parsePnpmVersion = (packageManager) => {
  const match = /^pnpm@([^\s+]+)$/.exec(packageManager ?? "");
  if (match === null) {
    throw new Error(
      `package.json must declare an exact pnpm packageManager, found ${packageManager ?? "<missing>"}`,
    );
  }
  return match[1];
};

const assertPnpmVersion = (reportedVersion, expectedVersion) => {
  const actualVersion = reportedVersion.trim();
  if (actualVersion !== expectedVersion) {
    throw new Error(
      `repository requires pnpm@${expectedVersion}; resolved pnpm reported ${actualVersion || "<empty>"}`,
    );
  }
  return actualVersion;
};

const resolvePnpmInvocation = async () => {
  const repositoryManifest = await readJson(repositoryManifestPath);
  const expectedVersion = parsePnpmVersion(repositoryManifest.packageManager);
  const currentToolchainCorepack = resolve(
    dirname(process.execPath),
    "corepack",
  );
  const currentProcessExecPath = process.env.npm_execpath;
  const candidates = [];
  if (
    currentProcessExecPath !== undefined &&
    isAbsolute(currentProcessExecPath)
  ) {
    candidates.push({
      command: currentProcessExecPath,
      args: basename(currentProcessExecPath).startsWith("corepack")
        ? ["pnpm"]
        : [],
    });
  }
  candidates.push({
    command: process.execPath,
    args: [currentToolchainCorepack, "pnpm"],
  });
  let lastError;
  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(
        candidate.command,
        [...candidate.args, "--version"],
        { cwd: repositoryRoot },
      );
      assertPnpmVersion(stdout, expectedVersion);
      return { ...candidate, expectedVersion };
    } catch (error) {
      lastError = error;
      if (
        error.message.includes("repository requires pnpm@") ||
        error.message.includes("package.json must declare")
      ) {
        throw error;
      }
    }
  }
  throw new Error(
    `unable to invoke repository pnpm@${expectedVersion} through the current toolchain: ${lastError?.message ?? "no executable candidate"}`,
  );
};

const invokePnpm = async (pnpm, args, options = {}) =>
  execFileAsync(pnpm.command, [...pnpm.args, ...args], {
    ...options,
    cwd: repositoryRoot,
  });

const directEntries = (manifest) => {
  const entries = new Map();
  for (const sectionName of manifestDependencySections) {
    for (const [name, version] of Object.entries(manifest[sectionName] ?? {})) {
      if (!entries.has(name)) {
        entries.set(name, version);
        continue;
      }
      const previous = entries.get(name);
      if (Array.isArray(previous)) {
        if (!previous.includes(version)) previous.push(version);
      } else if (previous !== version) {
        entries.set(name, [previous, version]);
      }
    }
  }
  return entries;
};

const exactConsumerVersions = (dependencies) =>
  new Map(
    [...dependencies].filter(
      ([, version]) => typeof version === "string" && /^\d/.test(version),
    ),
  );

const workspaceManifestPaths = async (project, pnpm) => {
  const rootManifestPath = resolve(project, "package.json");
  const workspacePath = resolve(project, "pnpm-workspace.yaml");
  try {
    await readFile(workspacePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [rootManifestPath];
  }
  let stdout;
  try {
    ({ stdout } = await invokePnpm(
      pnpm,
      ["--dir", project, "list", "--recursive", "--parseable", "--depth=-1"],
      { maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (error) {
    const detail =
      typeof error.stderr === "string" ? error.stderr.trim() : error.message;
    throw new Error(`pnpm workspace enumeration failed: ${detail}`);
  }
  const paths = stdout
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => resolve(project, path));
  if (paths.length === 0) {
    throw new Error("pnpm workspace enumeration returned no projects");
  }
  const outsideProject = paths.find((path) => {
    const pathFromProject = relative(project, path);
    return pathFromProject.startsWith("..") || pathFromProject.startsWith("/");
  });
  if (outsideProject !== undefined) {
    throw new Error(
      `pnpm workspace enumeration escaped project: ${outsideProject}`,
    );
  }
  return [...new Set(paths.map((path) => resolve(path, "package.json")))];
};

const isEffectPackageName = (name) =>
  name === "effect" || name.startsWith("@effect/");

const packageKeyDelimiter = (key) =>
  key.startsWith("@") ? key.indexOf("@", 1) : key.indexOf("@");

const looksLikePackageKey = (key) => packageKeyDelimiter(key) > 0;

const parseLockPackageKey = (key, lineNumber) => {
  const delimiter = key.startsWith("@")
    ? key.indexOf("@", 1)
    : key.indexOf("@");
  if (delimiter <= 0) {
    throw new Error(
      `pnpm-lock.yaml line ${lineNumber}: unsupported package key ${key}`,
    );
  }
  const name = key.slice(0, delimiter);
  const version = key.slice(delimiter + 1).split("(", 1)[0];
  if (!name || !/^\d/.test(version)) {
    throw new Error(
      `pnpm-lock.yaml line ${lineNumber}: unsupported package version key ${key}`,
    );
  }
  return { name, version };
};

const decodeLockText = (rawText, lineNumber) => {
  const text = rawText.trim();
  let decoded = "";
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "#" && (index === 0 || /\s/.test(text[index - 1]))) {
      break;
    }
    if (character === "'") {
      let scalar = "";
      let closed = false;
      for (let cursor = index + 1; cursor < text.length; cursor += 1) {
        if (text[cursor] === "'") {
          if (text[cursor + 1] === "'") {
            scalar += "'";
            cursor += 1;
            continue;
          }
          index = cursor;
          closed = true;
          break;
        }
        scalar += text[cursor];
      }
      if (!closed) {
        throw new Error(
          `pnpm-lock.yaml line ${lineNumber}: unterminated single-quoted scalar`,
        );
      }
      decoded += scalar;
      continue;
    }
    if (character === '"') {
      let cursor = index + 1;
      let escaped = false;
      while (cursor < text.length) {
        const current = text[cursor];
        if (current === '"' && !escaped) break;
        if (current === "\\" && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
        cursor += 1;
      }
      if (cursor >= text.length) {
        throw new Error(
          `pnpm-lock.yaml line ${lineNumber}: unterminated double-quoted scalar`,
        );
      }
      const rawScalar = text.slice(index, cursor + 1);
      let scalar;
      try {
        scalar = JSON.parse(rawScalar);
      } catch (error) {
        throw new Error(
          `pnpm-lock.yaml line ${lineNumber}: unsupported double-quoted scalar ${rawScalar}: ${error.message}`,
        );
      }
      decoded += scalar;
      index = cursor;
      continue;
    }
    decoded += character;
  }
  return decoded;
};

const parseLockScalar = (rawValue, lineNumber = 0) =>
  decodeLockText(rawValue, lineNumber).trim();

const parseLockMappingKey = (line, lineNumber) => {
  if (/^\t/.test(line)) {
    throw new Error(
      `pnpm-lock.yaml line ${lineNumber}: tab indentation is unsupported`,
    );
  }
  if (!line.trim() || line.trimStart().startsWith("#")) return undefined;
  const match = line.match(
    /^( *)(?:"((?:[^"\\]|\\.)*)"|'((?:[^']|'')*)'|([^:#][^:]*?)):(.*)$/,
  );
  if (!match) return undefined;
  const key =
    match[2] !== undefined
      ? parseLockScalar(`"${match[2]}"`, lineNumber)
      : match[3] !== undefined
        ? parseLockScalar(`'${match[3]}'`, lineNumber)
        : match[4].trim();
  return {
    indentation: match[1].length,
    key,
    hasNestedValue: match[5].trim().length === 0,
    value: match[5].trim(),
  };
};

const parsePnpmResolution = (rawValue, lineNumber) => {
  const value = parseLockScalar(rawValue);
  if (value.length === 0) {
    return { value, baseVersion: undefined };
  }
  if (/^(?:link|workspace|file):/.test(value)) {
    return { value, baseVersion: undefined };
  }
  const firstParenthesis = value.indexOf("(");
  const baseVersion =
    firstParenthesis < 0 ? value : value.slice(0, firstParenthesis);
  if (/[()]/.test(baseVersion) || !/^\d/.test(baseVersion)) {
    throw new Error(
      `pnpm-lock.yaml line ${lineNumber}: unsupported package resolution ${rawValue}`,
    );
  }
  if (firstParenthesis >= 0) {
    let depth = 0;
    for (let index = firstParenthesis; index < value.length; index += 1) {
      const character = value[index];
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (depth < 0) {
        throw new Error(
          `pnpm-lock.yaml line ${lineNumber}: malformed package resolution ${rawValue}`,
        );
      }
    }
    if (depth !== 0) {
      throw new Error(
        `pnpm-lock.yaml line ${lineNumber}: malformed package resolution ${rawValue}`,
      );
    }
  }
  return { value, baseVersion };
};

const collectEffectReferences = (text, lineNumber, context, references) => {
  const pattern =
    /(?<![A-Za-z0-9_@-])(@effect\/[A-Za-z0-9._-]+|effect)(?![A-Za-z0-9._-])(?:@([0-9][^()\s,}\]'"\]]*))?/g;
  const decoded = parseLockScalar(text, lineNumber);
  for (const match of decoded.matchAll(pattern)) {
    references.push({
      lineNumber,
      context,
      name: match[1],
      version: match[2],
      alias:
        decoded[match.index - 1] === "*" || decoded[match.index - 1] === "&",
    });
  }
};

const addLockPackageVersion = (packages, name, version) => {
  const versions = packages.get(name) ?? new Set();
  versions.add(version);
  packages.set(name, versions);
};

const parseLockPackages = (lockfile) => {
  const packages = new Map();
  const packageSectionPackages = new Map();
  const snapshotSectionPackages = new Map();
  const importerEffectPackages = new Set();
  const packageEffectDependencies = new Set();
  const resolutionEntries = [];
  const effectReferences = [];
  const lines = lockfile.split(/\r?\n/);
  const foundSections = new Set();
  const sectionEntryCounts = new Map();
  const stack = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const entry = parseLockMappingKey(line, index + 1);
    if (entry === undefined) {
      const section = stack.find(({ indentation }) => indentation === 0)?.key;
      collectEffectReferences(
        line.trim(),
        index + 1,
        stack.at(-1)?.key,
        effectReferences,
      );
      if (
        lockfilePackageSections.has(section) &&
        line.trim() &&
        !line.trimStart().startsWith("#") &&
        !line.trimStart().startsWith("-")
      ) {
        throw new Error(
          `pnpm-lock.yaml line ${index + 1}: unsupported lockfile mapping syntax`,
        );
      }
      continue;
    }

    while (stack.length > 0 && stack.at(-1).indentation >= entry.indentation) {
      stack.pop();
    }
    const section = stack.find(({ indentation }) => indentation === 0)?.key;
    const parentKey = stack.at(-1)?.key;
    const inPackageSection = lockfilePackageSections.has(section);
    const directPackageEntry = inPackageSection && parentKey === section;
    const dependencySectionIndex = stack.findLastIndex(({ key }) =>
      lockfileDependencySections.has(key),
    );
    const dependencySection =
      dependencySectionIndex >= 0
        ? stack[dependencySectionIndex].key
        : undefined;
    const dependencyOwner =
      dependencySectionIndex >= 0
        ? stack[dependencySectionIndex + 1]?.key
        : undefined;
    const inImporterDependencies =
      section === "importers" && dependencySection !== undefined;

    collectEffectReferences(entry.key, index + 1, parentKey, effectReferences);
    collectEffectReferences(
      entry.value,
      index + 1,
      parentKey,
      effectReferences,
    );

    if (entry.indentation === 0) {
      if (requiredLockfileSections.includes(entry.key)) {
        foundSections.add(entry.key);
      }
    }
    if (section !== undefined && parentKey === section) {
      sectionEntryCounts.set(
        section,
        (sectionEntryCounts.get(section) ?? 0) + 1,
      );
    }

    if (directPackageEntry && !looksLikePackageKey(entry.key)) {
      throw new Error(
        `pnpm-lock.yaml line ${index + 1}: unsupported ${section} package key ${entry.key}`,
      );
    }

    if (looksLikePackageKey(entry.key)) {
      const parsed = parseLockPackageKey(entry.key, index + 1);
      addLockPackageVersion(packages, parsed.name, parsed.version);
      if (section === "packages" && directPackageEntry) {
        addLockPackageVersion(
          packageSectionPackages,
          parsed.name,
          parsed.version,
        );
      }
      if (section === "snapshots" && directPackageEntry) {
        addLockPackageVersion(
          snapshotSectionPackages,
          parsed.name,
          parsed.version,
        );
      }
      if (inImporterDependencies && isEffectPackageName(parsed.name)) {
        importerEffectPackages.add(parsed.name);
      }
    } else if (
      inPackageSection &&
      isEffectPackageName(entry.key) &&
      !lockfileDependencySections.has(parentKey)
    ) {
      throw new Error(
        `pnpm-lock.yaml line ${index + 1}: unsupported ${section} package key ${entry.key}`,
      );
    } else {
      if (inImporterDependencies && isEffectPackageName(entry.key)) {
        importerEffectPackages.add(entry.key);
      }
      if (
        inPackageSection &&
        lockfileDependencySections.has(parentKey) &&
        isEffectPackageName(entry.key)
      ) {
        packageEffectDependencies.add(entry.key);
      }
    }

    if (
      inPackageSection &&
      lockfileResolvedDependencySections.has(dependencySection) &&
      parentKey === dependencySection
    ) {
      resolutionEntries.push({
        lineNumber: index + 1,
        mode: "resolved",
        name: entry.key,
        value: entry.value,
      });
    } else if (
      inPackageSection &&
      dependencySection === "peerDependencies" &&
      parentKey === dependencySection
    ) {
      resolutionEntries.push({
        lineNumber: index + 1,
        mode: "peer-range",
        name: entry.key,
        value: entry.value,
      });
    } else if (inImporterDependencies) {
      if (parentKey === dependencySection && entry.value.length > 0) {
        resolutionEntries.push({
          lineNumber: index + 1,
          mode: "resolved",
          name: entry.key,
          value: entry.value,
        });
      } else if (dependencyOwner !== undefined && entry.key === "version") {
        resolutionEntries.push({
          lineNumber: index + 1,
          mode: "resolved",
          name: dependencyOwner,
          value: entry.value,
        });
      }
    }

    if (entry.hasNestedValue) {
      stack.push({ indentation: entry.indentation, key: entry.key });
    }
  }
  for (const section of requiredLockfileSections) {
    if (!foundSections.has(section)) {
      throw new Error(`pnpm-lock.yaml must declare a ${section} section`);
    }
    if ((sectionEntryCounts.get(section) ?? 0) === 0) {
      throw new Error(`pnpm-lock.yaml ${section} section must not be empty`);
    }
  }
  return {
    packages,
    packageSectionPackages,
    snapshotSectionPackages,
    importerEffectPackages,
    packageEffectDependencies,
    resolutionEntries,
    effectReferences,
  };
};

const validateLockfileWithPnpm = async (project, pnpm) => {
  const invocation = pnpm ?? (await resolvePnpmInvocation());
  try {
    await invokePnpm(
      invocation,
      [
        "--dir",
        project,
        "--ignore-workspace",
        "list",
        "--lockfile-only",
        "--json",
        "--depth=-1",
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );
  } catch (error) {
    const detail =
      typeof error.stderr === "string" ? error.stderr.trim() : error.message;
    throw new Error(`pnpm lockfile parsing failed: ${detail}`);
  }
};

const validateResolutionEntries = (entries, cohort, errors) => {
  for (const entry of entries) {
    if (entry.mode === "peer-range") continue;
    const expected = cohort.lockVersions.get(entry.name);
    if (expected === undefined) continue;
    const resolution = parsePnpmResolution(entry.value, entry.lineNumber);
    if (resolution.baseVersion !== expected) {
      errors.push(
        `pnpm-lock.yaml line ${entry.lineNumber}: ${entry.name} must resolve to exactly ${expected}; found ${entry.value || "<empty>"}`,
      );
    }
  }
};

const validateEffectReferences = (references, cohort, errors) => {
  for (const reference of references) {
    const expected = cohort.lockVersions.get(reference.name);
    if (reference.alias) {
      errors.push(
        `pnpm-lock.yaml line ${reference.lineNumber}: Effect alias or anchor is unsupported for ${reference.name}`,
      );
      continue;
    }
    if (reference.version !== undefined) {
      if (expected === undefined) {
        errors.push(
          `pnpm-lock.yaml line ${reference.lineNumber}: unsupported Effect reference ${reference.name}@${reference.version}`,
        );
      } else if (reference.version !== expected) {
        errors.push(
          `pnpm-lock.yaml line ${reference.lineNumber}: ${reference.name} must be ${expected}; found ${reference.version}`,
        );
      }
      continue;
    }
    if (
      expected === undefined ||
      !allowedBareEffectContexts.has(reference.context)
    ) {
      errors.push(
        `pnpm-lock.yaml line ${reference.lineNumber}: bare Effect reference ${reference.name} is unsupported in ${reference.context ?? "the lockfile"}`,
      );
    }
  }
};

const loadCohort = async () => {
  const manifest = await readJson(canonicalManifestPath);
  const repositoryManifest = await readJson(repositoryManifestPath);
  const dependencies = directEntries(manifest);
  const pnpmVersion = parsePnpmVersion(repositoryManifest.packageManager);
  const exactVersions = exactConsumerVersions(dependencies);
  const selectedVersions = new Map();
  for (const packageName of requiredSelectedPackages) {
    const version = exactVersions.get(packageName);
    if (version === undefined) {
      throw new Error(
        `canonical cohort manifest must pin ${packageName} to an exact version`,
      );
    }
    selectedVersions.set(packageName, version);
  }
  const vitestVersion = exactVersions.get("vitest");
  if (vitestVersion === undefined) {
    throw new Error(
      "canonical cohort manifest must pin vitest to an exact version",
    );
  }
  const platformVersion = selectedVersions.get("@effect/platform-node");
  const lockVersions = new Map(exactVersions);
  lockVersions.set("@effect/platform-node-shared", platformVersion);
  for (const [packageName, version] of requiredPublishedVersions) {
    lockVersions.set(packageName, version);
  }
  return {
    pnpmVersion,
    selectedVersions,
    exactVersions,
    lockVersions,
  };
};

const inspectProject = async (project, cohort, options = {}) => {
  const errors = [];
  // The standalone cohort probe has no published D&D workspace dependency;
  // the repository workspace and any other pnpm workspace must have one.
  const isWorkspaceProject =
    project === repositoryRoot || (await hasWorkspaceManifest(project));
  const validatePublished =
    options.validatePublished !== false && isWorkspaceProject;
  const pnpm = await resolvePnpmInvocation();
  const manifests = await workspaceManifestPaths(project, pnpm);
  const observedSelectedPackages = new Set();
  const observedPublishedConsumers = new Set();
  const manifestRecords = [];
  for (const manifestPath of manifests) {
    const manifest = await readJson(manifestPath);
    const entries = directEntries(manifest);
    manifestRecords.push({ manifestPath, entries });
    for (const [name, version] of entries) {
      const location = relative(project, manifestPath) || "package.json";
      if (Array.isArray(version)) {
        errors.push(
          `${location}: ${name} has conflicting dependency ranges ${version.join(" and ")}`,
        );
        continue;
      }
      if (cohort.selectedVersions.has(name)) {
        observedSelectedPackages.add(name);
      }
      const publishedVersion = requiredPublishedVersions.get(name);
      if (publishedVersion !== undefined) {
        observedPublishedConsumers.add(name);
      }
      if (
        validatePublished &&
        publishedVersion !== undefined &&
        version !== "catalog:" &&
        version !== publishedVersion
      ) {
        errors.push(
          `${location}: ${name} must be exactly ${publishedVersion} or use the repository catalog; found ${version}`,
        );
      }
      const expected = cohort.exactVersions.get(name);
      if (expected !== undefined && version !== expected) {
        errors.push(
          `${location}: ${name} must be exactly ${expected}; found ${version}`,
        );
      }
      if (removedDirectPackages.has(name)) {
        errors.push(
          `${location}: ${name} must not remain as a direct dependency`,
        );
      }
      if (
        name.startsWith("@effect/") &&
        !cohort.selectedVersions.has(name) &&
        !removedDirectPackages.has(name)
      ) {
        errors.push(`${location}: unsupported direct Effect package ${name}`);
      }
    }
  }
  for (const packageName of requiredPublishedVersions.keys()) {
    if (!validatePublished) continue;
    const usesCatalog = manifestRecords.some(
      ({ entries }) => entries.get(packageName) === "catalog:",
    );
    if (!usesCatalog) continue;
    const catalogVersion = await readCatalogVersion(project, packageName);
    const expected = requiredPublishedVersions.get(packageName);
    if (catalogVersion !== expected) {
      errors.push(
        `${relative(project, resolve(project, "pnpm-workspace.yaml"))}: catalog ${packageName} must be exactly ${expected}; found ${catalogVersion ?? "<missing>"}`,
      );
    }
  }
  for (const packageName of requiredSelectedPackages) {
    if (!observedSelectedPackages.has(packageName)) {
      errors.push(`workspace does not declare selected package ${packageName}`);
    }
  }
  for (const packageName of requiredPublishedVersions.keys()) {
    if (!validatePublished) continue;
    if (!observedPublishedConsumers.has(packageName)) {
      errors.push(`workspace has no manifest consumer of ${packageName}`);
    }
  }

  const lockfile = await readFile(resolve(project, "pnpm-lock.yaml"), "utf8");
  if (options.validateLockfile !== false) {
    await validateLockfileWithPnpm(project, pnpm);
  }
  const {
    packages: lockPackages,
    packageSectionPackages,
    snapshotSectionPackages,
    importerEffectPackages,
    packageEffectDependencies,
    resolutionEntries,
    effectReferences,
  } = parseLockPackages(lockfile);
  validateEffectReferences(effectReferences, cohort, errors);
  validateResolutionEntries(resolutionEntries, cohort, errors);
  for (const [packageName, expected] of cohort.lockVersions) {
    if (!validatePublished && requiredPublishedVersions.has(packageName)) {
      continue;
    }
    const allowedAdditionalVersions =
      allowedAdditionalLockVersions.get(packageName) ?? new Set();
    for (const [section, sectionPackages] of [
      ["packages", packageSectionPackages],
      ["snapshots", snapshotSectionPackages],
    ]) {
      const versions = sectionPackages.get(packageName) ?? new Set();
      if (versions.size === 0) {
        errors.push(
          `lockfile ${section} section does not contain ${packageName}`,
        );
      }
      for (const version of versions) {
        if (version !== expected && !allowedAdditionalVersions.has(version)) {
          errors.push(
            `lockfile ${section} contains ${packageName}@${version}; expected only ${packageName}@${expected}`,
          );
        }
      }
    }
  }
  for (const packageName of importerEffectPackages) {
    if (cohort.selectedVersions.has(packageName)) continue;
    const classification = removedDirectPackages.has(packageName)
      ? "obsolete"
      : "unsupported";
    errors.push(
      `lockfile importer contains ${classification} direct Effect package ${packageName}`,
    );
  }
  for (const packageName of packageEffectDependencies) {
    if (
      lockPackages.has(packageName) ||
      cohort.selectedVersions.has(packageName)
    ) {
      continue;
    }
    errors.push(
      `lockfile contains unsupported Effect dependency ${packageName}`,
    );
  }
  const allowedLockPackages = new Set([
    "@effect/platform-node",
    "@effect/platform-node-shared",
    "@effect/vitest",
  ]);
  for (const packageName of lockPackages.keys()) {
    if (!packageName.startsWith("@effect/")) continue;
    if (!allowedLockPackages.has(packageName)) {
      const classification = knownLegacyTransitivePackages.has(packageName)
        ? "legacy transitive"
        : "unsupported";
      errors.push(
        `lockfile contains ${classification} Effect package ${packageName}`,
      );
    }
  }

  const effectVersions = lockPackages.get("effect") ?? new Set();
  if (effectVersions.size === 0) {
    errors.push("lockfile does not contain effect");
  }
  const expectedEffectVersion = cohort.lockVersions.get("effect");
  for (const version of effectVersions) {
    if (version !== expectedEffectVersion) {
      errors.push(
        `lockfile contains effect@${version}; expected only effect@${expectedEffectVersion}`,
      );
    }
  }
  if (
    manifestRecords.some(({ entries }) => {
      const version = entries.get("effect");
      return typeof version === "string" && /(?:^|[~^<>= ])3\./.test(version);
    })
  ) {
    errors.push(
      "pre-cutover v3 Effect manifests detected; this gate fails closed until #371 aligns every workspace",
    );
  }
  if ([...effectVersions].some((version) => version.startsWith("3."))) {
    errors.push(
      "pre-cutover v3 Effect lockfile detected; this gate fails closed until #371 regenerates the lockfile",
    );
  }

  return { errors, manifests };
};

const inspectSelfTestProject = (project, cohort) =>
  inspectProject(project, cohort, { validateLockfile: false });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertRejects = async (action, message) => {
  try {
    await action();
  } catch (error) {
    if (String(error.message).includes(message)) return;
    throw new Error(`unexpected rejection: ${error.message}`);
  }
  throw new Error(`expected rejection containing: ${message}`);
};

const writeProjectManifest = async (project, path, manifest) => {
  const target = resolve(project, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
};

const removeLockfileSection = (lockfile, section) => {
  const lines = lockfile.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${section}:`);
  if (start < 0) throw new Error(`self-test section is missing: ${section}`);
  const end = lines.findIndex(
    (line, index) => index > start && /^[^\s#][^:]*:$/.test(line),
  );
  return [
    ...lines.slice(0, start),
    ...lines.slice(end < 0 ? lines.length : end),
  ].join("\n");
};

const runSelfTests = async () => {
  const cohort = await loadCohort();
  await assertRejects(
    () => assertPnpmVersion("10.29.2", cohort.pnpmVersion),
    `repository requires pnpm@${cohort.pnpmVersion}`,
  );
  const temporaryProject = await mkdtemp(resolve(tmpdir(), "effect4-cohort-"));
  try {
    const rootManifest = {
      private: true,
      dependencies: {
        effect: cohort.selectedVersions.get("effect"),
        "@effect/platform-node": cohort.selectedVersions.get(
          "@effect/platform-node",
        ),
        "@effect/vitest": cohort.selectedVersions.get("@effect/vitest"),
        "@firfi/quint-connect": "catalog:",
        vitest: cohort.lockVersions.get("vitest"),
      },
    };
    await writeProjectManifest(temporaryProject, "package.json", rootManifest);
    const workspacePath = resolve(temporaryProject, "pnpm-workspace.yaml");
    await writeFile(
      workspacePath,
      'packages: ["packages/*"]\ncatalog:\n  "@firfi/quint-connect": "2.0.2-effect4.2"\n',
    );
    await writeProjectManifest(
      temporaryProject,
      "packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: { effect: cohort.selectedVersions.get("effect") },
      },
    );
    const probeLockfile = await readFile(
      resolve(dirname(canonicalManifestPath), "pnpm-lock.yaml"),
      "utf8",
    );
    const canonicalLockfile = probeLockfile
      .replace(
        "packages:\n\n",
        "packages:\n\n  '@firfi/quint-connect@2.0.2-effect4.2':\n    resolution: {integrity: sha512-synthetic}\n\n",
      )
      .replace(
        "snapshots:\n\n",
        "snapshots:\n\n  '@firfi/quint-connect@2.0.2-effect4.2(effect@4.0.0-rc.112)(vitest@4.1.11)(zod@4.3.6)':\n    dependencies:\n      effect: 4.0.0-rc.112\n\n",
      );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );
    const valid = await inspectSelfTestProject(temporaryProject, cohort);
    assert(
      valid.errors.length === 0,
      `valid nested workspace rejected: ${valid.errors.join("; ")}`,
    );

    await writeFile(
      workspacePath,
      'packages: ["packages/*"]\ncatalog:\n  "@firfi/quint-connect": "^2.0.2-effect4.2"\n',
    );
    const catalogDrift = await inspectSelfTestProject(temporaryProject, cohort);
    assert(
      catalogDrift.errors.some((error) =>
        error.includes("catalog @firfi/quint-connect must be exactly"),
      ),
      "Quint Connect catalog drift was not rejected",
    );
    await writeFile(
      workspacePath,
      'packages: ["packages/*"]\ncatalog:\n  "@firfi/quint-connect": "2.0.2-effect4.2"\n',
    );

    const rootWithoutQuintConnect = {
      ...rootManifest,
      dependencies: Object.fromEntries(
        Object.entries(rootManifest.dependencies).filter(
          ([name]) => name !== "@firfi/quint-connect",
        ),
      ),
    };
    await writeProjectManifest(
      temporaryProject,
      "package.json",
      rootWithoutQuintConnect,
    );
    const missingQuintConnectConsumer = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      missingQuintConnectConsumer.errors.some((error) =>
        error.includes(
          "workspace has no manifest consumer of @firfi/quint-connect",
        ),
      ),
      "workspace without a Quint Connect manifest consumer was accepted",
    );
    await writeProjectManifest(temporaryProject, "package.json", rootManifest);

    await writeProjectManifest(
      temporaryProject,
      "packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: {
          effect: cohort.selectedVersions.get("effect"),
          "@firfi/quint-connect": "2.0.2-effect4.1",
        },
      },
    );
    const publishedVersionDrift = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      publishedVersionDrift.errors.some(
        (error) =>
          error.includes("@firfi/quint-connect must be exactly") &&
          error.includes("2.0.2-effect4.2"),
      ),
      "Quint Connect published version drift was not rejected",
    );
    await writeProjectManifest(
      temporaryProject,
      "packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: { effect: cohort.selectedVersions.get("effect") },
      },
    );

    const quintConnectSnapshotDrift = canonicalLockfile.replace(
      "'@firfi/quint-connect@2.0.2-effect4.2(effect@4.0.0-rc.112)(vitest@4.1.11)(zod@4.3.6)':",
      "'@firfi/quint-connect@2.0.2-effect4.1(effect@4.0.0-rc.112)(vitest@4.1.11)(zod@4.3.6)':",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      quintConnectSnapshotDrift,
    );
    const driftedQuintConnectSnapshot = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      driftedQuintConnectSnapshot.errors.some(
        (error) =>
          error.includes("lockfile snapshots contains") &&
          error.includes("@firfi/quint-connect@2.0.2-effect4.1"),
      ),
      "Quint Connect snapshot version drift was not rejected",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );

    const nativeTypeScriptLockfile = canonicalLockfile.replace(
      "packages:\n\n",
      "packages:\n\n  'typescript@7.0.2': {}\n\n",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      nativeTypeScriptLockfile,
    );
    const nativeTypeScript = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      nativeTypeScript.errors.length === 0,
      `documented TypeScript native alias rejected: ${nativeTypeScript.errors.join("; ")}`,
    );
    const unsupportedNativeTypeScriptLockfile =
      nativeTypeScriptLockfile.replace(
        "'typescript@7.0.2': {}",
        "'typescript@7.0.3': {}",
      );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      unsupportedNativeTypeScriptLockfile,
    );
    const unsupportedNativeTypeScript = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      unsupportedNativeTypeScript.errors.some((error) =>
        error.includes("typescript@7.0.3"),
      ),
      "unsupported TypeScript native alias was not rejected",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );

    await writeProjectManifest(
      temporaryProject,
      "packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: { effect: cohort.selectedVersions.get("effect") },
        devDependencies: {
          vitest: `^${cohort.exactVersions.get("vitest")}`,
        },
      },
    );
    const vitestRangeDrift = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      vitestRangeDrift.errors.some(
        (error) =>
          error.includes("vitest must be exactly") &&
          error.includes(cohort.exactVersions.get("vitest")),
      ),
      "nested Vitest range drift was not rejected",
    );
    await writeProjectManifest(
      temporaryProject,
      "packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: { effect: cohort.selectedVersions.get("effect") },
      },
    );

    for (const section of ["importers", "snapshots"]) {
      await writeFile(
        resolve(temporaryProject, "pnpm-lock.yaml"),
        removeLockfileSection(canonicalLockfile, section),
      );
      await assertRejects(
        () => inspectSelfTestProject(temporaryProject, cohort),
        `must declare a ${section} section`,
      );
    }
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );

    const importerEffectRc111Lockfile = canonicalLockfile.replace(
      "      effect:\n        specifier: 4.0.0-rc.112\n        version: 4.0.0-rc.112\n",
      "      effect:\n        specifier: 4.0.0-rc.112\n        version: 4.0.0-rc.111\n",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      importerEffectRc111Lockfile,
    );
    const importerEffectRc111 = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      importerEffectRc111.errors.some(
        (error) =>
          error.includes("effect must resolve to exactly") &&
          error.includes("4.0.0-rc.111"),
      ),
      "importer effect rc.111 resolution was not rejected",
    );

    const snapshotEffectV3Lockfile = canonicalLockfile.replace(
      "  '@effect/platform-node-shared@4.0.0-rc.112(effect@4.0.0-rc.112)':\n    dependencies:\n      '@types/ws': 8.18.1\n      effect: 4.0.0-rc.112\n",
      "  '@effect/platform-node-shared@4.0.0-rc.112(effect@4.0.0-rc.112)':\n    dependencies:\n      '@types/ws': 8.18.1\n      effect: 3.21.5\n",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      snapshotEffectV3Lockfile,
    );
    const snapshotEffectV3 = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      snapshotEffectV3.errors.some(
        (error) =>
          error.includes("effect must resolve to exactly") &&
          error.includes("3.21.5"),
      ),
      "snapshot effect 3.21.5 resolution was not rejected",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );

    const hiddenEffectLockfile = canonicalLockfile.replace(
      "  '@effect/platform-node-shared@4.0.0-rc.112':\n",
      "  '@effect/platform-node-shared@4.0.0-rc.112':\n    '@effect/evil@1.0.0':\n      resolution: {integrity: sha512-synthetic}\n",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      hiddenEffectLockfile,
    );
    await validateLockfileWithPnpm(temporaryProject);
    const hiddenEffect = await inspectSelfTestProject(temporaryProject, cohort);
    assert(
      hiddenEffect.errors.some((error) =>
        error.includes("unsupported Effect package @effect/evil"),
      ),
      "pnpm accepted a four-space Effect package key that the verifier missed",
    );

    const extraPeerContextLockfile = canonicalLockfile.replace(
      "snapshots:\n\n",
      "snapshots:\n\n  'extra@1.0.0(@effect/evil@1.0.0)': {}\n\n",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      extraPeerContextLockfile,
    );
    const extraPeerContext = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      extraPeerContext.errors.some((error) =>
        error.includes("unsupported Effect reference @effect/evil@1.0.0"),
      ),
      "Effect package hidden in an extra peer context was not rejected",
    );

    const escapedSequenceLockfile = canonicalLockfile.replace(
      "      - bufferutil\n",
      String.raw`      - "\u0040effect/evil@1.0.0"
      - bufferutil
`,
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      escapedSequenceLockfile,
    );
    await validateLockfileWithPnpm(temporaryProject);
    const escapedSequence = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      escapedSequence.errors.some((error) =>
        error.includes("unsupported Effect reference @effect/evil@1.0.0"),
      ),
      "double-quoted Unicode Effect sequence item was not rejected",
    );

    const inlineSequenceReplacement = [
      String.raw`    transitivePeerDependencies: ["\u0040effect/evil@1.0.0", bufferutil]`,
      "",
    ].join("\n");
    const inlineSequenceLockfile = canonicalLockfile.replace(
      "    transitivePeerDependencies:\n      - bufferutil\n",
      inlineSequenceReplacement,
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      inlineSequenceLockfile,
    );
    await validateLockfileWithPnpm(temporaryProject);
    const inlineSequence = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      inlineSequence.errors.some((error) =>
        error.includes("unsupported Effect reference @effect/evil@1.0.0"),
      ),
      "inline Unicode Effect sequence item was not rejected",
    );

    const inlineMapLockfile = canonicalLockfile.replace(
      "    engines: {node: '>=18.0.0'}",
      "    engines: {node: '>=18.0.0', effect: \"\\u0040effect/evil@1.0.0\"}",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      inlineMapLockfile,
    );
    await validateLockfileWithPnpm(temporaryProject);
    const inlineMap = await inspectSelfTestProject(temporaryProject, cohort);
    assert(
      inlineMap.errors.some((error) =>
        error.includes("unsupported Effect reference @effect/evil@1.0.0"),
      ),
      "inline Unicode Effect map scalar was not rejected",
    );

    for (const [label, item] of [
      ["bare", "@effect/evil"],
      ["quoted", "'@effect/evil@1.0.0'"],
    ]) {
      const transitiveEffectLockfile = canonicalLockfile.replace(
        "      - bufferutil\n",
        `      - ${item}\n      - bufferutil\n`,
      );
      await writeFile(
        resolve(temporaryProject, "pnpm-lock.yaml"),
        transitiveEffectLockfile,
      );
      await validateLockfileWithPnpm(temporaryProject);
      const transitiveEffect = await inspectSelfTestProject(
        temporaryProject,
        cohort,
      );
      assert(
        transitiveEffect.errors.some(
          (error) => error.includes("Effect") && error.includes("@effect/evil"),
        ),
        `${label} unknown transitive Effect peer was not rejected`,
      );
    }
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );

    const dottedPackageLockfile = canonicalLockfile.replace(
      "packages:\n\n",
      "packages:\n\n  '@effect/future.pkg@1.0.0':\n    resolution: {integrity: sha512-synthetic}\n\n",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      dottedPackageLockfile,
    );
    const dottedPackage = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      dottedPackage.errors.some((error) =>
        error.includes("unsupported Effect package @effect/future.pkg"),
      ),
      "dotted scoped lock package was not rejected",
    );
    await writeFile(
      resolve(temporaryProject, "pnpm-lock.yaml"),
      canonicalLockfile,
    );

    await writeFile(workspacePath, 'packages: ["**/packages/*"]\n');
    await writeProjectManifest(
      temporaryProject,
      "nested/packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: {
          effect: `^${cohort.selectedVersions.get("effect")}`,
        },
      },
    );
    const nestedDrifting = await inspectSelfTestProject(
      temporaryProject,
      cohort,
    );
    assert(
      nestedDrifting.errors.some(
        (error) =>
          error.includes("nested/packages/drifting/package.json") &&
          error.includes("effect must be exactly"),
      ),
      "**/packages/* nested workspace range drift was not rejected",
    );

    await writeFile(workspacePath, 'packages: ["**"]\n');
    await writeProjectManifest(temporaryProject, "dist/package.json", {
      name: "dist-drift",
      dependencies: {
        effect: `^${cohort.selectedVersions.get("effect")}`,
      },
    });
    const distDrifting = await inspectSelfTestProject(temporaryProject, cohort);
    assert(
      distDrifting.errors.some(
        (error) =>
          error.includes("dist/package.json") &&
          error.includes("effect must be exactly"),
      ),
      'packages:["**"] dist range drift was not rejected',
    );

    await writeFile(workspacePath, 'packages: { include: ["**"] }\n');
    await assertRejects(
      () => inspectSelfTestProject(temporaryProject, cohort),
      "pnpm workspace enumeration failed",
    );
    await writeFile(workspacePath, 'packages: ["**/packages/*"]\n');

    await writeProjectManifest(
      temporaryProject,
      "packages/drifting/package.json",
      {
        name: "drifting",
        dependencies: { effect: "~3.21.5" },
      },
    );
    const preCutover = await inspectSelfTestProject(temporaryProject, cohort);
    assert(
      preCutover.errors.some((error) =>
        error.includes("pre-cutover v3 Effect manifests"),
      ),
      "pre-cutover v3 state was not reported explicitly",
    );
    console.log("Effect 4 cohort verifier self-tests passed");
  } finally {
    await rm(temporaryProject, { recursive: true, force: true });
  }
};

const usage = () => {
  console.error(
    "Usage: node scripts/check-effect4-cohort.mjs --project <project-directory> | --self-test",
  );
  process.exitCode = 2;
};

const main = async () => {
  if (process.argv.includes("--self-test")) {
    await runSelfTests();
    return;
  }
  const projectFlag = process.argv.indexOf("--project");
  if (projectFlag < 0 || process.argv[projectFlag + 1] === undefined) {
    usage();
    return;
  }
  const project = resolve(process.argv[projectFlag + 1]);
  const cohort = await loadCohort();
  const result = await inspectProject(project, cohort);
  if (result.errors.length > 0) {
    console.error(result.errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log(
      `Effect 4 cohort verified: ${cohort.selectedVersions.get("effect")}`,
    );
  }
};

await main();
