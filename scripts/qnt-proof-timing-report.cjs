#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const EVENT_PREFIX = "QNT_PROOF_EVENT ";
const REPORT_VERSION = 1;
const TERMINAL_EVENTS = new Set(["fail", "pass", "timeout"]);
const OBSERVED_EVENTS = new Set(["heartbeat", "start", ...TERMINAL_EVENTS]);

function moduleKey(entry) {
  return `${entry.suite}\u0000${entry.kind}\u0000${entry.module}`;
}

function parseEventJson(line, lineNumber) {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(
      `Invalid QNT proof event JSON on line ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseProofEvents(source) {
  const observationByModule = new Map();
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const prefixIndex = line.indexOf(EVENT_PREFIX);
    if (prefixIndex === -1) continue;
    const event = parseEventJson(
      line.slice(prefixIndex + EVENT_PREFIX.length),
      index + 1,
    );
    if (!OBSERVED_EVENTS.has(event.event)) continue;
    for (const field of ["suite", "kind", "module"]) {
      if (typeof event[field] !== "string" || event[field].length === 0) {
        throw new Error(
          `QNT proof event on line ${index + 1} has no ${field}.`,
        );
      }
    }
    if (!Number.isSafeInteger(event.elapsedMs) || event.elapsedMs < 0) {
      throw new Error(
        `QNT proof event on line ${index + 1} has invalid elapsedMs.`,
      );
    }
    if (!Number.isSafeInteger(event.timeoutMs) || event.timeoutMs <= 0) {
      throw new Error(
        `QNT proof event on line ${index + 1} has invalid timeoutMs.`,
      );
    }
    const entry = {
      suite: event.suite,
      kind: event.kind,
      module: event.module,
      status: TERMINAL_EVENTS.has(event.event) ? event.event : "incomplete",
      elapsedMs: event.elapsedMs,
      timeoutMs: event.timeoutMs,
    };
    const key = moduleKey(entry);
    const previous = observationByModule.get(key);
    if (entry.status === "timeout") {
      observationByModule.set(key, entry);
      continue;
    }
    if (previous?.status === "timeout") continue;
    if (previous !== undefined && previous.status !== "incomplete") continue;
    observationByModule.set(key, entry);
  }
  return Array.from(observationByModule.values()).sort((left, right) =>
    moduleKey(left).localeCompare(moduleKey(right)),
  );
}

function readPreviousModules(previousPath) {
  if (previousPath === undefined) return null;
  const report = JSON.parse(fs.readFileSync(previousPath, "utf8"));
  if (report.version !== REPORT_VERSION || !Array.isArray(report.modules)) {
    throw new Error(`${previousPath}: unsupported QNT proof timing report.`);
  }
  return report.modules;
}

function buildReport(modules, previousModules) {
  if (modules.length === 0) {
    throw new Error("No terminal QNT_PROOF_EVENT records were found.");
  }
  const previousByKey = new Map(
    (previousModules ?? []).map((entry) => [moduleKey(entry), entry]),
  );
  const currentKeys = new Set(modules.map(moduleKey));
  const comparisons = modules.map((entry) => {
    const previous = previousByKey.get(moduleKey(entry));
    return {
      suite: entry.suite,
      kind: entry.kind,
      module: entry.module,
      previousElapsedMs: previous?.elapsedMs ?? null,
      elapsedDeltaMs:
        previous === undefined ? null : entry.elapsedMs - previous.elapsedMs,
    };
  });
  const matched = comparisons.filter(
    (entry) => entry.previousElapsedMs !== null,
  );
  const removedModules = Array.from(previousByKey.values()).filter(
    (entry) => !currentKeys.has(moduleKey(entry)),
  );
  return {
    version: REPORT_VERSION,
    summary: {
      modules: modules.length,
      passed: modules.filter((entry) => entry.status === "pass").length,
      failed: modules.filter((entry) => entry.status === "fail").length,
      timedOut: modules.filter((entry) => entry.status === "timeout").length,
      incomplete: modules.filter((entry) => entry.status === "incomplete")
        .length,
      totalModuleElapsedMs: modules.reduce(
        (total, entry) => total + entry.elapsedMs,
        0,
      ),
    },
    modules,
    comparison:
      previousModules === null
        ? null
        : {
            matchedModules: matched.length,
            addedModules: comparisons.filter(
              (entry) => entry.previousElapsedMs === null,
            ).length,
            removedModules: removedModules.length,
            matchedElapsedDeltaMs: matched.reduce(
              (total, entry) => total + entry.elapsedDeltaMs,
              0,
            ),
            modules: comparisons,
          },
  };
}

function seconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function markdownReport(report) {
  const comparisonByKey = new Map(
    (report.comparison?.modules ?? []).map((entry) => [
      moduleKey(entry),
      entry,
    ]),
  );
  const lines = [
    "## QNT proof timings",
    "",
    `${report.summary.passed}/${report.summary.modules} modules passed; ${report.summary.failed} failed, ${report.summary.timedOut} timed out, ${report.summary.incomplete} incomplete; cumulative observed module time ${seconds(report.summary.totalModuleElapsedMs)}.`,
    "",
    "| Suite | Module | Status | Current | Previous | Delta |",
    "| --- | --- | --- | ---: | ---: | ---: |",
  ];
  for (const entry of [...report.modules].sort(
    (left, right) => right.elapsedMs - left.elapsedMs,
  )) {
    const comparison = comparisonByKey.get(moduleKey(entry));
    const previous = comparison?.previousElapsedMs;
    const delta = comparison?.elapsedDeltaMs;
    lines.push(
      `| ${entry.suite} | \`${entry.module}\` | ${entry.status} | ${seconds(entry.elapsedMs)} | ${previous == null ? "—" : seconds(previous)} | ${delta == null ? "—" : `${delta >= 0 ? "+" : ""}${seconds(delta)}`} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function runSelfTest() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "qnt-proof-timing-"));
  try {
    const source = [
      'noise QNT_PROOF_EVENT {"event":"start","suite":"battle-runtime","kind":"run-block","module":"a.qnt","elapsedMs":0,"timeoutMs":360000}',
      'QNT_PROOF_EVENT {"event":"pass","suite":"battle-runtime","kind":"run-block","module":"a.qnt","elapsedMs":42000,"timeoutMs":360000}',
      'QNT_PROOF_EVENT {"event":"timeout","suite":"shared-algebras","kind":"inductive","module":"b.qnt","elapsedMs":360000,"timeoutMs":360000}',
      'QNT_PROOF_EVENT {"event":"fail","suite":"shared-algebras","kind":"inductive","module":"b.qnt","elapsedMs":360100,"timeoutMs":360000}',
      'QNT_PROOF_EVENT {"event":"pass","suite":"shared-algebras","kind":"inductive","module":"b.qnt","elapsedMs":360200,"timeoutMs":360000}',
      'QNT_PROOF_EVENT {"event":"start","suite":"battle-runtime","kind":"run-block","module":"c.qnt","elapsedMs":0,"timeoutMs":360000}',
      'QNT_PROOF_EVENT {"event":"heartbeat","suite":"battle-runtime","kind":"run-block","module":"c.qnt","elapsedMs":60000,"timeoutMs":360000}',
    ].join("\n");
    const modules = parseProofEvents(source);
    if (
      modules.length !== 3 ||
      modules[1].status !== "incomplete" ||
      modules[1].elapsedMs !== 60000 ||
      modules[2].status !== "timeout"
    ) {
      throw new Error(
        `terminal event parsing failed: ${JSON.stringify(modules)}`,
      );
    }
    const previous = [
      { ...modules[0], elapsedMs: 40000 },
      {
        suite: "battle-runtime",
        kind: "run-block",
        module: "removed.qnt",
        status: "pass",
        elapsedMs: 1000,
        timeoutMs: 360000,
      },
    ];
    const report = buildReport(modules, previous);
    if (
      report.summary.passed !== 1 ||
      report.summary.timedOut !== 1 ||
      report.summary.incomplete !== 1 ||
      report.comparison?.matchedModules !== 1 ||
      report.comparison?.addedModules !== 2 ||
      report.comparison?.removedModules !== 1 ||
      report.comparison?.matchedElapsedDeltaMs !== 2000
    ) {
      throw new Error(`timing comparison failed: ${JSON.stringify(report)}`);
    }
    if (!markdownReport(report).includes("+2.0s")) {
      throw new Error("Markdown timing delta was not rendered.");
    }
    if (!markdownReport(report).includes("1 incomplete")) {
      throw new Error("Markdown timing completeness was not rendered.");
    }
    const invalid = path.join(fixture, "invalid.json");
    fs.writeFileSync(invalid, JSON.stringify({ version: 0, modules: [] }));
    try {
      readPreviousModules(invalid);
      throw new Error("invalid previous report was accepted");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("unsupported")) {
        throw error;
      }
    }
    console.log("QNT proof timing report self-test OK.");
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

if (require.main === module) {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
  } else {
    const eventsPath = argumentValue("--events");
    const outputPath = argumentValue("--out");
    const previousPath = argumentValue("--previous");
    if (eventsPath === undefined || outputPath === undefined) {
      console.error(
        "Usage: qnt-proof-timing-report.cjs --events <log> --out <json> [--previous <json>]",
      );
      process.exit(2);
    }
    const modules = parseProofEvents(fs.readFileSync(eventsPath, "utf8"));
    const report = buildReport(modules, readPreviousModules(previousPath));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(markdownReport(report));
  }
}

module.exports = {
  buildReport,
  markdownReport,
  parseProofEvents,
};
