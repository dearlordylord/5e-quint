import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve, join, basename, dirname } from "node:path";
import {
  appendFileSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  lstatSync,
  realpathSync,
  renameSync,
} from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createLiveBattleHost,
  GEOMETRY_FILE_CONTRACT,
} from "./geometry-host.mjs";
const repo = process.env.DND_EVAL_REPO,
  out = process.env.DND_EVAL_OUT;
const require = createRequire(resolve(repo, "packages/mcp/package.json"));
const load = (p) => import(pathToFileURL(resolve(repo, p)).href);
const sdk = (p) =>
  import(pathToFileURL(require.resolve("@modelcontextprotocol/sdk/" + p)).href);
const [
  { Server },
  { StdioServerTransport },
  { Client },
  { InMemoryTransport },
  { CallToolRequestSchema, ListToolsRequestSchema },
  { createDndMcpProtocolServer },
  { createMcpApplicationServices },
  { openSqlitePlaySessionRepository },
  { decodePrincipalId },
  { handleReadPlaySession },
  { Result },
] = await Promise.all([
  sdk("server/index.js"),
  sdk("server/stdio.js"),
  sdk("client/index.js"),
  sdk("inMemory.js"),
  sdk("types.js"),
  load("packages/mcp/src/protocol-server.ts"),
  load("packages/mcp/src/composition-root.ts"),
  load("packages/mcp/src/sqlite-play-session-repository.ts"),
  load("packages/mcp/src/play-session-access.ts"),
  load("packages/mcp/src/play-session-protocol.ts"),
  import(pathToFileURL(require.resolve("effect")).href),
]);
const applicationServices = createMcpApplicationServices();
const principal = decodePrincipalId(
    "synthetic-codex-evaluator:" + process.env.DND_EVAL_RUN_ID,
  ),
  opened = openSqlitePlaySessionRepository(
    join(out, "play-sessions.sqlite"),
    applicationServices,
  );
if (Result.isFailure(principal) || Result.isFailure(opened))
  throw new Error("Isolated evaluator repository unavailable");
const identity = { tag: "authenticated", principalId: principal.success };
const host = createDndMcpProtocolServer(applicationServices, undefined, {
  toolSurface: "chatgpt",
  playSessionRepository: opened.success,
  requestIdentity: identity,
});
const client = new Client({ name: "coding-agent-evaluator", version: "1" }),
  [ct, st] = InMemoryTransport.createLinkedPair();
await host.server.connect(st);
await client.connect(ct);
const canonicalInstructions = client.getInstructions();
writeFileSync(
  join(out, "server-instructions.json"),
  JSON.stringify({ instructions: canonicalInstructions ?? null }, null, 2),
);
const listed = await client.listTools();
writeFileSync(join(out, "tools.json"), JSON.stringify(listed, null, 2));
const body = (r) => r?.structuredContent ?? r;
const log = (name, value) =>
  appendFileSync(
    join(out, name),
    JSON.stringify({ timestamp: new Date().toISOString(), ...value }) + "\n",
  );
const save = (name, value) =>
  writeFileSync(join(out, name), JSON.stringify(value, null, 2));
const sessions = new Set(),
  calls = [],
  nativeFiles = [];
const discover = (v) => {
  if (typeof v === "string") {
    if (/^play-session:[0-9a-f-]{36}$/.test(v)) sessions.add(v);
  } else if (v && typeof v === "object") Object.values(v).forEach(discover);
};
const live = await createLiveBattleHost({ out });
let firstGeometry = false;
let callSequence = 0;
const phase = (value) => log("phase-events.jsonl", value);
phase({ event: "dialogue_viewer_started", viewerUrl: live.url });
async function observe(label, call = null) {
  const states = {},
    pendingSelectionIds = {};
  for (const sid of sessions) {
    const read = await handleReadPlaySession(
      host.playSessions,
      { playSessionId: sid },
      identity,
      "chatgpt",
    );
    states[sid] = body(read);
    const selected = await host.playSessions.run(
      sid,
      identity,
      (root) =>
        root.sessionStore.getPendingBattleSelection()?.selectionId ?? null,
    );
    pendingSelectionIds[sid] = Result.isSuccess(selected)
      ? selected.success.value
      : null;
  }
  const snapshot = {
    label,
    callId: call?.callId ?? null,
    states,
    pendingSelectionIds,
  };
  snapshot.clientPresentation = live.observe(snapshot, call, calls.length);
  log("observations.jsonl", snapshot);
  save("final-state.json", snapshot);
  return snapshot;
}
const pythonDir = realpathSync(process.env.DND_EVAL_PYTHON_DIR);
const mathTool = {
  name: "calculate_geometry",
  description:
    "Run Python for geometry and visual artifacts, never game rules. Every call starts a FRESH interpreter; only files in the isolated math directory persist. To publish current committed positions in this same call, supply playSessionId and publishGeometryFile naming JSON written by your code. Calculate planned movement without publication, commit in Oracle, then publish actual positions. " +
    GEOMETRY_FILE_CONTRACT +
    " The live viewer automatically renders actual Oracle HP/conditions/turns. Republish after committed movement. Use Oracle for mechanics.",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string", maxLength: 200000 },
      playSessionId: { type: "string" },
      publishGeometryFile: { type: "string" },
    },
    required: ["code"],
    additionalProperties: false,
    anyOf: [
      { required: ["playSessionId", "publishGeometryFile"] },
      {
        not: {
          anyOf: [
            { required: ["playSessionId"] },
            { required: ["publishGeometryFile"] },
          ],
        },
      },
    ],
  },
};
const pythonExecutable = execFileSync(
  "/usr/bin/python3",
  ["-I", "-c", "import os,sys;print(os.path.realpath(sys.executable))"],
  { env: { PATH: "/usr/bin:/bin" }, encoding: "utf8" },
).trim();
const allowedReads = [
  "/System",
  "/usr",
  "/Library",
  "/dev",
  dirname(dirname(pythonExecutable)),
  pythonDir,
];
const profile =
  '(version 1)(allow default)(deny network*)(deny file-read-data (require-all (subpath "/") (require-not (literal "/")) ' +
  allowedReads
    .map((path) => "(require-not (subpath " + JSON.stringify(path) + "))")
    .join(" ") +
  '))(deny file-write* (require-all (subpath "/") (require-not (subpath ' +
  JSON.stringify(pythonDir) +
  ')) (require-not (literal "/dev/null"))))';
function compute(args) {
  if (
    (args?.playSessionId === undefined) !==
    (args?.publishGeometryFile === undefined)
  )
    return {
      tag: "rejected",
      message:
        "Publish geometry with both playSessionId and publishGeometryFile, or omit both for calculations only.",
    };
  if (typeof args?.code !== "string" || args.code.length > 200000)
    return { tag: "rejected", message: "Supply bounded Python code." };
  const remaining = Number(process.env.DND_EVAL_DEADLINE) - Date.now();
  if (remaining <= 0)
    return { tag: "rejected", message: "Evaluation time budget exhausted." };
  const beforeFiles = new Map(
    readdirSync(pythonDir).map((filename) => [
      filename,
      lstatSync(join(pythonDir, filename), { bigint: true }).mtimeNs,
    ]),
  );
  const result = spawnSync(
    "/usr/bin/sandbox-exec",
    ["-p", profile, pythonExecutable, "-I", "-c", args.code],
    {
      cwd: pythonDir,
      env: { PATH: "/usr/bin:/bin", PYTHONDONTWRITEBYTECODE: "1" },
      encoding: "utf8",
      timeout: Math.min(30000, remaining),
      maxBuffer: 1024 * 1024,
    },
  );
  log("local-python.jsonl", {
    code: args.code,
    status: result.status === 0 ? "completed" : "failed",
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    afterCallCount: calls.length,
  });
  const files = [];
  for (const filename of readdirSync(pythonDir).slice(0, 128)) {
    const path = join(pythonDir, filename),
      stat = lstatSync(path);
    if (
      !stat.isFile() ||
      stat.size > 1024 * 1024 ||
      !/\.(json|svg|html|png)$/i.test(filename)
    )
      continue;
    const bytes = readFileSync(path),
      sha256 = createHash("sha256").update(bytes).digest("hex");
    if (
      result.status === 0 &&
      beforeFiles.get(filename) !== lstatSync(path, { bigint: true }).mtimeNs
    ) {
      const captured = {
        status: "downloaded",
        sourceFilename: filename,
        filename: sha256.slice(0, 12) + "-" + basename(filename),
        sha256,
        bytes: bytes.length,
        afterCallCount: calls.length,
        provenance: "sandboxedLocalPython",
      };
      writeFileSync(join(out, "artifacts", captured.filename), bytes);
      nativeFiles.push(captured);
      log("native-files.jsonl", captured);
    }
    files.push(filename);
  }
  return {
    tag: result.status === 0 ? "geometryComputed" : "rejected",
    stdout: result.stdout,
    stderr: result.stderr,
    files,
    execution: "sandboxedLocalPython",
    message:
      result.status === 0
        ? "Captured JSON filenames are available to the live publisher."
        : (result.error?.message ?? "Python execution failed."),
  };
}
const server = new Server(
  { name: "oracle-dialogue-evaluation", version: "1" },
  {
    capabilities: { tools: { listChanged: true } },
    instructions: canonicalInstructions,
  },
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [...listed.tools, mathTool];
  log("advertised-tool-snapshots.jsonl", { tools });
  return { tools };
});
async function performCall(request) {
  const { name, arguments: args = {} } = request.params;
  const call = { name, arguments: args, callId: "native-" + ++callSequence };
  save("in-flight.json", { call });
  let result;
  try {
    if (calls.length >= Number(process.env.DND_EVAL_MAX_CALLS))
      result = {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tag: "rejected",
              message: "Evaluation call budget exhausted.",
            }),
          },
        ],
      };
    else if (name === mathTool.name) {
      const computed = compute(args);
      if (
        computed.tag !== "rejected" &&
        args.publishGeometryFile !== undefined
      ) {
        const publication = live.publish(
          {
            playSessionId: args.playSessionId,
            filename: args.publishGeometryFile,
          },
          nativeFiles,
          calls.length + 1,
        );
        computed.publication = publication;
        if (publication.tag !== "geometryPublished") computed.tag = "rejected";
        else if (!firstGeometry) {
          firstGeometry = true;
          phase({
            event: "dialogue_geometry_published",
            viewerUrl: live.url,
            svgPath: join(
              out,
              "live/frames",
              String(publication.observedFrames - 1).padStart(5, "0") + ".svg",
            ),
            callCount: calls.length + 1,
          });
        }
      }
      result = {
        structuredContent: computed,
        isError: computed.tag === "rejected",
        content: [{ type: "text", text: JSON.stringify(computed) }],
      };
    } else {
      if (name === "end_battle") await observe("beforeEndBattle");
      result = await client.callTool({ name, arguments: args });
    }
  } catch (error) {
    result = {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({ tag: "rejected", message: error.message }),
        },
      ],
    };
  }
  call.result = result;
  calls.push(call);
  discover(args);
  discover(body(result));
  log("calls.jsonl", call);
  const observation = await observe("after:" + name, call);
  writeFileSync(join(out, "in-flight.json"), "null");
  const ledgers = Object.fromEntries(
    ["calls.jsonl", "observations.jsonl"].map((filename) => [
      filename,
      createHash("sha256")
        .update(readFileSync(join(out, filename)))
        .digest("hex"),
    ]),
  );
  save("checkpoint.tmp", {
    calls: calls.length,
    sessions: [...sessions],
    ledgers,
  });
  renameSync(join(out, "checkpoint.tmp"), join(out, "checkpoint.json"));
  const presentation = { clientPresentation: observation.clientPresentation };
  log("client-presentations.jsonl", { callId: call.callId, ...presentation });
  return {
    ...result,
    content: [
      ...(result.content ?? []),
      { type: "text", text: JSON.stringify(presentation) },
    ],
  };
}
let callQueue = Promise.resolve();
server.setRequestHandler(CallToolRequestSchema, (request) => {
  const result = callQueue.then(() => performCall(request));
  callQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
});
await observe("initial");
const transport = new StdioServerTransport();
await server.connect(transport);
const send = transport.send.bind(transport);
transport.send = async (message, ...rest) => {
  log("mcp.jsonl", { direction: "server->client", message });
  return send(message, ...rest);
};
const receive = transport.onmessage;
transport.onmessage = (message, ...rest) => {
  log("mcp.jsonl", { direction: "client->server", message });
  receive?.(message, ...rest);
};
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await callQueue;
  await live.close();
  process.exit(0);
}
process.stdin.on("end", shutdown);
process.on("SIGTERM", shutdown);
