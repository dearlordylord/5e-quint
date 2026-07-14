#!/usr/bin/env -S pnpm exec tsx

import { Command as CliCommand, Options } from "@effect/cli";
import {
  Command as PlatformCommand,
  CommandExecutor,
  FileSystem,
} from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { dirname } from "node:path";
import {
  Clock,
  Console,
  Context,
  Cause,
  Data,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
} from "effect";

import { parsePlanText } from "./ralph-task-index.cjs";

const readyLabel = "ready-for-agent";
const reservedClaimBranchPrefix = "ralph/claims/";
const commandTimeoutMs = 120_000;
const runIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ownerTokenPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const gitShaPattern = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const RunIdSchema = Schema.String.pipe(
  Schema.pattern(runIdPattern),
  Schema.brand("RalphRunId"),
);
const OwnerTokenSchema = Schema.String.pipe(
  Schema.pattern(ownerTokenPattern),
  Schema.brand("RalphOwnerToken"),
);
export const GitShaSchema = Schema.String.pipe(
  Schema.pattern(gitShaPattern),
  Schema.brand("RalphGitSha"),
);
const ClaimRefNameSchema = Schema.String.pipe(
  Schema.pattern(/^[^\r\n\0]+$/),
  Schema.brand("RalphClaimRefName"),
);
const IssueNumberSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.filter(Number.isSafeInteger, {
    message: () => "issue number must be a safe integer",
  }),
);
const IssueNumberTextSchema = Schema.transform(
  Schema.String.pipe(Schema.pattern(/^[1-9][0-9]*$/)),
  IssueNumberSchema,
  {
    strict: true,
    decode: Number,
    encode: String,
  },
);
const ParsedClaimRequestSchema = Schema.Struct({
  runId: RunIdSchema,
  ownerToken: OwnerTokenSchema,
  outputBranch: ClaimRefNameSchema,
  acceptedRef: ClaimRefNameSchema,
  baseSha: GitShaSchema,
});
type ParsedClaimRequest = typeof ParsedClaimRequestSchema.Type;
const issueLinkSource = String.raw`https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/issues\/([1-9][0-9]*)(?=$|[\s)>\],.!?;:])`;
const issueLink = new RegExp(issueLinkSource, "g");

type ErrorCode =
  | "boundary-command"
  | "boundary-decode"
  | "claim-conflict"
  | "issue-blocked"
  | "issue-not-runnable"
  | "origin-mismatch"
  | "plan-mismatch"
  | "task-input";

export class RalphIssueError extends Data.TaggedError("RalphIssueError")<{
  readonly code: ErrorCode;
  readonly message: string;
}> {}

const issueError = (code: ErrorCode, message: string) =>
  new RalphIssueError({ code, message });

export interface IssueReference {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
}

const issueReference = (
  owner: string,
  repo: string,
  number: number,
): IssueReference => ({
  owner,
  repo,
  number,
});

export const issueUrl = (reference: IssueReference): string =>
  `https://github.com/${reference.owner}/${reference.repo}/issues/${reference.number}`;

const GitHubLabelSchema = Schema.Union(
  Schema.String,
  Schema.Struct({ name: Schema.String }),
);

const RawGitHubIssueSchema = Schema.Struct({
  number: Schema.Number,
  title: Schema.String,
  state: Schema.Literal("open", "closed"),
  labels: Schema.Array(GitHubLabelSchema),
  body: Schema.NullOr(Schema.String),
  html_url: Schema.String,
  state_reason: Schema.optional(
    Schema.NullOr(Schema.Literal("completed", "not_planned", "reopened")),
  ),
});

interface GitHubIssueFields {
  readonly number: number;
  readonly title: string;
  readonly labels: ReadonlyArray<string>;
  readonly body: string;
  readonly htmlUrl: string;
}

export type GitHubIssue = GitHubIssueFields &
  (
    | {
        readonly state: "open";
        readonly stateReason: "reopened" | null;
      }
    | {
        readonly state: "closed";
        readonly stateReason: "completed" | "not_planned";
      }
  );

const decodeGitHubIssue = (
  input: unknown,
): Effect.Effect<GitHubIssue, RalphIssueError> =>
  Schema.decodeUnknown(RawGitHubIssueSchema)(input).pipe(
    Effect.flatMap((issue): Effect.Effect<GitHubIssue, RalphIssueError> => {
      const fields: GitHubIssueFields = {
        number: issue.number,
        title: issue.title,
        labels: issue.labels.map((label) =>
          typeof label === "string" ? label : label.name,
        ),
        body: issue.body ?? "",
        htmlUrl: issue.html_url,
      };
      const stateReason = issue.state_reason ?? null;
      if (
        issue.state === "open" &&
        (stateReason === null || stateReason === "reopened")
      ) {
        return Effect.succeed<GitHubIssue>({
          ...fields,
          state: "open",
          stateReason,
        });
      }
      if (
        issue.state === "closed" &&
        (stateReason === "completed" || stateReason === "not_planned")
      ) {
        return Effect.succeed<GitHubIssue>({
          ...fields,
          state: "closed" as const,
          stateReason,
        });
      }
      return Effect.fail(
        issueError(
          "boundary-decode",
          `GitHub returned an invalid state/state_reason combination for issue ${issue.number}`,
        ),
      );
    }),
    Effect.mapError((error) =>
      issueError(
        "boundary-decode",
        `GitHub issue response did not match the expected shape: ${error}`,
      ),
    ),
  );

interface ProcessOperations {
  readonly runStatus: (
    command: string,
    args: ReadonlyArray<string>,
    input?: string,
    environment?: Readonly<Record<string, string>>,
  ) => Effect.Effect<CommandResult, RalphIssueError>;
  readonly run: (
    command: string,
    args: ReadonlyArray<string>,
    input?: string,
    environment?: Readonly<Record<string, string>>,
  ) => Effect.Effect<string, RalphIssueError>;
}

export interface CommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export class ProcessService extends Context.Tag("@dnd/ralph/ProcessService")<
  ProcessService,
  ProcessOperations
>() {
  static layer(
    timeoutMs: number,
  ): Layer.Layer<ProcessService, never, CommandExecutor.CommandExecutor> {
    return Layer.effect(
      ProcessService,
      Effect.gen(function* () {
        const executor = yield* CommandExecutor.CommandExecutor;
        const runStatus: ProcessOperations["runStatus"] = (
          command,
          args,
          input,
          environment,
        ) =>
          Effect.scoped(
            Effect.gen(function* () {
              const commandWithInput =
                input === undefined
                  ? PlatformCommand.make(command, ...args)
                  : PlatformCommand.feed(
                      PlatformCommand.make(command, ...args),
                      input,
                    );
              const platformCommand =
                environment === undefined
                  ? commandWithInput
                  : PlatformCommand.env(commandWithInput, environment);
              const child = yield* executor.start(platformCommand);
              const collectText = (
                stream: Stream.Stream<Uint8Array, unknown>,
              ) =>
                stream.pipe(
                  Stream.decodeText(),
                  Stream.runFold("", (all, chunk) => all + chunk),
                );
              const [stdout, stderr, status] = yield* Effect.all(
                [
                  collectText(child.stdout),
                  collectText(child.stderr),
                  child.exitCode,
                ],
                { concurrency: "unbounded" },
              );
              return { status, stdout: stdout.trim(), stderr: stderr.trim() };
            }),
          ).pipe(
            Effect.mapError((cause) =>
              issueError(
                "boundary-command",
                `${command} ${args.join(" ")} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
              ),
            ),
            Effect.timeoutFail({
              duration: timeoutMs,
              onTimeout: () =>
                issueError(
                  "boundary-command",
                  `${command} ${args.join(" ")} timed out after ${timeoutMs}ms`,
                ),
            }),
          );
        return {
          runStatus,
          run: (command, args, input, environment) =>
            runStatus(command, args, input, environment).pipe(
              Effect.flatMap((result) =>
                result.status === 0
                  ? Effect.succeed(result.stdout)
                  : Effect.fail(
                      issueError(
                        "boundary-command",
                        `${command} ${args.join(" ")} failed with status ${result.status}: ${result.stderr || result.stdout || "unknown failure"}`,
                      ),
                    ),
              ),
            ),
        };
      }),
    );
  }

  static readonly live = ProcessService.layer(commandTimeoutMs);

  static testLayer(operations: ProcessOperations): Layer.Layer<ProcessService> {
    return Layer.succeed(ProcessService, operations);
  }
}

export interface GitHubOperations {
  readonly fetchIssue: (
    reference: IssueReference,
  ) => Effect.Effect<GitHubIssue, RalphIssueError>;
  readonly closeIssue: (
    reference: IssueReference,
  ) => Effect.Effect<void, RalphIssueError>;
}

export class GitHubClient extends Context.Tag("@dnd/ralph/GitHubClient")<
  GitHubClient,
  GitHubOperations
>() {
  static readonly layerWithDependencies: Layer.Layer<
    GitHubClient,
    never,
    ProcessService
  > = Layer.effect(
    GitHubClient,
    Effect.gen(function* () {
      const process = yield* ProcessService;
      const fetchIssue: GitHubOperations["fetchIssue"] = (reference) =>
        process
          .run("gh", [
            "api",
            "--method",
            "GET",
            `repos/${reference.owner}/${reference.repo}/issues/${reference.number}`,
          ])
          .pipe(
            Effect.flatMap((output) =>
              Effect.try({
                try: (): unknown => JSON.parse(output),
                catch: (cause) =>
                  issueError(
                    "boundary-decode",
                    `GitHub issue response was not JSON: ${String(cause)}`,
                  ),
              }),
            ),
            Effect.flatMap(decodeGitHubIssue),
            Effect.flatMap((issue) =>
              issue.number === reference.number
                ? Effect.succeed(issue)
                : Effect.fail(
                    issueError(
                      "boundary-decode",
                      `GitHub returned issue ${issue.number} for ${issueUrl(reference)}`,
                    ),
                  ),
            ),
          );
      return {
        fetchIssue,
        closeIssue: (reference: IssueReference) =>
          process
            .run("gh", [
              "api",
              "--method",
              "PATCH",
              `repos/${reference.owner}/${reference.repo}/issues/${reference.number}`,
              "-f",
              "state=closed",
              "-f",
              "state_reason=completed",
            ])
            .pipe(
              Effect.flatMap(() => fetchIssue(reference)),
              Effect.flatMap((closed) =>
                closed.state === "closed" && closed.stateReason === "completed"
                  ? Effect.void
                  : Effect.fail(
                      issueError(
                        "boundary-decode",
                        `GitHub did not confirm issue ${reference.number} as closed/completed`,
                      ),
                    ),
              ),
            ),
      };
    }),
  );

  static testLayer(operations: GitHubOperations): Layer.Layer<GitHubClient> {
    return Layer.succeed(GitHubClient, operations);
  }
}

const ClaimIdentityFields = {
  runId: RunIdSchema,
  ownerToken: OwnerTokenSchema,
  issue: IssueNumberSchema,
  outputBranch: ClaimRefNameSchema,
  acceptedRef: ClaimRefNameSchema,
  baseSha: GitShaSchema,
} as const;
const ClaimMetadataIdentityFields = {
  ...ClaimIdentityFields,
  issue: IssueNumberTextSchema,
} as const;

export const ActiveClaimPayloadSchema = Schema.Struct({
  ...ClaimMetadataIdentityFields,
  phase: Schema.Literal("active"),
});
export type ActiveClaimPayload = typeof ActiveClaimPayloadSchema.Type;

export const CompletingClaimPayloadSchema = Schema.Struct({
  ...ClaimMetadataIdentityFields,
  phase: Schema.Literal("completing"),
  resultSha: GitShaSchema,
});
export type CompletingClaimPayload = typeof CompletingClaimPayloadSchema.Type;

export const ClaimPayloadSchema = Schema.Union(
  ActiveClaimPayloadSchema,
  CompletingClaimPayloadSchema,
);
export type ClaimPayload = typeof ClaimPayloadSchema.Type;

export const ActiveRemoteClaimSchema = Schema.Struct({
  ...ClaimIdentityFields,
  phase: Schema.Literal("active"),
  claimSha: GitShaSchema,
});
export type ActiveRemoteClaim = typeof ActiveRemoteClaimSchema.Type;
export const CompletingRemoteClaimSchema = Schema.Struct({
  ...ClaimIdentityFields,
  phase: Schema.Literal("completing"),
  resultSha: GitShaSchema,
  claimSha: GitShaSchema,
});
export type CompletingRemoteClaim = typeof CompletingRemoteClaimSchema.Type;
export const RemoteClaimSchema = Schema.Union(
  ActiveRemoteClaimSchema,
  CompletingRemoteClaimSchema,
);
export type RemoteClaim = typeof RemoteClaimSchema.Type;

const OwnedClaimRequestSchema = Schema.Struct({
  runId: RunIdSchema,
  ownerToken: OwnerTokenSchema,
  outputBranch: ClaimRefNameSchema,
});
type ParsedOwnedClaimRequest = typeof OwnedClaimRequestSchema.Type;
type GitSha = typeof GitShaSchema.Type;

export interface ClaimRequest {
  readonly runId: string;
  readonly ownerToken: string;
  readonly outputBranch: string;
  readonly acceptedRef: string;
  readonly baseSha: string;
}

export interface GitOperations {
  readonly originRepository: Effect.Effect<string, RalphIssueError>;
  readonly readClaim: (
    reference: IssueReference,
  ) => Effect.Effect<Option.Option<RemoteClaim>, RalphIssueError>;
  readonly createClaim: (
    reference: IssueReference,
    request: ParsedClaimRequest,
  ) => Effect.Effect<RemoteClaim, RalphIssueError>;
  readonly deleteClaim: (
    reference: IssueReference,
    expectedClaimSha: GitSha,
  ) => Effect.Effect<void, RalphIssueError>;
  readonly beginCompletion: (
    reference: IssueReference,
    active: ActiveRemoteClaim,
    resultSha: GitSha,
  ) => Effect.Effect<CompletingRemoteClaim, RalphIssueError>;
  readonly resolveRef: (ref: string) => Effect.Effect<GitSha, RalphIssueError>;
  readonly validateBranch: (
    branch: string,
  ) => Effect.Effect<void, RalphIssueError>;
  readonly isAncestor: (
    integrationRef: string,
    acceptedRef: string,
  ) => Effect.Effect<boolean, RalphIssueError>;
}

const claimRef = (reference: IssueReference) =>
  `refs/heads/ralph/claims/issue-${reference.number}`;

const decodeGitSha = (
  input: unknown,
  context: string,
): Effect.Effect<GitSha, RalphIssueError> =>
  Schema.decodeUnknown(GitShaSchema)(input).pipe(
    Effect.mapError(() =>
      issueError("boundary-decode", `${context} returned an invalid Git SHA`),
    ),
  );

export const parseClaimMetadata = (
  message: string,
): Effect.Effect<ClaimPayload, RalphIssueError> => {
  const fields = new Map<string, string>();
  for (const match of message.matchAll(/^Ralph-([A-Za-z-]+):\s*(.*)$/gm)) {
    const name = match[1];
    const value = match[2]?.trim();
    if (name === undefined || value === undefined || fields.has(name)) {
      return Effect.fail(
        issueError(
          "boundary-decode",
          "remote Ralph claim metadata is malformed",
        ),
      );
    }
    fields.set(name, value);
  }
  const phase = fields.get("Phase");
  const activeFields = [
    "Run-Id",
    "Owner-Token",
    "Issue",
    "Output-Branch",
    "Accepted-Ref",
    "Base-SHA",
    "Phase",
  ] as const;
  const completingFields = [...activeFields, "Result-SHA"] as const;
  const expectedFields =
    phase === "active"
      ? activeFields
      : phase === "completing"
        ? completingFields
        : undefined;
  if (
    expectedFields === undefined ||
    fields.size !== expectedFields.length ||
    !expectedFields.every((field) => fields.has(field))
  ) {
    return Effect.fail(
      issueError("boundary-decode", "remote Ralph claim metadata is malformed"),
    );
  }
  return Schema.decodeUnknown(ClaimPayloadSchema)({
    runId: fields.get("Run-Id"),
    ownerToken: fields.get("Owner-Token"),
    issue: fields.get("Issue"),
    outputBranch: fields.get("Output-Branch"),
    acceptedRef: fields.get("Accepted-Ref"),
    baseSha: fields.get("Base-SHA"),
    phase,
    ...(phase === "completing" ? { resultSha: fields.get("Result-SHA") } : {}),
  }).pipe(
    Effect.mapError(() =>
      issueError("boundary-decode", "remote Ralph claim metadata is malformed"),
    ),
  );
};

export const renderClaimMessage = (
  reference: IssueReference,
  request: ClaimRequest,
  completion?: {
    readonly phase: "completing";
    readonly resultSha: GitSha;
  },
): string =>
  [
    `Claim GitHub issue ${reference.number} for Ralph`,
    "",
    `Ralph-Run-Id: ${request.runId}`,
    `Ralph-Owner-Token: ${request.ownerToken}`,
    `Ralph-Issue: ${reference.number}`,
    `Ralph-Output-Branch: ${request.outputBranch}`,
    `Ralph-Accepted-Ref: ${request.acceptedRef}`,
    `Ralph-Base-SHA: ${request.baseSha}`,
    `Ralph-Phase: ${completion?.phase ?? "active"}`,
    ...(completion === undefined
      ? []
      : [`Ralph-Result-SHA: ${completion.resultSha}`]),
  ].join("\n");

export class GitClient extends Context.Tag("@dnd/ralph/GitClient")<
  GitClient,
  GitOperations
>() {
  static readonly layerWithDependencies: Layer.Layer<
    GitClient,
    RalphIssueError,
    ProcessService
  > = Layer.effect(
    GitClient,
    Effect.gen(function* () {
      const process = yield* ProcessService;
      const origin = yield* Effect.cached(
        Effect.gen(function* () {
          const fetchUrls = (yield* process.run("git", [
            "remote",
            "get-url",
            "--all",
            "origin",
          ]))
            .split(/\r?\n/)
            .filter((url) => url.length > 0);
          const pushUrls = (yield* process.run("git", [
            "remote",
            "get-url",
            "--push",
            "--all",
            "origin",
          ]))
            .split(/\r?\n/)
            .filter((url) => url.length > 0);
          if (fetchUrls.length !== 1 || pushUrls.length !== 1) {
            return yield* Effect.fail(
              issueError(
                "origin-mismatch",
                "origin must have exactly one fetch URL and one push URL",
              ),
            );
          }
          const fetchUrl = fetchUrls[0]!;
          const pushUrl = pushUrls[0]!;
          const fetchRepository = yield* repositoryFromRemoteUrl(fetchUrl);
          const pushRepository = yield* repositoryFromRemoteUrl(pushUrl);
          if (fetchRepository !== pushRepository) {
            return yield* Effect.fail(
              issueError(
                "origin-mismatch",
                `origin fetch repository ${fetchRepository} differs from push repository ${pushRepository}`,
              ),
            );
          }
          return { fetchUrl, pushUrl, repository: fetchRepository };
        }),
      );
      const readClaim: GitOperations["readClaim"] = (reference) =>
        Effect.gen(function* () {
          const { fetchUrl } = yield* origin;
          const row = yield* process.run("git", [
            "ls-remote",
            "--heads",
            fetchUrl,
            claimRef(reference),
          ]);
          if (row === "") return Option.none();
          const sha = yield* decodeGitSha(
            row.split(/\s+/)[0],
            "remote claim ref",
          );
          yield* process.run("git", ["fetch", "--quiet", fetchUrl, sha]);
          const [commitAndParents, treeSha, emptyTreeSha, message] =
            yield* Effect.all(
              [
                process.run("git", ["rev-list", "--parents", "-n", "1", sha]),
                process.run("git", ["show", "-s", "--format=%T", sha]),
                process.run(
                  "git",
                  ["hash-object", "-t", "tree", "--stdin"],
                  "",
                ),
                process.run("git", ["show", "-s", "--format=%B", sha]),
              ],
              { concurrency: "unbounded" },
            );
          if (commitAndParents !== sha || treeSha !== emptyTreeSha) {
            return yield* Effect.fail(
              issueError(
                "boundary-decode",
                "remote Ralph claim must be a parentless empty-tree commit",
              ),
            );
          }
          return Option.some({
            ...(yield* parseClaimMetadata(message)),
            claimSha: sha,
          });
        });
      const validateStableBranch: GitOperations["validateBranch"] = (branch) =>
        process
          .run("git", ["check-ref-format", "--branch", branch])
          .pipe(
            Effect.flatMap((canonical) =>
              canonical === branch &&
              !branch.startsWith("refs/") &&
              !branch.startsWith("@{") &&
              !branch.startsWith(reservedClaimBranchPrefix)
                ? Effect.void
                : Effect.fail(
                    issueError(
                      "task-input",
                      `branch must be a stable short name outside ${reservedClaimBranchPrefix}: ${branch}`,
                    ),
                  ),
            ),
          );

      return {
        originRepository: origin.pipe(
          Effect.map(({ repository }) => repository),
        ),
        readClaim,
        createClaim: (reference: IssueReference, request: ParsedClaimRequest) =>
          Effect.gen(function* () {
            yield* validateStableBranch(request.outputBranch);
            yield* validateStableBranch(request.acceptedRef);
            const { pushUrl } = yield* origin;
            yield* process.run("git", [
              "rev-parse",
              "--verify",
              "--end-of-options",
              `${request.baseSha}^{commit}`,
            ]);
            const tree = yield* process.run("git", ["mktree"], "");
            const message = renderClaimMessage(reference, request);
            const claimSha = yield* decodeGitSha(
              yield* process.run("git", ["commit-tree", tree], `${message}\n`, {
                GIT_AUTHOR_NAME: "Ralph Claim",
                GIT_AUTHOR_EMAIL: "ralph-claim@invalid.local",
                GIT_COMMITTER_NAME: "Ralph Claim",
                GIT_COMMITTER_EMAIL: "ralph-claim@invalid.local",
              }),
              "git commit-tree",
            );
            yield* process.run("git", [
              "push",
              pushUrl,
              `${claimSha}:${claimRef(reference)}`,
            ]);
            return yield* Schema.decodeUnknown(ActiveRemoteClaimSchema)({
              ...request,
              issue: reference.number,
              phase: "active",
              claimSha,
            }).pipe(
              Effect.mapError(() =>
                issueError(
                  "boundary-decode",
                  "created Ralph claim does not match the protocol schema",
                ),
              ),
            );
          }),
        beginCompletion: (reference, active, resultSha) =>
          Effect.gen(function* () {
            const { pushUrl } = yield* origin;
            const tree = yield* process.run("git", ["mktree"], "");
            const completingSha = yield* decodeGitSha(
              yield* process.run(
                "git",
                ["commit-tree", tree],
                `${renderClaimMessage(reference, active, {
                  phase: "completing",
                  resultSha,
                })}\n`,
                {
                  GIT_AUTHOR_NAME: "Ralph Claim",
                  GIT_AUTHOR_EMAIL: "ralph-claim@invalid.local",
                  GIT_COMMITTER_NAME: "Ralph Claim",
                  GIT_COMMITTER_EMAIL: "ralph-claim@invalid.local",
                },
              ),
              "git commit-tree",
            );
            yield* process.run("git", [
              "push",
              `--force-with-lease=${claimRef(reference)}:${active.claimSha}`,
              pushUrl,
              `${completingSha}:${claimRef(reference)}`,
            ]);
            return yield* Schema.decodeUnknown(CompletingRemoteClaimSchema)({
              ...active,
              phase: "completing",
              resultSha,
              claimSha: completingSha,
            }).pipe(
              Effect.mapError(() =>
                issueError(
                  "boundary-decode",
                  "completing Ralph claim does not match the protocol schema",
                ),
              ),
            );
          }),
        deleteClaim: (reference: IssueReference, expectedClaimSha: GitSha) =>
          Effect.gen(function* () {
            const { pushUrl } = yield* origin;
            yield* process.run("git", [
              "push",
              `--force-with-lease=${claimRef(reference)}:${expectedClaimSha}`,
              pushUrl,
              `:${claimRef(reference)}`,
            ]);
          }),
        resolveRef: (ref: string) =>
          process
            .run("git", [
              "rev-parse",
              "--verify",
              "--end-of-options",
              `${ref}^{commit}`,
            ])
            .pipe(Effect.flatMap((sha) => decodeGitSha(sha, "git rev-parse"))),
        validateBranch: validateStableBranch,
        isAncestor: (integrationRef: string, acceptedRef: string) =>
          Effect.gen(function* () {
            const integrationSha = yield* process.run("git", [
              "rev-parse",
              "--verify",
              "--end-of-options",
              `${integrationRef}^{commit}`,
            ]);
            const acceptedSha = yield* process.run("git", [
              "rev-parse",
              "--verify",
              "--end-of-options",
              `${acceptedRef}^{commit}`,
            ]);
            const result = yield* process.runStatus("git", [
              "merge-base",
              "--is-ancestor",
              integrationSha,
              acceptedSha,
            ]);
            if (result.status === 0) return true;
            if (result.status === 1) return false;
            return yield* Effect.fail(
              issueError(
                "boundary-command",
                `git merge-base --is-ancestor failed with status ${result.status}: ${result.stderr || result.stdout || "unknown failure"}`,
              ),
            );
          }),
      };
    }),
  );

  static testLayer(operations: GitOperations): Layer.Layer<GitClient> {
    return Layer.succeed(GitClient, operations);
  }
}

export const issueReferenceFromTask = (
  text: string,
): Effect.Effect<IssueReference, RalphIssueError> =>
  Effect.gen(function* () {
    const references = [...text.matchAll(issueLink)].map((match) =>
      issueReference(match[1] ?? "", match[2] ?? "", Number(match[3])),
    );
    if (
      references.some((reference) => !Number.isSafeInteger(reference.number))
    ) {
      return yield* Effect.fail(
        issueError(
          "task-input",
          "canonical GitHub issue number is not a safe integer",
        ),
      );
    }
    const distinct = new Map(
      references.map((reference) => [issueUrl(reference), reference]),
    );
    if (distinct.size !== 1) {
      return yield* Effect.fail(
        issueError(
          "task-input",
          `task must contain exactly one canonical GitHub issue link; found ${distinct.size}`,
        ),
      );
    }
    return [...distinct.values()][0]!;
  });

const markdownSection = (
  body: string,
  heading: string,
): Effect.Effect<string, RalphIssueError> =>
  Effect.gen(function* () {
    const lines = body.split(/\r?\n/);
    const headings = lines.flatMap((line, index) =>
      line.trim() === `## ${heading}` ? [index] : [],
    );
    if (headings.length !== 1) {
      return yield* Effect.fail(
        issueError(
          "issue-not-runnable",
          `issue must contain exactly one ## ${heading} section`,
        ),
      );
    }
    const start = headings[0]!;
    const section: Array<string> = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (/^##\s+/.test(line)) break;
      section.push(line);
    }
    return section.join("\n").trim();
  });

const parseRunnableMarker = (
  execution: string,
): Effect.Effect<"yes" | "no", RalphIssueError> => {
  const markers = [
    ...execution.matchAll(/^[-*]\s*Runnable:\s*(yes|no)\s*(?:[—-]\s+.*)?$/gim),
  ];
  const marker = markers[0]?.[1]?.toLowerCase();
  return markers.length === 1 && (marker === "yes" || marker === "no")
    ? Effect.succeed(marker)
    : Effect.fail(
        issueError(
          "issue-not-runnable",
          "## Ralph execution must contain exactly one canonical Runnable marker",
        ),
      );
};

export const parseBlockedIssueReferences = (
  body: string,
  canonical: IssueReference,
): Effect.Effect<ReadonlyArray<IssueReference>, RalphIssueError> =>
  Effect.gen(function* () {
    const section = yield* markdownSection(body, "Blocked by");
    const lines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (
      lines.length === 1 &&
      /^(?:None\.?|None\s+—\s+can start immediately\.)$/i.test(lines[0] ?? "")
    ) {
      return [];
    }
    if (lines.some((line) => /^None\b/i.test(line))) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          "## Blocked by cannot combine None with blocker entries",
        ),
      );
    }
    const references: Array<IssueReference> = [];
    const seen = new Set<number>();
    const blockerToken = new RegExp(
      `${issueLinkSource}|(?:^|\\s)#([1-9][0-9]*)\\b`,
      "gm",
    );
    for (const line of lines) {
      if (!/^[-*]\s+/.test(line)) {
        return yield* Effect.fail(
          issueError(
            "plan-mismatch",
            "every blocker must be a Markdown bullet",
          ),
        );
      }
      const matches = [...line.matchAll(blockerToken)];
      if (matches.length !== 1) {
        return yield* Effect.fail(
          issueError(
            "plan-mismatch",
            "every blocker bullet must contain exactly one issue reference",
          ),
        );
      }
      const match = matches[0]!;
      const linkedOwner = match[1];
      const linkedRepo = match[2];
      if (
        linkedOwner !== undefined &&
        linkedRepo !== undefined &&
        (linkedOwner !== canonical.owner || linkedRepo !== canonical.repo)
      ) {
        return yield* Effect.fail(
          issueError(
            "plan-mismatch",
            `cross-repository blocker is not supported: ${match[0]}`,
          ),
        );
      }
      const number = Number(match[3] ?? match[4]);
      if (!Number.isSafeInteger(number)) {
        return yield* Effect.fail(
          issueError(
            "plan-mismatch",
            "blocker issue number is not a safe integer",
          ),
        );
      }
      if (seen.has(number)) {
        return yield* Effect.fail(
          issueError("plan-mismatch", `duplicate blocker issue ${number}`),
        );
      }
      seen.add(number);
      references.push(issueReference(canonical.owner, canonical.repo, number));
    }
    if (references.length === 0) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          "## Blocked by must contain issue references or explicitly say None",
        ),
      );
    }
    return references;
  });

const assertRunnableIssue = (
  issue: GitHubIssue,
  reference: IssueReference,
): Effect.Effect<void, RalphIssueError> =>
  Effect.gen(function* () {
    if (issue.number !== reference.number) {
      return yield* Effect.fail(
        issueError(
          "boundary-decode",
          `fetched issue number does not match ${issueUrl(reference)}`,
        ),
      );
    }
    if (issue.state !== "open") {
      return yield* Effect.fail(
        issueError(
          "issue-not-runnable",
          `canonical issue ${issueUrl(reference)} is ${issue.state}`,
        ),
      );
    }
    if (!issue.labels.includes(readyLabel)) {
      return yield* Effect.fail(
        issueError(
          "issue-not-runnable",
          `canonical issue ${issueUrl(reference)} lacks ${readyLabel}`,
        ),
      );
    }
    const execution = yield* markdownSection(issue.body, "Ralph execution");
    if ((yield* parseRunnableMarker(execution)) !== "yes") {
      return yield* Effect.fail(
        issueError(
          "issue-not-runnable",
          `canonical issue ${issueUrl(reference)} is not a runnable Ralph leaf`,
        ),
      );
    }
  });

const assertNonRunnableIssue = (
  issue: GitHubIssue,
  reference: IssueReference,
): Effect.Effect<void, RalphIssueError> =>
  Effect.gen(function* () {
    if (issue.state !== "open") {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          `non-runnable issue ${issueUrl(reference)} is ${issue.state}`,
        ),
      );
    }
    const execution = yield* markdownSection(issue.body, "Ralph execution");
    if (
      issue.labels.includes(readyLabel) ||
      (yield* parseRunnableMarker(execution)) !== "no"
    ) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          `blocked/deferred task ${issueUrl(reference)} must be an unlabeled non-runnable issue`,
        ),
      );
    }
  });

export interface HydratedIssueContext {
  readonly reference: IssueReference;
  readonly issue: GitHubIssue;
  readonly blockers: ReadonlyArray<GitHubIssue>;
  readonly context: string;
}

export const renderIssueContext = (
  issue: GitHubIssue,
  blockers: ReadonlyArray<GitHubIssue>,
  fetchedAt: string,
): string => {
  const blockerLines =
    blockers.length === 0
      ? "- None"
      : blockers
          .map(
            (blocker) =>
              `- [${blocker.title}](${blocker.htmlUrl}): ${blocker.state}`,
          )
          .join("\n");
  return `# Canonical GitHub Issue Context\n\nFetched once for this Ralph task attempt: \`${fetchedAt}\`\n\n- Issue: [${issue.title}](${issue.htmlUrl})\n- State: \`${issue.state}\`\n- Required label: \`${readyLabel}\`\n- Blockers:\n${blockerLines}\n\n## Canonical issue body\n\n${issue.body}\n`;
};

const fetchRunnableIssue = (
  reference: IssueReference,
): Effect.Effect<
  {
    readonly issue: GitHubIssue;
    readonly blockers: ReadonlyArray<GitHubIssue>;
  },
  RalphIssueError,
  GitHubClient
> =>
  Effect.gen(function* () {
    const github = yield* GitHubClient;
    const issue = yield* github.fetchIssue(reference);
    yield* assertRunnableIssue(issue, reference);
    const blockerReferences = yield* parseBlockedIssueReferences(
      issue.body,
      reference,
    );
    const blockers = yield* Effect.forEach(
      blockerReferences,
      github.fetchIssue,
      {
        concurrency: 4,
      },
    );
    for (const blocker of blockers) {
      if (blocker.state !== "closed" || blocker.stateReason !== "completed") {
        return yield* Effect.fail(
          issueError(
            "issue-blocked",
            `canonical issue has unfinished blocker ${blocker.htmlUrl}`,
          ),
        );
      }
    }
    return { issue, blockers };
  });

export const hydrateTaskText = (
  taskText: string,
  fetchedAt: string,
): Effect.Effect<HydratedIssueContext, RalphIssueError, GitHubClient> =>
  Effect.gen(function* () {
    const reference = yield* issueReferenceFromTask(taskText);
    const { blockers, issue } = yield* fetchRunnableIssue(reference);
    return {
      reference,
      issue,
      blockers,
      context: renderIssueContext(issue, blockers, fetchedAt),
    };
  });

export const repositoryFromRemoteUrl = (
  url: string,
): Effect.Effect<string, RalphIssueError> => {
  const match = url.match(
    /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/,
  );
  return match?.[1] !== undefined && match[2] !== undefined
    ? Effect.succeed(`${match[1]}/${match[2]}`.toLowerCase())
    : Effect.fail(
        issueError(
          "origin-mismatch",
          "origin URL is not a supported GitHub remote",
        ),
      );
};

const assertOriginRepository = (
  actual: string,
  reference: IssueReference,
): Effect.Effect<void, RalphIssueError> => {
  const expected = `${reference.owner}/${reference.repo}`;
  return actual === expected.toLowerCase()
    ? Effect.void
    : Effect.fail(
        issueError(
          "origin-mismatch",
          `canonical issue belongs to ${expected}, but origin is ${actual}`,
        ),
      );
};

const assertReusableClaim = (
  existing: RemoteClaim,
  reference: IssueReference,
  requested: ParsedClaimRequest,
): Effect.Effect<void, RalphIssueError> =>
  existing.phase !== "active"
    ? Effect.fail(
        issueError("claim-conflict", "issue claim is already completing"),
      )
    : existing.runId !== requested.runId
      ? Effect.fail(
          issueError(
            "claim-conflict",
            `issue is already claimed by Ralph run ${existing.runId}`,
          ),
        )
      : existing.ownerToken !== requested.ownerToken
        ? Effect.fail(
            issueError(
              "claim-conflict",
              "issue is already claimed by another Ralph runner instance",
            ),
          )
        : existing.issue !== reference.number
          ? Effect.fail(
              issueError(
                "claim-conflict",
                `claim ref for issue ${reference.number} contains issue ${existing.issue}`,
              ),
            )
          : existing.outputBranch !== requested.outputBranch
            ? Effect.fail(
                issueError(
                  "claim-conflict",
                  `issue is already claimed by output branch ${existing.outputBranch}`,
                ),
              )
            : existing.baseSha !== requested.baseSha
              ? Effect.fail(
                  issueError(
                    "claim-conflict",
                    `issue claim Base SHA ${existing.baseSha} differs from requested ${requested.baseSha}`,
                  ),
                )
              : existing.acceptedRef !== requested.acceptedRef
                ? Effect.fail(
                    issueError(
                      "claim-conflict",
                      `issue claim acceptance ref ${existing.acceptedRef} differs from requested ${requested.acceptedRef}`,
                    ),
                  )
                : Effect.void;

const assertOwnedClaim = (
  claim: Option.Option<RemoteClaim>,
  reference: IssueReference,
  request: ParsedOwnedClaimRequest,
): Effect.Effect<RemoteClaim, RalphIssueError> =>
  Option.match(claim, {
    onNone: () =>
      Effect.fail(
        issueError(
          "claim-conflict",
          `issue has no active Ralph claim for run ${request.runId}`,
        ),
      ),
    onSome: (metadata) =>
      metadata.runId === request.runId &&
      metadata.ownerToken === request.ownerToken &&
      metadata.outputBranch === request.outputBranch &&
      metadata.issue === reference.number
        ? Effect.succeed(metadata)
        : Effect.fail(
            issueError(
              "claim-conflict",
              `issue is claimed by Ralph run ${metadata.runId} for issue ${metadata.issue}`,
            ),
          ),
  });

export const acquireIssueClaim = (
  reference: IssueReference,
  request: ClaimRequest,
): Effect.Effect<RemoteClaim, RalphIssueError, GitClient> =>
  Effect.gen(function* () {
    const git = yield* GitClient;
    const parsed = yield* Schema.decodeUnknown(ParsedClaimRequestSchema)(
      request,
    ).pipe(
      Effect.mapError((error) =>
        issueError("task-input", `claim request is malformed: ${error}`),
      ),
    );
    yield* git.validateBranch(parsed.outputBranch);
    yield* git.validateBranch(parsed.acceptedRef);
    yield* git.resolveRef(`refs/heads/${parsed.acceptedRef}`);
    yield* assertOriginRepository(yield* git.originRepository, reference);
    const existing = yield* git.readClaim(reference);
    if (Option.isSome(existing)) {
      yield* assertReusableClaim(existing.value, reference, parsed);
      return existing.value;
    }
    const attempted = yield* Effect.either(git.createClaim(reference, parsed));
    if (attempted._tag === "Right") return attempted.right;
    const raced = yield* git.readClaim(reference);
    if (Option.isNone(raced)) return yield* Effect.fail(attempted.left);
    yield* assertReusableClaim(raced.value, reference, parsed);
    return raced.value;
  });

export const acquireRunnableIssueClaim = (
  reference: IssueReference,
  request: ClaimRequest,
): Effect.Effect<RemoteClaim, RalphIssueError, GitClient | GitHubClient> =>
  Effect.gen(function* () {
    yield* fetchRunnableIssue(reference);
    const claim = yield* acquireIssueClaim(reference, request);
    yield* fetchRunnableIssue(reference);
    return claim;
  });

const deleteClaimRecoverably = (
  git: GitOperations,
  reference: IssueReference,
  expectedClaimSha: GitSha,
): Effect.Effect<void, RalphIssueError> =>
  Effect.gen(function* () {
    const attempted = yield* Effect.either(
      git.deleteClaim(reference, expectedClaimSha),
    );
    if (attempted._tag === "Right") return;
    const current = yield* git.readClaim(reference);
    if (Option.isNone(current)) return;
    if (current.value.claimSha === expectedClaimSha)
      return yield* Effect.fail(attempted.left);
    return yield* Effect.fail(
      issueError(
        "claim-conflict",
        "claim changed while its leased deletion was in flight",
      ),
    );
  });

export const releaseIssueClaim = (
  reference: IssueReference,
  request: Pick<ClaimRequest, "runId" | "ownerToken" | "outputBranch">,
): Effect.Effect<void, RalphIssueError, GitClient> =>
  Effect.gen(function* () {
    const git = yield* GitClient;
    const parsed = yield* Schema.decodeUnknown(OwnedClaimRequestSchema)(
      request,
    ).pipe(
      Effect.mapError((error) =>
        issueError("task-input", `claim identity is malformed: ${error}`),
      ),
    );
    yield* git.validateBranch(parsed.outputBranch);
    yield* assertOriginRepository(yield* git.originRepository, reference);
    const claim = yield* git.readClaim(reference);
    if (Option.isNone(claim)) return;
    const owned = yield* assertOwnedClaim(claim, reference, parsed);
    if (owned.phase !== "active") {
      return yield* Effect.fail(
        issueError(
          "claim-conflict",
          "a completing claim cannot be released as abandoned",
        ),
      );
    }
    yield* deleteClaimRecoverably(git, reference, owned.claimSha);
  });

export interface CompleteIssueInput {
  readonly reference: IssueReference;
  readonly taskStatus: PlanTaskStatus;
  readonly runId: string;
  readonly ownerToken: string;
  readonly outputBranch: string;
  readonly integrationRef: string;
  readonly acceptedRef: string;
}

const beginCompletionRecoverably = (
  git: GitOperations,
  reference: IssueReference,
  active: ActiveRemoteClaim,
  resultSha: GitSha,
): Effect.Effect<CompletingRemoteClaim, RalphIssueError> =>
  Effect.gen(function* () {
    const attempted = yield* Effect.either(
      git.beginCompletion(reference, active, resultSha),
    );
    if (attempted._tag === "Right") return attempted.right;
    const current = yield* git.readClaim(reference);
    if (
      Option.isSome(current) &&
      current.value.phase === "completing" &&
      current.value.runId === active.runId &&
      current.value.ownerToken === active.ownerToken &&
      current.value.issue === active.issue &&
      current.value.outputBranch === active.outputBranch &&
      current.value.acceptedRef === active.acceptedRef &&
      current.value.baseSha === active.baseSha &&
      current.value.resultSha === resultSha
    ) {
      return current.value;
    }
    if (Option.isNone(current)) return yield* Effect.fail(attempted.left);
    if (current.value.claimSha === active.claimSha) {
      return yield* Effect.fail(attempted.left);
    }
    return yield* Effect.fail(
      issueError(
        "claim-conflict",
        "claim changed while completion was starting",
      ),
    );
  });

export const completeAcceptedIssue = (
  input: CompleteIssueInput,
): Effect.Effect<void, RalphIssueError, GitClient | GitHubClient> =>
  Effect.gen(function* () {
    if (input.taskStatus !== "done") {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          "Ralph task must be done before issue completion",
        ),
      );
    }
    const git = yield* GitClient;
    const github = yield* GitHubClient;
    const parsedIdentity = yield* Schema.decodeUnknown(OwnedClaimRequestSchema)(
      input,
    ).pipe(
      Effect.mapError((error) =>
        issueError("task-input", `claim identity is malformed: ${error}`),
      ),
    );
    yield* git.validateBranch(parsedIdentity.outputBranch);
    yield* assertOriginRepository(yield* git.originRepository, input.reference);
    const owned = yield* assertOwnedClaim(
      yield* git.readClaim(input.reference),
      input.reference,
      parsedIdentity,
    );
    if (input.acceptedRef !== owned.acceptedRef) {
      return yield* Effect.fail(
        issueError(
          "claim-conflict",
          `completion target ${input.acceptedRef} differs from claimed acceptance ref ${owned.acceptedRef}`,
        ),
      );
    }
    yield* git.validateBranch(owned.acceptedRef);
    const outputSha = yield* git.resolveRef(`refs/heads/${owned.outputBranch}`);
    const integrationSha = yield* git.resolveRef(input.integrationRef);
    const baseSha = yield* git.resolveRef(owned.baseSha);
    const acceptedSha = yield* git.resolveRef(
      `refs/heads/${owned.acceptedRef}`,
    );
    if (integrationSha === baseSha) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          "accepted result is identical to the claimed Base SHA",
        ),
      );
    }
    if (outputSha !== integrationSha) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          `claimed output ${owned.outputBranch} resolves to ${outputSha}, not ${integrationSha}`,
        ),
      );
    }
    if (!(yield* git.isAncestor(baseSha, integrationSha))) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          `${integrationSha} does not descend from claimed Base SHA ${owned.baseSha}`,
        ),
      );
    }
    if (!(yield* git.isAncestor(integrationSha, acceptedSha))) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          `${input.integrationRef} is not integrated into ${input.acceptedRef}`,
        ),
      );
    }
    if (owned.phase !== "active" && owned.resultSha !== integrationSha) {
      return yield* Effect.fail(
        issueError("claim-conflict", "claim records a different result SHA"),
      );
    }
    if (owned.phase === "active") yield* fetchRunnableIssue(input.reference);
    const completing =
      owned.phase === "completing"
        ? owned
        : yield* beginCompletionRecoverably(
            git,
            input.reference,
            owned,
            integrationSha,
          );

    const currentIssue = yield* github.fetchIssue(input.reference);
    if (currentIssue.state === "closed") {
      if (currentIssue.stateReason !== "completed") {
        return yield* Effect.fail(
          issueError(
            "plan-mismatch",
            "canonical issue was closed externally without completion",
          ),
        );
      }
      yield* deleteClaimRecoverably(git, input.reference, completing.claimSha);
      return;
    }
    yield* fetchRunnableIssue(input.reference);
    const claimBeforeClose = yield* git.readClaim(input.reference);
    if (
      Option.isNone(claimBeforeClose) ||
      claimBeforeClose.value.claimSha !== completing.claimSha ||
      claimBeforeClose.value.phase !== "completing"
    ) {
      return yield* Effect.fail(
        issueError(
          "claim-conflict",
          "completing claim changed before GitHub close",
        ),
      );
    }
    yield* github.closeIssue(input.reference);
    yield* deleteClaimRecoverably(git, input.reference, completing.claimSha);
  });

export interface PlanTask {
  readonly number: number;
  readonly id: string;
  readonly status: PlanTaskStatus;
  readonly title: string;
  readonly dependencies: ReadonlyArray<string>;
  readonly startLine: number;
  readonly endLine: number;
}

const planTaskStatuses = [
  "ready-for-research",
  "ready-for-implementation",
  "ready-for-implementation-after-light-research",
  "blocked",
  "deferred",
  "done",
] as const;

export type PlanTaskStatus = (typeof planTaskStatuses)[number];

export interface PlanEntry {
  readonly task: PlanTask;
  readonly text: string;
  readonly reference: IssueReference;
}

const PlanTaskSchema = Schema.Struct({
  number: Schema.Number,
  id: Schema.String,
  status: Schema.Literal(...planTaskStatuses),
  title: Schema.String,
  dependencies: Schema.Array(Schema.String),
  startLine: Schema.Number,
  endLine: Schema.Number,
});

const planEntriesFromText = (
  planPath: string,
  text: string,
): Effect.Effect<ReadonlyArray<PlanEntry>, RalphIssueError> =>
  Effect.gen(function* () {
    const rawTasks = yield* Effect.try({
      try: (): unknown => parsePlanText(text, planPath),
      catch: (cause) =>
        issueError(
          "task-input",
          `could not parse ${planPath}: ${String(cause)}`,
        ),
    });
    const tasks = yield* Schema.decodeUnknown(Schema.Array(PlanTaskSchema))(
      rawTasks,
    ).pipe(
      Effect.mapError((error) =>
        issueError(
          "task-input",
          `Ralph task index returned an invalid task: ${error}`,
        ),
      ),
    );
    const lines = text.split("\n");
    return yield* Effect.forEach(tasks, (task) =>
      Effect.gen(function* () {
        const taskText = lines
          .slice(task.startLine - 1, task.endLine)
          .join("\n");
        return {
          task,
          text: taskText,
          reference: yield* issueReferenceFromTask(taskText),
        };
      }),
    );
  });

export const validatePlanEntries = (
  entries: ReadonlyArray<PlanEntry>,
  options: { readonly pendingCompletionTask?: number } = {},
): Effect.Effect<void, RalphIssueError, GitHubClient> =>
  Effect.gen(function* () {
    const github = yield* GitHubClient;
    const problems: Array<string> = [];
    const taskIdByIssue = new Map<string, string>();
    for (const entry of entries) {
      const key = issueUrl(entry.reference);
      if (taskIdByIssue.has(key)) {
        problems.push(
          `GitHub issue ${entry.reference.number} is mapped by more than one Ralph task`,
        );
        continue;
      }
      taskIdByIssue.set(key, entry.task.id);
    }
    const fetched = yield* Effect.forEach(
      entries,
      (entry) => github.fetchIssue(entry.reference).pipe(Effect.either),
      { concurrency: 4 },
    );
    const issueByReference = new Map<string, GitHubIssue>();
    for (let index = 0; index < fetched.length; index += 1) {
      const result = fetched[index]!;
      const entry = entries[index]!;
      if (result._tag === "Left") {
        problems.push(`${entry.task.id}: ${result.left.message}`);
      } else if (result.right.number !== entry.reference.number) {
        problems.push(
          `${entry.task.id}: fetched issue number does not match ${issueUrl(entry.reference)}`,
        );
      } else {
        issueByReference.set(issueUrl(entry.reference), result.right);
      }
    }
    for (const entry of entries) {
      const issue = issueByReference.get(issueUrl(entry.reference));
      if (issue === undefined) continue;
      const checked = yield* Effect.either(
        Effect.gen(function* () {
          if (entry.task.status === "done") {
            const isCompleted =
              issue.state === "closed" && issue.stateReason === "completed";
            const isExactPending =
              issue.state === "open" &&
              options.pendingCompletionTask === entry.task.number;
            if (!isCompleted && !isExactPending) {
              return yield* Effect.fail(
                issueError(
                  "plan-mismatch",
                  `${entry.task.id} is done but canonical issue ${issueUrl(entry.reference)} is not closed/completed`,
                ),
              );
            }
          } else if (entry.task.status.startsWith("ready-for-")) {
            yield* assertRunnableIssue(issue, entry.reference);
          } else {
            yield* assertNonRunnableIssue(issue, entry.reference);
          }
          const blockerTaskIds = yield* Effect.forEach(
            yield* parseBlockedIssueReferences(issue.body, entry.reference),
            (blocker) => {
              const taskId = taskIdByIssue.get(issueUrl(blocker));
              return taskId === undefined
                ? Effect.fail(
                    issueError(
                      "plan-mismatch",
                      `${entry.task.id} has blocker issue ${blocker.number} outside the runnable plan`,
                    ),
                  )
                : Effect.succeed(taskId);
            },
          );
          const actualDependencies = [...blockerTaskIds].sort();
          const indexedDependencies = [...entry.task.dependencies].sort();
          if (
            JSON.stringify(actualDependencies) !==
            JSON.stringify(indexedDependencies)
          ) {
            return yield* Effect.fail(
              issueError(
                "plan-mismatch",
                `${entry.task.id} indexed dependencies ${JSON.stringify(entry.task.dependencies)} do not match issue blockers ${JSON.stringify(blockerTaskIds)}`,
              ),
            );
          }
        }),
      );
      if (checked._tag === "Left") problems.push(checked.left.message);
    }
    if (problems.length > 0) {
      return yield* Effect.fail(
        issueError(
          "plan-mismatch",
          `GitHub-backed plan validation failed:\n- ${problems.join("\n- ")}`,
        ),
      );
    }
  });

const writeText = (
  filePath: string,
  text: string,
): Effect.Effect<void, RalphIssueError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const files = yield* FileSystem.FileSystem;
    yield* files
      .makeDirectory(dirname(filePath), { recursive: true })
      .pipe(
        Effect.mapError((cause) =>
          issueError(
            "task-input",
            `could not create ${dirname(filePath)}: ${String(cause)}`,
          ),
        ),
      );
    yield* files
      .writeFileString(filePath, text)
      .pipe(
        Effect.mapError((cause) =>
          issueError(
            "task-input",
            `could not write ${filePath}: ${String(cause)}`,
          ),
        ),
      );
  });

const taskFileOption = Options.fileText("task-file").pipe(
  Options.withDescription(
    "Ralph task Markdown containing one canonical GitHub issue link",
  ),
);
const ownerOptions = {
  runId: Options.text("run-id"),
  ownerToken: Options.text("owner-token"),
  outputBranch: Options.text("output-branch"),
};

const hydrateCommand = CliCommand.make(
  "hydrate",
  { taskFile: taskFileOption, output: Options.text("output") },
  ({ output, taskFile: [, taskText] }) =>
    Effect.gen(function* () {
      const fetchedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
      const hydrated = yield* hydrateTaskText(taskText, fetchedAt);
      yield* writeText(output, hydrated.context);
      yield* Console.log(JSON.stringify(hydrated.reference));
    }),
).pipe(
  CliCommand.withDescription(
    "Fetch and freeze canonical issue context for one task attempt",
  ),
);

const claimCommand = CliCommand.make(
  "claim",
  {
    taskFile: taskFileOption,
    ...ownerOptions,
    baseSha: Options.text("base-sha"),
    acceptedRef: Options.text("accepted-ref"),
  },
  ({
    acceptedRef,
    baseSha,
    outputBranch,
    ownerToken,
    runId,
    taskFile: [, taskText],
  }) =>
    Effect.gen(function* () {
      const reference = yield* issueReferenceFromTask(taskText);
      const claim = yield* acquireRunnableIssueClaim(reference, {
        runId,
        ownerToken,
        outputBranch,
        acceptedRef,
        baseSha,
      });
      yield* Console.log(JSON.stringify(claim));
    }),
).pipe(
  CliCommand.withDescription(
    "Acquire an exclusive remote claim for a runnable issue",
  ),
);

const releaseCommand = CliCommand.make(
  "release",
  { taskFile: taskFileOption, ...ownerOptions },
  ({ outputBranch, ownerToken, runId, taskFile: [, taskText] }) =>
    issueReferenceFromTask(taskText).pipe(
      Effect.flatMap((reference) =>
        releaseIssueClaim(reference, { runId, ownerToken, outputBranch }),
      ),
    ),
).pipe(
  CliCommand.withDescription("CAS-release a claim owned by this Ralph runner"),
);

const completeCommand = CliCommand.make(
  "complete",
  {
    plan: Options.fileText("plan"),
    task: Options.integer("task"),
    ...ownerOptions,
    integrationRef: Options.text("integration-ref"),
    acceptedRef: Options.text("accepted-ref"),
  },
  ({
    acceptedRef,
    integrationRef,
    outputBranch,
    ownerToken,
    plan: [planPath, planText],
    runId,
    task,
  }) =>
    Effect.gen(function* () {
      const entries = yield* planEntriesFromText(planPath, planText);
      const entry = entries.find((candidate) => candidate.task.number === task);
      if (entry === undefined) {
        return yield* Effect.fail(
          issueError("task-input", `Task ${task} is absent from ${planPath}`),
        );
      }
      yield* completeAcceptedIssue({
        reference: entry.reference,
        taskStatus: entry.task.status,
        runId,
        ownerToken,
        outputBranch,
        integrationRef,
        acceptedRef,
      });
    }),
).pipe(
  CliCommand.withDescription(
    "Close an issue only after its exact claimed result is accepted",
  ),
);

const validatePlanCommand = CliCommand.make(
  "validate-plan",
  {
    plan: Options.fileText("plan"),
    pendingTask: Options.integer("pending-task").pipe(Options.withDefault(0)),
  },
  ({ pendingTask, plan: [planPath, planText] }) =>
    Effect.gen(function* () {
      const entries = yield* planEntriesFromText(planPath, planText);
      yield* validatePlanEntries(entries, {
        ...(pendingTask === 0 ? {} : { pendingCompletionTask: pendingTask }),
      });
      yield* Console.log(
        JSON.stringify({
          tasks: entries.length,
          issues: entries.map((entry) => entry.reference.number),
        }),
      );
    }),
).pipe(
  CliCommand.withDescription(
    "Compare the complete Ralph graph with live canonical issues",
  ),
);

export const rootCommand = CliCommand.make("ralph-issue-context").pipe(
  CliCommand.withDescription(
    "Safe live GitHub hydration and claim protocol for Ralph",
  ),
  CliCommand.withSubcommands([
    hydrateCommand,
    claimCommand,
    releaseCommand,
    completeCommand,
    validatePlanCommand,
  ]),
);

export const runCli = (args: ReadonlyArray<string>) =>
  CliCommand.run(rootCommand, {
    name: "Ralph issue context",
    version: "1.0.0",
  })(args);

const liveClients = Layer.merge(
  GitHubClient.layerWithDependencies,
  GitClient.layerWithDependencies,
).pipe(Layer.provide(ProcessService.live));

const main = runCli(process.argv).pipe(
  Effect.provide(liveClients),
  Effect.provide(NodeContext.layer),
  Effect.tapError((error) =>
    error instanceof RalphIssueError
      ? Console.error(`error [${error.code}]: ${error.message}`)
      : Effect.void,
  ),
  Effect.tapErrorCause((cause) =>
    Option.match(Cause.dieOption(cause), {
      onNone: () => Effect.void,
      onSome: (defect) => Console.error(Cause.pretty(Cause.die(defect))),
    }),
  ),
);

const isMainModule =
  process.argv[1]?.endsWith("/ralph-issue-context.ts") === true;

if (isMainModule) NodeRuntime.runMain(main, { disableErrorReporting: true });
