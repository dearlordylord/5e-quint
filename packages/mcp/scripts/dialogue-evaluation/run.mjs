import { DIALOGUE_SOURCE_FILES } from "./evaluate.mjs";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve, basename, join, dirname } from "node:path";
import {
  createLiveBattleHost,
  geometryToolDefinition,
  presentationToolsForFiles,
} from "./geometry-host.mjs";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  renameSync,
  unlinkSync,
  copyFileSync,
  cpSync,
  readdirSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { DatabaseSync } from "node:sqlite";

if (process.argv.includes("--client")) {
  const index = process.argv.indexOf("--client"),
    client = process.argv[index + 1];
  if (client !== "codex") throw new Error("Supported explicit client: codex");
  const argv = process.argv.slice(2);
  argv.splice(index - 2, 2);
  const { runCodexDialogue } = await import("./codex-run.mjs");
  process.exit(await runCodexDialogue(argv));
}
const options = {};
const allowedFlags = new Set([
  "--repo",
  "--out",
  "--prompt",
  "--expect",
  "--max-turns",
  "--max-calls",
  "--timeout",
  "--model",
  "--allow",
  "--resume",
  "--resume-note",
  "--compact-at-chars",
  "--code-interpreter",
  "--prepare-only",
  "--case",
]);
for (let i = 2; i < process.argv.length; i += 2) {
  const flag = process.argv[i],
    value = process.argv[i + 1];
  if (
    !allowedFlags.has(flag) ||
    value === undefined ||
    value.startsWith("--") ||
    flag in options
  )
    throw new Error("Unknown, duplicated, or incomplete option: " + flag);
  options[flag] = value;
}
let workspace = dirname(fileURLToPath(import.meta.url));
while (!existsSync(resolve(workspace, "pnpm-workspace.yaml"))) {
  const parent = dirname(workspace);
  if (parent === workspace)
    throw new Error("Cannot locate workspace root; supply --repo");
  workspace = parent;
}
const repo = resolve(options["--repo"] ?? workspace);
if (options["--case"] && options["--prompt"])
  throw new Error("Choose --case or --prompt, not both");
const caseRecord = options["--case"]
  ? JSON.parse(
      readFileSync(
        resolve(repo, "plugins/dnd-srd-oracle/evals/evaluation-inventory.json"),
        "utf8",
      ),
    ).autonomousDialogue?.find((c) => c.id === options["--case"])
  : null;
if (options["--case"] && (!caseRecord || typeof caseRecord.prompt !== "string"))
  throw new Error("Unknown autonomousDialogue case: " + options["--case"]);
const out = resolve(options["--out"] ?? "");
const expectation = options["--expect"] ?? caseRecord?.expectation ?? "session";
const maxTurns = Number(options["--max-turns"] ?? 160);
const maxCalls = Number(options["--max-calls"] ?? 240);
const timeout = Number(options["--timeout"] ?? 1800);
const compactAt = Number(options["--compact-at-chars"] ?? 180000);
const codeInterpreter = options["--code-interpreter"] === "true";
if (
  options["--code-interpreter"] &&
  !["true", "false"].includes(options["--code-interpreter"])
)
  throw new Error("--code-interpreter accepts true or false");
if (
  !options["--out"] ||
  (!options["--prompt"] && !options["--resume"] && !caseRecord) ||
  existsSync(out) ||
  !["catalog", "session", "wizardBattle"].includes(expectation) ||
  ![maxTurns, maxCalls, timeout, compactAt].every(
    (n) => Number.isInteger(n) && n > 0,
  )
)
  throw new Error(
    "Use --repo checkout --prompt file --out fresh-dir --expect catalog|session|wizardBattle [--resume prior-dir --resume-note changed-boundaries] [--max-turns N --max-calls N --timeout seconds --compact-at-chars N --code-interpreter true|false]",
  );
if (!process.env.OPENAI_API_KEY && options["--prepare-only"] !== "true")
  throw new Error("OPENAI_API_KEY is absent");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => {
  try {
    return execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch (error) {
    throw new Error(
      "Cannot record Git source metadata for " +
        args[0] +
        ": " +
        (error.code ?? error.status ?? "unknown"),
    );
  }
};
function sourceFingerprint() {
  const untracked = git(
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    "packages",
    "scripts",
    "data",
  )
    .split("\n")
    .filter(Boolean);
  return {
    sourceRevision: git("rev-parse", "HEAD"),
    trackedDiffSha256: sha(git("diff", "HEAD", "--binary")),
    untrackedRuntimeSha256: sha(
      JSON.stringify(
        untracked.map((path) => [path, sha(readFileSync(resolve(repo, path)))]),
      ),
    ),
  };
}
const source = sourceFingerprint();
mkdirSync(out, { recursive: true, mode: 0o700 });
const save = (name, data) =>
  writeFileSync(resolve(out, name), JSON.stringify(data, null, 2));
const atomicSave = (name, data) => {
  save(name + ".tmp", data);
  renameSync(resolve(out, name + ".tmp"), resolve(out, name));
};
const log = (name, data) =>
  appendFileSync(
    resolve(out, name),
    JSON.stringify({ timestamp: new Date().toISOString(), ...data }) + "\n",
  );
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const rows = (name) =>
  existsSync(resolve(out, name))
    ? readFileSync(resolve(out, name), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse)
    : [];
function databaseFingerprint(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return sha(
      JSON.stringify(
        db
          .prepare(
            "SELECT play_session_id, revision, operations_json, dice_seed, tenure_kind, principal_id FROM play_sessions ORDER BY play_session_id",
          )
          .all(),
      ),
    );
  } finally {
    db.close();
  }
}
let resumed = null;
if (options["--resume"]) {
  const prior = resolve(options["--resume"]);
  if (out.startsWith(prior + "/"))
    throw new Error("Resume output must not be inside its parent");
  if (
    existsSync(join(prior, "active.lock")) ||
    existsSync(join(prior, "in-flight.json"))
  )
    throw new Error("Unsafe resume: active or in-flight prior run");
  resumed = json(join(prior, "checkpoint.json"));
  if (
    resumed.callLogSha256 !==
    sha(
      existsSync(join(prior, "calls.jsonl"))
        ? readFileSync(join(prior, "calls.jsonl"))
        : "",
    )
  )
    throw new Error("Unsafe resume: tool log and checkpoint disagree");
  if (
    databaseFingerprint(join(prior, "play-sessions.sqlite")) !==
    resumed.databaseFingerprint
  )
    throw new Error("Unsafe resume: database and checkpoint disagree");
  const previousMetadata = json(join(prior, "metadata.json"));
  const changed = Object.keys(source).some(
    (key) => source[key] !== previousMetadata[key],
  );
  if (changed && !options["--resume-note"])
    throw new Error(
      "Changed source requires --resume-note describing changed boundaries; fresh final acceptance remains required",
    );
  for (const name of readdirSync(prior)) {
    if (
      /^(calls|observations|conversation|api-retries)\.jsonl$|^response-.*\.json$|^request-tools-.*\.json$|^compaction-.*\.json$|^play-sessions\.sqlite(?:-wal|-shm)?$|^native-files\.jsonl$/.test(
        name,
      )
    )
      copyFileSync(join(prior, name), join(out, name));
    if (["artifacts", "lineage", "live"].includes(name))
      cpSync(join(prior, name), join(out, name), { recursive: true });
  }
  mkdirSync(join(out, "lineage"), { recursive: true });
  save("lineage/" + sha(prior).slice(0, 12) + ".json", {
    parent: prior,
    metadata: previousMetadata,
    checkpoint: resumed,
    changedSource: changed,
    changedBoundaries: options["--resume-note"] ?? null,
  });
  save("resume.json", {
    parent: prior,
    parentCheckpointSha256: sha(readFileSync(join(prior, "checkpoint.json"))),
    changedSource: changed,
    changedBoundaries: options["--resume-note"] ?? null,
  });
}
const prompt = caseRecord
  ? caseRecord.prompt
  : options["--prompt"]
    ? readFileSync(resolve(options["--prompt"]), "utf8")
    : readFileSync(join(resolve(options["--resume"]), "prompt.txt"), "utf8");
if (resumed && sha(prompt) !== resumed.promptSha256)
  throw new Error("Resume prompt must match the original task");
writeFileSync(resolve(out, "prompt.txt"), prompt);
writeFileSync(resolve(out, "active.lock"), String(process.pid), { flag: "wx" });
const require = createRequire(resolve(repo, "packages/mcp/package.json"));
const sdk = async (name) =>
  import(
    pathToFileURL(require.resolve("@modelcontextprotocol/sdk/" + name)).href
  );
const load = (path) => import(pathToFileURL(resolve(repo, path)).href);
const [
  { Client },
  { InMemoryTransport },
  { createDndMcpProtocolServer },
  { openSqlitePlaySessionRepository },
  { decodePrincipalId },
  { Result },
] = await Promise.all([
  sdk("client/index.js"),
  sdk("inMemory.js"),
  load("packages/mcp/src/protocol-server.ts"),
  load("packages/mcp/src/sqlite-play-session-repository.ts"),
  load("packages/mcp/src/play-session-access.ts"),
  import(pathToFileURL(require.resolve("effect")).href),
]);
const principal =
  resumed?.principal ?? "synthetic-api-evaluator:" + randomUUID();
const decodedPrincipal = decodePrincipalId(principal);
const opened = openSqlitePlaySessionRepository(
  resolve(out, "play-sessions.sqlite"),
);
if (Result.isFailure(decodedPrincipal) || Result.isFailure(opened))
  throw new Error("Unable to open isolated synthetic session repository");
const repository = opened.success;
const host = createDndMcpProtocolServer(undefined, undefined, {
  toolSurface: "chatgpt",
  playSessionRepository: repository,
  requestIdentity: {
    tag: "authenticated",
    principalId: decodedPrincipal.success,
  },
});
const client = new Client({
  name: "synthetic-api-dialog-evaluator",
  version: "0.2.0",
});
const [ct, st] = InMemoryTransport.createLinkedPair();
await host.server.connect(st);
await client.connect(ct);
const listed = await client.listTools();
save("tools.json", listed);
const allow = options["--allow"]?.split(",") ?? resumed?.allowlist;
if (
  allow &&
  (!allow.length ||
    allow.some((name) => !listed.tools.some((tool) => tool.name === name)))
)
  throw new Error("Unknown tool in --allow");
const tools = listed.tools
  .filter((t) => !allow || allow.includes(t.name))
  .map((t) => ({
    type: "function",
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
    strict: false,
  }));
if (codeInterpreter)
  tools.push({
    type: "code_interpreter",
    container: { type: "auto", memory_limit: "1g" },
  });
const admittedNames = new Set(
  listed.tools
    .filter((t) => !allow || allow.includes(t.name))
    .map((t) => t.name),
);
if (codeInterpreter) admittedNames.add(geometryToolDefinition.name);
const liveHost = codeInterpreter ? await createLiveBattleHost({ out }) : null;
if (liveHost)
  console.error(
    JSON.stringify({
      event: "dialogue_viewer_started",
      viewerUrl: liveHost.url,
    }),
  );
const started = Date.now();
save("runner-source.json", {
  sha256: sha(readFileSync(new URL(import.meta.url))),
  source: readFileSync(new URL(import.meta.url), "utf8"),
});
save(
  "driver-sources.json",
  Object.fromEntries(
    DIALOGUE_SOURCE_FILES.map((name) => {
      const bytes = readFileSync(
        resolve(dirname(fileURLToPath(import.meta.url)), name),
      );
      return [name, { sha256: sha(bytes), source: bytes.toString("utf8") }];
    }),
  ),
);
let firstGeometryNotified = false;
const metadata = {
  prototype: false,
  diagnostic: true,
  evidenceKind: "apiFunctionBridge",
  installedChatGpt: false,
  nativeApiMcp: false,
  repo,
  ...source,
  caseId: options["--case"] ?? null,
  model: options["--model"] ?? resumed?.model ?? "gpt-5.6",
  expectation,
  modelResultProjection:
    "omit only text blocks JSON-identical to structuredContent; raw transcript retained",
  contextManagement:
    "official standalone Responses compaction; output preserved unchanged",
  compactAtChars: compactAt,
  toolSurface: "chatgpt",
  toolCount: tools.length,
  maximumToolCount: tools.length + (codeInterpreter ? 1 : 0),
  canonicalMcpToolCount: listed.tools.length,
  advertisedMcpToolCount: admittedNames.size - (codeInterpreter ? 1 : 0),
  clientPresentationToolCount: codeInterpreter ? 1 : 0,
  clientPresentationAvailability:
    "publisher advertised only after native JSON capture; filename enum from captured original filenames; per-request definitions archived",
  nativeToolCount: codeInterpreter ? 1 : 0,
  allowlist: allow ?? null,
  codeInterpreter,
  persistence:
    "canonical SQLite repository with synthetic authenticated principal",
  maxTurns,
  maxCalls,
  timeout,
  startedAt: new Date(started).toISOString(),
  promptSha256: sha(prompt),
  resumedFrom: options["--resume"] ? resolve(options["--resume"]) : null,
};
save("metadata.json", metadata);
save("advertised-tools.json", tools);
let calls = rows("calls.jsonl"),
  sessions = new Set(resumed?.sessions ?? []),
  observations = rows("observations.jsonl"),
  apiIds = resumed?.apiIds ?? [],
  lastMessage = "",
  reason = null,
  infrastructureError = null;
let nativeContainerId = resumed?.nativeContainerId ?? null;
let history = resumed?.history ?? [{ role: "user", content: prompt }],
  apiSequence = resumed?.apiSequence ?? 0,
  compactionSequence = resumed?.compactionSequence ?? 0;
const initialCallCount = calls.length;
const body = (result) => {
  if (result?.structuredContent) return result.structuredContent;
  for (const block of result?.content ?? [])
    if (block.type === "text") {
      try {
        return JSON.parse(block.text);
      } catch {
        continue;
      }
    }
  return result;
};
async function observe(label, callId = null, call = null) {
  const states = {},
    pendingSelectionIds = {};
  for (const playSessionId of sessions) {
    try {
      states[playSessionId] = body(
        await client.callTool({
          name: "read_play_session",
          arguments: { playSessionId },
        }),
      );
      const selected = await host.playSessions.run(
        playSessionId,
        { tag: "authenticated", principalId: decodedPrincipal.success },
        (root) =>
          root.sessionStore.getPendingBattleSelection()?.selectionId ?? null,
      );
      pendingSelectionIds[playSessionId] = Result.isSuccess(selected)
        ? selected.success.value
        : null;
    } catch (error) {
      states[playSessionId] = { observerError: error.message };
    }
  }
  const snapshot = { label, callId, states, pendingSelectionIds };
  if (liveHost)
    snapshot.clientPresentation = liveHost.observe(
      snapshot,
      call,
      calls.length,
    );
  observations.push(snapshot);
  log("observations.jsonl", snapshot);
  save("final-state.json", snapshot);
  return snapshot;
}
function checkpoint() {
  atomicSave("checkpoint.json", {
    version: 1,
    principal,
    nativeContainerId,
    sessions: [...sessions],
    history,
    apiIds,
    apiSequence,
    compactionSequence,
    allowlist: allow ?? null,
    model: metadata.model,
    promptSha256: sha(prompt),
    callCount: calls.length,
    callLogSha256: sha(
      existsSync(resolve(out, "calls.jsonl"))
        ? readFileSync(resolve(out, "calls.jsonl"))
        : "",
    ),
    databaseFingerprint: databaseFingerprint(
      resolve(out, "play-sessions.sqlite"),
    ),
  });
}
function remember(value) {
  if (typeof value === "string" && /^play-session:[0-9a-f-]{36}$/.test(value))
    sessions.add(value);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) remember(item);
}
function modelResult(result) {
  if (!result?.structuredContent || !Array.isArray(result.content))
    return result;
  const canonical = JSON.stringify(result.structuredContent);
  return {
    ...result,
    content: result.content.filter((block) => {
      if (block.type !== "text") return true;
      try {
        return JSON.stringify(JSON.parse(block.text)) !== canonical;
      } catch {
        return true;
      }
    }),
  };
}
const instructions =
  "You are an autonomous tabletop player and game facilitator. Use Oracle tools as the authority for all game mechanics. Make reasonable decisions for all sides as requested, accept generated random outcomes, and do not claim results unsupported by engine state. When Python is available, use it to calculate geometry and create visual artifacts from the actual battle state; never use it as an alternate combat engine. Use the live viewer when provided. It automatically updates actual game state and tells you when computed geometry must be republished. You have no access to repository source or credentials. Complete the requested task without asking for routine choices.";
async function api(path, request, name) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const remaining = timeout * 1000 - (Date.now() - started);
    if (remaining <= 0)
      throw new Error("Time budget exhausted before API request");
    const response = await fetch("https://api.openai.com/v1/" + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(Math.min(remaining, 180000)),
    });
    const data = await response.json();
    save(`${name}-${attempt}.json`, data);
    if (response.ok) return data;
    if (response.status !== 429 || attempt === 5)
      throw new Error(
        `Responses API ${response.status}: ${JSON.stringify(data.error ?? data)}`,
      );
    const messageSeconds = Number(
      /try again in ([0-9.]+)s/.exec(data.error?.message ?? "")?.[1],
    );
    const headerSeconds = Number(response.headers.get("retry-after"));
    const seconds =
      Number.isFinite(headerSeconds) && headerSeconds > 0
        ? headerSeconds
        : messageSeconds > 0
          ? messageSeconds
          : 10;
    const delay = Math.min(
      60000,
      Math.max(1000, Math.ceil(seconds * 1000) + 1000),
    );
    log("api-retries.jsonl", {
      name,
      attempt,
      status: response.status,
      delayMilliseconds: delay,
    });
    if (Date.now() - started + delay >= timeout * 1000)
      throw new Error("Time budget exhausted before API retry");
    await sleep(delay);
  }
}
const downloaded = new Set(
  rows("native-files.jsonl")
    .filter((r) => r.status === "downloaded")
    .map((r) => r.fileId + ":" + r.sha256),
);
function remainingBudget() {
  const remaining = timeout * 1000 - (Date.now() - started);
  if (remaining <= 0)
    throw new Error("Time budget exhausted during native artifact capture");
  return remaining;
}
async function captureRequest(url, read) {
  const remaining = remainingBudget(),
    limit = Math.min(remaining, 30000),
    controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          remaining <= 30000
            ? "Time budget exhausted during native artifact capture"
            : "Native artifact capture request timed out",
        ),
      );
    }, limit);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          signal: controller.signal,
        });
        const data = await read(response);
        remainingBudget();
        return { response, data };
      })(),
      expired,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function captureNativeFiles(output) {
  const containers = new Set(
    output
      .filter((item) => item.type === "code_interpreter_call")
      .map((item) => item.container_id)
      .filter(Boolean),
  );
  for (const containerId of containers) {
    if (!/^cntr_[a-zA-Z0-9_-]+$/.test(containerId))
      throw new Error("Unexpected container identity");
    try {
      const { response, data: listing } = await captureRequest(
        `https://api.openai.com/v1/containers/${containerId}/files`,
        (response) => response.json(),
      );
      if (!response.ok) throw new Error(JSON.stringify(listing.error));
      for (const file of listing.data ?? []) {
        if (!/^cfile_[a-zA-Z0-9_-]+$/.test(file.id)) continue;
        const { response: content, data: buffer } = await captureRequest(
          `https://api.openai.com/v1/containers/${containerId}/files/${file.id}/content`,
          (response) => response.arrayBuffer(),
        );
        if (!content.ok) throw new Error(`Native file ${content.status}`);
        const bytes = Buffer.from(buffer);
        const fingerprint = sha(bytes);
        if (downloaded.has(file.id + ":" + fingerprint)) continue;
        const filename =
          file.id +
          "-" +
          fingerprint.slice(0, 12) +
          "-" +
          basename(file.path ?? file.filename ?? "artifact");
        mkdirSync(resolve(out, "artifacts"), { recursive: true });
        writeFileSync(resolve(out, "artifacts", filename), bytes);
        downloaded.add(file.id + ":" + fingerprint);
        log("native-files.jsonl", {
          status: "downloaded",
          containerId,
          fileId: file.id,
          sourceFilename: basename(file.path ?? file.filename ?? "artifact"),
          filename,
          bytes: bytes.length,
          sha256: sha(bytes),
          afterCallCount: calls.length,
        });
      }
    } catch (error) {
      if (
        /^Time budget exhausted/.test(error.message) ||
        Date.now() - started >= timeout * 1000
      )
        throw new Error("Time budget exhausted during native artifact capture");
      log("native-files.jsonl", {
        status: "captureFailed",
        containerId,
        message: error.message,
      });
    }
  }
}
try {
  await observe(resumed ? "resume" : "initial");
  if (resumed) {
    const continuation = {
      role: "user",
      content:
        "Continue the original task from the saved game state. Do not recreate completed work or reroll previously accepted outcomes.",
    };
    history.push(continuation);
    log("conversation.jsonl", continuation);
  }
  checkpoint();
  for (let turn = 0; turn < maxTurns; turn++) {
    if (options["--prepare-only"] === "true") {
      reason = "prepared";
      break;
    }
    if (calls.length - initialCallCount >= maxCalls) {
      reason = "callBudget";
      break;
    }
    if (Date.now() - started >= timeout * 1000) {
      reason = "timeBudget";
      break;
    }
    if (JSON.stringify(history).length > compactAt) {
      const before = JSON.stringify(history).length;
      const compacted = await api(
        "responses/compact",
        { model: metadata.model, input: history, instructions },
        `compaction-${compactionSequence++}`,
      );
      if (!Array.isArray(compacted.output) || !compacted.output.length)
        throw new Error("Compaction returned no continuation window");
      history = compacted.output;
      log("conversation.jsonl", {
        role: "compaction",
        beforeChars: before,
        afterChars: JSON.stringify(history).length,
        output: compacted.output,
      });
      checkpoint();
    }
    if (codeInterpreter && nativeContainerId)
      tools.find((tool) => tool.type === "code_interpreter").container =
        nativeContainerId;
    const requestTools = [
      ...tools,
      ...(codeInterpreter
        ? presentationToolsForFiles(rows("native-files.jsonl"))
        : []),
    ];
    save(`request-tools-${apiSequence}.json`, requestTools);
    const data = await api(
      "responses",
      {
        model: metadata.model,
        instructions,
        input: history,
        tools: requestTools,
        parallel_tool_calls: false,
        max_output_tokens: 6000,
        store: false,
        ...(codeInterpreter
          ? { include: ["code_interpreter_call.outputs"] }
          : {}),
      },
      `response-${apiSequence++}`,
    );
    apiIds.push(data.id);
    log("conversation.jsonl", {
      role: "assistant",
      responseId: data.id,
      output: data.output,
      usage: data.usage,
    });
    for (const item of data.output)
      if (
        item.type === "code_interpreter_call" &&
        /^cntr_[a-zA-Z0-9_-]+$/.test(item.container_id)
      )
        nativeContainerId = item.container_id;
    history.push(...data.output);
    await captureNativeFiles(data.output);
    remainingBudget();
    const requested = data.output.filter(
      (item) => item.type === "function_call",
    );
    if (!requested.length) {
      lastMessage = data.output
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .map((item) => item.text ?? "")
        .join("\n");
      reason =
        data.status === "completed"
          ? "modelFinished"
          : `response:${data.status}`;
      checkpoint();
      break;
    }
    for (const item of requested) {
      if (calls.length - initialCallCount >= maxCalls) {
        reason = "callBudget";
        break;
      }
      const call = {
        name: item.name,
        rawArguments: item.arguments,
        callId: item.call_id,
      };
      let journaled = false;
      try {
        if (!admittedNames.has(item.name))
          throw new Error("Function is outside the advertised tool allowlist");
        call.arguments = JSON.parse(item.arguments);
        if (item.name === "end_battle") await observe("beforeEndBattle");
        if (item.name === geometryToolDefinition.name) {
          call.kind = "clientPresentation";
          const published = liveHost.publish(
            call.arguments,
            rows("native-files.jsonl"),
            calls.length + 1,
          );
          if (published.tag === "geometryPublished" && !firstGeometryNotified) {
            firstGeometryNotified = true;
            console.error(
              JSON.stringify({
                event: "dialogue_geometry_published",
                viewerUrl: published.viewerUrl,
                svgPath: resolve(
                  out,
                  "live/frames",
                  String(published.observedFrames - 1).padStart(5, "0") +
                    ".svg",
                ),
                callCount: calls.length + 1,
              }),
            );
          }
          call.result = {
            structuredContent: published,
            isError: published.tag === "rejected",
          };
        } else {
          call.kind = "mcp";
          atomicSave("in-flight.json", {
            callId: item.call_id,
            name: item.name,
            arguments: call.arguments,
            priorDatabaseFingerprint: databaseFingerprint(
              resolve(out, "play-sessions.sqlite"),
            ),
          });
          journaled = true;
          call.result = await client.callTool({
            name: item.name,
            arguments: call.arguments,
          });
          remember(body(call.result));
        }
      } catch (error) {
        call.error = {
          kind: !admittedNames.has(item.name)
            ? "unadvertisedFunction"
            : call.arguments
              ? "mcpClientError"
              : "argumentJsonError",
          message: error.message,
        };
      }
      calls.push(call);
      log("calls.jsonl", call);
      const observation = await observe(
        `after:${item.name}`,
        item.call_id,
        call,
      );
      const output = call.error
        ? { isError: true, error: call.error }
        : {
            ...modelResult(call.result),
            ...(observation.clientPresentation
              ? { clientPresentation: observation.clientPresentation }
              : {}),
          };
      history.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(output),
      });
      log("conversation.jsonl", {
        role: "tool",
        name: item.name,
        callId: item.call_id,
        output,
      });
      checkpoint();
      if (journaled && !call.error) unlinkSync(resolve(out, "in-flight.json"));
      if (journaled && call.error) {
        reason = "unsafeCallOutcome";
        break;
      }
    }
    if (reason) break;
    if (turn === maxTurns - 1) reason = "turnBudget";
  }
} catch (error) {
  if (
    Date.now() - started >= timeout * 1000 ||
    /Time budget exhausted/.test(error.message)
  )
    reason = "timeBudget";
  else {
    infrastructureError = error.message;
    reason = "infrastructureError";
  }
}
await observe("final");
if (!existsSync(resolve(out, "in-flight.json"))) checkpoint();
let finishedSource = null,
  sourceVerificationError = null;
try {
  finishedSource = sourceFingerprint();
} catch (error) {
  sourceVerificationError = error.message;
}
const sourceUnchanged =
  finishedSource !== null &&
  JSON.stringify(finishedSource) === JSON.stringify(source);
save("source-verification.json", {
  unchanged: sourceUnchanged,
  initial: source,
  finished: finishedSource,
  error: sourceVerificationError,
});
const verdict = {
  status: !sourceUnchanged
    ? "sourceChanged"
    : infrastructureError
      ? "infrastructureFailed"
      : ["timeBudget", "callBudget", "turnBudget"].includes(reason)
        ? "budgetExceeded"
        : "taskFailed",
  expectation,
  sourceUnchanged,
  sourceVerificationError,
  terminationReason: reason,
  infrastructureError,
  calls: calls.length,
  newCalls: calls.length - initialCallCount,
  responseIds: apiIds,
  finalMessage: lastMessage,
  durationSeconds: (Date.now() - started) / 1000,
};
save("verdict.json", verdict);
if (liveHost) await liveHost.close();
await client.close();
await host.server.close();
repository.close();
unlinkSync(resolve(out, "active.lock"));
const { evaluateRun, dialogueAccepted } = await import("./evaluate.mjs");
const reviewed = evaluateRun(out);
console.log(JSON.stringify({ out, ...reviewed }, null, 2));
process.exitCode =
  (dialogueAccepted(reviewed) || reason === "prepared") && sourceUnchanged
    ? 0
    : 1;
