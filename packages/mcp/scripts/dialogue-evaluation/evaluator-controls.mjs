import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateRun, dialogueAccepted } from "./evaluate.mjs";
const base = mkdtempSync(join(tmpdir(), "dnd-api-evaluator-controls-"));
function control(
  name,
  expectation,
  calls,
  states,
  expected,
  verdictOverrides = {},
) {
  const out = join(base, name);
  mkdirSync(out);
  writeFileSync(join(out, "metadata.json"), JSON.stringify({ expectation }));
  writeFileSync(
    join(out, "verdict.json"),
    JSON.stringify({
      status: "completed",
      expectation,
      terminationReason: "modelFinished",
      finalMessage: "Everything completed successfully.",
      ...verdictOverrides,
    }),
  );
  writeFileSync(
    join(out, "calls.jsonl"),
    calls.map((value) => JSON.stringify(value)).join("\n"),
  );
  writeFileSync(
    join(out, "observations.jsonl"),
    JSON.stringify({ label: "final", states }) + "\n",
  );
  const actual = evaluateRun(out).status;
  if (actual !== expected)
    throw new Error(`${name}: expected ${expected}, received ${actual}`);
  console.log(`${name}: ${actual}`);
}
control("model-self-report-only", "session", [], {}, "taskFailed");
control(
  "direct-runtime-invalid",
  "catalog",
  [
    {
      name: "list_catalog_units",
      arguments: {},
      result: {
        structuredContent: { operation: { result: { tag: "invalid" } } },
      },
    },
  ],
  {},
  "taskFailed",
);
const created = [
  {
    name: "create_play_session",
    arguments: {},
    result: {
      structuredContent: {
        tag: "playSessionAvailable",
        playSessionId: "play-session:one",
      },
    },
  },
];
control(
  "cross-session-state",
  "session",
  created,
  {
    "play-session:two": {
      tag: "playSessionAvailable",
      playSessionId: "play-session:two",
      projection: {},
    },
  },
  "taskFailed",
);
control(
  "positive-session",
  "session",
  created,
  {
    "play-session:one": {
      tag: "playSessionAvailable",
      playSessionId: "play-session:one",
      projection: {},
    },
  },
  "completed",
);
const sid = "play-session:synthetic-fireball",
  characterId = "character:synthetic-wizard",
  actorId = "wizard",
  battleId = "synthetic-wizard-battle",
  subject = {
    tag: "actionSpell",
    actorId,
    procedureRef: "synthetic-fireball-procedure",
    mode: { tag: "cast" },
  };
const envelope = (frontier, enemyHp = 10, expended = 0) => ({
  checkpoint: {
    battleId,
    combatants: [
      {
        combatantId: actorId,
        hp: 30,
        origin: {
          kind: "character",
          spellcasting: { spellSlots: [{ spellLevel: 3, expended }] },
        },
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        combatantId: index ? "enemy-" + index : "enemy",
        hp: enemyHp,
        origin: {
          kind: "statBlock",
          statBlockId:
            index === 4 ? "stat_block_wolf" : "stat_block_goblin_warrior",
        },
      })),
    ],
  },
  frontier,
});
const acts = {
  kind: "acts",
  acts: [
    {
      subject,
      presentation: { kind: "spell", invocation: { spellId: "fireball" } },
    },
  ],
};
const holes = (kind) => ({
  kind: "holes",
  replaySubject: subject,
  holes: [
    {
      kind,
      holeId: "synthetic-" + kind,
      sourceProcedureRef: subject.procedureRef,
    },
  ],
});
const available = (result, battleEnvelope) => ({
  tag: "playSessionAvailable",
  playSessionId: sid,
  projection: {
    characterIds: [characterId],
    battleState: { tag: battleEnvelope ? "activeBattle" : "none" },
  },
  operation: {
    result: { ...result, ...(battleEnvelope ? { battleEnvelope } : {}) },
  },
});
const wrap = (data) => ({ structuredContent: data });
const call = (id, name, args, result) => ({
  callId: id,
  name,
  arguments: { playSessionId: sid, ...args },
  result: wrap(result),
});
function wizardFixture() {
  const calls = [
    {
      callId: "create",
      name: "create_play_session",
      arguments: {},
      result: wrap(available({ tag: "playSessionCreated" })),
    },
    call(
      "finalize",
      "finalize_character",
      {},
      available({
        finalization: {
          tag: "ready",
          build: {
            progression: {
              startingClass: "class_wizard",
              advancements: Array.from({ length: 4 }, () => ({
                classUnitId: "class_wizard",
              })),
            },
            spellcasting: { sources: [{ preparedSpells: ["fireball"] }] },
          },
        },
      }),
    ),
    call(
      "start",
      "start_battle",
      {
        battleId,
        initialCombatants: [
          { kind: "characterSession", combatantId: actorId, characterId },
          ...Array.from({ length: 5 }, (_, index) => ({
            kind: "statBlock",
            combatantId: index ? "enemy-" + index : "enemy",
            statBlockId:
              index === 4 ? "stat_block_wolf" : "stat_block_goblin_warrior",
          })),
        ],
      },
      available({ envelope: envelope(acts) }),
    ),
    call(
      "cast",
      "cast_spell",
      { subject },
      available({ result: { tag: "needsHoles" } }),
    ),
    call(
      "save-dice",
      "roll_dice",
      {},
      available({ groups: [{ dieSize: 20, results: [6] }] }),
    ),
    call(
      "save",
      "provide_battle_input",
      {
        fill: {
          kind: "savingThrowOutcome",
          holeId: "synthetic-savingThrowOutcome",
          value: {
            outcomes: [
              {
                targetId: "enemy",
                succeeded: false,
                d20TestRoll: { tag: "single", naturalD20: 6 },
              },
            ],
          },
        },
      },
      available({ result: { tag: "needsHoles" } }),
    ),
    call(
      "damage-dice",
      "roll_dice",
      {},
      available({ groups: [{ dieSize: 6, results: Array(8).fill(4) }] }),
    ),
    call(
      "damage",
      "provide_battle_input",
      {
        fill: {
          kind: "rolledDice",
          holeId: "synthetic-rolledDice",
          value: [{ results: Array(8).fill(4) }],
        },
      },
      available({ result: { tag: "resolved" } }),
    ),
    call("end", "end_battle", {}, available({ tag: "battleEnded" })),
  ];
  const after = (id, e) => ({
    label: "after:" + calls.find((c) => c.callId === id).name,
    callId: id,
    states: { [sid]: available({}, e) },
  });
  const observations = [
    after("finalize"),
    after("start", envelope(acts)),
    after("cast", envelope(holes("savingThrowOutcome"))),
    after("save-dice", envelope(holes("savingThrowOutcome"))),
    after("save", envelope(holes("rolledDice"))),
    after("damage-dice", envelope(holes("rolledDice"))),
    after("damage", envelope(acts, 0, 1)),
    {
      label: "beforeEndBattle",
      states: { [sid]: available({}, envelope(acts, 0, 1)) },
    },
    after("end"),
    { label: "final", states: { [sid]: available({}) } },
  ];
  return { calls, observations };
}
function wizardControl(name, change, expected, verdictStatus = "taskFailed") {
  const out = join(base, name);
  mkdirSync(out);
  const fixture = wizardFixture();
  change(fixture);
  writeFileSync(
    join(out, "metadata.json"),
    JSON.stringify({ expectation: "wizardBattle" }),
  );
  writeFileSync(
    join(out, "verdict.json"),
    JSON.stringify({
      status: verdictStatus,
      terminationReason: "modelFinished",
    }),
  );
  writeFileSync(
    join(out, "calls.jsonl"),
    fixture.calls.map((value) => JSON.stringify(value)).join("\n"),
  );
  writeFileSync(
    join(out, "observations.jsonl"),
    fixture.observations.map((value) => JSON.stringify(value)).join("\n"),
  );
  const result = evaluateRun(out);
  if (result.status !== expected)
    throw new Error(
      `${name}: expected ${expected}, received ${result.status}: ${JSON.stringify(result.assertions)}`,
    );
  console.log(`${name}: ${result.status}`);
  return result;
}
wizardControl("mechanical-fireball-positive", () => {}, "completed");
wizardControl(
  "forged-save-die",
  (f) => {
    f.calls.find(
      (c) => c.callId === "save",
    ).arguments.fill.value.outcomes[0].d20TestRoll.naturalD20 = 19;
  },
  "taskFailed",
);
wizardControl(
  "unrequested-save-hole",
  (f) => {
    f.calls.find((c) => c.callId === "save").arguments.fill.holeId =
      "unrelated-save";
  },
  "taskFailed",
);
wizardControl(
  "unspent-spell-slot",
  (f) => {
    f.observations.find((o) => o.callId === "damage").states[
      sid
    ].operation.result.battleEnvelope.checkpoint.combatants[0].origin.spellcasting.spellSlots[0].expended =
      0;
  },
  "taskFailed",
);
wizardControl(
  "premature-battle-end",
  (f) => {
    f.observations.find((o) => o.label === "beforeEndBattle").states[
      sid
    ].operation.result.battleEnvelope.checkpoint.combatants[1].hp = 5;
  },
  "taskFailed",
);

wizardControl(
  "wrong-encounter-roster",
  (f) => {
    f.calls.find((c) => c.callId === "start").arguments.initialCombatants.pop();
  },
  "taskFailed",
);
const earlyDefeat = (f) => {
  f.calls = f.calls.filter((c) =>
    ["create", "finalize", "start", "end"].includes(c.callId),
  );
  const alive = envelope({ kind: "acts", acts: [] });
  alive.checkpoint.currentActorId = "enemy";
  const defeated = structuredClone(alive);
  defeated.checkpoint.combatants[0].hp = 0;
  f.observations = [
    {
      label: "after:start_battle",
      callId: "start",
      states: { [sid]: available({}, alive) },
    },
    { label: "beforeEndBattle", states: { [sid]: available({}, defeated) } },
    { label: "final", states: { [sid]: available({}) } },
  ];
};
wizardControl("legitimate-pre-turn-defeat", earlyDefeat, "completed");
wizardControl(
  "missing-turn-evidence-is-not-defeat-proof",
  (f) => {
    earlyDefeat(f);
    delete f.observations[0].states[sid].operation.result.battleEnvelope
      .checkpoint.currentActorId;
  },
  "taskFailed",
);
wizardControl(
  "nested-active-battle-dice-envelope",
  (f) => {
    for (const c of f.calls.filter((c) => c.name === "roll_dice")) {
      const operation = c.result.structuredContent.operation;
      operation.result = { result: operation.result };
    }
  },
  "completed",
);

wizardControl(
  "cherry-picked-later-save-face",
  (f) => {
    f.calls.find(
      (c) => c.callId === "save-dice",
    ).result.structuredContent.operation.result.groups[0].results = [20, 6];
  },
  "taskFailed",
);
wizardControl(
  "ordered-advantage-save-faces",
  (f) => {
    f.calls.find(
      (c) => c.callId === "save-dice",
    ).result.structuredContent.operation.result.groups[0].results = [6, 12];
    f.calls.find(
      (c) => c.callId === "save",
    ).arguments.fill.value.outcomes[0].d20TestRoll = {
      tag: "multiple",
      first: 6,
      second: 12,
      rollMode: "advantage",
    };
  },
  "completed",
);

wizardControl(
  "ordered-save-and-damage-prefetch",
  (f) => {
    f.calls
      .find((c) => c.callId === "save-dice")
      .result.structuredContent.operation.result.groups.push({
        dieSize: 6,
        results: Array(8).fill(4),
      });
    f.calls = f.calls.filter((c) => c.callId !== "damage-dice");
    f.observations = f.observations.filter((o) => o.callId !== "damage-dice");
  },
  "completed",
);
const canonicalSelections = (f) => {
  for (const o of f.observations)
    o.pendingSelectionIds = {
      [sid]: ["cast", "save-dice", "save", "damage-dice"].includes(o.callId)
        ? "synthetic-selection:one"
        : null,
    };
};
wizardControl("canonical-selection-positive", canonicalSelections, "completed");
wizardControl(
  "cross-selection-dice-reuse",
  (f) => {
    canonicalSelections(f);
    f.observations.find((o) => o.callId === "save-dice").pendingSelectionIds[
      sid
    ] = "synthetic-selection:two";
  },
  "taskFailed",
);

wizardControl(
  "act-key-canonical-selection",
  (f) => {
    canonicalSelections(f);
    const cast = f.calls.find((c) => c.callId === "cast");
    cast.arguments = { playSessionId: sid, actKey: "opaque-synthetic-act" };
  },
  "completed",
);
wizardControl(
  "act-key-unrelated-selection",
  (f) => {
    canonicalSelections(f);
    f.calls.find((c) => c.callId === "cast").arguments = {
      playSessionId: sid,
      actKey: "opaque-synthetic-act",
    };
    f.observations.find((o) => o.callId === "cast").states[
      sid
    ].operation.result.battleEnvelope.frontier.replaySubject = {
      ...subject,
      procedureRef: "unrelated-procedure",
    };
  },
  "taskFailed",
);

wizardControl(
  "act-key-already-pending-selection",
  (f) => {
    canonicalSelections(f);
    f.calls.find((c) => c.callId === "cast").arguments = {
      playSessionId: sid,
      actKey: "opaque-synthetic-act",
    };
    const initial = f.observations.find((o) => o.callId === "start");
    initial.states[sid].operation.result.battleEnvelope.frontier =
      holes("savingThrowOutcome");
    initial.pendingSelectionIds[sid] = "synthetic-selection:one";
  },
  "taskFailed",
);

wizardControl(
  "ordered-damage-batch-split",
  (f) => {
    const damage = f.calls.find((c) => c.callId === "damage");
    damage.arguments.fill.value = [
      { results: [4, 4, 4] },
      { results: [4, 4, 4, 4, 4] },
    ];
  },
  "completed",
);
wizardControl(
  "reordered-damage-batch-prefix",
  (f) => {
    f.calls.find(
      (c) => c.callId === "damage-dice",
    ).result.structuredContent.operation.result.groups[0].results = [
      1, 2, 3, 4, 4, 4, 4, 4,
    ];
    f.calls.find((c) => c.callId === "damage").arguments.fill.value = [
      { results: [2, 1, 3] },
      { results: [4, 4, 4, 4, 4] },
    ];
  },
  "taskFailed",
);

wizardControl(
  "allocated-damage-wrong-die-size",
  (f) => {
    for (const o of f.observations) {
      const frontier =
        o.states[sid]?.operation?.result?.battleEnvelope?.frontier;
      if (frontier?.kind === "holes")
        for (const h of frontier.holes)
          if (h.kind === "rolledDice")
            h.allocatedDamageDice = {
              groups: [{ targetId: "enemy", dice: 8, dieSize: 4 }],
            };
    }
  },
  "taskFailed",
);

wizardControl(
  "allocated-damage-ordered-prefix",
  (f) => {
    for (const o of f.observations) {
      const frontier =
        o.states[sid]?.operation?.result?.battleEnvelope?.frontier;
      if (frontier?.kind === "holes")
        for (const h of frontier.holes)
          if (h.kind === "rolledDice")
            h.allocatedDamageDice = {
              groups: [
                { targetId: "enemy", dice: 3, dieSize: 6 },
                { targetId: "enemy-1", dice: 5, dieSize: 6 },
              ],
            };
    }
    f.calls.find((c) => c.callId === "damage").arguments.fill.value = [
      { results: [4, 4, 4] },
      { results: [4, 4, 4, 4, 4] },
    ];
  },
  "completed",
);

wizardControl(
  "allocated-damage-wrong-group-count",
  (f) => {
    for (const o of f.observations) {
      const frontier =
        o.states[sid]?.operation?.result?.battleEnvelope?.frontier;
      if (frontier?.kind === "holes")
        for (const h of frontier.holes)
          if (h.kind === "rolledDice")
            h.allocatedDamageDice = {
              groups: [
                { targetId: "enemy", dice: 3, dieSize: 6 },
                { targetId: "enemy-1", dice: 5, dieSize: 6 },
              ],
            };
    }
  },
  "taskFailed",
);

wizardControl(
  "consecutive-sample-groups-combined",
  (f) => {
    f.calls.find(
      (c) => c.callId === "damage-dice",
    ).result.structuredContent.operation.result.groups = Array.from(
      { length: 8 },
      () => ({ dieSize: 6, results: [4] }),
    );
    f.calls.find((c) => c.callId === "damage").arguments.fill.value = [
      { results: [4, 4, 4] },
      { results: [4, 4, 4, 4, 4] },
    ];
  },
  "completed",
);
wizardControl(
  "consecutive-sample-groups-wrong-die",
  (f) => {
    f.calls.find(
      (c) => c.callId === "damage-dice",
    ).result.structuredContent.operation.result.groups = [
      { dieSize: 6, results: [4] },
      { dieSize: 4, results: Array(7).fill(4) },
    ];
  },
  "taskFailed",
);
wizardControl(
  "consecutive-sample-groups-wrong-prefix",
  (f) => {
    f.calls.find(
      (c) => c.callId === "damage-dice",
    ).result.structuredContent.operation.result.groups = [
      { dieSize: 6, results: [4] },
      { dieSize: 6, results: [3, ...Array(6).fill(4)] },
    ];
  },
  "taskFailed",
);

for (const status of ["infrastructureFailed", "budgetExceeded"]) {
  const result = wizardControl(
    "completed-trace-" + status,
    () => {},
    status,
    status,
  );
  if (result.cleanScenarioPass)
    throw new Error("Nonaccepting status incorrectly marked clean");
}

for (const verdict of [
  {
    expectation: "wizardBattle",
    status: "completed",
    cleanScenarioPass: false,
    visualScopePass: true,
  },
  {
    expectation: "wizardBattle",
    status: "completed",
    cleanScenarioPass: true,
    visualScopePass: false,
  },
])
  if (dialogueAccepted(verdict))
    throw new Error(
      "Incomplete no-confusion/visual acceptance returned success",
    );
if (
  !dialogueAccepted({
    expectation: "wizardBattle",
    cleanScenarioPass: true,
    visualScopePass: true,
  })
)
  throw new Error("Clean visual scenario rejected");
console.log(
  "exit-policy: clean scenario and required live visualization enforced",
);

const metadataOnlyExpectation = wizardControl(
  "metadata-only-wizard-expectation",
  () => {},
  "completed",
);
if (
  metadataOnlyExpectation.expectation !== "wizardBattle" ||
  dialogueAccepted(metadataOnlyExpectation)
)
  throw new Error("Metadata expectation lost required visual acceptance");
if (dialogueAccepted({ cleanScenarioPass: true, visualScopePass: true }))
  throw new Error("Unknown expectation admitted");
