import { describe, expect, test } from "vitest";

import magicMissileInput from "../content/magic_missile.json";
import goblinWarriorInput from "../content/stat_block_goblin_warrior.json";
import {
  runSurfaceTraceCli,
  type SurfaceTraceCliDependencies,
} from "./run-cli.ts";

function cliHarness(input: unknown): {
  readonly dependencies: SurfaceTraceCliDependencies;
  readonly stdout: string[];
  readonly files: Map<string, string>;
} {
  const stdout: string[] = [];
  const files = new Map<string, string>();
  return {
    dependencies: {
      readFile: () => JSON.stringify(input),
      writeFile: (path, contents) => files.set(path, contents),
      resolvePath: (path) => `/resolved/${path}`,
      writeStdout: (contents) => stdout.push(contents),
    },
    stdout,
    files,
  };
}

describe("Surface trace CLI", () => {
  test("reports missing input and missing output paths", () => {
    const missingInput = cliHarness(magicMissileInput);
    expect(runSurfaceTraceCli([], missingInput.dependencies)).toBe(64);
    expect(missingInput.stdout).toEqual([
      "usage: tsx src/run.ts <unit.json> [--out <file.md>]\n",
    ]);

    const missingOutput = cliHarness(magicMissileInput);
    expect(
      runSurfaceTraceCli(
        ["magic_missile.json", "--out"],
        missingOutput.dependencies,
      ),
    ).toBe(64);
    expect(missingOutput.stdout.at(-1)).toBe("--out flag given without path\n");
  });

  test("renders a Unit trace to stdout", () => {
    const harness = cliHarness(magicMissileInput);

    expect(
      runSurfaceTraceCli(["magic_missile.json"], harness.dependencies),
    ).toBe(0);
    expect(harness.stdout.join("")).toContain("magic_missile");
    expect(harness.files.size).toBe(0);
  });

  test("renders a Stat Block trace to a resolved output path", () => {
    const harness = cliHarness(goblinWarriorInput);

    expect(
      runSurfaceTraceCli(
        ["goblin.json", "--out", "goblin.trace.md"],
        harness.dependencies,
      ),
    ).toBe(0);
    expect(harness.stdout).toEqual(["wrote /resolved/goblin.trace.md\n"]);
    expect(harness.files.get("/resolved/goblin.trace.md")).toContain(
      "stat_block_goblin_warrior",
    );
  });
});
