import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ProcessService } from "./ralph-issue-context.js";

const roots: Array<string> = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const provideProcess = <A, E>(
  effect: Effect.Effect<A, E, ProcessService>,
  timeoutMs = 5_000,
) =>
  effect.pipe(
    Effect.provide(ProcessService.layer(timeoutMs)),
    Effect.provide(NodeContext.layer),
  );

describe("production ProcessService", () => {
  it("drains stdout and stderr concurrently while forwarding stdin and environment", async () => {
    const result = await Effect.runPromise(
      provideProcess(
        Effect.gen(function* () {
          const processService = yield* ProcessService;
          return yield* processService.runStatus(
            process.execPath,
            [
              "-e",
              [
                "let input = ''",
                "process.stdin.setEncoding('utf8')",
                "process.stdin.on('data', chunk => { input += chunk })",
                "process.stdin.on('end', () => {",
                "  process.stdout.write('O'.repeat(262144) + ':' + input + ':' + process.env.RALPH_PROCESS_TEST)",
                "  process.stderr.write('E'.repeat(262144))",
                "})",
              ].join("\n"),
            ],
            "payload",
            { RALPH_PROCESS_TEST: "injected" },
          );
        }),
      ),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toHaveLength(262144 + ":payload:injected".length);
    expect(result.stdout.endsWith(":payload:injected")).toBe(true);
    expect(result.stderr).toBe("E".repeat(262144));
  });

  it("preserves nonzero status and lets run translate it into a typed error", async () => {
    const status = await Effect.runPromise(
      provideProcess(
        Effect.gen(function* () {
          const processService = yield* ProcessService;
          return yield* processService.runStatus(process.execPath, [
            "-e",
            "process.stderr.write('expected failure'); process.exit(23)",
          ]);
        }),
      ),
    );
    expect(status).toEqual({
      status: 23,
      stdout: "",
      stderr: "expected failure",
    });

    const error = await Effect.runPromise(
      provideProcess(
        Effect.gen(function* () {
          const processService = yield* ProcessService;
          return yield* processService.run(process.execPath, [
            "-e",
            "process.stderr.write('expected failure'); process.exit(23)",
          ]);
        }).pipe(Effect.flip),
      ),
    );
    expect(error).toMatchObject({
      code: "boundary-command",
      message: expect.stringContaining("status 23: expected failure"),
    });
  });

  it("interrupts a command at the configured boundary timeout", async () => {
    const root = mkdtempSync(join(tmpdir(), "ralph-process-timeout-"));
    roots.push(root);
    const sentinel = join(root, "child-survived");
    const error = await Effect.runPromise(
      provideProcess(
        Effect.gen(function* () {
          const processService = yield* ProcessService;
          return yield* processService.run(process.execPath, [
            "-e",
            `setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(sentinel)}, "leaked"), 200)`,
          ]);
        }).pipe(Effect.flip),
        20,
      ),
    );
    expect(error).toMatchObject({
      code: "boundary-command",
      message: expect.stringContaining("timed out after 20ms"),
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(existsSync(sentinel)).toBe(false);
  });
});
