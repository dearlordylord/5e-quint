import { isDeepStrictEqual } from "node:util";
import { spawn, execFileSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  mkdtempSync,
  createWriteStream,
  watch,
} from "node:fs";
import { tmpdir } from "node:os";
import { createHash, randomUUID } from "node:crypto";
import {
  evaluateRun,
  dialogueAccepted,
  DIALOGUE_SOURCE_FILES,
} from "./evaluate.mjs";
import { runConclusionReview } from "./conclusion-review.mjs";
const own = dirname(fileURLToPath(import.meta.url));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function verifyNativeLedgerCheckpoint(directory, actualRequests) {
  try {
    const checkpoint = JSON.parse(
      readFileSync(join(directory, "checkpoint.json"), "utf8"),
    );
    return (
      checkpoint.calls === actualRequests &&
      JSON.parse(readFileSync(join(directory, "in-flight.json"), "utf8")) ===
        null &&
      Object.keys(checkpoint.ledgers ?? {}).length === 2 &&
      Object.entries(checkpoint.ledgers).every(
        ([filename, digest]) =>
          ["calls.jsonl", "observations.jsonl"].includes(filename) &&
          sha(readFileSync(join(directory, filename))) === digest,
      )
    );
  } catch {
    return false;
  }
}
export async function runCodexDialogue(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (
      ![
        "--repo",
        "--out",
        "--case",
        "--prompt",
        "--expect",
        "--timeout",
        "--max-calls",
      ].includes(argv[i]) ||
      argv[i + 1] === undefined ||
      argv[i] in options
    )
      throw new Error("Invalid coding-agent evaluation option");
    options[argv[i]] = argv[i + 1];
  }
  let repo = own;
  while (!existsSync(join(repo, "pnpm-workspace.yaml"))) {
    const parent = dirname(repo);
    if (parent === repo) throw new Error("Cannot locate workspace");
    repo = parent;
  }
  repo = resolve(options["--repo"] ?? repo);
  const out = resolve(options["--out"] ?? "");
  if (!options["--out"] || existsSync(out))
    throw new Error("Supply a fresh --out directory");
  if (Boolean(options["--case"]) === Boolean(options["--prompt"]))
    throw new Error("Supply exactly one --case or --prompt");
  const scenario = options["--case"]
    ? JSON.parse(
        readFileSync(
          join(repo, "plugins/dnd-srd-oracle/evals/evaluation-inventory.json"),
          "utf8",
        ),
      ).autonomousDialogue.find((c) => c.id === options["--case"])
    : null;
  const prompt =
    scenario?.prompt ??
    (options["--prompt"]
      ? readFileSync(resolve(options["--prompt"]), "utf8")
      : null);
  if (!prompt) throw new Error("Unknown dialogue case");
  const expectation = options["--expect"] ?? scenario?.expectation ?? "session";
  if (!["catalog", "session", "wizardBattle"].includes(expectation))
    throw new Error("Unknown dialogue expectation");
  const timeout = Number(options["--timeout"] ?? 2400),
    maxCalls = Number(options["--max-calls"] ?? 150);
  if (
    !Number.isInteger(timeout) ||
    timeout < 1 ||
    !Number.isInteger(maxCalls) ||
    maxCalls < 1
  )
    throw new Error("Invalid finite budget");
  if (process.platform !== "darwin" || !existsSync("/usr/bin/sandbox-exec"))
    throw new Error(
      "Coding-agent geometry currently requires tested macOS sandbox-exec",
    );
  mkdirSync(out, { recursive: true, mode: 0o700 });
  mkdirSync(join(out, "artifacts"));
  writeFileSync(join(out, "phase-events.jsonl"), "");
  const work = mkdtempSync(join(tmpdir(), "dnd-codex-dialogue-")),
    pythonDir = mkdtempSync(join(tmpdir(), "dnd-codex-math-"));
  const save = (name, value) =>
    writeFileSync(join(out, name), JSON.stringify(value, null, 2));
  const git = (...args) =>
    execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  const fingerprint = () => ({
    revision: git("rev-parse", "HEAD").trim(),
    trackedDiffSha256: sha(git("diff", "HEAD", "--binary")),
    untracked: git(
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      "packages",
      "scripts",
      "data",
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((path) => ({ path, sha256: sha(readFileSync(join(repo, path))) })),
  });
  const initial = fingerprint(),
    started = Date.now(),
    runId = randomUUID();
  const moduleNames = DIALOGUE_SOURCE_FILES;
  save(
    "driver-sources.json",
    moduleNames.map((filename) => {
      const source = readFileSync(join(own, filename), "utf8");
      return { filename, source, sha256: sha(source) };
    }),
  );
  writeFileSync(join(out, "prompt.txt"), prompt);
  const metadata = {
    prototype: false,
    diagnostic: true,
    evidenceKind: "codingAgentMcp",
    installedChatGpt: false,
    nativeApiMcp: false,
    client: "official Codex CLI using existing ChatGPT login",
    pythonExecution: "sandboxedLocalPython",
    repo,
    sourceRevision: initial.revision,
    expectation,
    caseId: options["--case"] ?? null,
    promptSha256: sha(prompt),
    canonicalMcpToolCount: null,
    allowlist: null,
    maxCalls,
    timeout,
    startedAt: new Date(started).toISOString(),
    contextManagement: "official Codex client context management",
    maxTurnsEnforced: false,
  };
  save("metadata.json", metadata);
  const env = {
    ...process.env,
    DND_EVAL_REPO: repo,
    DND_EVAL_OUT: out,
    DND_EVAL_MAX_CALLS: String(maxCalls),
    DND_EVAL_RUN_ID: runId,
    DND_EVAL_PYTHON_DIR: pythonDir,
    DND_EVAL_DEADLINE: String(started + timeout * 1000),
  };
  for (const key of [
    "OPENAI_API_KEY",
    "CODEX_SESSION_ID",
    "CODEX_THREAD_ID",
    "CODEX_TOOL_CALL_ID",
    "CODEX_CI",
  ])
    delete env[key];
  const args = [
    "--no-daemon",
    "-a",
    "never",
    "exec",
    "--ignore-user-config",
    "--enable",
    "shell_tool",
    "--disable",
    "apps",
    "--ephemeral",
    "--json",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "-C",
    work,
    "-c",
    "mcp_servers.oracle.command=" + JSON.stringify(process.execPath),
    "-c",
    "mcp_servers.oracle.args=" +
      JSON.stringify([
        "--import",
        join(repo, "node_modules/tsx/dist/loader.mjs"),
        join(own, "codex-server.mjs"),
      ]),
    "-c",
    "mcp_servers.oracle.required=true",
    "-c",
    'mcp_servers.oracle.default_tools_approval_mode="approve"',
    "-c",
    "mcp_servers.oracle.startup_timeout_sec=120",
    "-c",
    "mcp_servers.oracle.tool_timeout_sec=120",
  ];
  for (const key of [
    "DND_EVAL_REPO",
    "DND_EVAL_OUT",
    "DND_EVAL_MAX_CALLS",
    "DND_EVAL_RUN_ID",
    "DND_EVAL_PYTHON_DIR",
    "DND_EVAL_DEADLINE",
  ])
    args.push(
      "-c",
      "mcp_servers.oracle.env." + key + "=" + JSON.stringify(env[key]),
    );
  args.push(
    "-c",
    "developer_instructions=" +
      JSON.stringify(
        "Use Oracle as the authority for all game mechanics and accept random outcomes. Use calculate_geometry for Python math and visual artifacts, never as an alternate combat engine. Supply its publication arguments to show computed geometry in the live viewer and update after movement. Do not use shell commands, read repository source, credentials or local files. Complete the task using Oracle and the provided math/presentation tools.",
      ),
  );
  args.push("-");
  save("invocation.json", {
    command: "codex",
    args,
    childApiKeyRemoved: true,
    work,
    pythonDir,
  });
  const stdout = createWriteStream(join(out, "agent.jsonl")),
    stderr = createWriteStream(join(out, "stderr.log"));
  let phaseOffset = 0;
  const emitPhases = () => {
    const contents = readFileSync(join(out, "phase-events.jsonl"), "utf8");
    const fresh = contents.slice(phaseOffset);
    phaseOffset = contents.length;
    for (const line of fresh.trim().split("\n").filter(Boolean))
      process.stderr.write(line + "\n");
  };
  const watcher = watch(join(out, "phase-events.jsonl"), emitPhases);
  const child = spawn("codex", args, {
    cwd: work,
    env,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  child.stdin.end(prompt);
  let timedOut = false;
  const stop = (signal) => {
    if (!Number.isInteger(child.pid)) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  const timer = setTimeout(
    () => {
      timedOut = true;
      stop("SIGTERM");
      setTimeout(() => stop("SIGKILL"), 3000).unref();
    },
    Math.max(1, timeout * 1000 - (Date.now() - started)),
  );
  const exit = await new Promise((done) => {
    child.once("error", (error) => done({ error: error.message }));
    child.once("close", (code, signal) => done({ code, signal }));
  });
  clearTimeout(timer);
  stop("SIGTERM");
  await Promise.all([
    new Promise((done) => stdout.end(done)),
    new Promise((done) => stderr.end(done)),
  ]);
  watcher.close();
  emitPhases();
  const rows = (name) =>
    existsSync(join(out, name))
      ? readFileSync(join(out, name), "utf8")
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse)
      : [];
  const events = rows("agent.jsonl"),
    calls = rows("calls.jsonl");
  metadata.canonicalMcpToolCount = existsSync(join(out, "tools.json"))
    ? JSON.parse(readFileSync(join(out, "tools.json"), "utf8")).tools.length
    : null;
  save("metadata.json", metadata);
  const { violations, hostMetadataDiscovery, toolsCompleted } =
    auditNativeToolEvents(events, calls.length);
  save("host-metadata-discovery.json", hostMetadataDiscovery);
  const rpc = rows("mcp.jsonl");
  const actualNativeCalls = rpc.filter(
    (r) =>
      r.direction === "client->server" && r.message.method === "tools/call",
  ).length;
  const nativeSessionClosed = !exit.error;
  const ledgerVerified = verifyNativeLedgerCheckpoint(out, actualNativeCalls);
  const auditComplete =
    actualNativeCalls === calls.length && toolsCompleted && ledgerVerified;
  if (
    exit.code === 0 &&
    !violations.length &&
    auditComplete &&
    nativeSessionClosed
  )
    await runConclusionReview({
      directory: out,
      deadline: started + timeout * 1000,
    });
  const finished = fingerprint(),
    unchanged = JSON.stringify(initial) === JSON.stringify(finished);
  save("source-verification.json", { unchanged, initial, finished });
  const finalMessage =
    events.filter((e) => e.item?.type === "agent_message").at(-1)?.item.text ??
    "";
  const verdict = {
    status: !unchanged
      ? "sourceChanged"
      : timedOut
        ? "budgetExceeded"
        : exit.code !== 0 ||
            violations.length ||
            !actualNativeCalls ||
            !auditComplete ||
            !nativeSessionClosed
          ? "infrastructureFailed"
          : "taskFailed",
    terminationReason: timedOut ? "timeBudget" : "modelFinished",
    infrastructureError: exit.error ?? null,
    sourceUnchanged: unchanged,
    calls: calls.length,
    pureMcpCalls: calls.filter(
      (c) =>
        !["calculate_geometry", "publish_battle_geometry"].includes(c.name),
    ).length,
    actualNativeCalls,
    auditComplete,
    nativeSessionClosed,
    ledgerVerified,
    toolsCompleted,
    isolations: violations,
    exit,
    durationSeconds: (Date.now() - started) / 1000,
    finalMessage,
  };
  save("verdict.json", verdict);
  const evaluated = evaluateRun(out);
  console.log(JSON.stringify({ out, ...evaluated }, null, 2));
  return dialogueAccepted(evaluated) ? 0 : 1;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = await runCodexDialogue(process.argv.slice(2));

export function auditNativeToolEvents(events, ownedCallCount) {
  const isHostMetadata = (item) =>
    item.server === "codex" &&
    ["list_mcp_resources", "list_mcp_resource_templates"].includes(item.tool) &&
    item.arguments !== null &&
    typeof item.arguments === "object" &&
    !Array.isArray(item.arguments) &&
    Object.keys(item.arguments).length === 0;
  const hostMetadataDiscovery = events.filter(
    (event) =>
      event.item?.type === "mcp_tool_call" && isHostMetadata(event.item),
  );
  const violations = events
    .filter((event) => {
      const item = event.item;
      return (
        [
          "command_execution",
          "file_change",
          "web_search",
          "image_generation",
          "collab_tool_call",
        ].includes(item?.type) ||
        (item?.type === "mcp_tool_call" &&
          item.server !== "oracle" &&
          !isHostMetadata(item))
      );
    })
    .map((event) => ({
      type: event.item.type,
      command: event.item.command,
      server: event.item.server,
      tool: event.item.tool,
    }));
  const starts = events.filter(
    (event) =>
      event.type === "item.started" && event.item?.type === "mcp_tool_call",
  );
  const completions = events.filter(
    (event) =>
      event.type === "item.completed" && event.item?.type === "mcp_tool_call",
  );
  const sameCall = (a, b) =>
    a.id === b.id &&
    a.server === b.server &&
    a.tool === b.tool &&
    isDeepStrictEqual(a.arguments, b.arguments);
  const toolsCompleted =
    starts.filter((event) => event.item.server === "oracle").length ===
      ownedCallCount &&
    starts.length === completions.length &&
    [...starts, ...completions].every(
      (event) => typeof event.item.id === "string" && event.item.id.length > 0,
    ) &&
    new Set(starts.map((event) => event.item.id)).size === starts.length &&
    starts.every(
      (start) =>
        completions.filter(
          (end) =>
            sameCall(start.item, end.item) &&
            events.indexOf(end) > events.indexOf(start),
        ).length === 1,
    );
  return { violations, hostMetadataDiscovery, toolsCompleted };
}
