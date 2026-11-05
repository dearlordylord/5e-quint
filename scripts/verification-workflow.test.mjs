import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeQualityMilestone } from "./workspace-quality-harness.mjs";
import qualityPlan from "./quality-milestone-plan.cjs";
import {
  verificationInputs,
  receiptCoversSourceCheck,
  readReceipt,
  writeReceipt,
} from "./verification-receipts.mjs";
import {
  captureDialogueFailures,
  dialogueWorkflowOptions,
  runDialogueWorkflow,
} from "./dialogue-workflow.mjs";

const check = (id, prerequisites = []) => ({
  id,
  command: "fixture",
  args: [id],
  prerequisites,
});
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "dnd-verification-workflow-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const args of [
    ["init", "--quiet"],
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "fixture",
    ],
  ])
    assert.equal(spawnSync("git", args, { cwd: root }).status, 0);
  writeFileSync(join(root, "source.txt"), "before");
  return root;
}

test("ordinary failure stops independent expensive work; diagnostic mode collects", () => {
  for (const collectAll of [false, true]) {
    const calls = [];
    const result = executeQualityMilestone(
      [check("failure"), check("expensive")],
      {
        collectAll,
        execute: ({ id }) => {
          calls.push(id);
          return { status: id === "failure" ? 1 : 0 };
        },
        write: () => {},
      },
    );
    assert.deepEqual(
      calls,
      collectAll ? ["failure", "expensive"] : ["failure"],
    );
    assert.equal(result.exitCode, 1);
  }
});

test("emergency stops even diagnostic collection", () => {
  const calls = [];
  const result = executeQualityMilestone([check("oom"), check("expensive")], {
    collectAll: true,
    execute: ({ id }) => {
      calls.push(id);
      return { status: 137 };
    },
    write: () => {},
  });
  assert.deepEqual(calls, ["oom"]);
  assert.equal(result.exitCode, 137);
});

test("canonical plan preserves all gates and prerequisites and defers heavy work", () => {
  const plan = qualityPlan.QUALITY_MILESTONE_PLAN;
  assert.equal(plan.length, 44);
  const prior = new Set();
  for (const entry of plan) {
    assert(!prior.has(entry.id));
    assert(entry.prerequisites.every((id) => prior.has(id)));
    prior.add(entry.id);
  }
  const index = (id) => plan.findIndex((entry) => entry.id === id);
  assert(index("markdown-links") < index("build"));
  assert(index("lint") < index("typecheck"));
  assert.equal(plan.at(-1).id, "coverage");
  assert.deepEqual(
    plan.at(-1).prerequisites,
    plan.slice(0, -1).map(({ id }) => id),
  );
});

test("receipt names exact scope, source, command, and stable successful execution", (t) => {
  const root = fixture(t),
    path = join(root, ".audit/receipt.json");
  const fingerprint = verificationInputs(root),
    entry = check("local");
  writeReceipt(path, {
    inputSha256: fingerprint,
    inputsStable: true,
    plan: [entry],
    outcomes: [{ id: "local", status: "PASS" }],
  });
  const receipt = readReceipt(path);
  assert(receiptCoversSourceCheck(receipt, verificationInputs(root), entry));
  assert(!receiptCoversSourceCheck(receipt, fingerprint, check("another")));
  assert(
    !receiptCoversSourceCheck(receipt, fingerprint, {
      ...entry,
      args: ["changed"],
    }),
  );
  const sourceMode = statSync(join(root, "source.txt")).mode & 0o777;
  chmodSync(join(root, "source.txt"), sourceMode ^ 0o100);
  assert(!receiptCoversSourceCheck(receipt, verificationInputs(root), entry));
  chmodSync(join(root, "source.txt"), sourceMode);
  assert(
    !receiptCoversSourceCheck(
      { ...receipt, inputsStable: false },
      fingerprint,
      entry,
    ),
  );
  assert(
    !receiptCoversSourceCheck(
      { ...receipt, outcomes: [{ id: "local", status: "FAIL" }] },
      fingerprint,
      entry,
    ),
  );
  writeFileSync(join(root, "source.txt"), "after");
  assert(!receiptCoversSourceCheck(receipt, verificationInputs(root), entry));
  writeFileSync(join(root, "source.txt"), "before");
  assert(receiptCoversSourceCheck(receipt, verificationInputs(root), entry));
  rmSync(join(root, "source.txt"));
  assert(!receiptCoversSourceCheck(receipt, verificationInputs(root), entry));
  writeFileSync(path, "null");
  assert.equal(readReceipt(path), null);
  writeFileSync(path, '{"version":1,"outcomes":[null]}');
  assert.equal(readReceipt(path), null);
});

test("repair has hard budgets and qualification refuses resume before execution", () => {
  const args = [
    "--out",
    join(tmpdir(), "unused-dnd-workflow-output"),
    "--case",
    "fixture",
  ];
  const repair = dialogueWorkflowOptions(["repair", ...args]);
  assert(repair.args.includes("12"));
  assert.throws(
    () => dialogueWorkflowOptions(["repair", ...args, "--max-calls", "13"]),
    /between/,
  );
  assert.throws(
    () => dialogueWorkflowOptions(["qualify", ...args, "--resume", "prior"]),
    /fresh dialogue/,
  );
  assert.throws(
    () =>
      dialogueWorkflowOptions(["qualify", ...args, "--prepare-only", "true"]),
    /Unknown/,
  );
  assert.throws(
    () =>
      dialogueWorkflowOptions([
        "qualify",
        "--out",
        args[1],
        "--prompt",
        join(import.meta.dirname, "verification-workflow.test.mjs"),
      ]),
    /explicit --expect/,
  );
  const codex = dialogueWorkflowOptions([
    "repair",
    ...args,
    "--client",
    "codex",
  ]);
  assert(!codex.args.includes("--max-turns"));
});

test("failure capsule preserves actual pre-state, request, response, rolls and schema bytes", (t) => {
  const root = fixture(t);
  const call = {
    callId: "failed",
    name: "provide_battle_input",
    arguments: { fill: { faces: [1, 6, 13, 13] } },
    result: { isError: true },
  };
  writeFileSync(join(root, "calls.jsonl"), JSON.stringify(call) + "\n");
  const before = {
    label: "initial",
    states: { pending: "savingThrowOutcome" },
  };
  writeFileSync(
    join(root, "observations.jsonl"),
    [before, { callId: "failed", states: before.states }]
      .map(JSON.stringify)
      .join("\n"),
  );
  const schema = '{"tools":[{"name":"provide_battle_input"}]}\n';
  writeFileSync(join(root, "request-tools-0.json"), schema);
  const [path] = captureDialogueFailures(root, [call]);
  const capsule = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(capsule.before, before);
  assert.deepEqual(capsule.requestAndResponse, call);
  assert.equal(
    readFileSync(
      join(root, "failure-evidence/original/request-tools-0.json"),
      "utf8",
    ),
    schema,
  );
  assert.match(capsule.checkpointScope, /not a pre-call/);
});

function driverFixture(t) {
  const repo = fixture(t),
    own = join(repo, "packages/mcp/scripts/dialogue-evaluation");
  mkdirSync(own, { recursive: true });
  writeFileSync(join(own, "run.mjs"), "// driver fixture\n");
  writeFileSync(
    join(own, "evaluate.mjs"),
    'import {readFileSync} from "node:fs"; import {join} from "node:path"; export const evaluateRun = dir => JSON.parse(readFileSync(join(dir, "evaluated.json"))); export const dialogueAccepted = v => v.cleanScenarioPass === true;\n',
  );
  mkdirSync(join(repo, "plugins/dnd-srd-oracle/evals"), { recursive: true });
  writeFileSync(
    join(repo, "plugins/dnd-srd-oracle/evals/evaluation-inventory.json"),
    JSON.stringify({
      autonomousDialogue: [{ id: "fixture", expectation: "session" }],
    }),
  );
  const out = join(repo, ".audit/run");
  const artifacts = ({
    resumed = false,
    sourceChanged = false,
    rejectedCalls = [],
    newCalls = 1,
    status = "taskFailed",
  } = {}) => {
    mkdirSync(out, { recursive: true });
    const calls = [
      ...rejectedCalls,
      { callId: "new", name: "read_play_session", result: {} },
    ];
    writeFileSync(
      join(out, "calls.jsonl"),
      calls.map(JSON.stringify).join("\n"),
    );
    writeFileSync(
      join(out, "observations.jsonl"),
      [
        { label: "initial", states: {} },
        ...calls.map(({ callId }) => ({ callId, states: {} })),
      ]
        .map(JSON.stringify)
        .join("\n"),
    );
    for (const [file, value] of Object.entries({
      "verdict.json": {
        newCalls,
        status,
        terminationReason: "modelFinished",
        infrastructureError: null,
      },
      "evaluated.json": {
        rejectedCalls,
        cleanScenarioPass: rejectedCalls.length === 0,
      },
      "metadata.json": {
        resumedFrom: resumed ? "parent" : null,
        evidenceKind: "apiFunctionBridge",
      },
      "source-verification.json": { unchanged: !sourceChanged },
    }))
      writeFileSync(join(out, file), JSON.stringify(value));
  };
  return { repo, out, artifacts };
}

test("qualify runs the public milestone before a fresh driver and accepts only both passes", async (t) => {
  const f = driverFixture(t),
    calls = [];
  const result = await runDialogueWorkflow(
    ["qualify", "--repo", f.repo, "--out", f.out, "--case", "fixture"],
    {
      execute: (command, args) => {
        calls.push([command, ...args]);
        if (args[0] !== "quality:milestone") f.artifacts();
        return { status: 0 };
      },
    },
  );
  assert.equal(result, 0);
  assert.deepEqual(calls[0], ["pnpm", "quality:milestone"]);
  assert.equal(
    JSON.parse(readFileSync(join(f.out, "workflow-verdict.json"))).accepted,
    true,
  );
});

test("failed milestone prevents any model call", async (t) => {
  const f = driverFixture(t),
    calls = [];
  const result = await runDialogueWorkflow(
    ["qualify", "--repo", f.repo, "--out", f.out, "--case", "fixture"],
    {
      execute: (_, args) => {
        calls.push(args);
        return { status: 1 };
      },
    },
  );
  assert.equal(result, 1);
  assert.equal(calls.length, 1);
});

test("unknown case and downgraded case expectation fail before the milestone", async (t) => {
  const f = driverFixture(t),
    calls = [];
  for (const args of [
    ["--case", "missing"],
    ["--case", "fixture", "--expect", "catalog"],
  ]) {
    await assert.rejects(
      runDialogueWorkflow(
        ["qualify", "--repo", f.repo, "--out", f.out, ...args],
        {
          execute: (_, argv) => {
            calls.push(argv);
            return { status: 0 };
          },
        },
      ),
    );
  }
  assert.deepEqual(calls, []);
});

test("repair can never produce acceptance even if the evaluator is satisfied", async (t) => {
  const f = driverFixture(t),
    calls = [];
  const result = await runDialogueWorkflow(
    ["repair", "--repo", f.repo, "--out", f.out, "--resume", "prior"],
    {
      execute: (_, args) => {
        calls.push(args);
        f.artifacts({ resumed: true });
        return { status: 0 };
      },
    },
  );
  assert.equal(result, 0);
  assert.equal(calls.length, 1);
  assert.equal(
    JSON.parse(readFileSync(join(f.out, "workflow-verdict.json"))).accepted,
    false,
  );
});

test("repair grades new calls separately from historical rejection; empty or failed probes cannot pass", async (t) => {
  for (const variant of [
    "historical",
    "newRejection",
    "empty",
    "infrastructure",
  ]) {
    const f = driverFixture(t);
    const rejected = {
      callId: "old",
      name: "provide_battle_input",
      result: { isError: true },
    };
    const result = await runDialogueWorkflow(
      ["repair", "--repo", f.repo, "--out", f.out, "--resume", "prior"],
      {
        execute: () => {
          f.artifacts({
            resumed: true,
            rejectedCalls: [rejected],
            newCalls:
              variant === "empty" ? 0 : variant === "newRejection" ? 2 : 1,
            status:
              variant === "infrastructure"
                ? "infrastructureFailed"
                : "budgetExceeded",
          });
          return { status: 1 };
        },
      },
    );
    const verdict = JSON.parse(
      readFileSync(join(f.out, "workflow-verdict.json")),
    );
    assert.equal(result, variant === "historical" ? 0 : 1, variant);
    assert.equal(verdict.probe.healthy, variant === "historical", variant);
    assert.equal(verdict.scenarioClean, false);
    assert.equal(verdict.accepted, false);
  }
});

test("resumed artifacts and changed candidate cannot pass qualification", async (t) => {
  for (const variant of [
    "resumed",
    "changedDuringDialogue",
    "changedAfterMilestone",
  ]) {
    const f = driverFixture(t);
    const result = await runDialogueWorkflow(
      ["qualify", "--repo", f.repo, "--out", f.out, "--case", "fixture"],
      {
        execute: (_, args) => {
          if (args[0] === "quality:milestone") {
            if (variant === "changedAfterMilestone")
              writeFileSync(join(f.repo, "source.txt"), "concurrent edit");
          } else
            f.artifacts({
              resumed: variant === "resumed",
              sourceChanged: variant === "changedDuringDialogue",
            });
          return { status: 0 };
        },
      },
    );
    assert.equal(result, 1, variant);
    if (variant === "changedAfterMilestone") {
      assert(!existsSync(join(f.out, "workflow-verdict.json")));
      continue;
    }
    assert.equal(
      JSON.parse(readFileSync(join(f.out, "workflow-verdict.json"))).accepted,
      false,
    );
  }
});
