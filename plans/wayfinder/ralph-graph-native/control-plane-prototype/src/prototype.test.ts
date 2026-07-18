import { appendFile, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Deferred, Effect, Fiber, Queue, Ref } from "effect";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  AgentSessionId,
  AttemptId,
  EvidenceRef,
  GitSha,
  makeCoordinator,
  recoverControlState,
  recoverFromPorts,
  RetryDueAtEpochMs,
  WorktreeId,
  WorktreePath,
  type CoordinatorPorts,
  type AttemptOutcome,
  type JournalEvent,
  type JournalPort,
} from "./control-plane.js";
import { makeNdjsonJournal } from "./ndjson-journal.js";
import { projectTrackerSnapshot, TaskDagSnapshot, TaskId } from "./task-dag.js";

const ready = { _tag: "Ready" } as const;

const validSnapshot = (input: unknown): TaskDagSnapshot => {
  const result = projectTrackerSnapshot(input);
  if (result._tag === "Invalid") {
    throw new Error(`invalid test fixture: ${JSON.stringify(result.issues)}`);
  }
  return result.snapshot;
};

const inMemoryJournal = Effect.fn("Test.inMemoryJournal")(function* () {
  const events = yield* Ref.make<ReadonlyArray<JournalEvent>>([]);
  const port: JournalPort = {
    append: (event) => Ref.update(events, (current) => [...current, event]),
    recover: () => Ref.get(events),
  };
  return { port, events } as const;
});

const dagSnapshotArbitrary = fc
  .integer({ min: 1, max: 8 })
  .chain((taskCount) => {
    const possibleEdgeCount = (taskCount * (taskCount - 1)) / 2;
    return fc
      .array(fc.boolean(), {
        minLength: possibleEdgeCount,
        maxLength: possibleEdgeCount,
      })
      .map((edges) => {
        const tasks: Array<{
          readonly id: string;
          readonly lifecycle: typeof ready;
          readonly prerequisites: ReadonlyArray<string>;
        }> = [];
        let edgeIndex = 0;
        for (
          let dependantIndex = 0;
          dependantIndex < taskCount;
          dependantIndex++
        ) {
          const prerequisites: Array<string> = [];
          for (
            let prerequisiteIndex = 0;
            prerequisiteIndex < dependantIndex;
            prerequisiteIndex++
          ) {
            if (edges[edgeIndex] === true) {
              prerequisites.push(`task-${prerequisiteIndex}`);
            }
            edgeIndex++;
          }
          tasks.push({
            id: `task-${dependantIndex}`,
            lifecycle: ready,
            prerequisites,
          });
        }
        return { revision: "property-revision", tasks };
      });
  });

describe("Ralph graph-native control-plane falsification scenarios", () => {
  it("preserves canonical encoding and topological laws across generated DAG insertion orders", () => {
    fc.assert(
      fc.property(dagSnapshotArbitrary, (wire) => {
        const forward = validSnapshot(wire);
        const reversed = validSnapshot({
          ...wire,
          tasks: [...wire.tasks].reverse(),
        });
        const roundTripped = validSnapshot(JSON.parse(forward.canonicalJson()));

        expect(reversed.canonicalJson()).toBe(forward.canonicalJson());
        expect(roundTripped.canonicalJson()).toBe(forward.canonicalJson());

        const positions = new Map(
          forward
            .topologicalOrder()
            .map((taskId, position) => [taskId, position]),
        );
        for (const task of wire.tasks) {
          const dependantPosition = positions.get(TaskId.make(task.id));
          for (const prerequisite of task.prerequisites) {
            const prerequisitePosition = positions.get(
              TaskId.make(prerequisite),
            );
            if (
              prerequisitePosition === undefined ||
              dependantPosition === undefined
            ) {
              throw new Error("valid DAG order omitted a generated task");
            }
            expect(prerequisitePosition).toBeLessThan(dependantPosition);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("projects unordered tracker input into one canonical, cycle-checked TaskDag", () => {
    const first = validSnapshot({
      revision: "tracker-revision-1",
      tasks: [
        { id: "task-b", lifecycle: ready, prerequisites: ["task-a"] },
        { id: "task-a", lifecycle: ready, prerequisites: [] },
      ],
    });
    const second = validSnapshot({
      revision: "tracker-revision-1",
      tasks: [
        { id: "task-a", lifecycle: ready, prerequisites: [] },
        { id: "task-b", lifecycle: ready, prerequisites: ["task-a"] },
      ],
    });

    expect(first.canonicalJson()).toBe(second.canonicalJson());
    expect(first.topologicalOrder()).toEqual(["task-a", "task-b"]);
    expect(first.prerequisitesOf(TaskId.make("task-b"))).toEqual(["task-a"]);
    expect(first.dependantsOf(TaskId.make("task-a"))).toEqual(["task-b"]);

    const invalidWire = {
      revision: "tracker-revision-invalid",
      tasks: [
        { id: "task-a", lifecycle: ready, prerequisites: ["task-b"] },
        { id: "task-a", lifecycle: ready, prerequisites: [] },
        { id: "task-b", lifecycle: ready, prerequisites: ["task-a"] },
        { id: "task-c", lifecycle: ready, prerequisites: ["task-d"] },
        { id: "task-d", lifecycle: ready, prerequisites: ["task-c"] },
        {
          id: "task-e",
          lifecycle: ready,
          prerequisites: ["task-e", "missing", "missing"],
        },
      ],
    };
    const invalid = projectTrackerSnapshot(invalidWire);
    const reversedInvalid = projectTrackerSnapshot({
      ...invalidWire,
      tasks: [...invalidWire.tasks].reverse(),
    });
    expect(invalid._tag).toBe("Invalid");
    expect(reversedInvalid._tag).toBe("Invalid");
    if (invalid._tag === "Invalid" && reversedInvalid._tag === "Invalid") {
      expect(reversedInvalid.issues).toEqual(invalid.issues);
      expect(invalid.issues.map((issue) => issue._tag).sort()).toEqual([
        "Cycle",
        "Cycle",
        "DuplicateDependency",
        "DuplicateTask",
        "MissingPrerequisite",
        "SelfDependency",
      ]);
    }
  });

  it("runs two ready tasks concurrently while accepted-result integration stays serial", async () => {
    const snapshot = validSnapshot({
      revision: "tracker-revision-concurrency",
      tasks: [
        { id: "task-a", lifecycle: ready, prerequisites: [] },
        { id: "task-b", lifecycle: ready, prerequisites: [] },
      ],
    });

    const observations = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const taskIds = [TaskId.make("task-a"), TaskId.make("task-b")];
          const executionStarted = yield* Queue.make<TaskId>();
          const integrationStarted = yield* Queue.make<TaskId>();
          const executionGates = new Map<TaskId, Deferred.Deferred<void>>();
          const integrationGates = new Map<TaskId, Deferred.Deferred<void>>();
          for (const taskId of taskIds) {
            executionGates.set(taskId, yield* Deferred.make<void>());
            integrationGates.set(taskId, yield* Deferred.make<void>());
          }
          const activeIntegrations = yield* Ref.make(0);
          const maximumActiveIntegrations = yield* Ref.make(0);
          const integrationOrder = yield* Ref.make<ReadonlyArray<TaskId>>([]);
          const journal = yield* inMemoryJournal();

          const ports: CoordinatorPorts = {
            execution: {
              planAttempt: (taskId) =>
                Effect.succeed({
                  taskId,
                  attemptId: AttemptId.make(`attempt-${taskId}`),
                  attemptBaseSha: GitSha.make(`attempt-base-${taskId}`),
                }),
              bindAgentSession: (attempt) =>
                Effect.succeed(
                  AgentSessionId.make(`agent-session-${attempt.taskId}`),
                ),
              runAttempt: (attempt) =>
                Effect.gen(function* () {
                  yield* Queue.offer(executionStarted, attempt.taskId);
                  const gate = executionGates.get(attempt.taskId);
                  if (gate === undefined) {
                    return yield* Effect.die(
                      new Error(`missing execution gate for ${attempt.taskId}`),
                    );
                  }
                  yield* Deferred.await(gate);
                  return {
                    _tag: "Accepted",
                    resultSha: GitSha.make(`result-${attempt.taskId}`),
                    claimBaseSha: GitSha.make(`claim-base-${attempt.taskId}`),
                    evidenceRef: EvidenceRef.make(`evidence/${attempt.taskId}`),
                  } satisfies AttemptOutcome;
                }),
              discoverExecutions: () => Effect.succeed([]),
            },
            integration: {
              integrate: (result) =>
                Effect.gen(function* () {
                  const active = yield* Ref.updateAndGet(
                    activeIntegrations,
                    (count) => count + 1,
                  );
                  yield* Ref.update(maximumActiveIntegrations, (maximum) =>
                    Math.max(maximum, active),
                  );
                  yield* Ref.update(integrationOrder, (order) => [
                    ...order,
                    result.taskId,
                  ]);
                  yield* Queue.offer(integrationStarted, result.taskId);
                  const gate = integrationGates.get(result.taskId);
                  if (gate === undefined) {
                    return yield* Effect.die(
                      new Error(
                        `missing integration gate for ${result.taskId}`,
                      ),
                    );
                  }
                  yield* Deferred.await(gate);
                  yield* Ref.update(activeIntegrations, (count) => count - 1);
                  return GitSha.make(`accepted-head-${result.taskId}`);
                }),
            },
            journal: journal.port,
            tracker: { quarantine: () => Effect.void },
          };

          const coordinator = yield* makeCoordinator(ports);
          const fiber = yield* coordinator
            .executeFrontier(snapshot)
            .pipe(Effect.forkScoped);
          const started = [
            yield* Queue.take(executionStarted),
            yield* Queue.take(executionStarted),
          ];
          for (const gate of executionGates.values()) {
            yield* Deferred.succeed(gate, undefined);
          }

          const firstIntegration = yield* Queue.take(integrationStarted);
          const firstGate = integrationGates.get(firstIntegration);
          if (firstGate === undefined) {
            return yield* Effect.die(
              new Error("missing first integration gate"),
            );
          }
          expect(yield* Ref.get(activeIntegrations)).toBe(1);
          yield* Deferred.succeed(firstGate, undefined);

          const secondIntegration = yield* Queue.take(integrationStarted);
          const secondGate = integrationGates.get(secondIntegration);
          if (secondGate === undefined) {
            return yield* Effect.die(
              new Error("missing second integration gate"),
            );
          }
          yield* Deferred.succeed(secondGate, undefined);
          yield* Fiber.join(fiber);

          return {
            started: [...started].sort(),
            integrationOrder: yield* Ref.get(integrationOrder),
            maximumActiveIntegrations: yield* Ref.get(
              maximumActiveIntegrations,
            ),
          };
        }),
      ),
    );

    expect(observations.started).toEqual(["task-a", "task-b"]);
    expect(observations.integrationOrder).toHaveLength(2);
    expect(observations.maximumActiveIntegrations).toBe(1);
  });

  it("quarantines review-cap exhaustion and blocks only transitive dependants", async () => {
    const initial = validSnapshot({
      revision: "tracker-revision-before-quarantine",
      tasks: [
        { id: "task-failed", lifecycle: ready, prerequisites: [] },
        {
          id: "task-child",
          lifecycle: ready,
          prerequisites: ["task-failed"],
        },
        {
          id: "task-grandchild",
          lifecycle: ready,
          prerequisites: ["task-child"],
        },
        { id: "task-unrelated", lifecycle: ready, prerequisites: [] },
      ],
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const journal = yield* inMemoryJournal();
        const quarantined = yield* Ref.make<ReadonlyArray<TaskId>>([]);
        const ports: CoordinatorPorts = {
          execution: {
            planAttempt: (taskId) =>
              Effect.succeed({
                taskId,
                attemptId: AttemptId.make(`attempt-${taskId}`),
                attemptBaseSha: GitSha.make(`base-${taskId}`),
              }),
            bindAgentSession: (attempt) =>
              Effect.succeed(
                AgentSessionId.make(`agent-session-${attempt.taskId}`),
              ),
            runAttempt: (attempt) =>
              Effect.succeed(
                attempt.taskId === TaskId.make("task-failed")
                  ? {
                      _tag: "ReviewCapExhausted",
                      evidenceRef: EvidenceRef.make("evidence/review-cap"),
                    }
                  : {
                      _tag: "Accepted",
                      resultSha: GitSha.make(`result-${attempt.taskId}`),
                      claimBaseSha: GitSha.make(`claim-${attempt.taskId}`),
                      evidenceRef: EvidenceRef.make(
                        `evidence/${attempt.taskId}`,
                      ),
                    },
              ),
            discoverExecutions: () => Effect.succeed([]),
          },
          integration: {
            integrate: (accepted) =>
              Effect.succeed(GitSha.make(`head-${accepted.taskId}`)),
          },
          journal: journal.port,
          tracker: {
            quarantine: (taskId) =>
              Ref.update(quarantined, (taskIds) => [...taskIds, taskId]),
          },
        };
        const coordinator = yield* makeCoordinator(ports);
        yield* coordinator.executeFrontier(initial);
        return {
          events: yield* journal.port.recover(),
          quarantined: yield* Ref.get(quarantined),
        };
      }),
    );

    const afterQuarantine = validSnapshot({
      revision: "tracker-revision-after-quarantine",
      tasks: [
        {
          id: "task-failed",
          lifecycle: {
            _tag: "Quarantined",
          },
          prerequisites: [],
        },
        {
          id: "task-child",
          lifecycle: ready,
          prerequisites: ["task-failed"],
        },
        {
          id: "task-grandchild",
          lifecycle: ready,
          prerequisites: ["task-child"],
        },
        { id: "task-unrelated", lifecycle: ready, prerequisites: [] },
      ],
    });

    expect(result.quarantined).toEqual(["task-failed"]);
    expect(result.events).toContainEqual({
      _tag: "TaskQuarantined",
      taskId: "task-failed",
      evidenceRef: "evidence/review-cap",
    });
    expect(
      afterQuarantine.transitiveDependantsOf(TaskId.make("task-failed")),
    ).toEqual(["task-child", "task-grandchild"]);
    expect(afterQuarantine.runnableFrontier()).toEqual(["task-unrelated"]);
  });

  it("recovers a resumable agent after coordinator-process death without journaling tracker facts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ralph-control-plane-"));
    const journalPath = join(directory, "events.ndjson");
    const firstProcess = makeNdjsonJournal(journalPath);
    const events = [
      {
        _tag: "AttemptPlanned",
        taskId: TaskId.make("task-a"),
        attemptId: AttemptId.make("attempt-a1"),
        attemptBaseSha: GitSha.make("attempt-base-a1"),
      },
      {
        _tag: "RetryScheduled",
        taskId: TaskId.make("task-a"),
        dueAtEpochMs: RetryDueAtEpochMs.make(1_000),
      },
      {
        _tag: "AttemptPlanned",
        taskId: TaskId.make("task-a"),
        attemptId: AttemptId.make("attempt-a2"),
        attemptBaseSha: GitSha.make("attempt-base-a2"),
      },
      {
        _tag: "RetryScheduled",
        taskId: TaskId.make("task-b"),
        dueAtEpochMs: RetryDueAtEpochMs.make(2_000),
      },
      {
        _tag: "AcceptedResultQueued",
        taskId: TaskId.make("task-a"),
        resultSha: GitSha.make("result-a"),
        claimBaseSha: GitSha.make("claim-base-a"),
        evidenceRef: EvidenceRef.make("evidence/task-a"),
      },
      {
        _tag: "AcceptedResultQueued",
        taskId: TaskId.make("task-c"),
        resultSha: GitSha.make("result-c"),
        claimBaseSha: GitSha.make("claim-base-c"),
        evidenceRef: EvidenceRef.make("evidence/task-c"),
      },
      {
        _tag: "IntegrationCompleted",
        taskId: TaskId.make("task-c"),
        acceptedHeadSha: GitSha.make("accepted-head-c"),
      },
      {
        _tag: "AcceptedResultQueued",
        taskId: TaskId.make("task-d"),
        resultSha: GitSha.make("result-d"),
        claimBaseSha: GitSha.make("claim-base-d"),
        evidenceRef: EvidenceRef.make("evidence/task-d"),
      },
      {
        _tag: "TaskQuarantined",
        taskId: TaskId.make("task-e"),
        evidenceRef: EvidenceRef.make("evidence/task-e"),
      },
      {
        _tag: "AttemptPlanned",
        taskId: TaskId.make("task-f"),
        attemptId: AttemptId.make("attempt-f1"),
        attemptBaseSha: GitSha.make("attempt-base-f1"),
      },
    ] as const satisfies ReadonlyArray<JournalEvent>;
    for (const event of events)
      await Effect.runPromise(firstProcess.append(event));
    await appendFile(journalPath, '{"_tag":"AgentSession', "utf8");

    const restartedProcess = makeNdjsonJournal(journalPath);
    const replayed = await Effect.runPromise(restartedProcess.recover());
    await Effect.runPromise(restartedProcess.append(events[3]));
    const replayedAfterRepair = await Effect.runPromise(
      restartedProcess.recover(),
    );
    const trackerSnapshot = {
      revision: "tracker-revision-restart",
      tasks: [
        {
          id: "task-a",
          lifecycle: {
            _tag: "Claimed",
            owner: "ralph-worker-a",
          },
          prerequisites: [],
        },
        { id: "task-b", lifecycle: ready, prerequisites: [] },
        {
          id: "task-c",
          lifecycle: { _tag: "Completed" },
          prerequisites: [],
        },
        {
          id: "task-d",
          lifecycle: { _tag: "Completed" },
          prerequisites: [],
        },
        { id: "task-e", lifecycle: ready, prerequisites: [] },
        {
          id: "task-f",
          lifecycle: { _tag: "Claimed", owner: "ralph-worker-f" },
          prerequisites: [],
        },
      ],
    };
    expect(replayed).toHaveLength(events.length);
    expect(replayedAfterRepair).toHaveLength(events.length + 1);
    const recovered = await Effect.runPromise(
      recoverFromPorts({
        tracker: { readSnapshot: () => Effect.succeed(trackerSnapshot) },
        journal: restartedProcess,
        execution: {
          discoverExecutions: () =>
            Effect.succeed([
              {
                _tag: "WorktreeProvisioned",
                taskId: TaskId.make("task-c"),
                attemptId: AttemptId.make("attempt-c-finished"),
                worktreeId: WorktreeId.make("worktree-c"),
                path: WorktreePath.make("/worktrees/task-c"),
              },
              {
                _tag: "AgentResumable",
                taskId: TaskId.make("task-f"),
                attemptId: AttemptId.make("attempt-f1"),
                worktreeId: WorktreeId.make("worktree-f"),
                path: WorktreePath.make("/worktrees/task-f"),
                agentSessionId: AgentSessionId.make("agent-session-f1"),
              },
            ]),
        },
        git: {
          discoverClaims: () =>
            Effect.succeed([
              {
                taskId: TaskId.make("task-a"),
                claimBaseSha: GitSha.make("claim-base-a"),
              },
              {
                taskId: TaskId.make("task-f"),
                claimBaseSha: GitSha.make("claim-base-f"),
              },
            ]),
          discoverIntegrations: () =>
            Effect.succeed([
              {
                taskId: TaskId.make("task-d"),
                resultSha: GitSha.make("result-d"),
              },
            ]),
        },
      }),
    );

    expect(recovered._tag).toBe("Recovered");
    if (recovered._tag === "Recovered") {
      expect(recovered.state.claims).toEqual([
        {
          taskId: "task-a",
          claimBaseSha: "claim-base-a",
        },
        {
          taskId: "task-f",
          claimBaseSha: "claim-base-f",
        },
      ]);
      expect(recovered.state.attempts).toEqual([
        {
          _tag: "AgentResumable",
          taskId: "task-f",
          attemptId: "attempt-f1",
          attemptBaseSha: "attempt-base-f1",
          worktreeId: "worktree-f",
          path: "/worktrees/task-f",
          agentSessionId: "agent-session-f1",
        },
      ]);
      expect(recovered.state.unmatchedExecutions).toEqual([
        {
          _tag: "WorktreeProvisioned",
          taskId: "task-c",
          attemptId: "attempt-c-finished",
          worktreeId: "worktree-c",
          path: "/worktrees/task-c",
        },
      ]);
      expect(recovered.state.retryTimers).toEqual([
        { taskId: "task-b", dueAtEpochMs: 2_000 },
      ]);
      expect(recovered.state.integrationQueue).toEqual([
        {
          taskId: "task-a",
          resultSha: "result-a",
          claimBaseSha: "claim-base-a",
          evidenceRef: "evidence/task-a",
        },
      ]);
      expect(recovered.state.pendingQuarantines).toEqual([
        {
          taskId: "task-e",
          evidenceRef: "evidence/task-e",
        },
      ]);
    }

    const persisted = await readFile(journalPath, "utf8");
    expect(persisted).not.toContain('"lifecycle"');
    expect(persisted).not.toContain('"prerequisites"');
  });

  it("fails recovery when journal and executor identify different agent sessions", () => {
    const taskId = TaskId.make("task-session-conflict");
    const snapshot = validSnapshot({
      revision: "tracker-revision-session-conflict",
      tasks: [
        {
          id: taskId,
          lifecycle: { _tag: "Claimed", owner: "ralph-worker-conflict" },
          prerequisites: [],
        },
      ],
    });
    const recovered = recoverControlState(
      snapshot,
      [
        {
          _tag: "AttemptPlanned",
          taskId,
          attemptId: AttemptId.make("attempt-session-conflict"),
          attemptBaseSha: GitSha.make("attempt-base-session-conflict"),
        },
        {
          _tag: "AgentSessionBound",
          taskId,
          attemptId: AttemptId.make("attempt-session-conflict"),
          agentSessionId: AgentSessionId.make("journal-session"),
        },
      ],
      [
        {
          _tag: "AgentResumable",
          taskId,
          attemptId: AttemptId.make("attempt-session-conflict"),
          worktreeId: WorktreeId.make("worktree-session-conflict"),
          path: WorktreePath.make("/worktrees/task-session-conflict"),
          agentSessionId: AgentSessionId.make("executor-session"),
        },
      ],
      [
        {
          taskId,
          claimBaseSha: GitSha.make("claim-base-session-conflict"),
        },
      ],
      [],
    );

    expect(recovered).toEqual({
      _tag: "RecoveryFailed",
      issues: [
        {
          _tag: "SessionIdentityContradiction",
          taskId,
          journalSessionId: "journal-session",
          discoveredSessionId: "executor-session",
        },
      ],
    });
  });
});
