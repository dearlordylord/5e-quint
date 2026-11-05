import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verificationInputs } from "./verification-receipts.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DRIVER = "packages/mcp/scripts/dialogue-evaluation/run.mjs";
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const rows = (file) =>
  existsSync(file)
    ? readFileSync(file, "utf8").split("\n").filter(Boolean).map(JSON.parse)
    : [];
const save = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

export function dialogueWorkflowOptions(argv) {
  const [mode, ...args] = argv;
  if (!["repair", "qualify"].includes(mode))
    throw new Error(
      "Usage: dialogue:repair|dialogue:qualify --out <fresh-dir> --case <case> [driver options]",
    );
  const options = new Map();
  const allowed = new Set([
    "--repo",
    "--out",
    "--case",
    "--prompt",
    "--expect",
    "--model",
    "--max-turns",
    "--max-calls",
    "--timeout",
    "--compact-at-chars",
    "--code-interpreter",
    "--resume",
    "--resume-note",
    "--client",
  ]);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i],
      value = args[i + 1];
    if (
      !allowed.has(key) ||
      !value ||
      value.startsWith("--") ||
      options.has(key)
    )
      throw new Error(`Unknown, duplicated, or incomplete option: ${key}`);
    options.set(key, value);
  }
  if (!options.has("--out"))
    throw new Error("A fresh --out directory is required");
  if (
    mode === "qualify" &&
    (options.has("--resume") || options.has("--resume-note"))
  )
    throw new Error(
      "Qualification requires a fresh dialogue; use dialogue:repair for resume",
    );
  if (
    !options.has("--resume") &&
    options.has("--case") === options.has("--prompt")
  )
    throw new Error(
      "Supply exactly one --case or --prompt for a fresh dialogue",
    );
  if (options.has("--prompt") && !existsSync(resolve(options.get("--prompt"))))
    throw new Error("Prompt file does not exist");
  if (options.has("--prompt") && !options.has("--expect"))
    throw new Error(
      "Custom prompts require an explicit --expect acceptance scope",
    );
  for (const key of ["--prompt", "--resume"])
    if (options.has(key)) options.set(key, resolve(options.get(key)));
  for (const key of [
    "--max-calls",
    "--max-turns",
    "--timeout",
    "--compact-at-chars",
  ]) {
    if (
      options.has(key) &&
      (!/^[1-9][0-9]*$/u.test(options.get(key)) ||
        !Number.isSafeInteger(Number(options.get(key))))
    )
      throw new Error(`${key} must be a positive safe integer`);
  }
  if (
    options.has("--expect") &&
    !["catalog", "session", "wizardBattle"].includes(options.get("--expect"))
  )
    throw new Error("Unknown dialogue expectation");
  if (
    options.has("--code-interpreter") &&
    !["true", "false"].includes(options.get("--code-interpreter"))
  )
    throw new Error("--code-interpreter must be true or false");
  const codingAgent = options.get("--client") === "codex";
  if (
    codingAgent &&
    [...options.keys()].some((key) =>
      [
        "--resume",
        "--resume-note",
        "--model",
        "--max-turns",
        "--compact-at-chars",
        "--code-interpreter",
      ].includes(key),
    )
  )
    throw new Error(
      "The Codex driver supports fresh runs with --max-calls and --timeout; API-only options are not supported",
    );
  if (options.has("--client") && !codingAgent)
    throw new Error("Supported explicit client: codex");
  if (mode === "repair") {
    const limits = codingAgent
      ? [
          ["--max-calls", 12],
          ["--timeout", 180],
        ]
      : [
          ["--max-calls", 12],
          ["--max-turns", 8],
          ["--timeout", 180],
        ];
    for (const [key, limit] of limits) {
      const value = Number(options.get(key) ?? limit);
      if (!Number.isInteger(value) || value < 1 || value > limit)
        throw new Error(`Repair ${key} must be between 1 and ${limit}`);
      options.set(key, String(value));
    }
  }
  const repo = resolve(options.get("--repo") ?? ROOT);
  const out = resolve(options.get("--out"));
  if (existsSync(out)) throw new Error(`Output already exists: ${out}`);
  options.set("--repo", repo);
  options.set("--out", out);
  return { mode, repo, out, options, args: [...options].flat() };
}

function workflowInputs(config) {
  const hash = createHash("sha256").update(verificationInputs(config.repo));
  hash.update(JSON.stringify(config.args));
  if (config.options.has("--prompt"))
    hash.update(readFileSync(config.options.get("--prompt")));
  return hash.digest("hex");
}

function validateScenario(config) {
  if (!config.options.has("--case")) return;
  const inventory = json(
    join(config.repo, "plugins/dnd-srd-oracle/evals/evaluation-inventory.json"),
  );
  const scenario = inventory.autonomousDialogue.find(
    (entry) => entry.id === config.options.get("--case"),
  );
  if (!scenario) throw new Error("Unknown autonomous dialogue case");
  if (
    config.options.has("--expect") &&
    scenario.expectation !== config.options.get("--expect")
  )
    throw new Error(
      "Case expectation cannot be overridden; use a custom prompt for a different scope",
    );
}

// The canonical evaluator decides which calls failed. This owner only packages
// the evidence; it does not duplicate game rules or reinterpret tool responses.
export function captureDialogueFailures(out, rejectedCalls) {
  if (rejectedCalls.length === 0) return [];
  const calls = rows(join(out, "calls.jsonl"));
  const observations = rows(join(out, "observations.jsonl"));
  const capsuleRoot = join(out, "failure-evidence");
  mkdirSync(capsuleRoot, { recursive: true });
  const files = readdirSync(out).filter((name) =>
    /^(metadata|prompt|advertised-tools|driver-sources|checkpoint|source-verification|resume)\.(json|txt)$|^(request-tools-|response-|compaction-).*\.json$|^(calls|conversation|observations)\.jsonl$/u.test(
      name,
    ),
  );
  const hashes = {};
  const archive = join(capsuleRoot, "original");
  mkdirSync(archive);
  for (const name of files) {
    const bytes = readFileSync(join(out, name));
    hashes[name] = createHash("sha256").update(bytes).digest("hex");
    copyFileSync(join(out, name), join(archive, name));
  }
  return rejectedCalls.map((call) => {
    const index = calls.findIndex((entry) => entry.callId === call.callId);
    if (index < 0)
      throw new Error("Evaluator rejection has no original call evidence");
    const afterIndex = observations.findIndex(
      (entry) => entry.callId === call.callId,
    );
    if (afterIndex < 1)
      throw new Error("Rejected call has no observed before-state");
    const path = join(
      capsuleRoot,
      `call-${String(index + 1).padStart(5, "0")}.json`,
    );
    save(path, {
      version: 1,
      kind: "observedCallCounterexample",
      callNumber: index + 1,
      before: observations[afterIndex - 1],
      requestAndResponse: calls[index],
      after: observations[afterIndex],
      precedingCalls: calls.slice(0, index),
      archive: "original",
      archiveSha256: hashes,
      checkpointScope:
        "end-of-run; resume is diagnostic, not a pre-call database restore",
    });
    return path;
  });
}

function diagnosticProbe(
  config,
  evaluated,
  metadata,
  source,
  inputsStable,
  result,
) {
  const verdict = json(join(config.out, "verdict.json"));
  const calls = rows(join(config.out, "calls.jsonl"));
  const newCalls =
    metadata.evidenceKind === "codingAgentMcp"
      ? calls.length
      : verdict.newCalls;
  if (
    !Number.isSafeInteger(newCalls) ||
    newCalls < 0 ||
    newCalls > calls.length
  )
    throw new Error("Driver did not provide a valid diagnostic call boundary");
  const newCallIds = new Set(
    calls.slice(calls.length - newCalls).map((call) => call.callId),
  );
  const rejectedCalls = evaluated.rejectedCalls.filter((call) =>
    newCallIds.has(call.callId),
  );
  return {
    newCalls,
    rejectedCalls,
    terminationReason: verdict.terminationReason,
    healthy:
      newCalls > 0 &&
      rejectedCalls.length === 0 &&
      inputsStable &&
      source.unchanged === true &&
      ["taskFailed", "budgetExceeded"].includes(verdict.status) &&
      verdict.infrastructureError == null &&
      !existsSync(join(config.out, "in-flight.json")) &&
      [0, 1].includes(result.status) &&
      result.signal == null &&
      result.error === undefined,
  };
}

export async function runDialogueWorkflow(
  argv,
  {
    execute = (command, args, options) => spawnSync(command, args, options),
  } = {},
) {
  const config = dialogueWorkflowOptions(argv);
  const driver = join(config.repo, DRIVER);
  if (!existsSync(driver))
    throw new Error(
      `Canonical dialogue driver is not present in ${config.repo}; integrate the MCP evaluator work first`,
    );
  validateScenario(config);
  const evaluator = await import(
    pathToFileURL(join(dirname(driver), "evaluate.mjs")).href
  );
  const inputSha256 = workflowInputs(config);
  if (config.mode === "qualify") {
    const gate = execute("pnpm", ["quality:milestone"], {
      cwd: config.repo,
      stdio: "inherit",
    });
    if (gate.status !== 0)
      return gate.status === 137 || gate.signal === "SIGKILL" ? 137 : 1;
    if (workflowInputs(config) !== inputSha256) {
      console.error(
        "Source or prompt changed after the milestone; model call was not launched",
      );
      return 1;
    }
  }
  const result = execute(
    "pnpm",
    ["--filter", "@dnd/mcp", "eval:dialogue", ...config.args],
    {
      cwd: config.repo,
      stdio: "inherit",
    },
  );
  if (result.status === 137 || result.signal === "SIGKILL") return 137;
  // Infrastructure failures may not have produced enough artifacts to grade.
  if (
    !existsSync(join(config.out, "verdict.json")) ||
    existsSync(join(config.out, "active.lock"))
  )
    return 1;
  const evaluated = evaluator.evaluateRun(config.out);
  const metadata = json(join(config.out, "metadata.json"));
  const source = json(join(config.out, "source-verification.json"));
  const capsules = captureDialogueFailures(
    config.out,
    evaluated.rejectedCalls ?? [],
  );
  const fresh =
    !existsSync(join(config.out, "resume.json")) &&
    (metadata.resumedFrom === null ||
      (metadata.evidenceKind === "codingAgentMcp" &&
        !config.args.includes("--resume")));
  const inputsStable = workflowInputs(config) === inputSha256;
  const accepted =
    config.mode === "qualify" &&
    fresh &&
    inputsStable &&
    source.unchanged === true &&
    result.status === 0 &&
    evaluator.dialogueAccepted(evaluated);
  const probe =
    config.mode === "repair"
      ? diagnosticProbe(
          config,
          evaluated,
          metadata,
          source,
          inputsStable,
          result,
        )
      : null;
  save(join(config.out, "workflow-verdict.json"), {
    mode: config.mode,
    accepted,
    fresh,
    inputSha256,
    inputsStable,
    sourceUnchanged: source.unchanged === true,
    capsules,
    scenarioClean: evaluator.dialogueAccepted(evaluated),
    ...(probe ? { probe } : {}),
    evidenceKind: metadata.evidenceKind,
  });
  return config.mode === "qualify" ? (accepted ? 0 : 1) : probe.healthy ? 0 : 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    process.exitCode = await runDialogueWorkflow(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
