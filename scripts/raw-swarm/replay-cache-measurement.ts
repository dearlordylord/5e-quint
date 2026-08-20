import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { repoRoot, sha256Text } from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

export type ReplayCacheMeasurement = {
  readonly schemaVersion: 1;
  readonly transcriptSha256: string;
  readonly prefixCount: number;
  readonly cumulativeReplayMilliseconds: number;
  readonly cacheThresholdMilliseconds: 60_000;
  readonly reachesCumulativeThreshold: boolean;
  readonly prefixes: readonly {
    readonly continuation: number;
    readonly callCount: number;
    readonly elapsedMilliseconds: number;
  }[];
};

export function measurePrefixReplay(input: {
  readonly evidenceSetDirectory: string;
}): ReplayCacheMeasurement {
  const evidenceSetDirectory = resolve(repoRoot, input.evidenceSetDirectory);
  const transcriptPath = resolve(
    evidenceSetDirectory,
    "evidence/sdk-calls.jsonl",
  );
  const transcriptText = readFileSync(transcriptPath, "utf8");
  const lines = transcriptText
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const records = lines.map((line): unknown => JSON.parse(line));
  const parsed = parseSdkTranscript(records);
  if (parsed.tag === "invalid") fail(parsed.message);
  if (parsed.value.calls.length === 0)
    fail("Prefix replay measurement requires a runnable SDK transcript.");
  const temporaryDirectory = mkdtempSync(
    resolve(repoRoot, "scripts/raw-swarm/out/replay-measurement-"),
  );
  try {
    cpSync(
      resolve(evidenceSetDirectory, "replay-supervisor.mjs"),
      resolve(temporaryDirectory, "replay-supervisor.mjs"),
    );
    mkdirSync(resolve(temporaryDirectory, "evidence"), { recursive: true });
    for (const name of ["characters.ts", "setup.ts", "program.ts"])
      cpSync(
        resolve(evidenceSetDirectory, "evidence", name),
        resolve(temporaryDirectory, "evidence", name),
      );
    const groups = parsed.value.calls.reduce((byContinuation, call) => {
      byContinuation.set(call.continuation, [
        ...(byContinuation.get(call.continuation) ?? []),
        call,
      ]);
      return byContinuation;
    }, new Map<number, typeof parsed.value.calls>());
    const retainedLines = [lines[0]!];
    const prefixes = [...groups.entries()]
      .sort(([left], [right]) => left - right)
      .map(([continuation, calls]) => {
        retainedLines.push(...calls.map((call) => JSON.stringify(call)));
        writeFileSync(
          resolve(temporaryDirectory, "evidence/sdk-calls.jsonl"),
          `${retainedLines.join("\n")}\n`,
        );
        const started = performance.now();
        const replay = spawnSync(
          process.execPath,
          [resolve(temporaryDirectory, "replay-supervisor.mjs"), "replay"],
          { cwd: temporaryDirectory, encoding: "utf8" },
        );
        const elapsedMilliseconds = Math.round(performance.now() - started);
        if (replay.error !== undefined) throw replay.error;
        if (replay.status !== 0)
          fail(
            `Replay prefix ${continuation} failed: ${replay.stderr || replay.stdout}`,
          );
        return {
          continuation,
          callCount: retainedLines.length - 1,
          elapsedMilliseconds,
        };
      });
    const cumulativeReplayMilliseconds = prefixes.reduce(
      (total, prefix) => total + prefix.elapsedMilliseconds,
      0,
    );
    return {
      schemaVersion: 1,
      transcriptSha256: sha256Text(transcriptText),
      prefixCount: prefixes.length,
      cumulativeReplayMilliseconds,
      cacheThresholdMilliseconds: 60_000,
      reachesCumulativeThreshold: cumulativeReplayMilliseconds >= 60_000,
      prefixes,
    };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function main(args: readonly string[]): void {
  const [evidenceSetDirectory, outputPath, ...unexpected] = args;
  if (
    evidenceSetDirectory === undefined ||
    outputPath === undefined ||
    unexpected.length > 0
  )
    fail(
      `Usage: ${basename(import.meta.filename)} <evidence-set-directory> <output.json>`,
    );
  const measurement = measurePrefixReplay({ evidenceSetDirectory });
  const destination = resolve(repoRoot, outputPath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(measurement, null, 2)}\n`, {
    flag: "wx",
  });
  console.log(JSON.stringify(measurement));
}

if (process.argv[1]?.endsWith("replay-cache-measurement.ts"))
  main(process.argv.slice(2));
