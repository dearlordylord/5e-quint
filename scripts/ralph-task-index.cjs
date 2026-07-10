#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const runnableStatuses = new Set([
  "ready-for-research",
  "ready-for-implementation",
  "ready-for-implementation-after-light-research",
]);

function taskIndexFromPlanText(text, planPath) {
  const indexMatch = text.match(/<!-- ralph-task-index\n([\s\S]*?)\n-->/);
  if (!indexMatch) {
    throw new Error(`missing ralph-task-index block in ${planPath}`);
  }

  const index = JSON.parse(indexMatch[1]);
  if (index.schema !== "ralph-plan.v1" || !Array.isArray(index.tasks)) {
    throw new Error(`invalid ralph-task-index schema in ${planPath}`);
  }
  return index;
}

function headingLines(text) {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") lineStarts.push(index + 1);
  }

  const lineNumber = (offset) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (lineStarts[middle] <= offset) low = middle + 1;
      else high = middle - 1;
    }
    return high + 1;
  };

  const headings = [...text.matchAll(/^### Task ([0-9]+)\b.*$/gm)].map(
    (match) => ({ number: Number(match[1]), offset: match.index }),
  );
  const byNumber = new Map();
  for (const [index, heading] of headings.entries()) {
    if (byNumber.has(heading.number)) {
      throw new Error(`duplicate Task ${heading.number} heading`);
    }
    byNumber.set(heading.number, {
      startLine: lineNumber(heading.offset),
      endLine:
        index + 1 < headings.length
          ? lineNumber(headings[index + 1].offset) - 1
          : text.split("\n").length,
    });
  }

  const lines = text.split("\n");
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|");
    if (cells.length < 3) continue;
    const number = Number(cells[1]?.trim());
    if (!Number.isInteger(number) || byNumber.has(number)) continue;
    byNumber.set(number, { startLine: index + 1, endLine: index + 1 });
  }
  return byNumber;
}

function assertAcyclic(tasks, byId) {
  const visiting = new Set();
  const visited = new Set();

  const visit = (task) => {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) {
      throw new Error(`dependency cycle includes ${task.id}`);
    }
    visiting.add(task.id);
    for (const dependencyId of task.dependencies) {
      visit(byId.get(dependencyId));
    }
    visiting.delete(task.id);
    visited.add(task.id);
  };

  for (const task of tasks) visit(task);
}

function parsePlan(planPath) {
  const text = fs.readFileSync(planPath, "utf8");
  const index = taskIndexFromPlanText(text, planPath);
  const taskBodyByNumber = headingLines(text);
  const numbers = new Set();
  const ids = new Set();

  const tasks = index.tasks.map((task) => {
    if (
      !Number.isInteger(task.number) ||
      task.number < 0 ||
      typeof task.id !== "string" ||
      task.id.trim() !== task.id ||
      task.id.length === 0 ||
      typeof task.status !== "string" ||
      typeof task.title !== "string" ||
      /[\t\n]/.test(task.id) ||
      /[\t\n]/.test(task.title)
    ) {
      throw new Error(`invalid task metadata: ${JSON.stringify(task)}`);
    }
    if (numbers.has(task.number)) {
      throw new Error(`duplicate task number ${task.number}`);
    }
    if (ids.has(task.id)) {
      throw new Error(`duplicate task id ${task.id}`);
    }
    numbers.add(task.number);
    ids.add(task.id);

    const body = taskBodyByNumber.get(task.number);
    if (!body) {
      throw new Error(
        `missing markdown heading or queue row for task ${task.number} (${task.id})`,
      );
    }

    const rawDependencies = task.dependencies ?? [];
    if (!Array.isArray(rawDependencies)) {
      throw new Error(`${task.id} dependencies must be an array`);
    }
    const dependencies = rawDependencies.map((dependencyId) => {
      if (
        typeof dependencyId !== "string" ||
        dependencyId.trim() !== dependencyId ||
        dependencyId.length === 0 ||
        /[\t\n,]/.test(dependencyId)
      ) {
        throw new Error(
          `${task.id} has invalid dependency ${JSON.stringify(dependencyId)}`,
        );
      }
      return dependencyId;
    });
    if (new Set(dependencies).size !== dependencies.length) {
      throw new Error(`${task.id} has duplicate dependencies`);
    }
    if (dependencies.includes(task.id)) {
      throw new Error(`${task.id} cannot depend on itself`);
    }

    return { ...task, ...body, dependencies };
  });

  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const task of tasks) {
    for (const dependencyId of task.dependencies) {
      if (!byId.has(dependencyId)) {
        throw new Error(`${task.id} depends on unknown task ${dependencyId}`);
      }
    }
  }
  assertAcyclic(tasks, byId);
  return tasks;
}

function runnableTasks(tasks) {
  const statusById = new Map(tasks.map((task) => [task.id, task.status]));
  return tasks.filter(
    (task) =>
      runnableStatuses.has(task.status) &&
      task.dependencies.every(
        (dependencyId) => statusById.get(dependencyId) === "done",
      ),
  );
}

function taskTsv(task) {
  return [
    task.number,
    task.id,
    task.status,
    task.startLine,
    task.endLine,
    task.title,
  ].join("\t");
}

function main() {
  const [planPath, mode = "--all-tsv"] = process.argv.slice(2);
  if (!planPath || !["--all-tsv", "--runnable-tsv"].includes(mode)) {
    throw new Error(
      "usage: ralph-task-index.cjs <plan.md> [--all-tsv|--runnable-tsv]",
    );
  }
  const tasks = parsePlan(planPath);
  const selected = mode === "--runnable-tsv" ? runnableTasks(tasks) : tasks;
  for (const task of selected) console.log(taskTsv(task));
}

if (require.main === module) main();

module.exports = { parsePlan, runnableTasks, taskTsv };
