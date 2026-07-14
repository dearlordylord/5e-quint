import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  GitClient,
  GitHubClient,
  ProcessService,
  RalphIssueError,
  acquireIssueClaim,
  completeAcceptedIssue,
  releaseIssueClaim,
  type ClaimRequest,
  type IssueReference,
} from "./ralph-issue-context.js";

const canonicalRemote = "https://github.com/dearlordylord/5e-quint.git";
const reference: IssueReference = {
  owner: "dearlordylord",
  repo: "5e-quint",
  number: 41,
};
const ownerToken = "11111111-1111-4111-8111-111111111111";

interface Fixture {
  readonly root: string;
  readonly work: string;
  readonly remote: string;
  readonly baseSha: string;
}

const fixtures: Array<Fixture> = [];

const git = (cwd: string, ...args: ReadonlyArray<string>): string =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const makeFixture = (): Fixture => {
  const root = mkdtempSync(join(tmpdir(), "ralph-claim-test-"));
  const remote = join(root, "remote.git");
  const work = join(root, "work");
  execFileSync("git", ["init", "--quiet", "--bare", remote]);
  execFileSync("git", ["init", "--quiet", work]);
  writeFileSync(join(work, "base.txt"), "unpublished base\n");
  git(work, "add", "base.txt");
  git(
    work,
    "-c",
    "user.name=Test Author",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "unpublished base",
  );
  git(work, "remote", "add", "origin", remote);
  const fixture = {
    root,
    work,
    remote,
    baseSha: git(work, "rev-parse", "HEAD"),
  };
  fixtures.push(fixture);
  return fixture;
};

const processLayer = (fixture: Fixture, beforeLeaseDelete?: () => void) => {
  let deleteHookUsed = false;
  const runStatus = (
    command: string,
    args: ReadonlyArray<string>,
    input?: string,
    environment?: Readonly<Record<string, string>>,
  ) =>
    Effect.sync(() => {
      if (
        command === "git" &&
        args[0] === "push" &&
        args[1]?.startsWith("--force-with-lease=") === true &&
        !deleteHookUsed
      ) {
        deleteHookUsed = true;
        beforeLeaseDelete?.();
      }
      if (
        command === "git" &&
        args[0] === "remote" &&
        args.includes("get-url")
      ) {
        return { status: 0, stdout: canonicalRemote, stderr: "" };
      }
      const commandArgs = args.map((argument) =>
        argument === canonicalRemote ? fixture.remote : argument,
      );
      const result = spawnSync(command, commandArgs, {
        cwd: fixture.work,
        encoding: "utf8",
        ...(input === undefined ? {} : { input }),
        ...(environment === undefined
          ? {}
          : { env: { ...process.env, ...environment } }),
      });
      if (result.error !== undefined) throw result.error;
      return {
        status: result.status ?? 255,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
      };
    }).pipe(
      Effect.mapError(
        (cause) =>
          new RalphIssueError({
            code: "boundary-command",
            message: String(cause),
          }),
      ),
    );

  return ProcessService.testLayer({
    runStatus,
    run: (command, args, input, environment) =>
      runStatus(command, args, input, environment).pipe(
        Effect.flatMap((result) =>
          result.status === 0
            ? Effect.succeed(result.stdout)
            : Effect.fail(
                new RalphIssueError({
                  code: "boundary-command",
                  message:
                    result.stderr || result.stdout || `status ${result.status}`,
                }),
              ),
        ),
      ),
  });
};

const gitLayer = (fixture: Fixture, beforeLeaseDelete?: () => void) =>
  GitClient.layerWithDependencies.pipe(
    Layer.provide(processLayer(fixture, beforeLeaseDelete)),
  );

const claimRequest = (fixture: Fixture): ClaimRequest => ({
  runId: "run-a",
  ownerToken,
  outputBranch: "ralph/a",
  acceptedRef: "master",
  baseSha: fixture.baseSha,
});

const replacementCommit = (
  fixture: Fixture,
  request: ClaimRequest,
  parent?: string,
): string => {
  const tree = git(fixture.work, "mktree");
  const message = [
    "Replacement claim",
    "",
    `Ralph-Run-Id: ${request.runId}`,
    `Ralph-Owner-Token: ${request.ownerToken}`,
    `Ralph-Issue: ${reference.number}`,
    `Ralph-Output-Branch: ${request.outputBranch}`,
    `Ralph-Accepted-Ref: ${request.acceptedRef}`,
    `Ralph-Base-SHA: ${request.baseSha}`,
    "Ralph-Phase: active",
    "",
  ].join("\n");
  return execFileSync(
    "git",
    ["commit-tree", tree, ...(parent === undefined ? [] : ["-p", parent])],
    {
      cwd: fixture.work,
      encoding: "utf8",
      input: message,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Replacement",
        GIT_AUTHOR_EMAIL: "replacement@example.invalid",
        GIT_COMMITTER_NAME: "Replacement",
        GIT_COMMITTER_EMAIL: "replacement@example.invalid",
        GIT_AUTHOR_DATE: "2001-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2001-01-01T00:00:00Z",
      },
    },
  ).trim();
};

afterEach(() => {
  for (const fixture of fixtures.splice(0))
    rmSync(fixture.root, { recursive: true, force: true });
});

describe("remote claim protocol against a disposable bare repository", () => {
  it("creates a parentless empty-tree claim without publishing the local Base SHA", async () => {
    const fixture = makeFixture();
    const request = claimRequest(fixture);
    const claim = await Effect.runPromise(
      acquireIssueClaim(reference, request).pipe(
        Effect.provide(gitLayer(fixture)),
      ),
    );

    expect(
      git(fixture.remote, "rev-parse", "refs/heads/ralph/claims/issue-41"),
    ).toBe(claim.claimSha);
    expect(
      git(
        fixture.remote,
        "rev-list",
        "--parents",
        "-n",
        "1",
        claim.claimSha,
      ).split(" "),
    ).toHaveLength(1);
    expect(git(fixture.remote, "ls-tree", claim.claimSha)).toBe("");
    expect(
      spawnSync("git", ["cat-file", "-e", `${fixture.baseSha}^{commit}`], {
        cwd: fixture.remote,
      }).status,
    ).not.toBe(0);
  });

  it("rejects a competing owner and preserves a replacement claim on stale lease deletion", async () => {
    const fixture = makeFixture();
    const request = claimRequest(fixture);
    await Effect.runPromise(
      acquireIssueClaim(reference, request).pipe(
        Effect.provide(gitLayer(fixture)),
      ),
    );

    const conflict = await Effect.runPromise(
      acquireIssueClaim(reference, {
        ...request,
        ownerToken: "22222222-2222-4222-8222-222222222222",
      }).pipe(Effect.provide(gitLayer(fixture)), Effect.flip),
    );
    expect(conflict.code).toBe("claim-conflict");

    const replacementSha = replacementCommit(fixture, request);
    const releaseLayer = gitLayer(fixture, () => {
      git(
        fixture.work,
        "push",
        "--quiet",
        "--force",
        "origin",
        `${replacementSha}:refs/heads/ralph/claims/issue-41`,
      );
    });
    const releaseError = await Effect.runPromise(
      releaseIssueClaim(reference, request).pipe(
        Effect.provide(releaseLayer),
        Effect.flip,
      ),
    );
    expect(releaseError.code).toBe("claim-conflict");
    expect(
      git(fixture.remote, "rev-parse", "refs/heads/ralph/claims/issue-41"),
    ).toBe(replacementSha);
  });

  it("rejects a claim-shaped commit with a parent", async () => {
    const fixture = makeFixture();
    const request = claimRequest(fixture);
    const claim = await Effect.runPromise(
      acquireIssueClaim(reference, request).pipe(
        Effect.provide(gitLayer(fixture)),
      ),
    );
    const malformed = replacementCommit(fixture, request, claim.claimSha);
    git(
      fixture.work,
      "push",
      "--quiet",
      "--force",
      "origin",
      `${malformed}:refs/heads/ralph/claims/issue-41`,
    );
    const rejected = await Effect.runPromise(
      releaseIssueClaim(reference, request).pipe(
        Effect.provide(gitLayer(fixture)),
        Effect.flip,
      ),
    );
    expect(rejected).toMatchObject({ code: "boundary-decode" });
    expect(
      git(fixture.remote, "rev-parse", "refs/heads/ralph/claims/issue-41"),
    ).toBe(malformed);
  });

  it("transitions, closes, and deletes the exact claim after accepted ancestry", async () => {
    const fixture = makeFixture();
    const request = claimRequest(fixture);
    await Effect.runPromise(
      acquireIssueClaim(reference, request).pipe(
        Effect.provide(gitLayer(fixture)),
      ),
    );
    writeFileSync(join(fixture.work, "result.txt"), "accepted result\n");
    git(fixture.work, "add", "result.txt");
    git(
      fixture.work,
      "-c",
      "user.name=Test Author",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "accepted result",
    );
    const resultSha = git(fixture.work, "rev-parse", "HEAD");
    git(fixture.work, "branch", "ralph/a", resultSha);
    const events: Array<string> = [];
    const github = GitHubClient.testLayer({
      fetchIssue: () =>
        Effect.succeed({
          number: 41,
          title: "Issue 41",
          state: "open",
          labels: ["ready-for-agent"],
          body: [
            "## Ralph execution",
            "",
            "- Runnable: yes — one context.",
            "",
            "## Blocked by",
            "",
            "None — can start immediately.",
          ].join("\n"),
          htmlUrl: "https://github.com/dearlordylord/5e-quint/issues/41",
          stateReason: null,
        }),
      closeIssue: () =>
        Effect.sync(() => {
          events.push("closed");
        }),
    });
    await Effect.runPromise(
      completeAcceptedIssue({
        reference,
        taskStatus: "done",
        runId: request.runId,
        ownerToken: request.ownerToken,
        outputBranch: request.outputBranch,
        integrationRef: resultSha,
        acceptedRef: "master",
      }).pipe(Effect.provide(Layer.merge(gitLayer(fixture), github))),
    );
    expect(events).toEqual(["closed"]);
    expect(
      git(
        fixture.remote,
        "ls-remote",
        "--heads",
        fixture.remote,
        "refs/heads/ralph/claims/issue-41",
      ),
    ).toBe("");
  });
});
