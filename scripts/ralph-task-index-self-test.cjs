#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parsePlan, runnableTasks, taskTsv } = require("./ralph-task-index.cjs");

function plan(tasks) {
  return `# Test\n\n<!-- ralph-task-index\n${JSON.stringify(
    { schema: "ralph-plan.v1", tasks },
    null,
    2,
  )}\n-->\n\n${tasks
    .map((task) => `### Task ${task.number} - ${task.id}\n\nBody.`)
    .join("\n\n")}\n`;
}

function withPlan(tasks, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ralph-task-index-"));
  const planPath = path.join(root, "plan.md");
  try {
    fs.writeFileSync(planPath, plan(tasks));
    run(planPath);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const task = (number, id, status, dependencies = []) => ({
  number,
  id,
  status,
  title: id,
  dependencies,
});

withPlan(
  [
    task(1, "A", "ready-for-research"),
    task(2, "B", "ready-for-research", ["A"]),
    task(3, "C", "ready-for-research", ["B"]),
  ],
  (planPath) => {
    const tasks = parsePlan(planPath);
    assert.deepEqual(
      runnableTasks(tasks).map((entry) => entry.id),
      ["A"],
    );
    assert.equal(taskTsv(tasks[0]).split("\t").length, 6);
  },
);

withPlan(
  [task(1, "A", "done"), task(2, "B", "ready-for-research", ["A"])],
  (planPath) => {
    assert.deepEqual(
      runnableTasks(parsePlan(planPath)).map((entry) => entry.id),
      ["B"],
    );
  },
);

withPlan([task(1, "A", "ready-for-research", ["MISSING"])], (planPath) => {
  assert.throws(() => parsePlan(planPath), /depends on unknown task MISSING/);
});

withPlan(
  [
    task(1, "A", "ready-for-research", ["B"]),
    task(2, "B", "ready-for-research", ["A"]),
  ],
  (planPath) => {
    assert.throws(() => parsePlan(planPath), /dependency cycle/);
  },
);

withPlan(
  [task(1, "A", "ready-for-research"), task(1, "B", "ready-for-research")],
  (planPath) => {
    assert.throws(() => parsePlan(planPath), /duplicate (Task|task number) 1/);
  },
);

console.log("Ralph task-index self-test passed.");
