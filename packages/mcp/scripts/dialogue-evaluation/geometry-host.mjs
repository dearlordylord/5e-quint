import Ajv2020 from "ajv/dist/2020.js";
import { createServer } from "node:http";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  appendFileSync,
} from "node:fs";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";
const hash = (value) =>
  createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest("hex");
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
export const GEOMETRY_LIMITS = {
  coordinateFeet: 1000000,
  collectionRecords: 128,
  polylineMinPoints: 2,
  polygonMinPoints: 3,
  shapeMaxPoints: 2048,
  totalShapePoints: 4096,
};
const coordinate = {
  type: "number",
  minimum: -GEOMETRY_LIMITS.coordinateFeet,
  maximum: GEOMETRY_LIMITS.coordinateFeet,
};
const pointSchema = {
  type: "object",
  properties: { xFeet: coordinate, yFeet: coordinate },
  required: ["xFeet", "yFeet"],
  additionalProperties: false,
};
const lineSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    points: {
      type: "array",
      items: { $ref: "#/$defs/point" },
      minItems: GEOMETRY_LIMITS.polylineMinPoints,
      maxItems: GEOMETRY_LIMITS.shapeMaxPoints,
    },
  },
  required: ["label", "points"],
  additionalProperties: false,
};
const circleSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    center: { $ref: "#/$defs/point" },
    radiusFeet: {
      type: "number",
      exclusiveMinimum: 0,
      maximum: GEOMETRY_LIMITS.coordinateFeet,
    },
  },
  required: ["label", "center", "radiusFeet"],
  additionalProperties: false,
};
const polygonSchema = {
  ...lineSchema,
  properties: {
    ...lineSchema.properties,
    points: {
      ...lineSchema.properties.points,
      minItems: GEOMETRY_LIMITS.polygonMinPoints,
    },
  },
};
const collection = (items) => ({
  type: "array",
  items,
  maxItems: GEOMETRY_LIMITS.collectionRecords,
});
export const GEOMETRY_FILE_SCHEMA = {
  type: "object",
  properties: {
    combatants: collection({
      type: "object",
      properties: {
        combatantId: { type: "string" },
        ...pointSchema.properties,
      },
      required: ["combatantId", "xFeet", "yFeet"],
      additionalProperties: false,
    }),
    scenery: collection(lineSchema),
    paths: collection(lineSchema),
    areas: collection({ anyOf: [circleSchema, polygonSchema] }),
  },
  required: ["combatants", "scenery", "paths", "areas"],
  additionalProperties: false,
  $defs: { point: pointSchema },
};
const geometryValidator = new Ajv2020({
  allErrors: true,
  strict: true,
}).compile(GEOMETRY_FILE_SCHEMA);
export const GEOMETRY_FILE_CONTRACT = `Geometry JSON requires combatants, scenery, paths, areas arrays; use explicit [] for no scenery/paths/areas. Combatants locate every current Oracle participant exactly once and contain only combatantId,xFeet,yFeet; statistics come from Oracle. Scenery is terrain polylines and paths are movement-route annotations, each requiring at least ${GEOMETRY_LIMITS.polylineMinPoints} points. Areas are circles or polygons requiring at least ${GEOMETRY_LIMITS.polygonMinPoints} vertices; a route is a path, never a two-point area. All coordinates/radii are feet; shape points total at most ${GEOMETRY_LIMITS.totalShapePoints}. Exact file schema: ${JSON.stringify(GEOMETRY_FILE_SCHEMA)}`;
export const geometryToolDefinition = {
  type: "function",
  name: "publish_battle_geometry",
  strict: false,
  description:
    "Publish a Python-computed layout to the live battle viewer. Write its JSON in Code Interpreter and pass the original filename. " +
    GEOMETRY_FILE_CONTRACT +
    " The viewer reads HP, conditions, round and active actor from Oracle after each step. Recompute and republish committed geometry after movement, teleportation or pushes. Returns a live local viewer URL; it does not run rules.",
  parameters: {
    type: "object",
    properties: {
      playSessionId: { type: "string" },
      filename: {
        type: "string",
        description:
          "Original JSON filename written by native Python, such as battlefield.json.",
      },
    },
    required: ["playSessionId", "filename"],
    additionalProperties: false,
  },
};
export function presentationToolsForFiles(files) {
  const filenames = [
    ...new Set(
      files
        .filter(
          (file) =>
            file.status === "downloaded" &&
            typeof file.sourceFilename === "string" &&
            /\.json$/i.test(file.sourceFilename),
        )
        .map((file) => file.sourceFilename.split("/").at(-1)),
    ),
  ].sort();
  if (!filenames.length) return [];
  return [
    {
      ...geometryToolDefinition,
      parameters: {
        ...geometryToolDefinition.parameters,
        properties: {
          ...geometryToolDefinition.parameters.properties,
          filename: {
            ...geometryToolDefinition.parameters.properties.filename,
            enum: filenames,
          },
        },
      },
    },
  ];
}
export function decodeGeometry(value, roster) {
  if (!geometryValidator(value))
    return {
      tag: "rejected",
      message:
        "Geometry file does not match GEOMETRY_FILE_SCHEMA: " +
        geometryValidator.errors
          .map((e) => e.instancePath + " " + e.message)
          .join("; "),
    };
  if (
    [...value.scenery, ...value.paths, ...value.areas].reduce(
      (sum, shape) => sum + (shape.points?.length ?? 0),
      0,
    ) > GEOMETRY_LIMITS.totalShapePoints
  )
    return {
      tag: "rejected",
      message: `Geometry exceeds ${GEOMETRY_LIMITS.totalShapePoints} supplied shape points.`,
    };
  const ids = new Set();
  for (const c of value.combatants) {
    if (!roster.includes(c.combatantId) || ids.has(c.combatantId))
      return {
        tag: "rejected",
        message: "Every combatantId must be a unique current participant.",
      };
    ids.add(c.combatantId);
  }
  if (ids.size !== roster.length)
    return {
      tag: "rejected",
      message: "Geometry must locate every current participant exactly once.",
      missingCombatantIds: roster.filter((id) => !ids.has(id)),
    };
  return { tag: "accepted", value };
}
function toolBody(result) {
  if (result?.structuredContent) return result.structuredContent;
  for (const c of result?.content ?? [])
    if (c.type === "text") {
      try {
        return JSON.parse(c.text);
      } catch {
        continue;
      }
    }
  return result;
}
function positionChanged(call) {
  if (!call || call.error || call.result?.isError === true) return false;
  const b = toolBody(call.result);
  if (
    [
      b?.tag,
      b?.result?.tag,
      b?.operation?.result?.tag,
      b?.operation?.result?.result?.tag,
    ].some((t) => ["invalid", "rejected", "failed"].includes(t))
  )
    return false;
  const fill = call.arguments?.fill;
  if (
    (fill?.kind === "movement" && fill.value?.movementCostFeet > 0) ||
    fill?.kind === "teleportDestination"
  )
    return true;
  let changed = false;
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.kind === "pushed" && value.distanceFeet > 0) changed = true;
    for (const child of Object.values(value)) visit(child);
  };
  visit(fill);
  visit(b?.operation?.result?.result?.shovePushes);
  return changed;
}
function renderSvg(frame) {
  const cs = frame.combatants,
    layout = frame.geometry;
  const supplied = layout
    ? [
        ...layout.combatants,
        ...layout.scenery.flatMap((s) => s.points),
        ...layout.paths.flatMap((s) => s.points),
        ...layout.areas.flatMap(
          (a) =>
            a.points ?? [
              {
                xFeet: a.center.xFeet - a.radiusFeet,
                yFeet: a.center.yFeet - a.radiusFeet,
              },
              {
                xFeet: a.center.xFeet + a.radiusFeet,
                yFeet: a.center.yFeet + a.radiusFeet,
              },
            ],
        ),
      ]
    : [];
  const xs = supplied.map((p) => p.xFeet),
    ys = supplied.map((p) => p.yFeet);
  const minX = xs.length ? Math.min(...xs) - 5 : 0,
    minY = ys.length ? Math.min(...ys) - 5 : 0;
  const spanX = xs.length ? Math.max(...xs) - minX + 5 : 1,
    spanY = ys.length ? Math.max(...ys) - minY + 5 : 1;
  const scale = Math.min(590 / spanX, 480 / spanY),
    px = (x) => 30 + (x - minX) * scale,
    py = (y) => 75 + (y - minY) * scale;
  const shapes = layout
    ? layout.scenery
        .map(
          (s) =>
            `<polyline points="${s.points.map((p) => `${px(p.xFeet)},${py(p.yFeet)}`).join(" ")}" fill="none" stroke="#8395ab" stroke-width="6"/><text x="${px(s.points[0].xFeet)}" y="${py(s.points[0].yFeet) - 9}" fill="#b4c4d6" font-size="11">${xml(s.label)}</text>`,
        )
        .join("") +
      layout.paths
        .map(
          (path) =>
            `<polyline points="${path.points.map((p) => `${px(p.xFeet)},${py(p.yFeet)}`).join(" ")}" fill="none" stroke="#73d6bf" stroke-width="3" stroke-dasharray="5 3"/><text x="${px(path.points[0].xFeet)}" y="${py(path.points[0].yFeet) - 9}" fill="#73d6bf" font-size="11">${xml(path.label)}</text>`,
        )
        .join("") +
      layout.areas
        .map((a) =>
          a.points
            ? `<polygon points="${a.points.map((p) => `${px(p.xFeet)},${py(p.yFeet)}`).join(" ")}" fill="#ff994430" stroke="#ffae5d" stroke-dasharray="7 4"/><text x="${px(a.points[0].xFeet)}" y="${py(a.points[0].yFeet)}" fill="#ffd19b" font-size="12">${xml(a.label)}</text>`
            : `<circle cx="${px(a.center.xFeet)}" cy="${py(a.center.yFeet)}" r="${a.radiusFeet * scale}" fill="#ff994430" stroke="#ffae5d" stroke-dasharray="7 4"/><text x="${px(a.center.xFeet)}" y="${py(a.center.yFeet)}" fill="#ffd19b" font-size="12">${xml(a.label)}</text>`,
        )
        .join("")
    : "";
  const tokens = layout
    ? layout.combatants
        .map((p) => {
          const c = cs.find((c) => c.combatantId === p.combatantId);
          if (!c) return "";
          return `<g><circle cx="${px(p.xFeet)}" cy="${py(p.yFeet)}" r="12" fill="${c.hp <= 0 ? "#536170" : c.originKind === "character" ? "#73baff" : "#eb868b"}" stroke="${c.combatantId === frame.currentActorId ? "#ffe48f" : "#122033"}" stroke-width="3"/><text x="${px(p.xFeet) + 17}" y="${py(p.yFeet) - 2}" fill="#edf4fb" font-size="12">${xml(c.displayName ?? c.combatantId)}</text><text x="${px(p.xFeet) + 17}" y="${py(p.yFeet) + 12}" fill="#b7c8da" font-size="10">${c.hp}/${c.maxHp} HP</text></g>`;
        })
        .join("")
    : '<text x="30" y="120" fill="#c4d3e4">Waiting for Python-computed geometry. No positions invented.</text>';
  const legend = cs
    .map(
      (c, i) =>
        `<text x="655" y="${85 + i * 54}" fill="#edf4fb" font-size="13">${xml(c.displayName ?? c.combatantId)} · ${c.hp}/${c.maxHp} HP</text><text x="655" y="${103 + i * 54}" fill="#a9bdcf" font-size="11">${xml(c.conditions.join(", ") || "No conditions")}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#101b2b"/><text x="26" y="31" fill="#eff6ff" font-family="sans-serif" font-size="19">Round ${frame.round} · ${xml(frame.currentActorId)} · ${xml(frame.label)}</text><text x="26" y="53" fill="${frame.geometryStale ? "#ffba70" : "#98d1b7"}" font-size="12">${frame.geometryStale ? "Positions need a recomputed geometry publication after movement." : layout ? "Positions from captured Python JSON; statistics from Oracle." : "Geometry not yet published."}</text>${shapes}${tokens}${legend}<text x="26" y="584" fill="#839bb4" font-size="11">Areas are supplied overlays, not ongoing game effects. Conditions come from Oracle.</text><text x="26" y="610" fill="#839bb4" font-size="10">${xml(frame.createdAt)} · engine ${frame.engineSha256.slice(0, 12)} · geometry ${frame.geometrySha256?.slice(0, 12) ?? "unavailable"}</text></svg>`;
}
const html = (frames) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>Live Oracle battle</title><style>body{margin:0;background:#0c1421;color:#edf4fb;font:14px system-ui}header,nav{padding:12px 22px}#view svg{width:100%;max-height:78vh}input{width:70%}button{padding:7px 12px;background:#26476b;color:white;border:0;border-radius:4px}#status{color:#a6c8df}</style></head><body><header><b>Oracle battle viewer</b> <span id="status"></span></header><div id="view"></div><nav><button id="play">Play</button> <input id="step" type="range" min="0" value="0"><label id="label"></label></nav><script>let frames=${JSON.stringify(frames).replaceAll("<", "\\u003c")};let index=Math.max(0,frames.length-1),follow=true,timer;const step=document.getElementById('step');function draw(){step.max=Math.max(0,frames.length-1);step.value=index;document.getElementById('view').innerHTML=frames[index]?.svg??'Waiting for engine state';document.getElementById('label').textContent=frames.length?(index+1)+' / '+frames.length:'';}step.oninput=()=>{index=+step.value;follow=false;draw()};document.getElementById('play').onclick=()=>{if(timer){clearInterval(timer);timer=null;return}follow=false;timer=setInterval(()=>{index=(index+1)%Math.max(1,frames.length);draw()},1000)};draw();if(location.protocol!=='file:')setInterval(async()=>{try{const r=await fetch('/state.json',{cache:'no-store'});frames=(await r.json()).frames;if(follow)index=Math.max(0,frames.length-1);document.getElementById('status').textContent='Live · '+frames.length+' observed frames';draw()}catch{document.getElementById('status').textContent='Disconnected; retained replay'}},1000);else document.getElementById('status').textContent='Captured replay';</script></body></html>`;
export async function createLiveBattleHost({ out }) {
  const live = resolve(out, "live");
  mkdirSync(resolve(live, "frames"), { recursive: true });
  const restored = existsSync(resolve(live, "state.json"))
    ? JSON.parse(readFileSync(resolve(live, "state.json"), "utf8"))
    : { frames: [], geometry: null, geometryStale: false, playSessionId: null };
  let frames = restored.frames,
    geometry = restored.geometry,
    geometryStale = restored.geometryStale,
    playSessionId = restored.playSessionId,
    lastPositionChangeCallCount =
      restored.lastPositionChangeCallCount ??
      (restored.geometryStale ? (restored.frames.at(-1)?.callCount ?? 0) : -1),
    latest = new Map(),
    lastCheckpoint = new Map();
  if (geometry) {
    const decoded = decodeGeometry(
      geometry,
      Array.isArray(geometry.combatants)
        ? geometry.combatants.map((c) => c.combatantId)
        : [],
    );
    if (decoded.tag === "rejected")
      throw new Error(
        "Saved geometry is incompatible with the current file contract (including required paths[]): " +
          decoded.message,
      );
  }
  const persist = () => {
    writeFileSync(
      resolve(live, "state.json"),
      JSON.stringify({
        frames,
        geometry,
        geometryStale,
        playSessionId,
        lastPositionChangeCallCount,
      }),
    );
    writeFileSync(resolve(live, "battle.html"), html(frames));
  };
  const server = createServer((req, res) => {
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    );
    if (req.url === "/state.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ frames }));
      return;
    }
    if (req.url === "/" || req.url === "/battle.html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html(frames));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", done);
  });
  const url = `http://127.0.0.1:${server.address().port}/`;
  writeFileSync(resolve(live, "url.txt"), url);
  persist();
  function append(snapshot, label, callId, callCount) {
    const state = latest.get(playSessionId),
      envelope =
        state?.operation?.result?.battleEnvelope ??
        lastCheckpoint.get(playSessionId);
    if (!envelope?.checkpoint) return;
    const cp = envelope.checkpoint;
    if (
      geometry &&
      (geometry.combatants.length !== cp.combatants.length ||
        geometry.combatants.some(
          (p) => !cp.combatants.some((c) => c.combatantId === p.combatantId),
        ))
    )
      geometryStale = true;
    const frame = {
      createdAt: new Date().toISOString(),
      label,
      callId,
      callCount,
      playSessionId,
      battleId: cp.battleId,
      round: cp.round,
      currentActorId: cp.currentActorId,
      battleActive: state?.projection?.battleState?.tag === "activeBattle",
      geometry,
      geometryStale,
      geometrySha256: geometry ? hash(geometry) : null,
      engineSha256: hash(envelope),
      combatants: cp.combatants.map((c) => ({
        combatantId: c.combatantId,
        displayName: c.displayName,
        hp: c.hp,
        maxHp: c.maxHp,
        conditions: (c.conditions ?? []).map((v) =>
          typeof v === "string" ? v : (v.kind ?? JSON.stringify(v)),
        ),
        originKind: c.origin?.kind,
      })),
    };
    const prior = frames.at(-1);
    if (
      prior?.engineSha256 === frame.engineSha256 &&
      prior?.geometrySha256 === frame.geometrySha256 &&
      prior?.geometryStale === frame.geometryStale &&
      prior?.battleActive === frame.battleActive
    )
      return;
    frame.svg = renderSvg(frame);
    frame.filename = String(frames.length).padStart(5, "0") + ".svg";
    writeFileSync(resolve(live, "frames", frame.filename), frame.svg);
    frames.push(frame);
    appendFileSync(
      resolve(live, "frames.jsonl"),
      JSON.stringify({ ...frame, svg: undefined, svgSha256: hash(frame.svg) }) +
        "\n",
    );
    persist();
  }
  return {
    url,
    observe(snapshot, call, callCount) {
      for (const [id, state] of Object.entries(snapshot.states)) {
        latest.set(id, state);
        const e = state?.operation?.result?.battleEnvelope;
        if (e) lastCheckpoint.set(id, e);
      }
      if (!playSessionId && Object.keys(snapshot.states).length === 1)
        playSessionId = Object.keys(snapshot.states)[0];
      if (positionChanged(call)) {
        geometryStale = true;
        lastPositionChangeCallCount = callCount;
      }
      append(snapshot, snapshot.label, snapshot.callId, callCount);
      return {
        viewerUrl: url,
        geometryStale,
        geometryPublished: geometry !== null,
        lastPositionChangeCallCount,
        geometryUpdateRequired: geometryStale
          ? "Committed movement or participant changes require a newly computed publication of current positions."
          : null,
        observedFrames: frames.length,
      };
    },
    publish(args, nativeFiles, callCount) {
      if (
        !record(args) ||
        typeof args.playSessionId !== "string" ||
        typeof args.filename !== "string"
      )
        return {
          tag: "rejected",
          message:
            "Supply playSessionId and the original Python JSON filename.",
        };
      const envelope =
        latest.get(args.playSessionId)?.operation?.result?.battleEnvelope ??
        lastCheckpoint.get(args.playSessionId);
      if (!envelope)
        return {
          tag: "rejected",
          message: "Start a battle before publishing its geometry.",
        };
      const file = [...nativeFiles]
        .reverse()
        .find(
          (f) =>
            f.status === "downloaded" &&
            (f.sourceFilename === basename(args.filename) ||
              f.filename.endsWith("-" + basename(args.filename))),
        );
      if (!file || !/\.json$/i.test(file.filename))
        return {
          tag: "rejected",
          message:
            "No matching JSON artifact from completed native Python was captured. Write the geometry JSON in Code Interpreter first.",
        };
      if (
        !Number.isInteger(file.afterCallCount) ||
        file.afterCallCount < lastPositionChangeCallCount
      )
        return {
          tag: "rejected",
          message:
            "Geometry artifact predates the last position-changing step. Recompute in Python and publish a newly captured JSON artifact.",
          minimumCaptureCallCount: lastPositionChangeCallCount,
          sourceCaptureCallCount: file.afterCallCount ?? null,
        };
      const path = resolve(out, "artifacts", basename(file.filename));
      let bytes;
      try {
        bytes = readFileSync(path);
      } catch {
        return {
          tag: "rejected",
          message: "Captured geometry file is unreadable.",
        };
      }
      if (bytes.length > 1048576 || hash(bytes) !== file.sha256)
        return {
          tag: "rejected",
          message:
            "Captured geometry file exceeds the viewer byte budget or no longer matches its recorded hash.",
        };
      let value;
      try {
        value = JSON.parse(bytes.toString("utf8"));
      } catch {
        return {
          tag: "rejected",
          message: "Geometry artifact must be valid JSON.",
        };
      }
      const parsed = decodeGeometry(
        value,
        envelope.checkpoint.combatants.map((c) => c.combatantId),
      );
      if (parsed.tag === "rejected") return parsed;
      geometry = parsed.value;
      geometryStale = false;
      playSessionId = args.playSessionId;
      writeFileSync(
        resolve(live, "geometry.json"),
        JSON.stringify({ sourceFile: file, geometry }, null, 2),
      );
      append(null, "geometryPublished", null, callCount);
      return {
        tag: "geometryPublished",
        playSessionId,
        viewerUrl: url,
        sourceFileSha256: file.sha256,
        geometrySha256: hash(geometry),
        geometryStale: false,
        observedFrames: frames.length,
      };
    },
    async close() {
      persist();
      await new Promise((done) => server.close(done));
    },
  };
}
