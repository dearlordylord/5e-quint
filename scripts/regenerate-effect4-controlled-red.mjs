import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(
  repositoryRoot,
  "docs/migrations/effect-4/controlled-red-inventory.json",
);
const typecheckArgumentList = ["--pretty", "false"];
const diagnosticPattern = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.*)$/;
const colonDiagnosticPattern =
  /^(.+):(\d+):(\d+)\s+-\s+error\s+(TS\d+):\s*(.*)$/;
const globalDiagnosticPattern = /^error\s+(TS\d+):\s*(.*)$/;
const ansiPattern = new RegExp(
  `${String.fromCodePoint(0x1b)}\\[[0-?]*[ -/]*[@-~]`,
  "g",
);
const diagnosticFamilies = [
  {
    name: "removed-module-entrypoints",
    codes: ["TS2305", "TS2307"],
  },
  {
    name: "removed-renamed-effect-api-members",
    codes: ["TS2551", "TS2694", "TS2724"],
  },
  {
    name: "changed-schema-type-signatures",
    codes: [
      "TS2314",
      "TS2344",
      "TS2394",
      "TS2554",
      "TS2556",
      "TS2558",
      "TS2560",
      "TS2740",
      "TS2741",
      "TS2749",
      "TS2769",
    ],
  },
  {
    name: "downstream-type-inference-cascade",
    codes: [],
  },
];
const familyByCode = new Map(
  diagnosticFamilies
    .slice(0, -1)
    .flatMap(({ name, codes }) => codes.map((code) => [code, name])),
);

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const parsePnpmVersion = (packageManager) => {
  const match = /^pnpm@([^\s+]+)$/.exec(packageManager ?? "");
  if (match === null) {
    throw new Error(
      `package.json must declare an exact pnpm packageManager, found ${packageManager ?? "<missing>"}`,
    );
  }
  return match[1];
};

const assertBroadLock = () => {
  if (process.env.DND_RESOURCE_LOCK_KIND !== "broad") {
    throw new Error(
      "controlled-red inventory requires the broad workspace lock; run pnpm regenerate:effect4-controlled-red",
    );
  }
};

const runPnpm = async (args) => {
  try {
    const result = await execFileAsync("pnpm", args, {
      cwd: repositoryRoot,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      maxBuffer: 128 * 1024 * 1024,
    });
    return {
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    if (typeof error.code === "number") {
      return {
        exitCode: error.code,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? "",
      };
    }
    throw new Error(
      `pnpm ${args.join(" ")} could not complete: ${error.message}`,
    );
  }
};

const readTypecheckOwners = async () => {
  const packageRoot = resolve(repositoryRoot, "packages");
  const entries = await readdir(packageRoot, { withFileTypes: true });
  const owners = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (!entry.isDirectory()) continue;
    const directory = resolve(packageRoot, entry.name);
    const manifestPath = resolve(directory, "package.json");
    let manifest;
    try {
      manifest = await readJson(manifestPath);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (typeof manifest.scripts?.typecheck !== "string") continue;
    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
      throw new Error(`typecheck owner has no package name: ${manifestPath}`);
    }
    owners.push({
      directory,
      manifestPath,
      name: manifest.name,
    });
  }
  if (owners.length === 0) {
    throw new Error("no package typecheck owners were discovered");
  }
  return owners;
};

const normalizeSourcePath = (source, ownerDirectory) => {
  if (source === "<global>") return source;
  const absolutePath = isAbsolute(source)
    ? resolve(source)
    : source.startsWith("packages/") || source.startsWith("scripts/")
      ? resolve(repositoryRoot, source)
      : resolve(ownerDirectory, source);
  const repositoryPath = relative(repositoryRoot, absolutePath);
  if (repositoryPath.startsWith("..") || isAbsolute(repositoryPath)) {
    return source;
  }
  return repositoryPath.split("\\").join("/");
};

const parseDiagnosticLine = (line, ownerDirectory) => {
  const match =
    diagnosticPattern.exec(line) ??
    colonDiagnosticPattern.exec(line) ??
    globalDiagnosticPattern.exec(line);
  if (match === null) return undefined;
  if (match.length === 6) {
    return {
      source: normalizeSourcePath(match[1], ownerDirectory),
      line: Number(match[2]),
      column: Number(match[3]),
      code: match[4],
      message: match[5].trim(),
    };
  }
  return {
    source: "<global>",
    line: 0,
    column: 0,
    code: match[1],
    message: match[2].trim(),
  };
};

const parseDiagnostics = (output, ownerDirectory) => {
  const diagnostics = [];
  let current;
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.replace(ansiPattern, "");
    const diagnostic = parseDiagnosticLine(line, ownerDirectory);
    if (diagnostic !== undefined) {
      current = diagnostic;
      diagnostics.push(diagnostic);
      continue;
    }
    if (current !== undefined && /^\s+\S/.test(line)) {
      current.message = `${current.message}\n${line.trim()}`;
      continue;
    }
    if (line.trim().length > 0) current = undefined;
  }
  return diagnostics;
};

const increment = (counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1);

const diagnosticKey = (diagnostic) =>
  JSON.stringify([
    diagnostic.source,
    diagnostic.line,
    diagnostic.column,
    diagnostic.code,
    diagnostic.message,
  ]);

const countByCode = (diagnostics) => {
  const counts = new Map();
  for (const diagnostic of diagnostics) increment(counts, diagnostic.code);
  return counts;
};

const familyName = (code) =>
  familyByCode.get(code) ?? "downstream-type-inference-cascade";

const countByFamily = (diagnostics) => {
  const counts = new Map(
    diagnosticFamilies.map(({ name }) => [name, { raw: 0, deduplicated: 0 }]),
  );
  for (const diagnostic of diagnostics) {
    counts.get(familyName(diagnostic.code)).raw += 1;
  }
  return counts;
};

const main = async () => {
  assertBroadLock();
  const repositoryManifest = await readJson(
    resolve(repositoryRoot, "package.json"),
  );
  const expectedPnpmVersion = parsePnpmVersion(
    repositoryManifest.packageManager,
  );
  const pnpmVersion = await runPnpm(["--version"]);
  if (
    pnpmVersion.exitCode !== 0 ||
    pnpmVersion.stdout.trim() !== expectedPnpmVersion
  ) {
    throw new Error(
      `inventory requires pnpm@${expectedPnpmVersion}; resolved ${pnpmVersion.stdout.trim() || "<empty>"}`,
    );
  }

  const owners = await readTypecheckOwners();
  const diagnostics = [];
  const ownerRecords = [];
  for (const owner of owners) {
    const commandArguments = [
      "--filter",
      owner.name,
      "run",
      "typecheck",
      ...typecheckArgumentList,
    ];
    const result = await runPnpm(commandArguments);
    if (![0, 1, 2].includes(result.exitCode)) {
      throw new Error(
        `${owner.name} typecheck exited ${result.exitCode}; controlled-red inventory accepts only TypeScript result codes 0, 1, or 2`,
      );
    }
    const ownerDiagnostics = parseDiagnostics(
      `${result.stdout}\n${result.stderr}`,
      owner.directory,
    );
    if (result.exitCode === 1 && ownerDiagnostics.length === 0) {
      throw new Error(
        `${owner.name} typecheck exited 1 without a TypeScript diagnostic`,
      );
    }
    diagnostics.push(...ownerDiagnostics);
    ownerRecords.push({
      package: owner.name,
      manifest: relative(repositoryRoot, owner.manifestPath)
        .split("\\")
        .join("/"),
      command: `pnpm --filter ${owner.name} run typecheck --pretty false`,
      exitCode: result.exitCode,
      rawDiagnostics: ownerDiagnostics.length,
    });
  }

  const uniqueDiagnostics = [
    ...new Map(
      diagnostics.map((diagnostic) => [diagnosticKey(diagnostic), diagnostic]),
    ).values(),
  ];
  const rawCodeCounts = countByCode(diagnostics);
  const uniqueCodeCounts = countByCode(uniqueDiagnostics);
  const familyCounts = countByFamily(diagnostics);
  const uniqueFamilyCounts = countByFamily(uniqueDiagnostics);
  for (const { name } of diagnosticFamilies) {
    familyCounts.get(name).deduplicated = uniqueFamilyCounts.get(name).raw;
  }

  const output = {
    version: 1,
    generatedBy: "scripts/regenerate-effect4-controlled-red.mjs",
    generationCommand: "pnpm regenerate:effect4-controlled-red",
    lock: "broad",
    pnpm: expectedPnpmVersion,
    diagnosticKey: ["source", "line", "column", "code", "message"],
    owners: ownerRecords,
    totals: {
      raw: diagnostics.length,
      deduplicated: uniqueDiagnostics.length,
    },
    families: Object.fromEntries(
      diagnosticFamilies.map(({ name, codes }) => [
        name,
        {
          codes: codes.length > 0 ? codes : "all remaining TypeScript codes",
          raw: familyCounts.get(name).raw,
          deduplicated: familyCounts.get(name).deduplicated,
        },
      ]),
    ),
    codes: Object.fromEntries(
      [...new Set([...rawCodeCounts.keys(), ...uniqueCodeCounts.keys()])]
        .sort((left, right) => left.localeCompare(right))
        .map((code) => [
          code,
          {
            family: familyName(code),
            raw: rawCodeCounts.get(code) ?? 0,
            deduplicated: uniqueCodeCounts.get(code) ?? 0,
          },
        ]),
    ),
  };
  await writeFile(
    outputPath,
    await format(JSON.stringify(output), { filepath: outputPath }),
  );
  console.log(
    `Controlled-red inventory regenerated: ${relative(repositoryRoot, outputPath)} (${diagnostics.length} raw, ${uniqueDiagnostics.length} deduplicated diagnostics)`,
  );
};

await main();
