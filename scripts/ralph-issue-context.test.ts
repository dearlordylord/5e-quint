import { Effect, Layer, Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  GitClient,
  GitShaSchema,
  GitHubClient,
  CompletingRemoteClaimSchema,
  ProcessService,
  RalphIssueError,
  RemoteClaimSchema,
  acquireIssueClaim,
  acquireRunnableIssueClaim,
  completeAcceptedIssue,
  hydrateTaskText,
  issueReferenceFromTask,
  parseBlockedIssueReferences,
  parseClaimMetadata,
  releaseIssueClaim,
  repositoryFromRemoteUrl,
  validatePlanEntries,
  issueUrl,
  type GitHubIssue,
  type GitOperations,
  type IssueReference,
  type PlanEntry,
  type PlanTaskStatus,
  type RemoteClaim,
} from "./ralph-issue-context.js";

const gitSha = Schema.decodeUnknownSync(GitShaSchema);
const remoteClaim = Schema.decodeUnknownSync(RemoteClaimSchema);
const completingClaim = Schema.decodeUnknownSync(CompletingRemoteClaimSchema);

const reference = (number = 41): IssueReference => ({
  owner: "dearlordylord",
  repo: "5e-quint",
  number,
});

const taskText = (number = 41) =>
  `### Task 1 - GH-${number}\n\nCanonical issue: [Example](https://github.com/dearlordylord/5e-quint/issues/${number})\n`;

const issue = ({
  number = 41,
  state = "open",
  labels = ["ready-for-agent"],
  blockers = "None — can start immediately.",
  runnable = "yes",
  stateReason,
}: {
  readonly number?: number;
  readonly state?: GitHubIssue["state"];
  readonly labels?: ReadonlyArray<string>;
  readonly blockers?: string;
  readonly runnable?: string;
  readonly stateReason?: GitHubIssue["stateReason"];
} = {}): GitHubIssue => {
  const fields = {
    number,
    title: `Issue ${number}`,
    labels,
    body: `## Ralph execution\n\n- Runnable: ${runnable} — one context.\n\n## What to build\n\nCanonical body ${number}.\n\n## Blocked by\n\n${blockers}`,
    htmlUrl: `https://github.com/dearlordylord/5e-quint/issues/${number}`,
  };
  return state === "closed"
    ? {
        ...fields,
        state,
        stateReason: stateReason === "not_planned" ? stateReason : "completed",
      }
    : {
        ...fields,
        state,
        stateReason: stateReason === "reopened" ? stateReason : null,
      };
};

const failure = (
  code: ConstructorParameters<typeof RalphIssueError>[0]["code"],
  message: string,
) => new RalphIssueError({ code, message });

const githubLayer = (
  issues: ReadonlyArray<GitHubIssue>,
  events: Array<string> = [],
  closeFailure?: RalphIssueError,
) => {
  const byNumber = new Map(
    issues.map((candidate) => [candidate.number, candidate]),
  );
  return GitHubClient.testLayer({
    fetchIssue: (candidate) => {
      events.push(`fetch:${candidate.number}`);
      const found = byNumber.get(candidate.number);
      return found === undefined
        ? Effect.fail(
            failure("boundary-command", `missing issue ${candidate.number}`),
          )
        : Effect.succeed(found);
    },
    closeIssue: (candidate) => {
      events.push(`close:${candidate.number}`);
      return closeFailure === undefined
        ? Effect.void
        : Effect.fail(closeFailure);
    },
  });
};

interface FakeGitState {
  readonly events: Array<string>;
  readonly reads: Array<Option.Option<RemoteClaim>>;
  readonly origin?: string;
  readonly ancestor?: boolean;
  readonly createFailure?: RalphIssueError;
  readonly beginFailure?: RalphIssueError;
  readonly deleteFailure?: RalphIssueError;
  readonly resolved?: Readonly<Record<string, string>>;
}

const gitLayer = (state: FakeGitState) => {
  const operations: GitOperations = {
    originRepository: Effect.succeed(state.origin ?? "dearlordylord/5e-quint"),
    readClaim: () => {
      state.events.push("read-claim");
      return Effect.succeed(state.reads.shift() ?? Option.none());
    },
    createClaim: (candidate, request) => {
      state.events.push(`create-claim:${candidate.number}`);
      return state.createFailure === undefined
        ? Effect.succeed(
            remoteClaim({
              ...request,
              issue: candidate.number,
              phase: "active",
              claimSha: "c".repeat(40),
            }),
          )
        : Effect.fail(state.createFailure);
    },
    deleteClaim: (candidate, expectedSha) => {
      state.events.push(`delete-claim:${candidate.number}:${expectedSha}`);
      return state.deleteFailure === undefined
        ? Effect.void
        : Effect.fail(state.deleteFailure);
    },
    beginCompletion: (candidate, active, resultSha) => {
      state.events.push(`begin-completion:${candidate.number}:${resultSha}`);
      return state.beginFailure === undefined
        ? Effect.succeed(
            completingClaim({
              ...active,
              phase: "completing",
              resultSha,
              claimSha: "d".repeat(40),
            }),
          )
        : Effect.fail(state.beginFailure);
    },
    isAncestor: (integrationRef, acceptedRef) => {
      state.events.push(`ancestor:${integrationRef}:${acceptedRef}`);
      return Effect.succeed(state.ancestor ?? true);
    },
    resolveRef: (ref) => {
      state.events.push(`resolve:${ref}`);
      return Effect.succeed(gitSha(state.resolved?.[ref] ?? "a".repeat(40)));
    },
    validateBranch: (branch) => {
      void branch;
      return Effect.void;
    },
  };
  return GitClient.testLayer(operations);
};

const runFailure = async <A, R>(
  effect: Effect.Effect<A, RalphIssueError, R>,
  layer: Layer.Layer<R>,
) => Effect.runPromise(effect.pipe(Effect.provide(layer), Effect.flip));

type FakeProcessRun = (
  command: string,
  args: ReadonlyArray<string>,
  input?: string,
  environment?: Readonly<Record<string, string>>,
) => Effect.Effect<string, RalphIssueError>;

const processLayerFromRun = (run: FakeProcessRun) =>
  ProcessService.testLayer({
    run,
    runStatus: (command, args, input, environment) =>
      run(command, args, input, environment).pipe(
        Effect.map((stdout) => ({ status: 0, stdout, stderr: "" })),
      ),
  });

describe("canonical issue parsing", () => {
  it("requires exactly one distinct canonical issue link", async () => {
    await expect(
      Effect.runPromise(issueReferenceFromTask(taskText())),
    ).resolves.toEqual(reference());
    expect(
      await Effect.runPromise(
        issueReferenceFromTask("No issue").pipe(Effect.flip),
      ),
    ).toMatchObject({ code: "task-input" });
    expect(
      await Effect.runPromise(
        issueReferenceFromTask(`${taskText(41)}${taskText(42)}`).pipe(
          Effect.flip,
        ),
      ),
    ).toMatchObject({ code: "task-input" });
    for (const malformed of [
      "https://github.com/owner/repo/issues/0",
      "https://github.com/owner/repo/issues/41evil",
      "https://github.com//repo/issues/41",
      "https://github.com/owner//issues/41",
      `https://github.com/owner/repo/issues/${Number.MAX_SAFE_INTEGER + 1}`,
    ]) {
      expect(
        await Effect.runPromise(
          issueReferenceFromTask(malformed).pipe(Effect.flip),
        ),
      ).toMatchObject({ code: "task-input" });
    }
  });

  it("parses same-repository links and shorthand blockers in declared order", async () => {
    const body = issue({
      blockers:
        "- [First](https://github.com/dearlordylord/5e-quint/issues/40)\n- #39",
    }).body;
    await expect(
      Effect.runPromise(parseBlockedIssueReferences(body, reference())),
    ).resolves.toEqual([reference(40), reference(39)]);
  });

  it("rejects missing, ambiguous, and cross-repository blocker declarations", async () => {
    const missing = issue({ blockers: "Pending graph wiring." }).body;
    expect(
      await Effect.runPromise(
        parseBlockedIssueReferences(missing, reference()).pipe(Effect.flip),
      ),
    ).toMatchObject({ code: "plan-mismatch" });

    const crossRepo = issue({
      blockers: "- https://github.com/another/repo/issues/1",
    }).body;
    expect(
      await Effect.runPromise(
        parseBlockedIssueReferences(crossRepo, reference()).pipe(Effect.flip),
      ),
    ).toMatchObject({ code: "plan-mismatch" });

    for (const blockers of [
      "None — start.\n- #40",
      "- #40\n- #40",
      "- #40 and #39",
    ]) {
      const rejected = await Effect.runPromise(
        parseBlockedIssueReferences(issue({ blockers }).body, reference()).pipe(
          Effect.flip,
        ),
      );
      expect(rejected.code).toBe("plan-mismatch");
    }
  });

  it("parses HTTPS and SSH GitHub remotes and rejects non-GitHub origins", async () => {
    await expect(
      Effect.runPromise(
        repositoryFromRemoteUrl(
          "https://github.com/dearlordylord/5e-quint.git",
        ),
      ),
    ).resolves.toBe("dearlordylord/5e-quint");
    await expect(
      Effect.runPromise(
        repositoryFromRemoteUrl("git@github.com:dearlordylord/5e-quint.git"),
      ),
    ).resolves.toBe("dearlordylord/5e-quint");
    expect(
      await Effect.runPromise(
        repositoryFromRemoteUrl("file:///tmp/repo").pipe(Effect.flip),
      ),
    ).toMatchObject({ code: "origin-mismatch" });
    expect(
      await Effect.runPromise(
        repositoryFromRemoteUrl(
          "https://evilgithub.com/dearlordylord/5e-quint.git",
        ).pipe(Effect.flip),
      ),
    ).toMatchObject({ code: "origin-mismatch" });
    const secret = "ghp_super_secret_token";
    const redacted = await Effect.runPromise(
      repositoryFromRemoteUrl(
        `https://${secret}@github.com/dearlordylord/5e-quint.git`,
      ).pipe(Effect.flip),
    );
    expect(redacted.message).not.toContain(secret);
  });

  it("fails incomplete, duplicate, and injected remote claim metadata", async () => {
    expect(
      await Effect.runPromise(
        parseClaimMetadata("Ralph-Run-Id: run-a").pipe(Effect.flip),
      ),
    ).toMatchObject({ code: "boundary-decode" });
    const valid = [
      "Ralph-Run-Id: run-a",
      "Ralph-Owner-Token: 11111111-1111-4111-8111-111111111111",
      "Ralph-Issue: 41",
      "Ralph-Output-Branch: ralph/a",
      "Ralph-Accepted-Ref: master",
      `Ralph-Base-SHA: ${"a".repeat(40)}`,
      "Ralph-Phase: active",
    ].join("\n");
    for (const malformed of [
      `${valid}\nRalph-Issue: 42`,
      valid.replace("run-a", "run-a\nRalph-Unknown: injected"),
      valid.replace("ralph/a", "ralph/a\nRalph-Issue: 42"),
      valid.replace("Ralph-Issue: 41", "Ralph-Issue: 4.1e1"),
    ]) {
      const rejected = await Effect.runPromise(
        parseClaimMetadata(malformed).pipe(Effect.flip),
      );
      expect(rejected.code).toBe("boundary-decode");
    }
  });
});

describe("issue hydration", () => {
  it("fetches one canonical body and every closed blocker into one shared context", async () => {
    const events: Array<string> = [];
    const canonical = issue({ blockers: "- #40" });
    const effect = hydrateTaskText(taskText(), "2026-07-14T00:00:00.000Z");
    const result = await Effect.runPromise(
      effect.pipe(
        Effect.provide(
          githubLayer(
            [canonical, issue({ number: 40, state: "closed" })],
            events,
          ),
        ),
      ),
    );
    expect(events).toEqual(["fetch:41", "fetch:40"]);
    expect(result.context).toContain("## Canonical issue body");
    expect(result.context).toContain("Canonical body 41.");
    expect(result.context).toContain(
      "Issue 40](https://github.com/dearlordylord/5e-quint/issues/40): closed",
    );
  });

  it.each([
    [issue({ state: "closed" }), "issue-not-runnable"],
    [issue({ labels: [] }), "issue-not-runnable"],
    [issue({ runnable: "no" }), "issue-not-runnable"],
  ] as const)(
    "fails closed for a non-runnable canonical issue",
    async (canonical, code) => {
      const error = await runFailure(
        hydrateTaskText(taskText(), "2026-07-14T00:00:00.000Z"),
        githubLayer([canonical]),
      );
      expect(error.code).toBe(code);
    },
  );

  it.each([
    ["not-json"],
    [
      JSON.stringify({
        number: 42,
        title: "Wrong issue",
        state: "closed",
        labels: [],
        body: "",
        html_url: issueUrl(reference(42)),
        state_reason: "completed",
      }),
    ],
  ])("rejects an invalid GitHub close confirmation", async (confirmation) => {
    const processLayer = processLayerFromRun((_command, args) =>
      Effect.succeed(args.includes("PATCH") ? "{}" : confirmation),
    );
    const layer = GitHubClient.layerWithDependencies.pipe(
      Layer.provide(processLayer),
    );
    const rejected = await Effect.runPromise(
      Effect.gen(function* () {
        const github = yield* GitHubClient;
        yield* github.closeIssue(reference());
      }).pipe(Effect.provide(layer), Effect.flip),
    );
    expect(rejected).toMatchObject({ code: "boundary-decode" });
  });

  it("fails closed when a declared blocker is open", async () => {
    const error = await runFailure(
      hydrateTaskText(taskText(), "2026-07-14T00:00:00.000Z"),
      githubLayer([issue({ blockers: "- #40" }), issue({ number: 40 })]),
    );
    expect(error).toMatchObject({ code: "issue-blocked" });
  });

  it("does not treat a canceled blocker as completed", async () => {
    const error = await runFailure(
      hydrateTaskText(taskText(), "2026-07-14T00:00:00.000Z"),
      githubLayer([
        issue({ blockers: "- #40" }),
        issue({ number: 40, state: "closed", stateReason: "not_planned" }),
      ]),
    );
    expect(error).toMatchObject({ code: "issue-blocked" });
  });

  it("rejects duplicate or contradictory Ralph execution markers", async () => {
    for (const body of [
      `${issue().body}\n\n## Ralph execution\n\n- Runnable: yes`,
      issue().body.replace(
        "- Runnable: yes — one context.",
        "- Runnable: yes — one context.\n- Runnable: no — conflict.",
      ),
    ]) {
      const error = await runFailure(
        hydrateTaskText(taskText(), "2026-07-14T00:00:00.000Z"),
        githubLayer([{ ...issue(), body }]),
      );
      expect(error).toMatchObject({ code: "issue-not-runnable" });
    }
  });

  it("propagates GitHub fetch failure without creating partial context", async () => {
    const error = await runFailure(
      hydrateTaskText(taskText(), "2026-07-14T00:00:00.000Z"),
      githubLayer([]),
    );
    expect(error).toMatchObject({ code: "boundary-command" });
  });
});

describe("plan-to-issue graph validation", () => {
  const entry = (
    number: number,
    id: string,
    dependencies: ReadonlyArray<string>,
    status: PlanTaskStatus = "ready-for-implementation",
  ): PlanEntry => ({
    task: {
      number,
      id,
      status,
      title: id,
      dependencies,
      startLine: 1,
      endLine: 1,
    },
    text: taskText(number),
    reference: reference(number),
  });

  it("accepts exact indexed dependencies and closed done issues", async () => {
    const entries = [entry(41, "GH-41", []), entry(43, "GH-43", ["GH-41"])];
    await expect(
      Effect.runPromise(
        validatePlanEntries(entries).pipe(
          Effect.provide(
            githubLayer([issue(), issue({ number: 43, blockers: "- #41" })]),
          ),
        ),
      ),
    ).resolves.toBeUndefined();

    await expect(
      Effect.runPromise(
        validatePlanEntries([entry(41, "GH-41", [], "done")]).pipe(
          Effect.provide(githubLayer([issue({ state: "closed" })])),
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it("allows only the exact pending task and rejects canceled done issues", async () => {
    const done41 = entry(41, "GH-41", [], "done");
    const done42 = entry(42, "GH-42", [], "done");
    await expect(
      Effect.runPromise(
        validatePlanEntries([done41], { pendingCompletionTask: 41 }).pipe(
          Effect.provide(githubLayer([issue()])),
        ),
      ),
    ).resolves.toBeUndefined();

    const wrongPending = await runFailure(
      validatePlanEntries([done41, done42], { pendingCompletionTask: 41 }),
      githubLayer([issue(), issue({ number: 42 })]),
    );
    expect(wrongPending.message).toContain("GH-42 is done");

    const canceled = await runFailure(
      validatePlanEntries([done41]),
      githubLayer([issue({ state: "closed", stateReason: "not_planned" })]),
    );
    expect(canceled.message).toContain("not closed/completed");
  });

  it.each([
    [[entry(41, "GH-41", ["GH-40"])], [issue()], "indexed dependencies"],
    [
      [entry(41, "GH-41", []), entry(41, "DUPLICATE", [])],
      [issue()],
      "more than one Ralph task",
    ],
    [
      [entry(43, "GH-43", [])],
      [issue({ number: 43, blockers: "- #41" })],
      "outside the runnable plan",
    ],
    [[entry(41, "GH-41", [], "done")], [issue()], "is done but"],
  ] as const)(
    "rejects graph inconsistency: %s",
    async (entries, issues, message) => {
      const error = await runFailure(
        validatePlanEntries(entries),
        githubLayer(issues),
      );
      expect(error).toMatchObject({ code: "plan-mismatch" });
      expect(error.message).toContain(message);
    },
  );

  it("reports independent graph problems together in one launch diagnostic", async () => {
    const entries = [
      entry(41, "GH-41", ["MISSING"]),
      entry(42, "GH-42", [], "done"),
    ];
    const rejected = await runFailure(
      validatePlanEntries(entries),
      githubLayer([issue(), issue({ number: 42 })]),
    );
    expect(rejected.message).toContain("GH-41 indexed dependencies");
    expect(rejected.message).toContain("GH-42 is done");
  });
});

describe("remote issue claims", () => {
  const request = {
    runId: "run-a",
    ownerToken: "11111111-1111-4111-8111-111111111111",
    outputBranch: "ralph/a",
    acceptedRef: "master",
    baseSha: "a".repeat(40),
  };
  const claim: RemoteClaim = remoteClaim({
    ...request,
    issue: 41,
    phase: "active",
    claimSha: "c".repeat(40),
  });

  it("creates an unclaimed ref and reuses only the exact same run and branch", async () => {
    const createdState: FakeGitState = { events: [], reads: [Option.none()] };
    await expect(
      Effect.runPromise(
        acquireIssueClaim(reference(), request).pipe(
          Effect.provide(gitLayer(createdState)),
        ),
      ),
    ).resolves.toEqual(claim);
    expect(createdState.events).toEqual([
      "resolve:refs/heads/master",
      "read-claim",
      "create-claim:41",
    ]);

    const reusedState: FakeGitState = {
      events: [],
      reads: [Option.some(claim)],
    };
    await expect(
      Effect.runPromise(
        acquireIssueClaim(reference(), request).pipe(
          Effect.provide(gitLayer(reusedState)),
        ),
      ),
    ).resolves.toEqual(claim);
    expect(reusedState.events).toEqual([
      "resolve:refs/heads/master",
      "read-claim",
    ]);
  });

  it.each([
    [remoteClaim({ ...claim, runId: "run-b" }), "Ralph run run-b"],
    [
      remoteClaim({ ...claim, outputBranch: "ralph/b" }),
      "output branch ralph/b",
    ],
    [remoteClaim({ ...claim, issue: 42 }), "contains issue 42"],
    [
      remoteClaim({
        ...claim,
        ownerToken: "22222222-2222-4222-8222-222222222222",
      }),
      "another Ralph runner",
    ],
    [
      remoteClaim({ ...claim, baseSha: "b".repeat(40) }),
      "differs from requested",
    ],
  ] as const)(
    "rejects conflicting existing claim identity",
    async (existing, message) => {
      const error = await runFailure(
        acquireIssueClaim(reference(), request),
        gitLayer({ events: [], reads: [Option.some(existing)] }),
      );
      expect(error).toMatchObject({ code: "claim-conflict" });
      expect(error.message).toContain(message);
    },
  );

  it("re-reads after a rejected push and accepts only the same raced claim", async () => {
    const pushFailure = failure("boundary-command", "non-fast-forward");
    const sameRace: FakeGitState = {
      events: [],
      reads: [Option.none(), Option.some(claim)],
      createFailure: pushFailure,
    };
    await expect(
      Effect.runPromise(
        acquireIssueClaim(reference(), request).pipe(
          Effect.provide(gitLayer(sameRace)),
        ),
      ),
    ).resolves.toEqual(claim);
    expect(sameRace.events).toEqual([
      "resolve:refs/heads/master",
      "read-claim",
      "create-claim:41",
      "read-claim",
    ]);

    const otherRace: FakeGitState = {
      events: [],
      reads: [
        Option.none(),
        Option.some(remoteClaim({ ...claim, runId: "run-b" })),
      ],
      createFailure: pushFailure,
    };
    const error = await runFailure(
      acquireIssueClaim(reference(), request),
      gitLayer(otherRace),
    );
    expect(error).toMatchObject({ code: "claim-conflict" });
  });

  it("preserves the original push failure when no raced claim exists", async () => {
    const pushFailure = failure("boundary-command", "authentication failed");
    const error = await runFailure(
      acquireIssueClaim(reference(), request),
      gitLayer({
        events: [],
        reads: [Option.none(), Option.none()],
        createFailure: pushFailure,
      }),
    );
    expect(error).toBe(pushFailure);
  });

  it("checks the origin before reading or creating a claim", async () => {
    const state: FakeGitState = {
      events: [],
      reads: [Option.none()],
      origin: "someone/fork",
    };
    const error = await runFailure(
      acquireIssueClaim(reference(), request),
      gitLayer(state),
    );
    expect(error).toMatchObject({ code: "origin-mismatch" });
    expect(state.events).toEqual(["resolve:refs/heads/master"]);
  });

  it("releases only a claim owned by the requested run", async () => {
    const none: FakeGitState = { events: [], reads: [Option.none()] };
    await Effect.runPromise(
      releaseIssueClaim(reference(), request).pipe(
        Effect.provide(gitLayer(none)),
      ),
    );
    expect(none.events).toEqual(["read-claim"]);

    const owned: FakeGitState = { events: [], reads: [Option.some(claim)] };
    await Effect.runPromise(
      releaseIssueClaim(reference(), request).pipe(
        Effect.provide(gitLayer(owned)),
      ),
    );
    expect(owned.events).toEqual([
      "read-claim",
      `delete-claim:41:${claim.claimSha}`,
    ]);

    const foreign: FakeGitState = {
      events: [],
      reads: [Option.some(remoteClaim({ ...claim, runId: "run-b" }))],
    };
    const error = await runFailure(
      releaseIssueClaim(reference(), request),
      gitLayer(foreign),
    );
    expect(error).toMatchObject({ code: "claim-conflict" });
    expect(foreign.events).toEqual(["read-claim"]);
  });

  it("retains a new claim fail-safely when the issue stops being runnable", async () => {
    const state: FakeGitState = { events: [], reads: [Option.none()] };
    let fetches = 0;
    const github = GitHubClient.testLayer({
      fetchIssue: () =>
        Effect.sync(() => {
          fetches += 1;
          return fetches === 1 ? issue() : issue({ state: "closed" });
        }),
      closeIssue: () => Effect.void,
    });
    const error = await runFailure(
      acquireRunnableIssueClaim(reference(), request),
      Layer.merge(gitLayer(state), github),
    );
    expect(error).toMatchObject({ code: "issue-not-runnable" });
    expect(state.events).toContain("create-claim:41");
    expect(
      state.events.some((event) => event.startsWith("delete-claim:")),
    ).toBe(false);
  });
});

describe("accepted integration completion", () => {
  const claim: RemoteClaim = remoteClaim({
    runId: "run-a",
    ownerToken: "11111111-1111-4111-8111-111111111111",
    issue: 41,
    outputBranch: "ralph/a",
    acceptedRef: "master",
    baseSha: "a".repeat(40),
    phase: "active",
    claimSha: "c".repeat(40),
  });
  const input = {
    reference: reference(),
    taskStatus: "done" as const,
    runId: "run-a",
    ownerToken: claim.ownerToken,
    outputBranch: claim.outputBranch,
    integrationRef: "b".repeat(40),
    acceptedRef: "master",
  };
  const resultSha = "b".repeat(40);
  const acceptedSha = "e".repeat(40);
  const resolved = {
    "refs/heads/ralph/a": resultSha,
    [resultSha]: resultSha,
    "refs/heads/master": acceptedSha,
  };
  const completing: RemoteClaim = remoteClaim({
    ...claim,
    phase: "completing",
    resultSha,
    claimSha: "d".repeat(40),
  });

  it("closes only after done status, accepted ancestry, and owned claim", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(claim), Option.some(completing)],
      resolved,
    };
    await Effect.runPromise(
      completeAcceptedIssue(input).pipe(
        Effect.provide(
          Layer.merge(gitLayer(state), githubLayer([issue()], events)),
        ),
      ),
    );
    expect(events).toEqual([
      "read-claim",
      "resolve:refs/heads/ralph/a",
      `resolve:${resultSha}`,
      `resolve:${claim.baseSha}`,
      "resolve:refs/heads/master",
      `ancestor:${claim.baseSha}:${resultSha}`,
      `ancestor:${resultSha}:${acceptedSha}`,
      "fetch:41",
      `begin-completion:41:${resultSha}`,
      "fetch:41",
      "fetch:41",
      "read-claim",
      "close:41",
      `delete-claim:41:${completing.claimSha}`,
    ]);
  });

  it.each([
    [
      { ...input, taskStatus: "ready-for-implementation" as const },
      [],
      true,
      "Ralph task must be done",
    ],
    [input, [Option.some(claim)], false, "does not descend"],
    [input, [Option.none<RemoteClaim>()], true, "no active Ralph claim"],
  ] as const)(
    "does not close when a completion precondition fails",
    async (candidate, reads, ancestor, message) => {
      const events: Array<string> = [];
      const state: FakeGitState = {
        reads: [...reads],
        ancestor,
        events,
        resolved,
      };
      const error = await runFailure(
        completeAcceptedIssue(candidate),
        Layer.merge(gitLayer(state), githubLayer([issue()], events)),
      );
      expect(error.message).toContain(message);
      expect(events).not.toContain("close:41");
      expect(events.some((event) => event.startsWith("delete-claim:"))).toBe(
        false,
      );
    },
  );

  it("retains the claim when GitHub close fails", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(claim), Option.some(completing)],
      resolved,
    };
    const closeFailure = failure("boundary-command", "GitHub unavailable");
    const error = await runFailure(
      completeAcceptedIssue(input),
      Layer.merge(
        gitLayer(state),
        githubLayer([issue()], events, closeFailure),
      ),
    );
    expect(error).toBe(closeFailure);
    expect(events).toEqual([
      "read-claim",
      "resolve:refs/heads/ralph/a",
      `resolve:${resultSha}`,
      `resolve:${claim.baseSha}`,
      "resolve:refs/heads/master",
      `ancestor:${claim.baseSha}:${resultSha}`,
      `ancestor:${resultSha}:${acceptedSha}`,
      "fetch:41",
      `begin-completion:41:${resultSha}`,
      "fetch:41",
      "fetch:41",
      "read-claim",
      "close:41",
    ]);
  });

  it("rejects a caller-supplied integration ref that is not the claimed output tip", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(claim)],
      resolved: {
        "refs/heads/ralph/a": "b".repeat(40),
        spoofed: "f".repeat(40),
      },
    };
    const rejected = await runFailure(
      completeAcceptedIssue({ ...input, integrationRef: "spoofed" }),
      Layer.merge(gitLayer(state), githubLayer([issue()], events)),
    );
    expect(rejected.message).toContain("claimed output");
    expect(events).not.toContain("close:41");
  });

  it("rejects a caller-supplied acceptance branch that differs from the claim", async () => {
    const events: Array<string> = [];
    const rejected = await runFailure(
      completeAcceptedIssue({ ...input, acceptedRef: "ralph/a" }),
      Layer.merge(
        gitLayer({ events, reads: [Option.some(claim)], resolved }),
        githubLayer([issue()], events),
      ),
    );
    expect(rejected.message).toContain("differs from claimed acceptance ref");
    expect(events).not.toContain("close:41");
  });

  it("reports claim deletion failure only after GitHub is closed", async () => {
    const events: Array<string> = [];
    const deleteFailure = failure("boundary-command", "delete rejected");
    const state: FakeGitState = {
      events,
      reads: [
        Option.some(claim),
        Option.some(completing),
        Option.some(completing),
      ],
      deleteFailure,
      resolved,
    };
    const error = await runFailure(
      completeAcceptedIssue(input),
      Layer.merge(gitLayer(state), githubLayer([issue()], events)),
    );
    expect(error).toBe(deleteFailure);
    expect(events.slice(-3)).toEqual([
      "close:41",
      `delete-claim:41:${completing.claimSha}`,
      "read-claim",
    ]);
  });

  it("treats a lost successful deletion response as success", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(claim), Option.some(completing), Option.none()],
      deleteFailure: failure("boundary-command", "connection dropped"),
      resolved,
    };
    await Effect.runPromise(
      completeAcceptedIssue(input).pipe(
        Effect.provide(
          Layer.merge(gitLayer(state), githubLayer([issue()], events)),
        ),
      ),
    );
    expect(events.slice(-3)).toEqual([
      "close:41",
      `delete-claim:41:${completing.claimSha}`,
      "read-claim",
    ]);
  });

  it("rejects a no-change result even when the integration ref is an alias", async () => {
    const state: FakeGitState = {
      events: [],
      reads: [Option.some(claim)],
      resolved: {
        "refs/heads/ralph/a": claim.baseSha,
        alias: claim.baseSha,
      },
    };
    const error = await runFailure(
      completeAcceptedIssue({ ...input, integrationRef: "alias" }),
      Layer.merge(gitLayer(state), githubLayer([issue()])),
    );
    expect(error.message).toContain("identical to the claimed Base SHA");
  });

  it("rechecks live blockers after reserving completion and fails before close", async () => {
    const events: Array<string> = [];
    let blockerFetches = 0;
    const github = GitHubClient.testLayer({
      fetchIssue: (candidate) =>
        Effect.sync(() => {
          events.push(`fetch:${candidate.number}`);
          if (candidate.number === 41) return issue({ blockers: "- #40" });
          blockerFetches += 1;
          return issue({
            number: 40,
            state: blockerFetches === 1 ? "closed" : "open",
            labels: [],
            runnable: "no",
          });
        }),
      closeIssue: () =>
        Effect.sync(() => {
          events.push("close:41");
        }),
    });
    const state: FakeGitState = {
      events,
      reads: [Option.some(claim)],
      resolved,
    };
    const error = await runFailure(
      completeAcceptedIssue(input),
      Layer.merge(gitLayer(state), github),
    );
    expect(error).toMatchObject({ code: "issue-blocked" });
    expect(events).toContain(`begin-completion:41:${resultSha}`);
    expect(events).not.toContain("close:41");
    expect(events.some((event) => event.startsWith("delete-claim:"))).toBe(
      false,
    );
  });

  it("resumes an identical completing claim without starting completion again", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(completing), Option.some(completing)],
      resolved,
    };
    await Effect.runPromise(
      completeAcceptedIssue(input).pipe(
        Effect.provide(
          Layer.merge(gitLayer(state), githubLayer([issue()], events)),
        ),
      ),
    );
    expect(events.some((event) => event.startsWith("begin-completion:"))).toBe(
      false,
    );
    expect(events).toContain("close:41");
  });

  it("recovers when the completion transition succeeded but its response was lost", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [
        Option.some(claim),
        Option.some(completing),
        Option.some(completing),
      ],
      beginFailure: failure("boundary-command", "connection dropped"),
      resolved,
    };
    await Effect.runPromise(
      completeAcceptedIssue(input).pipe(
        Effect.provide(
          Layer.merge(gitLayer(state), githubLayer([issue()], events)),
        ),
      ),
    );
    expect(events).toContain(`begin-completion:41:${resultSha}`);
    expect(events).toContain("close:41");
    expect(events.at(-1)).toBe(`delete-claim:41:${completing.claimSha}`);
  });

  it("deletes a completing claim after a confirmed completed close", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(completing)],
      resolved,
    };
    await Effect.runPromise(
      completeAcceptedIssue(input).pipe(
        Effect.provide(
          Layer.merge(
            gitLayer(state),
            githubLayer(
              [issue({ state: "closed", stateReason: "completed" })],
              events,
            ),
          ),
        ),
      ),
    );
    expect(events).not.toContain("close:41");
    expect(events.at(-1)).toBe(`delete-claim:41:${completing.claimSha}`);
  });

  it("preserves a completing claim when the issue was closed externally", async () => {
    const events: Array<string> = [];
    const state: FakeGitState = {
      events,
      reads: [Option.some(completing)],
      resolved,
    };
    const error = await runFailure(
      completeAcceptedIssue(input),
      Layer.merge(
        gitLayer(state),
        githubLayer(
          [issue({ state: "closed", stateReason: "not_planned" })],
          events,
        ),
      ),
    );
    expect(error.message).toContain("closed externally");
    expect(events.some((event) => event.startsWith("delete-claim:"))).toBe(
      false,
    );
  });
});

describe("production adapter commands through fake ProcessService", () => {
  it("uses credential-safe gh API commands for fetch and completion", async () => {
    const calls: Array<ReadonlyArray<string>> = [];
    let getCount = 0;
    const processLayer = processLayerFromRun((command, args) => {
      calls.push([command, ...args]);
      if (!args.includes("GET")) return Effect.succeed("{}");
      getCount += 1;
      return Effect.succeed(
        JSON.stringify({
          number: 41,
          title: "Issue 41",
          state: getCount === 1 ? "open" : "closed",
          labels: [{ name: "ready-for-agent" }],
          body: issue().body,
          html_url: issueUrl(reference()),
          state_reason: getCount === 1 ? null : "completed",
        }),
      );
    });
    const layer = GitHubClient.layerWithDependencies.pipe(
      Layer.provide(processLayer),
    );
    await Effect.runPromise(
      Effect.gen(function* () {
        const github = yield* GitHubClient;
        yield* github.fetchIssue(reference());
        yield* github.closeIssue(reference());
      }).pipe(Effect.provide(layer)),
    );
    expect(calls).toEqual([
      [
        "gh",
        "api",
        "--method",
        "GET",
        "repos/dearlordylord/5e-quint/issues/41",
      ],
      [
        "gh",
        "api",
        "--method",
        "PATCH",
        "repos/dearlordylord/5e-quint/issues/41",
        "-f",
        "state=closed",
        "-f",
        "state_reason=completed",
      ],
      [
        "gh",
        "api",
        "--method",
        "GET",
        "repos/dearlordylord/5e-quint/issues/41",
      ],
    ]);
    expect(calls.flat()).not.toContain("GH_TOKEN");
  });

  it.each([
    ["open", null],
    ["closed", "not_planned"],
  ] as const)(
    "refuses claim cleanup unless GitHub confirms closed/completed (%s/%s)",
    async (state, stateReason) => {
      const processLayer = processLayerFromRun((_command, args) =>
        args.includes("PATCH")
          ? Effect.succeed("{}")
          : Effect.succeed(
              JSON.stringify({
                number: 41,
                title: "Issue 41",
                state,
                labels: [],
                body: issue().body,
                html_url: issueUrl(reference()),
                state_reason: stateReason,
              }),
            ),
      );
      const layer = GitHubClient.layerWithDependencies.pipe(
        Layer.provide(processLayer),
      );
      const rejected = await Effect.runPromise(
        Effect.gen(function* () {
          const github = yield* GitHubClient;
          yield* github.closeIssue(reference());
        }).pipe(Effect.provide(layer), Effect.flip),
      );
      expect(rejected).toMatchObject({ code: "boundary-decode" });
    },
  );

  it("creates a claim commit and non-forced remote ref with exact metadata", async () => {
    const calls: Array<{
      readonly command: string;
      readonly args: ReadonlyArray<string>;
      readonly input?: string;
    }> = [];
    const processLayer = processLayerFromRun((command, args, input) => {
      calls.push({ command, args, ...(input === undefined ? {} : { input }) });
      if (args[0] === "remote")
        return Effect.succeed("https://github.com/dearlordylord/5e-quint.git");
      if (args[0] === "ls-remote") return Effect.succeed("");
      if (args[0] === "rev-parse") return Effect.succeed("a".repeat(40));
      if (args[0] === "check-ref-format")
        return Effect.succeed(args.at(-1) ?? "");
      if (args[0] === "mktree") return Effect.succeed("e".repeat(40));
      if (args[0] === "commit-tree") return Effect.succeed("c".repeat(40));
      if (args[0] === "push") return Effect.succeed("");
      return Effect.fail(
        failure("boundary-command", `unexpected command ${args.join(" ")}`),
      );
    });
    const layer = GitClient.layerWithDependencies.pipe(
      Layer.provide(processLayer),
    );
    await Effect.runPromise(
      acquireIssueClaim(reference(), {
        runId: "run-a",
        ownerToken: "11111111-1111-4111-8111-111111111111",
        outputBranch: "ralph/a",
        acceptedRef: "master",
        baseSha: "a".repeat(40),
      }).pipe(Effect.provide(layer)),
    );
    expect(calls.map((call) => call.args[0])).toEqual([
      "check-ref-format",
      "check-ref-format",
      "rev-parse",
      "remote",
      "remote",
      "ls-remote",
      "check-ref-format",
      "check-ref-format",
      "rev-parse",
      "mktree",
      "commit-tree",
      "push",
    ]);
    expect(calls.at(-1)?.args).toEqual([
      "push",
      "https://github.com/dearlordylord/5e-quint.git",
      `${"c".repeat(40)}:refs/heads/ralph/claims/issue-41`,
    ]);
    expect(
      calls.find((call) => call.args[0] === "commit-tree")?.input,
    ).toContain("Ralph-Output-Branch: ralph/a");
    expect(calls.at(-1)?.args).not.toContain("--force");
  });

  it("rejects split origin fetch and push repositories before remote mutation", async () => {
    let remoteRead = 0;
    const calls: Array<ReadonlyArray<string>> = [];
    const processLayer = processLayerFromRun((command, args) => {
      calls.push([command, ...args]);
      if (args[0] === "check-ref-format")
        return Effect.succeed(args.at(-1) ?? "");
      if (args[0] === "rev-parse") return Effect.succeed("a".repeat(40));
      if (args[0] === "remote") {
        remoteRead += 1;
        return Effect.succeed(
          remoteRead === 1
            ? "https://github.com/dearlordylord/5e-quint.git"
            : "https://github.com/someone/fork.git",
        );
      }
      return Effect.fail(failure("boundary-command", "unexpected mutation"));
    });
    const layer = GitClient.layerWithDependencies.pipe(
      Layer.provide(processLayer),
    );
    const rejected = await Effect.runPromise(
      acquireIssueClaim(reference(), {
        runId: "run-a",
        ownerToken: "11111111-1111-4111-8111-111111111111",
        outputBranch: "ralph/a",
        acceptedRef: "master",
        baseSha: "a".repeat(40),
      }).pipe(Effect.provide(layer), Effect.flip),
    );
    expect(rejected.code).toBe("origin-mismatch");
    expect(calls.some((call) => call.includes("push"))).toBe(false);
  });

  it("rejects multiple push URLs before any remote mutation", async () => {
    let remoteRead = 0;
    const calls: Array<ReadonlyArray<string>> = [];
    const processLayer = processLayerFromRun((command, args) => {
      calls.push([command, ...args]);
      if (args[0] === "check-ref-format")
        return Effect.succeed(args.at(-1) ?? "");
      if (args[0] === "rev-parse") return Effect.succeed("a".repeat(40));
      if (args[0] !== "remote")
        return Effect.fail(failure("boundary-command", "unexpected mutation"));
      remoteRead += 1;
      return Effect.succeed(
        remoteRead === 1
          ? "https://github.com/dearlordylord/5e-quint.git"
          : [
              "https://github.com/dearlordylord/5e-quint.git",
              "git@github.com:dearlordylord/5e-quint.git",
            ].join("\n"),
      );
    });
    const layer = GitClient.layerWithDependencies.pipe(
      Layer.provide(processLayer),
    );
    const rejected = await Effect.runPromise(
      acquireIssueClaim(reference(), {
        runId: "run-a",
        ownerToken: "11111111-1111-4111-8111-111111111111",
        outputBranch: "ralph/a",
        acceptedRef: "master",
        baseSha: "a".repeat(40),
      }).pipe(Effect.provide(layer), Effect.flip),
    );
    expect(rejected.code).toBe("origin-mismatch");
    expect(calls.map((call) => call[1])).toEqual([
      "check-ref-format",
      "check-ref-format",
      "rev-parse",
      "remote",
      "remote",
    ]);
  });

  it("treats merge-base status 1 as false and status above 1 as a command failure", async () => {
    const layerForStatus = (status: number) => {
      const run: FakeProcessRun = (_command, args) =>
        args[0] === "remote"
          ? Effect.succeed("https://github.com/dearlordylord/5e-quint.git")
          : Effect.succeed("a".repeat(40));
      const processLayer = ProcessService.testLayer({
        run,
        runStatus: () =>
          Effect.succeed({ status, stdout: "", stderr: `status ${status}` }),
      });
      return GitClient.layerWithDependencies.pipe(Layer.provide(processLayer));
    };
    const check = Effect.gen(function* () {
      const git = yield* GitClient;
      return yield* git.isAncestor("result", "master");
    });

    await expect(
      Effect.runPromise(check.pipe(Effect.provide(layerForStatus(1)))),
    ).resolves.toBe(false);
    const failureResult = await Effect.runPromise(
      check.pipe(Effect.provide(layerForStatus(2)), Effect.flip),
    );
    expect(failureResult).toMatchObject({ code: "boundary-command" });
  });
});
