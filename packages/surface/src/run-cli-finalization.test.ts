import { describe, expect, test, vi } from "vitest";

import magicMissileInput from "../content/magic_missile.json";
import {
  runSurfaceTraceCli,
  type SurfaceTraceCliDependencies,
} from "./run-cli.ts";

vi.mock("./interpreter/tracer.ts", () => {
  const failure = {
    _tag: "Failure" as const,
    failure: [
      {
        code: "duplicate_node_id" as const,
        id: "synthetic:duplicate",
        nodeIndex: 1,
      },
    ],
  };

  return {
    traceStatBlock: vi.fn(() => failure),
    traceUnit: vi.fn(() => failure),
  };
});

function dependenciesFor(input: unknown): {
  readonly dependencies: SurfaceTraceCliDependencies;
  readonly stdout: string[];
} {
  const stdout: string[] = [];
  return {
    dependencies: {
      readFile: () => JSON.stringify(input),
      writeFile: () => undefined,
      resolvePath: (path) => `/resolved/${path}`,
      writeStdout: (contents) => stdout.push(contents),
    },
    stdout,
  };
}

describe("Surface trace CLI finalization failures", () => {
  test("reports unit trace validation failures instead of rendering an invalid graph", () => {
    const harness = dependenciesFor(magicMissileInput);

    expect(
      runSurfaceTraceCli(["magic_missile.json"], harness.dependencies),
    ).toBe(64);
    expect(harness.stdout).toEqual([
      'trace validation failed:\n{"code":"duplicate_node_id","id":"synthetic:duplicate","nodeIndex":1}\n',
    ]);
  });
});
