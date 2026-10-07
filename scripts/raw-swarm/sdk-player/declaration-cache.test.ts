import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  cpSync,
  renameSync,
  existsSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import {
  declarationCompilerEnvironment,
  emitCachedDeclarations,
} from "./declaration-cache.ts";

const roots: string[] = [];
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const scratch = resolve(".scratch");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "declaration-cache-test-"));
  roots.push(root);
  const source = join(root, "source");
  mkdirSync(source);
  mkdirSync(join(root, "destinations"));
  writeFileSync(join(source, "index.ts"), 'export {value} from "./value.js";');
  writeFileSync(join(source, "value.ts"), 'export const value = "first";');
  const config = join(source, "tsconfig.json");
  writeFileSync(
    config,
    JSON.stringify({
      files: ["index.ts"],
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        declaration: true,
        emitDeclarationOnly: true,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        types: [],
      },
    }),
  );
  const compiler = resolve(
    dirname(
      createRequire(import.meta.url).resolve("@typescript/native/package.json"),
    ),
    "bin/tsc",
  );
  let compilations = 0;
  const input = {
    repoRoot: source,
    config,
    compiler,
    cacheRoot: join(root, "cache"),
    loadedOwners: [],
    ownerPaths: [join(source, "tsconfig.json")],
    copiedPaths: [],
    compile(directory: string) {
      compilations++;
      const result = spawnSync(
        process.execPath,
        [compiler, "-p", config, "--outDir", directory, "--pretty", "false"],
        { encoding: "utf8", env: declarationCompilerEnvironment() },
      );
      return result.status === 0 && result.stdout === "" && result.stderr === ""
        ? { kind: "ok" as const }
        : { kind: "failure" as const, message: result.stdout + result.stderr };
    },
    admit(directory: string) {
      return readFileSync(join(directory, "value.d.ts"), "utf8").includes(
        "export declare const value",
      )
        ? { kind: "ok" as const }
        : { kind: "failure" as const, message: "unexpected artifact" };
    },
  };
  return { root, source, input, compilations: () => compilations };
}
test("reuses a strictly emitted declaration in fresh independent destinations", () => {
  const f = fixture();
  expect(
    emitCachedDeclarations({
      ...f.input,
      destination: join(f.root, "destinations", "one"),
    }),
  ).toEqual({ kind: "ok", cache: "miss" });
  expect(
    emitCachedDeclarations({
      ...f.input,
      destination: join(f.root, "destinations", "two"),
    }),
  ).toEqual({ kind: "ok", cache: "hit" });
  expect(f.compilations()).toBe(1);
  writeFileSync(
    join(f.root, "destinations", "one", "value.d.ts"),
    "mutated destination",
  );
  expect(
    readFileSync(join(f.root, "destinations", "two", "value.d.ts"), "utf8"),
  ).toContain('"first"');
});

function emit(f: ReturnType<typeof fixture>, name: string) {
  return emitCachedDeclarations({
    ...f.input,
    destination: join(f.root, "destinations", name),
  });
}
function entries(f: ReturnType<typeof fixture>) {
  return readdirSync(f.input.cacheRoot).filter((name) =>
    /^[a-f0-9]{64}$/.test(name),
  );
}
test("a transitive source edit invalidates the previous artifact", () => {
  const f = fixture();
  expect(emit(f, "one").kind).toBe("ok");
  writeFileSync(join(f.source, "value.ts"), 'export const value = "second";');
  expect(emit(f, "two")).toEqual({ kind: "ok", cache: "miss" });
  expect(f.compilations()).toBe(2);
  expect(
    readFileSync(join(f.root, "destinations", "two", "value.d.ts"), "utf8"),
  ).toContain('"second"');
});
test("config extends and package-format metadata are keyed even without a changed source list", () => {
  const f = fixture();
  const base = join(f.source, "base.json");
  writeFileSync(
    base,
    JSON.stringify({ compilerOptions: { target: "ES2022" } }),
  );
  const config = JSON.parse(readFileSync(f.input.config, "utf8"));
  writeFileSync(
    f.input.config,
    JSON.stringify({ ...config, extends: "./base.json" }),
  );
  expect(emit(f, "one").kind).toBe("ok");
  writeFileSync(
    base,
    JSON.stringify({ compilerOptions: { target: "ES2023" } }),
  );
  expect(emit(f, "two")).toEqual({ kind: "ok", cache: "miss" });
  writeFileSync(join(f.source, "package.json"), '{"type":"module"}');
  expect(emit(f, "three")).toEqual({ kind: "ok", cache: "miss" });
  expect(f.compilations()).toBe(3);
});
test("a newly created higher-precedence source invalidates declaration resolution", () => {
  const f = fixture();
  rmSync(join(f.source, "value.ts"));
  writeFileSync(
    join(f.source, "value.d.ts"),
    'export declare const value: "declaration";',
  );
  f.input.admit = (directory) =>
    readFileSync(join(directory, "index.d.ts"), "utf8").includes("value")
      ? { kind: "ok" }
      : { kind: "failure", message: "missing index" };
  expect(emit(f, "one").kind).toBe("ok");
  writeFileSync(join(f.source, "value.ts"), 'export const value = "shadow";');
  expect(emit(f, "two")).toEqual({ kind: "ok", cache: "miss" });
  expect(f.compilations()).toBe(2);
  expect(
    readFileSync(join(f.root, "destinations", "two", "value.d.ts"), "utf8"),
  ).toContain('"shadow"');
});
test("missing imports discovered with exit zero cannot create an entry", () => {
  const f = fixture();
  rmSync(join(f.source, "value.ts"));
  expect(emit(f, "one")).toMatchObject({ kind: "failure" });
  expect(f.compilations()).toBe(1);
  expect(entries(f)).toEqual([]);
});
test("an ordinary source A to B to A rewrite during compilation cannot publish", () => {
  const f = fixture(),
    compile = f.input.compile;
  f.input.compile = (directory) => {
    const result = compile(directory);
    const path = join(f.source, "value.ts"),
      original = readFileSync(path, "utf8");
    writeFileSync(path, "export const value = 2;");
    writeFileSync(path, original);
    return result;
  };
  expect(emit(f, "one")).toMatchObject({
    kind: "failure",
    message: "Declaration inputs did not remain stable within retry budget",
  });
  expect(entries(f)).toEqual([]);
  expect(f.compilations()).toBe(3);
});
test("transient directory and symlink changes invalidate a compilation transaction", () => {
  const f = fixture(),
    compile = f.input.compile;
  f.input.compile = (directory) => {
    const result = compile(directory);
    const path = join(f.source, "transient");
    symlinkSync(join(f.source, "value.ts"), path);
    rmSync(path);
    return result;
  };
  expect(emit(f, "one")).toMatchObject({ kind: "failure" });
  expect(entries(f)).toEqual([]);
});
for (const corrupt of [
  "metadata",
  "content",
  "extra",
  "missing",
  "symlink",
] as const) {
  test(`a ${corrupt} corrupt entry is a miss without modifying a concurrent owner's entry`, () => {
    const f = fixture();
    expect(emit(f, "one").kind).toBe("ok");
    const entry = entries(f)[0];
    expect(entry).toBeDefined();
    if (entry === undefined) return;
    const root = join(f.input.cacheRoot, entry),
      file = join(root, "declarations", "value.d.ts");
    if (corrupt === "metadata")
      writeFileSync(join(root, "metadata.json"), "{}");
    if (corrupt === "content") writeFileSync(file, "corrupt");
    if (corrupt === "extra")
      writeFileSync(join(root, "declarations", "extra.d.ts"), "extra");
    if (corrupt === "missing") rmSync(file);
    if (corrupt === "symlink") {
      rmSync(file);
      symlinkSync(join(f.root, "destinations", "one", "value.d.ts"), file);
    }
    expect(emit(f, "two")).toEqual({ kind: "ok", cache: "miss" });
    expect(f.compilations()).toBe(2);
    expect(readdirSync(f.input.cacheRoot)).toEqual([entry]);
    expect(
      readFileSync(join(f.root, "destinations", "two", "value.d.ts"), "utf8"),
    ).toContain('"first"');
  });
}

test("a source rewrite during hit admission does not expose a destination", () => {
  const f = fixture();
  expect(emit(f, "one").kind).toBe("ok");
  const admit = f.input.admit;
  f.input.admit = (directory) => {
    const result = admit(directory),
      path = join(f.source, "value.ts"),
      original = readFileSync(path, "utf8");
    writeFileSync(path, 'export const value = "transient";');
    writeFileSync(path, original);
    return result;
  };
  expect(emit(f, "two")).toMatchObject({ kind: "failure" });
  expect(f.compilations()).toBe(1);
  expect(existsSync(join(f.root, "destinations", "two"))).toBe(false);
});
test("an existing incomplete staging directory is never a cache entry", () => {
  const f = fixture();
  mkdirSync(f.input.cacheRoot);
  const staging = join(f.input.cacheRoot, "publish-interrupted");
  mkdirSync(staging);
  writeFileSync(join(staging, "metadata.json"), "{}");
  expect(emit(f, "one")).toEqual({ kind: "ok", cache: "miss" });
  expect(f.compilations()).toBe(1);
  expect(existsSync(staging)).toBe(true);
});
test("a corrupt entry becoming a valid concurrent winner is not removed or overwritten", () => {
  const f = fixture();
  expect(emit(f, "one").kind).toBe("ok");
  const entry = entries(f)[0];
  if (entry === undefined)
    throw new Error("The preceding successful emission proves an entry exists");
  const metadata = join(f.input.cacheRoot, entry, "metadata.json"),
    valid = readFileSync(metadata, "utf8");
  const winner = join(f.input.cacheRoot, "replacement-winner");
  cpSync(join(f.input.cacheRoot, entry), winner, { recursive: true });
  writeFileSync(metadata, "{}");
  const compile = f.input.compile;
  f.input.compile = (directory) => {
    const result = compile(directory);
    renameSync(
      join(f.input.cacheRoot, entry),
      join(f.input.cacheRoot, "replaced-corrupt"),
    );
    renameSync(winner, join(f.input.cacheRoot, entry));
    return result;
  };
  expect(emit(f, "two")).toEqual({ kind: "ok", cache: "miss" });
  expect(readFileSync(metadata, "utf8")).toBe(valid);
  expect(emit(f, "three")).toEqual({ kind: "ok", cache: "hit" });
  expect(f.compilations()).toBe(2);
});
test("the full production native closure and consulted paths are admitted by the pinned trace adapter", () => {
  const f = fixture(),
    repo = resolve(".");
  let calls = 0;
  const result = emitCachedDeclarations({
    ...f.input,
    repoRoot: repo,
    config: resolve("scripts/raw-swarm/sdk-player/declarations.tsconfig.json"),
    ownerPaths: [resolve("scripts/raw-swarm/sdk-player/declaration-cache.ts")],
    copiedPaths: [resolve("packages/shared/src/non-empty-array.d.ts")],
    destination: join(f.root, "destinations", "production"),
    compile() {
      calls++;
      return { kind: "failure", message: "Stop before production compilation" };
    },
  });
  expect(result).toEqual({
    kind: "failure",
    message: "Stop before production compilation",
  });
  expect(calls).toBe(1);
  expect(entries(f)).toEqual([]);
});
test("ambiguous quoted paths fail closed before strict compilation", () => {
  const f = fixture(),
    ambiguous = join(f.source, "ambiguous,folder");
  mkdirSync(ambiguous);
  writeFileSync(join(ambiguous, "value.ts"), 'export const value = "first";');
  writeFileSync(
    join(f.source, "index.ts"),
    'export {value} from "./ambiguous,folder/value.js";',
  );
  expect(emit(f, "one")).toMatchObject({ kind: "failure" });
  expect(f.compilations()).toBe(0);
  expect(entries(f)).toEqual([]);
});

test("simultaneous publishers produce one complete immutable entry", async () => {
  const f = fixture();
  mkdirSync(f.input.cacheRoot);
  const script = join(f.root, "publisher.mts"),
    cacheModule = resolve("scripts/raw-swarm/sdk-player/declaration-cache.ts");
  writeFileSync(
    script,
    `
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import declarationCache from ${JSON.stringify(cacheModule)};
const {emitCachedDeclarations}=declarationCache;
const result=emitCachedDeclarations({repoRoot:${JSON.stringify(f.source)},config:${JSON.stringify(f.input.config)},compiler:${JSON.stringify(f.input.compiler)},cacheRoot:${JSON.stringify(f.input.cacheRoot)},ownerPaths:[${JSON.stringify(f.input.config)}],loadedOwners:[],copiedPaths:[],destination:join(${JSON.stringify(f.root)},"destinations",process.argv[2]),compile(directory){const r=spawnSync(process.execPath,[${JSON.stringify(f.input.compiler)},"-p",${JSON.stringify(f.input.config)},"--outDir",directory,"--pretty","false"],{encoding:"utf8"});return r.status===0&&r.stdout===""&&r.stderr===""?{kind:"ok"}:{kind:"failure",message:r.stdout+r.stderr};},admit(directory){return readFileSync(join(directory,"value.d.ts"),"utf8").includes('"first"')?{kind:"ok"}:{kind:"failure",message:"incorrect"};}});
console.log(JSON.stringify(result));if(result.kind!=="ok")process.exitCode=1;
`,
  );
  const run = (name: string) =>
    new Promise<string>((done, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          createRequire(import.meta.url).resolve("tsx"),
          script,
          name,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "",
        error = "";
      child.stdout.on("data", (data) => {
        output += String(data);
      });
      child.stderr.on("data", (data) => {
        error += String(data);
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? done(output) : reject(new Error(output + error)),
      );
    });
  const results = await Promise.all([run("one"), run("two")]);
  expect(results.map((r) => JSON.parse(r))).toEqual([
    expect.objectContaining({ kind: "ok" }),
    expect.objectContaining({ kind: "ok" }),
  ]);
  expect(entries(f)).toHaveLength(1);
  expect(
    readFileSync(join(f.root, "destinations", "one", "value.d.ts"), "utf8"),
  ).toBe(
    readFileSync(join(f.root, "destinations", "two", "value.d.ts"), "utf8"),
  );
  expect(emit(f, "three")).toEqual({ kind: "ok", cache: "hit" });
});

for (const namespace of ["external", "symlink"] as const) {
  test(`a transient source in an empty ${namespace} config glob namespace invalidates publication`, () => {
    const f = fixture(),
      external = join(f.root, "external"),
      empty = join(external, "empty");
    mkdirSync(empty, { recursive: true });
    const config = JSON.parse(readFileSync(f.input.config, "utf8"));
    if (namespace === "symlink")
      symlinkSync(external, join(f.source, "linked"));
    writeFileSync(
      f.input.config,
      JSON.stringify({
        ...config,
        include:
          namespace === "external"
            ? ["**/*.ts", "../external/**/*.ts"]
            : ["**/*.ts"],
      }),
    );
    const compile = f.input.compile;
    f.input.compile = (directory) => {
      const result = compile(directory),
        path = join(empty, "transient.ts");
      writeFileSync(path, "export const transient = 1;");
      rmSync(path);
      return result;
    };
    expect(emit(f, "one")).toMatchObject({ kind: "failure" });
    expect(entries(f)).toEqual([]);
    expect(f.compilations()).toBe(3);
  });
}
test("copy and admission-policy input edits invalidate reuse", () => {
  const f = fixture(),
    copied = join(f.source, "copied.d.ts"),
    policy = join(f.source, "policy.json");
  writeFileSync(copied, "export type Copied = 1;");
  writeFileSync(policy, '{"version":1}');
  const input = {
    ...f.input,
    copiedPaths: [copied],
    ownerPaths: [...f.input.ownerPaths, policy],
  };
  const run = (name: string) =>
    emitCachedDeclarations({
      ...input,
      destination: join(f.root, "destinations", name),
    });
  expect(run("one")).toEqual({ kind: "ok", cache: "miss" });
  writeFileSync(copied, "export type Copied = 2;");
  expect(run("two")).toEqual({ kind: "ok", cache: "miss" });
  writeFileSync(policy, '{"version":2}');
  expect(run("three")).toEqual({ kind: "ok", cache: "miss" });
  expect(f.compilations()).toBe(3);
});
test("a strict native diagnostic cannot publish its partially emitted declarations", () => {
  const f = fixture();
  writeFileSync(join(f.source, "value.ts"), "export const value: string = 1;");
  expect(emit(f, "one")).toMatchObject({ kind: "failure" });
  expect(f.compilations()).toBe(1);
  expect(readdirSync(f.input.cacheRoot)).toEqual([]);
});
function nativeLauncher(f: ReturnType<typeof fixture>, traceLine: string = "") {
  const root = join(f.root, "launcher");
  mkdirSync(join(root, "bin"), { recursive: true });
  mkdirSync(join(root, "lib"));
  const canonical = resolve(dirname(f.input.compiler), "../lib/getExePath.js");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: { "#getExePath": "./lib/getter.js" },
    }),
  );
  writeFileSync(
    join(root, "lib", "getter.js"),
    `export {default} from ${JSON.stringify(canonical)};`,
  );
  writeFileSync(
    join(root, "lib", "tsc.js"),
    readFileSync(resolve(dirname(f.input.compiler), "../lib/tsc.js")),
  );
  writeFileSync(
    join(root, "bin", "tsc"),
    `if(process.argv.includes("--traceResolution")) console.log(${JSON.stringify(traceLine)}); await import("../lib/tsc.js");`,
  );
  const compiler = join(root, "bin", "tsc");
  const input = {
    ...f.input,
    compiler,
    ownerPaths: [...f.input.ownerPaths, canonical],
    compile(directory: string) {
      const result = spawnSync(
        process.execPath,
        [
          compiler,
          "-p",
          f.input.config,
          "--outDir",
          directory,
          "--pretty",
          "false",
        ],
        { encoding: "utf8", env: declarationCompilerEnvironment() },
      );
      return result.status === 0 && result.stdout === "" && result.stderr === ""
        ? { kind: "ok" as const }
        : { kind: "failure" as const, message: result.stdout + result.stderr };
    },
  };
  return {
    root,
    input,
    run: (name: string) =>
      emitCachedDeclarations({
        ...input,
        destination: join(f.root, "destinations", name),
      }),
  };
}
test("native launcher mapping and implementation changes invalidate the key", () => {
  const f = fixture(),
    launcher = nativeLauncher(f);
  expect(launcher.run("one")).toEqual({ kind: "ok", cache: "miss" });
  writeFileSync(
    join(launcher.root, "lib", "getter-two.js"),
    readFileSync(join(launcher.root, "lib", "getter.js"), "utf8") +
      "\n// changed helper\n",
  );
  writeFileSync(
    join(launcher.root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: { "#getExePath": "./lib/getter-two.js" },
    }),
  );
  expect(launcher.run("two")).toEqual({ kind: "ok", cache: "miss" });
  writeFileSync(
    join(launcher.root, "bin", "tsc"),
    readFileSync(join(launcher.root, "bin", "tsc"), "utf8") +
      "\n// changed launcher\n",
  );
  expect(launcher.run("three")).toEqual({ kind: "ok", cache: "miss" });
});
test("an unknown path-bearing native trace form fails closed", () => {
  const f = fixture(),
    launcher = nativeLauncher(
      f,
      `Unrecognized lookup '${join(f.source, "unknown.ts")}'.`,
    );
  expect(launcher.run("one")).toMatchObject({
    kind: "failure",
    message: expect.stringContaining("Unsupported native resolution trace"),
  });
  expect(entries(f)).toEqual([]);
});

test("a loaded cache implementation cannot reuse entries under changed on-disk owner bytes", () => {
  const f = fixture(),
    module = join(f.root, "loaded-cache.mts"),
    script = join(f.root, "loaded-drift.mts");
  writeFileSync(
    module,
    readFileSync(resolve("scripts/raw-swarm/sdk-player/declaration-cache.ts")),
  );
  writeFileSync(
    script,
    `
import {writeFileSync,readFileSync} from "node:fs";
import {emitCachedDeclarations} from ${JSON.stringify(module)};
writeFileSync(${JSON.stringify(module)},readFileSync(${JSON.stringify(module)},"utf8")+"\\n// changed after load\\n");
let calls=0;
const result=emitCachedDeclarations({repoRoot:${JSON.stringify(f.source)},config:${JSON.stringify(f.input.config)},compiler:${JSON.stringify(f.input.compiler)},cacheRoot:${JSON.stringify(f.input.cacheRoot)},ownerPaths:[${JSON.stringify(f.input.config)}],loadedOwners:[],copiedPaths:[],destination:${JSON.stringify(join(f.root, "destinations", "one"))},compile(){calls++;return {kind:"failure",message:"Unexpected compilation"};},admit(){return {kind:"ok"};}});
console.log(JSON.stringify({result,calls}));
`,
  );
  const result = spawnSync(
    process.execPath,
    ["--import", createRequire(import.meta.url).resolve("tsx"), script],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    calls: 0,
    result: {
      kind: "failure",
      message:
        "Loaded declaration emission implementation changed; restart the process",
    },
  });
  expect(entries(f)).toEqual([]);
});
test("inherited Node preloads cannot change declaration discovery or emission", () => {
  const f = fixture(),
    options = process.env.NODE_OPTIONS,
    path = process.env.NODE_PATH;
  try {
    process.env.NODE_OPTIONS =
      "--import=/nonexistent/declaration-cache-preload.mjs";
    process.env.NODE_PATH = "/nonexistent/declaration-cache-modules";
    expect(emit(f, "one")).toEqual({ kind: "ok", cache: "miss" });
    expect(emit(f, "two")).toEqual({ kind: "ok", cache: "hit" });
  } finally {
    if (options === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = options;
    if (path === undefined) delete process.env.NODE_PATH;
    else process.env.NODE_PATH = path;
  }
});

test("a structurally complete entry still passes canonical admission before reuse", () => {
  const f = fixture();
  expect(emit(f, "one").kind).toBe("ok");
  const entry = entries(f)[0];
  if (entry === undefined)
    throw new Error("Successful publication proves an entry exists");
  const directory = join(f.input.cacheRoot, entry),
    file = join(directory, "declarations", "value.d.ts"),
    metadata = join(directory, "metadata.json");
  const before = readFileSync(file, "utf8"),
    after = before.replace('"first"', '"wrong"');
  writeFileSync(file, after);
  const receipt: unknown = JSON.parse(readFileSync(metadata, "utf8"));
  if (
    typeof receipt !== "object" ||
    receipt === null ||
    !("ledger" in receipt) ||
    typeof receipt.ledger !== "string"
  )
    throw new Error("Published metadata was checked above");
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  writeFileSync(
    metadata,
    JSON.stringify({
      ...receipt,
      ledger: receipt.ledger.replace(digest(before), digest(after)),
    }),
  );
  f.input.admit = (path) => {
    if (!readFileSync(join(path, "value.d.ts"), "utf8").includes('"first"'))
      throw new Error("Canonical admission rejects wrong declaration");
    return { kind: "ok" };
  };
  expect(emit(f, "two")).toEqual({ kind: "ok", cache: "miss" });
  expect(f.compilations()).toBe(2);
  expect(
    readFileSync(join(f.root, "destinations", "two", "value.d.ts"), "utf8"),
  ).toBe(before);
  expect(readFileSync(file, "utf8")).toBe(after);
});

test("loaded emission owner drift during first discovery rejects capture", () => {
  const f = fixture(),
    launcher = nativeLauncher(f);
  const policy = join(f.root, "emission-policy.ts");
  writeFileSync(policy, "export const policy = 'loaded';");
  const loadedOwners = [
    {
      path: policy,
      digest: createHash("sha256").update(readFileSync(policy)).digest("hex"),
    },
  ];
  const compiler = join(launcher.root, "bin", "tsc");
  writeFileSync(
    compiler,
    `import {writeFileSync} from "node:fs"; if(process.argv.includes("--traceResolution")) writeFileSync(${JSON.stringify(policy)}, "export const policy = 'changed';"); await import("../lib/tsc.js");`,
  );
  let compilations = 0;
  expect(
    emitCachedDeclarations({
      ...launcher.input,
      loadedOwners,
      compile(directory) {
        compilations++;
        return launcher.input.compile(directory);
      },
      destination: join(f.root, "destinations", "one"),
    }),
  ).toMatchObject({
    kind: "failure",
    message: expect.stringContaining("restart the process"),
  });
  expect(compilations).toBe(0);
  expect(readdirSync(f.input.cacheRoot)).toEqual([]);
  expect(existsSync(join(f.root, "destinations", "one"))).toBe(false);
});
