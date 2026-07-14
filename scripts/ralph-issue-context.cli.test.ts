import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeContext } from "@effect/platform-node";
import { Effect, Layer, Option, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GitClient,
  GitShaSchema,
  GitHubClient,
  CompletingRemoteClaimSchema,
  RemoteClaimSchema,
  runCli,
  type GitHubIssue,
  type RemoteClaim,
} from "./ralph-issue-context.js";

const gitSha = Schema.decodeUnknownSync(GitShaSchema);
const remoteClaim = Schema.decodeUnknownSync(RemoteClaimSchema);
const completingClaim = Schema.decodeUnknownSync(CompletingRemoteClaimSchema);

const roots: Array<string> = [];
const ownerToken = "11111111-1111-4111-8111-111111111111";
const baseSha = "a".repeat(40);
const claimSha = "c".repeat(40);

const temporaryFile = (name: string, text: string): string => {
  const root = mkdtempSync(join(tmpdir(), "ralph-cli-test-"));
  roots.push(root);
  const path = join(root, name);
  writeFileSync(path, text);
  return path;
};

const taskText = `### Task 1 - GH-41

Canonical issue: https://github.com/dearlordylord/5e-quint/issues/41
`;

const issueBody = `## Ralph execution

- Runnable: yes — one context.

## Blocked by

None — can start immediately.
`;

const githubIssue: GitHubIssue = {
  number: 41,
  title: "Issue 41",
  state: "open",
  labels: ["ready-for-agent"],
  body: issueBody,
  htmlUrl: "https://github.com/dearlordylord/5e-quint/issues/41",
  stateReason: null,
};

const planText = (
  status: "done" | "ready-for-implementation",
) => `<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "GH-41",
      "status": "${status}",
      "title": "Issue 41",
      "dependencies": []
    }
  ]
}
-->

### Task 1 - GH-41

Canonical issue: https://github.com/dearlordylord/5e-quint/issues/41
`;

interface CliState {
  readonly events: Array<string>;
  claim: Option.Option<RemoteClaim>;
}

const cliLayer = (state: CliState) => {
  const github = GitHubClient.testLayer({
    fetchIssue: () => Effect.succeed(githubIssue),
    closeIssue: () => Effect.sync(() => state.events.push("close")),
  });
  const git = GitClient.testLayer({
    originRepository: Effect.succeed("dearlordylord/5e-quint"),
    readClaim: () => Effect.succeed(state.claim),
    createClaim: (reference, request) =>
      Effect.sync(() => {
        const claim = remoteClaim({
          ...request,
          issue: reference.number,
          phase: "active" as const,
          claimSha,
        });
        state.claim = Option.some(claim);
        state.events.push("claim");
        return claim;
      }),
    deleteClaim: (_reference, expectedSha) =>
      Effect.sync(() => {
        state.events.push(`delete:${expectedSha}`);
        state.claim = Option.none();
      }),
    beginCompletion: (_reference, active, resultSha) =>
      Effect.sync(() => {
        const completing = completingClaim({
          ...active,
          phase: "completing" as const,
          resultSha,
          claimSha: "d".repeat(40),
        });
        state.claim = Option.some(completing);
        state.events.push("begin-completion");
        return completing;
      }),
    resolveRef: (ref) =>
      Effect.succeed(
        gitSha(
          ref === baseSha
            ? baseSha
            : ref === "refs/heads/master"
              ? "e".repeat(40)
              : "b".repeat(40),
        ),
      ),
    validateBranch: () => Effect.void,
    isAncestor: () => Effect.succeed(true),
  });
  return Layer.merge(github, git);
};

const run = (args: ReadonlyArray<string>, state: CliState) =>
  Effect.runPromise(
    runCli(["node", "ralph-issue-context", ...args]).pipe(
      Effect.provide(cliLayer(state)),
      Effect.provide(NodeContext.layer),
    ),
  );

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("@effect/cli command boundary", () => {
  it("hydrates through injected GitHub behavior and platform filesystem", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const taskFile = temporaryFile("task.md", taskText);
    const output = join(roots[0]!, "context.md");
    const state: CliState = { events: [], claim: Option.none() };

    await run(["hydrate", "--task-file", taskFile, "--output", output], state);

    const context = readFileSync(output, "utf8");
    expect(context).toContain("# Canonical GitHub Issue Context");
    expect(context).toContain(issueBody);
  });

  it("parses and executes claim, release, completion, and plan validation commands", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const taskFile = temporaryFile("task.md", taskText);
    const root = roots[0]!;
    const readyPlan = join(root, "ready.md");
    const donePlan = join(root, "done.md");
    writeFileSync(readyPlan, planText("ready-for-implementation"));
    writeFileSync(donePlan, planText("done"));
    const state: CliState = { events: [], claim: Option.none() };
    const ownerArgs = [
      "--run-id",
      "run-a",
      "--owner-token",
      ownerToken,
      "--output-branch",
      "ralph/a",
    ] as const;

    await run(
      [
        "claim",
        "--task-file",
        taskFile,
        ...ownerArgs,
        "--accepted-ref",
        "master",
        "--base-sha",
        baseSha,
      ],
      state,
    );
    expect(state.events).toEqual(["claim"]);

    await run(["release", "--task-file", taskFile, ...ownerArgs], state);
    expect(state.events).toEqual(["claim", `delete:${claimSha}`]);

    state.claim = Option.some(
      remoteClaim({
        runId: "run-a",
        ownerToken,
        outputBranch: "ralph/a",
        acceptedRef: "master",
        baseSha,
        issue: 41,
        phase: "active",
        claimSha,
      }),
    );
    await run(
      [
        "complete",
        "--plan",
        donePlan,
        "--task",
        "1",
        ...ownerArgs,
        "--integration-ref",
        "result",
        "--accepted-ref",
        "master",
      ],
      state,
    );
    expect(state.events.slice(-3)).toEqual([
      "begin-completion",
      "close",
      `delete:${"d".repeat(40)}`,
    ]);

    await run(["validate-plan", "--plan", readyPlan], state);
  });

  it("fails in the CLI parser before handlers for missing and malformed options", async () => {
    const taskFile = temporaryFile("task.md", taskText);
    const state: CliState = { events: [], claim: Option.none() };
    await expect(
      run(["claim", "--task-file", taskFile], state),
    ).rejects.toBeDefined();
    await expect(
      run(["complete", "--plan", taskFile, "--task", "not-an-integer"], state),
    ).rejects.toBeDefined();
    expect(state.events).toEqual([]);
  });
});
