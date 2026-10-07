import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// This adapter deliberately accepts only the pinned native resolver's evidence.
const TRACE_FORMS = [
  "======== Resolving module '<value>' from '<value>'. ========",
  "======== Module name '<value>' was not resolved. ========",
  "======== Module name '<value>' was successfully resolved to '<value>'. ========",
  "======== Module name '<value>' was successfully resolved to '<value>' with Package ID '<value>'. ========",
  "======== Resolving type reference directive '<value>', containing file '<value>', root directory '<value>'. ========",
  "======== Type reference directive '<value>' was successfully resolved to '<value>', primary: true. ========",
  "======== Type reference directive '<value>' was not resolved. ========",
  "Explicitly specified module resolution kind: '<value>'.",
  "Resolving in CJS mode with conditions '<value>', '<value>', '<value>'.",
  "Resolving in ESM mode with conditions '<value>', '<value>', '<value>'.",
  "Resolving in CJS mode with conditions '<value>', '<value>'.",
  "Resolving in ESM mode with conditions '<value>', '<value>'.",
  "'<value>' option is specified, looking for a pattern to match module name '<value>'.",
  "Module name '<value>', matched pattern '<value>'.",
  "Trying substitution '<value>', candidate module location: '<value>'.",
  "Loading module as file / folder, candidate module location '<value>', target file types: TypeScript, JavaScript, Declaration, JSON.",
  "Loading module as file / folder, candidate module location '<value>', target file types: TypeScript, Declaration.",
  "File name '<value>' has a '<value>' extension - stripping it.",
  "File '<value>' exists - use it as a name resolution result.",
  "File '<value>' exists according to earlier cached lookups.",
  "File '<value>' does not exist.",
  "File '<value>' does not exist according to earlier cached lookups.",
  "Directory '<value>' does not exist, skipping all lookups in it.",
  "Found '<value>' at '<value>'.",
  "'<value>' does not have a '<value>' field.",
  "'<value>' has '<value>' field '<value>' that references '<value>'.",
  "'<value>' has a '<value>' field with version-specific path mappings.",
  "'<value>' does not have a '<value>' entry that matches version '<value>'.",
  "Resolving real path for '<value>', result '<value>'.",
  "Loading module '<value>' from '<value>' folder, target file types: TypeScript, Declaration.",
  "Loading module '<value>' from '<value>' folder, target file types: TypeScript, JavaScript, Declaration, JSON.",
  "Resolving with primary search path '<value>'.",
  "Searching all ancestor node_modules directories for preferred extensions: TypeScript, Declaration.",
  "Searching all ancestor node_modules directories for fallback extensions: JavaScript, JSON.",
  "Resolution of non-relative name failed; trying with modern Node resolution features disabled to see if npm library needs configuration update.",
  "Entering conditional exports.",
  "Exiting conditional exports.",
  "Matched '<value>' condition '<value>'.",
  "Saw non-matching condition '<value>'.",
  "Resolved under condition '<value>'.",
  "Using '<value>' subpath '<value>' with target '<value>'.",
  "Skipping module '<value>' that looks like an absolute URI, target file types: TypeScript, JavaScript, Declaration, JSON.",
] as const;
const traceForms = new Set<string>(TRACE_FORMS);
const ATTEMPTS = 3;
const TRACE_LIMIT_BYTES = 64 * 1024 * 1024;
const FORMAT = 1;
const loadedImplementation = [
  fileURLToPath(import.meta.url),
  createRequire(import.meta.url).resolve("typescript"),
].map((path) => ({ path, digest: hash(readFileSync(path)) }));
type Checked =
  | { readonly kind: "ok" }
  | { readonly kind: "failure"; readonly message: string };
export type DeclarationCacheInput = {
  readonly repoRoot: string;
  readonly compiler: string;
  readonly config: string;
  readonly ownerPaths: readonly string[];
  readonly loadedOwners: readonly {
    readonly path: string;
    readonly digest: string;
  }[];
  readonly copiedPaths: readonly string[];
  readonly cacheRoot?: string;
  readonly destination: string;
  readonly compile: (directory: string) => Checked;
  readonly admit: (directory: string) => Checked;
};
export type DeclarationCacheResult =
  | { readonly kind: "ok"; readonly cache: "hit" | "miss" }
  | { readonly kind: "failure"; readonly message: string };
type Observation = {
  readonly path: string;
  readonly identity: string;
  readonly witness: string;
};
type Capture = {
  readonly digest: string;
  readonly observations: readonly Observation[];
  readonly discovery: string;
};
function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function failure(
  message: string,
): Extract<DeclarationCacheResult, { kind: "failure" }> {
  return { kind: "failure", message };
}
function statWitness(path: string): string {
  const s = lstatSync(path, { bigint: true });
  return [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs].join(":");
}
function nearestParent(path: string): string {
  let parent = dirname(path);
  while (!existsSync(parent)) {
    const next = dirname(parent);
    if (next === parent) throw new Error("No existing input parent");
    parent = next;
  }
  return parent;
}
function isAbsentError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}
function inputIdentity(path: string): string {
  const stat = lstatSync(path);
  const content = stat.isFile()
    ? hash(readFileSync(path))
    : stat.isDirectory()
      ? "directory"
      : "link";
  return JSON.stringify({
    path,
    real: existsSync(path) ? realpathSync(path) : null,
    link: stat.isSymbolicLink() ? readlinkSync(path) : null,
    content,
  });
}
function observe(path: string): Observation {
  try {
    const before = statWitness(path),
      identity = inputIdentity(path),
      after = statWitness(path);
    return { path, identity, witness: before === after ? before : "changed" };
  } catch (error) {
    if (isAbsentError(error))
      return {
        path,
        identity: JSON.stringify({ path, absent: true }),
        witness: "absent",
      };
    throw error;
  }
}
function ancestors(path: string): string[] {
  const paths: string[] = [];
  let current = dirname(path);
  while (true) {
    paths.push(current);
    const next = dirname(current);
    if (next === current) return paths;
    current = next;
  }
}
export function declarationCompilerEnvironment(): NodeJS.ProcessEnv {
  return { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nativeGetter(compiler: string): string {
  const root = resolve(dirname(compiler), "..");
  const metadata: unknown = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  if (
    !isRecord(metadata) ||
    !isRecord(metadata.imports) ||
    typeof metadata.imports["#getExePath"] !== "string"
  )
    throw new Error("Unsupported native launcher imports mapping");
  return createRequire(compiler).resolve("#getExePath");
}
function nativeExecutable(getter: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import getExePath from " +
        JSON.stringify(getter) +
        "; console.log(getExePath());",
    ],
    { encoding: "utf8", env: declarationCompilerEnvironment() },
  );
  if (result.status !== 0 || result.stderr !== "")
    throw new Error("Native launcher resolution failed: " + result.stderr);
  const executable = result.stdout.trim();
  if (!isAbsolute(executable) || !existsSync(executable))
    throw new Error("Native launcher did not resolve an executable");
  return executable;
}
function cohortFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? cohortFiles(path) : [path];
  });
}
function toolchainPaths(compiler: string): string[] {
  const getter = nativeGetter(compiler);
  return [
    process.execPath,
    compiler,
    getter,
    nativeExecutable(getter),
    ...cohortFiles(resolve(dirname(compiler), "..")),
    ...cohortFiles(
      dirname(
        createRequire(import.meta.url).resolve("typescript/package.json"),
      ),
    ),
  ];
}
function configDirectoryEntries(directory: string, paths: Set<string>) {
  paths.add(resolve(directory));
  try {
    const files: string[] = [],
      folders: string[] = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) paths.add(path);
      if (ts.sys.directoryExists(path)) folders.push(entry.name);
      else files.push(entry.name);
    }
    return { files, directories: folders };
  } catch (error) {
    if (isAbsentError(error)) return { files: [], directories: [] };
    throw error;
  }
}
function configPaths(config: string): { paths: string[]; options: string } {
  const paths = new Set<string>([config]);
  const read = (path: string): string | undefined => {
    paths.add(resolve(path));
    return ts.sys.readFile(path);
  };
  const parsed = ts.getParsedCommandLineOfConfigFile(
    config,
    {},
    {
      ...ts.sys,
      readFile: read,
      fileExists: (path) => {
        paths.add(resolve(path));
        return ts.sys.fileExists(path);
      },
      directoryExists: (path) => {
        paths.add(resolve(path));
        return ts.sys.directoryExists(path);
      },
      realpath: (path) => {
        paths.add(resolve(path));
        return ts.sys.realpath?.(path) ?? path;
      },
      readDirectory: (root, extensions, excludes, includes, depth) => {
        // Use the pinned TypeScript filesystem walk, including external glob bases
        // and directory symlinks. Reject an unsupported adapter rather than infer
        // the glob's lookup namespace from its resulting files.
        const matchFiles: unknown = Reflect.get(ts, "matchFiles");
        if (typeof matchFiles !== "function")
          throw new Error("Pinned TypeScript glob adapter is unavailable");
        let directories = 0;
        const entries = (directory: string) => {
          if (++directories > 20_000)
            throw new Error("Config directory observation budget exceeded");
          return configDirectoryEntries(directory, paths);
        };
        const result: unknown = Reflect.apply(matchFiles, ts, [
          root,
          extensions,
          excludes,
          includes,
          ts.sys.useCaseSensitiveFileNames,
          ts.sys.getCurrentDirectory(),
          depth,
          entries,
          (path: string) => {
            paths.add(resolve(path));
            return ts.sys.realpath?.(path) ?? path;
          },
        ]);
        if (
          !Array.isArray(result) ||
          !result.every((path): path is string => typeof path === "string")
        )
          throw new Error(
            "Pinned TypeScript glob adapter returned invalid paths",
          );
        return result;
      },
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      },
    },
  );
  if (parsed === undefined || parsed.errors.length > 0)
    throw new Error(
      "Declaration config rejected: " +
        parsed?.errors
          .map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"))
          .join("\n"),
    );
  for (const path of parsed.fileNames) paths.add(resolve(path));
  return {
    paths: [...paths],
    options: JSON.stringify({
      options: parsed.options,
      files: parsed.fileNames,
    }),
  };
}
function resolverPathList(line: string, quoteIndex: number): boolean {
  return (
    (line.startsWith("======== Resolving type reference directive") &&
      quoteIndex === 2) ||
    (line.startsWith("Resolving with primary search path") && quoteIndex === 0)
  );
}
function quotedPathCandidates(
  line: string,
  index: number,
  value: string,
): string[] {
  if (!isAbsolute(value)) return [];
  const list = resolverPathList(line, index);
  const paths = list ? value.split(",").map((path) => path.trim()) : [value];
  if ((!list && value.includes(",")) || paths.some((path) => !isAbsolute(path)))
    throw new Error("Ambiguous native resolution path: " + value);
  return paths.map((path) => resolve(path));
}
function tracePathCandidates(line: string): string[] {
  if (!traceForms.has(line.replace(/'[^']*'/g, "'<value>'")))
    throw new Error("Unsupported native resolution trace: " + line);
  return [...line.matchAll(/'([^']*)'/g)].flatMap((match, index) =>
    match[1] === undefined ? [] : quotedPathCandidates(line, index, match[1]),
  );
}
function nativeTraceOutput(input: DeclarationCacheInput): string {
  const result = spawnSync(
    process.execPath,
    [
      input.compiler,
      "-p",
      input.config,
      "--listFilesOnly",
      "--traceResolution",
      "--pretty",
      "false",
    ],
    {
      cwd: input.repoRoot,
      encoding: "utf8",
      maxBuffer: TRACE_LIMIT_BYTES,
      env: declarationCompilerEnvironment(),
    },
  );
  if (result.error !== undefined || result.status !== 0 || result.stderr !== "")
    throw new Error(
      "Declaration discovery failed: " +
        (result.error?.message ?? result.stderr + result.stdout),
    );
  return result.stdout;
}
function nativeInventory(input: DeclarationCacheInput) {
  const output = nativeTraceOutput(input);
  const paths = new Set<string>(),
    sources: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    if (line === "") continue;
    if (isAbsolute(line)) {
      paths.add(resolve(line));
      sources.push(resolve(line));
    } else for (const path of tracePathCandidates(line)) paths.add(path);
  }
  if (sources.length === 0)
    throw new Error("Native discovery omitted declaration sources");
  return { paths, sources };
}
function verifyLoadedImplementation(input: DeclarationCacheInput): void {
  for (const loaded of [...loadedImplementation, ...input.loadedOwners])
    if (hash(readFileSync(loaded.path)) !== loaded.digest)
      throw new Error(
        "Loaded declaration emission implementation changed; restart the process",
      );
}
function includeAncestorManifests(paths: Set<string>): void {
  for (const path of [...paths])
    for (const ancestor of ancestors(path))
      paths.add(join(ancestor, "package.json"));
}
function discover(input: DeclarationCacheInput): {
  paths: string[];
  identity: string;
} {
  verifyLoadedImplementation(input);
  const { paths, sources } = nativeInventory(input),
    config = configPaths(input.config);
  verifyLoadedImplementation(input);
  for (const path of [
    ...config.paths,
    ...input.ownerPaths,
    ...input.loadedOwners.map((loaded) => loaded.path),
    ...input.copiedPaths,
    ...toolchainPaths(input.compiler),
    ...loadedImplementation.map((loaded) => loaded.path),
  ])
    paths.add(resolve(path));
  includeAncestorManifests(paths);
  return {
    paths: [...paths].sort(),
    identity: JSON.stringify({
      sources: [...new Set(sources)].sort(),
      config: config.options,
      paths: [...paths].sort(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    }),
  };
}
function includeSymlinkTarget(
  paths: Set<string>,
  ancestor: string,
  visited: Set<string>,
): void {
  try {
    if (lstatSync(ancestor).isSymbolicLink()) {
      paths.add(ancestor);
      includeTopology(
        paths,
        resolve(dirname(ancestor), readlinkSync(ancestor)),
        visited,
      );
    }
  } catch (error) {
    if (!isAbsentError(error)) throw error;
  }
}
function includeTopology(
  paths: Set<string>,
  path: string,
  visited: Set<string>,
): void {
  if (visited.has(path)) return;
  visited.add(path);
  paths.add(path);
  paths.add(nearestParent(path));
  for (const ancestor of [path, ...ancestors(path)])
    includeSymlinkTarget(paths, ancestor, visited);
  if (existsSync(path)) {
    const real = realpathSync(path);
    paths.add(real);
    paths.add(dirname(real));
  }
}
function capture(input: DeclarationCacheInput): Capture | undefined {
  const discovery = discover(input);
  const paths = new Set(discovery.paths);
  const visited = new Set<string>();
  for (const path of discovery.paths) includeTopology(paths, path, visited);
  const observations = [...paths].sort().map(observe);
  const next = discover(input);
  if (discovery.identity !== next.identity || !stable(observations))
    return undefined;
  return {
    digest: hash(
      JSON.stringify({
        discovery: discovery.identity,
        inputs: observations.map((o) => o.identity),
      }),
    ),
    observations,
    discovery: discovery.identity,
  };
}
function stable(observations: readonly Observation[]): boolean {
  return observations.every((o) => {
    try {
      return statWitness(o.path) === o.witness;
    } catch (error) {
      return (
        o.witness === "absent" &&
        error instanceof Error &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      );
    }
  });
}
function stillCurrent(input: DeclarationCacheInput, capture: Capture): boolean {
  if (!stable(capture.observations)) return false;
  return (
    discover(input).identity === capture.discovery &&
    stable(capture.observations)
  );
}
function artifactLedger(directory: string): string {
  const files: { path: string; sha: string }[] = [];
  const visit = (root: string, prefix: string): void => {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name),
        relative = prefix + entry.name;
      if (entry.isDirectory()) visit(path, relative + "/");
      else if (entry.isFile())
        files.push({ path: relative, sha: hash(readFileSync(path)) });
      else throw new Error("Cache artifact contains a link or special file");
    }
  };
  visit(directory, "");
  if (files.length === 0) throw new Error("Empty declaration artifact");
  return JSON.stringify(files.sort((a, b) => a.path.localeCompare(b.path)));
}
function entryMetadata(
  value: unknown,
  digest: string,
): { readonly ledger: string } | undefined {
  return isRecord(value) &&
    value.format === FORMAT &&
    value.digest === digest &&
    typeof value.ledger === "string"
    ? { ledger: value.ledger }
    : undefined;
}
function entryOwnsOnlyArtifact(entry: string): boolean {
  return (
    readdirSync(entry).sort().join("|") === "declarations|metadata.json" &&
    lstatSync(entry).isDirectory() &&
    lstatSync(join(entry, "metadata.json")).isFile() &&
    lstatSync(join(entry, "declarations")).isDirectory()
  );
}
function validateEntry(
  entry: string,
  digest: string,
): { readonly ledger: string } | undefined {
  try {
    const metadata = entryMetadata(
      JSON.parse(readFileSync(join(entry, "metadata.json"), "utf8")),
      digest,
    );
    if (metadata === undefined || !entryOwnsOnlyArtifact(entry))
      return undefined;
    return artifactLedger(join(entry, "declarations")) === metadata.ledger
      ? metadata
      : undefined;
  } catch {
    return undefined;
  }
}
function publish(stage: string, entry: string, digest: string): void {
  writeFileSync(
    join(stage, "metadata.json"),
    JSON.stringify({
      format: FORMAT,
      digest,
      ledger: artifactLedger(join(stage, "declarations")),
    }),
  );
  try {
    renameSync(stage, entry);
  } catch (error) {
    // A loser returns its own strictly compiled/admitted artifact. It neither
    // consumes nor replaces the other entry, whether valid or corrupt.
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "EEXIST" || error.code === "ENOTEMPTY")
    )
      return;
    throw error;
  }
}

type Attempt = DeclarationCacheResult | { readonly kind: "retry" };
type Materialized =
  | { readonly kind: "ok"; readonly cache: "hit" | "miss" }
  | { readonly kind: "retry" }
  | Extract<DeclarationCacheResult, { kind: "failure" }>;
function checkAdmission(
  input: DeclarationCacheInput,
  directory: string,
): Checked {
  try {
    return input.admit(directory);
  } catch (error) {
    return failure(errorMessage(error));
  }
}
function materialize(
  input: DeclarationCacheInput,
  captured: Capture,
  entry: string,
  directory: string,
  bypass: Set<string>,
): Materialized {
  const existing = bypass.has(entry)
    ? undefined
    : validateEntry(entry, captured.digest);
  const cache = existing === undefined ? "miss" : "hit";
  if (existing !== undefined) {
    cpSync(join(entry, "declarations"), directory, { recursive: true });
    if (artifactLedger(directory) !== existing.ledger) {
      bypass.add(entry);
      return { kind: "retry" };
    }
  } else {
    mkdirSync(directory);
    const compiled = input.compile(directory);
    if (compiled.kind === "failure") return compiled;
  }
  const admitted = checkAdmission(input, directory);
  if (admitted.kind === "failure") {
    if (cache === "hit") {
      bypass.add(entry);
      return { kind: "retry" };
    }
    return admitted;
  }
  return { kind: "ok", cache };
}
function publishIfUnclaimed(
  input: DeclarationCacheInput,
  captured: Capture,
  entry: string,
  directory: string,
  cacheRoot: string,
): boolean {
  if (existsSync(entry)) return true;
  const publication = mkdtempSync(join(cacheRoot, "publish-"));
  try {
    cpSync(directory, join(publication, "declarations"), { recursive: true });
    if (!stillCurrent(input, captured)) return false;
    publish(publication, entry, captured.digest);
    return true;
  } finally {
    rmSync(publication, { recursive: true, force: true });
  }
}
function expose(
  input: DeclarationCacheInput,
  captured: Capture,
  directory: string,
): Checked | { readonly kind: "retry" } {
  if (existsSync(input.destination))
    return failure("Declaration destination already exists");
  const output = mkdtempSync(
    join(dirname(input.destination), ".declarations-"),
  );
  try {
    cpSync(directory, output, { recursive: true });
    const final = checkAdmission(input, output);
    if (final.kind === "failure") return final;
    if (!stillCurrent(input, captured)) return { kind: "retry" };
    renameSync(output, input.destination);
    return { kind: "ok" };
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}
function attemptEmission(
  input: DeclarationCacheInput,
  captured: Capture,
  cacheRoot: string,
  bypass: Set<string>,
): Attempt {
  const entry = join(cacheRoot, captured.digest),
    stage = mkdtempSync(join(cacheRoot, "stage-")),
    directory = join(stage, "declarations");
  try {
    const materialized = materialize(input, captured, entry, directory, bypass);
    if (materialized.kind !== "ok") return materialized;
    if (!stillCurrent(input, captured)) return { kind: "retry" };
    if (
      materialized.cache === "miss" &&
      !publishIfUnclaimed(input, captured, entry, directory, cacheRoot)
    )
      return { kind: "retry" };
    const exposed = expose(input, captured, directory);
    return exposed.kind === "ok"
      ? { kind: "ok", cache: materialized.cache }
      : exposed;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
export function emitCachedDeclarations(
  input: DeclarationCacheInput,
): DeclarationCacheResult {
  try {
    const cacheRoot =
      input.cacheRoot ??
      join(
        tmpdir(),
        "dnd-declaration-cache",
        hash(realpathSync(input.repoRoot)),
      );
    mkdirSync(cacheRoot, { recursive: true });
    const bypass = new Set<string>();
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const captured = capture(input);
      if (captured === undefined) continue;
      const result = attemptEmission(input, captured, cacheRoot, bypass);
      if (result.kind !== "retry") return result;
    }
    return failure(
      "Declaration inputs did not remain stable within retry budget",
    );
  } catch (error) {
    return failure(errorMessage(error));
  }
}
