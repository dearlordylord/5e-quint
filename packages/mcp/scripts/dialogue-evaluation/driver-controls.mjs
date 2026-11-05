import { verifyNativeLedgerCheckpoint } from "./codex-run.mjs";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const own = dirname(fileURLToPath(import.meta.url));
let workspace = own;
while (!existsSync(join(workspace, "pnpm-workspace.yaml"))) {
  const parent = dirname(workspace);
  if (parent === workspace) throw new Error("Cannot locate workspace root");
  workspace = parent;
}
const repo = resolve(process.argv[2] ?? workspace);
const base = mkdtempSync(join(tmpdir(), "dnd-driver-controls-"));
console.log("Artifacts: " + base);
const {
  createLiveBattleHost,
  decodeGeometry,
  presentationToolsForFiles,
  GEOMETRY_FILE_SCHEMA,
  GEOMETRY_FILE_CONTRACT,
  geometryToolDefinition,
} = await import("./geometry-host.mjs");
const { createHash } = await import("node:crypto");
const { Script } = await import("node:vm");
const { mkdirSync } = await import("node:fs");
const sceneOut = join(base, "live-renderer");
mkdirSync(join(sceneOut, "artifacts"), { recursive: true });
let host = await createLiveBattleHost({ out: sceneOut });
const sid = "play-session:viewer-control";
const snapshot = (hp, condition = []) => ({
  label: "control",
  callId: "call-" + hp,
  states: {
    [sid]: {
      tag: "playSessionAvailable",
      projection: { battleState: { tag: "activeBattle" } },
      operation: {
        result: {
          battleEnvelope: {
            checkpoint: {
              battleId: "synthetic-viewer-battle",
              round: 1,
              currentActorId: "hero",
              combatants: [
                {
                  combatantId: "hero",
                  displayName: "Synthetic <hero>",
                  hp,
                  maxHp: 32,
                  conditions: condition,
                  origin: { kind: "character" },
                },
                {
                  combatantId: "enemy",
                  displayName: "Synthetic enemy",
                  hp: 10,
                  maxHp: 10,
                  conditions: [],
                  origin: { kind: "statBlock" },
                },
              ],
            },
            frontier: { kind: "acts", acts: [] },
          },
        },
      },
    },
  },
});
const geometry = {
  combatants: [
    { combatantId: "hero", xFeet: 0, yFeet: 0 },
    { combatantId: "enemy", xFeet: 30, yFeet: 0 },
  ],
  paths: [
    {
      label: "Synthetic withdrawal route",
      points: [
        { xFeet: 0, yFeet: 0 },
        { xFeet: 0, yFeet: -25 },
      ],
    },
  ],
  scenery: [
    {
      label: "Synthetic <wall>",
      points: [
        { xFeet: 10, yFeet: -5 },
        { xFeet: 10, yFeet: 5 },
      ],
    },
  ],
  areas: [
    {
      label: "Synthetic cube footprint",
      points: [
        { xFeet: 0, yFeet: 0 },
        { xFeet: 15, yFeet: 0 },
        { xFeet: 15, yFeet: 15 },
        { xFeet: 0, yFeet: 15 },
      ],
    },
  ],
};
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const earlyTools = presentationToolsForFiles([]);
assert(
  earlyTools.length === 0,
  "Publisher available before native JSON capture",
);
const capturedTools = presentationToolsForFiles([
  { status: "downloaded", sourceFilename: "/mnt/data/geometry.json" },
  { status: "captureFailed", sourceFilename: "missing.json" },
  { status: "downloaded", sourceFilename: "image.png" },
]);
assert(
  capturedTools.length === 1 &&
    JSON.stringify(capturedTools[0].parameters.properties.filename.enum) ===
      '["geometry.json"]',
  "Publisher filenames do not follow actual native JSON capture",
);
assert(
  decodeGeometry(geometry, ["hero", "enemy"]).tag === "accepted",
  "Two-point withdrawal path rejected",
);
const missingPaths = { ...geometry };
delete missingPaths.paths;
assert(
  decodeGeometry(missingPaths, ["hero", "enemy"]).tag === "rejected",
  "Missing paths[] silently became empty",
);
assert(
  decodeGeometry(
    {
      ...geometry,
      areas: [
        { label: "Invalid two-point area", points: geometry.paths[0].points },
      ],
    },
    ["hero", "enemy"],
  ).tag === "rejected",
  "Two-point path silently admitted as an area",
);
assert(
  geometryToolDefinition.description.includes(GEOMETRY_FILE_CONTRACT) &&
    GEOMETRY_FILE_SCHEMA.properties.paths.items.properties.points.minItems ===
      2 &&
    GEOMETRY_FILE_SCHEMA.properties.areas.items.anyOf[1].properties.points
      .minItems === 3,
  "Owned geometry schema/description counts drifted",
);
try {
  assert(
    decodeGeometry(
      {
        ...geometry,
        combatants: [{ ...geometry.combatants[0], xFeet: Infinity }],
      },
      ["hero", "enemy"],
    ).tag === "rejected",
    "Nonfinite coordinate accepted",
  );
  assert(
    decodeGeometry({ ...geometry, combatants: [geometry.combatants[0]] }, [
      "hero",
      "enemy",
    ]).tag === "rejected",
    "Missing roster member accepted",
  );
  assert(
    decodeGeometry(
      {
        ...geometry,
        combatants: geometry.combatants.map((p) => ({ ...p, hp: 999 })),
      },
      ["hero", "enemy"],
    ).tag === "rejected",
    "Geometry accepted authored HP",
  );
  assert(
    decodeGeometry(
      {
        ...geometry,
        areas: [
          {
            ...geometry.areas[0],
            center: { xFeet: 0, yFeet: 0 },
            radiusFeet: 7.5,
          },
        ],
      },
      ["hero", "enemy"],
    ).tag === "rejected",
    "Mixed area shapes accepted",
  );
  host.observe(snapshot(32), null, 1);
  const native = [];
  const capture = (filename, value, afterCallCount = 1) => {
    const bytes = JSON.stringify(value);
    writeFileSync(join(sceneOut, "artifacts", filename), bytes);
    native.push({
      status: "downloaded",
      afterCallCount,
      sourceFilename: "geometry.json",
      filename,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  };
  capture("first-geometry.json", geometry);
  assert(
    host.publish({ playSessionId: sid, filename: "geometry.json" }, native, 2)
      .tag === "geometryPublished",
    "Computed geometry did not publish",
  );
  const firstSvg = readFileSync(
    join(sceneOut, "live", "frames", "00001.svg"),
    "utf8",
  );
  assert(
    firstSvg.includes("<polygon points=") &&
      firstSvg.includes('stroke-dasharray="5 3"') &&
      firstSvg.includes("Synthetic withdrawal route") &&
      !/<circle[^>]*stroke-dasharray/.test(firstSvg),
    "Polygon footprint was not rendered as a polygon",
  );
  host.observe(snapshot(28, ["prone"]), null, 3);
  const moved = host.observe(
    snapshot(28, ["prone"]),
    {
      name: "provide_battle_input",
      arguments: {
        fill: { kind: "movement", value: { movementCostFeet: 10 } },
      },
      result: { structuredContent: { result: { tag: "resolved" } } },
    },
    4,
  );
  assert(moved.geometryStale, "Movement did not invalidate old positions");
  assert(
    host.publish({ playSessionId: sid, filename: "geometry.json" }, native, 5)
      .tag === "rejected",
    "Old native geometry cleared movement staleness",
  );
  await host.close();
  host = await createLiveBattleHost({ out: sceneOut });
  host.observe(snapshot(28, ["prone"]), null, 4);
  assert(
    host.publish({ playSessionId: sid, filename: "geometry.json" }, native, 5)
      .tag === "rejected",
    "Resume lost the stale geometry capture threshold",
  );
  capture(
    "second-geometry.json",
    {
      ...geometry,
      combatants: geometry.combatants.map((p) =>
        p.combatantId === "hero" ? { ...p, xFeet: 10 } : p,
      ),
    },
    4,
  );
  assert(
    host.publish(
      { playSessionId: sid, filename: "/mnt/data/geometry.json" },
      native,
      5,
    ).geometryStale === false,
    "Recomputed geometry did not clear staleness",
  );
  const state = await (await fetch(host.url + "state.json")).json();
  assert(
    state.frames.length >= 5,
    "Intermediate observed frames were not retained",
  );
  assert(
    state.frames.some(
      (f) => f.svg.includes("28/32 HP") && f.svg.includes("prone"),
    ),
    "Renderer ignored actual engine HP/condition",
  );
  assert(
    state.frames.some(
      (f) => f.geometryStale && f.svg.includes("recomputed geometry"),
    ),
    "Stale rendering did not show its warning",
  );
  assert(
    state.frames.every((f) =>
      existsSync(join(sceneOut, "live/frames", f.filename)),
    ),
    "Intermediate SVG bytes missing",
  );
  const page = await (await fetch(host.url)).text();
  const js = page.match(/<script>([\s\S]*)<\/script>/)?.[1];
  new Script(js);
  const embedded = JSON.parse(js.match(/let frames=([\s\S]*?);let index=/)[1]);
  assert(
    embedded[0].svg.startsWith("<svg"),
    "Portable JSON escaping corrupted SVG",
  );
  assert(
    !state.frames.at(-1).svg.includes("Synthetic <hero>"),
    "Roster label was not XML-escaped",
  );
  console.log(
    "live-renderer: syntax, roster, authority, stale movement, republish and intermediate SVG controls passed",
  );
} finally {
  await host.close();
}
if (process.platform === "darwin") {
  const { createRequire } = await import("node:module");
  const { homedir } = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const require = createRequire(join(repo, "packages/mcp/package.json"));
  const { Client } = await import(
    pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/index.js"))
      .href
  );
  const { StdioClientTransport } = await import(
    pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/stdio.js"))
      .href
  );
  const nativeOut = join(base, "native-codex-guard");
  mkdirSync(nativeOut);
  mkdirSync(join(nativeOut, "artifacts"));
  const math = join(base, "native-math");
  mkdirSync(math);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      "--import",
      join(repo, "node_modules/tsx/dist/loader.mjs"),
      join(own, "codex-server.mjs"),
    ],
    env: {
      PATH: process.env.PATH,
      DND_EVAL_REPO: repo,
      DND_EVAL_OUT: nativeOut,
      DND_EVAL_MAX_CALLS: "18",
      DND_EVAL_RUN_ID: "offline-control",
      DND_EVAL_PYTHON_DIR: math,
      DND_EVAL_DEADLINE: String(Date.now() + 60000),
    },
    stderr: "pipe",
  });
  const client = new Client({ name: "offline-native-guard", version: "1" });
  try {
    await client.connect(transport);
    const initial = await client.listTools();
    assert(
      initial.tools
        .find((t) => t.name === "calculate_geometry")
        .description.includes(GEOMETRY_FILE_CONTRACT),
      "Native geometry description drifted from decoder schema",
    );
    const canonicalTools = JSON.parse(
      readFileSync(join(nativeOut, "tools.json"), "utf8"),
    ).tools;
    assert(
      initial.tools.length === canonicalTools.length + 1 &&
        canonicalTools.every((tool) =>
          initial.tools.some((advertised) => advertised.name === tool.name),
        ) &&
        !initial.tools.some((t) => t.name === "publish_battle_geometry"),
      "Native adapter filtered canonical tools or exposed premature publisher",
    );
    const created = await client.callTool({
      name: "create_play_session",
      arguments: {},
    });
    const sid = created.structuredContent.playSessionId;
    const read = await client.callTool({
      name: "read_play_session",
      arguments: { playSessionId: sid },
    });
    assert(
      read.structuredContent.playSessionId === sid,
      "Native isolated session read failed",
    );
    const deniedPaths = [
      join(homedir(), ".codex", "auth.json"),
      join(repo, "package.json"),
      join(nativeOut, "play-sessions.sqlite"),
      join(base, "sibling.json"),
    ];
    writeFileSync(deniedPaths.at(-1), "synthetic private fixture");
    const computed = await client.callTool({
      name: "calculate_geometry",
      arguments: {
        code:
          'import math,json,socket\nopen("geometry.json","w").write(json.dumps({"distance":math.hypot(3,4)}))\n' +
          "for path in " +
          JSON.stringify(deniedPaths) +
          ':\n try:\n  open(path).read()\n  raise RuntimeError("unexpected read access")\n except PermissionError:\n  print("read denied")\n' +
          'try:\n socket.socket().connect(("127.0.0.1",9))\n raise RuntimeError("network allowed")\nexcept PermissionError:\n print("network denied")',
      },
    });
    assert(
      !computed.isError &&
        computed.structuredContent.stdout.includes("network denied") &&
        computed.structuredContent.stdout.split("read denied").length === 5,
      "Math sandbox failed system/temp-only read or network boundary",
    );
    const available = await client.listTools();
    assert(
      available.tools.length === canonicalTools.length + 1 &&
        !available.tools.some((t) => t.name === "publish_battle_geometry"),
      "Native client requires unsupported dynamic tool discovery",
    );
    const capturedRows = () =>
      readFileSync(join(nativeOut, "native-files.jsonl"), "utf8")
        .trim()
        .split("\n").length;
    const count = capturedRows();
    await client.callTool({
      name: "calculate_geometry",
      arguments: { code: 'print("no geometry computation")' },
    });
    assert(
      capturedRows() === count,
      "Unchanged old file gained computation provenance",
    );
    await client.callTool({
      name: "calculate_geometry",
      arguments: {
        code: 'p="geometry.json"\ndata=open(p).read()\nopen(p,"w").write(data)',
      },
    });
    assert(
      capturedRows() === count + 1,
      "Freshly written identical geometry lost provenance",
    );
    const started = await client.callTool({
      name: "start_battle",
      arguments: {
        playSessionId: sid,
        battleId: "synthetic-math-publication",
        initiativeMode: "direct",
        companionAdmissions: [],
        initialCombatants: [
          {
            kind: "statBlock",
            statBlockId: "stat_block_wolf",
            combatantId: "wolf-a",
            initiative: 20,
            ammunitionStocks: [],
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_wolf",
            combatantId: "wolf-b",
            initiative: 10,
            ammunitionStocks: [],
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      },
    });
    assert(!started.isError, "Synthetic native battle did not start");
    const compound = await client.callTool({
      name: "calculate_geometry",
      arguments: {
        playSessionId: sid,
        publishGeometryFile: "layout.json",
        code: 'import json\nlayout={"combatants":[{"combatantId":"wolf-a","xFeet":0,"yFeet":0},{"combatantId":"wolf-b","xFeet":3,"yFeet":4}],"scenery":[],"paths":[],"areas":[]}\nopen("layout.json","w").write(json.dumps(layout))',
      },
    });
    assert(
      !compound.isError &&
        compound.structuredContent.publication.tag === "geometryPublished",
      "Atomic math/publication did not produce live geometry",
    );
    await client.callTool({
      name: "calculate_geometry",
      arguments: { code: "temporary_namespace_value=17" },
    });
    const fresh = await client.callTool({
      name: "calculate_geometry",
      arguments: { code: "print(temporary_namespace_value)" },
    });
    assert(
      fresh.isError && fresh.structuredContent.stderr.includes("NameError"),
      "Python namespace unexpectedly persisted",
    );
    const persisted = await client.callTool({
      name: "calculate_geometry",
      arguments: {
        code: 'import json\nprint(json.load(open("layout.json"))["combatants"][1]["xFeet"])',
      },
    });
    assert(
      !persisted.isError && persisted.structuredContent.stdout.trim() === "3",
      "Python files did not persist",
    );
    const absent = await client.callTool({
      name: "calculate_geometry",
      arguments: {
        playSessionId: sid,
        publishGeometryFile: "absent.json",
        code: 'print("no artifact")',
      },
    });
    assert(
      absent.isError && absent.structuredContent.publication.tag === "rejected",
      "Uncaptured compound publication accepted",
    );
    const moveCall = started.structuredContent.chatGptBattleOperations.acts
      .flatMap((a) => a.readyCalls ?? [])
      .find((c) => c.tool === "move");
    assert(
      Boolean(moveCall),
      "Canonical move act unavailable in synthetic battle",
    );
    await client.callTool({
      name: "move",
      arguments: { ...moveCall.arguments, playSessionId: sid },
    });
    const moved = await client.callTool({
      name: "provide_battle_input",
      arguments: {
        playSessionId: sid,
        fill: {
          kind: "movement",
          holeId: "battle:movement",
          value: {
            speedKind: "walk",
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
          },
        },
      },
    });
    const presentationOf = (r) =>
      r.content
        .filter((b) => b.type === "text")
        .map((b) => {
          try {
            return JSON.parse(b.text);
          } catch {
            return null;
          }
        })
        .find((b) => b?.clientPresentation)?.clientPresentation;
    assert(
      presentationOf(moved)?.geometryStale === true &&
        presentationOf(moved).lastPositionChangeCallCount > 0,
      "Committed movement staleness not delivered to native model",
    );
    assert(
      JSON.parse(moved.content[0].text).operation?.name ===
        "provide_battle_input",
      "Primary canonical JSON block was displaced",
    );
    assert(
      JSON.parse(moved.content.at(-1).text).clientPresentation.geometryStale ===
        true,
      "Presentation supplement missing after canonical content",
    );
    const beforePublishRaw = readFileSync(
      join(nativeOut, "calls.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")
      .map(JSON.parse)
      .at(-1);
    assert(
      JSON.stringify(beforePublishRaw.result.structuredContent) ===
        JSON.stringify(moved.structuredContent),
      "Presentation changed canonical output schema/content",
    );
    assert(
      JSON.stringify(moved.content.slice(0, -1)) ===
        JSON.stringify(beforePublishRaw.result.content),
      "Canonical content blocks/order changed",
    );
    const refreshed = await client.callTool({
      name: "calculate_geometry",
      arguments: {
        playSessionId: sid,
        publishGeometryFile: "layout.json",
        code: 'import json\np="layout.json"\ng=json.load(open(p))\ng["combatants"][0]["xFeet"]=5\njson.dump(g,open(p,"w"))',
      },
    });
    assert(
      !refreshed.isError && presentationOf(refreshed)?.geometryStale === false,
      "Fresh post-movement compute/publication stayed stale",
    );
    await client.callTool({
      name: "end_battle",
      arguments: { playSessionId: sid },
    });
    assert(
      readFileSync(join(nativeOut, "observations.jsonl"), "utf8").includes(
        '"label":"beforeEndBattle"',
      ),
      "Pre-end canonical snapshot missing",
    );
    const beforeParallel = readFileSync(join(nativeOut, "calls.jsonl"), "utf8")
      .trim()
      .split("\n").length;
    const remaining = 18 - beforeParallel;
    const parallel = await Promise.all(
      Array.from({ length: remaining + 1 }, () =>
        client.callTool({ name: "create_play_session", arguments: {} }),
      ),
    );
    assert(
      parallel.filter((r) => !r.isError).length === remaining &&
        parallel.filter((r) => r.isError).length === 1,
      "Concurrent native requests escaped maxcalls budget",
    );
    const recorded = readFileSync(join(nativeOut, "calls.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    const observed = readFileSync(join(nativeOut, "observations.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse)
      .filter((o) => o.callId);
    assert(
      recorded.length === 19 &&
        new Set(recorded.map((c) => c.callId)).size === 19 &&
        JSON.stringify(recorded.map((c) => c.callId)) ===
          JSON.stringify(observed.map((o) => o.callId)),
      "Native attempt/observation audit lost calls or ordering",
    );
  } finally {
    await client.close();
  }
  assert(
    verifyNativeLedgerCheckpoint(nativeOut, 19),
    "Native committed checkpoint does not bind every completed attempt",
  );
  console.log(
    "coding-agent-native-adapter: complete canonical inventory, canonical session, compound publication, fresh namespace/files, ordered budgets and sandbox denial passed",
  );
}
